import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Search,
  RefreshCw,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  Scale,
  Ruler,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  X,
  ChevronLeft,
  BarChart2,
  Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import patientService, { Patient } from '../../services/patientService';
import vitalSignsService from '../../services/vitalSignsService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VitalsForm {
  temperature: string;
  bloodPressure: string;
  heartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  bloodSugar: string;
  pain: string;
  weight: string;
  height: string;
  bmi: string;
}

type VitalStatus = 'normal' | 'warning' | 'critical';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getVitalStatus = (type: string, value: string): VitalStatus => {
  if (!value) return 'normal';
  switch (type) {
    case 'temperature': {
      const v = parseFloat(value);
      if (v < 35 || v > 39) return 'critical';
      if (v < 36.5 || v > 37.5) return 'warning';
      return 'normal';
    }
    case 'bloodPressure': {
      const parts = value.split('/').map(Number);
      const [s, d] = parts;
      if (!s || !d) return 'normal';
      if (s < 90 || s > 180 || d < 60 || d > 110) return 'critical';
      if (s < 100 || s > 140 || d < 70 || d > 90) return 'warning';
      return 'normal';
    }
    case 'heartRate': {
      const v = parseInt(value);
      if (v < 50 || v > 120) return 'critical';
      if (v < 60 || v > 100) return 'warning';
      return 'normal';
    }
    case 'respiratoryRate': {
      const v = parseInt(value);
      if (v < 8 || v > 25) return 'critical';
      if (v < 12 || v > 20) return 'warning';
      return 'normal';
    }
    case 'oxygenSaturation': {
      const v = parseInt(value);
      if (v < 90) return 'critical';
      if (v < 95) return 'warning';
      return 'normal';
    }
    case 'bloodSugar': {
      const v = parseFloat(value);
      if (v < 60 || v > 400) return 'critical';
      if (v < 70 || v > 180) return 'warning';
      return 'normal';
    }
    case 'pain': {
      const v = parseInt(value);
      if (v > 7) return 'critical';
      if (v > 4) return 'warning';
      return 'normal';
    }
    default:
      return 'normal';
  }
};

const statusColors: Record<VitalStatus, { border: string; bg: string; text: string; badge: string }> = {
  normal:   { border: 'border-emerald-400/40', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  warning:  { border: 'border-amber-400/60',   bg: 'bg-amber-50 dark:bg-amber-950/20',     text: 'text-amber-700 dark:text-amber-400',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  critical: { border: 'border-red-500/70',     bg: 'bg-red-50 dark:bg-red-950/20',         text: 'text-red-700 dark:text-red-400',       badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

const getBMIClassification = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' };
  if (bmi < 25)   return { label: 'Normal',      color: 'text-emerald-600' };
  if (bmi < 30)   return { label: 'Overweight',  color: 'text-amber-600' };
  if (bmi < 35)   return { label: 'Obese I',     color: 'text-orange-600' };
  return              { label: 'Obese II+',   color: 'text-red-600' };
};

const emptyForm = (): VitalsForm => ({
  temperature: '', bloodPressure: '', heartRate: '', respiratoryRate: '',
  oxygenSaturation: '', bloodSugar: '', pain: '', weight: '', height: '', bmi: '',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

interface VitalInputProps {
  id: string;
  label: string;
  unit: string;
  placeholder: string;
  hint: string;
  icon: React.ReactNode;
  value: string;
  statusKey: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
  type?: string;
}

const VitalInput: React.FC<VitalInputProps> = ({
  id, label, unit, placeholder, hint, icon, value, statusKey, onChange, readOnly, type = 'text'
}) => {
  const status = getVitalStatus(statusKey, value);
  const colors = statusColors[status];

  return (
    <div className={`rounded-xl border-2 p-3 transition-all duration-200 ${value ? colors.border : 'border-border/40'} ${value ? colors.bg : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`${value ? colors.text : 'text-muted-foreground'}`}>{icon}</span>
          <label htmlFor={id} className="text-xs font-semibold text-foreground">{label}</label>
        </div>
        {value && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
            {status === 'normal' ? '✓ Normal' : status === 'warning' ? '⚠ Warning' : '⚠ Critical'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`h-9 text-sm font-medium bg-background/80 border-border/50 focus:border-primary/60 ${readOnly ? 'cursor-default text-muted-foreground' : ''}`}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">{unit}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RecordVitalsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<VitalsForm>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPatientId, setLoadingPatientId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const pageSize = 10;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await patientService.getAllPatients(true);
      const list: Patient[] = Array.isArray(data)
        ? data
        : (data as any)?.patients ?? (data as any)?.data ?? [];
      // Sort: Admitted patients (just sent from reception) first, then by creation date
      const sorted = [...list].sort((a, b) => {
        const aAdmitted = (a as any).status === 'Admitted' ? 0 : 1;
        const bAdmitted = (b as any).status === 'Admitted' ? 0 : 1;
        return aAdmitted - bAdmitted;
      });
      setPatients(sorted);
      setFilteredPatients(sorted);
    } catch {
      toast({ title: 'Error', description: 'Failed to load patients', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredPatients(
      patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
        (p.id || '').toLowerCase().includes(term) ||
        (p.contactNumber || '').includes(searchTerm)
      )
    );
    setCurrentPage(1);
  }, [searchTerm, patients]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
    setCurrentPage(prev => Math.min(prev, totalPages));
  }, [filteredPatients.length]);

  // ── Patient selection ──────────────────────────────────────────────────────

  const handleSelectPatient = async (patient: Patient) => {
    setLoadingPatientId(patient.id || patient._id || '');
    try {
      const toStr = (v: any) => (v !== undefined && v !== null ? String(v) : '');

      // Check if the patient has current vitals recorded for this visit.
      // Reception resets vitals to {} when re-sending a returning patient,
      // so we treat an empty/missing vitals object as a brand-new recording session.
      const currentVitals = patient.vitals;
      const hasCurrentVitals = !!(
        currentVitals &&
        (currentVitals.temperature || currentVitals.heartRate || currentVitals.bloodPressure)
      );

      if (hasCurrentVitals) {
        // Patient already has vitals for this visit — pre-fill so the nurse can update them.
        setForm({
          temperature:      toStr(currentVitals!.temperature),
          bloodPressure:    toStr(currentVitals!.bloodPressure),
          heartRate:        toStr(currentVitals!.heartRate),
          respiratoryRate:  toStr(currentVitals!.respiratoryRate),
          oxygenSaturation: toStr(currentVitals!.oxygenSaturation),
          bloodSugar:       toStr(currentVitals!.bloodSugar),
          pain:             toStr(currentVitals!.pain),
          weight:           toStr(currentVitals!.weight),
          height:           toStr(currentVitals!.height),
          bmi:              toStr(currentVitals!.bmi),
        });
      } else {
        // New visit — start with a blank form so the nurse records fresh vitals.
        setForm(emptyForm());
      }

      setSelectedPatient(patient);
    } finally {
      setLoadingPatientId(null);
    }
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setForm(emptyForm());
  };

  // ── Form helpers ───────────────────────────────────────────────────────────

  const handleChange = (field: keyof VitalsForm, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'height' || field === 'weight') {
        const h = parseFloat(field === 'height' ? value : prev.height);
        const w = parseFloat(field === 'weight' ? value : prev.weight);
        if (h > 0 && w > 0) {
          const bmiVal = (w / ((h / 100) ** 2)).toFixed(1);
          const cls = getBMIClassification(parseFloat(bmiVal));
          updated.bmi = `${bmiVal} (${cls.label})`;
        } else {
          updated.bmi = '';
        }
      }
      return updated;
    });
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    const filled = Object.entries(form).filter(([k, v]) => k !== 'bmi' && v && String(v).trim() !== '');
    if (filled.length === 0) return 'Please enter at least one vital sign';

    if (form.temperature) {
      const temp = parseFloat(form.temperature);
      if (isNaN(temp) || temp < 35 || temp > 42) return 'Temperature must be 35–42 °C';
    }
    if (form.heartRate) {
      const hr = parseInt(form.heartRate);
      if (isNaN(hr) || hr < 40 || hr > 180) return 'Heart rate must be 40–180 bpm';
    }
    if (form.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(form.bloodPressure))
      return 'Blood pressure format: systolic/diastolic (e.g. 120/80)';
    if (form.respiratoryRate) {
      const rr = parseInt(form.respiratoryRate);
      if (isNaN(rr) || rr < 8 || rr > 40) return 'Respiratory rate must be 8–40 /min';
    }
    if (form.oxygenSaturation) {
      const spo2 = parseInt(form.oxygenSaturation);
      if (isNaN(spo2) || spo2 < 70 || spo2 > 100) return 'O₂ saturation must be 70–100%';
    }
    if (form.bloodSugar) {
      const bs = parseFloat(form.bloodSugar);
      if (isNaN(bs) || bs < 30 || bs > 600) return 'Blood sugar must be 30–600 mg/dL';
    }
    if (form.pain) {
      const pain = parseInt(form.pain);
      if (isNaN(pain) || pain < 0 || pain > 10) return 'Pain level must be 0–10';
    }
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedPatient) return;
    const err = validate();
    if (err) {
      toast({ title: 'Validation Error', description: err, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const patientId = selectedPatient.id || selectedPatient._id || '';
      const cleanBMI = String(form.bmi || '').match(/(\d+\.?\d*)/)?.[1] || '';
      const vitalsData = {
        temperature:      form.temperature,
        bloodPressure:    form.bloodPressure,
        heartRate:        form.heartRate,
        respiratoryRate:  form.respiratoryRate,
        bloodSugar:       form.bloodSugar,
        oxygenSaturation: form.oxygenSaturation,
        pain:             form.pain,
        height:           form.height,
        weight:           form.weight,
        bmi:              cleanBMI,
        timestamp:        new Date().toISOString(),
      };

      await patientService.updateVitals(patientId, vitalsData);
      await patientService.updatePatientStatus(patientId, 'scheduled');

      setPatients(prev => prev.map(p =>
        (p.id === patientId || p._id === patientId)
          ? { ...p, vitals: vitalsData, status: 'scheduled' }
          : p
      ));

      setSavedCount(c => c + 1);
      toast({ title: 'Vitals Saved', description: `Vitals recorded for ${selectedPatient.firstName} ${selectedPatient.lastName}` });
      handleBack();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save vitals', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────

  const withVitals = patients.filter(p =>
    p.vitals && (p.vitals.temperature || p.vitals.heartRate || p.vitals.bloodPressure)
  );
  const withoutVitals = patients.filter(p =>
    !p.vitals || (!p.vitals.temperature && !p.vitals.heartRate && !p.vitals.bloodPressure)
  );
  const criticalCount = withVitals.filter(p => {
    const v = p.vitals || {};
    return (
      getVitalStatus('temperature', v.temperature || '') === 'critical' ||
      getVitalStatus('heartRate', v.heartRate || '') === 'critical' ||
      getVitalStatus('bloodPressure', v.bloodPressure || '') === 'critical'
    );
  }).length;

  // ── Render: patient list ───────────────────────────────────────────────────

  const renderPatientList = () => {
    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagePatients = filteredPatients.slice(startIndex, startIndex + pageSize);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Record Vital Signs
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Welcome, {user?.firstName || 'Nurse'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPatients} className="flex items-center gap-2 self-start sm:self-auto">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Patients', value: patients.length, icon: <User className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Vitals Recorded', value: withVitals.length, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Pending Vitals', value: withoutVitals.length, icon: <Clock className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { label: 'Critical Alerts', value: criticalCount, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          ].map(stat => (
            <Card key={stat.label} className={`p-3 border-0 ${stat.bg}`}>
              <div className="flex items-center gap-2">
                <span className={stat.color}>{stat.icon}</span>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search patients by name, ID or contact..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Patient list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading patients…</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No patients found</p>
            <p className="text-sm">Try adjusting your search</p>
          </div>
        ) : (
          <Card className="overflow-hidden border border-border/60">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Patient</span>
              <span>Priority</span>
              <span>Vitals</span>
              <span className="w-20 text-right">Action</span>
            </div>

            <div className="divide-y divide-border/40">
              {pagePatients.map(patient => {
              const v = patient.vitals || {};
              const hasVitals = !!(v.temperature || v.heartRate || v.bloodPressure);
              const tempStatus = getVitalStatus('temperature', String(v.temperature || ''));
              const hrStatus   = getVitalStatus('heartRate',   String(v.heartRate   || ''));
              const bpStatus   = getVitalStatus('bloodPressure', String(v.bloodPressure || ''));
              const overallStatus: VitalStatus =
                [tempStatus, hrStatus, bpStatus].includes('critical') ? 'critical' :
                [tempStatus, hrStatus, bpStatus].includes('warning')  ? 'warning'  : 'normal';
              const isLoadingThis = loadingPatientId === (patient.id || patient._id);
              const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

              return (
                <div
                  key={patient.id || patient._id}
                  className="grid grid-cols-[2fr_1fr_2fr_auto] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer group"
                  onClick={() => handleSelectPatient(patient)}
                >
                  {/* Patient info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white
                      ${hasVitals && overallStatus === 'critical' ? 'bg-red-500' :
                        hasVitals && overallStatus === 'warning'  ? 'bg-amber-500' :
                        hasVitals ? 'bg-emerald-500' : 'bg-primary/70'}`}>
                      {initials || <User className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{patient.firstName} {patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{patient.age}y · {patient.gender}</p>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        patient.priority === 'urgent' || patient.priority === 'emergency'
                          ? 'border-red-400 text-red-600 bg-red-50 dark:bg-red-950/20'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {patient.priority || 'normal'}
                    </Badge>
                    {(patient as any).status === 'Admitted' && (
                      <Badge className="text-[10px] bg-blue-500 text-white border-0 px-1.5 py-0">
                        New · From Reception
                      </Badge>
                    )}
                  </div>

                  {/* Vitals */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasVitals ? (
                      <>
                        {v.temperature && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[tempStatus].badge}`}>
                            🌡 {v.temperature}°C
                          </span>
                        )}
                        {v.heartRate && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[hrStatus].badge}`}>
                            ♥ {v.heartRate} bpm
                          </span>
                        )}
                        {v.bloodPressure && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[bpStatus].badge}`}>
                            {v.bloodPressure}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Not recorded
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex justify-end w-20">
                    {isLoadingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Button
                        size="sm"
                        variant={hasVitals ? 'outline' : 'default'}
                        className="h-7 text-xs px-3 gap-1"
                        onClick={e => { e.stopPropagation(); handleSelectPatient(patient); }}
                      >
                        {hasVitals ? 'Update' : 'Record'}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Pagination controls */}
            {filteredPatients.length > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/40 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Showing {startIndex + 1}–
                  {Math.min(startIndex + pagePatients.length, filteredPatients.length)} of {filteredPatients.length} patients
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-7 text-xs px-3 gap-1"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-7 text-xs px-3 gap-1"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  };

  // ── Render: vitals form ────────────────────────────────────────────────────

  const renderVitalsForm = () => {
    if (!selectedPatient) return null;
    const bmiStr = String(form.bmi || '');
    const bmiNum = parseFloat(bmiStr);
    const bmiCls = !isNaN(bmiNum) ? getBMIClassification(bmiNum) : null;

    const overallAlerts = [
      { key: 'temperature',      val: form.temperature },
      { key: 'bloodPressure',    val: form.bloodPressure },
      { key: 'heartRate',        val: form.heartRate },
      { key: 'respiratoryRate',  val: form.respiratoryRate },
      { key: 'oxygenSaturation', val: form.oxygenSaturation },
      { key: 'bloodSugar',       val: form.bloodSugar },
      { key: 'pain',             val: form.pain },
    ].filter(x => x.val && getVitalStatus(x.key, x.val) !== 'normal');

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Record Vitals
            </h1>
          </div>
        </div>

        {/* Patient info card */}
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {`${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-foreground text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
              <div className="flex flex-wrap gap-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />{selectedPatient.age} yrs · {selectedPatient.gender}
                </span>
                <span className="text-xs text-muted-foreground">ID: {(selectedPatient.id || selectedPatient._id || '').slice(-10)}</span>
                {selectedPatient.diagnosis && (
                  <span className="text-xs text-muted-foreground">Dx: {selectedPatient.diagnosis}</span>
                )}
              </div>
            </div>
            <Badge variant={selectedPatient.priority === 'urgent' || selectedPatient.priority === 'emergency' ? 'destructive' : 'outline'}>
              {selectedPatient.priority || 'normal'}
            </Badge>
          </div>
        </Card>

        {/* Alerts banner */}
        {overallAlerts.length > 0 && (
          <div className={`rounded-xl p-3 flex items-start gap-3 border ${
            overallAlerts.some(a => getVitalStatus(a.key, a.val) === 'critical')
              ? 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800'
              : 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
          }`}>
            <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
              overallAlerts.some(a => getVitalStatus(a.key, a.val) === 'critical') ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {overallAlerts.some(a => getVitalStatus(a.key, a.val) === 'critical') ? 'Critical values detected' : 'Abnormal values detected'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {overallAlerts.length} vital sign{overallAlerts.length > 1 ? 's' : ''} outside normal range. Please verify before saving.
              </p>
            </div>
          </div>
        )}

        {/* Vitals grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <VitalInput
            id="temperature"
            label="Temperature"
            unit="°C"
            placeholder="e.g. 37.0"
            hint="Normal: 36.5–37.5 °C"
            icon={<Thermometer className="h-4 w-4" />}
            value={form.temperature}
            statusKey="temperature"
            onChange={v => handleChange('temperature', v)}
          />
          <VitalInput
            id="bloodPressure"
            label="Blood Pressure"
            unit="mmHg"
            placeholder="e.g. 120/80"
            hint="Normal: 100–140 / 70–90"
            icon={<Activity className="h-4 w-4" />}
            value={form.bloodPressure}
            statusKey="bloodPressure"
            onChange={v => handleChange('bloodPressure', v)}
          />
          <VitalInput
            id="heartRate"
            label="Heart Rate"
            unit="bpm"
            placeholder="e.g. 75"
            hint="Normal: 60–100 bpm"
            icon={<Heart className="h-4 w-4" />}
            value={form.heartRate}
            statusKey="heartRate"
            onChange={v => handleChange('heartRate', v)}
          />
          <VitalInput
            id="respiratoryRate"
            label="Respiratory Rate"
            unit="/min"
            placeholder="e.g. 16"
            hint="Normal: 12–20 /min"
            icon={<Wind className="h-4 w-4" />}
            value={form.respiratoryRate}
            statusKey="respiratoryRate"
            onChange={v => handleChange('respiratoryRate', v)}
          />
          <VitalInput
            id="oxygenSaturation"
            label="O₂ Saturation"
            unit="%"
            placeholder="e.g. 98"
            hint="Normal: ≥ 95%"
            icon={<Droplets className="h-4 w-4" />}
            value={form.oxygenSaturation}
            statusKey="oxygenSaturation"
            onChange={v => handleChange('oxygenSaturation', v)}
          />
          <VitalInput
            id="bloodSugar"
            label="Blood Sugar"
            unit="mg/dL"
            placeholder="e.g. 100"
            hint="Normal: 70–180 mg/dL"
            icon={<Zap className="h-4 w-4" />}
            value={form.bloodSugar}
            statusKey="bloodSugar"
            onChange={v => handleChange('bloodSugar', v)}
          />
          <VitalInput
            id="pain"
            label="Pain Level"
            unit="/ 10"
            placeholder="0–10"
            hint="0 = no pain, 10 = worst"
            icon={<BarChart2 className="h-4 w-4" />}
            value={form.pain}
            statusKey="pain"
            onChange={v => handleChange('pain', v)}
          />
          <VitalInput
            id="weight"
            label="Weight"
            unit="kg"
            placeholder="e.g. 70"
            hint="Used to calculate BMI"
            icon={<Scale className="h-4 w-4" />}
            value={form.weight}
            statusKey=""
            onChange={v => handleChange('weight', v)}
          />
          <VitalInput
            id="height"
            label="Height"
            unit="cm"
            placeholder="e.g. 170"
            hint="Used to calculate BMI"
            icon={<Ruler className="h-4 w-4" />}
            value={form.height}
            statusKey=""
            onChange={v => handleChange('height', v)}
          />
        </div>

        {/* BMI result */}
        {form.bmi && bmiCls && (
          <Card className="p-4 border-2 border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Calculated BMI</p>
                <p className="text-lg font-bold text-foreground">
                  {bmiStr.split(' ')[0]}
                  <span className={`ml-2 text-sm font-semibold ${bmiCls.color}`}>
                    {bmiCls.label}
                  </span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 sm:flex-none flex items-center gap-2"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> Save Vitals</>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-4 max-w-5xl pb-10">
      {selectedPatient ? renderVitalsForm() : renderPatientList()}
    </div>
  );
};

export default RecordVitalsPage;
