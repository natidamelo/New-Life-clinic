import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, CircularProgress, Container, Divider, 
  Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, Chip, Alert, Dialog, DialogActions, DialogContent, 
  DialogContentText, DialogTitle, TextField
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Download as DownloadIcon, 
  Payment as PaymentIcon, 
  ArrowBack as ArrowBackIcon 
} from '@mui/icons-material';
import { format } from 'date-fns';
import billingService, { Invoice, Payment } from '../../services/billingService';
import patientService, { Patient } from '../../services/patientService';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchInvoiceAndPatient = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const invoiceData = await billingService.getInvoiceById(id);
        setInvoice(invoiceData);
        
        // Fetch patient details
        const patientData = await patientService.getPatientById(invoiceData.patientId);
        setPatient(patientData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to load invoice details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceAndPatient();
  }, [id]);

  // Listen for payment events from other components
  useEffect(() => {
    const handlePaymentEvent = (event: CustomEvent) => {
      const { invoiceId, invoice: updatedInvoice, paymentType } = event.detail;
      if (invoiceId === id) {
        console.log(`Payment processed for current invoice (${paymentType}), refreshing...`);
        // Refresh the invoice data
        const fetchInvoiceAndPatient = async () => {
          if (!id) return;
          
          setLoading(true);
          try {
            const invoiceData = await billingService.getInvoiceById(id);
            setInvoice(invoiceData);
            
            // Fetch patient details
            const patientData = await patientService.getPatientById(invoiceData.patientId);
            setPatient(patientData);
            
            setError(null);
          } catch (err) {
            console.error('Error fetching invoice:', err);
            setError('Failed to load invoice details. Please try again later.');
          } finally {
            setLoading(false);
          }
        };
        
        fetchInvoiceAndPatient();
      }
    };

    window.addEventListener('invoicePaymentProcessed', handlePaymentEvent as EventListener);
    
    return () => {
      window.removeEventListener('invoicePaymentProcessed', handlePaymentEvent as EventListener);
    };
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'partial': return 'info';
      case 'overdue': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMMM dd, yyyy');
  };

  const handleDownloadInvoice = async () => {
    if (!id) return;
    
    try {
      const blob = await billingService.downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice?.invoiceNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setError('Failed to download invoice. Please try again later.');
    }
  };

  const handleOpenPaymentDialog = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNote('');
    setPaymentError(null);
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
  };

  const handleAddPayment = async () => {
    if (!id || !invoice) return;
    
    // Validate payment amount
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Please enter a valid payment amount');
      return;
    }
    
    if (amount > invoice.balance) {
      setPaymentError(`Payment amount cannot exceed the balance due (${formatCurrency(invoice.balance)})`);
      return;
    }
    
    setPaymentLoading(true);
    try {
      // Check if this is a service invoice (contains service items)
      const hasServiceItems = invoice.items?.some(item => 
        item.itemType === 'service' || 
        item.itemType === 'imaging' || 
        ['imaging', 'service', 'ultrasound', 'xray'].includes((item as any).category)
      );
      
      if (hasServiceItems) {
        // Use service payment endpoint for service invoices
        console.log('🏥 Processing service payment for invoice:', id);
        
        // Map frontend payment method values to backend values
        const mapPaymentMethod = (method: string) => {
          if (method.startsWith('bank_transfer')) return 'bank_transfer';
          if (method === 'card') return 'card';
          if (method === 'cash') return 'cash';
          if (method === 'insurance') return 'insurance';
          if (method === 'other') return 'other';
          return 'other'; // fallback
        };

        // Get the display name for the payment method
        const getPaymentMethodDisplayName = (method: string) => {
          if (method === 'bank_transfer_dashen') return 'Bank Transfer - Dashen Bank';
          if (method === 'bank_transfer_abyssinia') return 'Bank Transfer - Abyssinia Bank';
          if (method === 'bank_transfer_cbe') return 'Bank Transfer - Commercial Bank of Ethiopia';
          if (method === 'card') return 'Credit/Debit Card';
          if (method === 'cash') return 'Cash';
          if (method === 'insurance') return 'Insurance';
          if (method === 'other') return 'Other';
          return method;
        };
        
        await billingService.processServicePayment(id, {
          paymentMethod: mapPaymentMethod(paymentMethod),
          amountPaid: amount,
          notes: paymentNote ? `${getPaymentMethodDisplayName(paymentMethod)} - ${paymentNote}` : getPaymentMethodDisplayName(paymentMethod),
          sendToNurse: true // Default to true for services
        });
        
        console.log('✅ Service payment processed successfully');
      } else {
        // Use regular payment endpoint for non-service invoices
        console.log('💰 Processing regular payment for invoice:', id);
        
        // Map frontend payment method values to backend values
        const mapPaymentMethod = (method: string) => {
          if (method.startsWith('bank_transfer')) return 'bank_transfer';
          if (method === 'card') return 'card';
          if (method === 'cash') return 'cash';
          if (method === 'insurance') return 'insurance';
          if (method === 'other') return 'other';
          return 'other'; // fallback
        };

        // Get the display name for the payment method
        const getPaymentMethodDisplayName = (method: string) => {
          if (method === 'bank_transfer_dashen') return 'Bank Transfer - Dashen Bank';
          if (method === 'bank_transfer_abyssinia') return 'Bank Transfer - Abyssinia Bank';
          if (method === 'bank_transfer_cbe') return 'Bank Transfer - Commercial Bank of Ethiopia';
          if (method === 'card') return 'Credit/Debit Card';
          if (method === 'cash') return 'Cash';
          if (method === 'insurance') return 'Insurance';
          if (method === 'other') return 'Other';
          return method;
        };
        
        const payment: Partial<Payment> = {
          amount,
          method: mapPaymentMethod(paymentMethod) as any,
          date: new Date().toISOString(),
          notes: paymentNote ? `${getPaymentMethodDisplayName(paymentMethod)} - ${paymentNote}` : getPaymentMethodDisplayName(paymentMethod),
        };
        
        await billingService.addPayment(id, payment as any);
      }
      
      // Refresh invoice data
      const updatedInvoice = await billingService.getInvoiceById(id);
      setInvoice(updatedInvoice);
      
      setPaymentDialogOpen(false);
    } catch (err) {
      console.error('Error adding payment:', err);
      setPaymentError('Failed to process payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !invoice) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">{error || 'Invoice not found'}</Alert>
          <Box mt={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/billing/invoices")}
            >
              Back to Invoices
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  const isFullyPaid = invoice.status === 'paid';

  return (
    <Container maxWidth="lg">
      <Box sx={{ pt: 3, pb: 8 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/billing/invoices")}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h4">
              Invoice #{invoice.invoiceNumber}
            </Typography>
            <Chip 
              label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} 
              color={getStatusColor(invoice.status) as any}
              sx={{ ml: 2 }}
            />
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadInvoice}
              sx={{ mr: 1 }}
            >
              Download
            </Button>
            {!isFullyPaid && (
              <Button
                variant="outlined"
                startIcon={<PaymentIcon />}
                onClick={handleOpenPaymentDialog}
                sx={{ mr: 1 }}
              >
                Add Payment
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/billing/invoices/${id}/edit`)}
            >
              Edit
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Invoice Details</Typography>
                <Grid container spacing={2}>
                  <Grid size={4}>
                    <Typography variant="subtitle2" color="textSecondary">Invoice Number</Typography>
                    <Typography variant="body1">{invoice.invoiceNumber}</Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography variant="subtitle2" color="textSecondary">Issue Date</Typography>
                    <Typography variant="body1">{formatDate(invoice.issueDate)}</Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography variant="subtitle2" color="textSecondary">Due Date</Typography>
                    <Typography variant="body1">{formatDate(invoice.dueDate)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Payment Summary</Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="textSecondary">Total Amount</Typography>
                    <Typography variant="body1">{formatCurrency(invoice.total)}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="textSecondary">Amount Paid</Typography>
                    <Typography variant="body1">{formatCurrency(invoice.total - invoice.balance)}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="textSecondary">Balance Due</Typography>
                    <Typography variant="body1">{formatCurrency(invoice.balance)}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                    <Chip 
                      label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} 
                      color={getStatusColor(invoice.status) as any}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Patient Information</Typography>
                <Typography variant="body1">
                  {patient?.firstName} {patient?.lastName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {patient?.email}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {patient?.phone}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Invoice Items</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Payment History</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Note</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.payments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadInvoice}
              >
                Download PDF
              </Button>
              {!isFullyPaid && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PaymentIcon />}
                  onClick={handleOpenPaymentDialog}
                >
                  Add Payment
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Payment</DialogTitle>
        <DialogContent>
          {paymentError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {paymentError}
            </Alert>
          )}
          <DialogContentText sx={{ mb: 2 }}>
            Current balance due: {formatCurrency(invoice.balance)}
          </DialogContentText>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                label="Payment Amount"
                type="number"
                fullWidth
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                InputProps={{
                  startAdornment: <Box sx={{ mr: 1 }}>ETB</Box>,
                }}
                inputProps={{
                  step: "0.01",
                  min: "0.01",
                  max: invoice.balance,
                }}
                required
                autoFocus
                margin="dense"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                select
                label="Payment Method"
                fullWidth
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                SelectProps={{
                  native: true,
                }}
                margin="dense"
              >
                <option value="cash">Cash</option>
                <option value="card">Credit/Debit Card</option>
                <option value="insurance">Insurance</option>
                <option value="bank">Bank Transfer</option>
                <option value="bank_transfer_dashen">Bank Transfer - Dashen Bank</option>
                <option value="bank_transfer_abyssinia">Bank Transfer - Abyssinia Bank</option>
                <option value="bank_transfer_cbe">Bank Transfer - Commercial Bank of Ethiopia</option>
                <option value="other">Other</option>
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Note (Optional)"
                fullWidth
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                margin="dense"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog} disabled={paymentLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddPayment} 
            variant="contained" 
            color="primary"
            disabled={paymentLoading}
          >
            {paymentLoading ? <CircularProgress size={24} /> : 'Add Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceDetails; 