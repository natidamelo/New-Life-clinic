import api from './apiService';

// Include backend-supported enums (cash, card, bank_transfer, insurance, other)
// Keep legacy values to avoid type errors elsewhere, but normalize to backend on usage.
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'insurance'
  | 'other'
  | 'credit_card'
  | 'debit_card'
  | 'check'
  | 'mobile_payment';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
export type InsuranceStatus = 'pending' | 'approved' | 'partial' | 'denied' | 'not_submitted';
export type ItemType = 'service' | 'procedure' | 'medication' | 'supply' | 'lab' | 'imaging' | 'consultation' | 'other';

export interface InvoiceItem {
  itemType: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
  serviceId?: string;
  inventoryItemId?: string;
  labTestId?: string;
  imagingId?: string;
  procedureId?: string;
  notes?: string;
}

export interface Payment {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  date: string;
  notes?: string;
  processedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Insurance {
  provider?: string;
  policyNumber?: string;
  claimNumber?: string;
  coveragePercent?: number;
  approvalCode?: string;
  status?: InsuranceStatus;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patient?: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
  } | string;
  patientId?: string;
  patientName?: string;
  visit?: string;
  medicalRecord?: string;
  provider?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  payments: Payment[];
  status: InvoiceStatus;
  issueDate: string;
  dateIssued?: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  paymentTIN?: string;
  paymentCustomerName?: string;
  insurance?: Insurance;
  patientCard?: {
    _id: string;
    cardNumber: string;
    type: string;
    status: string;
  };
  notes?: string;
  attachment?: string;
  termsAndConditions?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  lastUpdatedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  isConsolidated?: boolean;
  isDailyConsolidated?: boolean;
  finalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceData {
  patient: string;
  visit?: string;
  medicalRecord?: string;
  provider?: string;
  items: Omit<InvoiceItem, 'total'>[];
  dueDate?: string;
  insurance?: Insurance;
  notes?: string;
}

export interface UpdateInvoiceData {
  items?: Omit<InvoiceItem, 'total'>[];
  dueDate?: string;
  insurance?: Insurance;
  notes?: string;
  attachment?: string;
  status?: InvoiceStatus;
}

export interface AddPaymentData {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface FilterOptions {
  patient?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}

class BillingService {
  async getInvoices(filters?: FilterOptions, options?: PaginationOptions) {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.patient) params.append('patient', filters.patient);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
    }
    
    if (options) {
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sort) params.append('sort', options.sort);
    }
    
    const response = await api.get(`/api/billing/invoices?${params.toString()}`);
    return response.data;
  }

  async getUnpaidInvoices(patientId: string) {
    const response = await api.get(`/api/billing/unpaid-invoices?patientId=${patientId}`);
    return response.data;
  }

  async getUnpaidInvoicesBatch(patientIds: string[]) {
    const params = new URLSearchParams();
    params.append('patientIds', patientIds.join(','));
    const response = await api.get(`/api/billing/unpaid-invoices-batch?${params.toString()}`);
    return response.data;
  }

  async getAllInvoices(filters?: FilterOptions, options?: PaginationOptions) {
    // Alias for compatibility
    return this.getInvoices(filters, options);
  }

  async getInvoiceById(id: string) {
    const response = await api.get(`/api/billing/invoices/${id}`);
    const invoice = response.data.data;
    
    // Debug: Expose current invoice
    this.debugSetCurrentInvoice(invoice);
    
    return invoice;
  }

  async createInvoice(data: CreateInvoiceData) {
    const response = await api.post('/api/billing/invoices', data);
    return response.data.data;
  }

  async updateInvoice(id: string, data: UpdateInvoiceData) {
    const response = await api.put(`/api/billing/invoices/${id}`, data);
    return response.data.data;
  }

  async cancelInvoice(id: string, reason: string) {
    const response = await api.put(`/api/billing/invoices/${id}/cancel`, { reason });
    return response.data.data;
  }

  async finalizeInvoice(id: string) {
    const response = await api.post(`/api/billing/invoices/${id}/finalize`);
    return response.data.data;
  }

  async processServicePayment(invoiceId: string, data: {
    paymentMethod: string;
    amountPaid: number;
    notes?: string;
    sendToNurse?: boolean;
  }) {
    try {
      console.log('🏥 Processing service payment:', { invoiceId, data });
      
      const response = await api.post('/api/billing/process-service-payment', {
        invoiceId,
        ...data
      });
      
      console.log('✅ Service payment processed successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Service payment processing failed:', error);
      throw error;
    }
  }

  async addPayment(id: string, data: AddPaymentData) {
    try {
      // Extensive input validation and logging
      console.group('💰 Billing Service: Add Payment');
      console.log('Input Parameters:', { 
        invoiceId: id, 
        amount: data.amount, 
        method: data.method,
        notes: data.notes 
      });

      // Validate input data
      if (!id) {
        console.error('❌ Validation Error: Invoice ID is required');
        throw new Error('Invoice ID is required');
      }
      
      if (data.amount === undefined || data.amount <= 0) {
        console.error('❌ Validation Error: Invalid payment amount', { amount: data.amount });
        throw new Error('Payment amount must be greater than zero');
      }
      
      // Validate payment method (normalize legacy values to backend-supported ones)
      const normalizationMap: Record<string, PaymentMethod> = {
        credit_card: 'card',
        debit_card: 'card',
        bank: 'bank_transfer',
        check: 'other',
        mobile_payment: 'other'
      };
      const normalizedMethod = (normalizationMap as any)[data.method] || data.method;
      (data as any).method = normalizedMethod;
      
      console.log('🔍 [Payment Method] Method normalization:', {
        originalMethod: data.method,
        normalizedMethod: normalizedMethod
      });

      const validPaymentMethods: PaymentMethod[] = [
        'cash', 'card', 'bank_transfer', 'insurance', 'other'
      ];
      
      if (!validPaymentMethods.includes((data.method as any))) {
        console.error('❌ Validation Error: Invalid payment method', { 
          method: data.method, 
          validMethods: validPaymentMethods 
        });
        throw new Error(`Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`);
      }

      // Prepare the request configuration with detailed logging
      const requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          // You might want to add any additional headers here
        },
        timeout: 10000 // 10-second timeout
      };

      // Build a body that satisfies both legacy and new backend validators
      const requestBody: any = {
        amount: data.amount,
        // legacy naming
        method: normalizedMethod,
        reference: data.reference || '',
        // validator naming
        paymentMethod: normalizedMethod,
        transactionId: data.reference || '',
        notes: data.notes || ''
      };

      console.log('📤 Sending payment request', {
        url: `/api/billing/invoices/${id}/payments`,
        data,
        requestBody,
        config: requestConfig
      });

      // Debug: Log the exact request body being sent
      console.log('🔍 [DEBUG] Request body being sent:', JSON.stringify(requestBody, null, 2));

      const response = await api.post(`/api/billing/invoices/${id}/payments`, requestBody, requestConfig);
      
      // Log successful response
      console.log('✅ Payment processed successfully:', {
        status: response.status,
        data: response.data
      });

      console.groupEnd();

      // Handle both old and new response formats
      if (response.data.data) {
        return response.data.data;
      } else if (response.data.success) {
        return response.data.data || response.data;
      } else {
        return response.data;
      }
    } catch (error: any) {
      console.group('❌ Payment Processing Error');
      
      // Enhanced error logging
      console.error('Error Details:', {
        message: error.message,
        name: error.name,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: error.config
      });

      // Throw a more informative error
      if (error.response) {
        // Backend returned an error response
        const responseData = error.response.data;
        const errorMessage = responseData.message || 
                             responseData.error || 
                             'Failed to process payment due to a server error';
        
        console.error('🚨 Server Error:', {
          errorCode: responseData.error,
          message: errorMessage,
          details: responseData,
          fullResponse: JSON.stringify(responseData, null, 2),
          status: error.response.status,
          statusText: error.response.statusText,
          suggestedAmount: responseData.suggestedAmount
        });

        console.groupEnd();
        
        // Create enhanced error with suggested amount if available
        const enhancedError = new Error(errorMessage);
        if (responseData.suggestedAmount !== undefined) {
          (enhancedError as any).suggestedAmount = responseData.suggestedAmount;
          (enhancedError as any).details = responseData.details;
        }
        throw enhancedError;
      } else if (error.request) {
        // Request was made but no response received
        console.error('🌐 Network Error: No response received');
        console.groupEnd();
        throw new Error('No response received from server. Please check your network connection.');
      } else {
        // Something happened in setting up the request
        console.error('🔧 Request Setup Error:', error.message);
        console.groupEnd();
        throw error;
      }
    } finally {
      console.groupEnd(); // Ensure group is closed even if an error occurs
    }
  }

  async generateFromMedicalRecord(medicalRecordId: string) {
    const response = await api.post('/api/billing/invoices/from-medical-record', { medicalRecordId });
    return response.data.data;
  }

  async downloadInvoice(id: string) {
    const response = await api.get(`/api/billing/invoices/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getBillingReport(startDate: string, endDate: string, format: 'pdf' | 'csv' | 'excel' = 'pdf') {
    const response = await api.get('/api/billing/reports', {
      params: {
        startDate,
        endDate,
        format
      },
      responseType: 'blob' // Expect a binary file (PDF/CSV/XLSX)
    });
    return response.data as Blob;
  }

  async getDetailedBillingReport(startDate: string, endDate: string, filters?: {
    status?: string;
    paymentMethod?: string;
    patientId?: string;
  }, format: 'json' | 'csv' | 'pdf' = 'json') {
    const params = new URLSearchParams({
      startDate,
      endDate,
      format
    });

    if (filters?.status) params.append('status', filters.status);
    if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters?.patientId) params.append('patientId', filters.patientId);

    const response = await api.get(`/api/billing/reports/detailed?${params.toString()}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    });


    return response.data;
  }

  // Standard Financial Report Methods
  async getFinancialSummary(startDate: Date, endDate: Date) {
    console.log('🌐 Frontend calling financial summary API with dates:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      _t: Date.now().toString() // Cache busting parameter
    });
    const response = await api.get(`/api/billing/financial-summary?${params.toString()}`);
    
    console.log('📊 Financial summary API response:', response.data);
    return response.data.data || response.data || {};
  }

  async getAccountsReceivableAging() {
    const response = await api.get('/api/billing/aging-report');
    return response.data.data || response.data || {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0
    };
  }

  async getMonthlyFinancialData(startDate: Date, endDate: Date) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    const response = await api.get(`/api/billing/monthly-data?${params.toString()}`);
    return response.data.data || response.data || [];
  }

  async getRevenueByService(startDate: Date, endDate: Date) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    const response = await api.get(`/api/billing/revenue-by-service?${params.toString()}`);
    return response.data.data || response.data || [];
  }

  async getPaymentMethodBreakdown(startDate: Date, endDate: Date) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    const response = await api.get(`/api/billing/payment-methods?${params.toString()}`);
    return response.data.data || response.data || [];
  }

  async getBillingStats(startDate: Date, endDate: Date) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    const response = await api.get(`/api/billing/stats?${params.toString()}`);
    return response.data?.data || response.data || {};
  }

  async generateStandardFinancialReport(startDate: string, endDate: string, format: 'pdf' | 'csv' | 'excel' = 'pdf') {
    const params = new URLSearchParams({
      startDate,
      endDate,
      format
    });
    const response = await api.get(`/api/billing/reports/standard-financial?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Debug method to expose current invoice
  debugSetCurrentInvoice(invoice: Invoice) {
    if (window && window.apiDebug) {
      window.apiDebug.currentInvoice = invoice;
      console.log('🔍 Debug: Current Invoice Set', invoice);
    }
  }

  async getUnpaidInvoicesByPatient(patientId: string) {
    try {
      console.log(`🔍 Fetching unpaid invoices for patient: ${patientId}`);
      
      const response = await api.get(`/api/billing/unpaid-invoices/detailed?patientId=${patientId}`);
      
      console.log('📋 Unpaid Invoices Response:', response.data);
      
      // Validate and transform response
      const result = {
        patientId,
        patientName: response.data.patientName || 'Unknown Patient',
        invoices: response.data.invoices || [],
        paymentRequirementId: response.data.paymentRequirementId || null
      };
      
      console.log('💰 Processed Unpaid Invoices:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error fetching unpaid invoices:', error);
      throw error;
    }
  }

  /**
   * Process partial payment on consolidated invoice
   * @param invoiceId - Invoice ID
   * @param paymentData - Payment data
   * @returns Promise with updated invoice
   */
  async processPartialPayment(invoiceId: string, paymentData: {
    amount: number;
    method: string;
    notes?: string;
  }): Promise<any> {
    try {
      console.group('💰 Processing Partial Payment');
      console.log('Invoice ID:', invoiceId);
      console.log('Payment Data:', paymentData);

      const response = await api.post(`/api/billing/process-partial-payment`, {
        invoiceId,
        paymentMethod: paymentData.method,
        amountPaid: paymentData.amount,
        notes: paymentData.notes || 'Partial payment'
      });

      console.log('✅ Partial payment processed successfully:', response.data);
      console.groupEnd();

      return response.data.data;
    } catch (error: any) {
      console.group('❌ Partial Payment Error');
      
      // Enhanced error logging
      console.error('Error Details:', {
        message: error.message,
        name: error.name,
        response: error.response?.data,
        status: error.response?.status
      });

      // Throw a more informative error
      if (error.response) {
        const errorMessage = error.response.data.message || 
                             error.response.data.error || 
                             'Failed to process partial payment';
        
        console.error('🚨 Server Error:', {
          errorCode: error.response.data.error,
          message: errorMessage,
          details: error.response.data
        });

        console.groupEnd();
        throw new Error(errorMessage);
      } else if (error.request) {
        console.error('🌐 Network Error: No response received');
        console.groupEnd();
        throw new Error('No response received from server. Please check your network connection.');
      } else {
        console.error('🔧 Request Setup Error:', error.message);
        console.groupEnd();
        throw error;
      }
    } finally {
      console.groupEnd();
    }
  }
}

// Get enhanced invoice analytics
export const getInvoiceAnalytics = async (invoiceId: string) => {
  try {
    const response = await api.get(`/billing/invoice-analytics/${invoiceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching invoice analytics:', error);
    throw error;
  }
};

// Get payment history for an invoice
export const getInvoicePaymentHistory = async (invoiceId: string) => {
  try {
    const response = await api.get(`/billing/invoice-payment-history/${invoiceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

// Get all invoices with enhanced analytics
export const getInvoicesWithAnalytics = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const response = await api.get('/billing/invoices-with-analytics', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices with analytics:', error);
    throw error;
  }
};

// Create a new invoice
export const createInvoice = async (invoiceData: {
  patient: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  dueDate?: string;
  notes?: string;
  createdBy?: string;
}) => {
  try {
    const response = await api.post('/billing/invoices', invoiceData);
    return response.data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

export default new BillingService(); 