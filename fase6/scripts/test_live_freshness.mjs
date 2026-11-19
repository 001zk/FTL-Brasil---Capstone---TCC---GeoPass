import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyElementAge } from '../web/assets/live-orbit-math.mjs';

const hour = 3600;
assert.equal(classifyElementAge(24 * hour), 'recent');
assert.equal(classifyElementAge(24 * hour + 1), 'aging');
assert.equal(classifyElementAge(72 * hour), 'aging');
assert.equal(classifyElementAge(72 * hour + 1), 'unavailable');
assert.equal(classifyElementAge(72 * hour + 1, 'build_snapshot_stale'), 'unavailable');
assert.equal(classifyElementAge(hour, 'build_snapshot_stale'), 'aging');
assert.equal(classifyElementAge(Number.NaN), 'invalid');
assert.equal(classifyElementAge(-301), 'invalid');

const elements = new Map();
function makeElement(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      textContent: '',
      hidden: false,
      disabled: false,
      value: 'imagery',
      classList: {add() {}, remove() {}},
      addEventListener() {},
    });
  }
  return elements.get(id);
}

const map = {
  layers: new Set(),
  views: [],
  hasLayer(layer) { return this.layers.has(layer); },
  removeLayer(layer) { this.layers.delete(layer); },
  setView(point, zoom) { this.views.push({point, zoom}); },
  invalidateSize() {},
  getZoom() { return 2; },
};
const layer = kind => ({
  kind,
  items: [],
  addTo(target) { target.layers.add(this); return this; },
  clearLayers() { this.items.length = 0; },
});
const leaflet = {
  map() { return map; },
  tileLayer() { return layer('tile'); },
  layerGroup() { return layer('track-group'); },
  divIcon(options) { return options; },
  marker() {
    return {
      kind: 'satellite-marker',
      addTo(target) { target.layers.add(this); return this; },
      setLatLng(point) { this.point = point; },
    };
  },
  polyline(points) {
    return {
      kind: 'track-line',
      points,
      addTo(target) { target.layers.add(this); return this; },
    };
  },
};

globalThis.document = {
  visibilityState: 'visible',
  getElementById: makeElement,
  addEventListener() {},
};
globalThis.window = {
  L: leaflet,
  geoPassActiveView: 'live',
  addEventListener() {},
  requestAnimationFrame(callback) { callback(); },
  setInterval() { return 1; },
  setTimeout(callback) { callback(); return 1; },
};

const payload = JSON.parse(await readFile(new URL('../tests/fixtures/iss_omm_sample.json', import.meta.url), 'utf-8'));
const now = new Date();
const epoch = new Date(now.getTime() - 73 * hour * 1000);
payload.elements.EPOCH = epoch.toISOString().replace('Z', '');
payload.epoch_utc = epoch.toISOString();
payload.fetched_at_utc = now.toISOString();
payload.delivery = 'live';
payload.source = 'CelesTrak (fixture de teste)';
globalThis.fetch = async () => ({ok: true, json: async () => payload});

await import('../web/assets/live-orbit.js');
for (let attempt = 0; attempt < 50 && !makeElement('liveStatusBadge').textContent.includes('POSIÇÃO INDISPONÍVEL'); attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 10));
}

assert.match(makeElement('liveStatusBadge').textContent, /POSIÇÃO INDISPONÍVEL.*72 H/);
assert.match(makeElement('liveError').textContent, /não são calculadas nem exibidas/);
for (const id of ['liveLatitude', 'liveLongitude', 'liveAltitude', 'liveVelocity', 'liveTimeUtc', 'liveTimeLocal', 'livePeriod']) {
  assert.equal(makeElement(id).textContent, '—', `${id} deve ficar indisponível`);
}
assert.equal(makeElement('liveCenter').disabled, true);
assert.equal([...map.layers].filter(item => item.kind === 'satellite-marker').length, 0);
assert.equal([...map.layers].filter(item => item.kind === 'track-line').length, 0);
assert.equal(map.views.length, 0, 'não deve centralizar mapa em uma posição expirada');
console.log('Freshness aprovada: >72 h indisponível; UI sem posição, marcador ou trilha.');
