import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, CreditCard, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface ExtensionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionId: string;
  patientName: string;
  medicationName: string;
  additionalDays: number;
  requiredAmount: number;
  onPaymentComplete: () => void;
}

const ExtensionPaymentModal: React.FC<ExtensionPaymentModalProps> = ({
  isOpen,
  onClose,
  prescriptionId,
  patientName,
  medicationName,
  additionalDays,
  requiredAmount,
  onPaymentComplete
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(requiredAmount.toString());
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (isOpen && prescriptionId) {
      loadPaymentDetails();
    }
  }, [isOpen, prescriptionId]);

  const loadPaymentDetails = async () => {
    try {
      const response = await api.get(`/api/prescriptions/extend/${prescriptionId}/payment-details`);
      if (response.data.success) {
        setPaymentDetails(response.data.data);
      }
    } catch (error) {
      console.error('Error loading payment details:', error);
    }
  };

  const handlePayment = async () => {
    if (!paymentMethod || !amountPaid) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount < requiredAmount) {
      toast.error(`Payment amount must be at least ETB ${requiredAmount.toFixed(2)}`);
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post(`/api/prescriptions/extend/${prescriptionId}/payment`, {
        paymentMethod,
        amountPaid: amount,
        notes
      });

      if (response.data.success) {
        toast.success('Payment processed successfully! Nurse tasks have been created.');
        onPaymentComplete();
        onClose();
      } else {
        toast.error(response.data.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.message || 'Payment processing failed';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'insurance', label: 'Insurance' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Extension Payment Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <h3 className="font-medium text-primary mb-2">Extension Summary</h3>
              <div className="text-sm text-primary space-y-1">
              <div><strong>Patient:</strong> {patientName}</div>
              <div><strong>Medication:</strong> {medicationName}</div>
              <div><strong>Additional Days:</strong> {additionalDays} days</div>
                {paymentDetails?.costCalculation && (
                  <div><strong>Additional Doses:</strong> {paymentDetails.costCalculation.additionalDoses}</div>
                )}
              <div className="text-lg font-semibold text-primary">
                <strong>Required Payment:</strong> ETB {requiredAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          {paymentDetails?.costCalculation && (
            <div className="bg-muted/10 border border-border/30 rounded-lg p-4">
              <h4 className="font-medium text-muted-foreground mb-2">Cost Breakdown</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Cost per dose: ETB {paymentDetails.costCalculation.costPerDose.toFixed(2)}</div>
                <div>Additional doses: {paymentDetails.costCalculation.additionalDoses}</div>
                <div>Total doses after payment: {paymentDetails.costCalculation.newTotalDoses}</div>
                <div>Frequency: {paymentDetails.costCalculation.frequency}</div>
                <div className="font-medium">
                  Total: ETB {paymentDetails.costCalculation.totalExtensionCost.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="bank_transfer_dashen">Bank Transfer - Dashen Bank</SelectItem>
                  <SelectItem value="bank_transfer_abyssinia">Bank Transfer - Abyssinia Bank</SelectItem>
                  <SelectItem value="bank_transfer_cbe">Bank Transfer - Commercial Bank of Ethiopia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amountPaid">Amount Paid (ETB) *</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min={requiredAmount}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={`Minimum: ${requiredAmount.toFixed(2)}`}
              />
              {parseFloat(amountPaid) < requiredAmount && (
                <p className="text-sm text-destructive mt-1">
                  Amount must be at least ETB {requiredAmount.toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Important Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Payment must be completed before the extended doses appear in nurse tasks. 
              After payment, nurses will be notified and can administer the additional doses.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="flex-1 bg-primary hover:bg-primary"
              disabled={processing || parseFloat(amountPaid) < requiredAmount}
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtensionPaymentModal;
