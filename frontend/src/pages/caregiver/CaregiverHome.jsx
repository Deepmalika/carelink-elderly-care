import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { ErrorBanner, SuccessBanner, EmptyState } from '../../components/Feedback';
import { CATEGORY_LABELS, formatDateTime } from '../../lib/format';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function CaregiverHome() {
  const [caregiver, setCaregiver] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function reload() {
    api.get('/caregivers/me').then((res) => {
      setCaregiver(res.data.caregiver);
      setForm({
        qualification: res.data.caregiver.qualification || '',
        experienceYears: res.data.caregiver.experience_years || 0,
        bio: res.data.caregiver.bio || '',
        serviceAreas: res.data.caregiver.service_areas || '',
        availability: res.data.caregiver.availability || '',
        categories: (res.data.caregiver.categories || '').split(',').filter(Boolean),
      });
    });
    api.get('/bookings/mine').then((res) => setBookings(res.data.bookings));
  }

  useEffect(reload, []);

  function toggleCategory(cat) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter((c) => c !== cat) : [...f.categories, cat],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await api.put('/caregivers/me', form);
      setMessage('Profile updated.');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!caregiver || !form) return <div className="max-w-4xl mx-auto px-4 py-16"><Spinner /></div>;

  const pending = bookings?.filter((b) => b.status === 'PENDING') || [];
  const active = bookings?.filter((b) => ['ACCEPTED', 'IN_PROGRESS'].includes(b.status)) || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">Your caregiver dashboard</h1>
          <p className="text-muted">
            Status:{' '}
            {caregiver.verified ? (
              <span className="badge bg-pine-500 text-white">Verified</span>
            ) : (
              <span className="badge bg-amber-100 text-amber-600">Pending verification</span>
            )}
          </p>
        </div>
        <Link to="/caregiver/history" className="btn-secondary">View earnings & history</Link>
      </div>

      {!caregiver.verified && (
        <div className="card bg-amber-100/40 border-amber-400 mb-8">
          <p className="font-semibold text-amber-600 mb-1">Your profile is awaiting admin verification</p>
          <p className="text-sm text-muted">
            Complete the profile below so our team can verify you — you will not appear in family search results
            until verification is complete.
          </p>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Requests waiting for your response ({pending.length})</h2>
        {pending.length === 0 && <EmptyState title="No pending requests" body="New booking requests will show up here." />}
        {pending.length > 0 && (
          <div className="space-y-3">
            {pending.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="card card-hover flex items-center justify-between hover:border-pine-300">
                <div>
                  <p className="font-bold">{b.service?.name} for {b.patient?.name}</p>
                  <p className="text-sm text-muted">{formatDateTime(b.scheduled_date)}</p>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Active bookings ({active.length})</h2>
        {active.length === 0 && <EmptyState title="No active bookings" body="Accepted bookings you're working on will show up here." />}
        {active.length > 0 && (
          <div className="space-y-3">
            {active.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="card card-hover flex items-center justify-between hover:border-pine-300">
                <div>
                  <p className="font-bold">{b.service?.name} for {b.patient?.name}</p>
                  <p className="text-sm text-muted">{formatDateTime(b.scheduled_date)}</p>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Your profile</h2>
        <form onSubmit={handleSave} className="card space-y-5">
          <ErrorBanner message={error} />
          {message && <SuccessBanner message={message} />}
          <div>
            <label className="label" htmlFor="qualification">Qualification</label>
            <input id="qualification" className="input" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="experience">Years of experience</label>
            <input id="experience" type="number" min="0" className="input" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea id="bio" className="input min-h-[90px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="areas">Service areas</label>
            <input id="areas" className="input" placeholder="e.g. Mumbai, Thane" value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="availability">Availability</label>
            <input id="availability" className="input" placeholder="e.g. Mon-Sat, 8am-8pm" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div>
            <span className="label">Services you offer</span>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`badge border-2 ${form.categories.includes(cat) ? 'bg-pine-500 text-white border-pine-500' : 'border-pine-100 text-muted'}`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>
    </div>
  );
}
