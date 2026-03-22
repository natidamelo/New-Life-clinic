/**
 * This is a shim for @mui/styled-engine to avoid the import error in MUI
 */
import styled from '@emotion/styled/base';
import { css, keyframes, GlobalStyles as EmotionGlobalStyles } from '@emotion/react';

// Re-export with the same interface as @mui/styled-engine
export default styled;
export { styled, css, keyframes };

// Export GlobalStyles with the same API
export const GlobalStyles = ({ styles }) => {
  return <EmotionGlobalStyles styles={styles} />;
}; 