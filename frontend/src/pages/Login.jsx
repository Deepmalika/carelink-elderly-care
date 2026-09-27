import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Feedback';

const HOME_BY_ROLE = { FAMILY: '/family', CAREGIVER: '/caregiver', ADMIN: '/admin' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(HOME_BY_ROLE[user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center">
      <div className="hidden md:block animate-fade-up">
        <img
          src="https://images.unsplash.com/photo-1569508926450-cd832544c4ae?auto=format&fit=crop&w=900&h=1100&q=80"
          alt="Hands held in a moment of care"
          className="w-full aspect-[4/5] object-cover rounded-xl2 shadow-lg"
        />
      </div>

      <div className="animate-fade-up delay-1">
        <h1 className="text-3xl font-extrabold mb-2">Welcome back</h1>
        <p className="text-muted mb-8">Log in to manage bookings and care for your family.</p>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <ErrorBanner message={error} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-muted mt-6">
          New to CareLink? <Link to="/register" className="text-pine-600 font-semibold">Create an account</Link>
        </p>

        {import.meta.env.DEV && (
          <div className="mt-8 card bg-pine-50 border-pine-100 text-sm text-pine-700">
            <p className="font-semibold mb-2">Demo accounts (seeded, dev only)</p>
            <ul className="space-y-1">
              <li>Family: kavita.family@carelink.com / family123</li>
              <li>Caregiver: anita.caregiver@carelink.com / caregiver123</li>
              <li>Admin: admin@carelink.com / admin123</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
