import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSafeTheme } from '../../hooks/useSafeTheme';
import api from '../../services/apiService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, User, Clipboard, Heart, LogOut, Moon, Sun, 
  MapPin, Phone, Mail, Award, CheckCircle2, AlertCircle, 
  Lock, Edit3, Save, ChevronRight, FileText, Pill, FileSpreadsheet,
  Stethoscope, Camera
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend
} from 'recharts';

interface PatientData {
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  contactNumber: string;
  email: string;
  profilePic?: string;
  address: any;
  bloodType?: string;
  allergies?: Array<{ allergen: string; reaction: string; severity: string }>;
  emergencyContact?: { name: string; relationship: string; contactNumber: string };
  faydaId?: string;
  nextCheckup?: string;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    prescribedBy?: string;
  }>;
  medicalHistory?: Array<{
    condition?: string;
    diagnosis?: string;
    diagnosedDate?: string;
    notes?: string;
  }>;
}

interface VitalSignsData {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  spo2?: number;
  respiratoryRate?: number;
  bloodSugar?: number;
  notes?: string;
  measuredByName: string;
  measurementDate: string;
  formattedValue: string;
}

interface LabResultData {
  _id: string;
  testName?: string;
  tests?: Array<{ testName: string; price: number }>;
  specimenType?: string;
  status: string;
  paymentStatus: string;
  normalRange?: string;
  results?: any;
  notes?: string;
  orderDateTime: string;
  orderingDoctorId?: { firstName: string; lastName: string; specialization: string };
}

interface MedicalRecordData {
  _id: string;
  doctorName: string;
  doctorId?: { firstName: string; lastName: string; specialization: string };
  chiefComplaint: { description: string; severity: string; duration: string };
  diagnosis: string;
  assessment?: {
    treatmentPlan?: {
      medications?: Array<{ name: string; dosage: string; frequency: string; duration: string; notes?: string }>;
      procedures?: Array<{ name: string; description?: string; urgency: string }>;
      followUpInstructions?: { instructions: string; timing: string };
    };
  };
  notes?: string;
  visitDate: string;
}

const PatientDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useSafeTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'labs' | 'medications' | 'records' | 'profile'>('overview');
  
  // Data States
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [vitals, setVitals] = useState<VitalSignsData[]>([]);
  const [labs, setLabs] = useState<LabResultData[]>([]);
  const [records, setRecords] = useState<MedicalRecordData[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  
  // Loading & Edit States
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Edit Form Fields
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState({ street: '', city: '', state: '' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch Profile
      const profileRes = await api.get('/api/patient-portal/profile');
      if (profileRes.data.success) {
        const pData = profileRes.data.data.patient;
        setPatient(pData);
        setEditPhone(pData.contactNumber || '');
        setEditEmail(pData.email || '');
        setEditAddress({
          street: pData.address?.street || '',
          city: pData.address?.city || '',
          state: pData.address?.state || ''
        });
      }

      // Fetch Vitals
      const vitalsRes = await api.get('/api/patient-portal/vitals');
      if (vitalsRes.data.success) {
        setVitals(vitalsRes.data.data);
      }

      // Fetch Labs
      const labsRes = await api.get('/api/patient-portal/lab-results');
      if (labsRes.data.success) {
        setLabs(labsRes.data.data);
      }

      // Fetch Medical Records
      const recordsRes = await api.get('/api/patient-portal/records');
      if (recordsRes.data.success) {
        setRecords(recordsRes.data.data);
      }

      // Fetch clinic treatments/injections (Nurse Tasks)
      const treatmentsRes = await api.get('/api/patient-portal/treatments');
      if (treatmentsRes.data.success) {
        setTreatments(treatmentsRes.data.data);
      }

      // Fetch prescriptions (Take-home / external medications)
      const prescriptionsRes = await api.get('/api/patient-portal/prescriptions');
      if (prescriptionsRes.data.success) {
        setPrescriptions(prescriptionsRes.data.data);
      }

    } catch (error: any) {
      console.error('❌ [PatientDashboard] Failed to fetch patient data:', error);
      toast.error('Failed to load portal records. Please try logging in again.');
      logout().then(() => navigate('/login'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatePayload = {
        contactNumber: editPhone,
        email: editEmail,
        address: editAddress
      };

      const res = await api.put('/api/patient-portal/profile', updatePayload);
      if (res.data.success) {
        setPatient(res.data.data);
        setIsEditingProfile(false);
        toast.success('Contact details updated successfully.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update contact info.');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      try {
        toast.loading('Uploading profile photo...', { id: 'avatar-upload' });
        const res = await api.put('/api/patient-portal/profile', { profilePic: base64String });
        if (res.data.success) {
          setPatient(res.data.data);
          toast.success('Profile photo updated successfully!', { id: 'avatar-upload' });
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to upload photo.', { id: 'avatar-upload' });
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Render Lab Results in a clean table format
  const renderLabResults = (order: LabResultData) => {
    if (!order.results) return null;

    const tableHeaderStyle = `text-[10px] uppercase font-bold tracking-wider ${
      isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
    } px-4 py-2 border-b`;
    
    const tableRowStyle = `text-xs ${
      isDarkMode ? 'hover:bg-slate-800/20 border-slate-800/50' : 'hover:bg-slate-50/50 border-slate-100'
    } border-b`;

    // Case 1: Results is an object with "results" and "normalRange"
    if (typeof order.results === 'object' && order.results !== null) {
      const resValue = order.results.results;
      const refRange = order.results.normalRange || order.normalRange || 'N/A';
      
      const entries = Object.entries(order.results).filter(([key]) => key !== 'results' && key !== 'normalRange');
      
      if (resValue) {
        return (
          <div className="overflow-hidden rounded-2xl border border-slate-700/10 mt-2">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={tableHeaderStyle}>Test Parameter</th>
                  <th className={tableHeaderStyle}>Result Value</th>
                  <th className={tableHeaderStyle}>Reference Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/10">
                <tr className={tableRowStyle}>
                  <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">{order.testName || 'Result'}</td>
                  <td className="px-4 py-2.5 font-bold text-teal-600 dark:text-teal-400">{resValue}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">{refRange}</td>
                </tr>
                {entries.map(([key, val]) => (
                  <tr key={key} className={tableRowStyle}>
                    <td className="px-4 py-2.5 font-semibold capitalize text-slate-700 dark:text-slate-300">{key.replace(/([A-Z])/g, ' $1')}</td>
                    <td className="px-4 py-2.5 font-bold text-teal-600 dark:text-teal-400">{String(val)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Flat key-value object
      if (Object.keys(order.results).length > 0) {
        return (
          <div className="overflow-hidden rounded-2xl border border-slate-700/10 mt-2">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={tableHeaderStyle}>Parameter</th>
                  <th className={tableHeaderStyle}>Finding / Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/10">
                {Object.entries(order.results).map(([key, val]) => (
                  <tr key={key} className={tableRowStyle}>
                    <td className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                    <td className={`px-4 py-2.5 font-bold ${
                      String(val).toLowerCase().includes('positive') || String(val).toLowerCase().includes('reactive')
                        ? 'text-red-500'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}>{String(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // Case 2: Results is a string
    if (typeof order.results === 'string') {
      const rawStr = order.results.trim();
      
      // Check if it is a list of parameters
      if (rawStr.includes(':') && (rawStr.includes(';') || rawStr.includes('\n'))) {
        const delimiters = rawStr.includes(';') ? ';' : '\n';
        const pairs = rawStr
          .split(delimiters)
          .map(part => part.trim())
          .filter(part => part.length > 0 && part.includes(':'));
        
        if (pairs.length > 0) {
          return (
            <div className="overflow-hidden rounded-2xl border border-slate-700/10 mt-2">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className={tableHeaderStyle}>Parameter</th>
                    <th className={tableHeaderStyle}>Finding / Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/10">
                  {pairs.map((pair, i) => {
                    const idx = pair.indexOf(':');
                    const key = pair.slice(0, idx).trim();
                    const val = pair.slice(idx + 1).trim();
                    return (
                      <tr key={i} className={tableRowStyle}>
                        <td className="px-4 py-2 font-semibold text-slate-500 dark:text-slate-400 capitalize">{key}</td>
                        <td className={`px-4 py-2 font-bold ${
                          val === '-' || val.toLowerCase() === 'negative' || val.toLowerCase() === 'non-reactive'
                            ? 'text-slate-400 dark:text-slate-500' 
                            : val.toLowerCase().includes('positive') || val.toLowerCase().includes('reactive')
                              ? 'text-red-500'
                              : 'text-slate-700 dark:text-slate-200'
                        }`}>{val}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Default string rendering
      return (
        <div className={`mt-2 p-4 rounded-2xl text-xs font-bold border ${
          rawStr.toLowerCase() === 'negative' || rawStr.toLowerCase() === 'non-reactive'
            ? 'bg-green-500/5 border-green-500/15 text-green-500'
            : rawStr.toLowerCase().includes('positive') || rawStr.toLowerCase().includes('reactive')
              ? 'bg-red-500/5 border-red-500/15 text-red-500'
              : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          {rawStr}
        </div>
      );
    }

    return null;
  };

  // Process Vitals for Recharts
  const chartData = [...vitals]
    .reverse() // chart from oldest to newest
    .map(v => ({
      date: new Date(v.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      systolic: v.systolic,
      diastolic: v.diastolic,
      pulse: v.pulse,
      temp: v.temperature,
      oxygen: v.spo2,
      sugar: v.bloodSugar
    }));

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#030712] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 text-teal-500 animate-spin" />
          <p className="text-sm font-semibold animate-pulse">Retrieving your secure clinical record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-[#030712] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      
      {/* Portal Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors ${
        isDarkMode ? 'bg-[#0b152d]/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-600'
            }`}>
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-sm uppercase tracking-wider block">New Life Clinic</span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block -mt-1">Patient Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            
            <div className="hidden sm:flex items-center gap-2 border-l pl-4 border-slate-700/30">
              <span className="text-xs font-semibold text-slate-500">Welcome,</span>
              <span className="text-xs font-bold">{patient?.firstName} {patient?.lastName}</span>
            </div>

            <button 
              onClick={handleLogout}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide border cursor-pointer transition-all ${
                isDarkMode 
                  ? 'border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/15' 
                  : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 z-10 relative">
        
        {/* Patient quick badge & welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-4">
            {/* Avatar Group */}
            <div className="relative group shrink-0">
              <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-2 flex items-center justify-center font-extrabold text-lg sm:text-xl shadow-md transition-all ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-cyan-400' 
                  : 'bg-white border-slate-200 text-teal-700'
              }`}>
                {patient?.profilePic ? (
                  <img 
                    src={patient.profilePic} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>
                    {(patient?.firstName?.[0] || '') + (patient?.lastName?.[0] || '')}
                  </span>
                )}
              </div>
              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer rounded-full z-20" 
              />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Hello, {patient?.firstName}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Fayda ID: <span className="font-semibold">{patient?.faydaId || 'N/A'}</span> • Patient Card ID: <span className="font-semibold">{patient?.patientId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'overview', label: 'My Summary', icon: User },
              { id: 'vitals', label: 'Vital Signs', icon: Heart },
              { id: 'labs', label: 'Lab Results', icon: FileSpreadsheet },
              { id: 'medications', label: 'Medications', icon: Pill },
              { id: 'records', label: 'Recommendations', icon: Stethoscope },
              { id: 'profile', label: 'My Profile', icon: Edit3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all duration-200 border ${
                  activeTab === tab.id
                    ? isDarkMode 
                      ? 'bg-cyan-500/10 border-cyan-400/35 text-cyan-400' 
                      : 'bg-teal-600/10 border-teal-500/30 text-teal-700'
                    : isDarkMode 
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Stats & Demographic Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Summary Card */}
                  <div className={`border p-6 rounded-3xl grid grid-cols-2 sm:grid-cols-4 gap-6 ${
                    isDarkMode ? 'bg-[#0f1934]/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    {[
                      { label: 'Age', value: `${patient?.age || 'N/A'} yrs` },
                      { label: 'Gender', value: patient?.gender || 'N/A', class: 'capitalize' },
                      { label: 'Blood Group', value: patient?.bloodType || 'N/A' },
                      { label: 'Next Checkup', value: patient?.nextCheckup ? new Date(patient.nextCheckup).toLocaleDateString() : 'None Scheduled' }
                    ].map((stat, i) => (
                      <div key={i} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{stat.label}</span>
                        <span className={`text-base font-extrabold block ${stat.class || ''}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Allergy Banner */}
                  {patient?.allergies && patient.allergies.length > 0 ? (
                    <div className="rounded-2xl p-4 border border-red-500/20 bg-red-500/5 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">Allergies Detected</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {patient.allergies.map((allergy, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-300 capitalize">
                              {allergy.allergen} • {allergy.severity} ({allergy.reaction})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-4 border border-green-500/20 bg-green-500/5 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-green-400 uppercase tracking-wide">No Active Allergies</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">No drug or food allergies have been reported to your clinical file.</p>
                      </div>
                    </div>
                  )}

                  {/* Recent Activity Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Health Records</h3>
                    {records.length > 0 ? (
                      <div className="space-y-4">
                        {records.slice(0, 2).map((record, idx) => (
                          <div key={idx} className={`border p-5 rounded-2xl flex flex-col sm:flex-row items-start gap-4 transition-all ${
                            isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            <div className={`p-3 rounded-xl shrink-0 ${
                              isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-700'
                            }`}>
                              <Stethoscope className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Medical Record - {record.doctorName}</h4>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {new Date(record.visitDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}>
                                  {record.chiefComplaint?.severity || 'Normal'}
                                </span>
                              </div>
                              <p className="text-xs font-bold">Diagnosis: <span className="font-semibold text-slate-500">{record.diagnosis}</span></p>
                              {record.assessment?.treatmentPlan?.medications && record.assessment.treatmentPlan.medications.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prescribed Medications</p>
                                  <div className="flex flex-wrap gap-2">
                                    {record.assessment.treatmentPlan.medications.map((med, i) => (
                                      <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border ${
                                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                                      }`}>
                                        <Pill className="h-3 w-3 text-teal-500" />
                                        {med.name} ({med.dosage})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`border p-6 rounded-2xl text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                        No finalized medical records available.
                      </div>
                    )}
                  </div>

                  {/* Past History */}
                  <div className="space-y-3 mt-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Clipboard className="h-4 w-4 text-cyan-500" /> Past Medical History
                    </h3>
                    {patient?.medicalHistory && patient.medicalHistory.length > 0 ? (
                      <div className="space-y-3">
                        {patient.medicalHistory.map((hist, idx) => (
                          <div key={idx} className={`border p-4 rounded-2xl flex flex-col sm:flex-row justify-between gap-3 ${
                            isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            <div className="space-y-1 text-xs">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border bg-cyan-500/10 border-cyan-500/25 text-cyan-400`}>
                                {hist.condition || 'Condition'}
                              </span>
                              <p className="font-extrabold mt-1">{hist.diagnosis}</p>
                              {hist.notes && <p className="text-[11px] text-slate-500 italic mt-1">"{hist.notes}"</p>}
                            </div>
                            {hist.diagnosedDate && (
                              <div className="text-right shrink-0">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Diagnosed Date</span>
                                <span className="text-xs font-semibold text-slate-500">
                                  {new Date(hist.diagnosedDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`border p-4 rounded-2xl text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                        No past medical history recorded.
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                  {/* Emergency Contact */}
                  <div className={`border p-5 rounded-3xl space-y-4 ${
                    isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" /> Emergency Contact
                    </h4>
                    {patient?.emergencyContact?.name ? (
                      <div className="space-y-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</span>
                          <span className="text-xs font-bold">{patient.emergencyContact.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Relationship</span>
                            <span className="text-xs font-bold capitalize">{patient.emergencyContact.relationship}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Phone Number</span>
                            <span className="text-xs font-bold">{patient.emergencyContact.contactNumber}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No emergency contact registered in clinical file.</p>
                    )}
                  </div>

                  {/* Clinic Contact details */}
                  <div className={`border p-5 rounded-3xl space-y-4 ${
                    isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Care Facility</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                        <span className="text-slate-500">Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-500">+251 11 661 2345</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-500">support@newlifeclinic.et</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vital Signs Tab */}
            {activeTab === 'vitals' && (
              <div className="space-y-8">
                
                {/* Recharts Vitals Plotting */}
                {chartData.length > 0 ? (
                  <div className={`border p-6 rounded-3xl space-y-6 ${
                    isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <h3 className="text-sm font-extrabold">Blood Pressure & Heart Rate Trends</h3>
                      <p className="text-[11px] text-slate-500">Showing changes across clinical visits</p>
                    </div>
                    <div className="h-64 sm:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ 
                              background: isDarkMode ? '#0b1329' : '#ffffff', 
                              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                              color: isDarkMode ? '#ffffff' : '#0f172a',
                              fontSize: '11px',
                              borderRadius: '12px'
                            }} 
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          <Line type="monotone" dataKey="systolic" name="Systolic BP" stroke="#f43f5e" strokeWidth={2.5} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#3b82f6" strokeWidth={2.5} />
                          <Line type="monotone" dataKey="pulse" name="Heart Rate (bpm)" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : null}

                {/* Vitals History Table */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Measurements History</h3>
                  {vitals.length > 0 ? (
                    <div className="overflow-x-auto rounded-3xl border border-slate-700/20">
                      <table className="w-full text-xs text-left">
                        <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                          isDarkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-500'
                        }`}>
                          <tr>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">BP (mmHg)</th>
                            <th className="px-5 py-4">Heart Rate</th>
                            <th className="px-5 py-4">Temp</th>
                            <th className="px-5 py-4">SpO2</th>
                            <th className="px-5 py-4">Weight & Height</th>
                            <th className="px-5 py-4">BMI</th>
                            <th className="px-5 py-4">Recorded By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/20">
                          {vitals.map((v, i) => (
                            <tr key={i} className={`hover:bg-slate-700/5 transition-colors ${
                              isDarkMode ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50/50'
                            }`}>
                              <td className="px-5 py-4 font-semibold whitespace-nowrap">
                                {new Date(v.measurementDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </td>
                              <td className="px-5 py-4 font-bold text-rose-500">
                                {v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : 'N/A'}
                              </td>
                              <td className="px-5 py-4 font-medium">{v.pulse ? `${v.pulse} bpm` : 'N/A'}</td>
                              <td className="px-5 py-4">{v.temperature ? `${v.temperature}°C` : 'N/A'}</td>
                              <td className="px-5 py-4 font-bold text-teal-500">{v.spo2 ? `${v.spo2}%` : 'N/A'}</td>
                              <td className="px-5 py-4 text-slate-500">
                                {v.weight ? `${v.weight} kg` : ''} {v.height ? `• ${v.height} cm` : ''}
                              </td>
                              <td className="px-5 py-4 font-bold">{v.bmi || 'N/A'}</td>
                              <td className="px-5 py-4 text-slate-500">{v.measuredByName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`border p-8 rounded-3xl text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                      No vital signs measurements on record.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lab Results Tab */}
            {activeTab === 'labs' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold">My Diagnostic Results</h2>
                    <p className="text-xs text-slate-500">Instant access to verified clinical lab tests</p>
                  </div>
                </div>

                {labs.length > 0 ? (
                  <div className="space-y-6">
                    {labs.map((order, idx) => {
                      const hasDetails = order.results || order.notes || order.stoolExamDetails;
                      return (
                        <div key={idx} className={`border rounded-3xl overflow-hidden ${
                          isDarkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          {/* Order Header */}
                          <div className={`px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${
                            isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Ordered Date</span>
                              <span className="text-xs font-bold">
                                {new Date(order.orderDateTime).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {order.orderingDoctorId && (
                                <span className="text-xs text-slate-500">
                                  Ordered By: <span className="font-bold text-slate-700 dark:text-slate-300">Dr. {order.orderingDoctorId.lastName}</span>
                                </span>
                              )}
                              <span className={`px-2.5 py-0.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${
                                order.status === 'Results Available' || order.status === 'Completed'
                                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </div>

                          {/* Order Tests Content */}
                          <div className="p-6 space-y-4">
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tests In This Order</span>
                              <div className="flex flex-wrap gap-2">
                                {order.tests && order.tests.length > 0 ? (
                                  order.tests.map((test, i) => (
                                    <span key={i} className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}>
                                      {test.testName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="px-3 py-1 rounded-xl text-xs font-bold border">{order.testName}</span>
                                )}
                              </div>
                            </div>

                            {/* Results & Details */}
                            {(order.status === 'Results Available' || order.results) ? (
                              <div className="mt-4 border-t border-slate-700/20 pt-4 space-y-4">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Clinical Findings / Results</span>
                                  {renderLabResults(order)}
                                </div>

                                {/* Specimen & Normal Range */}
                                <div className="grid grid-cols-2 gap-4">
                                  {order.specimenType && (
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Specimen</span>
                                      <span className="text-xs font-bold capitalize">{order.specimenType}</span>
                                    </div>
                                  )}
                                  {order.normalRange && (
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Reference Range</span>
                                      <span className="text-xs font-bold font-mono">{order.normalRange}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Stool details details if present */}
                                {order.stoolExamDetails && (
                                  <div className="border-t border-slate-700/10 pt-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Microscopic Details</span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                      {Object.entries(order.stoolExamDetails).map(([key, value]) => {
                                        if (!value) return null;
                                        return (
                                          <div key={key}>
                                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                            <span className="font-bold">{value as string}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Notes if present */}
                                {order.notes && (
                                  <div className="border-t border-slate-700/10 pt-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Laboratory Notes</span>
                                    <p className="text-xs italic text-slate-500 mt-1">{order.notes}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-4 border-t border-slate-700/20 pt-4 flex items-center gap-2 text-xs text-slate-500">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                Findings will appear here once the lab results are verified by the technician.
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`border p-8 rounded-3xl text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                    No diagnostic lab orders on file.
                  </div>
                )}
              </div>
            )}

            {/* Medications Tab */}
            {activeTab === 'medications' && (() => {
              const takeHomePrescriptions = prescriptions.filter(rx => !rx.sendToNurse);
              
              return (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-extrabold">My Medications & Injections</h2>
                    <p className="text-xs text-slate-500">View your active prescriptions and clinic-administered treatments</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Column 1: Clinic Injections & Infusions */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-rose-500 animate-pulse" /> Clinic Administered Treatments
                      </h3>
                      
                      {treatments && treatments.length > 0 ? (
                        <div className="overflow-x-auto rounded-3xl border border-slate-700/10">
                          <table className="w-full text-xs text-left">
                            <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                              isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                            } border-b`}>
                              <tr>
                                <th className="px-4 py-3">Treatment / Medication</th>
                                <th className="px-4 py-3">Dosage & Route</th>
                                <th className="px-4 py-3 text-center">Progress</th>
                                <th className="px-4 py-3">Nurse & Due Date</th>
                                <th className="px-4 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/10">
                              {treatments.map((task, idx) => {
                                const medDetails = task.medicationDetails;
                                const totalDoses = medDetails?.doseRecords?.length || 0;
                                const givenDoses = medDetails?.doseRecords?.filter((r: any) => r.administered).length || 0;
                                const isAllGiven = totalDoses > 0 && givenDoses === totalDoses;
                                const displayStatus = isAllGiven ? 'COMPLETED' : task.status;

                                return (
                                  <tr key={idx} className={`${isDarkMode ? 'hover:bg-slate-800/10' : 'hover:bg-slate-55/50'} transition-all`}>
                                    <td className="px-4 py-3.5">
                                      <span className="font-extrabold text-slate-800 dark:text-white block">{medDetails?.medicationName || task.description}</span>
                                      {medDetails?.instructions && (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-relaxed">{medDetails.instructions}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                                      <span className="block">{medDetails?.dosage || '1 unit'}</span>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 capitalize">{medDetails?.route || 'Intravenous'}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-teal-500/10 text-teal-500 border border-teal-500/20">
                                        {givenDoses} of {totalDoses} Given
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                      <span className="block font-medium">
                                        {new Date(task.dueDate || task.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                      </span>
                                      {task.assignedToName && (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">Nurse: {task.assignedToName}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                                        displayStatus === 'PENDING'
                                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                                          : 'bg-green-500/10 border-green-500/20 text-green-500'
                                      }`}>
                                        {displayStatus}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className={`border p-6 rounded-3xl text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                          No scheduled clinic medications or injections on record.
                        </div>
                      )}
                    </div>

                    {/* Column 2: Prescribed / Take-Home Medications */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Pill className="h-4 w-4 text-teal-500" /> Prescribed Medications (Take-Home)
                      </h3>
                      
                      {takeHomePrescriptions && takeHomePrescriptions.length > 0 ? (
                        <div className="overflow-x-auto rounded-3xl border border-slate-700/10">
                          <table className="w-full text-xs text-left">
                            <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                              isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                            } border-b`}>
                              <tr>
                                <th className="px-4 py-3">Prescribed Meds</th>
                                <th className="px-4 py-3">Dosage & Route</th>
                                <th className="px-4 py-3">Date & Doctor</th>
                                <th className="px-4 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/10">
                              {takeHomePrescriptions.map((rx, idx) => {
                                const medList = rx.medications && rx.medications.length > 0 ? rx.medications : [{
                                  name: rx.medicationName || rx.medication,
                                  dosage: rx.dosage,
                                  frequency: rx.frequency,
                                  route: rx.route,
                                  notes: rx.instructions || rx.notes
                                }];
                                return medList.map((med: any, i: number) => (
                                  <tr key={`${idx}-${i}`} className={`${isDarkMode ? 'hover:bg-slate-800/10' : 'hover:bg-slate-50/50'} transition-all`}>
                                    <td className="px-4 py-3.5">
                                      <span className="font-extrabold text-slate-800 dark:text-white block">{med.name}</span>
                                      {med.notes && (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-relaxed">{med.notes}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                                      <span className="block">{med.dosage} • {med.frequency}</span>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 capitalize">{med.route || 'Oral'}</span>
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                      <span className="block font-medium">
                                        {new Date(rx.datePrescribed || rx.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                      </span>
                                      {rx.doctor && (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">Dr. {rx.doctor.lastName}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                                        rx.status === 'Active' || rx.status === 'Completed'
                                          ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                          : rx.status === 'Cancelled'
                                            ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                      }`}>
                                        {rx.status}
                                      </span>
                                    </td>
                                  </tr>
                                ));
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className={`border p-6 rounded-3xl text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                          No take-home medications or prescriptions on file.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Recommendations Tab */}
            {activeTab === 'records' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold">Doctor Recommendations & Records</h2>
                  <p className="text-xs text-slate-500">Official medical advice from your consultants</p>
                </div>

                {records.length > 0 ? (
                  <div className="space-y-6">
                    {records.map((record, idx) => (
                      <div key={idx} className={`border rounded-3xl overflow-hidden ${
                        isDarkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        
                        {/* Record Header */}
                        <div className={`px-6 py-5 flex justify-between items-center border-b ${
                          isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Consultant: {record.doctorName}</h3>
                            {record.doctorId?.specialization && (
                              <span className="text-[10px] text-slate-500 block">{record.doctorId.specialization}</span>
                            )}
                          </div>

                          <span className="text-xs font-bold text-slate-500">
                            {new Date(record.visitDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </span>
                        </div>

                        {/* Record Body */}
                        <div className="p-6 space-y-5 text-xs">
                          {/* Chief Complaint */}
                          {record.chiefComplaint?.description && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Chief Complaint</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium">
                                {record.chiefComplaint.description} {record.chiefComplaint.duration ? `(${record.chiefComplaint.duration})` : ''}
                              </p>
                            </div>
                          )}

                          {/* Diagnosis */}
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Diagnosis</span>
                            <p className="text-base font-extrabold text-teal-600 dark:text-teal-400 mt-1">{record.diagnosis}</p>
                          </div>

                          {/* Treatment Plan & Recommendations */}
                          {record.assessment?.treatmentPlan && (
                            <div className="border-t border-slate-700/10 pt-4 space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Treatment Plan & Directives</h4>
                              
                              {/* Medications */}
                              {record.assessment.treatmentPlan.medications && record.assessment.treatmentPlan.medications.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Active Prescriptions</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {record.assessment.treatmentPlan.medications.map((med, i) => (
                                      <div key={i} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                                        isDarkMode ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                                      }`}>
                                        <Pill className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                          <p className="font-extrabold text-slate-700 dark:text-slate-200">{med.name}</p>
                                          <p className="text-[11px] text-slate-500">
                                            Dosage: <span className="font-bold">{med.dosage}</span> • Freq: <span className="font-bold">{med.frequency}</span>
                                          </p>
                                          {med.duration && (
                                            <p className="text-[10px] text-slate-400">Duration: {med.duration}</p>
                                          )}
                                          {med.notes && (
                                            <p className="text-[10px] italic text-slate-500 mt-1">Instructions: {med.notes}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Follow Up */}
                              {record.assessment.treatmentPlan.followUpInstructions?.instructions && (
                                <div className="space-y-1 border-l-2 border-teal-500 pl-3">
                                  <span className="text-[10px] font-semibold text-teal-500 uppercase block">Follow Up Advice</span>
                                  <p className="font-medium">{record.assessment.treatmentPlan.followUpInstructions.instructions}</p>
                                  {record.assessment.treatmentPlan.followUpInstructions.timing && (
                                    <span className="text-[10px] text-slate-500">Recommended timing: {record.assessment.treatmentPlan.followUpInstructions.timing}</span>
                                  )}
                                </div>
                              )}

                            </div>
                          )}

                          {/* Notes if any */}
                          {record.notes && (
                            <div className="border-t border-slate-700/10 pt-4 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Consultation Remarks</span>
                              <p className="text-slate-600 dark:text-slate-400 italic">{record.notes}</p>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`border p-8 rounded-3xl text-center text-xs text-slate-500 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                    No finalized recommendations on file.
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Profile Card details */}
                <div className="lg:col-span-2 space-y-6">
                  <div className={`border p-6 sm:p-8 rounded-3xl space-y-6 ${
                    isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center border-b pb-4 border-slate-700/20">
                      <div>
                        <h3 className="text-base font-extrabold">My Contact Information</h3>
                        <p className="text-[11px] text-slate-500">Keep your details up to date to get notifications</p>
                      </div>
                      
                      {!isEditingProfile && (
                        <button
                          onClick={() => setIsEditingProfile(true)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                            isDarkMode 
                              ? 'border-slate-800 hover:bg-slate-800 text-cyan-400' 
                              : 'border-slate-200 hover:bg-slate-50 text-teal-600'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                        </button>
                      )}
                    </div>

                    {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                                border: isDarkMode ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(226,232,240,1)'
                              }}
                              className="w-full h-11 px-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 text-xs"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                                border: isDarkMode ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(226,232,240,1)'
                              }}
                              className="w-full h-11 px-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 text-xs"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Street</label>
                            <input
                              type="text"
                              value={editAddress.street}
                              onChange={(e) => setEditAddress({ ...editAddress, street: e.target.value })}
                              style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                                border: isDarkMode ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(226,232,240,1)'
                              }}
                              className="w-full h-11 px-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 text-xs"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">City</label>
                            <input
                              type="text"
                              value={editAddress.city}
                              onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })}
                              style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                                border: isDarkMode ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(226,232,240,1)'
                              }}
                              className="w-full h-11 px-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">State / Region</label>
                            <input
                              type="text"
                              value={editAddress.state}
                              onChange={(e) => setEditAddress({ ...editAddress, state: e.target.value })}
                              style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                                border: isDarkMode ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(226,232,240,1)'
                              }}
                              className="w-full h-11 px-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3">
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 cursor-pointer shadow-md transition-colors"
                          >
                            <Save className="h-4 w-4" /> Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingProfile(false);
                              setEditPhone(patient?.contactNumber || '');
                              setEditEmail(patient?.email || '');
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                              isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Phone Number</span>
                          <span className="text-xs font-bold">{patient?.contactNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
                          <span className="text-xs font-bold">{patient?.email || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Address</span>
                          <span className="text-xs font-bold">
                            {patient?.address?.street ? `${patient.address.street}, ` : ''}
                            {patient?.address?.city ? `${patient.address.city}, ` : ''}
                            {patient?.address?.state || ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Meta Cards */}
                <div className="space-y-6">
                  {/* Account Security details */}
                  <div className={`border p-5 rounded-3xl space-y-4 ${
                    isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Lock className="h-4 w-4 text-cyan-400" /> Portal Credentials
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Username (Login ID)</span>
                        <span className="text-xs font-bold font-mono">{user?.username}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Role Scope</span>
                        <span className="text-xs font-bold capitalize">Patient Portal Access</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className={`py-8 text-center text-xs font-medium border-t mt-auto transition-colors ${
        isDarkMode ? 'bg-slate-900/40 border-slate-800/80 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        <p>© {new Date().getFullYear()} New Life Clinic. All clinical data is securely encrypted.</p>
      </footer>
    </div>
  );
};

export default PatientDashboard;
