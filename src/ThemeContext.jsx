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
    root.style.setProperty('color-scheme', theme.mode === 'light' ? 'light' : 'dark');
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--bg-sidebar', theme.bgSidebar);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentHover);
    root.style.setProperty('--accent-dark', theme.accentDark);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--text-muted', theme.textMuted);
    root.style.setProperty('--bg-secondary', theme.bgSecondary);
    root.style.setProperty('--bg-tertiary', theme.bgTertiary);
    root.style.setProperty('--border-subtle', theme.borderSubtle);
    root.style.setProperty('--border-normal', theme.borderNormal);
    root.style.setProperty('--text-strong', theme.textStrong);
    root.style.setProperty('--text-normal', theme.textNormal);
    root.style.setProperty('--gradient-from', theme.gradientFrom);
    root.style.setProperty('--gradient-to', theme.gradientTo);
    root.style.setProperty('--pending-bg', theme.pendingBg);
    root.style.setProperty('--pending-border', theme.pendingBorder);
    root.style.setProperty('--pending-text', theme.pendingText);
    root.style.setProperty('--retrasada-bg', theme.retrasadaBg);
    root.style.setProperty('--retrasada-border', theme.retrasadaBorder);
    root.style.setProperty('--retrasada-text', theme.retrasadaText);
    root.style.setProperty('--closed-bg', theme.closedBg);
    root.style.setProperty('--closed-border', theme.closedBorder);
    root.style.setProperty('--closed-text', theme.closedText);
    root.style.setProperty('--success-bg', theme.successBg);
    root.style.setProperty('--success-border', theme.successBorder);
    root.style.setProperty('--success-text', theme.successText);
    root.style.setProperty('--error-bg', theme.errorBg);
    root.style.setProperty('--error-border', theme.errorBorder);
    root.style.setProperty('--error-text', theme.errorText);

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
