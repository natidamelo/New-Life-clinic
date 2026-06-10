import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import systemSettingsService from '../services/systemSettingsService';
import apiService from '../services/apiService';
import QRCodeModal from './QRCodeModal';
import EnhancedQRCodeModal from './EnhancedQRCodeModal';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { Button } from './ui/button';
import { AlertCircle, Clock, RefreshCw, QrCode, Smartphone } from 'lucide-react';

interface AttendanceOverlayProps {
  children: React.ReactNode;
}

const AttendanceOverlay: React.FC<AttendanceOverlayProps> = ({ children }) => {
  const { user } = useAuth();
  const { isDarkMode } = useSafeTheme();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEnhancedQRModal, setShowEnhancedQRModal] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);
  
  // Check individual staff overlay setting
  const checkOverlaySetting = async () => {
    console.log('🔍 [AttendanceOverlay] Checking overlay setting for user:', user ? { id: user._id || user.id, role: user.role, name: `${user.firstName} ${user.lastName}` } : null);
    
    try {
      if (!user) {
        console.log('🔍 [AttendanceOverlay] No user, setting overlay enabled to false');
        setOverlayEnabled(false);
        return false;
      }

      // Check if user is admin (by role, email, or username)
      const isAdmin = user.role === 'admin' || 
                      (user.email && user.email.toLowerCase().includes('admin')) ||
                      (user.username && user.username.toLowerCase().includes('admin'));
      
      if (isAdmin) {
        console.log('🔍 [AttendanceOverlay] Admin user detected, setting overlay enabled to false');
        setOverlayEnabled(false);
        return false;
      }

      console.log('🔍 [AttendanceOverlay] Checking overlay setting...');
      
      const response = await apiService.get('/api/admin/my-overlay-setting');
      
      console.log('🔍 [AttendanceOverlay] Overlay setting response:', response.data);
      
      const data = response.data;
      console.log('🔍 [AttendanceOverlay] Overlay setting response data:', data);
      if (data.success) {
        // Check both possible response formats
        const enabled = data.overlayEnabled !== undefined ? data.overlayEnabled : data.data?.enabled;
        console.log('🔍 [AttendanceOverlay] Setting overlay enabled to:', enabled);
        setOverlayEnabled(enabled);
        return enabled;
      }
      
      console.log('🔍 [AttendanceOverlay] Defaulting overlay enabled to true');
      setOverlayEnabled(true);
      return true;
    } catch (error) {
      console.log('🔍 [AttendanceOverlay] Error checking overlay setting, defaulting to true:', error);
      setOverlayEnabled(true);
      return true;
    }
  };
  
  // Comprehensive status check
  const comprehensiveStatusCheck = async () => {
    console.log('🔍 [AttendanceOverlay] Starting comprehensive status check for user:', user ? { id: user._id || user.id, role: user.role } : null);
    
    try {
      if (!user) {
        console.log('🔍 [AttendanceOverlay] No user, setting checked in to false');
        setIsCheckedIn(false);
        return false;
      }
      
      // Check if user is admin (by role, email, or username)
      const isAdmin = user.role === 'admin' || 
                      (user.email && user.email.toLowerCase().includes('admin')) ||
                      (user.username && user.username.toLowerCase().includes('admin'));
      
      if (isAdmin) {
        console.log('🔍 [AttendanceOverlay] Admin user detected, setting checked in to true');
        setIsCheckedIn(true);
        return true;
      }
      
      const userId = user._id || user.id;
      
      if (!userId) {
        console.log('🔍 [AttendanceOverlay] No userId, setting checked in to false');
        setIsCheckedIn(false);
        return false;
      }

      console.log('🔍 [AttendanceOverlay] Trying QR status endpoint...');
      // Try the main QR status endpoint (userId passed as URL parameter)
      try {
        console.log('🔍 [AttendanceOverlay] Calling /api/qr/current-status/${userId}...');
        const response = await apiService.get(`/api/qr/current-status/${userId}`);
        
        const data = response.data;
        console.log('🔍 [AttendanceOverlay] QR status response:', data);
        if (data.success && data.data) {
          const status = data.data.status;
          const checkedIn = status === 'clocked_in' || status === 'checked-in' || status === 'active' || status === 'present';
          
          console.log('🔍 [AttendanceOverlay] Setting currentStatus to:', data.data);
          setCurrentStatus(data.data);
          
          if (checkedIn) {
            console.log('🔍 [AttendanceOverlay] User checked in via QR status, setting checked in to true');
            setIsCheckedIn(true);
            return true;
          } else if (status === 'clocked_out') {
            console.log('🔍 [AttendanceOverlay] User clocked out via QR status, setting checked in to false');
            setIsCheckedIn(false);
            return false;
          }
        }
      } catch (error) {
        console.log('🔍 [AttendanceOverlay] QR status endpoint failed:', error);
        // Continue to next method
      }

      console.log('🔍 [AttendanceOverlay] Trying attendance service endpoint...');
      // Try attendance service endpoint
      try {
        const attendanceResponse = await apiService.get('/api/attendance/my-status');
        
        const attendanceData = attendanceResponse.data;
        console.log('🔍 [AttendanceOverlay] Attendance service response:', attendanceData);
        
        // Check for various attendance statuses
        if (attendanceData.status === 'present' || 
            attendanceData.status === 'overtime_active' || 
            attendanceData.status === 'overtime_completed') {
          console.log('🔍 [AttendanceOverlay] User checked in via attendance service, setting checked in to true');
          setIsCheckedIn(true);
          setCurrentStatus({ 
            status: attendanceData.status, 
            source: 'attendance-service',
            isOvertimeActive: attendanceData.isOvertimeActive,
            isOvertimeCompleted: attendanceData.isOvertimeCompleted,
            overtimeTimesheet: attendanceData.overtimeTimesheet,
            canCheckIn: attendanceData.status !== 'overtime_active' && attendanceData.status !== 'overtime_completed'
          });
          return true;
        }
        
        // If user has overtime timesheet but is not active, they're still considered checked in
        if (attendanceData.overtimeTimesheet && attendanceData.overtimeTimesheet.hasClockIn) {
          console.log('🔍 [AttendanceOverlay] User has overtime timesheet with clock in, setting checked in to true');
          setIsCheckedIn(true);
          setCurrentStatus({ 
            status: 'overtime_inactive', 
            source: 'attendance-service',
            isOvertimeActive: false,
            isOvertimeCompleted: attendanceData.overtimeTimesheet.hasClockOut,
            overtimeTimesheet: attendanceData.overtimeTimesheet
          });
          return true;
        }
      } catch (error) {
        console.log('🔍 [AttendanceOverlay] Attendance service endpoint failed:', error);
        // Continue to next method
      }

      console.log('🔍 [AttendanceOverlay] Trying timesheet endpoint...');
      // Try timesheet endpoint
      try {
        const timesheetResponse = await apiService.get('/api/timesheets/today');
        
        const timesheetData = timesheetResponse.data;
        console.log('🔍 [AttendanceOverlay] Timesheet response:', timesheetData);
        
        if (timesheetData && timesheetData.clockIn && timesheetData.clockIn.time) {
          console.log('🔍 [AttendanceOverlay] User checked in via timesheet, setting checked in to true');
          setIsCheckedIn(true);
          setCurrentStatus({ 
            status: 'clocked_in', 
            source: 'timesheet',
            checkInTime: timesheetData.clockIn.time
          });
          return true;
        }
      } catch (error) {
        console.log('🔍 [AttendanceOverlay] Timesheet endpoint failed:', error);
        // Continue
      }

      console.log('🔍 [AttendanceOverlay] All endpoints failed or no check-in found, setting checked in to false');
      setIsCheckedIn(false);
      return false;
    } catch (error) {
      console.log('🔍 [AttendanceOverlay] Error in comprehensive status check:', error);
      setIsCheckedIn(false);
      return false;
    }
  };

  // Handle refresh status button click
  const handleRefreshStatus = async () => {
    setIsLoading(true);
    await checkOverlaySetting();
    await comprehensiveStatusCheck();
    setIsLoading(false);
  };
  
  // Refresh status when modal opens
  const handleOpenModal = async () => {
    console.log('🔍 [AttendanceOverlay] Opening modal, refreshing status...');
    await comprehensiveStatusCheck();
    setShowQRModal(true);
  };
  
  // Open Enhanced QR Modal
  const handleOpenEnhancedModal = async () => {
    console.log('🔍 [AttendanceOverlay] Opening Enhanced modal, refreshing status...');
    await comprehensiveStatusCheck();
    setShowEnhancedQRModal(true);
  };
  
  // Initial load
  useEffect(() => {
    const initialize = async () => {
      console.log('🔍 [AttendanceOverlay] Initializing for user:', user ? { id: user._id || user.id, role: user.role, name: `${user.firstName} ${user.lastName}` } : null);
      
      if (!user) {
        console.log('🔍 [AttendanceOverlay] No user, setting loading to false');
        setIsLoading(false);
        return;
      }
      
      // Check if user is admin (by role, email, or username)
      const isAdmin = user.role === 'admin' || 
                      (user.email && user.email.toLowerCase().includes('admin')) ||
                      (user.username && user.username.toLowerCase().includes('admin'));
      
      if (isAdmin) {
        console.log('🔍 [AttendanceOverlay] Admin user detected, setting loading to false');
        setIsLoading(false);
        return;
      }
      
      console.log('🔍 [AttendanceOverlay] Checking overlay setting...');
      const overlayEnabledForUser = await checkOverlaySetting();
      console.log('🔍 [AttendanceOverlay] Overlay setting result:', overlayEnabledForUser);
      
      if (!overlayEnabledForUser) {
        console.log('🔍 [AttendanceOverlay] Overlay disabled for user, setting checked in to true');
        setIsCheckedIn(true);
        setIsLoading(false);
        return;
      }
      
      console.log('🔍 [AttendanceOverlay] Running comprehensive status check...');
      await comprehensiveStatusCheck();
      console.log('🔍 [AttendanceOverlay] Status check completed, setting loading to false');
      setIsLoading(false);
    };
    
    if (user && (user._id || user.id) && user.role) {
      initialize();
    }
    
    const interval = setInterval(async () => {
      // Check if user is admin (by role, email, or username)
      const isAdmin = user && (user.role === 'admin' || 
                      (user.email && user.email.toLowerCase().includes('admin')) ||
                      (user.username && user.username.toLowerCase().includes('admin')));
      
      if (user && !isAdmin && overlayEnabled) {
        await comprehensiveStatusCheck();
      }
    }, 3000);
    
    // Listen for custom events to trigger immediate status refresh
    const handleStatusUpdate = (event) => {
      console.log('🔍 [AttendanceOverlay] Received status update event:', event);
      console.log('🔍 [AttendanceOverlay] Event detail:', event.detail);
      console.log('🔍 [AttendanceOverlay] Refreshing status immediately...');
      
      // FIXED: Update status immediately from event data if available
      if (event.detail?.currentStatus) {
        console.log('✅ [AttendanceOverlay] Using status from event:', event.detail.currentStatus);
        setCurrentStatus(event.detail.currentStatus);
        
        // Update check-in state based on status
        const status = event.detail.currentStatus.status;
        const isCheckedInNow = status === 'checked-in' || status === 'clocked_in' || status === 'active';
        setIsCheckedIn(isCheckedInNow);
        console.log(`✅ [AttendanceOverlay] Updated isCheckedIn to ${isCheckedInNow} from event`);
      }
      
      // Also do comprehensive check to ensure consistency
      comprehensiveStatusCheck();
    };
    
    // Listen for custom events from QR verification
    window.addEventListener('attendance-status-updated', handleStatusUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('attendance-status-updated', handleStatusUpdate);
    };
  }, [user]);
  
  // Don't show overlay if no user
  if (!user) {
    return <>{children}</>;
  }
  
  // Don't show overlay for admin users (check both role and email)
  const isAdmin = user.role === 'admin' || 
                  (user.email && user.email.toLowerCase().includes('admin')) ||
                  (user.username && user.username.toLowerCase().includes('admin'));
  
  if (isAdmin) {
    console.log('🔍 [AttendanceOverlay] Admin user detected, disabling overlay');
    return <>{children}</>;
  }
  
  // Don't show overlay if disabled by admin
  if (!overlayEnabled) {
    return <>{children}</>;
  }
  
  // Show loading while checking or waiting for user data
  if (isLoading || !user) {
    return (
      <>
        {children}
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '14px',
          zIndex: 999999
        }}>
          {!user ? 'Loading user data...' : 'Checking attendance...'}
        </div>
      </>
    );
  }
  
  // Don't show overlay if checked in (unless it's overtime and they can check in again)
  if (isCheckedIn) {
    if (currentStatus && currentStatus.isOvertimeTime && currentStatus.canCheckIn) {
      // Continue to show overlay for overtime check-in
    } else {
      return <>{children}</>;
    }
  }

  // Additional safety checks
  if (currentStatus && currentStatus.status === 'clocked_in') {
    return <>{children}</>;
  }

  if (currentStatus && currentStatus.status !== 'clocked_out' && (currentStatus.checkInTime || currentStatus.status === 'present')) {
    return <>{children}</>;
  }
  
  // CRITICAL FIX: Don't show overlay if user has already checked in for overtime
  if (currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn && currentStatus.isOvertimeTime) {
    // User is clocked out but cannot check in for overtime (already checked in or completed)
    return <>{children}</>;
  }
  
  // Additional overtime status checks
  if (currentStatus && (
    currentStatus.status === 'overtime_active' || 
    currentStatus.status === 'overtime_completed' || 
    currentStatus.status === 'overtime_inactive' ||
    currentStatus.isOvertimeActive ||
    currentStatus.isOvertimeCompleted ||
    (currentStatus.overtimeTimesheet && currentStatus.overtimeTimesheet.hasClockIn)
  )) {
    // User has overtime timesheet - don't show overlay
    return <>{children}</>;
  }
  
  // Show overlay for non-admin users who are not checked in OR need overtime check-in
  const shouldShowOverlay = !isCheckedIn || (currentStatus && currentStatus.status === 'clocked_out' && currentStatus.canCheckIn);
  
  // DEBUG: Add logging to understand why overlay is not showing
        console.log('🔍 [AttendanceOverlay] Debug Info:', {
        user: user ? { id: user._id || user.id, role: user.role, name: `${user.firstName} ${user.lastName}` } : null,
        overlayEnabled,
        isCheckedIn,
        currentStatus,
        isLoading,
        shouldShowOverlay
      });
  
  if (!shouldShowOverlay) {
    console.log('🔍 [AttendanceOverlay] Not showing overlay - shouldShowOverlay is false');
    return <>{children}</>;
  }

  console.log('🔍 [AttendanceOverlay] SHOWING OVERLAY - shouldShowOverlay is true');

  return (
    <>
      {/* Show QR Modal if requested, otherwise show attendance overlay */}
      {showQRModal || showEnhancedQRModal ? (
        <>
          {children}
          <QRCodeModal 
            isOpen={showQRModal}
            onClose={() => {
              setShowQRModal(false);
              setTimeout(async () => {
                await comprehensiveStatusCheck();
                setTimeout(async () => {
                  await comprehensiveStatusCheck();
                }, 2000);
              }, 1000);
            }}
            currentStatus={currentStatus}
          />
          
          {/* Enhanced QR Code Modal */}
          <EnhancedQRCodeModal 
            isOpen={showEnhancedQRModal}
            onClose={() => {
              setShowEnhancedQRModal(false);
              setTimeout(async () => {
                await comprehensiveStatusCheck();
                setTimeout(async () => {
                  await comprehensiveStatusCheck();
                }, 2000);
              }, 1000);
            }}
            currentStatus={currentStatus}
            onStatusUpdate={setCurrentStatus}
          />
        </>
      ) : (
        <>
          {/* The actual content - blurred and non-interactive */}
          <div style={{ 
            filter: 'blur(8px)', 
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.4,
            transition: 'all 0.5s ease'
          }}>
            {children}
          </div>
          
          {/* The overlay */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(241, 245, 249, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            transition: 'all 0.5s ease',
            padding: '16px'
          }}>
            <div 
              className="w-full max-w-md border border-border/40 shadow-2xl rounded-2xl p-8 transition-all duration-300 transform hover:scale-[1.01]"
              style={{
                backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                color: isDarkMode ? '#f8fafc' : '#0f172a'
              }}
            >
              {/* Alert Indicator */}
              <div className="flex justify-center mb-6">
                <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ring-8 ${
                  currentStatus && currentStatus.isOvertimeTime 
                    ? 'bg-amber-500/10 ring-amber-500/5 text-amber-500' 
                    : 'bg-destructive/10 ring-destructive/5 text-destructive'
                }`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    currentStatus && currentStatus.isOvertimeTime ? 'bg-amber-400' : 'bg-destructive'
                  }`} style={{ animationDuration: '2s' }}></span>
                  <AlertCircle className="h-8 w-8 relative z-10" />
                </div>
              </div>
              
              {/* Title */}
              <h1 className="text-2xl font-bold text-center tracking-tight mb-2">
                {currentStatus && currentStatus.isOvertimeTime ? 'Overtime Check-in Available' : 'Check-in Required'}
              </h1>
              
              {/* Message */}
              <p 
                className="text-sm text-center mb-6 leading-relaxed"
                style={{ color: isDarkMode ? '#94a3b8' : '#475569' }}
              >
                {currentStatus && currentStatus.overlayMessage 
                  ? currentStatus.overlayMessage
                  : currentStatus && currentStatus.isOvertimeTime 
                    ? 'You can check in for overtime hours (5:00 PM - 1:30 AM).'
                    : 'You must check in before you can start working. This ensures proper attendance tracking.'
                }
              </p>

              {/* Real-time Clock Widget */}
              <div 
                className="flex flex-col items-center justify-center rounded-xl p-4 mb-6 border border-border/20 shadow-inner"
                style={{ backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.6)' }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: isDarkMode ? '#64748b' : '#64748b' }}>
                  Local time (EAT)
                </span>
                <div className="text-3xl font-bold font-mono tracking-wider tabular-nums flex items-center gap-1">
                  {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
                <span className="text-xs font-medium mt-1" style={{ color: isDarkMode ? '#64748b' : '#64748b' }}>
                  {time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Overtime Information Box */}
              {currentStatus && currentStatus.status === 'clocked_out' && currentStatus.isOvertimeTime && (
                <div 
                  className="mb-6 p-4 rounded-xl text-left border border-amber-500/20"
                  style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(254, 243, 199, 0.6)' }}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm mb-2" style={{ color: isDarkMode ? '#fbbf24' : '#b45309' }}>
                    <Clock className="h-4 w-4" />
                    <span>Overtime Shift Details</span>
                  </div>
                  
                  <div className="text-xs space-y-1 font-medium" style={{ color: isDarkMode ? '#d97706' : '#92400e' }}>
                    <div>• Window: <span className="font-semibold">{currentStatus.overtimeStartTime} - {currentStatus.overtimeEndTime}</span></div>
                    {currentStatus.wasEarlyCheckOut && (
                      <div className="text-destructive font-semibold flex items-center gap-1 mt-1">
                        <span>⚠️ Early regular checkout detected.</span>
                      </div>
                    )}
                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <span>✓ Overtime check-in is open</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Check In Button */}
                <Button
                  onClick={handleOpenModal}
                  disabled={currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn}
                  className={`w-full py-6 font-bold text-base shadow-lg transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${
                    currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20'
                  }`}
                >
                  <QrCode className="h-5 w-5" />
                  {currentStatus && currentStatus.status === 'clocked_out' && currentStatus.canCheckIn
                    ? (currentStatus.isOvertimeTime ? 'Check In for Overtime' : 'Check In Now')
                    : 'Check In Now'}
                </Button>

                {/* Enhanced QR Code Button */}
                <Button
                  onClick={handleOpenEnhancedModal}
                  className="w-full py-6 font-bold text-base bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Smartphone className="h-5 w-5" />
                  Enhanced QR System
                </Button>

                {/* Manual Refresh Button */}
                <Button
                  variant="ghost"
                  onClick={handleRefreshStatus}
                  className="w-full py-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  I've Already Checked In — Refresh Status
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AttendanceOverlay;