import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Users, TrendingUp, Download, 
  Filter, RefreshCw, ChevronLeft, ChevronRight,
  User, Building2, Timer, CheckCircle2, XCircle,
  AlertCircle, BarChart3, FileText, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';
import staffService from '../../services/staffService';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';

interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  date: string;
  clockIn: { time: string; location?: string };
  clockOut?: { time: string; location?: string };
  breaks: Array<{ start: string; end: string }>;
  totalHours: number;
  overtimeHours: number;
  status: 'active' | 'completed' | 'pending' | 'approved';
  notes?: string;
}

interface Analytics {
  totalHours: number;
  averageHours: number;
  overtimeHours: number;
  attendanceRate: number;
  lateArrivals: number;
  earlyDepartures: number;
  perfectAttendance: number;
  departmentStats: Array<{
    name: string;
    totalHours: number;
    staffCount: number;
    avgHours: number;
  }>;
}

const TimesheetDashboard: React.FC = () => {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState<TimesheetEntry[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date()).toISOString().split('T')[0],
    end: endOfWeek(new Date()).toISOString().split('T')[0]
  });
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTimesheets();
    loadAnalytics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [timesheets, searchTerm, selectedDepartment, selectedStatus, selectedRole]);

  // Reload data whenever date range changes (e.g., via quick presets)
  useEffect(() => {
    loadTimesheets();
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end]);

  const loadTimesheets = async () => {
    try {
      setIsLoading(true);
      const response = await staffService.getTimesheets({
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      
      // Transform the response data to match our interface
      const transformedData: TimesheetEntry[] = response.timesheets.map((ts: any) => ({
        id: ts._id || ts.id,
        userId: ts.userId?._id || ts.userId,
        userName: ts.userName || `${ts.userId?.firstName || ''} ${ts.userId?.lastName || ''}`.trim() || 'Unknown',
        userRole: ts.userRole || ts.userId?.role || 'staff',
        userDepartment: ts.department || 'General',
        date: ts.date,
        clockIn: ts.clockIn || { time: '' },
        clockOut: ts.clockOut,
        breaks: ts.breaks || [],
        totalHours: ts.totalWorkHours || 0,
        overtimeHours: ts.overtimeHours || 0,
        status: ts.status || 'pending',
        notes: ts.notes
      }));
      
      setTimesheets(transformedData);
    } catch (error) {
      console.error('Error loading timesheets:', error);
      setTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await staffService.getTimesheetAnalytics({
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...timesheets];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ts => 
        ts.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ts.userDepartment.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(ts => ts.userDepartment === selectedDepartment);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(ts => ts.status === selectedStatus);
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(ts => ts.userRole === selectedRole);
    }

    setFilteredTimesheets(filtered);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    loadTimesheets();
    loadAnalytics();
  };

  const handleExport = async () => {
    try {
      // Client-side CSV export of the current filtered table view
      const rows = filteredTimesheets.length > 0 ? filteredTimesheets : timesheets;
      const headers = ['Employee','Department','Date','Clock In','Clock Out','Total Hours','Status'];
      const csvRows = [headers.join(',')];
      rows.forEach((ts) => {
        const dateStr = ts.date ? format(parseISO(ts.date), 'yyyy-MM-dd') : '';
        const cin = ts.clockIn?.time ? format(parseISO(ts.clockIn.time), 'HH:mm') : '';
        const cout = ts.clockOut?.time ? format(parseISO(ts.clockOut.time), 'HH:mm') : '';
        const total = `${Math.floor(ts.totalHours)}h ${Math.round((ts.totalHours - Math.floor(ts.totalHours)) * 60)}m`;
        const vals = [ts.userName, ts.userDepartment, dateStr, cin, cout, total, ts.status];
        const escaped = vals.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`);
        csvRows.push(escaped.join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheets_${dateRange.start}_to_${dateRange.end}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting timesheets:', error);
    }
  };

  const handleApplyFilters = () => {
    loadTimesheets();
  };

  const formatDuration = (hours: number) => {
    if (!hours || isNaN(hours)) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary';
      case 'completed': return 'bg-primary';
      case 'approved': return 'bg-secondary';
      case 'pending': return 'bg-accent';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Timer className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Quick preset helpers
  const toYmd = (d: Date) => d.toISOString().split('T')[0];
  const setPresetDay = () => {
    const today = new Date();
    setDateRange({ start: toYmd(startOfDay(today)), end: toYmd(endOfDay(today)) });
  };
  const setPresetWeek = () => {
    const today = new Date();
    setDateRange({ start: toYmd(startOfWeek(today)), end: toYmd(endOfWeek(today)) });
  };
  const setPresetMonth = () => {
    const today = new Date();
    setDateRange({ start: toYmd(startOfMonth(today)), end: toYmd(endOfMonth(today)) });
  };
  const setPresetYear = () => {
    const today = new Date();
    setDateRange({ start: toYmd(startOfYear(today)), end: toYmd(endOfYear(today)) });
  };

  // Pagination
  const totalPages = Math.ceil(filteredTimesheets.length / itemsPerPage);
  const paginatedTimesheets = filteredTimesheets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const departments = Array.from(new Set(timesheets.map(ts => ts.userDepartment)));
  const roles = Array.from(new Set(timesheets.map(ts => ts.userRole)));

    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Timesheet Management</h2>
          <p className="text-muted-foreground mt-1">
            Monitor and manage staff attendance and work hours
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Presets */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quick range:</span>
              <Button variant="outline" size="sm" onClick={setPresetDay}>Day</Button>
              <Button variant="outline" size="sm" onClick={setPresetWeek}>Week</Button>
              <Button variant="outline" size="sm" onClick={setPresetMonth}>Month</Button>
              <Button variant="outline" size="sm" onClick={setPresetYear}>Year</Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>From</span>
              <Badge variant="outline">{dateRange.start}</Badge>
              <span>to</span>
              <Badge variant="outline">{dateRange.end}</Badge>
              <Button size="sm" className="ml-2" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                                 <div className="text-2xl font-bold">
                   {analytics?.totalHours ? formatDuration(analytics.totalHours) : '0h 0m'}
                 </div>
                <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Hours</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                                 <div className="text-2xl font-bold">
                   {analytics?.averageHours ? formatDuration(analytics.averageHours) : '0h 0m'}
                 </div>
                <p className="text-xs text-muted-foreground">Per employee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                                 <div className="text-2xl font-bold">
                   {analytics?.attendanceRate ? `${analytics.attendanceRate.toFixed(1)}%` : '0%'}
                 </div>
                <Progress value={analytics?.attendanceRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                   {analytics?.overtimeHours ? formatDuration(analytics.overtimeHours) : '0h 0m'}
            </div>
                <p className="text-xs text-muted-foreground">Extra hours worked</p>
          </CardContent>
        </Card>
      </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
        <CardHeader>
                <CardTitle className="text-lg">Punctuality</CardTitle>
        </CardHeader>
              <CardContent className="space-y-2">
                                 <div className="flex justify-between items-center">
                   <span className="text-sm">Late Arrivals</span>
                   <Badge variant="destructive">{analytics?.lateArrivals ?? 0}</Badge>
                </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm">Early Departures</span>
                   <Badge variant="destructive">{analytics?.earlyDepartures ?? 0}</Badge>
              </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm">Perfect Attendance</span>
                   <Badge variant="default">{analytics?.perfectAttendance ?? 0}</Badge>
          </div>
        </CardContent>
      </Card>

            <Card className="md:col-span-2">
        <CardHeader>
                <CardTitle className="text-lg">Department Overview</CardTitle>
        </CardHeader>
        <CardContent>
                                                  <div className="space-y-3">
                   {Array.isArray(analytics?.departmentStats) && analytics.departmentStats.length > 0 ? (
                     analytics.departmentStats.slice(0, 4).map((dept, index) => (
                       <div key={index} className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Building2 className="h-4 w-4 text-muted-foreground" />
                           <span className="text-sm font-medium">{dept.name}</span>
                  </div>
                         <div className="flex items-center gap-4">
                           <span className="text-sm text-muted-foreground">
                             {dept.staffCount} staff
                           </span>
                           <Badge variant="outline">
                             {formatDuration(dept.avgHours)}/day
                           </Badge>
                  </div>
                </div>
                     ))
                   ) : (
                     <div className="text-center text-muted-foreground py-4">
                       No department data available
              </div>
                   )}
          </div>
        </CardContent>
      </Card>
          </div>
        </TabsContent>

        {/* Timesheets Tab */}
        <TabsContent value="timesheets" className="space-y-4">
          {/* Filters */}
          <Card>
      <CardHeader>
              <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
                <CardTitle>Filters</CardTitle>
              </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
              <Input
                type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <Input
                type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {Array.isArray(departments) && departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {Array.isArray(roles) && roles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 items-end mt-4">
                <div className="flex-1">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
        </div>
      </CardContent>
    </Card>

          {/* Timesheets Table */}
          <Card>
            <CardContent className="p-0">
      {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Loading timesheets...</p>
                  </div>
                </div>
              ) : !Array.isArray(filteredTimesheets) || filteredTimesheets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-2">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No timesheets found</h3>
                  <p className="text-muted-foreground">No timesheets match your current filters.</p>
        </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Overtime</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(paginatedTimesheets) && paginatedTimesheets.map((timesheet) => (
                        <TableRow key={timesheet.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium">{timesheet.userName}</div>
                                <div className="text-xs text-muted-foreground">{timesheet.userRole}</div>
                              </div>
        </div>
                          </TableCell>
                          <TableCell>{timesheet.userDepartment}</TableCell>
                                                     <TableCell>
                             {timesheet.date ? format(parseISO(timesheet.date), 'MMM dd, yyyy') : '-'}
                           </TableCell>
                          <TableCell>
                            {timesheet.clockIn?.time ? 
                              format(parseISO(timesheet.clockIn.time), 'HH:mm') : 
                              '-'
                            }
                          </TableCell>
                          <TableCell>
                            {timesheet.clockOut?.time ? 
                              format(parseISO(timesheet.clockOut.time), 'HH:mm') : 
                              '-'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDuration(timesheet.totalHours)}</div>
                          </TableCell>
                          <TableCell>
                            {timesheet.overtimeHours > 0 ? (
                              <Badge variant="secondary">
                                +{formatDuration(timesheet.overtimeHours)}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-full ${getStatusColor(timesheet.status)}`} />
                              <span className="text-sm capitalize">{timesheet.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

      {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                        {Math.min(currentPage * itemsPerPage, filteredTimesheets.length)} of{' '}
                        {filteredTimesheets.length} entries
          </div>
                      <div className="flex items-center gap-2">
            <Button
              variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
            >
                          <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
            <Button
              variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
            >
              Next
                          <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Trends</CardTitle>
                <CardDescription>Work hours distribution over the week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12" />
                  <span className="ml-2">Chart visualization coming soon</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Employees with perfect attendance</CardDescription>
              </CardHeader>
              <CardContent>
                                 <div className="space-y-3">
                   {Array.isArray(timesheets) && timesheets.length > 0 ? (
                     timesheets.slice(0, 5).map((ts, index) => (
                       <div key={index} className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className="text-lg font-bold text-muted-foreground">
                             #{index + 1}
                           </div>
                           <div>
                             <div className="font-medium">{ts.userName}</div>
                             <div className="text-xs text-muted-foreground">{ts.userDepartment}</div>
                           </div>
                         </div>
                          <Badge variant="default">
                           {formatDuration(ts.totalHours)}
                         </Badge>
                       </div>
                     ))
                   ) : (
                     <div className="text-center text-muted-foreground py-4">
                       No timesheet data available
                     </div>
                   )}
                 </div>
              </CardContent>
            </Card>
          </div>
          </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimesheetDashboard; 