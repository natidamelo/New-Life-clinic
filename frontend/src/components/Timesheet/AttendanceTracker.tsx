import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import attendanceService from '../../services/attendanceService';

const AttendanceTracker: React.FC = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    offline: 0
  });

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const data = await attendanceService.getAutomaticAttendance();
      setAttendance(data.staff);
      setSummary({
        present: data.summary?.present || 0,
        absent: data.summary?.absent || 0,
        late: (data.summary as any)?.late || 0,
        total: data.summary?.total || 0,
        offline: data.summary?.offline || 0
      });
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{summary.present}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.absent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{summary.late}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{summary.offline}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {attendance.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  {member.status === 'absent' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : member.status === 'present' ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : member.status === 'offline' ? (
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-accent-foreground" />
                  )}
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.clockInTime && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(member.clockInTime).toLocaleTimeString()}
                    </span>
                  )}
                  <Badge variant={
                    member.status === 'absent' ? 'destructive' : 
                    member.status === 'present' ? 'default' :
                    member.status === 'offline' ? 'secondary' : 'outline'
                  }>
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceTracker;

