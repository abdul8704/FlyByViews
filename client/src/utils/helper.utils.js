export function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Estimate arrival time given distance (km), departure time (ISO string or Date), and average speed (km/h)
export function estimateArrivalTime(distanceKm, departureTime, averageSpeedKmh = 850) {
  if (!distanceKm || !departureTime) return null;
  const dep = departureTime instanceof Date ? departureTime : new Date(departureTime);
  if (Number.isNaN(dep.getTime())) return null;
  const durationHours = distanceKm / averageSpeedKmh;
  const durationMs = Math.round(durationHours * 3600 * 1000);
  const arrival = new Date(dep.getTime() + durationMs);
  return { arrival, iso: arrival.toISOString(), durationHours };
}

// Optional: format hours as "Hh Mmin"
export function formatDurationHours(hours) {
  if (typeof hours !== 'number' || !Number.isFinite(hours)) return '';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
