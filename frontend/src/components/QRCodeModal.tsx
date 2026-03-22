import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, QrCodeIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';
import { getAuthToken } from '../utils/authToken';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus?: any; // Add currentStatus prop
}

interface QRCodeData {
  hash: string;
  qrCodeDataUrl: string;
  registrationUrl?: string; // Added for new URL-based system
  verificationUrl?: string; // Added for verification URL display
  expiresAt?: string;
  qrData?: string;
}

interface AttendanceStatus {
  status: 'clocked_in' | 'clocked_out' | 'not_clocked_in' | 'overtime_active' | 'overtime_completed' | 'checked_in' | 'checked_out' | 'present' | 'active' | 'absent' | 'should_be_absent';
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  isOvertimeTime?: boolean;
  currentTime?: string;
  shouldBeAbsent?: boolean;
  wasEarlyCheckOut?: boolean;
  overlayMessage?: string;
  overtimeStartTime?: string;
  overtimeEndTime?: string;
  timeStatus?: string;
  message?: string;
  duration?: string;
  isOvertime?: boolean;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, currentStatus: propCurrentStatus }) => {
  const { user } = useAuth();
  const { attendanceStatus, isLoading: statusLoading } = useAttendanceStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [hashType, setHashType] = useState<'qr-checkin' | 'qr-checkout' | 'staff-registration'>('qr-checkin');
  const [location, setLocation] = useState('');
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusUpdateCount, setStatusUpdateCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Use attendance status from hook, then prop currentStatus, then local state
  const effectiveCurrentStatus = attendanceStatus ? {
    status: attendanceStatus.status,
    canCheckIn: attendanceStatus.canCheckIn,
    canCheckOut: attendanceStatus.canCheckOut, // Use backend's logic for checkout availability
    isOvertime: attendanceStatus.isOvertimeActive,
    isOvertimeTime: attendanceStatus.isOvertimeActive,
    checkInTime: attendanceStatus.lastActivity,
    checkOutTime: attendanceStatus.overtimeTimesheet?.clockOutTime
  } : (propCurrentStatus || currentStatus);
  

  // Restore device registration from localStorage when modal opens
  useEffect(() => {
    const restoreRegistration = async () => {
      if (isOpen && user) {
        const deviceRegistered = localStorage.getItem('deviceRegistered');
        const staffUserId = localStorage.getItem('staffUserId');
        const staffHash = localStorage.getItem('staffHash');
        
        // If device is registered for this user, set isRegistered to true
        const userId = user._id || user.id;
        if (deviceRegistered === 'true' && staffUserId === userId && staffHash) {
          setIsRegistered(true);
        } else {
          await restoreDeviceRegistrationFromMultipleSources();
        }
      }
    };
    
    restoreRegistration();
  }, [isOpen, user]);

  // Function to restore device registration from multiple storage sources
  const restoreDeviceRegistrationFromMultipleSources = async () => {
    const storageKeys = [
      'deviceRegistered',
      'staffUserId', 
      'staffHash',
      'clinic_deviceRegistered',
      'clinic_staffUserId',
      'clinic_staffHash'
    ];
    
    // Check localStorage (no-op, just ensures keys exist)
    for (const key of storageKeys) {
      localStorage.getItem(key);
    }
    
    // Check sessionStorage as backup — copy to localStorage for persistence
    for (const key of storageKeys) {
      const value = sessionStorage.getItem(key);
      if (value) localStorage.setItem(key, value);
    }
    
    // Check if we have all required values
    const deviceRegistered = localStorage.getItem('deviceRegistered') || localStorage.getItem('clinic_deviceRegistered');
    const staffUserId = localStorage.getItem('staffUserId') || localStorage.getItem('clinic_staffUserId');
    const staffHash = localStorage.getItem('staffHash') || localStorage.getItem('clinic_staffHash');
    const userId = user?._id || user?.id;
    
    if (deviceRegistered === 'true' && staffUserId === userId && staffHash) {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (token) {
          const response = await fetch(`/api/qr/my-registration-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              if (data.data.hash && data.data.isRegistered) {
                const realHash = data.data.hash;
                localStorage.setItem('staffHash', realHash);
                localStorage.setItem('clinic_staffHash', realHash);
                sessionStorage.setItem('staffHash', realHash);
                setIsRegistered(true);
                localStorage.setItem('deviceRegistered', 'true');
                localStorage.setItem('staffUserId', staffUserId);
                localStorage.setItem('staffHash', realHash);
                localStorage.setItem('registrationTimestamp', new Date().toISOString());
                return;
              } else if (!data.data.isRegistered) {
                localStorage.removeItem('deviceRegistered');
                localStorage.removeItem('staffHash');
                localStorage.removeItem('clinic_deviceRegistered');
                localStorage.removeItem('clinic_staffHash');
                sessionStorage.removeItem('staffHash');
                setIsRegistered(false);
                return;
              }
            }
          }
        }
      } catch (error) {
        // silent — fallback below
      }
      
      setIsRegistered(true);
      
      // Consolidate all storage to standard keys
      localStorage.setItem('deviceRegistered', 'true');
      localStorage.setItem('staffUserId', staffUserId);
      localStorage.setItem('staffHash', staffHash);
      localStorage.setItem('registrationTimestamp', new Date().toISOString());
    }
  };

  // Enhanced device registration storage with multiple backup locations
  const storeDeviceRegistrationPermanently = (hash: string, userId: string) => {
    const timestamp = new Date().toISOString();
    
    // Clear any temporary hashes first
    const clearTemporaryHashes = () => {
      const keysToCheck = [
        'staffHash', 'clinic_staffHash', 'emergency_fix_',
        'temp_', 'clinic_temp_'
      ];
      
      // Clear localStorage
      Object.keys(localStorage).forEach(key => {
        if (keysToCheck.some(tempKey => key.includes(tempKey))) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (keysToCheck.some(tempKey => key.includes(tempKey))) {
              sessionStorage.removeItem(key);
        }
      });
    };
    
    // Clear temporary hashes before storing the real one
    clearTemporaryHashes();
    
    // Primary storage
    localStorage.setItem('deviceRegistered', 'true');
    localStorage.setItem('staffUserId', userId);
    localStorage.setItem('staffHash', hash);
    localStorage.setItem('registrationTimestamp', timestamp);
    
    // Backup storage with clinic prefix
    localStorage.setItem('clinic_deviceRegistered', 'true');
    localStorage.setItem('clinic_staffUserId', userId);
    localStorage.setItem('clinic_staffHash', hash);
    localStorage.setItem('clinic_registrationTimestamp', timestamp);
    
    // Session storage backup
    sessionStorage.setItem('deviceRegistered', 'true');
    sessionStorage.setItem('staffUserId', userId);
    sessionStorage.setItem('staffHash', hash);
    sessionStorage.setItem('registrationTimestamp', timestamp);
    
    // Store user info
    const userInfo = {
      firstName: user?.firstName || 'Unknown',
      lastName: user?.lastName || 'Unknown',
      username: (user as any)?.username || 'Unknown',
      email: user?.email || 'Unknown',
      role: user?.role || 'Unknown'
    };
    
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('clinic_userInfo', JSON.stringify(userInfo));
    
  };

  // Check if device is already registered — memoized so it runs once per render, not 7+ times
  const isDeviceRegistered = useMemo(() => {
    // PRIORITY: If API says we're registered, trust that
    if (isRegistered === true) return true;

    const deviceRegistered = localStorage.getItem('deviceRegistered');
    const staffUserId = localStorage.getItem('staffUserId');
    const staffHash = localStorage.getItem('staffHash');
    const localDeviceRegistered = localStorage.getItem('localDeviceRegistered');
    const userId = user?._id || user?.id;

    if (deviceRegistered === 'true' && staffUserId === userId && staffHash) {
      if (staffHash.startsWith('temp_') || staffHash.startsWith('emergency_fix_')) return false;
      if (staffHash.length === 64 && /^[a-f0-9]+$/i.test(staffHash)) return true;
      if (localDeviceRegistered === 'true') return true;
      return false;
    }

    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegistered, user?._id, user?.id]);

  // Check QR registration status
  const checkRegistrationStatus = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/qr/my-registration-status', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsRegistered(data.data?.isRegistered || false);
      } else {
        setIsRegistered(false);
      }
    } catch (error) {
      setIsRegistered(false);
    }
  };

  // Check current attendance status
  const checkCurrentStatus = async () => {
    if (!user) return;
    
    setIsCheckingStatus(true);
    try {
      // Use the self-service endpoint for current status
      const response = await fetch('/api/qr/current-status', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newStatus = data.data || {
          status: 'clocked_out',
          canCheckIn: true,
          canCheckOut: false,
          message: 'Default state'
        };
        setCurrentStatus(newStatus);
        setStatusUpdateCount(prev => prev + 1);
      } else {
        setCurrentStatus({
          status: 'clocked_out',
          canCheckIn: true,
          canCheckOut: false,
          message: 'Error checking status - defaulting to checked-out'
        });
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setCurrentStatus({
        status: 'clocked_out',
        canCheckIn: true,
        canCheckOut: false,
        message: 'Error checking status - defaulting to checked-out'
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Refresh status after QR code scanning
  const refreshStatusAfterScan = async () => {
    // Wait a moment for the backend to process the scan
    setTimeout(async () => {
      await checkCurrentStatus();
    }, 1000);
    
    // Also refresh again after a longer delay to ensure the status is updated
    setTimeout(async () => {
      await checkCurrentStatus();
    }, 3000);
  };

  // Check status when modal opens
  useEffect(() => {
    const initializeModal = async () => {
      if (isOpen && user) {
        await restoreDeviceRegistrationFromMultipleSources();
        
        // Then check other statuses
        await checkRegistrationStatus();
        await checkCurrentStatus();
        
        // Force refresh after a short delay to ensure we get the latest status
        setTimeout(async () => {
          await checkRegistrationStatus();
          await checkCurrentStatus();
        }, 500);
        // Additional refresh after 1 second
        setTimeout(async () => {
          await checkRegistrationStatus();
          await checkCurrentStatus();
        }, 1000);
      }
    };
    
    initializeModal();
  }, [isOpen, user]);

  // Listen for attendance status updates from QR scanning
  useEffect(() => {
    const handleAttendanceUpdate = (event) => {
      if (event.detail && event.detail.currentStatus) {
        setCurrentStatus(event.detail.currentStatus);
      } else if (event.detail && event.detail.action) {
        const isOvertime = event.detail.isOvertime || event.detail.isOvertimeTime || false;
        
        if (event.detail.action === 'checkout') {
          // After checkout, determine what's next
          if (isOvertime) {
            // Overtime checkout complete - disable both buttons for the day
            setCurrentStatus({
              status: 'overtime_completed',
              canCheckIn: false,
              canCheckOut: false,
              message: 'Overtime completed - all work done for today',
              isOvertimeTime: false,
              isOvertime: true
            });
          } else {
            // Regular checkout - enable overtime check-in if in overtime hours
            const now = new Date();
            const ethiopianTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
            const currentHour = ethiopianTime.getUTCHours();
            const isOvertimeHours = currentHour >= 17 || currentHour < 8 || (currentHour === 8 && ethiopianTime.getUTCMinutes() < 30);
            
            setCurrentStatus({
              status: 'clocked_out',
              canCheckIn: isOvertimeHours, // Only allow check-in if in overtime hours
              canCheckOut: false,
              message: isOvertimeHours ? 'Regular checkout complete - can check in for overtime' : 'Checkout complete',
              isOvertimeTime: isOvertimeHours,
              isOvertime: false
            });
          }
        } else if (event.detail.action === 'checkin') {
          // After check-in, enable check-out and disable check-in
          setCurrentStatus({
            status: isOvertime ? 'overtime_active' : 'clocked_in',
            canCheckIn: false, // Disable check-in after successful check-in
            canCheckOut: true, // Enable check-out
            message: isOvertime ? 'Overtime check-in successful - can check out' : 'Check-in successful - can check out',
            isOvertimeTime: isOvertime,
            isOvertime: isOvertime
          });
        }
      }
      
      // Refresh both registration status and current attendance status
      checkRegistrationStatus();
      checkCurrentStatus();
      
      // Force an additional refresh after a short delay to ensure we get the latest status
      setTimeout(() => {
        checkCurrentStatus();
      }, 1000);
    };

    // Listen for custom events from QR verification
    window.addEventListener('attendance-status-updated', handleAttendanceUpdate);
    
    return () => {
      window.removeEventListener('attendance-status-updated', handleAttendanceUpdate);
    };
  }, []);

  const generateQRCode = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      // Use Enhanced QR Code generation for all types
      const response = await fetch(`/api/qr/generate/${hashType}?location=${encodeURIComponent(location || 'Main Entrance')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Store hash in localStorage for all QR code types
        const hashValue = data.data.hash;
        if (hashValue) {
          localStorage.setItem('staffHash', hashValue);
          
          // For staff-registration, also store using the permanent storage function
          if (hashType === 'staff-registration') {
            storeDeviceRegistrationPermanently(hashValue, data.data.user?.id);
          }
        }
        
        // Set the QR code data directly from the response
        setQrCodeData(data.data);
        const isEnhanced = data.data.enhanced || data.data.version === '2.0';
        toast.success(`${hashType === 'qr-checkin' ? 'Check-in' : hashType === 'qr-checkout' ? 'Check-out' : 'Staff Registration'} ${isEnhanced ? 'Enhanced ' : ''}QR code generated successfully!`);
        
        // Refresh status after QR code generation to update button states
        refreshStatusAfterScan();
      } else {
        console.error('🔍 [QRCodeModal] QR Code generation failed:', {
          hashType,
          response: data,
          status: response.status
        });
        toast.error(data.message || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('🔍 [QRCodeModal] Error generating QR code:', {
        hashType,
        error: error,
        message: error.message,
        stack: error.stack
      });
      toast.error(`Failed to generate QR code: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // REMOVED: Local device registration function
  // Users must scan the staff registration QR code from admin to register their device

  const handleClose = () => {
    setQrCodeData(null);
    setHashType('qr-checkin');
    setLocation('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCodeIcon className="w-5 h-5 text-primary" />
            Staff Check-in/Check-out
          </DialogTitle>
          <DialogDescription>
            Generate QR codes for staff check-in and check-out operations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Staff Member</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-base font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {user?.role}
              </p>
            </CardContent>
          </Card>

          {/* QR Code Type Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Current Status Display - hidden during outside-working-hours (not overtime) to reduce noise */}
              {!isCheckingStatus && currentStatus && (currentStatus.isOvertimeTime || (currentStatus.timeStatus === 'regular-hours')) && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <div className="flex justify-between items-start mb-2">
                                      <p className="text-sm text-primary">
                    <span className="font-medium">Current Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      currentStatus.status === 'clocked_in' 
                        ? 'bg-primary/20 text-primary' 
                        : (currentStatus as any).status === 'should_be_absent'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-muted/20 text-muted-foreground'
                    }`}>
                      {currentStatus.status === 'clocked_in' ? 'Checked In' : 
                        (currentStatus as any).status === 'should_be_absent' ? 'Should Be Absent' :
                       'Checked Out'}
                    </span>
                  </p>
                    <Button
                      onClick={checkCurrentStatus}
                      disabled={isCheckingStatus}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      {isCheckingStatus ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                  {currentStatus.message && (
                    <p className={`text-xs ${
                      (currentStatus as any).status === 'should_be_absent' 
                        ? 'text-destructive font-semibold' 
                        : 'text-primary'
                    }`}>
                      {currentStatus.message}
                    </p>
                  )}

                  {currentStatus.checkInTime && (
                    <p className="text-xs text-primary">
                      Check-in: {new Date(currentStatus.checkInTime).toLocaleTimeString()}
                      {currentStatus.duration && ` (${currentStatus.duration})`}
                    </p>
                  )}
                  {currentStatus.checkOutTime && (
                    <p className="text-xs text-primary">
                      Check-out: {new Date(currentStatus.checkOutTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
              
              {/* QR Registration Warning - show only during regular or overtime hours, not midday off-hours */}
              {isRegistered === false && !isDeviceRegistered && (currentStatus?.timeStatus === 'regular-hours' || currentStatus?.isOvertimeTime) && (
                <div className="col-span-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    <p className="text-sm text-destructive font-medium">
                      QR Code Registration Required
                    </p>
                  </div>
                  <p className="text-xs text-destructive mt-1">
                    You must register your device with a QR code before you can check in/out. 
                    Please contact an administrator to get your QR code.
                  </p>
                </div>
              )}

              {/* Device Already Registered Info */}
              {isDeviceRegistered && (
                <div className="col-span-2 p-3 bg-primary/10 border border-primary/30 rounded-lg mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <p className="text-sm text-primary font-medium">
                      ✅ Device Already Registered
                    </p>
                  </div>
                  <p className="text-xs text-primary mt-1">
                    Your device is registered and ready for check-in/check-out. You can generate QR codes for attendance.
                  </p>
                </div>
              )}

              {/* Manual Registration Restore - hide during midday off-hours */}
              {!isDeviceRegistered && (currentStatus?.timeStatus === 'regular-hours' || currentStatus?.isOvertimeTime) && (
                <div className="col-span-2 p-3 bg-accent/10 border border-yellow-200 rounded-lg mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <p className="text-sm text-accent-foreground font-medium">
                        Device Registration Issue
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          const deviceRegistered = localStorage.getItem('deviceRegistered');
                          const staffUserId = localStorage.getItem('staffUserId');
                          const staffHash = localStorage.getItem('staffHash');
                          const userId = user?._id || user?.id;
                          
                          if (deviceRegistered === 'true' && staffUserId === userId && staffHash) {
                            setIsRegistered(true);
                            toast.success('Device registration restored from localStorage!');
                          } else {
                            toast.error('No valid device registration found in localStorage');
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        Restore Local
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            // Check backend for existing registrations using self-service endpoint
                            const response = await fetch('/api/qr/my-registration-status', {
                              headers: {
                                'Authorization': `Bearer ${getAuthToken()}`
                              }
                            });
                            
                            if (response.ok) {
                              const data = await response.json();
                              
                              if (data.data?.isRegistered) {
                                // Backend has registration, but we can't generate new QR codes for device registration
                                // (that requires admin access). Instead, we'll try to restore from localStorage
                                toast.success('Found registration in backend! Attempting to restore from localStorage...');
                                
                                // Try to restore from localStorage first
                                const deviceRegistered = localStorage.getItem('deviceRegistered');
                                const staffUserId = localStorage.getItem('staffUserId');
                                const staffHash = localStorage.getItem('staffHash');
                                const userId = user?._id || user?.id;
                                
                                if (deviceRegistered === 'true' && staffUserId === userId && staffHash) {
                                  setIsRegistered(true);
                                  toast.success('Device registration restored from localStorage!');
                                } else {
                                  // Try to restore from backup storage
                                  const clinicDeviceRegistered = localStorage.getItem('clinic_deviceRegistered');
                                  const clinicStaffUserId = localStorage.getItem('clinic_staffUserId');
                                  const clinicStaffHash = localStorage.getItem('clinic_staffHash');
                                  
                                  if (clinicDeviceRegistered === 'true' && clinicStaffUserId === userId && clinicStaffHash) {
                                    // Copy from backup to primary storage
                                    localStorage.setItem('deviceRegistered', clinicDeviceRegistered);
                                    localStorage.setItem('staffUserId', clinicStaffUserId);
                                    localStorage.setItem('staffHash', clinicStaffHash);
                                    
                                    setIsRegistered(true);
                                    toast.success('Device registration restored from backup storage!');
                                  } else {
                                    toast.error('Registration found in backend but not in localStorage. Please contact an administrator to get a new QR code.');
                                  }
                                }
                              } else {
                                toast.error('No registration found in backend. You need to register your device first.');
                              }
                            }
                          } catch (error) {
                            console.error('Error checking backend registration:', error);
                            toast.error('Failed to check backend registration');
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        Check Backend
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-accent-foreground mt-1">
                    If you've previously registered this device, try restoring the registration. Otherwise, click "Register Device Locally" below to get started.
                  </p>
                  
                  {/* Debug Info */}
                  <details className="mt-2">
                    <summary className="text-xs text-accent-foreground cursor-pointer font-medium">
                      Debug: Show localStorage contents
                    </summary>
                    <div className="mt-2 p-2 bg-accent/20 rounded text-xs font-mono">
                      <div>deviceRegistered: {localStorage.getItem('deviceRegistered') || 'null'}</div>
                      <div>staffUserId: {localStorage.getItem('staffUserId') || 'null'}</div>
                      <div>staffHash: {localStorage.getItem('staffHash') ? localStorage.getItem('staffHash')?.substring(0, 20) + '...' : 'null'}</div>
                      <div>currentUserId: {user?._id || user?.id || 'null'}</div>
                      <div>match: {localStorage.getItem('staffUserId') === (user?._id || user?.id) ? '✅' : '❌'}</div>
                      <div>localDeviceRegistered: {localStorage.getItem('localDeviceRegistered') || 'null'}</div>
                    </div>
                    
                    {/* Registration Instructions */}
                    <div className="mt-3 p-2 bg-primary/10 rounded text-xs">
                      <p className="font-medium text-primary mb-1">📋 To Register Your Device:</p>
                      <ol className="text-primary space-y-1 list-decimal list-inside">
                        <li>Contact your administrator</li>
                        <li>Request your staff registration QR code</li>
                        <li>Scan the QR code on this device</li>
                        <li>Then you can use check-in/check-out features</li>
                      </ol>
                    </div>
                    
                    {/* Manual Backup/Restore Controls */}
                    <div className="mt-3 space-y-2">
                      
                      <Button
                        onClick={() => {
                          const registrationData = {
                            deviceRegistered: localStorage.getItem('deviceRegistered'),
                            staffUserId: localStorage.getItem('staffUserId'),
                            staffHash: localStorage.getItem('staffHash'),
                            registrationTimestamp: localStorage.getItem('registrationTimestamp'),
                            userInfo: localStorage.getItem('userInfo'),
                            currentUserId: user?._id || user?.id
                          };
                          
                          // Create a downloadable backup file
                          const dataStr = JSON.stringify(registrationData, null, 2);
                          const dataBlob = new Blob([dataStr], {type: 'application/json'});
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `device-registration-backup-${new Date().toISOString().split('T')[0]}.json`;
                          link.click();
                          URL.revokeObjectURL(url);
                          
                          toast.success('Device registration backup downloaded!');
                        }}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs w-full"
                      >
                        📥 Download Backup
                      </Button>
                      
                      <Button
                        onClick={() => {
                          // Create file input for restore
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.json';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                try {
                                  const data = JSON.parse(e.target?.result as string);
                                  
                                  // Restore from backup
                                  if (data.deviceRegistered && data.staffUserId && data.staffHash) {
                                    localStorage.setItem('deviceRegistered', data.deviceRegistered);
                                    localStorage.setItem('staffUserId', data.staffUserId);
                                    localStorage.setItem('staffHash', data.staffHash);
                                    localStorage.setItem('registrationTimestamp', data.registrationTimestamp || new Date().toISOString());
                                    if (data.userInfo) {
                                      localStorage.setItem('userInfo', data.userInfo);
                                    }
                                    
                                    // Also store in backup locations
                                    localStorage.setItem('clinic_deviceRegistered', data.deviceRegistered);
                                    localStorage.setItem('clinic_staffUserId', data.staffUserId);
                                    localStorage.setItem('clinic_staffHash', data.staffHash);
                                    
                                    toast.success('Device registration restored from backup!');
                                    
                                    // Refresh the modal
                                    setTimeout(() => {
                                      window.location.reload();
                                    }, 1000);
                                  } else {
                                    toast.error('Invalid backup file format');
                                  }
                                } catch (error) {
                                  toast.error('Failed to parse backup file');
                                }
                              };
                              reader.readAsText(file);
                            }
                          };
                          input.click();
                        }}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs w-full"
                      >
                        📤 Restore from Backup
                      </Button>
                    </div>
                  </details>
                </div>
              )}

              {/* Overtime Information (only during overtime window) */}
              {currentStatus?.status === 'clocked_out' && currentStatus?.isOvertimeTime && (
                <div className="col-span-2 p-3 bg-primary/10 border border-primary/30 rounded-lg mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <p className="text-sm text-primary font-medium">
                      Overtime Information
                    </p>
                  </div>
                  <div className="text-xs text-primary space-y-1">
                    <div><strong>Overtime Hours:</strong> {currentStatus.overtimeStartTime || '5:00 PM'} - {currentStatus.overtimeEndTime || '1:30 AM'}</div>
                    {currentStatus.wasEarlyCheckOut && (
                      <div className="text-accent-foreground font-medium">
                        ⚠️ You checked out early from regular hours. Overtime check-in is available.
                      </div>
                    )}
                    {currentStatus.canCheckIn ? (
                      <div className="text-primary font-medium">
                        ✅ Overtime check-in is currently available
                      </div>
                    ) : (
                      <div className="text-destructive font-medium">
                        ❌ Overtime check-in not available (already checked in or completed)
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  key={`checkin-${effectiveCurrentStatus?.isOvertimeTime}-${effectiveCurrentStatus?.canCheckIn}-${statusUpdateCount}`}
                  onClick={() => {
                    setHashType('qr-checkin');
                    generateQRCode();
                  }}
                  disabled={!isDeviceRegistered}
                  variant={hashType === 'qr-checkin' ? 'default' : 'outline'}
                  className={`h-auto p-3 flex flex-col items-center justify-center space-y-1 ${
                    hashType === 'qr-checkin' && isDeviceRegistered &&
                    effectiveCurrentStatus?.status !== 'clocked_in' &&
                    effectiveCurrentStatus?.status !== 'checked_in' &&
                    effectiveCurrentStatus?.status !== 'present' &&
                    effectiveCurrentStatus?.status !== 'active'
                      ? 'bg-primary hover:bg-primary text-primary-foreground'
                      : ''
                  }`}
                >
                  <ArrowDownIcon className="w-5 h-5" />
                  <span className="font-medium text-sm">
                    {effectiveCurrentStatus?.status === 'overtime_active' ? 'Already Checked In for Overtime' :
                     effectiveCurrentStatus?.status === 'overtime_completed' ? 'Overtime Completed' :
                     effectiveCurrentStatus?.status === 'clocked_in' || effectiveCurrentStatus?.status === 'checked_in' || effectiveCurrentStatus?.status === 'present' || effectiveCurrentStatus?.status === 'active' ? 'Already Checked In' :
                     effectiveCurrentStatus?.status === 'clocked_out' || effectiveCurrentStatus?.status === 'checked_out' ? 'Check In for Overtime' :
                     'Check In'}
                  </span>
                  {effectiveCurrentStatus?.status === 'overtime_active' && (
                    <span className="text-xs opacity-75">
                      (Ready to Check Out)
                    </span>
                  )}
                  {effectiveCurrentStatus?.status === 'overtime_completed' && (
                    <span className="text-xs opacity-75">
                      (Overtime Completed)
                    </span>
                  )}
                  {(effectiveCurrentStatus?.status === 'clocked_in' || effectiveCurrentStatus?.status === 'checked_in' || effectiveCurrentStatus?.status === 'present' || effectiveCurrentStatus?.status === 'active') && (
                    <span className="text-xs opacity-75">
                      (Already In)
                    </span>
                  )}
                  {effectiveCurrentStatus?.isOvertimeTime && effectiveCurrentStatus?.canCheckIn === false && effectiveCurrentStatus?.status !== 'clocked_in' && effectiveCurrentStatus?.status !== 'checked_in' && effectiveCurrentStatus?.status !== 'overtime_active' && effectiveCurrentStatus?.status !== 'overtime_completed' && (
                    <span className="text-xs opacity-75">
                      (Overtime Not Available)
                    </span>
                  )}
                  {effectiveCurrentStatus?.wasEarlyCheckOut && effectiveCurrentStatus?.canCheckIn && (
                    <span className="text-xs text-primary font-medium">(Early Check-out)</span>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setHashType('qr-checkout');
                    generateQRCode();
                  }}
                  disabled={!isDeviceRegistered || !effectiveCurrentStatus?.canCheckOut}
                  variant={hashType === 'qr-checkout' ? 'default' : 'outline'}
                  className={`h-auto p-3 flex flex-col items-center justify-center space-y-1 ${
                    !effectiveCurrentStatus?.canCheckOut
                      ? 'opacity-50 cursor-not-allowed' 
                      : hashType === 'qr-checkout' && isDeviceRegistered && effectiveCurrentStatus?.canCheckOut
                        ? 'bg-destructive hover:bg-destructive text-primary-foreground'
                        : ''
                  }`}
                >
                  <ArrowUpIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {effectiveCurrentStatus?.status === 'overtime_active' ? 'Check Out (Overtime)' : 'Check Out'}
                  </span>
                  {effectiveCurrentStatus?.status === 'overtime_completed' && (
                    <span className="text-xs opacity-75">
                      (Overtime Completed)
                    </span>
                  )}
                  {effectiveCurrentStatus?.status === 'absent' && (
                    <span className="text-xs opacity-75">
                      (Not Checked In)
                    </span>
                  )}
                  {effectiveCurrentStatus?.canCheckOut === false && effectiveCurrentStatus?.status !== 'overtime_active' && (
                    <span className="text-xs opacity-75">
                      {effectiveCurrentStatus?.wasEarlyCheckOut ? '(Early Check-out)' : '(Already Out)'}
                    </span>
                  )}
                  {effectiveCurrentStatus?.wasEarlyCheckOut && (
                    <span className="text-xs text-accent-foreground font-medium">(Disabled)</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Location Input */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Location (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm">Location</Label>
                <Input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Main Entrance, Ward A, Lab"
                  className="h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={generateQRCode}
            disabled={isLoading || !isDeviceRegistered}
            className="w-full h-10 text-base"
            size="default"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : !isDeviceRegistered ? (
              'Device Not Registered'
            ) : (
              <>
                <QrCodeIcon className="w-5 h-5 mr-2" />
                Generate {hashType === 'qr-checkin' ? 
                  (currentStatus?.isOvertimeTime ? 'Check-in for Overtime' : 'Check-in') : 
                  (currentStatus?.isOvertime && currentStatus?.status === 'clocked_in' ? 'Check-out (Overtime)' : 'Check-out')} QR Code
              </>
            )}
          </Button>

          {/* QR Code Display */}
          {qrCodeData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-center">
                  {hashType === 'qr-checkin' ? 
                    (currentStatus?.isOvertimeTime ? 'Check-in for Overtime' : 'Check-in') : 
                    (currentStatus?.isOvertime && currentStatus?.status === 'clocked_in' ? 'Check-out (Overtime)' : 'Check-out')} QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column - QR Code */}
                  <div className="text-center">
                    <div className="mb-3">
                      <img
                        src={qrCodeData.qrCodeDataUrl}
                        alt="QR Code"
                        className="mx-auto w-72 h-72 border-4 border-border/40 rounded-lg shadow-lg bg-primary-foreground"
                        style={{
                          imageRendering: 'crisp-edges'
                        }}
                      />
                    </div>
                    
                    {/* Mobile Scanning Instructions */}
                    <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                      <div className="text-sm text-primary">
                        <div className="font-semibold mb-2">📱 QR Code Scanning Troubleshooting:</div>
                        <div className="text-xs space-y-1 mb-3">
                          <div><strong>Scanning Tips:</strong></div>
                          <ul className="space-y-1 ml-2">
                            <li>• Hold phone steady, 6-12 inches from QR code</li>
                            <li>• Ensure good lighting, avoid shadows/glare</li>
                            <li>• QR code should fill most of your camera view</li>
                            <li>• Try your phone's built-in camera app first</li>
                            <li>• Clean your camera lens if blurry</li>
                          </ul>
                        </div>
                        <div className="text-xs space-y-1">
                          <div><strong>Network Requirements:</strong></div>
                          <ul className="space-y-1 ml-2">
                            <li>• Your phone must be on the same WiFi network as this computer</li>
                            <li>• Mobile data won't work (URL uses local IP address)</li>
                            <li>• If scanning fails, use the "Copy URL" button above</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Details */}
                    <div className="space-y-1 text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium capitalize">
                          {hashType === 'qr-checkin' ? 'Check-in' : 'Check-out'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className="font-medium">
                          {qrCodeData.expiresAt ? new Date(qrCodeData.expiresAt).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hash:</span>
                        <span className="font-mono text-xs truncate max-w-32">
                          {qrCodeData.hash ? qrCodeData.hash.substring(0, 16) + '...' : 'Hash not available'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Instructions and Info */}
                  <div className="space-y-3">
                    {/* Manual URL Access */}
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <p className="text-sm text-primary mb-2 font-medium">
                        🔗 Can't scan? Use manual URL:
                      </p>
                      <div className="bg-primary-foreground p-2 rounded border text-xs text-primary break-all font-mono mb-2">
                        {qrCodeData.verificationUrl || qrCodeData.registrationUrl || qrCodeData.qrData}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const url = qrCodeData.verificationUrl || qrCodeData.registrationUrl || qrCodeData.qrData;
                            if (url) {
                              navigator.clipboard.writeText(url).then(() => {
                                toast.success('URL copied to clipboard!');
                              }).catch(() => {
                                toast.error('Failed to copy URL');
                              });
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs flex-1"
                        >
                          📋 Copy URL
                        </Button>
                        <Button
                          onClick={() => {
                            const url = qrCodeData.verificationUrl || qrCodeData.registrationUrl || qrCodeData.qrData;
                            if (url) {
                              window.open(url, '_blank');
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs flex-1"
                        >
                          🔗 Open URL
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Copy this URL and paste it into your phone's browser, or share it via text/email to access from your mobile device.
                      </p>
                    </div>

                    {/* Instructions */}
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <p className="text-sm text-primary mb-2 font-medium">
                        📱 <strong>How to register your device:</strong>
                      </p>
                      <ol className="text-sm text-primary space-y-1 list-decimal list-inside text-left">
                        <li><strong>Option 1:</strong> Scan this QR code with your phone camera</li>
                        <li><strong>Option 2:</strong> Copy the URL above and paste it in your phone's browser</li>
                        <li><strong>Option 3:</strong> Send yourself the URL via text/email and open it on your phone</li>
                        <li>Follow the on-screen instructions to register your device</li>
                        <li>Once registered, you can use QR codes for check-in/check-out</li>
                      </ol>
                    </div>

                    {/* Hash Storage Status */}
                    <div className="p-3 bg-accent/10 rounded-lg border border-yellow-200">
                      <p className="text-sm text-accent-foreground">
                        ✅ <strong>Hash stored in your browser</strong><br />
                        This hash will be used to verify your identity when scanning QR codes.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registration Help */}
          <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <p className="text-sm text-primary font-medium">
                📋 Need to Register?
              </p>
            </div>
            <p className="text-xs text-primary mb-2">
              To register your device, please contact your administrator to get your staff registration QR code. Once registered, you can use check-in/check-out features.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
