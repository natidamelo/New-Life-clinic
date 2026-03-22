import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { ArrowLeft, FileText, Printer, CreditCard, BarChart3, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import billingService, { InvoiceStatus } from '../../services/billingService';
import RecordPaymentForm from '../../components/Billing/RecordPaymentForm';
import InvoiceAnalytics from '../../components/Billing/InvoiceAnalytics';
import { UpdatedInvoiceInfo as PaymentUpdatedInvoiceInfo } from '../../services/paymentService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import inventoryService from '../../services/inventoryService';

const getStatusColor = (status: InvoiceStatus | string | undefined) => {
  switch (status) {
    case 'paid':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'pending':
      return 'bg-accent/20 text-accent-foreground border-amber-200';
    case 'partial':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'overdue':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'cancelled':
      return 'bg-muted/20 text-muted-foreground border-border/30';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  } catch (err) {
    return dateString;
  }
};

const formatCurrency = (amount: number | undefined, currencyCode = 'ETB') => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
};

const formatPaymentMethod = (method: string | undefined) => {
  if (!method) return 'N/A';
  const normalized = method.toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  const methodMap: Record<string, string> = {
    cash: 'Cash',
    card: 'Card Payment',
    bank_transfer: 'Bank Transfer',
    bank: 'Bank Transfer',
    banktransfer: 'Bank Transfer',
    insurance: 'Insurance',
    other: 'Other',
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    mobile_payment: 'Mobile Payment',
    momo: 'Mobile Payment',
    check: 'Check',
  };
  return methodMap[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1).replace('_', ' ');
};

const getDisplayPaymentMethod = (invoiceData: any): string | undefined => {
  if (!invoiceData) return undefined;
  if (invoiceData.paymentMethod) return formatPaymentMethod(invoiceData.paymentMethod);
  const combined = [
    ...(Array.isArray(invoiceData.payments) ? invoiceData.payments : []),
    ...(Array.isArray((invoiceData as any).paymentHistory) ? (invoiceData as any).paymentHistory : []),
  ];
  if (combined.length > 0) {
    const uniqueMethods = Array.from(
      new Set(
        combined
          .map((p: any) => (p?.method || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_'))
          .filter((m: string) => m)
      )
    );
    if (uniqueMethods.length === 0) return undefined;
    if (uniqueMethods.length === 1) return formatPaymentMethod(uniqueMethods[0]);
    return uniqueMethods.map((m) => formatPaymentMethod(m)).join(' + ');
  }
  return undefined;
};

const getItemPaymentStatus = (item: any, invoice: any) => {
  const itemTotal = item.total || item.unitPrice * item.quantity;
  const totalInvoiceAmount = invoice.total || 0;
  const amountPaid = invoice.amountPaid || 0;

  if (invoice.status === 'paid' || amountPaid >= totalInvoiceAmount) {
    return { isFullyPaid: true, isPartiallyPaid: false };
  }
  if (amountPaid <= 0) {
    return { isFullyPaid: false, isPartiallyPaid: false };
  }
  if (invoice.isConsolidated && invoice.payments && invoice.payments.length > 0) {
    const itemDescription = item.description?.toLowerCase() || '';
    const itemServiceName = item.serviceName?.toLowerCase() || '';
    let itemSpecificPayment = 0;
    invoice.payments.forEach((payment: any) => {
      const paymentNotes = payment.notes?.toLowerCase() || '';
      const paymentReference = payment.reference?.toLowerCase() || '';
      if (
        paymentNotes.includes(itemDescription) ||
        paymentNotes.includes(itemServiceName) ||
        paymentReference.includes(itemDescription) ||
        paymentReference.includes(itemServiceName)
      ) {
        itemSpecificPayment += payment.amount || 0;
      }
    });
    if (itemSpecificPayment > 0) {
      if (itemSpecificPayment >= itemTotal) return { isFullyPaid: true, isPartiallyPaid: false };
      return { isFullyPaid: false, isPartiallyPaid: true };
    }
  }
  const itemProportion = itemTotal / totalInvoiceAmount;
  const itemPaidAmount = amountPaid * itemProportion;
  if (itemPaidAmount >= itemTotal) return { isFullyPaid: true, isPartiallyPaid: false };
  if (itemPaidAmount > 0) return { isFullyPaid: false, isPartiallyPaid: true };
  return { isFullyPaid: false, isPartiallyPaid: false };
};

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'analytics'>('details');
  const [isEditingInvoice, setIsEditingInvoice] = useState<boolean>(false);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [isSavingInvoice, setIsSavingInvoice] = useState<boolean>(false);
  const [isEditingPaymentInfo, setIsEditingPaymentInfo] = useState<boolean>(false);
  const [editedPaymentTIN, setEditedPaymentTIN] = useState<string>('');
  const [editedPaymentCustomerName, setEditedPaymentCustomerName] = useState<string>('');
  const [editedPaymentMethod, setEditedPaymentMethod] = useState<string>('');
  const [isSavingPaymentInfo, setIsSavingPaymentInfo] = useState<boolean>(false);
  const [isEditingInvoiceNumber, setIsEditingInvoiceNumber] = useState<boolean>(false);
  const [editedInvoiceNumber, setEditedInvoiceNumber] = useState<string>('');
  const [isSavingInvoiceNumber, setIsSavingInvoiceNumber] = useState<boolean>(false);
  const [medications, setMedications] = useState<Array<{ name: string; _id: string }>>([]);
  const [labTests, setLabTests] = useState<Array<{ name: string; _id: string }>>([]);
  const [autocompleteState, setAutocompleteState] = useState<{
    index: number;
    suggestions: Array<{ name: string; _id: string; type?: string }>;
    inputRect: DOMRect | null;
  } | null>(null);
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) throw new Error('Invoice ID is required');
      return billingService.getInvoiceById(id);
    },
    enabled: !!id,
  });

  // cross-component payment event
  useEffect(() => {
    const handlePaymentEvent = (event: any) => {
      const { invoiceId, paymentType } = event.detail || {};
      if (invoiceId === id) {
        toast.success('Payment processed! Invoice updated.');
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      }
    };
    window.addEventListener('invoicePaymentProcessed', handlePaymentEvent as EventListener);
    return () => window.removeEventListener('invoicePaymentProcessed', handlePaymentEvent as EventListener);
  }, [id, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, newStatus }: { invoiceId: string; newStatus: InvoiceStatus }) => {
      return billingService.updateInvoice(invoiceId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Invoice status updated.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update status.');
    },
  });

  useEffect(() => {
    if (error) toast.error((error as any).message || 'Failed to load invoice details.');
  }, [error]);


  // Fetch medications and lab tests for autocomplete
  useEffect(() => {
    const fetchAutocompleteData = async () => {
      try {
        // Fetch all inventory items
        const allItems = await inventoryService.getAllInventoryItems({});
        
        // Filter medications
        const medicationItems = allItems
          .filter((item: any) => item.category === 'medication' && item.isActive !== false)
          .map((item: any) => ({ name: item.name, _id: item._id }));
        setMedications(medicationItems);
        console.log('📋 Loaded medications for autocomplete:', medicationItems.length);

        // Filter lab tests (check both 'laboratory' and 'lab' categories)
        const labItems = allItems
          .filter((item: any) => 
            (item.category === 'laboratory' || item.category === 'lab') && 
            item.isActive !== false
          )
          .map((item: any) => ({ name: item.name, _id: item._id }));
        setLabTests(labItems);
        console.log('🔬 Loaded lab tests for autocomplete:', labItems.length);
        console.log('🔬 Lab test names:', labItems.map((l: any) => l.name).slice(0, 10));
      } catch (error) {
        console.error('Error fetching autocomplete data:', error);
      }
    };
    fetchAutocompleteData();
  }, []);

  // Update dropdown position on scroll/resize
  useEffect(() => {
    if (!autocompleteState) return;
    
    const updatePosition = () => {
      const input = inputRefs.current[autocompleteState.index];
      if (input) {
        const inputRect = input.getBoundingClientRect();
        setAutocompleteState(prev => prev ? { ...prev, inputRect } : null);
      }
    };
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [autocompleteState?.index]);

  // Initialize edited items when invoice loads
  useEffect(() => {
    if (invoice?.items) {
      setEditedItems(invoice.items.map((item: any) => ({ ...item })));
    }
    // Initialize payment info fields
    if (invoice) {
      setEditedPaymentTIN(invoice.paymentTIN || '');
      setEditedPaymentCustomerName(invoice.paymentCustomerName || '');
      setEditedPaymentMethod(invoice.paymentMethod || getDisplayPaymentMethod(invoice) || '');
      setEditedInvoiceNumber(invoice.invoiceNumber || '');
    }
  }, [invoice]);

  // Check if payment method is insurance
  const isInsurancePayment = () => {
    if (!invoice) return false;
    const paymentMethod = getDisplayPaymentMethod(invoice);
    if (!paymentMethod) return false;
    return paymentMethod.toLowerCase().includes('insurance') || 
           invoice.paymentMethod === 'insurance' ||
           (invoice.payments && invoice.payments.some((p: any) => p.method === 'insurance'));
  };

  const handleStartEdit = () => {
    if (invoice?.items) {
      setEditedItems(invoice.items.map((item: any) => ({ ...item })));
    }
    setIsEditingInvoice(true);
  };

  const handleCancelEdit = () => {
    if (invoice?.items) {
      setEditedItems(invoice.items.map((item: any) => ({ ...item })));
    }
    setIsEditingInvoice(false);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...editedItems];
    updated[index] = { ...updated[index], [field]: value };
    // Recalculate total if quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updated[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : updated[index].unitPrice;
      const discount = updated[index].discount || 0;
      const tax = updated[index].tax || 0;
      const grossAmount = quantity * unitPrice;
      const discountAmount = discount;
      const taxAmount = (grossAmount - discountAmount) * (tax / 100);
      updated[index].total = grossAmount - discountAmount + taxAmount;
    }
    // Update autocomplete suggestions when description changes
    if (field === 'description') {
      const item = updated[index];
      const itemType = item.itemType || item.category;
      const searchTerm = value.toLowerCase().trim();
      
      const input = inputRefs.current[index];
      const inputRect = input?.getBoundingClientRect() || null;
      
      // Check if this is a medication item
      const isMedication = itemType === 'medication' || item.category === 'medication';
      const isLab = itemType === 'lab' || itemType === 'laboratory' || item.category === 'lab' || item.category === 'laboratory';
      
      if (searchTerm && searchTerm.length > 0) {
        let suggestions: Array<{ name: string; _id: string; type: string }> = [];
        
        if (isMedication) {
          suggestions = medications
            .filter(med => med.name.toLowerCase().includes(searchTerm))
            .map(med => ({ ...med, type: 'medication' }))
            .slice(0, 10);
        } else if (isLab) {
          suggestions = labTests
            .filter(lab => lab.name.toLowerCase().includes(searchTerm))
            .map(lab => ({ ...lab, type: 'lab' }))
            .slice(0, 10);
        } else {
          const medSuggestions = medications
            .filter(med => med.name.toLowerCase().includes(searchTerm))
            .map(med => ({ ...med, type: 'medication' }))
            .slice(0, 5);
          const labSuggestions = labTests
            .filter(lab => lab.name.toLowerCase().includes(searchTerm))
            .map(lab => ({ ...lab, type: 'lab' }))
            .slice(0, 5);
          suggestions = [...medSuggestions, ...labSuggestions].slice(0, 10);
        }
        
        setAutocompleteState({
          index,
          suggestions,
          inputRect
        });
      } else {
        setAutocompleteState(null);
      }
    }
    setEditedItems(updated);
  };

  const handleSelectSuggestion = (suggestion: { name: string; _id: string; type?: string }) => {
    if (!autocompleteState) return;
    
    const index = autocompleteState.index;
    const updated = [...editedItems];
    const item = updated[index];
    const itemType = item.itemType || item.category;
    const suggestionType = suggestion.type || itemType;
    
    // Determine if this is a medication or lab based on suggestion type or item type
    const isMedication = suggestionType === 'medication' || itemType === 'medication' || item.category === 'medication';
    const isLab = suggestionType === 'lab' || itemType === 'lab' || itemType === 'laboratory' || item.category === 'lab' || item.category === 'laboratory';
    
    // Update the item with the selected suggestion
    const updatedItem: any = { 
      ...updated[index], 
      description: suggestion.name
    };
    
    // Set the appropriate ID and update itemType/category if needed
    if (isMedication) {
      updatedItem.inventoryItemId = suggestion._id;
      if (!item.itemType && !item.category) {
        updatedItem.itemType = 'medication';
        updatedItem.category = 'medication';
      }
    } else if (isLab) {
      updatedItem.labTestId = suggestion._id;
      if (!item.itemType && !item.category) {
        updatedItem.itemType = 'lab';
        updatedItem.category = 'lab';
      }
    }
    
    updated[index] = updatedItem;
    setEditedItems(updated);
    setAutocompleteState(null);
  };

  const handleAddItem = () => {
    const newItem = {
      itemType: 'service',
      category: 'other',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      total: 0,
    };
    setEditedItems([...editedItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (editedItems.length > 1) {
      const updated = editedItems.filter((_, i) => i !== index);
      setEditedItems(updated);
    } else {
      toast.error('Invoice must have at least one item');
    }
  };

  const handleSaveInvoice = async () => {
    if (!id || !invoice) return;
    setIsSavingInvoice(true);
    try {
      // Prepare items for update - ensure all required fields are present
      const itemsToUpdate = editedItems.map((item) => {
        // Calculate total properly
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const discount = item.discount || 0;
        const tax = item.tax || 0;
        const grossAmount = quantity * unitPrice;
        const discountAmount = discount;
        const taxAmount = (grossAmount - discountAmount) * (tax / 100);
        const calculatedTotal = grossAmount - discountAmount + taxAmount;
        
        // Return item with all required fields
        return {
          itemType: item.itemType || 'service',
          category: item.category || 'other',
          description: item.description || '',
          quantity: quantity,
          unitPrice: unitPrice,
          discount: discountAmount,
          tax: tax,
          total: Math.max(0, calculatedTotal), // Ensure total is not negative
          // Preserve optional fields
          ...(item.serviceId && { serviceId: item.serviceId }),
          ...(item.inventoryItemId && { inventoryItemId: item.inventoryItemId }),
          ...(item.labTestId && { labTestId: item.labTestId }),
          ...(item.imagingId && { imagingId: item.imagingId }),
          ...(item.procedureId && { procedureId: item.procedureId }),
          ...(item.notes && { notes: item.notes }),
          ...(item.metadata && { metadata: item.metadata }),
        };
      });
      
      console.log('Saving invoice items:', itemsToUpdate);
      await billingService.updateInvoice(id, { items: itemsToUpdate });
      toast.success('Invoice updated successfully');
      setIsEditingInvoice(false);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to update invoice';
      toast.error(errorMessage);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleStartEditPaymentInfo = () => {
    setEditedPaymentTIN(invoice?.paymentTIN || '');
    setEditedPaymentCustomerName(invoice?.paymentCustomerName || '');
    setEditedPaymentMethod(invoice?.paymentMethod || getDisplayPaymentMethod(invoice) || '');
    setIsEditingPaymentInfo(true);
  };

  const handleCancelEditPaymentInfo = () => {
    setEditedPaymentTIN(invoice?.paymentTIN || '');
    setEditedPaymentCustomerName(invoice?.paymentCustomerName || '');
    setEditedPaymentMethod(invoice?.paymentMethod || getDisplayPaymentMethod(invoice) || '');
    setIsEditingPaymentInfo(false);
  };

  const handleSavePaymentInfo = async () => {
    if (!id || !invoice) return;
    setIsSavingPaymentInfo(true);
    try {
      // Normalize payment method to lowercase with underscore
      const normalizedPaymentMethod = editedPaymentMethod.toLowerCase().trim().replace(/[\s-]+/g, '_');
      await billingService.updateInvoice(id, {
        paymentTIN: editedPaymentTIN,
        paymentCustomerName: editedPaymentCustomerName,
        paymentMethod: normalizedPaymentMethod,
      });
      toast.success('Payment information updated successfully');
      setIsEditingPaymentInfo(false);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    } catch (err: any) {
      console.error('Error saving payment info:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to update payment information';
      toast.error(errorMessage);
    } finally {
      setIsSavingPaymentInfo(false);
    }
  };

  const handleStartEditInvoiceNumber = () => {
    setEditedInvoiceNumber(invoice?.invoiceNumber || '');
    setIsEditingInvoiceNumber(true);
  };

  const handleCancelEditInvoiceNumber = () => {
    setEditedInvoiceNumber(invoice?.invoiceNumber || '');
    setIsEditingInvoiceNumber(false);
  };

  const handleSaveInvoiceNumber = async () => {
    if (!id || !invoice) return;
    if (!editedInvoiceNumber.trim()) {
      toast.error('Invoice number cannot be empty');
      return;
    }
    setIsSavingInvoiceNumber(true);
    try {
      await billingService.updateInvoice(id, {
        invoiceNumber: editedInvoiceNumber.trim(),
      });
      toast.success('Invoice number updated successfully');
      setIsEditingInvoiceNumber(false);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    } catch (err: any) {
      console.error('Error saving invoice number:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to update invoice number';
      toast.error(errorMessage);
    } finally {
      setIsSavingInvoiceNumber(false);
    }
  };

  const handlePaymentSuccess = (_updated: PaymentUpdatedInvoiceInfo) => {
    queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    setShowPaymentForm(false);
  };

  const handleGoBack = () => navigate('/app/billing/invoices');
  const handlePrint = () => window.print();
  const handleUpdateStatus = (newStatus: InvoiceStatus) => {
    if (!id || !invoice) return;
    updateStatusMutation.mutate({ invoiceId: id, newStatus });
  };

  const canRecordPayment =
    !!invoice && invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.status !== 'refunded' && invoice.patient;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md">
          {(error as any)?.message || 'Invoice not found'}
        </div>
        <button
          onClick={handleGoBack}
          className="mt-4 flex items-center text-primary-foreground bg-primary hover:bg-primary focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none"
        >
          <ArrowLeft className="w-5 h-5 mr-1" /> Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-muted/10 min-h-screen invoice-print-root">
      {/* Print styles */}
      <style>
        {`
@page { size: A5 portrait; margin: 5mm; }
@media print {
  body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  body * { visibility: hidden; }
  .invoice-print-root, .invoice-print-root * { visibility: visible; }
  .invoice-watermark { visibility: visible !important; }
  .invoice-print-root { position: static !important; width: 100% !important; padding: 0 !important; margin: 0 !important; background: white !important; page-break-after: avoid !important; }
  .no-print, nav, aside, header, footer, .sidebar, .left-sidebar, .topbar { display: none !important; }
  .invoice-print-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; width: 100% !important; position: relative !important; page-break-after: avoid !important; }
  .print-only { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; position: relative !important; page-break-after: avoid !important; }
  .std-invoice { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; font-family: Arial, Helvetica, sans-serif !important; color: #000 !important; background: white !important; position: relative !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
  .std-invoice * { page-break-inside: avoid; break-inside: avoid; }
  .std-invoice table.items tr { page-break-inside: avoid; }
  .std-invoice .section { page-break-inside: avoid; }
  html, body { height: auto !important; overflow: visible !important; }
  @page { margin: 5mm; }
  .invoice-watermark { 
    display: block !important; 
    visibility: visible !important;
    position: fixed !important; 
    top: 50% !important; 
    left: 50% !important; 
    transform: translate(-50%, -50%) rotate(-45deg) !important; 
    font-size: 70px !important; 
    font-weight: normal !important; 
    color: rgba(0, 0, 0, 0.1) !important; 
    z-index: 99999 !important; 
    pointer-events: none !important; 
    white-space: nowrap !important; 
    user-select: none !important;
    letter-spacing: 2px !important;
    opacity: 1 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
.print-only { display: none; }
.invoice-watermark { 
  display: block !important;
  visibility: visible !important;
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) rotate(-45deg) !important;
  font-size: 70px !important;
  font-weight: normal !important;
  color: rgba(0, 0, 0, 0.1) !important;
  z-index: 99999 !important;
  pointer-events: none !important;
  white-space: nowrap !important;
  user-select: none !important;
  letter-spacing: 2px !important;
  opacity: 1 !important;
}
        `}
      </style>

      <div className="max-w-4xl mx-auto invoice-print-container">
        {/* Header actions */}
        <div className="flex justify-between items-center mb-6 no-print">
          <button className="flex items-center text-muted-foreground hover:text-primary font-medium" onClick={handleGoBack}>
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Invoices
          </button>
          <div className="flex space-x-3">
            <button
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-primary-foreground border border-border/40 rounded-lg hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              onClick={handlePrint}
            >
              <Printer className="w-5 h-5 mr-2" /> Print
            </button>
            {invoice && ['draft', 'pending', 'partial', 'overdue'].includes((invoice.status || '').toLowerCase()) && (
              <button
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                onClick={() => navigate(`/app/billing/invoices/${invoice._id}/edit`)}
              >
                <FileText className="w-5 h-5 mr-2" /> Edit Invoice
              </button>
            )}
            {canRecordPayment && (
              <button
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                onClick={() => setShowPaymentForm(true)}
              >
                <CreditCard className="w-5 h-5 mr-2" /> Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 no-print">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" /> Invoice Details
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
                }`}
              >
                <BarChart3 className="w-5 h-5 inline mr-2" /> Payment Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Tab content */}
        <div className="no-print">
          {activeTab === 'details' ? (
            <>
              <Card className="p-6 sm:p-8 bg-card shadow-lg rounded-xl mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-border">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <FileText className="w-7 h-7 text-primary mr-2" />
                      {isEditingInvoiceNumber ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedInvoiceNumber}
                            onChange={(e) => setEditedInvoiceNumber(e.target.value)}
                            className="text-2xl sm:text-3xl font-bold text-foreground border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter invoice number"
                          />
                          <button
                            onClick={handleSaveInvoiceNumber}
                            disabled={isSavingInvoiceNumber}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {isSavingInvoiceNumber ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEditInvoiceNumber}
                            disabled={isSavingInvoiceNumber}
                            className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{invoice.invoiceNumber}</h2>
                          <button
                            onClick={handleStartEditInvoiceNumber}
                            className="text-xs text-primary hover:text-primary/80 font-medium ml-2"
                            title="Edit invoice number"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Invoice Details</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(invoice.status)} mb-1`}>
                      {invoice.status === 'paid' ? 'FULLY PAID' : invoice.status === 'partial' ? 'PARTIALLY PAID' : 'UNPAID'}
                    </div>
                    {invoice.status === 'partial' && (
                      <div className="text-xs text-primary">
                        {Math.round(((invoice.amountPaid || 0) / (invoice.total || 1)) * 100)}% Complete
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8 text-sm">
                  <div>
                    <h3 className="text-muted-foreground font-semibold mb-2 text-base">Billed To:</h3>
                    {invoice.patient || invoice.patientName ? (
                      <>
                        <p className="text-foreground font-medium text-lg">
                          {typeof invoice.patient === 'object' && invoice.patient.firstName && invoice.patient.lastName
                            ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
                            : invoice.patientName || (typeof invoice.patient === 'string' ? invoice.patient : 'N/A')}
                        </p>
                        <p className="text-muted-foreground">
                          Patient ID:{' '}
                          {typeof invoice.patient === 'object' && invoice.patient.patientId
                            ? invoice.patient.patientId
                            : invoice.patientId || 'N/A'}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Patient information not available</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-muted-foreground font-semibold mb-2 text-base">Invoice Information:</h3>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Issue Date:</span> {formatDate(invoice.issueDate)}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Due Date:</span> {formatDate(invoice.dueDate)}
                      </p>
                      {invoice.provider && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Provider:</span> Dr. {invoice.provider.firstName} {invoice.provider.lastName}
                        </p>
                      )}
                    </div>
                    {(invoice.paidDate || invoice.paymentTIN || invoice.paymentCustomerName || invoice.paymentMethod) && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <h3 className="text-muted-foreground font-semibold mb-2 text-base">Payment Information:</h3>
                        <div className="space-y-1">
                          {invoice.paidDate && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Paid Date:</span> {formatDate(invoice.paidDate)}
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            <span className="font-medium">Payment Method:</span> {getDisplayPaymentMethod(invoice) || 'N/A'}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium">TIN:</span> {invoice.paymentTIN || 'N/A'}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium">Customer Name:</span> {invoice.paymentCustomerName || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Information Edit Section */}
                {(invoice.paidDate || invoice.paymentTIN || invoice.paymentCustomerName || invoice.paymentMethod) && (
                  <div className="mb-8 text-sm border-t border-border pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CreditCard className="w-5 h-5 text-primary mr-2" />
                        <h3 className="text-muted-foreground font-semibold text-base">Edit Payment Information:</h3>
                      </div>
                      {!isEditingPaymentInfo && (
                        <button
                          onClick={handleStartEditPaymentInfo}
                          className="text-xs text-primary hover:text-primary/80 font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {isEditingPaymentInfo ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method:</label>
                          <select
                            value={editedPaymentMethod}
                            onChange={(e) => setEditedPaymentMethod(e.target.value)}
                            className="w-full max-w-md p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="cash">Cash</option>
                            <option value="insurance">Insurance</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">TIN:</label>
                          <input
                            type="text"
                            value={editedPaymentTIN}
                            onChange={(e) => setEditedPaymentTIN(e.target.value)}
                            className="w-full max-w-md p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Enter TIN"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Customer Name:</label>
                          <input
                            type="text"
                            value={editedPaymentCustomerName}
                            onChange={(e) => setEditedPaymentCustomerName(e.target.value)}
                            className="w-full max-w-md p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSavePaymentInfo}
                            disabled={isSavingPaymentInfo}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                          >
                            {isSavingPaymentInfo ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEditPaymentInfo}
                            disabled={isSavingPaymentInfo}
                            className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click Edit to modify Payment Method, TIN and Customer Name</p>
                    )}
                  </div>
                )}

                {/* Payment History */}
                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="mb-8 text-sm border-t border-border pt-6">
                    <h4 className="text-muted-foreground font-semibold text-sm mb-2">Payment History:</h4>
                    <div className="space-y-2">
                      {invoice.payments.map((payment: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-xs bg-muted p-2 rounded">
                          <div>
                            <span className="font-medium">{formatPaymentMethod(payment.method)}</span>
                            {payment.notes && <span className="text-muted-foreground ml-2">- {payment.notes}</span>}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(payment.amount)}</div>
                            <div className="text-muted-foreground">{formatDate(payment.date)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-foreground">Invoice Items</h3>
                    {isEditingInvoice && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddItem}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Item
                        </button>
                        <button
                          onClick={handleSaveInvoice}
                          disabled={isSavingInvoice}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {isSavingInvoice ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSavingInvoice}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto overflow-y-visible" style={{ position: 'relative', overflowY: 'visible' }}>
                    <table className="min-w-full divide-y divide-gray-200" style={{ position: 'relative' }}>
                      <thead className="bg-muted/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                          {isEditingInvoice && (
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                          )}
                          {!isEditingInvoice && (
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Status</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200" style={{ position: 'relative' }}>
                        {(isEditingInvoice ? editedItems : invoice.items).map((item: any, index: number) => {
                          const itemPaymentStatus = getItemPaymentStatus(item, invoice);
                          return (
                            <tr key={index} className={itemPaymentStatus.isFullyPaid && !isEditingInvoice ? 'bg-primary/10' : itemPaymentStatus.isPartiallyPaid && !isEditingInvoice ? 'bg-primary/10' : ''}>
                                <td className="px-4 py-3 text-sm text-muted-foreground" style={{ position: 'relative', overflow: 'visible' }}>
                                  {isEditingInvoice ? (
                                    <div className="relative w-full" style={{ position: 'relative', overflow: 'visible' }}>
                                      <input
                                        type="text"
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        onBlur={() => {
                                          // Delay hiding to allow clicking on dropdown
                                          setTimeout(() => {
                                            if (document.activeElement?.closest('.autocomplete-dropdown')) return;
                                            setAutocompleteState(null);
                                          }, 200);
                                        }}
                                        onFocus={() => {
                                          if (item.description) {
                                            handleItemChange(index, 'description', item.description);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') {
                                            setAutocompleteState(null);
                                          } else if (e.key === 'Enter' && autocompleteState?.index === index && autocompleteState.suggestions.length === 1) {
                                            e.preventDefault();
                                            handleSelectSuggestion(autocompleteState.suggestions[0]);
                                          }
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter description or search..."
                                      />
                                    </div>
                                ) : (
                                  <div className="flex items-center">
                                    {item.description}
                                    {itemPaymentStatus.isFullyPaid && <span className="ml-2 text-primary">✓</span>}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground text-right">
                                {isEditingInvoice ? (
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    min="0.1"
                                    step="0.1"
                                    className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground text-right">
                                {isEditingInvoice ? (
                                  <input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                    className="w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                  />
                                ) : (
                                  formatCurrency(item.unitPrice)
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground text-right font-medium">
                                {formatCurrency(item.total)}
                              </td>
                              {isEditingInvoice && (
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <button
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={editedItems.length <= 1}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={editedItems.length <= 1 ? 'Invoice must have at least one item' : 'Remove item'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                              {!isEditingInvoice && (
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      itemPaymentStatus.isFullyPaid
                                        ? 'bg-primary/20 text-primary'
                                        : itemPaymentStatus.isPartiallyPaid
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-destructive/20 text-destructive'
                                    }`}
                                  >
                                    {itemPaymentStatus.isFullyPaid
                                      ? 'Fully Paid'
                                      : itemPaymentStatus.isPartiallyPaid
                                      ? 'Partially Paid'
                                      : 'Unpaid'}
                                  </span>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-full max-w-xs space-y-2 text-sm">
                    {(() => {
                      const itemsToCalculate = isEditingInvoice ? editedItems : invoice.items;
                      const calculatedSubtotal = itemsToCalculate.reduce((sum, item) => sum + (item.total || 0), 0);
                      const calculatedDiscount = itemsToCalculate.reduce((sum, item) => sum + (item.discount || 0), 0);
                      const calculatedTax = itemsToCalculate.reduce((sum, item) => {
                        const grossAmount = item.quantity * item.unitPrice;
                        const discountAmount = item.discount || 0;
                        return sum + ((grossAmount - discountAmount) * (item.tax || 0) / 100);
                      }, 0);
                      const calculatedTotal = calculatedSubtotal;
                      
                      return (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(isEditingInvoice ? calculatedSubtotal : invoice.subtotal)}</span>
                          </div>
                          {(isEditingInvoice ? calculatedDiscount : invoice.discountTotal) > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>Discount:</span>
                              <span className="text-destructive">-{formatCurrency(isEditingInvoice ? calculatedDiscount : invoice.discountTotal)}</span>
                            </div>
                          )}
                          {(isEditingInvoice ? calculatedTax : invoice.taxTotal) > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>Tax:</span>
                              <span>{formatCurrency(isEditingInvoice ? calculatedTax : invoice.taxTotal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-foreground font-bold text-base pt-1 border-t border-border mt-1">
                            <span>Total Amount:</span>
                            <span className={isEditingInvoice ? 'text-green-600' : ''}>{formatCurrency(isEditingInvoice ? calculatedTotal : invoice.total)}</span>
                          </div>
                        </>
                      );
                    })()}
                    <div className={`flex justify-between font-semibold ${invoice.amountPaid > 0 ? 'text-primary' : 'text-foreground'}`}>
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className={`flex justify-between font-bold text-xl ${invoice.balance <= 0.001 && invoice.amountPaid > 0 ? 'text-primary' : 'text-destructive'}`}>
                      <span>Balance Due:</span>
                      <span>{formatCurrency(invoice.balance)}</span>
                    </div>
                    <div className="pt-2 border-t border-border mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-muted-foreground">Status:</span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-primary/20 text-primary'
                              : invoice.status === 'partial'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-destructive/20 text-destructive'
                          }`}
                        >
                          {invoice.status === 'paid' ? 'Fully Paid' : invoice.status === 'partial' ? 'Partially Paid' : 'Unpaid'}
                        </span>
                      </div>
                      {invoice.status === 'partial' && (
                        <div className="mt-1 text-xs text-primary">
                          {Math.round(((invoice.amountPaid || 0) / (invoice.total || 1)) * 100)}% of total amount paid
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment history table */}
                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Payment History</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-muted/10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-gray-200">
                          {invoice.payments.map((payment: any, index: number) => (
                            <tr key={index}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{formatDate(payment.date)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground text-right font-medium">{formatCurrency(payment.amount)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground capitalize">{formatPaymentMethod(payment.method)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{payment.reference || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{payment.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <InvoiceAnalytics invoiceId={id!} />
          )}
        </div>

        {/* Payment modal */}
        <div className="no-print">
          {showPaymentForm && (
            <RecordPaymentForm
              invoiceId={invoice._id}
              patientId={typeof invoice.patient === 'object' ? invoice.patient.patientId : invoice.patientId || 'unknown'}
              currentBalance={invoice.balance || 0}
              totalAmount={invoice.total || 0}
              currency={'ETB'}
              onSuccess={handlePaymentSuccess}
              onClose={() => setShowPaymentForm(false)}
            />
          )}
        </div>
      </div>

      {/* Watermark - Always visible */}
      <div className="invoice-watermark" style={{ 
        position: 'fixed', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: '70px',
        fontWeight: 'normal',
        color: 'rgba(0, 0, 0, 0.1)',
        zIndex: 99999,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        letterSpacing: '2px',
        display: 'block',
        visibility: 'visible',
        opacity: 1
      }}>ATTACHMENT</div>

      {/* Print-only simple invoice */}
      <div className="print-only">
        {/* Print watermark */}
        <div className="invoice-watermark" style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: '70px',
          fontWeight: 'normal',
          color: 'rgba(0, 0, 0, 0.1)',
          zIndex: 99999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          letterSpacing: '2px',
          display: 'block',
          visibility: 'visible',
          opacity: 1
        }}>ATTACHMENT</div>
        <style>
          {`
.invoice-watermark { 
  position: fixed; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -50%) rotate(-45deg); 
  font-size: 70px !important; 
  font-weight: normal !important; 
  color: rgba(0, 0, 0, 0.1) !important; 
  z-index: 99999; 
  pointer-events: none; 
  white-space: nowrap; 
  user-select: none;
  letter-spacing: 2px;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
.std-invoice { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.3; width: 100%; max-width: none; margin: 0; padding: 0; position: relative; }
.std-invoice .header { text-align: center; margin-bottom: 6px; width: 100%; }
.std-invoice .title { font-size: 20px; font-weight: 700; margin-bottom: 3px; }
.std-invoice .header > div { margin-bottom: 2px; font-size: 11px; }
.std-invoice .meta { width: 100%; margin: 6px 0 8px; font-size: 12px; }
.std-invoice .meta td { padding: 2px 0; }
.std-invoice .section-title { font-weight: 600; margin: 6px 0 3px; font-size: 13px; }
.std-invoice .section { width: 100%; margin-bottom: 6px; font-size: 12px; }
.std-invoice table.items { width: 100%; border-collapse: collapse; font-size: 11px; }
.std-invoice table.items th { text-align: left; border-bottom: 1px solid #ccc; padding: 4px 5px; }
.std-invoice table.items td { padding: 4px 5px; border-bottom: 1px solid #eee; }
.std-invoice .totals { width: 45%; margin-left: auto; font-size: 12px; }
.std-invoice .totals td { padding: 3px 0; }
.std-invoice .totals .grand { font-weight: 700; border-top: 1px solid #ccc; padding-top: 4px; }
.std-invoice .footer { margin-top: 8px; font-size: 11px; text-align: center; color: #444; }
          `}
        </style>
        <div className="std-invoice">
          <div className="header">
            <div className="title">New Life Medium Clinic PLC</div>
            <div>Contact: +251925959219</div>
            <div>Sub city: nefas silk Lafto woreda 12 house No:New</div>
            <div>TIN: 0071128497</div>
          </div>
          <hr style={{ margin: '2px 0' }} />
          <table className="meta">
            <tbody>
              <tr>
                <td>
                  <strong>Invoice Number:</strong> {invoice?.invoiceNumber}
                </td>
                <td>
                  <strong>Status:</strong>{' '}
                  {invoice?.status === 'paid' ? 'FULLY PAID' : invoice?.status === 'partial' ? 'PARTIALLY PAID' : (invoice?.status || '').toUpperCase()}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Issue Date:</strong> {formatDate(invoice?.issueDate)}
                </td>
                <td>
                  <strong>Due Date:</strong> {formatDate(invoice?.dueDate)}
                </td>
              </tr>
              {(invoice?.paidDate || invoice?.paymentTIN || invoice?.paymentCustomerName || invoice?.paymentMethod) && (
                <tr>
                  <td colSpan={2} style={{ paddingTop: '6px' }}>
                    <div style={{ fontSize: '12px', marginTop: '6px' }}>
                      <strong>Payment Information:</strong><br/>
                      {invoice?.paidDate && <span>Paid Date: {formatDate(invoice.paidDate)}</span>}
                      {invoice?.paidDate && (invoice?.paymentMethod || invoice?.paymentTIN || invoice?.paymentCustomerName) && <span> | </span>}
                      <span>Payment Method: {getDisplayPaymentMethod(invoice) || 'N/A'}</span>
                      {(invoice?.paymentTIN || invoice?.paymentCustomerName) && <span> | </span>}
                      {invoice?.paymentTIN && <span>TIN: {invoice.paymentTIN}</span>}
                      {invoice?.paymentTIN && invoice?.paymentCustomerName && <span> | </span>}
                      {invoice?.paymentCustomerName && <span>Customer Name: {invoice.paymentCustomerName}</span>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="section">
            <div className="section-title">Billed To</div>
            <div style={{ fontSize: '13px' }}>
              {invoice?.patient && typeof invoice.patient === 'object' && invoice.patient.firstName && invoice.patient.lastName ? (
                <>
                  <div>
                    {invoice.patient.firstName} {invoice.patient.lastName}
                  </div>
                  <div>Patient ID: {invoice.patient.patientId || invoice?.patientId || 'N/A'}</div>
                </>
              ) : invoice?.patientName ? (
                <>
                  <div>{invoice.patientName}</div>
                  <div>Patient ID: {invoice?.patientId || 'N/A'}</div>
                </>
              ) : (
                <div>Patient ID: {invoice?.patientId || 'N/A'}</div>
              )}
            </div>
          </div>
          <div className="section">
            <div className="section-title">Invoice Items</div>
            <table className="items">
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>Description</th>
                  <th style={{ width: '10%' }}>Qty</th>
                  <th style={{ width: '15%' }}>Unit Price</th>
                  <th style={{ width: '15%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice?.items?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <table className="totals">
            <tbody>
              <tr>
                <td>Subtotal:</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice?.subtotal || 0)}</td>
              </tr>
              {invoice?.discountTotal && invoice.discountTotal > 0 ? (
                <tr>
                  <td>Discount:</td>
                  <td style={{ textAlign: 'right' }}>-{formatCurrency(invoice.discountTotal)}</td>
                </tr>
              ) : null}
              {invoice?.taxTotal && invoice.taxTotal > 0 ? (
                <tr>
                  <td>Tax:</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(invoice.taxTotal)}</td>
                </tr>
              ) : null}
              <tr className="grand">
                <td>Total Amount:</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice?.total || 0)}</td>
              </tr>
              <tr>
                <td>Amount Paid:</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice?.amountPaid || 0)}</td>
              </tr>
              <tr>
                <td>Balance Due:</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice?.balance || 0)}</td>
              </tr>
            </tbody>
          </table>
          {invoice?.notes && (
            <div className="section" style={{ fontSize: '12px' }}>
              <div className="section-title">Notes</div>
              <div>{invoice.notes}</div>
            </div>
          )}
          <div className="section" style={{ fontSize: '11px', fontStyle: 'italic', color: '#dc2626', marginTop: '6px', fontWeight: '600' }}>
            This receipt is not valid unless the fiscal receipt is attached!
          </div>
          <div className="footer">Thank you.</div>
        </div>
      </div>
      
      {/* Autocomplete Dropdown Portal */}
      {autocompleteState && autocompleteState.inputRect && typeof document !== 'undefined' && createPortal(
        <div
          className="autocomplete-dropdown"
          style={{
            position: 'fixed',
            zIndex: 999999,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: '240px',
            overflowY: 'auto',
            minWidth: '300px',
            maxWidth: '500px',
            top: `${autocompleteState.inputRect.bottom + 4}px`,
            left: `${autocompleteState.inputRect.left}px`,
            width: `${Math.max(autocompleteState.inputRect.width, 300)}px`,
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          {autocompleteState.suggestions.length > 0 ? (
            autocompleteState.suggestions.map((suggestion, sugIndex) => (
              <div
                key={suggestion._id || sugIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(suggestion);
                }}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{suggestion.name}</div>
                  {suggestion.type && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 ml-2 whitespace-nowrap">
                      {suggestion.type === 'medication' ? 'Medication' : 'Lab Test'}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 italic">
              No matches found. Keep typing to search...
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default InvoiceDetail;


