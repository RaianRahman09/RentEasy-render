import React from 'react';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />
      <main className="flex-1 bg-[var(--bg)]">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
