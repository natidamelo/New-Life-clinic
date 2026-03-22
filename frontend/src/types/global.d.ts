interface Window {
  // API debugging utilities
  apiDebug?: {
    [key: string]: any;
    checkToken: () => { 
      tokensFound: boolean; 
      tokens: Record<string, string | null>; 
      authHeader: string | null;
    };
    setTestToken: () => string;
    quickLogin?: () => Promise<any>;
    checkServer: () => Promise<{ connected: boolean; baseUrl?: string; error?: any }>;
  };
  
  // Token utilities
  tokenUtils?: {
    setToken: (token: string) => void;
    getToken: () => string | null;
    clearToken: () => void;
    isAuthenticated: () => boolean;
    setDevelopmentToken: () => void;
  };
  
  // Dev helpers
  setTestTokenForDevelopment?: () => boolean;
  
  // Axios instance for global access
  axios?: any;
} 