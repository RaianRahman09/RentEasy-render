import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ProfileEditPage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', avatarUrl: '' });
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await api.get('/me');
      setForm({
        name: res.data.user.name,
        email: res.data.user.email,
        phone: res.data.user.phone || '',
        avatarUrl: res.data.user.avatarUrl || '',
      });
      setAvatarPreview(res.data.user.avatarUrl || '');
      const s = await api.get('/me/verification-status');
      setStatus(s.data.status);
    };
    load();
  }, []);

  useEffect(
    () => () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('phone', form.phone);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (form.avatarUrl) {
        formData.append('avatarUrl', form.avatarUrl);
      }
      const res = await api.put('/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setForm((f) => ({ ...f, avatarUrl: res.data.user.avatarUrl || '' }));
      setAvatarPreview(res.data.user.avatarUrl || '');
      setAvatarFile(null);
      setMessage('Profile updated');
      navigate('/me/profile');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    setAvatarFile(file || null);
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } else {
      setAvatarPreview(form.avatarUrl || '');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-200">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-600">
                    {user?.name?.slice(0, 1) || 'U'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Avatar Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">JPG or PNG, up to 5MB.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {message && <div className="text-sm font-semibold text-green-700">{message}</div>}
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => navigate('/me/profile')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </form>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700">Verification Status</div>
            <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              Status: {status || 'loading...'}
            </div>
            <Link
              to="/me/verification"
              className="mt-3 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Go to Verification
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700">Security</div>
            <p className="text-sm text-slate-600">Keep your account secure and monitor activity.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditPage;
