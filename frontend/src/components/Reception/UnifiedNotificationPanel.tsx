import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpRight,
  Search,
  Receipt,
  Sparkles,
  ShieldAlert,
  Wallet,
  Clock,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';
import { getActiveNotifications } from '../../utils/notificationFilters';

export interface UnifiedNotificationPanelProps {
  queuePatients?: any[];
  paymentNotifications?: any[];
  cardPaymentPendingPatients?: any[];
  onProcessCardPayment?: (patient: any) => void;
  onProcessInvoicePayment?: (patient: any, notification?: any) => void;
}

interface NotificationBand {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  message: string;
  count?: number;
  patients?: any[];
  items?: { id: string; primary: string; secondary?: string }[];
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
}

const formatETB = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return 'ETB 0.00';
  return `ETB ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getCardTypeName = (type: any): string => {
  if (!type) return '';
  if (typeof type === 'string') return type;
  if (typeof type === 'object') {
    return type.name || type.value || type.label || type.cardType || '';
  }
  return String(type);
};

const typeStyles: Record<
  string,
  {
    stripe: string;
    cardBg: string;
    borderColor: string;
    iconPod: string;
    badge: string;
    dotColor: string;
    primaryBtn: string;
    toggleBtn: string;
    itemCard: string;
    patientAvatar: string;
  }
> = {
  error: {
    stripe: 'bg-gradient-to-b from-rose-500 via-rose-600 to-red-600',
    cardBg: 'bg-gradient-to-r from-rose-50/70 via-card to-card dark:from-rose-950/25 dark:via-card dark:to-card',
    borderColor: 'border-rose-200/80 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700/80',
    iconPod: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800/60 shadow-xs',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    primaryBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    toggleBtn: 'text-rose-700 hover:bg-rose-100/70 dark:text-rose-300 dark:hover:bg-rose-900/40',
    itemCard: 'bg-background hover:bg-rose-50/30 dark:hover:bg-rose-950/20 border-rose-100/90 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700',
    patientAvatar: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200/70 dark:border-rose-800',
  },
  warning: {
    stripe: 'bg-gradient-to-b from-amber-500 via-amber-600 to-orange-500',
    cardBg: 'bg-gradient-to-r from-amber-50/70 via-card to-card dark:from-amber-950/25 dark:via-card dark:to-card',
    borderColor: 'border-amber-200/80 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700/80',
    iconPod: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/60 shadow-xs',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
    toggleBtn: 'text-amber-800 hover:bg-amber-100/70 dark:text-amber-300 dark:hover:bg-amber-900/40',
    itemCard: 'bg-background hover:bg-amber-50/30 dark:hover:bg-amber-950/20 border-amber-100/90 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700',
    patientAvatar: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800',
  },
  success: {
    stripe: 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-600',
    cardBg: 'bg-gradient-to-r from-emerald-50/60 via-card to-card dark:from-emerald-950/25 dark:via-card dark:to-card',
    borderColor: 'border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-300',
    iconPod: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/60 shadow-xs',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    toggleBtn: 'text-emerald-700 hover:bg-emerald-100/70 dark:text-emerald-300 dark:hover:bg-emerald-900/40',
    itemCard: 'bg-background hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50',
    patientAvatar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  info: {
    stripe: 'bg-gradient-to-b from-sky-500 via-sky-600 to-blue-600',
    cardBg: 'bg-gradient-to-r from-sky-50/60 via-card to-card dark:from-sky-950/25 dark:via-card dark:to-card',
    borderColor: 'border-sky-200/80 dark:border-sky-900/60 hover:border-sky-300',
    iconPod: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800/60 shadow-xs',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    dotColor: 'bg-sky-500',
    primaryBtn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs',
    toggleBtn: 'text-sky-700 hover:bg-sky-100/70 dark:text-sky-300 dark:hover:bg-sky-900/40',
    itemCard: 'bg-background hover:bg-sky-50/30 dark:hover:bg-sky-950/20 border-sky-100 dark:border-sky-900/50',
    patientAvatar: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200',
  },
};

const UnifiedNotificationPanel: React.FC<UnifiedNotificationPanelProps> = ({
  queuePatients = [],
  paymentNotifications = [],
  cardPaymentPendingPatients = [],
  onProcessCardPayment,
  onProcessInvoicePayment,
}) => {
  const navigate = useNavigate();
  const [bands, setBands] = useState<NotificationBand[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const buildBands = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('clinic_auth_token');
      if (!token) {
        setBands([]);
        return;
      }

      // Fetch payment notifications if not passed as props
      let allNotifications: any[] = paymentNotifications;
      if (allNotifications.length === 0) {
        try {
          const res = await api.get('/api/notifications?recipientRole=reception');
          allNotifications = res.data?.data || res.data?.notifications || [];
        } catch {
          allNotifications = [];
        }
      }

      const activeNotifications = getActiveNotifications(allNotifications);
      const medicalPaymentNotifs = activeNotifications.filter((n: any) =>
        n.type?.includes('payment_required')
      );

      // Verify invoice status: filter out notifications whose invoices are already paid
      let verifiedPaymentNotifs = medicalPaymentNotifs;
      let balanceMap: Record<string, number> = {};
      if (medicalPaymentNotifs.length > 0) {
        try {
          const invoiceIds = Array.from(
            new Set(
              medicalPaymentNotifs
                .flatMap((n: any) => [n.data?.invoiceId, n.data?.invoiceNumber])
                .filter(Boolean)
            )
          );

          if (invoiceIds.length > 0) {
            // Batch-check invoice statuses
            const statusRes = await api.post('/api/billing/check-invoice-statuses', { invoiceIds });
            const statusMap: Record<string, string> = statusRes.data?.statuses || {};
            balanceMap = statusRes.data?.balances || {};

            verifiedPaymentNotifs = medicalPaymentNotifs.filter((n: any) => {
              const invId = n.data?.invoiceId;
              const invNum = n.data?.invoiceNumber;
              const status = (invId && statusMap[invId]) || (invNum && statusMap[invNum]);
              const balance =
                invId && balanceMap[invId] !== undefined
                  ? balanceMap[invId]
                  : invNum && balanceMap[invNum] !== undefined
                  ? balanceMap[invNum]
                  : undefined;

              // Hide if invoice is paid, cancelled, refunded, or balance is 0
              if (status && ['paid', 'cancelled', 'refunded'].includes(status)) return false;
              if (balance !== undefined && balance <= 0) return false;
              return true;
            });
          }
        } catch (err) {
          console.warn('Could not verify invoice statuses, showing all notifications:', err);
          verifiedPaymentNotifs = medicalPaymentNotifs;
        }
      }

      const result: NotificationBand[] = [];

      // Band 1: Card Payment Required
      if (cardPaymentPendingPatients.length > 0) {
        result.push({
          id: 'card-payment-pending',
          type: 'error',
          icon: <CreditCard className="w-5 h-5" />,
          title: 'Card Payment Required',
          subtitle: 'Medical consultation & department assignment blocked until card registration or renewal fee is settled',
          message: `${cardPaymentPendingPatients.length} patient${
            cardPaymentPendingPatients.length > 1 ? 's' : ''
          } awaiting card payment clearance`,
          count: cardPaymentPendingPatients.length,
          patients: cardPaymentPendingPatients,
          actionLabel: 'Manage Patient Cards',
          onAction: () => navigate('/app/billing/patient-cards'),
          dismissible: false,
        });
      }

      // Band 2: Medical Invoice Payment Required
      if (verifiedPaymentNotifs.length > 0) {
        result.push({
          id: 'medical-payment',
          type: 'warning',
          icon: <Receipt className="w-5 h-5" />,
          title: 'Invoice Payment Required',
          subtitle: 'Pending bills from Laboratory orders, Pharmacy prescriptions, or Clinical services',
          message: `${verifiedPaymentNotifs.length} patient${
            verifiedPaymentNotifs.length > 1 ? 's' : ''
          } require invoice settlement`,
          count: verifiedPaymentNotifs.length,
          patients: verifiedPaymentNotifs.map((n: any) => {
            const data = n.data || {};
            const invId = data.invoiceId;
            const invNum = data.invoiceNumber;
            const currentDue =
              invId && balanceMap[invId] !== undefined
                ? balanceMap[invId]
                : invNum && balanceMap[invNum] !== undefined
                ? balanceMap[invNum]
                : data.totalAmount || data.amount || 0;

            const serviceCat = n.type?.includes('lab')
              ? 'Laboratory'
              : n.type?.includes('medication')
              ? 'Pharmacy'
              : 'Service / Consultation';
            return {
              id: data.patientId || n.patientId || n._id,
              patientId: data.patientId || n.patientId,
              name: data.patientName || n.patientName || 'Unknown Patient',
              firstName: (data.patientName || '').split(' ')[0],
              lastName: (data.patientName || '').split(' ').slice(1).join(' '),
              serviceCategory: serviceCat,
              serviceName:
                data.serviceName ||
                (data.testNames?.length
                  ? `${data.testNames.length} Lab Test${data.testNames.length > 1 ? 's' : ''}`
                  : data.medications?.length
                  ? `${data.medications.length} Medication${data.medications.length > 1 ? 's' : ''}`
                  : 'Medical Invoice'),
              invoiceNumber: data.invoiceNumber || (data.invoiceId ? `INV-${String(data.invoiceId).slice(-6).toUpperCase()}` : 'INV-PENDING'),
              invoiceId: data.invoiceId,
              amount: currentDue,
              notificationDate: n.timestamp || n.createdAt,
              originalNotification: n,
            };
          }),
          actionLabel: 'Billing Hub',
          onAction: () => navigate('/app/billing/invoices'),
          dismissible: true,
        });
      }

      // Band 3: All Clear Welcome (once per session if no pending payments)
      const hasShownWelcome = sessionStorage.getItem('reception-welcome-shown');
      if (!hasShownWelcome && result.length === 0) {
        result.push({
          id: 'welcome',
          type: 'success',
          icon: <CheckCircle2 className="w-5 h-5" />,
          title: 'Payment Queue Clear',
          subtitle: 'All patient cards and medical invoices are fully settled',
          message: 'No pending card or invoice payment actions required. Reception queue is operating smoothly.',
          dismissible: true,
          onAction: () => sessionStorage.setItem('reception-welcome-shown', 'true'),
        });
      }

      setBands(result);
    } catch (err) {
      console.error('UnifiedNotificationPanel error:', err);
      setBands([]);
    } finally {
      setIsLoading(false);
    }
  }, [cardPaymentPendingPatients, paymentNotifications, navigate]);

  useEffect(() => {
    buildBands();
    const interval = setInterval(buildBands, 30000);
    return () => clearInterval(interval);
  }, [buildBands]);

  const dismiss = (id: string) => {
    if (id === 'welcome') sessionStorage.setItem('reception-welcome-shown', 'true');
    setDismissed((prev) => new Set([...prev, id]));
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSearchChange = (bandId: string, value: string) => {
    setSearchTerms((prev) => ({ ...prev, [bandId]: value }));
  };

  const visibleBands = bands.filter((b) => !dismissed.has(b.id));

  if (isLoading && bands.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 mb-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-44 bg-muted/60 rounded" />
          <div className="h-3 w-72 bg-muted/40 rounded" />
        </div>
      </div>
    );
  }

  if (visibleBands.length === 0) return null;

  return (
    <div className="flex flex-col gap-3.5 mb-6">
      {visibleBands.map((band) => {
        const s = typeStyles[band.type] || typeStyles.info;
        const isExpanded = expanded.has(band.id);
        const hasPatientList = band.patients && band.patients.length > 0;
        const hasItemList = band.items && band.items.length > 0;
        const canExpand = hasPatientList || hasItemList;
        const searchTerm = (searchTerms[band.id] || '').toLowerCase().trim();

        // Filter patients if search is active
        const displayedPatients = (!band.patients || !searchTerm)
          ? (band.patients || [])
          : band.patients.filter((p: any) => {
              const fullName = `${p.firstName || p.name || ''} ${p.lastName || ''}`.toLowerCase();
              const id = `${p.patientId || p.id || ''}`.toLowerCase();
              const inv = `${p.invoiceNumber || ''}`.toLowerCase();
              const sName = `${p.serviceName || ''}`.toLowerCase();
              return (
                fullName.includes(searchTerm) ||
                id.includes(searchTerm) ||
                inv.includes(searchTerm) ||
                sName.includes(searchTerm)
              );
            });

        return (
          <div
            key={band.id}
            className={`group rounded-2xl border ${s.borderColor} ${s.cardBg} shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden`}
          >
            {/* Main Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
              {/* Left Side: Icon Pod + Badge + Titles */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Left accent vertical indicator bar */}
                <div className={`hidden sm:block w-1.5 h-10 rounded-full ${s.stripe} shrink-0`} />

                {/* Icon Pod with soft glow */}
                <div className={`p-2.5 rounded-xl shrink-0 ${s.iconPod}`}>
                  {band.icon}
                </div>

                {/* Content info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground tracking-tight">
                      {band.title}
                    </h3>

                    {band.count !== undefined && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dotColor} animate-pulse`} />
                        {band.count} {band.id === 'card-payment-pending' ? 'Card Due' : 'Unpaid'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {band.subtitle || band.message}
                  </p>
                </div>
              </div>

              {/* Right Side: Header CTA + Expand Toggle + Dismiss */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                {/* Primary Destination Action Button */}
                {band.actionLabel && band.onAction && (
                  <Button
                    onClick={band.onAction}
                    size="sm"
                    className={`h-8 px-3 text-xs font-medium rounded-lg transition-transform active:scale-95 ${s.primaryBtn}`}
                  >
                    <span>{band.actionLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-80" />
                  </Button>
                )}

                {/* Expand / Collapse Details Toggle */}
                {canExpand && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(band.id)}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg ${s.toggleBtn} transition-colors`}
                  >
                    <span>{isExpanded ? 'Hide' : `Show (${band.count})`}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 ml-1 transition-transform" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 ml-1 transition-transform" />
                    )}
                  </Button>
                )}

                {/* Dismiss Button */}
                {band.dismissible && (
                  <button
                    onClick={() => dismiss(band.id)}
                    className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors"
                    title="Dismiss alert"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Detailed Patient Drawer */}
            {isExpanded && (
              <div className="border-t border-border/60 bg-muted/20 backdrop-blur-xs px-4 sm:px-6 py-4">
                {/* Drawer Header Toolbar with Search & Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Patients Requiring Action ({displayedPatients.length})
                    </span>
                    {band.id === 'card-payment-pending' && (
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/40">
                        Registration / Renewal Fee Required
                      </span>
                    )}
                    {band.id === 'medical-payment' && (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                        Invoice Settlement Required
                      </span>
                    )}
                  </div>

                  {/* Filter Search for multiple patients */}
                  {(band.patients?.length ?? 0) > 3 && (
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Filter patient or invoice..."
                        value={searchTerms[band.id] || ''}
                        onChange={(e) => handleSearchChange(band.id, e.target.value)}
                        className="w-full text-xs rounded-lg pl-8 pr-3 py-1.5 bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      />
                    </div>
                  )}
                </div>

                {/* Patient Cards Grid */}
                {hasPatientList && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {displayedPatients.map((p: any, i: number) => {
                      const patientDisplayName = p.firstName
                        ? `${p.firstName} ${p.lastName || ''}`.trim()
                        : p.name || 'Unknown Patient';
                      const patientIdCode = p.patientId || p.id || 'N/A';
                      const initial = (patientDisplayName.charAt(0) || '?').toUpperCase();
                      const isCardBand = band.id === 'card-payment-pending';

                      return (
                        <div
                          key={p._id || p.id || p.invoiceId || i}
                          className={`flex flex-col justify-between p-3.5 rounded-xl border bg-card shadow-xs transition-all duration-200 hover:shadow-md ${s.itemCard}`}
                        >
                          {/* Top Row: Avatar + Info */}
                          <div className="flex items-start gap-3">
                            {/* Patient Initial Avatar */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${s.patientAvatar}`}>
                              {initial}
                            </div>

                            {/* Name & ID */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <h4 className="font-semibold text-sm text-foreground truncate">
                                  {patientDisplayName}
                                </h4>
                                {p.cardType && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                                    {getCardTypeName(p.cardType)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-mono text-muted-foreground">
                                  #{patientIdCode}
                                </span>
                                {p.serviceCategory && (
                                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                    • {p.serviceCategory}
                                  </span>
                                )}
                              </div>

                              {/* Service or Invoice details */}
                              {p.serviceName && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {p.serviceName}
                                </p>
                              )}
                              {p.invoiceNumber && (
                                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  Invoice: {p.invoiceNumber}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Amount Due + Action Button */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                                {isCardBand ? 'Card Fee' : 'Amount Due'}
                              </span>
                              <span className={`text-sm font-bold ${isCardBand ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {isCardBand
                                  ? formatETB(
                                      (p.unpaidInvoices || []).reduce(
                                        (sum: number, inv: any) => sum + (inv.balance ?? inv.total ?? 0),
                                        0
                                      ) || 500
                                    )
                                  : formatETB(p.amount)}
                              </span>
                            </div>

                            {/* Direct Action Button */}
                            {isCardBand ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (onProcessCardPayment) {
                                    onProcessCardPayment(p);
                                  } else {
                                    navigate('/app/billing/patient-cards');
                                  }
                                }}
                                className="h-7 px-3 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                <span>Collect Fee</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (onProcessInvoicePayment) {
                                    onProcessInvoicePayment(p, p.originalNotification);
                                  } else {
                                    navigate('/app/billing/invoices');
                                  }
                                }}
                                className="h-7 px-3 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                              >
                                <Receipt className="w-3.5 h-3.5 mr-1" />
                                <span>Collect Bill</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty Search Fallback */}
                {displayedPatients.length === 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No matching patients found for "{searchTerm}".
                  </div>
                )}

                {/* Bottom Guidance Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3.5 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>
                      {band.id === 'card-payment-pending'
                        ? 'Patients must have an active, paid card before assignment to medical doctors or triage nurses.'
                        : 'Collected payments automatically release results and fulfill pending pharmacy/lab orders.'}
                    </span>
                  </div>

                  {band.onAction && (
                    <button
                      onClick={band.onAction}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer self-start sm:self-auto"
                    >
                      <span>{band.id === 'card-payment-pending' ? 'View Card Registry' : 'Open Full Invoice Registry'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UnifiedNotificationPanel;
