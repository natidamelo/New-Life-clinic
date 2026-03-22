import React, { useState, useEffect } from 'react';
import { getAuthToken, getUserData, isAuthenticated, getTokenInfo } from '../utils/authUtils';

/**
 * Authentication Debugger Component
 * Helps debug authentication issues by showing current auth state
 */
const AuthDebugger: React.FC = () => {
  const [authState, setAuthState] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const checkAuthState = () => {
      const token = getAuthToken();
      const userData = getUserData();
      const authenticated = isAuthenticated();
      
      let tokenInfo = null;
      if (token) {
        tokenInfo = getTokenInfo(token);
      }

      setAuthState({
        token: token ? `${token.substring(0, 20)}...` : null,
        tokenLength: token?.length || 0,
        userData,
        authenticated,
        tokenInfo,
        allLocalStorageKeys: Object.keys(localStorage).filter(key => 
          key.includes('token') || key.includes('auth') || key.includes('user')
        )
      });
    };

    checkAuthState();
    
    // Check auth state every 5 seconds
    const interval = setInterval(checkAuthState, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!showDebug) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        zIndex: 9999,
        background: authState?.authenticated ? '#4CAF50' : '#f44336',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px'
      }} onClick={() => setShowDebug(true)}>
        Auth: {authState?.authenticated ? '✓' : '✗'}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999,
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px',
      maxHeight: '500px',
      overflow: 'auto',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Auth Debug</h3>
        <button 
          onClick={() => setShowDebug(false)}
          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      
      <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
        <div><strong>Authenticated:</strong> {authState?.authenticated ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Token:</strong> {authState?.token || 'None'}</div>
        <div><strong>Token Length:</strong> {authState?.tokenLength || 0}</div>
        
        {authState?.tokenInfo && (
          <div>
            <strong>Token Info:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              <li>Expired: {authState.tokenInfo.expired ? '❌ Yes' : '✅ No'}</li>
              {authState.tokenInfo.expiresAt && (
                <li>Expires: {authState.tokenInfo.expiresAt.toLocaleString()}</li>
              )}
              {authState.tokenInfo.userId && (
                <li>User ID: {authState.tokenInfo.userId}</li>
              )}
            </ul>
          </div>
        )}
        
        <div><strong>User Data:</strong> {authState?.userData ? '✅ Present' : '❌ Missing'}</div>
        
        {authState?.userData && (
          <div style={{ marginTop: '8px' }}>
            <strong>User Info:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              <li>Role: {authState.userData.role || 'Unknown'}</li>
              <li>Email: {authState.userData.email || 'Unknown'}</li>
              <li>Name: {authState.userData.firstName || ''} {authState.userData.lastName || ''}</li>
            </ul>
          </div>
        )}
        
        <div style={{ marginTop: '12px' }}>
          <strong>LocalStorage Keys:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
            {authState?.allLocalStorageKeys?.map((key: string) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
        
        <div style={{ marginTop: '12px', fontSize: '10px', color: '#666' }}>
          Auto-refreshes every 5 seconds
        </div>
        
        <div style={{ marginTop: '12px' }}>
          <button 
            onClick={() => {
              console.log('=== AUTH DEBUG INFO ===');
              console.log('All localStorage keys:', Object.keys(localStorage));
              console.log('Token keys:', ['token', 'authToken', 'auth_token', 'jwt_token', 'clinic_auth_token', 'AUTH_TOKEN_KEY'].map(key => ({ key, value: localStorage.getItem(key) })));
              console.log('User data keys:', ['user', 'user_data', 'clinic_user_data', 'USER_DATA_KEY', 'userData', 'auth_user_data', 'clinic_user'].map(key => ({ key, value: localStorage.getItem(key) })));
              console.log('======================');
            }}
            style={{ 
              background: '#007bff', 
              color: 'white', 
              border: 'none', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Debug to Console
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugger;
