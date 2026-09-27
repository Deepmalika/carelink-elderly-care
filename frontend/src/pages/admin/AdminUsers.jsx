import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';
import { formatDateTime } from '../../lib/format';

const ROLE_STYLES = {
  FAMILY: 'bg-pine-100 text-pine-700',
  CAREGIVER: 'bg-amber-100 text-amber-600',
  ADMIN: 'bg-pine-500 text-white',
};

export default function AdminUsers() {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    api.get('/admin/users').then((res) => setUsers(res.data.users));
  }, []);

  if (!users) return <div className="max-w-5xl mx-auto px-4 py-16"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/admin" className="text-pine-600 font-semibold text-sm mb-6 inline-block">← Back to dashboard</Link>
      <h1 className="text-3xl font-extrabold mb-8">All users ({users.length})</h1>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-pine-50 text-pine-700 text-sm">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pine-50">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3 font-semibold">{u.name}</td>
                <td className="px-5 py-3 text-sm text-muted">{u.email}</td>
                <td className="px-5 py-3"><span className={`badge ${ROLE_STYLES[u.role]}`}>{u.role}</span></td>
                <td className="px-5 py-3 text-sm text-muted">{formatDateTime(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
