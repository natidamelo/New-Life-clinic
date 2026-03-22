import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Clock, Users, AlertTriangle, CheckCircle, Play, Square } from 'lucide-react';

interface OvertimeTransition {
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
  timesheetId: string;
  clockInTime: string;
  clockOutTime: string;
  totalWorkHours: number;
  dayAttendanceStatus: string;
  automaticReason: string;
  overtimeTransition: any;
}

interface SystemStatus {
  isOvertimeTime: boolean;
  hasRegularHoursEnded: boolean;
  timeUntilOvertime: number;
  currentTime: string;
  overtimeStartTime: string;
  overtimeEndTime: string;
  regularEndTime: string;
}

const AutomaticOvertimeControl: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [transitions, setTransitions] = useState<OvertimeTransition[]>([]);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch system status and transitions
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch system status
      const statusResponse = await fetch('/api/automatic-overtime/system-status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData.data);
      }

      // Fetch today's transitions
      const transitionsResponse = await fetch('/api/automatic-overtime/transitions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`
        }
      });
      if (transitionsResponse.ok) {
        const transitionsData = await transitionsResponse.json();
        setTransitions(transitionsData.data.transitions || []);
      }
    } catch (error) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Process automatic overtime transition
  const processTransition = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/automatic-overtime/process-transition', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Successfully processed ${data.data.processedCount} timesheets`);
        setLastProcessed(new Date().toLocaleString());
        
        // Refresh data
        setTimeout(fetchData, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to process transition');
      }
    } catch (error) {
      setError('Failed to process transition');
      console.error('Error processing transition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test transition for a specific user
  const testTransition = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/automatic-overtime/test-transition', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testUserId: userId })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Test transition completed: ${data.message}`);
        
        // Refresh data
        setTimeout(fetchData, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to test transition');
      }
    } catch (error) {
      setError('Failed to test transition');
      console.error('Error testing transition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeUntilOvertime = (minutes: number) => {
    if (minutes > 0) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    } else if (minutes < 0) {
      const hours = Math.floor(Math.abs(minutes) / 60);
      const mins = Math.abs(minutes) % 60;
      return `${hours}h ${mins}m ago`;
    }
    return 'Now';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Automatic Overtime Control</h2>
        <Button 
          onClick={processTransition} 
          disabled={isLoading || !systemStatus?.hasRegularHoursEnded}
          className="flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Process Transition
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {systemStatus.isOvertimeTime ? (
                    <Badge variant="default" className="bg-primary">Overtime</Badge>
                  ) : (
                    <Badge variant="secondary">Regular Hours</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Current Status</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {systemStatus.hasRegularHoursEnded ? (
                    <Badge variant="default" className="bg-primary">Ended</Badge>
                  ) : (
                    <Badge variant="outline">In Progress</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Regular Hours</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatTimeUntilOvertime(systemStatus.timeUntilOvertime)}
                </div>
                <div className="text-sm text-muted-foreground">Until Overtime</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {new Date(systemStatus.currentTime).toLocaleTimeString()}
                </div>
                <div className="text-sm text-muted-foreground">Current Time</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">Loading system status...</div>
          )}
        </CardContent>
      </Card>

      {/* Today's Transitions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Today's Automatic Transitions ({transitions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transitions.length > 0 ? (
            <div className="space-y-4">
              {transitions.map((transition, index) => (
                <div key={transition.timesheetId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">
                      {transition.user.firstName} {transition.user.lastName}
                    </div>
                    <Badge variant="outline">{transition.user.role}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Clock In</div>
                      <div>{new Date(transition.clockInTime).toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Clock Out</div>
                      <div>{new Date(transition.clockOutTime).toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Work Hours</div>
                      <div>{transition.totalWorkHours}h</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <Badge variant="secondary">{transition.dayAttendanceStatus}</Badge>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-muted-foreground">
                    {transition.automaticReason}
                  </div>
                  
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testTransition(transition.userId)}
                      disabled={isLoading}
                    >
                      Test Transition
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No automatic transitions today
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Processed */}
      {lastProcessed && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Last processed: {lastProcessed}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutomaticOvertimeControl;
