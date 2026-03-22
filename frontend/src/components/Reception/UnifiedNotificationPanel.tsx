import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { AlertCircle, CheckCircle, CreditCard, ChevronDown, ChevronUp, X } from 'lucide-react';
import api from '../../services/api';
import { getActiveNotifications } from '../../utils/notificationFilters';

interface NotificationBand {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
  count?: number;
  patients?: any[];
  /** For non-patient lists (e.g. prescriptions): { id, primary, secondary } */
  items?: { id: string; primary: string; secondary?: string }[];
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
}

interface UnifiedNotificationPanelProps {
  queuePatients?: any[];
  paymentNotifications?: any[];
  cardPaymentPendingPatients?: any[];
}

const typeStyles: Record<string, { border: string; icon: string; badge: string; btn: string }> = {
  error:   { border: 'border-l-red-500',   icon: 'text-red-600',   badge: 'bg-red-500/10 text-red-600',   btn: 'text-red-600 hover:bg-red-500/10' },
  warning: { border: 'border-l-amber-500',  icon: 'text-amber-600',  badge: 'bg-amber-500/10 text-amber-600',  btn: 'text-amber-600 hover:bg-amber-500/10' },
  success: { border: 'border-l-emerald-500', icon: 'text-emerald-600', badge: 'bg-emerald-500/10 text-emerald-600', btn: 'text-emerald-600 hover:bg-emerald-500/10' },
  info:    { border: 'border-l-sky-500',  icon: 'text-sky-600',    badge: 'bg-sky-500/10 text-sky-600',    btn: 'text-sky-600 hover:bg-sky-500/10' },
};

const UnifiedNotificationPanel: React.FC<UnifiedNotificationPanelProps> = ({
  queuePatients = [],
  paymentNotifications = [],
  cardPaymentPendingPatients = [],
}) => {
  const [bands, setBands] = useState<NotificationBand[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const buildBands = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('clinic_auth_token');
      if (!token) { setBands([]); return; }

      // Fetch payment notifications if not passed as props
      let allNotifications: any[] = paymentNotifications;
      if (allNotifications.length === 0) {
        try {
          const res = await api.get('/api/notifications?recipientRole=reception');
          allNotifications = res.data?.data || res.data?.notifications || [];
        } catch { allNotifications = []; }
      }

      const activeNotifications = getActiveNotifications(allNotifications);
      const medicalPaymentNotifs = activeNotifications.filter((n: any) =>
        n.type?.includes('payment_required')
      );

      const result: NotificationBand[] = [];

      // Band 1: Card payment pending
      if (cardPaymentPendingPatients.length > 0) {
        result.push({
          id: 'card-payment-pending',
          type: 'error',
          icon: <CreditCard className="w-4 h-4" />,
          title: 'Card Payment Required',
          message: `${cardPaymentPendingPatients.length} need card payment`,
          count: cardPaymentPendingPatients.length,
          patients: cardPaymentPendingPatients,
          actionLabel: 'Show',
          dismissible: false,
        });
      }

      // Band 2: Medical invoice payment required
      if (medicalPaymentNotifs.length > 0) {
        result.push({
          id: 'medical-payment',
          type: 'warning',
          icon: <AlertCircle className="w-4 h-4" />,
          title: 'Invoice Payment Required',
          message: `${medicalPaymentNotifs.length} patient${medicalPaymentNotifs.length > 1 ? 's' : ''} require invoice payment processing`,
          count: medicalPaymentNotifs.length,
          patients: medicalPaymentNotifs.map((n: any) => ({
            name: n.data?.patientName || 'Unknown',
            id: n.data?.patientId,
          })),
          actionLabel: 'Go to Billing',
          dismissible: true,
        });
      }

      // Band 3: Welcome (once per session)
      const hasShownWelcome = sessionStorage.getItem('reception-welcome-shown');
      if (!hasShownWelcome && result.length === 0) {
        result.push({
          id: 'welcome',
          type: 'success',
          icon: <CheckCircle className="w-4 h-4" />,
          title: 'All Clear',
          message: 'No pending actions — queue is running smoothly.',
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
  }, [cardPaymentPendingPatients, paymentNotifications]);

  useEffect(() => {
    buildBands();
    const interval = setInterval(buildBands, 30000);
    return () => clearInterval(interval);
  }, [buildBands]);

  const dismiss = (id: string) => {
    if (id === 'welcome') sessionStorage.setItem('reception-welcome-shown', 'true');
    setDismissed(prev => new Set([...prev, id]));
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleBands = bands.filter(b => !dismissed.has(b.id));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground/30 border-t-primary" />
        <span>Loading…</span>
      </div>
    );
  }

  if (visibleBands.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-5">
      {visibleBands.map(band => {
        const s = typeStyles[band.type];
        const isExpanded = expanded.has(band.id);
        const hasPatientList = band.patients && band.patients.length > 0;
        const hasItemList = band.items && band.items.length > 0;
        const canExpand = hasPatientList || hasItemList;

        return (
          <div
            key={band.id}
            className={`rounded-xl border border-border bg-card overflow-hidden border-l-4 ${s.border} shadow-sm`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className={s.icon}>{band.icon}</span>
              <span className="font-medium text-sm text-foreground">{band.title}</span>
              {band.count !== undefined && (
                <span className={`min-w-[1.5rem] px-2 py-0.5 rounded-md text-xs font-semibold text-center ${s.badge}`}>
                  {band.count}
                </span>
              )}
              <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">{band.message}</span>

              <div className="flex items-center gap-1 flex-shrink-0">
                {canExpand && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(band.id)}
                    className={`h-8 px-2.5 text-xs font-medium ${s.btn}`}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Hide' : 'Show'}
                  </Button>
                )}
                {band.actionLabel && band.onAction && (
                  <Button variant="ghost" size="sm" onClick={band.onAction} className={`h-8 px-2.5 text-xs font-medium ${s.btn}`}>
                    {band.actionLabel}
                  </Button>
                )}
                {band.dismissible && (
                  <button
                    onClick={() => dismiss(band.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {isExpanded && hasPatientList && (
              <div className="border-t border-border bg-muted/30 px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {band.patients!.map((p: any, i: number) => (
                    <div
                      key={p._id || p.id || i}
                      className="flex items-center gap-2.5 rounded-lg bg-background border border-border px-3 py-2 text-sm"
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${s.badge}`}>
                        {((p.firstName || p.name || '?').charAt(0)).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : (p.name || 'Unknown')}
                        </p>
                        {(p.patientId || p.id) && (
                          <p className="text-xs text-muted-foreground font-mono truncate">{p.patientId || p.id}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isExpanded && hasItemList && !hasPatientList && (
              <div className="border-t border-border bg-muted/30 px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {band.items!.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 rounded-lg bg-background border border-border px-3 py-2 text-sm"
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${s.badge}`}>
                        {(item.primary || '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{item.primary}</p>
                        {item.secondary && (
                          <p className="text-xs text-muted-foreground truncate">{item.secondary}</p>
                        )}
                      </div>
                    </div>
                  ))}
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
