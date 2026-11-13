// Theme management utilities
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { readSafeItem, writeSafeItem } from './safeStorage';

export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const stored = readSafeItem('weatherboard:theme');
  const initial: Theme = (stored as Theme) || (prefersDark ? 'dark' : 'light');
  const [theme, setTheme] = useState<Theme>(initial);

  const apply = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    writeSafeItem('weatherboard:theme', t);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    apply(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
