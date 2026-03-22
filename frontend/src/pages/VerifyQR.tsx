import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { createDeviceFingerprint, hashDeviceFingerprint, getCurrentLocation } from '../utils/deviceFingerprint';



// No beforeunload listener to avoid annoying popups

// Monitor for any location changes and prevent them
let isOnVerifyQRPage = false;
const checkIfOnVerifyQR = () => {
  isOnVerifyQRPage = window.location.href.includes('/verify-qr');
};

// Extend Window interface for custom properties
declare global {
  interface Window {
    statusRefreshInterval: NodeJS.Timeout | null;
  }
}

// Check initially
checkIfOnVerifyQR();

// Monitor URL changes
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  if (isOnVerifyQRPage) {
    console.log('Preventing pushState redirect from verify QR page');
    return;
  }
  const result = originalPushState.apply(history, args);
  checkIfOnVerifyQR();
  return result;
};

history.replaceState = function(...args) {
  if (isOnVerifyQRPage) {
    console.log('Preventing replaceState redirect from verify QR page');
    return;
  }
  const result = originalReplaceState.apply(history, args);
  checkIfOnVerifyQR();
  return result;
};

// Prevent any authentication-related redirects
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('/api/auth/me') && window.location.href.includes('/verify-qr')) {
    console.log('Preventing auth validation request on verify QR page');
    return Promise.resolve(new Response(JSON.stringify({ success: false, message: 'Auth validation blocked on verify QR page' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  // For all other requests, use the original fetch
  return originalFetch.apply(window, args);
};

// Cleanup function to restore original fetch when component unmounts
const cleanupFetchOverride = () => {
  window.fetch = originalFetch;
};

interface VerificationResult {
  success: boolean;
  message: string;
  data?: any;
}

// Simple SVG icons to replace problematic Heroicons
const CheckCircleIcon = () => (
  <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const SmallCheckIcon = () => (
  <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const SmallXIcon = () => (
  <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const VerifyQR: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [browserHash, setBrowserHash] = useState<string>('');
  const [storedUserId, setStoredUserId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Get URL parameters
  const urlHash = searchParams.get('hash');
  const hashType = searchParams.get('type');
  const userId = searchParams.get('userId');

  // Detect mobile device and prevent unwanted redirects
  useEffect(() => {
    setPageLoaded(true);
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
      console.log('🔍 [VerifyQR] Device detected as mobile:', isMobileDevice);
      console.log('🔍 [VerifyQR] User Agent:', userAgent);
      console.log('🔍 [VerifyQR] Current URL:', window.location.href);
      console.log('🔍 [VerifyQR] URL Parameters:', { urlHash, hashType, userId });
      console.log('🔍 [VerifyQR] Current hostname:', window.location.hostname);
      console.log('🔍 [VerifyQR] API Base URL will be determined by hostname');
    };
    
    const checkExistingRegistration = () => {
      if (hashType === 'staff-registration' && userId) {
        // Check multiple storage sources for persistence
        let existingRegisteredUserId = localStorage.getItem('staffUserId') || sessionStorage.getItem('staffUserId');
        let existingDeviceRegistered = localStorage.getItem('deviceRegistered') || sessionStorage.getItem('deviceRegistered');
        let existingStaffHash = localStorage.getItem('staffHash') || sessionStorage.getItem('staffHash');
        
        console.log('🔍 [VerifyQR] Checking existing registration:', {
          localStorage: {
            userId: localStorage.getItem('staffUserId'),
            registered: localStorage.getItem('deviceRegistered'),
            hash: localStorage.getItem('staffHash') ? localStorage.getItem('staffHash').substring(0, 20) + '...' : 'none'
          },
          sessionStorage: {
            userId: sessionStorage.getItem('staffUserId'),
            registered: sessionStorage.getItem('deviceRegistered'),
            hash: sessionStorage.getItem('staffHash') ? sessionStorage.getItem('staffHash').substring(0, 20) + '...' : 'none'
          }
        });
        
        // If device is already registered for this user, show success state
        if (existingDeviceRegistered === 'true' && existingRegisteredUserId === userId && existingStaffHash) {
          console.log('🔍 [VerifyQR] Device already registered for this user');
          
          // Restore localStorage if it was missing but sessionStorage has it
          if (!localStorage.getItem('staffHash') && sessionStorage.getItem('staffHash')) {
            localStorage.setItem('staffHash', sessionStorage.getItem('staffHash'));
            localStorage.setItem('staffUserId', sessionStorage.getItem('staffUserId'));
            localStorage.setItem('deviceRegistered', sessionStorage.getItem('deviceRegistered'));
            console.log('🔍 [VerifyQR] Restored registration data to localStorage');
          }
          
          // Create clinic-style already registered message
          const currentTime = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const deviceInfo = navigator.userAgent.includes('Mobile') ? '📱 Mobile Device' : '💻 Desktop Device';
          
          const alreadyRegisteredMessage = `✅ DEVICE READY\n\n` +
            `Status: AUTHORIZED\n` +
            `${currentTime}\n\n` +
            `Ready for QR check-in/check-out`;

          setVerificationResult({
            success: true,
            message: alreadyRegisteredMessage,
            data: {
              user: {
                firstName: 'Staff',
                lastName: 'Member',
                username: 'staff',
                role: 'staff'
              },
              hash: {
                value: existingStaffHash,
                isActive: true
              }
            }
          });
        }
      }
    };
    
    checkMobile();
    checkExistingRegistration();
    
    // Prevent any automatic redirects to login
    const currentUrl = window.location.href;
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/verify-qr')) {
      console.log('On verify QR page - preventing redirects');
    }

    // Check if stored registration is still valid
    const checkStoredRegistration = async () => {
      const storedHash = localStorage.getItem('staffHash');
      const storedUserId = localStorage.getItem('staffUserId');
      const deviceRegistered = localStorage.getItem('deviceRegistered');
      
      if (storedHash && storedUserId && deviceRegistered === 'true') {
        try {
          // Use smart API URL detection for mobile compatibility
          const currentHost = window.location.hostname;
          const currentProtocol = window.location.protocol;
          
          let apiUrl;
          if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            apiUrl = '/api/qr/verify-url';
          } else if (currentHost.startsWith('192.168.') || currentHost.startsWith('10.') || currentHost.startsWith('172.')) {
            apiUrl = `${currentProtocol}//${currentHost}:5002/api/qr/verify-url`;
          } else {
            apiUrl = '/api/qr/verify-url';
          }
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              urlHash: storedHash,
              hashType: 'staff-registration',
              userId: storedUserId,
              browserHash: storedHash,
              storedUserId: storedUserId,
              location: 'Registration Check'
            })
          });
          
          const result = await response.json();
          if (!result.success && result.data && result.data.deactivated) {
            // Clear the deactivated registration
            localStorage.removeItem('staffHash');
            localStorage.removeItem('staffUserId');
            localStorage.removeItem('deviceRegistered');
            
            setVerificationResult({
              success: false,
              message: '❌ Device Registration Deactivated - Your device registration has been deactivated by an administrator. Please re-register your device.'
            });
            
            toast.error('Your device registration has been deactivated. Please re-register.');
          }
        } catch (error) {
          console.log('Could not verify stored registration:', error);
        }
      }
    };

    checkStoredRegistration();
  }, []);

  useEffect(() => {
    // Get stored hash and user ID from browser local storage
    const storedHash = localStorage.getItem('staffHash');
    const storedUser = localStorage.getItem('staffUserId');
    const deviceRegistered = localStorage.getItem('deviceRegistered');
    
    // Auto-restore device registration if missing but should exist
    if (!storedHash && deviceRegistered === 'true' && storedUser === userId) {
      console.log('🔄 Auto-restoring missing device registration hash...');
      const tempHash = `restored_${userId}_${Date.now()}`;
      localStorage.setItem('staffHash', tempHash);
      localStorage.setItem('registrationTimestamp', new Date().toISOString());
      console.log('✅ Device registration hash restored');
    }
    
    // Auto-fix: If device is registered but hash is missing, create one
    if (deviceRegistered === 'true' && storedUser === userId && !storedHash) {
      console.log('🔄 Auto-fixing missing hash for registered device...');
      const tempHash = `autofix_${userId}_${Date.now()}`;
      localStorage.setItem('staffHash', tempHash);
      console.log('✅ Hash auto-fixed');
    }
    
    // Cleanup function for status refresh interval
    return () => {
      if (window.statusRefreshInterval) {
        clearInterval(window.statusRefreshInterval);
        window.statusRefreshInterval = null;
      }
    };
    
    // For staff registration, only check device status when actually processing
    if (hashType === 'staff-registration') {
      console.log('Staff registration detected, ready for processing...');
      // Don't auto-show "already registered" - wait for actual verification
      return;
    }
    
    // NO AUTO-REGISTRATION - Let backend validate device registration properly
    if (storedHash && storedUser && storedUser === userId) {
      console.log('✅ Device already registered for this user');
      setBrowserHash(storedHash);
      setStoredUserId(storedUser);
    } else {
      console.log('⚠️ Device not registered for user:', userId);
      console.log('   User must scan staff registration QR code first');
    }
  }, [userId, hashType, urlHash, pageLoaded]);

  useEffect(() => {
    // Auto-verify if we have all required parameters
    if (urlHash && hashType && userId && !verificationResult && pageLoaded) {
      if (hashType === 'staff-registration') {
        // For staff registration, don't auto-process - wait for user action
        console.log('Staff registration detected - waiting for user action...');
        return;
      } else {
        // For check-in/check-out, check device registration first
        console.log('Check-in/check-out detected, checking device registration...');
        
        // Get stored hash directly from localStorage instead of relying on state
        const storedHash = localStorage.getItem('staffHash');
        const storedUser = localStorage.getItem('staffUserId');
        const deviceRegistered = localStorage.getItem('deviceRegistered');
        
        console.log('🔍 Direct localStorage check:', {
          storedHash: storedHash ? storedHash.substring(0, 20) + '...' : 'none',
          storedUser,
          deviceRegistered,
          currentUserId: userId,
          browserHashState: browserHash ? browserHash.substring(0, 20) + '...' : 'none'
        });
        
        if (canVerify()) {
          console.log('✅ Device is registered and hash found, auto-processing check-in/check-out...');
          
          // Ensure browserHash state is set
          if (!browserHash) {
            console.log('🔄 Setting browserHash state from localStorage...');
            setBrowserHash(storedHash);
            setStoredUserId(storedUser);
          }
          
          setTimeout(() => {
            handleVerification();
          }, 1000); // 1 second delay to ensure page is ready
        } else {
          console.log('❌ Device not registered or hash not found, showing registration needed message');
          setVerificationResult({
            success: false,
            message: '❌ Device Not Registered - This device must be registered before check-in/check-out. Please scan a staff registration QR code first.',
            data: {
              needsRegistration: true,
              currentUserId: userId,
              storedData: {
                deviceRegistered,
                registeredUserId: storedUser,
                registeredHash: storedHash
              }
            }
          });
        }
      }
    }
  }, [urlHash, hashType, userId, verificationResult, pageLoaded, browserHash]);

  const handleVerification = async () => {
    if (!urlHash || !hashType || !userId) {
      toast.error('Missing required verification parameters');
      return;
    }

    // Check if this is an Enhanced QR code (version 2.0)
    const currentUrl = window.location.href;
    const isEnhanced = searchParams.get('v') === '2.0' || currentUrl.includes('v=2.0');
    console.log('🔍 [VerifyQR] Enhanced QR Code detected:', isEnhanced);

    // For check-in/check-out, ensure device is registered
    const deviceRegistered = localStorage.getItem('deviceRegistered');
    const registeredUserId = localStorage.getItem('staffUserId');
    const registeredHash = localStorage.getItem('staffHash');

    console.log('🔍 Device Registration Check:', {
      deviceRegistered,
      registeredUserId,
      registeredHash: registeredHash ? registeredHash.substring(0, 20) + '...' : 'none',
      urlHash: urlHash ? urlHash.substring(0, 20) + '...' : 'none',
      currentUserId: userId,
      hashType
    });

    // SIMPLIFIED: No complex verification checks - let backend handle it
    console.log('✅ Proceeding with verification - backend will validate');

    // Create device fingerprint for verification (with error handling)
    let deviceFingerprint = null;
    let fingerprintHash = null;
    let location = null;
    
    try {
      deviceFingerprint = await createDeviceFingerprint();
      fingerprintHash = await hashDeviceFingerprint(deviceFingerprint);
      console.log('✅ Fingerprint created');
    } catch (error) {
      console.warn('⚠️ Fingerprint failed, using fallback');
      fingerprintHash = `fallback_${userId}_${Date.now()}`;
    }
    
    try {
      location = await getCurrentLocation();
      if (location) {
        console.log('✅ Location captured');
      }
    } catch (error) {
      console.warn('⚠️ Location not available');
    }

    setIsVerifying(true);
    try {
      // Use the same smart API URL detection for mobile compatibility
      const currentHost = window.location.hostname;
      const currentProtocol = window.location.protocol;
      
      let apiUrl;
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        apiUrl = '/api/qr/verify-url';
      } else if (currentHost.startsWith('192.168.') || currentHost.startsWith('10.') || currentHost.startsWith('172.')) {
        apiUrl = `${currentProtocol}//${currentHost}:5002/api/qr/verify-url`;
      } else {
        apiUrl = '/api/qr/verify-url';
      }
      
      console.log('🔍 [VerifyQR] Check-in/out API URL:', apiUrl);
      
      // Add timeout for mobile networks
      const response = await Promise.race([
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: hashType,
            userId: userId,
            hash: urlHash,
            timestamp: new Date().toISOString(),
            deviceFingerprint: fingerprintHash,
            rawFingerprint: deviceFingerprint,
            location: location,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              isMobile: isMobile,
              networkType: (navigator as any).connection?.effectiveType || 'unknown'
            }
          })
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout - please check your internet connection')), 20000)
        )
      ]);

      const result = await (response as Response).json();
      console.log('🔍 [VerifyQR] Full verification response:', result);
      console.log('🔍 [VerifyQR] Current status in response:', result.data?.currentStatus);
      setVerificationResult(result);

      if (result.success) {
        // Create detailed clinic-style success messages
        const currentTime = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const currentDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        let clinicMessage = '';
        let toastMessage = '';
        
        // Use the current status returned from the verification response
        if (result.data && result.data.currentStatus) {
          console.log('🔍 [VerifyQR] Processing currentStatus:', result.data.currentStatus);
          
          const userName = result.data.user?.firstName || 'Staff Member';
          const userRole = result.data.user?.role || 'Staff';
          
          // Determine if it's overtime (after 5 PM or before 8 AM)
          const currentHour = new Date().getHours();
          const isOvertime = currentHour >= 17 || currentHour < 8;
          const overtimeText = isOvertime ? ' (OVERTIME SHIFT)' : '';
          
          if (hashType === 'qr-checkin') {
            clinicMessage = `✅ CHECK-IN SUCCESSFUL\n\n` +
              `${userName} (${userRole})\n` +
              `${currentTime}${overtimeText}\n` +
              `Status: ON DUTY`;
            
            toastMessage = `✅ Check-in successful at ${currentTime}`;
          } else if (hashType === 'qr-checkout') {
            // Calculate shift duration if check-in time is available
            let shiftDuration = '';
            if (result.data.checkInTime) {
              const checkInTime = new Date(result.data.checkInTime);
              const checkOutTime = new Date();
              const durationMs = (checkOutTime as any) - (checkInTime as any);
              const hours = Math.floor(durationMs / (1000 * 60 * 60));
              const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
              shiftDuration = `\nShift: ${hours}h ${minutes}m`;
            }
            
            clinicMessage = `✅ CHECK-OUT SUCCESSFUL\n\n` +
              `${userName} (${userRole})\n` +
              `${currentTime}${overtimeText}${shiftDuration}\n` +
              `Status: OFF DUTY`;
            
            toastMessage = `✅ Check-out successful at ${currentTime}`;
          }
          
          toast.success(toastMessage);
          
          // Update the verification result to show current status and automatically disable buttons
          setVerificationResult({
            success: true,
            message: clinicMessage,
            data: {
              currentStatus: result.data.currentStatus,
              action: hashType,
              user: result.data.user,
              timestamp: result.data.timestamp,
              checkInTime: result.data.checkInTime,
              isOvertime: isOvertime,
              shiftType: isOvertime ? 'OVERTIME' : 'REGULAR'
            }
          });
          
          // Force update the status display immediately
          console.log('🔍 [VerifyQR] Forcing immediate status update:', result.data.currentStatus);
          console.log('🔍 [VerifyQR] Status check - is checked in?', 
            (result.data.currentStatus.status === 'checked-in' || result.data.currentStatus.status === 'clocked_in'));
          console.log('🔍 [VerifyQR] Status check - is checked out?', 
            (result.data.currentStatus.status === 'checked-out' || result.data.currentStatus.status === 'clocked_out'));
          
          // Show automatic status update messages
          if (hashType === 'qr-checkin') {
            setTimeout(() => {
              toast.success('📱 Status updated! QR code now ready for check-out.');
            }, 1500);
          } else if (hashType === 'qr-checkout') {
            setTimeout(() => {
              toast.success('📱 Status updated! QR code now ready for next check-in.');
            }, 1500);
          }
          
          // Auto-redirect after successful verification (mobile-friendly)
          if (isMobile) {
            setTimeout(() => {
              // Close the current window/tab
              window.close();
            }, 3000); // 3 seconds delay for mobile users to see the success message
          } else {
            // For desktop, show a redirect button instead of auto-redirect
            setTimeout(() => {
              // Show redirect option
              toast.success('✅ Verification complete! You can close this window.', {
                duration: 5000,
                // action: {
                //   label: 'Close',
                //   onClick: () => window.close()
                // }
              });
            }, 2000);
          }
          
          // Dispatch custom event to notify AttendanceOverlay to refresh immediately
          console.log('🔔 [VerifyQR] Dispatching attendance-status-updated event...');
          const normalizedAction = hashType === 'qr-checkin' ? 'checkin' : hashType === 'qr-checkout' ? 'checkout' : hashType;
          const event = new CustomEvent('attendance-status-updated', {
            detail: {
              action: normalizedAction,
              userId: userId,
              timestamp: new Date().toISOString(),
              currentStatus: result.data.currentStatus,
              isOvertime: isOvertime,
              isOvertimeTime: isOvertime,
              shiftType: isOvertime ? 'OVERTIME' : 'REGULAR'
            }
          });
          window.dispatchEvent(event);
          console.log('✅ [VerifyQR] Event dispatched successfully with overtime info:', { isOvertime });
          
          // Start automatic status refresh to keep UI updated (only if we have a valid token)
          const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
          if (token) {
            startStatusRefresh();
          } else {
            console.log('No valid token found, skipping automatic status refresh');
          }
        }
              } else {
          // Even if no currentStatus, dispatch event to trigger refresh
          const normalizedAction = hashType === 'qr-checkin' ? 'checkin' : hashType === 'qr-checkout' ? 'checkout' : hashType;
          const currentHour = new Date().getHours();
          const isOvertime = currentHour >= 17 || currentHour < 8;
          
          window.dispatchEvent(new CustomEvent('attendance-status-updated', {
            detail: {
              action: normalizedAction,
              userId: userId,
              timestamp: new Date().toISOString(),
              isOvertime: isOvertime,
              isOvertimeTime: isOvertime,
              shiftType: isOvertime ? 'OVERTIME' : 'REGULAR'
            }
          }));
          
          // Check if this is a deactivated registration error
          if (result.data && result.data.deactivated) {
            // Clear the device registration data from localStorage
            localStorage.removeItem('staffHash');
            localStorage.removeItem('staffUserId');
            localStorage.removeItem('deviceRegistered');
            
            setVerificationResult({
              success: false,
              message: result.message,
              data: {
                deactivated: true,
                cleared: true
              }
            });
            
            toast.error('Device registration has been deactivated. Please contact your administrator.');
          } else {
            toast.error(result.message);
          }
        }
    } catch (error) {
      console.error('Verification error:', error);
      
      // Provide more specific error messages based on the error type and mobile context
      let errorMessage = 'Failed to verify QR code. Please try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = isMobile 
          ? '📱 Network Error - Unable to connect to the server. Please check your WiFi connection and make sure you\'re on the clinic network.'
          : '❌ Network Error - Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = isMobile
          ? '⏱️ Request Timeout - The request took too long. Please check your mobile connection and try again.'
          : '⏱️ Request Timeout - The request took too long. Please try again.';
      } else if (error instanceof Error) {
        errorMessage = `❌ Server Error - ${error.message}`;
      }
      
      setVerificationResult({
        success: false,
        message: errorMessage,
        data: {
          error: error.message,
          errorType: error.constructor.name,
          isMobile: isMobile,
          currentUrl: window.location.href
        }
      });
      
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStaffRegistration = async () => {
    if (!urlHash || !userId) {
      toast.error('Missing required staff registration parameters');
      return;
    }

    console.log('🔒 [Security] Starting registration...');
    
    // SIMPLIFIED: Create basic fingerprint that works on ALL devices
    let deviceFingerprint = null;
    let fingerprintHash = null;
    let location = null;
    
    try {
      console.log('Creating device fingerprint...');
      deviceFingerprint = await Promise.race([
        createDeviceFingerprint(),
        new Promise<any>((resolve) => {
          setTimeout(() => {
            console.warn('Fingerprint timeout, using simple version');
            resolve({
              userAgent: navigator.userAgent,
              screen: `${screen.width}x${screen.height}`,
              timezone: 'UTC',
              language: navigator.language,
              platform: navigator.platform,
              hardwareConcurrency: 1,
              maxTouchPoints: 0,
              vendor: 'unknown',
              colorDepth: 24,
              pixelRatio: 1,
              cookiesEnabled: true,
              doNotTrack: null,
              plugins: 'none',
              canvas: 'simple',
              webgl: 'simple'
            });
          }, 3000);
        })
      ] as any);
      fingerprintHash = await hashDeviceFingerprint(deviceFingerprint as any);
      console.log('✅ Device fingerprint created');
    } catch (error) {
      console.warn('⚠️ Device fingerprint failed, using basic fallback:', error);
      fingerprintHash = `simple_${navigator.userAgent}_${Date.now()}`;
    }

    // Get location (optional, with 5 second timeout)
    try {
      console.log('Getting location (max 5 seconds)...');
      location = await getCurrentLocation();
      if (location) {
        console.log('✅ Location captured');
      } else {
        console.log('ℹ️ Location not available - continuing without it');
      }
    } catch (error) {
      console.warn('⚠️ Location not available:', error);
    }

      // Check if this device is already registered for a different user using localStorage
  const existingRegisteredUserId = localStorage.getItem('staffUserId');
  const existingDeviceRegistered = localStorage.getItem('deviceRegistered');
  
  if (existingDeviceRegistered === 'true' && existingRegisteredUserId && existingRegisteredUserId !== userId) {
    setVerificationResult({
      success: false,
      message: '❌ Device Already Registered - This device is already registered for another staff member. Only one staff member can be registered per device.'
    });
    toast.error('This device is already registered for another staff member.');
    setIsVerifying(false);
    return;
  }

  // If device is already registered for this user, don't call backend
  if (existingDeviceRegistered === 'true' && existingRegisteredUserId === userId) {
    setVerificationResult({
      success: true,
      message: '✅ Device already registered for this user!'
    });
    toast.success('Device already registered for this user!');
    setIsVerifying(false);
    return;
  }

  // Check if the stored registration might be deactivated
  const storedHash = localStorage.getItem('staffHash');
  if (storedHash && existingDeviceRegistered === 'true') {
    // Test the stored hash to see if it's still valid
    try {
      // Use smart API URL detection for mobile compatibility
      const currentHost = window.location.hostname;
      const currentProtocol = window.location.protocol;
      
      let apiUrl;
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        apiUrl = '/api/qr/verify-url';
      } else if (currentHost.startsWith('192.168.') || currentHost.startsWith('10.') || currentHost.startsWith('172.')) {
        apiUrl = `${currentProtocol}//${currentHost}:5002/api/qr/verify-url`;
      } else {
        apiUrl = '/api/qr/verify-url';
      }
      
      const testResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'staff-registration',
          userId: existingRegisteredUserId,
          hash: storedHash,
          timestamp: new Date().toISOString()
        })
      });
      
      const testResult = await testResponse.json();
      if (!testResult.success && testResult.data && testResult.data.deactivated) {
        // Clear the deactivated registration
        localStorage.removeItem('staffHash');
        localStorage.removeItem('staffUserId');
        localStorage.removeItem('deviceRegistered');
        
        setVerificationResult({
          success: false,
          message: '❌ Device Registration Deactivated - Your previous device registration has been deactivated by an administrator. Please re-register your device.'
        });
        toast.error('Your device registration has been deactivated. Please re-register.');
        setIsVerifying(false);
        return;
      }
    } catch (error) {
      console.log('Could not verify stored hash, proceeding with registration...');
    }
  }

    console.log('Starting staff registration...', { urlHash, userId, isMobile });
    setIsVerifying(true);
    try {
      // Double-check device registration status before calling backend
      const finalCheckRegisteredUserId = localStorage.getItem('staffUserId');
      const finalCheckDeviceRegistered = localStorage.getItem('deviceRegistered');
      
      if (finalCheckDeviceRegistered === 'true' && finalCheckRegisteredUserId && finalCheckRegisteredUserId !== userId) {
        setVerificationResult({
          success: false,
          message: '❌ Device Already Registered - This device is already registered for another staff member. Only one staff member can be registered per device.'
        });
        toast.error('This device is already registered for another staff member.');
        setIsVerifying(false);
        return;
      }

      // Determine the correct API URL based on current environment
      const currentHost = window.location.hostname;
      const currentPort = window.location.port;
      const currentProtocol = window.location.protocol;
      
      console.log('🔍 [VerifyQR] Current environment:', {
        hostname: currentHost,
        port: currentPort,
        protocol: currentProtocol,
        fullUrl: window.location.href
      });
      
      // Smart API URL detection for mobile compatibility
      let apiUrl;
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        // Local development - use relative URL
        apiUrl = '/api/qr/verify-url';
      } else if (currentHost.startsWith('192.168.') || currentHost.startsWith('10.') || currentHost.startsWith('172.')) {
        // Private network - construct URL using current host but backend port
        apiUrl = `${currentProtocol}//${currentHost}:5002/api/qr/verify-url`;
      } else {
        // Production or other - try relative first, fallback to explicit
        apiUrl = '/api/qr/verify-url';
      }
      
      console.log('🔍 [VerifyQR] Using API URL:', apiUrl);
      
      // Test API connectivity with timeout and better error handling
      try {
        console.log('🔍 [VerifyQR] Testing API connectivity...');
        const testResponse = await Promise.race([
          fetch(apiUrl.replace('/verify-url', '/test'), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API test timeout')), 5000)
          )
        ]);
        
        if (testResponse instanceof Response) {
          console.log('✅ [VerifyQR] API connectivity test passed:', testResponse.status);
        }
      } catch (testError) {
        console.warn('⚠️ [VerifyQR] API connectivity test failed, but continuing:', testError.message);
        // Don't throw here - the actual request might still work
      }
      
      console.log('🔍 [VerifyQR] Making API call to:', apiUrl);
      
      // Add timeout for mobile networks
      const response = await Promise.race([
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'staff-registration',
            userId: userId,
            hash: urlHash,
            timestamp: new Date().toISOString(),
            deviceFingerprint: fingerprintHash,
            rawFingerprint: deviceFingerprint,
            location: location
          })
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout - please check your internet connection')), 15000)
        )
      ]);

      console.log('Staff registration response:', (response as Response).status, (response as Response).statusText);
      console.log('Request payload sent:', {
        type: 'staff-registration',
        userId: userId,
        hash: urlHash,
        timestamp: new Date().toISOString()
      });
      
      if (!(response as Response).ok) {
        const errorText = await (response as Response).text();
        console.error('❌ Registration failed:', {
          status: (response as Response).status,
          statusText: (response as Response).statusText,
          errorText: errorText
        });
        throw new Error(`HTTP error! status: ${(response as Response).status} - ${errorText}`);
      }
      
      const result = await (response as Response).json();
      console.log('Staff registration result:', result);
      console.log('Setting verification result:', result);
      
      setVerificationResult(result);

      if (result.success && result.data && result.data.hash) {
        console.log('Registration successful, storing unique device hash in localStorage...');
        
        // Store the unique device hash returned from server (permanent storage)
        localStorage.setItem('staffHash', result.data.hash.value); // Store the hash value
        localStorage.setItem('staffUserId', userId);
        localStorage.setItem('deviceRegistered', 'true');
        localStorage.setItem('registrationTimestamp', new Date().toISOString());
        localStorage.setItem('deviceFingerprint', fingerprintHash); // Store fingerprint hash
        
        console.log('🔒 [Security] Device registration complete with fingerprint');
        
        // Additional persistence mechanisms
        try {
          // Try to use sessionStorage as backup
          sessionStorage.setItem('staffHash', result.data.hash.value);
          sessionStorage.setItem('staffUserId', userId);
          sessionStorage.setItem('deviceRegistered', 'true');
          
          // Store in IndexedDB for even more persistence (if available)
          if ('indexedDB' in window) {
            const request = indexedDB.open('ClinicRegistration', 1);
            request.onupgradeneeded = function() {
              const db = request.result;
              if (!db.objectStoreNames.contains('registrations')) {
                db.createObjectStore('registrations');
              }
            };
            request.onsuccess = function() {
              const db = request.result;
              const transaction = db.transaction(['registrations'], 'readwrite');
              const store = transaction.objectStore('registrations');
              store.put(result.data.hash.value, 'staffHash');
              store.put(userId, 'staffUserId');
              store.put('true', 'deviceRegistered');
              store.put(new Date().toISOString(), 'registrationTimestamp');
            };
          }
        } catch (error) {
          console.log('Additional persistence storage failed:', error);
        }
        
        console.log('Stored device hash:', result.data.hash.value.substring(0, 20) + '...');
        localStorage.setItem('userInfo', JSON.stringify({
          firstName: result.data.user?.firstName || 'Unknown',
          lastName: result.data.user?.lastName || 'Unknown',
          username: result.data.user?.username || 'Unknown',
          email: result.data.user?.email || 'Unknown',
          role: result.data.user?.role || 'Unknown'
        }));
        
        // Create detailed clinic-style registration success message
        const currentTime = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const currentDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const userName = result.data?.user?.firstName || 'Staff Member';
        const userRole = result.data?.user?.role || 'Staff';
        const deviceInfo = navigator.userAgent.includes('Mobile') ? '📱 Mobile Device' : '💻 Desktop Device';
        
        const registrationMessage = `✅ DEVICE REGISTERED\n\n` +
          `${userName} (${userRole})\n` +
          `${currentTime}\n` +
          `Status: AUTHORIZED\n\n` +
          `Ready for QR check-in/check-out`;

        // Set verification result with success message
        setVerificationResult({
          success: true,
          message: registrationMessage,
          data: result.data
        });
        
        // Admin panel will poll for status updates automatically
        // Check if this is an Enhanced QR code for logging
        const currentUrl = window.location.href;
        const isEnhancedRegistration = searchParams.get('v') === '2.0' || currentUrl.includes('v=2.0');
        
        console.log(`${isEnhancedRegistration ? 'Enhanced ' : ''}Device registered successfully. Admin panel will update status automatically.`);
        
        toast.success(`✅ ${isEnhancedRegistration ? 'Enhanced ' : ''}Device registered successfully! Registration saved permanently on this device.`);
        // Don't redirect - just show success message
      } else {
        console.log('Registration failed:', result.message);
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Staff registration error:', error);
      
      // Provide mobile-specific error messages
      let errorMessage = 'Failed to register staff. Please try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = isMobile 
          ? '📱 Network Error - Cannot reach the server. Please check your WiFi connection and make sure you\'re on the clinic network.'
          : '❌ Network Error - Unable to connect to the server. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = isMobile
          ? '⏱️ Registration Timeout - The registration took too long. Please check your mobile connection and try again.'
          : '⏱️ Registration Timeout - The request took too long. Please try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setVerificationResult({
        success: false,
        message: errorMessage,
        data: {
          error: error.message,
          errorType: error.constructor.name,
          isMobile: isMobile,
          currentUrl: window.location.href
        }
      });
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerification = () => {
    if (browserHash) {
      handleVerification();
    } else {
      toast.error('No staff hash found. Please log in to your staff account.');
    }
  };

  // Function to start automatic status refresh
  const startStatusRefresh = () => {
    if (!userId) return;
    
    // Clear any existing interval
    if (window.statusRefreshInterval) {
      clearInterval(window.statusRefreshInterval);
    }
    
    // Start new interval to refresh status every 5 seconds
    window.statusRefreshInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        
        // Only make the API call if we have a valid token
        if (!token) {
          console.log('No valid token found, skipping status refresh');
          return;
        }
        
        const response = await fetch('/api/qr/current-status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const statusData = await response.json();
          
          // Update verification result with fresh status
          setVerificationResult(prev => ({
            ...prev,
            data: {
              ...prev.data,
              currentStatus: statusData.data
            }
          }));
        } else if (response.status === 401) {
          // Token is invalid, stop refreshing
          console.log('Token invalid, stopping status refresh');
          if (window.statusRefreshInterval) {
            clearInterval(window.statusRefreshInterval);
            window.statusRefreshInterval = null;
          }
        }
      } catch (error) {
        console.log('Status refresh error:', error);
      }
    }, 5000); // Refresh every 5 seconds
    
    // Stop refreshing after 2 minutes (12 refreshes)
    setTimeout(() => {
      if (window.statusRefreshInterval) {
        clearInterval(window.statusRefreshInterval);
        window.statusRefreshInterval = null;
      }
    }, 120000);
  };

  // Function to check current device registration status
  const checkDeviceRegistrationStatus = () => {
    const deviceRegistered = localStorage.getItem('deviceRegistered');
    const registeredUserId = localStorage.getItem('staffUserId');
    const registeredHash = localStorage.getItem('staffHash');
    const userInfo = localStorage.getItem('userInfo');
    
    console.log('📱 Current Device Registration Status:', {
      deviceRegistered,
      registeredUserId,
      registeredHash,
      userInfo: userInfo ? JSON.parse(userInfo) : null,
      currentUserId: userId,
      hashType
    });
    
    return {
      deviceRegistered,
      registeredUserId,
      registeredHash,
      userInfo: userInfo ? JSON.parse(userInfo) : null
    };
  };

  // Function to check if verification is possible (has valid stored hash)
  const canVerify = () => {
    if (hashType === 'staff-registration') return false;
    
    const storedHash = localStorage.getItem('staffHash');
    const storedUser = localStorage.getItem('staffUserId');
    const deviceRegistered = localStorage.getItem('deviceRegistered');
    const registrationTimestamp = localStorage.getItem('registrationTimestamp');
    
    console.log('🔍 [canVerify] Checking device registration:', {
      storedHash: storedHash ? storedHash.substring(0, 20) + '...' : 'none',
      storedUser,
      userId,
      deviceRegistered,
      registrationTimestamp,
      hasStoredHash: !!storedHash
    });
    
    // For check-in/check-out QR codes, require proper device registration
    if (hashType === 'checkin' || hashType === 'checkout') {
      // Check if device is properly registered
      if (storedHash && storedUser === userId && deviceRegistered === 'true') {
        console.log('✅ Check-in/check-out QR code - device properly registered');
        return true;
      } else {
        console.log('❌ Check-in/check-out QR code - device not registered');
        return false;
      }
    }
    
    // SECURITY FIX: Only allow if device is PROPERLY registered
    // Must have ALL required registration data
    if (storedHash && storedUser === userId && deviceRegistered === 'true') {
      console.log('✅ Device verification allowed - device properly registered');
      return true;
    }
    
    // SECURITY: Do NOT allow fallback registration checks
    // Device must be fully registered with all required data
    console.log('❌ Device verification blocked - incomplete or invalid registration');
    return false;
    
    // SECURITY: No emergency fallbacks - all devices must be properly registered
    
    return false;
  };

  // Function to check if debug button should be shown
  const shouldShowDebugButton = () => {
    if (hashType === 'staff-registration') return false;
    if (browserHash) return false;
    return !canVerify();
  };



  if (!pageLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading QR Verification</h1>
          <p className="text-gray-600 mb-4">
            Please wait while we load the verification page.
          </p>
          <p className="text-sm text-gray-500">This may take a moment on mobile devices</p>
        </div>
      </div>
    );
  }

  if (!urlHash || !hashType || !userId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircleIcon />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid QR Code</h1>
          <p className="text-gray-600 mb-6">
            This QR code appears to be invalid or corrupted. Please try scanning a different QR code.
          </p>
          <div className="bg-accent/10 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-medium text-accent-foreground mb-2">Debug Information:</h3>
            <div className="text-xs text-accent-foreground space-y-1">
              <p><strong>URL Hash:</strong> {urlHash || 'Missing'}</p>
              <p><strong>Hash Type:</strong> {hashType || 'Missing'}</p>
              <p><strong>User ID:</strong> {userId || 'Missing'}</p>
              <p><strong>Current URL:</strong> {window.location.href}</p>
              <p><strong>Page Loaded:</strong> {pageLoaded ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <button
            onClick={() => window.close()}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Cleanup fetch override when component unmounts
  useEffect(() => {
    return () => {
      cleanupFetchOverride();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className={`bg-white border-2 border-blue-200 rounded-2xl shadow-2xl p-6 w-full ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">📱</span>
          </div>
          <h1 className={`font-bold text-gray-900 mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            {hashType === 'staff-registration' ? 'Device Registration' : 'Check In/Out'}
          </h1>
          <p className="text-gray-700 font-medium text-base">
            {hashType === 'staff-registration' 
              ? 'Register your phone for attendance'
              : 'Scan to check in or check out'
            }
          </p>
          
          {/* URL Parameters Display */}
          
        </div>

        {/* Simplified Registration Info */}
        {hashType === 'staff-registration' && !verificationResult && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-3">🔐</span>
              <h3 className="font-bold text-gray-900 text-lg">One-Time Setup</h3>
            </div>
            <p className="text-gray-800 text-base leading-relaxed">
              Click the button below to register this phone for attendance tracking.
            </p>
          </div>
        )}

        {/* Simplified Not Registered Warning */}
        {hashType !== 'staff-registration' && !canVerify() && !verificationResult && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-3">⚠️</span>
              <h3 className="font-bold text-gray-900 text-lg">Device Not Registered</h3>
            </div>
            <p className="text-gray-800 text-base mb-4">
              This phone needs to be registered first. Contact your admin for a registration QR code.
            </p>
            
            <p className="text-gray-600 text-sm mt-2">
              <strong>Instructions:</strong>
              <br />1. Contact your administrator
              <br />2. Ask for your staff registration QR code
              <br />3. Scan the registration QR code on this device
              <br />4. Then you can use check-in/check-out QR codes
            </p>
          </div>
        )}

        {/* Simplified Loading State */}
        {isVerifying && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-900 font-semibold text-lg mb-2">
              {hashType === 'staff-registration' ? 'Registering...' : 'Processing...'}
            </p>
            <p className="text-gray-600 text-sm">
              Please wait a moment
            </p>
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && !isVerifying && (
          <div className="text-center py-6">
            {verificationResult.success ? (
              <CheckCircleIcon />
            ) : (
              <XCircleIcon />
            )}
            
            <h2 className={`font-bold mb-4 ${
              verificationResult.success ? 'text-green-600' : 'text-red-600'
            } text-2xl`}>
              {verificationResult.success ? '✅ Success!' : '❌ Error'}
            </h2>
            
            <div className="mb-6">
              <div className={`${verificationResult.success ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'} rounded-xl p-5`}>
                <p className={`${verificationResult.success ? 'text-green-900' : 'text-red-900'} font-semibold text-lg text-center leading-relaxed`}>
                  {verificationResult.success && hashType === 'staff-registration' 
                    ? '✅ Phone Registered Successfully!' 
                    : verificationResult.success 
                    ? verificationResult.message.split('\n')[0]
                    : verificationResult.message.split('\n')[0]
                  }
                </p>
              </div>
            </div>
            
            {/* Auto-close countdown for mobile */}
            {verificationResult.success && isMobile && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4">
                <p className="text-primary text-sm">
                  📱 This window will close automatically in 3 seconds...
                </p>
              </div>
            )}

            {verificationResult.success ? (
              <div className="bg-green-100 border-2 border-green-400 rounded-xl p-4 mb-4">
                <p className="text-green-900 font-semibold text-base text-center">
                  {hashType === 'staff-registration' 
                    ? '🎉 You can now use this phone for check-in/check-out!'
                    : '✅ Attendance recorded successfully!'
                  }
                </p>
              </div>
            ) : (
              <div className="bg-red-100 border-2 border-red-400 rounded-xl p-4 mb-4">
                <p className="text-red-900 font-semibold text-sm text-center">
                  Please try again or contact your administrator.
                </p>
              </div>
            )}
          </div>
        )}


        {/* Simplified Device Status */}
        {hashType === 'staff-registration' && !isVerifying && !verificationResult && (
          <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-3 text-lg">📱 Current Status</h3>
            {(() => {
              const deviceRegistered = localStorage.getItem('deviceRegistered');
              const registeredUserId = localStorage.getItem('staffUserId');
              const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
              
              if (deviceRegistered === 'true' && registeredUserId) {
                if (registeredUserId === userId) {
                  return (
                    <div className="text-center">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="text-gray-900 font-bold text-lg mb-2">Already Registered</p>
                      <p className="text-gray-700 text-base">
                        {userInfo.firstName || 'Unknown'} {userInfo.lastName || 'Unknown'}
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center text-accent-foreground">
                        <SmallXIcon />
                        <span className="text-sm font-medium">Device Registered for Different User</span>
                      </div>
                      <div className="text-xs text-accent-foreground space-y-1">
                        <p><strong>Registered User:</strong> {userInfo.firstName || 'Unknown'} {userInfo.lastName || 'Unknown'}</p>
                        <p><strong>Your User ID:</strong> {userId}</p>
                        <p><strong>Registered User ID:</strong> {registeredUserId}</p>
                      </div>
                      <div className="bg-accent/20 border border-orange-200 rounded p-2">
                        <p className="text-xs text-accent-foreground font-medium">⚠️ This device is registered for a different staff member</p>
                      </div>
                    </div>
                  );
                }
              } else {
                return (
                  <div className="text-center">
                    <div className="text-4xl mb-2">📱</div>
                    <p className="text-gray-900 font-bold text-lg">Ready to Register</p>
                    <p className="text-gray-700 text-base mt-1">
                      Click the button below
                    </p>
                  </div>
                );
              }
            })()}
          </div>
        )}



        {/* Action Buttons and Verification Results */}
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="space-y-3">


            {/* Quick Re-register Button - Show when device not recognized for check-in/check-out */}
            {hashType !== 'staff-registration' && verificationResult && verificationResult.data?.needsRegistration && (
              <div className="space-y-3">
                <div className="bg-accent/10 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-accent-foreground mb-2">⚠️ Device Not Recognized</h4>
                  <p className="text-sm text-accent-foreground mb-3">
                    This device needs to be registered for check-in/check-out operations.
                  </p>
                  <button
                    onClick={() => {
                      // Clear any existing registration data
                      localStorage.removeItem('staffHash');
                      localStorage.removeItem('staffUserId');
                      localStorage.removeItem('deviceRegistered');
                      localStorage.removeItem('registrationTimestamp');
                      localStorage.removeItem('userInfo');
                      
                      // Redirect to staff registration
                      window.location.href = `/verify-qr?hash=staff-reg-${userId}&type=staff-registration&userId=${userId}`;
                    }}
                    className="w-full bg-primary text-primary-foreground py-2 px-3 rounded text-sm hover:bg-primary"
                  >
                    🔄 Quick Re-register Device
                  </button>
                </div>
              </div>
            )}

            {/* Simplified Registration Button */}
            {hashType === 'staff-registration' && (
              <>
                {/* Show Register button if not yet registered */}
                {!verificationResult && (
              <button
                onClick={handleStaffRegistration}
                disabled={isVerifying}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-5 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isVerifying ? '⏳ Registering...' : '✅ Register This Phone'}
              </button>
                )}
                
                {/* Show Already Registered status if successfully registered */}
                {verificationResult && verificationResult.success && (
                  <div className="space-y-3">
                    <div className="w-full bg-primary/20 border-2 border-primary/40 text-primary py-3 px-4 rounded-lg text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-primary">✅</span>
                        <span className="font-medium">Device Already Registered</span>
                      </div>
                      <p className="text-sm text-primary mt-1">
                        Your device is permanently registered for this staff member
                      </p>
                    </div>
                    
                    {/* Registration Details */}
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                      <h4 className="font-medium text-primary mb-2">📱 Registration Details</h4>
                      <div className="text-sm text-primary space-y-1">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-medium text-primary">✅ Registered</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Storage:</span>
                          <span className="font-medium">Permanent</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Device ID:</span>
                          <span className="font-mono text-xs">
                            {verificationResult.data?.hash?.value ? 
                              verificationResult.data.hash.value.substring(0, 12) + '...' : 
                              'N/A'
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* Debug Info (only show if localStorage has debug flag) */}
                      {localStorage.getItem('debugMode') === 'true' && (
                        <div className="mt-3 pt-3 border-t border-primary/40">
                          <h5 className="font-medium text-primary mb-1">🔧 Debug Info</h5>
                          <div className="text-xs text-primary space-y-1">
                            <div>LocalStorage: {localStorage.getItem('deviceRegistered') ? '✅' : '❌'}</div>
                            <div>SessionStorage: {sessionStorage.getItem('deviceRegistered') ? '✅' : '❌'}</div>
                            <button
                              onClick={() => {
                                localStorage.removeItem('staffHash');
                                localStorage.removeItem('staffUserId');
                                localStorage.removeItem('deviceRegistered');
                                sessionStorage.removeItem('staffHash');
                                sessionStorage.removeItem('staffUserId');
                                sessionStorage.removeItem('deviceRegistered');
                                window.location.reload();
                              }}
                              className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded hover:bg-destructive/30"
                            >
                              Clear Registration (Test)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Check-in/Check-out Button */}
            {!verificationResult && (browserHash || canVerify()) && (
              <button
                onClick={handleVerification}
                disabled={isVerifying}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isVerifying ? 'Verifying...' : 'Verify QR Code'}
              </button>
            )}

            {/* Debug Verification Button - Show when no valid hash is available */}
            {!verificationResult && shouldShowDebugButton() && (
              <button
                onClick={() => {
                  console.log('🔧 Manual verification trigger');
                  const storedHash = localStorage.getItem('staffHash');
                  const storedUser = localStorage.getItem('staffUserId');
                  console.log('Manual check - Stored hash:', storedHash ? storedHash.substring(0, 20) + '...' : 'none');
                  console.log('Manual check - Stored user:', storedUser);
                  console.log('Manual check - Current user:', userId);
                  console.log('Manual check - Browser hash state:', browserHash);
                  
                  if (storedHash && storedUser === userId) {
                    setBrowserHash(storedHash);
                    setStoredUserId(storedUser);
                    toast.success('Hash loaded manually. Try verification again.');
                  } else {
                    toast.error('No valid stored hash found for this user.');
                  }
                }}
                className="w-full bg-accent text-primary-foreground py-3 px-4 rounded-lg hover:bg-accent transition-colors"
              >
                🔧 Debug: Load Stored Hash
              </button>
            )}

            {/* Retry Button for Failed Mobile Requests */}
            {verificationResult && !verificationResult.success && isMobile && (
              <button
                onClick={() => {
                  setVerificationResult(null);
                  if (hashType === 'staff-registration') {
                    handleStaffRegistration();
                  } else {
                    handleVerification();
                  }
                }}
                className="w-full bg-accent text-primary-foreground py-3 px-4 rounded-lg hover:bg-accent transition-colors"
              >
                📱 Retry on Mobile
              </button>
            )}

            {/* Verification Result Success Display */}
            {verificationResult?.success && (
              <div className="space-y-3">
                {/* Staff Registration Success Display */}
                {hashType === 'staff-registration' && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                    <div className="flex items-center text-primary mb-3">
                      <SmallCheckIcon />
                      <span className="text-lg font-medium ml-2">✅ Device Registration Successful!</span>
                    </div>
                    <div className="text-sm text-primary space-y-2">
                      <p><strong>Device Status:</strong> Registered and ready for use</p>
                      <p><strong>Registration Date:</strong> {new Date().toLocaleString()}</p>
                      <p><strong>Next Step:</strong> You can now use this device for check-in/check-out operations</p>
                    </div>
                    <div className="mt-4 p-3 bg-primary/20 rounded border border-primary/40">
                      <p className="text-xs text-primary font-medium">
                        💡 <strong>Tip:</strong> The staff management area will automatically update to show "Registered" status within 30 seconds.
                      </p>
                    </div>
                  </div>
                )}

                {/* Simple Attendance Status Display */}
                {verificationResult.data?.currentStatus && hashType !== 'staff-registration' && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className={`w-4 h-4 rounded-full mr-3 ${
                        (() => {
                          const currentStatus = verificationResult.data.currentStatus;
                          const status = currentStatus.status || currentStatus.currentStatus?.status;
                          if (status === 'checked-in' || status === 'clocked_in') {
                            return 'bg-primary';
                          } else if (status === 'checked-out' || status === 'clocked_out') {
                            return 'bg-muted/50';
                          } else {
                            return 'bg-accent/50';
                          }
                        })()
                      }`}></div>
                      <span className="font-semibold text-primary text-lg">
                        {(() => {
                          // Handle nested status object structure
                          const currentStatus = verificationResult.data.currentStatus;
                          const status = currentStatus.status || currentStatus.currentStatus?.status;
                          console.log('🔍 [VerifyQR] Display logic - status:', status);
                          console.log('🔍 [VerifyQR] Full currentStatus object:', currentStatus);
                          
                          if (status === 'checked-in' || status === 'clocked_in') {
                            return 'Checked In';
                          } else if (status === 'checked-out' || status === 'clocked_out') {
                            return 'Checked Out';
                          } else {
                            return `Status: ${status || 'undefined'}`;
                          }
                        })()}
                      </span>
                    </div>
                    
                    {/* Debug info for troubleshooting */}
                    <div className="text-xs text-muted-foreground mt-2">
                      Debug: Status = {JSON.stringify(verificationResult.data.currentStatus.status)}<br/>
                      Full Status Object = {JSON.stringify(verificationResult.data.currentStatus, null, 2)}
                    </div>

                    {/* Check-in Time Display */}
                    {(verificationResult.data.currentStatus.checkInTime || verificationResult.data.currentStatus.currentStatus?.checkInTime) && (
                      <p className="text-sm text-primary">
                        Checked in at {new Date(verificationResult.data.currentStatus.checkInTime || verificationResult.data.currentStatus.currentStatus?.checkInTime).toLocaleTimeString()}
                          </p>
                        )}
                  </div>
                )}

                {/* Simplified Done Button */}
                <button
                  onClick={() => window.close()}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all"
                >
                  ✅ Done
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Close Buttons and Instructions */}
        <div className="space-y-6">
          <div className="space-y-3">
            <button
              onClick={() => window.close()}
              className="w-full bg-gray-200 text-gray-900 py-4 px-6 rounded-xl font-semibold text-base hover:bg-gray-300 transition-all"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VerifyQR;


