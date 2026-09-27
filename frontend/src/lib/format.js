export const CATEGORY_LABELS = {
  NURSING_CARE: 'Nursing Care',
  ELDERLY_ATTENDANT: 'Elderly Attendant',
  PHYSIOTHERAPY: 'Physiotherapy',
  POST_HOSPITAL_CARE: 'Post-Hospital Care',
};

export const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-600',
  ACCEPTED: 'bg-pine-100 text-pine-700',
  IN_PROGRESS: 'bg-pine-100 text-pine-700',
  COMPLETED: 'bg-pine-500 text-white',
  REJECTED: 'bg-red-100 text-clay',
  CANCELLED: 'bg-gray-200 text-muted',
};

export const SENTIMENT_STYLES = {
  POSITIVE: { label: '🙂 Positive', className: 'bg-pine-50 text-pine-700 border border-pine-100' },
  NEGATIVE: { label: '⚠️ Negative', className: 'bg-red-50 text-clay border border-clay/30' },
  NEUTRAL: { label: '· Neutral', className: 'bg-gray-50 text-muted border border-gray-100' },
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount || 0
  );
}

export function formatDateTime(value) {
  if (!value) return '—';
  // Timestamps are stored as naive UTC strings ("YYYY-MM-DD HH:MM:SS", no
  // timezone marker), so a browser parses that shape as *local* time by
  // default instead of UTC — silently showing every date/time offset by
  // the viewer's own UTC offset. Rewriting it into a proper ISO string
  // with an explicit "Z" forces correct UTC parsing before converting to
  // the viewer's local time for display.
  const isoish = typeof value === 'string' && value.includes(' ') && !value.includes('T')
    ? value.replace(' ', 'T') + 'Z'
    : value;
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDuration(minutes) {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} day${minutes > 1440 ? 's' : ''} (live-in)`;
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${minutes} minutes`;
}
