import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-700 hover:text-blue-700'}`;

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-blue-700">
          <span className="rounded-lg bg-blue-100 px-2 py-1">🏠</span>
          RentEasy
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/search" className={navLinkClass}>
            Browse Listings
          </NavLink>
          <NavLink to="/how-it-works" className={navLinkClass}>
            How It Works
          </NavLink>
          <NavLink to="/support" className={navLinkClass}>
            Support
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          {!user && (
            <>
              <Link
                to="/auth/login"
                className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700"
              >
                Login
              </Link>
              <Link
                to="/auth/signup"
                className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Sign Up
              </Link>
            </>
          )}
          {user && (
            <div className="flex items-center gap-3">
              {user.role === 'tenant' && (
                <Link to="/dashboard/tenant" className="text-sm font-medium text-slate-700">
                  Tenant Dashboard
                </Link>
              )}
              {user.role === 'landlord' && (
                <Link to="/dashboard/landlord" className="text-sm font-medium text-slate-700">
                  Landlord Dashboard
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/dashboard/admin" className="text-sm font-medium text-slate-700">
                  Admin Dashboard
                </Link>
              )}
              {user.role !== 'admin' ? (
                <Link to="/me/profile" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    {user.name?.slice(0, 1)?.toUpperCase() || 'U'}
                  </span>
                  {user.name}
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    {user.name?.slice(0, 1)?.toUpperCase() || 'A'}
                  </span>
                  {user.name}
                </div>
              )}
              <button
                onClick={logout}
                className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
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
