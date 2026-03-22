import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

interface AttendanceStatus {
  status: string;
  clockedIn: boolean;
  isOvertimeActive: boolean;
  isOvertimeCompleted: boolean;
  overtimeTimesheet?: {
    hasClockIn: boolean;
    hasClockOut: boolean;
    clockInTime?: string;
    clockOutTime?: string;
    overtimeHours: number;
  };
  lastActivity?: string;
  canCheckIn?: boolean;
  canCheckOut?: boolean;
}

export const useAttendanceStatus = () => {
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceStatus = async () => {
    if (!user) {
      setAttendanceStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use the centralized API service with proper endpoint
      const response = await apiService.get('/api/attendance/my-status');

      console.log('🔍 [useAttendanceStatus] Attendance service response:', response.data);
      
      if (response.data.success && response.data.data) {
        setAttendanceStatus(response.data.data);
        return;
      }

      // Fallback to QR status endpoint
      const qrResponse = await apiService.get('/api/qr/current-status');

      const qrData = qrResponse.data;
        console.log('🔍 [useAttendanceStatus] QR status response:', qrData);
        
        if (qrData.success && qrData.data) {
          // Convert QR status format to attendance status format
          const status = qrData.data.status;
          const convertedStatus: AttendanceStatus = {
            status: status,
            clockedIn: status === 'clocked_in' || status === 'checked-in' || status === 'active' || status === 'present',
            isOvertimeActive: status === 'overtime_active',
            isOvertimeCompleted: status === 'overtime_completed',
            canCheckIn: qrData.data.canCheckIn,
            canCheckOut: qrData.data.canCheckOut,
            lastActivity: qrData.data.checkInTime || qrData.data.checkOutTime
          };
          setAttendanceStatus(convertedStatus);
          return;
        }

      // Default status if no data found
      setAttendanceStatus({
        status: 'absent',
        clockedIn: false,
        isOvertimeActive: false,
        isOvertimeCompleted: false,
        canCheckIn: true,
        canCheckOut: false
      });

    } catch (err) {
      console.error('Error fetching attendance status:', err);
      
      // Handle authentication errors gracefully
      if (err instanceof Error && err.message.includes('401')) {
        console.warn('Authentication required for attendance status - using default status');
        setError('Authentication required');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch attendance status');
      }
      
      setAttendanceStatus({
        status: 'absent',
        clockedIn: false,
        isOvertimeActive: false,
        isOvertimeCompleted: false,
        canCheckIn: true,
        canCheckOut: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch status on mount and when user changes
  useEffect(() => {
    fetchAttendanceStatus();
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchAttendanceStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return {
    attendanceStatus,
    isLoading,
    error,
    refetch: fetchAttendanceStatus
  };
};
