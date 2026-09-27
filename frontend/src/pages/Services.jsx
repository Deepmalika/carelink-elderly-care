import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Spinner from '../components/Spinner';
import { CATEGORY_LABELS, formatCurrency, formatDuration } from '../lib/format';

const CATEGORY_IMAGES = {
  NURSING_CARE: 'https://images.unsplash.com/photo-1765896387387-0538bc9f997e?auto=format&fit=crop&w=800&h=500&q=80',
  ELDERLY_ATTENDANT: 'https://images.unsplash.com/photo-1765896387377-e293914d1e69?auto=format&fit=crop&w=800&h=500&q=80',
  PHYSIOTHERAPY: 'https://images.unsplash.com/photo-1764173040171-57f79264b358?auto=format&fit=crop&w=800&h=500&q=80',
  POST_HOSPITAL_CARE: 'https://images.unsplash.com/photo-1543333995-a78aea2eee50?auto=format&fit=crop&w=800&h=500&q=80',
};

export default function Services() {
  const [services, setServices] = useState(null);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setServices(null);
    api
      .get('/services', { params: category ? { category } : {} })
      .then((res) => setServices(res.data.services))
      .catch((err) => setError(err.message));
  }, [category]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-3xl font-extrabold mb-2">Care services</h1>
      <p className="text-muted mb-8 max-w-2xl">
        Every service below is delivered by a caregiver who has been verified by our team. Prices are shown up
        front, with no hidden charges.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setCategory('')}
          className={`badge border-2 ${category === '' ? 'bg-pine-500 text-white border-pine-500' : 'border-pine-100 text-muted'}`}
        >
          All services
        </button>
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setCategory(value)}
            className={`badge border-2 ${category === value ? 'bg-pine-500 text-white border-pine-500' : 'border-pine-100 text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-clay">{error}</p>}
      {!services && !error && <Spinner label="Loading services..." />}

      {services && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <div
              key={s.id}
              className="card card-hover overflow-hidden !p-0 flex flex-col animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 6) * 0.06}s` }}
            >
              {CATEGORY_IMAGES[s.category] && (
                <img src={CATEGORY_IMAGES[s.category]} alt={CATEGORY_LABELS[s.category]} className="w-full h-36 object-cover" loading="lazy" />
              )}
              <div className="p-6 flex flex-col flex-1">
                <span className="badge bg-amber-100 text-amber-600 self-start mb-3">{CATEGORY_LABELS[s.category]}</span>
                <h3 className="text-xl font-bold mb-2">{s.name}</h3>
                <p className="text-muted mb-4 flex-1">{s.description}</p>
                <dl className="text-sm text-muted space-y-1 mb-4">
                  <div className="flex justify-between">
                    <dt>Typical duration</dt>
                    <dd className="font-semibold text-ink">{formatDuration(s.duration_minutes)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Price</dt>
                    <dd className="font-semibold text-ink">{formatCurrency(s.price)}</dd>
                  </div>
                </dl>
                <Link to={`/register?role=FAMILY`} className="btn-primary w-full">
                  Book this service
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
