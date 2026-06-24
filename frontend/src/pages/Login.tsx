import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { 
  Moon, Sun, Eye, EyeOff, Users, Activity, ShieldCheck, Clock,
  Calendar, CreditCard, Search, Filter, CheckCircle2, ChevronRight,
  ChevronLeft, ArrowRight, Printer, Sparkles, User, Phone, Mail,
  Award, Check, BookOpen, Stethoscope, FileText, CheckCircle
} from 'lucide-react';
import { getClinicTenantId } from '../utils/authToken';
import api from '../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinic } from '../context/ClinicContext';

const LoginSchema = Yup.object().shape({
  email: Yup.string().required('Username or email is required'),
  password: Yup.string().min(3, 'Password must be at least 3 characters').required('Password is required'),
  clinicId: Yup.string().trim(),
});

const stats = [
  { value: '10K+', label: 'Patients Served', icon: Users },
  { value: '50+', label: 'Staff Members', icon: ShieldCheck },
  { value: '99.9%', label: 'Uptime', icon: Activity },
  { value: '24/7', label: 'Support', icon: Clock },
];

// ─── Real clinic information ───────────────────────────────────────
const CLINIC_INFO = {
  name: 'New Life Clinic',
  tagline: 'Smart Healthcare',
  address: 'Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia',
  phone: '+251 11 661 2345',
  mobile: '+251 911 22 33 44',
  email: 'info@newlifeclinic.et',
  hours: [
    { day: 'Monday – Friday', time: '8:00 AM – 8:00 PM' },
    { day: 'Saturday', time: '8:00 AM – 5:00 PM' },
    { day: 'Sunday', time: '9:00 AM – 2:00 PM' },
    { day: 'Emergency', time: '24/7 Available' },
  ],
};

const CLINIC_DEPARTMENTS = [
  { name: 'General Medicine', desc: 'Primary care and internal medicine consultations for adults and adolescents.', icon: Stethoscope },
  { name: 'Pediatrics', desc: 'Comprehensive child healthcare including vaccinations, growth monitoring, and acute care.', icon: Users },
  { name: 'Laboratory & Diagnostics', desc: 'Full-service clinical lab with CBC, urinalysis, chemistry panels, RBS, and more.', icon: Activity },
  { name: 'Imaging & Ultrasound', desc: 'Diagnostic imaging including standard and detailed ultrasound examinations.', icon: FileText },
  { name: 'Pharmacy', desc: 'In-house pharmacy dispensing prescribed medications with patient counselling.', icon: ShieldCheck },
  { name: 'Nursing & Injection', desc: 'IV, IM, and SC injections, wound care, vital-sign monitoring, and patient follow-up.', icon: Award },
];

// Fallback services (used when API returns empty)
const FALLBACK_SERVICES = [
  { _id: '694260a993403d86226af87d', name: 'Complete Blood Count (CBC)', category: 'lab', price: 300, description: 'Laboratory test for Complete Blood Count (CBC).' },
  { _id: '68e3c0886bffcd96932d0546', name: 'blood pressure', category: 'procedure', price: 10, description: 'Routine checking of blood pressure levels.' },
  { _id: '68e3c12f6bffcd96932d0698', name: 'wound care', category: 'procedure', price: 400, description: 'Professional cleaning and dressing of wounds.' },
  { _id: '68e3c2656bffcd96932d0806', name: 'wound care and switching', category: 'procedure', price: 1000, description: 'Wound dressing along with surgical suturing of lacerations.' },
  { _id: '68e3c2f66bffcd96932d087b', name: 'Depo', category: 'injection', price: 150, description: 'Depo contraceptive injection service.' },
  { _id: '68e3c34b6bffcd96932d08af', name: 'Implanon insertion', category: 'injection', price: 500, description: 'Subdermal contraceptive implant insertion service.' },
  { _id: '68e3c38a6bffcd96932d08d5', name: 'Implanon Removal', category: 'injection', price: 100, description: 'Safe removal of subdermal contraceptive implant.' },
  { _id: '68e3c3bb6bffcd96932d08f8', name: 'consultation', category: 'consultation', price: 300, description: 'General medical consultation with our leading practitioner.' },
  { _id: '68e3c3ed6bffcd96932d091c', name: 'Im injection', category: 'injection', price: 50, description: 'Intramuscular medication administration service.' },
  { _id: '68e3c41c6bffcd96932d0942', name: 'Iv injection', category: 'injection', price: 100, description: 'Intravenous medication administration service.' },
  { _id: '68e3c5276bffcd96932d09eb', name: 'Abdominal and pelvic for health center', category: 'ultrasound', price: 300, description: 'Standard abdominal and pelvic scan for health center patients.' },
  { _id: '68e3c5786bffcd96932d0a19', name: 'Abdominal and pelvic personal', category: 'imaging', price: 400, description: 'Personalized comprehensive abdominal and pelvic ultrasound.' },
  { _id: '68e3c5df6bffcd96932d0a55', name: 'obstetrics health center', category: 'imaging', price: 300, description: 'Antenatal fetal tracking and development ultrasound.' },
  { _id: '68e3c6276bffcd96932d0a8a', name: 'obstetrics personal', category: 'imaging', price: 400, description: 'Detailed personalized prenatal obstetric ultrasound scan.' },
  { _id: '68e3c6976bffcd96932d0ad6', name: 'Glucose, Fasting', category: 'lab', price: 100, description: 'Fasting blood glucose test for diabetes screening.' },
  { _id: '68ed4108f36790a3fc13b4d6', name: 'Widal O & H Test (100 tests)', category: 'lab', price: 250, description: 'Serological test for typhoid fever antibody detection.' },
  { _id: '68ed413df36790a3fc13b531', name: 'Weil-Felix Test (100 tests)', category: 'lab', price: 99.99, description: 'Serological test for rickettsial infection screening.' },
  { _id: '68ed419df36790a3fc13b5ff', name: 'Stool Exam (Routine)', category: 'lab', price: 100, description: 'Routine stool microscopic examination for parasites and ova.' },
  { _id: '68ed4235f36790a3fc13b712', name: 'CRP Fluid/Reagent (100 tests)', category: 'lab', price: 500, description: 'C-reactive protein test for systemic inflammation screening.' },
  { _id: '68ed42bff36790a3fc13b811', name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'lab', price: 250, description: 'Blood test measuring the rate of red blood cell settling.' },
  { _id: '68ed42dff36790a3fc13b860', name: 'White Blood Cell Count', category: 'lab', price: 200, description: 'Specific count of immune-system white blood cells.' },
  { _id: '68ed4334f36790a3fc13b8e8', name: 'HIV Antibody', category: 'lab', price: 400, description: 'Rapid diagnostic screening test for HIV antibodies.' },
  { _id: '68ed4375f36790a3fc13b950', name: 'Complete Urinalysis', category: 'lab', price: 200, description: 'Complete physical and chemical examination of urine.' },
  { _id: '68ed44f4f36790a3fc13bbd5', name: 'Hemoglobin', category: 'lab', price: 200, description: 'Quantitative measurement of hemoglobin concentration.' },
  { _id: '68ee0188910bacc486b21d8f', name: 'Fecal Occult Blood Test (FOBT)', category: 'lab', price: 300, description: 'Test for hidden blood in stool for gastrointestinal screening.' },
  { _id: '68f26e519c96a164b619b0a0', name: 'Pelvic Ultrasound', category: 'imaging', price: 400, description: 'Targeted ultrasound examination of pelvic structures.' },
  { _id: '68f8aeb6f9283ce863e17650', name: 'ALT (SGPT)', category: 'lab', price: 200, description: 'Alanine Aminotransferase blood test to assess liver function.' },
  { _id: '6903783522d4dbb9d040b26d', name: 'Malaria Blood Test (with Kit)', category: 'lab', price: 200, description: 'Diagnostic smear or rapid kit test for malaria parasite.' },
  { _id: '690d90011963e8b5d91703e7', name: 'Rheumatoid Factor', category: 'lab', price: 250, description: 'Blood test for autoimmune rheumatoid arthritis detection.' },
  { _id: '691b4e5bdb8f9500d62e9447', name: 'urine Hcg', category: 'lab', price: 200, description: 'Rapid diagnostic test for human chorionic gonadotropin in urine.' },
];

// Fallback health packages (used when API returns empty)
const FALLBACK_PACKAGES = [
  {
    _id: '6a3b916cbe2a72b5ef2d0ed6',
    name: 'Diabetic Package',
    description: 'Comprehensive tracking for patients with diabetes. Includes routine fasting/random blood sugar levels, HbA1c tests, lipid panels, and regular doctor reviews.',
    price: 3000,
    total_visits: 6,
    validity_days: 180,
    services: [
      'FBS (Fasting Blood Sugar)',
      'RBS (Random Blood Sugar)',
      'HbA1c test',
      'Lipid Profile',
      'Nurse Vitals Check',
      'Doctor Consultation'
    ],
  },
  {
    _id: '6a3b916cbe2a72b5ef2d0ed7',
    name: 'Hypertension Package',
    description: 'Designed for patients managing hypertension. Focuses on regular blood pressure monitoring, ECG checks, and clinical evaluations.',
    price: 1800,
    total_visits: 4,
    validity_days: 90,
    services: [
      'Blood Pressure Monitor',
      'ECG (Electrocardiogram)',
      'Nurse Vitals Check',
      'Doctor Consultation'
    ],
  },
  {
    _id: '6a3b916cbe2a72b5ef2d0ed8',
    name: 'Annual Checkup Package',
    description: 'A full-body checkup package to review overall health indicators, blood counts, organ functions, and key clinical vital metrics.',
    price: 4500,
    total_visits: 3,
    validity_days: 365,
    services: [
      'CBC (Complete Blood Count)',
      'Urinalysis',
      'Renal Function Test (RFT)',
      'Liver Function Test (LFT)',
      'Lipid Profile',
      'Nurse Vitals Check',
      'Doctor Consultation'
    ],
  }
];

// Fallback doctors (used when API returns empty)
const FALLBACK_DOCTORS = [
  { id: '6823301cdefc7776bf7537b3', firstName: 'DR', lastName: 'Natan', specialization: 'General Medicine' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// Cold-start warm-up: max 5 minutes in 1-second ticks
const WARMUP_MAX_SECONDS = 300;

type Tab = 'home' | 'services' | 'packages' | 'appointment' | 'card' | 'login';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, getRoleBasedRoute } = useAuth();
  const { clinic } = useClinic();
  const { isDarkMode, toggleTheme } = useSafeTheme();
  
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupSeconds, setWarmupSeconds] = useState(0);
  const warmupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Landing page public data states
  const [services, setServices] = useState<any[]>(FALLBACK_SERVICES);
  const [packages, setPackages] = useState<any[]>(FALLBACK_PACKAGES);
  const [doctors, setDoctors] = useState<any[]>(FALLBACK_DOCTORS);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Self-booking wizard states
  const [bookingStep, setBookingStep] = useState(1);
  const [isNewPatient, setIsNewPatient] = useState(true);
  const [returningId, setReturningId] = useState('');
  const [returningPhone, setReturningPhone] = useState('');
  const [returningPatientData, setReturningPatientData] = useState<any>(null);
  const [bookingPatientData, setBookingPatientData] = useState({
    firstName: '',
    lastName: '',
    gender: 'male',
    age: '',
    dateOfBirth: '',
    contactNumber: '',
    email: '',
  });
  const [bookingDetails, setBookingDetails] = useState({
    doctorId: '',
    appointmentDateTime: '',
    type: 'Consultation',
    reason: '',
    department: 'General Medicine'
  });
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Patient Card wizard states
  const [cardStep, setCardStep] = useState(1);
  const [cardForm, setCardForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'male',
    age: '',
    dateOfBirth: '',
    contactNumber: '',
    email: '',
    bloodType: 'A+',
    allergies: '',
    cardType: 'Basic'
  });
  const [cardResult, setCardResult] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);

  // Load public data on mount
  useEffect(() => {
    fetchServices();
    fetchPackages();
    fetchDoctors();
  }, []);

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const res = await api.get('/public/services');
      if (res.data && res.data.success && res.data.data.length > 0) {
        setServices(res.data.data);
      } else {
        setServices(FALLBACK_SERVICES);
      }
    } catch (err) {
      console.error('Error fetching public services:', err);
      setServices(FALLBACK_SERVICES);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchPackages = async () => {
    setPackagesLoading(true);
    try {
      const res = await api.get('/public/packages');
      if (res.data && res.data.success && res.data.data.length > 0) {
        setPackages(res.data.data);
      } else {
        setPackages(FALLBACK_PACKAGES);
      }
    } catch (err) {
      console.error('Error fetching public health packages:', err);
      setPackages(FALLBACK_PACKAGES);
    } finally {
      setPackagesLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/public/doctors');
      if (res.data && res.data.success && res.data.data.length > 0) {
        setDoctors(res.data.data);
      } else {
        setDoctors(FALLBACK_DOCTORS);
      }
    } catch (err) {
      console.error('Error fetching doctors list:', err);
      setDoctors(FALLBACK_DOCTORS);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin =
        user.role === 'admin' ||
        user.role === 'super_admin' ||
        (user.email && user.email.toLowerCase().includes('admin')) ||
        (user.username && user.username.toLowerCase().includes('admin'));
      navigate(isAdmin ? '/app/dashboard' : getRoleBasedRoute(user.role));
    }
  }, [isAuthenticated, user, navigate, getRoleBasedRoute]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const startWarmup = () => {
    setIsWarmingUp(true);
    setWarmupSeconds(0);
    if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
    warmupTimerRef.current = setInterval(() => {
      setWarmupSeconds(s => s + 1);
    }, 1000);
  };

  const stopWarmup = () => {
    setIsWarmingUp(false);
    setWarmupSeconds(0);
    if (warmupTimerRef.current) {
      clearInterval(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  // Treat as a warm-up/retry situation: genuine timeouts OR backend 503 database_unavailable OR network errors
  const isWarmupError = (err: any): boolean => {
    if (err?.name === 'TimeoutError') return true;
    if (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout')) return true;
    if (typeof err?.message === 'string' && (
      err.message.includes('Network Error') ||
      err.message.includes('ERR_NETWORK') ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.toLowerCase().includes('not responding')
    )) return true;
    const responseData = err?.response?.data ?? err?.data;
    if (responseData?.error === 'database_unavailable') return true;
    if (err?.status === 503 || err?.response?.status === 503) return true;
    if (typeof err?.message === 'string' && err.message.toLowerCase().includes('database unavailable')) return true;
    return false;
  };

  const savedClinicId = getClinicTenantId();
  const hasRememberedClinic = savedClinicId && savedClinicId !== 'default';
  const [showClinicField, setShowClinicField] = useState(!hasRememberedClinic);

  const formik = useFormik({
    initialValues: { email: '', password: '', clinicId: savedClinicId },
    validationSchema: LoginSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const tenant = (values.clinicId || '').trim() || 'default';
        const loggedInUser = await login(values.email, values.password, tenant);
        stopWarmup();
        toast.success(`Welcome back, ${loggedInUser.firstName || loggedInUser.name}!`);
        const isAdmin =
          loggedInUser.role === 'admin' ||
          loggedInUser.role === 'super_admin' ||
          (loggedInUser.email && loggedInUser.email.toLowerCase().includes('admin')) ||
          (loggedInUser.username && loggedInUser.username.toLowerCase().includes('admin'));
        navigate(isAdmin ? '/app/dashboard' : getRoleBasedRoute(loggedInUser.role));
      } catch (err: any) {
        if (isWarmupError(err)) {
          if (!isWarmingUp) {
            startWarmup();
            toast.loading('Server is warming up… retrying automatically.', { duration: 6000 });
          }
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => formik.submitForm(), 8000);
        }
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Self-Booking patient lookup
  const handleVerifyPatient = async () => {
    if (!returningId.trim() || !returningPhone.trim()) {
      toast.error('Please fill in both Patient ID and phone number.');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await api.post('/public/find-patient', {
        patientId: returningId.trim(),
        contactNumber: returningPhone.trim()
      });
      if (res.data && res.data.success) {
        setReturningPatientData(res.data.data);
        toast.success(`Patient profile verified: ${res.data.data.firstName} ${res.data.data.lastName}`);
        setBookingStep(3);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Patient verification failed. Check credentials.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Submit self-booking appointment
  const handleBookAppointment = async () => {
    if (!bookingDetails.appointmentDateTime || !bookingDetails.type) {
      toast.error('Please enter appointment date/time and type.');
      return;
    }
    setBookingLoading(true);
    try {
      const payload = {
        isNewPatient,
        patientData: isNewPatient ? bookingPatientData : null,
        appointmentData: {
          patientId: isNewPatient ? undefined : returningPatientData?._id,
          doctorId: bookingDetails.doctorId || undefined,
          appointmentDateTime: bookingDetails.appointmentDateTime,
          type: bookingDetails.type,
          reason: bookingDetails.reason,
          durationMinutes: 30
        }
      };

      const res = await api.post('/public/book-appointment', payload);
      if (res.data && res.data.success) {
        setBookingResult(res.data.data);
        toast.success('Appointment scheduled successfully!');
        setBookingStep(4);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Booking appointment failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Submit Patient Card registration
  const handleRegisterPatientCard = async () => {
    if (!cardForm.firstName || !cardForm.lastName || !cardForm.contactNumber) {
      toast.error('First name, last name, and contact number are required.');
      return;
    }
    setCardLoading(true);
    try {
      const res = await api.post('/public/register-patient', cardForm);
      if (res.data && res.data.success) {
        setCardResult(res.data.data);
        toast.success('Patient Card registered successfully!');
        setCardStep(3);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Patient card registration failed.');
    } finally {
      setCardLoading(false);
    }
  };

  const printCard = () => {
    if (!cardResult) return;
    const { patient, patientCard } = cardResult;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Print Patient Card - ${patient.firstName} ${patient.lastName}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
              background-color: #ffffff;
            }
            .card {
              position: relative;
              width: 380px;
              height: 220px;
              border-radius: 16px;
              padding: 20px;
              color: #ffffff;
              overflow: hidden;
              box-sizing: border-box;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              background: ${
                patientCard.type === 'VIP' 
                  ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                  : patientCard.type === 'Premium'
                  ? 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' 
                  : patientCard.type === 'Family'
                  ? 'linear-gradient(135deg, #047857 0%, #064e3b 100%)' 
                  : 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)'
              };
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .chip {
              position: absolute;
              top: 48px;
              left: 20px;
              width: 40px;
              height: 32px;
              border-radius: 4px;
              background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%);
              opacity: 0.8;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .clinic-name {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              font-weight: 600;
              margin: 0;
            }
            .card-title {
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: rgba(255,255,255,0.6);
              margin: 2px 0 0 0;
            }
            .badge {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              background: rgba(255,255,255,0.2);
            }
            .details {
              margin-top: 56px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .numbers {
              font-family: monospace;
              font-size: 13px;
              letter-spacing: 0.1em;
              font-weight: bold;
              margin: 0;
            }
            .name {
              font-size: 14px;
              font-weight: 600;
              margin: 4px 0 0 0;
            }
            .id {
              font-size: 9px;
              color: rgba(255,255,255,0.8);
              margin: 4px 0 0 0;
            }
            .expires {
              font-size: 8px;
              color: rgba(255,255,255,0.6);
              margin: 2px 0 0 0;
            }
            .qr {
              background: #ffffff;
              padding: 4px;
              border-radius: 8px;
            }
            .qr img {
              width: 48px;
              height: 48px;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="chip"></div>
            <div class="header">
              <div>
                <p class="clinic-name">New Life Clinic</p>
                <p class="card-title">Patient Card</p>
              </div>
              <div class="badge">${patientCard.type}</div>
            </div>
            <div class="details">
              <div>
                <p class="numbers">${patientCard.cardNumber}</p>
                <p class="name">${patient.firstName} ${patient.lastName}</p>
                <p class="id">Patient ID: ${patient.patientId}</p>
                <p class="expires">Expires: ${new Date(patientCard.expiryDate).toLocaleDateString()}</p>
              </div>
              <div class="qr">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`NEWLIFE-CARD:${patientCard.cardNumber}|PATIENT:${patient.patientId}`)}" />
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const inputStyle = {
    '--input-color': isDarkMode ? '#f8fafc' : '#0f172a',
    '--caret-color': isDarkMode ? '#67e8f9' : '#0d9488',
    '--input-bg': isDarkMode ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.8)',
    '--input-border': isDarkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(226, 232, 240, 1)',
    '--focus-border': isDarkMode ? 'rgba(103, 232, 249, 0.8)' : 'rgba(13, 148, 136, 0.8)',
    '--focus-glow': isDarkMode ? 'rgba(103, 232, 249, 0.15)' : 'rgba(13, 148, 136, 0.08)',
    '--placeholder-color': isDarkMode ? 'rgba(148, 163, 184, 0.45)' : 'rgba(148, 163, 184, 0.65)',
    '--autofill-bg': isDarkMode ? '#0b1528' : '#ffffff',
    '--input-hover-bg': isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.9)',
    '--input-focus-bg': isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.95)',
  } as React.CSSProperties;

  const categories = ['All', 'lab', 'imaging', 'consultation', 'injection', 'procedure'];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || service.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`min-h-screen relative overflow-x-hidden flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gradient-to-tr from-slate-50 via-slate-100 to-cyan-50/30 text-slate-800'}`}>
      {isDarkMode ? (
        <>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 12% 18%, rgba(59,130,246,0.22), transparent 40%), radial-gradient(circle at 85% 75%, rgba(14,165,233,0.14), transparent 45%), linear-gradient(140deg, #020617 0%, #050d1e 50%, #081126 100%)' }} />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl animate-float-slow pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/10 to-teal-200/20 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        </>
      )}

      {/* Floating Medical Crosses */}
      <div className={`absolute top-20 right-[15%] text-8xl font-thin select-none pointer-events-none animate-float-slow transition-colors duration-500 ${isDarkMode ? 'text-cyan-500/5' : 'text-slate-200/40'}`}>+</div>
      <div className={`absolute bottom-20 left-[15%] text-6xl font-thin select-none pointer-events-none animate-float-delayed transition-colors duration-500 ${isDarkMode ? 'text-indigo-500/5' : 'text-slate-300/30'}`}>+</div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-300"
        style={{
          background: isDarkMode ? 'rgba(8,15,30,0.7)' : 'rgba(255,255,255,0.75)',
          borderColor: isDarkMode ? 'rgba(148,163,184,0.12)' : 'rgba(226,232,240,0.8)'
        }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-500">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-md tracking-tight uppercase">New Life Clinic</span>
              <span className={`block text-[9px] tracking-widest uppercase ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'} font-bold`}>Smart Healthcare</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
            {[
              { id: 'home', label: 'Home' },
              { id: 'services', label: 'Our Services' },
              { id: 'packages', label: 'Health Packages' },
              { id: 'appointment', label: 'Self-Appointment' },
              { id: 'card', label: 'Get Patient Card' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab);
                  if (tab.id === 'appointment') setBookingStep(1);
                  if (tab.id === 'card') setCardStep(1);
                }}
                className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? isDarkMode ? 'bg-cyan-500/10 text-cyan-300 font-semibold' : 'bg-teal-500/10 text-teal-700 font-semibold'
                    : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab(activeTab === 'login' ? 'home' : 'login');
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 border ${
                activeTab === 'login'
                  ? isDarkMode ? 'bg-cyan-400 text-slate-950 border-cyan-400' : 'bg-teal-600 text-white border-teal-600'
                  : isDarkMode ? 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10' : 'border-teal-500/30 text-teal-600 hover:bg-teal-50'
              }`}
            >
              Staff Portal
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all duration-200 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-amber-300' : 'bg-white border-slate-200 text-teal-600'
              }`}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-16"
            >
              {/* Hero */}
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className={`inline-flex items-center gap-2 rounded-2xl border ${isDarkMode ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' : 'border-teal-400/25 bg-teal-400/10 text-teal-700'} px-4 py-1.5`}>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Clinical Excellence Always</span>
                  </div>
                  <h1 className={`font-black tracking-tight leading-[1.08] text-[clamp(2.5rem,5vw,4.5rem)] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Smart healthcare
                    <span className={`block text-transparent bg-clip-text bg-gradient-to-r ${isDarkMode ? 'from-cyan-400 via-blue-400 to-indigo-400' : 'from-teal-600 to-cyan-600'}`}>
                      designed for life
                    </span>
                  </h1>
                  <p className={`text-base md:text-lg leading-relaxed max-w-[560px] ${isDarkMode ? 'text-slate-300/80' : 'text-slate-600'}`}>
                    Welcome to New Life Clinic. Explore our curated health packages, view professional clinical services, self-schedule clinical appointments, and generate your custom patient cards online instantly.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      onClick={() => { setActiveTab('appointment'); setBookingStep(1); }}
                      className={`h-12 px-6 rounded-xl font-bold text-sm tracking-wide shadow-lg flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] ${
                        isDarkMode ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-cyan-500/20' : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-teal-600/20'
                      }`}
                    >
                      Book Self-Appointment
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab('card'); setCardStep(1); }}
                      className={`h-12 px-6 rounded-xl font-bold text-sm tracking-wide border transition-all duration-300 hover:bg-white/5 flex items-center gap-2 ${
                        isDarkMode ? 'border-cyan-500/30 text-cyan-300' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Get Patient Card
                      <CreditCard className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative flex justify-center lg:justify-end">
                  {/* Decorative Logo / Graphics */}
                  <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full blur-[80px] opacity-25 bg-gradient-to-tr ${isDarkMode ? 'from-cyan-500 to-indigo-500' : 'from-teal-400 to-blue-400'}`} />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border border-dashed border-cyan-500/20"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-6 rounded-full border border-dashed border-indigo-500/10"
                    />
                    <div className={`absolute inset-16 rounded-3xl backdrop-blur-xl border flex flex-col items-center justify-center p-8 shadow-2xl ${
                      isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white/60 border-slate-100'
                    }`}>
                      <Stethoscope className={`h-16 w-16 mb-4 ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                      <p className="font-extrabold text-xl tracking-tight text-center">New Life Clinic</p>
                      <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 text-center ${isDarkMode ? 'text-cyan-400/80' : 'text-teal-600/80'}`}>Smart Platform</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map(({ value, label, icon: Icon }) => (
                  <div
                    key={label}
                    className={`rounded-2xl border p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${
                      isDarkMode 
                        ? 'border-slate-800 bg-slate-900/35 hover:border-cyan-500/30' 
                        : 'border-slate-200 bg-white/60 hover:border-teal-500/30 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`block font-black text-3xl tracking-tight ${isDarkMode ? 'text-cyan-300' : 'text-teal-600'}`}>{value}</span>
                        <span className={`block text-xs font-semibold mt-1 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700 text-cyan-300' : 'bg-slate-100 border-slate-200 text-teal-600'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Departments */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-black tracking-tight">Our Departments</h2>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Comprehensive medical services under one roof</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {CLINIC_DEPARTMENTS.map(({ name, desc, icon: Icon }) => (
                    <div key={name} className={`p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${
                      isDarkMode ? 'bg-slate-900/20 border-slate-800 hover:border-cyan-500/20' : 'bg-white/50 border-slate-200 hover:shadow-lg hover:border-teal-500/20'
                    }`}>
                      <div className={`h-10 w-10 rounded-xl mb-4 flex items-center justify-center ${
                        isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">{name}</h3>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operating Hours & Contact */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Operating Hours */}
                <div className={`p-6 rounded-2xl border backdrop-blur-md ${
                  isDarkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-white/50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-600'
                    }`}>
                      <Clock className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg">Operating Hours</h3>
                  </div>
                  <div className="space-y-3">
                    {CLINIC_INFO.hours.map(h => (
                      <div key={h.day} className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{h.day}</span>
                        <span className={`text-sm font-bold ${h.day === 'Emergency' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-cyan-300' : 'text-teal-600')}`}>{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Information */}
                <div className={`p-6 rounded-2xl border backdrop-blur-md ${
                  isDarkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-white/50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-600'
                    }`}>
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg">Contact Us</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <BookOpen className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-xs uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Address</p>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{CLINIC_INFO.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-xs uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Phone</p>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{CLINIC_INFO.phone}</p>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{CLINIC_INFO.mobile}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-xs uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Email</p>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{CLINIC_INFO.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why Choose Us */}
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-center">Why choose New Life Clinic?</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { title: 'Experienced Medical Team', desc: 'Licensed physicians, specialist doctors, certified lab scientists, and experienced nursing staff delivering clinical excellence every day.', icon: ShieldCheck },
                    { title: 'Modern Diagnostics Lab', desc: 'State-of-the-art clinical laboratory offering CBC, chemistry panels, urinalysis, serology, microbiology, and point-of-care testing.', icon: Activity },
                    { title: 'Smart Patient Portal', desc: 'Online self-service platform for appointment booking, patient card registration, health package purchase, and real-time health monitoring.', icon: Users },
                  ].map(({ title, desc, icon: Icon }) => (
                    <div key={title} className={`p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${
                      isDarkMode ? 'bg-slate-900/20 border-slate-800 hover:border-cyan-500/20' : 'bg-white/50 border-slate-200 hover:shadow-lg hover:border-teal-500/20'
                    }`}>
                      <div className={`h-10 w-10 rounded-xl mb-4 flex items-center justify-center ${
                        isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">{title}</h3>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Our Clinical Services</h2>
                <p className={`max-w-[560px] mx-auto text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Browse our full list of clinic services, lab tests, and imaging procedures available at New Life Clinic.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-xs group">
                  <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={inputStyle}
                    className="auth-login-input w-full h-11 pl-10 pr-4 text-sm rounded-xl outline-none"
                  />
                </div>

                {/* Category Buttons */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl uppercase tracking-wider transition-all duration-200 border ${
                        selectedCategory === cat
                          ? isDarkMode ? 'bg-cyan-400 border-cyan-400 text-slate-950 font-bold' : 'bg-teal-600 border-teal-600 text-white font-bold'
                          : isDarkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'All' ? 'All categories' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services Grid */}
              {servicesLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className={`animate-spin rounded-full h-10 w-10 border-t-2 ${isDarkMode ? 'border-cyan-400' : 'border-teal-600'}`} />
                  <p className="text-xs text-slate-400 mt-4">Loading clinical catalog...</p>
                </div>
              ) : filteredServices.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map(service => (
                    <div
                      key={service._id}
                      className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:shadow-lg ${
                        isDarkMode 
                          ? 'border-slate-800 bg-slate-900/30 hover:border-cyan-500/20' 
                          : 'border-slate-200 bg-white hover:border-teal-500/20'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                            isDarkMode ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-teal-700'
                          }`}>
                            {service.category}
                          </span>
                          <span className={`font-black text-lg ${isDarkMode ? 'text-cyan-300' : 'text-teal-600'}`}>
                            {service.price} ETB
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base mb-1 tracking-tight">{service.name}</h3>
                        <p className={`text-xs leading-relaxed line-clamp-3 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {service.description || 'Professional clinical service offered under clinic management by certified medical practitioners.'}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('appointment');
                          setBookingStep(1);
                          setBookingDetails(prev => ({
                            ...prev,
                            type: service.category.includes('lab') ? 'lab-test' : service.category.includes('imaging') ? 'imaging' : 'Consultation',
                            reason: `Booked service: ${service.name}`
                          }));
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                          isDarkMode
                            ? 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10'
                            : 'border-teal-500/30 text-teal-600 hover:bg-teal-50'
                        }`}
                      >
                        Book This Service
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed rounded-2xl">
                  <p className="text-slate-400 text-sm">No services matches your filters. Try search filters.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'packages' && (
            <motion.div
              key="packages"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Our Health Packages</h2>
                <p className={`max-w-[560px] mx-auto text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Choose a tailored health package designed for chronic monitoring, regular review cycles, and all-inclusive testing.
                </p>
              </div>

              {packagesLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className={`animate-spin rounded-full h-10 w-10 border-t-2 ${isDarkMode ? 'border-cyan-400' : 'border-teal-600'}`} />
                  <p className="text-xs text-slate-400 mt-4">Loading health packages...</p>
                </div>
              ) : packages.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-8">
                  {packages.map(pkg => (
                    <div
                      key={pkg._id}
                      className={`relative rounded-3xl p-6 border flex flex-col justify-between hover:shadow-xl transition-all duration-300 ${
                        isDarkMode 
                          ? 'border-slate-800 bg-slate-900/30 hover:border-cyan-500/25' 
                          : 'border-slate-200 bg-white hover:border-teal-500/25'
                      }`}
                    >
                      <div>
                        {/* Title block */}
                        <div className="flex justify-between items-start gap-4 mb-4">
                          <h3 className="font-extrabold text-xl tracking-tight leading-tight">{pkg.name}</h3>
                          <div className="text-right">
                            <span className={`block font-black text-2xl ${isDarkMode ? 'text-cyan-300' : 'text-teal-600'}`}>
                              {pkg.price} ETB
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className={`text-xs leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {pkg.description}
                        </p>

                        <div className="border-t border-dashed my-4 opacity-30" />

                        {/* Stats/Details */}
                        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                          <div>
                            <span className="block text-slate-400 font-medium">Validity</span>
                            <span className="font-bold">{pkg.validity_days} days</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-medium">Total Visits</span>
                            <span className="font-bold">{pkg.total_visits} visits</span>
                          </div>
                        </div>

                        {/* Covered Services */}
                        <div className="space-y-2 mb-8">
                          <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Services Included:</p>
                          <div className="grid gap-1.5">
                            {pkg.services.map((srv: string) => (
                              <div key={srv} className="flex items-start gap-2 text-xs">
                                <Check className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{srv}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('appointment');
                          setBookingStep(1);
                          setBookingDetails(prev => ({
                            ...prev,
                            type: 'Check-up',
                            reason: `Interested in Package: ${pkg.name}`
                          }));
                        }}
                        className={`w-full py-3 rounded-2xl text-xs font-bold shadow-lg transition-all duration-300 hover:scale-[1.01] ${
                          isDarkMode
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:shadow-cyan-500/10'
                            : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:shadow-teal-600/10'
                        }`}
                      >
                        Select Package & Book
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed rounded-2xl">
                  <p className="text-slate-400 text-sm">No health packages currently active.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'appointment' && (
            <motion.div
              key="appointment"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black tracking-tight">Self-Appointment Wizard</h2>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Schedule your clinical consultation or lab check in 4 easy steps.
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-between px-4 py-2 rounded-xl"
                style={{ background: isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.4)', border: isDarkMode ? '1px solid rgba(148,163,184,0.08)' : '1px solid rgba(226,232,240,1)' }}>
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      bookingStep === s
                        ? isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        : bookingStep > s
                        ? isDarkMode ? 'bg-cyan-500/25 text-cyan-300' : 'bg-teal-500/25 text-teal-700'
                        : isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {s}
                    </span>
                    <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider ${
                      bookingStep === s 
                        ? 'opacity-100' 
                        : 'opacity-50'
                    }`}>
                      {s === 1 ? 'Status' : s === 2 ? 'Patient Info' : s === 3 ? 'Schedule' : 'Finished'}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-slate-200/40'
              }`}>
                {/* STEP 1: Patient Status Selection */}
                {bookingStep === 1 && (
                  <div className="space-y-6 text-center">
                    <h3 className="text-lg font-bold">Have you visited New Life Clinic before?</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => { setIsNewPatient(false); setBookingStep(2); }}
                        className={`p-6 rounded-2xl border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center gap-3 ${
                          isDarkMode 
                            ? 'border-slate-800 bg-slate-900/20 hover:border-cyan-500/30' 
                            : 'border-slate-200 bg-white hover:border-teal-500/30'
                        }`}
                      >
                        <Users className={`h-8 w-8 ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                        <div>
                          <span className="block font-extrabold text-sm">Yes, I am a returning patient</span>
                          <span className="block text-[10px] text-slate-400 mt-1">I have my Patient ID</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setIsNewPatient(true); setBookingStep(2); }}
                        className={`p-6 rounded-2xl border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center gap-3 ${
                          isDarkMode 
                            ? 'border-slate-800 bg-slate-900/20 hover:border-cyan-500/30' 
                            : 'border-slate-200 bg-white hover:border-teal-500/30'
                        }`}
                      >
                        <User className={`h-8 w-8 ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                        <div>
                          <span className="block font-extrabold text-sm">No, I am a new patient</span>
                          <span className="block text-[10px] text-slate-400 mt-1">First-time registration</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Returning Patient verification OR New Patient registration */}
                {bookingStep === 2 && !isNewPatient && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Users className="h-4 w-4" /> Returning Patient Verification
                    </h3>
                    <p className="text-xs text-slate-400">Enter your clinical ID (e.g. P00021-3944) and contact number to retrieve your profile.</p>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patient ID</label>
                        <input
                          type="text"
                          placeholder="e.g. P00025-1445"
                          value={returningId}
                          onChange={e => setReturningId(e.target.value)}
                          style={inputStyle}
                          className="auth-login-input w-full h-11 px-4 text-sm rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number</label>
                        <input
                          type="text"
                          placeholder="e.g. +251911223344"
                          value={returningPhone}
                          onChange={e => setReturningPhone(e.target.value)}
                          style={inputStyle}
                          className="auth-login-input w-full h-11 px-4 text-sm rounded-xl outline-none"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setBookingStep(1)}
                          className="flex-1 h-11 rounded-xl text-xs font-bold border transition-colors hover:bg-white/5"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleVerifyPatient}
                          disabled={bookingLoading}
                          className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all duration-300 shadow-md ${
                            isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                          }`}
                        >
                          {bookingLoading ? 'Verifying...' : 'Verify & Continue'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {bookingStep === 2 && isNewPatient && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <User className="h-4 w-4" /> New Patient Registration
                    </h3>
                    <p className="text-xs text-slate-400">We will save this information to create your patient profile for this appointment.</p>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First Name *</label>
                        <input
                          type="text"
                          value={bookingPatientData.firstName}
                          onChange={e => setBookingPatientData({...bookingPatientData, firstName: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Name *</label>
                        <input
                          type="text"
                          value={bookingPatientData.lastName}
                          onChange={e => setBookingPatientData({...bookingPatientData, lastName: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender *</label>
                        <select
                          value={bookingPatientData.gender}
                          onChange={e => setBookingPatientData({...bookingPatientData, gender: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Age</label>
                        <input
                          type="number"
                          placeholder="Years"
                          value={bookingPatientData.age}
                          onChange={e => setBookingPatientData({...bookingPatientData, age: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Number *</label>
                        <input
                          type="text"
                          placeholder="e.g. 0911223344"
                          value={bookingPatientData.contactNumber}
                          onChange={e => setBookingPatientData({...bookingPatientData, contactNumber: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                        <input
                          type="email"
                          placeholder="optional"
                          value={bookingPatientData.email}
                          onChange={e => setBookingPatientData({...bookingPatientData, email: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setBookingStep(1)}
                        className="flex-1 h-11 rounded-xl text-xs font-bold border transition-colors hover:bg-white/5"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (!bookingPatientData.firstName || !bookingPatientData.lastName || !bookingPatientData.contactNumber) {
                            toast.error('First Name, Last Name and Contact number are required.');
                            return;
                          }
                          setBookingStep(3);
                        }}
                        className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all duration-300 shadow-md ${
                          isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        }`}
                      >
                        Continue to scheduling
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Appointment Scheduling details */}
                {bookingStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Appointment Details
                    </h3>
                    <p className="text-xs text-slate-400">
                      Booking for: <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>
                        {isNewPatient ? `${bookingPatientData.firstName} ${bookingPatientData.lastName}` : `${returningPatientData?.firstName} ${returningPatientData?.lastName}`}
                      </strong>
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</label>
                        <select
                          value={bookingDetails.department}
                          onChange={e => setBookingDetails({...bookingDetails, department: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        >
                          <option value="General Medicine">General Medicine</option>
                          <option value="Cardiology">Cardiology</option>
                          <option value="Pediatrics">Pediatrics</option>
                          <option value="Lab / Diagnostics">Lab / Diagnostics</option>
                          <option value="Imaging / Ultrasound">Imaging / Ultrasound</option>
                          <option value="Nursing / Vitals">Nursing / Vitals</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assign Doctor</label>
                        <select
                          value={bookingDetails.doctorId}
                          onChange={e => setBookingDetails({...bookingDetails, doctorId: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        >
                          <option value="">Choose Doctor (or leave blank)</option>
                          {doctors.map(doc => (
                            <option key={doc.id} value={doc.id}>Dr. {doc.firstName} {doc.lastName} ({doc.specialization || 'GP'})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Appointment Type</label>
                        <select
                          value={bookingDetails.type}
                          onChange={e => setBookingDetails({...bookingDetails, type: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        >
                          <option value="Consultation">Clinical Consultation</option>
                          <option value="Check-up">Routine Check-up</option>
                          <option value="Follow-up">Follow-up Visit</option>
                          <option value="lab-test">Lab/Blood Test</option>
                          <option value="imaging">Imaging/X-Ray/Ultrasound</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & Time *</label>
                        <input
                          type="datetime-local"
                          value={bookingDetails.appointmentDateTime}
                          onChange={e => setBookingDetails({...bookingDetails, appointmentDateTime: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason / Notes</label>
                        <textarea
                          placeholder="Brief description of your visit reason..."
                          value={bookingDetails.reason}
                          onChange={e => setBookingDetails({...bookingDetails, reason: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-20 p-3 text-xs rounded-xl outline-none resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setBookingStep(2)}
                        className="flex-1 h-11 rounded-xl text-xs font-bold border transition-colors hover:bg-white/5"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleBookAppointment}
                        disabled={bookingLoading}
                        className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all duration-300 shadow-md ${
                          isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        }`}
                      >
                        {bookingLoading ? 'Scheduling...' : 'Confirm Booking'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Success message & download receipt */}
                {bookingStep === 4 && bookingResult && (
                  <div className="space-y-6 text-center">
                    <div className="flex justify-center">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-600'
                      }`}>
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-xl font-black">Appointment Scheduled!</h3>
                      <p className="text-xs text-slate-400">Your self-appointment booking was successfully saved in the clinical records queue.</p>
                    </div>

                    {/* Booking Card summary */}
                    <div className={`p-5 rounded-2xl border text-left space-y-3 font-mono text-xs ${
                      isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex justify-between border-b pb-2 border-dashed border-slate-700/40">
                        <span>Patient ID</span>
                        <span className="font-bold">{bookingResult.patient?.patientId}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2 border-dashed border-slate-700/40">
                        <span>Patient Name</span>
                        <span className="font-bold">{bookingResult.patient?.firstName} {bookingResult.patient?.lastName}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2 border-dashed border-slate-700/40">
                        <span>Appointment Type</span>
                        <span className="font-bold">{bookingResult.appointment?.type}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2 border-dashed border-slate-700/40">
                        <span>Scheduled Date/Time</span>
                        <span className="font-bold">{new Date(bookingResult.appointment?.appointmentDateTime).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className="font-bold text-teal-500 uppercase">{bookingResult.appointment?.status}</span>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button
                        onClick={() => {
                          // Pre-fill card form with patient details so they can get patient card next
                          setCardForm(prev => ({
                            ...prev,
                            firstName: bookingResult.patient?.firstName || '',
                            lastName: bookingResult.patient?.lastName || '',
                            contactNumber: bookingResult.patient?.contactNumber || ''
                          }));
                          setActiveTab('card');
                          setCardStep(1);
                        }}
                        className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-all duration-300 ${
                          isDarkMode ? 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10' : 'border-teal-500/30 text-teal-600 hover:bg-teal-50'
                        }`}
                      >
                        Create Patient Card
                      </button>
                      <button
                        onClick={() => setActiveTab('home')}
                        className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all duration-300 shadow-md ${
                          isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        }`}
                      >
                        Return Home
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black tracking-tight">Clinic Patient Card</h2>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Register your profile and choose a membership card type to access clinical discounts.
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-between px-4 py-2 rounded-xl"
                style={{ background: isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.4)', border: isDarkMode ? '1px solid rgba(148,163,184,0.08)' : '1px solid rgba(226,232,240,1)' }}>
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      cardStep === s
                        ? isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        : cardStep > s
                        ? isDarkMode ? 'bg-cyan-500/25 text-cyan-300' : 'bg-teal-500/25 text-teal-700'
                        : isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {s}
                    </span>
                    <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider ${
                      cardStep === s 
                        ? 'opacity-100' 
                        : 'opacity-50'
                    }`}>
                      {s === 1 ? 'Personal Info' : s === 2 ? 'Card Type' : 'Digital Card'}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-slate-200/40'
              }`}>
                {/* STEP 1: Card registration Details */}
                {cardStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <User className="h-4 w-4" /> Personal Information
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First Name *</label>
                        <input
                          type="text"
                          value={cardForm.firstName}
                          onChange={e => setCardForm({...cardForm, firstName: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Name *</label>
                        <input
                          type="text"
                          value={cardForm.lastName}
                          onChange={e => setCardForm({...cardForm, lastName: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender *</label>
                        <select
                          value={cardForm.gender}
                          onChange={e => setCardForm({...cardForm, gender: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Age</label>
                        <input
                          type="number"
                          value={cardForm.age}
                          onChange={e => setCardForm({...cardForm, age: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Number *</label>
                        <input
                          type="text"
                          placeholder="e.g. 0911223344"
                          value={cardForm.contactNumber}
                          onChange={e => setCardForm({...cardForm, contactNumber: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                        <input
                          type="email"
                          placeholder="optional"
                          value={cardForm.email}
                          onChange={e => setCardForm({...cardForm, email: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blood Type</label>
                        <select
                          value={cardForm.bloodType}
                          onChange={e => setCardForm({...cardForm, bloodType: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medical Allergies</label>
                        <input
                          type="text"
                          placeholder="e.g. Penicillin, Peanuts"
                          value={cardForm.allergies}
                          onChange={e => setCardForm({...cardForm, allergies: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3.5 text-xs rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        onClick={() => setActiveTab('home')}
                        className="flex-1 h-11 rounded-xl text-xs font-bold border transition-colors hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!cardForm.firstName || !cardForm.lastName || !cardForm.contactNumber) {
                            toast.error('First Name, Last Name, and Contact Number are required.');
                            return;
                          }
                          setCardStep(2);
                        }}
                        className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all duration-300 shadow-md ${
                          isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        }`}
                      >
                        Choose Card Type
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Card Type Selection */}
                {cardStep === 2 && (
                  <div className="space-y-5">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Award className="h-4 w-4" /> Select Card Tier
                    </h3>
                    <p className="text-xs text-slate-400">Choose a package tier that best suits your family discount needs.</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { type: 'Basic', price: '500 ETB', disc: '5% Service Discount', consult: '1 Free Consultation', lab: 'No free lab tests' },
                        { type: 'Premium', price: '1200 ETB', disc: '15% Service Discount', consult: '3 Free Consultations', lab: 'Priority Appointments' },
                        { type: 'VIP', price: '2500 ETB', disc: '25% Service Discount', consult: 'Unlimited Consultations', lab: '5 Free Lab Tests' },
                        { type: 'Family', price: '4000 ETB', disc: '20% Group Discount', consult: '5 Free Consultations', lab: '2 Free Lab Tests' },
                      ].map(tier => (
                        <div
                          key={tier.type}
                          onClick={() => setCardForm({...cardForm, cardType: tier.type})}
                          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                            cardForm.cardType === tier.type
                              ? isDarkMode
                                ? 'bg-cyan-400/10 border-cyan-400 shadow-lg shadow-cyan-500/10'
                                : 'bg-teal-50 border-teal-600 shadow-lg shadow-teal-500/10'
                              : isDarkMode ? 'border-slate-800 bg-slate-900/20 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-extrabold text-sm tracking-tight">{tier.type} Tier</span>
                            <span className={`font-black text-xs ${isDarkMode ? 'text-cyan-300' : 'text-teal-600'}`}>{tier.price}</span>
                          </div>
                          <div className="space-y-1 text-[10px] text-slate-400">
                            <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {tier.disc}</p>
                            <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {tier.consult}</p>
                            <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {tier.lab}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setCardStep(1)}
                        className="flex-1 h-11 rounded-xl text-xs font-bold border transition-colors hover:bg-white/5"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRegisterPatientCard}
                        disabled={cardLoading}
                        className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all duration-300 shadow-md ${
                          isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        }`}
                      >
                        {cardLoading ? 'Generating Card...' : 'Generate Card Now'}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Digital printable card layout */}
                {cardStep === 3 && cardResult && (
                  <div className="space-y-6 flex flex-col items-center">
                    <div className="text-center space-y-1.5">
                      <div className="inline-flex h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 items-center justify-center mb-1">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold">Patient Card Created!</h3>
                      <p className="text-xs text-slate-400">Here is your digital clinical smartcard. You can download or print it below.</p>
                    </div>

                    {/* Patient Smartcard Render */}
                    <div id="digital-patient-card-print" className="relative w-[340px] sm:w-[380px] h-[220px] rounded-2xl p-5 text-white overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.01]"
                      style={{
                        background: cardResult.patientCard.type === 'VIP' 
                          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                          : cardResult.patientCard.type === 'Premium'
                          ? 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' 
                          : cardResult.patientCard.type === 'Family'
                          ? 'linear-gradient(135deg, #047857 0%, #064e3b 100%)' 
                          : 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                        border: cardResult.patientCard.type === 'VIP' 
                          ? '2px solid rgba(226, 232, 240, 0.2)' 
                          : '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                      <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -left-16 -bottom-16 w-40 h-40 rounded-full bg-cyan-400/20 blur-2xl" />
                      
                      {/* Chip representation */}
                      <div className="absolute top-12 left-5 w-10 h-8 rounded bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 opacity-80 border border-amber-500/20 shadow-inner flex items-center justify-center overflow-hidden">
                        <div className="w-full h-px bg-amber-600/30 absolute top-1/4" />
                        <div className="w-full h-px bg-amber-600/30 absolute top-1/2" />
                        <div className="w-full h-px bg-amber-600/30 absolute top-3/4" />
                        <div className="w-px h-full bg-amber-600/30 absolute left-1/3" />
                        <div className="w-px h-full bg-amber-600/30 absolute left-2/3" />
                      </div>

                      <div className="header flex justify-between items-start">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/70">New Life Clinic</p>
                          <p className="text-[9px] uppercase tracking-widest text-white/50">Patient Card</p>
                        </div>
                        <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/20">
                          {cardResult.patientCard.type}
                        </div>
                      </div>

                      <div className="details mt-14 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[13px] font-mono tracking-wider font-bold">{cardResult.patientCard.cardNumber}</p>
                          <p className="text-sm font-semibold truncate max-w-[200px]">{cardResult.patient.firstName} {cardResult.patient.lastName}</p>
                          <p className="text-[9px] text-white/75">Patient ID: <span className="font-mono">{cardResult.patient.patientId}</span></p>
                          <p className="text-[8px] text-white/60">Expires: {new Date(cardResult.patientCard.expiryDate).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="qr bg-white p-1 rounded-lg shadow-md flex-shrink-0">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`NEWLIFE-CARD:${cardResult.patientCard.cardNumber}|PATIENT:${cardResult.patient.patientId}`)}`} 
                            alt="QR Code" 
                            className="w-11 h-11"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="w-full grid grid-cols-2 gap-4">
                      <button
                        onClick={printCard}
                        className={`h-11 rounded-xl text-xs font-bold border transition-colors hover:bg-white/5 flex items-center justify-center gap-2 ${
                          isDarkMode ? 'border-cyan-500/30 text-cyan-300' : 'border-slate-300 text-slate-700'
                        }`}
                      >
                        <Printer className="h-4 w-4" /> Print Card
                      </button>
                      <button
                        onClick={() => {
                          setReturningId(cardResult.patient.patientId);
                          setReturningPhone(cardResult.patient.contactNumber);
                          setReturningPatientData(cardResult.patient);
                          setIsNewPatient(false);
                          setActiveTab('appointment');
                          setBookingStep(3);
                        }}
                        className={`h-11 rounded-xl text-xs font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                          isDarkMode ? 'bg-cyan-400 text-slate-950' : 'bg-teal-600 text-white'
                        }`}
                      >
                        Book Appointment <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.4 }}
              className="flex justify-center"
            >
              <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                className="auth-login-card w-full max-w-[440px] rounded-3xl p-7 sm:p-9 space-y-7 border"
                style={{
                  background: isDarkMode 
                    ? 'linear-gradient(170deg, rgba(8,15,33,0.94) 0%, rgba(11,24,48,0.94) 60%, rgba(7,16,34,0.94) 100%)' 
                    : 'rgba(255,255,255,0.75)',
                  borderColor: isDarkMode 
                    ? 'rgba(148,163,184,0.2)' 
                    : 'rgba(226,232,240,1)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: isDarkMode 
                    ? '0 30px 90px rgba(2,6,23,0.7)' 
                    : '0 20px 50px rgba(15,23,42,0.06)',
                  ['--shine-color' as any]: isDarkMode ? 'rgba(103, 232, 249, 0.12)' : 'rgba(13, 148, 136, 0.08)'
                }}
              >
                {/* Heading */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-0.5 w-10 rounded-full bg-gradient-to-r ${isDarkMode ? 'from-cyan-300 via-blue-300 to-indigo-300' : 'from-teal-500 to-cyan-500'}`} />
                    <span className={`${isDarkMode ? 'text-cyan-300' : 'text-teal-600'} text-xs font-semibold uppercase tracking-widest`}>Secure Sign In</span>
                  </div>
                  <h2 className={`text-[2rem] sm:text-[2.2rem] font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Welcome back</h2>
                  <p className={`text-[13px] mt-1.5 ${isDarkMode ? 'text-slate-300/75' : 'text-slate-500'}`}>Sign in to continue to your clinic workspace</p>
                </div>

                {/* Form */}
                <form onSubmit={formik.handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="email" className={`block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                      Username or Email
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                        <svg className={`w-4 h-4 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-cyan-400' : 'text-slate-400 group-focus-within:text-teal-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="text"
                        autoComplete="off"
                        placeholder="dr.smith or admin@clinic.com"
                        {...formik.getFieldProps('email')}
                        style={inputStyle}
                        className={`auth-login-input w-full h-12 pl-10 pr-4 text-sm rounded-xl outline-none transition-all duration-200 ${
                          formik.touched.email && formik.errors.email
                            ? '!border-red-400/50 focus:!border-red-400 focus:!ring-red-400/20'
                            : ''
                        }`}
                        onBlur={formik.handleBlur}
                      />
                    </div>
                    {formik.touched.email && formik.errors.email && (
                      <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                        <span>⚠</span> {formik.errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className={`block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                        <svg className={`w-4 h-4 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-cyan-400' : 'text-slate-400 group-focus-within:text-teal-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="off"
                        placeholder="Enter your password"
                        {...formik.getFieldProps('password')}
                        style={inputStyle}
                        className={`auth-login-input w-full h-12 pl-10 pr-11 text-sm rounded-xl outline-none transition-all duration-200 ${
                          formik.touched.password && formik.errors.password
                            ? '!border-red-400/50 focus:!border-red-400 focus:!ring-red-400/20'
                            : ''
                        }`}
                        onBlur={formik.handleBlur}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-400 hover:text-teal-600'}`}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                        <span>⚠</span> {formik.errors.password}
                      </p>
                    )}
                  </div>

                  {showClinicField ? (
                    <div className="space-y-2">
                      <label htmlFor="clinicId" className={`block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                        Clinic code
                      </label>
                      <input
                        id="clinicId"
                        name="clinicId"
                        type="text"
                        autoComplete="off"
                        placeholder="e.g. clinicnew"
                        {...formik.getFieldProps('clinicId')}
                        style={inputStyle}
                        className="auth-login-input w-full h-11 px-4 text-sm rounded-xl outline-none transition-all duration-200"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowClinicField(true)}
                      className={`text-xs transition-colors ${isDarkMode ? 'text-cyan-300/80 hover:text-cyan-200' : 'text-teal-600/80 hover:text-teal-700'}`}
                    >
                      Change clinic ({savedClinicId})
                    </button>
                  )}

                  {isWarmingUp && (
                    <div className="rounded-xl p-4 space-y-2 border"
                      style={{ background: isDarkMode ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.05)', borderColor: isDarkMode ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.3)' }}>
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-xs font-semibold animate-pulse text-amber-500">
                          Server is waking up — please wait ({warmupSeconds}s)
                        </p>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden bg-amber-500/20">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000"
                          style={{ width: `${Math.min((warmupSeconds / WARMUP_MAX_SECONDS) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || isWarmingUp || !formik.isValid || !formik.dirty}
                    className={`relative w-full h-12 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${isDarkMode ? 'text-slate-950 focus:ring-cyan-300/50' : 'text-white focus:ring-teal-500/50'} focus:ring-offset-2 focus:ring-offset-transparent mt-2`}
                    style={{ 
                      background: isDarkMode 
                        ? 'linear-gradient(90deg, #67e8f9 0%, #93c5fd 50%, #a5b4fc 100%)' 
                        : 'linear-gradient(90deg, #0d9488 0%, #0ea5e9 100%)', 
                      boxShadow: isDarkMode 
                        ? '0 8px 24px rgba(6,182,212,0.35)' 
                        : '0 8px 24px rgba(13,148,136,0.2)' 
                    }}
                  >
                    <span className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-200 rounded-xl" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isLoading ? 'Signing in…' : 'Sign in'}
                    </span>
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
                  <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs`}>secured by</span>
                  <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
                </div>

                {/* Footer trust badges */}
                <div className="flex items-center justify-center gap-3">
                  {['SSL Encrypted', 'HIPAA Ready', '99.9% Uptime'].map(badge => (
                    <span key={badge} className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>{badge}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto text-xs"
        style={{
          borderColor: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(226,232,240,1)',
          background: isDarkMode ? 'rgba(1,5,15,0.4)' : 'rgba(255,255,255,0.4)'
        }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-6">
            {/* Clinic Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className={`h-5 w-5 ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                <span className="font-extrabold text-sm uppercase tracking-tight">{CLINIC_INFO.name}</span>
              </div>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {CLINIC_INFO.address}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{CLINIC_INFO.phone} • {CLINIC_INFO.mobile}</p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{CLINIC_INFO.email}</p>
            </div>
            {/* Quick Links */}
            <div>
              <p className="font-bold text-xs uppercase tracking-wider mb-3">Quick Links</p>
              <div className="space-y-1.5">
                {[
                  { id: 'services' as Tab, label: 'Our Services' },
                  { id: 'packages' as Tab, label: 'Health Packages' },
                  { id: 'appointment' as Tab, label: 'Book Appointment' },
                  { id: 'card' as Tab, label: 'Get Patient Card' },
                ].map(link => (
                  <button key={link.id} onClick={() => setActiveTab(link.id)} className={`block text-xs transition-colors ${isDarkMode ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-teal-600'}`}>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Hours Summary */}
            <div>
              <p className="font-bold text-xs uppercase tracking-wider mb-3">Hours</p>
              <div className="space-y-1">
                {CLINIC_INFO.hours.map(h => (
                  <div key={h.day} className="flex justify-between text-xs">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{h.day}</span>
                    <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`pt-4 border-t text-center ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
            © {new Date().getFullYear()} {clinic?.name || CLINIC_INFO.name}. Smart Health Management. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
