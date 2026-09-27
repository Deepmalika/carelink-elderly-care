import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';

const KPI_CARDS = [
  { key: 'registeredUsers', label: 'Registered users' },
  { key: 'verifiedCaregivers', label: 'Verified caregivers' },
  { key: 'bookingCompletionRate', label: 'Booking completion rate', suffix: '%' },
  { key: 'avgResponseHours', label: 'Avg. caregiver response time', suffix: ' hrs' },
  { key: 'satisfactionScore', label: 'User satisfaction score', suffix: '/5' },
  { key: 'monthlyActiveUsers', label: 'Monthly active users' },
];

export default function AdminHome() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics').then((res) => setStats(res.data));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold mb-1">Admin dashboard</h1>
      <p className="text-muted mb-8">Platform-wide key performance indicators.</p>

      {!stats && <Spinner />}

      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {KPI_CARDS.map((k) => (
            <div key={k.key} className="card">
              <p className="text-muted text-sm mb-1">{k.label}</p>
              <p className="text-3xl font-extrabold text-pine-700">
                {stats[k.key]}
                {k.suffix || ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-5">
        <Link to="/admin/caregivers" className="card hover:border-pine-300">
          <h3 className="font-bold text-lg mb-1">Verify caregivers</h3>
          <p className="text-muted text-sm">Review and onboard new caregiver applications.</p>
        </Link>
        <Link to="/admin/services" className="card hover:border-pine-300">
          <h3 className="font-bold text-lg mb-1">Manage services</h3>
          <p className="text-muted text-sm">Add, edit, or retire services in the catalog.</p>
        </Link>
        <Link to="/admin/users" className="card hover:border-pine-300">
          <h3 className="font-bold text-lg mb-1">View users</h3>
          <p className="text-muted text-sm">Browse everyone registered on the platform.</p>
        </Link>
        <Link to="/admin/sentiment" className="card hover:border-pine-300">
          <h3 className="font-bold text-lg mb-1">Flagged for review</h3>
          <p className="text-muted text-sm">Reviews and care notes flagged by sentiment analysis.</p>
        </Link>
        <Link to="/admin/moderation" className="card hover:border-pine-300">
          <h3 className="font-bold text-lg mb-1">All reviews & care notes</h3>
          <p className="text-muted text-sm">Browse every review and care note, and remove any of them.</p>
        </Link>
      </div>
    </div>
  );
}
