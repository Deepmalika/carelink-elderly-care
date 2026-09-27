import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import { ErrorBanner } from '../../components/Feedback';
import { CATEGORY_LABELS, formatCurrency, formatDuration } from '../../lib/format';

export default function BookCaregiver() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [patients, setPatients] = useState(null);
  const [caregivers, setCaregivers] = useState(null);
  const [services, setServices] = useState(null);

  const [patientId, setPatientId] = useState(params.get('patientId') || '');
  const [category, setCategory] = useState('');
  const [recommended, setRecommended] = useState(false);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/patients/mine').then((res) => setPatients(res.data.patients));
    api.get('/services').then((res) => setServices(res.data.services));
  }, []);

  useEffect(() => {
    setCaregivers(null);
    setRecommended(false);
    const request = patientId
      ? api.get('/caregivers/recommend', { params: category ? { patientId, category } : { patientId } })
      : api.get('/caregivers', { params: category ? { category } : {} });

    request.then((res) => {
      setCaregivers(res.data.caregivers);
      setRecommended(Boolean(res.data.recommended));
    });
  }, [category, patientId]);

  const selectedCaregiver = useMemo(
    () => caregivers?.find((c) => c.id === selectedCaregiverId),
    [caregivers, selectedCaregiverId]
  );

  const availableServices = useMemo(() => {
    if (!services) return [];
    if (!selectedCaregiver) return services;
    const categories = (selectedCaregiver.categories || '').split(',');
    return services.filter((s) => categories.includes(s.category));
  }, [services, selectedCaregiver]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!patientId || !selectedCaregiverId || !serviceId || !scheduledDate) {
      setError('Please complete every field before requesting a booking.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/bookings', {
        patientId,
        caregiverId: selectedCaregiverId,
        serviceId,
        scheduledDate: new Date(scheduledDate).toISOString(),
      });
      navigate(`/bookings/${res.data.booking.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Book a caregiver</h1>
      <p className="text-muted mb-8">Choose who needs care, pick a verified caregiver, and confirm a service.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <ErrorBanner message={error} />

        <div className="card">
          <label className="label" htmlFor="patient">1. Who is this booking for?</label>
          {!patients && <Spinner />}
          {patients && patients.length === 0 && (
            <p className="text-muted">
              You don't have any patient profiles yet. <a href="/family/new-patient" className="text-pine-600 font-semibold">Add one first</a>.
            </p>
          )}
          {patients && patients.length > 0 && (
            <select id="patient" className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select a patient profile</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.age})</option>
              ))}
            </select>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <label className="label !mb-0">2. Choose a verified caregiver</label>
            <select className="input !w-auto" value={category} onChange={(e) => { setCategory(e.target.value); setSelectedCaregiverId(''); }}>
              <option value="">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {recommended && (
            <p className="text-sm text-pine-600 font-semibold mb-3">
              ✨ Ranked for this patient based on their profile, caregiver ratings, and experience.
            </p>
          )}

          {!caregivers && <Spinner />}
          {caregivers && caregivers.length === 0 && <p className="text-muted">No verified caregivers match this filter yet.</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {caregivers?.map((c, index) => (
              <button
                type="button"
                key={c.id}
                onClick={() => { setSelectedCaregiverId(c.id); setServiceId(''); }}
                className={`text-left rounded-xl2 border-2 p-4 transition-colors ${
                  selectedCaregiverId === c.id ? 'border-pine-500 bg-pine-50' : 'border-pine-100 hover:border-pine-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold">{c.user?.name}</p>
                  {recommended && index === 0 && (
                    <span className="badge bg-amber-100 text-amber-600 text-xs shrink-0">Best match</span>
                  )}
                </div>
                <p className="text-sm text-muted mb-2">{c.qualification} · {c.experience_years} yrs experience</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(c.categories || '').split(',').filter(Boolean).map((cat) => (
                    <span key={cat} className="badge bg-amber-100 text-amber-600 text-xs">{CATEGORY_LABELS[cat] || cat}</span>
                  ))}
                </div>
                <p className="text-sm text-muted">{c.service_areas}</p>
                {c.rating_count > 0 && (
                  <p className="text-sm text-pine-600 font-semibold mt-1">★ {c.rating_average.toFixed(1)} ({c.rating_count} reviews)</p>
                )}
                {c.matchReasons && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.matchReasons.map((r) => (
                      <span key={r} className="badge bg-pine-50 text-pine-700 text-xs border border-pine-100">{r}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedCaregiver && (
          <div className="card">
            <label className="label" htmlFor="service">3. Choose a service</label>
            <select id="service" className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Select a service</option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(s.price)} ({formatDuration(s.duration_minutes)})
                </option>
              ))}
            </select>
          </div>
        )}

        {serviceId && (
          <div className="card">
            <label className="label" htmlFor="date">4. Pick a date and time</label>
            <input
              id="date"
              type="datetime-local"
              required
              className="input"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full text-lg">
          {busy ? 'Sending request...' : 'Send booking request'}
        </button>
      </form>
    </div>
  );
}
