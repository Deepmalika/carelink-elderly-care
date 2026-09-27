import { STATUS_STYLES } from '../lib/format';

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] || 'bg-gray-100 text-muted'} ${status === 'IN_PROGRESS' ? 'animate-soft-pulse' : ''}`}>
      {status.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}
