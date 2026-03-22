import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  InputAdornment
} from '@mui/material';
import billingService, { AddPaymentData, Invoice } from '../../services/billingService';

interface AddPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  balanceDue: number;
  onPaymentAdded: (updatedInvoice: Invoice) => void;
}

const AddPaymentForm: React.FC<AddPaymentFormProps> = ({
  isOpen,
  onClose,
  invoiceId,
  balanceDue,
  onPaymentAdded
}) => {
  const [paymentData, setPaymentData] = useState<AddPaymentData>({
    amount: 0,
    method: 'cash',
    reference: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as { name: string; value: unknown };
    
    if (name === 'amount') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : 0;
      setPaymentData({
        ...paymentData,
        [name]: numValue
      });
    } else {
      setPaymentData({
        ...paymentData,
        [name]: value
      });
    }
  };

  const validateForm = (): boolean => {
    if (paymentData.amount <= 0) {
      setError('Payment amount must be greater than 0');
      return false;
    }
    
    if (paymentData.amount > balanceDue) {
      setError(`Payment amount cannot exceed the balance due (${balanceDue.toFixed(2)})`);
      return false;
    }
    
    if (!paymentData.method) {
      setError('Please select a payment method');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const updatedInvoice = await billingService.addPayment(invoiceId, paymentData);
      onPaymentAdded(updatedInvoice);
      handleClose();
    } catch (err) {
      console.error('Error adding payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form state
    setPaymentData({
      amount: 0,
      method: 'cash',
      reference: ''
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Payment</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Amount"
            name="amount"
            type="number"
            value={paymentData.amount}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            helperText={`Balance due: $${balanceDue.toFixed(2)}`}
          />
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="payment-method-label">Payment Method</InputLabel>
            <Select
              labelId="payment-method-label"
              name="method"
              value={paymentData.method}
              onChange={(e) => handleChange(e as any)}
              label="Payment Method"
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="card">Credit/Debit Card</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="insurance">Insurance</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Reference Number"
            name="reference"
            value={paymentData.reference || ''}
            onChange={handleChange}
            fullWidth
            margin="normal"
            helperText="Optional: Transaction ID, check number, etc."
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Add Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPaymentForm; 