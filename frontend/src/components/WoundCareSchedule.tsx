import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
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

export interface ExtendedWoundCareSession extends Omit<WoundCareSession, 'status'> {
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  photoUrl?: string;
  photos?: string[];
}

export interface ExtendedWoundCareSchedule {
  id: string;
  patientName: string;
  frequency: 'daily' | 'twice_daily' | 'every_other_day' | 'weekly' | 'as_needed';
  duration: number;
  startDate: Date;
  endDate: Date;
  sessions: ExtendedWoundCareSession[];
  totalSessions: number;
  completedSessions: number;
  missedSessions: number;
  progress: number;
  nextSession?: ExtendedWoundCareSession;
  upcomingSessions: ExtendedWoundCareSession[];
}

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
  const { getToken } = useAuth();
  const [schedule, setSchedule] = useState<ExtendedWoundCareSchedule | null>(null);
  const [selectedSession, setSelectedSession] = useState<ExtendedWoundCareSession | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  
  // Dialog States
  const [actionNotes, setActionNotes] = useState('');
  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live schedule from backend if procedureId is passed
  const fetchLiveSchedule = async () => {
    if (!procedureId) return;
    try {
      setIsLoading(true);
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/api/procedures/${procedureId}/schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSchedule(data);
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to load schedule from database');
      }
    } catch (error: any) {
      console.error('Error fetching live schedule:', error);
      toast.error(`Schedule loading failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate schedule in memory or fetch from API
  useEffect(() => {
    if (procedureId) {
      fetchLiveSchedule();
    } else {
      const newSchedule = generateWoundCareSchedule(
        patientName,
        frequency,
        duration,
        startDate
      );
      // Cast standard schedule to extended schedule format
      setSchedule(newSchedule as unknown as ExtendedWoundCareSchedule);
    }
  }, [patientName, frequency, duration, startDate, procedureId]);

  if (!schedule) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-500 text-sm font-semibold">Generating clinical schedule...</span>
      </div>
    );
  }

  const handleSessionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    try {
      setPhotoUploading(true);
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const uploadFormData = new FormData();
      uploadFormData.append('photo', file);

      const response = await fetch(`${API_BASE_URL}/api/procedures/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      if (response.ok) {
        const data = await response.json();
        setSessionPhotos(prev => [...prev, data.photoUrl]);
        toast.success('Wound photo added successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Session photo upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSessionAction = async (sessionId: string, action: 'complete' | 'miss' | 'reschedule') => {
    setIsLoading(true);
    
    try {
      if (procedureId) {
        // Backend DB updates
        const token = getToken();
        if (!token) throw new Error('No authentication token');

        let url = '';
        let body: any = {};

        if (action === 'complete') {
          url = `${API_BASE_URL}/api/procedures/${procedureId}/session/${sessionId}/status`;
          body = { 
            status: 'completed', 
            notes: actionNotes, 
            completedBy: 'Current Nurse User',
            photos: sessionPhotos 
          };
        } else if (action === 'miss') {
          url = `${API_BASE_URL}/api/procedures/${procedureId}/session/${sessionId}/status`;
          body = { status: 'missed', notes: actionNotes };
        } else if (action === 'reschedule') {
          url = `${API_BASE_URL}/api/procedures/${procedureId}/session/${sessionId}/reschedule`;
          body = { newDate: rescheduleDate, newTime: rescheduleTime };
        }

        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          toast.success(`Session ${action === 'complete' ? 'completed' : action === 'miss' ? 'marked as missed' : 'rescheduled'}!`);
          if (action === 'complete') onSessionComplete?.(sessionId, actionNotes);
          if (action === 'miss') onSessionMiss?.(sessionId, actionNotes);
          if (action === 'reschedule') onSessionReschedule?.(sessionId, new Date(rescheduleDate), rescheduleTime);
          
          // Reload schedule from DB
          await fetchLiveSchedule();
        } else {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to update session');
        }
      } else {
        // Fallback preview mode local mock updates
        let updatedSchedule = schedule as any;
        if (action === 'complete') {
          updatedSchedule = updateSessionStatus(schedule as any, sessionId, 'completed', actionNotes, 'Current User');
          onSessionComplete?.(sessionId, actionNotes);
          toast.success('Session completed in preview mode');
        } else if (action === 'miss') {
          updatedSchedule = updateSessionStatus(schedule as any, sessionId, 'missed', actionNotes);
          onSessionMiss?.(sessionId, actionNotes);
          toast.success('Session marked missed in preview mode');
        } else if (action === 'reschedule') {
          if (rescheduleDate && rescheduleTime) {
            const newDate = new Date(rescheduleDate);
            updatedSchedule = rescheduleSession(schedule as any, sessionId, newDate, rescheduleTime);
            onSessionReschedule?.(sessionId, newDate, rescheduleTime);
            toast.success('Session rescheduled in preview mode');
          }
        }
        setSchedule(updatedSchedule);
      }
      
      setSelectedSession(null);
      setActionNotes('');
      setSessionPhotos([]);
      setRescheduleDate('');
      setRescheduleTime('');
      
    } catch (error: any) {
      toast.error(`Session update failed: ${error.message}`);
      console.error('Session update action error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-blue-600';
    return 'text-slate-600';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return 'text-green-500';
    if (progress >= 50) return 'text-blue-500';
    return 'text-slate-500';
  };

  const sessionsToShow = showAllSessions ? schedule.sessions : schedule.upcomingSessions;

  return (
    <div className={`w-full ${className}`}>
      <Card className="shadow-lg border border-slate-200 bg-white overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50 border-b border-slate-200 p-5">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <CalendarIcon className="h-5 w-5" />
              </div>
              Wound Care Visit Timeline
              <Badge className="bg-blue-100 text-blue-800 border-0 ml-auto font-bold uppercase tracking-wider text-[10px]">
                {getFrequencyDisplayName(frequency)}
              </Badge>
            </CardTitle>
            
            {/* Treatment Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">Patient</div>
                <div className="font-bold text-slate-700">{patientName}</div>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">Frequency</div>
                <div className="font-bold text-slate-700">{getFrequencyDisplayName(frequency)}</div>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">Course Duration</div>
                <div className="font-bold text-slate-700">{duration} days</div>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">Total Sessions</div>
                <div className="font-bold text-slate-700">{schedule.totalSessions} visits</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {/* Progress Overview Cockpit */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Progress Circle */}
            <div className="flex flex-col items-center justify-center bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-slate-200"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - schedule.progress / 100)}`}
                    className={`${getProgressBgColor(schedule.progress)} transition-all duration-500`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xl font-extrabold ${getProgressColor(schedule.progress)}`}>
                    {schedule.progress}%
                  </span>
                </div>
              </div>
              <span className="mt-2 text-[10px] uppercase tracking-wider font-bold text-slate-500">Overall Progress</span>
            </div>

            {/* Statistics Cards */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-xl font-extrabold text-slate-800">{schedule.completedSessions}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Completed</div>
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 flex items-center gap-3">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-xl font-extrabold text-slate-800">{schedule.missedSessions}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Missed</div>
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-xl font-extrabold text-slate-800">{schedule.sessions.filter(s => s.status === 'scheduled').length}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Remaining</div>
              </div>
            </div>
          </div>

          {/* Next Scheduled Session Block */}
          {schedule.nextSession && (
            <div className="bg-blue-50/40 rounded-xl p-5 border border-blue-200/80 mb-6 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                    <ClockIcon className="h-4.5 w-4.5 text-blue-600" />
                    Next Scheduled Session
                  </h3>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-800">
                      {formatScheduleDate(schedule.nextSession.date)} at {formatScheduleTime(schedule.nextSession.time)}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge className={`${getSessionTypeColor(schedule.nextSession.type)} text-[9px] uppercase font-bold tracking-wider px-2 py-0.5`}>
                        {schedule.nextSession.type}
                      </Badge>
                      <Badge className={`${getPriorityColor(schedule.nextSession.priority)} text-[9px] uppercase font-bold tracking-wider px-2 py-0.5`}>
                        {schedule.nextSession.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 self-start md:self-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSession(schedule.nextSession!);
                          setSessionPhotos([]);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs h-8 px-3.5"
                      >
                        Complete Session
                      </Button>
                    </DialogTrigger>
                    <SessionActionDialog
                      session={schedule.nextSession}
                      action="complete"
                      onConfirm={() => handleSessionAction(schedule.nextSession!.id, 'complete')}
                      actionNotes={actionNotes}
                      setActionNotes={setActionNotes}
                      isLoading={isLoading}
                      photos={sessionPhotos}
                      setPhotos={setSessionPhotos}
                      photoUploading={photoUploading}
                      onPhotoUpload={handleSessionPhotoUpload}
                    />
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setSelectedSession(schedule.nextSession!)}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xs h-8 px-3.5"
                      >
                        Mark Missed
                      </Button>
                    </DialogTrigger>
                    <SessionActionDialog
                      session={schedule.nextSession}
                      action="miss"
                      onConfirm={() => handleSessionAction(schedule.nextSession!.id, 'miss')}
                      actionNotes={actionNotes}
                      setActionNotes={setActionNotes}
                      isLoading={isLoading}
                    />
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setSelectedSession(schedule.nextSession!)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-8 px-3.5"
                      >
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {showAllSessions ? 'All Treatment Sessions' : 'Upcoming Sessions'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="text-blue-600 hover:text-blue-700 font-bold text-xs"
              >
                {showAllSessions ? 'Show Upcoming Only' : 'Show Complete Timeline'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionsToShow.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isLoading={isLoading}
                  actionNotes={actionNotes}
                  setActionNotes={setActionNotes}
                  photos={sessionPhotos}
                  setPhotos={setSessionPhotos}
                  photoUploading={photoUploading}
                  onPhotoUpload={handleSessionPhotoUpload}
                  rescheduleDate={rescheduleDate}
                  setRescheduleDate={setRescheduleDate}
                  rescheduleTime={rescheduleTime}
                  setRescheduleTime={setRescheduleTime}
                  onComplete={() => handleSessionAction(session.id, 'complete')}
                  onMiss={() => handleSessionAction(session.id, 'miss')}
                  onReschedule={() => handleSessionAction(session.id, 'reschedule')}
                />
              ))}
            </div>

            {sessionsToShow.length === 0 && (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-xs text-slate-400 font-semibold">No visits found in queue.</p>
              </div>
            )}
          </div>

          {/* Create Follow-up Button */}
          {onCreateFollowUp && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <Button
                onClick={() => onCreateFollowUp(frequency, duration, new Date())}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 shadow-xs transition-colors"
              >
                Schedule Follow-up Treatment Plan Course
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
  isLoading,
  actionNotes,
  setActionNotes,
  photos,
  setPhotos,
  photoUploading,
  onPhotoUpload,
  rescheduleDate,
  setRescheduleDate,
  rescheduleTime,
  setRescheduleTime,
  onComplete,
  onMiss,
  onReschedule
}: {
  session: ExtendedWoundCareSession;
  isLoading: boolean;
  actionNotes: string;
  setActionNotes: (notes: string) => void;
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  photoUploading: boolean;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rescheduleDate: string;
  setRescheduleDate: (date: string) => void;
  rescheduleTime: string;
  setRescheduleTime: (time: string) => void;
  onComplete: () => void;
  onMiss: () => void;
  onReschedule: () => void;
}) {
  return (
    <Card className={`border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between ${session.status === 'completed' ? 'bg-slate-50/50' : 'bg-white'}`}>
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{getStatusIcon(session.status)}</span>
              <div>
                <p className="font-bold text-xs text-slate-800">
                  {formatScheduleDate(session.date)}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  {formatScheduleTime(session.time)}
                </p>
              </div>
            </div>
            <Badge className="text-[9px] font-bold bg-slate-100 text-slate-600 border-0">
              Visit #{session.sessionNumber}
            </Badge>
          </div>

          <div className="flex gap-1.5 mb-2.5">
            <Badge className={`${getSessionTypeColor(session.type)} text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5`}>
              {session.type}
            </Badge>
            <Badge className={`${getPriorityColor(session.priority)} text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5`}>
              {session.priority}
            </Badge>
          </div>

          {session.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mb-3 italic">"{session.notes}"</p>
          )}

          {/* Gallery of Uploaded Photos for Completed Sessions */}
          {session.status === 'completed' && session.photos && session.photos.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-200/80">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Visit Photos ({session.photos.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {session.photos.map((url, idx) => (
                  <div key={idx} className="w-10 h-10 rounded border border-slate-200 overflow-hidden relative shadow-3xs hover:scale-105 transition-transform bg-white">
                    <img 
                      src={`${API_BASE_URL}${url}`} 
                      alt={`Wound progress ${idx + 1}`} 
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open(`${API_BASE_URL}${url}`, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {session.status === 'scheduled' && (
          <div className="flex gap-1 mt-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => setPhotos([])}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1 font-bold text-xs h-7"
                >
                  ✓ Complete
                </Button>
              </DialogTrigger>
              <SessionActionDialog
                session={session}
                action="complete"
                onConfirm={onComplete}
                actionNotes={actionNotes}
                setActionNotes={setActionNotes}
                isLoading={isLoading}
                photos={photos}
                setPhotos={setPhotos}
                photoUploading={photoUploading}
                onPhotoUpload={onPhotoUpload}
              />
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={isLoading}
                  className="bg-red-500 hover:bg-red-600 text-white flex-1 font-bold text-xs h-7"
                >
                  ✗ Miss
                </Button>
              </DialogTrigger>
              <SessionActionDialog
                session={session}
                action="miss"
                onConfirm={onMiss}
                actionNotes={actionNotes}
                setActionNotes={setActionNotes}
                isLoading={isLoading}
              />
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={isLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-white flex-1 font-bold text-xs h-7"
                >
                  Resched
                </Button>
              </DialogTrigger>
              <RescheduleDialog
                session={session}
                onConfirm={onReschedule}
                rescheduleDate={rescheduleDate}
                setRescheduleDate={setRescheduleDate}
                rescheduleTime={rescheduleTime}
                setRescheduleTime={setRescheduleTime}
                isLoading={isLoading}
              />
            </Dialog>
          </div>
        )}

        {session.completedBy && session.completedAt && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
            Done by {session.completedBy} on {new Date(session.completedAt).toLocaleDateString()}
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
  isLoading,
  photos = [],
  setPhotos,
  photoUploading,
  onPhotoUpload
}: {
  session: ExtendedWoundCareSession;
  action: 'complete' | 'miss';
  onConfirm: (notes?: string) => void;
  actionNotes: string;
  setActionNotes: (notes: string) => void;
  isLoading: boolean;
  photos?: string[];
  setPhotos?: React.Dispatch<React.SetStateAction<string[]>>;
  photoUploading?: boolean;
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-lg p-5">
      <DialogHeader>
        <DialogTitle className="text-base font-bold text-slate-800">
          {action === 'complete' ? 'Complete Visit documentation' : 'Mark Session as Missed'}
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 mt-2">
        <div>
          <p className="text-xs text-slate-500 font-semibold">
            Session: {formatScheduleDate(session.date)} at {formatScheduleTime(session.time)}
          </p>
        </div>
        
        <div>
          <label className="block text-xs font-bold mb-1.5 text-slate-700">
            {action === 'complete' ? 'Clinical Session Progress Notes' : 'Reason for Missing visit'}
          </label>
          <Textarea
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder={action === 'complete' 
              ? 'Enter clinical notes about wound bed status, dressing changes...' 
              : 'Why was this session missed?'
            }
            className="text-xs border-slate-250 min-h-20"
          />
        </div>

        {/* Multi photo progress upload block */}
        {action === 'complete' && onPhotoUpload && setPhotos && (
          <div className="pt-1.5">
            <label className="block text-xs font-bold mb-2 text-slate-700">Wound progress photos</label>
            
            {/* Gallery Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group rounded overflow-hidden border border-slate-200 aspect-square bg-slate-50 shadow-3xs">
                    <img 
                      src={`${API_BASE_URL}${url}`} 
                      alt={`Wound progress ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded-full p-0.5 text-[8px] w-4 h-4 flex items-center justify-center hover:bg-red-700 transition-colors shadow-xs"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Photo Capture Area */}
            <div className="flex flex-col items-center justify-center border border-dashed border-slate-250 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
              {photoUploading ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] text-slate-500 font-semibold">Uploading photo...</span>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full text-center">
                  <span className="text-xl">📷</span>
                  <div>
                    <span className="text-xs font-bold text-blue-600 block">Take Photo or Upload Image</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Attach several photos to document wound progress</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={onPhotoUpload} 
                  />
                </label>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" disabled={isLoading} className="text-slate-600 text-xs">
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(actionNotes)}
            disabled={isLoading}
            size="sm"
            className={`text-white text-xs font-semibold ${action === 'complete' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isLoading ? 'Saving...' : `Confirm ${action === 'complete' ? 'Complete' : 'Missed'}`}
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
  session: ExtendedWoundCareSession;
  onConfirm: () => void;
  rescheduleDate: string;
  setRescheduleDate: (date: string) => void;
  rescheduleTime: string;
  setRescheduleTime: (time: string) => void;
  isLoading: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-lg p-5">
      <DialogHeader>
        <DialogTitle className="text-base font-bold text-slate-800">Reschedule Treatment Visit</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 mt-2">
        <div>
          <p className="text-xs text-slate-500 font-semibold">
            Current: {formatScheduleDate(session.date)} at {formatScheduleTime(session.time)}
          </p>
        </div>
        
        <div>
          <label className="block text-xs font-bold mb-1.5 text-slate-700">New Visit Date</label>
          <Input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="text-xs border-slate-250"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold mb-1.5 text-slate-700">New Visit Time</label>
          <Input
            type="time"
            value={rescheduleTime}
            onChange={(e) => setRescheduleTime(e.target.value)}
            className="text-xs border-slate-250"
          />
        </div>
        
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" disabled={isLoading} className="text-slate-600 text-xs">
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isLoading || !rescheduleDate || !rescheduleTime}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            {isLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
