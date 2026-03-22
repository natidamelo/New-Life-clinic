import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import systemSettingsService from '../services/systemSettingsService';
import apiService from '../services/apiService';
import QRCodeModal from './QRCodeModal';
import EnhancedQRCodeModal from './EnhancedQRCodeModal';

interface AttendanceOverlayProps {
  children: React.ReactNode;
}

const AttendanceOverlay: React.FC<AttendanceOverlayProps> = ({ children }) => {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEnhancedQRModal, setShowEnhancedQRModal] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
      {showQRModal ? (
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
          {/* Debug info */}
          {showQRModal && (
            <div style={{
              position: 'fixed',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '10px',
              borderRadius: '5px',
              fontSize: '12px',
              zIndex: 999999,
              maxWidth: '300px'
            }}>
              <strong>Debug: Status being passed to QRCodeModal</strong><br/>
              Status: {currentStatus?.status || 'null'}<br/>
              Can Check In: {currentStatus?.canCheckIn?.toString() || 'null'}<br/>
              Can Check Out: {currentStatus?.canCheckOut?.toString() || 'null'}<br/>
              Check In Time: {currentStatus?.checkInTime || 'null'}<br/>
              <br/>
              <strong>Raw currentStatus:</strong><br/>
              <pre style={{fontSize: '10px', maxHeight: '100px', overflow: 'auto'}}>
                {JSON.stringify(currentStatus, null, 2)}
              </pre>
            </div>
          )}
        </>
      ) : (
        <>
          {/* The actual content - blurred and non-interactive */}
          <div style={{ 
            filter: 'blur(3px)', 
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.5
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '40px',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Alert Icon */}
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 20px',
                backgroundColor: '#FEE2E2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#DC2626" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              
              {/* Title */}
              <h1 style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '16px'
              }}>
                {currentStatus && currentStatus.isOvertimeTime ? 'Overtime Check-in Available' : 'Check-in Required'}
              </h1>
              
              {/* Message */}
              <p style={{
                fontSize: '18px',
                color: '#4B5563',
                marginBottom: '32px',
                lineHeight: '1.5'
              }}>
                {currentStatus && currentStatus.overlayMessage 
                  ? currentStatus.overlayMessage
                  : currentStatus && currentStatus.isOvertimeTime 
                    ? 'You can check in for overtime hours (5:00 PM - 1:30 AM).'
                    : 'You must check in before you can start working. This ensures proper attendance tracking.'
                }
              </p>

              {/* Overtime Information Box (only show during overtime window) */}
              {currentStatus && currentStatus.status === 'clocked_out' && currentStatus.isOvertimeTime && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '8px',
                  border: '1px solid #F59E0B',
                  textAlign: 'left'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                    <span style={{
                      marginLeft: '8px',
                      fontWeight: '600',
                      color: '#92400E'
                    }}>
                      Overtime Information
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: '#92400E', lineHeight: '1.4' }}>
                    <div><strong>Overtime Hours:</strong> {currentStatus.overtimeStartTime} - {currentStatus.overtimeEndTime}</div>
                    {currentStatus.wasEarlyCheckOut && (
                      <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                        ⚠️ You checked out early from regular hours. Overtime check-in is available.
                      </div>
                    )}
                    {currentStatus.canCheckIn && currentStatus.isOvertimeTime && (
                      <div style={{ marginTop: '4px', color: '#059669', fontWeight: '500' }}>
                        ✅ Overtime check-in is currently available
                      </div>
                    )}
                    {!currentStatus.canCheckIn && currentStatus.isOvertimeTime && (
                      <div style={{ marginTop: '4px', color: '#DC2626', fontWeight: '500' }}>
                        ❌ Overtime check-in not available (already checked in or completed)
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Check In Button */}
              <button
                onClick={handleOpenModal}
                disabled={currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn ? '#9CA3AF' : '#10B981',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s',
                  marginBottom: '16px'
                }}
                onMouseEnter={(e) => {
                  if (currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn) return;
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  if (currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn) return;
                  e.currentTarget.style.backgroundColor = '#10B981';
                }}
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <rect x="7" y="7" width="3" height="3"></rect>
                  <rect x="14" y="7" width="3" height="3"></rect>
                  <rect x="7" y="14" width="3" height="3"></rect>
                  <rect x="14" y="14" width="3" height="3"></rect>
                </svg>
                {currentStatus && currentStatus.status === 'clocked_out' && currentStatus.canCheckIn
                  ? (currentStatus.isOvertimeTime ? 'CHECK IN FOR OVERTIME' : 'CHECK IN NOW')
                  : currentStatus && currentStatus.status === 'clocked_out' && !currentStatus.canCheckIn
                    ? (currentStatus.isOvertimeTime ? 'OVERTIME CHECK-IN NOT AVAILABLE' : 'CHECK-IN NOT AVAILABLE')
                    : 'CHECK IN NOW'}
              </button>

              {/* Enhanced QR Code Button */}
              <button
                onClick={handleOpenEnhancedModal}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: '#3B82F6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s',
                  marginBottom: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
                Enhanced QR System
              </button>

              {/* Manual Refresh Button */}
              <button
                onClick={handleRefreshStatus}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6B7280',
                  backgroundColor: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  marginBottom: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              >
                🔄 I've Already Checked In - Refresh Status
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AttendanceOverlay;