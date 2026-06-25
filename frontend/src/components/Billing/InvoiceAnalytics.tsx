import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  User, 
  FileText,
  CreditCard,
  AlertCircle,
  TrendingDown,
  Percent,
  CheckCircle,
  Activity,
  ArrowRight,
  Shield,
  Building,
  Coins
} from 'lucide-react';
import api from '../../services/apiService';

interface PaymentHistoryItem {
  paymentId: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  processedBy: {
    firstName: string;
    lastName: string;
  };
  notes: string;
  paymentType: 'full' | 'partial' | 'advance' | 'refund';
  previousBalance: number;
  newBalance: number;
  paymentPercentage: number;
}

interface InvoiceAnalyticsProps {
  invoiceId: string;
}

const InvoiceAnalytics: React.FC<InvoiceAnalyticsProps> = ({ invoiceId }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [invoiceId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the configured axios instance (api) instead of relative window.fetch 
      // to resolve Vercel -> Render proxying and inject auth headers automatically
      const response = await api.get(`/api/billing/invoice-analytics/${invoiceId}`);
      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Error fetching invoice analytics:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to retrieve payment analytics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending:   { label: 'Pending', className: 'bg-red-500/10 text-red-500 border border-red-500/20' },
      partial:   { label: 'Partial', className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' },
      overdue:   { label: 'Overdue', className: 'bg-orange-500/10 text-orange-500 border border-orange-500/20' },
      paid:      { label: 'Paid', className: 'bg-green-500/10 text-green-500 border border-green-500/20' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-500 border border-gray-500/20' },
      disputed:  { label: 'Disputed', className: 'bg-purple-500/10 text-purple-500 border border-purple-500/20' },
    };
    const c = config[status.toLowerCase()] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <Badge className={`font-semibold rounded-full px-2.5 py-0.5 ${c.className}`}>{c.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      fully_paid: { label: 'Fully Paid', className: 'bg-green-500 text-white shadow-sm shadow-green-500/10' },
      partial:    { label: 'Partially Paid', className: 'bg-amber-500 text-white shadow-sm shadow-amber-500/10' },
      unpaid:     { label: 'Unpaid', className: 'bg-red-500 text-white shadow-sm shadow-red-500/10' },
      overpaid:   { label: 'Overpaid', className: 'bg-blue-500 text-white shadow-sm shadow-blue-500/10' },
    };
    const c = config[status.toLowerCase()] || { label: status.replace('_', ' '), className: 'bg-muted text-muted-foreground' };
    return <Badge className={`font-bold px-3 py-1 rounded-full uppercase tracking-wider text-[10px] ${c.className}`}>{c.label}</Badge>;
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Coins className="h-4 w-4 text-emerald-500" />;
      case 'card':
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'insurance':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'bank_transfer':
      case 'bank_transfer_dashen':
      case 'bank_transfer_abyssinia':
      case 'bank_transfer_cbe':
        return <Building className="h-4 w-4 text-indigo-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'ETB 0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent shadow-sm"></div>
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Analyzing payment logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center max-w-md mx-auto">
        <div className="p-3 bg-red-50 border border-red-200 rounded-full text-red-500 mb-4 animate-bounce">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-bold text-lg text-foreground">Failed to Load Analytics</h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{error}</p>
        <Button onClick={fetchAnalytics} size="sm" className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white">
          Try Again
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
        <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-muted-foreground font-medium">No payment history or analytics found</p>
      </div>
    );
  }

  const { invoice, paymentStatus, paymentAnalytics, paymentHistory } = analytics;
  const pctPaid = Math.min(100, Math.max(0, paymentStatus.percentage || 0));

  return (
    <div className="flex flex-col gap-6">
      {/* Cancellation Notice Banner */}
      {invoice.status === 'cancelled' && (
        <Card className="border border-red-200 bg-red-50/50 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500" />
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-1.5 bg-red-100 rounded-full text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-red-900 text-sm">Invoice Cancelled</h4>
              <p className="text-xs text-red-700 leading-relaxed font-medium">
                {(() => {
                  if (!invoice.notes) return 'No cancellation details specified.';
                  const lines = invoice.notes.split('\n');
                  const cancelLine = lines.find((line: string) => line.includes('[Cancelled on'));
                  if (cancelLine) {
                    const match = cancelLine.match(/Reason:\s*(.*)\]/);
                    if (match && match[1]) {
                      return `Reason: ${match[1]} (${cancelLine.split(' - ')[0].replace('[', '')})`;
                    }
                    return cancelLine.replace('[', '').replace(']', '');
                  }
                  return invoice.notes;
                })()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Invoice Summary Card */}
        <Card className="border border-border/30 shadow-sm bg-gradient-to-br from-card to-muted/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8" />
          <CardHeader className="pb-3 border-b border-border/10">
            <CardTitle className="flex items-center gap-2 text-md font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="h-4 w-4 text-indigo-500" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-sm text-muted-foreground">Invoice Reference</span>
              <span className="font-mono font-bold text-foreground">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-sm text-muted-foreground">Patient Name</span>
              <span className="font-semibold text-foreground">{invoice.patientName || 'Unknown Patient'}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-sm text-muted-foreground">Invoice Status</span>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-sm text-muted-foreground">Payment Status</span>
              {getPaymentStatusBadge(paymentStatus.current)}
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Created Date</span>
              <span className="text-sm font-semibold">{formatDate(invoice.issueDate)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="border border-border/30 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-md font-semibold text-muted-foreground uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Real-time payment progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[28px] font-extrabold text-foreground">{pctPaid}%</span>
                  <span className="text-xs text-muted-foreground ml-2">collected of total</span>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {formatCurrency(invoice.amountPaid)} / {formatCurrency(invoice.total)}
                </span>
              </div>
              <Progress value={pctPaid} className="h-3.5 bg-muted rounded-full">
                <div 
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                    pctPaid === 100 
                      ? 'from-green-500 to-emerald-500 shadow-md shadow-green-500/20' 
                      : pctPaid > 50 
                        ? 'from-amber-400 to-amber-500' 
                        : 'from-red-400 to-rose-500'
                  }`}
                  style={{ width: `${pctPaid}%` }}
                />
              </Progress>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/20">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">Paid To Date</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(invoice.amountPaid)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">Outstanding Balance</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(invoice.balance)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">Invoice Value</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Statistical Metrics */}
      <Card className="border border-border/30 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/10">
          <CardTitle className="flex items-center gap-2 text-md font-semibold text-muted-foreground uppercase tracking-wider">
            <Activity className="h-4 w-4 text-indigo-500" />
            Financial & Payment Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-muted/30 border border-border/10 rounded-xl space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Total Instalments</span>
              <p className="text-2xl font-black text-indigo-600">{paymentAnalytics.totalPayments || 0}</p>
              <span className="text-[10px] text-muted-foreground block">successful payments</span>
            </div>
            <div className="p-4 bg-muted/30 border border-border/10 rounded-xl space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Average Instalment</span>
              <p className="text-2xl font-black text-foreground">{formatCurrency(paymentAnalytics.averagePaymentAmount)}</p>
              <span className="text-[10px] text-muted-foreground block">per payment</span>
            </div>
            <div className="p-4 bg-muted/30 border border-border/10 rounded-xl space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Peak payment</span>
              <p className="text-2xl font-black text-foreground">{formatCurrency(paymentAnalytics.largestPayment)}</p>
              <span className="text-[10px] text-muted-foreground block">highest single value</span>
            </div>
            <div className="p-4 bg-muted/30 border border-border/10 rounded-xl space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Remaining Tasks Status</span>
              <p className="text-2xl font-black text-foreground">{paymentAnalytics.partialPaymentCount || 0}</p>
              <span className="text-[10px] text-muted-foreground block">partial instalments</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-border/20">
            <div className="flex items-center gap-3 p-3.5 bg-muted/20 border border-border/10 rounded-xl">
              <Calendar className="h-5 w-5 text-indigo-500 flex-shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Timeline Period</p>
                <p className="text-sm font-semibold text-foreground">
                  {paymentAnalytics.firstPaymentDate ? formatDate(paymentAnalytics.firstPaymentDate) : 'No payments'}
                  {paymentAnalytics.lastPaymentDate && ` – ${formatDate(paymentAnalytics.lastPaymentDate)}`}
                </p>
              </div>
            </div>

            {paymentAnalytics.daysToFullPayment !== undefined && paymentAnalytics.daysToFullPayment > 0 ? (
              <div className="flex items-center gap-3 p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                <Clock className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs text-indigo-700 font-semibold">Settlement Speed</p>
                  <p className="text-sm font-bold text-indigo-900">
                    Fully Slipped within {paymentAnalytics.daysToFullPayment} days
                  </p>
                </div>
              </div>
            ) : invoice.status !== 'paid' && invoice.dueDate ? (
              <div className="flex items-center gap-3 p-3.5 bg-amber-50/40 border border-amber-100 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs text-amber-700 font-semibold">Payment Due</p>
                  <p className="text-sm font-bold text-amber-900">
                    Invoice expires on {formatDate(invoice.dueDate)}
                    {invoice.isOverdue && <span className="text-red-500 font-black ml-1 text-xs">({invoice.overdueDays} days late)</span>}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Payment History Timeline */}
      <Card className="border border-border/30 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/10">
          <CardTitle className="flex items-center gap-2 text-md font-semibold text-muted-foreground uppercase tracking-wider">
            <CreditCard className="h-4 w-4 text-indigo-500" />
            Payment Audit Log & Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {(!paymentHistory || paymentHistory.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
              <Coins className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-sm">No transaction events recorded</p>
              <p className="text-xs text-muted-foreground mt-0.5">Complete a payment to write logs here.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
              {paymentHistory.map((payment: PaymentHistoryItem) => (
                <div key={payment.paymentId} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center transition-transform group-hover:scale-125">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  </div>

                  <div className="bg-card border border-border/20 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      
                      {/* Left: Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[15px] font-bold text-foreground">
                            {formatCurrency(payment.amount)}
                          </span>
                          <Badge variant="outline" className="bg-muted text-foreground border-border text-[9px] uppercase tracking-wider font-semibold py-0">
                            {payment.paymentType || 'Installment'}
                          </Badge>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border text-xs">
                            {getMethodIcon(payment.method)}
                            <span className="capitalize font-medium text-muted-foreground text-[11px]">{payment.method}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-muted-foreground/70">Reference:</span>
                            <span className="font-mono text-foreground font-semibold">{payment.reference || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-muted-foreground/70">Agent:</span>
                            <span className="text-foreground font-semibold">
                              {payment.processedBy ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}` : 'System'}
                            </span>
                          </div>
                        </div>

                        {payment.notes && (
                          <div className="text-xs p-2 bg-muted/30 border border-border/10 rounded-lg text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-[10px] text-muted-foreground/80 uppercase block mb-0.5">Notes</span>
                            {payment.notes}
                          </div>
                        )}
                      </div>

                      {/* Right: Date and Stats */}
                      <div className="text-left sm:text-right flex-shrink-0 space-y-1.5">
                        <span className="text-xs font-semibold text-muted-foreground block">{formatDate(payment.date)}</span>
                        <div className="text-right space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium block">Percentage of total</span>
                          <span className="text-xs font-bold text-indigo-600">
                            {payment.paymentPercentage ? `${payment.paymentPercentage}%` : '0%'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceAnalytics;