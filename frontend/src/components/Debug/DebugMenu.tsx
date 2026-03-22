import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import TokenDebugger from './TokenDebugger';
import { toast } from 'react-toastify';
import { setToken, getToken, clearToken } from '../../utils/token';
import TestGrid from './TestGrid';

// Icons
const BugIcon = () => <span style={{ fontSize: '1.2rem' }}>🐛</span>;
const KeyIcon = () => <span style={{ fontSize: '1.2rem' }}>🔑</span>;
const ServerIcon = () => <span style={{ fontSize: '1.2rem' }}>🖥️</span>;
const CloseIcon = () => <span style={{ fontSize: '1.2rem' }}>✖️</span>;
const LogIcon = () => <span style={{ fontSize: '1.2rem' }}>📋</span>;
const RefreshIcon = () => <span style={{ fontSize: '1.2rem' }}>🔄</span>;

// Default test token for a doctor role
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzMzAxY2RlZmM3Nzc2YmY3NTM3YjMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzQ4NDMzNzUzLCJleHAiOjE3NDg1MjAxNTN9.z8NHPvQtbAizFpHfopevH9DCpQWrfpcoSJUhOuhBlAU';

const DebugMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [component, setComponent] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [serverStatus, setServerStatus] = useState<{connected: boolean, url?: string}>({connected: false});



  const checkAuth = () => {
    const token = getToken();
    setHasToken(!!token);
    
    if (token) {
      toast.success('Auth token found');
    } else {
      toast.warning('No auth token found');
    }
  };

  const applyTestToken = () => {
    setToken(TEST_TOKEN);
    toast.success('Test token applied. Refresh the page to see effects.');
    checkAuth();
  };

  const applyCustomToken = () => {
    if (!customToken) {
      toast.error('Please enter a token');
      return;
    }
    setToken(customToken);
    toast.success('Custom token applied. Refresh the page to see effects.');
    checkAuth();
  };

  const handleClearTokens = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    clearToken();
    toast('Auth tokens cleared');
    checkAuth();
  };

  const checkServer = async () => {
    try {
      if (window.apiDebug?.checkServer) {
        const result = await window.apiDebug.checkServer();
        setServerStatus(result);
        if (result.connected) {
          toast.success(`Connected to server at ${result.baseUrl}`);
        } else {
          toast.error('Could not connect to server');
        }
      } else {
        toast.error('API debug utilities not available');
      }
    } catch (error) {
      toast.error('Error checking server connection');
      console.error('Server check error:', error);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
    checkServer();
  }, []);

  const menuItems = [
    {
      name: 'Token Tools',
      icon: <KeyIcon />,
      component: 'token',
      description: 'Debug authentication token issues'
    },
    {
      name: 'Server Status',
      icon: <ServerIcon />,
      component: 'server',
      description: 'Check backend connection'
    },
    {
      name: 'Token Inspector',
      icon: <LogIcon />,
      component: 'tokenDebugger',
      description: 'Detailed token analysis'
    },
    {
      name: 'Test MUI Grid',
      icon: <RefreshIcon />,
      component: 'testGrid',
      description: 'Test fixed MUI Grid component'
    }
  ];

  const renderComponent = () => {
    switch (component) {
      case 'token':
        return (
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Authentication Tools</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Token Status:</span>
                <Badge variant={hasToken ? "default" : "destructive"}>
                  {hasToken ? 'Token Found' : 'No Token'}
                </Badge>
              </div>
              
              <Button 
                onClick={applyTestToken}
                className="w-full flex items-center gap-2"
              >
                <KeyIcon />
                Apply Test Token (Doctor)
              </Button>
              
              <div className="space-y-2">
                <Input
                  placeholder="Custom JWT Token"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                />
                <Button 
                  variant="outline"
                  onClick={applyCustomToken}
                  disabled={!customToken}
                  className="w-full"
                >
                  Apply Custom Token
                </Button>
              </div>
              
              <Button 
                variant="destructive"
                onClick={handleClearTokens}
                className="w-full"
              >
                Clear All Tokens
              </Button>
              
              <Button 
                variant="outline"
                onClick={checkAuth}
                className="w-full flex items-center gap-2"
              >
                <RefreshIcon />
                Check Auth Status
              </Button>
              
              <Separator />
              
              <p className="text-sm text-muted-foreground">
                After applying a token, you must refresh the page for it to take effect in all components.
              </p>
            </div>
          </div>
        );
      case 'server':
        return (
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Server Connection</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={serverStatus.connected ? "default" : "destructive"}>
                  {serverStatus.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              
              {serverStatus.url && (
                <p className="text-sm">
                  Server URL: {serverStatus.url}
                </p>
              )}
              
              <Button 
                onClick={checkServer}
                className="w-full flex items-center gap-2"
              >
                <RefreshIcon />
                Check Server Connection
              </Button>
              
              <Separator />
              
              <p className="text-sm text-muted-foreground">
                If the server is disconnected, check that your backend is running and accessible.
              </p>
            </div>
          </div>
        );
      case 'tokenDebugger':
        return <TokenDebugger />;
      case 'testGrid':
        return <TestGrid />;
      default:
        return (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Select a tool from the menu to begin debugging.
            </p>
          </div>
        );
    }
  };

  // Only show in development environments
  if (process.env.NODE_ENV !== 'development' && window.location.hostname !== 'localhost') {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Debug button */}
      <div className="fixed bottom-4 right-4 z-50">
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg flex items-center gap-2"
          >
            <BugIcon />
            Debug
          </Button>
        </SheetTrigger>
      </div>

      {/* Debug sheet */}
      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <SheetHeader className="px-4 py-3 bg-primary text-primary-foreground">
          <SheetTitle className="text-primary-foreground">Development Tools</SheetTitle>
        </SheetHeader>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-36 border-r bg-muted/30">
            <ScrollArea className="h-full pt-2">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setComponent(item.component)}
                  className={`w-full p-3 text-left text-xs hover:bg-accent hover:text-accent-foreground flex flex-col items-center gap-1 transition-colors ${
                    component === item.component ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-center leading-tight">{item.name}</span>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {renderComponent()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DebugMenu; 