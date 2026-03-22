import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

const AuthDebugger: React.FC = () => {
  const { user, isAuthenticated, getToken } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>({});

  useEffect(() => {
    const checkTokens = () => {
      const tokenKeys = [
        'auth_token',
        'AUTH_TOKEN_KEY', 
        'authToken',
        'jwt_token',
        'token',
        'clinic_auth_token',
        'clinic_jwt_token'
      ];

      const tokens: any = {};
      tokenKeys.forEach(key => {
        const token = localStorage.getItem(key);
        if (token) {
          tokens[key] = {
            exists: true,
            length: token.length,
            preview: token.substring(0, 20) + '...',
            full: token
          };
        } else {
          tokens[key] = { exists: false };
        }
      });

      setTokenInfo(tokens);
    };

    checkTokens();
    const interval = setInterval(checkTokens, 2000);
    return () => clearInterval(interval);
  }, []);

  const clearAllTokens = () => {
    const tokenKeys = [
      'auth_token',
      'AUTH_TOKEN_KEY', 
      'authToken',
      'jwt_token',
      'token',
      'clinic_auth_token',
      'clinic_jwt_token'
    ];
    
    tokenKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    localStorage.removeItem('user_data');
    window.location.reload();
  };

  const setTestToken = () => {
    const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYxMDEyMzQ1Njc4OTAxMjM0NTY3ODkwMSIsInJvbGUiOiJkb2N0b3IiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.development_token_for_local_testing_only";
    localStorage.setItem('auth_token', testToken);
    
    const testUser = {
      id: "610123456789012345678901",
      _id: "610123456789012345678901",
      email: "doctor@test.com",
      name: "Test Doctor",
      role: "doctor",
      firstName: "Test",
      lastName: "Doctor"
    };
    
    localStorage.setItem('user_data', JSON.stringify(testUser));
    window.location.reload();
  };

  const restoreUserDataFromToken = () => {
    try {
      // Get the first available token
      const tokenKeys = [
        'auth_token',
        'AUTH_TOKEN_KEY', 
        'authToken',
        'jwt_token',
        'token',
        'clinic_auth_token',
        'clinic_jwt_token'
      ];
      
      let token = null;
      for (const key of tokenKeys) {
        const foundToken = localStorage.getItem(key);
        if (foundToken) {
          token = foundToken;
          break;
        }
      }
      
      if (!token) {
        alert('No token found to restore user data from');
        return;
      }
      
      // Decode the token to get user information
      const decoded = jwtDecode(token) as any;
      console.log('Decoded token:', decoded);
      
      // Create user data from token payload
      const userData = {
        id: decoded.userId || decoded.id || decoded.user_id,
        _id: decoded.userId || decoded.id || decoded.user_id,
        email: decoded.email || 'doctor@clinic.com',
        name: decoded.name || 'Doctor User',
        role: decoded.role || 'doctor',
        firstName: decoded.firstName || decoded.first_name || 'Doctor',
        lastName: decoded.lastName || decoded.last_name || 'User'
      };
      
      // Store the user data
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      console.log('User data restored from token:', userData);
      alert('User data restored from token! Refreshing page...');
      
      // Reload the page to apply the changes
      window.location.reload();
      
    } catch (error) {
      console.error('Error restoring user data from token:', error);
      alert('Error restoring user data: ' + error.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 9999,
      border: '1px solid #333'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>🔐 Auth Debugger</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Auth Status:</strong> {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>User:</strong> {user ? `${user.name} (${user.role})` : 'None'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Current Token:</strong> {getToken() ? '✅ Found' : '❌ Not Found'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>User Data:</strong> {localStorage.getItem('user_data') ? '✅ Found' : '❌ Missing'}
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Token Storage:</strong>
        {Object.entries(tokenInfo).map(([key, info]: [string, any]) => (
          <div key={key} style={{ marginLeft: '10px', fontSize: '11px' }}>
            {key}: {info.exists ? `✅ ${info.preview}` : '❌'}
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button 
          onClick={restoreUserDataFromToken}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Restore User Data
        </button>
        
        <button 
          onClick={setTestToken}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Set Test Token
        </button>
        
        <button 
          onClick={clearAllTokens}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Clear All
        </button>
      </div>
    </div>
  );
};

export default AuthDebugger; 