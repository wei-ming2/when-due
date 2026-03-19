export function formatTimeEstimate(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '';

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

export function parseTimeEstimateInput(value: string): number | null {
  const normalized = value.trim().toLowerCase().replace(/^~/, '').trim();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const minutes = parseInt(normalized, 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
  }

  let totalMinutes = 0;
  const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = normalized.match(/(\d+)\s*m/);

  if (hoursMatch) {
    totalMinutes += Math.round(parseFloat(hoursMatch[1]) * 60);
  }

  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  return totalMinutes > 0 ? totalMinutes : null;
}
