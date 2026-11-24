import { createContext, useContext } from 'react';
import { THEMES, type ThemeDefinition } from './registry';

export const ActiveThemeContext = createContext<ThemeDefinition>(THEMES[0]);

/** The theme on screen right now: the site's active theme, or the local `?theme=` preview. */
export function useActiveTheme(): ThemeDefinition {
  return useContext(ActiveThemeContext);
}
