import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  CreditCard,
  Calendar,
  User
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface DuePayment {
  _id: string;
  invoiceNumber: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
  };
  total: number;
  balance: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  issueDate: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

interface DuePaymentsSummary {
  totalInvoices: number;
  totalDue: number;
  overdueCount: number;
  partialCount: number;
}

const DuePaymentsManager: React.FC = () => {
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [summary, setSummary] = useState<DuePaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<DuePayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: 0,
    paymentMethod: 'cash',
    notes: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    patientId: ''
  });

  useEffect(() => {
    fetchDuePayments();
  }, [filters]);

  const fetchDuePayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.patientId) params.append('patientId', filters.patientId);

      const response = await api.get(`/api/billing/due-payments?${params.toString()}`);
      if (response.status === 200) {
        setDuePayments(response.data.data.invoices);
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching due payments:', error);
      toast.error('Failed to fetch due payments');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    if (paymentForm.amountPaid <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    if (paymentForm.amountPaid > selectedPayment.balance) {
      toast.error('Payment amount cannot exceed the remaining balance');
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await api.post('/api/billing/process-partial-payment', {
        invoiceId: selectedPayment._id,
        amountPaid: paymentForm.amountPaid,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes
      });

      if (response.status === 200) {
        toast.success('Payment processed successfully!');
        setShowPaymentModal(false);
        setSelectedPayment(null);
        setPaymentForm({
          amountPaid: 0,
          paymentMethod: 'cash',
          notes: ''
        });
        fetchDuePayments(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process payment';
      toast.error(errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overdue</Badge>;
      case 'partial':
      case 'partially_paid':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Partial</Badge>;
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Due</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(summary.totalDue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">{summary.overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-accent-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Partial</p>
                  <p className="text-2xl font-bold text-accent-foreground">{summary.partialCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold text-primary">{summary.totalInvoices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Due Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="patient-filter">Patient ID</Label>
              <Input
                id="patient-filter"
                placeholder="Filter by patient ID"
                value={filters.patientId}
                onChange={(e) => setFilters({...filters, patientId: e.target.value})}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={fetchDuePayments} variant="outline">
                Refresh
              </Button>
            </div>
          </div>

          {/* Due Payments List */}
          <div className="space-y-3">
            {duePayments.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No due payments found. All invoices are up to date!
                </AlertDescription>
              </Alert>
            ) : (
              duePayments.map((payment) => (
                <Card key={payment._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {payment.patient.firstName} {payment.patient.lastName}
                            </span>
                            <span className="text-sm text-muted-foreground">({payment.patient.patientId})</span>
                          </div>
                          {getStatusBadge(payment.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Invoice:</span>
                            <p className="font-medium">{payment.invoiceNumber}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium">{formatCurrency(payment.total)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Balance:</span>
                            <p className="font-medium text-destructive">{formatCurrency(payment.balance)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Due Date:</span>
                            <p className="font-medium">{formatDate(payment.dueDate)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setPaymentForm({
                              amountPaid: payment.balance,
                              paymentMethod: 'cash',
                              notes: ''
                            });
                            setShowPaymentModal(true);
                          }}
                        >
                          Process Payment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Process Payment</h3>
            
            <div className="mb-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary">
                <strong>Patient:</strong> {selectedPayment.patient.firstName} {selectedPayment.patient.lastName}
              </p>
              <p className="text-sm text-primary">
                <strong>Invoice:</strong> {selectedPayment.invoiceNumber}
              </p>
              <p className="text-sm text-primary">
                <strong>Total Amount:</strong> {formatCurrency(selectedPayment.total)}
              </p>
              <p className="text-sm text-primary">
                <strong>Remaining Balance:</strong> {formatCurrency(selectedPayment.balance)}
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amountPaid">Amount to Pay</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedPayment.balance}
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({...paymentForm, amountPaid: parseFloat(e.target.value) || 0})}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: {formatCurrency(selectedPayment.balance)}
                </p>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select 
                  value={paymentForm.paymentMethod} 
                  onValueChange={(value) => setPaymentForm({...paymentForm, paymentMethod: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bank_transfer_dashen">Bank Transfer - Dashen Bank</SelectItem>
                    <SelectItem value="bank_transfer_abyssinia">Bank Transfer - Abyssinia Bank</SelectItem>
                    <SelectItem value="bank_transfer_cbe">Bank Transfer - Commercial Bank of Ethiopia</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Processing...' : 'Process Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuePaymentsManager; 