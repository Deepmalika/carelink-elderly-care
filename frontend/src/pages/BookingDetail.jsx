import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import SentimentBadge from '../components/SentimentBadge';
import { ErrorBanner, SuccessBanner } from '../components/Feedback';
import { formatCurrency, formatDateTime } from '../lib/format';

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [notes, setNotes] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function reload() {
    api.get(`/bookings/${id}`).then((res) => setBooking(res.data.booking));
    api.get(`/bookings/${id}/notes`).then((res) => setNotes(res.data.notes));
  }

  useEffect(reload, [id]);

  async function runAction(fn) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    await runAction(async () => {
      await api.post(`/bookings/${id}/notes`, { note: noteText.trim() });
      setNoteText('');
      setMessage('Note added.');
    });
  }

  async function handleDeleteNote(noteId) {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    await runAction(async () => {
      await api.delete(`/bookings/${id}/notes/${noteId}`);
      setMessage('Note deleted.');
    });
  }

  async function handleDeleteReview() {
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    await runAction(async () => {
      await api.delete(`/bookings/${id}/review`);
      setMessage('Review deleted.');
    });
  }

  if (!booking) return <div className="max-w-3xl mx-auto px-4 py-16"><Spinner /></div>;

  const isCaregiver = user.role === 'CAREGIVER';
  const isFamily = user.role === 'FAMILY';
  const canRate = isFamily && booking.status === 'COMPLETED' && booking.rating_score == null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link to={isCaregiver ? '/caregiver' : isFamily ? '/family' : '/admin'} className="text-pine-600 font-semibold text-sm mb-6 inline-block">
        ← Back to dashboard
      </Link>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold">{booking.service?.name}</h1>
          <StatusBadge status={booking.status} />
        </div>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted">Patient</dt>
            <dd className="font-semibold">{booking.patient?.name} ({booking.patient?.age} yrs)</dd>
          </div>
          <div>
            <dt className="text-muted">Caregiver</dt>
            <dd className="font-semibold">{booking.caregiver?.user?.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Scheduled for</dt>
            <dd className="font-semibold">{formatDateTime(booking.scheduled_date)}</dd>
          </div>
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="font-semibold">{formatCurrency(booking.service?.price)}</dd>
          </div>
        </dl>
      </div>

      <ErrorBanner message={error} />
      {message && <div className="mb-4"><SuccessBanner message={message} /></div>}

      {/* Caregiver actions */}
      {isCaregiver && booking.status === 'PENDING' && (
        <div className="card mb-6 flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => runAction(() => api.patch(`/bookings/${id}/accept`))} className="btn-primary">
            Accept request
          </button>
          <button disabled={busy} onClick={() => runAction(() => api.patch(`/bookings/${id}/reject`))} className="btn-danger">
            Decline request
          </button>
        </div>
      )}
      {isCaregiver && booking.status === 'ACCEPTED' && (
        <div className="card mb-6">
          <button disabled={busy} onClick={() => runAction(() => api.patch(`/bookings/${id}/status`, { status: 'IN_PROGRESS' }))} className="btn-primary">
            Mark visit as started
          </button>
        </div>
      )}
      {isCaregiver && booking.status === 'IN_PROGRESS' && (
        <div className="card mb-6">
          <button disabled={busy} onClick={() => runAction(() => api.patch(`/bookings/${id}/status`, { status: 'COMPLETED' }))} className="btn-primary">
            Mark visit as completed
          </button>
        </div>
      )}

      {/* Family rating */}
      {canRate && (
        <div className="card mb-6">
          <h2 className="font-bold mb-3">Rate this visit</h2>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRatingScore(n)}
                className={`w-10 h-10 rounded-full border-2 font-bold ${
                  ratingScore >= n ? 'bg-amber-400 border-amber-400 text-pine-700' : 'border-pine-100 text-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            className="input min-h-[80px] mb-3"
            placeholder="Optional feedback about the caregiver's visit"
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
          />
          <button
            disabled={busy}
            onClick={() => runAction(() => api.patch(`/bookings/${id}/rate`, { score: ratingScore, comment: ratingComment || undefined }))}
            className="btn-amber"
          >
            Submit rating
          </button>
        </div>
      )}
      {(isFamily || user.role === 'ADMIN') && booking.rating_score && (
        <div className="card mb-6 bg-pine-50 border-pine-100">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-pine-700">
              {isFamily ? `You rated this visit ${booking.rating_score}/5` : `Family rated this visit ${booking.rating_score}/5`}
            </p>
            <SentimentBadge label={booking.sentiment_label} />
          </div>
          {booking.rating_comment && <p className="text-muted mt-1">"{booking.rating_comment}"</p>}
          {(booking.patient?.owner_id === user.id || user.role === 'ADMIN') && (
            <button
              type="button"
              disabled={busy}
              onClick={handleDeleteReview}
              className="text-xs text-red-600 hover:underline mt-2"
            >
              Delete review
            </button>
          )}
        </div>
      )}

      {/* Care notes */}
      <div className="card">
        <h2 className="font-bold mb-4">Care notes</h2>
        {!notes && <Spinner />}
        {notes && notes.length === 0 && <p className="text-muted mb-4">No notes yet.</p>}
        {notes && notes.length > 0 && (
          <ul className="space-y-3 mb-5">
            {notes.map((n) => (
              <li key={n.id} className="border-l-4 border-pine-300 pl-4">
                <p>{n.note}</p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <p className="text-xs text-muted">{n.author_name} · {formatDateTime(n.created_at)}</p>
                  <SentimentBadge label={n.sentiment_label} />
                  {(n.author_id === user.id || user.role === 'ADMIN') && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDeleteNote(n.id)}
                      className="text-xs text-red-600 hover:underline ml-auto"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            className="input"
            placeholder="Add a care note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn-secondary shrink-0">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
