import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DarkColors, LightColors, createSharedStyles, type ColorPalette } from '@/src/constants/theme';

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorPalette;
  sharedStyles: ReturnType<typeof createSharedStyles>;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  const colors = isDark ? DarkColors : LightColors;
  const sharedStyles = useMemo(() => createSharedStyles(colors), [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);
  const setDark = useCallback((dark: boolean) => setIsDark(dark), []);

  const value = useMemo(
    () => ({ isDark, colors, sharedStyles, toggleTheme, setDark }),
    [isDark, colors, sharedStyles, toggleTheme, setDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
