import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart, ShieldCheck, Clock, Users, ArrowRight, Activity,
  Star, Award, Stethoscope, FileText, ChevronRight, ChevronLeft, Phone,
  Mail, MapPin, CheckCircle, Send, Check, Sparkles,
  ChevronDown, Pill, AlertCircle, AlertTriangle, Zap, Globe, Search, Brain,
  Calendar, QrCode, Microscope
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { HomeContent } from '../services/homeContentService';
import { normalizeCategory } from './ClinicalServicesPage';
import { HeroSection } from './HeroSection';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  specialization: string;
}

interface Service {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  duration?: string;
  preparation?: string;
}

interface Package {
  _id: string;
  name: string;
  price: number;
  description: string;
  validity_days: number;
  total_visits: number;
  services: any[];
  featured?: boolean;
}

interface ClinicalHomePageProps {
  doctors: Doctor[];
  services: Service[];
  packages: Package[];
  isDarkMode: boolean;
  homeContent?: HomeContent | null;
  onNavigateTab: (tab: 'services' | 'packages' | 'appointment' | 'card' | 'login', details?: any) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  lab: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  imaging: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  ultrasound: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
  consultation: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  procedure: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  injection: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
};

const QUICK_SHORTCUTS = [
  { icon: Heart, label: 'Cardiology', key: 'consultation' },
  { icon: Users, label: 'Pediatrics', key: 'consultation' },
  { icon: Sparkles, label: 'Dental', key: 'procedure' },
  { icon: FileText, label: 'Radiology', key: 'imaging' },
  { icon: Activity, label: 'Laboratory', key: 'lab' },
  { icon: Pill, label: 'Pharmacy', key: 'pharmacy' },
  { icon: AlertCircle, label: 'Emergency', key: 'emergency' },
  { icon: Brain, label: 'Neurology', key: 'consultation' }
];

const TIME_SLOTS = [
  '09:00 AM', '10:30 AM', '11:45 AM', '02:00 PM', '03:30 PM', '05:00 PM'
];

export const ClinicalHomePage: React.FC<ClinicalHomePageProps> = ({
  doctors,
  services,
  packages,
  isDarkMode,
  homeContent,
  onNavigateTab
}) => {
  // â”€â”€ Search & Filter State
  const [heroSearch, setHeroSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [servicesSearch, setServicesSearch] = useState('');

  // â”€â”€ Interactive Quick-Booking State
  const [bookingDept, setBookingDept] = useState('General Medicine');
  const [bookingDay, setBookingDay] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('09:00 AM');

  // â”€â”€ Testimonials Carousel State
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // â”€â”€ FAQ State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // â”€â”€ Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // â”€â”€ Mouse Parallax Coordinates
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / 45;
    const y = (clientY - window.innerHeight / 2) / 45;
    setParallax({ x, y });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  // â”€â”€ Content Resolution with Fallbacks
  const hc = homeContent;
  const heroTitle = hc?.heroTitle || 'Healthcare That Puts';
  const heroHighlight = hc?.heroHighlight || 'Your Life';
  const heroTitleEnd = hc?.heroTitleEnd || 'First';
  const heroSubtitle = hc?.heroSubtitle || 'Experience compassionate care, advanced diagnostics, and expert medical professionalsâ€”all in one trusted clinic. Empower your health journey with our premium patient portal.';
  const heroBadge = hc?.heroBadge || 'Accredited Private Clinic in Addis Ababa';
  const trustBadges = hc?.trustBadges?.length ? hc.trustBadges : [
    'Advanced Laboratory', 'Digital Health Card', 'Same-Day Checkups', 'Certified Specialists'
  ];
  const stats = hc?.stats?.length ? hc.stats : [
    { label: 'Licensed Doctors', value: '30+' },
    { label: 'Clinical Services', value: '250+' },
    { label: 'Patients Served', value: '30,000+' },
    { label: 'Satisfaction Rate', value: '99%' },
    { label: 'Clinic Experience', value: '15+ Yrs' }
  ];
  const contactAddress = hc?.contactAddress || 'Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia';
  const contactPhone = hc?.contactPhone || '+251 925 959 219';
  const contactEmailAddr = hc?.contactEmail || 'newlifemediumclinic@gmail.com';
  const workingHours = hc?.workingHours?.length ? hc.workingHours : [
    { day: 'Monday â€“ Friday', time: '8:00 AM â€“ 8:00 PM' },
    { day: 'Saturday', time: '8:00 AM â€“ 5:00 PM' },
    { day: 'Sunday', time: '9:00 AM â€“ 2:00 PM' },
    { day: 'Emergency Care', time: '24/7 Available' },
  ];

  const testimonialsList = hc?.testimonials?.length ? hc.testimonials : [
    {
      quote: "New Life Clinic completely transformed my healthcare experience. The smart portal allowed me to register and generate my digital patient card in seconds, and the doctors were exceptionally thorough.",
      author: "Samuel Kebede",
      role: "Patient â€” General Medicine"
    },
    {
      quote: "As a working mother, convenience and precision are everything. Booking self-appointments for my children is seamless, and the pediatric team showed incredible warmth and expertise.",
      author: "Helen Tekle",
      role: "Patient â€” Pediatrics & Vaccination"
    },
    {
      quote: "I am thoroughly impressed by their automated laboratory and instant online test results. Zero waiting time and high-precision diagnostics under one modern roof.",
      author: "Dr. Nataniel Girma",
      role: "Consulting Physician"
    }
  ];

  const faqs = hc?.faqs?.length ? hc.faqs : [
    { question: 'How do I register as a new patient online?', answer: 'Click on "Self-Appointment" in the top navigation and select "No, I am a new patient" to complete registration in under two minutes. You can also visit "Get Patient Card" to instantly generate your digital barcode and QR ID card.' },
    { question: 'What privileges does the New Life Digital Patient Card offer?', answer: 'Your digital card securely stores your medical record number and QR code. Depending on your membership tier, it grants you direct discounts of up to 25% on diagnostics, zero-wait check-in kiosk access, and priority doctor scheduling.' },
    { question: 'How quickly are laboratory test results ready?', answer: 'Routine blood counts, urinalysis, and rapid screenings are completed within 45 to 60 minutes. Results are instantly accessible via your private patient portal and Telegram notification link.' },
    { question: 'Can I choose my specific specialist or physician?', answer: 'Yes! In the Self-Appointment booking wizard, you can review available physicians by medical department and pick your preferred time slot directly.' },
    { question: 'Do you offer emergency care and ambulance support?', answer: 'Yes, our clinic provides 24/7 emergency response, IV resuscitation, trauma management, and rapid dispatch across Addis Ababa. Call our emergency direct line at +251 925 959 219 anytime.' }
  ];

  const showPackages = hc?.showPackages !== false;
  const showFaq = hc?.showFaq !== false;
  const showContactForm = hc?.showContactForm !== false;

  // Auto-rotate testimonials every 7 seconds
  useEffect(() => {
    if (testimonialsList.length <= 1) return;
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonialsList.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [testimonialsList.length]);

  // Handle Quick Booking Teaser submit
  const handleQuickBookingSubmit = () => {
    let targetDate = bookingDate;
    if (bookingDay === 'today') {
      targetDate = new Date().toISOString().split('T')[0];
    } else if (bookingDay === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      targetDate = d.toISOString().split('T')[0];
    }

    toast.success(`Selected ${bookingDept} for ${selectedSlot}. Continuing to confirmation...`);
    onNavigateTab('appointment', {
      department: bookingDept,
      timeSlot: selectedSlot,
      date: targetDate,
      reason: `Quick Booking for ${bookingDept} on ${targetDate} at ${selectedSlot}`
    });
  };

  // Filter services
  const filteredServices = services.filter((s) => {
    const sCat = normalizeCategory(s.category);
    const matchesCategory = selectedCategory === 'all' 
      || sCat === selectedCategory.toLowerCase()
      || (selectedCategory === 'imaging' && (sCat === 'imaging' || sCat === 'ultrasound'))
      || (selectedCategory === 'procedure' && (sCat === 'procedure' || sCat === 'injection'));
    const query = (servicesSearch || heroSearch).toLowerCase().trim();
    const matchesSearch = !query || s.name.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      toast.error('Please complete all contact fields.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success('Thank you! Our clinical reception will contact you shortly.');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setSubmitting(false);
    }, 1200);
  };

  // Doctor roster (fallback if empty)
  const displayDoctors = doctors.length > 0 ? doctors : [
    { id: '1', firstName: 'DR', lastName: 'Natan', role: 'doctor', specialization: 'Internal & General Medicine' },
    { id: '2', firstName: 'Mahlet', lastName: 'Yohannes', role: 'imaging', specialization: 'Ultrasound & Radiology Specialist' },
    { id: '3', firstName: 'Semhal', lastName: 'Melaku', role: 'nurse', specialization: 'Senior Clinical Nursing' },
    { id: '4', firstName: 'Medina', lastName: 'Negash', role: 'lab', specialization: 'Chief Diagnostic Laboratory' }
  ];

  return (
    <div className="space-y-0 pb-16 font-sans bg-[#F8FBFF] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden">

      {/* â”€â”€â”€ 1. HERO SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <HeroSection
        heroTitle={heroTitle}
        heroHighlight={heroHighlight}
        heroTitleEnd={heroTitleEnd}
        heroSubtitle={heroSubtitle}
        heroBadge={heroBadge}
        trustBadges={trustBadges}
        stats={stats}
        heroSearch={heroSearch}
        setHeroSearch={setHeroSearch}
        setServicesSearch={setServicesSearch}
        setSelectedCategory={setSelectedCategory}
        onNavigateTab={onNavigateTab}
        parallax={parallax}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />



      {/* â”€â”€â”€ 2. INTERACTIVE QUICK-BOOKING TIME SLOT SELECTOR TEASER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-30">
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-blue-500/20 shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  âš¡ Express Priority Reservation
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Instant Care Booking â€” Pick a Specialty & Slot
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Reserve your consultation with board-certified physicians in 60 seconds with no upfront fee.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Zero Queue Waiting
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 items-end">
            {/* Step 1: Department Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                1. Select Department
              </label>
              <select 
                value={bookingDept}
                onChange={(e) => setBookingDept(e.target.value)}
                className="w-full h-11 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics & Child Care</option>
                <option value="Ultrasound">Ultrasound & Radiology</option>
                <option value="Laboratory">Laboratory Diagnostics</option>
                <option value="Gynecology">Gynecology & Obstetrics</option>
                <option value="Emergency">Urgent Care / Emergency</option>
              </select>
            </div>

            {/* Step 2: Date Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                2. Preferred Day
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBookingDay('today')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    bookingDay === 'today'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Today
                </button>
                <button
                  onClick={() => setBookingDay('tomorrow')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    bookingDay === 'tomorrow'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            {/* Step 3: Time Slot Pills */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                3. Choose Available Slot
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TIME_SLOTS.slice(0, 3).map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`h-11 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      selectedSlot === slot
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Book CTA Button */}
            <div>
              <button
                onClick={handleQuickBookingSubmit}
                className="w-full h-11 rounded-xl text-xs font-bold shimmer-gradient text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Confirm & Reserve Slot</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 3. WHY CHOOSE US: HIGH-TECH BENTO GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
            Why New Life Clinic
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Next-Generation Medical Care Built Around You
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We integrate accredited medical specialists with modern laboratory diagnostics and digital patient workflows to deliver healthcare without compromises.
          </p>
        </div>

        {/* Bento Grid Layout (6 Items) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Bento Card 1 (Large 8 Cols): Modern Automated Laboratory */}
          <div className="md:col-span-8 rounded-3xl p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden shadow-xl flex flex-col justify-between group">
            <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
            <div className="space-y-4 relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Microscope className="h-6 w-6 text-white" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-white/20 text-white">
                Accredited High-Throughput Diagnostic Facility
              </span>
              <h3 className="text-2xl sm:text-3xl font-black leading-snug">
                Automated Clinical Laboratory with 45-Minute Rapid Turnaround
              </h3>
              <p className="text-white/80 text-xs sm:text-sm max-w-xl leading-relaxed">
                Full-spectrum hematology (CBC), clinical biochemistry (LFT, RFT, Lipid, RBS), serology, and hormonal assays. Automated barcode specimen tracking eliminates human error with immediate digital delivery to your patient portal.
              </p>
            </div>
            <div className="pt-8 border-t border-white/15 mt-6 grid grid-cols-3 gap-4 relative z-10 text-left">
              <div>
                <span className="block text-2xl font-black">45 Min</span>
                <span className="text-[10px] text-white/70 font-semibold uppercase">Routine Test Results</span>
              </div>
              <div>
                <span className="block text-2xl font-black">99.8%</span>
                <span className="text-[10px] text-white/70 font-semibold uppercase">Diagnostic Precision</span>
              </div>
              <div>
                <span className="block text-2xl font-black">250+</span>
                <span className="text-[10px] text-white/70 font-semibold uppercase">Certified Lab Tests</span>
              </div>
            </div>
          </div>

          {/* Bento Card 2 (4 Cols): Digital Health Card */}
          <div className="md:col-span-4 rounded-3xl p-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between hover:border-blue-500/40 transition-all group">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Smart Digital Patient Card & QR System
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your encrypted medical passport. Store clinical history, scan for express check-in, and enjoy up to 25% direct treatment discounts on tests.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Instant Telegram & PDF ID</span>
              <button 
                onClick={() => onNavigateTab('card')}
                className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-[10px] font-bold transition-all cursor-pointer"
              >
                Claim Card
              </button>
            </div>
          </div>

          {/* Bento Card 3 (4 Cols): Zero-Wait Express Triage */}
          <div className="md:col-span-4 rounded-3xl p-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between hover:border-blue-500/40 transition-all">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Zero-Wait Express Triage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Digital kiosk check-in and synchronized patient assignment. Average queue wait times under 15 minutes with real-time nurse vitals check.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Average Wait: &lt; 15 Mins
            </div>
          </div>

          {/* Bento Card 4 (4 Cols): 3D/4D Diagnostic Ultrasound */}
          <div className="md:col-span-4 rounded-3xl p-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between hover:border-blue-500/40 transition-all">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                3D/4D High-Definition Ultrasound
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Precision fetal tracking, abdominal organs, and pelvic ultrasound imaging interpreted by dedicated sonography radiologists.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Same-Day Digital Scans</span>
              <button 
                onClick={() => onNavigateTab('appointment')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Book Scan <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Card 5 (4 Cols): 24/7 Multi-Disciplinary Emergency */}
          <div className="md:col-span-4 rounded-3xl p-7 bg-gradient-to-br from-rose-500/10 to-red-600/5 dark:from-rose-950/40 dark:to-slate-900 border border-rose-500/20 shadow-lg flex flex-col justify-between hover:border-rose-500/40 transition-all">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                24/7 Dedicated Clinical Emergency
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Continuous on-site medical doctors, minor surgery theater, wound care, and trauma management on call around the clock.
              </p>
            </div>
            <div className="pt-4 border-t border-rose-500/20 flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">Hotline: +251 925 959 219</span>
              <a 
                href="tel:+251925959219"
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-all flex items-center gap-1"
              >
                <Phone className="h-3 w-3" /> Call
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* â”€â”€â”€ 4. INTERACTIVE SERVICES & DIAGNOSTIC TESTS EXPLORER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="services-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
              Clinical Directory
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Explore Our Medical Services & Diagnostic Tests
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Transparent pricing, clear preparation requirements, and instant online booking.
            </p>
          </div>
          
          {/* In-Section Live Search Input */}
          <div className="w-full md:w-72">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                value={servicesSearch}
                onChange={(e) => setServicesSearch(e.target.value)}
                placeholder="Filter services..."
                className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Category Tab Pills */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-800/70">
          {[
            { id: 'all', label: 'All Services' },
            { id: 'lab', label: 'Laboratory Diagnostics' },
            { id: 'imaging', label: 'Imaging & Ultrasound' },
            { id: 'consultation', label: 'Doctor Consultations' },
            { id: 'procedure', label: 'Procedures & Minor Surgery' },
            { id: 'injection', label: 'Injections & Nursing' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.slice(0, 9).map((service) => {
            const catBadge = CATEGORY_COLORS[service.category.toLowerCase()] || CATEGORY_COLORS.lab;
            return (
              <div 
                key={service._id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${catBadge.bg} ${catBadge.text} border ${catBadge.border}`}>
                      {service.category}
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {service.price} <span className="text-xs font-semibold text-slate-400">ETB</span>
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {service.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {service.description || 'Standard high-precision diagnostic and clinical procedure performed by certified clinic specialists.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{service.duration || 'Same-day report'}</span>
                  </div>
                  <button
                    onClick={() => {
                      onNavigateTab('appointment', {
                        reason: `Book service: ${service.name}`,
                        department: service.category.toLowerCase().includes('lab') ? 'Laboratory' : service.category.toLowerCase().includes('imaging') ? 'Ultrasound' : 'General Medicine'
                      });
                    }}
                    className="px-4 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer"
                  >
                    Book Service
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Services Footer */}
        <div className="text-center pt-4">
          <button
            onClick={() => onNavigateTab('services')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all shadow-md cursor-pointer"
          >
            <span>View All 250+ Services & Clinical Tests</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* â”€â”€â”€ 5. FEATURED DOCTORS & SPECIALISTS SHOWCASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="doctors-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
              Clinical Team
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Meet Our Board-Certified Medical Specialists
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Experienced, dedicated medical practitioners committed to delivering patient-first excellence.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('appointment')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Schedule Specialist Consultation</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayDoctors.slice(0, 4).map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all flex flex-col justify-between text-center group"
            >
              <div className="space-y-4">
                {/* Doctor Avatar Badge */}
                <div className="relative mx-auto w-24 h-24 rounded-2xl overflow-hidden border-2 border-blue-500/20 bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner">
                  <Stethoscope className="h-10 w-10 text-blue-500 opacity-60 group-hover:scale-110 transition-transform duration-300" />
                  <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Available Today" />
                </div>

                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {doc.firstName} {doc.lastName}
                  </h4>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                    {doc.specialization}
                  </p>
                  <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                    {doc.role.toUpperCase()}
                  </span>
                </div>

                {/* Rating & Availability */}
                <div className="pt-2 flex items-center justify-center gap-1 text-xs text-amber-500 font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span>4.9</span>
                  <span className="text-[10px] text-slate-400 font-normal">(120+ reviews)</span>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    onNavigateTab('appointment', {
                      doctorId: doc.id,
                      reason: `Consultation with ${doc.firstName} ${doc.lastName} (${doc.specialization})`
                    });
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Book Consultation</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€â”€ 6. 24/7 EMERGENCY & CRITICAL URGENT CARE BANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="p-8 md:p-10 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-amber-300 animate-ping" />
              24/7 Immediate Emergency Dispatch
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Medical Emergency in Addis Ababa? We Are Open 24/7.
            </h3>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
              Immediate trauma care, acute cardiac & asthma stabilization, rapid fluid resuscitation, and ambulance transfer. Continuous clinical officers on duty in Bole Sub-City.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <a
              href={`tel:${contactPhone.replace(/\s/g,'')}`}
              className="px-8 h-12 rounded-full bg-white text-red-600 font-extrabold text-xs tracking-wide shadow-lg hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Phone className="h-4 w-4 text-red-600 animate-bounce" />
              <span>Call Emergency: {contactPhone}</span>
            </a>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(contactAddress)}`}
              target="_blank"
              rel="noreferrer"
              className="px-6 h-12 rounded-full border border-white/30 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              <span>Get Directions</span>
            </a>
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 7. 5-STEP PATIENT JOURNEY INTERACTIVE FLOW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
            Seamless Experience
          </span>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Your Healthcare Journey in 5 Simple Steps
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            From booking your first consultation to accessing digital lab reports on your phone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
          {[
            {
              step: '01',
              title: 'Book Online',
              desc: 'Select preferred doctor, specialty, or diagnostic package in under 60 seconds.',
              icon: Calendar
            },
            {
              step: '02',
              title: 'Express Check-In',
              desc: 'Scan your QR patient card at reception kiosk for immediate queue integration.',
              icon: QrCode
            },
            {
              step: '03',
              title: 'Doctor Consult',
              desc: 'Meet your dedicated physician for in-depth medical evaluation and vitals checking.',
              icon: Stethoscope
            },
            {
              step: '04',
              title: 'Same-Day Tests',
              desc: 'Get rapid laboratory or ultrasound scans performed immediately on-site.',
              icon: Activity
            },
            {
              step: '05',
              title: 'Digital Results',
              desc: 'Access verified lab results and electronic prescriptions straight from Telegram.',
              icon: ShieldCheck
            }
          ].map((j, idx) => (
            <div 
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative space-y-3 group hover:border-blue-500/40 hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <j.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-slate-300 dark:text-slate-700">
                  {j.step}
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white">
                {j.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {j.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€â”€ 8. PREVENTATIVE CARE & HEALTH PACKAGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showPackages && packages.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
                Comprehensive Plans
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Health Packages & Checkup Plans
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Preventative health packages designed for long-term health tracking and savings.
              </p>
            </div>
            <button 
              onClick={() => onNavigateTab('packages')} 
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>View all packages</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.slice(0, 3).map((pkg) => (
              <div 
                key={pkg._id} 
                className={`relative p-7 rounded-3xl border flex flex-col justify-between gap-6 transition-all ${
                  pkg.featured 
                    ? 'border-blue-500 bg-gradient-to-b from-blue-500/5 via-indigo-500/5 to-transparent dark:from-blue-950/30 shadow-xl shadow-blue-500/10' 
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg'
                }`}
              >
                {pkg.featured && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="space-y-3">
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">{pkg.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{pkg.description}</p>
                  
                  <div className="py-4 border-y border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Validity Period</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg.validity_days} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Included Visits</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg.total_visits} Visits</span>
                    </div>
                  </div>

                  {/* Included Services Checklist */}
                  {pkg.services && pkg.services.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Included Tests:</span>
                      {pkg.services.slice(0, 3).map((svc: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{typeof svc === 'string' ? svc : svc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{pkg.price}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">ETB</span>
                  </div>
                  <button
                    onClick={() => onNavigateTab('appointment', { reason: `Book Health Package: ${pkg.name}` })}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      pkg.featured 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20' 
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                    }`}
                  >
                    Select Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* â”€â”€â”€ 9. VERIFIED PATIENT TESTIMONIALS CAROUSEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
            Verified Experiences
          </span>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            What Our Patients Say
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real feedback from patients who trust New Life Clinic for their family healthcare.
          </p>
        </div>

        {/* Carousel Card */}
        <div className="max-w-4xl mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="p-8 md:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center relative"
            >
              <div className="flex justify-center gap-1 text-amber-400 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400" />
                ))}
              </div>

              <blockquote className="text-lg md:text-xl font-medium text-slate-700 dark:text-slate-200 italic leading-relaxed max-w-2xl mx-auto">
                {testimonialsList[testimonialIndex].quote}
              </blockquote>

              <div className="mt-6 space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {testimonialsList[testimonialIndex].author}
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  {testimonialsList[testimonialIndex].role}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel Controls */}
          <div className="flex items-center justify-center gap-3 pt-6">
            <button
              onClick={() => setTestimonialIndex((prev) => (prev - 1 + testimonialsList.length) % testimonialsList.length)}
              className="h-9 w-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              aria-label="Previous Testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {testimonialsList.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIndex(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    testimonialIndex === i ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setTestimonialIndex((prev) => (prev + 1) % testimonialsList.length)}
              className="h-9 w-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              aria-label="Next Testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ 10. FAQ ACCORDION & QUICK CONTACT INQUIRY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* FAQ Accordion (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
                Help & Answers
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-2">
                Frequently Asked Questions
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Everything you need to know about registering, appointments, and diagnostic results.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div 
                    key={idx} 
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between px-5 py-4 text-xs sm:text-sm font-bold text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4"
                    >
                      <span className="text-slate-800 dark:text-slate-100">{faq.question}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }} 
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-4 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Inquiry & Contact Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Inquiry Form */}
            {showContactForm && (
              <form 
                onSubmit={handleContact} 
                className="p-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-4"
              >
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">Quick Clinical Inquiry</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Send a message to our reception desk.</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Full Name</label>
                    <input 
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Abebe Bekele"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Email or Phone</label>
                    <input 
                      type="text"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. abebe@email.com or +251..."
                      className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Your Inquiry</label>
                    <textarea 
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Ask about tests, doctors, appointments, or packages..."
                      className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl text-xs font-bold shimmer-gradient text-white shadow-md shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Send Inquiry Message'}
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* Clinic Info Card */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Location</span>
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(contactAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-500 transition-colors"
                  >
                    {contactAddress}
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <a href={`tel:${contactPhone.replace(/\s/g,'')}`} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600">
                  <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-bold truncate">{contactPhone}</span>
                </a>
                <a href={`mailto:${contactEmailAddr}`} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600">
                  <Mail className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span className="font-bold truncate">Email Us</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
