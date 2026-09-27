import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import SentimentBadge from '../../components/SentimentBadge';
import { EmptyState } from '../../components/Feedback';
import { formatDateTime } from '../../lib/format';

export default function AdminSentiment() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/sentiment-flags').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="max-w-4xl mx-auto px-4 py-16"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/admin" className="text-pine-600 font-semibold text-sm mb-6 inline-block">← Back to dashboard</Link>
      <h1 className="text-3xl font-extrabold mb-2">Flagged for review</h1>
      <p className="text-muted mb-8 max-w-2xl">
        Ratings and care notes our sentiment model scored as negative — useful for catching concerning
        feedback even when a star rating alone wouldn't have flagged it.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Flagged reviews ({data.flaggedRatings.length})</h2>
        {data.flaggedRatings.length === 0 && (
          <EmptyState title="Nothing flagged" body="No family reviews have been scored as negative." />
        )}
        <div className="space-y-4">
          {data.flaggedRatings.map((r) => (
            <Link key={r.booking_id} to={`/bookings/${r.booking_id}`} className="card block hover:border-pine-300">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="font-bold">{r.patient_name} · {r.caregiver_name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">{r.rating_score}/5 stars</span>
                  <SentimentBadge label={r.sentiment_label} />
                </div>
              </div>
              {r.rating_comment && <p className="text-muted">"{r.rating_comment}"</p>}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Flagged care notes ({data.flaggedNotes.length})</h2>
        {data.flaggedNotes.length === 0 && (
          <EmptyState title="Nothing flagged" body="No care notes have been scored as negative." />
        )}
        <div className="space-y-4">
          {data.flaggedNotes.map((n) => (
            <Link key={n.note_id} to={`/bookings/${n.booking_id}`} className="card block hover:border-pine-300">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="font-bold">{n.patient_name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{n.author_name} ({n.author_role.toLowerCase()})</span>
                  <SentimentBadge label={n.sentiment_label} />
                </div>
              </div>
              <p className="text-muted mb-1">{n.note}</p>
              <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
