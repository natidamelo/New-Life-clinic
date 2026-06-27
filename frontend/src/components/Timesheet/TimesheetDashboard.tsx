import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Users, TrendingUp, Download, 
  Filter, RefreshCw, ChevronLeft, ChevronRight,
  User, Building2, Timer, CheckCircle2, XCircle,
  AlertCircle, FileText, Search, MapPin, Coffee, Eye, Award
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
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, parseISO } from 'date-fns';

interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string;
  date: string;
  clockIn: { time: string; location?: string; method?: string };
  clockOut?: { time: string; location?: string; method?: string };
  breaks: Array<{ startTime: string; endTime?: string; duration?: number; type?: string }>;
  totalHours: number;
  overtimeHours: number;
  status: 'active' | 'completed' | 'approved' | 'rejected' | 'pending';
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

const safeFormat = (dateInput: any, formatStr: string, fallback: string = '-') => {
  if (!dateInput) return fallback;
  try {
    const parsedDate = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
    if (isNaN(parsedDate.getTime())) return fallback;
    return format(parsedDate, formatStr);
  } catch (e) {
    return fallback;
  }
};

const TimesheetDashboard: React.FC = () => {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState<TimesheetEntry[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states for detail view and approval flow
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetEntry | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Filter states
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date()).toISOString().split('T')[0],
    end: endOfWeek(new Date()).toISOString().split('T')[0]
  });
  const [activePreset, setActivePreset] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('week');
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

  // Reload data whenever date range changes
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
      
      const transformedData: TimesheetEntry[] = response.timesheets.map((ts: any) => ({
        id: ts._id || ts.id,
        userId: ts.userId?._id || ts.userId,
        userName: ts.userName || `${ts.userId?.firstName || ''} ${ts.userId?.lastName || ''}`.trim() || 'Unknown',
        userRole: ts.userRole || ts.userId?.role || 'staff',
        userDepartment: ts.department || ts.userDepartment || 'General',
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
      const rows = filteredTimesheets.length > 0 ? filteredTimesheets : timesheets;
      const headers = ['Employee','Department','Date','Clock In','Clock Out','Total Hours','Status'];
      const csvRows = [headers.join(',')];
      rows.forEach((ts) => {
        const dateStr = safeFormat(ts.date, 'yyyy-MM-dd', '');
        const cin = safeFormat(ts.clockIn?.time, 'HH:mm', '');
        const cout = safeFormat(ts.clockOut?.time, 'HH:mm', '');
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

  const handleApprove = async (id: string) => {
    try {
      setIsSubmittingAction(true);
      await staffService.approveTimesheet(id);
      
      // Update local state
      setTimesheets(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' } : t));
      if (selectedTimesheet && selectedTimesheet.id === id) {
        setSelectedTimesheet(prev => prev ? { ...prev, status: 'approved' } : null);
      }
      loadAnalytics();
    } catch (err) {
      console.error('Error approving timesheet:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionNotes.trim()) {
      setShowRejectInput(true);
      return;
    }
    try {
      setIsSubmittingAction(true);
      await staffService.rejectTimesheet(id, rejectionNotes);
      
      // Update local state
      setTimesheets(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected', notes: rejectionNotes } : t));
      if (selectedTimesheet && selectedTimesheet.id === id) {
        setSelectedTimesheet(prev => prev ? { ...prev, status: 'rejected', notes: rejectionNotes } : null);
      }
      setShowRejectInput(false);
      setRejectionNotes('');
      loadAnalytics();
    } catch (err) {
      console.error('Error rejecting timesheet:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const formatDuration = (hours: number) => {
    if (!hours || isNaN(hours)) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25 dark:bg-emerald-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/25 dark:bg-blue-500/20';
      case 'active':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/25 animate-pulse dark:bg-sky-500/20';
      case 'rejected':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/25 dark:bg-rose-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/25 dark:bg-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/25 dark:bg-slate-500/20';
    }
  };

  const getDepartmentStyle = (dept: string) => {
    const d = dept?.toLowerCase() || '';
    if (d.includes('doctor')) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    if (d.includes('nurse')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (d.includes('mch')) return 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20';
    if (d.includes('finance')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (d.includes('admin')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Quick preset helpers
  const toYmd = (d: Date) => d.toISOString().split('T')[0];
  const setPresetDay = () => {
    setActivePreset('day');
    const today = new Date();
    setDateRange({ start: toYmd(startOfDay(today)), end: toYmd(endOfDay(today)) });
  };
  const setPresetWeek = () => {
    setActivePreset('week');
    const today = new Date();
    setDateRange({ start: toYmd(startOfWeek(today)), end: toYmd(endOfWeek(today)) });
  };
  const setPresetMonth = () => {
    setActivePreset('month');
    const today = new Date();
    setDateRange({ start: toYmd(startOfMonth(today)), end: toYmd(endOfMonth(today)) });
  };
  const setPresetYear = () => {
    setActivePreset('year');
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
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80">Timesheet Management</h2>
          <p className="text-muted-foreground mt-1">
            Monitor and manage staff attendance, logs, and work hours
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="border-border/60 hover:bg-muted/50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRefresh} className="shadow-sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Presets & Active Range */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-muted-foreground mr-1.5">Quick Range:</span>
              <Button 
                variant={activePreset === 'day' ? 'default' : 'outline'} 
                size="sm" 
                onClick={setPresetDay}
                className="h-8 text-xs rounded-lg"
              >
                Day
              </Button>
              <Button 
                variant={activePreset === 'week' ? 'default' : 'outline'} 
                size="sm" 
                onClick={setPresetWeek}
                className="h-8 text-xs rounded-lg"
              >
                Week
              </Button>
              <Button 
                variant={activePreset === 'month' ? 'default' : 'outline'} 
                size="sm" 
                onClick={setPresetMonth}
                className="h-8 text-xs rounded-lg"
              >
                Month
              </Button>
              <Button 
                variant={activePreset === 'year' ? 'default' : 'outline'} 
                size="sm" 
                onClick={setPresetYear}
                className="h-8 text-xs rounded-lg"
              >
                Year
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Active Filter:</span>
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold tracking-wider font-mono">
                {dateRange.start}
              </Badge>
              <span className="text-muted-foreground">to</span>
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold tracking-wider font-mono">
                {dateRange.end}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border/20 rounded-xl grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview" className="rounded-lg py-1.5 text-sm font-medium">Overview</TabsTrigger>
          <TabsTrigger value="timesheets" className="rounded-lg py-1.5 text-sm font-medium">Timesheets</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg py-1.5 text-sm font-medium">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/40 relative overflow-hidden bg-card/40 backdrop-blur-md shadow-sm group">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Clock className="h-4 w-4" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight mt-1">
                  {analytics?.totalHours ? formatDuration(analytics.totalHours) : '0h 0m'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Worked this period</p>
              </CardContent>
            </Card>

            <Card className="border-border/40 relative overflow-hidden bg-card/40 backdrop-blur-md shadow-sm group">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Hours</CardTitle>
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500"><TrendingUp className="h-4 w-4" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight mt-1">
                  {analytics?.averageHours ? formatDuration(analytics.averageHours) : '0h 0m'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per active employee</p>
              </CardContent>
            </Card>

            <Card className="border-border/40 relative overflow-hidden bg-card/40 backdrop-blur-md shadow-sm group">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Users className="h-4 w-4" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight mt-1">
                  {analytics?.attendanceRate ? `${analytics.attendanceRate.toFixed(1)}%` : '0%'}
                </div>
                <Progress value={analytics?.attendanceRate || 0} className="mt-3.5 h-1.5 bg-muted/60" />
              </CardContent>
            </Card>

            <Card className="border-border/40 relative overflow-hidden bg-card/40 backdrop-blur-md shadow-sm group">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overtime Hours</CardTitle>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Timer className="h-4 w-4" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight mt-1">
                  {analytics?.overtimeHours ? formatDuration(analytics.overtimeHours) : '0h 0m'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Extra overtime recorded</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats & Leaderboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Punctuality</CardTitle>
                <CardDescription>Timeliness KPIs for this interval</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/10">
                  <span className="text-sm text-muted-foreground">Late Arrivals</span>
                  <Badge variant="destructive" className="px-2.5 font-mono">{analytics?.lateArrivals ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/10">
                  <span className="text-sm text-muted-foreground">Early Departures</span>
                  <Badge variant="destructive" className="px-2.5 font-mono">{analytics?.earlyDepartures ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/10">
                  <span className="text-sm text-muted-foreground">Perfect Attendance Days</span>
                  <Badge variant="default" className="px-2.5 font-mono bg-emerald-500 text-white hover:bg-emerald-600">{analytics?.perfectAttendance ?? 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Department Engagement</CardTitle>
                <CardDescription>Workload capacity and metrics by group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.isArray(analytics?.departmentStats) && analytics.departmentStats.length > 0 ? (
                    analytics.departmentStats.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/10 shadow-sm hover:border-border/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold truncate max-w-[120px]">{dept.name}</div>
                            <div className="text-xs text-muted-foreground">{dept.staffCount} Staff Members</div>
                          </div>
                        </div>
                        <Badge variant="outline" className={`border ${getDepartmentStyle(dept.name)} font-semibold font-mono text-[10px] tracking-wider`}>
                          {formatDuration(dept.avgHours)} / day
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-muted-foreground py-8">
                      No department data compiled for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timesheets Tab */}
        <TabsContent value="timesheets" className="space-y-4">
          {/* Collapsible Filters */}
          <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-bold">Filter Options</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => {
                        setDateRange({ ...dateRange, start: e.target.value });
                        setActivePreset('custom');
                      }}
                      className="h-9 text-xs border-border/50"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => {
                        setDateRange({ ...dateRange, end: e.target.value });
                        setActivePreset('custom');
                      }}
                      className="h-9 text-xs border-border/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="h-9 text-xs border-border/50">
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-9 text-xs border-border/50">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-9 text-xs border-border/50">
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

              <div className="flex flex-col sm:flex-row gap-4 items-end mt-4">
                <div className="flex-1 space-y-1.5 w-full">
                  <Label className="text-xs font-semibold text-muted-foreground">Search Member</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                    <Input
                      placeholder="Search by name or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9 text-xs border-border/50"
                    />
                  </div>
                </div>
                <Button onClick={handleApplyFilters} className="h-9 px-6 text-xs font-medium w-full sm:w-auto shadow-sm">
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timesheets Table */}
          <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-72">
                  <div className="text-center space-y-2">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground text-sm font-medium">Fetching timesheets...</p>
                  </div>
                </div>
              ) : !Array.isArray(filteredTimesheets) || filteredTimesheets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-72 space-y-2 text-center p-6">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/60" />
                  <h3 className="text-base font-semibold">No records found</h3>
                  <p className="text-muted-foreground text-xs max-w-xs">No timesheets match your active filters or date ranges.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="py-3.5">Employee</TableHead>
                          <TableHead className="py-3.5">Department</TableHead>
                          <TableHead className="py-3.5">Date</TableHead>
                          <TableHead className="py-3.5">Clock In</TableHead>
                          <TableHead className="py-3.5">Clock Out</TableHead>
                          <TableHead className="py-3.5">Total Hours</TableHead>
                          <TableHead className="py-3.5">Overtime</TableHead>
                          <TableHead className="py-3.5">Status</TableHead>
                          <TableHead className="py-3.5 text-right pr-6">Inspect</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(paginatedTimesheets) && paginatedTimesheets.map((timesheet) => (
                          <TableRow key={timesheet.id} className="hover:bg-muted/10 border-b border-border/10">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {getInitials(timesheet.userName)}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">{timesheet.userName}</div>
                                  <div className="text-[10px] text-muted-foreground capitalize">{timesheet.userRole}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge variant="outline" className={`border ${getDepartmentStyle(timesheet.userDepartment)} font-semibold text-[10px] tracking-wider`}>
                                {timesheet.userDepartment}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-xs font-medium font-mono">
                              {safeFormat(timesheet.date, 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="py-3 text-xs font-mono">
                              {safeFormat(timesheet.clockIn?.time, 'HH:mm')}
                            </TableCell>
                            <TableCell className="py-3 text-xs font-mono">
                              {safeFormat(timesheet.clockOut?.time, 'HH:mm')}
                            </TableCell>
                            <TableCell className="py-3 text-xs font-semibold font-mono">
                              {formatDuration(timesheet.totalHours)}
                            </TableCell>
                            <TableCell className="py-3 text-xs font-mono">
                              {timesheet.overtimeHours > 0 ? (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/25 font-bold font-mono">
                                  +{formatDuration(timesheet.overtimeHours)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge variant="outline" className={`border ${getStatusBadgeStyle(timesheet.status)} font-semibold text-[10px] tracking-wide`}>
                                {timesheet.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-right pr-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedTimesheet(timesheet);
                                  setShowRejectInput(false);
                                  setRejectionNotes('');
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border/10 bg-muted/10">
                      <div className="text-xs text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                        <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredTimesheets.length)}</span> of{' '}
                        <span className="font-semibold text-foreground">{filteredTimesheets.length}</span> entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="h-8 px-2.5 text-xs rounded-lg border-border/60"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                          Previous
                        </Button>
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0 text-xs rounded-lg border-border/60"
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
                          className="h-8 px-2.5 text-xs rounded-lg border-border/60"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Weekly Hours Distribution</CardTitle>
                <CardDescription>Work hours by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 px-4 pt-6">
                  {(() => {
                    const dayHours: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayCounts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
                    
                    timesheets.forEach(ts => {
                      if (ts.date) {
                        try {
                          const d = parseISO(ts.date);
                          if (!isNaN(d.getTime())) {
                            const dayName = dayNames[d.getDay()];
                            if (dayName) {
                              dayHours[dayName] = (dayHours[dayName] || 0) + (ts.totalHours || 0);
                              dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
                            }
                          }
                        } catch (e) {}
                      }
                    });
                    
                    const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const maxHours = Math.max(...displayDays.map(d => dayCounts[d] > 0 ? dayHours[d] / dayCounts[d] : 0), 1);
                    
                    return displayDays.map(day => {
                      const avgHours = dayCounts[day] > 0 ? dayHours[day] / dayCounts[day] : 0;
                      const heightPercent = (avgHours / maxHours) * 100;
                      const gradients = [
                        'from-emerald-500 to-teal-500',
                        'from-blue-500 to-indigo-500',
                        'from-violet-500 to-purple-500',
                        'from-amber-500 to-orange-500',
                        'from-rose-500 to-pink-500',
                        'from-cyan-500 to-sky-500'
                      ];
                      const colorIndex = displayDays.indexOf(day);
                      
                      return (
                        <div key={day} className="flex flex-col items-center gap-2.5 flex-1 group">
                          <span className="text-[10px] font-bold font-mono text-muted-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {avgHours > 0 ? `${avgHours.toFixed(1)}h` : ''}
                          </span>
                          <div className="w-full bg-muted/20 rounded-t-lg relative" style={{ height: '170px' }}>
                            <div
                              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradients[colorIndex]} rounded-t-lg transition-all duration-700 ease-out opacity-80 hover:opacity-100 shadow-sm`}
                              style={{ height: `${Math.max(heightPercent, 3)}%` }}
                            >
                              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/30 rounded-t-lg" />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">{day}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Top Workloads</CardTitle>
                <CardDescription>Staff members with most work hours this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const userHours: Record<string, { name: string; dept: string; hours: number; days: number }> = {};
                    timesheets.forEach(ts => {
                      if (!userHours[ts.userId]) {
                        userHours[ts.userId] = { name: ts.userName, dept: ts.userDepartment, hours: 0, days: 0 };
                      }
                      userHours[ts.userId].hours += ts.totalHours || 0;
                      userHours[ts.userId].days++;
                    });
                    const sorted = Object.values(userHours).sort((a, b) => b.hours - a.hours).slice(0, 4);
                    const maxHours = sorted[0]?.hours || 1;
                    
                    return sorted.length > 0 ? sorted.map((user, index) => (
                      <div key={index} className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-muted/10 transition-colors">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-extrabold shadow-sm ${
                          index === 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          index === 1 ? 'bg-slate-400/10 text-slate-500 border border-slate-500/20' :
                          index === 2 ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                          'bg-muted/30 text-muted-foreground border border-border/10'
                        }`}>
                          {index + 1 === 1 ? <Award className="h-4.5 w-4.5" /> : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold truncate">{user.name}</span>
                            <Badge variant="outline" className="text-xs font-mono font-bold tracking-wide">
                              {formatDuration(user.hours)}
                            </Badge>
                          </div>
                          <div className="w-full bg-muted/40 rounded-full h-2">
                            <div className="bg-primary rounded-full h-2 transition-all duration-700 ease-out" style={{ width: `${(user.hours / maxHours) * 100}%` }} />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground capitalize">{user.dept}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{user.days} log days</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-muted-foreground py-10">No data available for this range</div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Timesheet Inspect Modal */}
      {selectedTimesheet && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-muted/30 px-6 py-4 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {getInitials(selectedTimesheet.userName)}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">{selectedTimesheet.userName}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{selectedTimesheet.userRole} · {selectedTimesheet.userDepartment}</p>
                </div>
              </div>
              <Badge variant="outline" className={`border ${getStatusBadgeStyle(selectedTimesheet.status)} font-semibold text-[10px]`}>
                {selectedTimesheet.status}
              </Badge>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Clock In</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold font-mono">{safeFormat(selectedTimesheet.clockIn?.time, 'HH:mm:ss')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{selectedTimesheet.clockIn?.location || 'Main Office'}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/60 capitalize block">Method: {selectedTimesheet.clockIn?.method || 'system'}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Clock Out</span>
                  {selectedTimesheet.clockOut?.time ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-rose-500" />
                        <span className="text-sm font-semibold font-mono">{safeFormat(selectedTimesheet.clockOut.time, 'HH:mm:ss')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{selectedTimesheet.clockOut.location || 'Main Office'}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground/60 capitalize block">Method: {selectedTimesheet.clockOut.method || 'system'}</span>
                    </>
                  ) : (
                    <div className="flex items-center h-full text-xs text-muted-foreground font-medium pt-2">
                      No clock-out registered
                    </div>
                  )}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Log Summary</span>
                  <span className="text-xs text-muted-foreground font-medium">Worked hours on {safeFormat(selectedTimesheet.date, 'MMM dd, yyyy')}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono tracking-tight text-primary">{formatDuration(selectedTimesheet.totalHours)}</div>
                  {selectedTimesheet.overtimeHours > 0 && (
                    <div className="text-[10px] text-amber-500 font-mono font-semibold">OT: +{formatDuration(selectedTimesheet.overtimeHours)}</div>
                  )}
                </div>
              </div>

              {/* Breaks */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Breaks History</span>
                {Array.isArray(selectedTimesheet.breaks) && selectedTimesheet.breaks.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedTimesheet.breaks.map((br, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/10 text-xs">
                        <div className="flex items-center gap-2">
                          <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground font-mono">
                            {safeFormat(br.startTime, 'HH:mm')} – {safeFormat(br.endTime, 'HH:mm')}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 font-mono">
                          {br.duration || 0}m break
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic pl-1">No break logs recorded for this shift</span>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Logs Notes</span>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/10 text-xs text-muted-foreground min-h-[50px] leading-relaxed">
                  {selectedTimesheet.notes || 'No comments or anomalies reported for this timesheet.'}
                </div>
              </div>

              {/* Reject Note Input Box */}
              {showRejectInput && (
                <div className="space-y-2 p-3.5 border border-rose-500/25 bg-rose-500/5 rounded-xl animate-in slide-in-from-bottom-2 duration-150">
                  <Label className="text-xs font-bold text-rose-500">Provide Rejection Reason</Label>
                  <Input
                    placeholder="Enter why this timesheet is being rejected..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    className="h-9 text-xs border-rose-500/30 focus-visible:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-muted/30 px-6 py-4 border-t border-border/20 flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedTimesheet(null);
                  setShowRejectInput(false);
                  setRejectionNotes('');
                }}
                className="h-9 text-xs rounded-lg w-full sm:w-auto"
                disabled={isSubmittingAction}
              >
                Close Details
              </Button>
              
              {/* Approval controls only for non-approved completed timesheets */}
              {selectedTimesheet.status !== 'approved' && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => handleReject(selectedTimesheet.id)}
                    className="h-9 text-xs rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 border-rose-500/20 hover:border-rose-500/30 flex-1 sm:flex-initial"
                    disabled={isSubmittingAction}
                  >
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleApprove(selectedTimesheet.id)}
                    className="h-9 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex-1 sm:flex-initial shadow-sm"
                    disabled={isSubmittingAction}
                  >
                    {isSubmittingAction ? 'Processing...' : 'Approve Log'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetDashboard;