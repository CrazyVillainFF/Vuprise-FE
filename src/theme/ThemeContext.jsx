import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme } from './theme';

const ThemeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('nexora_theme_mode');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('nexora_theme_mode', next);
      return next;
    });
  };

  const setThemeMode = (newMode) => {
    if (newMode === 'light' || newMode === 'dark') {
      setMode(newMode);
      localStorage.setItem('nexora_theme_mode', newMode);
    }
  };

  useEffect(() => {
    localStorage.setItem('nexora_theme_mode', mode);
    // Keep non-MUI effects and native controls in sync with the persisted theme.
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    document.documentElement.style.setProperty('--app-bg', mode === 'light' ? '#FFFFFF' : '#000000');
    document.documentElement.style.setProperty('--app-fg', mode === 'light' ? '#000000' : '#FFFFFF');
    document.documentElement.style.setProperty('--app-fg-rgb', mode === 'light' ? '0, 0, 0' : '255, 255, 255');
    document.body.style.backgroundColor = mode === 'light' ? '#FFFFFF' : '#000000';
    document.body.style.color = mode === 'light' ? '#000000' : '#FFFFFF';
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setThemeMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeContextProvider');
  }
  return context;
};
