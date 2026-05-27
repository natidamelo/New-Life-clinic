import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import Dialog from '../../components/ui/dialog-wrapper';
import { 
  Search, 
  Filter, 
  Calendar, 
  CreditCard, 
  Activity, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  PlusCircle, 
  Eye, 
  DollarSign, 
  BookmarkCheck, 
  History 
} from 'lucide-react';
import healthPackageService, { PatientPackage, PackageVisit, VitalsTrendPoint } from '../../services/healthPackageService';
import RecordVisitForm from './RecordVisitForm';
import VisitHistoryTimeline from './VisitHistoryTimeline';
import VitalsTrendCharts from './VitalsTrendCharts';
import toast from 'react-hot-toast';

const PatientPackageOverview: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<PatientPackage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Selected Subscription for detail drawer/modal
  const [selectedSub, setSelectedSub] = useState<PatientPackage | null>(null);
  const [subVisits, setSubVisits] = useState<PackageVisit[]>([]);
  const [subVitalsTrend, setSubVitalsTrend] = useState<VitalsTrendPoint[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'timeline' | 'trends'>('timeline');

  // Record Visit Modal state
  const [activeCheckinSub, setActiveCheckinSub] = useState<PatientPackage | null>(null);

  // Fetch all subscriptions globally
  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const data = await healthPackageService.getAllPatientPackages();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      toast.error('Failed to load patient subscriptions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Fetch visits and vitals trend for selected subscription
  const handleViewDetails = async (sub: PatientPackage) => {
    setSelectedSub(sub);
    setIsLoadingDetails(true);
    setActiveDetailTab('timeline');
    try {
      const patientId = sub.patient_id && typeof sub.patient_id === 'object' ? (sub.patient_id as any)._id || (sub.patient_id as any).id : sub.patient_id;
      const subId = sub._id || sub.id || '';
      
      const [detailsData, trendData] = await Promise.all([
        healthPackageService.getPatientPackageDetails(patientId, subId),
        healthPackageService.getPatientVitalsTrendReport(patientId, subId)
      ]);

      setSubVisits(detailsData.visits);
      setSubVitalsTrend(trendData);
    } catch (error) {
      console.error('Failed to load subscription details:', error);
      toast.error('Failed to load subscription history details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0">Completed</Badge>;
      case 'expired':
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0">Expired</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-0">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Payment badge styling helper
  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border border-emerald-500/10">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border border-amber-500/10">Partial</Badge>;
      case 'pending':
        return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/25 border border-red-500/10">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // Filtering Logic
  const filteredSubs = subscriptions.filter(sub => {
    const patient = sub.patient_id as any;
    const pkg = sub.package_id as any;
    
    const pName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : '';
    const pId = patient?.patientId?.toLowerCase() || '';
    const pkgName = pkg?.name?.toLowerCase() || '';
    const query = searchTerm.toLowerCase();
    
    const matchesSearch = pName.includes(query) || pId.includes(query) || pkgName.includes(query);
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || sub.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-primary/5">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search subscriber name, ID or package..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 rounded-lg text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border/80 text-xs rounded-lg px-2.5 py-1.5 h-9 font-medium focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Filter */}
          <select 
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-background border border-border/80 text-xs rounded-lg px-2.5 py-1.5 h-9 font-medium focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>

          <Button variant="outline" size="sm" onClick={fetchSubscriptions} className="h-9">
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid List of Subscriptions */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-24 bg-muted border-0 rounded-xl" />
          ))}
        </div>
      ) : filteredSubs.length === 0 ? (
        <Card className="border-dashed border-2 border-muted py-12 flex flex-col items-center justify-center text-center">
          <BookmarkCheck className="w-10 h-10 text-muted-foreground/35 mb-2" />
          <h4 className="text-sm font-semibold">No package subscriptions found</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Try adjusting your search criteria or register a new subscriber package.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubs.map((sub) => {
            const patient = sub.patient_id as any;
            const pkg = sub.package_id as any;
            const progressPercent = Math.round((sub.visits_used / sub.total_visits) * 100);

            return (
              <Card 
                key={sub._id}
                className="overflow-hidden border border-primary/5 hover:border-primary/10 bg-card/60 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  
                  {/* Col 1: Patient details & Package name */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-foreground text-base">
                        {patient ? `${patient.firstName} ${patient.lastName}` : 'Deleted Patient'}
                      </span>
                      <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        ID: {patient?.patientId || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                      <span className="text-primary">{pkg?.name || 'Unknown PackageTemplate'}</span>
                      <span>•</span>
                      <span>Purchased {formatDate(sub.purchased_date)}</span>
                    </div>
                  </div>

                  {/* Col 2: Visits Consumption & Progress */}
                  <div className="w-full lg:w-48 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Visits Used</span>
                      <span className="text-foreground">{sub.visits_used} / {sub.total_visits} ({sub.visits_remaining} left)</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${sub.status === 'expired' ? 'from-amber-400 to-amber-500' : 'from-indigo-500 to-purple-500'}`} 
                        style={{ width: `${progressPercent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Col 3: Expiry Date & Timing */}
                  <div className="text-left lg:text-center space-y-1 text-xs">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1 lg:justify-center">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Expires
                    </span>
                    <p className={`font-bold ${new Date(sub.expiry_date) < new Date() && sub.status === 'active' ? 'text-amber-500' : 'text-foreground'}`}>
                      {formatDate(sub.expiry_date)}
                    </p>
                  </div>

                  {/* Col 4: Payment summary */}
                  <div className="flex items-center gap-3 bg-muted/20 border border-border/30 p-2.5 rounded-xl min-w-[160px]">
                    <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground font-semibold">Paid:</span>
                        <span className="font-extrabold text-foreground">{sub.amount_paid.toLocaleString()}</span>
                      </div>
                      {sub.balance_due > 0 ? (
                        <div className="flex items-center gap-1 text-primary">
                          <span className="font-semibold text-muted-foreground">Due:</span>
                          <span className="font-extrabold">{sub.balance_due.toLocaleString()} ETB</span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-extrabold">Settled</span>
                      )}
                    </div>
                    <div className="ml-auto">
                      {getPaymentBadge(sub.payment_status)}
                    </div>
                  </div>

                  {/* Col 5: Badges and Action buttons */}
                  <div className="flex items-center gap-2.5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-border/40">
                    <div>
                      {getStatusBadge(sub.status)}
                    </div>
                    
                    <div className="flex gap-2 ml-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(sub)}
                        className="h-9 hover:border-indigo-500/30 hover:bg-indigo-500/5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Details
                      </Button>
                      
                      {sub.status === 'active' && sub.visits_remaining > 0 && (
                        <Button 
                          size="sm"
                          onClick={() => setActiveCheckinSub(sub)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Log Visit
                        </Button>
                      )}
                    </div>
                  </div>

                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Subscription details Drawer / Dialog */}
      <Dialog
        isOpen={selectedSub !== null}
        onClose={() => setSelectedSub(null)}
        title="Subscription History & Vitals Analytics"
        description={selectedSub ? `Patient: ${(selectedSub.patient_id as any)?.firstName} ${(selectedSub.patient_id as any)?.lastName} | Package: ${(selectedSub.package_id as any)?.name}` : ''}
      >
        {selectedSub && (
          <div className="space-y-5 text-left py-2 max-h-[80vh] overflow-y-auto">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border border-border/50">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Package Status</span>
                <div>{getStatusBadge(selectedSub.status)}</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Visits Utilized</span>
                <p className="text-sm font-extrabold text-foreground">{selectedSub.visits_used} / {selectedSub.total_visits} Consumed</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Billing Status</span>
                <div>{getPaymentBadge(selectedSub.payment_status)}</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Remaining Balance</span>
                <p className={`text-sm font-extrabold ${selectedSub.balance_due > 0 ? 'text-primary' : 'text-emerald-600'}`}>
                  {selectedSub.balance_due.toLocaleString()} ETB
                </p>
              </div>
            </div>

            {/* Custom Tab Selection for Details */}
            <div className="flex gap-2 border-b border-border/60 pb-1.5">
              <Button 
                variant={activeDetailTab === 'timeline' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setActiveDetailTab('timeline')}
                className="rounded-lg text-xs"
              >
                <History className="w-3.5 h-3.5 mr-1" /> Visit Timeline Logs
              </Button>
              <Button 
                variant={activeDetailTab === 'trends' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setActiveDetailTab('trends')}
                className="rounded-lg text-xs"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> Vitals Sign Trends
              </Button>
            </div>

            {/* Tab Contents */}
            {isLoadingDetails ? (
              <div className="space-y-3 py-6">
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-20 bg-muted animate-pulse rounded" />
              </div>
            ) : activeDetailTab === 'timeline' ? (
              <VisitHistoryTimeline visits={subVisits} />
            ) : (
              <VitalsTrendCharts data={subVitalsTrend} isLoading={isLoadingDetails} />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
              {selectedSub.status === 'active' && selectedSub.visits_remaining > 0 && (
                <Button 
                  onClick={() => {
                    setActiveCheckinSub(selectedSub);
                    setSelectedSub(null); // Close details modal
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Log Check-in Visit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedSub(null)} className="h-9">
                Close details
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Record Visit Modal */}
      <Dialog 
        isOpen={activeCheckinSub !== null}
        onClose={() => setActiveCheckinSub(null)}
        title="Check-in Patient Visit"
        description="Consume a health package visit slot and dispatch the patient to Nurse vitals, Doctor consultation, or Lab queue."
      >
        {activeCheckinSub && (
          <RecordVisitForm 
            patientPackage={activeCheckinSub} 
            onCancel={() => setActiveCheckinSub(null)} 
            onComplete={() => {
              setActiveCheckinSub(null);
              fetchSubscriptions(); // Refresh subscriber list
            }}
          />
        )}
      </Dialog>

    </div>
  );
};

export default PatientPackageOverview;
