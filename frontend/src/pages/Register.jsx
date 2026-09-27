import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Feedback';

const HOME_BY_ROLE = { FAMILY: '/family', CAREGIVER: '/caregiver', ADMIN: '/admin' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'CAREGIVER' ? 'CAREGIVER' : 'FAMILY';

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: initialRole });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await register(form);
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
          src="https://images.unsplash.com/photo-1762955911769-d652ceaa94bb?auto=format&fit=crop&w=900&h=1150&q=80"
          alt="A caregiver spending time with two elderly women"
          className="w-full aspect-[4/5] object-cover rounded-xl2 shadow-lg"
        />
      </div>

      <div className="animate-fade-up delay-1">
        <h1 className="text-3xl font-extrabold mb-2">Create your account</h1>
        <p className="text-muted mb-8">Tell us who you are, and we will set up the right dashboard for you.</p>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <ErrorBanner message={error} />

          <div>
            <span className="label">I am joining as</span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'FAMILY', label: 'Family / Elderly user' },
                { value: 'CAREGIVER', label: 'Caregiver / Service agent' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm({ ...form, role: opt.value })}
                  className={`rounded-lg border-2 px-4 py-3 text-left font-semibold transition-all duration-200 ${
                    form.role === opt.value
                      ? 'border-pine-500 bg-pine-50 text-pine-700 scale-[1.02]'
                      : 'border-pine-100 text-muted hover:border-pine-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (optional)</label>
            <input id="phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating account...' : 'Create account'}
          </button>

          {form.role === 'CAREGIVER' && (
            <p className="text-sm text-muted animate-fade-in">
              Your profile will need to be verified by an admin before families can book you. You can fill in your
              qualifications right after signing up.
            </p>
          )}
        </form>

        <p className="text-center text-muted mt-6">
          Already have an account? <Link to="/login" className="text-pine-600 font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
