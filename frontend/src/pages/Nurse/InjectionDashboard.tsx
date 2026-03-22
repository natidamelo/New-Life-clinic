import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/use-toast';
import nurseTaskService from '../../services/nurseTaskService';
import depoInjectionService from '../../services/depoInjectionService';
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Syringe, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Globe
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

interface InjectionTask {
  _id: string;
  id?: string;
  patientId: string;
  patientName: string;
  taskType: string;
  description: string;
  status: string;
  priority: string;
  assignedBy: string;
  assignedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  serviceName?: string;
  metadata?: {
    serviceCategory?: string;
    invoiceId?: string;
    serviceId?: string;
  };
  paymentStatus?: string;
  paidAt?: Date;
  medicationDetails?: any;
}

const InjectionDashboard: React.FC = () => {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<InjectionTask[]>([]);
  const [depoSchedules, setDepoSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Fetch injection tasks
  const fetchInjectionTasks = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('💉 Fetching injection tasks...');
      
      // Fetch injection tasks (service-sent medications)
      const filteredTasks = await nurseTaskService.getInjectionTasks(token, {
        status: statusFilter === 'all' ? undefined : statusFilter
      });

      // Fetch Depo injection schedules
      try {
        const depoSchedulesData = await depoInjectionService.getUpcomingInjections(30);
        setDepoSchedules(depoSchedulesData);
        console.log(`📅 Found ${depoSchedulesData.length} Depo injection schedules`);
      } catch (depoError) {
        console.log('⚠️ Could not fetch Depo schedules:', depoError);
        setDepoSchedules([]);
      }
      
      console.log(`✅ Found ${filteredTasks.length} injection tasks`);
      
      // Debug: Log payment statuses and verify with invoice data
      for (const task of filteredTasks) {
        console.log(`Task ${task.patientName}: paymentStatus = "${task.paymentStatus}", status = "${task.status}"`);
        
        // If task shows unpaid but we suspect it might be paid, verify with invoice
        console.log(`🔍 Checking payment verification for ${task.patientName}: paymentStatus=${task.paymentStatus}, hasInvoiceId=${!!task.metadata?.invoiceId}`);
        if (task.paymentStatus === 'unpaid') {
          try {
            let invoice = null;
            
            // Method 1: Use metadata.invoiceId if available
            if (task.metadata?.invoiceId) {
              console.log(`🔍 Trying to fetch invoice via metadata: ${task.metadata.invoiceId}`);
              const invoiceResponse = await fetch(`/api/billing/invoices/${task.metadata.invoiceId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (invoiceResponse.ok) {
                invoice = await invoiceResponse.json();
                console.log(`✅ Found invoice via metadata: ${invoice.invoiceNumber}`);
              }
            }
            
            // Method 2: Find invoice by patient and service if metadata method failed
            if (!invoice) {
              console.log(`🔍 Trying to find invoice by patient and service for ${task.patientName}`);
              const invoicesResponse = await fetch(`/api/billing/invoices?patientId=${task.patientId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (invoicesResponse.ok) {
                const response = await invoicesResponse.json();
                // The API returns { data: invoices } format
                const invoices = response.data || response;
                console.log(`🔍 Found ${invoices.length} invoices for patient ${task.patientId}`);
                
                // Find invoice with injection service
                invoice = invoices.find(inv => 
                  inv.items && inv.items.some(item => 
                    (item.description && item.description.toLowerCase().includes('injection')) ||
                    (item.serviceName && item.serviceName.toLowerCase().includes('injection'))
                  )
                );
                if (invoice) {
                  console.log(`✅ Found invoice by patient + service: ${invoice.invoiceNumber}`);
                } else {
                  console.log(`ℹ️ No injection invoice found, checking all invoices for payment status`);
                  // If no injection-specific invoice, check if any invoice is paid
                  invoice = invoices.find(inv => inv.status === 'paid' || inv.amountPaid >= inv.total);
                  if (invoice) {
                    console.log(`✅ Found paid invoice: ${invoice.invoiceNumber}`);
                  }
                }
              }
            }
            
            if (invoice && (invoice.status === 'paid' || invoice.amountPaid >= invoice.total)) {
              console.log(`🔍 Payment verification: Task shows unpaid but invoice is paid. Updating task payment status.`);
              
              // Actually update the task in the database
              const updateResponse = await fetch(`/api/nurse-tasks/${task._id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  paymentStatus: 'paid',
                  paidAt: new Date(),
                  paymentMethod: invoice.paymentMethod || 'cash',
                  'metadata.invoiceId': invoice._id // Ensure metadata is linked
                })
              });
              
              if (updateResponse.ok) {
                console.log(`✅ Task payment status updated in database`);
                task.paymentStatus = 'paid';
                task.paidAt = new Date();
              } else {
                console.log(`❌ Failed to update task payment status in database`);
              }
            } else if (invoice) {
              console.log(`ℹ️ Invoice found but not fully paid: status=${invoice.status}, amountPaid=${invoice.amountPaid}, total=${invoice.total}`);
            } else {
              console.log(`ℹ️ No invoice found for task ${task.patientName}`);
            }
          } catch (error) {
            console.log(`⚠️ Could not verify payment status for task ${task._id}:`, error);
          }
        }
      }
      
      // Sort by priority and creation date
      const sortedTasks = filteredTasks.sort((a, b) => {
        const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newer first
      });
      
      setTasks(sortedTasks as InjectionTask[]);
    } catch (error: any) {
      console.error('❌ Error fetching injection tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch injection tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInjectionTasks();
  }, [statusFilter, priorityFilter]);

  // Filter tasks based on search term
  const filteredTasks = tasks.filter(task =>
    task.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.serviceName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    urgent: tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length,
    paid: tasks.filter(t => t.paymentStatus === 'paid' || t.paymentStatus === 'fully_paid' || t.paymentStatus === 'complete').length,
    unpaid: tasks.filter(t => t.paymentStatus !== 'paid' && t.paymentStatus !== 'fully_paid' && t.paymentStatus !== 'complete' && t.paymentStatus !== 'partial' && t.paymentStatus !== 'partially_paid').length
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'HIGH': return 'bg-accent/20 text-accent-foreground border-orange-200';
      case 'MEDIUM': return 'bg-accent/20 text-accent-foreground border-yellow-200';
      case 'LOW': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-primary/20 text-primary border-primary/30';
      case 'IN_PROGRESS': return 'bg-secondary/20 text-secondary-foreground border-secondary/30';
      case 'COMPLETED': return 'bg-primary/20 text-primary border-primary/30';
      case 'CANCELLED': return 'bg-muted/20 text-muted-foreground border-border/30';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const getPaymentStatusColor = (paymentStatus?: string) => {
    // Debug logging to help identify payment status values
    if (paymentStatus) {
      console.log('Payment status received:', paymentStatus);
    }
    
    // Handle all possible payment status values (normalized and legacy)
    switch (paymentStatus) {
      case 'paid':
      case 'fully_paid': 
      case 'complete': return 'bg-primary/20 text-primary border-primary/30';
      case 'partial':
      case 'partially_paid': return 'bg-accent/20 text-accent-foreground border-yellow-200';
      case 'unpaid':
      case 'pending':
      case 'payment_required': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Use the medication administration endpoint for proper inventory deduction
      const response = await fetch('/api/medication-administration/administer-dose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId: taskId,
          day: 1,
          timeSlot: '09:00',
          notes: 'Injection administered successfully'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to administer injection');
      }

      const result = await response.json();
      
      // Show success message with inventory details
      let successMessage = "Injection administered successfully!";
      if (result.data?.inventoryDeducted && result.data?.inventoryDetails) {
        const { itemsDeducted, warning: inventoryWarning } = result.data.inventoryDetails;
        if (inventoryWarning) {
          successMessage += `\n⚠️ ${inventoryWarning}`;
        } else if (itemsDeducted && itemsDeducted.length > 0) {
          const deductionSummary = itemsDeducted.map((item: any) => 
            `${item.name}: ${item.quantityDeducted} unit (${item.previousQuantity} → ${item.newQuantity})`
          ).join(', ');
          successMessage += `\n📦 Inventory deducted: ${deductionSummary}`;
        }
      } else {
        successMessage += `\n⚠️ No inventory deduction recorded`;
      }

      // Check if this was a Depo injection and provide additional feedback
      const task = tasks.find(t => t._id === taskId);
      if (task && task.description.toLowerCase().includes('depo')) {
        const nextInjectionDate = new Date(new Date().getTime() + (84 * 24 * 60 * 60 * 1000));
        successMessage += `\n💉 Depo injection schedule updated automatically!`;
        successMessage += `\n📅 Next injection scheduled for: ${nextInjectionDate.toLocaleDateString()}`;
        successMessage += `\n📅 (12 weeks from today)`;
      }
      
      toast({
        title: "Success",
        description: successMessage,
      });
      
      fetchInjectionTasks(); // Refresh the list
    } catch (error: any) {
      console.error('Error administering injection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to administer injection",
        variant: "destructive"
      });
    }
  };

  // Function to sync all payment statuses
  const handleSyncAllPayments = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      let updatedCount = 0;
      
      for (const task of tasks) {
        if (task.paymentStatus === 'unpaid') {
          try {
            let invoice = null;
            
            // Method 1: Use metadata.invoiceId if available
            if (task.metadata?.invoiceId) {
              const invoiceResponse = await fetch(`/api/billing/invoices/${task.metadata.invoiceId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (invoiceResponse.ok) {
                invoice = await invoiceResponse.json();
              }
            }
            
            // Method 2: Find invoice by patient if metadata method failed
            if (!invoice) {
              const invoicesResponse = await fetch(`/api/billing/invoices?patientId=${task.patientId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (invoicesResponse.ok) {
                const response = await invoicesResponse.json();
                const invoices = response.data || response;
                
                // Find invoice with injection service or any paid invoice
                invoice = invoices.find(inv => 
                  (inv.items && inv.items.some(item => 
                    (item.description && item.description.toLowerCase().includes('injection')) ||
                    (item.serviceName && item.serviceName.toLowerCase().includes('injection'))
                  )) ||
                  (inv.status === 'paid' || inv.amountPaid >= inv.total)
                );
              }
            }
            
            if (invoice && (invoice.status === 'paid' || invoice.amountPaid >= invoice.total)) {
              const updateResponse = await fetch(`/api/nurse-tasks/${task._id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  paymentStatus: 'paid',
                  paidAt: new Date(),
                  paymentMethod: invoice.paymentMethod || 'cash',
                  'metadata.invoiceId': invoice._id
                })
              });
              
              if (updateResponse.ok) {
                updatedCount++;
              }
            }
          } catch (error) {
            console.log(`⚠️ Could not sync payment for task ${task._id}:`, error);
          }
        }
      }
      
      if (updatedCount > 0) {
        toast({
          title: "Success",
          description: `Updated payment status for ${updatedCount} tasks`,
        });
        
        // Refresh tasks
        fetchInjectionTasks();
      } else {
        toast({
          title: "Info",
          description: "No payment status updates needed",
        });
      }
      
    } catch (error: any) {
      console.error('Error syncing all payments:', error);
      toast({
        title: "Error",
        description: "Failed to sync payment statuses",
        variant: "destructive"
      });
    }
  };

  // Function to manually sync payment status for a task
  const handleSyncPaymentStatus = async (task: InjectionTask) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      let invoice = null;
      
      // Method 1: Use metadata.invoiceId if available
      if (task.metadata?.invoiceId) {
        const invoiceResponse = await fetch(`/api/billing/invoices/${task.metadata.invoiceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (invoiceResponse.ok) {
          invoice = await invoiceResponse.json();
        }
      }
      
      // Method 2: Find invoice by patient if metadata method failed
      if (!invoice) {
        const invoicesResponse = await fetch(`/api/billing/invoices?patientId=${task.patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (invoicesResponse.ok) {
          const response = await invoicesResponse.json();
          const invoices = response.data || response;
          
          // Find invoice with injection service or any paid invoice
          invoice = invoices.find(inv => 
            (inv.items && inv.items.some(item => 
              (item.description && item.description.toLowerCase().includes('injection')) ||
              (item.serviceName && item.serviceName.toLowerCase().includes('injection'))
            )) ||
            (inv.status === 'paid' || inv.amountPaid >= inv.total)
          );
        }
      }
      
      if (!invoice) {
        toast({
          title: "Error",
          description: "No invoice found for this task",
          variant: "destructive"
        });
        return;
      }
      
      // Determine correct payment status
      let correctPaymentStatus = 'unpaid';
      if (invoice.status === 'paid' || (invoice.amountPaid && invoice.amountPaid >= invoice.total)) {
        correctPaymentStatus = 'paid';
      } else if (invoice.amountPaid && invoice.amountPaid > 0) {
        correctPaymentStatus = 'partial';
      }

      // Update task payment status
      const updateResponse = await fetch(`/api/nurse-tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: correctPaymentStatus,
          paidAt: correctPaymentStatus === 'paid' ? new Date() : null,
          paymentMethod: invoice.paymentMethod || 'cash',
          'metadata.invoiceId': invoice._id
        })
      });

      if (updateResponse.ok) {
        toast({
          title: "Success",
          description: `Payment status updated to ${correctPaymentStatus}`,
        });
        
        // Refresh tasks
        fetchInjectionTasks();
      } else {
        throw new Error('Failed to update payment status');
      }

    } catch (error: any) {
      console.error('Error syncing payment status:', error);
      toast({
        title: "Error",
        description: "Failed to sync payment status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Syringe className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-muted-foreground">Service Injection Administration</h1>
        </div>
        <p className="text-muted-foreground">Manage and administer service-sent injection medications for patients</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Syringe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Clock className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <RefreshCw className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.urgent}</p>
              <p className="text-sm text-muted-foreground">Urgent</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.paid}</p>
              <p className="text-sm text-muted-foreground">Paid</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.unpaid}</p>
              <p className="text-sm text-muted-foreground">Unpaid</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Depo Injection Schedules Section */}
      {depoSchedules.length > 0 && (
        <Card className="mb-6 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-muted-foreground">Depo Injection Schedules</h2>
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {depoSchedules.length} Active
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {depoSchedules.slice(0, 6).map((schedule) => (
              <div key={schedule._id} className="border border-border/30 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-muted-foreground">{schedule.patientName}</h3>
                    <p className="text-sm text-muted-foreground">ID: {schedule.patientId}</p>
                  </div>
                  <Badge 
                    variant={schedule.injectionStatus.status === 'overdue' ? 'destructive' : 
                           schedule.injectionStatus.status === 'due' ? 'default' : 'secondary'}
                    className={
                      schedule.injectionStatus.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                      schedule.injectionStatus.status === 'due' ? 'bg-accent/20 text-accent-foreground' :
                      'bg-primary/20 text-primary'
                    }
                  >
                    {schedule.injectionStatus.status === 'overdue' ? '⚠️ Overdue' :
                     schedule.injectionStatus.status === 'due' ? '🔴 Due' :
                     schedule.injectionStatus.status === 'due_soon' ? '🟡 Due Soon' :
                     '🟢 Upcoming'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">
                        {schedule.nextInjectionEthiopianDate.formatted}
                      </p>
                      <p className="text-muted-foreground">Ethiopian Calendar</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">
                        {new Date(schedule.nextInjectionDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-muted-foreground">Gregorian Calendar</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {schedule.injectionStatus.message}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Total injections: {schedule.totalInjections}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`/app/depo-injections`, '_blank')}
                      className="text-xs"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {depoSchedules.length > 6 && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                onClick={() => window.open(`/app/depo-injections`, '_blank')}
              >
                View All {depoSchedules.length} Depo Schedules
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search patients or injection types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <Button onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchInjectionTasks();
            }} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button onClick={handleSyncAllPayments} variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary/10">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Payments
            </Button>
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading injection tasks...</p>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <Syringe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Injection Tasks Found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'No tasks match your search criteria.' : 'No injection tasks are currently assigned.'}
            </p>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task._id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      {task.serviceName || 'Injection Service'}
                    </h3>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    {task.paymentStatus && (
                      <Badge className={getPaymentStatusColor(task.paymentStatus)}>
                        {task.paymentStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Patient:</span>
                      <span>{task.patientName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Due:</span>
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      {task.description.toLowerCase().includes('depo') && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          💉 Depo - Next: {(() => {
                            const nextDate = new Date(new Date(task.dueDate).getTime() + (84 * 24 * 60 * 60 * 1000));
                            return nextDate.toLocaleDateString();
                          })()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Description:</span>
                      <span>{task.description}</span>
                    </div>

                    {task.assignedToName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Assigned to:</span>
                        <span>{task.assignedToName}</span>
                      </div>
                    )}
                  </div>

                  {task.paidAt && (
                    <div className="text-sm text-primary mb-2">
                      ✅ Payment completed on {new Date(task.paidAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {(() => {
                    // Handle all possible payment status values (normalized and legacy)
                    const isPaid = task.paymentStatus === 'paid' || 
                                  task.paymentStatus === 'fully_paid' || 
                                  task.paymentStatus === 'complete';
                    const isPartial = task.paymentStatus === 'partial' || 
                                     task.paymentStatus === 'partially_paid';
                    const isReady = task.status === 'PENDING' || task.status === 'READY';
                    console.log(`Button logic for ${task.patientName}: isPaid=${isPaid}, isPartial=${isPartial}, isReady=${isReady}, status="${task.status}", paymentStatus="${task.paymentStatus}"`);
                    
                    if (isReady && (isPaid || isPartial)) {
                      return (
                        <Button
                          onClick={() => handleCompleteTask(task._id)}
                          className="bg-primary hover:bg-primary"
                        >
                          <Syringe className="h-4 w-4 mr-2" />
                          Administer
                        </Button>
                      );
                    }
                    
                    if (isReady && !isPaid && !isPartial) {
                      return (
                        <Button variant="outline" disabled>
                          <Clock className="h-4 w-4 mr-2" />
                          Awaiting Payment
                        </Button>
                      );
                    }
                    
                    return null;
                  })()}

                  {task.status === 'COMPLETED' && (
                    <Button variant="outline" disabled>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Completed
                    </Button>
                  )}

                  {/* Sync Payment button for tasks that might have payment sync issues */}
                  {task.paymentStatus === 'unpaid' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSyncPaymentStatus(task)}
                      className="text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Payment
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default InjectionDashboard;


