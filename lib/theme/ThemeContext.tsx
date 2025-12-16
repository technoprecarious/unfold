'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserPreferences, updateUserPreferences, ThemeMode } from '@/lib/firestore/preferences';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark'); // Default to dark
  const [user, setUser] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadAndApplyTheme = async () => {
      let userTheme: ThemeMode = 'dark';
      if (user) {
        try {
          const prefs = await getUserPreferences();
          userTheme = prefs.theme;
        } catch (error) {
          console.error('Failed to load user theme preference:', error);
        }
      } else {
        // For unauthenticated users, try to get from localStorage or system preference
        const storedTheme = localStorage.getItem('theme') as ThemeMode;
        if (storedTheme) {
          userTheme = storedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          userTheme = 'light';
        }
      }
      setThemeState(userTheme);
      document.documentElement.setAttribute('data-theme', userTheme);
      setIsInitialLoad(false);
    };

    loadAndApplyTheme();
  }, [user]); // Reload theme when user changes

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    document.documentElement.setAttribute('data-theme', mode);
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

