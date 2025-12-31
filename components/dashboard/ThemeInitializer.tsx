'use client';

import { useEffect } from 'react';
import { THEMES } from './ThemeSelector';

/**
 * Client-side component that initializes theme from localStorage on page load
 * This ensures themes are applied immediately, even before other components render
 */
export default function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('talka-theme');
    const themeId = savedTheme || 'midnight-black';
    
    const theme = THEMES.find((t) => t.id === themeId) || THEMES[5];
    document.documentElement.style.setProperty('--theme-bg', theme.bgColor);
    document.documentElement.style.setProperty('--theme-text', theme.textColor);
  }, []);

  return null;
}

