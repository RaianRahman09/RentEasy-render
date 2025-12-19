import React from 'react';

const InfoPage = ({ title, children }) => {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 text-slate-700">{children}</div>
    </div>
  );
};

export default InfoPage;
