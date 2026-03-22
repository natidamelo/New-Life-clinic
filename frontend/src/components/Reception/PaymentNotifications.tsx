import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import prescriptionService from '../../services/prescriptionService';
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
  Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import Spinner from '../Spinner';

const PROCESSED_NOTIFICATIONS_KEY = 'clinic_processed_notifications';

const getProcessedNotificationIds = (): string[] => {
  try {
    const stored = localStorage.getItem(PROCESSED_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from local storage:', error);
    return [];
  }
};

// Helper function to get icon based on notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'medication_payment_required':
    case 'lab_payment_required':
    case 'service_payment_required':
    case 'card_payment_required':
      return <Pill className="h-5 w-5 text-accent-foreground" />;
    case 'appointment_reminder':
      return <Calendar className="h-5 w-5 text-primary" />;
    case 'lab_result_ready':
      return <FileText className="h-5 w-5 text-primary" />;
    case 'prescription_refill':
      return <Pill className="h-5 w-5 text-secondary-foreground" />;
    case 'critical_alert':
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'system_update':
      return <Info className="h-5 w-5 text-primary" />;
    case 'PATIENT_READY':
      return <User className="h-5 w-5 text-primary" />;
    case 'PATIENT_VITALS':
    case 'vitals_update':
      return <Activity className="h-5 w-5 text-primary" />;
    case 'nurse_medication_task':
      return <Pill className="h-5 w-5 text-secondary-foreground" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

// Helper function to get background color based on notification type
const getNotificationBgColor = (type: string) => {
  switch (type) {
    case 'medication_payment_required':
    case 'lab_payment_required':
    case 'service_payment_required':
    case 'card_payment_required':
      return 'bg-accent/20';
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

// Helper function to get text color based on notification type
const getNotificationTextColor = (type: string) => {
  switch (type) {
    case 'medication_payment_required':
    case 'lab_payment_required':
    case 'service_payment_required':
    case 'card_payment_required':
      return 'text-accent-foreground';
    case 'appointment_reminder':
      return 'text-primary';
    case 'lab_result_ready':
      return 'text-primary';
    case 'prescription_refill':
      return 'text-secondary-foreground';
    case 'critical_alert':
      return 'text-destructive';
    case 'system_update':
      return 'text-primary';
    case 'PATIENT_READY':
      return 'text-primary';
    case 'PATIENT_VITALS':
    case 'vitals_update':
      return 'text-primary';
    case 'nurse_medication_task':
      return 'text-secondary-foreground';
    default:
      return 'text-muted-foreground';
  }
};

const NotificationsPanel: React.FC = () => {
  console.log('🔍 [PaymentNotifications] Component loaded - VERSION 2.0 with medication amount fixes');
  
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
      console.log('🔐 Authentication Status:', authStatus);

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
      
      const processedIds = getProcessedNotificationIds();
      
      // Handle notifications
      const allNotifications = notificationsResponse.data?.data || notificationsResponse.data?.notifications || [];
      console.log('🔍 Notification Response Structure:', {
        fullResponse: notificationsResponse.data,
        hasData: !!notificationsResponse.data?.data,
        hasNotifications: !!notificationsResponse.data?.notifications
      });

      if (Array.isArray(allNotifications)) {
        console.log('🔍 Raw notifications from API:', allNotifications.length);
        
        const activeNotifications = allNotifications.filter((n: any) => {
          // For payment notifications, apply more lenient filtering
          if (n.type.includes('payment_required')) {
            const amount = n.data?.amount ?? n.data?.totalAmount ?? 0;
            const amountPaid = n.data?.amountPaid ?? 0;
            const remainingAmount = amount - amountPaid;
            const isPaid = n.data?.paymentStatus === 'paid';
            const isPartiallyPaid = n.data?.paymentStatus === 'partially_paid' || n.data?.paymentStatus === 'partial';
            const isPending = n.data?.paymentStatus === 'pending' || !n.data?.paymentStatus;
            const isRead = n.read;
            const isProcessed = processedIds.includes(n._id);
            const isExtension = n.data?.isExtension || n.data?.lastExtension;
            
            // For extension notifications, show if there's a remaining balance to pay
            if (isExtension && isPartiallyPaid && remainingAmount > 0) {
              console.log(`✅ Showing extension notification for ${n.data?.patientName}: remainingAmount=${remainingAmount}, totalAmount=${amount}, amountPaid=${amountPaid}`);
              return !isRead && !isProcessed;
            }
            
            // More lenient filtering: show if not paid, not processed, has amount, and not read
            const shouldShow = !isPaid && !isPartiallyPaid && !isProcessed && amount > 0 && !isRead;
            
            // Special handling for payment notifications: if paid or partially paid, it should NOT show.
            // For lab notifications, hide after ANY payment activity
            if (n.type === 'lab_payment_required') {
              const hasAnyPayment = isPaid || isPartiallyPaid || n.data?.paidAt || n.data?.invoiceId;
              if (hasAnyPayment) {
                console.log(`✅ Hiding lab payment notification for ${n.data?.patientName}: hasAnyPayment=${hasAnyPayment}, paid=${isPaid}, partiallyPaid=${isPartiallyPaid}, paidAt=${n.data?.paidAt}, invoiceId=${n.data?.invoiceId}`);
                return false;
              }
            } else if (n.type === 'medication_payment_required' && isExtension) {
              // For medication extensions, show even if partially paid (for nurse task visibility)
              console.log(`✅ Showing medication extension notification for ${n.data?.patientName}: isExtension=${isExtension}, partiallyPaid=${isPartiallyPaid}, read=${isRead}, processed=${isProcessed}`);
              return !isRead && !isProcessed;
            } else if (isPaid || isPartiallyPaid) {
              console.log(`✅ Hiding ${isPaid ? 'paid' : 'partially paid'} payment notification for ${n.data?.patientName}: amount=${amount}, read=${isRead}, paid=${isPaid}, partiallyPaid=${isPartiallyPaid}, processed=${isProcessed}`);
              return false;
            }

            if (!shouldShow) {
              console.log(`🚫 Filtering out notification for ${n.data?.patientName}: 
                amount=${amount}, 
                read=${isRead}, 
                paid=${isPaid}, 
                partiallyPaid=${isPartiallyPaid}, 
                processed=${isProcessed}, 
                pending=${isPending}`);
            }
            
            return shouldShow;
          }
          
          // For other notifications, just check if not read
          return !n.read;
        });
        
        console.log('🔍 Active notifications after filtering:', activeNotifications.length);
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
                           (p.paymentStatus !== 'paid' && p.paymentStatus !== 'partially_paid' && p.paymentStatus !== 'partial' && (p.status === 'PENDING' || p.status === 'Pending' || p.status === 'Active'));
          
          // Only show prescriptions that are pending AND have an amount > 0 AND not paid AND not partially paid
          const shouldShow = isPending && hasAmount && !isPaid && !isPartiallyPaid;
          
          if (!shouldShow) {
            console.log(`🚫 Filtering out prescription for ${p.patient?.firstName} ${p.patient?.lastName}: cost=${p.totalCost}, status=${p.paymentStatus}, paid=${isPaid}, partiallyPaid=${isPartiallyPaid}`);
          }
          
          return shouldShow;
        });
        setPendingPrescriptions(pendingPrescriptions);
      } else {
        setPendingPrescriptions([]);
      }
      
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

  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 30000);
    
    // Listen for payment processed events to refresh immediately
    const handlePaymentProcessed = (event: CustomEvent) => {
      console.log('Payment processed event received, refreshing notifications...');
      fetchAllNotifications();
    };
    
    window.addEventListener('paymentProcessed', handlePaymentProcessed as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('paymentProcessed', handlePaymentProcessed as EventListener);
    };
  }, []);

  const handleNotificationClick = (notification: any) => {
    // Handle different notification types
    if (notification.type.includes('payment_required')) {
      navigate(`/billing/process-payment/${notification._id}`);
    } else if (notification.type === 'appointment_reminder') {
      navigate('/app/appointments');
    } else if (notification.type === 'lab_result_ready') {
      navigate('/app/lab');
    } else if (notification.type === 'PATIENT_READY') {
      navigate('/app/reception');
    } else {
      // For other notifications, just mark as read
      markNotificationAsRead(notification._id);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Filter notifications based on active tab
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'payments':
        return notifications.filter(n => n.type.includes('payment_required'));
      case 'appointments':
        return notifications.filter(n => n.type === 'appointment_reminder' || n.type === 'PATIENT_READY');
      case 'lab':
        return notifications.filter(n => n.type === 'lab_result_ready' || n.type === 'lab_payment_required');
      case 'system':
        return notifications.filter(n => n.type === 'system_update' || n.type === 'critical_alert');
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const totalNotifications = notifications.length + pendingPrescriptions.length;

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center">
            <Bell className="h-6 w-6 mr-3 text-primary" />
            <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>All notifications requiring attention.</CardDescription>
            </div>
        </div>
        <Badge variant="secondary">{totalNotifications} Pending</Badge>
      </CardHeader>
      
      {/* Tab Navigation */}
      <div className="px-6 pb-4 border-b">
        <div className="flex space-x-1">
          {[
            { key: 'all', label: 'All', count: totalNotifications },
            { key: 'payments', label: 'Payments', count: notifications.filter(n => n.type.includes('payment_required')).length + pendingPrescriptions.length },
            { key: 'appointments', label: 'Appointments', count: notifications.filter(n => n.type === 'appointment_reminder' || n.type === 'PATIENT_READY').length },
            { key: 'lab', label: 'Lab', count: notifications.filter(n => n.type === 'lab_result_ready' || n.type === 'lab_payment_required').length },
            { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system_update' || n.type === 'critical_alert').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 bg-muted/30 text-muted-foreground px-1.5 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Spinner />
            </div>
        ) : (filteredNotifications.length === 0 && (activeTab === 'all' ? pendingPrescriptions.length === 0 : true)) ? (
          <div className="text-center py-10">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No {activeTab === 'all' ? '' : activeTab} notifications at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show filtered notifications */}
            {filteredNotifications.map((notification) => {
              const displayAmount = (notification.data?.amount ?? notification.data?.totalAmount ?? 0);
              const isPaymentNotification = notification.type.includes('payment_required');
              
              return (
                <div 
                  key={notification._id} 
                  onClick={() => handleNotificationClick(notification)}
                  className="p-3 rounded-lg border flex items-center justify-between hover:bg-muted/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getNotificationBgColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {notification.data?.patientName && (
                          <>Patient: <span className="font-medium">{notification.data.patientName}</span></>
                        )}
                        {!notification.data?.patientName && notification.message}
                      </p>
                      {notification.data?.testName && (
                        <p className="text-xs text-muted-foreground/50">Test: {notification.data.testName}</p>
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
                            console.log(`🔍 [PaymentNotifications] Medication amount calculation for ${med.name}:`, {
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
                              console.log(`🔍 [PaymentNotifications] Calculated proportional amount:`, {
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

                  <div className="flex items-center space-x-6">
                    {isPaymentNotification && displayAmount > 0 && (
                      <div className="text-right">
                        <p className="font-bold text-primary">ETB {displayAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                    {!isPaymentNotification && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                </div>
              );
            })}
            
            {/* Show pending prescriptions only in payments tab or all tab */}
            {(activeTab === 'all' || activeTab === 'payments') && pendingPrescriptions.map((prescription) => (
              <div 
                key={prescription._id} 
                onClick={async () => {
                  try {
                    // Create a temporary notification so we can reuse the new payment dialog
                    const notifRes = await api.post('/api/notifications', {
                      type: 'medication_payment_required',
                      title: 'Medication Payment Required',
                      message: `Payment required for prescription ${prescription.medicationName}`,
                      recipientRole: 'reception',
                      senderRole: 'reception', // Added missing required field
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
                className="p-3 rounded-lg border flex items-center justify-between hover:bg-muted/10 cursor-pointer transition-colors bg-accent/10 border-yellow-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-accent/20 p-2 rounded-full">
                    <Pill className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Pending Prescription</p>
                    <p className="text-sm text-muted-foreground">
                      Patient: <span className="font-medium">
                        {prescription.patient?.firstName} {prescription.patient?.lastName}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      Medication: {prescription.medicationName}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsPanel; 