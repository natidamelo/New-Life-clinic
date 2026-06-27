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
};const CLINIC_DEPARTMENTS = [
  { name: 'General Medicine', desc: 'Primary care and internal medicine consultations for adults and adolescents.', icon: Stethoscope, abbr: 'GEN' },
  { name: 'Pediatrics', desc: 'Comprehensive child healthcare including vaccinations, growth monitoring, and acute care.', icon: Users, abbr: 'PED' },
  { name: 'Laboratory & Diagnostics', desc: 'Full-service clinical lab with CBC, urinalysis, chemistry panels, RBS, and more.', icon: Activity, abbr: 'LAB' },
  { name: 'Imaging & Ultrasound', desc: 'Diagnostic imaging including standard and detailed ultrasound examinations.', icon: FileText, abbr: 'IMG' },
  { name: 'Pharmacy', desc: 'In-house pharmacy dispensing prescribed medications with patient counselling.', icon: ShieldCheck, abbr: 'PHAR' },
  { name: 'Nursing & Injection', desc: 'IV, IM, and SC injections, wound care, vital-sign monitoring, and patient follow-up.', icon: Award, abbr: 'NURS' },
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
    featured: false,
    featuredLabel: 'MOST BOOKED',
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
    featured: false,
    featuredLabel: 'MOST BOOKED',
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
    featured: false,
    featuredLabel: 'MOST BOOKED',
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

// Fallback doctors/staff (used when API returns empty)
const FALLBACK_DOCTORS = [
  { id: '6823301cdefc7776bf7537b3', firstName: 'DR', lastName: 'Natan', role: 'doctor', specialization: 'General Medicine' },
  { id: '684591465e30c62e5dc23a55', firstName: 'Mahlet', lastName: 'Yohannes', role: 'imaging', specialization: 'Ultrasound Specialist' },
  { id: '6823859485e2a37d8cb420ed', firstName: 'Semhal', lastName: 'Melaku', role: 'nurse', specialization: 'Nursing Services' },
  { id: '6895c62e640a5abe8c3d5bbd', firstName: 'Nuhamin', lastName: 'Yohannes', role: 'nurse', specialization: 'Nursing Vitals' },
  { id: '69663118cf5b28506cba063e', firstName: 'Medina', lastName: 'Negash', role: 'lab', specialization: 'Lab Technician' },
  { id: '6969f6493bd7375c22fc4c90', firstName: 'Almaz', lastName: 'girmaye', role: 'lab', specialization: 'Lab Technician' }
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

const CountUp: React.FC<{ to: number; duration?: number; animate?: boolean }> = ({ to, duration = 1500, animate = true }) => {
  const [value, setValue] = useState(animate ? 0 : to);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!animate) {
      setValue(to);
      return;
    }
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          let startTimestamp: number | null = null;
          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setValue(Math.floor(progress * to));
            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };
          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [to, duration, animate]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
};

interface PulseDividerProps {
  animate?: boolean;
}

const PulseDivider: React.FC<PulseDividerProps> = ({ animate = false }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const jaggedPath = "M 0 30 L 200 15 L 400 45 L 600 10 L 800 50 L 920 30 L 930 6 L 940 50 L 945 10 L 955 54 L 965 6 L 972 40 L 985 20 L 995 30 L 1440 30";
  const steadyPath = "M 0 30 L 200 30 L 400 30 L 600 30 L 800 30 L 920 30 L 930 26 L 940 30 L 945 34 L 955 6 L 965 54 L 972 30 L 985 22 L 995 30 L 1440 30";

  const shouldAnimate = animate && !prefersReducedMotion;

  return (
    <div className="w-full overflow-hidden flex items-center h-[60px] my-6 opacity-85">
      <svg className="w-full h-[60px]" viewBox="0 0 1440 60" preserveAspectRatio="none">
        {shouldAnimate ? (
          <motion.path
            d={steadyPath}
            initial={{ pathLength: 0, d: jaggedPath }}
            animate={{ pathLength: 1, d: steadyPath }}
            transition={{ 
              pathLength: { duration: 1.2, ease: "easeOut" },
              d: { delay: 0.3, duration: 0.9, ease: "easeInOut" }
            }}
            stroke="var(--chart-pulse)"
            strokeWidth="1.5"
            fill="none"
          />
        ) : (
          <path
            d={steadyPath}
            stroke="var(--chart-pulse)"
            strokeWidth="1.5"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
};

/* ── SystemDiagram: schematic human torso with vital/pulse branching paths ── */
const SystemDiagram: React.FC = () => (
  <svg
    viewBox="0 0 320 420"
    className="w-full max-w-[320px] mx-auto"
    aria-label="Schematic diagram of whole-system care approach"
    role="img"
  >
    {/* ── Human silhouette outline (stroke-only, schematic/minimal) ── */}
    <path
      d="
        M 160 32
        C 142 32, 130 44, 130 62
        C 130 80, 142 92, 160 92
        C 178 92, 190 80, 190 62
        C 190 44, 178 32, 160 32
        Z
      "
      fill="none"
      stroke="var(--chart-ink)"
      strokeWidth="1.8"
      strokeLinejoin="round"
      opacity="0.55"
    />
    {/* Neck */}
    <path
      d="M 150 92 L 150 108 M 170 92 L 170 108"
      fill="none"
      stroke="var(--chart-ink)"
      strokeWidth="1.8"
      opacity="0.55"
    />
    {/* Shoulders + torso */}
    <path
      d="
        M 150 108
        C 140 108, 90 118, 72 138
        L 62 174
        L 68 176
        L 82 148
        L 96 200
        L 100 280
        L 108 340
        L 122 340
        L 132 280
        L 140 340
        L 148 400
        L 172 400
        L 180 340
        L 188 280
        L 198 340
        L 212 340
        L 220 280
        L 224 200
        L 238 148
        L 252 176
        L 258 174
        L 248 138
        C 230 118, 180 108, 170 108
      "
      fill="none"
      stroke="var(--chart-ink)"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity="0.55"
    />

    {/* ── Vital branch (systemic, branching left-outward from heart) ── */}
    <g stroke="var(--chart-vital)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Main trunk */}
      <path d="M 160 155 L 140 175 L 118 200" />
      {/* Fork 1: upper-left */}
      <path d="M 140 175 L 122 168 L 104 158" />
      {/* Fork 2: mid-left */}
      <path d="M 118 200 L 100 210 L 90 230" />
      {/* Fork 3: lower */}
      <path d="M 118 200 L 125 230 L 120 260" />
      {/* Fork 4: far reach */}
      <path d="M 100 210 L 88 200 L 78 186" />
    </g>

    {/* ── Pulse branch (right side, resolving into EKG blip at heart) ── */}
    <g stroke="var(--chart-pulse)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* EKG blip at heart position — matches PulseDivider's QRS complex shape */}
      <path d="M 160 155 L 163 152 L 166 155 L 168 158 L 172 140 L 176 170 L 179 155 L 182 150 L 185 155" />
      {/* Main trunk continuing from blip */}
      <path d="M 185 155 L 200 175 L 220 200" />
      {/* Fork 1: upper-right */}
      <path d="M 200 175 L 216 168 L 232 158" />
      {/* Fork 2: mid-right */}
      <path d="M 220 200 L 236 210 L 244 230" />
      {/* Fork 3: lower */}
      <path d="M 220 200 L 212 230 L 218 260" />
    </g>

    {/* ── Heart center dot ── */}
    <circle cx="160" cy="155" r="3.5" fill="none" stroke="var(--chart-pulse)" strokeWidth="1.5" />

    {/* ── Leader-line annotations (chart-style, 1px ink lines + mono labels) ── */}
    {/* Annotation 1: STEADY RHYTHM near heart */}
    <line x1="160" y1="145" x2="160" y2="125" stroke="var(--chart-ink)" strokeWidth="0.75" opacity="0.45" />
    <line x1="160" y1="125" x2="210" y2="125" stroke="var(--chart-ink)" strokeWidth="0.75" opacity="0.45" />
    <circle cx="160" cy="145" r="1.5" fill="var(--chart-ink)" opacity="0.45" />
    <text
      x="214"
      y="128"
      className="font-mono"
      fill="var(--chart-ink)"
      fontSize="9"
      fontWeight="500"
      letterSpacing="0.1em"
      opacity="0.6"
    >
      STEADY RHYTHM
    </text>

    {/* Annotation 2: WHOLE-PATIENT CARE near left silhouette edge */}
    <line x1="90" y1="230" x2="90" y2="310" stroke="var(--chart-ink)" strokeWidth="0.75" opacity="0.45" />
    <line x1="90" y1="310" x2="40" y2="310" stroke="var(--chart-ink)" strokeWidth="0.75" opacity="0.45" />
    <circle cx="90" cy="230" r="1.5" fill="var(--chart-ink)" opacity="0.45" />
    <text
      x="36"
      y="304"
      className="font-mono"
      fill="var(--chart-ink)"
      fontSize="8"
      fontWeight="500"
      letterSpacing="0.1em"
      textAnchor="end"
      opacity="0.6"
    >
      WHOLE-PATIENT
    </text>
    <text
      x="36"
      y="316"
      className="font-mono"
      fill="var(--chart-ink)"
      fontSize="8"
      fontWeight="500"
      letterSpacing="0.1em"
      textAnchor="end"
      opacity="0.6"
    >
      CARE
    </text>

    {/* Annotation 3: CONNECTED near right branch */}
    <line x1="244" y1="230" x2="270" y2="280" stroke="var(--chart-ink)" strokeWidth="0.75" opacity="0.45" />
    <circle cx="244" cy="230" r="1.5" fill="var(--chart-ink)" opacity="0.45" />
    <text
      x="274"
      y="284"
      className="font-mono"
      fill="var(--chart-ink)"
      fontSize="8.5"
      fontWeight="500"
      letterSpacing="0.1em"
      opacity="0.6"
    >
      CONNECTED
    </text>
  </svg>
);

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all duration-200 border rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 ${
        active
          ? 'bg-pulse border-pulse text-paper font-bold shadow-sm'
          : 'border-ink/20 text-ink dark:border-paper/20 dark:text-paper hover:bg-mist dark:hover:bg-slate-800/45 font-medium'
      }`}
    >
      {label}
    </button>
  );
};

interface CategoryTagProps {
  category: string;
}

const CategoryTag: React.FC<CategoryTagProps> = ({ category }) => {
  return (
    <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider border border-ink/20 text-ink dark:border-paper/20 dark:text-paper rounded">
      {category}
    </span>
  );
};

interface DataValueProps {
  value: string | number;
  className?: string;
}

const DataValue: React.FC<DataValueProps> = ({ value, className = '' }) => {
  return (
    <span className={`font-mono font-bold text-ink dark:text-paper ${className}`}>
      {value}
    </span>
  );
};

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}
const SecondaryButton: React.FC<SecondaryButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button
      {...props}
      className={`w-full py-2 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-widest border border-ink text-ink dark:border-paper dark:text-paper hover:bg-mist dark:hover:bg-slate-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
};

const getServiceImage = (category: string, title: string): string => {
  const cat = (category || '').toLowerCase();
  const name = (title || '').toLowerCase();
  
  // 1. SPECIFIC CLINICAL PROCEDURES (Highest priority keyword matching)
  
  // IV fluids / Drip Bag (e.g. Ringer Lactate, Saline, Fluid Infusions)
  if (
    name.includes('ringer') ||
    name.includes('lactate') ||
    name.includes('saline') ||
    name.includes('dextrose') ||
    name.includes('fluid') ||
    name.includes('drip bag') ||
    name.includes('infusion')
  ) {
    return 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=300&q=80'; // medical IV drip infusion bag (200 OK)
  }

  // IV Catheter / Drip Hand / Cannula (e.g. IV Injection, Cannula)
  if (
    name.includes('cannula') ||
    name.includes('iv injection') ||
    name.includes('iv ')
  ) {
    return 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=300&q=80'; // IV catheter drip in patient hand (200 OK)
  }

  // IM Injection / Vaccine Vial / Syringe preparation (e.g. Depo, IM injection, syringe, vaccine)
  if (
    name.includes('depo') ||
    name.includes('im injection') ||
    name.includes('im ') ||
    name.includes('syringe') ||
    name.includes('vaccine') ||
    name.includes('tetanus') ||
    name.includes('vial') ||
    name.includes('injection') ||
    name.includes('implanon') ||
    name.includes('ceftriaxone') ||
    name.includes('dexamethasone') ||
    name.includes('diclofenac')
  ) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80'; // doctor preparing vaccine syringe/vial (200 OK)
  }

  // Blood Sample Collection Tubes (e.g. CBC, ESR, Blood Group, ALT/SGPT, CRP, Malaria blood test, HIV, Rheumatoid Factor)
  if (
    name.includes('blood') ||
    name.includes('cbc') ||
    name.includes('complete blood count') ||
    name.includes('blood group') ||
    name.includes('esr') ||
    name.includes('malaria') ||
    name.includes('hiv') ||
    name.includes('sgpt') ||
    name.includes('alt') ||
    name.includes('crp') ||
    name.includes('reagent') ||
    name.includes('rheumatoid') ||
    name.includes('factor') ||
    name.includes('hba1c') ||
    name.includes('hemoglobin') ||
    name.includes('wbc') ||
    name.includes('hgb') ||
    name.includes('lipid') ||
    name.includes('liver') ||
    name.includes('renal') ||
    name.includes('kidney') ||
    name.includes('urea')
  ) {
    return 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=300&q=80'; // blood sample collection tubes (200 OK)
  }

  // Urinalysis & Stool Chemistry Beakers (e.g. Urine, Urinalysis, Fecal, Stool, HCG pregnancy test, FOBT, Sputum)
  if (
    name.includes('urine') ||
    name.includes('urinalysis') ||
    name.includes('hcg') ||
    name.includes('fecal') ||
    name.includes('stool') ||
    name.includes('fobt') ||
    name.includes('sputum') ||
    name.includes('glucose')
  ) {
    return 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=300&q=80'; // laboratory chemical testing workspace (200 OK)
  }

  // Ultrasound display scans (e.g. Abdominal Ultrasound, Pelvic scan, Obstetrics, ECG/Echo, scan)
  if (
    name.includes('ultrasound') ||
    name.includes('pelvic') ||
    name.includes('abdominal') ||
    name.includes('obstetrics') ||
    name.includes('scan') ||
    name.includes('mri') ||
    name.includes('ct') ||
    name.includes('x-ray') ||
    name.includes('echo')
  ) {
    return 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=300&q=80'; // ultrasound scanner display screen (200 OK)
  }

  // Wound bandaging & suturing (e.g. dressing, suturing stitches, burn treatment)
  if (
    name.includes('wound') ||
    name.includes('suturing') ||
    name.includes('dressing') ||
    name.includes('stitch') ||
    name.includes('bandaging') ||
    name.includes('plaster') ||
    name.includes('burn')
  ) {
    return 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80'; // doctor wrapping bandage dressing (200 OK)
  }

  // Consultations & Doctor visits (e.g. consultation, checkup, counseling, examination)
  if (
    name.includes('consultation') ||
    name.includes('doctor') ||
    name.includes('checkup') ||
    name.includes('visit') ||
    name.includes('counseling') ||
    name.includes('examination')
  ) {
    return 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80'; // doctor consultation room (200 OK)
  }

  // 2. CATEGORY-BASED FALLBACKS (If no specific title keywords matched)
  if (cat.includes('lab')) {
    return 'https://images.unsplash.com/photo-1617155093730-a8bf47be792d?auto=format&fit=crop&w=300&q=80'; // lab scientist using pipette (200 OK)
  }
  if (cat.includes('imaging') || cat.includes('ultrasound')) {
    return 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=300&q=80'; // ultrasound screen (200 OK)
  }
  if (cat.includes('injection')) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80'; // vaccine preparation (200 OK)
  }
  if (cat.includes('procedure')) {
    return 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80'; // dressing/checking vitals (200 OK)
  }
  if (cat.includes('consultation')) {
    return 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80'; // doctor consultation (200 OK)
  }

  // Default Medical
  return 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=300&q=80'; // general medical equipment (200 OK)
};

interface ServiceCardProps {
  category: string;
  price: string | number;
  title: string;
  description: string;
  onBook: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ category, price, title, description, onBook }) => {
  const imageUrl = getServiceImage(category, title);
  
  return (
    <div className="bg-paper/85 dark:bg-slate-900/60 backdrop-blur-md border border-ink/8 dark:border-slate-800/80 p-4 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex gap-4 items-center group font-sans">
      {/* Service Image */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 border border-ink/5 dark:border-slate-800/60 relative">
        <img src={imageUrl} alt={title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-ink/5 dark:bg-black/10 pointer-events-none" />
      </div>

      {/* Service Info */}
      <div className="flex-grow flex flex-col justify-between h-20 sm:h-24 min-w-0">
        <div>
          <div className="flex justify-between items-center gap-2 mb-1.5">
            <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider border border-ink/20 text-slate dark:border-paper/20 dark:text-slate-400 rounded">
              {category}
            </span>
            <span className="font-mono font-bold text-[11px] text-pulse">
              {price} ETB
            </span>
          </div>
          <h3 className="font-sans font-bold text-xs sm:text-sm text-ink dark:text-paper group-hover:text-pulse transition-colors duration-300 truncate leading-tight">
            {title}
          </h3>
          <p className="font-sans text-[10px] sm:text-[11px] leading-snug text-slate dark:text-slate-400 line-clamp-2 mt-0.5">
            {description || 'Professional clinical service offered under clinic management by certified medical practitioners.'}
          </p>
        </div>

        <button
          onClick={onBook}
          className="w-full mt-1.5 py-1 px-3 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider border border-ink text-ink dark:border-paper dark:text-paper hover:bg-pulse hover:border-pulse hover:text-paper dark:hover:bg-pulse dark:hover:border-pulse dark:hover:text-paper transition-all duration-200 focus-visible:outline-none"
        >
          Book Service
        </button>
      </div>
    </div>
  );
};

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button
      {...props}
      className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-widest border border-ink bg-ink text-paper hover:bg-pulse hover:border-pulse dark:border-paper dark:bg-paper dark:text-ink dark:hover:bg-pulse dark:hover:text-paper dark:hover:border-pulse transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
};

interface PackageCardProps {
  name: string;
  price: number;
  description: string;
  validityDays: number;
  totalVisits: number;
  services: string[];
  featured?: boolean;
  featuredLabel?: string;
  onBook: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  name,
  price,
  description,
  validityDays,
  totalVisits,
  services,
  featured = false,
  featuredLabel = 'MOST BOOKED',
  onBook,
}) => {
  return (
    <div
      className={`relative p-6 border flex flex-col justify-between hover:-translate-y-1.5 hover:shadow-xl transition-all duration-500 bg-paper/85 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl ${
        featured
          ? 'border-pulse shadow-lg shadow-pulse/5 border-t-4'
          : 'border-ink/10 dark:border-slate-800/80 shadow-sm'
      }`}
    >
      {featured && (
        <div className="absolute -top-3.5 left-6">
          <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-pulse text-paper font-bold border border-pulse rounded shadow-sm">
            {featuredLabel}
          </span>
        </div>
      )}

      {/* Main content wrapper */}
      <div className="flex-grow flex flex-col">
        {/* Title row */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <h3 className="font-sans font-bold text-xl tracking-tight leading-tight text-ink dark:text-paper">
            {name}
          </h3>
          <DataValue value={`${price} ETB`} className="text-xl whitespace-nowrap text-pulse font-mono font-extrabold" />
        </div>

        {/* Description */}
        <p className="font-sans text-xs leading-relaxed text-slate dark:text-slate-400 mb-6">
          {description}
        </p>

        {/* Dashed divider */}
        <div className="border-t border-dashed border-ink/10 dark:border-slate-800/60 my-4 -mx-6" />

        {/* Validity & Total Visits */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs font-sans">
          <div>
            <span className="block font-mono uppercase text-[9px] text-slate dark:text-slate-400 tracking-wider">Validity</span>
            <DataValue value={`${validityDays} days`} className="text-sm font-bold text-ink dark:text-paper" />
          </div>
          <div>
            <span className="block font-mono uppercase text-[9px] text-slate dark:text-slate-400 tracking-wider">Total Visits</span>
            <DataValue value={`${totalVisits} visits`} className="text-sm font-bold text-ink dark:text-paper" />
          </div>
        </div>

        {/* Covered Services */}
        <div className="space-y-3 mb-8">
          <p className="font-mono uppercase text-[9px] tracking-wider text-slate dark:text-slate-400">SERVICES INCLUDED:</p>
          <div className="grid gap-2">
            {services.map((srv) => (
              <div key={srv} className="flex items-start gap-2 text-xs">
                <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-pulse dark:text-pulse" />
                <span className="text-ink dark:text-slate-300 font-sans">{srv}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Button wrapper sits flush at bottom */}
      <div className="mt-auto pt-2">
        <PrimaryButton onClick={onBook}>
          Select Package & Book
        </PrimaryButton>
      </div>
    </div>
  );
};


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

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Landing page public data states
  const [services, setServices] = useState<any[]>(FALLBACK_SERVICES);
  const [packages, setPackages] = useState<any[]>(FALLBACK_PACKAGES);
  const [doctors, setDoctors] = useState<any[]>(FALLBACK_DOCTORS);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Real clinical metrics state
  const [vitalsStats, setVitalsStats] = useState({
    patientsServed: 10482,
    staffOnDuty: 50,
    portalUptime: '99.9%',
    clinicSupport: '24/7'
  });

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
    department: 'General Medicine',
    packageId: ''
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
    fetchVitalsStats();
  }, []);

  const fetchVitalsStats = async () => {
    try {
      const res = await api.get('/api/health-check/public-stats');
      if (res.data && res.data.success) {
        setVitalsStats({
          patientsServed: res.data.patientsServed,
          staffOnDuty: res.data.staffOnDuty,
          portalUptime: res.data.portalUptime || '99.9%',
          clinicSupport: res.data.clinicSupport || '24/7'
        });
      }
    } catch (err) {
      console.error('Error fetching public vitals stats:', err);
    }
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const res = await api.get('/api/public/services');
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
      const res = await api.get('/api/public/packages');
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
      const res = await api.get('/api/public/doctors');
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
      const res = await api.post('/api/public/find-patient', {
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
          durationMinutes: 30,
          packageId: bookingDetails.packageId || undefined
        }
      };

      const res = await api.post('/api/public/book-appointment', payload);
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
      const res = await api.post('/api/public/register-patient', cardForm);
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
    <div className={`min-h-screen relative overflow-x-hidden flex flex-col transition-colors duration-500 bg-paper dark:bg-ink text-ink dark:text-paper font-sans`}>
      <div className="absolute inset-0 chart-grid pointer-events-none" />

      {/* Floating Ambient Glow Orbs */}
      <div className="bg-glow-orb bg-glow-orb-1" />
      <div className="bg-glow-orb bg-glow-orb-2" />
      <div className="bg-glow-orb bg-glow-orb-3" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-300 font-sans"
        style={{
          background: isDarkMode ? 'rgba(16, 23, 42, 0.75)' : 'rgba(250, 250, 247, 0.75)',
          borderColor: isDarkMode ? 'rgba(243, 241, 236, 0.08)' : 'rgba(21, 32, 59, 0.08)'
        }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden bg-white border border-slate-200/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <img src={clinic?.logo || "/assets/images/logo.jpg"} alt={`${clinic?.name || CLINIC_INFO.name} Logo`} className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="font-extrabold text-md tracking-tight uppercase text-ink dark:text-paper group-hover:text-pulse transition-colors duration-300">{clinic?.name || CLINIC_INFO.name}</span>
              <span className="block text-[9px] tracking-widest uppercase text-pulse font-bold">{clinic?.tagline || CLINIC_INFO.tagline}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium relative">
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
                className={`px-4 py-2 rounded-xl transition-all duration-300 font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 relative ${
                  activeTab === tab.id
                    ? 'text-pulse font-bold bg-pulse/8 dark:bg-pulse/12'
                    : 'text-slate hover:text-ink hover:bg-mist dark:text-slate-400 dark:hover:text-paper dark:hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.span 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-pulse rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab(activeTab === 'login' ? 'home' : 'login');
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 border font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 ${
                activeTab === 'login'
                  ? 'bg-pulse text-paper border-pulse shadow-md shadow-pulse/20'
                  : 'bg-ink text-paper border-ink hover:bg-pulse hover:border-pulse dark:bg-paper dark:text-ink dark:border-paper dark:hover:bg-pulse dark:hover:text-paper dark:hover:border-pulse hover:scale-102 active:scale-98'
              }`}
            >
              Staff Portal
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-amber-300 shadow-sm' : 'bg-white border-slate-200 text-pulse shadow-sm'
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
              {/* Pulse Divider (Top of Hero, animated) */}
              <PulseDivider animate={true} />

              {/* Hero & Vitals Section */}
              <div className="grid lg:grid-cols-12 gap-12 items-center">
                {/* Hero Text Content */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Kicker */}
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-pulse animate-pulse" />
                    <div className="font-mono text-xs tracking-[0.25em] text-pulse uppercase font-semibold">
                      SYSTEM STATUS — OPERATIONAL
                    </div>
                  </div>
                  
                  {/* Headline */}
                  <h1 className="font-sans font-extrabold tracking-tight leading-[1.1] text-4xl sm:text-5xl lg:text-6xl text-ink dark:text-paper">
                    Smart healthcare<br />
                    designed for{' '}
                    <span className="relative inline-block font-annotation italic text-pulse leading-none pb-1">
                      life
                      {/* Squiggly hand-drawn style underline */}
                      <svg className="absolute left-0 bottom-[-6px] w-full h-[8px]" viewBox="0 0 100 8" preserveAspectRatio="none">
                        <path d="M 2,4 C 20,1 40,6 60,3 C 80,1 94,5 98,4" stroke="var(--chart-pulse)" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                    </span>
                  </h1>

                  {/* Paragraph */}
                  <p className="text-base md:text-lg leading-relaxed max-w-[560px] text-slate dark:text-slate-300 font-sans">
                    Welcome to New Life Clinic. Explore our curated health packages, view professional clinical services, self-schedule clinical appointments, and generate your custom patient cards online instantly.
                  </p>
                  
                  {/* CTAs */}
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      onClick={() => { setActiveTab('appointment'); setBookingStep(1); }}
                      className="h-12 px-6 rounded-xl font-sans font-bold text-sm tracking-wide bg-ink text-paper hover:bg-pulse dark:bg-paper dark:text-ink dark:hover:bg-pulse dark:hover:text-paper shadow-lg shadow-ink/10 dark:shadow-none flex items-center gap-2 transition-all duration-300 hover:scale-102 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
                    >
                      Book Self-Appointment
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab('card'); setCardStep(1); }}
                      className="h-12 px-6 rounded-xl font-sans font-bold text-sm tracking-wide border border-ink text-ink hover:bg-mist dark:border-paper dark:text-paper dark:hover:bg-slate-800/60 flex items-center gap-2 transition-all duration-300 hover:scale-102 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
                    >
                      Get Patient Card
                      <CreditCard className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Right Side: Live Vitals Panel */}
                <div className="lg:col-span-5">
                  <div className="bg-paper/70 dark:bg-slate-900/50 backdrop-blur-md border border-ink/10 dark:border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 font-sans">
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-ink/8 dark:border-slate-800 pb-4 animate-parent-no-flicker">
                      <span className="font-mono text-xs tracking-wider text-slate uppercase">VITALS — CLINICAL METRICS</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-pulse animate-pulse" />
                    </div>

                    {/* Vitals Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Stat Card 1 */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${
                        isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="space-y-1">
                          <span className="block font-mono text-[9px] uppercase tracking-widest text-slate">Patients Served</span>
                          <span className={`block font-sans font-extrabold text-2xl ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`}>
                            <CountUp to={vitalsStats.patientsServed} animate={!prefersReducedMotion} />
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-ink/5 dark:border-slate-800">
                          <span className="text-[9px] text-slate font-mono">Live Count</span>
                          <div className="w-10 h-3 overflow-hidden relative" style={{ minWidth: '40px' }}>
                            <svg className="absolute left-0 top-0 h-full w-[80px] text-pulse animate-scroll-wave" viewBox="0 0 80 16" fill="none" preserveAspectRatio="none">
                              <path d="M 0 8 L 15 8 L 17 8 L 18 6 L 20 8 L 21 10 L 23 2 L 25 14 L 26 8 L 28 6 L 30 8 L 40 8 L 55 8 L 57 8 L 58 6 L 60 8 L 61 10 L 63 2 L 65 14 L 66 8 L 68 6 L 70 8 L 80 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Stat Card 2 */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${
                        isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="space-y-1">
                          <span className="block font-mono text-[9px] uppercase tracking-widest text-slate">Staff On Duty</span>
                          <span className="block font-sans font-extrabold text-2xl text-ink dark:text-paper">
                            <CountUp to={vitalsStats.staffOnDuty} animate={!prefersReducedMotion} />+
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-ink/5 dark:border-slate-800">
                          <span className="text-[9px] text-slate font-mono">Duty Rota</span>
                          <div className="w-10 h-3 overflow-hidden relative" style={{ minWidth: '40px' }}>
                            <svg className="absolute left-0 top-0 h-full w-[80px] text-pulse animate-scroll-wave" viewBox="0 0 80 16" fill="none" preserveAspectRatio="none">
                              <path d="M 0 8 L 15 8 L 17 8 L 18 6 L 20 8 L 21 10 L 23 2 L 25 14 L 26 8 L 28 6 L 30 8 L 40 8 L 55 8 L 57 8 L 58 6 L 60 8 L 61 10 L 63 2 L 65 14 L 66 8 L 68 6 L 70 8 L 80 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Stat Card 3 */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${
                        isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="space-y-1">
                          <span className="block font-mono text-[9px] uppercase tracking-widest text-slate">Portal Uptime</span>
                          <span className={`block font-sans font-extrabold text-2xl ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`}>{vitalsStats.portalUptime}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-ink/5 dark:border-slate-800">
                          <span className="text-[9px] text-slate font-mono">Secure SLA</span>
                          <div className="w-10 h-3 overflow-hidden relative" style={{ minWidth: '40px' }}>
                            <svg className="absolute left-0 top-0 h-full w-[80px] text-pulse animate-scroll-wave" viewBox="0 0 80 16" fill="none" preserveAspectRatio="none">
                              <path d="M 0 4 Q 10 2 20 4 Q 30 6 40 4 Q 50 2 60 4 Q 70 6 80 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Stat Card 4 */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${
                        isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="space-y-1">
                          <span className="block font-mono text-[9px] uppercase tracking-widest text-slate">Clinic Support</span>
                          <span className="block font-sans font-extrabold text-2xl text-ink dark:text-paper">{vitalsStats.clinicSupport}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-ink/5 dark:border-slate-800">
                          <span className="text-[9px] text-slate font-mono">Available</span>
                          <div className="w-10 h-3 overflow-hidden relative" style={{ minWidth: '40px' }}>
                            <svg className="absolute left-0 top-0 h-full w-[80px] text-pulse animate-scroll-wave" viewBox="0 0 80 16" fill="none" preserveAspectRatio="none">
                              <path d="M 0 4 Q 10 2 20 4 Q 30 6 40 4 Q 50 2 60 4 Q 70 6 80 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pulse Divider after Hero/Vitals */}
              <PulseDivider animate={false} />

              {/* ── Whole-System Care Section ── */}
              <section className="w-full bg-vital-tint/80 dark:bg-slate-900/40 rounded-3xl border border-ink/5 dark:border-slate-800/60 p-8 md:p-12 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-vital/3 to-transparent opacity-60 pointer-events-none" />
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
                  {/* Left column: text content */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Kicker */}
                    <div className="font-mono text-xs tracking-[0.2em] text-vital uppercase font-semibold">
                      WHOLE-SYSTEM CLINICAL APPROACH
                    </div>
                    {/* Heading */}
                    <h2 className="font-sans font-bold tracking-tight leading-[1.15] text-2xl sm:text-3xl lg:text-4xl text-ink dark:text-paper">
                      Care that sees the whole system, not just the{' '}
                      <span className="font-annotation italic text-pulse">
                        symptom
                      </span>.
                    </h2>
                    {/* Paragraph */}
                    <p className="text-base leading-relaxed max-w-[520px] text-slate dark:text-slate-300 font-sans">
                      Every diagnosis connects to a larger picture. Our team coordinates across departments so nothing is missed — from first reading to follow-up.
                    </p>
                  </div>
                  {/* Right column: SystemDiagram illustration */}
                  <div className="lg:col-span-5 flex justify-center order-last lg:order-none">
                    <SystemDiagram />
                  </div>
                </div>
              </section>

              {/* Pulse Divider after Whole-System Care */}
              <PulseDivider animate={false} />

              {/* Departments */}
              <div className="w-full bg-mist/60 dark:bg-[#1B2A28]/30 backdrop-blur-sm p-8 md:p-12 rounded-3xl border border-ink/5 dark:border-white/5 space-y-8 shadow-sm">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-ink dark:text-paper font-sans">Our Departments</h2>
                  <p className="text-sm text-slate dark:text-slate-400 font-sans">
                    Comprehensive medical services{' '}
                    <span className="font-annotation italic text-pulse text-lg leading-none">
                      under one roof
                    </span>
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 pt-4">
                  {CLINIC_DEPARTMENTS.map(({ name, desc, abbr }) => (
                    <div key={name} className="relative pt-6 font-sans">
                      {/* Folder tab */}
                      <div className="absolute top-0 left-0 bg-pulse text-paper font-mono text-[9px] uppercase tracking-widest font-bold h-6 px-3 flex items-center justify-center rounded-t-md shadow-sm">
                        {abbr || 'GEN'}
                      </div>
                      {/* Card */}
                      <div 
                        className="bg-paper dark:bg-slate-900 border border-ink/10 dark:border-slate-800/80 p-6 rounded-b-xl rounded-tr-xl rounded-tl-none hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
                        tabIndex={0}
                      >
                        <h3 className="font-sans font-bold text-lg text-ink dark:text-paper group-hover:text-pulse transition-colors duration-300 mb-2">
                          {name}
                        </h3>
                        <p className="font-sans text-sm text-slate dark:text-slate-400 leading-relaxed">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pulse Divider after departments */}
              <PulseDivider animate={false} />

              {/* Operating Hours & Contact */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Operating Hours */}
                <div className={`p-6 rounded-2xl border backdrop-blur-md shadow-sm ${
                  isDarkMode ? 'bg-slate-900/20 border-slate-800/80' : 'bg-white/50 border-slate-200'
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
                <div className={`p-6 rounded-2xl border backdrop-blur-md shadow-sm ${
                  isDarkMode ? 'bg-slate-900/20 border-slate-800/80' : 'bg-white/50 border-slate-200'
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
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{clinic?.address || CLINIC_INFO.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-xs uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Phone</p>
                        {clinic?.contactPhone ? (
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{clinic.contactPhone}</p>
                        ) : (
                          <>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{CLINIC_INFO.phone}</p>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{CLINIC_INFO.mobile}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-xs uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Email</p>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{clinic?.contactEmail || CLINIC_INFO.email}</p>
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
                      isDarkMode ? 'bg-slate-900/20 border-slate-800/80 hover:border-cyan-500/20' : 'bg-white/50 border-slate-200 hover:shadow-lg hover:border-teal-500/20'
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

              {/* Testimonials Section */}
              <PulseDivider animate={false} />
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-ink dark:text-paper font-sans">What Our Patients Say</h2>
                  <p className="text-sm text-slate dark:text-slate-400 font-sans">
                    Real reviews from individuals and families who trust us with their{' '}
                    <span className="font-annotation italic text-pulse text-lg leading-none">healthcare</span>
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      name: 'Samuel Kebede',
                      role: 'Regular Patient',
                      stars: 5,
                      text: 'New Life Clinic has completely transformed my healthcare experience. The smart portal allowed me to register and generate my card in seconds, and the doctors are incredibly thorough.',
                      avatar: 'S'
                    },
                    {
                      name: 'Helen Tekle',
                      role: 'Mother of two',
                      stars: 5,
                      text: 'As a mother, convenience is everything. Booking self-appointments for my kids is simple, and the pediatric department is outstanding. Highly recommended!',
                      avatar: 'H'
                    },
                    {
                      name: 'Dr. Nataniel Girma',
                      role: 'Visiting Medical Specialist',
                      stars: 5,
                      text: 'I am thoroughly impressed by the integration of clinical services, lab diagnostics, and patient portal workflows. It is a highly professional system that respects patient time.',
                      avatar: 'N'
                    }
                  ].map((t, idx) => (
                    <div key={idx} className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      isDarkMode ? 'bg-slate-900/20 border-slate-800/80' : 'bg-white/60 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-600'
                        }`}>
                          {t.avatar}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-ink dark:text-paper">{t.name}</h4>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t.role}</span>
                        </div>
                      </div>
                      <div className="flex gap-0.5 text-amber-500 mb-3">
                        {Array.from({ length: t.stars }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </div>
                      <p className="text-xs leading-relaxed text-slate dark:text-slate-300 italic">"{t.text}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ Section */}
              <PulseDivider animate={false} />
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-ink dark:text-paper font-sans">Frequently Asked Questions</h2>
                  <p className="text-sm text-slate dark:text-slate-400 font-sans">Got questions? We have answers to help you navigate our clinical services.</p>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      q: 'How do I register as a new patient?',
                      a: 'Click on the "Self-Appointment" tab and choose "No, I am a new patient" to register. You can also visit the "Get Patient Card" tab to instantly generate your official clinical ID card.'
                    },
                    {
                      q: 'What is the benefit of the Patient Card?',
                      a: 'The Patient Card contains your unique Patient ID and QR code. Depending on your chosen card tier (Basic, Premium, VIP, Family), it grants you direct service discounts of up to 25%, free clinical consultations, and priority appointment booking.'
                    },
                    {
                      q: 'How do I check in for my self-appointment?',
                      a: 'When you arrive at the clinic, present your digital or printed Patient Card (with barcode/QR code) at the reception desk, or scan it at our check-in kiosk for immediate queue integration.'
                    },
                    {
                      q: 'Can I choose my specific physician or specialist?',
                      a: 'Yes, in Step 3 of the Self-Appointment wizard, you can select your preferred practitioner or specialist depending on the selected medical department.'
                    },
                    {
                      q: 'Are clinical laboratory results accessible online?',
                      a: 'Yes, clinic staff record laboratory results securely. Patients can verify their credentials or scan their QR code on the patient portal to view their active clinical records instantly.'
                    }
                  ].map((faq, idx) => (
                    <details
                      key={idx}
                      className={`group rounded-2xl border transition-all duration-300 ${
                        isDarkMode ? 'border-slate-800 bg-slate-900/10' : 'border-slate-200 bg-white/40'
                      }`}
                    >
                      <summary className="flex justify-between items-center font-bold text-sm p-5 cursor-pointer select-none text-ink dark:text-paper group-open:text-pulse transition-colors duration-300">
                        {faq.q}
                        <span className="transition-transform duration-300 group-open:rotate-180 text-slate">
                          ▼
                        </span>
                      </summary>
                      <div className="px-5 pb-5 text-xs leading-relaxed text-slate dark:text-slate-300 border-t border-dashed border-ink/10 dark:border-slate-800/60 pt-4">
                        {faq.a}
                      </div>
                    </details>
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
                <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-paper font-sans">
                  Our <span className="font-annotation italic text-pulse leading-none">Clinical</span> Services
                </h1>
                <p className="max-w-[560px] mx-auto text-sm text-slate font-sans">
                  Browse our full list of clinic services, lab tests, and imaging procedures available at New Life Clinic.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-xs group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 text-sm rounded-xl outline-none font-sans bg-paper dark:bg-slate-900 border border-ink/10 dark:border-slate-800 text-ink dark:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 transition-all duration-200"
                  />
                </div>

                {/* Category Buttons (FilterPills) */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                  {categories.map(cat => (
                    <FilterPill
                      key={cat}
                      label={cat === 'All' ? 'All categories' : cat}
                      active={selectedCategory === cat}
                      onClick={() => setSelectedCategory(cat)}
                    />
                  ))}
                </div>
              </div>

              {/* Services Grid */}
              {servicesLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className={`animate-spin rounded-full h-10 w-10 border-t-2 ${isDarkMode ? 'border-pulse' : 'border-pulse'}`} />
                  <p className="text-xs text-slate-400 mt-4">Loading clinical catalog...</p>
                </div>
              ) : filteredServices.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map(service => (
                    <ServiceCard
                      key={service._id}
                      category={service.category}
                      price={service.price}
                      title={service.name}
                      description={service.description}
                      onBook={() => {
                        setActiveTab('appointment');
                        setBookingStep(1);
                        setBookingDetails(prev => ({
                          ...prev,
                          type: service.category.toLowerCase().includes('lab') ? 'lab-test' : service.category.toLowerCase().includes('imaging') ? 'imaging' : 'Consultation',
                          reason: `Booked service: ${service.name}`
                        }));
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed rounded-2xl border-ink/10 dark:border-slate-800">
                  <p className="text-slate text-sm font-sans">No services matches your filters. Try search filters.</p>
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
                  Choose a <span className="font-annotation italic text-pulse leading-none text-lg">tailored</span> health package designed for chronic monitoring, regular review cycles, and all-inclusive testing.
                </p>
              </div>

              {packagesLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className={`animate-spin rounded-full h-10 w-10 border-t-2 ${isDarkMode ? 'border-cyan-400' : 'border-teal-600'}`} />
                  <p className="text-xs text-slate-400 mt-4">Loading health packages...</p>
                </div>
              ) : packages.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-8 items-stretch">
                  {packages.map(pkg => (
                    <PackageCard
                      key={pkg._id}
                      name={pkg.name}
                      price={pkg.price}
                      description={pkg.description}
                      validityDays={pkg.validity_days}
                      totalVisits={pkg.total_visits}
                      services={pkg.services}
                      featured={pkg.featured || false}
                      featuredLabel={pkg.featuredLabel || 'MOST BOOKED'}
                      onBook={() => {
                        setActiveTab('appointment');
                        setBookingStep(1);
                        setBookingDetails(prev => ({
                          ...prev,
                          type: 'Check-up',
                          reason: `Interested in Package: ${pkg.name}`,
                          packageId: pkg._id
                        }));
                      }}
                    />
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
              <div className="relative flex items-center justify-between px-2 py-4 rounded-2xl border bg-paper/50 dark:bg-slate-900/40 backdrop-blur-sm border-ink/10 dark:border-slate-800/80">
                {/* Horizontal line running behind circles */}
                <div className="absolute top-1/2 left-[10%] right-[10%] h-0.5 -translate-y-1/2 bg-ink/5 dark:bg-slate-800 pointer-events-none z-0" />
                
                {/* Active progress color overlay */}
                <div className="absolute top-1/2 left-[10%] h-0.5 -translate-y-1/2 bg-pulse transition-all duration-500 pointer-events-none z-0"
                  style={{ width: `${((bookingStep - 1) / 3) * 80}%` }}
                />

                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-sm border ${
                      bookingStep === s
                        ? 'bg-pulse text-paper border-pulse scale-110 shadow-pulse/25'
                        : bookingStep > s
                        ? 'bg-pulse/15 text-pulse border-pulse/30'
                        : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      {bookingStep > s ? '✓' : s}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest transition-opacity duration-300 ${
                      bookingStep === s 
                        ? 'text-pulse opacity-100' 
                        : 'text-slate opacity-60'
                    }`}>
                      {s === 1 ? 'Status' : s === 2 ? 'Details' : s === 3 ? 'Schedule' : 'Done'}
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
                        className={`p-6 rounded-2xl border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center gap-3 relative overflow-hidden group ${
                          isDarkMode 
                            ? 'border-slate-800 bg-slate-900/20 hover:border-cyan-500/30' 
                            : 'border-slate-200 bg-white hover:border-teal-500/30'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        <Users className={`h-8 w-8 transition-transform duration-300 group-hover:scale-110 ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                        <div>
                          <span className="block font-extrabold text-sm text-ink dark:text-paper group-hover:text-pulse transition-colors duration-300">Returning Patient</span>
                          <span className="block text-[10px] text-slate dark:text-slate-400 mt-1 font-mono">I have my Patient ID</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setIsNewPatient(true); setBookingStep(2); }}
                        className={`p-6 rounded-2xl border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center gap-3 relative overflow-hidden group ${
                          isDarkMode 
                            ? 'border-slate-800 bg-slate-900/20 hover:border-cyan-500/30' 
                            : 'border-slate-200 bg-white hover:border-teal-500/30'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        <User className={`h-8 w-8 transition-transform duration-300 group-hover:scale-110 ${isDarkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                        <div>
                          <span className="block font-extrabold text-sm text-ink dark:text-paper group-hover:text-pulse transition-colors duration-300">New Patient</span>
                          <span className="block text-[10px] text-slate dark:text-slate-400 mt-1 font-mono">First-time registration</span>
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {(() => {
                            const dept = (bookingDetails.department || '').toLowerCase();
                            const type = (bookingDetails.type || '').toLowerCase();
                            const reason = (bookingDetails.reason || '').toLowerCase();
                            if (dept.includes('imaging') || dept.includes('ultrasound') || type.includes('imaging') || reason.includes('ultrasound') || reason.includes('x-ray')) {
                              return 'Assign Imaging Specialist';
                            }
                            if (dept.includes('lab') || dept.includes('diagnostic') || type.includes('lab') || reason.includes('cbc') || reason.includes('blood') || reason.includes('urine')) {
                              return 'Assign Lab Technician';
                            }
                            if (dept.includes('nurse') || dept.includes('vital') || type.includes('procedure') || reason.includes('wound') || reason.includes('injection') || reason.includes('vaccine') || reason.includes('dressing')) {
                              return 'Assign Nurse';
                            }
                            return 'Assign Doctor';
                          })()}
                        </label>
                        <select
                          value={bookingDetails.doctorId}
                          onChange={e => setBookingDetails({...bookingDetails, doctorId: e.target.value})}
                          style={inputStyle}
                          className="auth-login-input w-full h-10 px-3 text-xs rounded-xl outline-none"
                        >
                          {(() => {
                            const dept = (bookingDetails.department || '').toLowerCase();
                            const type = (bookingDetails.type || '').toLowerCase();
                            const reason = (bookingDetails.reason || '').toLowerCase();
                            let targetRole = 'doctor';
                            let placeholder = 'Choose Doctor (or leave blank)';

                            if (dept.includes('imaging') || dept.includes('ultrasound') || type.includes('imaging') || reason.includes('ultrasound') || reason.includes('x-ray')) {
                              targetRole = 'imaging';
                              placeholder = 'Choose Specialist (or leave blank)';
                            } else if (dept.includes('lab') || dept.includes('diagnostic') || type.includes('lab') || reason.includes('cbc') || reason.includes('blood') || reason.includes('urine')) {
                              targetRole = 'lab';
                              placeholder = 'Choose Technician (or leave blank)';
                            } else if (dept.includes('nurse') || dept.includes('vital') || type.includes('procedure') || reason.includes('wound') || reason.includes('injection') || reason.includes('vaccine') || reason.includes('dressing')) {
                              targetRole = 'nurse';
                              placeholder = 'Choose Nurse (or leave blank)';
                            }

                            const filtered = doctors.filter(doc => (doc.role || 'doctor') === targetRole);
                            
                            return (
                              <>
                                <option value="">{placeholder}</option>
                                {filtered.map(member => {
                                  const prefix = member.role === 'doctor' ? 'Dr. ' : '';
                                  const nameDisplay = `${prefix}${member.firstName} ${member.lastName}`;
                                  const specDisplay = member.specialization || (member.role === 'nurse' ? 'Nurse' : member.role === 'lab' ? 'Lab Technician' : 'Specialist');
                                  return (
                                    <option key={member.id} value={member.id}>
                                      {nameDisplay} ({specDisplay})
                                    </option>
                                  );
                                })}
                              </>
                            );
                          })()}
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
              <div className="relative flex items-center justify-between px-2 py-4 rounded-2xl border bg-paper/50 dark:bg-slate-900/40 backdrop-blur-sm border-ink/10 dark:border-slate-800/80">
                {/* Horizontal line running behind circles */}
                <div className="absolute top-1/2 left-[15%] right-[15%] h-0.5 -translate-y-1/2 bg-ink/5 dark:bg-slate-800 pointer-events-none z-0" />
                
                {/* Active progress color overlay */}
                <div className="absolute top-1/2 left-[15%] h-0.5 -translate-y-1/2 bg-pulse transition-all duration-500 pointer-events-none z-0"
                  style={{ width: `${((cardStep - 1) / 2) * 70}%` }}
                />

                {[1, 2, 3].map(s => (
                  <div key={s} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-sm border ${
                      cardStep === s
                        ? 'bg-pulse text-paper border-pulse scale-110 shadow-pulse/25'
                        : cardStep > s
                        ? 'bg-pulse/15 text-pulse border-pulse/30'
                        : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      {cardStep > s ? '✓' : s}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest transition-opacity duration-300 ${
                      cardStep === s 
                        ? 'text-pulse opacity-100' 
                        : 'text-slate opacity-60'
                    }`}>
                      {s === 1 ? 'Details' : s === 2 ? 'Tier' : 'Smartcard'}
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
                    {/* Patient Smartcard Render */}
                    <div id="digital-patient-card-print" className="relative w-[340px] sm:w-[380px] h-[220px] rounded-2xl p-5 text-white overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-cyan-500/10 group cursor-pointer"
                      style={{
                        background: cardResult.patientCard.type === 'VIP' 
                          ? 'linear-gradient(135deg, #111827 0%, #030712 100%)' 
                          : cardResult.patientCard.type === 'Premium'
                          ? 'linear-gradient(135deg, #7c2d12 0%, #431407 100%)' 
                          : cardResult.patientCard.type === 'Family'
                          ? 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' 
                          : 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                        border: cardResult.patientCard.type === 'VIP' 
                          ? '2px solid rgba(229, 231, 235, 0.25)' 
                          : '1px solid rgba(255, 255, 255, 0.25)'
                      }}>
                      {/* Holographic light reflection strip */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                      <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                      <div className="absolute -left-16 -bottom-16 w-40 h-40 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />
                      
                      {/* Chip representation */}
                      <div className="absolute top-12 left-5 w-10.5 h-8 rounded-lg bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-400 opacity-90 border border-amber-500/35 shadow-inner flex items-center justify-center overflow-hidden">
                        <div className="w-full h-px bg-amber-600/30 absolute top-1/4" />
                        <div className="w-full h-px bg-amber-600/30 absolute top-1/2" />
                        <div className="w-full h-px bg-amber-600/30 absolute top-3/4" />
                        <div className="w-px h-full bg-amber-600/30 absolute left-1/3" />
                        <div className="w-px h-full bg-amber-600/30 absolute left-2/3" />
                      </div>

                      <div className="header flex justify-between items-start">
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-white/90">New Life Clinic</p>
                          <p className="text-[8px] uppercase tracking-widest text-white/50 font-mono">Clinical Smart Card</p>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/20 ${
                          cardResult.patientCard.type === 'VIP'
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black'
                            : ''
                        }`}>
                          {cardResult.patientCard.type}
                        </div>
                      </div>

                      <div className="details mt-14 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[12px] font-mono tracking-widest font-extrabold text-white/90">{cardResult.patientCard.cardNumber}</p>
                          <p className="text-sm font-bold truncate max-w-[200px] text-white tracking-tight">{cardResult.patient.firstName} {cardResult.patient.lastName}</p>
                          <p className="text-[9px] text-white/70">Patient ID: <span className="font-mono font-bold">{cardResult.patient.patientId}</span></p>
                          <p className="text-[8px] text-white/55 font-mono">Expires: {new Date(cardResult.patientCard.expiryDate).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="qr bg-white p-1 rounded-lg shadow-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
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
      {/* Pulse Divider above Footer */}
      <PulseDivider animate={false} />

      {/* Footer */}
      <footer className="py-16 bg-mist/40 dark:bg-slate-900/60 text-ink dark:text-paper mt-auto text-xs font-sans border-t border-ink/10 dark:border-slate-800/80 backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Column 1: Clinic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-md overflow-hidden bg-white flex items-center justify-center border border-slate-200/20 shadow-sm">
                  <img src={clinic?.logo || "/assets/images/logo.jpg"} alt={`${clinic?.name || CLINIC_INFO.name} Logo`} className="h-full w-full object-cover" />
                </div>
                <span className="font-extrabold text-sm uppercase tracking-tight text-ink dark:text-paper">{clinic?.name || CLINIC_INFO.name}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate dark:text-slate-400">
                {clinic?.address || CLINIC_INFO.address}
              </p>
              <div className="space-y-1 text-slate dark:text-slate-400">
                {clinic?.contactPhone ? (
                  <p className="text-xs font-semibold">{clinic.contactPhone}</p>
                ) : (
                  <p className="text-xs font-semibold">{CLINIC_INFO.phone} • {CLINIC_INFO.mobile}</p>
                )}
                <p className="text-xs">{clinic?.contactEmail || CLINIC_INFO.email}</p>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <p className="font-extrabold text-xs uppercase tracking-wider mb-4 text-ink dark:text-paper">Quick Links</p>
              <div className="space-y-2">
                {[
                  { id: 'services' as Tab, label: 'Our Services' },
                  { id: 'packages' as Tab, label: 'Health Packages' },
                  { id: 'appointment' as Tab, label: 'Book Appointment' },
                  { id: 'card' as Tab, label: 'Get Patient Card' },
                ].map(link => (
                  <button 
                    key={link.id} 
                    onClick={() => setActiveTab(link.id)} 
                    className="block text-xs transition-colors text-slate dark:text-slate-400 hover:text-pulse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2 rounded"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Column 3: Hours Summary */}
            <div>
              <p className="font-extrabold text-xs uppercase tracking-wider mb-4 text-ink dark:text-paper">Clinic Hours</p>
              <div className="space-y-2">
                {CLINIC_INFO.hours.map(h => (
                  <div key={h.day} className="flex justify-between text-xs text-slate dark:text-slate-400">
                    <span>{h.day}</span>
                    <span className="font-bold">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Trust Badge Summary */}
            <div className="space-y-4">
              <p className="font-extrabold text-xs uppercase tracking-wider mb-1 text-ink dark:text-paper">Security & Standards</p>
              <p className="text-slate dark:text-slate-400 text-xs leading-relaxed">
                Our database systems comply with international standards of secure records keeping.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {['SSL Secured', 'HIPAA compliant', 'ISO 9001'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border border-ink/15 text-slate dark:border-slate-800 dark:text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-ink/10 dark:border-slate-800/80 text-center text-slate dark:text-slate-500 font-mono text-[10px]">
            © {new Date().getFullYear()} {clinic?.name || CLINIC_INFO.name}. Smart Health Management. All rights reserved.
          </div>
        </div>
      </footer>    </div>
  );
};

export default Login;
