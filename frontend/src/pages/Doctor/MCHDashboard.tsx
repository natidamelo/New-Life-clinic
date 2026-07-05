import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Heart as HeartIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  RefreshCw,
  Search as MagnifyingGlassIcon,
  Plus as PlusIcon,
  Activity,
  Pill,
  FileText as LucideFileText,
  Stethoscope as LucideStethoscope,
  ChevronRight,
  TrendingUp,
  FlaskConical,
  Baby,
  Smile,
  ShieldAlert,
  Save,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  Clock,
  Printer
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSafeTheme } from '../../hooks/useSafeTheme';
import { addDays, differenceInWeeks, differenceInDays, format, parseISO } from 'date-fns';
import api from '../../services/apiService';
import patientService, { Patient as PatientType } from '../../services/patientService';
import prescriptionService from '../../services/prescriptionService';
import labService from '../../services/labService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';
import ProgressBar from '../../components/ProgressBar';
import Button from '../../components/Button';
import Tabs from '../../components/Tabs';
import Table from '../../components/Table';

// Standard childhood immunization schedule
interface Vaccine {
  id: string;
  name: string;
  age: string;
  description: string;
}

const IMMUNIZATION_SCHEDULE: Vaccine[] = [
  { id: 'bcg', name: 'BCG', age: 'Birth', description: 'Tuberculosis vaccine' },
  { id: 'opv0', name: 'OPV 0', age: 'Birth', description: 'Oral Polio Vaccine' },
  { id: 'hepb0', name: 'HepB 0', age: 'Birth', description: 'Hepatitis B birth dose' },
  { id: 'penta1', name: 'Pentavalent 1', age: '6 Weeks', description: 'DPT-HepB-Hib vaccine' },
  { id: 'opv1', name: 'OPV 1', age: '6 Weeks', description: 'Oral Polio Vaccine' },
  { id: 'pcv1', name: 'PCV 1', age: '6 Weeks', description: 'Pneumococcal Conjugate Vaccine' },
  { id: 'rota1', name: 'Rota 1', age: '6 Weeks', description: 'Rotavirus Vaccine' },
  { id: 'penta2', name: 'Pentavalent 2', age: '10 Weeks', description: 'DPT-HepB-Hib vaccine' },
  { id: 'opv2', name: 'OPV 2', age: '10 Weeks', description: 'Oral Polio Vaccine' },
  { id: 'pcv2', name: 'PCV 2', age: '10 Weeks', description: 'Pneumococcal Conjugate Vaccine' },
  { id: 'rota2', name: 'Rota 2', age: '10 Weeks', description: 'Rotavirus Vaccine' },
  { id: 'penta3', name: 'Pentavalent 3', age: '14 Weeks', description: 'DPT-HepB-Hib vaccine' },
  { id: 'opv3', name: 'OPV 3', age: '14 Weeks', description: 'Oral Polio Vaccine' },
  { id: 'pcv3', name: 'PCV 3', age: '14 Weeks', description: 'Pneumococcal Conjugate Vaccine' },
  { id: 'ipv', name: 'IPV', age: '14 Weeks', description: 'Inactivated Polio Vaccine' },
  { id: 'measles1', name: 'Measles 1', age: '9 Months', description: 'Measles vaccine' },
  { id: 'vita1', name: 'Vitamin A 1st Dose', age: '9 Months', description: 'Vitamin A supplementation' },
  { id: 'measles2', name: 'Measles 2', age: '18 Months', description: 'Measles booster' }
];

// Mock database check fallback
interface MCHRecord {
  patientId: string;
  program: 'ANC' | 'PNC' | 'Child Health';
  enrolledAt: string;
  
  // ANC fields
  lmp?: string;
  edd?: string;
  gravida?: number;
  para?: number;
  abortions?: number;
  ttDoses?: Record<string, string>; // tt1: '2026-05-12'
  otherVaccines?: Record<string, string>; // tdap: '2026-06-01'
  supplements?: Record<string, string>; // ifa: '2026-06-01'
  ancVisits?: Array<{
    id: string;
    date: string;
    weight: number;
    bp: string;
    fundalHeight: number;
    fhr: number;
    urineProtein: string;
    urineGlucose: string;
    notes: string;
  }>;

  // PNC fields
  deliveryDate?: string;
  deliveryMode?: string;
  deliveryLocation?: string;
  birthOutcome?: string;
  birthWeight?: number;
  pncVisits?: Array<{
    id: string;
    date: string;
    bp: string;
    lochia: string;
    breastfeeding: string;
    notes: string;
  }>;

  // Child Health fields
  givenVaccines?: Record<string, string>; // vaccineId: dateGiven
  growthRecords?: Array<{
    id: string;
    date: string;
    ageMonths: number;
    weight: number;
    height: number;
    headCirc: number;
    muac: number;
    milestones: string;
    notes: string;
  }>;
}

const MCHDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useSafeTheme();
  
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'anc' | 'pnc' | 'child' | 'consultation' | 'prescriptions' | 'labs'>('overview');
  
  // Filter and tracking states for MCH enrolled patients
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'enrolled' | 'anc' | 'pnc' | 'child'>('all');
  const [enrolledMap, setEnrolledMap] = useState<Record<string, string>>({});
  
  // Enrollment modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollProgram, setEnrollProgram] = useState<'ANC' | 'PNC' | 'Child Health'>('ANC');
  
  // New visits modal states
  const [isAncVisitOpen, setIsAncVisitOpen] = useState(false);
  const [isPncVisitOpen, setIsPncVisitOpen] = useState(false);
  const [isGrowthRecordOpen, setIsGrowthRecordOpen] = useState(false);
  
  // Local persistence for MCH data
  const [mchRecord, setMchRecord] = useState<MCHRecord | null>(null);
  const [mchStats, setMchStats] = useState({
    ancMothers: 0,
    pncPairs: 0,
    immunizations: 0,
    growthChecks: 0
  });

  // Clinical workflow states
  const [consultationText, setConsultationText] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [physicalExamText, setPhysicalExamText] = useState('');
  
  // Prescriptions state
  const [prescribedMeds, setPrescribedMeds] = useState<Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>>([]);
  
  // Lab Order State
  const [labOrders, setLabOrders] = useState<Record<string, boolean>>({
    hemoglobin: false,
    bloodGroup: false,
    hivCheck: false,
    syphilisCheck: false,
    urineTest: false
  });

  // Calculate MCH general statistics and update enrolled map
  const updateStats = useCallback(() => {
    let anc = 0;
    let pnc = 0;
    let vaccinesCount = 0;
    let growthCount = 0;
    const newEnrolledMap: Record<string, string> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mch_record_')) {
        try {
          const rec: MCHRecord = JSON.parse(localStorage.getItem(key) || '{}');
          if (rec.patientId) {
            newEnrolledMap[rec.patientId] = rec.program;
          }
          if (rec.program === 'ANC') anc++;
          if (rec.program === 'PNC') pnc++;
          if (rec.givenVaccines) {
            vaccinesCount += Object.keys(rec.givenVaccines).length;
          }
          if (rec.growthRecords) {
            growthCount += rec.growthRecords.length;
          }
        } catch (_) {}
      }
    }
    
    setEnrolledMap(newEnrolledMap);
    setMchStats({
      ancMothers: anc,
      pncPairs: pnc,
      immunizations: vaccinesCount,
      growthChecks: growthCount
    });
  }, []);

  // Fetch all registry patients
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await patientService.getAllPatients(true);
      if (response && response.patients) {
        setPatients(response.patients);
      }
      updateStats();
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to retrieve patient registry');
    } finally {
      setLoading(false);
    }
  }, [updateStats]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Load MCH Record when a patient is selected
  useEffect(() => {
    if (selectedPatient) {
      const stored = localStorage.getItem(`mch_record_${selectedPatient.id || selectedPatient._id}`);
      if (stored) {
        try {
          setMchRecord(JSON.parse(stored));
        } catch (_) {
          setMchRecord(null);
        }
      } else {
        setMchRecord(null);
      }
      
      // Reset clinical states
      setConsultationText('');
      setDiagnosisText('');
      setPhysicalExamText('');
      setPrescribedMeds([]);
      setLabOrders({
        hemoglobin: false,
        bloodGroup: false,
        hivCheck: false,
        syphilisCheck: false,
        urineTest: false
      });
      setActiveTab('overview');
    } else {
      setMchRecord(null);
    }
  }, [selectedPatient]);

  // Handle program enrollment
  const handleEnroll = () => {
    if (!selectedPatient) return;
    const patientId = (selectedPatient.id || selectedPatient._id) as string;
    
    let defaultRecord: MCHRecord = {
      patientId,
      program: enrollProgram,
      enrolledAt: new Date().toISOString()
    };

    if (enrollProgram === 'ANC') {
      defaultRecord = {
        ...defaultRecord,
        lmp: '',
        edd: '',
        gravida: 1,
        para: 0,
        abortions: 0,
        ttDoses: {},
        otherVaccines: {},
        supplements: {},
        ancVisits: []
      };
    } else if (enrollProgram === 'PNC') {
      defaultRecord = {
        ...defaultRecord,
        deliveryDate: '',
        deliveryMode: 'SVD',
        deliveryLocation: 'Clinic Health Center',
        birthOutcome: 'Live birth',
        birthWeight: 3.0,
        pncVisits: []
      };
    } else if (enrollProgram === 'Child Health') {
      defaultRecord = {
        ...defaultRecord,
        givenVaccines: {},
        growthRecords: []
      };
    }

    localStorage.setItem(`mch_record_${patientId}`, JSON.stringify(defaultRecord));
    setMchRecord(defaultRecord);
    setIsEnrollModalOpen(false);
    updateStats();
    toast.success(`Successfully enrolled in ${enrollProgram} registry!`);
  };

  // Helper: check gestational calculations
  const gestationCalc = useMemo(() => {
    if (!mchRecord || !mchRecord.lmp) return null;
    try {
      const lmpDate = parseISO(mchRecord.lmp);
      const edd = addDays(lmpDate, 280);
      const totalDays = differenceInDays(new Date(), lmpDate);
      const weeks = Math.floor(totalDays / 7);
      const days = totalDays % 7;
      return {
        edd: format(edd, 'yyyy-MM-dd'),
        weeks,
        days
      };
    } catch (_) {
      return null;
    }
  }, [mchRecord]);

  // Update ANC/PNC parameters
  const updateMchRecordField = (field: keyof MCHRecord, value: any) => {
    if (!mchRecord || !selectedPatient) return;
    const updated = { ...mchRecord, [field]: value };
    
    // Auto-calculate EDD if LMP changes
    if (field === 'lmp' && value) {
      try {
        const lmpDate = parseISO(value);
        const edd = addDays(lmpDate, 280);
        updated.edd = format(edd, 'yyyy-MM-dd');
      } catch (_) {}
    }

    localStorage.setItem(`mch_record_${selectedPatient.id || selectedPatient._id}`, JSON.stringify(updated));
    setMchRecord(updated);
    updateStats();
    toast.success('MCH registry details updated');
  };

  // Save routine logs
  const addAncVisit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mchRecord || !selectedPatient) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    
    const newVisit = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      weight: parseFloat(data.get('weight') as string) || 0,
      bp: data.get('bp') as string || '120/80',
      fundalHeight: parseFloat(data.get('fundalHeight') as string) || 0,
      fhr: parseInt(data.get('fhr') as string) || 0,
      urineProtein: data.get('urineProtein') as string || 'Negative',
      urineGlucose: data.get('urineGlucose') as string || 'Negative',
      notes: data.get('notes') as string || ''
    };

    const updatedVisits = [...(mchRecord.ancVisits || []), newVisit];
    updateMchRecordField('ancVisits', updatedVisits);
    setIsAncVisitOpen(false);
    form.reset();
  };

  const addPncVisit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mchRecord || !selectedPatient) return;
    const form = e.currentTarget;
    const data = new FormData(form);

    const newVisit = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      bp: data.get('bp') as string || '120/80',
      lochia: data.get('lochia') as string || 'Normal',
      breastfeeding: data.get('breastfeeding') as string || 'Exclusive',
      notes: data.get('notes') as string || ''
    };

    const updatedVisits = [...(mchRecord.pncVisits || []), newVisit];
    updateMchRecordField('pncVisits', updatedVisits);
    setIsPncVisitOpen(false);
    form.reset();
  };

  const addGrowthRecord = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mchRecord || !selectedPatient) return;
    const form = e.currentTarget;
    const data = new FormData(form);

    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      ageMonths: parseInt(data.get('ageMonths') as string) || 0,
      weight: parseFloat(data.get('weight') as string) || 0,
      height: parseFloat(data.get('height') as string) || 0,
      headCirc: parseFloat(data.get('headCirc') as string) || 0,
      muac: parseFloat(data.get('muac') as string) || 0,
      milestones: data.get('milestones') as string || 'Normal development',
      notes: data.get('notes') as string || ''
    };

    const updatedGrowth = [...(mchRecord.growthRecords || []), newRecord];
    updateMchRecordField('growthRecords', updatedGrowth);
    setIsGrowthRecordOpen(false);
    form.reset();
  };

  // Toggle Immunization Vaccines
  const toggleVaccine = (vaccineId: string) => {
    if (!mchRecord || !selectedPatient) return;
    const given = { ...(mchRecord.givenVaccines || {}) };
    
    if (given[vaccineId]) {
      delete given[vaccineId];
    } else {
      given[vaccineId] = new Date().toISOString().split('T')[0];
    }

    updateMchRecordField('givenVaccines', given);
  };

  // Toggle Tetanus Toxoid Vaccine Doses
  const toggleTTDose = (dose: string) => {
    if (!mchRecord || !selectedPatient) return;
    const doses = { ...(mchRecord.ttDoses || {}) };

    if (doses[dose]) {
      delete doses[dose];
    } else {
      doses[dose] = new Date().toISOString().split('T')[0];
    }

    updateMchRecordField('ttDoses', doses);
  };

  // Toggle other maternal vaccines
  const toggleOtherVaccine = (vaccineKey: string) => {
    if (!mchRecord || !selectedPatient) return;
    const vaccines = { ...(mchRecord.otherVaccines || {}) };

    if (vaccines[vaccineKey]) {
      delete vaccines[vaccineKey];
    } else {
      vaccines[vaccineKey] = new Date().toISOString().split('T')[0];
    }

    updateMchRecordField('otherVaccines', vaccines);
  };

  // Toggle maternal supplements
  const toggleSupplement = (supplementKey: string) => {
    if (!mchRecord || !selectedPatient) return;
    const supplements = { ...(mchRecord.supplements || {}) };

    if (supplements[supplementKey]) {
      delete supplements[supplementKey];
    } else {
      supplements[supplementKey] = new Date().toISOString().split('T')[0];
    }

    updateMchRecordField('supplements', supplements);
  };

  // Filter and sort patients in sidebar based on filter pills and enrollment status
  const filteredPatients = useMemo(() => {
    const list = patients.filter(p => {
      const search = searchTerm.toLowerCase();
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const idCode = (p.patientId || p._id || '').toLowerCase();
      
      const matchesSearch = fullName.includes(search) || idCode.includes(search);
      if (!matchesSearch) return false;

      const patientId = (p.id || p._id) as string;
      const enrolledProgram = enrolledMap[patientId];

      if (sidebarFilter === 'all') return true;
      if (sidebarFilter === 'enrolled') return !!enrolledProgram;
      if (sidebarFilter === 'anc') return enrolledProgram === 'ANC';
      if (sidebarFilter === 'pnc') return enrolledProgram === 'PNC';
      if (sidebarFilter === 'child') return enrolledProgram === 'Child Health';
      
      return true;
    });

    // Sort: Enrolled patients first, then others
    return [...list].sort((a, b) => {
      const aId = (a.id || a._id) as string;
      const bId = (b.id || b._id) as string;
      const aHas = !!enrolledMap[aId];
      const bHas = !!enrolledMap[bId];
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });
  }, [patients, searchTerm, sidebarFilter, enrolledMap]);

  // Submit integrated medical record consultation
  const handleSaveConsultation = async () => {
    if (!selectedPatient) return;
    if (!diagnosisText.trim()) {
      toast.error('Please enter a clinical diagnosis');
      return;
    }

    const payload = {
      patient: selectedPatient._id || selectedPatient.id,
      patientId: selectedPatient._id || selectedPatient.id,
      doctor: user?.id || user?._id,
      doctorId: user?.id || user?._id,
      doctorName: user?.name || 'MCH Specialist',
      chiefComplaint: {
        description: `MCH Program Visit (${mchRecord?.program || 'General'}) - ` + (consultationText || 'Routine checkup'),
        duration: '1 day',
        severity: 'Mild',
        onsetPattern: 'Acute',
        progression: 'Stable'
      },
      diagnosis: diagnosisText,
      assessment: {
        primaryDiagnosis: diagnosisText,
        clinicalReasoning: `Integrated record logged under MCH Services.`,
        plan: `Continue tracking in MCH child/mother registry.`
      },
      historyOfPresentIllness: consultationText || 'No specific illness reported. Routine maternal-child clinic consultation.',
      physicalExamination: {
        general: physicalExamText || 'General assessment normal.',
        summary: 'MCH Routine physical exam complete.'
      },
      status: 'Finalized',
      recordType: 'consultation'
    };

    try {
      const response = await api.post('/api/medical-records', payload);
      if (response.data) {
        toast.success('MCH Consultation saved & finalized to medical database!');
        // Update patient status to completed as done in general consultations
        await api.put(`/api/patients/${selectedPatient._id || selectedPatient.id}/status`, { status: 'completed' });
        fetchPatients();
      }
    } catch (err: any) {
      console.error('Error saving medical record:', err);
      toast.error('Failed to submit consultation to medical database');
    }
  };

  // Submit prescription order
  const handleSavePrescriptions = async () => {
    if (!selectedPatient || prescribedMeds.length === 0) return;
    
    // Get visit ID (fallback to patientId if no active visit is found)
    let visitId = '';
    try {
      const visitRes = await patientService.getLatestActiveVisit(selectedPatient.id || selectedPatient._id || '');
      visitId = visitRes?.id || (selectedPatient.id || selectedPatient._id || '');
    } catch (_) {
      visitId = (selectedPatient.id || selectedPatient._id || '') as string;
    }

    const formattedMeds = prescribedMeds.map(med => ({
      medication: med.medication,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      quantity: 1,
      route: 'Oral'
    }));

    const payload = {
      patient: (selectedPatient.id || selectedPatient._id) as string,
      visitId,
      doctorId: (user?.id || user?._id) as string,
      medications: formattedMeds,
      status: 'pending',
      instructions: 'Take medications regularly as prescribed for mother/child wellness.',
      sendToNurse: false
    };

    try {
      const token = localStorage.getItem('token') || '';
      await prescriptionService.createPrescription(payload, token, (user?.id || user?._id) as string);
      toast.success('MCH Prescriptions submitted successfully!');
      setPrescribedMeds([]);
    } catch (err) {
      console.error('Failed to create prescription:', err);
      toast.error('Failed to submit prescriptions to pharmacy');
    }
  };

  // Submit lab test orders
  const handleSaveLabs = async () => {
    if (!selectedPatient) return;
    
    const selectedLabList = Object.entries(labOrders)
      .filter(([_, enabled]) => enabled)
      .map(([testKey]) => {
        switch (testKey) {
          case 'hemoglobin': return { testName: 'Hemoglobin (Hb) Test', category: 'Hematology', price: 150 };
          case 'bloodGroup': return { testName: 'Blood Grouping & Rh Factor', category: 'Serology', price: 200 };
          case 'hivCheck': return { testName: 'HIV Screening', category: 'Serology', price: 0 };
          case 'syphilisCheck': return { testName: 'VDRL / Syphilis Check', category: 'Serology', price: 150 };
          case 'urineTest': return { testName: 'Routine Urine Analysis', category: 'Urinalysis', price: 100 };
          default: return null;
        }
      })
      .filter((t): t is { testName: string; category: string; price: number } => t !== null);

    if (selectedLabList.length === 0) {
      toast.error('Please select at least one test to order');
      return;
    }

    // Get visit ID (fallback to patientId if no active visit is found)
    let visitId = '';
    try {
      const visitRes = await patientService.getLatestActiveVisit(selectedPatient.id || selectedPatient._id || '');
      visitId = visitRes?.id || (selectedPatient.id || selectedPatient._id || '');
    } catch (_) {
      visitId = (selectedPatient.id || selectedPatient._id || '') as string;
    }

    try {
      // Structure lab requests strictly matching database type requirements
      const orderPayload = {
        patientId: (selectedPatient.id || selectedPatient._id) as string,
        visitId,
        priority: 'Routine' as 'Routine',
        tests: selectedLabList.map(t => ({ testName: t.testName })),
        notes: 'MCH routine checkup lab tests'
      };
      
      await labService.submitBulkLabOrder(orderPayload);
      toast.success('Lab tests ordered successfully!');
      
      // Reset labs checkboxes
      setLabOrders({
        hemoglobin: false,
        bloodGroup: false,
        hivCheck: false,
        syphilisCheck: false,
        urineTest: false
      });
    } catch (err) {
      console.error('Error saving lab request:', err);
      toast.error('Failed to submit lab request orders');
    }
  };

  const getPatientInitials = (patient: PatientType) => {
    return `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();
  };

  const getRecordSummaryForSelected = () => {
    if (!mchRecord) return 'Not enrolled';
    return mchRecord.program;
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50/50 text-gray-800'}`}>
      <Toaster position="top-right" />

      {/* Premium Gradient Header */}
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 shadow-xl">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
          
          <div className="relative px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                <Smile className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-white/95 text-sm font-medium">New Life Healthcare Center</p>
                <h1 className="text-3xl font-extrabold text-white leading-none tracking-tight">Mother & Child Health (MCH)</h1>
                <p className="text-white/80 text-xs mt-1">Prenatal, Postnatal, Immunizations & Pediatric Growth Care</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchPatients}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-all transform active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MCH Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <StatCard
          title="ANC Pregnancies"
          value={mchStats.ancMothers}
          subtext="Enrolled antenatal mothers"
          icon={<HeartIcon className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          title="PNC Mothers"
          value={mchStats.pncPairs}
          subtext="Postnatal follow-ups"
          icon={<Baby className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Vaccinations Given"
          value={mchStats.immunizations}
          subtext="Child immunization registry"
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Growth Checks"
          value={mchStats.growthChecks}
          subtext="Logged pediatric checks"
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Patients List */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-270px)]">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span>Patients Registry</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-full text-[var(--color-text-muted)]">{filteredPatients.length}</span>
            </h3>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search patient ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white dark:bg-gray-950"
              />
            </div>
            
            {/* Elegant, Premium MCH Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1 scrollbar-none">
              {(['all', 'enrolled', 'anc', 'pnc', 'child'] as const).map((filter) => {
                const label = {
                  all: 'All',
                  enrolled: 'Active MCH',
                  anc: 'ANC',
                  pnc: 'PNC',
                  child: 'Child'
                }[filter];
                
                const isActive = sidebarFilter === filter;
                
                return (
                  <button
                    key={filter}
                    onClick={() => setSidebarFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap transform active:scale-95 border ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 border-pink-500 text-white shadow-md shadow-pink-500/10'
                        : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
                <span>Loading registry...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No patients found.
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const active = selectedPatient?.id === patient.id || selectedPatient?._id === patient._id;
                const patientId = (patient.id || patient._id) as string;
                const enrolledProgram = enrolledMap[patientId];
                
                return (
                  <div
                    key={patientId}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between border-b border-[var(--color-border)] ${
                      active ? 'bg-[var(--color-brand-primary)]/10 border-l-4 border-l-[var(--color-brand-primary)]' : 'hover:bg-[var(--color-surface-raised)]/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar seed={patient.id || patient._id} fallbackInitials={getPatientInitials(patient)} size="md" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[var(--color-text-primary)]">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          ID: {patient.patientId || 'N/A'} • {patient.gender} • {patient.age} yrs
                        </p>
                      </div>
                    </div>
                    {enrolledProgram && (
                      <StatusBadge status="info">
                        {enrolledProgram}
                      </StatusBadge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Panel: Patient Details & MCH Worksheets */}
        <div className="lg:col-span-3">
          {selectedPatient ? (
            <div className="space-y-6">
              {/* Selected Patient Profile Card */}
              <Card className="rounded-2xl border-[var(--color-border)] overflow-hidden shadow-sm bg-[var(--color-surface)]">
                <CardHeader className="bg-[var(--color-surface-raised)]/10 border-b border-[var(--color-border)] py-4 flex flex-row items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar seed={selectedPatient.id || selectedPatient._id} fallbackInitials={getPatientInitials(selectedPatient)} size="lg" />
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Registry program: <span className="font-semibold text-[var(--color-brand-primary)]">{getRecordSummaryForSelected()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!mchRecord ? (
                      <Button onClick={() => setIsEnrollModalOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transform active:scale-95 transition-all">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Enroll in MCH Program
                      </Button>
                    ) : (
                      <Button onClick={() => {
                        if (confirm('Are you sure you want to un-enroll this patient? Local registry data will be removed.')) {
                          localStorage.removeItem(`mch_record_${selectedPatient.id || selectedPatient._id}`);
                          setMchRecord(null);
                          updateStats();
                          toast.success('Un-enrolled patient successfully');
                        }
                      }} variant="destructive" className="rounded-xl">
                        Un-enroll Patient
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400 block text-xs">Patient Code</span>
                    <strong className="text-gray-800 dark:text-gray-200">{selectedPatient.patientId || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Age & Gender</span>
                    <strong className="text-gray-800 dark:text-gray-200">{selectedPatient.age} yrs • {selectedPatient.gender}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Contact Phone</span>
                    <strong className="text-gray-800 dark:text-gray-200">{selectedPatient.contactNumber || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">Address</span>
                    <strong className="text-gray-800 dark:text-gray-200 truncate block max-w-[200px]" title={selectedPatient.address}>
                      {selectedPatient.address || 'N/A'}
                    </strong>
                  </div>
                </CardContent>
              </Card>

              {/* Program Workspace tabs */}
              {mchRecord ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-3 md:grid-cols-7 h-auto p-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm mb-6 gap-0.5">
                    <TabsTrigger value="overview" className="rounded-xl py-2">Overview</TabsTrigger>
                    
                    {/* Disable worksheets unless patient is in that specific program */}
                    <TabsTrigger value="anc" disabled={mchRecord.program !== 'ANC'} className="rounded-xl py-2">ANC Card</TabsTrigger>
                    <TabsTrigger value="pnc" disabled={mchRecord.program !== 'PNC'} className="rounded-xl py-2">PNC Card</TabsTrigger>
                    <TabsTrigger value="child" disabled={mchRecord.program !== 'Child Health'} className="rounded-xl py-2">Child Card</TabsTrigger>
                    
                    <TabsTrigger value="consultation" className="rounded-xl py-2">Consult</TabsTrigger>
                    <TabsTrigger value="prescriptions" className="rounded-xl py-2">Meds</TabsTrigger>
                    <TabsTrigger value="labs" className="rounded-xl py-2">Labs</TabsTrigger>
                  </TabsList>

                  {/* TAB 1: OVERVIEW */}
                  <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="md:col-span-2 rounded-2xl shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                        <CardHeader>
                          <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">Program Dashboard</CardTitle>
                          <CardDescription>Status and recent activity for this MCH registry enrollment</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-purple-900 dark:text-purple-300">Registered program: {mchRecord.program}</p>
                              <p className="text-xs text-purple-700/80 dark:text-purple-400/80">Enrolled on: {new Date(mchRecord.enrolledAt).toLocaleDateString()}</p>
                            </div>
                            <StatusBadge status="active">ACTIVE</StatusBadge>
                          </div>

                          {mchRecord.program === 'ANC' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                                <span className="text-xs text-gray-400">EDD</span>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{mchRecord.edd || 'Not Set'}</p>
                              </div>
                              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                                <span className="text-xs text-gray-400">Gestation Weeks</span>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                  {gestationCalc ? `${gestationCalc.weeks} Weeks ${gestationCalc.days} Days` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          )}

                          {mchRecord.program === 'PNC' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                                <span className="text-xs text-gray-400">Delivery Date</span>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{mchRecord.deliveryDate || 'N/A'}</p>
                              </div>
                              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                                <span className="text-xs text-gray-400">Birth Weight</span>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{mchRecord.birthWeight ? `${mchRecord.birthWeight} kg` : 'N/A'}</p>
                              </div>
                            </div>
                          )}

                          {mchRecord.program === 'Child Health' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                                <span className="text-xs text-gray-400">Vaccines Received</span>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                  {Object.keys(mchRecord.givenVaccines || {}).length} / {IMMUNIZATION_SCHEDULE.length}
                                </p>
                              </div>
                              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                                <span className="text-xs text-gray-400">Growth Records</span>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                  {(mchRecord.growthRecords || []).length} Logged
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 p-5">
                        <h4 className="font-bold mb-3 text-sm uppercase text-gray-400 tracking-wider">Quick Actions</h4>
                        <div className="space-y-2">
                          <Button onClick={() => setActiveTab('consultation')} variant="outline" className="w-full justify-start rounded-xl">
                            <LucideFileText className="w-4 h-4 mr-2 text-blue-500" /> Write Consultation Note
                          </Button>
                          <Button onClick={() => setActiveTab('prescriptions')} variant="outline" className="w-full justify-start rounded-xl">
                            <Pill className="w-4 h-4 mr-2 text-green-500" /> Prescribe Wellness Meds
                          </Button>
                          <Button onClick={() => setActiveTab('labs')} variant="outline" className="w-full justify-start rounded-xl">
                            <FlaskConical className="w-4 h-4 mr-2 text-purple-500" /> Order Diagnostic Labs
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* TAB 2: ANTENATAL CARE LOGS */}
                  <TabsContent value="anc">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Pregnancy Details Form */}
                        <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
                          <CardHeader>
                            <CardTitle className="text-base font-bold">Pregnancy Details</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Last Menstrual Period (LMP)</label>
                              <Input
                                type="date"
                                value={mchRecord.lmp || ''}
                                onChange={(e) => updateMchRecordField('lmp', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Estimated Date of Delivery (EDD)</label>
                              <Input
                                type="date"
                                value={mchRecord.edd || ''}
                                onChange={(e) => updateMchRecordField('edd', e.target.value)}
                              />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Gravida</label>
                                <Input
                                  type="number"
                                  value={mchRecord.gravida ?? 1}
                                  onChange={(e) => updateMchRecordField('gravida', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Para</label>
                                <Input
                                  type="number"
                                  value={mchRecord.para ?? 0}
                                  onChange={(e) => updateMchRecordField('para', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Abortions</label>
                                <Input
                                  type="number"
                                  value={mchRecord.abortions ?? 0}
                                  onChange={(e) => updateMchRecordField('abortions', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Tetanus Toxoid Vaccine Doses */}
                        <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2">
                          <CardHeader>
                            <CardTitle className="text-base font-bold">Tetanus Toxoid (TT) Vaccines</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                              {['TT1', 'TT2', 'TT3', 'TT4', 'TT5'].map((dose) => {
                                const givenDate = mchRecord.ttDoses?.[dose];
                                return (
                                  <div
                                    key={dose}
                                    onClick={() => toggleTTDose(dose)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between items-center text-center ${
                                      givenDate
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700'
                                    }`}
                                  >
                                    <span className="font-bold text-sm block mb-1">{dose}</span>
                                    {givenDate ? (
                                      <>
                                        <StatusBadge status="success" className="mb-1">GIVEN</StatusBadge>
                                        <span className="text-[10px] text-gray-500">{givenDate}</span>
                                      </>
                                    ) : (
                                      <StatusBadge status="scheduled">PENDING</StatusBadge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Maternal Immunizations & Supplements Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Additional Maternal Vaccines */}
                        <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold">Additional Prenatal Immunizations</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {[
                              { key: 'tdap', name: 'Tdap Booster', description: 'Tetanus, Diphtheria, Pertussis (Recommended 27–36 weeks)' },
                              { key: 'influenza', name: 'Influenza (Flu Vaccine)', description: 'Recommended once during pregnancy' },
                              { key: 'covid19', name: 'COVID-19 Vaccine', description: 'Safe & recommended per guidelines' }
                            ].map((vaccine) => {
                              const givenDate = mchRecord.otherVaccines?.[vaccine.key];
                              return (
                                <div
                                  key={vaccine.key}
                                  onClick={() => toggleOtherVaccine(vaccine.key)}
                                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                    givenDate
                                      ? 'bg-emerald-500/10 border-emerald-500/30'
                                      : 'bg-gray-50 border-gray-100 dark:bg-gray-850 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/60'
                                  }`}
                                >
                                  <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{vaccine.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{vaccine.description}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {givenDate ? (
                                      <>
                                        <StatusBadge status="success">ADMINISTERED</StatusBadge>
                                        <span className="text-[10px] text-gray-400 font-medium">{givenDate}</span>
                                      </>
                                    ) : (
                                      <StatusBadge status="danger">NOT ADMINISTERED</StatusBadge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>

                        {/* Routine Supplements */}
                        <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold">Maternal Supplements & Preventive Care</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {[
                              { key: 'ifa', name: 'Iron & Folic Acid (IFA)', description: 'Prevents maternal anemia & neural tube defects' },
                              { key: 'calcium', name: 'Calcium Supplementation', description: 'Prevents gestational pre-eclampsia risk' },
                              { key: 'deworming', name: 'Deworming (Albendazole)', description: 'Single dose administered after 1st trimester' }
                            ].map((supp) => {
                              const givenDate = mchRecord.supplements?.[supp.key];
                              return (
                                <div
                                  key={supp.key}
                                  onClick={() => toggleSupplement(supp.key)}
                                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                    givenDate
                                      ? 'bg-purple-500/10 border-purple-500/30'
                                      : 'bg-gray-50 border-gray-100 dark:bg-gray-850 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/60'
                                  }`}
                                >
                                  <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{supp.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{supp.description}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {givenDate ? (
                                      <>
                                        <StatusBadge status="info">INITIATED</StatusBadge>
                                        <span className="text-[10px] text-gray-400 font-medium">{givenDate}</span>
                                      </>
                                    ) : (
                                      <StatusBadge status="scheduled">PENDING</StatusBadge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      </div>

                      {/* ANC Visits Log Table */}
                      <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <CardTitle className="text-base font-bold">ANC Routine Visits History</CardTitle>
                            <CardDescription>Physical logs during prenatal checkpoints</CardDescription>
                          </div>
                          <Button onClick={() => setIsAncVisitOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl">
                            <PlusIcon className="w-4 h-4 mr-2" /> Log ANC Visit
                          </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Weight (kg)</TableHead>
                                <TableHead>BP</TableHead>
                                <TableHead>Fundal Ht (cm)</TableHead>
                                <TableHead>FHR (bpm)</TableHead>
                                <TableHead>Urine Prot</TableHead>
                                <TableHead>Urine Gluc</TableHead>
                                <TableHead>Assessment Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(!mchRecord.ancVisits || mchRecord.ancVisits.length === 0) ? (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center text-gray-400 py-6">
                                    No visits logged yet. Click "Log ANC Visit" to record details.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                mchRecord.ancVisits.map((visit) => (
                                  <TableRow key={visit.id}>
                                    <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{visit.date}</TableCell>
                                    <TableCell>{visit.weight} kg</TableCell>
                                    <TableCell>{visit.bp}</TableCell>
                                    <TableCell>{visit.fundalHeight} cm</TableCell>
                                    <TableCell>{visit.fhr} bpm</TableCell>
                                    <TableCell>{visit.urineProtein}</TableCell>
                                    <TableCell>{visit.urineGlucose}</TableCell>
                                    <TableCell className="max-w-xs truncate" title={visit.notes}>{visit.notes || '—'}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* TAB 3: POSTNATAL CARE LOGS */}
                  <TabsContent value="pnc">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Birth & Delivery Form */}
                        <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2">
                          <CardHeader>
                            <CardTitle className="text-base font-bold">Delivery & Birth Information</CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Delivery Date & Time</label>
                              <Input
                                type="datetime-local"
                                value={mchRecord.deliveryDate || ''}
                                onChange={(e) => updateMchRecordField('deliveryDate', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Delivery Mode</label>
                              <select
                                value={mchRecord.deliveryMode || 'SVD'}
                                onChange={(e) => updateMchRecordField('deliveryMode', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm"
                              >
                                <option value="SVD">SVD (Spontaneous Vaginal Delivery)</option>
                                <option value="C-Section">C-Section (Cesarean Delivery)</option>
                                <option value="Assisted">Assisted (Forceps/Vacuum)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Birth Outcome</label>
                              <select
                                value={mchRecord.birthOutcome || 'Live birth'}
                                onChange={(e) => updateMchRecordField('birthOutcome', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm"
                              >
                                <option value="Live birth">Live birth</option>
                                <option value="Stillbirth">Stillbirth</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Birth Weight (kg)</label>
                              <Input
                                type="number"
                                step="0.1"
                                value={mchRecord.birthWeight || ''}
                                onChange={(e) => updateMchRecordField('birthWeight', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs text-gray-400 block mb-1">Delivery Location</label>
                              <Input
                                type="text"
                                value={mchRecord.deliveryLocation || ''}
                                onChange={(e) => updateMchRecordField('deliveryLocation', e.target.value)}
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Mother Wellness Metrics */}
                        <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">PNC Objectives</h4>
                            <p className="text-xs text-gray-400 leading-relaxed mb-4">
                              Check maternal bleeding, uterine involution, healing of tears, breastfeeding setup, and infant health milestones during the critical 6-week postnatal period.
                            </p>
                          </div>
                          <StatusBadge status="info" size="md">
                            Critical 6 Weeks Window
                          </StatusBadge>
                        </Card>
                      </div>

                      {/* PNC Visits Table */}
                      <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <CardTitle className="text-base font-bold">PNC Visits Checkups History</CardTitle>
                            <CardDescription>Logs for maternal and neonatal wellness</CardDescription>
                          </div>
                          <Button onClick={() => setIsPncVisitOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                            <PlusIcon className="w-4 h-4 mr-2" /> Log PNC Visit
                          </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Visit Date</TableHead>
                                <TableHead>Maternal BP</TableHead>
                                <TableHead>Lochia Status</TableHead>
                                <TableHead>Breastfeeding status</TableHead>
                                <TableHead>Notes & Assessment</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(!mchRecord.pncVisits || mchRecord.pncVisits.length === 0) ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                                    No PNC checkups recorded yet. Click "Log PNC Visit" to log.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                mchRecord.pncVisits.map((visit) => (
                                  <TableRow key={visit.id}>
                                    <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{visit.date}</TableCell>
                                    <TableCell>{visit.bp}</TableCell>
                                    <TableCell>{visit.lochia}</TableCell>
                                    <TableCell>{visit.breastfeeding}</TableCell>
                                    <TableCell>{visit.notes || '—'}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* TAB 4: CHILD HEALTH & IMMUNIZATIONS */}
                  <TabsContent value="child">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Immunizations Checklist */}
                        <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2 overflow-hidden">
                          <CardHeader className="bg-gray-50/50 dark:bg-gray-950/20 border-b border-gray-100 dark:border-gray-800">
                            <CardTitle className="text-base font-bold">Childhood Immunization Tracker</CardTitle>
                            <CardDescription>Tick boxes once vaccines are administered</CardDescription>
                          </CardHeader>
                          <ScrollArea className="h-[450px]">
                            <div className="p-4 divide-y divide-gray-100 dark:divide-gray-800">
                              {IMMUNIZATION_SCHEDULE.map((vaccine) => {
                                const givenDate = mchRecord.givenVaccines?.[vaccine.id];
                                return (
                                  <div key={vaccine.id} className="py-3 flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{vaccine.name}</span>
                                      <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30 px-2 py-0.5 rounded-full ml-3 font-semibold">{vaccine.age}</span>
                                      <p className="text-xs text-gray-400 mt-0.5">{vaccine.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {givenDate && (
                                        <span className="text-[10px] text-gray-400 font-medium">Given: {givenDate}</span>
                                      )}
                                      <input
                                        type="checkbox"
                                        checked={!!givenDate}
                                        onChange={() => toggleVaccine(vaccine.id)}
                                        className="w-5 h-5 accent-pink-500 rounded border-gray-300 text-pink-600 cursor-pointer focus:ring-pink-500"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </Card>

                        {/* Growth Chart View */}
                        <div className="space-y-6">
                          <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm p-5">
                            <h4 className="font-bold text-sm mb-3">Weight-for-Age Growth Progress</h4>
                            
                            {(!mchRecord.growthRecords || mchRecord.growthRecords.length === 0) ? (
                              <div className="h-40 border border-dashed rounded-xl flex items-center justify-center text-center text-gray-400 text-xs p-4">
                                No logs to display growth line. Log growth metrics to build chart.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* SVG Graph */}
                                <div className="h-40 bg-gray-50 dark:bg-gray-950/40 rounded-xl relative p-2 overflow-hidden flex items-end">
                                  <svg className="w-full h-full text-pink-500" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <polyline
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      points={mchRecord.growthRecords
                                        .map((r, i) => {
                                          const x = (i / Math.max(1, mchRecord.growthRecords!.length - 1)) * 90 + 5;
                                          const y = 95 - (r.weight / 25) * 80; // Assuming Max 25kg
                                          return `${x},${y}`;
                                        })
                                        .join(' ')}
                                    />
                                    {mchRecord.growthRecords.map((r, i) => {
                                      const x = (i / Math.max(1, mchRecord.growthRecords!.length - 1)) * 90 + 5;
                                      const y = 95 - (r.weight / 25) * 80;
                                      return (
                                        <circle
                                          key={r.id}
                                          cx={x}
                                          cy={y}
                                          r="3"
                                          className="fill-purple-600"
                                        />
                                      );
                                    })}
                                  </svg>
                                  <div className="absolute top-2 left-2 text-[9px] text-gray-400">Weight (kg) log</div>
                                  <div className="absolute bottom-2 right-2 text-[9px] text-gray-400">Timeline</div>
                                </div>

                                <div className="text-center text-[10px] text-gray-400">
                                  Line represents pediatric weight log growth trend over time
                                </div>
                              </div>
                            )}
                          </Card>

                          <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm p-5">
                            <h4 className="font-bold text-sm mb-2">Development Milestones</h4>
                            <p className="text-xs text-gray-400 leading-normal">
                              Always check baby development milestones: smiling (2m), sitting (6m), crawling (9m), standing (12m), speaking simple words (18m).
                            </p>
                          </Card>
                        </div>
                      </div>

                      {/* Pediatric Growth Checks Log */}
                      <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <CardTitle className="text-base font-bold">Child Growth & Height Metrics Log</CardTitle>
                            <CardDescription>Logged entries for pediatric size checks</CardDescription>
                          </div>
                          <Button onClick={() => setIsGrowthRecordOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl">
                            <PlusIcon className="w-4 h-4 mr-2" /> Log Growth Check
                          </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Check Date</TableHead>
                                <TableHead>Age (Months)</TableHead>
                                <TableHead>Weight (kg)</TableHead>
                                <TableHead>Height (cm)</TableHead>
                                <TableHead>Head Circ (cm)</TableHead>
                                <TableHead>MUAC (cm)</TableHead>
                                <TableHead>Milestone Status</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(!mchRecord.growthRecords || mchRecord.growthRecords.length === 0) ? (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center text-gray-400 py-6">
                                    No growth metrics logged yet. Click "Log Growth Check" to add.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                mchRecord.growthRecords.map((r) => (
                                  <TableRow key={r.id}>
                                    <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{r.date}</TableCell>
                                    <TableCell>{r.ageMonths} months</TableCell>
                                    <TableCell>{r.weight} kg</TableCell>
                                    <TableCell>{r.height} cm</TableCell>
                                    <TableCell>{r.headCirc} cm</TableCell>
                                    <TableCell>{r.muac} cm</TableCell>
                                    <TableCell>
                                      <StatusBadge status="info">
                                        {r.milestones}
                                      </StatusBadge>
                                    </TableCell>
                                    <TableCell>{r.notes || '—'}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* TAB 5: MCH CONSULTATIONS (DATABASE MEDICAL RECORD INTEGRATION) */}
                  <TabsContent value="consultation">
                    <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                      <CardHeader className="bg-gray-50/50 dark:bg-gray-950/20 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="text-base font-bold">Write Consultation & Physical Examination</CardTitle>
                        <CardDescription>Saves record directly to patient medical history database</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Chief Complaint & Symptoms Notes</label>
                          <textarea
                            value={consultationText}
                            onChange={(e) => setConsultationText(e.target.value)}
                            placeholder="Enter symptoms, patient complaints, fetal movements, wellness issues, or general visit details..."
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm h-28 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Physical Examination Summary</label>
                            <textarea
                              value={physicalExamText}
                              onChange={(e) => setPhysicalExamText(e.target.value)}
                              placeholder="General exam, obstetric exam, maternal/neonatal reflexes..."
                              className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm h-24 focus:ring-2 focus:ring-pink-500/20 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Primary Diagnosis & Recommendations</label>
                            <textarea
                              value={diagnosisText}
                              onChange={(e) => setDiagnosisText(e.target.value)}
                              placeholder="Enter diagnosis, e.g., 'Second trimester normal pregnancy', 'Mild gestational hypertension', 'Healthy neonate'..."
                              className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm h-24 focus:ring-2 focus:ring-pink-500/20 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button onClick={handleSaveConsultation} className="bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl px-6 transform active:scale-95 transition-all">
                            <Save className="w-4 h-4 mr-2" /> Save & Finalize Consultation
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 6: MCH PRESCRIPTIONS (DATABASE INTEGRATION) */}
                  <TabsContent value="prescriptions">
                    <Card className="rounded-2xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                      <CardHeader className="bg-gray-50/50 dark:bg-gray-950/20 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="text-base font-bold">MCH Wellness & Medication Prescriptions</CardTitle>
                        <CardDescription>Issue iron/folic acid, prenatal vitamins, pediatric drops, or wellness medications</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {/* Prescription Form inputs */}
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const data = new FormData(form);
                          
                          const newMed = {
                            medication: data.get('medName') as string || '',
                            dosage: data.get('dosage') as string || '1 tablet',
                            frequency: data.get('frequency') as string || 'QD',
                            duration: data.get('duration') as string || '30 days'
                          };

                          if (!newMed.medication.trim()) {
                            toast.error('Medication name is required');
                            return;
                          }

                          setPrescribedMeds([...prescribedMeds, newMed]);
                          form.reset();
                        }} className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-950/20 p-4 rounded-xl border">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Medication Name</label>
                            <Input name="medName" placeholder="e.g. Iron & Folic Acid, Zinc drops" required />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Dosage</label>
                            <Input name="dosage" placeholder="e.g. 1 tablet, 5ml, 5 drops" defaultValue="1 tablet" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Frequency</label>
                            <select
                              name="frequency"
                              className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm"
                            >
                              <option value="QD">Once Daily (QD)</option>
                              <option value="BID">Twice Daily (BID)</option>
                              <option value="TID">Three times daily (TID)</option>
                              <option value="QID">Four times daily (QID)</option>
                              <option value="PRN">As needed (PRN)</option>
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-400 block mb-1">Duration</label>
                              <Input name="duration" placeholder="e.g. 30 days" defaultValue="30 days" />
                            </div>
                            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl">Add</Button>
                          </div>
                        </form>

                        {/* Prescribed Meds Listing */}
                        <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-950/10">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Medication</TableHead>
                                <TableHead>Dosage</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead className="w-16">Remove</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {prescribedMeds.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-gray-400 py-4">
                                    No medications added to prescription basket yet. Use inputs above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                prescribedMeds.map((med, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-semibold">{med.medication}</TableCell>
                                    <TableCell>{med.dosage}</TableCell>
                                    <TableCell>{med.frequency}</TableCell>
                                    <TableCell>{med.duration}</TableCell>
                                    <TableCell>
                                      <Button
                                        onClick={() => setPrescribedMeds(prescribedMeds.filter((_, i) => i !== idx))}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 font-bold"
                                      >
                                        Delete
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {prescribedMeds.length > 0 && (
                          <div className="flex justify-end pt-2">
                            <Button onClick={handleSavePrescriptions} className="bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl px-6 transform active:scale-95 transition-all">
                              <Printer className="w-4 h-4 mr-2" /> Submit Prescriptions Order
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 7: LAB & IMAGING REQUESTS */}
                  <TabsContent value="labs">
                    <Card className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                      <CardHeader className="bg-gray-50/50 dark:bg-gray-950/20 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="text-base font-bold">Quick MCH Labs Orders</CardTitle>
                        <CardDescription>Order routine Serology, Urinalysis, and Hematology profiles</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { key: 'hemoglobin', title: 'Hemoglobin (Hb) Test', category: 'Hematology', desc: 'Checks anemia in maternal pregnancy.' },
                            { key: 'bloodGroup', title: 'Blood Grouping & Rh Factor', category: 'Serology', desc: 'Determines ABO group & Rh typing.' },
                            { key: 'hivCheck', title: 'HIV Screening', category: 'Serology', desc: 'Part of standard PMTCT pregnancy prevention.' },
                            { key: 'syphilisCheck', title: 'VDRL / Syphilis Check', category: 'Serology', desc: 'Checks syphilis infections in pregnancy.' },
                            { key: 'urineTest', title: 'Routine Urine Analysis', category: 'Urinalysis', desc: 'Checks gestational diabetes or protein trace.' }
                          ].map(test => (
                            <div
                              key={test.key}
                              onClick={() => setLabOrders({ ...labOrders, [test.key]: !labOrders[test.key] })}
                              className={`p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                                labOrders[test.key]
                                  ? 'bg-pink-500/10 border-pink-500 text-pink-900 dark:text-pink-300'
                                  : 'bg-white border-gray-100 dark:bg-gray-950/20 dark:border-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={labOrders[test.key]}
                                readOnly
                                className="w-5 h-5 accent-pink-500 rounded border-gray-300 mt-0.5 cursor-pointer"
                              />
                              <div>
                                <span className="font-bold text-sm block">{test.title}</span>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30 px-2 py-0.5 rounded-full font-semibold">{test.category}</span>
                                <p className="text-xs text-gray-400 mt-1">{test.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                          <Button onClick={handleSaveLabs} className="bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl px-6 transform active:scale-95 transition-all">
                            <FlaskConical className="w-4 h-4 mr-2" /> Submit Labs Order Request
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                <Card className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
                  <ShieldAlert className="w-16 h-16 text-pink-500 mb-4 animate-bounce" />
                  <h3 className="text-xl font-bold text-gray-950 dark:text-gray-100 mb-2">Patient Not Enrolled in MCH Program</h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                    This patient is not registered in our Mother & Child Health (MCH) registry logs yet. Enroll them now in Antenatal, Postnatal, or Child health registry cards to unlock clinical worksheets.
                  </p>
                  <Button onClick={() => setIsEnrollModalOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transform active:scale-95 transition-all">
                    <PlusIcon className="w-4 h-4 mr-2" /> Enroll in MCH Registry Now
                  </Button>
                </Card>
              )}
            </div>
          ) : (
            <Card className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm p-20 text-center bg-white dark:bg-gray-900 flex flex-col items-center justify-center h-[calc(100vh-270px)]">
              <Baby className="w-20 h-20 text-pink-300 dark:text-pink-900 mb-4 animate-pulse" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No MCH Patient Selected</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Please search or select an active patient from the left sidebar to view worksheets, ANC/PNC cards, or to log consultations and prescriptions.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* MODAL 1: ENROLL IN PROGRAM MODAL */}
      {isEnrollModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <Card className="max-w-md w-full rounded-2xl shadow-xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Enroll in MCH Program</CardTitle>
              <CardDescription>Choose registry program card for {selectedPatient.firstName} {selectedPatient.lastName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { value: 'ANC', label: 'Antenatal Care (ANC)', desc: 'Pregnancy progress tracking, EDD calculators, gestational logs.' },
                  { value: 'PNC', label: 'Postnatal Care (PNC)', desc: 'Mother/baby postpartum checkpoints and infant logs.' },
                  { value: 'Child Health', label: 'Child Health & Immunizations', desc: 'Child vaccination checklist and pediatric growth logs.' }
                ].map(prog => (
                  <div
                    key={prog.value}
                    onClick={() => setEnrollProgram(prog.value as any)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                      enrollProgram === prog.value
                        ? 'bg-pink-500/10 border-pink-500 text-pink-900 dark:text-pink-300'
                        : 'bg-white border-gray-100 dark:bg-gray-950/20 dark:border-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={enrollProgram === prog.value}
                      readOnly
                      className="w-5 h-5 accent-pink-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-sm block">{prog.label}</span>
                      <p className="text-xs text-gray-400 mt-1">{prog.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardContent className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
              <Button onClick={() => setIsEnrollModalOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
              <Button onClick={handleEnroll} className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl px-6">Enroll Patient</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2: LOG ANC VISIT */}
      {isAncVisitOpen && mchRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full rounded-2xl shadow-xl bg-white dark:bg-gray-900">
            <form onSubmit={addAncVisit}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Log New ANC Visit</CardTitle>
                <CardDescription>Enter maternal routine parameters for gestation monitoring</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Maternal Weight (kg)</label>
                  <Input type="number" step="0.1" name="weight" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Blood Pressure</label>
                  <Input name="bp" placeholder="e.g. 120/80" defaultValue="120/80" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Fundal Height (cm)</label>
                  <Input type="number" step="0.1" name="fundalHeight" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Fetal Heart Rate (bpm)</label>
                  <Input type="number" name="fhr" placeholder="e.g. 140" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Urine Protein</label>
                  <select name="urineProtein" className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 text-sm">
                    <option value="Negative">Negative</option>
                    <option value="Trace">Trace</option>
                    <option value="+">+</option>
                    <option value="++">++</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Urine Glucose</label>
                  <select name="urineGlucose" className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 text-sm">
                    <option value="Negative">Negative</option>
                    <option value="Trace">Trace</option>
                    <option value="+">+</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1">Assessment Notes</label>
                  <textarea name="notes" placeholder="Enter findings, fetal movement, suggestions..." className="w-full px-3 py-2 border rounded-xl text-sm h-20 bg-white dark:bg-gray-950" />
                </div>
              </CardContent>
              <CardContent className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" onClick={() => setIsAncVisitOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl">Save Log</Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 3: LOG PNC VISIT */}
      {isPncVisitOpen && mchRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full rounded-2xl shadow-xl bg-white dark:bg-gray-900">
            <form onSubmit={addPncVisit}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Log New PNC Checkup</CardTitle>
                <CardDescription>Enter postpartum wellness details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Maternal Blood Pressure</label>
                  <Input name="bp" defaultValue="120/80" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Lochia Status</label>
                  <select name="lochia" className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 text-sm">
                    <option value="Normal">Normal (Involution progressing)</option>
                    <option value="Excessive">Excessive / Heavy</option>
                    <option value="Foul Smelling">Foul Smelling</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Breastfeeding Status</label>
                  <select name="breastfeeding" className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 text-sm">
                    <option value="Exclusive">Exclusive Breastfeeding</option>
                    <option value="Mixed">Mixed feeding</option>
                    <option value="None">Formula / None</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Neonatal Notes</label>
                  <textarea name="notes" placeholder="Umbilical cord clean, baby active, yellow eyes/skin check..." className="w-full px-3 py-2 border rounded-xl text-sm h-20 bg-white dark:bg-gray-950" />
                </div>
              </CardContent>
              <CardContent className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" onClick={() => setIsPncVisitOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">Save Log</Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 4: LOG GROWTH RECORD */}
      {isGrowthRecordOpen && mchRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full rounded-2xl shadow-xl bg-white dark:bg-gray-900">
            <form onSubmit={addGrowthRecord}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Log Pediatric Growth Check</CardTitle>
                <CardDescription>Record measurements to track child height/weight charts</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Age (Months)</label>
                  <Input type="number" name="ageMonths" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Weight (kg)</label>
                  <Input type="number" step="0.1" name="weight" placeholder="e.g. 5.4" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Height / Length (cm)</label>
                  <Input type="number" step="0.1" name="height" placeholder="e.g. 58" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Head Circumference (cm)</label>
                  <Input type="number" step="0.1" name="headCirc" placeholder="e.g. 38.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">MUAC (cm)</label>
                  <Input type="number" step="0.1" name="muac" placeholder="Mid-upper arm circ" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Milestones Status</label>
                  <select name="milestones" className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-950 text-sm">
                    <option value="Normal development">Normal development</option>
                    <option value="Mild delay">Mild delay</option>
                    <option value="Delayed development">Significant delay</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1">Development & Feeding Notes</label>
                  <textarea name="notes" placeholder="Log teething, crawling, child diet, or health issues..." className="w-full px-3 py-2 border rounded-xl text-sm h-20 bg-white dark:bg-gray-950" />
                </div>
              </CardContent>
              <CardContent className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" onClick={() => setIsGrowthRecordOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl">Save Growth Check</Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MCHDashboard;
