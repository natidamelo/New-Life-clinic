import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import Grid from '../../utils/muiGridFix';

/**
 * Test component that demonstrates how to use the fixed Grid component
 */
const TestGrid: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Grid Component Test (Fixed Version)
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography>Grid Item 1 (size: xs=12, md=6)</Typography>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography>Grid Item 2 (size: xs=12, md=6)</Typography>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography>Grid Item 3 (size: xs=12, md=4)</Typography>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography>Grid Item 4 (size: xs=12, md=4)</Typography>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography>Grid Item 5 (size: xs=12, md=4)</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TestGrid; 