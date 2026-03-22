import React, { useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import billingService, {
  Invoice,
  Payment,
  PaymentMethod,
  InvoiceStatus
} from '../../services/billingService';
import { formatCurrency } from '../../utils/formatters';

const statusColors: Record<InvoiceStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  paid: 'success',
  partial: 'primary',
  overdue: 'error',
  cancelled: 'default',
  refunded: 'default'
};

const statusLabels: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
};

const paymentMethods: PaymentMethod[] = [
  'cash',
  'credit_card',
  'debit_card',
  'check',
  'bank_transfer',
  'mobile_payment',
  'insurance',
  'other'
];

interface InvoiceDetailProps {
  invoice: Invoice;
  onPayment: () => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
  onPayment,
  onCancel
}) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: invoice.balance,
    method: 'cash' as PaymentMethod,
    reference: '',
    notes: ''
  });
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePaymentSubmit = async () => {
    try {
      if (paymentData.amount <= 0) {
        setError('Payment amount must be greater than 0');
        return;
      }
      if (paymentData.amount > invoice.balance) {
        setError('Payment amount cannot exceed the remaining balance');
        return;
      }
      await onPayment();
      setPaymentDialogOpen(false);
      setError(null);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    }
  };

  const handleCancelSubmit = async () => {
    try {
      if (!cancelReason.trim()) {
        setError('Please provide a reason for cancellation');
        return;
      }
      await onCancel(cancelReason);
      setCancelDialogOpen(false);
      setError(null);
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      setError('Failed to cancel invoice. Please try again.');
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await billingService.downloadInvoice(invoice._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setError('Failed to download invoice. Please try again.');
    }
  };

  return (
    <Box>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">
          Invoice #{invoice.invoiceNumber}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            startIcon={<ReceiptIcon />}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <>
              <Button
                component={Link}
                to={`/billing/invoices/${invoice._id}/edit`}
                startIcon={<EditIcon />}
                variant="outlined"
              >
                Edit
              </Button>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                color="primary"
                onClick={() => setPaymentDialogOpen(true)}
                disabled={invoice.balance <= 0}
              >
                Add Payment
              </Button>
              <Button
                startIcon={<CancelIcon />}
                variant="outlined"
                color="error"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel Invoice
              </Button>
            </>
          )}
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
                <Typography>
                  {typeof invoice.patient === 'object' ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : invoice.patient}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {typeof invoice.patient === 'object' ? invoice.patient.patientId : 'N/A'}
                </Typography>
              </Grid>
              {invoice.provider && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Provider</Typography>
                  <Typography>
                    {invoice.provider.firstName} {invoice.provider.lastName}
                  </Typography>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Issue Date</Typography>
                <Typography>
                  {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
                <Typography>
                  {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={statusLabels[invoice.status]}
                  color={statusColors[invoice.status]}
                  sx={{ mt: 0.5 }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ mb: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="right">
                        {item.discount ? formatCurrency(item.discount) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {item.tax ? `${item.tax}%` : '-'}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} />
                    <TableCell>Subtotal</TableCell>
                    <TableCell align="right">{formatCurrency(invoice.subtotal)}</TableCell>
                  </TableRow>
                  {invoice.discountTotal > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} />
                      <TableCell>Discount</TableCell>
                      <TableCell align="right">-{formatCurrency(invoice.discountTotal)}</TableCell>
                    </TableRow>
                  )}
                  {invoice.taxTotal > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} />
                      <TableCell>Tax</TableCell>
                      <TableCell align="right">{formatCurrency(invoice.taxTotal)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={5} />
                    <TableCell>
                      <Typography variant="subtitle1">Total</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1">{formatCurrency(invoice.total)}</Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {invoice.insurance && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Insurance Information</Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Provider</Typography>
                  <Typography>{invoice.insurance.provider || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Policy Number</Typography>
                  <Typography>{invoice.insurance.policyNumber || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Claim Number</Typography>
                  <Typography>{invoice.insurance.claimNumber || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Coverage</Typography>
                  <Typography>
                    {invoice.insurance.coveragePercent ? `${invoice.insurance.coveragePercent}%` : '-'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Approval Code</Typography>
                  <Typography>{invoice.insurance.approvalCode || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Typography>
                    {invoice.insurance.status
                      ? invoice.insurance.status.charAt(0).toUpperCase() +
                        invoice.insurance.status.slice(1).replace('_', ' ')
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {invoice.notes && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Notes</Typography>
              <Typography>{invoice.notes}</Typography>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Summary</Typography>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
              <Typography variant="h6">{formatCurrency(invoice.total)}</Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">Amount Paid</Typography>
              <Typography variant="h6">{formatCurrency(invoice.amountPaid)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Balance Due</Typography>
              <Typography variant="h6" color={invoice.balance > 0 ? 'error' : 'success'}>
                {formatCurrency(invoice.balance)}
              </Typography>
            </Box>
          </Paper>

          {invoice.payments.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Payment History</Typography>
              {invoice.payments.map((payment, index) => (
                <Box key={index} mb={2}>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2">
                        {format(new Date(payment.date), 'MMM d, yyyy h:mm a')}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" color="text.secondary">Amount</Typography>
                      <Typography>{formatCurrency(payment.amount)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" color="text.secondary">Method</Typography>
                      <Typography>
                        {payment.method.charAt(0).toUpperCase() +
                          payment.method.slice(1).replace('_', ' ')}
                      </Typography>
                    </Grid>
                    {payment.reference && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="text.secondary">Reference</Typography>
                        <Typography>{payment.reference}</Typography>
                      </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">Processed By</Typography>
                      <Typography>
                        {payment.processedBy.firstName} {payment.processedBy.lastName}
                      </Typography>
                    </Grid>
                  </Grid>
                  {index < invoice.payments.length - 1 && (
                    <Box my={2}>
                      <hr />
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Payment</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    amount: parseFloat(e.target.value)
                  }))}
                  error={!!error && error.includes('amount')}
                  helperText={error && error.includes('amount') ? error : ''}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  fullWidth
                  label="Payment Method"
                  value={paymentData.method}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    method: e.target.value as PaymentMethod
                  }))}
                >
                  {paymentMethods.map(method => (
                    <MenuItem key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    reference: e.target.value
                  }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePaymentSubmit} variant="contained" color="primary">
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Invoice</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Cancellation"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              error={!!error}
              helperText={error}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Back</Button>
          <Button onClick={handleCancelSubmit} variant="contained" color="error">
            Cancel Invoice
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceDetail; 