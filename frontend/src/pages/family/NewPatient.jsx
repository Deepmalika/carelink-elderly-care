import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { ErrorBanner } from '../../components/Feedback';

export default function NewPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', age: '', gender: '', medicalNeeds: '', address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/patients', { ...form, age: Number(form.age) });
      navigate('/family');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-extrabold mb-2">Add a patient profile</h1>
      <p className="text-muted mb-8">
        Tell us a little about your family member so caregivers know how to care for them.
      </p>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <ErrorBanner message={error} />
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="age">Age</label>
            <input id="age" type="number" min="0" required className="input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="gender">Gender</label>
            <select id="gender" className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="medicalNeeds">Medical needs</label>
          <textarea
            id="medicalNeeds"
            className="input min-h-[100px]"
            placeholder="e.g. Type 2 diabetes, limited mobility, needs help with daily medication"
            value={form.medicalNeeds}
            onChange={(e) => setForm({ ...form, medicalNeeds: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="address">Address</label>
          <input id="address" className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Saving...' : 'Save patient profile'}
        </button>
      </form>
    </div>
  );
}
