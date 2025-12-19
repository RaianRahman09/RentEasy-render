import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.7h5.1c-.2 1.2-.8 2.3-1.8 3.1v2.5h2.9c1.7-1.6 2.8-4 2.8-6.8 0-.7-.1-1.4-.2-2.1H12z"
    />
    <path
      fill="#34A853"
      d="M6.6 14.3l-.9.7-2.3 1.8c1.4 2.8 4.3 4.8 7.6 4.8 2.3 0 4.2-.8 5.6-2.2l-2.9-2.5c-.8.5-1.8.8-2.7.8-2.1 0-3.9-1.4-4.5-3.4z"
    />
    <path
      fill="#4A90E2"
      d="M3.4 8.7c-.4 1-.7 2.1-.7 3.2s.3 2.2.7 3.2c0 .1 3.2-2.5 3.2-2.5-.1-.3-.1-.6-.1-.9 0-.3.1-.6.1-.9z"
    />
    <path
      fill="#FBBC05"
      d="M11 6.2c1.2 0 2.3.4 3.1 1.2l2.3-2.3c-1.4-1.3-3.3-2.1-5.4-2.1-3.3 0-6.2 1.9-7.6 4.8l3.2 2.5c.6-2 2.4-3.5 4.4-3.5z"
    />
  </svg>
);

const GoogleAuthButton = ({ role, label = 'Sign in with Google', className = '' }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const tokenClientRef = useRef(null);

  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setReady(true);
      return undefined;
    }
    const existingScript = document.getElementById('google-identity-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setReady(true));
      return undefined;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-identity-script';
    script.onload = () => setReady(true);
    script.onerror = () => setError('Failed to load Google Sign-In. Please try again.');
    document.body.appendChild(script);
    return undefined;
  }, []);

  const handleToken = useCallback(
    async (response) => {
      if (!response || response.error) {
        setError(response?.error_description || 'Google sign-in was cancelled.');
        setLoading(false);
        return;
      }
      if (!response.access_token) {
        setError('Google did not return an access token.');
        setLoading(false);
        return;
      }
      try {
        const res = await api.post('/auth/google', { accessToken: response.access_token, role });
        login(res.data);
        const userRole = res.data.user.role;
        if (userRole === 'tenant') navigate('/dashboard/tenant');
        else if (userRole === 'landlord') navigate('/dashboard/landlord');
        else navigate('/dashboard/admin');
      } catch (err) {
        setError(err.response?.data?.message || 'Google authentication failed.');
      } finally {
        setLoading(false);
      }
    },
    [login, navigate, role]
  );

  useEffect(() => {
    if (!ready || !clientId || !window.google?.accounts?.oauth2) return;
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: handleToken,
    });
  }, [clientId, handleToken, ready]);

  const startGoogle = () => {
    setError('');
    if (!clientId) {
      setError('Google Sign-In is not configured.');
      return;
    }
    if (!ready || !window.google?.accounts?.oauth2) {
      setError('Google is not ready yet. Please try again.');
      return;
    }
    if (!tokenClientRef.current) {
      setError('Google is not ready yet. Please try again.');
      return;
    }
    setLoading(true);
    tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button
        type="button"
        onClick={startGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-[#FB9B21] px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-[#f18800] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <GoogleIcon />
        {loading ? 'Connecting to Google...' : label}
      </button>
    </div>
  );
};

export default GoogleAuthButton;
