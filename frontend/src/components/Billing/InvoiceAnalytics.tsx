import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  User, 
  FileText,
  CreditCard,
  AlertCircle
} from 'lucide-react';

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

interface PaymentAnalytics {
  totalPayments: number;
  averagePaymentAmount: number;
  largestPayment: number;
  smallestPayment: number;
  paymentFrequency: number;
  lastPaymentDate: string;
  firstPaymentDate: string;
  daysToFullPayment: number;
  partialPaymentCount: number;
  fullPaymentCount: number;
}

interface PaymentStatus {
  current: 'unpaid' | 'partial' | 'fully_paid' | 'overpaid';
  percentage: number;
  lastUpdated: string;
  paymentPlan: 'single_payment' | 'installments' | 'custom';
  installmentDetails?: {
    totalInstallments: number;
    currentInstallment: number;
    installmentAmount: number;
    nextDueDate: string;
  };
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
      const response = await fetch(`/api/billing/invoice-analytics/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clinic_auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-primary/20 text-primary';
      case 'partial': return 'bg-primary/20 text-primary';
      case 'pending': return 'bg-accent/20 text-accent-foreground';
      case 'overdue': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'fully_paid': return 'bg-primary/20 text-primary';
      case 'partial': return 'bg-primary/20 text-primary';
      case 'unpaid': return 'bg-destructive/20 text-destructive';
      case 'overpaid': return 'bg-secondary/20 text-secondary-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" />
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoice Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="font-semibold">{analytics.invoice.invoiceNumber}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Patient</p>
              <p className="font-semibold">{analytics.invoice.patientName}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={getStatusColor(analytics.invoice.status)}>
                {analytics.invoice.status.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <Badge className={getPaymentStatusColor(analytics.paymentStatus.current)}>
                {analytics.paymentStatus.current.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Payment Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Payment Progress</span>
              <span className="text-sm text-muted-foreground">
                {analytics.paymentStatus.percentage}% Complete
              </span>
            </div>
            <Progress value={analytics.paymentStatus.percentage} className="h-2" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(analytics.invoice.amountPaid)}
                </p>
                <p className="text-sm text-muted-foreground">Amount Paid</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(analytics.invoice.balance)}
                </p>
                <p className="text-sm text-muted-foreground">Remaining Balance</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(analytics.invoice.total)}
                </p>
                <p className="text-sm text-muted-foreground">Total Amount</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {analytics.paymentAnalytics.totalPayments}
              </p>
              <p className="text-sm text-muted-foreground">Total Payments</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(analytics.paymentAnalytics.averagePaymentAmount)}
              </p>
              <p className="text-sm text-muted-foreground">Average Payment</p>
            </div>
            <div className="text-center p-4 bg-secondary/10 rounded-lg">
              <p className="text-2xl font-bold text-secondary-foreground">
                {formatCurrency(analytics.paymentAnalytics.largestPayment)}
              </p>
              <p className="text-sm text-muted-foreground">Largest Payment</p>
            </div>
            <div className="text-center p-4 bg-accent/10 rounded-lg">
              <p className="text-2xl font-bold text-accent-foreground">
                {analytics.paymentAnalytics.partialPaymentCount}
              </p>
              <p className="text-sm text-muted-foreground">Partial Payments</p>
            </div>
          </div>
          
          {analytics.paymentAnalytics.daysToFullPayment && (
            <div className="mt-4 p-4 bg-muted/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Days to Full Payment:</span>
                <span className="text-lg font-bold text-muted-foreground">
                  {analytics.paymentAnalytics.daysToFullPayment} days
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.paymentHistory.map((payment: PaymentHistoryItem, index: number) => (
              <div key={payment.paymentId} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={payment.paymentType === 'full' ? 'default' : 'secondary'}>
                        {payment.paymentType.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Method: {payment.method} | Reference: {payment.reference}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Processed by: {payment.processedBy.firstName} {payment.processedBy.lastName}
                    </p>
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground">Notes: {payment.notes}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDate(payment.date)}</p>
                    <p>{payment.paymentPercentage}% of total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceAnalytics; 