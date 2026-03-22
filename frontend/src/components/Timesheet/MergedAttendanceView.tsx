import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import staffService from '../../services/staffService';
import EthiopianTimeDisplay from '../EthiopianTimeDisplay';
import { User, RefreshCw, Download, Search, Calendar, FileText, BarChart3 } from 'lucide-react';

interface MergedAttendanceViewProps {
  className?: string;
}



interface StaffAttendanceData {
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
  isOvertime: boolean;
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

const MergedAttendanceView: React.FC<MergedAttendanceViewProps> = ({ className = '' }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [staffAttendanceData, setStaffAttendanceData] = useState<StaffAttendanceData[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  console.log('🚀 MergedAttendanceView component mounted');
  console.log('👤 User role:', user?.role);

  useEffect(() => {
    if (user?.role === 'admin') {
      console.log('🔄 MergedAttendanceView useEffect triggered');
      loadStaffAttendanceData();
    }
  }, [user?.role, selectedDate, selectedDepartment]);

  const loadStaffAttendanceData = async () => {
    try {
      setIsLoadingStaff(true);
      const response = await staffService.getAttendanceData(selectedDate, selectedDepartment);
      console.log('🔍 MergedAttendanceView received data:', response);
      console.log('📊 Summary keys:', Object.keys(response.summary || {}));
      console.log('📊 Summary data:', response.summary);
      console.log('👥 Staff data count:', response.attendanceData?.length);
      
      // Check for overtime entries with safety checks
      const attendanceData = response.attendanceData || [];
      const overtimeEntries = Array.isArray(attendanceData) ? attendanceData.filter(staff => 
        staff.dayAttendanceStatus === 'overtime-checkin' || 
        staff.dayAttendanceStatus === 'overtime-complete'
      ) : [];
      
      console.log('🎯 Overtime entries found:', overtimeEntries.length);
      overtimeEntries.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.userName}: ${staff.dayAttendanceStatus}`);
      });
      
      // Show a visible toast with the data received
      if (response.error) {
        toast({
          title: "Authentication Error",
          description: `Please log in again. Error: ${response.error}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Data Received",
          description: `Found ${overtimeEntries.length} overtime entries. Summary: ${JSON.stringify(response.summary)}`,
          variant: "default"
        });
      }
      
      setStaffAttendanceData(Array.isArray(response.attendanceData) ? response.attendanceData : []);
      setAttendanceSummary(response.summary || null);
      
      // If there's an authentication error, show a login button
      if (response.error && response.code === 'AUTH_INVALID_TOKEN') {
        // You can add a login button here if needed
        console.log('🔐 Authentication required - user needs to log in again');
      }
    } catch (error) {
      console.error('Error loading staff attendance data:', error);
      setStaffAttendanceData([]);
      setAttendanceSummary(null);
      toast({
        title: "Error",
        description: "Failed to load staff attendance data",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStaff(false);
    }
  };



  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString();
  };

  const filteredStaffData = (Array.isArray(staffAttendanceData) ? staffAttendanceData : []).filter(staff =>
    (staff.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staff.userRole || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staff.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = (type: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const getDateRange = () => {
      const today = new Date(selectedDate);
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      
      if (type === 'weekly') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(day - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { start: startOfWeek, end: endOfWeek };
      } else if (type === 'monthly') {
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        return { start: startOfMonth, end: endOfMonth };
      }
      return { start: today, end: today };
    };

    const dateRange = getDateRange();
    const startDate = dateRange.start.toISOString().split('T')[0];
    const endDate = dateRange.end.toISOString().split('T')[0];

    const headers = [
      'Date',
      'Staff Member', 
      'Role', 
      'Department', 
      'Clock In', 
      'Clock Out', 
      'Status', 
      'Work Hours', 
      'Overtime Clock In',
      'Overtime Clock Out',
      'Overtime Hours',
      'Minutes Late', 
      'Minutes Early',
      'Notes'
    ];

    const csvData = filteredStaffData.map(staff => [
      selectedDate,
      staff.userName,
      staff.userRole,
      staff.department,
      staff.clockInTime ? new Date(staff.clockInTime).toLocaleTimeString() : 'N/A',
      staff.clockOutTime ? new Date(staff.clockOutTime).toLocaleTimeString() : 'N/A',
      staff.dayAttendanceStatus,
      `${(staff.totalWorkHours || 0).toFixed(2)}h`,
      staff.overtimeClockInTime ? new Date(staff.overtimeClockInTime).toLocaleTimeString() : 'N/A',
      staff.overtimeClockOutTime ? new Date(staff.overtimeClockOutTime).toLocaleTimeString() : 'N/A',
      staffService.formatOvertimeHours(staff.overtimeHours || 0),
      staff.minutesLate,
      staff.minutesEarly,
      getAttendanceNotes(staff)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${type}-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} attendance data exported successfully`,
      variant: "default"
    });
  };

  const getAttendanceNotes = (staff: StaffAttendanceData) => {
    const notes = [];
    if (staff.minutesLate > 0) {
      notes.push(`${staffService.formatMinutesToHoursAndMinutes(staff.minutesLate)} late`);
    }
    if (staff.minutesEarly > 0) {
      notes.push(`${staffService.formatMinutesToHoursAndMinutes(staff.minutesEarly)} early`);
    }
    if (staff.isOvertime) {
      notes.push('Overtime worked');
    }
    if (staff.dayAttendanceStatus === 'absent') {
      notes.push('No check-in recorded');
    }
    return notes.join('; ');
  };

  const exportDetailedReport = () => {
    const reportData = {
      reportDate: new Date().toISOString(),
      dateRange: selectedDate,
      summary: attendanceSummary,
      staffCount: filteredStaffData.length,
      details: filteredStaffData.map(staff => ({
        staffId: staff.userId,
        name: staff.userName,
        role: staff.userRole,
        department: staff.department,
        attendance: {
          clockIn: staff.clockInTime ? new Date(staff.clockInTime).toLocaleTimeString() : 'N/A',
          clockOut: staff.clockOutTime ? new Date(staff.clockOutTime).toLocaleTimeString() : 'N/A',
          status: staff.dayAttendanceStatus,
          workHours: staff.totalWorkHours,
          minutesLate: staff.minutesLate,
          minutesEarly: staff.minutesEarly
        },
        overtime: {
          clockIn: staff.overtimeClockInTime ? new Date(staff.overtimeClockInTime).toLocaleTimeString() : 'N/A',
          clockOut: staff.overtimeClockOutTime ? new Date(staff.overtimeClockOutTime).toLocaleTimeString() : 'N/A',
          hours: staff.overtimeHours,
          isOvertime: staff.isOvertime
        }
      }))
    };

    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed-attendance-report-${selectedDate}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Detailed Report Exported",
      description: "JSON report with detailed attendance data exported successfully",
      variant: "default"
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Ethiopian Time */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-muted-foreground">Attendance Management</h2>
          <p className="text-muted-foreground">Clock in/out and monitor staff attendance</p>
          {/* Debug Info */}
          {attendanceSummary && (
            <div className="mt-2 p-2 bg-primary/10 rounded text-xs">
              <strong>Debug Info:</strong> Total: {attendanceSummary.totalStaff}, 
              Present: {attendanceSummary.present}, 
              Overtime Check-in: {attendanceSummary.overtimeCheckin || 0}, 
              Overtime Complete: {attendanceSummary.overtimeComplete || 0}
            </div>
          )}
        </div>
        <EthiopianTimeDisplay />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Staff Attendance Overview - Full Width */}
        {user?.role === 'admin' && (
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Staff Attendance Overview</span>
                </CardTitle>
                <CardDescription>
                  Monitor all staff attendance and clock in/out times
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Summary Cards */}
                {attendanceSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">{attendanceSummary.totalStaff}</div>
                      <div className="text-xs text-primary">Total</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">{attendanceSummary.present}</div>
                      <div className="text-xs text-primary">Present</div>
                    </div>
                    <div className="text-center p-3 bg-accent/10 rounded-lg">
                      <div className="text-lg font-bold text-accent-foreground">{attendanceSummary.late}</div>
                      <div className="text-xs text-accent-foreground">Late</div>
                    </div>
                    <div className="text-center p-3 bg-destructive/10 rounded-lg">
                      <div className="text-lg font-bold text-destructive">{attendanceSummary.absent}</div>
                      <div className="text-xs text-destructive">Absent</div>
                    </div>
                    <div className="text-center p-3 bg-accent/10 rounded-lg">
                      <div className="text-lg font-bold text-accent-foreground">{attendanceSummary.earlyClockOut}</div>
                      <div className="text-xs text-accent-foreground">Early Clock Out</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">{attendanceSummary.overtimeCheckin || 0}</div>
                      <div className="text-xs text-primary">Overtime Check-in</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="text-lg font-bold text-indigo-600">{attendanceSummary.overtimeComplete || 0}</div>
                      <div className="text-xs text-indigo-700">Overtime Complete</div>
                    </div>
                    <div className="text-center p-3 bg-secondary/10 rounded-lg">
                      <div className="text-lg font-bold text-secondary-foreground">{(attendanceSummary.averageWorkHours || 0).toFixed(1)}h</div>
                      <div className="text-xs text-secondary-foreground">Avg Hours</div>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Department" />
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
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button onClick={loadStaffAttendanceData} disabled={isLoadingStaff} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStaff ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => exportToCSV('daily')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Daily Report (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV('weekly')}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Weekly Report (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV('monthly')}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Monthly Report (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportDetailedReport}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Detailed Report (JSON)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Staff Attendance Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Staff Member</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Clock In</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Clock Out</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Work Hours</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Overtime Clock In</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Overtime Clock Out</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Overtime Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-primary-foreground divide-y divide-gray-200">
                        {filteredStaffData.length > 0 ? (
                          filteredStaffData.map((staff, index) => (
                            <tr key={staff.userId} className={index % 2 === 0 ? 'bg-primary-foreground' : 'bg-muted/10'}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-muted-foreground">{staff.userName}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant="outline" className="capitalize">
                                  {staff.userRole}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {staff.department}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {staff.clockInTime ? new Date(staff.clockInTime).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {staff.clockOutTime ? new Date(staff.clockOutTime).toLocaleTimeString() : 'N/A'}
                                                                 {staff.minutesEarly > 0 && (
                                   <div className="text-xs text-accent-foreground">({staffService.formatMinutesToHoursAndMinutes(staff.minutesEarly)} early)</div>
                                 )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant={staffService.getAttendanceStatusBadge(staff.dayAttendanceStatus) as any}>
                                  {staff.dayAttendanceStatus}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {(staff.totalWorkHours || 0).toFixed(2)}h
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {staff.isOvertime || staff.dayAttendanceStatus === 'overtime-checkin' || staff.dayAttendanceStatus === 'overtime-complete' ? (
                                  staff.overtimeClockInTime ? formatTime(staff.overtimeClockInTime) : 'N/A'
                                ) : (
                                  <span className="text-muted-foreground/50">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {staff.isOvertime || staff.dayAttendanceStatus === 'overtime-checkin' || staff.dayAttendanceStatus === 'overtime-complete' ? (
                                  staff.overtimeClockOutTime ? formatTime(staff.overtimeClockOutTime) : 'Not out'
                                ) : (
                                  <span className="text-muted-foreground/50">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {staff.isOvertime || staff.dayAttendanceStatus === 'overtime-checkin' || staff.dayAttendanceStatus === 'overtime-complete' ? (
                                  <span className="text-primary font-medium">
                                    {staffService.formatOvertimeHours(staff.overtimeHours || 0)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                              {isLoadingStaff ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  <span>Loading attendance data...</span>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-muted-foreground mb-2">No attendance data found for the selected criteria</p>
                                  <p className="text-sm text-muted-foreground/50">Try selecting a different date or department</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MergedAttendanceView;
