import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSupport } from '../context/SupportContext';
import NotificationBell from './NotificationBell';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--primary)]'
  }`;

const Header = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useChat();
  const { unread } = useSupport();

  const supportPath =
    user?.role === 'admin'
      ? '/admin/support'
      : user?.role === 'landlord'
      ? '/dashboard/landlord/support'
      : '/support';

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-[var(--primary)]">
          <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1">🏠</span>
          RentEasy
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/find" className={navLinkClass}>
            Find Properties
          </NavLink>
          <NavLink to="/how-it-works" className={navLinkClass}>
            How It Works
          </NavLink>
          <NavLink to={supportPath} className={navLinkClass}>
            Support
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          {!user && (
            <>
              <Link
                to="/auth/login"
                className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)]"
              >
                Login
              </Link>
              <Link
                to="/auth/signup"
                className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
              >
                Sign Up
              </Link>
            </>
          )}
          {user && (
            <div className="flex items-center gap-3">
              {user.role !== 'admin' && (
                <Link
                  to="/chat"
                  aria-label="Chat"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--text)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7.5 8.5h9" />
                    <path d="M7.5 12h6" />
                    <path d="M6 18l-3 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--on-danger)]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <Link
                to={supportPath}
                aria-label="Support tickets"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a7 7 0 0 0-7 7v2.5a3.5 3.5 0 0 0 7 0V10a3.5 3.5 0 0 0-7 0" />
                  <path d="M12 3a7 7 0 0 1 7 7v2.5a3.5 3.5 0 0 1-7 0V10a3.5 3.5 0 0 1 7 0" />
                  <path d="M12 18.5v2.5" />
                  <circle cx="12" cy="21.5" r="0.5" />
                </svg>
                {unread.totalUnreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--on-danger)]">
                    {unread.totalUnreadMessages > 99 ? '99+' : unread.totalUnreadMessages}
                  </span>
                )}
              </Link>
              <NotificationBell />
              {user.role === 'tenant' && (
                <Link
                  to="/dashboard/tenant"
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Tenant Dashboard
                </Link>
              )}
              {user.role === 'landlord' && (
                <Link
                  to="/dashboard/landlord"
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Landlord Dashboard
                </Link>
              )}
              {user.role === 'admin' && (
                <Link
                  to="/dashboard/admin"
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Admin Dashboard
                </Link>
              )}
              {user.role !== 'admin' ? (
                <Link
                  to="/me/profile"
                  className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--primary)]">
                    {user.name?.slice(0, 1)?.toUpperCase() || 'U'}
                  </span>
                  {user.name}
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--primary)]">
                    {user.name?.slice(0, 1)?.toUpperCase() || 'A'}
                  </span>
                  {user.name}
                </div>
              )}
              <button
                onClick={logout}
                className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
