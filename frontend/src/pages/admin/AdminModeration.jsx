import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import SentimentBadge from '../../components/SentimentBadge';
import { EmptyState } from '../../components/Feedback';
import { formatDateTime } from '../../lib/format';

export default function AdminModeration() {
  const [reviews, setReviews] = useState(null);
  const [notes, setNotes] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  function reload() {
    api.get('/admin/reviews').then((res) => setReviews(res.data.reviews));
    api.get('/admin/care-notes').then((res) => setNotes(res.data.notes));
  }

  useEffect(reload, []);

  async function handleDeleteReview(bookingId) {
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    setError('');
    setBusyId(bookingId);
    try {
      await api.delete(`/bookings/${bookingId}/review`);
      setReviews((prev) => prev.filter((r) => r.booking_id !== bookingId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteNote(bookingId, noteId) {
    if (!window.confirm('Delete this care note? This cannot be undone.')) return;
    setError('');
    setBusyId(noteId);
    try {
      await api.delete(`/bookings/${bookingId}/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.note_id !== noteId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const loading = !reviews || !notes;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/admin" className="text-pine-600 font-semibold text-sm mb-6 inline-block">← Back to dashboard</Link>
      <h1 className="text-3xl font-extrabold mb-2">All reviews & care notes</h1>
      <p className="text-muted mb-8 max-w-2xl">
        Every review and care note on the platform, not just the ones sentiment analysis flagged.
        Use this if you need to remove something regardless of its sentiment label.
      </p>

      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</div>
      )}

      {loading && <Spinner />}

      {!loading && (
        <>
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Reviews ({reviews.length})</h2>
            {reviews.length === 0 && (
              <EmptyState title="No reviews yet" body="Family members haven't rated any completed visits yet." />
            )}
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.booking_id} className="card">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <Link to={`/bookings/${r.booking_id}`} className="font-bold hover:underline">
                      {r.patient_name} · {r.caregiver_name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted">{r.rating_score}/5 stars</span>
                      {r.sentiment_label && <SentimentBadge label={r.sentiment_label} />}
                    </div>
                  </div>
                  {r.rating_comment && <p className="text-muted mb-2">"{r.rating_comment}"</p>}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">{formatDateTime(r.updated_at)}</p>
                    <button
                      type="button"
                      disabled={busyId === r.booking_id}
                      onClick={() => handleDeleteReview(r.booking_id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">Care notes ({notes.length})</h2>
            {notes.length === 0 && (
              <EmptyState title="No care notes yet" body="No care notes have been added to any booking yet." />
            )}
            <div className="space-y-4">
              {notes.map((n) => (
                <div key={n.note_id} className="card">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <Link to={`/bookings/${n.booking_id}`} className="font-bold hover:underline">
                      {n.patient_name} · {n.caregiver_name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{n.author_name} ({n.author_role.toLowerCase()})</span>
                      {n.sentiment_label && <SentimentBadge label={n.sentiment_label} />}
                    </div>
                  </div>
                  <p className="text-muted mb-2">{n.note}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
                    <button
                      type="button"
                      disabled={busyId === n.note_id}
                      onClick={() => handleDeleteNote(n.booking_id, n.note_id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete note
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
