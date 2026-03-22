import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, Chip, Divider } from '@mui/material';
import { toast } from 'react-toastify';

const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzMzAxY2RlZmM3Nzc2YmY3NTM3YjMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzQ4MTk0NDQ1LCJleHAiOjE3NDgyODA4NDV9.AMsRPhxM_eBAIfXBixgsdjvRyo7PkFxf1E44ivtx4QE';

const TokenDebugger: React.FC = () => {
  const [tokens, setTokens] = useState<Record<string, string | null>>({});
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  
  const checkTokens = () => {
    const possibleKeys = ['jwt_token', 'token', 'authToken', 'auth_token'];
    const tokensFound: Record<string, string | null> = {};
    
    for (const key of possibleKeys) {
      const token = localStorage.getItem(key);
      tokensFound[key] = token;
    }
    
    setTokens(tokensFound);
    
    // Check current auth header if we can access it
    if (window.axios?.defaults?.headers?.common?.Authorization) {
      setAuthHeader(window.axios.defaults.headers.common.Authorization as string);
    } else if (window.apiDebug) {
      const debug = window.apiDebug.checkToken();
      setAuthHeader(debug.authHeader);
    } else {
      setAuthHeader(null);
    }
  };
  
  const setTestToken = () => {
    // Set the token in all possible locations
    localStorage.setItem('jwt_token', TEST_TOKEN);
    localStorage.setItem('token', TEST_TOKEN);
    localStorage.setItem('authToken', TEST_TOKEN);
    
    // Set sample user data
    const userData = {
      id: '6823301cdefc7776bf7537b3',
      role: 'doctor',
      email: 'doctor@example.com',
      name: 'Test Doctor'
    };
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Try to set axios header if possible
    if (window.axios) {
      window.axios.defaults.headers.common.Authorization = `Bearer ${TEST_TOKEN}`;
    }
    
    // Use our debug utility if available
    if (window.apiDebug) {
      window.apiDebug.setTestToken();
    }
    
    checkTokens();
    toast.success('Test token set successfully. Refresh page to apply changes.');
  };
  
  const clearAllTokens = () => {
    // Clear tokens from localStorage
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    
    // Reset state
    setTokens({});
    
    // Show notification
    toast('All tokens cleared');
  };
  
  // Check tokens on mount
  useEffect(() => {
    checkTokens();
  }, []);
  
  return (
    <Paper sx={{ p: 2, maxWidth: 500, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Authentication Debugger</Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Typography variant="subtitle2" gutterBottom>Stored Tokens:</Typography>
      <Stack spacing={1} sx={{ mb: 2 }}>
        {Object.entries(tokens).map(([key, value]) => (
          <Box key={key} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight="bold">{key}:</Typography>
            <Chip
              label={value ? `${value.substring(0, 10)}...` : 'Not set'}
              color={value ? 'success' : 'error'}
              size="small"
            />
          </Box>
        ))}
      </Stack>
      
      <Typography variant="subtitle2" gutterBottom>Authorization Header:</Typography>
      <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          {authHeader || 'Not set'}
        </Typography>
      </Box>
      
      <Stack direction="row" spacing={1}>
        <Button 
          variant="contained" 
          color="primary" 
          size="small"
          onClick={checkTokens}
        >
          Refresh
        </Button>
        <Button 
          variant="contained" 
          color="warning" 
          size="small"
          onClick={setTestToken}
        >
          Set Test Token
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          size="small"
          onClick={clearAllTokens}
        >
          Clear All
        </Button>
      </Stack>
    </Paper>
  );
};

export default TokenDebugger; 