import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState } from '../../components/Feedback';
import { formatDateTime } from '../../lib/format';

export default function FamilyHome() {
  const [patients, setPatients] = useState(null);
  const [bookings, setBookings] = useState(null);

  function reload() {
    api.get('/patients/mine').then((res) => setPatients(res.data.patients));
    api.get('/bookings/mine').then((res) => setBookings(res.data.bookings));
  }

  useEffect(reload, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">Your family dashboard</h1>
          <p className="text-muted">Manage patient profiles and track every care visit.</p>
        </div>
        <Link to="/family/new-patient" className="btn-primary">
          + Add a patient profile
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">Patient profiles</h2>
        {!patients && <Spinner />}
        {patients && patients.length === 0 && (
          <EmptyState
            title="No patient profiles yet"
            body="Create a profile for the family member who needs care, so you can start booking services."
            action={<Link to="/family/new-patient" className="btn-primary">Add a patient profile</Link>}
          />
        )}
        {patients && patients.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((p) => (
              <div key={p.id} className="card">
                <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                <p className="text-muted text-sm mb-3">
                  {p.age} years old{p.gender ? ` · ${p.gender}` : ''}
                </p>
                {p.medical_needs && <p className="text-sm mb-4">{p.medical_needs}</p>}
                <Link to={`/family/book?patientId=${p.id}`} className="btn-secondary w-full">
                  Book a caregiver
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Your bookings</h2>
        {!bookings && <Spinner />}
        {bookings && bookings.length === 0 && (
          <EmptyState title="No bookings yet" body="Once you book a caregiver, you will see the status here." />
        )}
        {bookings && bookings.length > 0 && (
          <div className="card !p-0 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-pine-50 text-pine-700 text-sm">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Caregiver</th>
                  <th className="px-5 py-3">Scheduled</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pine-50">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3">{b.patient?.name}</td>
                    <td className="px-5 py-3">{b.service?.name}</td>
                    <td className="px-5 py-3">{b.caregiver?.user?.name}</td>
                    <td className="px-5 py-3 text-sm text-muted">{formatDateTime(b.scheduled_date)}</td>
                    <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3">
                      <Link to={`/bookings/${b.id}`} className="text-pine-600 font-semibold text-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
