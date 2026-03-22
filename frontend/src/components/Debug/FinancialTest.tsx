import React, { useState } from 'react';
import { testAdminLogin, testFinancialEndpoints } from '../../utils/testAuth';

const FinancialTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      const result = await testAdminLogin();
      setResults({ login: result });
    } catch (error) {
      setResults({ login: { success: false, error: (error as Error).message } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestFinancial = async () => {
    setIsLoading(true);
    try {
      const result = await testFinancialEndpoints();
      setResults(prev => ({ ...prev, financial: result }));
    } catch (error) {
      setResults((prev: any) => ({ ...prev, financial: { success: false, error: (error as Error).message } }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-card p-4 rounded-lg shadow-lg border max-w-md z-50">
      <h3 className="text-sm font-semibold mb-2 text-foreground">
        🔧 Financial Endpoints Test
      </h3>
      
      <div className="space-y-2">
        <button
          onClick={handleTestLogin}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Admin Login'}
        </button>
        
        <button
          onClick={handleTestFinancial}
          disabled={isLoading}
          className="w-full px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Financial Endpoints'}
        </button>
      </div>

      {results && (
        <div className="mt-3 text-xs">
          <div className="space-y-1">
            {results.login && (
              <div className={`p-2 rounded ${results.login.success ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                <strong>Login:</strong> {results.login.success ? '✅ Success' : `❌ ${results.login.error}`}
              </div>
            )}
            {results.financial && (
              <div className={`p-2 rounded ${results.financial.success ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                <strong>Financial:</strong> {results.financial.success ? '✅ Success' : `❌ ${results.financial.error}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialTest; 