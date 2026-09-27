import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import { ErrorBanner, SuccessBanner } from '../../components/Feedback';
import { CATEGORY_LABELS, formatCurrency, formatDuration } from '../../lib/format';

const EMPTY_FORM = { name: '', description: '', category: 'NURSING_CARE', durationMinutes: 60, price: '', requiredQualification: '' };

export default function AdminServices() {
  const [services, setServices] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function reload() {
    api.get('/services').then((res) => setServices(res.data.services));
  }
  useEffect(reload, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await api.post('/services', { ...form, price: Number(form.price), durationMinutes: Number(form.durationMinutes) });
      setForm(EMPTY_FORM);
      setMessage('Service added to the catalog.');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(id) {
    setError('');
    try {
      await api.delete(`/services/${id}`);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/admin" className="text-pine-600 font-semibold text-sm mb-6 inline-block">← Back to dashboard</Link>
      <h1 className="text-3xl font-extrabold mb-8">Manage services</h1>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
        <form onSubmit={handleCreate} className="card space-y-4 h-fit">
          <h2 className="font-bold text-lg">Add a new service</h2>
          <ErrorBanner message={error} />
          {message && <SuccessBanner message={message} />}
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="duration">Duration (minutes)</label>
              <input id="duration" type="number" min="1" required className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="price">Price (₹)</label>
              <input id="price" type="number" min="0" required className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="qualification">Required qualification</label>
            <input id="qualification" className="input" value={form.requiredQualification} onChange={(e) => setForm({ ...form, requiredQualification: e.target.value })} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Adding...' : 'Add service'}
          </button>
        </form>

        <div>
          {!services && <Spinner />}
          {services && (
            <div className="space-y-4">
              {services.map((s) => (
                <div key={s.id} className="card flex items-start justify-between gap-4">
                  <div>
                    <span className="badge bg-amber-100 text-amber-600 mb-2">{CATEGORY_LABELS[s.category]}</span>
                    <h3 className="font-bold">{s.name}</h3>
                    <p className="text-sm text-muted mb-1">{s.description}</p>
                    <p className="text-sm">{formatCurrency(s.price)} · {formatDuration(s.duration_minutes)}</p>
                  </div>
                  <button onClick={() => handleDeactivate(s.id)} className="btn-danger !py-2 !px-4 shrink-0">
                    Deactivate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
