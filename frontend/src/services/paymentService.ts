import api from './apiService';

// Define interfaces directly in the service file for now
// Consider moving to a dedicated types file (e.g., frontend/src/types/payment.ts) later

export interface UserRef { // For processedBy field
  _id: string;
  firstName: string;
  lastName: string;
  // Add other user fields if needed/returned by populate
}

export interface InvoiceRef { // For populated invoiceId field
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
}

export interface PaymentTransaction {
  _id: string;
  invoiceId: string | InvoiceRef; 
  patientId: string; 
  amountPaid: number;
  paymentMethod: 'Cash' | 'Card' | 'MobileMoney' | 'Insurance' | 'BankTransfer' | 'OnlineGateway' | 'Other';
  transactionDate: string; // ISO Date string
  paymentGatewayId?: string;
  referenceNumber?: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded' | 'PartiallyRefunded';
  notes?: string;
  processedBy: UserRef;
  currency: string;
  relatedTransactionId?: string;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

export interface NewPaymentData {
  invoiceId: string;
  patientId: string;
  amountPaid: number;
  paymentMethod: PaymentTransaction['paymentMethod'];
  transactionDate?: string; 
  paymentGatewayId?: string;
  referenceNumber?: string;
  notes?: string;
  currency?: string;
  timestamp?: string; // Add timestamp property
}

export interface UpdatedInvoiceInfo { 
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: InvoiceRef['status']; 
  // Add any other relevant fields that your backend returns for the updated invoice
  patient?: string; // Example: if patient ID is returned
  issueDate?: string;
  dueDate?: string;
}

export interface RecordPaymentResponse {
  message: string;
  paymentTransaction: PaymentTransaction;
  updatedInvoice: UpdatedInvoiceInfo;
}

const PAYMENT_API_URL = '/api/billing';

/**
 * Maps frontend payment method values to backend expected values
 */
const mapPaymentMethodToBackend = (frontendMethod: PaymentTransaction['paymentMethod']): string => {
  const methodMap: Record<PaymentTransaction['paymentMethod'], string> = {
    'Cash': 'cash',
    'Card': 'card', 
    'MobileMoney': 'other', // Mobile money maps to 'other' since it's not in backend enum
    'Insurance': 'insurance',
    'BankTransfer': 'bank_transfer', // This is the key fix
    'OnlineGateway': 'other', // Online gateway maps to 'other'
    'Other': 'other'
  };
  
  return methodMap[frontendMethod] || 'other';
};

/**
 * Records a new payment for an invoice.
 * @param paymentData - The data for the new payment.
 * @returns The newly created payment transaction and updated invoice details.
 */
export const recordPayment = async (paymentData: NewPaymentData): Promise<RecordPaymentResponse> => {
  try {
    console.log('🚀 [PaymentService] Sending payment request to:', `${PAYMENT_API_URL}/invoices/${paymentData.invoiceId}/payments`);
    console.log('📦 [PaymentService] Payment data:', paymentData);
    
    // Validate required fields
    if (!paymentData.invoiceId) {
      console.error('❌ [PaymentService] Missing invoiceId');
      throw new Error('Invoice ID is required');
    }
    
    if (!paymentData.patientId) {
      console.error('❌ [PaymentService] Missing patientId');
      throw new Error('Patient ID is required');
    }
    
    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      console.error('❌ [PaymentService] Invalid amountPaid:', paymentData.amountPaid);
      throw new Error('Amount paid must be greater than zero');
    }
    
    if (!paymentData.paymentMethod) {
      console.error('❌ [PaymentService] Missing paymentMethod');
      throw new Error('Payment method is required');
    }

    // Map frontend data structure to backend expected format (billingRoutes expects paymentMethod & transactionId)
    const processedData = { 
      amount: Number(paymentData.amountPaid) || 0,
      // Include both keys to satisfy different backend handlers
      method: mapPaymentMethodToBackend(paymentData.paymentMethod),
      paymentMethod: mapPaymentMethodToBackend(paymentData.paymentMethod),
      transactionId: paymentData.referenceNumber || `PAY-${Date.now()}`,
      reference: paymentData.referenceNumber || `PAY-${Date.now()}`,
      notes: paymentData.notes || ''
    };

    // Additional validation for the processed data
    if (!processedData.amount || processedData.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!processedData.method) {
      throw new Error('Payment method is required');
    }

    console.log('🔄 [PaymentService] Mapped data for backend:', processedData);
    console.log('🔍 [PaymentService] Data types:', {
      amount: typeof processedData.amount,
      method: typeof processedData.method,
      amountValue: processedData.amount,
      methodValue: processedData.method
    });

    // Make the API request to the correct partial payment endpoint
    try {
      const partialPaymentEndpoint = `/api/billing/process-partial-payment`;
      console.log('🚀 [PaymentService] Making API request to:', partialPaymentEndpoint);
      
      // Map to backend expected format for partial payment endpoint
      const backendPaymentData = {
        invoiceId: paymentData.invoiceId,
        amountPaid: processedData.amount,
        paymentMethod: processedData.method,
        notes: processedData.notes || 'Payment via RecordPaymentForm'
      };
      
      console.log('📦 [PaymentService] Request body:', JSON.stringify(backendPaymentData, null, 2));
      
      const response = await api.post<any>(partialPaymentEndpoint, backendPaymentData);
      console.log('✅ [PaymentService] Payment recorded successfully:', response.data);
      
      // Map backend response to frontend expected format
      // Backend returns: { success: true, message: string, data: { invoice, payment, paymentSummary } }
      const backendData = response.data.data || {};
      const invoice = backendData.invoice || {};
      const payment = backendData.payment || {};
      const paymentSummary = backendData.paymentSummary || {};
      
      const mappedResponse: RecordPaymentResponse = {
        message: response.data.message || 'Payment recorded successfully',
        paymentTransaction: {
          _id: payment._id || `payment_${Date.now()}`,
          invoiceId: paymentData.invoiceId,
          patientId: paymentData.patientId,
          amountPaid: payment.amount || paymentData.amountPaid,
          paymentMethod: paymentData.paymentMethod,
          transactionDate: payment.date || new Date().toISOString(),
          status: 'Completed',
          currency: paymentData.currency || 'ETB',
          processedBy: payment.processedBy || { _id: 'reception-user', firstName: 'Reception', lastName: 'User' },
          createdAt: payment.date || new Date().toISOString(),
          updatedAt: payment.date || new Date().toISOString(),
          notes: payment.notes || paymentData.notes,
          referenceNumber: payment.reference
        },
        updatedInvoice: {
          _id: invoice._id || paymentData.invoiceId,
          invoiceNumber: invoice.invoiceNumber || paymentData.invoiceId,
          totalAmount: invoice.total || 0,
          amountPaid: invoice.amountPaid || paymentSummary.newTotalPaid || 0,
          balance: invoice.balance || paymentSummary.newBalance || 0,
          status: invoice.status || paymentSummary.newStatus || 'partial'
        }
      };
      
      return mappedResponse;
    } catch (apiError: any) {
      console.error('❌ [PaymentService] API Error:', apiError);
      
      if (apiError.response) {
        console.error('❌ [PaymentService] Error status:', apiError.response.status);
        console.error('❌ [PaymentService] Error data:', apiError.response.data);
        
        const errorMessage = apiError.response.data?.message || 'Payment processing failed';
        throw new Error(errorMessage);
      }
      
      throw new Error('Network error while processing payment');
    }
  } catch (error: any) {
    console.error('❌ [PaymentService] Error recording payment:', error);
    throw error;
  }
};

/**
 * Fetches all payment transactions for a specific invoice.
 * @param invoiceId - The ID of the invoice.
 * @returns A list of payment transactions.
 */
export const getPaymentsForInvoice = async (invoiceId: string): Promise<PaymentTransaction[]> => {
  try {
    const response = await api.get<PaymentTransaction[]>(`${PAYMENT_API_URL}/invoice/${invoiceId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching payments for invoice ${invoiceId}:`, error);
    throw error;
  }
};

/**
 * Fetches all payment transactions for a specific patient.
 * The invoiceId field in the returned transactions will be populated.
 * @param patientId - The ID of the patient.
 * @returns A list of payment transactions with populated invoice details.
 */
export const getPaymentsForPatient = async (patientId: string): Promise<PaymentTransaction[]> => {
  try {
    // Note: The backend populates invoiceId for this route.
    // The PaymentTransaction type's invoiceId field is `string | InvoiceRef` to accommodate this.
    const response = await api.get<PaymentTransaction[]>(`${PAYMENT_API_URL}/patient/${patientId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching payments for patient ${patientId}:`, error);
    throw error;
  }
};

// Potential future functions:
// export const getPaymentById = async (paymentId: string): Promise<PaymentTransaction> => { ... };
// export const updatePaymentStatus = async (paymentId: string, status: PaymentTransaction['status']): Promise<PaymentTransaction> => { ... };
// export const processRefund = async (originalPaymentId: string, refundAmount: number, notes?: string): Promise<PaymentTransaction> => { ... };

export const paymentService = {
  recordPayment,
  getPaymentsForInvoice,
  getPaymentsForPatient,
}; 