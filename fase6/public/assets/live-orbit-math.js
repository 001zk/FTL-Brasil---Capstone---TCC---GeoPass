export function normalizeLongitude(value) {
  return ((value + 540) % 360) - 180;
}

export function splitAtAntimeridian(points) {
  const segments = [];
  let segment = [];
  for (const point of points) {
    if (segment.length && Math.abs(point.lon - segment[segment.length - 1].lon) > 180) {
      if (segment.length > 1) segments.push(segment.map(item => [item.lat, item.lon]));
      segment = [];
    }
    segment.push(point);
  }
  if (segment.length > 1) segments.push(segment.map(item => [item.lat, item.lon]));
  return segments;
}
