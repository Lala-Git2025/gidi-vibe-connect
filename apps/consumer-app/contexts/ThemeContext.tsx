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
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
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
