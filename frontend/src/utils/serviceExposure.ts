// Service Exposure System - Simple Version
// This file exposes all services to the window object for global access

console.log('🔧 [ServiceExposure] Starting service exposure...');

// Import services directly
import billingService from '../services/billingService';
import { notificationService } from '../services/notificationService';
import prescriptionService from '../services/prescriptionService';
import patientService from '../services/patientService';
import api from '../services/apiService';

console.log('🔧 [ServiceExposure] Services imported:', {
  billingService: !!billingService,
  notificationService: !!notificationService,
  prescriptionService: !!prescriptionService,
  patientService: !!patientService,
  api: !!api
});

// Expose services to window object for global access
if (typeof window !== 'undefined') {
  try {
    // Expose individual services
    (window as any).billingService = billingService;
    (window as any).notificationService = notificationService;
    (window as any).prescriptionService = prescriptionService;
    (window as any).patientService = patientService;
    (window as any).apiService = api;

    // Expose services object for organized access
    (window as any).services = {
      billing: billingService,
      notifications: notificationService,
      prescriptions: prescriptionService,
      patients: patientService,
      api: api
    };

    // Enhanced API debug utilities
    (window as any).apiDebug = {
      ...(window as any).apiDebug,
      services: {
        billing: billingService,
        notifications: notificationService,
        prescriptions: prescriptionService,
        patients: patientService,
        api: api
      },
      // Quick access methods
      getBillingData: () => billingService?.getAllInvoices(),
      getNotifications: () => {
        const userData = JSON.parse(localStorage.user_data || '{}');
        return notificationService?.getNotifications(userData._id || userData.id);
      },
      getPrescriptions: () => prescriptionService?.getPrescriptionsByDoctor(''),
      getPatients: () => patientService?.getAllPatients(),
      // Test methods
      testBilling: async () => {
        try {
          if (!billingService) {
            throw new Error('Billing service not available');
          }
          const result = await billingService.getAllInvoices();
          console.log('✅ Billing service test successful:', result);
          return result;
        } catch (error) {
          console.error('❌ Billing service test failed:', error);
          throw error;
        }
      },
      testNotifications: async () => {
        try {
          if (!notificationService) {
            throw new Error('Notification service not available');
          }
          const userData = JSON.parse(localStorage.user_data || '{}');
          const result = await notificationService.getNotifications(userData._id || userData.id);
          console.log('✅ Notification service test successful:', result);
          return result;
        } catch (error) {
          console.error('❌ Notification service test failed:', error);
          throw error;
        }
      }
    };

    console.log('🔧 [ServiceExposure] Services exposed to window object:', {
      billingService: !!billingService,
      notificationService: !!notificationService,
      prescriptionService: !!prescriptionService,
      patientService: !!patientService,
      apiService: !!api
    });
  } catch (error) {
    console.error('❌ [ServiceExposure] Error exposing services to window:', error);
  }
}

export default {
  billingService,
  notificationService,
  prescriptionService,
  patientService,
  api
};
