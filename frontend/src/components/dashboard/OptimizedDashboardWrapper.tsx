import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Users, Activity, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { universalDashboardService, DashboardStats } from '../../services/universalDashboardService';
import attendanceService from '../../services/attendanceService';

// Loading component for suspense
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-2 text-muted-foreground">Loading...</span>
  </div>
);

// Components are loaded directly - no lazy loading needed for this wrapper

// Memoized stat card component
const MemoizedStatCard = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  trend,
  subtitle
}: {
  title: string;
  value: string | number;
  icon: any;
  color?: string;
  trend?: number;
  subtitle?: string;
}) => {
  const getColorStyle = (color: string) => {
    const colorMap = {
      blue: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
      green: 'linear-gradient(to right, hsl(142 76% 36%), hsl(142 76% 36% / 0.8))',
      purple: 'linear-gradient(to right, hsl(262 83% 58%), hsl(262 83% 58% / 0.8))',
      orange: 'linear-gradient(to right, hsl(25 95% 53%), hsl(25 95% 53% / 0.8))',
      red: 'linear-gradient(to right, hsl(0 84% 60%), hsl(0 84% 60% / 0.8))',
      gray: 'linear-gradient(to right, hsl(215 20% 65%), hsl(215 20% 65% / 0.8))'
    };
    return { background: colorMap[color] || colorMap.blue };
  };

  return (
    <Card className="text-white hover:shadow-lg transition-shadow" style={getColorStyle(color)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-xs font-semibold uppercase tracking-wide">{title}</p>
            <h3 className="text-2xl font-bold text-white drop-shadow-sm">{value}</h3>
            {subtitle && <p className="text-white/85 text-xs mt-1 font-medium">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end">
            <Icon className="h-6 w-6 text-white/90 drop-shadow-sm" />
            {trend !== undefined && (
              <div className="flex items-center mt-1">
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-white/90" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-white/90" />
                )}
                <span className="text-xs ml-1 text-white/90 font-semibold">{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Role-based configuration
const getRoleConfig = (role: string) => {
  const configs = {
    admin: {
      title: 'Admin Dashboard',
      subtitle: 'Complete system overview and management',
      primaryColor: 'blue',
      showAllStats: true,
      delayAttendance: 2000
    },
    doctor: {
      title: 'Doctor Dashboard',
      subtitle: 'Patient care and medical records',
      primaryColor: 'green',
      showAllStats: false,
      delayAttendance: 3000
    },
    nurse: {
      title: 'Nurse Dashboard', 
      subtitle: 'Patient monitoring and care tasks',
      primaryColor: 'purple',
      showAllStats: false,
      delayAttendance: 3000
    },
    reception: {
      title: 'Reception Dashboard',
      subtitle: 'Patient registration and appointments',
      primaryColor: 'orange',
      showAllStats: false,
      delayAttendance: 2000
    },
    lab: {
      title: 'Laboratory Dashboard',
      subtitle: 'Test management and results',
      primaryColor: 'red',
      showAllStats: false,
      delayAttendance: 4000
    },
    billing: {
      title: 'Billing Dashboard',
      subtitle: 'Financial management and invoicing',
      primaryColor: 'green',
      showAllStats: false,
      delayAttendance: 3000
    },
    finance: {
      title: 'Finance Dashboard',
      subtitle: 'Financial analysis and reporting',
      primaryColor: 'blue',
      showAllStats: true,
      delayAttendance: 2000
    }
  };

  return configs[role] || configs.admin;
};

interface OptimizedDashboardWrapperProps {
  children?: React.ReactNode;
  role?: string;
  customStats?: Partial<DashboardStats>;
  hideStats?: boolean;
  hideHeader?: boolean;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

const OptimizedDashboardWrapper: React.FC<OptimizedDashboardWrapperProps> = ({
  children,
  role: propRole,
  customStats,
  hideStats = false,
  hideHeader = false,
  showRefresh = true,
  onRefresh
}) => {
  const { user } = useAuth();
  const role = propRole || user?.role || 'admin';
  const config = getRoleConfig(role);

  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized role-specific stats
  const displayStats = useMemo(() => {
    if (customStats) {
      return { ...stats, ...customStats };
    }
    return stats;
  }, [stats, customStats]);

  // Optimized data loading with progressive loading
  const loadDashboardData = useCallback(async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
        universalDashboardService.invalidateCache();
      } else {
        setIsLoading(true);
      }

      // Show cached data immediately if available (non-blocking)
      try {
        const cachedStats = await universalDashboardService.getCachedStats(role);
        if (cachedStats && !force) {
          setStats(cachedStats);
          setIsLoading(false); // Show cached data immediately
          console.log('✅ [DashboardWrapper] Showing cached stats immediately');
        }
      } catch (error) {
        console.log('No cached stats available, fetching fresh data...');
      }

      // Fetch fresh data in background
      const dashboardStats = await universalDashboardService.getUniversalStats(role);
      setStats(dashboardStats);
      setError(null);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      
      // Handle authentication errors gracefully
      if (err?.response?.status === 401) {
        console.log('[DashboardWrapper] Authentication error, user will be redirected to login');
        setError('Authentication required. Redirecting to login...');
        // The API interceptor will handle the redirect
        return;
      }
      
      setError('Failed to load dashboard data. Please try again.');
      
      // Set fallback stats
      setStats({
        totalPatients: 0,
        totalAppointments: 0,
        totalStaff: 0,
        pendingTasks: 0,
        todayRevenue: 0,
        totalRevenue: 0,
        pendingLabTests: 0,
        completedLabTests: 0,
        criticalAlerts: 0,
        activeNotifications: 0
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [role]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Delayed attendance tracking - start after dashboard is fully loaded
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        try {
          attendanceService.startActivityTracking();
        } catch (error) {
          console.warn('Attendance tracking failed to start:', error);
        }
      }, Math.max(config.delayAttendance, 8000)); // Minimum 8 seconds delay

      return () => {
        clearTimeout(timer);
        attendanceService.stopActivityTracking();
      };
    }
  }, [user, config.delayAttendance]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await loadDashboardData(true);
    onRefresh?.();
  }, [loadDashboardData, onRefresh]);

  // Render role-specific stats cards
  const renderStatsCards = () => {
    if (hideStats || !displayStats) return null;

    const cards = [];

    // Common cards for all roles
    cards.push(
      <MemoizedStatCard
        key="patients"
        title="Total Patients"
        value={displayStats.totalPatients}
        icon={Users}
        color="blue"
      />
    );

    if (['admin', 'reception', 'doctor'].includes(role)) {
      cards.push(
        <MemoizedStatCard
          key="appointments"
          title="Appointments"
          value={displayStats.totalAppointments}
          icon={Clock}
          color="green"
        />
      );
    }

    if (['admin', 'finance', 'billing', 'reception'].includes(role)) {
      cards.push(
        <MemoizedStatCard
          key="revenue"
          title="Today's Revenue"
          value={`$${displayStats.todayRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          subtitle={`Total: $${displayStats.totalRevenue.toLocaleString()}`}
        />
      );
    }

    if (['admin', 'nurse', 'doctor'].includes(role)) {
      cards.push(
        <MemoizedStatCard
          key="tasks"
          title="Pending Tasks"
          value={displayStats.pendingTasks}
          icon={Activity}
          color="orange"
        />
      );
    }

    if (['admin', 'lab', 'doctor'].includes(role)) {
      cards.push(
        <MemoizedStatCard
          key="lab"
          title="Lab Tests"
          value={displayStats.pendingLabTests}
          icon={Activity}
          color="purple"
          subtitle={`Completed: ${displayStats.completedLabTests}`}
        />
      );
    }

    if (displayStats.criticalAlerts > 0) {
      cards.push(
        <MemoizedStatCard
          key="alerts"
          title="Critical Alerts"
          value={displayStats.criticalAlerts}
          icon={AlertTriangle}
          color="red"
        />
      );
    }

    return cards;
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{config.title}</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.firstName || 'User'}! {config.subtitle}
            </p>
          </div>
          {showRefresh && (
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="mt-4 md:mt-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
            <span className="text-destructive">{error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!hideStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : (
            renderStatsCards()
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {isLoading && !stats ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default OptimizedDashboardWrapper;
