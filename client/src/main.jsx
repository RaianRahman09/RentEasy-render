import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import './styles/theme.css';
import App from './App.jsx';
import { applyTheme, getInitialTheme } from './theme/theme';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const Providers = () => {
  if (!googleClientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google login will be disabled.');
    return <App />;
  }
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  );
};

applyTheme(getInitialTheme());

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Providers />
  </React.StrictMode>
);
