import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { 
  Heart, 
  PlusCircle, 
  Users, 
  TrendingUp, 
  Award, 
  Calendar, 
  Activity, 
  Sparkles, 
  DollarSign, 
  ClipboardList 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import healthPackageService, { HealthPackage, PackageUtilization } from '../../services/healthPackageService';
import PackageCatalog from './PackageCatalog';
import AssignPackage from './AssignPackage';
import PatientPackageOverview from './PatientPackageOverview';
import toast from 'react-hot-toast';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

const PackagesDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('active-packages');
  const [packagesCount, setPackagesCount] = useState<number>(0);
  const [activeSubscribersCount, setActiveSubscribersCount] = useState<number>(0);
  const [totalVisitsUsed, setTotalVisitsUsed] = useState<number>(0);
  const [utilizationRate, setUtilizationRate] = useState<number>(0);
  const [utilizationData, setUtilizationData] = useState<PackageUtilization[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Fetch quick stats for top cards
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const [catalog, report] = await Promise.all([
        healthPackageService.getPackages(),
        healthPackageService.getPackageUtilizationReport()
      ]);

      setPackagesCount(catalog.length);
      setUtilizationData(report);

      let totalAssigned = 0;
      let totalUsed = 0;
      let totalAllocated = 0;

      report.forEach(item => {
        totalAssigned += item.totalAssigned;
        totalUsed += item.totalVisitsConsumed;
        totalAllocated += item.totalVisitsAllocated;
      });

      setActiveSubscribersCount(totalAssigned);
      setTotalVisitsUsed(totalUsed);
      setUtilizationRate(totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0);
    } catch (error) {
      console.error('Error loading package stats:', error);
      toast.error('Failed to load package statistics.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  const canManageCatalog = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'finance';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 via-background to-accent/5 p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-primary/20 text-primary text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              New Module
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent-foreground bg-clip-text text-transparent">
            Health Package Bundles
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Predefined health packages (BP, Diabetic, Checkups) with subscription management, multi-stage visit tracking (Reception → Nurse → Doctor → Lab), and vital signs trend analytics.
          </p>
        </div>
        {user?.role !== 'nurse' && (
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setActiveTab('assign-package')}
              className="shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-200"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Subscribe Patient
            </Button>
          </div>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Subscriptions"
          value={isLoadingStats ? "..." : activeSubscribersCount}
          subtext="Across all patients"
          icon={<Users className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          title="Package Templates"
          value={isLoadingStats ? "..." : packagesCount}
          subtext="Predefined catalog configurations"
          icon={<Award className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          title="Visits Consumed"
          value={isLoadingStats ? "..." : totalVisitsUsed}
          subtext="Visits checked-in & tracked"
          icon={<Activity className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          title="Visits Utilization Rate"
          value={isLoadingStats ? "..." : `${utilizationRate}%`}
          subtext="Visits consumed vs allocated"
          icon={<TrendingUp className="h-4 w-4" />}
          color="yellow"
          progress={isLoadingStats ? undefined : utilizationRate}
        />
      </div>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="border-b border-border pb-1">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="active-packages" className="rounded-lg text-sm px-4 py-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Active Subscriptions
            </TabsTrigger>
            {user?.role !== 'nurse' && (
              <TabsTrigger value="assign-package" className="rounded-lg text-sm px-4 py-2 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> Subscribe Patient
              </TabsTrigger>
            )}
            <TabsTrigger value="package-catalog" className="rounded-lg text-sm px-4 py-2 flex items-center gap-2">
              <Award className="w-4 h-4" /> Package Catalog
            </TabsTrigger>
            <TabsTrigger value="utilization-reports" className="rounded-lg text-sm px-4 py-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Utilization Report
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Active Packages */}
        <TabsContent value="active-packages" className="space-y-4 outline-none">
          <PatientPackageOverview />
        </TabsContent>

        {/* Tab 2: Subscribe Patient */}
        <TabsContent value="assign-package" className="outline-none">
          <AssignPackage onComplete={() => setActiveTab('active-packages')} />
        </TabsContent>

        {/* Tab 3: Catalog templates */}
        <TabsContent value="package-catalog" className="outline-none">
          <PackageCatalog canManage={canManageCatalog} />
        </TabsContent>

        {/* Tab 4: Reports */}
        <TabsContent value="utilization-reports" className="outline-none">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Package Utilization Report
              </CardTitle>
              <CardDescription>
                Overview of total subscriber counts, visit allocation, and consumption performance metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="space-y-3">
                  <div className="h-10 bg-muted animate-pulse rounded" />
                  <div className="h-24 bg-muted animate-pulse rounded" />
                </div>
              ) : utilizationData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No subscriptions recorded yet to compile reports.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="py-3 px-4">Package Name</th>
                        <th className="py-3 px-4 text-center">Subscribers</th>
                        <th className="py-3 px-4 text-center">Active Subs</th>
                        <th className="py-3 px-4 text-center">Visits Allocated</th>
                        <th className="py-3 px-4 text-center">Visits Consumed</th>
                        <th className="py-3 px-4 text-center">Utilization Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilizationData.map((item) => (
                        <tr key={item._id} className="border-b border-border hover:bg-muted/35 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">{item.name}</td>
                          <td className="py-3 px-4 text-center">{item.totalAssigned}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2.5 py-0.5 rounded-full font-medium">
                              {item.activeCount} active
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground">{item.totalVisitsAllocated}</td>
                          <td className="py-3 px-4 text-center font-medium text-foreground">{item.totalVisitsConsumed}</td>
                          <td className="py-3 px-4 text-center font-bold">
                            <div className="flex items-center justify-center gap-2">
                              <span className={item.utilizationRate > 75 ? 'text-emerald-500' : item.utilizationRate > 40 ? 'text-amber-500' : 'text-primary'}>
                                {Math.round(item.utilizationRate)}%
                              </span>
                              <div className="w-16 bg-muted h-2 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full ${item.utilizationRate > 75 ? 'bg-emerald-500' : item.utilizationRate > 40 ? 'bg-amber-500' : 'bg-primary'}`} 
                                  style={{ width: `${item.utilizationRate}%` }} 
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PackagesDashboard;
