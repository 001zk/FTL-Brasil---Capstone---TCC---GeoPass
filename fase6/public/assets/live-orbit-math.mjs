export {normalizeLongitude, splitAtAntimeridian} from './trajectory.mjs';

export function classifyElementAge(ageSeconds, delivery = 'live') {
  if (!Number.isFinite(ageSeconds) || ageSeconds < -300) return 'invalid';
  if (ageSeconds > 72 * 3600) return 'unavailable';
  if (ageSeconds > 24 * 3600 || delivery === 'build_snapshot_stale') return 'aging';
  return 'recent';
}
