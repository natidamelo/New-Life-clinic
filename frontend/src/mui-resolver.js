// Centralized resolver for MUI and Emotion packages
import * as MaterialIcons from '@mui/icons-material';
import * as MaterialCore from '@mui/material';
import * as EmotionReact from '@emotion/react';
import * as EmotionStyled from '@emotion/styled';
import * as StyledEngine from '@mui/styled-engine';
import * as DatePickers from '@mui/x-date-pickers';

// Re-export everything to ensure comprehensive coverage
export const icons = MaterialIcons;
export const material = MaterialCore;
export const emotion = {
  react: EmotionReact,
  styled: EmotionStyled
};
export const styledEngine = StyledEngine;
export const datePickers = DatePickers;

export * from '@mui/icons-material';
export * from '@mui/material';
export * from '@emotion/react';
export * from '@emotion/styled';
export * from '@mui/styled-engine';
export * from '@mui/x-date-pickers'; 