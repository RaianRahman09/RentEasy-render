import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { applyTheme, getInitialTheme, toggleTheme } from '../theme/theme';
import ConfirmModal from '../components/ConfirmModal';

const ProfileViewPage = () => {
  const { setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(null);
  const [theme, setTheme] = useState(() => getInitialTheme());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const isDark = theme === 'dark';

  const handleThemeToggle = () => {
    const nextTheme = toggleTheme(theme);
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handleDeleteProfile = async () => {
    setDeleting(true);
    try {
      await api.delete('/me');
      await logout();
      toast.success('Profile deleted.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete profile.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">My Profile</h1>
          <p className="text-sm text-[var(--muted)]">View your account details.</p>
        </div>
        <Link
          to="/me/profile/edit"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
        >
          Edit Profile
        </Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--surface-2)]">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[var(--muted)]">
                  {profile.name?.slice(0, 1) || 'U'}
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-[var(--text)]">{profile.name}</div>
              <div className="text-sm capitalize text-[var(--muted)]">{profile.role}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Email
              </div>
              <div className="text-sm text-[var(--text)]">{profile.email}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Phone
              </div>
              <div className="text-sm text-[var(--text)]">{profile.phone || 'Not provided'}</div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="text-sm font-semibold text-[var(--text)]">Verification Status</div>
            <div className="mt-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--primary)]">
              Status: {status || 'loading...'}
            </div>
            <Link
              to="/me/verification"
              className="mt-3 inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
            >
              Go to Verification
            </Link>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="text-sm font-semibold text-[var(--text)]">Security</div>
            <p className="text-sm text-[var(--muted)]">Keep your account secure and monitor activity.</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="text-sm font-semibold text-[var(--text)]">Delete Profile</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Permanently remove your account when you are no longer renting or hosting.
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete profile
            </button>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">Theme</div>
                <p className="text-sm text-[var(--muted)]">
                  Choose the appearance that feels best for you.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label="Toggle dark mode"
                onClick={handleThemeToggle}
                className={`theme-toggle ${isDark ? 'is-dark' : ''}`}
              >
                <span className="theme-toggle__track">
                  <span className="theme-toggle__thumb" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={deleteOpen}
        title="Delete profile"
        description="Are you sure you want to delete your profile?"
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        danger
        loading={deleting}
        confirmPhrase="DELETE"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteProfile}
      />
    </div>
  );
};

export default ProfileViewPage;
