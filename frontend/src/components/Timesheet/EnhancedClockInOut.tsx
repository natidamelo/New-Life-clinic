import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import staffService from '../../services/staffService';
import EthiopianTimeDisplay from '../EthiopianTimeDisplay';

interface EnhancedClockInOutProps {
  className?: string;
}

interface AttendanceStatus {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out';
  clockInTime: string | null;
  clockOutTime: string | null;
  attendanceStatus: string;
  minutesLate: number;
  minutesEarly: number;
  dayAttendanceStatus: string;
}

const EnhancedClockInOut: React.FC<EnhancedClockInOutProps> = ({ className = '' }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await staffService.getMyStatus();
      setAttendanceStatus(response);
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      setIsLoading(true);
      const response = await staffService.clockIn('Main Office', 'system');
      
      toast({
        title: response.attendanceStatus === 'late' ? 'Clock In Recorded (Late)' : 'Successfully Clocked In',
        description: response.message,
        variant: response.attendanceStatus === 'late' ? 'destructive' : 'default',
      });
      
      await loadStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to clock in",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setIsLoading(true);
      const response = await staffService.clockOut('Main Office', 'system');
      
      toast({
        title: response.isEarlyClockOut ? 'Clock Out Recorded (Early)' : 'Successfully Clocked Out',
        description: response.message,
        variant: response.isEarlyClockOut ? 'destructive' : 'default',
      });
      
      await loadStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to clock out",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!attendanceStatus) return <Clock className="h-5 w-5 text-muted-foreground/50" />;
    
    switch (attendanceStatus.status) {
      case 'clocked_in':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'clocked_out':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground/50" />;
    }
  };

  const getStatusText = () => {
    if (!attendanceStatus) return 'Not Clocked In';
    
    switch (attendanceStatus.status) {
      case 'clocked_in':
        return 'Currently Working';
      case 'clocked_out':
        return 'Work Day Complete';
      default:
        return 'Not Clocked In';
    }
  };

  const getAttendanceBadge = () => {
    if (!attendanceStatus) return null;
    
    const status = attendanceStatus.dayAttendanceStatus;
    const variant = staffService.getAttendanceStatusBadge(status) as any;
    
    return (
      <Badge variant={variant} className="ml-2">
        {status === 'present' && 'Present'}
        {status === 'late' && 'Late'}
        {status === 'absent' && 'Absent'}
        {status === 'early-clock-out' && 'Early Clock Out'}
        {status === 'partial' && 'Partial'}
      </Badge>
    );
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A';
    return staffService.formatEthiopianTime(timeString);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Staff Attendance</span>
          </div>
          <EthiopianTimeDisplay />
        </CardTitle>
        <CardDescription>
          Clock in and out with automatic attendance tracking
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <div className="font-medium">{getStatusText()}</div>
              <div className="text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName} • {user?.role}
              </div>
            </div>
          </div>
          {getAttendanceBadge()}
        </div>

        {/* Clock In/Out Times */}
        {attendanceStatus && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Clock In Time</div>
              <div className="text-sm text-muted-foreground">
                {formatTime(attendanceStatus.clockInTime)}
              </div>
                             {attendanceStatus.minutesLate > 0 && (
                 <div className="flex items-center space-x-1 text-accent-foreground">
                   <AlertTriangle className="h-3 w-3" />
                   <span className="text-xs">{staffService.formatMinutesToHoursAndMinutes(attendanceStatus.minutesLate)} late</span>
                 </div>
               )}
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Clock Out Time</div>
              <div className="text-sm text-muted-foreground">
                {formatTime(attendanceStatus.clockOutTime)}
              </div>
                             {attendanceStatus.minutesEarly > 0 && (
                 <div className="flex items-center space-x-1 text-accent-foreground">
                   <AlertTriangle className="h-3 w-3" />
                   <span className="text-xs">{staffService.formatMinutesToHoursAndMinutes(attendanceStatus.minutesEarly)} early</span>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Working Hours Info */}
        <div className="p-3 bg-primary/10 rounded-lg">
          <div className="text-sm font-medium text-primary">Working Hours (Local Time)</div>
          <div className="text-sm text-primary">8:30 AM - 5:00 PM (15 min grace period)</div>
          <div className="text-xs text-primary mt-1">Early check-out threshold: 11:00 AM</div>
                     <div className="text-xs text-primary">Overtime: 5:00 PM - 1:30 AM</div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {(!attendanceStatus || attendanceStatus.status === 'not_clocked_in') && (
            <Button 
              onClick={handleClockIn} 
              disabled={isLoading}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Clock In
            </Button>
          )}
          
          {attendanceStatus?.status === 'clocked_in' && (
            <Button 
              onClick={handleClockOut} 
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Clock Out
            </Button>
          )}
          
          {attendanceStatus?.status === 'clocked_out' && (
            <div className="flex-1 text-center text-sm text-muted-foreground">
              Work day completed
            </div>
          )}
        </div>

        {/* Current Time */}
        <div className="text-center text-sm text-muted-foreground">
          Current Time: {currentTime.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedClockInOut;
