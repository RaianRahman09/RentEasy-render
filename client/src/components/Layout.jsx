import React from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />
      <main className="flex-1 bg-[var(--bg)]">{children}</main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
};

export default Layout;
