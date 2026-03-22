/**
 * Depo Injection Dashboard Component
 * 
 * Displays overview of Depo-Provera injection schedules with Ethiopian calendar support
 */

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  TrendingUp,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import depoInjectionService, { 
  DepoInjectionSchedule, 
  DashboardData 
} from '../../services/depoInjectionService';
import DepoInjectionScheduleModal from './DepoInjectionScheduleModal';
import DepoInjectionList from './DepoInjectionList';
import EthiopianCalendarDisplay from './EthiopianCalendarDisplay';

const DepoInjectionDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'upcoming' | 'overdue' | 'all'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await depoInjectionService.getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCreated = () => {
    setShowScheduleModal(false);
    fetchDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'text-destructive bg-destructive/20';
      case 'due':
        return 'text-accent-foreground bg-accent/20';
      case 'due_soon':
        return 'text-accent-foreground bg-accent/20';
      case 'upcoming':
        return 'text-primary bg-primary/20';
      default:
        return 'text-muted-foreground bg-muted/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return '⚠️';
      case 'due':
        return '🔴';
      case 'due_soon':
        return '🟡';
      case 'upcoming':
        return '🟢';
      default:
        return 'ℹ️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const { statistics, upcomingInjections, overdueInjections, dueToday } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-muted-foreground">Depo Injection Management</h1>
          <p className="text-muted-foreground">Track Depo-Provera injection schedules with Ethiopian calendar</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Schedule
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-primary-foreground p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Schedules</p>
              <p className="text-2xl font-bold text-muted-foreground">{statistics.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-primary-foreground p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-destructive">{statistics.overdue}</p>
            </div>
          </div>
        </div>

        <div className="bg-primary-foreground p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-accent-foreground" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Due Today</p>
              <p className="text-2xl font-bold text-accent-foreground">{statistics.dueToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-primary-foreground p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CalendarDays className="h-8 w-8 text-accent-foreground" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Due This Week</p>
              <p className="text-2xl font-bold text-accent-foreground">{statistics.dueThisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-primary-foreground p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">On Schedule</p>
              <p className="text-2xl font-bold text-primary">{statistics.onSchedule}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/30">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', count: statistics.total },
            { id: 'upcoming', label: 'Upcoming', count: upcomingInjections.length },
            { id: 'overdue', label: 'Overdue', count: overdueInjections.length },
            { id: 'all', label: 'All Schedules', count: statistics.total }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
              }`}
            >
              {tab.label}
              <span className="ml-2 bg-muted/20 text-muted-foreground py-0.5 px-2 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border/40 rounded-lg hover:bg-muted/10">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Content */}
      <div className="bg-primary-foreground rounded-lg shadow-sm border">
        {selectedTab === 'overview' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Overview</h3>
            
            {/* Due Today */}
            {dueToday.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-muted-foreground mb-3">Due Today</h4>
                <div className="space-y-3">
                  {dueToday.map((schedule) => (
                    <div key={schedule._id} className="flex items-center justify-between p-4 bg-accent/10 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getStatusIcon(schedule.injectionStatus.status)}</span>
                        <div>
                          <p className="font-medium text-muted-foreground">{schedule.patientName}</p>
                          <p className="text-sm text-muted-foreground">Patient ID: {schedule.patientId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <EthiopianCalendarDisplay 
                          ethiopianDate={schedule.nextInjectionEthiopianDate}
                          gregorianDate={schedule.nextInjectionDate}
                        />
                        <p className="text-sm text-accent-foreground font-medium">{schedule.injectionStatus.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Injections */}
            {upcomingInjections.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-muted-foreground mb-3">Upcoming (Next 7 Days)</h4>
                <div className="space-y-3">
                  {upcomingInjections.slice(0, 5).map((schedule) => (
                    <div key={schedule._id} className="flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getStatusIcon(schedule.injectionStatus.status)}</span>
                        <div>
                          <p className="font-medium text-muted-foreground">{schedule.patientName}</p>
                          <p className="text-sm text-muted-foreground">Patient ID: {schedule.patientId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <EthiopianCalendarDisplay 
                          ethiopianDate={schedule.nextInjectionEthiopianDate}
                          gregorianDate={schedule.nextInjectionDate}
                        />
                        <p className="text-sm text-primary font-medium">{schedule.injectionStatus.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Injections */}
            {overdueInjections.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-muted-foreground mb-3">Overdue</h4>
                <div className="space-y-3">
                  {overdueInjections.slice(0, 5).map((schedule) => (
                    <div key={schedule._id} className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getStatusIcon(schedule.injectionStatus.status)}</span>
                        <div>
                          <p className="font-medium text-muted-foreground">{schedule.patientName}</p>
                          <p className="text-sm text-muted-foreground">Patient ID: {schedule.patientId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <EthiopianCalendarDisplay 
                          ethiopianDate={schedule.nextInjectionEthiopianDate}
                          gregorianDate={schedule.nextInjectionDate}
                        />
                        <p className="text-sm text-destructive font-medium">{schedule.injectionStatus.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'upcoming' && (
          <DepoInjectionList 
            schedules={upcomingInjections}
            searchTerm={searchTerm}
            onRefresh={fetchDashboardData}
          />
        )}

        {selectedTab === 'overdue' && (
          <DepoInjectionList 
            schedules={overdueInjections}
            searchTerm={searchTerm}
            onRefresh={fetchDashboardData}
          />
        )}

        {selectedTab === 'all' && (
          <DepoInjectionList 
            schedules={[]}
            searchTerm={searchTerm}
            onRefresh={fetchDashboardData}
            showAll={true}
          />
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <DepoInjectionScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onScheduleCreated={handleScheduleCreated}
        />
      )}
    </div>
  );
};

export default DepoInjectionDashboard;

