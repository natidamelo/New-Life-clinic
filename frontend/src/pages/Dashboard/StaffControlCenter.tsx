import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  UserCog, 
  Users, 
  Stethoscope, 
  Activity, 
  HeartPulse, 
  TestTube, 
  ClipboardList, 
  Clock, 
  Bell,
  Search,
  MoreHorizontal,
  Filter,
  Calendar,
  BarChart3,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import attendanceService, { AttendanceData, AttendanceSummary } from '../../services/attendanceService';
import staffService, { StaffMember, DepartmentStats, StaffOverview } from '../../services/staffService';
import apiService from '../../services/apiService';
import EthiopianTimeDisplay from '../../components/EthiopianTimeDisplay';

// Lazy load heavy components for better initial performance
const TimesheetDashboard = lazy(() => import('../../components/Timesheet/TimesheetDashboard'));
const AttendanceTracker = lazy(() => import('../../components/Timesheet/AttendanceTracker'));
const MergedAttendanceView = lazy(() => import('../../components/Timesheet/MergedAttendanceView'));
const PatientAssignmentInterface = lazy(() => import('../../components/PatientAssignmentInterface'));
const LeaveManagement = lazy(() => import('../../components/LeaveManagement'));

// Loading component for suspense fallbacks
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Memoized Staff Card component for better performance
const MemoizedStaffCard = React.memo(({ member }: { member: StaffMember }) => (
  <Card className="group hover:shadow-lg transition-shadow duration-200">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/20">
              {member.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-sm font-medium">{member.name}</CardTitle>
            <CardDescription className="text-xs">
              {member.role} {member.specialization && `• ${member.specialization}`}
            </CardDescription>
          </div>
        </div>
        <Badge 
          variant={
            member.status === 'online' ? 'default' :
            member.status === 'busy' ? 'secondary' :
            member.status === 'away' ? 'outline' :
            'destructive'
          }
          className="text-xs"
        >
          {member.status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Patients: {member.assignedPatients || 0}</span>
        <span className="text-muted-foreground text-xs">{member.lastActive || 'Never'}</span>
      </div>
    </CardContent>
    <CardFooter className="pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Assign Patients</DropdownMenuItem>
          <DropdownMenuItem>Contact</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardFooter>
  </Card>
));


const StaffControlCenter: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Automatic attendance status
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'offline' | 'loading'>('loading');
  const [lastActivity, setLastActivity] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // State for month navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State for monthly attendance data cache
  const [monthlyAttendanceCache, setMonthlyAttendanceCache] = useState<{
    [key: string]: { staff: AttendanceData[], summary: AttendanceSummary }
  }>({});
  
  // State for loading monthly data
  const [isLoadingMonthlyData, setIsLoadingMonthlyData] = useState(false);
  
  // State for leave notification count
  const [leaveNotificationCount, setLeaveNotificationCount] = useState(0);

  // Memoized filtered staff members for better performance
  const filteredStaffMembers = useMemo(() => {
    let filtered = Array.isArray(staffMembers) ? staffMembers : [];

    // Apply search query filter
    if (searchQuery) {
      filtered = filtered.filter(member =>
        (member.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.specialization || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (activeFilter && activeFilter !== 'all') {
      filtered = filtered.filter(member => member.role === activeFilter);
    }

    return filtered;
  }, [staffMembers, searchQuery, activeFilter]);

  // Memoized department stats for better performance
  const departmentSummary = useMemo(() => {
    if (!departments || departments.length === 0) {
      return {
        totalDepartments: 0,
        totalStaff: 0,
        activeStaff: 0,
        totalPatients: 0
      };
    }
    
    return {
      totalDepartments: departments.length,
      totalStaff: departments.reduce((sum, dept) => sum + (dept.staffCount || 0), 0),
      activeStaff: departments.reduce((sum, dept) => sum + (dept.activeCount || 0), 0),
      totalPatients: departments.reduce((sum, dept) => sum + (dept.patientCount || 0), 0)
    };
  }, [departments]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter === activeFilter ? null : filter);
  }, [activeFilter]);

  // Load real data from API - OPTIMIZED with parallel loading
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load data in parallel for better performance
        const [overview, staff] = await Promise.all([
          staffService.getStaffOverview(),
          staffService.getStaffMembersWithAssignments()
        ]);
        
        // Update state with loaded data
        setDepartments(overview.departmentStats || []);
        setRecentActivity(overview.recentActivity || []);
        setStaffMembers(Array.isArray(staff) ? staff : []);
        
        // Fetch leave notification count
        try {
          const response = await apiService.get('/api/leave/notifications/count');
          setLeaveNotificationCount(response.data.count);
        } catch (error) {
          console.error('Error fetching leave notification count:', error);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading staff data:', error);
        toast({
          title: "Error",
          description: "Failed to load staff data. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Automatic attendance tracking
  useEffect(() => {
    const loadAttendanceStatus = async () => {
      try {
        const status = await attendanceService.getMyAttendanceStatus();
        setAttendanceStatus(status?.status || 'absent');
        setLastActivity(status?.lastActivity || '');
      } catch (error) {
        console.error('Error loading attendance status:', error);
        setAttendanceStatus('absent');
      }
    };

    const loadAttendanceData = async () => {
      try {
        // Use real staff data instead of mock attendance data
        const data = await staffService.getAttendanceData();
        if (data && data.success) {
          setAttendanceData(Array.isArray(data.attendanceData) ? data.attendanceData : []);
          setAttendanceSummary(data.summary || null);
        } else {
          // Fallback to empty data if API fails
          setAttendanceData([]);
          setAttendanceSummary(null);
        }
      } catch (error) {
        console.error('Error loading attendance data:', error);
        setAttendanceData([]);
        setAttendanceSummary(null);
      }
    };

    loadAttendanceStatus();
    loadAttendanceData();
    
    // Fetch current month's attendance data
    const now = new Date();
    fetchMonthlyAttendance(now.getFullYear(), now.getMonth());
    
    // Start automatic activity tracking
    attendanceService.startActivityTracking();

    const interval = setInterval(loadAttendanceData, 60000);

    return () => {
      clearInterval(interval);
      attendanceService.stopActivityTracking();
    };
  }, []);

  // Filter staff based on search query and active filter
  const filteredStaff = (Array.isArray(staffMembers) ? staffMembers : []).filter(staff => {
    // Apply search filter
    const matchesSearch = (staff.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (staff.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (staff.department && staff.department.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Apply role filter
    const matchesFilter = !activeFilter || staff.role === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'doctor': return 'bg-primary/20 text-primary';
      case 'nurse': return 'bg-primary/20 text-primary';
      case 'lab': return 'bg-secondary/20 text-secondary-foreground';
      case 'reception': return 'bg-accent/20 text-accent-foreground';
      case 'admin': return 'bg-muted/20 text-muted-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online': return 'bg-primary';
      case 'busy': return 'bg-destructive';
      case 'away': return 'bg-accent';
      case 'offline': return 'bg-muted/50';
      default: return 'bg-muted/50';
    }
  };

  const handleViewDepartment = (department: string) => {
    // Navigate to appropriate department dashboard
    switch (department.toLowerCase()) {
      case 'doctors/opd':
        navigate('/app/doctor');
        break;
      case 'nurses/ward':
        navigate('/nurse');
        break;
      case 'laboratory':
        navigate('/lab');
        break;
      case 'reception':
        navigate('/reception');
        break;
      default:
        navigate('/patient-services');
    }
  };

  const handleManageStaff = () => {
    navigate('/staff-management');
  };

  const handleViewStaffDetails = (staffId: string) => {
    toast({
      title: "Staff Profile",
      description: `Viewing profile for staff ID: ${staffId}`,
    });
    // In a real app, navigate to staff profile
    // navigate(`/staff/${staffId}`);
  };

  const handleAssignPatients = (staffId: string) => {
    toast({
      title: "Assign Patients",
      description: `Opening assignment interface for staff ID: ${staffId}`,
    });
    // In a real app, open assignment modal or navigate to assignment page
  };

  // Helper function to calculate month attendance for a staff member
  const calculateMonthAttendance = (staff: any) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let present = 0;
    let total = 0;
    let noData = 0;
    
    // If we have daily attendance data from the monthly API, use it
    if (staff.dailyAttendance) {
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isFuture = date > new Date();
        
        if (!isWeekend && !isFuture) {
          total++;
          const dateKey = date.toISOString().split('T')[0];
          const dayData = staff.dailyAttendance[dateKey];
          
          if (dayData) {
            if (dayData.status === 'present' || dayData.status === 'overtime-checkin' || dayData.status === 'overtime-complete') {
              present++;
            } else if (dayData.status === 'absent') {
              // Absent is actual data, not no-data
            }
          } else {
            noData++;
          }
        }
      }
    } else {
      // Fallback to the old method if no daily attendance data
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isFuture = date > new Date();
        
        if (!isWeekend && !isFuture) {
          total++;
          const status = getAttendanceStatus(staff, date);
          if (status === 'present') {
            present++;
          } else if (status === 'no-data') {
            noData++;
          }
        }
      }
    }
    
    // Count all days that are not no-data (including absent days) for percentage calculation
    const daysWithData = total - noData;

    return {
      present,
      total: daysWithData > 0 ? daysWithData : total,
      noData,
      absent: total - noData - present  // Calculate absent days
    };
  };

  // Helper function to get attendance status for a specific date
  const getAttendanceStatus = (staff: any, date: Date) => {
    const dateString = date.toDateString();
    const isToday = dateString === new Date().toDateString();
    const isWeekend = date.getDay() === 0; // Saturday is working day, so only Sunday is weekend
    
    // Always mark weekends as weekend
    if (isWeekend) {
      return 'weekend';
    }
    
    // For today, use the real status from the API
    if (isToday) {
      return staff.status;
    }
    
    // For past dates, check if we have real data from the monthly API
    if (staff.dailyAttendance) {
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const dayData = staff.dailyAttendance[dateKey];
      
      if (dayData) {
        // Map the status from the monthly API to the expected format
        switch (dayData.status) {
          case 'present':
            return 'present';
          case 'absent':
            return 'absent';
          case 'overtime-checkin':
            return 'overtime-checkin';
          case 'overtime-complete':
            return 'overtime-complete';
          case 'late':
            return 'late';
          case 'offline':
            return 'offline';
          case 'future':
            return 'future';
          case 'weekend':
            return 'weekend';
          case 'no-data':
            return 'no-data';
          default:
            // Handle any other status values by returning them as-is
            return dayData.status || 'no-data';
        }
      }
    }
    
    // If no data available for this date, show as no-data
    return 'no-data';
  };

  // Function to fetch monthly attendance data
  const fetchMonthlyAttendance = async (year: number, month: number) => {
    const cacheKey = `${year}-${month}`;
    
    // Check if data is already cached
    if (monthlyAttendanceCache[cacheKey]) {
      const cachedData = monthlyAttendanceCache[cacheKey];
      setAttendanceData(Array.isArray(cachedData.staff) ? cachedData.staff : []);
      setAttendanceSummary(cachedData.summary || null);
      return;
    }
    
    setIsLoadingMonthlyData(true);
    
    try {
      // Use the new monthly attendance endpoint
      const data = await staffService.getMonthlyAttendanceData(year, month, 'all');
      if (data && data.success) {
        // Cache the data
        setMonthlyAttendanceCache(prev => ({
          ...prev,
          [cacheKey]: data
        }));
        
        // Update current display with safety checks
        setAttendanceData(Array.isArray(data.monthlyAttendanceData) ? data.monthlyAttendanceData : []);
        setAttendanceSummary(data.summary || null);

      } else {
        // Set empty data with proper error indication
        setAttendanceData([]);
        setAttendanceSummary(null);
        toast({
          title: "No Data Available",
          description: `No attendance data found for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error(`Error fetching monthly attendance for ${year}-${month}:`, error);
      // Set empty data on error with user notification
      setAttendanceData([]);
      setAttendanceSummary(null);

      toast({
        title: "Error Loading Data",
        description: `Failed to load attendance data for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoadingMonthlyData(false);
    }
  };

  // Function to handle month navigation
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    
    setCurrentMonth(newMonth);
    
    // Fetch data for the new month
    fetchMonthlyAttendance(newMonth.getFullYear(), newMonth.getMonth());
  };

  const renderDepartmentCards = () => {
    return departments.map((dept) => {
      const presenceRatio = dept.staffCount > 0 ? (dept.activeCount / dept.staffCount) * 100 : 0;
      
      return (
        <Card key={dept.name} className="overflow-hidden border border-border/40 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 pb-3 border-b border-border/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{dept.name}</CardTitle>
                <CardDescription className="text-xs">
                  {dept.staffCount} staff member{dept.staffCount !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="rounded-lg bg-primary/10 p-1.5 group-hover:bg-primary/20 transition-all">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Presence Progress Bar */}
            <div className="mb-4 space-y-1">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Presence Ratio</span>
                <span className="font-semibold text-primary">{Math.round(presenceRatio)}%</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${presenceRatio}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{dept.activeCount}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Active</div>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{dept.patientCount}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Patients</div>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{dept.pendingTasks}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tasks</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/5 flex justify-between border-t border-border/10 py-3">
            <Button variant="outline" size="sm" onClick={() => handleViewDepartment(dept.name)} className="h-8 text-xs font-medium">
              View Dashboard
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary hover:text-primary/80">
              Live Status
            </Button>
          </CardFooter>
        </Card>
      );
    });
  };

  const renderStaffList = () => {
    if (filteredStaff.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No staff members found matching your criteria
        </div>
      );
    }

    return filteredStaff.map((staff) => (
      <div key={staff.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/10">
        <div className="flex items-center">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={staff.avatar} alt={staff.name} />
              <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${getStatusColor(staff.status)}`}>
              {staff.status === 'online' && (
                <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-75"></span>
              )}
            </span>
          </div>
          <div className="ml-4">
            <div className="font-medium">{staff.name}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className={`${getRoleColor(staff.role)} capitalize`}>
                {staff.role}
              </Badge>
              {staff.department && <span>{staff.department}</span>}
              {staff.specialization && <span>• {staff.specialization}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {staff.assignedPatients || 0} patient{(staff.assignedPatients || 0) !== 1 ? 's' : ''}
          </Badge>
          <span className="text-sm text-muted-foreground">{staff.lastActive}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewStaffDetails(staff.id)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAssignPatients(staff.id)}>
                Assign Patients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/${staff.role}`)}>
                Go to Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    ));
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5">
              <UserCog className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Staff Control Center</h1>
          </div>
          <p className="text-muted-foreground mt-1 ml-14">Monitor and manage staff across departments</p>
          <div className="ml-14 mt-1">
            <EthiopianTimeDisplay className="" />
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button variant="outline" onClick={handleManageStaff} className="shadow-sm">
            <UserCog className="mr-2 h-4 w-4" />
            Manage Staff
          </Button>
          <Button className="shadow-sm bg-gradient-to-r from-primary to-primary/80">
            <Users className="mr-2 h-4 w-4" />
            Assign Tasks
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="clock-in-out">Clock In/Out</TabsTrigger>
          <TabsTrigger value="assignments">Patient Assignments</TabsTrigger>
          <TabsTrigger value="leave-management" className="relative">
            Leave Management
            {leaveNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {leaveNotificationCount > 9 ? '9+' : leaveNotificationCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Staff</p>
                    <p className="text-2xl font-bold mt-1">{departmentSummary.totalStaff}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 p-2.5">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Now</p>
                    <p className="text-2xl font-bold mt-1">{departmentSummary.activeStaff}</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-2.5">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500/10 to-violet-600/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Departments</p>
                    <p className="text-2xl font-bold mt-1">{departmentSummary.totalDepartments}</p>
                  </div>
                  <div className="rounded-xl bg-violet-500/10 p-2.5">
                    <BarChart3 className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Patients</p>
                    <p className="text-2xl font-bold mt-1">{departmentSummary.activeStaff > 0 ? departmentSummary.totalPatients : 0}</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-2.5">
                    <Stethoscope className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array(4).fill(0).map((_, index) => (
                <Card key={index} className="h-[180px] animate-pulse bg-muted/20">
                  <div className="p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted/40 rounded w-3/4"></div>
                      <div className="h-3 bg-muted/40 rounded w-1/2"></div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              renderDepartmentCards()
            )}
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Live staff activity across all departments</CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 8).map((activity: any, index: number) => (
                    <div key={activity.id || index} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                      <div className={`rounded-full p-2 ${
                        activity.action === 'Clocked Out' ? 'bg-orange-500/10' : 'bg-green-500/10'
                      }`}>
                        {activity.action === 'Clocked Out' ? (
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                        ) : (
                          <Activity className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{activity.role || 'staff'}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {activity.action} at {(() => {
                              try {
                                const d = new Date(activity.time);
                                return isNaN(d.getTime()) ? activity.time : d.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              } catch (e) {
                                return activity.time;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No recent activity recorded today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Staff Directory</CardTitle>
                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Filter className="h-3.5 w-3.5" />
                        {activeFilter ? `Filter: ${activeFilter}` : 'Filter'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setActiveFilter(null)}>
                        All Staff
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveFilter('doctor')}>
                        Doctors
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveFilter('nurse')}>
                        Nurses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveFilter('lab')}>
                        Lab Staff
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveFilter('reception')}>
                        Reception
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search staff..."
                      className="w-[200px] pl-8 h-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin mr-2">
                    <Clock className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <span>Loading staff directory...</span>
                </div>
              ) : (
                renderStaffList()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheets" className="space-y-4">
          <Suspense fallback={<ComponentLoader />}>
            <TimesheetDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="clock-in-out" className="space-y-4">
          <Suspense fallback={<ComponentLoader />}>
            <MergedAttendanceView />
          </Suspense>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          
          <Card>
            <CardHeader>
              <CardTitle>Attendance Calendar</CardTitle>
              <CardDescription>
                Row: Staff Names | Columns: Dates - Track attendance across time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceSummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{attendanceSummary.totalPresent || 0}</div>
                    <div className="text-sm text-primary">Present</div>
                  </div>
                  <div className="text-center p-4 bg-destructive/10 rounded-lg">
                    <div className="text-2xl font-bold text-destructive">{attendanceSummary.totalAbsent || 0}</div>
                    <div className="text-sm text-destructive">Absent</div>
                  </div>
                  <div className="text-center p-4 bg-accent/10 rounded-lg">
                    <div className="text-2xl font-bold text-accent-foreground">{attendanceSummary.totalOvertime || 0}</div>
                    <div className="text-sm text-accent-foreground">Overtime</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{attendanceSummary.totalStaff || 0}</div>
                    <div className="text-sm text-primary">Total Staff</div>
                  </div>
                  <div className="text-center p-4 bg-muted/10 rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">
                      {(attendanceSummary.averageWorkHours || 0).toFixed(1)}h
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Hours</div>
                  </div>
                </div>
              )}

              {/* Attendance Table with Rows (Staff) and Columns (Dates) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-muted-foreground">Staff Attendance Matrix - Full Month</h3>
                    {isLoadingMonthlyData && (
                      <div className="flex items-center space-x-2 text-sm text-primary">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Loading monthly data...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      {currentMonth.toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </Button>
                  </div>
                </div>
                
                {/* Info about data sources */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <div className="text-primary mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-sm text-primary">
                      <p className="font-medium">Data Source Information:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• <strong>Today:</strong> Real-time data from current session</li>
                        <li>• <strong>Past dates:</strong> Historical data from monthly API (shows "N" if no data available)</li>
                        <li>• <strong>Future dates:</strong> Marked as "-" (not yet occurred)</li>
                        <li>• <strong>Weekends:</strong> Automatically marked as non-working days</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMonthChange('prev')}
                    disabled={isLoadingMonthlyData}
                  >
                    {isLoadingMonthlyData ? 'Loading...' : '← Previous Month'}
                  </Button>
                  <span className="text-lg font-medium text-muted-foreground">
                    {currentMonth.toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMonthChange('next')}
                    disabled={isLoadingMonthlyData}
                  >
                    {isLoadingMonthlyData ? 'Loading...' : 'Next Month →'}
                  </Button>
                </div>

                {/* Attendance Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border/30 rounded-lg overflow-hidden">
                    <thead className="bg-muted/10">
                      <tr>
                        <th className="border border-border/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground bg-muted/20 sticky left-0 z-10">
                          Staff Member
                        </th>
                        <th className="border border-border/30 px-4 py-3 text-center text-sm font-medium text-muted-foreground bg-muted/20 sticky left-0 z-10">
                          Role
                        </th>
                        <th className="border border-border/30 px-4 py-3 text-center text-sm font-medium text-muted-foreground bg-muted/20 sticky left-0 z-10">
                          Department
                        </th>
                        {/* Generate date columns for the entire month */}
                        {(() => {
                          const year = currentMonth.getFullYear();
                          const month = currentMonth.getMonth();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          
                          return Array.from({ length: daysInMonth }, (_, i) => {
                            const date = new Date(year, month, i + 1);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isWeekend = date.getDay() === 0; // Saturday is working day, so only Sunday is weekend
                            const isPast = date < new Date();
                            
                            return (
                              <th key={i} className={`border border-border/30 px-2 py-3 text-center text-sm font-medium ${
                                isToday ? 'bg-primary/20 text-primary' : 
                                isWeekend ? 'bg-muted/20 text-muted-foreground' : 
                                'bg-muted/20 text-muted-foreground'
                              }`}>
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-muted-foreground">
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                  </span>
                                  <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                                    {date.getDate()}
                                  </span>
                                </div>
                              </th>
                            );
                          });
                        })()}
                        <th className="border border-border/30 px-4 py-3 text-center text-sm font-medium text-muted-foreground bg-muted/20">
                          Month Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-primary-foreground">
                      {isLoadingMonthlyData ? (
                        <tr>
                          <td colSpan={35} className="border border-border/30 px-4 py-8 text-center text-muted-foreground">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              <span>Loading monthly attendance data...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (attendanceData && attendanceData.length > 0) ? (
                        attendanceData.map((staff, staffIndex) => {
                          // Calculate month attendance for this staff member
                          const monthAttendance = calculateMonthAttendance(staff);
                          
                          return (
                            <tr key={staff.userId} className="hover:bg-muted/10">
                              {/* Staff Name */}
                              <td className="border border-border/30 px-4 py-3 sticky left-0 z-10 bg-primary-foreground">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    staff.status === 'present' ? 'bg-primary' :
                                    staff.status === 'offline' ? 'bg-accent' :
                                    'bg-destructive'
                                  }`}></div>
                                  <div>
                                    <div className="font-medium text-muted-foreground">{staff.userName}</div>
                                    <div className="text-xs text-muted-foreground">ID: {staff.userId}</div>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Role */}
                              <td className="border border-border/30 px-4 py-3 text-center sticky left-0 z-10 bg-primary-foreground">
                                <Badge variant="outline" className="capitalize">
                                  {staff.userRole}
                                </Badge>
                              </td>
                              
                              {/* Department */}
                              <td className="border border-border/30 px-4 py-3 text-center sticky left-0 z-10 bg-primary-foreground">
                                <span className="text-sm text-muted-foreground">{staff.department}</span>
                              </td>
                              
                              {/* Date Columns - Generate real attendance data for each day */}
                              {(() => {
                                const year = currentMonth.getFullYear();
                                const month = currentMonth.getMonth();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                
                                return Array.from({ length: daysInMonth }, (_, i) => {
                                  const date = new Date(year, month, i + 1);
                                  const isToday = date.toDateString() === new Date().toDateString();
                                  const isWeekend = date.getDay() === 0; // Saturday is working day, so only Sunday is weekend
                                  const isPast = date < new Date();
                                  const isFuture = date > new Date();
                                  
                                  // Get real attendance status for this staff member on this date
                                  const attendanceStatus = getAttendanceStatus(staff, date);
                                  const dateKey = date.toISOString().split('T')[0];
                                  const dayData = (staff as any).dailyAttendance ? (staff as any).dailyAttendance[dateKey] : null;

                                  let tooltipText = '';
                                  if (dayData) {
                                    if (dayData.status === 'present' || dayData.status === 'late' || dayData.status === 'overtime-complete' || dayData.status === 'overtime-checkin') {
                                      tooltipText = `Status: ${dayData.status.toUpperCase()}\nClock In: ${dayData.clockInTime || 'N/A'}\nClock Out: ${dayData.clockOutTime || 'N/A'}\nWork Hours: ${dayData.workHours ? dayData.workHours.toFixed(1) : '0.0'}h\nOT Hours: ${dayData.overtimeHours ? dayData.overtimeHours.toFixed(1) : '0.0'}h`;
                                    } else {
                                      tooltipText = `Status: ${dayData.status.toUpperCase()}`;
                                    }
                                  } else if (isWeekend) {
                                    tooltipText = 'Sunday (Weekend)';
                                  } else {
                                    tooltipText = isFuture ? 'Future Date' : 'No Attendance Data';
                                  }
                                  
                                  return (
                                    <td 
                                      key={i} 
                                      title={tooltipText} 
                                      className={`border border-border/30 p-2 text-center text-xs transition-colors cursor-help ${
                                        isToday ? 'ring-2 ring-primary ring-inset' : ''
                                      } ${
                                        isFuture ? 'text-muted-foreground/30' :
                                        isWeekend ? 'bg-slate-100 dark:bg-slate-800 text-muted-foreground/40 font-medium' :
                                        attendanceStatus === 'present' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-500/25' :
                                        attendanceStatus === 'overtime-complete' || attendanceStatus === 'overtime-checkin' ? 'bg-violet-500/15 text-violet-700 dark:text-violet-400 font-bold hover:bg-violet-500/25' :
                                        attendanceStatus === 'late' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-500/25' :
                                        attendanceStatus === 'absent' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold hover:bg-rose-500/25' :
                                        'bg-slate-200/50 dark:bg-slate-700/50 text-muted-foreground/60 hover:bg-slate-200/70'
                                      }`}
                                    >
                                      {isFuture ? '-' :
                                       isWeekend ? 'W' :
                                       attendanceStatus === 'present' ? 'P' :
                                       attendanceStatus === 'overtime-complete' || attendanceStatus === 'overtime-checkin' ? 'OT' :
                                       attendanceStatus === 'late' ? 'L' :
                                       attendanceStatus === 'absent' ? 'A' : 'N'}
                                    </td>
                                  );
                                });
                              })()}
                              
                              {/* Month Summary */}
                              <td className="border border-border/30 px-4 py-3 bg-muted/5 min-w-[120px]">
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                    <span>{monthAttendance.present}/{monthAttendance.total} Days</span>
                                    <span>
                                      {monthAttendance.total > 0 ?
                                        `${Math.round((monthAttendance.present / monthAttendance.total) * 100)}%` :
                                        '0%'
                                      }
                                    </span>
                                  </div>
                                  {monthAttendance.total > 0 && (
                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${
                                          (monthAttendance.present / monthAttendance.total) >= 0.85 ? 'bg-emerald-500' :
                                          (monthAttendance.present / monthAttendance.total) >= 0.70 ? 'bg-amber-500' :
                                          'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (monthAttendance.present / monthAttendance.total) * 100)}%` }}
                                      />
                                    </div>
                                  )}
                                  {monthAttendance.noData > 0 && (
                                    <div className="text-[10px] text-muted-foreground/60 text-right">
                                      {monthAttendance.noData} days unrecorded
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={35} className="border border-border/30 px-4 py-8 text-center text-muted-foreground">
                            <div className="text-center">
                              <p className="text-muted-foreground mb-2">No attendance data available for this month</p>
                              <p className="text-sm text-muted-foreground/50">Try selecting a different month or check if data exists</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    
                    {/* Foot Summary Row */}
                    {!isLoadingMonthlyData && (attendanceData && attendanceData.length > 0) && (
                      <tfoot className="bg-muted/10 font-semibold border-t-2 border-border/30">
                        <tr>
                          <td colSpan={3} className="border border-border/30 px-4 py-3 sticky left-0 z-10 bg-muted/20">
                            Daily Presence Totals
                          </td>
                          {(() => {
                            const year = currentMonth.getFullYear();
                            const month = currentMonth.getMonth();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            
                            return Array.from({ length: daysInMonth }, (_, i) => {
                              const date = new Date(year, month, i + 1);
                              const isWeekend = date.getDay() === 0; // Saturday is working day, so only Sunday is weekend
                              const isFuture = date > new Date();
                              
                              if (isFuture) {
                                return <td key={i} className="border border-border/30 px-1 py-3 text-center text-xs text-muted-foreground/40">-</td>;
                              }
                              if (isWeekend) {
                                return <td key={i} className="border border-border/30 px-1 py-3 text-center text-xs text-muted-foreground/40 bg-muted/10">W</td>;
                              }
                              
                              let presentCount = 0;
                              attendanceData.forEach(staff => {
                                const status = getAttendanceStatus(staff, date);
                                if (status === 'present' || status === 'late' || status === 'overtime-complete' || status === 'overtime-checkin') {
                                  presentCount++;
                                }
                              });
                              
                              return (
                                <td key={i} className="border border-border/30 px-1 py-3 text-center text-xs font-bold text-primary">
                                  {presentCount}
                                </td>
                              );
                            });
                          })()}
                          <td className="border border-border/30 px-4 py-3 text-center bg-muted/20">
                            {(() => {
                              let totalPresent = 0;
                              let totalPossible = 0;
                              attendanceData.forEach(staff => {
                                const monthAttendance = calculateMonthAttendance(staff);
                                totalPresent += monthAttendance.present;
                                totalPossible += monthAttendance.total;
                              });
                              return totalPossible > 0 ? `${Math.round((totalPresent / totalPossible) * 100)}%` : '0%';
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">Present (P)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-destructive rounded-full"></div>
                    <span className="text-muted-foreground">Absent (A)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-accent rounded-full"></div>
                    <span className="text-muted-foreground">Offline (O)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-accent rounded-full"></div>
                    <span className="text-muted-foreground">Late (L)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-muted/40 rounded-full"></div>
                    <span className="text-muted-foreground">No Data (N)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-muted/20 rounded-full"></div>
                    <span className="text-muted-foreground">Weekend (W)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Suspense fallback={<ComponentLoader />}>
            <PatientAssignmentInterface />
          </Suspense>
        </TabsContent>

        <TabsContent value="leave-management" className="space-y-4">
          <Suspense fallback={<ComponentLoader />}>
            <LeaveManagement />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffControlCenter; 