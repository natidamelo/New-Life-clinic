import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import patientService, { Patient } from '../../services/patientService';
import patientCardService, { PatientCard, PatientCardStatusEnum } from '../../services/patientCardService';
import cardTypeService from '../../services/cardTypeService';
import { useCardTypes, CardType } from '../../context/CardTypeContextNew';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  Search,
  RefreshCw,
  Calendar,
  User,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Percent,
  FlaskConical,
  Stethoscope,
  Printer,
  X,
  ChevronRight,
  SlidersHorizontal,
  Check,
  Plus,
  Sparkles,
  Phone,
  Hash,
  AlertCircle,
  History,
  Wallet
} from 'lucide-react';
import { Button } from '../../components/ui/button';

// Payment methods for patient cards
const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'mobileMoney', label: 'Mobile Money (Telebirr / CBE Birr)' },
  { value: 'bankTransfer', label: 'Bank Transfer (CBE / Dashen / Awash)' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' }
];

const paymentMethodBackendMapping: Record<string, string> = {
  cash: 'Cash',
  card: 'Credit Card',
  insurance: 'Insurance',
  mobileMoney: 'Debit Card',
  bankTransfer: 'Bank Transfer',
  other: 'Debit Card'
};

const formatETB = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return 'ETB 0.00';
  return `ETB ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date: string | number | Date | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getCardTypeName = (type: any): string => {
  if (!type) return '';
  if (typeof type === 'string') return type;
  if (typeof type === 'object') {
    return type.name || type.value || type.label || type.cardType || '';
  }
  return String(type);
};

const getCardDescription = (desc: any): string => {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object') {
    return desc.text || desc.description || desc.name || '';
  }
  return String(desc);
};

// Accurately determine patient membership card status based on true clinic rules
export const getPatientCardStatus = (p: any): 'active' | 'grace' | 'expired' | 'unpaid' | 'none' => {
  if (!p) return 'none';
  if (p.evaluatedCardStatus) return p.evaluatedCardStatus.toLowerCase() as any;
  if (p.hasUnpaidCardInvoice) return 'unpaid';

  const card = p.activeCard;
  const now = Date.now();

  if (card) {
    const exp = card.expiryDate ? new Date(card.expiryDate) : null;
    if (exp && !isNaN(exp.getTime())) {
      const graceEnd = new Date(exp.getTime() + 15 * 24 * 60 * 60 * 1000);
      if (now <= exp.getTime()) return 'active';
      if (now <= graceEnd.getTime()) return 'grace';
      return 'expired';
    }
    const cs = (card.status || '').toLowerCase();
    if (cs === 'active') return 'active';
    if (cs === 'grace') return 'grace';
    if (cs === 'expired') return 'expired';
  }

  let expiryDate: Date | null = null;

  if (p.cardExpiryDate) {
    expiryDate = new Date(p.cardExpiryDate);
  } else if (p.cardIssueDate) {
    expiryDate = new Date(p.cardIssueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else if (p.hasPaidCardFee && p.createdAt) {
    expiryDate = new Date(p.createdAt);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  if (expiryDate && !isNaN(expiryDate.getTime())) {
    const graceEnd = new Date(expiryDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    if (now <= expiryDate.getTime()) return 'active';
    if (now <= graceEnd.getTime()) return 'grace';
    return 'expired';
  }

  const s = (p.cardStatus || '').toLowerCase();
  if (s === 'grace') return 'grace';
  if (s === 'expired') return 'expired';
  if (s === 'unpaid') return 'unpaid';

  // If cardStatus is raw 'active' but patient has no cardType, no cardIssueDate, and hasn't paid fee, it's 'none'
  return 'none';
};

// Card Tier color & gradient schemes
const getCardGradient = (type?: any) => {
  const typeName = getCardTypeName(type);
  const t = (typeName || '').toLowerCase();
  if (t.includes('vip')) {
    return {
      bg: 'bg-gradient-to-tr from-amber-950 via-neutral-900 to-amber-700 text-amber-50 border-amber-600/40',
      badge: 'bg-amber-400 text-amber-950 border-amber-300 font-bold',
      chip: 'from-amber-300 to-amber-500',
      glow: 'shadow-amber-500/10'
    };
  }
  if (t.includes('premium')) {
    return {
      bg: 'bg-gradient-to-tr from-slate-950 via-blue-950 to-indigo-800 text-sky-50 border-sky-600/40',
      badge: 'bg-sky-400 text-slate-950 border-sky-300 font-bold',
      chip: 'from-sky-300 to-blue-400',
      glow: 'shadow-sky-500/10'
    };
  }
  if (t.includes('family')) {
    return {
      bg: 'bg-gradient-to-tr from-purple-950 via-violet-900 to-fuchsia-800 text-purple-50 border-purple-500/40',
      badge: 'bg-fuchsia-300 text-purple-950 border-fuchsia-200 font-bold',
      chip: 'from-pink-300 to-purple-400',
      glow: 'shadow-purple-500/10'
    };
  }
  // Basic / Standard default
  return {
    bg: 'bg-gradient-to-tr from-slate-900 via-teal-950 to-emerald-800 text-emerald-50 border-emerald-500/40',
    badge: 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold',
    chip: 'from-emerald-300 to-teal-400',
    glow: 'shadow-emerald-500/10'
  };
};

const PatientCardManagement: React.FC = () => {
  const { patientId: urlPatientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState<boolean>(true);
  const [isLoadingExistingCard, setIsLoadingExistingCard] = useState<boolean>(false);
  const [existingCard, setExistingCard] = useState<PatientCard | null>(null);
  const [cardUsage, setCardUsage] = useState<any>(null);

  const { cardTypes, refreshCardTypes } = useCardTypes();
  const [selectedCardType, setSelectedCardType] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethods[0]?.value || 'cash');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'grace' | 'expired' | 'unpaid' | 'none'>('all');

  // Modals
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [renewalAmount, setRenewalAmount] = useState<number>(0);
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<string>(paymentMethods[0]?.value || 'cash');
  const [showAdminSettings, setShowAdminSettings] = useState<boolean>(false);
  const [editingCardType, setEditingCardType] = useState<CardType | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Load all patients on mount
  const fetchAllPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    try {
      const result = await patientService.getAllPatients();
      const list: Patient[] = result.patients || (Array.isArray(result) ? result : []);
      setAllPatients(list);
    } catch (err) {
      console.error('Failed to load patients list:', err);
      toast.error('Could not load patient registry');
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPatients();
  }, [fetchAllPatients]);

  // Synchronize card status from backend API
  const synchronizeCardStatus = async (patientId: string): Promise<void> => {
    if (!patientId) return;
    setIsLoadingExistingCard(true);
    try {
      const apiUrl = API_BASE_URL || import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token') || localStorage.getItem('clinic_auth_token');

      const response = await fetch(`${apiUrl}/api/patient-cards?patient=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        setExistingCard(null);
        return;
      }

      const cards = await response.json();
      if (Array.isArray(cards) && cards.length > 0) {
        const activeCard = cards.find(
          (c) => c.status === 'Active' || c.status === PatientCardStatusEnum.ACTIVE
        );
        const graceCard = cards.find(
          (c) => c.status === 'Grace' || c.status === PatientCardStatusEnum.GRACE
        );
        const sortedCards = [...cards].sort(
          (a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
        );

        const current = activeCard || graceCard || sortedCards[0];
        setExistingCard(current);

        if (current) {
          const matching = cardTypes.find((ct) => ct.value === current.type);
          setRenewalAmount(matching?.price || current.amountPaid || 500);
        }
      } else {
        setExistingCard(null);
      }
    } catch (err) {
      console.error('Error synchronizing card status:', err);
    } finally {
      setIsLoadingExistingCard(false);
    }
  };

  // Fetch detailed patient profile & card benefits
  const fetchPatientData = useCallback(
    async (id: string) => {
      if (!id) return;
      setIsLoading(true);
      setIsLoadingExistingCard(true);
      setExistingCard(null);
      setCardUsage(null);

      try {
        const patientDetails = await patientService.getPatientById(id);
        const p = patientDetails?.patient || patientDetails;
        setPatient(p);

        // Fetch card list
        await synchronizeCardStatus(id);

        if ((p as any)?.activeCard) {
          setExistingCard((prev) => prev || (p as any).activeCard);
        }

        // Fetch dynamic usage & benefits
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('clinic_auth_token');
          const usageRes = await axios.get(`${API_BASE_URL}/api/patient-cards/usage/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (usageRes.data && usageRes.data.hasActiveCard) {
            setCardUsage(usageRes.data);
          }
        } catch {
          setCardUsage(null);
        }
      } catch (err) {
        console.error('Error fetching patient data:', err);
        toast.error('Could not load patient profile details');
      } finally {
        setIsLoading(false);
        setIsLoadingExistingCard(false);
      }
    },
    [cardTypes]
  );

  // Check URL param or query
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const idFromQuery = queryParams.get('patientId');
    const targetId = urlPatientId || idFromQuery;
    if (targetId) {
      fetchPatientData(targetId);
    }
  }, [urlPatientId, location.search, fetchPatientData]);

  // Handle patient select
  const handleSelectPatient = (p: Patient) => {
    const id = p._id || (p as any).id;
    if (!id) return;
    if ((p as any).activeCard) {
      setExistingCard((p as any).activeCard);
    }
    navigate(`/app/billing/patient-cards/${id}`);
    fetchPatientData(id);
  };

  // Card status helpers
  const isCardActive = (card: PatientCard | null): boolean => {
    if (!card) return false;
    return (
      card.status === PatientCardStatusEnum.ACTIVE ||
      String(card.status).toLowerCase() === 'active'
    );
  };

  const isCardInGrace = (card: PatientCard | null): boolean => {
    if (!card) return false;
    return (
      card.status === PatientCardStatusEnum.GRACE ||
      String(card.status).toLowerCase() === 'grace'
    );
  };

  // Set default form values when cardTypes load or change
  useEffect(() => {
    if (cardTypes.length > 0 && !selectedCardType) {
      setSelectedCardType(cardTypes[0].value);
      setAmount(cardTypes[0].price);
    }
  }, [cardTypes, selectedCardType]);

  const handleCardTypeSelect = (val: string) => {
    setSelectedCardType(val);
    const ct = cardTypes.find((t) => t.value === val);
    if (ct) {
      setAmount(ct.price);
    }
  };

  // Issue Card
  const handleIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!selectedCardType || amount <= 0 || !paymentMethod) {
      toast.error('Please select a card type and valid payment method.');
      return;
    }

    const backendPaymentMethod = paymentMethodBackendMapping[paymentMethod] || 'Cash';
    const cardData = {
      patient: patient._id,
      type: selectedCardType as any,
      amountPaid: amount,
      paymentMethod: backendPaymentMethod,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastPaymentDate: new Date().toISOString()
    };

    setIsLoading(true);
    try {
      const newCard = await patientCardService.createPatientCard(cardData);
      toast.success(
        `Card ${newCard.cardNumber || ''} successfully issued for ${patient.firstName} ${patient.lastName}!`
      );
      await fetchPatientData(patient._id);
      await fetchAllPatients();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to issue card';
      toast.error(msg);
      await synchronizeCardStatus(patient._id);
    } finally {
      setIsLoading(false);
    }
  };

  // Renew Card
  const handleRenewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingCard || !patient) {
      toast.error('Missing card or patient information');
      return;
    }
    if (renewalAmount <= 0 || !renewalPaymentMethod) {
      toast.error('Please enter a valid renewal amount and payment method.');
      return;
    }

    const backendMethod = paymentMethodBackendMapping[renewalPaymentMethod] || 'Cash';
    setIsLoading(true);
    try {
      await patientCardService.renewPatientCard(existingCard._id, {
        amount: renewalAmount,
        paymentMethod: backendMethod,
        transactionId: null
      });
      toast.success(`Card renewed successfully! New validity period applied.`);
      setShowRenewModal(false);
      await fetchPatientData(patient._id);
      await fetchAllPatients();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Renewal failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter patients in sidebar
  const filteredPatients = useMemo(() => {
    let result = allPatients;
    const q = searchTerm.toLowerCase().trim();

    if (q) {
      result = result.filter((p) => {
        const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
        const id = (p.patientId || p._id || '').toLowerCase();
        const phone = (p.contactNumber || (p as any).phoneNumber || '').toLowerCase();
        return fullName.includes(q) || id.includes(q) || phone.includes(q);
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => {
        const s = getPatientCardStatus(p);
        return s === statusFilter;
      });
    }

    return result;
  }, [allPatients, searchTerm, statusFilter]);

  // Counts for pills
  const counts = useMemo(() => {
    let active = 0;
    let grace = 0;
    let expired = 0;
    let unpaid = 0;
    let none = 0;
    allPatients.forEach((p) => {
      const s = getPatientCardStatus(p);
      if (s === 'active') active++;
      else if (s === 'grace') grace++;
      else if (s === 'expired') expired++;
      else if (s === 'unpaid') unpaid++;
      else none++;
    });
    return { all: allPatients.length, active, grace, expired, unpaid, none };
  }, [allPatients]);

  const currentTheme = getCardGradient(existingCard?.type || selectedCardType || 'Basic');

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Patient Card Management
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Issue membership cards, track benefit consumption, manage renewals & fee clearance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllPatients}
            disabled={isLoadingPatients}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPatients ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdminSettings(true)}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Card Tier Settings</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Patient Directory Search & Registry (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by patient name, ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm rounded-xl pl-9 pr-8 py-2.5 bg-muted/40 border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/50">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'active', label: 'Active', count: counts.active },
              { id: 'grace', label: 'Grace', count: counts.grace },
              { id: 'expired', label: 'Expired', count: counts.expired },
              { id: 'unpaid', label: 'Payment Due', count: counts.unpaid },
              { id: 'none', label: 'No Card', count: counts.none }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label} <span className="opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Patient Scrollable List */}
          <div className="flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-1">
            {isLoadingPatients ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading patient directory...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-muted-foreground">
                No patients match your search criteria.
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = patient && (patient._id === p._id || (patient as any).id === p._id);
                const s = getPatientCardStatus(p);
                const initials = `${(p.firstName || '?')[0]}${(p.lastName || '')[0] || ''}`.toUpperCase();

                let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                let badgeText = 'No Card';

                if (s === 'active') {
                  badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/50';
                  badgeText = 'Active';
                } else if (s === 'grace') {
                  badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/50';
                  const days = (p as any).cardDaysRemaining;
                  badgeText = days !== null && days !== undefined ? `Grace (${days}d)` : 'Grace';
                } else if (s === 'expired') {
                  badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/50';
                  badgeText = 'Expired';
                } else if (s === 'unpaid') {
                  badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300/50';
                  badgeText = 'Payment Due';
                }

                return (
                  <div
                    key={p._id}
                    onClick={() => handleSelectPatient(p)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                        : 'border-border/60 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border/80">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {p.firstName} {p.lastName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">#{p.patientId || p._id.slice(-6)}</span>
                          {p.contactNumber && (
                            <span className="truncate">• {p.contactNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${badgeColor}`}>
                        {badgeText}
                      </span>
                      {p.cardType && (
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">
                          {getCardTypeName(p.cardType)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Card Command Center (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {!patient ? (
            /* Empty State: No patient selected */
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[480px]">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <CreditCard className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-bold text-lg text-foreground">
                  Select a Patient to Manage Membership Card
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Choose a patient from the directory on the left or use the search bar to inspect their existing card, verify health benefit allowances, or issue a brand new membership card.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 w-full max-w-lg text-left">
                {cardTypes.slice(0, 4).map((ct) => (
                  <div key={ct._id || ct.value} className="p-3 rounded-xl border border-border/80 bg-muted/20">
                    <span className="text-xs font-bold text-foreground block">{ct.name}</span>
                    <span className="text-[11px] text-primary font-semibold block mt-0.5">
                      {formatETB(ct.price)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      {ct.validityMonths || 12} Mos. Validity
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Selected Patient Card Dashboard */
            <div className="flex flex-col gap-4">
              {/* Patient Profile Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shrink-0">
                    {patient.firstName[0]}
                    {patient.lastName ? patient.lastName[0] : ''}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-foreground">
                        {patient.firstName} {patient.lastName}
                      </h2>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        #{patient.patientId || patient._id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {patient.gender && <span className="capitalize">{patient.gender}</span>}
                      {patient.age && <span>• {patient.age} yrs old</span>}
                      {patient.contactNumber && <span>• 📞 {patient.contactNumber}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchPatientData(patient._id)}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    title="Reload card details"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExistingCard ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Card Presentation Section */}
              {isLoadingExistingCard ? (
                <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Checking membership card status...</span>
                </div>
              ) : existingCard ? (
                /* Card Exists (Active, Grace, or Expired) */
                <div className="flex flex-col gap-4">
                  {/* Virtual Membership Card Graphic */}
                  <div className="relative group">
                    <div
                      className={`relative w-full aspect-[1.75/1] sm:aspect-[2.1/1] rounded-2xl p-6 sm:p-7 border shadow-xl flex flex-col justify-between overflow-hidden transition-transform duration-300 ${currentTheme.bg}`}
                    >
                      {/* Decorative Background Elements */}
                      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                      <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                      {/* Card Header: Clinic Name + Tier Badge */}
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xs text-white">
                            NL
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold tracking-wider uppercase block text-white/90">
                              New Life Clinic
                            </span>
                            <span className="text-[10px] text-white/70 tracking-widest uppercase block -mt-0.5">
                              Health Membership Card
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${currentTheme.badge}`}
                          >
                            {getCardTypeName(existingCard.type)}
                          </span>
                        </div>
                      </div>

                      {/* Card Mid: Smart Chip + Card Number */}
                      <div className="my-auto z-10 flex items-center gap-4">
                        <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 border border-amber-400/80 shadow-xs flex items-center justify-center">
                          <div className="w-7 h-4 border border-amber-700/40 rounded-xs" />
                        </div>
                        <span className="font-mono text-base sm:text-xl tracking-widest font-bold text-white drop-shadow-sm">
                          {existingCard.cardNumber}
                        </span>
                      </div>

                      {/* Card Footer: Cardholder & Expiration */}
                      <div className="flex items-end justify-between z-10 pt-2 border-t border-white/10">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-white/60 block">
                            Cardholder
                          </span>
                          <span className="font-semibold text-xs sm:text-sm text-white truncate block">
                            {patient.firstName} {patient.lastName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-white/60 block">
                            Valid Thru
                          </span>
                          <span className="font-mono font-semibold text-xs sm:text-sm text-white block">
                            {formatDate(existingCard.expiryDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Status & Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2.5">
                      {isCardActive(existingCard) ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Active Membership</span>
                        </div>
                      ) : isCardInGrace(existingCard) ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Grace Period Active ({existingCard.daysLeftInGrace ?? 7} days left)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-4 h-4" />
                          <span>Card Expired / Inactive</span>
                        </div>
                      )}

                      <span className="text-xs text-muted-foreground">
                        Issued: {formatDate(existingCard.issuedDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => window.print()}
                        variant="outline"
                        className="h-8 px-3 text-xs gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          const matching = cardTypes.find(
                            (ct) =>
                              ct.value === existingCard.type ||
                              ct.value === getCardTypeName(existingCard.type) ||
                              ct.name === getCardTypeName(existingCard.type)
                          );
                          setRenewalAmount(matching?.price || existingCard.amountPaid || 500);
                          setShowRenewModal(true);
                        }}
                        className="h-8 px-3.5 text-xs font-medium gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Renew Card</span>
                      </Button>
                    </div>
                  </div>

                  {/* Card Benefits & Dynamic Utilization Matrix */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm text-foreground">
                          Membership Benefits & Utilization
                        </h4>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Plan: <strong className="text-foreground">{getCardTypeName(existingCard.type)}</strong>
                      </span>
                    </div>

                    {cardUsage ? (
                      <div className="space-y-4">
                        {/* Discount Matrix Grid */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Lab Discount
                            </span>
                            <span className="text-lg font-extrabold text-foreground block mt-0.5">
                              {cardUsage.benefits?.discounts?.lab ?? 0}%
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Service Discount
                            </span>
                            <span className="text-lg font-extrabold text-foreground block mt-0.5">
                              {cardUsage.benefits?.discounts?.service ?? 0}%
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Consultation
                            </span>
                            <span className="text-lg font-extrabold text-foreground block mt-0.5">
                              {cardUsage.benefits?.discounts?.consultation ?? 0}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar 1: Free Lab Tests */}
                        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-1.5 text-foreground">
                              <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                              Free Lab Tests Allowance
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                              {cardUsage.benefits?.labTests?.used ?? 0} / {cardUsage.benefits?.labTests?.allowed ?? 0} Used ({cardUsage.benefits?.labTests?.remaining ?? 0} left)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((cardUsage.benefits?.labTests?.used || 0) /
                                    (cardUsage.benefits?.labTests?.allowed || 1)) *
                                    100
                                )}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Progress Bar 2: Free Consultations */}
                        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-1.5 text-foreground">
                              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                              Free Consultations Allowance
                            </span>
                            <span className="text-blue-700 dark:text-blue-400 font-mono">
                              {cardUsage.benefits?.consultations?.used ?? 0} / {cardUsage.benefits?.consultations?.allowed ?? 0} Used ({cardUsage.benefits?.consultations?.remaining ?? 0} left)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((cardUsage.benefits?.consultations?.used || 0) /
                                    (cardUsage.benefits?.consultations?.allowed || 1)) *
                                    100
                                )}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Consumption Log History */}
                        {cardUsage.usageHistory && cardUsage.usageHistory.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Recent Benefit Usage Logs
                            </span>
                            <div className="rounded-xl border border-border/70 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                                  <tr>
                                    <th className="py-2 px-3 text-left">Invoice #</th>
                                    <th className="py-2 px-3 text-left">Date</th>
                                    <th className="py-2 px-3 text-left">Consumed Services</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                  {cardUsage.usageHistory.slice(0, 5).map((log: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/20">
                                      <td className="py-2 px-3 font-mono font-medium text-primary">
                                        {log.invoiceNumber}
                                      </td>
                                      <td className="py-2 px-3 text-muted-foreground">
                                        {formatDate(log.date)}
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="flex flex-wrap gap-1">
                                          {(log.labs || []).map((l: string, i: number) => (
                                            <span
                                              key={i}
                                              className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px]"
                                            >
                                              🧪 {l}
                                            </span>
                                          ))}
                                          {(log.consultations || []).map((c: string, i: number) => (
                                            <span
                                              key={i}
                                              className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px]"
                                            >
                                              🩺 {c}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Basic Benefits Preview */
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Consultation Benefit</span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {existingCard.benefits?.freeConsultations ?? 0} Free Visits
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Lab Tests Benefit</span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {existingCard.benefits?.freeLabTests ?? 0} Free Tests
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment History */}
                  {existingCard.paymentHistory && existingCard.paymentHistory.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm text-foreground">
                          Card Payment & Renewal History
                        </h4>
                      </div>
                      <div className="rounded-xl border border-border/70 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                            <tr>
                              <th className="py-2.5 px-3 text-left">Date</th>
                              <th className="py-2.5 px-3 text-left">Amount Paid</th>
                              <th className="py-2.5 px-3 text-left">Payment Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {existingCard.paymentHistory.map((pm, idx) => (
                              <tr key={idx} className="hover:bg-muted/20">
                                <td className="py-2 px-3 text-muted-foreground">
                                  {formatDate(pm.paymentDate)}
                                </td>
                                <td className="py-2 px-3 font-semibold text-foreground">
                                  {formatETB(pm.amount)}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium">
                                    {pm.paymentMethod}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* No Active Card Found: Issue New Card Form */
                <form
                  onSubmit={handleIssueCard}
                  className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6"
                >
                  <div className="pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-base text-foreground">
                        Issue New Patient Membership Card
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select an eligible membership tier, verify registration fee, and record payment.
                    </p>
                  </div>

                  {/* Tier Selection Cards */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                      Select Card Tier
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cardTypes.map((tier) => {
                        const isSelected = selectedCardType === tier.value;
                        const tierScheme = getCardGradient(tier.value);
                        return (
                          <div
                            key={tier._id || tier.value}
                            onClick={() => handleCardTypeSelect(tier.value)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm'
                                : 'border-border/70 hover:border-border hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-sm text-foreground block">
                                  {tier.name}
                                </span>
                                <span className="text-xs text-muted-foreground block line-clamp-1 mt-0.5">
                                  {getCardDescription(tier.description) || `${tier.name} Clinic Membership`}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${tierScheme.badge}`}
                              >
                                {tier.value}
                              </span>
                            </div>

                            <div className="flex items-end justify-between pt-2 border-t border-border/50">
                              <div>
                                <span className="text-[10px] text-muted-foreground block">Registration Fee</span>
                                <span className="font-extrabold text-base text-primary">
                                  {formatETB(tier.price)}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {tier.validityMonths || 12} Months
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Card Fee Amount (ETB)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        readOnly={!isAdmin}
                        className="w-full text-sm font-semibold rounded-xl px-3.5 py-2.5 bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      />
                      {!isAdmin && (
                        <span className="text-[11px] text-muted-foreground block">
                          Standard price determined by tier.
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/60">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Total Collection</span>
                      <span className="font-bold text-base text-foreground">
                        {formatETB(amount)}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || amount <= 0 || !selectedCardType}
                      className="h-10 px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isLoading ? 'Processing...' : 'Confirm & Issue Card'}</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Renew Card Modal */}
      {showRenewModal && existingCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-base">Renew Patient Card</h3>
                  <p className="text-xs text-white/80">Card #{existingCard.cardNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRenewModal(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenewCard} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-semibold text-foreground">
                    {patient?.firstName} {patient?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card Tier:</span>
                  <span className="font-semibold text-foreground">{getCardTypeName(existingCard.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Expiration:</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(existingCard.expiryDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Renewal Amount (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={renewalAmount}
                  onChange={(e) => setRenewalAmount(parseFloat(e.target.value) || 0)}
                  readOnly={!isAdmin}
                  className="w-full text-sm font-semibold rounded-xl px-3.5 py-2.5 bg-muted/40 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Payment Method
                </label>
                <select
                  value={renewalPaymentMethod}
                  onChange={(e) => setRenewalPaymentMethod(e.target.value)}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isLoading || renewalAmount <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 h-9"
                >
                  {isLoading ? 'Processing...' : 'Confirm Renewal (+1 Year)'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Settings Drawer / Modal */}
      {showAdminSettings && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-base">Membership Tier Settings</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure standard pricing and validity for clinic card packages
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdminSettings(false);
                  setEditingCardType(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {cardTypes.map((tier) => (
                <div
                  key={tier._id || tier.value}
                  className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">{tier.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                        {tier.value}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getCardDescription(tier.description) || `${tier.name} membership with standard benefits`}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-semibold text-foreground mt-2">
                      <span>Fee: {formatETB(tier.price)}</span>
                      <span>•</span>
                      <span>Validity: {tier.validityMonths || 12} Months</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCardType(tier)}
                    className="h-8 text-xs shrink-0"
                  >
                    Edit Tier
                  </Button>
                </div>
              ))}

              {editingCardType && (
                <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-3 mt-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary">
                    Update {editingCardType.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">Price (ETB)</label>
                      <input
                        type="number"
                        value={editingCardType.price}
                        onChange={(e) =>
                          setEditingCardType({
                            ...editingCardType,
                            price: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-full rounded-lg border border-border px-3 py-1.5 bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Validity (Months)</label>
                      <input
                        type="number"
                        value={editingCardType.validityMonths || 12}
                        onChange={(e) =>
                          setEditingCardType({
                            ...editingCardType,
                            validityMonths: parseInt(e.target.value, 10) || 12
                          })
                        }
                        className="w-full rounded-lg border border-border px-3 py-1.5 bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCardType(null)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await cardTypeService.updateCardType({
                            _id: editingCardType._id,
                            name: editingCardType.name,
                            value: editingCardType.value,
                            price: editingCardType.price,
                            validityMonths: editingCardType.validityMonths || 12,
                            isActive: true
                          });
                          toast.success(`${editingCardType.name} updated successfully!`);
                          setEditingCardType(null);
                          await refreshCardTypes();
                        } catch {
                          toast.error('Failed to update tier');
                        }
                      }}
                      className="h-8 text-xs bg-primary text-primary-foreground font-semibold"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdminSettings(false)}
                className="text-xs h-8"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCardManagement;
