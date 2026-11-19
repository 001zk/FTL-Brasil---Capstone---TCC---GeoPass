import assert from 'node:assert/strict';
import {nearestPoint, partitionByTime, sanitizeTrajectory, splitAtAntimeridian, splitPointObjectsAtAntimeridian} from '../web/assets/trajectory.mjs';

const crossing = [
  {time_utc:'2026-01-01T00:00:00Z', latitude:10, longitude:170},
  {time_utc:'2026-01-01T00:02:00Z', latitude:11, longitude:179},
  {time_utc:'2026-01-01T00:04:00Z', latitude:12, longitude:-179},
  {time_utc:'2026-01-01T00:06:00Z', latitude:13, longitude:-160},
];
const segments = splitAtAntimeridian(crossing);
assert.equal(segments.length, 2);
assert.deepEqual(segments[0], [[10, 170], [11, 179]]);
assert.deepEqual(segments[1], [[12, -179], [13, -160]]);
for (const segment of segments) for (let i = 1; i < segment.length; i += 1) assert.ok(Math.abs(segment[i][1] - segment[i - 1][1]) < 180);
assert.equal(splitAtAntimeridian([{latitude:89.9,longitude:20,time_utc:'2026-01-01T00:00:00Z'},{latitude:89.8,longitude:21,time_utc:'2026-01-01T00:01:00Z'}]).length, 1);
assert.equal(splitAtAntimeridian([{latitude:-89.9,longitude:-20,time_utc:'2026-01-01T00:00:00Z'},{latitude:-89.8,longitude:-19,time_utc:'2026-01-01T00:01:00Z'}]).length, 1);
const cleaned = sanitizeTrajectory([{lat:20, lon:181, time:'2026-01-01T00:00:00Z'},{lat:91,lon:0,time:'2026-01-01T00:01:00Z'}]);
assert.deepEqual(cleaned[0], {lat:20, lon:181, time:'2026-01-01T00:00:00Z', latitude:20, longitude:-179, time_utc:'2026-01-01T00:00:00Z'});
assert.equal(cleaned.length, 1);
const parts = partitionByTime(crossing, '2026-01-01T00:04:00Z');
assert.equal(parts.past.length, 3);
assert.equal(parts.future.length, 2);
assert.equal(nearestPoint(crossing, '2026-01-01T00:03:20Z').time_utc, '2026-01-01T00:04:00Z');
const objectSegments = splitPointObjectsAtAntimeridian(crossing);
assert.equal(objectSegments.length, 2);
assert.equal(objectSegments[1][0].time_utc, '2026-01-01T00:04:00Z');
console.log('Trajetória compartilhada: antimeridiano, polos, hemisférios, partição e sincronização aprovados.');
