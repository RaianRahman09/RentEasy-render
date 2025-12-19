import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const roles = [
  { value: 'tenant', label: 'I am a Tenant', description: 'Search and book your next place.' },
  { value: 'landlord', label: 'I am a Landlord', description: 'List your property and get bookings.' },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'landlord' ? 'landlord' : 'tenant';
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: defaultRole });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/signup', form);
      login(res.data);
      navigate(form.role === 'tenant' ? '/dashboard/tenant' : '/dashboard/landlord');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-10 rounded-2xl bg-white p-6 shadow-lg md:grid-cols-2">
        <img
          src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80"
          alt="Apartment"
          className="h-full w-full rounded-xl object-cover"
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-slate-900">Create Your Account</h1>
          <p className="mt-2 text-slate-600">Sign up as a tenant or landlord to get started.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                  className={`rounded-lg border px-3 py-3 text-left text-sm ${
                    form.role === r.value
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-semibold">{r.label}</div>
                  <div className="text-xs text-slate-500">{r.description}</div>
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
          <div className="mt-4 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold text-blue-700">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
