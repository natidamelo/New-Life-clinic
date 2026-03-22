import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  Clock, 
  Coffee, 
  User, 
  Play, 
  Square, 
  Pause, 
  RotateCcw,
  MapPin,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import timesheetService, { Timesheet } from '../../services/timesheetService';
import staffService from '../../services/staffService';

const ClockInOut: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [todayTimesheet, setTodayTimesheet] = useState<Timesheet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadTodayTimesheet();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayTimesheet = async () => {
    try {
      const timesheet = await timesheetService.getTodayTimesheet();
      setTodayTimesheet(timesheet);
    } catch (error) {
      console.error('Error loading today\'s timesheet:', error);
      // If no timesheet exists for today, that's fine
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
      await loadTodayTimesheet();
      setNotes('');
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
      await loadTodayTimesheet();
      setNotes('');
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

  const handleStartBreak = async (type: string = 'lunch') => {
    try {
      setIsLoading(true);
      await timesheetService.startBreak({ type });
      toast({
        title: "Break Started",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} break started`,
      });
      await loadTodayTimesheet();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to start break",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setIsLoading(true);
      await timesheetService.endBreak();
      toast({
        title: "Break Ended",
        description: "Break ended successfully",
      });
      await loadTodayTimesheet();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to end break",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveBreak = () => {
    if (!todayTimesheet) return null;
    return todayTimesheet.breaks.find(break_ => !break_.endTime);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateWorkDuration = () => {
    if (!todayTimesheet?.clockIn.time) return '0h 0m';
    
    const startTime = new Date(todayTimesheet.clockIn.time);
    const endTime = todayTimesheet.clockOut?.time ? new Date(todayTimesheet.clockOut.time) : currentTime;
    
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const calculateBreakDuration = (startTime: string) => {
    const start = new Date(startTime);
    const end = currentTime;
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const isClockedIn = todayTimesheet?.status === 'active';
  const isClockedOut = todayTimesheet?.clockOut?.time;
  const activeBreak = getActiveBreak();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Time Display */}
          <div className="text-center mb-6">
            <div className="text-4xl font-mono font-bold text-muted-foreground">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </div>
            <div className="text-lg text-muted-foreground mt-2">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          {/* Status Display */}
          <div className="flex items-center justify-center mb-6">
            {!todayTimesheet ? (
              <Badge variant="outline" className="text-lg px-4 py-2">
                <AlertCircle className="h-4 w-4 mr-2" />
                Not Clocked In
              </Badge>
            ) : isClockedIn ? (
              <Badge className="bg-primary/20 text-primary text-lg px-4 py-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Clocked In
              </Badge>
            ) : (
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Square className="h-4 w-4 mr-2" />
                Clocked Out
              </Badge>
            )}
          </div>

          {/* Clock In/Out Times */}
          {todayTimesheet && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Clock In</div>
                <div className="font-semibold text-lg">
                  {formatTime(todayTimesheet.clockIn.time)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {todayTimesheet.clockIn.location}
                </div>
              </div>
              
              {todayTimesheet.clockOut && (
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Clock Out</div>
                  <div className="font-semibold text-lg">
                    {formatTime(todayTimesheet.clockOut.time)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {todayTimesheet.clockOut.location}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Work Duration */}
          {isClockedIn && (
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground mb-1">Work Duration</div>
              <div className="text-2xl font-bold text-primary">
                {calculateWorkDuration()}
              </div>
            </div>
          )}

          {/* Active Break */}
          {activeBreak && (
            <div className="bg-accent/10 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee className="h-4 w-4 text-accent-foreground" />
                    <span className="font-medium text-accent-foreground">
                      On {activeBreak.type} break
                    </span>
                  </div>
                  <div className="text-sm text-accent-foreground">
                    Started at {formatTime(activeBreak.startTime)}
                  </div>
                  <div className="text-sm text-accent-foreground">
                    Duration: {calculateBreakDuration(activeBreak.startTime)}
                  </div>
                </div>
                <Button
                  onClick={handleEndBreak}
                  disabled={isLoading}
                  className="bg-accent hover:bg-accent"
                >
                  <Square className="h-4 w-4 mr-1" />
                  End Break
                </Button>
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your work day..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!todayTimesheet ? (
              <Button
                onClick={handleClockIn}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary h-12 text-lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Clock In
              </Button>
            ) : isClockedIn ? (
              <div className="space-y-3">
                <Button
                  onClick={handleClockOut}
                  disabled={isLoading}
                  className="w-full bg-destructive hover:bg-destructive h-12 text-lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Clock Out
                </Button>
                
                {!activeBreak && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleStartBreak('lunch')}
                      disabled={isLoading}
                      variant="outline"
                      className="h-10"
                    >
                      <Coffee className="h-4 w-4 mr-1" />
                      Lunch Break
                    </Button>
                    <Button
                      onClick={() => handleStartBreak('coffee')}
                      disabled={isLoading}
                      variant="outline"
                      className="h-10"
                    >
                      <Coffee className="h-4 w-4 mr-1" />
                      Coffee Break
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p>You have completed your work day!</p>
                <p className="text-sm mt-1">
                  Total work time: {calculateWorkDuration()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      {todayTimesheet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant="outline" 
                  className={timesheetService.getStatusColor(todayTimesheet.status)}
                >
                  {todayTimesheet.status.charAt(0).toUpperCase() + todayTimesheet.status.slice(1)}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{todayTimesheet.department}</span>
              </div>
              
              {todayTimesheet.breaks.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-2">Breaks:</div>
                  <div className="space-y-1">
                    {todayTimesheet.breaks.map((break_, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="capitalize">{break_.type} break</span>
                        <span>
                          {formatTime(break_.startTime)}
                          {break_.endTime && ` - ${formatTime(break_.endTime)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {todayTimesheet.notes && (
                <div>
                  <div className="text-muted-foreground mb-1">Notes:</div>
                  <div className="text-sm bg-muted/10 rounded p-2">
                    {todayTimesheet.notes}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClockInOut; 