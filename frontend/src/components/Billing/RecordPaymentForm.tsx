import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { paymentService, NewPaymentData, PaymentTransaction, UpdatedInvoiceInfo } from '../../services/paymentService';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';

interface RecordPaymentFormProps {
  invoiceId: string;
  patientId: string;
  currentBalance: number;
  totalAmount: number;
  currency?: string;
  onSuccess: (updatedInvoice: UpdatedInvoiceInfo) => void; // Callback after successful payment
  onClose: () => void; // Callback to close the form/modal
}

const paymentMethods = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Card', label: 'Card' },
  { value: 'MobileMoney', label: 'Mobile Money' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'BankTransfer', label: 'Bank Transfer' },
  { value: 'BankTransfer', label: 'Bank Transfer - Dashen Bank' },
  { value: 'BankTransfer', label: 'Bank Transfer - Abyssinia Bank' },
  { value: 'BankTransfer', label: 'Bank Transfer - Commercial Bank of Ethiopia' },
  { value: 'Other', label: 'Other' }
];

const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({
  invoiceId,
  patientId,
  currentBalance,
  totalAmount,
  currency = 'ETB',
  onSuccess,
  onClose,
}) => {
  const [showReference, setShowReference] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debug log for props
  console.log('🔍 RecordPaymentForm Props:', { 
    invoiceId, 
    patientId, 
    currentBalance, 
    totalAmount,
    hasInvoiceId: !!invoiceId,
    hasPatientId: !!patientId,
    patientIdType: typeof patientId,
    patientIdValue: patientId
  });

  // Validate required props
  const missingProps = [];
  if (!invoiceId) missingProps.push('invoiceId');
  
  // Try to get patientId from multiple sources
  let effectivePatientId = patientId;
  if (!effectivePatientId || effectivePatientId === 'unknown' || effectivePatientId === 'Unknown') {
    // Try to extract from invoiceId if it contains patient info
    if (invoiceId && typeof invoiceId === 'string') {
      // Check if invoiceId contains patient info in the format
      const patientMatch = invoiceId.match(/patient[_-]?id[_-]?(\w+)/i);
      if (patientMatch) {
        effectivePatientId = patientMatch[1];
        console.log('🔍 Extracted patientId from invoiceId:', effectivePatientId);
      }
    }
    
    if (!effectivePatientId || effectivePatientId === 'unknown' || effectivePatientId === 'Unknown') {
      missingProps.push('patientId');
    }
  }
  
  // If any required props are missing, show error
  if (missingProps.length > 0) {
    console.error(`❌ Missing ${missingProps.join(', ')} in RecordPaymentForm`);
    console.error(`❌ InvoiceId: ${invoiceId}, PatientId: ${patientId}, EffectivePatientId: ${effectivePatientId}`);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
        <div className="bg-primary-foreground p-6 rounded-lg shadow-xl w-full max-w-md relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-muted-foreground">Error</h2>
            <button 
              type="button"
              onClick={onClose} 
              className="text-muted-foreground/50 hover:text-muted-foreground text-xl font-bold"
            >
              ×
            </button>
          </div>
          <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-4">
            <p className="text-destructive">
              Missing required payment details: {missingProps.join(', ')}. 
              {missingProps.includes('patientId') && ' The patient information could not be found for this invoice.'}
              Cannot process payment.
            </p>
            <p className="text-destructive text-sm mt-2">
              Invoice ID: {invoiceId}<br/>
              Patient ID: {patientId}<br/>
              Effective Patient ID: {effectivePatientId}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const {
    control, 
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm<NewPaymentData>({
    defaultValues: {
      invoiceId,
      patientId: effectivePatientId,
      amountPaid: Math.max(0, currentBalance), // Default to current balance but not less than 0
      paymentMethod: 'Cash',
      transactionDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      referenceNumber: '',
      notes: '',
      currency: currency,
    },
  });

  const selectedPaymentMethod = watch('paymentMethod');
  const amountPaid = watch('amountPaid');

  // Debug form state changes
  useEffect(() => {
    console.log('🔍 Form state changed:', {
      amountPaid,
      selectedPaymentMethod,
      amountPaidType: typeof amountPaid,
      paymentMethodType: typeof selectedPaymentMethod
    });
  }, [amountPaid, selectedPaymentMethod]);

  useEffect(() => {
    if (selectedPaymentMethod === 'Card' || selectedPaymentMethod === 'MobileMoney' || selectedPaymentMethod === 'BankTransfer') {
      setShowReference(true);
    } else {
      setShowReference(false);
    }
  }, [selectedPaymentMethod]);

  const onSubmit = async (data: NewPaymentData) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    console.log('📋 Payment form data being submitted:', data);
    console.log('🔍 Form data types:', {
      amountPaid: typeof data.amountPaid,
      amountPaidValue: data.amountPaid,
      paymentMethod: typeof data.paymentMethod,
      paymentMethodValue: data.paymentMethod
    });
    console.log('💰 Invoice ID:', invoiceId);
    console.log('👤 Patient ID:', patientId);
    console.log('💵 Current Balance:', currentBalance);
    console.log('🔍 Effective Patient ID:', effectivePatientId);
    
    // Make sure patientId is included in the data
    const paymentData = {
      ...data,
      patientId: effectivePatientId, // Use the effective patient ID
      invoiceId: invoiceId, // Ensure invoiceId is also set correctly
      timestamp: new Date().toISOString() // Add timestamp for proper processing
    };
    
    console.log('📦 Final payment data to be sent:', paymentData);
    console.log('🔍 Payment data types:', {
      amountPaid: typeof paymentData.amountPaid,
      amountPaidValue: paymentData.amountPaid,
      paymentMethod: typeof paymentData.paymentMethod,
      paymentMethodValue: paymentData.paymentMethod,
      patientId: typeof paymentData.patientId,
      patientIdValue: paymentData.patientId,
      invoiceId: typeof paymentData.invoiceId,
      invoiceIdValue: paymentData.invoiceId
    });
    
    // Validate required fields before sending
    if (!paymentData.invoiceId) {
      setErrorMessage('Invoice ID is required');
      setIsLoading(false);
      return;
    }
    
    if (!paymentData.patientId) {
      setErrorMessage('Patient ID is required');
      setIsLoading(false);
      return;
    }
    
    // Additional validation for form data
    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      setErrorMessage('Amount must be greater than 0');
      setIsLoading(false);
      return;
    }
    
    if (!paymentData.paymentMethod) {
      setErrorMessage('Payment method is required');
      setIsLoading(false);
      return;
    }
    
    try {
      // Map frontend payment method values to backend values
      const mapPaymentMethod = (method: string) => {
        if (method.startsWith('BankTransfer')) return 'bank_transfer';
        if (method === 'Card') return 'card';
        if (method === 'Cash') return 'cash';
        if (method === 'Insurance') return 'insurance';
        if (method === 'MobileMoney') return 'other';
        if (method === 'Other') return 'other';
        return 'other'; // fallback
      };

      // Get the display name for the payment method
      const getPaymentMethodDisplayName = (method: string) => {
        if (method === 'BankTransfer - Dashen Bank') return 'Bank Transfer - Dashen Bank';
        if (method === 'BankTransfer - Abyssinia Bank') return 'Bank Transfer - Abyssinia Bank';
        if (method === 'BankTransfer - Commercial Bank of Ethiopia') return 'Bank Transfer - Commercial Bank of Ethiopia';
        if (method === 'Card') return 'Credit/Debit Card';
        if (method === 'Cash') return 'Cash';
        if (method === 'Insurance') return 'Insurance';
        if (method === 'MobileMoney') return 'Mobile Money';
        if (method === 'Other') return 'Other';
        return method;
      };

      const backendPaymentData = {
        ...paymentData,
        paymentMethod: mapPaymentMethod(paymentData.paymentMethod),
        notes: paymentData.notes ? `${getPaymentMethodDisplayName(paymentData.paymentMethod)} - ${paymentData.notes}` : getPaymentMethodDisplayName(paymentData.paymentMethod)
      };
      
      console.log('🔄 Mapped payment data for backend:', backendPaymentData);
      
      const result = await paymentService.recordPayment(backendPaymentData as any);
      console.log('✅ Payment recorded successfully:', result);
      toast('Payment recorded successfully!', { icon: '✅' });
      onSuccess(result.updatedInvoice);
      reset(); 
      onClose(); 
    } catch (error: any) {
      console.error('❌ Payment submission error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      
      const errorMsg = error.response?.data?.message || error.message || 'Failed to record payment.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-primary-foreground p-6 rounded-lg shadow-xl w-full max-w-md relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Record Payment</h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground/50 hover:text-muted-foreground text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        {errorMessage && (
          <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-4 p-3 bg-primary/10 rounded-md">
          <p className="text-sm text-primary">
            <span className="font-semibold">Invoice:</span> {invoiceId}
          </p>
          <p className="text-sm text-primary">
            <span className="font-semibold">Balance:</span> {currency} {currentBalance.toFixed(2)}
          </p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="amountPaid" className="block text-sm font-medium text-muted-foreground mb-1">
              Amount Paid ({currency})
            </label>
            <Controller
              name="amountPaid"
              control={control}
              rules={{
                required: 'Amount is required',
                min: { value: 0.01, message: 'Amount must be greater than 0' },
                max: { value: currentBalance, message: `Amount cannot exceed current balance of ${currentBalance}` }
              }}
              render={({ field }) => (
                <input 
                  id="amountPaid" 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  max={currentBalance}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...field}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    field.onChange(value);
                    console.log('🔍 Amount field changed:', { value, type: typeof value });
                  }}
                />
              )}
            />
            {errors.amountPaid && <p className="text-destructive text-sm mt-1">{errors.amountPaid.message}</p>}
          </div>

          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-muted-foreground mb-1">
              Payment Method
            </label>
            <Controller
              name="paymentMethod"
              control={control}
              rules={{ required: 'Payment method is required' }}
              render={({ field }) => (
                <select 
                  id="paymentMethod"
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    console.log('🔍 Payment method changed:', e.target.value);
                  }}
                >
                  {paymentMethods.map(method => (
                    <option key={method.label} value={method.value}>{method.label}</option>
                  ))}
                </select>
              )}
            />
            {errors.paymentMethod && <p className="text-destructive text-sm mt-1">{errors.paymentMethod.message}</p>}
          </div>

          {showReference && (
            <div>
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-muted-foreground mb-1">
                Reference Number
              </label>
              <Controller
                name="referenceNumber"
                control={control}
                rules={{ required: showReference ? 'Reference number is required' : false }}
                render={({ field }) => (
                  <input 
                    id="referenceNumber" 
                    type="text"
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...field} 
                  />
                )}
              />
              {errors.referenceNumber && <p className="text-destructive text-sm mt-1">{errors.referenceNumber.message}</p>}
            </div>
          )}

          <div>
            <label htmlFor="transactionDate" className="block text-sm font-medium text-muted-foreground mb-1">
              Transaction Date
            </label>
            <Controller
              name="transactionDate"
              control={control}
              rules={{ required: 'Transaction date is required' }}
              render={({ field }) => (
                <input 
                  id="transactionDate" 
                  type="date"
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...field} 
                />
              )}
            />
            {errors.transactionDate && <p className="text-destructive text-sm mt-1">{errors.transactionDate.message}</p>}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1">
              Notes (Optional)
            </label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <textarea 
                  id="notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this payment..."
                  {...field} 
                />
              )}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted/30 text-muted-foreground rounded-md hover:bg-muted/40 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors disabled:bg-primary/50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentForm; 