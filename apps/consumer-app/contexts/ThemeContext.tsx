import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'auto';
type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: ActiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof lightColors;
}

// Polished V2 palette — these constants are theme-independent and consumed
// directly by the polished components (story rings, gold pills, vibe-check
// gradient, etc.). Keep these stable across light/dark for brand cohesion.
export const polished = {
  // Gold stops — used everywhere a gradient is needed: pills, rings, buttons.
  goldStops: ['#FDE047', '#EAB308', '#A16207'] as const,
  goldHi:    '#FDE047',
  goldMid:   '#FACC15',
  goldDeep:  '#EAB308',
  goldDark:  '#A16207',

  // Ring stops — long, looped gradient that fakes a conic gradient when the
  // ring is rotated. Same colors used on creator stories + profile avatar.
  creatorRingStops: ['#FDE047', '#EAB308', '#F97316', '#DB2777', '#EAB308', '#FDE047'] as const,
  peerRingStops:    ['#A855F7', '#DB2777', '#F97316', '#A855F7'] as const,

  // News category card background gradients
  categoryDefault: ['#27272A', '#18181B'] as const,
} as const;

const lightColors = {
  background: '#FFFFFF',
  cardBackground: '#F9FAFB',
  text: '#000000',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  primary: '#EAB308',
  primaryDark: '#CA8A04',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F97316',
  info: '#3B82F6',
  // Polished tokens
  goldHi: polished.goldHi,
  goldMid: polished.goldMid,
  goldDeep: polished.goldDeep,
  goldDark: polished.goldDark,
};

const darkColors = {
  background: '#000000',
  cardBackground: '#18181b',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#27272a',
  primary: '#EAB308',
  primaryDark: '#CA8A04',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F97316',
  info: '#3B82F6',
  // Polished tokens
  goldHi: polished.goldHi,
  goldMid: polished.goldMid,
  goldDeep: polished.goldDeep,
  goldDark: polished.goldDark,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@gidi_theme_preference';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isReady, setIsReady] = useState(false);

  // Determine active theme based on mode and system preference
  const activeTheme: ActiveTheme =
    themeMode === 'auto'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themeMode;

  const colors = activeTheme === 'dark' ? darkColors : lightColors;

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Save theme preference when it changes
  useEffect(() => {
    if (isReady) {
      saveThemePreference(themeMode);
    }
  }, [themeMode, isReady]);

  const loadThemePreference = async () => {
    try {
      const result = await Promise.race([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (result && ['light', 'dark', 'auto'].includes(result)) {
        setThemeModeState(result as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsReady(true);
    }
  };

  const saveThemePreference = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const value: ThemeContextType = {
    themeMode,
    activeTheme,
    setThemeMode,
    colors,
  };

  // Safety timeout — if AsyncStorage hangs, render anyway after 3s
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isReady) setIsReady(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [isReady]);

  // Don't render until theme is loaded to prevent flash
  if (!isReady) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
