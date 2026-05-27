import { createContext, useContext, useEffect, useState } from 'react';
import { THEMES, DEFAULT_THEME } from './themes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem('scraperapp-theme') || DEFAULT_THEME;
    } catch (_error) {
      return DEFAULT_THEME;
    }
  });

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--bg-sidebar', theme.bgSidebar);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentHover);
    root.style.setProperty('--accent-dark', theme.accentDark);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--text-muted', theme.textMuted);
    root.style.setProperty('--gradient-from', theme.gradientFrom);
    root.style.setProperty('--gradient-to', theme.gradientTo);

    try {
      localStorage.setItem('scraperapp-theme', themeId);
    } catch (_error) {
      // Ignore storage errors.
    }
  }, [themeId, theme]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, theme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
