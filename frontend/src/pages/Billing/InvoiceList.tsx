import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon,
  DocumentIcon, CurrencyDollarIcon, ArrowPathIcon, CheckCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import billingService, { Invoice } from '../../services/billingService';
import { safeArray } from '../../utils/formatters';

type StatusFilter = 'all' | 'pending' | 'partial' | 'overdue' | 'paid' | 'cancelled';

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string; row: string }> = {
  pending:   { label: 'Pending',   dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',     row: 'hover:bg-red-50/40' },
  partial:   { label: 'Partial',   dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 border-amber-200', row: 'hover:bg-amber-50/40' },
  overdue:   { label: 'Overdue',   dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', row: 'hover:bg-orange-50/40' },
  paid:      { label: 'Paid',      dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700 border-green-200', row: 'hover:bg-green-50/30' },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600 border-gray-200',   row: 'hover:bg-gray-50/40' },
  disputed:  { label: 'Disputed',  dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 border-purple-200', row: 'hover:bg-purple-50/40' },
};

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amountPaid: 0, paymentMethod: 'cash', notes: '' });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState<Invoice | null>(null);

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'ETB 0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'MMM dd, yyyy'); } catch { return 'Invalid Date'; }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const invoiceData = await billingService.getAllInvoices(undefined, { limit: 200 });
      let invoicesArray: Invoice[] = [];
      if (invoiceData && invoiceData.data && Array.isArray(invoiceData.data)) {
        invoicesArray = invoiceData.data;
      } else if (Array.isArray(invoiceData)) {
        invoicesArray = invoiceData;
      }
      setInvoices(safeArray<Invoice>(invoicesArray));
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load invoices.';
      setError(msg);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handlePaymentUpdate = () => { fetchData(); };
    window.addEventListener('paymentProcessed', handlePaymentUpdate);
    window.addEventListener('paymentUpdate', handlePaymentUpdate);
    return () => {
      window.removeEventListener('paymentProcessed', handlePaymentUpdate);
      window.removeEventListener('paymentUpdate', handlePaymentUpdate);
    };
  }, []);

  const getPatientName = (invoice: Invoice): string => {
    try {
      if (invoice.patient && typeof invoice.patient === 'object') {
        const name = `${invoice.patient.firstName || ''} ${invoice.patient.lastName || ''}`.trim();
        if (name) return name;
      }
      if (invoice.patientName) return invoice.patientName;
      return 'Unknown Patient';
    } catch { return 'Unknown Patient'; }
  };

  const getPatientLink = (invoice: Invoice): string => {
    if (invoice.patient && typeof invoice.patient === 'object' && invoice.patient._id)
      return `/patient/${invoice.patient._id}`;
    return `/patient/${invoice.patientId}`;
  };

  const getItemsSummary = (invoice: Invoice): string => {
    if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) return 'No items';
    const descriptions = invoice.items.slice(0, 2).map((item: any) =>
      item.description || item.serviceName || item.itemType || 'Item'
    );
    const extra = invoice.items.length > 2 ? ` +${invoice.items.length - 2} more` : '';
    return descriptions.join(', ') + extra;
  };

  // Step 1: Base list — sorted and with empty zero-balance invoices removed.
  // Stats, tab counts, and the visible table all derive from this same base.
  const baseInvoices = useMemo(() => {
    const statusPriority: Record<string, number> = { pending: 1, partial: 2, overdue: 3, paid: 4, cancelled: 5, disputed: 6 };
    return [...invoices]
      .filter(inv => {
        const isZero = (inv.balance ?? 0) <= 0 && (inv.total ?? 0) <= 0;
        if (!isZero) return true;
        // Keep zero-total invoices that are still pending/active (e.g. newly registered patients
        // whose daily consolidated invoice hasn't accumulated charges yet)
        const activeStatus = inv.status === 'pending' || inv.status === 'partial';
        const isConsolidated = inv.isConsolidated || inv.isDailyConsolidated;
        return activeStatus && isConsolidated && !inv.finalized;
      })
      .sort((a, b) => {
        const pA = statusPriority[a.status as string] || 99;
        const pB = statusPriority[b.status as string] || 99;
        if (pA !== pB) return pA - pB;
        return new Date(b.issueDate || b.dateIssued || 0).getTime() - new Date(a.issueDate || a.dateIssued || 0).getTime();
      });
  }, [invoices]);

  // Step 2: Apply status tab + search on top of the base
  const filteredInvoices = useMemo(() => {
    let result = baseInvoices;

    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(inv =>
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        getPatientName(inv).toLowerCase().includes(q) ||
        (inv.status || '').toLowerCase().includes(q) ||
        formatCurrency(inv.total).toLowerCase().includes(q)
      );
    }

    return result;
  }, [baseInvoices, searchTerm, statusFilter]);

  // Stats and tab counts both use baseInvoices so numbers always match what's visible
  const stats = useMemo(() => {
    const pending = baseInvoices.filter(i => i.status === 'pending').length;
    const partial = baseInvoices.filter(i => i.status === 'partial').length;
    const overdue = baseInvoices.filter(i => i.status === 'overdue').length;
    const paid = baseInvoices.filter(i => i.status === 'paid').length;
    const totalRevenue = baseInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = baseInvoices
      .filter(i => ['pending', 'partial', 'overdue'].includes(i.status as string))
      .reduce((s, i) => s + (i.balance || 0), 0);
    return { pending, partial, overdue, paid, totalRevenue, outstanding };
  }, [baseInvoices]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: baseInvoices.length };
    baseInvoices.forEach(inv => {
      counts[inv.status as string] = (counts[inv.status as string] || 0) + 1;
    });
    return counts;
  }, [baseInvoices]);

  const handleFinalizeInvoice = async (invoice: Invoice) => {
    try {
      await billingService.finalizeInvoice(invoice._id);
      toast.success(`Invoice ${invoice.invoiceNumber} finalized successfully`);
      setConfirmFinalize(null);
      fetchData();
    } catch (error: any) {
      toast.error(`Failed to finalize: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      if (!invoice._id) return;
      const blob = await billingService.downloadInvoice(invoice._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amount = parseFloat(paymentForm.amountPaid.toString());
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }
    if (selectedInvoice.balance && amount > selectedInvoice.total) {
      toast.error(`Payment cannot exceed invoice total of ${formatCurrency(selectedInvoice.total)}`);
      return;
    }
    setProcessingPayment(true);
    try {
      const mapMethod = (m: string) => {
        if (m.startsWith('bank_transfer')) return 'bank_transfer';
        if (['card','cash','insurance','other'].includes(m)) return m;
        return 'other';
      };
      const methodLabel: Record<string, string> = {
        cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
        bank_transfer_dashen: 'Bank Transfer - Dashen', bank_transfer_abyssinia: 'Bank Transfer - Abyssinia',
        bank_transfer_cbe: 'Bank Transfer - CBE', insurance: 'Insurance', other: 'Other',
      };
      const paymentData = {
        amount,
        method: mapMethod(paymentForm.paymentMethod),
        notes: paymentForm.notes
          ? `${methodLabel[paymentForm.paymentMethod] || paymentForm.paymentMethod} - ${paymentForm.notes}`
          : `${methodLabel[paymentForm.paymentMethod] || paymentForm.paymentMethod} - Payment for Invoice ${selectedInvoice.invoiceNumber}`,
      };
      await billingService.addPayment(selectedInvoice._id, paymentData as any);
      toast.success(`Payment of ${formatCurrency(amount)} processed successfully`);
      setShowPaymentModal(false);
      setPaymentForm({ amountPaid: 0, paymentMethod: 'cash', notes: '' });
      window.dispatchEvent(new CustomEvent('paymentProcessed', { detail: { invoiceId: selectedInvoice._id } }));
      setTimeout(() => fetchData(), 400);
    } catch (error: any) {
      await fetchData();
      const msg = error?.message || 'Payment failed';
      toast.error(`Payment failed: ${msg}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  const paginatedInvoices = filteredInvoices.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);

  const STATUS_TABS: { key: StatusFilter; label: string; color: string }[] = [
    { key: 'all',      label: 'All',      color: 'bg-gray-600' },
    { key: 'pending',  label: 'Pending',  color: 'bg-red-500' },
    { key: 'partial',  label: 'Partial',  color: 'bg-amber-500' },
    { key: 'overdue',  label: 'Overdue',  color: 'bg-orange-500' },
    { key: 'paid',     label: 'Paid',     color: 'bg-green-600' },
    { key: 'cancelled',label: 'Cancelled',color: 'bg-gray-400' },
  ];

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Patient Billing
          </h1>
          <p className="text-muted-foreground mt-1">Manage invoices and payment tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <ArrowPathIcon className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/billing')}>
            Dashboard
          </Button>
          <Button size="sm" onClick={() => navigate('/app/billing/invoices/new')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
            <PlusIcon className="w-4 h-4 mr-1.5" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-red-200 bg-red-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Pending</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{stats.pending}</p>
            <p className="text-xs text-red-500 mt-0.5">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card className="border border-amber-200 bg-amber-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Partial</p>
            <p className="text-3xl font-bold text-amber-700 mt-1">{stats.partial}</p>
            <p className="text-xs text-amber-500 mt-0.5">Partially paid</p>
          </CardContent>
        </Card>
        <Card className="border border-orange-200 bg-orange-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Overdue</p>
            <p className="text-3xl font-bold text-orange-700 mt-1">{stats.overdue}</p>
            <p className="text-xs text-orange-500 mt-0.5">Past due date</p>
          </CardContent>
        </Card>
        <Card className="border border-green-200 bg-green-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Paid</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{stats.paid}</p>
            <p className="text-xs text-green-500 mt-0.5">{formatCurrency(stats.totalRevenue)} collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding summary */}
      {stats.outstanding > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          <span className="font-medium text-red-700">Outstanding balance:</span>
          <span className="text-red-600 font-bold">{formatCurrency(stats.outstanding)}</span>
          <span className="text-red-500">across {stats.pending + stats.partial + stats.overdue} unpaid invoice(s)</span>
        </div>
      )}

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FunnelIcon className="w-4 h-4 text-muted-foreground mr-1" />
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(0); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? `${tab.color} text-white`
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              {countByStatus[tab.key] !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  statusFilter === tab.key ? 'bg-white/20' : 'bg-black/10'
                }`}>
                  {tab.key === 'all' ? invoices.length : (countByStatus[tab.key] || 0)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
            <Input
              placeholder="Search invoice, patient…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              className="pl-9 w-56 h-8 text-sm border-border/40"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border/30">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[4%] text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="w-[13%] text-xs uppercase tracking-wide">Invoice #</TableHead>
                <TableHead className="w-[16%] text-xs uppercase tracking-wide">Patient</TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide">Date</TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide">Due Date</TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide">Amount</TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide">Balance</TableHead>
                <TableHead className="w-[15%] text-xs uppercase tracking-wide">Items</TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide">Progress</TableHead>
                <TableHead className="w-[8%] text-right text-xs uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <DocumentIcon className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No invoices found</p>
                      {(searchTerm || statusFilter !== 'all') && (
                        <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((invoice: any) => {
                  const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
                  const pct = Math.min(100, Math.max(0, ((invoice.amountPaid || 0) / (invoice.total || 1)) * 100));
                  const isFullyPaid = (invoice.balance ?? 0) <= 0;
                  const isOverdue = invoice.status === 'overdue' ||
                    (!isFullyPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date());

                  return (
                    <TableRow key={invoice._id || invoice.invoiceNumber}
                      className={`border-b transition-colors ${cfg.row} ${isOverdue && !isFullyPaid ? 'bg-orange-50/30' : ''}`}>
                      {/* Status dot + label */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className="text-xs text-muted-foreground">{cfg.label}</span>
                        </div>
                      </TableCell>

                      {/* Invoice # */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm font-mono">{invoice.invoiceNumber}</span>
                          <div className="flex gap-1">
                            {invoice.items?.some((item: any) => item.itemType === 'lab') && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">LAB</span>
                            )}
                            {invoice.items?.some((item: any) => item.category === 'card') && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">CARD</span>
                            )}
                            {invoice.isDailyConsolidated && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">DAILY</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Patient */}
                      <TableCell>
                        <Link to={getPatientLink(invoice)} className="text-blue-600 hover:text-blue-700 hover:underline font-medium text-sm">
                          {getPatientName(invoice)}
                        </Link>
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDate(invoice.dateIssued || invoice.issueDate)}</span>
                      </TableCell>

                      {/* Due Date */}
                      <TableCell>
                        <span className={`text-sm ${isOverdue && !isFullyPaid ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                          {formatDate(invoice.dueDate)}
                          {isOverdue && !isFullyPaid && <span className="block text-[10px] text-orange-500">Overdue</span>}
                        </span>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <span className="font-semibold text-sm">{formatCurrency(invoice.total)}</span>
                      </TableCell>

                      {/* Balance */}
                      <TableCell>
                        {isFullyPaid ? (
                          <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Paid
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold text-sm">{formatCurrency(invoice.balance)}</span>
                        )}
                      </TableCell>

                      {/* Items */}
                      <TableCell>
                        <span className="text-muted-foreground text-xs leading-snug">{getItemsSummary(invoice)}</span>
                      </TableCell>

                      {/* Progress */}
                      <TableCell>
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${isFullyPaid ? 'bg-green-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(pct)}%</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {invoice.amountPaid > 0 ? `${formatCurrency(invoice.amountPaid)} paid` : 'No payments'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex gap-0.5 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                            onClick={() => navigate(`/app/billing/invoices/${invoice._id}`)} title="View">
                            <EyeIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-50"
                            onClick={() => navigate(`/app/billing/invoices/${invoice._id}/edit`)} title="Edit">
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-50"
                            onClick={() => handleDownloadInvoice(invoice)} title="Download PDF">
                            <DocumentIcon className="h-3.5 w-3.5" />
                          </Button>
                          {['pending','partial','overdue'].includes(invoice.status) && (
                            <Button variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setPaymentForm({ amountPaid: invoice.balance || 0, paymentMethod: 'cash', notes: '' });
                                setShowPaymentModal(true);
                              }} title="Process Payment">
                              <CurrencyDollarIcon className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {invoice.isDailyConsolidated && !invoice.finalized && (
                            <Button variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50"
                              onClick={() => setConfirmFinalize(invoice)} title="Finalize Invoice">
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            {filteredInvoices.length === 0 ? 'No invoices' : (
              <>Showing <span className="font-medium">{page * rowsPerPage + 1}</span>–<span className="font-medium">{Math.min((page + 1) * rowsPerPage, filteredInvoices.length)}</span> of <span className="font-medium">{filteredInvoices.length}</span> invoices</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Per page:</Label>
              <Select value={rowsPerPage.toString()} onValueChange={v => { setRowsPerPage(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="w-16 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setPage(0)} disabled={page === 0}>«</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹ Prev</Button>
              <span className="text-xs text-muted-foreground px-2">
                {page + 1} / {Math.max(1, totalPages)}
              </span>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next ›</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>Record a payment for this invoice.</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <>
              <div className="p-4 bg-muted/40 rounded-lg space-y-1.5 text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient</span>
                  <span className="font-medium">{getPatientName(selectedInvoice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono text-xs">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 mt-1.5">
                  <span className="text-muted-foreground">Remaining Balance</span>
                  <span className="font-bold text-red-600">{formatCurrency(selectedInvoice.balance)}</span>
                </div>
              </div>
              <form onSubmit={handleProcessPayment} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amountPaid">Amount to Pay</Label>
                  <Input id="amountPaid" type="number" step="0.01" min="0.01"
                    max={selectedInvoice.balance}
                    value={paymentForm.amountPaid}
                    onChange={e => setPaymentForm({ ...paymentForm, amountPaid: parseFloat(e.target.value) || 0 })}
                    required />
                  <p className="text-xs text-muted-foreground">Max: {formatCurrency(selectedInvoice.balance)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentForm.paymentMethod} onValueChange={v => setPaymentForm({ ...paymentForm, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card (Credit/Debit)</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="bank_transfer_dashen">Bank Transfer - Dashen Bank</SelectItem>
                      <SelectItem value="bank_transfer_abyssinia">Bank Transfer - Abyssinia Bank</SelectItem>
                      <SelectItem value="bank_transfer_cbe">Bank Transfer - CBE</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" value={paymentForm.notes}
                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline"
                    onClick={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
                    disabled={processingPayment}>Cancel</Button>
                  <Button type="submit" disabled={processingPayment}
                    className="bg-green-600 hover:bg-green-700 text-white">
                    {processingPayment ? 'Processing…' : `Pay ${formatCurrency(paymentForm.amountPaid)}`}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={!!confirmFinalize} onOpenChange={() => setConfirmFinalize(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Finalize Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to finalize <strong>{confirmFinalize?.invoiceNumber}</strong>?
              Once finalized, no more items can be added to this invoice.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFinalize(null)}>Cancel</Button>
            <Button onClick={() => confirmFinalize && handleFinalizeInvoice(confirmFinalize)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceList;
