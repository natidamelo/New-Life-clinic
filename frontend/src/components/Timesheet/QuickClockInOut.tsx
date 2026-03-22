import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Clock, 
  Play, 
  Square, 
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import staffService from '../../services/staffService';

interface QuickClockInOutProps {
  className?: string;
}

const QuickClockInOut: React.FC<QuickClockInOutProps> = ({ className = '' }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<'not_clocked_in' | 'clocked_in' | 'clocked_out'>('not_clocked_in');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockInTime, setClockInTime] = useState<Date | null>(null);

  useEffect(() => {
    loadStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await staffService.getMyStatus();
      setStatus(response.status);
      if (response.clockInTime) {
        setClockInTime(new Date(response.clockInTime));
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      setIsLoading(true);
      await staffService.clockIn('Main Office', 'system');
      toast({
        title: "Success",
        description: "Successfully clocked in!",
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
      await staffService.clockOut('Main Office', 'system');
      toast({
        title: "Success",
        description: "Successfully clocked out!",
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
    switch (status) {
      case 'clocked_in':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'clocked_out':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-accent-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'clocked_in':
        return 'Clocked In';
      case 'clocked_out':
        return 'Clocked Out';
      default:
        return 'Not Clocked In';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'clocked_in':
        return 'bg-primary/20 text-primary';
      case 'clocked_out':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-accent/20 text-accent-foreground';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateWorkDuration = () => {
    if (!clockInTime || status !== 'clocked_in') return '0h 0m';
    
    const now = new Date();
    const diffMs = now.getTime() - clockInTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Time */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-muted-foreground">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentTime.toLocaleDateString()}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2">
          {getStatusIcon()}
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {/* Clock In Time */}
        {clockInTime && (
          <div className="text-center text-sm text-muted-foreground">
            Clocked in at: {formatTime(clockInTime)}
          </div>
        )}

        {/* Work Duration */}
        {status === 'clocked_in' && (
          <div className="text-center text-sm text-muted-foreground">
            Work duration: {calculateWorkDuration()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status === 'not_clocked_in' && (
            <Button 
              onClick={handleClockIn} 
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Clock In
            </Button>
          )}
          
          {status === 'clocked_in' && (
            <Button 
              onClick={handleClockOut} 
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
              size="sm"
            >
              <Square className="h-4 w-4 mr-1" />
              Clock Out
            </Button>
          )}
          
          {status === 'clocked_out' && (
            <Button 
              onClick={handleClockIn} 
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Clock In Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickClockInOut;
