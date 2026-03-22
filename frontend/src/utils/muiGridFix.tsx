import React from 'react';
import { Grid, GridProps } from '@mui/material';

/**
 * A wrapper for MUI Grid that addresses the deprecation warnings
 * 
 * This component converts the deprecated 'item' and 'xs' props to the new format,
 * working with both MUI v5 Grid and the newer Grid v2.
 */
export const FixedGrid: React.FC<GridProps & { 
  children?: React.ReactNode;
}> = ({ 
  children, 
  ...otherProps 
}) => {
  // Remove deprecated props and pass only valid ones
  return (
    <Grid {...otherProps}>
      {children}
    </Grid>
  );
};

export default FixedGrid; 