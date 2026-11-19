import { json2satrec } from './vendor/satellite-js-7.2.0/dist/io.js';
import { gstime, propagate } from './vendor/satellite-js-7.2.0/dist/propagation.js';
import { eciToGeodetic } from './vendor/satellite-js-7.2.0/dist/transforms.js';
import { classifyElementAge, normalizeLongitude, splitAtAntimeridian } from './live-orbit-math.mjs';

(() => {
  const byId = id => document.getElementById(id);
  const SATELLITE_ID = '25544';
  const LOCAL_UPDATE_MS = 2000;
  const TRACK_STEP_MS = 30_000;
  const TRACK_WINDOW_MS = 15 * 60_000;
  const PROVIDER_CACHE_MS = 6 * 60 * 60_000;
  const PROVIDER_CHECK_MS = PROVIDER_CACHE_MS;
  const radToDeg = 180 / Math.PI;
  const utcFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'medium', timeZone: 'UTC'
  });
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'fuso local';
  const localFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'medium'
  });

  let map;
  let imageryLayer;
  let streetsLayer;
  let activeLayer;
  let pastTrackLayer;
  let futureTrackLayer;
  let satelliteMarker;
  let satrec;
  let ommPayload;
  let currentPosition;
  let positionAvailable = false;
  let active = false;
  let paused = false;
  let initialized = false;
  let firstCenter = true;
  let localTimer = null;
  let providerTimer = null;
  let lastTrackTime = 0;
  let loading = null;

  function setStatus(text, state = 'pending') {
    const badge = byId('liveStatusBadge');
    badge.textContent = text;
    badge.classList.remove('is-pending', 'is-warning', 'is-error');
    if (state === 'pending') badge.classList.add('is-pending');
    else if (state === 'warning') badge.classList.add('is-warning');
    else if (state === 'error') badge.classList.add('is-error');
  }

  function showError(text) {
    const target = byId('liveError');
    target.textContent = text;
    target.hidden = !text;
  }

  function clearPosition() {
    currentPosition = null;
    if (map && satelliteMarker && map.hasLayer(satelliteMarker)) map.removeLayer(satelliteMarker);
    pastTrackLayer?.clearLayers();
    futureTrackLayer?.clearLayers();
    byId('liveLatitude').textContent = '—';
    byId('liveLongitude').textContent = '—';
    byId('liveAltitude').textContent = '—';
    byId('liveVelocity').textContent = '—';
    byId('liveTimeUtc').textContent = '—';
    byId('liveTimeLocal').textContent = '—';
    byId('livePeriod').textContent = '—';
    byId('liveCenter').disabled = true;
    firstCenter = true;
  }

  function formatUtc(value) {
    return `${utcFormatter.format(value)} UTC`;
  }

  function formatLocal(value) {
    return `${localFormatter.format(value)} (${localZone})`;
  }

  function formatDuration(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const days = Math.floor(safe / 86400);
    const hours = Math.floor((safe % 86400) / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (days) return `${days} d ${String(hours).padStart(2, '0')} h ${String(minutes).padStart(2, '0')} min`;
    if (hours) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
    return `${minutes} min`;
  }

  function calculatePosition(when) {
    if (!satrec || !ommPayload) throw new Error('Os elementos orbitais ainda não foram carregados.');
    const propagated = propagate(satrec, when);
    if (!propagated || !propagated.position || !propagated.velocity || satrec.error) {
      throw new Error(`O propagador SGP4 não conseguiu calcular esta época (código ${satrec.error || 'indisponível'}).`);
    }
    const geo = eciToGeodetic(propagated.position, gstime(when));
    const lat = geo.latitude * radToDeg;
    const lon = normalizeLongitude(geo.longitude * radToDeg);
    const alt = geo.height;
    const speed = Math.hypot(propagated.velocity.x, propagated.velocity.y, propagated.velocity.z);
    if (![lat, lon, alt, speed].every(Number.isFinite)) {
      throw new Error('O propagador retornou uma posição não finita.');
    }
    return {lat, lon, alt, speed, when};
  }

  function updateElementStatus(now = new Date()) {
    if (!ommPayload) {
      positionAvailable = false;
      return false;
    }
    const epoch = new Date(ommPayload.epoch_utc);
    const fetchedAt = new Date(ommPayload.fetched_at_utc);
    const ageSeconds = (now.getTime() - epoch.getTime()) / 1000;
    const freshness = classifyElementAge(ageSeconds, ommPayload.delivery);
    if (!Number.isFinite(epoch.getTime()) || !Number.isFinite(fetchedAt.getTime()) || freshness === 'invalid') {
      positionAvailable = false;
      setStatus('ÉPOCA OMM INVÁLIDA', 'error');
      showError('A época recebida não pôde ser validada; a posição não será apresentada como atual.');
      return false;
    }
    const delivery = ommPayload.delivery === 'live' ? 'CELESTRAK' :
      (ommPayload.delivery === 'build_snapshot_stale' ? 'SNAPSHOT DE CONTINGÊNCIA' : 'SNAPSHOT DO BUILD');
    byId('liveEpoch').textContent = formatUtc(epoch);
    byId('liveAge').textContent = formatDuration(ageSeconds);
    byId('liveFetchedAt').textContent = formatUtc(fetchedAt);
    byId('liveSource').textContent = `${ommPayload.source || 'CelesTrak'} · ${delivery}`;
    if (freshness === 'unavailable') {
      positionAvailable = false;
      setStatus('POSIÇÃO INDISPONÍVEL · ÉPOCA >72 H', 'error');
      showError(`Os elementos orbitais têm ${formatDuration(ageSeconds)} desde a época. Acima de 72 h, a posição e a trilha não são calculadas nem exibidas.`);
      return false;
    }

    positionAvailable = true;
    if (ommPayload.warning) {
      showError(`Não foi possível consultar a fonte neste momento. ${ommPayload.warning} Está em uso o snapshot listado acima.`);
    } else if (freshness === 'aging') {
      showError(`A época dos elementos está envelhecendo (${formatDuration(ageSeconds)}). A posição continua estimada e pode ter precisão reduzida.`);
    } else {
      showError('');
    }

    if (freshness === 'recent') {
      setStatus(ommPayload.delivery === 'live' ? 'ELEMENTOS RECENTES' : 'ÉPOCA RECENTE · SNAPSHOT', 'ok');
    } else {
      setStatus('ELEMENTOS ENVELHECENDO', 'warning');
    }
    return true;
  }

  async function readJson(path, options = {}) {
    const response = await fetch(path, {
      cache: 'no-store',
      headers: {Accept: 'application/json'},
      ...options
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Falha HTTP ${response.status}.`);
    return payload;
  }

  function validatePayload(payload) {
    if (!payload || !payload.elements || String(payload.elements.NORAD_CAT_ID) !== SATELLITE_ID) {
      throw new Error('A resposta não contém elementos OMM válidos para a ISS (NORAD 25544).');
    }
    const record = payload.elements;
    if (!Number.isFinite(Number(record.MEAN_MOTION)) || Number(record.MEAN_MOTION) <= 0) {
      throw new Error('O OMM recebido não contém movimento médio válido.');
    }
    return payload;
  }

  async function loadElements({manual = false} = {}) {
    if (loading) return loading;
    loading = (async () => {
      if (manual) setStatus('VERIFICANDO ELEMENTOS', 'pending');
      else if (!ommPayload) setStatus('CARREGANDO ELEMENTOS', 'pending');
      try {
        let payload;
        try {
          payload = validatePayload(await readJson(manual ? '/api/live/omm?refresh=1' : '/api/live/omm'));
        } catch (apiError) {
          payload = validatePayload(await readJson('/data/live_omm_snapshot.json'));
          payload.delivery = 'build_snapshot_stale';
          payload.warning = apiError.message;
        }
        satrec = json2satrec(payload.elements);
        if (satrec.error) throw new Error(`O OMM não pôde ser inicializado pelo SGP4 (código ${satrec.error}).`);
        ommPayload = payload;
        updateElementStatus();
        if (active) {
          updatePosition(new Date(), true);
          updateTrack(new Date());
        }
      } catch (error) {
        if (ommPayload) {
          if (updateElementStatus()) {
            showError(`A consulta de novos elementos falhou; mantendo a época carregada. ${error.message}`);
            setStatus('MANTENDO ÚLTIMOS ELEMENTOS', 'warning');
          } else {
            clearPosition();
          }
        } else {
          setStatus('DADOS ORBITAIS INDISPONÍVEIS', 'error');
          showError(`Não foi possível obter os elementos OMM da ISS. ${error.message}`);
        }
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  function drawTrack(layer, points, style) {
    layer.clearLayers();
    for (const segment of splitAtAntimeridian(points)) {
      window.L.polyline(segment, style).addTo(layer);
    }
  }

  function updateTrack(center = new Date()) {
    if (!satrec || !map) return;
    if (!positionAvailable) {
      pastTrackLayer.clearLayers();
      futureTrackLayer.clearLayers();
      return;
    }
    const base = center.getTime();
    const history = [];
    const prediction = [];
    for (let delta = -TRACK_WINDOW_MS; delta <= TRACK_WINDOW_MS; delta += TRACK_STEP_MS) {
      try {
        const point = calculatePosition(new Date(base + delta));
        if (delta <= 0) history.push(point);
        if (delta >= 0) prediction.push(point);
      } catch (error) {
        showError(`A trilha não pôde ser atualizada. ${error.message}`);
        break;
      }
    }
    drawTrack(pastTrackLayer, history, {color:'#c8c4ba', weight:2, opacity:.78});
    drawTrack(futureTrackLayer, prediction, {color:'#e47e51', weight:2.5, opacity:.95, dashArray:'5 7'});
    lastTrackTime = base;
  }

  function updatePosition(when = new Date(), forceTrack = false) {
    if (!active || !satrec || !map) return;
    if (document.visibilityState === 'hidden') return;
    if (!updateElementStatus()) {
      clearPosition();
      return;
    }
    if (paused) return;
    try {
      currentPosition = calculatePosition(when);
      const point = [currentPosition.lat, currentPosition.lon];
      if (!map.hasLayer(satelliteMarker)) satelliteMarker.addTo(map);
      satelliteMarker.setLatLng(point);
      byId('liveLatitude').textContent = `${currentPosition.lat.toFixed(4)}°`;
      byId('liveLongitude').textContent = `${currentPosition.lon.toFixed(4)}°`;
      byId('liveAltitude').textContent = `${currentPosition.alt.toFixed(1)} km`;
      byId('liveVelocity').textContent = `${currentPosition.speed.toFixed(2)} km/s`;
      byId('liveTimeUtc').textContent = formatUtc(when);
      byId('liveTimeLocal').textContent = formatLocal(when);
      const meanMotion = Number(ommPayload.elements.MEAN_MOTION);
      byId('livePeriod').textContent = Number.isFinite(meanMotion) && meanMotion > 0
        ? `${(1440 / meanMotion).toFixed(2)} min/orbita` : '—';
      byId('liveCenter').disabled = false;
      if (forceTrack || when.getTime() - lastTrackTime >= TRACK_STEP_MS) updateTrack(when);
      if (firstCenter) {
        map.setView(point, 2, {animate:false});
        firstCenter = false;
      }
    } catch (error) {
      positionAvailable = false;
      clearPosition();
      setStatus('PROPAGAÇÃO INDISPONÍVEL', 'error');
      showError(error.message);
    }
  }

  function initializeMap() {
    if (initialized || !window.L) return;
    map = window.L.map('liveMap', {zoomControl:true, worldCopyJump:false, minZoom:4, maxZoom:18});
    imageryLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom:19, attribution:'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    });
    streetsLayer = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'© OpenStreetMap contributors'
    });
    activeLayer = streetsLayer.addTo(map);
    pastTrackLayer = window.L.layerGroup().addTo(map);
    futureTrackLayer = window.L.layerGroup().addTo(map);
    const icon = window.L.divIcon({
      className:'live-div-icon',
      html:'<div class="live-current-marker" aria-hidden="true"></div>',
      iconSize:[18,18],
      iconAnchor:[9,9]
    });
    satelliteMarker = window.L.marker([0,0], {icon, keyboard:false, title:'Posição calculada da ISS'});
    byId('liveBaseMapSelect').addEventListener('change', () => {
      const next = byId('liveBaseMapSelect').value === 'streets' ? streetsLayer : imageryLayer;
      if (activeLayer && map.hasLayer(activeLayer)) map.removeLayer(activeLayer);
      activeLayer = next.addTo(map);
    });
    byId('liveCenter').addEventListener('click', () => {
      if (!currentPosition) return;
      map.setView([currentPosition.lat, currentPosition.lon], Math.max(map.getZoom(), 3), {animate:true});
    });
    byId('livePause').addEventListener('click', () => {
      paused = !paused;
      byId('livePause').textContent = paused ? 'Retomar posição' : 'Pausar posição';
      if (!paused) updatePosition(new Date(), true);
    });
    byId('liveRefresh').addEventListener('click', () => loadElements({manual:true}));
    byId('livePause').disabled = false;
    byId('liveCenter').disabled = true;
    initialized = true;
  }

  function activate() {
    active = true;
    if (!window.L) {
      setStatus('MAPA INDISPONÍVEL', 'error');
      showError('A biblioteca Leaflet não foi carregada; confira sua conexão para abrir o mapa.');
      return;
    }
    initializeMap();
    window.requestAnimationFrame(() => map?.invalidateSize({animate:false}));
    if (!localTimer) localTimer = window.setInterval(() => updatePosition(new Date()), LOCAL_UPDATE_MS);
    if (!providerTimer) providerTimer = window.setInterval(() => {
      if (active && ommPayload) {
        const fetched = new Date(ommPayload.fetched_at_utc).getTime();
        if (Date.now() - fetched >= PROVIDER_CACHE_MS) loadElements();
      }
    }, PROVIDER_CHECK_MS);
    if (!satrec || !ommPayload) loadElements();
    else updatePosition(new Date(), Date.now() - lastTrackTime >= TRACK_STEP_MS);
  }

  document.addEventListener('geopass:viewchange', event => {
    active = event.detail?.name === 'live';
    if (active) activate();
  });
  window.addEventListener('resize', () => {
    if (active && map) map.invalidateSize({animate:false});
  });
  window.addEventListener('orientationchange', () => {
    if (active && map) window.setTimeout(() => map.invalidateSize({animate:false}), 120);
  });
  document.addEventListener('visibilitychange', () => {
    if (active && document.visibilityState === 'visible') updatePosition(new Date(), true);
  });

  if (window.geoPassActiveView === 'live') activate();
})();
