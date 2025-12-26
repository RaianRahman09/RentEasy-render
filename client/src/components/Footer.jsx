import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const supportPath =
    user?.role === 'admin'
      ? '/admin/support'
      : user?.role === 'landlord'
      ? '/dashboard/landlord/support'
      : '/support';
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-[var(--muted)] md:flex-row">
        <div className="flex items-center gap-2 font-semibold text-[var(--primary)]">
          <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1">🏠</span>
          RentEasy
          <span className="font-normal text-[var(--muted)]">
            © {year} RentEasy. All rights reserved.
          </span>
        </div>
        <div className="flex gap-4">
          <Link to="/about" className="hover:text-[var(--primary)]">
            About Us
          </Link>
          <Link to={supportPath} className="hover:text-[var(--primary)]">
            Contact Support
          </Link>
          <Link to="/privacy" className="hover:text-[var(--primary)]">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-[var(--primary)]">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
