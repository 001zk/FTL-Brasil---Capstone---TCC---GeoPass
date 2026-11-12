  (() => {
    const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const osmUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const referenceUrl = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    const mapHorizonMinutes = 90;
    const esriAttribution = 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> · Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community';
    const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
    const referenceAttribution = 'Limits and labels: <a href="https://goto.arcgisonline.com/maps/Reference/World_Boundaries_and_Places" target="_blank" rel="noopener noreferrer">Esri World Boundaries and Places</a> · Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community';
    const map = L.map('map', {zoomControl:false}).setView([-15.8, -47.9], 4);
    map.attributionControl.setPosition('bottomleft');
    L.control.zoom({position:'topleft'}).addTo(map);
    L.control.scale({position:'bottomleft', metric:true, imperial:false, maxWidth:100}).addTo(map);
    const imageryLayer = L.tileLayer(esriUrl, {maxZoom:19, attribution:esriAttribution});
    const streetsLayer = L.tileLayer(osmUrl, {maxZoom:18, referrerPolicy:'strict-origin-when-cross-origin', attribution:osmAttribution});
    const referenceLayer = L.tileLayer(referenceUrl, {maxZoom:19, opacity:.96, attribution:referenceAttribution});
    let activeBaseLayer = imageryLayer.addTo(map);
    referenceLayer.addTo(map);
    const overviewMap = L.map('overviewMap', {
      zoomControl:false, attributionControl:false, keyboard:false, dragging:false,
      scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, touchZoom:false,
      zoomSnap:.5, zoomDelta:.5
    }).setView([-15.8, -47.9], 1.5);
    let activeOverviewLayer = L.tileLayer(esriUrl, {maxZoom:19, attribution:esriAttribution}).addTo(overviewMap);
    const overviewMarker = L.circleMarker([-15.8, -47.9], {radius:3, color:'#f0eadf', weight:1.5, fillColor:'#e47e51', fillOpacity:1}).addTo(overviewMap);
    const selectedTrackLayer = L.layerGroup().addTo(map);
    const otherTrackLayer = L.layerGroup().addTo(map);
    const observerLayer = L.layerGroup().addTo(map);
    const observerIcon = L.divIcon({
      className:'observer-marker-host',
      html:'<span class="observer-marker"><svg viewBox="0 0 26 32" aria-hidden="true"><path d="M13 1.8a10.2 10.2 0 0 0-10.2 10.3c0 7 10.2 18.1 10.2 18.1s10.2-11.1 10.2-18.1A10.2 10.2 0 0 0 13 1.8Z" fill="#eee8db" stroke="#222a27" stroke-width="1.4"/><circle cx="13" cy="12" r="3.2" fill="#e47e51" stroke="#222a27" stroke-width="1"/></svg></span>',
      iconSize:[26,32], iconAnchor:[13,30], popupAnchor:[0,-27]
    });
    const satelliteIcon = L.divIcon({
      className:'satellite-marker-host',
      html:'<span class="satellite-marker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8 8 8m-9-12 4 4-4 4-4-4 4-4Zm10 10 4 4-4 4-4-4 4-4ZM12 12l-3 3m6-6 3-3m-9 9-3 3m12-12 3-3"></path><path d="M9 15 6 12m6-3 3-3"></path></svg></span>',
      iconSize:[34,34], iconAnchor:[17,17]
    });
    function sampleSatelliteIcon(count) {
      const badge = count > 1 ? `<b aria-hidden="true">${count}</b>` : '';
      return L.divIcon({
        className:'sample-satellite-marker-host',
        html:`<span class="sample-satellite-marker" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 8 8 8m-9-12 4 4-4 4-4-4 4-4Zm10 10 4 4-4 4-4-4 4-4ZM12 12l-3 3m6-6 3-3m-9 9-3 3m12-12 3-3"></path><path d="M9 15 6 12m6-3 3-3"></path></svg>${badge}</span>`,
        iconSize:[24,24], iconAnchor:[12,12]
      });
    }
    let data = null;
    let visiblePasses = [];
    let selectedLocation = null;
    let customLocation = null;
    let customPasses = null;
    let busy = false;
    let trackedMarker = null;
    let currentTrackIndex = 0;
    let trackTimer = null;
    let esp32Port = null;
    let serialBusy = false;
    let selectedPassIndex = 0;
    let activePassZone = 'UTC';
    let activePassThreshold = null;

    const byId = id => document.getElementById(id);
    const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const dateText = (iso, zone) => new Intl.DateTimeFormat('pt-BR', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:zone || 'UTC'
    }).format(new Date(iso));
    const timeText = (iso, zone) => new Intl.DateTimeFormat('pt-BR', {
      hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23', timeZone:zone || 'UTC'
    }).format(new Date(iso));
    const presetLocation = () => data.locations.find(item => item.id === selectedLocation);
    const currentLocation = () => customLocation || presetLocation();

    function updateMapReadout() {
      if (!map || !byId('mapLatitude')) return;
      const center = map.getCenter();
      byId('mapLatitude').textContent = center.lat.toFixed(3);
      byId('mapLongitude').textContent = center.lng.toFixed(3);
      byId('mapZoom').textContent = map.getZoom().toFixed(1).replace(/\.0$/, '');
    }
    function setLayerVisibility(layer, visible) {
      if (visible && !map.hasLayer(layer)) layer.addTo(map);
      if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
    }
    function syncLayerVisibility() {
      setLayerVisibility(selectedTrackLayer, byId('layerSelectedTrack').checked);
      setLayerVisibility(observerLayer, byId('layerObserver').checked);
      setLayerVisibility(otherTrackLayer, byId('layerOtherTracks').checked);
    }
    function changeBaseMap() {
      const useStreets = byId('baseMapSelect').value === 'streets';
      const nextMain = useStreets ? streetsLayer : imageryLayer;
      if (activeBaseLayer !== nextMain) {
        if (map.hasLayer(activeBaseLayer)) map.removeLayer(activeBaseLayer);
        activeBaseLayer = nextMain.addTo(map);
      }
      if (useStreets && map.hasLayer(referenceLayer)) map.removeLayer(referenceLayer);
      if (!useStreets && !map.hasLayer(referenceLayer)) referenceLayer.addTo(map);
      if (activeOverviewLayer) overviewMap.removeLayer(activeOverviewLayer);
      activeOverviewLayer = L.tileLayer(useStreets ? osmUrl : esriUrl, {
        maxZoom:useStreets ? 18 : 19,
        referrerPolicy:'strict-origin-when-cross-origin',
        attribution:useStreets ? osmAttribution : esriAttribution
      }).addTo(overviewMap);
      byId('baseMapLabel').textContent = useStreets ? 'MAPA DE RUAS · OSM' : 'IMAGEM DE SATÉLITE · ESRI + RÓTULOS';
    }
    function switchView(name, updateUrl=true) {
      const allowed = ['map','passes','tracker','esp32','methodology'];
      if (!allowed.includes(name)) return;
      if (updateUrl && window.location.hash !== `#${name}`) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${name}`);
      }
      document.querySelectorAll('.app-view').forEach(view => { view.hidden = view.id !== `view-${name}`; });
      document.querySelectorAll('.nav-tab').forEach(tab => {
        const active = tab.dataset.view === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      const mapPanel = byId('mapPanel');
      if (name === 'tracker') byId('trackerMapSlot').appendChild(mapPanel);
      else byId('mapMapSlot').insertBefore(mapPanel, byId('passPanel'));
      const satelliteHost = byId(name === 'tracker' ? 'trackerSatelliteSlot' : 'mapSatelliteSlot');
      satelliteHost.appendChild(byId('trackedSatelliteControl'));
      byId('map-title').textContent = name === 'tracker' ? 'Trilha terrestre' : 'Mapa';
      window.geoPassActiveView = name;
      if (name === 'map' || name === 'tracker') {
        window.requestAnimationFrame(() => {
          map.invalidateSize({animate:false});
          overviewMap.invalidateSize({animate:false});
          updateTrackedMarker();
          updateMapReadout();
        });
      }
    }

    function updateOverview() {
      if (!data) return;
      const loc = currentLocation();
      const ageHours = (Date.now() - new Date(data.generated_at_utc).getTime()) / 3600000;
      const stale = !Number.isFinite(ageHours) || ageHours > 24;
      byId('summaryLocation').textContent = loc?.name || '—';
      byId('mapLocationName').textContent = loc?.name || '—';
      byId('summarySatelliteCount').textContent = String(data.satellites.length);
      const zone = byId('timeZoneSelect').value || loc?.timezone || 'UTC';
      byId('summaryTimezone').textContent = zone;
      byId('mapTimezoneLabel').textContent = zone.replace('America/', '').replaceAll('_', ' ');
      byId('summaryDataStatus').textContent = stale ? 'ELEMENTOS ANTIGOS' : 'ELEMENTOS RECENTES';
      byId('summaryDataStatus').classList.toggle('is-warning', stale);
      byId('dataIndicator').classList.toggle('is-stale', stale);
      byId('dataIndicator').title = stale ? 'Dados orbitais com mais de 24 horas' : 'Dados orbitais dentro da janela de 24 horas';
      byId('systemIndicator').classList.remove('is-offline', 'is-pending');
      byId('systemIndicator').classList.toggle('is-stale', stale);
      byId('systemStatus').textContent = stale ? 'Elementos antigos' : 'Previsões disponíveis';
      byId('summaryDataAge').textContent = Number.isFinite(ageHours)
        ? `${Math.max(0, ageHours).toFixed(1)} h desde a geração`
        : 'época indisponível';
      const generated = new Date(data.generated_at_utc);
      byId('dataUpdatedAt').textContent = Number.isFinite(generated.getTime())
        ? new Intl.DateTimeFormat('pt-BR', {hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone:'UTC'}).format(generated)
        : '—';
      const track = selectedTrack();
      byId('summaryTrackedSatellite').textContent = track?.satellite_name || '—';
      byId('trackedSatelliteName').textContent = track?.satellite_name || '—';
      byId('trackedNorad').textContent = track?.satellite_id || '—';
      byId('legendTrackedName').textContent = track?.satellite_name || 'Satélite selecionado';
      if (loc) {
        overviewMarker.setLatLng([loc.latitude, loc.longitude]);
        overviewMap.setView([loc.latitude, loc.longitude], 1.5, {animate:false});
      }
    }

    function chosenSatellites() {
      return new Set([...document.querySelectorAll('.sat-check:checked')].map(el => el.value));
    }
    function setBusy(value, message='') {
      busy = value;
      byId('searchButton').disabled = value;
      byId('useSearchResult').disabled = value || !byId('searchResults').options.length || byId('searchResults').options[0].value === '';
      byId('searchStatus').textContent = message;
      if (value) byId('passList').innerHTML = '<div class="empty">Calculando…</div>';
    }
    function updateSendButtonState() {
      document.querySelectorAll('.send-pass-button').forEach(button => {
        button.disabled = !esp32Port || serialBusy || !visiblePasses[Number(button.dataset.passIndex)];
      });
    }
    function initializeSerialUi() {
      const button = byId('connectEsp32');
      if (!window.isSecureContext || !('serial' in navigator)) {
        button.disabled = true;
        byId('esp32Status').textContent = 'USB/serial não está disponível neste navegador ou endereço. Mapa e previsões continuam funcionando normalmente.';
        return;
      }
      byId('esp32Status').textContent = 'Integração opcional: clique em Conectar ESP32 para escolher e autorizar uma porta USB/serial.';
      navigator.serial.addEventListener('disconnect', event => {
        if (event.target === esp32Port) {
          esp32Port = null;
          button.textContent = 'Conectar ESP32';
          byId('esp32Status').textContent = 'ESP32 desconectado. As previsões continuam funcionando.';
          updateSendButtonState();
        }
      });
    }
    async function toggleEsp32Connection() {
      const button = byId('connectEsp32');
      button.disabled = true;
      try {
        if (esp32Port) {
          const port = esp32Port;
          esp32Port = null;
          await port.close();
          button.textContent = 'Conectar ESP32';
          byId('esp32Status').textContent = 'ESP32 desconectado. As previsões continuam funcionando.';
          return;
        }
        const port = await navigator.serial.requestPort();
        await port.open({baudRate:115200});
        esp32Port = port;
        await new Promise(resolve => window.setTimeout(resolve, 1800));
        button.textContent = 'Desconectar ESP32';
        byId('esp32Status').textContent = 'Porta USB/serial conectada. Escolha uma passagem para enviar; a placa pode reiniciar ao conectar.';
      } catch (error) {
        byId('esp32Status').textContent = error.name === 'NotFoundError'
          ? 'Nenhuma porta foi selecionada. Você pode continuar usando o GeoPass sem o ESP32.'
          : `Não consegui conectar ao ESP32: ${error.message}`;
      } finally {
        button.disabled = false;
        updateSendButtonState();
      }
    }
    function serialUtc(value, field) {
      const parsed = new Date(value);
      if (!Number.isFinite(parsed.getTime()) || !/(Z|\+00:00|-00:00)$/.test(String(value))) {
        throw new Error(`${field} precisa ser uma data UTC válida.`);
      }
      return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }
    function buildSerialMessage(pass) {
      const id = String(pass.satellite_id || '');
      if (!/^\d{1,10}$/.test(id)) throw new Error('ID de satélite inválido.');
      const start = serialUtc(pass.start_utc, 'Início');
      const peak = serialUtc(pass.peak_utc, 'Pico');
      const end = serialUtc(pass.end_utc, 'Fim');
      if (!(Date.parse(start) <= Date.parse(peak) && Date.parse(peak) <= Date.parse(end))) {
        throw new Error('A passagem precisa obedecer início ≤ pico ≤ fim.');
      }
      const elevation = Number(pass.max_elevation_deg);
      if (!Number.isFinite(elevation) || elevation < 0 || elevation > 90) throw new Error('Elevação máxima inválida.');
      return `NEXT|1|${id}|${start}|${peak}|${end}|${elevation.toFixed(2)}\n`;
    }
    async function waitForSerialAck(satelliteId) {
      const reader = esp32Port.readable.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        reader.cancel().catch(() => {});
      }, 5000);
      try {
        while (true) {
          const {value, done} = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, {stream:true});
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.trim() === `ACK|1|${satelliteId}|OK`) return line.trim();
            if (line.startsWith(`ERR|1|${satelliteId}|`)) throw new Error(`O firmware rejeitou a mensagem: ${line}`);
          }
        }
      } catch (error) {
        if (!timedOut) throw error;
      } finally {
        window.clearTimeout(timeoutId);
        reader.releaseLock();
      }
      throw new Error('O ESP32 não confirmou o recebimento em até 5 segundos.');
    }
    async function sendPassToEsp32(event) {
      const button = event.target.closest('.send-pass-button');
      if (!button || !esp32Port || serialBusy) return;
      const pass = visiblePasses[Number(button.dataset.passIndex)];
      if (!pass) return;
      serialBusy = true;
      button.disabled = true;
      updateSendButtonState();
      byId('esp32Status').textContent = `Enviando ${pass.satellite_name} ao ESP32 e aguardando ACK…`;
      let writer;
      try {
        const message = buildSerialMessage(pass);
        writer = esp32Port.writable.getWriter();
        await writer.write(new TextEncoder().encode(message));
        writer.releaseLock();
        writer = null;
        const ack = await waitForSerialAck(String(pass.satellite_id));
        byId('esp32Status').textContent = `Confirmado pelo ESP32: ${ack} · ${pass.satellite_name}.`;
      } catch (error) {
        byId('esp32Status').textContent = `Envio não confirmado: ${error.message}`;
      } finally {
        if (writer) writer.releaseLock();
        serialBusy = false;
        updateSendButtonState();
      }
    }
    function setSatelliteFilters() {
      const holder = byId('satelliteFilters');
      const sats = data.satellites.slice().sort((a,b) => {
        if (a.id === '25544') return -1;
        if (b.id === '25544') return 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
      const defaults = new Set(sats.slice(0, Math.min(6, sats.length)).map(s => s.id));
      if (sats.some(s => s.id === '25544')) defaults.add('25544');
      holder.innerHTML = sats.map(s => `
        <label class="sat-option"><input class="sat-check" type="checkbox" value="${safe(s.id)}" ${defaults.has(s.id) ? 'checked' : ''}>
        <span>${safe(s.name)} <span class="fine">(${safe(s.id)})</span></span></label>`).join('');
      holder.querySelectorAll('.sat-check').forEach(el => el.addEventListener('change', event => {
        if (chosenSatellites().size > 12) {
          event.currentTarget.checked = false;
          byId('searchStatus').textContent = 'O limite é 12 satélites por cálculo nesta versão.';
          return;
        }
        render();
        if (customLocation) calculateAt(customLocation);
      }));
    }
    function splitAtDateLine(points) {
      const segments = []; let segment = [];
      for (const point of points) {
        const next = [point.latitude, point.longitude];
        if (segment.length && Math.abs(next[1] - segment[segment.length - 1][1]) > 180) {
          if (segment.length > 1) segments.push(segment);
          segment = [];
        }
        segment.push(next);
      }
      if (segment.length > 1) segments.push(segment);
      return segments;
    }
    function mapDisplayPoints(track) {
      const samples = Array.isArray(track?.points) ? track.points : [];
      const stepMinutes = Number(data?.track_step_minutes);
      if (!samples.length || !Number.isFinite(stepMinutes) || stepMinutes <= 0) return samples;
      const sampleCount = Math.min(samples.length, Math.max(2, Math.ceil(mapHorizonMinutes / stepMinutes) + 1));
      const candidatePasses = customLocation
        ? (customPasses?.passes || [])
        : (data?.passes || []).filter(pass => pass.location_id === selectedLocation);
      const nextPass = candidatePasses.find(pass => pass.satellite_id === track.satellite_id && pass.peak_utc);
      const peakTime = nextPass ? Date.parse(nextPass.peak_utc) : NaN;
      if (!Number.isFinite(peakTime)) return samples.slice(0, sampleCount);
      let peakIndex = 0;
      let peakDistance = Infinity;
      samples.forEach((point, index) => {
        const distance = Math.abs(Date.parse(point.time_utc) - peakTime);
        if (distance < peakDistance) { peakDistance = distance; peakIndex = index; }
      });
      const lastStart = Math.max(0, samples.length - sampleCount);
      const startIndex = Math.max(0, Math.min(lastStart, peakIndex - Math.floor(sampleCount / 2)));
      return samples.slice(startIndex, startIndex + sampleCount);
    }
    function selectedTrack() {
      return data?.tracks?.find(track => track.satellite_id === byId('trackedSatellite').value);
    }
    function stopTrackPlayback() {
      if (trackTimer) window.clearInterval(trackTimer);
      trackTimer = null;
      byId('playTrack').textContent = 'Reproduzir';
    }
    function updateTrackReadout() {
      const track = selectedTrack();
      const points = track?.points || [];
      if (!points.length) {
        byId('trackPosition').textContent = 'Não há trilha para este satélite. Gere os dados orbitais novamente.';
        byId('trackSlider').disabled = true;
        return null;
      }
      currentTrackIndex = Math.max(0, Math.min(currentTrackIndex, points.length - 1));
      const slider = byId('trackSlider');
      slider.max = String(points.length - 1);
      slider.value = String(currentTrackIndex);
      slider.disabled = false;
      const point = points[currentTrackIndex];
      const zone = byId('timeZoneSelect').value || 'UTC';
      const stepMinutes = points.length > 1
        ? Math.round((Date.parse(points[1].time_utc) - Date.parse(points[0].time_utc)) / 60000)
        : Number(data.track_step_minutes || 0);
      byId('trackPosition').textContent = `${track.satellite_name} · ${dateText(point.time_utc, zone)} (${zone}) · ${dateText(point.time_utc, 'UTC')} UTC · subponto ${Number(point.latitude).toFixed(2)}°, ${Number(point.longitude).toFixed(2)}°`;
      byId('trackNote').textContent = `Projeção da órbita sobre o solo; não é a trajetória aparente no céu nem posição ao vivo. Trilha gerada ${dateText(data.generated_at_utc, 'UTC')} UTC, amostragem de ${stepMinutes} min.`;
      return {track, point};
    }
    function updateTrackedMarker() {
      const state = updateTrackReadout();
      if (!state) return;
      const {track, point} = state;
      let markerPoint = point;
      let markerLabel = 'Projeção no solo';
      if (!byId('view-map').hidden) {
        const candidatePasses = customLocation
          ? (customPasses?.passes || [])
          : (data?.passes || []).filter(pass => pass.location_id === selectedLocation);
        const pass = candidatePasses.find(item => item.satellite_id === track.satellite_id && item.peak_utc);
        const peakTime = pass ? Date.parse(pass.peak_utc) : NaN;
        if (Number.isFinite(peakTime)) {
          let nearestDistance = Infinity;
          for (const sample of track.points) {
            const distance = Math.abs(Date.parse(sample.time_utc) - peakTime);
            if (distance < nearestDistance) { nearestDistance = distance; markerPoint = sample; }
          }
          markerLabel = 'Pico previsto da próxima passagem';
        }
      }
      const location = [Number(markerPoint.latitude), Number(markerPoint.longitude)];
      const zone = byId('timeZoneSelect').value || 'UTC';
      const popup = `<strong>${safe(track.satellite_name)}</strong><br>${markerLabel} · ${dateText(markerPoint.time_utc, zone)} (${safe(zone)})<br>${location[0].toFixed(2)}°, ${location[1].toFixed(2)}°`;
      if (!trackedMarker) {
        trackedMarker = L.marker(location, {icon:satelliteIcon, keyboard:false, zIndexOffset:1000}).addTo(selectedTrackLayer);
      } else {
        trackedMarker.setLatLng(location);
      }
      trackedMarker.bindPopup(popup).setZIndexOffset(1000);
    }
    function renderMap(loc, recenter=true) {
      selectedTrackLayer.clearLayers();
      otherTrackLayer.clearLayers();
      observerLayer.clearLayers();
      trackedMarker = null;
      if (recenter) map.setView([loc.latitude, loc.longitude], customLocation ? 7 : 4);
      const observerMarker = L.marker([loc.latitude, loc.longitude], {icon:observerIcon})
        .addTo(observerLayer)
        .bindPopup(`<strong>${safe(loc.name)}</strong><br>Local de observação`);
      const ids = chosenSatellites();
      const trackedId = byId('trackedSatellite').value;
      if (trackedId) ids.add(trackedId);
      const tracks = data.tracks.filter(track => ids.has(track.satellite_id));
      tracks.forEach(track => splitAtDateLine(mapDisplayPoints(track)).forEach(segment => {
        const highlighted = track.satellite_id === trackedId;
        L.polyline(segment, {
          color:highlighted ? '#e47e51' : '#c4c8c0',
          weight:highlighted ? 2.7 : 1.35,
          opacity:highlighted ? .96 : .62,
          dashArray:highlighted ? null : '6 7'
        })
          .bindTooltip(`${safe(track.satellite_name)} (${safe(track.satellite_id)})`)
          .addTo(highlighted ? selectedTrackLayer : otherTrackLayer);
      }));
      const sampleEpoch = data.generated_at_utc;
      const sampleGroups = new Map();
      tracks.filter(track => track.satellite_id !== trackedId).forEach(track => {
        const sample = (track.points || []).find(point => point.time_utc === sampleEpoch);
        if (!sample) return;
        const latitude = Number(sample.latitude);
        const longitude = Number(sample.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const key = `${sample.time_utc}|${latitude.toFixed(2)}|${longitude.toFixed(2)}`;
        if (!sampleGroups.has(key)) sampleGroups.set(key, []);
        sampleGroups.get(key).push({track, sample, latitude, longitude});
      });
      sampleGroups.forEach(group => {
        const first = group[0];
        const epochLabel = `${dateText(first.sample.time_utc, 'UTC')} UTC`;
        const entries = group.map(item => `<li><b>${safe(item.track.satellite_name)}</b> · NORAD ${safe(item.track.satellite_id)} · ${item.latitude.toFixed(3)}°, ${item.longitude.toFixed(3)}°</li>`).join('');
        const popup = `<strong>Posição(ões) amostrada(s)</strong><br>Época do conjunto · ${safe(epochLabel)}<ul class="sample-marker-popup-list">${entries}</ul><small>Posição pré-calculada; não é ao vivo.</small>`;
        L.marker([first.latitude, first.longitude], {icon:sampleSatelliteIcon(group.length), keyboard:false, zIndexOffset:180})
          .bindTooltip(`${group.length} satélite(s) · amostra ${timeText(first.sample.time_utc, 'UTC')} UTC`)
          .bindPopup(popup)
          .addTo(otherTrackLayer);
      });
      updateTrackedMarker();
      syncLayerVisibility();
      updateMapReadout();
    }
    function initializeTrackControls() {
      const tracks = (data.tracks || []).filter(track => Array.isArray(track.points) && track.points.length);
      const select = byId('trackedSatellite');
      if (!tracks.length) {
        select.innerHTML = '<option value="">Sem trilhas disponíveis</option>';
        byId('trackPosition').textContent = 'Gere data/passes.json para preparar uma trilha.';
        return;
      }
      select.innerHTML = tracks.map(track => `<option value="${safe(track.satellite_id)}">${safe(track.satellite_name)} (${safe(track.satellite_id)})</option>`).join('');
      const preferred = tracks.find(track => track.satellite_id === '25544') || tracks[0];
      select.value = preferred.satellite_id;
      select.disabled = false;
      byId('playTrack').disabled = false;
      byId('showTrack').disabled = false;
      currentTrackIndex = 0;
      updateTrackReadout();
    }
    function fitTrackedRoute() {
      const track = selectedTrack();
      if (!track?.points?.length) return;
      const bounds = L.latLngBounds(track.points.map(point => [point.latitude, point.longitude]));
      map.fitBounds(bounds.pad(.04), {maxZoom:3});
    }
    function focusObserver() {
      const loc = currentLocation();
      if (loc) map.setView([loc.latitude, loc.longitude], customLocation ? 7 : 4);
    }
    function toggleTrackPlayback() {
      if (trackTimer) {
        stopTrackPlayback();
        return;
      }
      const points = selectedTrack()?.points || [];
      if (points.length < 2) return;
      if (currentTrackIndex >= points.length - 1) currentTrackIndex = 0;
      byId('playTrack').textContent = 'Pausar';
      trackTimer = window.setInterval(() => {
        if (currentTrackIndex >= points.length - 1) {
          stopTrackPlayback();
          return;
        }
        currentTrackIndex += 1;
        updateTrackedMarker();
      }, 220);
    }
    function setPassCount(value) {
      const count = String(value);
      byId('passCount').textContent = count;
      byId('summaryPassCount').textContent = 'eventos';
      byId('passTableCount').textContent = count;
    }
    function clearPassViews(message) {
      visiblePasses = [];
      byId('passList').innerHTML = `<div class="empty">${safe(message)}</div>`;
      byId('passTableBody').innerHTML = `<tr><td colspan="5" class="empty-cell">${safe(message)}</td></tr>`;
      byId('passDetailTitle').textContent = 'Nenhuma passagem selecionada';
      byId('passDetailNorad').textContent = 'NORAD: —';
      byId('passDetailStart').textContent = '—';
      byId('passDetailPeak').textContent = '—';
      byId('passDetailEnd').textContent = '—';
      byId('passDetailElevation').textContent = '—';
      byId('passDetailAzimuth').textContent = '—';
      byId('passDetailThreshold').textContent = '—';
      byId('passDetailEpoch').textContent = '—';
      byId('passDetailSend').dataset.passIndex = '';
      byId('passDetailSend').disabled = true;
      updateEsp32PassSummary();
    }
    function updateEsp32PassSummary() {
      const pass = visiblePasses[selectedPassIndex];
      const panel = byId('esp32PassSummary');
      const button = byId('esp32SendPass');
      if (!pass) {
        panel.innerHTML = '<p>Nenhuma passagem disponível para envio. Calcule ou selecione um evento primeiro.</p>';
        button.dataset.passIndex = '';
        button.disabled = true;
        return;
      }
      panel.innerHTML = `
        <p><strong>${safe(pass.satellite_name)}</strong></p>
        <div class="serial-metric"><span>NORAD</span><b>${safe(pass.satellite_id)}</b></div>
        <div class="serial-metric"><span>Início · UTC</span><b>${safe(dateText(pass.start_utc, 'UTC'))}</b></div>
        <div class="serial-metric"><span>Pico · UTC</span><b>${safe(dateText(pass.peak_utc || pass.start_utc, 'UTC'))}</b></div>
        <div class="serial-metric"><span>Fim · UTC</span><b>${safe(dateText(pass.end_utc, 'UTC'))}</b></div>
        <div class="serial-metric"><span>Elevação máxima</span><b>${Number(pass.max_elevation_deg).toFixed(1)}°</b></div>`;
      button.dataset.passIndex = String(selectedPassIndex);
      button.disabled = !esp32Port || serialBusy;
    }
    function updatePassDetail() {
      const pass = visiblePasses[selectedPassIndex];
      if (!pass) return clearPassViews('Selecione uma passagem para ver os detalhes.');
      const time = (value) => timeText(value, activePassZone);
      byId('passDetailTitle').textContent = pass.satellite_name || 'Satélite';
      byId('passDetailNorad').textContent = `NORAD: ${pass.satellite_id || '—'}`;
      byId('passDetailStart').textContent = time(pass.start_utc);
      byId('passDetailPeak').textContent = time(pass.peak_utc || pass.start_utc);
      byId('passDetailEnd').textContent = time(pass.end_utc);
      byId('passDetailStart').title = dateText(pass.start_utc, activePassZone);
      byId('passDetailPeak').title = dateText(pass.peak_utc || pass.start_utc, activePassZone);
      byId('passDetailEnd').title = dateText(pass.end_utc, activePassZone);
      byId('passDetailElevation').textContent = `${Number(pass.max_elevation_deg).toFixed(1)}°`;
      byId('passDetailAzimuth').textContent = `${Number(pass.azimuth_at_peak_deg).toFixed(1)}°`;
      byId('passDetailThreshold').textContent = activePassThreshold != null && Number.isFinite(Number(activePassThreshold))
        ? `${Number(activePassThreshold).toFixed(1)}°` : '—';
      byId('passDetailEpoch').textContent = pass.epoch_utc ? dateText(pass.epoch_utc, 'UTC') + ' UTC' : '—';
      byId('passDetailSend').dataset.passIndex = String(selectedPassIndex);
      byId('passDetailSend').disabled = !esp32Port || serialBusy;
      document.querySelectorAll('[data-pass-row]').forEach(row => {
        row.classList.toggle('is-selected', Number(row.dataset.passRow) === selectedPassIndex);
      });
      document.querySelectorAll('.map-pass-card').forEach(card => {
        card.classList.toggle('is-selected', Number(card.dataset.passRow) === selectedPassIndex);
      });
      document.querySelectorAll('[data-select-pass-index]').forEach(control => {
        control.setAttribute('aria-pressed', String(Number(control.dataset.selectPassIndex) === selectedPassIndex));
      });
      updateEsp32PassSummary();
    }
    function selectPass(index) {
      if (!visiblePasses[index]) return;
      selectedPassIndex = index;
      updatePassDetail();
    }
    function renderPasses(loc) {
      setPassCount(0);
      let passes;
      let zone = loc.timezone || 'UTC';
      if (customLocation) {
        if (!customPasses) {
          clearPassViews('Calculando esta localidade.');
          return;
        }
        passes = customPasses.passes;
        zone = customPasses.location.timezone || 'UTC';
        byId('threshold').textContent = `${Number(customPasses.min_elevation_deg).toFixed(1)}°`;
        byId('meta').textContent = `Local consultado · ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)} · fuso ${zone} · cálculo ${dateText(customPasses.generated_at_utc, 'UTC')} UTC`;
      } else {
        const ids = chosenSatellites();
        passes = data.passes.filter(p => p.location_id === loc.id && ids.has(p.satellite_id))
          .sort((a,b) => a.start_utc.localeCompare(b.start_utc));
        byId('threshold').textContent = `${Number(data.min_elevation_deg).toFixed(1)}°`;
        byId('meta').textContent = `Previsão inicial gerada ${dateText(data.generated_at_utc, 'UTC')} UTC · ${data.satellites.length} satélites`;
      }
      activePassZone = zone;
      activePassThreshold = customLocation ? customPasses.min_elevation_deg : data.min_elevation_deg;
      const windowEnd = customPasses?.window_end_utc || data.window_end_utc;
      byId('tableWindowLabel').textContent = windowEnd ? `Até ${dateText(windowEnd, 'UTC')} UTC` : 'Janela dos dados orbitais';
      if (!passes.length) {
        clearPassViews('Nenhuma passagem acima do limiar nesta janela para este ponto e seleção.');
        return;
      }
      setPassCount(passes.length);
      visiblePasses = passes.slice();
      selectedPassIndex = Math.min(selectedPassIndex, passes.length - 1);
      byId('passList').innerHTML = passes.slice(0, 3).map((pass, index) => `
        <article class="map-pass-card${index === selectedPassIndex ? ' is-selected' : ''}" data-pass-row="${index}">
          <button class="pass-card-select" type="button" data-select-pass-index="${index}" aria-pressed="${index === selectedPassIndex}">
            <span class="pass-card-identity"><strong>${safe(pass.satellite_name)}</strong><small>NORAD: ${safe(pass.satellite_id)}</small></span>
            <span class="pass-card-times"><span><i>INÍCIO</i><b>${timeText(pass.start_utc, zone)}</b></span><span><i>MÁX. ELEVAÇÃO</i><b>${Number(pass.max_elevation_deg).toFixed(1)}°</b></span><span><i>FIM</i><b>${timeText(pass.end_utc, zone)}</b></span></span>
          </button>
          <div class="pass-card-meta"><span>Az. ${Number(pass.azimuth_at_peak_deg).toFixed(1)}°</span><button class="send-pass-button" type="button" data-pass-index="${index}" ${esp32Port && !serialBusy ? '' : 'disabled'}>Enviar resumo</button></div>
        </article>`).join('');
      byId('passTableBody').innerHTML = passes.map((pass, index) => `
        <tr data-pass-row="${index}" class="${index === selectedPassIndex ? 'is-selected' : ''}">
          <td><button class="table-pass-select" type="button" data-select-pass-index="${index}" aria-pressed="${index === selectedPassIndex}">${safe(pass.satellite_name)}<small>NORAD ${safe(pass.satellite_id)}</small></button></td>
          <td title="${safe(dateText(pass.start_utc, zone))}">${timeText(pass.start_utc, zone)}</td>
          <td>${Number(pass.max_elevation_deg).toFixed(1)}°</td>
          <td>${Number(pass.azimuth_at_peak_deg).toFixed(1)}°</td>
          <td title="${safe(dateText(pass.end_utc, zone))}">${timeText(pass.end_utc, zone)}</td>
        </tr>`).join('');
      updatePassDetail();
      updateSendButtonState();
    }
    function render() {
      if (!data) return;
      const loc = currentLocation();
      if (!loc) return;
      updateOverview();
      renderMap(loc);
      renderPasses(loc);
    }
    async function calculateAt(location) {
      if (busy) return;
      const ids = [...chosenSatellites()];
      if (!ids.length) {
        byId('searchStatus').textContent = 'Marque pelo menos um satélite.';
        return;
      }
      customLocation = location;
      customPasses = null;
      render();
      setBusy(true, 'Calculando para ' + location.name + '…');
      try {
        const zone = byId('timeZoneSelect').value || location.timezone || 'UTC';
        const response = await fetch('/api/passes', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({name:location.name, latitude:location.latitude, longitude:location.longitude, timezone:zone, satellite_ids:ids})
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        customLocation = {...result.location, timezone:byId('timeZoneSelect').value};
        customPasses = result;
        customPasses.location.timezone = byId('timeZoneSelect').value;
        render();
        setBusy(false, `Pronto: ${result.passes.length} passagem(ns) calculada(s) para ${result.location.name}.`);
      } catch (error) {
        customPasses = null;
        render();
        setBusy(false, `Não consegui calcular: ${error.message}`);
      }
    }
    async function searchCity(event) {
      event.preventDefault();
      const query = byId('cityQuery').value.trim();
      if (query.length < 2) return;
      setBusy(true, 'Buscando cidade…');
      byId('searchResultsPanel').hidden = false;
      byId('searchResults').innerHTML = '<option value="">Consultando…</option>';
      byId('searchResults').disabled = true;
      try {
        const response = await fetch('/api/geocode', {
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query})
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        const results = result.results || [];
        const select = byId('searchResults');
        if (!results.length) {
          select.innerHTML = '<option value="">Nenhum resultado; tente nome + estado/país</option>';
          setBusy(false, 'Nenhum local encontrado.');
          return;
        }
        select.innerHTML = results.map((item,index) => `<option value="${index}">${safe(item.name)}</option>`).join('');
        select.disabled = false;
        window.geoPassSearchResults = results;
        byId('useSearchResult').disabled = false;
        setBusy(false, `${results.length} resultado(s). Escolha um e clique em “Calcular neste local”.`);
      } catch (error) {
        byId('searchResults').innerHTML = '<option value="">Busca indisponível</option>';
        setBusy(false, `Busca falhou: ${error.message}`);
      }
    }
    async function start() {
      try {
        const response = await fetch('/data/passes.json', {cache:'no-store'});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        data = await response.json();
        if (!data.locations?.length || !data.satellites?.length) throw new Error('O arquivo não tem localidades ou satélites.');
        const select = byId('locationSelect');
        select.innerHTML = data.locations.map(loc => `<option value="${safe(loc.id)}">${safe(loc.name)}</option>`).join('');
        selectedLocation = data.locations[0].id;
        const zoneSelect = byId('timeZoneSelect');
        const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserZone && ![...zoneSelect.options].some(option => option.value === browserZone)) {
          const option = document.createElement('option');
          option.value = browserZone;
          option.textContent = `${browserZone} · fuso do computador`;
          zoneSelect.insertBefore(option, zoneSelect.firstChild);
        }
        if (browserZone) zoneSelect.value = browserZone;
        initializeTrackControls();
        const mapSidebar = byId('mapSidebar');
        const mobileControlsToggle = byId('mobileControlsToggle');
        const mobileControlsAction = byId('mobileControlsToggleAction');
        const compactViewport = window.matchMedia('(max-width: 1050px)');
        const syncMapControlsDisclosure = () => {
          mapSidebar.open = !compactViewport.matches;
          mobileControlsToggle.setAttribute('aria-expanded', String(mapSidebar.open));
          mobileControlsAction.textContent = mapSidebar.open ? 'Recolher' : 'Abrir';
        };
        syncMapControlsDisclosure();
        compactViewport.addEventListener('change', syncMapControlsDisclosure);
        mobileControlsToggle.addEventListener('click', () => {
          mapSidebar.open = !mapSidebar.open;
          mobileControlsToggle.setAttribute('aria-expanded', String(mapSidebar.open));
          mobileControlsAction.textContent = mapSidebar.open ? 'Recolher' : 'Abrir';
        });
        document.querySelectorAll('[data-view]').forEach(button => {
          button.addEventListener('click', () => switchView(button.dataset.view));
        });
        byId('baseMapSelect').addEventListener('change', changeBaseMap);
        changeBaseMap();
        ['layerSelectedTrack','layerObserver','layerOtherTracks'].forEach(id => {
          byId(id).addEventListener('change', syncLayerVisibility);
        });
        map.on('moveend zoomend', updateMapReadout);
        select.addEventListener('change', () => {
          customLocation = null; customPasses = null; selectedLocation = select.value; render();
          byId('searchStatus').textContent = 'Exibindo a previsão inicial para a localidade selecionada.';
        });
        byId('cityForm').addEventListener('submit', searchCity);
        byId('useSearchResult').addEventListener('click', () => {
          const item = window.geoPassSearchResults?.[Number(byId('searchResults').value)];
          if (item) {
            if (item.timezone && [...zoneSelect.options].some(option => option.value === item.timezone)) {
              zoneSelect.value = item.timezone;
            }
            calculateAt({...item, timezone:zoneSelect.value});
          }
        });
        zoneSelect.addEventListener('change', () => {
          if (customLocation) {
            customLocation.timezone = zoneSelect.value;
            if (customPasses) customPasses.location.timezone = zoneSelect.value;
            render();
          } else {
            updateTrackedMarker();
            updateOverview();
            updatePassDetail();
          }
        });
        byId('trackedSatellite').addEventListener('change', () => {
          stopTrackPlayback();
          currentTrackIndex = 0;
          updateTrackReadout();
          updateOverview();
          renderMap(currentLocation(), false);
        });
        byId('trackSlider').addEventListener('input', event => {
          stopTrackPlayback();
          currentTrackIndex = Number(event.currentTarget.value);
          updateTrackedMarker();
        });
        byId('playTrack').addEventListener('click', toggleTrackPlayback);
        byId('showTrack').addEventListener('click', fitTrackedRoute);
        byId('showObserver').addEventListener('click', focusObserver);
        byId('connectEsp32').addEventListener('click', toggleEsp32Connection);
        byId('esp32SendPass').addEventListener('click', sendPassToEsp32);
        byId('passList').addEventListener('click', sendPassToEsp32);
        byId('passList').addEventListener('click', event => {
          const control = event.target.closest('[data-select-pass-index]');
          if (control) selectPass(Number(control.dataset.selectPassIndex));
        });
        byId('passTableBody').addEventListener('click', event => {
          const control = event.target.closest('[data-select-pass-index]');
          if (control) selectPass(Number(control.dataset.selectPassIndex));
        });
        byId('passTableBody').addEventListener('click', sendPassToEsp32);
        byId('passDetailSend').addEventListener('click', sendPassToEsp32);
        initializeSerialUi();
        byId('selectAll').addEventListener('click', () => {
          const checks = [...document.querySelectorAll('.sat-check')];
          const allChecked = checks.every(check => check.checked);
          checks.forEach((check, index) => { check.checked = !allChecked && index < 12; });
          byId('searchStatus').textContent = allChecked ? 'Seleção limpa.' : 'Selecionados os primeiros 12 satélites (limite desta versão).';
          if (customLocation) calculateAt(customLocation); else render();
        });
        setSatelliteFilters();
        map.on('click', event => {
          const lat = event.latlng.lat, lon = event.latlng.lng;
          calculateAt({name:`Ponto no mapa (${lat.toFixed(3)}, ${lon.toFixed(3)})`, latitude:lat, longitude:lon, timezone:zoneSelect.value});
        });
        window.addEventListener('resize', () => {
          if (window.geoPassActiveView === 'map' || window.geoPassActiveView === 'tracker') {
            map.invalidateSize({animate:false});
            overviewMap.invalidateSize({animate:false});
          }
        });
        byId('threshold').textContent = `${Number(data.min_elevation_deg).toFixed(1)}°`;
        const ageHours = (Date.now() - new Date(data.generated_at_utc).getTime()) / 3600000;
        if (ageHours > 24) {
          byId('warning').style.display = 'block';
          byId('warning').textContent = 'Atenção: os resultados iniciais foram gerados há mais de 24 horas. Atualize os dados orbitais no terminal.';
        }
        if (data.warnings?.length) {
          byId('warning').style.display = 'block';
          byId('warning').textContent += (byId('warning').textContent ? ' ' : '') + `${data.warnings.length} registro(s) orbital(is) foram ignorados; veja o log.`;
        }
        render();
        const requestedView = window.location.hash.slice(1);
        const initialView = ['map','passes','tracker','esp32','methodology'].includes(requestedView) ? requestedView : 'map';
        switchView(initialView, false);
      } catch (error) {
        byId('systemIndicator').classList.remove('is-pending', 'is-stale');
        byId('systemIndicator').classList.add('is-offline');
        byId('systemStatus').textContent = 'Dados indisponíveis';
        byId('passList').innerHTML = `<div class="empty">Não consegui carregar os dados iniciais: ${safe(error.message)}. Gere-os primeiro com <code>python scripts/build_dataset.py</code> e rode <code>python server.py</code>.</div>`;
      }
    }
    start();
  })();
