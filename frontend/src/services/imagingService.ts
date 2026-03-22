import api from './apiService';
import { Patient } from '../types/patient';
import { User } from '../types/user';

export interface ImagingOrder {
  _id: string;
  patient: Patient & { name: string; firstName?: string; lastName?: string };
  doctor: User;
  imagingType: string;
  bodyPart: string;
  clinicalInfo: string;
  orderDateTime: string;
  status: 'Ordered' | 'Scheduled' | 'In Progress' | 'Completed' | 'Results Available' | 'Cancelled';
  priority?: 'Routine' | 'STAT' | 'ASAP';
  results?: any;
  reportWorkflow?: {
    status?: 'Draft' | 'Finalized' | 'Sent';
    version?: number;
    lastDraftSavedAt?: string;
    finalizedAt?: string;
    sentAt?: string;
  };
  // Backend fields
  patientId?: any;
  orderingDoctorId?: any;
  notes?: string;
  serviceRequestId?: {
    _id: string;
    status: string;
    invoice?: {
      _id: string;
      status: string;
    };
  };
}

const imagingService = {
  async getImagingOrders(): Promise<ImagingOrder[]> {
    try {
    // Include unpaid orders so imaging department can see all orders
    const res = await api.get('/api/imaging-orders?includeUnpaid=true');
    
    // Debug: Log the raw API response
    console.log('Raw API response:', res.data);
    console.log('First order from API:', res.data[0]);
      
    // Transform the data to add computed name property for patients
    const orders = res.data.map((order: any) => {
      console.log('Processing order:', order);
      return {
      ...order,
      patient: order.patientId ? {
        ...order.patientId,
        name: `${order.patientId.firstName || 'Unknown'} ${order.patientId.lastName || 'Patient'}`,
        firstName: order.patientId.firstName,
        lastName: order.patientId.lastName
      } : {
        _id: 'unknown',
        name: 'Unknown Patient',
        firstName: 'Unknown',
        lastName: 'Patient'
      },
      doctor: order.orderingDoctorId ? {
        ...order.orderingDoctorId,
        name: `${order.orderingDoctorId.firstName || 'Unknown'} ${order.orderingDoctorId.lastName || 'Doctor'}`
      } : {
        _id: 'unknown',
        name: 'Unknown Doctor'
      },
      // Ensure imagingType and bodyPart are properly mapped
      imagingType: order.imagingType || 'Not specified',
      bodyPart: order.bodyPart || 'Not specified',
      clinicalInfo: order.notes || 'No clinical information provided',
      orderDateTime: order.orderDateTime || new Date().toISOString()
    };
    });
    
    console.log('Transformed orders:', orders);
    return orders;
    } catch (error) {
      console.error('Error fetching imaging orders:', error);
      throw error;
    }
  },

  async createImagingOrder(data: {
    patientId: string;
    imagingType: string;
    bodyPart: string;
    clinicalInfo: string;
    priority: 'Routine' | 'STAT' | 'ASAP';
  }) {
    const res = await api.post('/api/imaging-orders', {
      patientId: data.patientId,
      imagingType: data.imagingType,
      bodyPart: data.bodyPart,
      notes: data.clinicalInfo,
      priority: data.priority
    });
    return res.data;
  },

  async updateOrderStatus(id: string, status: ImagingOrder['status']) {
    const res = await api.put(`/api/imaging-orders/${id}/status`, { status });
    return res.data;
  },

  async submitImagingResults(id: string, results: any) {
    try {
      // New workflow: finalization is the step that releases results
      const res = await api.put(`/api/imaging-orders/${id}/report/finalize`, { results });
      return res.data;
    } catch (error) {
      console.error('Error submitting imaging results:', error);
      throw error;
    }
  },

  async saveImagingResultsDraft(id: string, results: any) {
    const res = await api.put(`/api/imaging-orders/${id}/report/draft`, { results });
    return res.data;
  },

  async finalizeImagingReport(id: string, results: any) {
    const res = await api.put(`/api/imaging-orders/${id}/report/finalize`, { results });
    return res.data;
  },

  async sendImagingReportToDoctor(id: string) {
    const res = await api.put(`/api/imaging-orders/${id}/report/send`);
    return res.data;
  },

  async updateImagingOrder(id: string, data: Partial<ImagingOrder>) {
    const res = await api.put(`/api/imaging-orders/${id}`, data);
    return res.data;
  },

  async getImagingResultsByPatient(patientId: string): Promise<ImagingOrder[]> {
    try {
      console.log('=== IMAGING SERVICE DEBUG ===');
      console.log('Fetching imaging results for patient:', patientId);
      console.log('API base URL:', api.defaults.baseURL);
      console.log('Making request to:', `/api/imaging-orders/patient/${patientId}`);
      
      // Use the new patient-specific endpoint
      const res = await api.get(`/api/imaging-orders/patient/${patientId}`);
      console.log('Patient-specific imaging results response:', res.data);
      console.log('Response status:', res.status);
      
      // The backend already filters for this patient and results, so return directly
      const patientImagingResults = res.data || [];
      
      console.log('Imaging results for patient:', patientImagingResults.map((order: any) => ({
        id: order._id,
        patientId: order.patientId?._id || order.patientId,
        patientName: order.patientId?.firstName + ' ' + order.patientId?.lastName,
        imagingType: order.imagingType,
        bodyPart: order.bodyPart,
        status: order.status,
        hasResults: !!(order.results || order.resultsSummary)
      })));
      
      return patientImagingResults;
    } catch (error) {
      console.error('Error fetching imaging results by patient:', error);
      // Fallback to the general endpoint if the specific one fails
      try {
        console.log('Falling back to general imaging orders endpoint...');
        const res = await api.get('/api/imaging-orders?includeUnpaid=true');
        console.log('Fallback imaging orders response:', res.data);
        
        // Filter orders for the specific patient and with results
        const patientImagingResults = res.data.filter((order: any) => {
          const orderPatientId = order.patientId?._id || order.patientId;
          const hasResults = order.status === 'Results Available' || order.status === 'Completed' || order.results || order.resultsSummary || order.status === 'In Progress';
          
          // More flexible patient ID matching
          const patientMatches = orderPatientId === patientId || 
                                orderPatientId === patientId?.toString() ||
                                (typeof orderPatientId === 'string' && typeof patientId === 'string' && 
                                 orderPatientId.toLowerCase() === patientId.toLowerCase());
          
          console.log(`Fallback checking order: orderPatientId=${orderPatientId}, targetPatientId=${patientId}, status=${order.status}, hasResults=${hasResults}, patientMatches=${patientMatches}`);
          return patientMatches && hasResults;
        });
        
        console.log('Fallback filtered imaging results for patient:', patientImagingResults);
        return patientImagingResults;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw error;
      }
    }
  }
};

export default imagingService;
