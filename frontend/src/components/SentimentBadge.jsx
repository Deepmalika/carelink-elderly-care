import { SENTIMENT_STYLES } from '../lib/format';

export default function SentimentBadge({ label }) {
  if (!label || !SENTIMENT_STYLES[label]) return null;
  const { label: text, className } = SENTIMENT_STYLES[label];
  return <span className={`badge text-xs ${className}`}>{text}</span>;
}
