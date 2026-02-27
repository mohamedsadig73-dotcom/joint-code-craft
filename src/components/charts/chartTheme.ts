/**
 * Unified ECharts Theme for DTS Application
 * Centralized dark/light theme configuration for all charts.
 * Uses CSS custom properties from index.css design system.
 */

export interface ChartThemeColors {
  text: string;
  textSecondary: string;
  background: string;
  border: string;
  axis: string;
  tooltip: {
    bg: string;
    border: string;
    text: string;
  };
  series: string[];
  success: string;
  danger: string;
  warning: string;
  info: string;
}

const DARK_THEME: ChartThemeColors = {
  text: 'hsl(210, 40%, 98%)',
  textSecondary: 'hsl(215, 30%, 80%)',
  background: 'hsl(222, 40%, 10%)',
  border: 'hsl(217, 33%, 25%)',
  axis: 'hsl(217, 33%, 35%)',
  tooltip: {
    bg: 'rgba(0, 0, 0, 0.88)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#fff',
  },
  series: [
    'hsl(210, 100%, 50%)',  // primary blue
    'hsl(42, 95%, 55%)',    // golden accent
    '#22c55e',              // success green
    '#ef4444',              // danger red
    '#8b5cf6',              // purple
    '#f59e0b',              // amber
    '#06b6d4',              // cyan
    '#ec4899',              // pink
  ],
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#8b5cf6',
};

const LIGHT_THEME: ChartThemeColors = {
  text: 'hsl(222, 47%, 11%)',
  textSecondary: 'hsl(215, 16%, 47%)',
  background: 'hsl(0, 0%, 100%)',
  border: 'hsl(214, 32%, 91%)',
  axis: 'hsl(214, 20%, 69%)',
  tooltip: {
    bg: 'rgba(0, 0, 0, 0.85)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#fff',
  },
  series: [
    'hsl(210, 100%, 35%)',
    'hsl(42, 85%, 45%)',
    '#16a34a',
    '#dc2626',
    '#7c3aed',
    '#d97706',
    '#0891b2',
    '#db2777',
  ],
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#7c3aed',
};

export function getChartTheme(isDark: boolean): ChartThemeColors {
  return isDark ? DARK_THEME : LIGHT_THEME;
}

export const CHART_FONT_FAMILY = 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif';

/** Reusable tooltip config */
export function buildChartTooltip(theme: ChartThemeColors, isRTL: boolean) {
  return {
    backgroundColor: theme.tooltip.bg,
    borderColor: theme.tooltip.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: [12, 16] as [number, number],
    textStyle: {
      color: theme.tooltip.text,
      fontSize: 13,
      fontFamily: CHART_FONT_FAMILY,
    },
  };
}
