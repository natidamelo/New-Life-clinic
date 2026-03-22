import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import {
  generateWoundCareSchedule,
  updateSessionStatus,
  rescheduleSession,
  formatScheduleDate,
  formatScheduleTime,
  getFrequencyDisplayName,
  getSessionTypeColor,
  getStatusColor,
  getPriorityColor,
  getStatusIcon,
  type WoundCareSchedule as ScheduleType,
  type WoundCareSession
} from '../utils/scheduleGenerator';

interface WoundCareScheduleProps {
  patientName: string;
  frequency: string;
  duration: number;
  startDate?: Date;
  procedureId?: string;
  className?: string;
  onSessionComplete?: (sessionId: string, notes?: string) => void;
  onSessionMiss?: (sessionId: string, reason?: string) => void;
  onSessionReschedule?: (sessionId: string, newDate: Date, newTime: string) => void;
  onCreateFollowUp?: (frequency: string, duration: number, startDate: Date) => void;
}

export default function WoundCareSchedule({
  patientName,
  frequency,
  duration,
  startDate = new Date(),
  procedureId,
  className = '',
  onSessionComplete,
  onSessionMiss,
  onSessionReschedule,
  onCreateFollowUp
}: WoundCareScheduleProps) {
  const [schedule, setSchedule] = useState<ScheduleType | null>(null);
  const [selectedSession, setSelectedSession] = useState<WoundCareSession | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate schedule on component mount or when props change
  useEffect(() => {
    const newSchedule = generateWoundCareSchedule(
      patientName,
      frequency,
      duration,
      startDate
    );
    setSchedule(newSchedule);
  }, [patientName, frequency, duration, startDate]);

  if (!schedule) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Generating schedule...</span>
      </div>
    );
  }

  const handleSessionAction = async (sessionId: string, action: 'complete' | 'miss' | 'reschedule') => {
    setIsLoading(true);
    
    try {
      let updatedSchedule = schedule;
      
      switch (action) {
        case 'complete':
          updatedSchedule = updateSessionStatus(schedule, sessionId, 'completed', actionNotes, 'Current User');
          onSessionComplete?.(sessionId, actionNotes);
          toast.success('Session marked as completed!');
          break;
          
        case 'miss':
          updatedSchedule = updateSessionStatus(schedule, sessionId, 'missed', actionNotes);
          onSessionMiss?.(sessionId, actionNotes);
          toast.error('Session marked as missed');
          break;
          
        case 'reschedule':
          if (rescheduleDate && rescheduleTime) {
            const newDate = new Date(rescheduleDate);
            updatedSchedule = rescheduleSession(schedule, sessionId, newDate, rescheduleTime);
            onSessionReschedule?.(sessionId, newDate, rescheduleTime);
            toast.success('Session rescheduled successfully!');
          }
          break;
      }
      
      setSchedule(updatedSchedule);
      setSelectedSession(null);
      setActionNotes('');
      setRescheduleDate('');
      setRescheduleTime('');
      
    } catch (error) {
      toast.error('Failed to update session');
      console.error('Session action error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-primary';
    if (progress >= 60) return 'text-primary';
    if (progress >= 40) return 'text-accent-foreground';
    return 'text-destructive';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return 'bg-primary';
    if (progress >= 60) return 'bg-primary';
    if (progress >= 40) return 'bg-accent';
    return 'bg-destructive';
  };

  const sessionsToShow = showAllSessions ? schedule.sessions : schedule.upcomingSessions;

  return (
    <div className={`w-full ${className}`}>
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-primary-foreground/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary-foreground/20 rounded-lg">
                <CalendarIcon className="h-6 w-6" />
              </div>
              Wound Care Schedule
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-white/30 ml-auto">
                {getFrequencyDisplayName(frequency)}
              </Badge>
            </CardTitle>
            
            {/* Treatment Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div className="bg-primary-foreground/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-primary/20 font-medium">Patient</div>
                <div className="font-semibold">{patientName}</div>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-primary/20 font-medium">Frequency</div>
                <div className="font-semibold">{getFrequencyDisplayName(frequency)}</div>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-primary/20 font-medium">Duration</div>
                <div className="font-semibold">{duration} days</div>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-primary/20 font-medium">Total Sessions</div>
                <div className="font-semibold">{schedule.totalSessions}</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Progress Circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted-foreground/30"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - schedule.progress / 100)}`}
                    className={`${getProgressBgColor(schedule.progress)} transition-all duration-500`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getProgressColor(schedule.progress)}`}>
                    {schedule.progress}%
                  </span>
                </div>
              </div>
              <span className="mt-2 text-sm font-medium text-muted-foreground">Overall Progress</span>
            </div>

            {/* Statistics Cards */}
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-primary">{schedule.completedSessions}</div>
                  <div className="text-sm text-primary">Completed</div>
                </div>
              </div>
            </div>

            <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/30">
              <div className="flex items-center gap-3">
                <XCircleIcon className="h-8 w-8 text-destructive" />
                <div>
                  <div className="text-2xl font-bold text-destructive">{schedule.missedSessions}</div>
                  <div className="text-sm text-destructive">Missed</div>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-primary">{schedule.upcomingSessions.length}</div>
                  <div className="text-sm text-primary">Remaining</div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Session Highlight */}
          {schedule.nextSession && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200 mb-8 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-accent-foreground mb-2 flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    Next Session
                  </h3>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-accent-foreground">
                      {formatScheduleDate(schedule.nextSession.date)} at {formatScheduleTime(schedule.nextSession.time)}
                    </p>
                    <div className="flex gap-2">
                      <Badge className={getSessionTypeColor(schedule.nextSession.type)}>
                        {schedule.nextSession.type}
                      </Badge>
                      <Badge className={getPriorityColor(schedule.nextSession.priority)}>
                        {schedule.nextSession.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="default"
                        onClick={() => setSelectedSession(schedule.nextSession!)}
                        className="bg-primary hover:bg-primary text-primary-foreground shadow-lg whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    </DialogTrigger>
                    <SessionActionDialog
                      session={schedule.nextSession}
                      action="complete"
                      onConfirm={(notes) => handleSessionAction(schedule.nextSession!.id, 'complete')}
                      actionNotes={actionNotes}
                      setActionNotes={setActionNotes}
                      isLoading={isLoading}
                    />
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="default"
                        onClick={() => setSelectedSession(schedule.nextSession!)}
                        className="bg-[hsl(var(--status-error))] hover:bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] shadow-lg whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium wound-care-button"
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Miss
                      </Button>
                    </DialogTrigger>
                    <SessionActionDialog
                      session={schedule.nextSession}
                      action="miss"
                      onConfirm={(notes) => handleSessionAction(schedule.nextSession!.id, 'miss')}
                      actionNotes={actionNotes}
                      setActionNotes={setActionNotes}
                      isLoading={isLoading}
                    />
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="default"
                        onClick={() => setSelectedSession(schedule.nextSession!)}
                        className="bg-[hsl(var(--status-warning))] hover:bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] shadow-lg whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium wound-care-button"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Reschedule
                      </Button>
                    </DialogTrigger>
                    <RescheduleDialog
                      session={schedule.nextSession}
                      onConfirm={() => handleSessionAction(schedule.nextSession!.id, 'reschedule')}
                      rescheduleDate={rescheduleDate}
                      setRescheduleDate={setRescheduleDate}
                      rescheduleTime={rescheduleTime}
                      setRescheduleTime={setRescheduleTime}
                      isLoading={isLoading}
                    />
                  </Dialog>
                </div>
              </div>
            </div>
          )}

          {/* Sessions List */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-muted-foreground">
                {showAllSessions ? 'All Sessions' : 'Upcoming Sessions'}
              </h3>
              <Button
                variant="ghost"
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="text-primary hover:text-primary"
              >
                {showAllSessions ? 'Show Upcoming Only' : 'Show All Sessions'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionsToShow.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onComplete={(notes) => handleSessionAction(session.id, 'complete')}
                  onMiss={(reason) => handleSessionAction(session.id, 'miss')}
                  onReschedule={() => setSelectedSession(session)}
                  isLoading={isLoading}
                />
              ))}
            </div>

            {sessionsToShow.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-lg">No sessions to display</p>
              </div>
            )}
          </div>

          {/* Create Follow-up Button */}
          {onCreateFollowUp && (
            <div className="mt-8 pt-6 border-t border-border/30">
              <Button
                onClick={() => onCreateFollowUp(frequency, duration, new Date())}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-primary-foreground shadow-lg"
              >
                Create Follow-up Treatment Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Session Card Component
function SessionCard({
  session,
  onComplete,
  onMiss,
  onReschedule,
  isLoading
}: {
  session: WoundCareSession;
  onComplete: (notes?: string) => void;
  onMiss: (reason?: string) => void;
  onReschedule: () => void;
  isLoading: boolean;
}) {
  return (
    <Card className={`${getStatusColor(session.status)} border-2 hover:shadow-lg transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(session.status)}</span>
            <div>
              <p className="font-semibold text-sm">
                {formatScheduleDate(session.date)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatScheduleTime(session.time)}
              </p>
            </div>
          </div>
          <Badge className="text-xs">
            Session #{session.sessionNumber}
          </Badge>
        </div>

        <div className="flex gap-2 mb-3">
          <Badge className={`${getSessionTypeColor(session.type)} text-xs`}>
            {session.type}
          </Badge>
          <Badge className={`${getPriorityColor(session.priority)} text-xs`}>
            {session.priority}
          </Badge>
        </div>

        {session.notes && (
          <p className="text-xs text-muted-foreground mb-3 italic">"{session.notes}"</p>
        )}

        {session.status === 'scheduled' && (
          <div className="flex gap-1">
            <Button
              size="default"
              onClick={() => onComplete()}
              disabled={isLoading}
              className="bg-primary hover:bg-primary text-primary-foreground flex-1 whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
            >
              ✓
            </Button>
            <Button
              size="default"
              onClick={() => onMiss()}
              disabled={isLoading}
              className="bg-[hsl(var(--status-error))] hover:bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] flex-1 whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium wound-care-button"
            >
              ✗
            </Button>
            <Button
              size="default"
              onClick={onReschedule}
              disabled={isLoading}
              className="bg-[hsl(var(--status-warning))] hover:bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium wound-care-button"
            >
              🔄
            </Button>
          </div>
        )}

        {session.completedBy && session.completedAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            Completed by {session.completedBy} on {formatScheduleDate(session.completedAt)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Session Action Dialog Component
function SessionActionDialog({
  session,
  action,
  onConfirm,
  actionNotes,
  setActionNotes,
  isLoading
}: {
  session: WoundCareSession;
  action: 'complete' | 'miss';
  onConfirm: (notes?: string) => void;
  actionNotes: string;
  setActionNotes: (notes: string) => void;
  isLoading: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {action === 'complete' ? 'Complete Session' : 'Mark as Missed'}
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Session: {formatScheduleDate(session.date)} at {formatScheduleTime(session.time)}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            {action === 'complete' ? 'Session Notes' : 'Reason for Missing'}
          </label>
          <Textarea
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder={action === 'complete' 
              ? 'Add any notes about the session...' 
              : 'Why was this session missed?'
            }
            rows={3}
          />
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(actionNotes)}
            disabled={isLoading}
            className={action === 'complete' ? 'bg-primary hover:bg-primary' : 'bg-destructive hover:bg-destructive'}
          >
            {isLoading ? 'Processing...' : `Mark as ${action === 'complete' ? 'Complete' : 'Missed'}`}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// Reschedule Dialog Component
function RescheduleDialog({
  session,
  onConfirm,
  rescheduleDate,
  setRescheduleDate,
  rescheduleTime,
  setRescheduleTime,
  isLoading
}: {
  session: WoundCareSession;
  onConfirm: () => void;
  rescheduleDate: string;
  setRescheduleDate: (date: string) => void;
  rescheduleTime: string;
  setRescheduleTime: (time: string) => void;
  isLoading: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Reschedule Session</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Current: {formatScheduleDate(session.date)} at {formatScheduleTime(session.time)}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">New Date</label>
          <Input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">New Time</label>
          <Input
            type="time"
            value={rescheduleTime}
            onChange={(e) => setRescheduleTime(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isLoading || !rescheduleDate || !rescheduleTime}
            className="bg-primary hover:bg-primary"
          >
            {isLoading ? 'Rescheduling...' : 'Reschedule Session'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
