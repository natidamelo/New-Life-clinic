import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Clock, Coffee, Calendar, User, CheckCircle, XCircle } from 'lucide-react';
import { Timesheet } from '../../services/timesheetService';
import timesheetService from '../../services/timesheetService';

interface TimesheetCardProps {
  timesheet: Timesheet;
  onApprove?: (timesheetId: string) => void;
  onReject?: (timesheetId: string) => void;
  showActions?: boolean;
  className?: string;
}

const TimesheetCard: React.FC<TimesheetCardProps> = ({
  timesheet,
  onApprove,
  onReject,
  showActions = false,
  className = ''
}) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateTotalBreakTime = () => {
    return timesheet.breaks.reduce((total, break_) => {
      if (break_.endTime && break_.duration) {
        return total + break_.duration;
      }
      return total;
    }, 0);
  };

  const getStatusIcon = () => {
    switch (timesheet.status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'completed':
        return <Clock className="h-4 w-4 text-accent-foreground" />;
      case 'active':
        return <Clock className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBreakTypeIcon = (type: string) => {
    switch (type) {
      case 'lunch':
        return <Coffee className="h-3 w-3" />;
      case 'coffee':
        return <Coffee className="h-3 w-3" />;
      case 'personal':
        return <User className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Card className={`${className} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">
              {formatDate(timesheet.date)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge 
              variant="outline" 
              className={timesheetService.getStatusColor(timesheet.status)}
            >
              {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Clock In/Out Times */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Clock In</span>
            </div>
            <div className="font-medium">
              {formatTime(timesheet.clockIn.time)}
            </div>
            <div className="text-xs text-muted-foreground">
              {timesheet.clockIn.location}
            </div>
          </div>
          
          {timesheet.clockOut && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Clock Out</span>
              </div>
              <div className="font-medium">
                {formatTime(timesheet.clockOut.time)}
              </div>
              <div className="text-xs text-muted-foreground">
                {timesheet.clockOut.location}
              </div>
            </div>
          )}
        </div>

        {/* Work Hours Summary */}
        <div className="bg-muted/10 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Hours</div>
              <div className="font-semibold text-lg">
                {timesheet.totalWorkHours.toFixed(1)}h
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Break Time</div>
              <div className="font-semibold text-lg">
                {timesheet.totalBreakHours.toFixed(1)}h
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Net Hours</div>
              <div className="font-semibold text-lg text-primary">
                {(timesheet.totalWorkHours - timesheet.totalBreakHours).toFixed(1)}h
              </div>
            </div>
          </div>
        </div>

        {/* Breaks */}
        {timesheet.breaks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Breaks</div>
            <div className="space-y-1">
              {timesheet.breaks.map((break_, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getBreakTypeIcon(break_.type)}
                    <span className="capitalize">{break_.type}</span>
                    <Badge 
                      variant="outline" 
                      className={timesheetService.getBreakTypeColor(break_.type)}
                    >
                      {break_.startTime && formatTime(break_.startTime)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {break_.endTime 
                      ? timesheetService.calculateDuration(break_.startTime, break_.endTime)
                      : 'In Progress'
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Department and Notes */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Department:</span>
            <Badge variant="secondary">{timesheet.department}</Badge>
          </div>
          {timesheet.shift && timesheet.shift !== 'flexible' && (
            <Badge variant="outline" className="capitalize">
              {timesheet.shift} Shift
            </Badge>
          )}
        </div>

        {timesheet.notes && (
          <div className="text-sm">
            <div className="text-muted-foreground mb-1">Notes:</div>
            <div className="bg-muted/10 rounded p-2 text-muted-foreground">
              {timesheet.notes}
            </div>
          </div>
        )}

        {/* Approval Actions */}
        {showActions && timesheet.status === 'completed' && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              className="flex-1 bg-primary hover:bg-primary"
              onClick={() => onApprove?.(timesheet._id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => onReject?.(timesheet._id)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {/* Approval Info */}
        {timesheet.approvedBy && timesheet.approvedAt && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Approved by {timesheet.approvedBy} on {formatDate(timesheet.approvedAt)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimesheetCard; 