import { useMemo } from 'react';
import { useTheme } from '../context/EnhancedThemeContext';

/**
 * Returns a theme-aware color palette for use in Chart.js, Recharts, or any
 * charting library that accepts raw color strings.
 *
 * Values are re-computed whenever the accent or mode changes, so charts
 * automatically re-render with the active theme colors.
 *
 * Usage:
 *   const { primary, gridColor, tooltipBg } = useChartColors();
 */
function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return '#888';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export interface ChartColorPalette {
  /** Active accent / primary color */
  primary: string;
  /** Lighter variant of primary (e.g. fills) */
  primaryLight: string;
  /** Primary at low opacity for area fills */
  primaryAlpha: string;
  /** Success green */
  success: string;
  /** Warning amber */
  warning: string;
  /** Danger / error red */
  danger: string;
  /** Info blue */
  info: string;
  /** Page / canvas background */
  surface: string;
  /** Card / panel surface */
  surfaceAlt: string;
  /** Border / grid line color */
  border: string;
  /** Semi-transparent border for chart grids */
  gridColor: string;
  /** Primary body text */
  text: string;
  /** Muted / secondary text */
  textMuted: string;
  /** Tooltip background */
  tooltipBg: string;
  /** Tooltip text */
  tooltipText: string;
  /** Array of 8 sequential categorical colors based on the active accent hue */
  categorical: string[];
}

export function useChartColors(): ChartColorPalette {
  // Depend on both theme dimensions so memoisation busts on either change
  const { isDarkMode, colorTheme } = useTheme();

  return useMemo(() => {
    const primary       = getCSSVar('--color-primary')     || getCSSVar('--primary-color') || '#6366f1';
    const primaryShade4 = getCSSVar('--primary-color-400') || primary;
    const success       = getCSSVar('--color-success')     || '#10b981';
    const warning       = getCSSVar('--color-warning')     || '#f59e0b';
    const danger        = getCSSVar('--color-danger')      || '#ef4444';
    const info          = getCSSVar('--color-info')        || '#3b82f6';
    const surface       = getCSSVar('--color-surface')     || (isDarkMode ? '#0d0d0d' : '#ffffff');
    const surfaceAlt    = getCSSVar('--color-surface-alt') || (isDarkMode ? '#1c1c1e' : '#f8f8f8');
    const border        = getCSSVar('--color-border')      || (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
    const text          = getCSSVar('--color-text')        || (isDarkMode ? '#f8fafc' : '#0f172a');
    const textMuted     = getCSSVar('--color-text-muted')  || (isDarkMode ? '#94a3b8' : '#64748b');
    const tooltipBg     = getCSSVar('--chart-tooltip-bg')  || (isDarkMode ? '#1e293b' : '#0f172a');
    const tooltipText   = getCSSVar('--chart-tooltip-text')|| '#f8fafc';
    const gridColor     = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    // Alpha variants
    const primaryAlpha  = `${primary.replace(')', ', 0.15)').replace('hsl(', 'hsla(')}`;

    // Build 8-step categorical palette that shifts hue from the primary
    // We derive H,S from the active primary CSS var channel values
    const primaryColorStr = getCSSVar('--primary') || '221 83% 53%';
    const parts = primaryColorStr.trim().split(/\s+/);
    const hue = parseFloat(parts[0]) || 221;
    const sat = parts[1] || '70%';
    const lightBase = isDarkMode ? '65%' : '52%';
    const categorical = Array.from({ length: 8 }, (_, i) =>
      `hsl(${(hue + i * 45) % 360}, ${sat}, ${lightBase})`
    );

    return {
      primary,
      primaryLight: primaryShade4,
      primaryAlpha,
      success,
      warning,
      danger,
      info,
      surface,
      surfaceAlt,
      border,
      gridColor,
      text,
      textMuted,
      tooltipBg,
      tooltipText,
      categorical,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDarkMode, colorTheme]);
}

export default useChartColors;
