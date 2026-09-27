import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import { EmptyState } from '../../components/Feedback';
import { formatCurrency, formatDateTime } from '../../lib/format';

export default function CaregiverHistory() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/caregivers/me/history').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="max-w-4xl mx-auto px-4 py-16"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/caregiver" className="text-pine-600 font-semibold text-sm mb-6 inline-block">← Back to dashboard</Link>
      <h1 className="text-3xl font-extrabold mb-2">Earnings & work history</h1>
      <p className="text-muted mb-8">A record of every completed visit.</p>

      <div className="card bg-pine-500 text-white border-none mb-8">
        <p className="text-pine-100 mb-1">Total earnings (all-time)</p>
        <p className="text-4xl font-extrabold">{formatCurrency(data.totalEarnings)}</p>
      </div>

      {data.bookings.length === 0 && (
        <EmptyState title="No completed visits yet" body="Completed bookings will appear here along with what you earned." />
      )}

      {data.bookings.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-pine-50 text-pine-700 text-sm">
              <tr>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Completed on</th>
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pine-50">
              {data.bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3">{b.patient_name}</td>
                  <td className="px-5 py-3">{b.service_name}</td>
                  <td className="px-5 py-3 text-sm text-muted">{formatDateTime(b.updated_at)}</td>
                  <td className="px-5 py-3">{b.rating_score ? `★ ${b.rating_score}/5` : '—'}</td>
                  <td className="px-5 py-3 font-semibold">{formatCurrency(b.service_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
