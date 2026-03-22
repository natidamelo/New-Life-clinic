import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEffectiveToken } from '../utils/auth';

const AuthTest: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [localStorageData, setLocalStorageData] = useState<any>({});

  useEffect(() => {
    // Get current token
    const currentToken = getEffectiveToken();
    setToken(currentToken);

    // Get localStorage data
    const authData = {
      'AUTH_TOKEN_KEY': localStorage.getItem('AUTH_TOKEN_KEY'),
      'authToken': localStorage.getItem('authToken'),
      'auth_token': localStorage.getItem('auth_token'),
      'jwt_token': localStorage.getItem('jwt_token'),
      'token': localStorage.getItem('token'),
      'clinic_auth_token': localStorage.getItem('clinic_auth_token'),
      'clinic_jwt_token': localStorage.getItem('clinic_jwt_token'),
      'user_data': localStorage.getItem('user_data'),
    };
    setLocalStorageData(authData);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Context State */}
        <div className="bg-primary-foreground p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Auth Context State</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'None'}</p>
          </div>
        </div>

        {/* Token Information */}
        <div className="bg-primary-foreground p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Token Information</h2>
          <div className="space-y-2">
            <p><strong>Current Token:</strong></p>
            <pre className="bg-muted/20 p-2 rounded text-sm overflow-x-auto">
              {token || 'No token found'}
            </pre>
          </div>
        </div>

        {/* LocalStorage Data */}
        <div className="bg-primary-foreground p-6 rounded-lg shadow md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">LocalStorage Data</h2>
          <pre className="bg-muted/20 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(localStorageData, null, 2)}
          </pre>
        </div>

        {/* Test Links */}
        <div className="bg-primary-foreground p-6 rounded-lg shadow md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Test Links</h2>
          <div className="space-y-2">
            <a 
              href="/app/ward/medications-backup" 
              className="block bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary"
            >
              Test Medications Backup Route
            </a>
            <a 
              href="/app/nurse/tasks" 
              className="block bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary"
            >
              Test Nurse Tasks Route
            </a>
            <button 
              onClick={() => window.location.reload()} 
              className="block bg-muted text-primary-foreground px-4 py-2 rounded hover:bg-muted"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthTest; 