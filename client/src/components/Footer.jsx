import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-slate-600 md:flex-row">
        <div className="flex items-center gap-2 font-semibold text-blue-700">
          <span className="rounded-lg bg-blue-100 px-2 py-1">🏠</span>
          RentEasy
          <span className="text-slate-500 font-normal">© {year} RentEasy. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <Link to="/about" className="hover:text-blue-700">
            About Us
          </Link>
          <Link to="/support" className="hover:text-blue-700">
            Contact Support
          </Link>
          <Link to="/privacy" className="hover:text-blue-700">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-blue-700">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
