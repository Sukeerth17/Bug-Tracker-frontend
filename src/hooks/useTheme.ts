import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'ticket-theme';

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export const useThemeMode = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, setTheme, toggleTheme };
};
