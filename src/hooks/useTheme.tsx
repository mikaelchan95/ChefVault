import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, createSharedStyles, type ColorPalette } from '@/src/constants/theme';

const THEME_STORAGE_KEY = '@chefvault_theme_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorPalette;
  sharedStyles: ReturnType<typeof createSharedStyles>;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const VALID_MODES: ThemeMode[] = ['system', 'light', 'dark'];

function isValidThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && VALID_MODES.includes(value as ThemeMode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored != null && isValidThemeMode(stored)) {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return (systemColorScheme ?? 'light') === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = isDark ? DarkColors : LightColors;
  const sharedStyles = useMemo(() => createSharedStyles(colors), [isDark]);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  const setDark = useCallback(
    (dark: boolean) => {
      setThemeMode(dark ? 'dark' : 'light');
    },
    [setThemeMode],
  );

  const value = useMemo(
    () => ({
      isDark,
      colors,
      sharedStyles,
      themeMode,
      setThemeMode,
      toggleTheme,
      setDark,
    }),
    [isDark, colors, sharedStyles, themeMode, setThemeMode, toggleTheme, setDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
