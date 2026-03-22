import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Wifi, WifiOff, Shield, BarChart3, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface EnhancedQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus?: any;
  onStatusUpdate?: (newStatus: any) => void;
}

interface EnhancedStatus {
  currentStatus: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
  message: string;
  timesheets: any[];
  analytics: any;
  offlineQueue: any;
  biometrics: any[];
  features: {
    offline: boolean;
    analytics: boolean;
    biometric: boolean;
    batch: boolean;
  };
}

const EnhancedQRCodeModal: React.FC<EnhancedQRCodeModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  onStatusUpdate
}) => {
  const [enhancedStatus, setEnhancedStatus] = useState<EnhancedStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<'checkin' | 'checkout'>('checkin');
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face-id' | 'voice'>('fingerprint');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [customOptions, setCustomOptions] = useState({
    primaryColor: '#1f2937',
    backgroundColor: '#ffffff',
    width: 300,
    includeBiometric: false,
    includeAnalytics: true
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check online/offline status
  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    handleOnlineStatus();

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Fetch enhanced status
  const fetchEnhancedStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch('/api/qr/enhanced/enhanced-current-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEnhancedStatus(data.data);
        setOfflineQueue(data.data.offlineQueue.items || []);
      }
    } catch (error) {
      console.error('Error fetching enhanced status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate enhanced QR code
  const generateEnhancedQR = async () => {
    try {
      setIsGenerating(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      const response = await fetch('/api/qr/enhanced/generate-enhanced', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: selectedType,
          options: {
            primaryColor: customOptions.primaryColor,
            backgroundColor: customOptions.backgroundColor,
            width: customOptions.width,
            metadata: {
              includeBiometric: customOptions.includeBiometric,
              includeAnalytics: customOptions.includeAnalytics,
              timestamp: new Date().toISOString()
            }
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.data.qrCode);
      }
    } catch (error) {
      console.error('Error generating enhanced QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Process batch check-in
  const processBatchCheckIn = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      const response = await fetch('/api/qr/enhanced/batch-checkin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${screen.width}x${screen.height}`,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
          },
          options: {
            method: 'batch',
            includeAnalytics: true
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Batch check-in completed: ${data.data.data.successful} successful, ${data.data.data.failed} failed`);
        fetchEnhancedStatus();
      }
    } catch (error) {
      console.error('Error processing batch check-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Register biometric
  const registerBiometric = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      // Simulate biometric hash (in real implementation, this would come from device)
      const biometricHash = `biometric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/qr/enhanced/register-biometric', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          biometricType: biometricType,
          biometricHash: biometricHash,
          deviceId: `device_${navigator.userAgent.replace(/\s+/g, '_')}`,
          securityLevel: 'high'
        })
      });

      if (response.ok) {
        alert('Biometric verification registered successfully!');
        fetchEnhancedStatus();
      }
    } catch (error) {
      console.error('Error registering biometric:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Process offline queue
  const processOfflineQueue = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      const queueIds = offlineQueue.map(item => item._id);
      
      const response = await fetch('/api/qr/enhanced/process-offline-queue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queueIds: queueIds
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Offline queue processed: ${data.data.data.successful} successful, ${data.data.data.failed} failed`);
        fetchEnhancedStatus();
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEnhancedStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-foreground rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-muted-foreground">Enhanced QR Code System</h2>
              <p className="text-sm text-muted-foreground">Advanced attendance with offline support</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="p-4 bg-muted/10 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isOffline ? (
                  <>
                    <WifiOff className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Offline Mode</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary">Online</span>
                  </>
                )}
              </div>
              
              {enhancedStatus?.features.biometric && (
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary">Biometric Enabled</span>
                </div>
              )}
              
              {offlineQueue.length > 0 && (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-accent-foreground" />
                  <span className="text-sm text-accent-foreground">{offlineQueue.length} Pending</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center space-x-1 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </button>
              
              <button
                onClick={() => setShowBiometric(!showBiometric)}
                className="flex items-center space-x-1 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span>Biometric</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Current Status */}
          {enhancedStatus && (
            <div className="mb-6 p-4 bg-muted/10 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-muted-foreground">Current Status</h3>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {enhancedStatus.currentStatus.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">Status</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {enhancedStatus.analytics?.totalActions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Actions</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {enhancedStatus.analytics?.successfulActions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
              
              <div className="mt-3 text-center">
                <span className="text-sm text-muted-foreground">{enhancedStatus.message}</span>
              </div>
            </div>
          )}

          {/* QR Code Generation */}
          <div className="mb-6">
            <h3 className="font-semibold text-muted-foreground mb-4">Generate Enhanced QR Code</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code Options */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    QR Code Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as 'checkin' | 'checkout')}
                    className="w-full p-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="checkin">Check In</option>
                    <option value="checkout">Check Out</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={customOptions.primaryColor}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-full h-10 border border-border/40 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={customOptions.backgroundColor}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-full h-10 border border-border/40 rounded-lg"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeBiometric"
                    checked={customOptions.includeBiometric}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, includeBiometric: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="includeBiometric" className="text-sm text-muted-foreground">
                    Include Biometric Verification
                  </label>
                </div>
                
                <button
                  onClick={generateEnhancedQR}
                  disabled={isGenerating}
                  className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? 'Generating...' : 'Generate Enhanced QR Code'}
                </button>
              </div>
              
              {/* QR Code Display */}
              <div className="flex items-center justify-center">
                {qrCode ? (
                  <div className="text-center">
                    <img src={qrCode} alt="Enhanced QR Code" className="mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Enhanced QR Code Generated</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Smartphone className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p>Generate QR Code to display</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Offline Queue */}
          {offlineQueue.length > 0 && (
            <div className="mb-6 p-4 bg-accent/10 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-accent-foreground">Offline Queue</h3>
                <span className="text-sm text-accent-foreground">{offlineQueue.length} items pending</span>
              </div>
              
              <div className="space-y-2 mb-3">
                {offlineQueue.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-accent-foreground">{item.action} - {new Date(item.timestamp).toLocaleString()}</span>
                    <span className="text-accent-foreground">Priority: {item.priority}</span>
                  </div>
                ))}
                {offlineQueue.length > 3 && (
                  <div className="text-sm text-accent-foreground">
                    ... and {offlineQueue.length - 3} more items
                  </div>
                )}
              </div>
              
              <button
                onClick={processOfflineQueue}
                disabled={isLoading}
                className="w-full bg-accent text-primary-foreground py-2 px-4 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Processing...' : 'Process Offline Queue'}
              </button>
            </div>
          )}

          {/* Analytics Panel */}
          {showAnalytics && enhancedStatus?.analytics && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <h3 className="font-semibold text-primary mb-3">Analytics Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {enhancedStatus.analytics.totalActions}
                  </div>
                  <div className="text-sm text-primary">Total Actions</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {enhancedStatus.analytics.successfulActions}
                  </div>
                  <div className="text-sm text-primary">Successful</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-destructive">
                    {enhancedStatus.analytics.failedActions}
                  </div>
                  <div className="text-sm text-destructive">Failed</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-secondary-foreground">
                    {Math.round(enhancedStatus.analytics.averageProcessingTime || 0)}ms
                  </div>
                  <div className="text-sm text-secondary-foreground">Avg. Time</div>
                </div>
              </div>
            </div>
          )}

          {/* Biometric Panel */}
          {showBiometric && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <h3 className="font-semibold text-primary mb-3">Biometric Verification</h3>
              
              {enhancedStatus?.biometrics && enhancedStatus.biometrics.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {enhancedStatus.biometrics.map((bio, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-primary capitalize">{bio.type.replace('-', ' ')}</span>
                      <span className="text-primary">Level: {bio.securityLevel}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-primary mb-3">No biometric verification registered</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Biometric Type
                      </label>
                      <select
                        value={biometricType}
                        onChange={(e) => setBiometricType(e.target.value as any)}
                        className="w-full p-2 border border-primary/40 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="fingerprint">Fingerprint</option>
                        <option value="face-id">Face ID</option>
                        <option value="voice">Voice Recognition</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={registerBiometric}
                      disabled={isLoading}
                      className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Registering...' : 'Register Biometric'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batch Operations */}
          <div className="mb-6 p-4 bg-secondary/10 border border-secondary/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-secondary-foreground">Batch Operations</h3>
              <button
                onClick={() => setBatchMode(!batchMode)}
                className="flex items-center space-x-1 px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-lg text-sm hover:bg-secondary/30 transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>{batchMode ? 'Exit Batch' : 'Batch Mode'}</span>
              </button>
            </div>
            
            {batchMode && (
              <div className="space-y-3">
                <p className="text-sm text-secondary-foreground">
                  Select multiple users for batch check-in operations
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {users.map((user) => (
                    <label key={user._id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user._id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-secondary-foreground">{user.firstName} {user.lastName}</span>
                    </label>
                  ))}
                </div>
                
                <button
                  onClick={processBatchCheckIn}
                  disabled={isLoading || selectedUsers.length === 0}
                  className="w-full bg-secondary text-primary-foreground py-2 px-4 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Processing...' : `Batch Check-in (${selectedUsers.length} users)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedQRCodeModal;
