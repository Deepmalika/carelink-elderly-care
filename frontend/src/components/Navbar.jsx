import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HOME_BY_ROLE = {
  FAMILY: '/family',
  CAREGIVER: '/caregiver',
  ADMIN: '/admin',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="border-b border-pine-100 bg-white/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link to={user ? HOME_BY_ROLE[user.role] : '/'} className="flex items-center gap-2 group">
          <span className="w-10 h-10 rounded-full bg-pine-500 text-white grid place-items-center font-display font-bold text-lg group-hover:bg-pine-600 transition-colors">
            C
          </span>
          <span className="font-display font-extrabold text-xl text-pine-700">CareLink</span>
        </Link>

        <nav className="flex items-center gap-3">
          {!user && (
            <>
              <Link to="/services" className="text-base font-medium text-ink hover:text-pine-600 px-2">
                Browse services
              </Link>
              <Link to="/triage" className="text-base font-medium text-ink hover:text-pine-600 px-2">
                Not sure what you need?
              </Link>
              <Link to="/login" className="btn-secondary !py-2 !px-5">
                Log in
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-5">
                Get started
              </Link>
            </>
          )}
          {user && (
            <>
              <span className="hidden sm:block text-base text-muted">
                Hi, <span className="font-semibold text-ink">{user.name.split(' ')[0]}</span>
              </span>
              <button onClick={handleLogout} className="btn-secondary !py-2 !px-5">
                Log out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
