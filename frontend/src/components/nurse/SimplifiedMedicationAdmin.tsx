import React, { useState, useEffect } from 'react';
import {
  Pill, User, Clock, CheckCircle, AlertCircle, Calendar,
  Activity, ChevronRight, RefreshCw, Shield, Zap, TrendingUp
} from 'lucide-react';
import { format, addDays, isToday } from 'date-fns';
import { toast } from 'react-toastify';
import { medicationAdministrationService } from '../../services/medicationAdministrationService';
import { canAdministerDoseSequentially } from '../../pages/Nurse/SequentialDosingLogic';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import patientService from '../../services/patientService';

interface DoseStatus {
  day: number;
  date: Date;
  timeSlot: string;
  slotIndex: number;
  administered: boolean;
  administeredAt?: string;
  administeredBy?: string;
  notes?: string;
  isToday: boolean;
  isOverdue: boolean;
  paymentAuthorized: boolean;
  frequency: string;
  doseLabel?: string;
  doseSequence?: number;
}

interface SimplifiedMedicationAdminProps {
  task: any;
  onRefresh?: (taskId?: string) => void;
  displayName?: string;
  allTasks?: any[];
  hidePaymentBadge?: boolean;
}

const SimplifiedMedicationAdmin: React.FC<SimplifiedMedicationAdminProps> = ({
  task, onRefresh, displayName, allTasks = [], hidePaymentBadge = false
}) => {
  const { isAuthenticated, getToken } = useAuth();
  const [doseStatuses, setDoseStatuses] = useState<DoseStatus[]>([]);
  const [administering, setAdministering] = useState<string>('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [patientData, setPatientData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const medicationName = task?.medicationDetails?.medicationName || 'Unknown Medication';
  const patientName = task?.patientName || 'Unknown Patient';
  const dosage = task?.medicationDetails?.dosage || 'As directed';
  const frequency = task?.medicationDetails?.frequency || 'Once daily';
  const route = task?.medicationDetails?.route || 'Oral';
  const displayMedicationName = displayName || medicationName;

  const prescriptionDependencies = task?.prescriptionDependencies;
  const isBlocked = prescriptionDependencies?.isBlocked || false;
  const blockReason = prescriptionDependencies?.blockReason || '';
  const dependencies = prescriptionDependencies?.dependsOn || [];

  if (!task || !task.medicationDetails) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-destructive/60" />
        <h3 className="text-base font-semibold text-destructive mb-1">Invalid Task Data</h3>
        <p className="text-sm text-destructive/70">Medication task data is missing or corrupted.</p>
      </div>
    );
  }

  const fetchPatientData = async () => {
    const patientId = task?.patientId || task?.patient?._id;
    if (!patientId) return;
    try {
      const response = await patientService.getPatientById(patientId);
      if (response) setPatientData(response);
    } catch (_) {}
  };

  const fetchPaymentData = async () => {
    setLoadingPayment(true);
    try {
      const patientId = task?.patientId || task?.patient?._id;
      const prescriptionId = task?.prescriptionId;
      if (patientId && medicationName) {
        const idToUse = prescriptionId || patientId;
        const encodedMedicationName = encodeURIComponent(medicationName);
        const response = await api.get(
          `/api/medication-payment-status/medication/${idToUse}/${encodedMedicationName}?_t=${Date.now()}`
        );
        if (response.data?.success && response.data?.data) {
          setPaymentData(response.data.data);
        } else {
          const fallback = task?.paymentAuthorization;
          setPaymentData(fallback ? {
            medicationName,
            paymentStatus: fallback.paymentStatus || 'unpaid',
            outstandingAmount: fallback.outstandingAmount || 0,
            totalPaid: fallback.totalPaid || 0,
            totalCost: fallback.totalCost || 0,
            source: 'fallback'
          } : { medicationName, paymentStatus: 'no_data', outstandingAmount: 0, totalPaid: 0, totalCost: 0 });
        }
      }
    } catch (_) {
      const fallback = task?.paymentAuthorization;
      setPaymentData(fallback ? {
        medicationName,
        paymentStatus: fallback.paymentStatus || 'unpaid',
        outstandingAmount: fallback.outstandingAmount || 0,
        totalPaid: fallback.totalPaid || 0,
        totalCost: fallback.totalCost || 0,
        source: 'fallback'
      } : { medicationName, paymentStatus: 'no_data', outstandingAmount: 0, totalPaid: 0, totalCost: 0 });
    } finally {
      setLoadingPayment(false);
    }
  };

  const taskId = task?._id || task?.id;

  useEffect(() => {
    generateDoseStatuses();
  }, [task]);

  useEffect(() => {
    fetchPaymentData();
    fetchPatientData();
  }, [taskId]);

  const getDosesPerDay = (freq: string) => {
    if (!freq) return 1;
    const f = freq.toLowerCase().trim();
    if (f.includes('qid') || f.includes('four times') || f.includes('4x')) return 4;
    if (f.includes('tid') || f.includes('three times') || f.includes('thrice') || f.includes('3x')) return 3;
    if (f.includes('bid') || f.includes('twice') || f.includes('2x')) return 2;
    if (f.includes('qd') || f.includes('once') || f.includes('daily') || f.includes('1x')) return 1;
    const match = f.match(/(\d+)\s*times?/);
    if (match) return parseInt(match[1], 10);
    return 1;
  };

  const getTimeSlots = (freq: string) => {
    const dpd = getDosesPerDay(freq);
    switch (dpd) {
      case 1: return ['09:00'];
      case 2: return ['09:00', '21:00'];
      case 3: return ['08:00', '14:00', '20:00'];
      case 4: return ['06:00', '12:00', '18:00', '24:00'];
      default: {
        const times = [];
        const interval = 24 / dpd;
        for (let i = 0; i < dpd; i++) {
          const hour = Math.floor(9 + i * interval) % 24;
          times.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return times;
      }
    }
  };

  const generateDoseStatuses = () => {
    if (!task?.medicationDetails) return;
    const medDetails = task.medicationDetails;
    const duration = medDetails.duration;
    const doseRecords = medDetails.doseRecords || [];
    const statuses: DoseStatus[] = [];
    const today = new Date();
    const startDate = new Date(task.createdAt || Date.now());

    if (doseRecords.length > 0) {
      doseRecords.forEach((record: any) => {
        const doseDate = addDays(startDate, record.day - 1);
        statuses.push({
          day: record.day,
          date: doseDate,
          timeSlot: record.timeSlot,
          slotIndex: record.slotIndex || 0,
          administered: record.administered || false,
          administeredAt: record.administeredAt,
          administeredBy: record.administeredBy,
          notes: record.notes,
          isToday: isToday(doseDate),
          isOverdue: doseDate < today && !record.administered,
          paymentAuthorized: true,
          frequency: medDetails.frequency,
          doseLabel: record.doseLabel,
          doseSequence: record.doseSequence
        });
      });
    } else {
      let durationDays = 5;
      if (duration) {
        if (typeof duration === 'number') durationDays = duration;
        else if (typeof duration === 'string') {
          const match = duration.match(/(\d+)/);
          if (match) durationDays = parseInt(match[1], 10);
        }
      }
      for (let day = 1; day <= durationDays; day++) {
        const doseDate = addDays(startDate, day - 1);
        const timeSlots = getTimeSlots(frequency);
        timeSlots.forEach((timeSlot, slotIndex) => {
          statuses.push({
            day, date: doseDate, timeSlot, slotIndex,
            administered: false, administeredAt: undefined, administeredBy: undefined, notes: '',
            isToday: isToday(doseDate), isOverdue: doseDate < today,
            paymentAuthorized: true, frequency,
            doseLabel: `${day}-${timeSlot}`, doseSequence: day
          });
        });
      }
    }
    setDoseStatuses(statuses);
  };

  const handleDoseAdministration = async (day: number, timeSlot: string) => {
    const doseKey = `${day}-${timeSlot}`;
    if (administering !== '') { toast.info('Please wait for the current dose to complete.'); return; }
    const attempts = failedAttempts[doseKey] || 0;
    if (attempts >= 3) { toast.error('Too many failed attempts. Please refresh the page.'); return; }
    const existingDose = doseStatuses.find(d => d.day === day && d.timeSlot === timeSlot);
    if (existingDose?.administered) { toast.warning('This dose has already been administered.'); return; }

    setAdministering(doseKey);
    setDoseStatuses(prev => prev.map(dose =>
      dose.day === day && dose.timeSlot === timeSlot
        ? { ...dose, administered: true, administeredAt: new Date().toISOString() }
        : dose
    ));

    try {
      if (!isAuthenticated || !authService.isAuthenticated()) throw new Error('You are not logged in. Please log in and try again.');
      const token = getToken();
      if (!token) throw new Error('You are not logged in. Please log in and try again.');

      try {
        const doseStatus = await medicationAdministrationService.getDoseStatus(task._id || task.id, day, timeSlot);
        if (doseStatus.data?.administered) {
          setDoseStatuses(prev => prev.map(dose =>
            dose.day === day && dose.timeSlot === timeSlot
              ? { ...dose, administered: true, administeredAt: doseStatus.data.administeredAt, administeredBy: doseStatus.data.administeredBy }
              : dose
          ));
          setAdministering('');
          toast.info('✓ This dose was already administered.');
          if (onRefresh) onRefresh(task._id || task.id);
          return;
        }
      } catch (_) {}

      const normalizedMedicationDetails = {
        medicationName,
        instanceOrder: task?.medicationDetails?.instanceOrder || 1,
        instanceLabel: task?.medicationDetails?.instanceLabel || '1st'
      };
      const sequentialCheck = canAdministerDoseSequentially(task, allTasks, normalizedMedicationDetails);
      if (!sequentialCheck.canAdminister) throw new Error(sequentialCheck.reason || 'Cannot administer this dose yet');

      let userStr = localStorage.getItem('user_data') || localStorage.getItem('user') || localStorage.getItem('USER_DATA_KEY');
      if (!userStr) {
        try {
          const payload = token.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          const userData = {
            id: decoded.userId || decoded.id || decoded.user_id,
            _id: decoded.userId || decoded.id || decoded.user_id,
            email: decoded.email || 'user@clinic.com',
            name: decoded.name || 'User',
            role: decoded.role || 'nurse',
            firstName: decoded.firstName || decoded.first_name || 'User',
            lastName: decoded.lastName || decoded.last_name || 'Name'
          };
          localStorage.setItem('user_data', JSON.stringify(userData));
          if (!['nurse', 'admin', 'doctor'].includes(userData.role)) throw new Error(`Access denied. Role '${userData.role}' not permitted.`);
        } catch (e) { throw new Error('Unable to verify user permissions. Please log in again.'); }
      }

      const response = await medicationAdministrationService.administerDose({
        taskId: task._id || task.id, day, timeSlot, notes: 'Administered via nurse interface'
      });

      setFailedAttempts(prev => { const u = { ...prev }; delete u[doseKey]; return u; });
      setDoseStatuses(prev => prev.map(dose =>
        dose.day === day && dose.timeSlot === timeSlot
          ? { ...dose, administered: true, administeredAt: new Date().toISOString(), administeredBy: 'Current User' }
          : dose
      ));
      setForceUpdate(prev => prev + 1);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);

      if (response.data.inventoryDeducted) {
        toast.success(`Dose administered & inventory updated`);
      } else {
        toast.success(`Dose administered successfully`);
      }
      if (onRefresh) onRefresh(task._id || task.id);
    } catch (error: any) {
      setDoseStatuses(prev => prev.map(dose =>
        dose.day === day && dose.timeSlot === timeSlot
          ? { ...dose, administered: false, administeredAt: undefined }
          : dose
      ));
      const msg = error.message || 'Failed to administer dose.';
      if (msg.includes('already been administered') || msg.includes('DOSE_ALREADY_ADMINISTERED')) {
        setFailedAttempts(prev => ({ ...prev, [doseKey]: (prev[doseKey] || 0) + 1 }));
        if (onRefresh) onRefresh(task._id || task.id);
        toast.warning('This dose has already been administered. Refreshing...');
      } else if (msg.includes('not logged in')) {
        toast.error('Authentication Error: Please log in again.');
      } else if (msg.includes('Access denied')) {
        toast.error('Permission Error: You do not have permission to administer medications.');
      } else if (msg.includes('Payment required')) {
        toast.error('Payment Required: Please collect payment before administering.');
      } else if (msg.includes('Inventory') || msg.includes('Insufficient stock')) {
        toast.error(`Inventory Error: ${medicationName} not available in stock.`);
      } else {
        toast.error(`Error: ${msg}`);
      }
    } finally {
      setAdministering('');
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) onRefresh(task._id || task.id);
    await fetchPaymentData();
    setRefreshing(false);
    toast.success('Refreshed');
  };

  const [fixingDoses, setFixingDoses] = useState(false);
  const handleFixDoses = async () => {
    const taskId = task._id || task.id;
    if (!taskId) return;
    setFixingDoses(true);
    try {
      const res = await api.post(`/api/nurse-tasks/${taskId}/fix-doses`, {});
      if (res.data?.success) {
          if (res.data.changed) {
          toast.success(`Fixed: ${res.data.oldDoses} → ${res.data.newDoses} doses`);
          if (onRefresh) onRefresh(task._id || task.id);
        } else {
          toast.info(res.data.message || 'Dose records already correct');
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fix doses');
    } finally {
      setFixingDoses(false);
    }
  };

  const getProgressPercentage = () => {
    const total = doseStatuses.length;
    const done = doseStatuses.filter(d => d.administered).length;
    return total > 0 ? (done / total) * 100 : 0;
  };

  const groupDosesByDay = (doses: DoseStatus[]) =>
    doses.reduce((groups, dose) => {
      const key = dose.day.toString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(dose);
      return groups;
    }, {} as Record<string, DoseStatus[]>);

  const checkPrescriptionSequentialBlocking = () => {
    const order = task?.medicationDetails?.instanceOrder || 1;
    if (order <= 1) return { isBlocked: false, reason: '' };
    const check = canAdministerDoseSequentially(task, allTasks, {
      medicationName, instanceOrder: order,
      instanceLabel: task?.medicationDetails?.instanceLabel || `${order}th`
    });
    return { isBlocked: !check.canAdminister, reason: check.reason || '' };
  };

  const prescriptionSequentialBlock = checkPrescriptionSequentialBlocking();
  const dosesPerDay = getDosesPerDay(frequency);
  const totalDays = Math.ceil(doseStatuses.length / dosesPerDay);
  const administeredCount = doseStatuses.filter(d => d.administered).length;
  const progress = getProgressPercentage();

  const freqLabel = dosesPerDay === 4 ? 'QID (4× daily)' :
    dosesPerDay === 3 ? 'TID (3× daily)' :
    dosesPerDay === 2 ? 'BID (2× daily)' : 'QD (once daily)';

  const freqAbbrev = dosesPerDay === 4 ? 'QID' : dosesPerDay === 3 ? 'TID' : dosesPerDay === 2 ? 'BID' : 'QD';

  // ─── Payment badge ───────────────────────────────────────────────────────────
  const paymentStatus = paymentData?.paymentStatus;
  const paymentBadge = paymentStatus === 'fully_paid'
    ? { label: 'Fully Paid', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
    : paymentStatus === 'partially_paid'
    ? { label: 'Partially Paid', bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
    : paymentStatus === 'no_data'
    ? { label: 'No Data', bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' }
    : { label: 'Unpaid', bg: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };

  // ─── Dose button renderer ────────────────────────────────────────────────────
  const renderDoseButton = (dose: DoseStatus) => {
    const doseKey = `${dose.day}-${dose.timeSlot}`;
    const isAdministering = administering === doseKey;
    const isAnyAdministering = administering !== '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const doseDate = new Date(dose.date); doseDate.setHours(0, 0, 0, 0);
    const isFuture = doseDate > today;
    // Block dose if the patient hasn't paid for this day's dose yet.
    // paidDoses tells us how many doses are covered by the current payment.
    // If paidDoses is available, block any dose whose sequence > paidDoses.
    // If no payment at all (unpaid), block everything.
    const paidDoses: number = paymentData?.paidDoses ?? (paymentData?.paymentStatus === 'fully_paid' ? 999 : 0);
    const doseSequence: number = dose.doseSequence ?? dose.day ?? 1;
    const isPaymentBlocked = paymentData !== null &&
      paymentData.totalCost > 0 &&
      doseSequence > paidDoses;
    const isDisabled = dose.administered || isAdministering || prescriptionSequentialBlock.isBlocked ||
      isFuture || isPaymentBlocked || (isAnyAdministering && !isAdministering);

    const dateStr = format(dose.date, 'MMM d');

    if (dose.administered) {
      return (
        <div
          key={doseKey}
          title={`✅ Administered at ${dose.timeSlot}${dose.administeredAt ? ' on ' + format(new Date(dose.administeredAt), 'MMM d') : ''}`}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-emerald-500 shadow-sm shadow-emerald-200 cursor-default select-none"
        >
          <CheckCircle size={18} className="text-white" />
          <span className="text-[10px] text-white font-semibold mt-0.5">{dose.timeSlot}</span>
        </div>
      );
    }

    if (isAdministering) {
      return (
        <div key={doseKey} className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border-2 border-primary/30 cursor-wait">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
        </div>
      );
    }

    if (prescriptionSequentialBlock.isBlocked) {
      return (
        <div key={doseKey} title={prescriptionSequentialBlock.reason}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 cursor-not-allowed select-none">
          <Clock size={16} className="text-slate-400" />
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">Wait</span>
        </div>
      );
    }

    if (isFuture) {
      return (
        <div key={doseKey} title={`Scheduled for ${dateStr} at ${dose.timeSlot}`}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-50 border border-dashed border-slate-300 cursor-not-allowed select-none">
          <Calendar size={14} className="text-slate-300" />
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">{dose.timeSlot}</span>
        </div>
      );
    }

    if (isPaymentBlocked) {
      const paidDosesCount: number = paymentData?.paidDoses ?? 0;
      const costPerDose: number = paymentData?.costPerDose ?? 0;
      const tipMsg = paidDosesCount === 0
        ? `No payment recorded — patient must pay at least 1 dose (${costPerDose > 0 ? costPerDose + ' ETB' : 'required'}) to administer`
        : `Day ${doseSequence} not yet paid — patient has paid for ${paidDosesCount} dose(s). Pay ${costPerDose > 0 ? costPerDose + ' ETB' : 'more'} to unlock this dose.`;
      return (
        <div key={doseKey} title={tipMsg}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-red-50 border border-red-200 cursor-not-allowed select-none">
          <Shield size={14} className="text-red-400" />
          <span className="text-[10px] text-red-400 font-medium mt-0.5">Day {doseSequence}</span>
        </div>
      );
    }

    // Available to administer
    const isOverdue = dose.isOverdue;
    const isNow = dose.isToday;

    return (
      <button
        key={doseKey}
        title={isNow ? `Give ${dose.timeSlot} dose today` : isOverdue ? `Overdue: ${dose.timeSlot} from ${dateStr}` : `${dose.timeSlot} on ${dateStr}`}
        onClick={() => handleDoseAdministration(dose.day, dose.timeSlot)}
        disabled={isDisabled}
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all duration-150 cursor-pointer select-none
          ${isNow
            ? 'bg-primary border-primary text-white shadow-md shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95'
            : isOverdue
            ? 'bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100 hover:scale-105 active:scale-95'
            : 'bg-white border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-primary/5 hover:scale-105 active:scale-95'
          }`}
      >
        <Pill size={16} className={isNow ? 'text-white' : isOverdue ? 'text-amber-500' : 'text-slate-400'} />
        <span className={`text-[10px] font-semibold mt-0.5 ${isNow ? 'text-white' : isOverdue ? 'text-amber-600' : 'text-slate-400'}`}>
          {dose.timeSlot}
        </span>
      </button>
    );
  };

  // ─── Day column renderer ─────────────────────────────────────────────────────
  const renderDayBox = (day: number, dayDoses: DoseStatus[]) => {
    const allDone = dayDoses.every(d => d.administered);
    const hasToday = dayDoses.some(d => d.isToday);
    const hasOverdue = dayDoses.some(d => d.isOverdue);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const doseDate = new Date(dayDoses[0]?.date); doseDate.setHours(0, 0, 0, 0);
    const isFuture = doseDate > today;

    return (
      <div
        key={day}
        className={`flex flex-col items-center rounded-2xl p-3 border transition-all
          ${allDone
            ? 'bg-emerald-50 border-emerald-200'
            : isFuture
            ? 'bg-slate-50 border-slate-200 opacity-60'
            : hasToday
            ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20'
            : hasOverdue
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-slate-100'
          }`}
      >
        {/* Day label */}
        <div className="text-center mb-2">
          <div className={`text-xs font-bold ${allDone ? 'text-emerald-600' : hasToday ? 'text-primary' : hasOverdue ? 'text-amber-600' : 'text-slate-500'}`}>
            Day {day}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">{format(dayDoses[0].date, 'MMM d')}</div>
          <div className={`text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block
            ${allDone ? 'bg-emerald-100 text-emerald-600' : hasToday ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
            {freqAbbrev}
          </div>
        </div>
        {/* Dose buttons */}
        <div className="flex flex-wrap justify-center gap-1">
          {dayDoses.map(dose => renderDoseButton(dose))}
        </div>
        {/* Status tag */}
        {allDone && (
          <div className="mt-2 text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
            <CheckCircle size={10} /> Done
          </div>
        )}
        {isFuture && !allDone && (
          <div className="mt-2 text-[10px] font-medium text-slate-400">Upcoming</div>
        )}
        {hasOverdue && !allDone && !isFuture && (
          <div className="mt-2 text-[10px] font-semibold text-amber-600">Overdue</div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Top accent bar ───────────────────────────────────────────────────── */}
      <div className={`h-1 w-full ${progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-primary' : 'bg-slate-200'}`} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {/* Icon */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm
            ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}>
            <Pill size={22} className="text-white" />
          </div>

          {/* Title & meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-800 leading-tight">{displayMedicationName}</h3>
              {showSuccessAnimation && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-bounce">
                  <CheckCircle size={12} /> Administered!
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User size={13} className="text-slate-400" />
                <span className="font-medium text-slate-700">{patientName}</span>
                {patientData && (
                  <span className="text-slate-400 text-xs">
                    · {patientData.age ? `${patientData.age}y` : '—'}, {patientData.gender || '—'}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={13} className="text-slate-400" />
                <span>{freqLabel}</span>
              </span>
              <span className="flex items-center gap-1">
                <Zap size={13} className="text-slate-400" />
                <span>{dosage}</span>
              </span>
              <span className="flex items-center gap-1">
                <ChevronRight size={13} className="text-slate-400" />
                <span>{route}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Progress ring + refresh */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold leading-none ${progress === 100 ? 'text-emerald-600' : 'text-primary'}`}>
              {Math.round(progress)}%
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{administeredCount}/{doseStatuses.length} doses</div>
          </div>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div className="px-6 mb-4">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Info pills row ───────────────────────────────────────────────────── */}
      <div className="px-6 mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
          <Calendar size={12} /> {totalDays} days
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
          <TrendingUp size={12} /> {freqLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
          <Pill size={12} /> {route}
        </span>

        {/* Payment badge — hidden when summary is shown at the top */}
        {!hidePaymentBadge && !loadingPayment && paymentData && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-full ${paymentBadge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${paymentBadge.dot}`} />
            {paymentBadge.label}
            {paymentData.paymentStatus === 'fully_paid' && paymentData.totalCost > 0 && (
              <span className="ml-1 opacity-80">· {paymentData.totalCost.toFixed(2)} ETB</span>
            )}
            {paymentData.paymentStatus === 'partially_paid' && paymentData.totalCost > 0 && (
              <span className="ml-1 opacity-80">
                · {(paymentData.totalPaid || 0).toFixed(2)} / {paymentData.totalCost.toFixed(2)} ETB
              </span>
            )}
            {paymentData.paymentStatus === 'unpaid' && paymentData.totalCost > 0 && (
              <span className="ml-1 opacity-80">· {paymentData.totalCost.toFixed(2)} ETB</span>
            )}
          </span>
        )}
        {!hidePaymentBadge && loadingPayment && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
            <div className="w-3 h-3 rounded-full border border-slate-300 border-t-transparent animate-spin" />
            Payment...
          </span>
        )}
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      {/* Per-dose payment alerts */}
      {!hidePaymentBadge && paymentData && paymentData.paymentStatus === 'partially_paid' && paymentData.paidDoses >= 0 && (
        <div className="mx-6 mb-4 flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-semibold mb-0.5">Partial Payment</div>
            <div className="text-amber-600">
              {paymentData.paidDoses} of {paymentData.totalDoses} dose(s) paid
              {paymentData.costPerDose > 0 && ` · ${paymentData.costPerDose} ETB/dose`}.
              {' '}Days 1–{paymentData.paidDoses} are unlocked. Pay {paymentData.costPerDose > 0 ? paymentData.costPerDose + ' ETB' : 'more'} to unlock the next dose.
            </div>
          </div>
        </div>
      )}
      {!hidePaymentBadge && paymentData && paymentData.paymentStatus === 'unpaid' && paymentData.totalCost > 0 && (
        <div className="mx-6 mb-4 flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <Shield size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-semibold mb-0.5">Payment Required</div>
            <div className="text-red-600">
              No payment recorded. Patient must pay at least 1 dose
              {paymentData.costPerDose > 0 ? ` (${paymentData.costPerDose} ETB)` : ''} before administration can begin.
            </div>
          </div>
        </div>
      )}

      {isBlocked && dependencies.length > 0 && (
        <div className="mx-6 mb-4 flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-semibold mb-0.5">Prescription Blocked</div>
            <div className="text-red-600">{blockReason}</div>
          </div>
        </div>
      )}

      {prescriptionSequentialBlock.isBlocked && (
        <div className="mx-6 mb-4 flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <Clock size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-semibold mb-0.5">Sequential Dosing Required</div>
            <div className="text-amber-600">{prescriptionSequentialBlock.reason}</div>
          </div>
        </div>
      )}

      {/* ── Dose grid ───────────────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">
            Prescription Schedule
            <span className="ml-2 text-xs font-normal text-slate-400">({doseStatuses.length} total doses)</span>
          </h4>
          {administeredCount > 0 && administeredCount < doseStatuses.length && (
            <span className="text-xs text-primary font-medium">{doseStatuses.length - administeredCount} remaining</span>
          )}
          {administeredCount === doseStatuses.length && doseStatuses.length > 0 && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> All doses complete
            </span>
          )}
        </div>

        {loadingPayment ? (
          <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
            <span className="text-sm">Checking payment status...</span>
          </div>
        ) : doseStatuses.length === 0 ? (
          <div className="text-center py-10">
            <Pill size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">No doses scheduled for this prescription.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Object.entries(groupDosesByDay(doseStatuses)).map(([day, dayDoses]) =>
              renderDayBox(parseInt(day), dayDoses)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifiedMedicationAdmin;
