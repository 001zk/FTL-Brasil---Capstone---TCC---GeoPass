import fs from 'node:fs';
import { json2satrec } from '../web/assets/vendor/satellite-js-7.2.0/dist/io.js';
import { gstime, propagate } from '../web/assets/vendor/satellite-js-7.2.0/dist/propagation.js';
import { eciToGeodetic } from '../web/assets/vendor/satellite-js-7.2.0/dist/transforms.js';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const satrec = json2satrec(input.elements);
if (satrec.error) throw new Error(`satellite.js initialization failed: ${satrec.error}`);
const results = input.times.map(value => {
  const date = new Date(value);
  const pv = propagate(satrec, date);
  if (!pv || satrec.error) throw new Error(`satellite.js propagation failed: ${satrec.error}`);
  const geo = eciToGeodetic(pv.position, gstime(date));
  return {
    time: date.toISOString(),
    position_teme_km: [pv.position.x, pv.position.y, pv.position.z],
    velocity_teme_km_s: [pv.velocity.x, pv.velocity.y, pv.velocity.z],
    latitude_deg: geo.latitude * 180 / Math.PI,
    longitude_deg: geo.longitude * 180 / Math.PI,
    altitude_km: geo.height,
  };
});
process.stdout.write(JSON.stringify({satellite_id: String(satrec.satnum), results}));
