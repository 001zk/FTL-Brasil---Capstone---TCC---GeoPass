export function normalizeLongitude(value) {
  return ((Number(value) + 540) % 360) - 180;
}

export function sanitizeTrajectory(points) {
  if (!Array.isArray(points)) return [];
  return points.map(point => ({
    ...point,
    latitude: Number(point.latitude ?? point.lat),
    longitude: normalizeLongitude(point.longitude ?? point.lon),
    time_utc: String(point.time_utc ?? point.time ?? ''),
  })).filter(point => Number.isFinite(point.latitude) && point.latitude >= -90 && point.latitude <= 90 && Number.isFinite(point.longitude) && (!point.time_utc || Number.isFinite(Date.parse(point.time_utc))));
}

export function splitAtAntimeridian(points, maxJump = 180) {
  const clean = sanitizeTrajectory(points);
  const segments = [];
  let segment = [];
  for (const point of clean) {
    const next = [point.latitude, point.longitude];
    const previous = segment[segment.length - 1];
    if (previous && Math.abs(next[1] - previous[1]) >= maxJump) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
    }
    segment.push(next);
  }
  if (segment.length > 1) segments.push(segment);
  return segments;
}

export function splitPointObjectsAtAntimeridian(points, maxJump = 180) {
  const clean = sanitizeTrajectory(points);
  const segments = [];
  let segment = [];
  for (const point of clean) {
    const previous = segment[segment.length - 1];
    if (previous && Math.abs(point.longitude - previous.longitude) >= maxJump) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
    }
    segment.push(point);
  }
  if (segment.length > 1) segments.push(segment);
  return segments;
}

export function partitionByTime(points, boundaryIso) {
  const clean = sanitizeTrajectory(points);
  const boundary = Date.parse(boundaryIso);
  if (!Number.isFinite(boundary)) return {past: [], future: clean};
  return {
    past: clean.filter(point => Date.parse(point.time_utc) <= boundary),
    future: clean.filter(point => Date.parse(point.time_utc) >= boundary),
  };
}

export function nearestPoint(points, targetIso) {
  const clean = sanitizeTrajectory(points);
  const target = Date.parse(targetIso);
  if (!clean.length) return null;
  return clean.reduce((nearest, point) => {
    if (!nearest) return point;
    return Math.abs(Date.parse(point.time_utc) - target) < Math.abs(Date.parse(nearest.time_utc) - target) ? point : nearest;
  }, null);
}
