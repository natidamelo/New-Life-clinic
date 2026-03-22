export interface WoundCareSession {
  id: string;
  date: Date;
  time: string;
  type: 'morning' | 'afternoon' | 'evening' | 'single';
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  sessionNumber: number;
  notes?: string;
  completedBy?: string;
  completedAt?: Date;
  rescheduledFrom?: Date;
  priority: 'normal' | 'high' | 'urgent';
}

export interface WoundCareSchedule {
  id: string;
  patientName: string;
  frequency: 'daily' | 'twice_daily' | 'every_other_day' | 'weekly' | 'as_needed';
  duration: number; // days
  startDate: Date;
  endDate: Date;
  sessions: WoundCareSession[];
  totalSessions: number;
  completedSessions: number;
  missedSessions: number;
  progress: number;
  nextSession?: WoundCareSession;
  upcomingSessions: WoundCareSession[];
}

export function generateWoundCareSchedule(
  patientName: string,
  frequency: string,
  duration: number,
  startDate: Date = new Date(),
  existingScheduleId?: string
): WoundCareSchedule {
  const sessions: WoundCareSession[] = [];
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + duration);

  let currentDate = new Date(start);
  let sessionNumber = 1;

  // Generate sessions based on frequency
  while (currentDate <= end && sessions.length < 100) { // Safety limit
    const sessionsForDay = getSessionsForDay(frequency, currentDate, sessionNumber);
    
    sessionsForDay.forEach(session => {
      sessions.push({
        ...session,
        sessionNumber: sessionNumber++
      });
    });

    // Move to next scheduled date
    currentDate = getNextScheduledDate(frequency, currentDate);
  }

  // Calculate statistics
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const missedSessions = sessions.filter(s => s.status === 'missed').length;
  const progress = sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;

  // Find next session
  const nextSession = sessions.find(s => 
    s.status === 'scheduled' && new Date(s.date) >= new Date()
  );

  // Get upcoming sessions (next 5-10 sessions)
  const upcomingSessions = sessions
    .filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date())
    .slice(0, 10);

  return {
    id: existingScheduleId || generateScheduleId(),
    patientName,
    frequency: frequency as any,
    duration,
    startDate: start,
    endDate: end,
    sessions,
    totalSessions: sessions.length,
    completedSessions,
    missedSessions,
    progress,
    nextSession,
    upcomingSessions
  };
}

function getSessionsForDay(
  frequency: string, 
  date: Date, 
  baseSessionNumber: number
): Omit<WoundCareSession, 'sessionNumber'>[] {
  const sessions: Omit<WoundCareSession, 'sessionNumber'>[] = [];
  
  switch (frequency) {
    case 'twice_daily':
      sessions.push(
        createSession(date, '08:00', 'morning', baseSessionNumber),
        createSession(date, '20:00', 'evening', baseSessionNumber + 1)
      );
      break;
    
    case 'daily':
      sessions.push(createSession(date, '14:00', 'afternoon', baseSessionNumber));
      break;
    
    case 'every_other_day':
      sessions.push(createSession(date, '10:00', 'morning', baseSessionNumber));
      break;
    
    case 'weekly':
      sessions.push(createSession(date, '09:00', 'morning', baseSessionNumber));
      break;
    
    case 'as_needed':
      sessions.push(createSession(date, '12:00', 'afternoon', baseSessionNumber));
      break;
    
    default:
      sessions.push(createSession(date, '14:00', 'afternoon', baseSessionNumber));
  }

  return sessions;
}

function createSession(
  date: Date, 
  time: string, 
  type: WoundCareSession['type'],
  sessionNumber: number
): Omit<WoundCareSession, 'sessionNumber'> {
  return {
    id: `session-${date.getTime()}-${time.replace(':', '')}`,
    date: new Date(date),
    time,
    type,
    status: 'scheduled',
    priority: 'normal'
  };
}

function getNextScheduledDate(frequency: string, currentDate: Date): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
    case 'twice_daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    
    case 'every_other_day':
      nextDate.setDate(nextDate.getDate() + 2);
      break;
    
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    
    case 'as_needed':
      nextDate.setDate(nextDate.getDate() + 3); // Default 3 days for as needed
      break;
    
    default:
      nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate;
}

function generateScheduleId(): string {
  return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Utility functions for formatting
export function formatScheduleDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function formatScheduleTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getFrequencyDisplayName(frequency: string): string {
  const names: Record<string, string> = {
    'daily': 'Daily',
    'twice_daily': 'Twice Daily',
    'every_other_day': 'Every Other Day',
    'weekly': 'Weekly',
    'as_needed': 'As Needed'
  };
  return names[frequency] || frequency;
}

export function getSessionTypeColor(type: WoundCareSession['type']): string {
  const colors: Record<string, string> = {
    'morning': 'bg-primary/20 text-primary border-primary/30',
    'afternoon': 'bg-accent/20 text-accent-foreground border-orange-200',
    'evening': 'bg-secondary/20 text-secondary-foreground border-secondary/30',
    'single': 'bg-muted/20 text-muted-foreground border-border/30'
  };
  return colors[type] || colors.single;
}

export function getStatusColor(status: WoundCareSession['status']): string {
  const colors: Record<string, string> = {
    'scheduled': 'bg-primary/10 border-primary/30 text-primary',
    'completed': 'bg-primary/10 border-primary/30 text-primary',
    'missed': 'bg-destructive/10 border-destructive/30 text-destructive',
    'rescheduled': 'bg-accent/10 border-yellow-200 text-accent-foreground'
  };
  return colors[status] || colors.scheduled;
}

export function getPriorityColor(priority: WoundCareSession['priority']): string {
  const colors: Record<string, string> = {
    'normal': 'bg-muted/20 text-muted-foreground',
    'high': 'bg-accent/20 text-accent-foreground',
    'urgent': 'bg-destructive/20 text-destructive'
  };
  return colors[priority] || colors.normal;
}

export function getStatusIcon(status: WoundCareSession['status']): string {
  const icons: Record<string, string> = {
    'scheduled': '📅',
    'completed': '✅',
    'missed': '❌',
    'rescheduled': '🔄'
  };
  return icons[status] || '📅';
}

// Advanced scheduling functions
export function rescheduleSession(
  schedule: WoundCareSchedule,
  sessionId: string,
  newDate: Date,
  newTime: string
): WoundCareSchedule {
  const updatedSessions = schedule.sessions.map(session => {
    if (session.id === sessionId) {
      return {
        ...session,
        rescheduledFrom: session.date,
        date: newDate,
        time: newTime,
        status: 'scheduled' as const
      };
    }
    return session;
  });

  return {
    ...schedule,
    sessions: updatedSessions,
    upcomingSessions: updatedSessions
      .filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date())
      .slice(0, 10)
  };
}

export function updateSessionStatus(
  schedule: WoundCareSchedule,
  sessionId: string,
  status: WoundCareSession['status'],
  notes?: string,
  completedBy?: string
): WoundCareSchedule {
  const updatedSessions = schedule.sessions.map(session => {
    if (session.id === sessionId) {
      return {
        ...session,
        status,
        notes,
        completedBy,
        completedAt: status === 'completed' ? new Date() : session.completedAt
      };
    }
    return session;
  });

  const completedSessions = updatedSessions.filter(s => s.status === 'completed').length;
  const missedSessions = updatedSessions.filter(s => s.status === 'missed').length;
  const progress = updatedSessions.length > 0 ? Math.round((completedSessions / updatedSessions.length) * 100) : 0;

  const nextSession = updatedSessions.find(s => 
    s.status === 'scheduled' && new Date(s.date) >= new Date()
  );

  const upcomingSessions = updatedSessions
    .filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date())
    .slice(0, 10);

  return {
    ...schedule,
    sessions: updatedSessions,
    completedSessions,
    missedSessions,
    progress,
    nextSession,
    upcomingSessions
  };
}
