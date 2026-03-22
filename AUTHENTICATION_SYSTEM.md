# Authentication System - Best Practices Implementation

## Overview

This document describes the comprehensive authentication system implemented for the Clinic CMS application. The system follows modern best practices for security, maintainability, and user experience.

## Architecture

### Core Components

1. **AuthService** (`frontend/src/services/authService.ts`)
   - Centralized authentication logic
   - Token management and validation
   - Automatic token refresh
   - Secure storage practices

2. **ApiService** (`frontend/src/services/apiService.ts`)
   - Single axios instance for all API calls
   - Automatic token attachment
   - Comprehensive error handling
   - Request/response interceptors

3. **AuthContext** (`frontend/src/context/AuthContext.tsx`)
   - React context for authentication state
   - Hooks for easy access to auth data
   - Loading states and error handling

## Key Features

### 🔐 Secure Token Management
- **Single Source of Truth**: All tokens stored with consistent naming (`clinic_auth_token`)
- **Automatic Migration**: Legacy token keys are automatically migrated
- **Secure Storage**: Fallback to sessionStorage if localStorage fails
- **Token Validation**: JWT tokens are validated before use

### 🔄 Automatic Token Refresh
- **Proactive Refresh**: Tokens are refreshed 5 minutes before expiration
- **Background Processing**: Refresh happens automatically without user intervention
- **Failure Handling**: Graceful fallback when refresh fails

### 🚨 Comprehensive Error Handling
- **401 Unauthorized**: Automatic logout and redirect to login
- **403 Forbidden**: Permission denied notifications
- **Network Errors**: Retry logic and server fallback
- **User Feedback**: Toast notifications for all error states

### 🌐 Server Discovery
- **Multiple URLs**: Automatically tests multiple server URLs
- **Fallback Logic**: Switches to working server if primary fails
- **Connection Testing**: Validates server connectivity before requests

## Usage

### Basic Authentication

```typescript
import { useAuth } from '../context/AuthContext';

function LoginComponent() {
  const { login, isLoading, isAuthenticated } = useAuth();

  const handleLogin = async (identifier: string, password: string) => {
    const success = await login(identifier, password);
    if (success) {
      // Redirect to dashboard
      navigate('/dashboard');
    }
  };

  return (
    // Login form JSX
  );
}
```

### Making Authenticated API Calls

```typescript
import api from '../services/apiService';

// Token is automatically attached to all requests
const response = await api.get('/api/auth/me');
const userData = response.data.data.user;
```

### Checking Authentication Status

```typescript
import { useAuth, useIsAuthenticated } from '../context/AuthContext';

function ProtectedComponent() {
  const isAuthenticated = useIsAuthenticated();
  const { user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <div>Welcome, {user?.username}!</div>;
}
```

## Configuration

### Token Storage Keys
```typescript
// Current keys (consistent naming)
const TOKEN_KEY = 'clinic_auth_token';
const USER_KEY = 'clinic_user_data';
const REFRESH_TOKEN_KEY = 'clinic_refresh_token';
```

### Server URLs
```typescript
const SERVER_URLS = [
  'http://localhost:5002',
  'http://127.0.0.1:5002',
  'http://10.181.115.157:5002',
  // Additional fallback URLs...
];
```

## Security Features

### 🛡️ Token Security
- **JWT Validation**: Tokens are validated before each use
- **Expiration Checking**: Expired tokens are automatically removed
- **Secure Headers**: Authorization headers are properly formatted
- **Storage Encryption**: Consider implementing token encryption for production

### 🔒 Request Security
- **HTTPS Ready**: Configured for secure connections
- **CORS Handling**: Proper cross-origin request handling
- **Request Timeouts**: Prevents hanging requests
- **Rate Limiting**: Built-in retry logic with exponential backoff

### 🚫 Attack Prevention
- **XSS Protection**: Tokens stored securely in localStorage
- **CSRF Protection**: Stateless JWT tokens prevent CSRF attacks
- **Injection Prevention**: All requests use parameterized queries

## Error Handling

### Authentication Errors (401)
```typescript
// Automatic handling in ApiService
if (error.response?.status === 401) {
  // Clear authentication data
  authService.clearAuth();
  
  // Show user notification
  toast.error('Your session has expired. Please log in again.');
  
  // Redirect to login
  window.location.href = '/login';
}
```

### Network Errors
```typescript
// Automatic retry with exponential backoff
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};
```

## Migration Guide

### From Old System
The new system automatically migrates from the old authentication implementation:

1. **Token Migration**: Legacy tokens are automatically detected and migrated
2. **API Calls**: Replace old axios imports with the new apiService
3. **Context Usage**: Update components to use the new AuthContext hooks

### Breaking Changes
- `setAuthToken()` → Use `AuthService` methods
- `getAuthToken()` → Use `AuthService.getToken()`
- Multiple axios instances → Single `apiService`

## Testing

### Manual Testing
1. **Login Flow**: Test with valid/invalid credentials
2. **Token Persistence**: Refresh page and verify user stays logged in
3. **Token Expiration**: Wait for token to expire and verify automatic refresh
4. **Error Handling**: Test with server offline, invalid tokens, etc.

### Automated Testing
Use the provided test script:
```bash
node test-auth-flow.js
```

## Troubleshooting

### Common Issues

#### 401 Unauthorized Errors
1. **Check Server Status**: Ensure backend is running on port 5002
2. **Verify Credentials**: Test with known good credentials (DR Natan / doctor123)
3. **JWT Secret**: Ensure consistent JWT secret between login and validation
4. **Token Format**: Verify Authorization header format (`Bearer <token>`)

#### Token Not Persisting
1. **Storage Permissions**: Check if localStorage is available
2. **Browser Settings**: Verify cookies/storage are enabled
3. **Incognito Mode**: Private browsing may limit storage

#### Network Errors
1. **Server URLs**: Check if server URLs in config are correct
2. **Firewall**: Ensure no firewall blocking requests
3. **CORS**: Verify CORS settings on backend

### Debug Mode
Enable detailed logging by setting:
```typescript
// In browser console
localStorage.setItem('debug_auth', 'true');
```

## Performance Considerations

### Optimization Features
- **Token Caching**: Tokens cached in memory for fast access
- **Request Deduplication**: Prevents duplicate refresh requests
- **Lazy Loading**: AuthService initialized only when needed
- **Efficient Storage**: Minimal localStorage usage

### Memory Management
- **Cleanup**: Automatic cleanup of expired tokens
- **Event Listeners**: Proper cleanup of event listeners
- **Timer Management**: Automatic cleanup of refresh timers

## Future Enhancements

### Planned Features
1. **Biometric Authentication**: Fingerprint/Face ID support
2. **Multi-Factor Authentication**: SMS/Email verification
3. **Session Management**: Multiple device session handling
4. **Token Encryption**: Enhanced security for stored tokens

### Monitoring
1. **Authentication Analytics**: Track login success/failure rates
2. **Performance Metrics**: Monitor API response times
3. **Security Alerts**: Detect suspicious authentication patterns

## Support

For issues or questions about the authentication system:

1. **Check Logs**: Browser console and network tab
2. **Test Script**: Run the authentication flow test
3. **Documentation**: Review this document and code comments
4. **Debug Mode**: Enable detailed logging for troubleshooting

---

*Last Updated: September 27, 2025*
*Version: 1.0.0*
