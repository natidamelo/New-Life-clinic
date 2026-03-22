import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import billingService from '../../services/billingService';
import { 
  CreditCard, 
  DollarSign, 
  Package, 
  FileText,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Pill,
  TestTube,
  Camera,
  CreditCard as IdCard
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../context/AuthContext';

interface ConsolidatedInvoice {
  _id: string;
  invoiceNumber: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
  };
  items: Array<{
    _id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: 'card' | 'medication' | 'lab' | 'imaging';
    itemType: string;
    metadata?: any;
    addedAt: string;
  }>;
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  issueDate: string;
  dueDate: string;
  isConsolidated: boolean;
  balance: number; // Added balance to the interface
}

interface GroupedItems {
  card: ConsolidatedInvoice['items'];
  medication: ConsolidatedInvoice['items'];
  lab: ConsolidatedInvoice['items'];
  imaging: ConsolidatedInvoice['items'];
}

interface PaymentFormData {
  paymentMethod: string;
  amountPaid: number;
  notes: string;
  // Bank transfer details
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  branchName?: string;
  swiftCode?: string;
  transferType?: string;
}

const ConsolidatedBilling: React.FC = () => {
  const { getToken } = useAuth();
  const [invoices, setInvoices] = useState<ConsolidatedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<ConsolidatedInvoice | null>(null);
  const [groupedItems, setGroupedItems] = useState<GroupedItems | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    paymentMethod: 'cash',
    amountPaid: 0,
    notes: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchConsolidatedInvoices();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchConsolidatedInvoices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchConsolidatedInvoices = async () => {
    try {
      const response = await api.get('/api/billing/invoices?status=pending&isConsolidated=true');
      if (response.status === 200) {
        const invoiceData = response.data.data || response.data;
        setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
      }
    } catch (error) {
      console.error('Error fetching consolidated invoices:', error);
    }
  };

  const getServiceIcon = (category: string) => {
    switch (category) {
      case 'card': return <IdCard className="h-4 w-4 text-primary" />;
      case 'medication': return <Pill className="h-4 w-4 text-primary" />;
      case 'lab': return <TestTube className="h-4 w-4 text-secondary-foreground" />;
      case 'imaging': return <Camera className="h-4 w-4 text-accent-foreground" />;
      default: return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getServiceBadgeColor = (category: string) => {
    switch (category) {
      case 'card': return 'bg-primary/20 text-primary';
      case 'medication': return 'bg-primary/20 text-primary';
      case 'lab': return 'bg-secondary/20 text-secondary-foreground';
      case 'imaging': return 'bg-accent/20 text-accent-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const groupItemsByService = (items: ConsolidatedInvoice['items']): GroupedItems => {
    return items.reduce((acc, item) => {
      const category = item.category || 'other';
      if (!acc[category as keyof GroupedItems]) {
        acc[category as keyof GroupedItems] = [];
      }
      acc[category as keyof GroupedItems].push(item);
      return acc;
    }, {
      card: [],
      medication: [],
      lab: [],
      imaging: []
    } as GroupedItems);
  };

  const openDetailsModal = (invoice: ConsolidatedInvoice) => {
    setSelectedInvoice(invoice);
    setGroupedItems(groupItemsByService(invoice.items));
    setShowDetailsModal(true);
  };

  const openPaymentModal = (invoice: ConsolidatedInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      paymentMethod: 'cash',
      amountPaid: invoice.total,
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setIsProcessing(true);
    try {
      // Validate payment amount
      if (paymentForm.amountPaid <= 0) {
        toast.error('Payment amount must be greater than zero');
        return;
      }

      // Check if this is a partial payment
      const isPartialPayment = paymentForm.amountPaid < selectedInvoice.balance;
      
      let response;
      
      // Prepare payment data with bank transfer details
      const paymentData = {
        amount: paymentForm.amountPaid,
        method: paymentForm.paymentMethod,
        notes: paymentForm.notes,
        // Include bank transfer details if applicable
        ...(paymentForm.paymentMethod.includes('bank_transfer') && {
          bankName: paymentForm.bankName,
          accountNumber: paymentForm.accountNumber,
          accountHolderName: paymentForm.accountHolderName,
          branchName: paymentForm.branchName,
          swiftCode: paymentForm.swiftCode,
          transferType: paymentForm.transferType || 'domestic'
        })
      };

      if (isPartialPayment) {
        // Use partial payment endpoint
        response = await billingService.processPartialPayment(selectedInvoice._id, paymentData);
      } else {
        // Use consolidated payment endpoint for full payment
        const serviceTypes = [...new Set(selectedInvoice.items.map(item => item.category))];
        
        response = await api.post('/api/billing/process-consolidated-payment', {
          patientId: selectedInvoice.patient._id,
          invoiceId: selectedInvoice._id,
          ...paymentData,
          serviceTypes: serviceTypes
        });
      }

      if (response.status === 200 || response.success) {
        const message = isPartialPayment 
          ? `Partial payment of ${selectedInvoice.balance.toFixed(2)} processed successfully!`
          : 'Consolidated payment processed successfully!';
        
        toast.success(message);
        
        if (!isPartialPayment) {
          // Show success details for full payment
          const serviceNames = selectedInvoice.items.map(item => item.category).filter((v, i, a) => a.indexOf(v) === i);
          toast.success(`Services activated: ${serviceNames.join(', ')}`);
        }
        
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        setPaymentForm({
          paymentMethod: 'cash',
          amountPaid: 0,
          notes: ''
        });
        fetchConsolidatedInvoices();
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process payment';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-muted-foreground">Consolidated Patient Billing</h2>
        <Badge variant="outline" className="bg-primary/10 text-primary">
          {invoices.length} Pending Invoices
        </Badge>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-primary mb-4" />
            <p className="text-muted-foreground text-center">No pending consolidated invoices</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => {
            const grouped = groupItemsByService(invoice.items);
            const serviceTypes = Object.keys(grouped).filter(key => 
              grouped[key as keyof GroupedItems].length > 0
            );

            return (
              <Card key={invoice._id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">
                        Consolidated Invoice #{invoice.invoiceNumber}
                      </CardTitle>
                      <Badge className="bg-primary/20 text-primary">
                        {serviceTypes.length} Service{serviceTypes.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">Patient:</span>
                        <span>{invoice.patient.firstName} {invoice.patient.lastName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-lg font-bold text-primary">
                          ETB {invoice.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-secondary-foreground" />
                        <span className="font-medium">Services:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {serviceTypes.map((serviceType) => (
                          <Badge 
                            key={serviceType}
                            className={getServiceBadgeColor(serviceType)}
                          >
                            {getServiceIcon(serviceType)}
                            <span className="ml-1">
                              {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
                            </span>
                            <span className="ml-1">
                              ({grouped[serviceType as keyof GroupedItems].length})
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => openDetailsModal(invoice)}
                      className="flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>View Details</span>
                    </Button>
                    <Button 
                      onClick={() => openPaymentModal(invoice)}
                      className="bg-primary hover:bg-primary flex items-center space-x-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Process Payment</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice Details Modal */}
      {showDetailsModal && selectedInvoice && groupedItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Invoice Details</h3>
              <Button 
                variant="outline" 
                onClick={() => setShowDetailsModal(false)}
                className="text-muted-foreground"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="bg-muted/10 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}</p>
                    <p><strong>Patient:</strong> {selectedInvoice.patient.firstName} {selectedInvoice.patient.lastName}</p>
                    <p><strong>Patient ID:</strong> {selectedInvoice.patient.patientId}</p>
                  </div>
                  <div>
                    <p><strong>Issue Date:</strong> {new Date(selectedInvoice.issueDate).toLocaleDateString()}</p>
                    <p><strong>Due Date:</strong> {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                    <div><strong>Status:</strong> <Badge className="ml-1">{selectedInvoice.status}</Badge></div>
                  </div>
                </div>
              </div>

              {/* Services Breakdown */}
              {Object.entries(groupedItems).map(([serviceType, items]) => 
                items.length > 0 && (
                  <div key={serviceType} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      {getServiceIcon(serviceType)}
                      <h4 className="text-lg font-semibold capitalize">{serviceType} Services</h4>
                      <Badge className={getServiceBadgeColor(serviceType)}>
                        {items.length} item{items.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity} × ETB {item.unitPrice.toFixed(2)}
                            </p>
                            {item.addedAt && (
                              <p className="text-xs text-muted-foreground">
                                Added: {new Date(item.addedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">ETB {item.totalPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Total */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    ETB {selectedInvoice.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Process Consolidated Payment</h3>
            
            <div className="mb-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary">
                <strong>Patient:</strong> {selectedInvoice.patient.firstName} {selectedInvoice.patient.lastName}
              </p>
              <p className="text-sm text-primary">
                <strong>Invoice:</strong> {selectedInvoice.invoiceNumber}
              </p>
              <p className="text-sm text-primary">
                <strong>Total Amount:</strong> ETB {selectedInvoice.total.toFixed(2)}
              </p>
              <p className="text-sm text-primary">
                <strong>Services:</strong> {[...new Set(selectedInvoice.items.map(item => item.category))].join(', ')}
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select 
                  value={paymentForm.paymentMethod} 
                  onValueChange={(value) => {
                    // Auto-populate bank name based on selection
                    let bankName = '';
                    if (value === 'bank_transfer_dashen') {
                      bankName = 'Dashen Bank';
                    } else if (value === 'bank_transfer_abyssinia') {
                      bankName = 'Abyssinia Bank';
                    } else if (value === 'bank_transfer_cbe') {
                      bankName = 'Commercial Bank of Ethiopia';
                    }
                    
                    setPaymentForm({
                      ...paymentForm, 
                      paymentMethod: value,
                      bankName: bankName
                    });
                  }}
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
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({...paymentForm, amountPaid: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>

              {/* Bank Transfer Details */}
              {paymentForm.paymentMethod && paymentForm.paymentMethod.includes('bank_transfer') && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                  <h4 className="font-medium text-blue-900">Bank Transfer Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={paymentForm.bankName || ''}
                        onChange={(e) => setPaymentForm({...paymentForm, bankName: e.target.value})}
                        placeholder="e.g., Commercial Bank of Ethiopia"
                        required={paymentForm.paymentMethod.includes('bank_transfer')}
                        readOnly={paymentForm.paymentMethod === 'bank_transfer_dashen' || 
                                 paymentForm.paymentMethod === 'bank_transfer_abyssinia' || 
                                 paymentForm.paymentMethod === 'bank_transfer_cbe'}
                        className={paymentForm.paymentMethod === 'bank_transfer_dashen' || 
                                 paymentForm.paymentMethod === 'bank_transfer_abyssinia' || 
                                 paymentForm.paymentMethod === 'bank_transfer_cbe' ? 'bg-gray-100' : ''}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={paymentForm.accountNumber || ''}
                        onChange={(e) => setPaymentForm({...paymentForm, accountNumber: e.target.value})}
                        placeholder="Account number"
                        required={paymentForm.paymentMethod.includes('bank_transfer')}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="accountHolderName">Account Holder Name</Label>
                      <Input
                        id="accountHolderName"
                        value={paymentForm.accountHolderName || ''}
                        onChange={(e) => setPaymentForm({...paymentForm, accountHolderName: e.target.value})}
                        placeholder="Account holder name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="branchName">Branch Name</Label>
                      <Input
                        id="branchName"
                        value={paymentForm.branchName || ''}
                        onChange={(e) => setPaymentForm({...paymentForm, branchName: e.target.value})}
                        placeholder="Branch name"
                      />
                    </div>
                  </div>
                </div>
              )}

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

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-primary hover:bg-primary"
                >
                  {isProcessing ? 'Processing...' : 'Process Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsolidatedBilling; 