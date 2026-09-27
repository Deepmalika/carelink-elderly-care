import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import { ErrorBanner } from '../../components/Feedback';
import { CATEGORY_LABELS } from '../../lib/format';

export default function AdminCaregivers() {
  const [caregivers, setCaregivers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function reload() {
    api.get('/admin/caregivers').then((res) => setCaregivers(res.data.caregivers));
  }
  useEffect(reload, []);

  async function setVerified(id, verified) {
    setError('');
    setBusyId(id);
    try {
      await api.patch(`/caregivers/${id}/verify`, { verified });
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!caregivers) return <div className="max-w-5xl mx-auto px-4 py-16"><Spinner /></div>;

  const pending = caregivers.filter((c) => !c.verified);
  const verified = caregivers.filter((c) => c.verified);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/admin" className="text-pine-600 font-semibold text-sm mb-6 inline-block">← Back to dashboard</Link>
      <h1 className="text-3xl font-extrabold mb-8">Caregiver verification</h1>

      <ErrorBanner message={error} />

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Pending review ({pending.length})</h2>
        {pending.length === 0 && <p className="text-muted">No caregivers are waiting on review.</p>}
        <div className="space-y-4">
          {pending.map((c) => (
            <div key={c.id} className="card flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold">{c.user?.name}</p>
                <p className="text-sm text-muted">{c.user?.email} · {c.qualification}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(c.categories || '').split(',').filter(Boolean).map((cat) => (
                    <span key={cat} className="badge bg-amber-100 text-amber-600 text-xs">{CATEGORY_LABELS[cat] || cat}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button disabled={busyId === c.id} onClick={() => setVerified(c.id, true)} className="btn-primary !py-2 !px-4">
                  Verify
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Verified caregivers ({verified.length})</h2>
        <div className="space-y-4">
          {verified.map((c) => (
            <div key={c.id} className="card flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold">{c.user?.name}</p>
                <p className="text-sm text-muted">{c.user?.email} · {c.qualification}</p>
                {c.rating_count > 0 && (
                  <p className="text-sm text-pine-600 font-semibold mt-1">★ {c.rating_average.toFixed(1)} ({c.rating_count} reviews)</p>
                )}
              </div>
              <button disabled={busyId === c.id} onClick={() => setVerified(c.id, false)} className="btn-danger !py-2 !px-4">
                Revoke verification
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
