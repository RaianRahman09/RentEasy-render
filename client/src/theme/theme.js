const STORAGE_KEY = 'theme';

export const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (error) {
    // Ignore storage errors and fall back to media query.
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return 'light';
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  try {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  } catch (error) {
    // Ignore storage errors.
  }
  return nextTheme;
};

export const toggleTheme = (currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark');
