'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserPreferences, updateUserPreferences, ThemeMode } from '@/lib/firestore/preferences';
import { auth, isFirebaseInitialized } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to get system theme preference
const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

// Helper function to resolve theme mode to actual theme
const resolveTheme = (themeMode: ThemeMode): 'dark' | 'light' => {
  if (themeMode === 'system') {
    return getSystemTheme();
  }
  return themeMode;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark'); // Default to dark
  const [user, setUser] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    if (!isFirebaseInitialized() || !auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Listen for system theme changes when theme mode is 'system'
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemThemeChange = () => {
      const resolvedTheme = getSystemTheme();
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    };

    // Apply initial system theme
    handleSystemThemeChange();

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, [theme]);

  useEffect(() => {
    const loadAndApplyTheme = async () => {
      let userTheme: ThemeMode = 'dark';
      if (user) {
        try {
          const prefs = await getUserPreferences();
          userTheme = prefs.theme || 'dark';
        } catch (error) {
          console.error('Failed to load user theme preference:', error);
        }
      } else {
        // For unauthenticated users, try to get from localStorage or default to system
        const storedTheme = localStorage.getItem('theme') as ThemeMode | null;
        if (storedTheme && (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system')) {
          userTheme = storedTheme;
        } else {
          // Default to system for unauthenticated users
          userTheme = 'system';
        }
      }
      setThemeState(userTheme);
      const resolvedTheme = resolveTheme(userTheme);
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      setIsInitialLoad(false);
    };

    loadAndApplyTheme();
  }, [user]); // Reload theme when user changes

  // Apply theme whenever theme mode changes
  useEffect(() => {
    if (isInitialLoad) return;
    const resolvedTheme = resolveTheme(theme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [theme, isInitialLoad]);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    const resolvedTheme = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('theme', mode); // Persist to localStorage immediately

    if (user) {
      try {
        await updateUserPreferences({ theme: mode });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

