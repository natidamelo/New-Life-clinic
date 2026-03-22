import { api } from './api';

export interface PaymentStatus {
  total: number;
  amountPaid: number;
  balance: number;
  paymentPercentage: number;
  status: 'paid' | 'partial' | 'unpaid' | 'pending';
  authorizedDoses: number;
  totalDoses: number;
  invoices: Array<{
    invoiceNumber: string;
    total: number;
    amountPaid: number;
    balance: number;
    isExtension: boolean;
    status: string;
  }>;
}

export interface MedicationPaymentRequest {
  patientId: string;
  medicationName: string;
}

class MedicationPaymentService {
  private baseUrl = '/api/medication-payment-status';

  /**
   * Get comprehensive payment status for a medication including all invoices
   */
  async getComprehensivePaymentStatus(request: MedicationPaymentRequest): Promise<PaymentStatus> {
    try {
      console.log('💰 [PAYMENT SERVICE] Getting comprehensive payment status:', request);
      
      // Get payment status from the medication-specific endpoint
      // Properly encode the medication name to handle special characters
      const encodedMedicationName = encodeURIComponent(request.medicationName);
      const response = await api.get(`${this.baseUrl}/medication/${request.patientId}/${encodedMedicationName}`);
      
      if (response.data && response.data.success) {
        const paymentData = response.data.data;
        
        // Calculate total payment from all invoices
        const totalInvoiced = paymentData.invoices?.reduce((sum: number, inv: any) => sum + inv.total, 0) || 0;
        const totalPaid = paymentData.invoices?.reduce((sum: number, inv: any) => sum + inv.amountPaid, 0) || 0;
        const totalBalance = totalInvoiced - totalPaid;
        const paymentPercentage = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
        
        // Determine payment status
        let status: 'paid' | 'partial' | 'unpaid' | 'pending' = 'pending';
        if (paymentPercentage === 100) {
          status = 'paid';
        } else if (paymentPercentage > 0) {
          status = 'partial';
        } else {
          status = 'unpaid';
        }
        
        // Calculate authorized doses based on payment percentage
        const totalDoses = paymentData.totalDoses || 8; // Default to 8 doses for 4-day BID
        const authorizedDoses = Math.floor((totalPaid / totalInvoiced) * totalDoses);
        
        const comprehensiveStatus: PaymentStatus = {
          total: totalInvoiced,
          amountPaid: totalPaid,
          balance: totalBalance,
          paymentPercentage,
          status,
          authorizedDoses,
          totalDoses,
          invoices: paymentData.invoices || []
        };
        
        console.log('✅ [PAYMENT SERVICE] Comprehensive payment status:', comprehensiveStatus);
        return comprehensiveStatus;
      }
      
      throw new Error('Failed to get payment status');
    } catch (error: any) {
      console.error('❌ [PAYMENT SERVICE] Error getting payment status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get payment status');
    }
  }

  /**
   * Get payment status for a specific medication
   */
  async getMedicationPaymentStatus(patientId: string, medicationName: string): Promise<PaymentStatus> {
    return this.getComprehensivePaymentStatus({ patientId, medicationName });
  }

  /**
   * Check if a specific dose is authorized based on payment
   */
  isDoseAuthorized(paymentStatus: PaymentStatus, doseIndex: number): boolean {
    return doseIndex < paymentStatus.authorizedDoses;
  }

  /**
   * Get payment summary for display
   */
  getPaymentSummary(paymentStatus: PaymentStatus) {
    const { total, amountPaid, balance, paymentPercentage, status } = paymentStatus;
    
    let label = 'Payment Pending';
    let color = 'text-muted-foreground';
    let bgColor = 'bg-muted/20';
    let details = `ETB ${total.toLocaleString()} due`;
    
    if (status === 'paid') {
      label = 'Fully Paid';
      color = 'text-primary';
      bgColor = 'bg-primary/20';
      details = `ETB ${amountPaid.toLocaleString()} paid`;
    } else if (status === 'partial') {
      label = `Partially Paid (${paymentPercentage}%)`;
      color = 'text-accent-foreground';
      bgColor = 'bg-accent/20';
      details = `ETB ${amountPaid.toLocaleString()}/${total.toLocaleString()} paid`;
    } else if (status === 'unpaid') {
      label = 'Payment Required';
      color = 'text-destructive';
      bgColor = 'bg-destructive/20';
      details = `ETB ${total.toLocaleString()} due`;
    }
    
    return {
      label,
      color,
      bgColor,
      details,
      paymentStatus
    };
  }
}

export default new MedicationPaymentService();
