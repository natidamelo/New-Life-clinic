import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  CreditCard
} from 'lucide-react';

interface BillingStats {
  totalInvoices: number;
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  paidInvoices: number;
  partialInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  averagePaymentTime: number;
  paymentMethods: {
    cash: number;
    card: number;
    bank_transfer: number;
    insurance: number;
    other: number;
  };
  monthlyTrends: {
    month: string;
    revenue: number;
    paid: number;
    outstanding: number;
  }[];
}

const BillingAnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingStats();
  }, []);

  const fetchBillingStats = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from the API
      const response = await fetch('/api/billing/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch billing analytics');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch billing analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount);
  };

  const getPaymentRate = () => {
    if (!stats) return 0;
    return Math.round((stats.totalPaid / stats.totalRevenue) * 100);
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

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {getPaymentRate()}% payment rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueInvoices} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidInvoices} paid, {stats.partialInvoices} partial
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Payment Collection Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Collection Rate</span>
              <span className="text-sm text-muted-foreground">{getPaymentRate()}%</span>
            </div>
            <Progress value={getPaymentRate()} className="h-3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{stats.paidInvoices}</p>
                <p className="text-sm text-muted-foreground">Fully Paid</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.partialInvoices}</p>
                <p className="text-sm text-muted-foreground">Partially Paid</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.unpaidInvoices}</p>
                <p className="text-sm text-muted-foreground">Unpaid</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm">Fully Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stats.paidInvoices}</span>
                  <Badge variant="secondary">{Math.round((stats.paidInvoices / stats.totalInvoices) * 100)}%</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm">Partially Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stats.partialInvoices}</span>
                  <Badge variant="secondary">{Math.round((stats.partialInvoices / stats.totalInvoices) * 100)}%</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive rounded-full"></div>
                  <span className="text-sm">Unpaid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stats.unpaidInvoices}</span>
                  <Badge variant="secondary">{Math.round((stats.unpaidInvoices / stats.totalInvoices) * 100)}%</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-sm">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stats.overdueInvoices}</span>
                  <Badge variant="destructive">{Math.round((stats.overdueInvoices / stats.totalInvoices) * 100)}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.paymentMethods).map(([method, percentage]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-sm capitalize">{method.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{percentage}%</span>
                    <div className="w-16 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Key Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.averagePaymentTime}</p>
              <p className="text-sm text-muted-foreground">Average Days to Payment</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{getPaymentRate()}%</p>
              <p className="text-sm text-muted-foreground">Collection Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{stats.overdueInvoices}</p>
              <p className="text-sm text-muted-foreground">Overdue Invoices</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingAnalyticsDashboard; 