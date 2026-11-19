import assert from 'node:assert/strict';
import { normalizeLongitude, splitAtAntimeridian } from '../web/assets/live-orbit-math.mjs';

const source = [
  {lat: 10, lon: 170},
  {lat: 11, lon: 179},
  {lat: 12, lon: -179},
  {lat: 13, lon: -160},
];
const segments = splitAtAntimeridian(source);
assert.deepEqual(segments, [
  [[10, 170], [11, 179]],
  [[12, -179], [13, -160]],
]);
for (const segment of segments) {
  for (let index = 1; index < segment.length; index += 1) {
    assert.ok(Math.abs(segment[index][1] - segment[index - 1][1]) <= 180);
  }
}
assert.equal(normalizeLongitude(181), -179);
assert.equal(normalizeLongitude(-181), 179);
console.log('Ground track antimeridiano OK: segmentos separados, sem linha atravessando o mapa.');
