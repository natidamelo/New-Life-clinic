import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import GlobalSettingsService from '../services/globalSettingsService';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorTheme = 'default-light' | 'default-dark' | 'aqua' | 'teal' | 'light-blue' | 'rose' | 'pink' | 'gold' | 'orange' | 'charcoal' | 'navy' | 'indigo' | 'purple' | 'maroon' | 'forest-green' | 'blue' | 'green' | 'red' | 'gray' | 'slate' | 'zinc' | 'neutral' | 'stone' | 'emerald' | 'cyan' | 'sky' | 'violet' | 'fuchsia' | 'amber' | 'lime' | 'cool-breeze' | 'icy-mint' | 'custom';

export interface ColorThemeConfig {
  name: string;
  value: ColorTheme;
  primary: string;
  primaryForeground: string;
  secondary?: string;
  secondaryForeground?: string;
  accent?: string;
  accentForeground?: string;
  muted?: string;
  mutedForeground?: string;
  background?: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  border?: string;
  input?: string;
  ring?: string;
}

export const colorThemes: ColorThemeConfig[] = [
  // Microsoft Edge Color Themes
  {
    name: 'Default Light',
    value: 'default-light',
    primary: 'hsl(221 83% 53%)', // Blue
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(210 40% 96%)',
    secondaryForeground: 'hsl(222 84% 5%)',
    accent: 'hsl(210 40% 96%)',
    accentForeground: 'hsl(222 84% 5%)',
    muted: 'hsl(210 40% 96%)',
    mutedForeground: 'hsl(215 16% 47%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222 84% 5%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222 84% 5%)',
    border: 'hsl(214 32% 91%)',
    input: 'hsl(214 32% 91%)',
    ring: 'hsl(221 83% 53%)',
  },
  {
    name: 'Default Dark',
    value: 'default-dark',
    primary: 'hsl(217 91% 60%)', // Blue-400, visible on dark backgrounds
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(240 3.7% 15.9%)',
    secondaryForeground: 'hsl(0 0% 98%)',
    accent: 'hsl(240 3.7% 15.9%)',
    accentForeground: 'hsl(0 0% 98%)',
    muted: 'hsl(240 3.7% 15.9%)',
    mutedForeground: 'hsl(240 5% 64.9%)',
    background: 'hsl(240 10% 3.9%)',
    foreground: 'hsl(0 0% 98%)',
    card: 'hsl(240 10% 3.9%)',
    cardForeground: 'hsl(0 0% 98%)',
    border: 'hsl(240 3.7% 15.9%)',
    input: 'hsl(240 3.7% 15.9%)',
    ring: 'hsl(217 91% 60%)',
  },
  {
    name: 'Aqua',
    value: 'aqua',
    primary: 'hsl(180 50% 50%)', // Medium aqua from interface
    primaryForeground: 'hsl(180 30% 95%)', // Light aqua from interface
    secondary: 'hsl(180 30% 95%)',
    secondaryForeground: 'hsl(180 50% 20%)',
    accent: 'hsl(180 30% 95%)',
    accentForeground: 'hsl(180 50% 20%)',
    muted: 'hsl(180 30% 95%)',
    mutedForeground: 'hsl(180 30% 45%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(180 50% 20%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(180 50% 20%)',
    border: 'hsl(180 30% 90%)',
    input: 'hsl(180 30% 90%)',
    ring: 'hsl(180 50% 50%)',
  },
  {
    name: 'Teal',
    value: 'teal',
    primary: 'hsl(173.4 80.4% 40%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(173.4 80.4% 95%)',
    secondaryForeground: 'hsl(173.4 80.4% 10%)',
    accent: 'hsl(173.4 80.4% 95%)',
    accentForeground: 'hsl(173.4 80.4% 10%)',
    muted: 'hsl(173.4 80.4% 95%)',
    mutedForeground: 'hsl(173.4 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(173.4 80.4% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(173.4 80.4% 10%)',
    border: 'hsl(173.4 80.4% 90%)',
    input: 'hsl(173.4 80.4% 90%)',
    ring: 'hsl(173.4 80.4% 40%)',
  },
  {
    name: 'Light Blue',
    value: 'light-blue',
    primary: 'hsl(199.4 89.1% 48.4%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(199.4 89.1% 95%)',
    secondaryForeground: 'hsl(199.4 89.1% 10%)',
    accent: 'hsl(199.4 89.1% 95%)',
    accentForeground: 'hsl(199.4 89.1% 10%)',
    muted: 'hsl(199.4 89.1% 95%)',
    mutedForeground: 'hsl(199.4 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(199.4 89.1% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(199.4 89.1% 10%)',
    border: 'hsl(199.4 89.1% 90%)',
    input: 'hsl(199.4 89.1% 90%)',
    ring: 'hsl(199.4 89.1% 48.4%)',
  },
  {
    name: 'Rose',
    value: 'rose',
    primary: 'hsl(330 80% 70%)', // Bright pink from interface
    primaryForeground: 'hsl(330 40% 95%)', // Light pink from interface
    secondary: 'hsl(330 40% 95%)',
    secondaryForeground: 'hsl(330 80% 20%)',
    accent: 'hsl(330 40% 95%)',
    accentForeground: 'hsl(330 80% 20%)',
    muted: 'hsl(330 40% 95%)',
    mutedForeground: 'hsl(330 40% 45%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(330 80% 20%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(330 80% 20%)',
    border: 'hsl(330 40% 90%)',
    input: 'hsl(330 40% 90%)',
    ring: 'hsl(330 80% 70%)',
  },
  {
    name: 'Pink',
    value: 'pink',
    primary: 'hsl(330.4 81.2% 60.4%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(330.4 81.2% 95%)',
    secondaryForeground: 'hsl(330.4 81.2% 10%)',
    accent: 'hsl(330.4 81.2% 95%)',
    accentForeground: 'hsl(330.4 81.2% 10%)',
    muted: 'hsl(330.4 81.2% 95%)',
    mutedForeground: 'hsl(330.4 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(330.4 81.2% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(330.4 81.2% 10%)',
    border: 'hsl(330.4 81.2% 90%)',
    input: 'hsl(330.4 81.2% 90%)',
    ring: 'hsl(330.4 81.2% 60.4%)',
  },
  {
    name: 'Gold',
    value: 'gold',
    primary: 'hsl(45 60% 70%)', // Light brown/beige from interface
    primaryForeground: 'hsl(45 30% 95%)', // Very pale brown from interface
    secondary: 'hsl(45 30% 95%)',
    secondaryForeground: 'hsl(45 60% 20%)',
    accent: 'hsl(45 30% 95%)',
    accentForeground: 'hsl(45 60% 20%)',
    muted: 'hsl(45 30% 95%)',
    mutedForeground: 'hsl(45 30% 45%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(45 60% 20%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(45 60% 20%)',
    border: 'hsl(45 30% 90%)',
    input: 'hsl(45 30% 90%)',
    ring: 'hsl(45 60% 70%)',
  },
  {
    name: 'Orange',
    value: 'orange',
    primary: 'hsl(24.6 95% 53.1%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(24.6 95% 95%)',
    secondaryForeground: 'hsl(24.6 95% 10%)',
    accent: 'hsl(24.6 95% 95%)',
    accentForeground: 'hsl(24.6 95% 10%)',
    muted: 'hsl(24.6 95% 95%)',
    mutedForeground: 'hsl(24.6 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(24.6 95% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(24.6 95% 10%)',
    border: 'hsl(24.6 95% 90%)',
    input: 'hsl(24.6 95% 90%)',
    ring: 'hsl(24.6 95% 53.1%)',
  },
  {
    name: 'Charcoal',
    value: 'charcoal',
    primary: 'hsl(240 5.9% 10%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(240 4.8% 95.9%)',
    secondaryForeground: 'hsl(240 5.9% 10%)',
    accent: 'hsl(240 4.8% 95.9%)',
    accentForeground: 'hsl(240 5.9% 10%)',
    muted: 'hsl(240 4.8% 95.9%)',
    mutedForeground: 'hsl(240 3.8% 46.1%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(240 10% 3.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(240 10% 3.9%)',
    border: 'hsl(240 5.9% 90%)',
    input: 'hsl(240 5.9% 90%)',
    ring: 'hsl(240 5.9% 10%)',
  },
  {
    name: 'Navy',
    value: 'navy',
    primary: 'hsl(220 100% 20%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(220 100% 95%)',
    secondaryForeground: 'hsl(220 100% 10%)',
    accent: 'hsl(220 100% 95%)',
    accentForeground: 'hsl(220 100% 10%)',
    muted: 'hsl(220 100% 95%)',
    mutedForeground: 'hsl(220 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(220 100% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(220 100% 10%)',
    border: 'hsl(220 100% 90%)',
    input: 'hsl(220 100% 90%)',
    ring: 'hsl(220 100% 20%)',
  },
  {
    name: 'Indigo',
    value: 'indigo',
    primary: 'hsl(238.7 83.3% 66.7%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(238.7 83.3% 95%)',
    secondaryForeground: 'hsl(238.7 83.3% 10%)',
    accent: 'hsl(238.7 83.3% 95%)',
    accentForeground: 'hsl(238.7 83.3% 10%)',
    muted: 'hsl(238.7 83.3% 95%)',
    mutedForeground: 'hsl(238.7 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(238.7 83.3% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(238.7 83.3% 10%)',
    border: 'hsl(238.7 83.3% 90%)',
    input: 'hsl(238.7 83.3% 90%)',
    ring: 'hsl(238.7 83.3% 66.7%)',
  },
  {
    name: 'Purple',
    value: 'purple',
    primary: 'hsl(262.1 83.3% 57.8%)',
    primaryForeground: 'hsl(210 40% 98%)',
    secondary: 'hsl(262.1 83.3% 95%)',
    secondaryForeground: 'hsl(262.1 83.3% 10%)',
    accent: 'hsl(262.1 83.3% 95%)',
    accentForeground: 'hsl(262.1 83.3% 10%)',
    muted: 'hsl(262.1 83.3% 95%)',
    mutedForeground: 'hsl(262.1 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(262.1 83.3% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(262.1 83.3% 10%)',
    border: 'hsl(262.1 83.3% 90%)',
    input: 'hsl(262.1 83.3% 90%)',
    ring: 'hsl(262.1 83.3% 57.8%)',
  },
  {
    name: 'Maroon',
    value: 'maroon',
    primary: 'hsl(0 60% 25%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 60% 95%)',
    secondaryForeground: 'hsl(0 60% 10%)',
    accent: 'hsl(0 60% 95%)',
    accentForeground: 'hsl(0 60% 10%)',
    muted: 'hsl(0 60% 95%)',
    mutedForeground: 'hsl(0 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(0 60% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(0 60% 10%)',
    border: 'hsl(0 60% 90%)',
    input: 'hsl(0 60% 90%)',
    ring: 'hsl(0 60% 25%)',
  },
  {
    name: 'Forest Green',
    value: 'forest-green',
    primary: 'hsl(120 100% 20%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(120 100% 95%)',
    secondaryForeground: 'hsl(120 100% 10%)',
    accent: 'hsl(120 100% 95%)',
    accentForeground: 'hsl(120 100% 10%)',
    muted: 'hsl(120 100% 95%)',
    mutedForeground: 'hsl(120 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(120 100% 10%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(120 100% 10%)',
    border: 'hsl(120 100% 90%)',
    input: 'hsl(120 100% 90%)',
    ring: 'hsl(120 100% 20%)',
  },
  // Original themes for backward compatibility
  {
    name: 'Blue',
    value: 'blue',
    primary: 'hsl(221.2 83.2% 53.3%)',
    primaryForeground: 'hsl(210 40% 98%)',
    secondary: 'hsl(210 40% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(210 40% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(210 40% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(221.2 83.2% 53.3%)',
  },
  {
    name: 'Green',
    value: 'green',
    primary: 'hsl(142.1 76.2% 36.3%)',
    primaryForeground: 'hsl(355.7 100% 97.3%)',
    secondary: 'hsl(138 76.5% 96.7%)',
    secondaryForeground: 'hsl(140.9 100% 4.9%)',
    accent: 'hsl(138 76.5% 96.7%)',
    accentForeground: 'hsl(140.9 100% 4.9%)',
    muted: 'hsl(138 76.5% 96.7%)',
    mutedForeground: 'hsl(145 3.7% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(140.9 100% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(140.9 100% 4.9%)',
    border: 'hsl(138 76.5% 96.7%)',
    input: 'hsl(138 76.5% 96.7%)',
    ring: 'hsl(142.1 76.2% 36.3%)',
  },
  {
    name: 'Purple',
    value: 'purple',
    primary: 'hsl(262.1 83.3% 57.8%)',
    primaryForeground: 'hsl(210 40% 98%)',
    secondary: 'hsl(210 40% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(210 40% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(210 40% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(262.1 83.3% 57.8%)',
  },
  {
    name: 'Red',
    value: 'red',
    primary: 'hsl(0 84.2% 60.2%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(0 84.2% 60.2%)',
  },
  {
    name: 'Orange',
    value: 'orange',
    primary: 'hsl(24.6 95% 53.1%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(24.6 95% 53.1%)',
  },
  {
    name: 'Pink',
    value: 'pink',
    primary: 'hsl(330.4 81.2% 60.4%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(330.4 81.2% 60.4%)',
  },
  {
    name: 'Teal',
    value: 'teal',
    primary: 'hsl(173.4 80.4% 40%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(173.4 80.4% 40%)',
  },
  {
    name: 'Indigo',
    value: 'indigo',
    primary: 'hsl(238.7 83.3% 66.7%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(238.7 83.3% 66.7%)',
  },
  {
    name: 'Gray',
    value: 'gray',
    primary: 'hsl(240 5.9% 10%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(240 4.8% 95.9%)',
    secondaryForeground: 'hsl(240 5.9% 10%)',
    accent: 'hsl(240 4.8% 95.9%)',
    accentForeground: 'hsl(240 5.9% 10%)',
    muted: 'hsl(240 4.8% 95.9%)',
    mutedForeground: 'hsl(240 3.8% 46.1%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(240 10% 3.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(240 10% 3.9%)',
    border: 'hsl(240 5.9% 90%)',
    input: 'hsl(240 5.9% 90%)',
    ring: 'hsl(240 5.9% 10%)',
  },
  {
    name: 'Slate',
    value: 'slate',
    primary: 'hsl(222.2 84% 4.9%)',
    primaryForeground: 'hsl(210 40% 98%)',
    secondary: 'hsl(210 40% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(210 40% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(210 40% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(222.2 84% 4.9%)',
  },
  {
    name: 'Zinc',
    value: 'zinc',
    primary: 'hsl(240 5.9% 10%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(240 4.8% 95.9%)',
    secondaryForeground: 'hsl(240 5.9% 10%)',
    accent: 'hsl(240 4.8% 95.9%)',
    accentForeground: 'hsl(240 5.9% 10%)',
    muted: 'hsl(240 4.8% 95.9%)',
    mutedForeground: 'hsl(240 3.8% 46.1%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(240 10% 3.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(240 10% 3.9%)',
    border: 'hsl(240 5.9% 90%)',
    input: 'hsl(240 5.9% 90%)',
    ring: 'hsl(240 5.9% 10%)',
  },
  {
    name: 'Neutral',
    value: 'neutral',
    primary: 'hsl(0 0% 9%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(0 0% 9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(0 0% 9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(0 0% 45%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(0 0% 9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(0 0% 9%)',
    border: 'hsl(0 0% 90%)',
    input: 'hsl(0 0% 90%)',
    ring: 'hsl(0 0% 9%)',
  },
  {
    name: 'Stone',
    value: 'stone',
    primary: 'hsl(20 14.3% 4.1%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(60 4.8% 95.9%)',
    secondaryForeground: 'hsl(20 14.3% 4.1%)',
    accent: 'hsl(60 4.8% 95.9%)',
    accentForeground: 'hsl(20 14.3% 4.1%)',
    muted: 'hsl(60 4.8% 95.9%)',
    mutedForeground: 'hsl(25 5.3% 44.7%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(20 14.3% 4.1%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(20 14.3% 4.1%)',
    border: 'hsl(20 5.9% 90%)',
    input: 'hsl(20 5.9% 90%)',
    ring: 'hsl(20 14.3% 4.1%)',
  },
  {
    name: 'Emerald',
    value: 'emerald',
    primary: 'hsl(142.1 70.6% 45.3%)',
    primaryForeground: 'hsl(138 76.5% 96.7%)',
    secondary: 'hsl(138 76.5% 96.7%)',
    secondaryForeground: 'hsl(140.9 100% 4.9%)',
    accent: 'hsl(138 76.5% 96.7%)',
    accentForeground: 'hsl(140.9 100% 4.9%)',
    muted: 'hsl(138 76.5% 96.7%)',
    mutedForeground: 'hsl(145 3.7% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(140.9 100% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(140.9 100% 4.9%)',
    border: 'hsl(138 76.5% 96.7%)',
    input: 'hsl(138 76.5% 96.7%)',
    ring: 'hsl(142.1 70.6% 45.3%)',
  },
  {
    name: 'Cyan',
    value: 'cyan',
    primary: 'hsl(188.7 94.5% 42.7%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(188.7 94.5% 42.7%)',
  },
  {
    name: 'Sky',
    value: 'sky',
    primary: 'hsl(199.4 89.1% 48.4%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(199.4 89.1% 48.4%)',
  },
  {
    name: 'Violet',
    value: 'violet',
    primary: 'hsl(262.1 83.3% 57.8%)',
    primaryForeground: 'hsl(210 40% 98%)',
    secondary: 'hsl(210 40% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(210 40% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(210 40% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(262.1 83.3% 57.8%)',
  },
  {
    name: 'Fuchsia',
    value: 'fuchsia',
    primary: 'hsl(292 84% 60%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(292 84% 60%)',
  },
  {
    name: 'Rose',
    value: 'rose',
    primary: 'hsl(346.8 77.2% 49.8%)',
    primaryForeground: 'hsl(355.7 100% 97.3%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(346.8 77.2% 49.8%)',
  },
  {
    name: 'Amber',
    value: 'amber',
    primary: 'hsl(45.4 93.4% 47.5%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(45.4 93.4% 47.5%)',
  },
  {
    name: 'Lime',
    value: 'lime',
    primary: 'hsl(84.4 81% 44.5%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96%)',
    secondaryForeground: 'hsl(222.2 84% 4.9%)',
    accent: 'hsl(0 0% 96%)',
    accentForeground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(84.4 81% 44.5%)',
  },
  {
    name: 'Cool Breeze',
    value: 'cool-breeze',
    primary: 'hsl(195 100% 75%)', // Light cyan-blue
    primaryForeground: 'hsl(195 100% 15%)',
    secondary: 'hsl(195 100% 95%)',
    secondaryForeground: 'hsl(195 100% 20%)',
    accent: 'hsl(195 100% 95%)',
    accentForeground: 'hsl(195 100% 20%)',
    muted: 'hsl(195 100% 95%)',
    mutedForeground: 'hsl(195 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(195 100% 15%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(195 100% 15%)',
    border: 'hsl(195 100% 90%)',
    input: 'hsl(195 100% 90%)',
    ring: 'hsl(195 100% 75%)',
  },
  {
    name: 'Icy Mint',
    value: 'icy-mint',
    primary: 'hsl(160 80% 70%)', // Light mint green
    primaryForeground: 'hsl(160 80% 15%)',
    secondary: 'hsl(160 80% 95%)',
    secondaryForeground: 'hsl(160 80% 20%)',
    accent: 'hsl(160 80% 95%)',
    accentForeground: 'hsl(160 80% 20%)',
    muted: 'hsl(160 80% 95%)',
    mutedForeground: 'hsl(160 50% 40%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(160 80% 15%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(160 80% 15%)',
    border: 'hsl(160 80% 90%)',
    input: 'hsl(160 80% 90%)',
    ring: 'hsl(160 80% 70%)',
  },
];

export interface ThemeContextProps {
  themeMode: ThemeMode;
  colorTheme: ColorTheme;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  toggleTheme: () => void;
  resetToDefault: () => void;
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// Helper: apply primary color and all its shade variations to CSS custom properties
function applyPrimaryColorVariables(colorTheme: ColorTheme) {
  const root = window.document.documentElement;
  const themeConfig = colorThemes.find(t => t.value === colorTheme);
  if (!themeConfig?.primary) return;

  const hslMatch = themeConfig.primary.match(/hsl\(([^)]+)\)/);
  const primaryValue = hslMatch ? hslMatch[1] : themeConfig.primary;
  const parts = primaryValue.trim().split(/\s+/);
  const hue = parts[0];
  const saturation = parts[1] ?? '80%';

  root.style.setProperty('--primary', primaryValue);
  root.style.setProperty('--primary-color', `hsl(${primaryValue})`);

  if (themeConfig.primaryForeground) {
    const fgMatch = themeConfig.primaryForeground.match(/hsl\(([^)]+)\)/);
    root.style.setProperty('--primary-foreground', fgMatch ? fgMatch[1] : themeConfig.primaryForeground);
  }
  if (themeConfig.ring) {
    const ringMatch = themeConfig.ring.match(/hsl\(([^)]+)\)/);
    root.style.setProperty('--ring', ringMatch ? ringMatch[1] : themeConfig.ring);
  }

  // Keep sidebar-primary and ring in sync
  root.style.setProperty('--sidebar-primary', primaryValue);
  if (themeConfig.primaryForeground) {
    const fgMatch = themeConfig.primaryForeground.match(/hsl\(([^)]+)\)/);
    root.style.setProperty('--sidebar-primary-foreground', fgMatch ? fgMatch[1] : themeConfig.primaryForeground);
  }
  root.style.setProperty('--sidebar-ring', primaryValue);

  const shades: Record<string, string> = {
    '25':  `${hue} ${saturation} 98%`,
    '50':  `${hue} ${saturation} 95%`,
    '100': `${hue} ${saturation} 90%`,
    '200': `${hue} ${saturation} 80%`,
    '300': `${hue} ${saturation} 70%`,
    '400': `${hue} ${saturation} 60%`,
    '500': primaryValue,
    '600': `${hue} ${saturation} 40%`,
    '700': `${hue} ${saturation} 30%`,
    '800': `${hue} ${saturation} 20%`,
    '900': `${hue} ${saturation} 10%`,
    '950': `${hue} ${saturation} 5%`,
  };

  Object.entries(shades).forEach(([shade, value]) => {
    root.style.setProperty(`--primary-color-${shade}`, `hsl(${value})`);
  });

  root.style.setProperty('--primary-hover',    `hsl(${shades['600']})`);
  root.style.setProperty('--primary-active',   `hsl(${shades['700']})`);
  root.style.setProperty('--primary-focus',    `hsl(${shades['500']})`);
  root.style.setProperty('--primary-disabled', `hsl(${shades['300']})`);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Track whether the user has manually changed the theme this session
  // If true, global settings polling will NOT override the user's choice
  const [userOverrode, setUserOverrode] = useState(false);
  
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode | null;
    return saved || 'system';
  });

  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('colorTheme') as ColorTheme | null;
    return saved || 'default-light';
  });

  // Track system preference as state so changes trigger re-renders
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  });

  // Calculate actual theme based on mode and system preference
  const getActualTheme = useCallback((): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemPrefersDark]);

  const isDarkMode = getActualTheme() === 'dark';

  // Apply primary color theme immediately on mount
  // Note: sidebar variables are set by the theme-class effect below (which knows light/dark)
  useEffect(() => {
    applyPrimaryColorVariables(colorTheme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Load global settings when user logs in.
  // Only apply server-side theme if the user has NOT already saved a preference
  // in localStorage (i.e. they have not manually chosen a theme before).
  useEffect(() => {
    const loadGlobalSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const settings = await GlobalSettingsService.getGlobalSettings();
        setGlobalSettings(settings);
        
        // Only apply server theme when there is no local preference saved yet
        const hasLocalTheme = !!localStorage.getItem('themeMode');
        if (hasLocalTheme) {
          // User already has a saved preference — respect it, don't overwrite
          setLoading(false);
          return;
        }

        const userRole = user.role || 'doctor';
        const roleSettings = settings?.roleSettings?.[userRole];
        
        if (roleSettings?.appearance) {
          const { theme, colorTheme: roleColorTheme } = roleSettings.appearance;
          
          if (theme) {
            const newThemeMode = theme === 'auto' ? 'system' : theme as ThemeMode;
            setThemeMode(newThemeMode);
            localStorage.setItem('themeMode', newThemeMode);
          }
          
          if (roleColorTheme) {
            setColorTheme(roleColorTheme as ColorTheme);
            localStorage.setItem('colorTheme', roleColorTheme);
          }
        }
      } catch (error) {
        console.error('Failed to load global settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGlobalSettings();
  }, [user]);

  // Apply global settings theme ONLY when they first load, and ONLY if the user
  // has not manually overridden the theme in this session.
  // This prevents the 10-second polling from fighting the user's manual toggle.
  useEffect(() => {
    if (!globalSettings || !user || userOverrode) return;

    const userRole = user.role || 'doctor';
    const roleSettings = globalSettings?.roleSettings?.[userRole];
    
    if (roleSettings?.appearance) {
      const { theme, colorTheme: roleColorTheme } = roleSettings.appearance;
      
      if (theme) {
        const newThemeMode = theme === 'auto' ? 'system' : theme as ThemeMode;
        setThemeMode(newThemeMode);
        localStorage.setItem('themeMode', newThemeMode);
      }
      
      if (roleColorTheme) {
        setColorTheme(roleColorTheme as ColorTheme);
        localStorage.setItem('colorTheme', roleColorTheme);
      }
    }
  // Only run when globalSettings first loads — NOT when themeMode/colorTheme change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSettings, user]);

  // Periodically refresh global settings — but only apply them if the user
  // has NOT manually changed their theme this session.
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const updatedSettings = await GlobalSettingsService.getGlobalSettings();
        const changed = JSON.stringify(updatedSettings) !== JSON.stringify(globalSettings);
        if (changed) {
          // Only push the new settings into state; the effect above will apply
          // them only if userOverrode is still false.
          setGlobalSettings(updatedSettings);
        }
      } catch (error) {
        console.error('Failed to refresh global settings:', error);
      }
    }, 30000); // Reduced to every 30 seconds to reduce noise

    return () => clearInterval(refreshInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Single unified effect: applies dark/light class AND all color variables together
  // so there is never a race between the two effects.
  useEffect(() => {
    const root = window.document.documentElement;
    const actualTheme = getActualTheme();

    // 1. Toggle dark/light class on <html> and <body>
    root.classList.remove('light', 'dark', 'auto');
    root.classList.add(actualTheme);
    document.body.classList.remove('light', 'dark', 'auto');
    document.body.classList.add(actualTheme);

    // 2. Remove structural inline overrides so the .dark CSS class controls them
    const structuralProps = [
      '--background', '--foreground',
      '--card', '--card-foreground',
      '--popover', '--popover-foreground',
      '--secondary', '--secondary-foreground',
      '--muted', '--muted-foreground',
      '--accent', '--accent-foreground',
      '--border', '--input',
    ];
    structuralProps.forEach(p => root.style.removeProperty(p));

    // 3. Apply primary color + all shade variations
    applyPrimaryColorVariables(colorTheme);

    // 4. Override primary to be lighter in dark mode for better contrast
    const themeConfig = colorThemes.find(t => t.value === colorTheme);
    if (themeConfig?.primary) {
      const hslMatch = themeConfig.primary.match(/hsl\(([^)]+)\)/);
      const primaryValue = hslMatch ? hslMatch[1] : themeConfig.primary;
      const parts = primaryValue.trim().split(/\s+/);
      const hue = parts[0];
      const sat = parts[1] ?? '80%';
      const adjustedPrimary = actualTheme === 'dark' ? `${hue} ${sat} 65%` : primaryValue;
      root.style.setProperty('--primary', adjustedPrimary);
      root.style.setProperty('--primary-color', `hsl(${adjustedPrimary})`);
      root.style.setProperty('--sidebar-primary', adjustedPrimary);
      root.style.setProperty('--sidebar-ring', adjustedPrimary);

      // 5. Sidebar structural colors — set AFTER applyPrimaryColorVariables so they win
      if (actualTheme === 'dark') {
        root.style.setProperty('--sidebar', '240 10% 6%');
        root.style.setProperty('--sidebar-foreground', '0 0% 92%');
        root.style.setProperty('--sidebar-border', '240 3.7% 15.9%');
        root.style.setProperty('--sidebar-accent', `${hue} ${sat} 18%`);
        root.style.setProperty('--sidebar-accent-foreground', `${hue} ${sat} 88%`);
      } else {
        root.style.setProperty('--sidebar', '0 0% 98%');
        root.style.setProperty('--sidebar-foreground', '240 10% 10%');
        root.style.setProperty('--sidebar-border', '240 5.9% 88%');
        root.style.setProperty('--sidebar-accent', `${hue} ${sat} 93%`);
        root.style.setProperty('--sidebar-accent-foreground', `${hue} ${sat} 22%`);
      }
    }

    // 6. Persist preferences
    localStorage.setItem('themeMode', themeMode);
    localStorage.setItem('colorTheme', colorTheme);
  }, [themeMode, colorTheme, systemPrefersDark, getActualTheme]);

  // Listen for system theme changes — always active so isDarkMode is accurate in system mode
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    // Mark as user-overridden so global settings polling won't revert this
    setUserOverrode(true);
    const next = isDarkMode ? 'light' : 'dark';
    setThemeMode(next);
    localStorage.setItem('themeMode', next);
  };

  const resetToDefault = async () => {
    setUserOverrode(false);
    setThemeMode('system');
    setColorTheme('default-light');
    localStorage.setItem('themeMode', 'system');
    localStorage.setItem('colorTheme', 'default-light');
    
    if (user?.role === 'admin') {
      try {
        await GlobalSettingsService.applyAppearanceToAllDashboards({
          theme: 'auto',
          colorTheme: 'default-light',
        });
      } catch (error) {
        console.error('Failed to reset theme in global settings:', error);
      }
    }
  };

  // Wrapper functions that save to global settings
  const handleSetThemeMode = async (mode: ThemeMode) => {
    setUserOverrode(true);
    setThemeMode(mode);
    localStorage.setItem('themeMode', mode);
    
    if (user?.role === 'admin') {
      try {
        const dbTheme = mode === 'system' ? 'auto' : mode;
        await GlobalSettingsService.applyAppearanceToAllDashboards({ theme: dbTheme });
      } catch (error) {
        console.error('Failed to save theme mode to global settings:', error);
      }
    }
  };

  const handleSetColorTheme = async (theme: ColorTheme) => {
    setUserOverrode(true);
    setColorTheme(theme);
    localStorage.setItem('colorTheme', theme);
    
    if (user?.role === 'admin') {
      try {
        await GlobalSettingsService.applyAppearanceToAllDashboards({ colorTheme: theme });
        const updatedSettings = await GlobalSettingsService.getGlobalSettings();
        setGlobalSettings(updatedSettings);
      } catch (error) {
        console.error('Failed to save color theme to global settings:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      themeMode, 
      colorTheme, 
      isDarkMode, 
      setThemeMode: handleSetThemeMode, 
      setColorTheme: handleSetColorTheme, 
      toggleTheme, 
      resetToDefault 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
