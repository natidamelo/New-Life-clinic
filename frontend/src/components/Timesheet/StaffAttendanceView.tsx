import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../ui/use-toast';
import staffService from '../../services/staffService';
import EthiopianTimeDisplay from '../EthiopianTimeDisplay';

interface AttendanceData {
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  attendanceStatus: string;
  dayAttendanceStatus: string;
  minutesLate: number;
  minutesEarly: number;
  totalWorkHours: number;
  overtimeHours: number;
  overtimeClockInTime: string | null;
  overtimeClockOutTime: string | null;
  ethiopianCheckInTime: string | null;
  ethiopianCheckOutTime: string | null;
}

interface AttendanceSummary {
  totalStaff: number;
  present: number;
  late: number;
  absent: number;
  earlyClockOut: number;
  partial: number;
  overtimeCheckin: number;
  overtimeComplete: number;
  averageWorkHours: number;
}

const StaffAttendanceView: React.FC = () => {
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate, selectedDepartment]);

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true);
      const response = await staffService.getAttendanceData(selectedDate, selectedDepartment);
      console.log('🔍 Frontend received data:', response);
      console.log('📊 Summary keys:', Object.keys(response.summary || {}));
      console.log('📊 Summary data:', response.summary);
      console.log('👥 Staff data count:', response.attendanceData?.length);
      
      // Check for overtime entries
      const overtimeEntries = response.attendanceData?.filter(staff => 
        staff.dayAttendanceStatus === 'overtime-checkin' || 
        staff.dayAttendanceStatus === 'overtime-complete'
      ) || [];
      
      console.log('🎯 Overtime entries found:', overtimeEntries.length);
      overtimeEntries.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.userName}: ${staff.dayAttendanceStatus}`);
      });
      
      setAttendanceData(response.attendanceData);
      setSummary(response.summary);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A';
    return staffService.formatEthiopianTime(timeString);
  };

  const getAttendanceStatusBadge = (status: string) => {
    const variant = staffService.getAttendanceStatusBadge(status) as any;
    
    return (
      <Badge variant={variant} className="text-xs">
        {status === 'present' && 'Present'}
        {status === 'late' && 'Late'}
        {status === 'absent' && 'Absent'}
        {status === 'early-clock-out' && 'Early Clock Out'}
        {status === 'partial' && 'Partial'}
        {status === 'overtime-checkin' && 'Clock In Overtime'}
        {status === 'overtime-complete' && 'Clock Out Overtime'}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'late':
        return <AlertTriangle className="h-4 w-4 text-accent-foreground" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'early-clock-out':
        return <AlertTriangle className="h-4 w-4 text-accent-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground/50" />;
    }
  };

  const filteredData = attendanceData.filter(staff =>
    staff.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.userRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportData = () => {
    const csvContent = [
      ['Name', 'Role', 'Department', 'Clock In', 'Clock Out', 'Status', 'Minutes Late', 'Minutes Early', 'Work Hours'].join(','),
      ...filteredData.map(staff => [
        staff.userName,
        staff.userRole,
        staff.department,
        formatTime(staff.clockInTime),
        formatTime(staff.clockOutTime),
        staff.dayAttendanceStatus,
        staff.minutesLate,
        staff.minutesEarly,
        staff.totalWorkHours
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Attendance</h2>
          <p className="text-muted-foreground">Monitor staff clock in/out times and attendance status</p>
        </div>
        <EthiopianTimeDisplay />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{summary.totalStaff}</div>
              <div className="text-sm text-muted-foreground">Total Staff</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{summary.present}</div>
              <div className="text-sm text-muted-foreground">Present</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-foreground">{summary.late}</div>
              <div className="text-sm text-muted-foreground">Late</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">{summary.absent}</div>
              <div className="text-sm text-muted-foreground">Absent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent-foreground">{summary.earlyClockOut}</div>
              <div className="text-sm text-muted-foreground">Early Clock Out</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{summary.overtimeCheckin || 0}</div>
              <div className="text-sm text-muted-foreground">Overtime Check-in</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-indigo-600">{summary.overtimeComplete || 0}</div>
              <div className="text-sm text-muted-foreground">Overtime Complete</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary-foreground">{summary.averageWorkHours.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">Avg Hours</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Doctors/OPD">Doctors/OPD</SelectItem>
                  <SelectItem value="Nurses/Ward">Nurses/Ward</SelectItem>
                  <SelectItem value="Laboratory">Laboratory</SelectItem>
                  <SelectItem value="Reception">Reception</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <Input
                placeholder="Search by name, role, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={loadAttendanceData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Attendance Details</CardTitle>
          <CardDescription>
            Detailed view of all staff attendance for {new Date(selectedDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading attendance data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Staff Member</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Clock In</th>
                    <th className="text-left p-3 font-medium">Clock Out</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Work Hours</th>
                    <th className="text-left p-3 font-medium">Overtime</th>
                    <th className="text-left p-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((staff) => (
                    <tr key={staff.userId} className="border-b hover:bg-muted/10">
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground/50" />
                          <span className="font-medium">{staff.userName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize">
                          {staff.userRole}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {staff.department}
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {formatTime(staff.clockInTime)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {formatTime(staff.clockOutTime)}
                          </div>
                          {staff.minutesEarly > 0 && (
                            <div className="text-xs text-accent-foreground">
                              {staffService.formatMinutesToHoursAndMinutes(staff.minutesEarly)} early
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(staff.dayAttendanceStatus)}
                          {getAttendanceStatusBadge(staff.dayAttendanceStatus)}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-medium">
                          {staff.totalWorkHours.toFixed(1)}h
                        </span>
                      </td>
                      <td className="p-3">
                        {staff.dayAttendanceStatus === 'overtime-checkin' || staff.dayAttendanceStatus === 'overtime-complete' ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-primary">
                              {staff.overtimeHours > 0 ? staffService.formatOvertimeHours(staff.overtimeHours) : '0h 0m'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {staff.overtimeClockInTime ? formatTime(staff.overtimeClockInTime) : formatTime(staff.clockInTime)} - {staff.overtimeClockOutTime ? formatTime(staff.overtimeClockOutTime) : (staff.clockOutTime ? formatTime(staff.clockOutTime) : 'Not out')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground/50">
                            {staff.overtimeHours > 0 ? staffService.formatOvertimeHours(staff.overtimeHours) : '0h 0m'}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-muted-foreground">
                          {staff.dayAttendanceStatus === 'absent' && 'No clock in recorded'}
                          {staff.dayAttendanceStatus === 'late' && 'Arrived after grace period'}
                          {staff.dayAttendanceStatus === 'early-clock-out' && 'Left before end time'}
                          {staff.dayAttendanceStatus === 'partial' && 'Late arrival and early departure'}
                          {staff.dayAttendanceStatus === 'present' && 'Full day completed'}
                          {staff.dayAttendanceStatus === 'overtime-checkin' && 'Overtime shift - checked in'}
                          {staff.dayAttendanceStatus === 'overtime-complete' && 'Overtime shift - completed'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance data found for the selected criteria
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffAttendanceView;
