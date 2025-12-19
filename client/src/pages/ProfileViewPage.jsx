import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ProfileViewPage = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await api.get('/me');
      setProfile(res.data.user);
      setUser(res.data.user);
      const s = await api.get('/me/verification-status');
      setStatus(s.data.status);
    };
    load();
  }, [setUser]);

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-600">View your account details.</p>
        </div>
        <Link
          to="/me/profile/edit"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Edit Profile
        </Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-200">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-600">
                  {profile.name?.slice(0, 1) || 'U'}
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{profile.name}</div>
              <div className="text-sm text-slate-600 capitalize">{profile.role}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</div>
              <div className="text-sm text-slate-800">{profile.email}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</div>
              <div className="text-sm text-slate-800">{profile.phone || 'Not provided'}</div>
            </div>
          </div>
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

export default ProfileViewPage;
