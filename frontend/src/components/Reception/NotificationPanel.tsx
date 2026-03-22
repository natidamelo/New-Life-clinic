import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import prescriptionService from '../../services/prescriptionService';
import labService from '../../services/labService'; // Add this line
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  Pill,
  ChevronRight,
  Clock,
  AlertTriangle,
  Info,
  User,
  Calendar,
  FileText,
  Activity,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';

const PROCESSED_NOTIFICATIONS_KEY = 'clinic_processed_notifications';

const getProcessedNotificationIds = (): string[] => {
  try {
    const stored = localStorage.getItem(PROCESSED_NOTIFICATIONS_KEY);
    const processedIds = stored ? JSON.parse(stored) : [];

    return processedIds;
  } catch (error) {
    console.error('Error reading from local storage:', error);
    return [];
  }
};

// Helper function to get icon based on notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'medication_payment_required':
    case 'service_payment_required':
    case 'card_payment_required':
    case 'PROCEDURE_PAYMENT':
      return <Pill className="h-4 w-4 text-accent-foreground" />;
    case 'lab_payment_required': // Add this case
      return <Activity className="h-4 w-4 text-accent-foreground" />; // Using Activity for lab tests
    case 'appointment_reminder':
      return <Calendar className="h-4 w-4 text-primary" />;
    case 'lab_result_ready':
      return <FileText className="h-4 w-4 text-primary" />;
    case 'prescription_refill':
      return <Pill className="h-4 w-4 text-secondary-foreground" />;
    case 'critical_alert':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'system_update':
      return <Info className="h-4 w-4 text-primary" />;
    case 'PATIENT_READY':
      return <User className="h-4 w-4 text-primary" />;
    case 'PATIENT_VITALS':
    case 'vitals_update':
      return <Activity className="h-4 w-4 text-primary" />;
    case 'nurse_medication_task':
      return <Pill className="h-4 w-4 text-secondary-foreground" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

// Helper function to get background color based on notification type
const getNotificationBgColor = (type: string) => {
  switch (type) {
    case 'medication_payment_required':
    case 'service_payment_required':
    case 'card_payment_required':
    case 'PROCEDURE_PAYMENT':
      return 'bg-accent/20';
    case 'lab_payment_required': // Add this case
      return 'bg-accent/20'; // Using yellow for lab payments
    case 'appointment_reminder':
      return 'bg-primary/20';
    case 'lab_result_ready':
      return 'bg-primary/20';
    case 'prescription_refill':
      return 'bg-secondary/20';
    case 'critical_alert':
      return 'bg-destructive/20';
    case 'system_update':
      return 'bg-primary/20';
    case 'PATIENT_READY':
      return 'bg-primary/20';
    case 'PATIENT_VITALS':
    case 'vitals_update':
      return 'bg-primary/20';
    case 'nurse_medication_task':
      return 'bg-secondary/20';
    default:
      return 'bg-muted/20';
  }
};

const NotificationPanel: React.FC = () => {
  console.log('🔍 [NotificationPanel] Component loaded - VERSION 2.0 with medication amount fixes');
  
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'payments' | 'appointments' | 'lab' | 'system'>('all');

  const fetchAllNotifications = async () => {
    setIsLoading(true);
    try {
      // Check authentication status first
      const authStatus = await window.apiDebug.checkAuthStatus();

      if (!authStatus.authenticated) {
        console.error('❌ Not authenticated. Cannot fetch notifications.');
        toast.error('Please log in to view notifications', {
          position: 'top-center',
          duration: 5000
        });
        setNotifications([]);
        return;
      }

      // Fetch all notifications for reception role
      const [notificationsResponse, prescriptionsResponse] = await Promise.all([
        api.get('/api/notifications?recipientRole=reception'),
        prescriptionService.getPendingPrescriptionsForReception()
      ]);
      
      let processedIds = getProcessedNotificationIds();
      // One-time cleanup: remove specific notification from processed list if stuck
      const isOurNotificationProcessed = processedIds.includes('688d1d8167e01c426e5ffde7');
      if (isOurNotificationProcessed) {
        processedIds = processedIds.filter(id => id !== '688d1d8167e01c426e5ffde7');
        localStorage.setItem(PROCESSED_NOTIFICATIONS_KEY, JSON.stringify(processedIds));
      }
      
      // Handle notifications
      let allNotifications = notificationsResponse.data?.data || notificationsResponse.data?.notifications || [];

      // DEBUG: Log all notifications for debugging
      console.log(`🔍 [DEBUG] All notifications received:`, allNotifications.length);
      
      // Process notifications to handle partial payments properly
      allNotifications = allNotifications.map((notif: any) => {
        // Update display for partial payments
        if (notif.data?.paymentStatus === 'partial' || notif.data?.paymentStatus === 'partially_paid') {
          const paidAmount = notif.data?.amountPaid || 0;
          const outstandingAmount = notif.data?.outstandingAmount || notif.data?.amount || 0;
          
          return {
            ...notif,
            title: `Partial Payment - ${paidAmount} ETB paid, ${outstandingAmount} ETB remaining`,
            message: `Partial payment received. ${paidAmount} ETB paid, ${outstandingAmount} ETB remaining.`,
            priority: 'medium' // Lower priority for partial payments
          };
        }
        return notif;
      });
      
      allNotifications.forEach((notif, index) => {
        if (notif.type === 'medication_payment_required') {
          console.log(`🔍 [MEDICATION] ${index}: ${notif.data?.patientName} - ETB ${notif.data?.amount || notif.data?.totalAmount} - Freq: ${notif.data?.frequency}`);
        }
      });

      // Fallback strategy: If nothing came back for role-based query, fetch unread of any role
      try {
        if (!Array.isArray(allNotifications) || allNotifications.length === 0) {
          const fallbackUnread = await api.get('/api/notifications?read=false');
          const fallbackUnreadList = fallbackUnread.data?.data || fallbackUnread.data?.notifications || [];
          // Prefer unread payment-required notifications
          const fallbackPayments = Array.isArray(fallbackUnreadList)
            ? fallbackUnreadList.filter((n: any) => (n.type || '').includes('payment_required'))
            : [];
          if (fallbackPayments.length > 0) {
            allNotifications = fallbackPayments;
          } else if (Array.isArray(fallbackUnreadList) && fallbackUnreadList.length > 0) {
            allNotifications = fallbackUnreadList;
          }
        }
      } catch (fallbackErr) {
        console.warn('[NotificationPanel] Fallback unread fetch failed:', fallbackErr);
      }

      // Last-resort: fetch without filters to avoid missing items due to mismatched recipientRole casing
      try {
        if (!Array.isArray(allNotifications) || allNotifications.length === 0) {
          const noFilter = await api.get('/api/notifications');
          const noFilterList = noFilter.data?.data || noFilter.data?.notifications || [];
          const paymentLike = Array.isArray(noFilterList)
            ? noFilterList.filter((n: any) => (n.type || '').includes('payment_required') && !n.read)
            : [];
          if (paymentLike.length > 0) {
            allNotifications = paymentLike;
          }
        }
      } catch (nofilterErr) {
        console.warn('[NotificationPanel] No-filter fetch failed:', nofilterErr);
      }

      // Auto-backfill: If there are pending lab orders but zero DB notifications, create missing notifications and refetch
      try {
        const pendingLabCount = 0; // labOrdersResponse not defined
        if ((Array.isArray(allNotifications) && allNotifications.length === 0) && pendingLabCount > 0) {
          console.warn(`[NotificationPanel] 0 DB notifications but ${pendingLabCount} pending lab orders found. Triggering backfill...`);
          await api.post('/api/notifications/backfill/lab-payment', { days: 60 });
          const refetch = await api.get('/api/notifications?recipientRole=reception');
          allNotifications = refetch.data?.data || refetch.data?.notifications || [];
        }
      } catch (autoBackfillErr) {
        console.warn('Auto backfill failed (non-fatal):', autoBackfillErr);
      }

      if (Array.isArray(allNotifications)) {
        console.log(`[NotificationPanel] Processing ${allNotifications.length} raw notifications`);

        const activeNotifications = allNotifications.filter((n: any) => {
          // For payment notifications, apply more lenient filtering
          if (n.type.includes('payment_required')) {
            const amount = n.data?.amount ?? n.data?.totalAmount ?? 0;
            const isPaid = n.data?.paymentStatus === 'paid';
            const isPartiallyPaid = n.data?.paymentStatus === 'partially_paid' || n.data?.paymentStatus === 'partial';
            const isPending = n.data?.paymentStatus === 'pending' || !n.data?.paymentStatus;
            const isRead = n.read;
            const isProcessed = processedIds.includes(n._id);

            // Debug logging for filtering decisions
            const filterReason = [];
            if (isPaid) filterReason.push('paid');
            if (isRead) filterReason.push('read');
            if (isProcessed) filterReason.push('processed');
            
            if (filterReason.length > 0) {
              console.log(`[NotificationPanel] Filtering out notification ${n._id} (${n.type}): ${filterReason.join(', ')}`);
            }

            // Policy: Lab notifications are removed after ANY payment (including partial)
            if (n.type === 'lab_payment_required') {
              // Debug lab notification data
              console.log(`🔍 [LAB NOTIFICATION DEBUG] Notification ${n._id}:`, {
                patientName: n.data?.patientName,
                amount: n.data?.amount,
                paymentStatus: n.data?.paymentStatus,
                paidAt: n.data?.paidAt,
                invoiceId: n.data?.invoiceId,
                read: n.read,
                isPaid,
                isPartiallyPaid,
                isPending,
                isProcessed
              });
              
              // Hide if paid, partially paid, read, or processed
              // Also hide if there's any payment activity at all
              const hasAnyPayment = isPaid || isPartiallyPaid || n.data?.paidAt || n.data?.invoiceId;
              const shouldShow = !hasAnyPayment && isPending && !isRead && !isProcessed;
              
              console.log(`🔍 [LAB NOTIFICATION DEBUG] Decision for ${n._id}: hasAnyPayment=${hasAnyPayment}, shouldShow=${shouldShow}`);
              return shouldShow;
            }

            if (n.type === 'medication_payment_required') {
              // Show medication payment notifications that are unread and unprocessed
              // For medication extensions, we want to show them even if partially paid (for nurse task visibility)
              return !isRead && !isProcessed;
            }

            // Default policy for other payments:
            // 1. Hide fully paid
            // 2. Show partials (need completion)
            // 3. Show pendings if not processed
            const shouldShow = !isPaid && (isPartiallyPaid || (isPending && !isProcessed));
            
            // Special handling for payment notifications: only hide if fully paid
            if (isPaid) {

              return false;
            }

            // Special debug for the specific partial payment notification
            if (n._id === '688d1d8167e01c426e5ffde7') {

            }

            if (!shouldShow) {

            } else if (n.data?.patientName === 'tete jam') {
              
            }
            
            return shouldShow;
          }
          
          // For other notifications, just check if not read and not processed
          return !n.read && !processedIds.includes(n._id);
        });

        // Debug: Check if our specific notification is in the final list
        const ourNotification = activeNotifications.find(n => n._id === '688d1d8167e01c426e5ffde7');
        if (ourNotification) {

        } else {

        }

        console.log(`[NotificationPanel] Final result: ${activeNotifications.length} active notifications out of ${allNotifications.length} total`);
        setNotifications(activeNotifications);
      } else {
        console.warn("Unexpected response structure from notifications API:", notificationsResponse.data);
        setNotifications([]);
      }
      
      // Handle pending prescriptions
      if (Array.isArray(prescriptionsResponse)) {
        const pendingPrescriptions = prescriptionsResponse.filter((p: any) => {
          const isPaid = p.paymentStatus === 'paid';
          const isPartiallyPaid = p.paymentStatus === 'partially_paid' || p.paymentStatus === 'partial';
          const hasAmount = (p.totalCost || 0) > 0;
          const isPending = p.paymentStatus === 'pending' || 
                           p.paymentStatus === 'unpaid' || 
                           !p.paymentStatus ||
                           (p.paymentStatus !== 'paid' && p.paymentStatus !== 'partially_paid' && (p.status === 'PENDING' || p.status === 'Pending' || p.status === 'Active'));
          
          // Improved filtering: show prescriptions that need attention
          // Include partially paid items for completion
          // Include zero-cost prescriptions if they're in a pending state (might be free services or need processing)
          const shouldShow = (isPending || isPartiallyPaid) && !isPaid;
          
          if (!shouldShow) {

          }
          
          return shouldShow;
        });
        setPendingPrescriptions(pendingPrescriptions);
      } else {
        setPendingPrescriptions([]);
      }

      // Pending lab orders removed - no longer displaying these notifications
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications', {
        position: 'top-center',
        duration: 5000
      });
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Force refresh notifications
  const forceRefreshNotifications = async () => {
      setIsLoading(true);
      try {
          console.log('🔄 [NOTIFICATION PANEL] Force refreshing notifications...');
          await fetchAllNotifications();
          toast.success('Notifications refreshed!', {
              position: 'top-center',
              duration: 2000
          });
      } catch (error) {
          console.error('❌ [NOTIFICATION PANEL] Error refreshing notifications:', error);
          toast.error('Failed to refresh notifications');
      } finally {
          setIsLoading(false);
      }
  };

  // Auto-refresh notifications every 10 seconds
  useEffect(() => {
      const refreshInterval = setInterval(() => {
          if (!isLoading) {
              fetchAllNotifications();
          }
      }, 10000);
      
      return () => clearInterval(refreshInterval);
  }, [isLoading]);

  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 30000);
    
    // Listen for payment processed events to refresh immediately
    const handlePaymentProcessed = (event: CustomEvent) => {

      fetchAllNotifications();
    };

    window.addEventListener('paymentProcessed', handlePaymentProcessed as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('paymentProcessed', handlePaymentProcessed as EventListener);
      
    };
  }, []);

  const handleNotificationClick = (notification: any) => {
    // For payment notifications, navigate to the payment page (don't mark as read yet)
    if (notification.type.includes('payment_required') && !notification.data?.paid) {
      navigate(`/billing/process-payment/${notification._id}`);
      return; // Don't mark as read - let the payment page handle it
    } else if (notification.type === 'PROCEDURE_PAYMENT' && !notification.data?.paid) {
      // Handle procedure payment notifications
      navigate(`/billing/process-payment/${notification._id}`);
      return; // Don't mark as read - let the payment page handle it
    } else if (notification.type === 'lab_order_created' && notification.status !== 'completed') {
      navigate(`/lab/order/${notification.data.labOrderId}`);
    } else if (notification.type === 'prescription_created' && notification.status !== 'completed') {
      navigate(`/prescriptions/view/${notification.data.prescriptionId}`);
    } else {
      // For other notifications or already paid/processed ones, mark as read
      markNotificationAsRead(notification._id);
    }
    // Remove from processed notifications if it was previously marked
    removeProcessedNotificationId(notification._id);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const removeProcessedNotificationId = (notificationId: string) => {
    try {
      const processedIds = getProcessedNotificationIds();
      const updatedProcessedIds = processedIds.filter(id => id !== notificationId);
      localStorage.setItem(PROCESSED_NOTIFICATIONS_KEY, JSON.stringify(updatedProcessedIds));

    } catch (error) {
      console.error('Error removing processed notification ID:', error);
    }
  };

  // Define billing notification types
  const billingTypes = [
    'medication_payment_required',
    'lab_payment_required', 
    'imaging_payment_required',
    'procedure_payment_required',
    'PROCEDURE_PAYMENT'
  ];
  
  // Define non-billing types to exclude from main display
  const nonBillingTypes = [
    'vitals_update',
    'PATIENT_VITALS',
    'vitals_review_requested'
  ];

  // Get filtered notifications for display
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'payments':
        // Only show billing notifications with amounts
        return notifications.filter(n => {
          const isBilling = billingTypes.includes(n.type);
          const hasAmount = (n.data?.amount > 0) || (n.data?.totalAmount > 0);
          return isBilling && hasAmount;
        });
      case 'appointments':
        return notifications.filter(n => n.type === 'appointment_reminder' || n.type === 'PATIENT_READY');
      case 'lab':
        return notifications.filter(n => n.type === 'lab_result_ready' || n.type === 'lab_payment_required');
      case 'system':
        return notifications.filter(n => n.type === 'system_update' || n.type === 'critical_alert');
      default:
        // For 'all' tab, show all notifications except vitals (which are for doctors)
        return notifications.filter(n => !nonBillingTypes.includes(n.type));
    }
  };

  // Get counts for tabs - these should match what will be displayed
  const getTabCounts = () => {
    const paymentsCount = notifications.filter(n => {
      const isBilling = billingTypes.includes(n.type);
      const hasAmount = (n.data?.amount > 0) || (n.data?.totalAmount > 0);
      return isBilling && hasAmount;
    }).length;

    const appointmentsCount = notifications.filter(n => 
      n.type === 'appointment_reminder' || n.type === 'PATIENT_READY'
    ).length;

    const labCount = notifications.filter(n => 
      n.type === 'lab_result_ready' || n.type === 'lab_payment_required'
    ).length;

    const systemCount = notifications.filter(n => 
      n.type === 'system_update' || n.type === 'critical_alert'
    ).length;

    // For 'all' count, show all notifications except vitals
    const allCount = notifications.filter(n => !nonBillingTypes.includes(n.type)).length;

    return {
      all: allCount,
      payments: paymentsCount,
      appointments: appointmentsCount,
      lab: labCount,
      system: systemCount
    };
  };

  const filteredNotifications = getFilteredNotifications();
  const tabCounts = getTabCounts();
  
  // Synthetic pending lab orders disabled – only show real DB notifications
  const filteredPendingLabOrders: any[] = [];
  // Synthetic pending prescriptions disabled – only show real DB notifications
  const urgentPrescriptions: any[] = [];
  
  const totalNotifications = tabCounts.all;

  return (
    <Card className="shadow-md w-full mb-4 max-w-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center justify-between mb-4">
            <div>
                <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                </h2>
                <p className="text-sm text-muted-foreground">All notifications requiring attention.</p>
            </div>
            <Button
                onClick={forceRefreshNotifications}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={isLoading}
            >
                <RefreshCw className="h-4 w-4" />
                {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {totalNotifications}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={async () => {
              try {
                await api.post('/api/notifications/cleanup/payments');
                toast.success('Cleared processed payment notifications');
                fetchAllNotifications();
              } catch (e) {
                console.error('Cleanup failed', e);
                toast.error('Cleanup failed');
              }
            }}
          >
            Clear Processed
          </Button>
        </div>
      </CardHeader>
      
      {/* Tab Navigation */}
      <div className="px-3 pb-2 border-b">
        <div className="flex flex-wrap gap-0.5">
          {[
            { key: 'all', label: 'All', count: tabCounts.all },
            { key: 'payments', label: 'Payments', count: tabCounts.payments },
            { key: 'appointments', label: 'Appointments', count: tabCounts.appointments },
            { key: 'lab', label: 'Lab', count: tabCounts.lab },
            { key: 'system', label: 'System', count: tabCounts.system }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-0.5 bg-muted/30 text-muted-foreground px-0.5 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <CardContent className="p-3">
        {isLoading ? (
            <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
        ) : (filteredNotifications.length === 0 && (activeTab === 'all' ? (urgentPrescriptions.length === 0 && filteredPendingLabOrders.length === 0) : true)) ? (
          <div className="text-center py-4">
            <CheckCircle className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-muted-foreground font-medium text-xs">All caught up!</p>
            <p className="text-xs text-muted-foreground">
              {tabCounts[activeTab as keyof typeof tabCounts] === 0 
                ? `No ${activeTab === 'all' ? '' : activeTab} notifications.`
                : `${tabCounts[activeTab as keyof typeof tabCounts]} notifications were filtered out (likely processed or paid).`
              }
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-muted-foreground/50 mt-1">
                Debug: {notifications.length} total, {filteredNotifications.length} after filtering
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto overflow-x-hidden">
            {/* Show filtered notifications */}
            {filteredNotifications.map((notification) => {
              // ROOT CAUSE FIX: Helper function to parse frequency consistently
              const getDosesPerDayFromFrequency = (frequency: string): number => {
                if (!frequency) return 1;
                
                const freq = frequency.toLowerCase();
                
                // Handle all frequency types comprehensively (same as backend)
                if (freq.includes('four') || freq.includes('qid') || freq.includes('4x') || freq.includes('4 times') || freq.includes('every 6 hours')) {
                    return 4;
                }
                if (freq.includes('three') || freq.includes('tid') || freq.includes('thrice') || freq.includes('3x') || freq.includes('3 times') || freq.includes('every 8 hours')) {
                    return 3;
                }
                if (freq.includes('twice') || freq.includes('bid') || freq.includes('2x') || freq.includes('2 times') || freq.includes('every 12 hours')) {
                    return 2;
                }
                return 1; // Default to once daily (QD)
              };

              // ENHANCED AMOUNT CALCULATION for medication extensions
              const calculateCorrectDisplayAmount = (notification: any) => {
                const data = notification.data || {};
                
                // DEBUG: Log notification data for extension debugging
                if (data.patientName?.toLowerCase().includes('natan') || data.patientName?.toLowerCase().includes('nahom')) {
                  console.log('🔍 [DEBUG] Extension notification data for', data.patientName, ':', {
                    patientName: data.patientName,
                    frequency: data.frequency,
                    additionalDays: data.additionalDays,
                    additionalDoses: data.additionalDoses,
                    amount: data.amount,
                    totalAmount: data.totalAmount,
                    extensionCost: data.extensionCost,
                    isExtension: data.isExtension,
                    lastExtension: !!data.lastExtension,
                    medications: data.medications?.[0]
                  });
                }
                
                // For medication payment notifications, calculate based on extension details
                if (notification.type === 'medication_payment_required') {
                  // ROOT CAUSE FIX: Enhanced extension detection for all frequency types
                  const isExtension = data.additionalDoses > 0 || data.additionalDays > 0 || data.lastExtension || data.extensionCost > 0 || data.isExtension === true;
                  
                  if (isExtension) {
                    // PRIORITY 1: Use extensionCost directly if available (most accurate)
                    if (data.extensionCost && data.extensionCost > 0) {
                      console.log(`💰 [EXTENSION] ${data.patientName}: Using extensionCost directly: ETB ${data.extensionCost}`);
                      return data.extensionCost;
                    }
                    
                    // PRIORITY 2: Use additionalDoses if available
                    if (data.additionalDoses && data.additionalDoses > 0) {
                      const pricePerDose = data.pricePerDose || data.medications?.[0]?.inventoryItem?.sellingPrice || 300;
                      const extensionCost = data.additionalDoses * pricePerDose;
                      console.log(`💰 [EXTENSION] ${data.patientName}: ${data.additionalDoses} doses × ETB ${pricePerDose} = ETB ${extensionCost}`);
                      return extensionCost;
                    }
                    
                    // PRIORITY 3: Calculate from additionalDays and frequency
                    if (data.additionalDays && data.additionalDays > 0) {
                      // ROOT CAUSE FIX: Use extension frequency, not original prescription frequency
                      const extensionFrequency = data.frequency || data.medications?.[0]?.frequency || '';
                      const dosesPerDay = getDosesPerDayFromFrequency(extensionFrequency);
                      
                      const totalExtensionDoses = data.additionalDays * dosesPerDay;
                      const pricePerDose = data.pricePerDose || data.medications?.[0]?.inventoryItem?.sellingPrice || 300;
                      const extensionCost = totalExtensionDoses * pricePerDose;
                      console.log(`💰 [EXTENSION] ${data.patientName}: ${data.additionalDays} days × ${dosesPerDay} doses/day × ETB ${pricePerDose} = ETB ${extensionCost}`);
                      return extensionCost;
                    }
                    
                    // PRIORITY 4: Check lastExtension for additional data
                    if (data.lastExtension) {
                      const ext = data.lastExtension;
                      if (ext.additionalDoses && ext.additionalDoses > 0) {
                        const pricePerDose = data.pricePerDose || data.medications?.[0]?.inventoryItem?.sellingPrice || 300;
                        const extensionCost = ext.additionalDoses * pricePerDose;
                        console.log(`💰 [EXTENSION] ${data.patientName}: Using lastExtension.additionalDoses: ${ext.additionalDoses} × ETB ${pricePerDose} = ETB ${extensionCost}`);
                        return extensionCost;
                      }
                      
                      // Also check for frequency-based calculation in lastExtension
                      if (ext.additionalDays && ext.additionalDays > 0 && ext.frequency) {
                        const dosesPerDay = getDosesPerDayFromFrequency(ext.frequency);
                        const totalExtensionDoses = ext.additionalDays * dosesPerDay;
                        const pricePerDose = data.pricePerDose || data.medications?.[0]?.inventoryItem?.sellingPrice || 300;
                        const extensionCost = totalExtensionDoses * pricePerDose;
                        console.log(`💰 [EXTENSION] ${data.patientName}: Using lastExtension calculation: ${ext.additionalDays} days × ${dosesPerDay} doses/day × ETB ${pricePerDose} = ETB ${extensionCost}`);
                        return extensionCost;
                      }
                    }
                  }
                  
                  // For partial payments, show remaining balance
                  if (data.outstandingAmount && data.outstandingAmount > 0) {
                    return data.outstandingAmount;
                  }
                }
                
                // Default fallback to stored amount
                return data.amount ?? data.totalAmount ?? 0;
              };
              
              const displayAmount = calculateCorrectDisplayAmount(notification);
              const isPaymentNotification = notification.type.includes('payment_required');
              
              return (
                <div 
                  key={notification._id} 
                  onClick={() => handleNotificationClick(notification)}
                  className="p-2 rounded border flex items-start justify-between hover:bg-muted/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <div className={`p-1 rounded-full ${getNotificationBgColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-muted-foreground text-xs break-words">{notification.title}</p>
                      <p className="text-xs text-muted-foreground break-words">
                        {notification.data?.patientName && (
                          <span className="font-medium">{notification.data.patientName}</span>
                        )}
                        {!notification.data?.patientName && notification.message}
                      </p>
                      {notification.data?.testName && (
                        <p className="text-xs text-muted-foreground/50 break-words">{notification.data.testName}</p>
                      )}
                      {notification.data?.medications && notification.data.medications.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-muted-foreground/50">Medications:</p>
                          {notification.data.medications.slice(0, 3).map((med: any, index: number) => {
                            // Calculate the correct amount to display for each medication
                            // Use the current amount due instead of the original medication price
                            const currentAmountDue = notification.data?.amount ?? notification.data?.totalAmount ?? 0;
                            const totalOriginalPrice = notification.data.medications.reduce((sum: number, m: any) => sum + (m.totalPrice || 0), 0);
                            
                            // DEBUG: Log the calculation process
                            console.log(`🔍 [NotificationPanel] Medication amount calculation for ${med.name}:`, {
                              currentAmountDue,
                              totalOriginalPrice,
                              medTotalPrice: med.totalPrice,
                              medPrice: med.price,
                              patientName: notification.data?.patientName
                            });
                            
                            // If there's a discrepancy, calculate proportional amount
                            let displayAmount = med.totalPrice || med.price || 0;
                            if (totalOriginalPrice > 0 && currentAmountDue !== totalOriginalPrice) {
                              // Calculate proportional amount based on current amount due
                              const proportion = med.totalPrice / totalOriginalPrice;
                              displayAmount = currentAmountDue * proportion;
                              console.log(`🔍 [NotificationPanel] Calculated proportional amount:`, {
                                proportion,
                                displayAmount,
                                originalAmount: med.totalPrice
                              });
                            }
                            
                            return (
                              <p key={index} className="text-xs text-muted-foreground">
                                • {med.name}: ETB {displayAmount.toFixed(2)}
                              </p>
                            );
                          })}
                          {notification.data.medications.length > 3 && (
                            <p className="text-xs text-muted-foreground/50">
                              +{notification.data.medications.length - 3} more medications
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                    {isPaymentNotification && displayAmount > 0 && (
                      <div className="text-right">
                        <p className="font-bold text-primary text-xs">ETB {displayAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-0.5" />
                          {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                    {!isPaymentNotification && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-0.5" />
                          {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </div>
              );
            })}
            
            {/* Synthetic pending prescriptions disabled */}
            {false && (activeTab === 'all' || activeTab === 'payments') && urgentPrescriptions.map((prescription) => (
              <div 
                key={prescription._id} 
                onClick={async () => {
                  try {
                    // Check if notification already exists for this prescription
                    const existingNotifications = notifications.filter(n => 
                      n.data?.prescriptionId === prescription._id && 
                      n.type === 'medication_payment_required'
                    );

                    if (existingNotifications.length > 0) {
                      // Use existing notification
                      const existingNotification = existingNotifications[0];
                      navigate(`/billing/process-payment/${existingNotification._id}`);
                      return;
                    }

                    // Create a temporary notification so we can reuse the new payment dialog
                    const notifRes = await api.post('/api/notifications', {
                      type: 'medication_payment_required',
                      title: 'Medication Payment Required',
                      message: `Payment required for prescription ${prescription.medicationName}`,
                      recipientRole: 'reception',
                      senderRole: 'reception',
                      data: {
                        prescriptionId: prescription._id,
                        patientId: prescription.patient?._id || prescription.patient,
                        patientName: `${prescription.patient?.firstName || ''} ${prescription.patient?.lastName || ''}`.trim() || `Unknown Patient (ID: ${prescription.patient?._id || prescription.patient})`,
                        medications: prescription.medications?.length ? prescription.medications : [{
                          name: prescription.medicationName,
                          dosage: prescription.dosage,
                          frequency: prescription.frequency,
                          duration: prescription.duration,
                          quantity: prescription.quantity,
                          totalPrice: prescription.totalCost
                        }],
                        amount: prescription.totalCost || 0
                      }
                    });

                    const newNotificationId = notifRes.data?.data?._id || notifRes.data?._id;
                    if (newNotificationId) {
                      navigate(`/billing/process-payment/${newNotificationId}`);
                    } else {
                      toast.error('Failed to create payment notification.');
                    }
                  } catch (error) {
                    console.error('Error creating payment notification:', error);
                    toast.error('Failed to create payment notification.');
                  }
                }}
                className="p-1.5 rounded border flex items-center justify-between hover:bg-muted/10 cursor-pointer transition-colors bg-accent/10 border-yellow-200"
              >
                <div className="flex items-center space-x-1.5">
                  <div className="bg-accent/20 p-1 rounded-full">
                    <Pill className="h-3 w-3 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-muted-foreground text-xs truncate">Pending Prescription</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-medium">
                        {prescription.patient?.firstName} {prescription.patient?.lastName}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground/50 truncate">
                      {prescription.medicationName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="font-bold text-accent-foreground">ETB {prescription.totalCost?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>
            ))}

            {/* Pending lab orders display removed */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPanel; 