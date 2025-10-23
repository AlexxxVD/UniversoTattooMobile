import React, { createContext, useContext, useMemo } from 'react';
import { colors as baseColors } from './colors';

export type Theme = {
  colors: typeof baseColors;
  radius: { sm: number; md: number; lg: number; pill: number };
  spacing: (n: number) => number;
  shadow: { soft: any };
};

const defaultTheme: Theme = {
  colors: baseColors,
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  spacing: (n: number) => n * 4,
  shadow: { soft: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 } },
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<Theme>(() => defaultTheme, []);
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  return ctx ?? defaultTheme;
}