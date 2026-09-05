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
  // ── Search & Filter State
  const [heroSearch, setHeroSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [servicesSearch, setServicesSearch] = useState('');

  // ── Interactive Quick-Booking State
  const [bookingDept, setBookingDept] = useState('General Medicine');
  const [bookingDay, setBookingDay] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('09:00 AM');

  // ── Testimonials Carousel State
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // ── FAQ State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // ── Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Mouse Parallax Coordinates
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

  // ── Content Resolution with Fallbacks
  const hc = homeContent;
  const heroTitle = hc?.heroTitle || 'Healthcare That Puts';
  const heroHighlight = hc?.heroHighlight || 'Your Life';
  const heroTitleEnd = hc?.heroTitleEnd || 'First';
  const heroSubtitle = hc?.heroSubtitle || 'Experience compassionate care, advanced diagnostics, and expert medical professionals—all in one trusted clinic. Empower your health journey with our premium patient portal.';
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
    { day: 'Monday – Friday', time: '8:00 AM – 8:00 PM' },
    { day: 'Saturday', time: '8:00 AM – 5:00 PM' },
    { day: 'Sunday', time: '9:00 AM – 2:00 PM' },
    { day: 'Emergency Care', time: '24/7 Available' },
  ];

  const testimonialsList = hc?.testimonials?.length ? hc.testimonials : [
    {
      quote: "New Life Clinic completely transformed my healthcare experience. The smart portal allowed me to register and generate my digital patient card in seconds, and the doctors were exceptionally thorough.",
      author: "Samuel Kebede",
      role: "Patient — General Medicine"
    },
    {
      quote: "As a working mother, convenience and precision are everything. Booking self-appointments for my children is seamless, and the pediatric team showed incredible warmth and expertise.",
      author: "Helen Tekle",
      role: "Patient — Pediatrics & Vaccination"
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

      {/* ─── STYLE DEFINITIONS ─────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ecgScroll {
          to { stroke-dashoffset: -1000; }
        }
        .animate-ecg {
          stroke-dasharray: 200 40;
          animation: ecgScroll 18s linear infinite;
        }
        @keyframes softShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .shimmer-gradient {
          background-image: linear-gradient(270deg, #0057FF, #2563EB, #00C2FF, #0057FF);
          background-size: 600% 600%;
          animation: softShimmer 16s ease infinite;
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.15); }
          40% { transform: scale(1); }
          55% { transform: scale(1.15); }
        }
        .animate-heartbeat {
          animation: heartbeat 2s infinite ease-in-out;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float-medium {
          animation: float-medium 5s ease-in-out infinite;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .dark .glass-card {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}} />

      {/* ─── 1. ULTRA-MODERN LUXURY HERO SECTION ───────────────────────────────── */}
      <section 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full min-h-[720px] lg:min-h-[780px] flex flex-col justify-between items-center bg-[#F8FBFF] dark:bg-slate-950 transition-colors duration-500 overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-12 border-b border-slate-200/50 dark:border-slate-800/40 select-none z-10"
      >
        {/* Soft Shifting Medical Gradient Background Blobs */}
        <div className="absolute top-1/4 left-1/3 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 blur-[130px] pointer-events-none animate-float-slow z-0" />
        <div className="absolute top-1/3 right-1/4 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-indigo-500/10 to-blue-600/10 blur-[110px] pointer-events-none animate-float-medium z-0" />

        {/* Medical Cross Watermark */}
        <div className="absolute right-12 top-20 opacity-[0.025] dark:opacity-[0.035] pointer-events-none scale-125 z-0">
          <svg width="400" height="400" viewBox="0 0 100 100" fill="currentColor">
            <path d="M 38 10 H 62 V 38 H 90 V 62 H 62 V 90 H 38 V 62 H 10 V 38 H 38 Z" />
          </svg>
        </div>

        {/* Live ECG Heartbeat Line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 opacity-[0.07] dark:opacity-[0.09] pointer-events-none w-full z-0">
          <svg className="w-full h-48 text-blue-500" preserveAspectRatio="none" viewBox="0 0 1000 120" fill="none">
            <path 
              d="M 0 60 H 200 L 210 40 L 220 80 L 230 10 L 240 110 L 250 50 L 255 60 H 450 L 460 40 L 470 80 L 480 10 L 490 110 L 500 50 L 505 60 H 700 L 710 40 L 720 80 L 730 10 L 740 110 L 750 50 L 755 60 H 1000" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ecg"
            />
          </svg>
        </div>

        {/* Hero Content Center Grid */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center flex-grow pt-4 relative z-10">
          
          {/* LEFT COLUMN: Headline & Core Actions */}
          <div className="lg:col-span-6 space-y-6 text-left relative z-20">
            {/* Small Premium Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/90 dark:bg-slate-900/90 border border-blue-500/20 shadow-sm text-blue-600 dark:text-blue-400 backdrop-blur-md"
            >
              <span className="text-amber-400 text-sm">★</span> {heroBadge}
            </motion.div>

            {/* Giant Modern Headline with Fixed Spacing */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[68px] font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white"
            >
              Healthcare <br />
              <span className="text-transparent bg-clip-text [-webkit-background-clip:text] [background-clip:text] shimmer-gradient inline-block pr-3">
                {heroHighlight}
              </span>
              <span className="text-slate-900 dark:text-white">
                {heroTitleEnd}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-600 dark:text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl font-normal"
            >
              {heroSubtitle}
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4 items-center pt-1"
            >
              {/* Premium Gradient Button */}
              <button
                onClick={() => onNavigateTab('appointment')}
                className="px-8 h-12 rounded-full text-xs font-bold tracking-wide shimmer-gradient text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Book Appointment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              
              {/* Secondary Doctor Button */}
              <button
                onClick={() => {
                  const el = document.getElementById('doctors-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-7 h-12 rounded-full text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-2"
              >
                <Stethoscope className="h-4 w-4 text-blue-500" />
                <span>Find a Doctor</span>
              </button>

              {/* Patient Card Link */}
              <button
                onClick={() => onNavigateTab('card')}
                className="px-6 h-12 rounded-full text-xs font-bold border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                <span>Get Patient Card</span>
              </button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/50 max-w-lg"
            >
              {trustBadges.slice(0, 4).map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 shrink-0">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{badge}</span>
                </div>
              ))}
            </motion.div>

            {/* Google Rating & Avatar Proof */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-3 pt-1"
            >
              <div className="flex -space-x-2">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80'
                ].map((src, i) => (
                  <img key={i} src={src} alt="Patient Avatar" className="h-8 w-8 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-sm" />
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-snug">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-slate-800 dark:text-slate-200">4.9 Rating</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Trusted by 30,000+ Happy Patients</span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Futuristic Health Dashboard with Interactive Parallax */}
          <div 
            className="lg:col-span-6 relative flex justify-center items-center h-[420px] md:h-[480px] w-full"
            style={{
              transform: `translate(${parallax.x}px, ${parallax.y}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {/* Glowing Center Ring */}
            <div className="absolute h-72 w-72 md:h-88 md:w-88 rounded-full border border-blue-500/25 bg-gradient-to-tr from-blue-500/20 to-cyan-500/10 shadow-2xl shadow-blue-500/15 animate-float-slow z-0" />

            {/* Doctor Image inside circular mask */}
            <div className="absolute h-64 w-64 md:h-80 md:w-80 rounded-full overflow-hidden z-10 animate-float-slow pointer-events-none flex items-center justify-center bg-gradient-to-b from-[#E2EDFF] to-[#CDE1FF] dark:from-slate-900 dark:to-slate-800 border-4 border-white/60 dark:border-slate-800/60 shadow-xl">
              <img 
                src="/assets/hero_doctor.png" 
                alt="Professional Doctor Portrait" 
                className="w-full h-full object-cover object-top scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=500&q=80";
                }}
              />
            </div>

            {/* Orbiting Glass Rings */}
            <div className="absolute inset-0 border border-slate-300/30 dark:border-slate-700/30 rounded-full scale-[1.2] pointer-events-none opacity-40 z-0" />

            {/* ── Floating Telemetry Glass Widgets ── */}
            {/* 1. Appointment Today (Top Left) */}
            <motion.div 
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
              className="absolute -top-3 left-2 sm:left-4 p-3.5 rounded-2xl glass-card shadow-lg text-[10px] w-44 text-left z-20"
            >
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-[9px] mb-1">
                <Clock className="h-3.5 w-3.5" /> Next Slot Available
              </div>
              <p className="font-extrabold text-sm text-slate-800 dark:text-white">09:30 AM Today</p>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px]">General Consultation</p>
            </motion.div>

            {/* 2. Live Heart Rate Card (Top Right) */}
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
              className="absolute top-6 -right-2 sm:right-2 p-3.5 rounded-2xl glass-card shadow-lg text-[10px] w-32 text-left z-20"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Heart Rate</span>
                <Heart className="h-4 w-4 text-rose-500 animate-heartbeat" />
              </div>
              <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">72 BPM</span>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-[72%]" />
              </div>
            </motion.div>

            {/* 3. Blood Pressure Card (Middle Left) */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              className="absolute top-1/2 -translate-y-1/2 -left-4 sm:-left-6 p-3.5 rounded-2xl glass-card shadow-lg text-[10px] w-36 text-left z-20"
            >
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Blood Pressure</span>
              <span className="text-xl font-black text-slate-800 dark:text-white mt-0.5 block">120 / 80</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle className="h-3 w-3" /> Optimal Range
              </span>
            </motion.div>

            {/* 4. Patient Satisfaction (Middle Right) */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
              className="absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-6 p-3.5 rounded-2xl glass-card shadow-lg text-[10px] w-32 text-left z-20"
            >
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Satisfaction</span>
              </div>
              <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">98%</span>
              <span className="text-[9px] text-slate-400">Verified Patient Care</span>
            </motion.div>

            {/* 5. Metrics Footer Card (Bottom Center/Left) */}
            <motion.div 
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 5.2, ease: "easeInOut" }}
              className="absolute -bottom-6 left-2 sm:left-6 p-4 rounded-2xl glass-card shadow-xl text-[10px] grid grid-cols-2 gap-x-6 gap-y-1 w-64 text-left z-20"
            >
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block">Doctors & Staff</span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400">30+</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block">Experience</span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400">15+ Yrs</span>
              </div>
              <div className="col-span-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-1.5 mt-1 flex justify-between items-center text-[9px]">
                <span className="text-slate-500">Patients: <b className="text-slate-800 dark:text-slate-200">30,000+</b></span>
                <span className="text-rose-500 font-extrabold flex items-center gap-1 uppercase tracking-wide">
                  <AlertCircle className="h-3 w-3 animate-pulse" /> Emergency 24/7
                </span>
              </div>
            </motion.div>
          </div>

        </div>

        {/* ── Search & Quick Shortcuts ── */}
        <div className="w-full max-w-4xl mx-auto pt-10 relative z-20 space-y-4">
          {/* Glass Search Panel */}
          <div className="p-2 rounded-2xl glass-card shadow-lg flex items-center gap-3 group hover:border-blue-500/40 transition-all duration-300">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Search className="h-5 w-5" />
            </div>
            <input 
              type="text" 
              value={heroSearch}
              onChange={(e) => {
                setHeroSearch(e.target.value);
                setServicesSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const el = document.getElementById('services-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              placeholder="Search doctors, clinical tests, procedures, ultrasound, blood panels..." 
              className="flex-grow bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 outline-none placeholder-slate-400 py-2"
            />
            <button 
              onClick={() => {
                const el = document.getElementById('services-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 h-11 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
            >
              <span>Explore Services</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Category Shortcut Pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_SHORTCUTS.map((s, i) => (
              <button 
                key={i} 
                onClick={() => {
                  setSelectedCategory(s.key === 'pharmacy' ? 'all' : s.key);
                  const el = document.getElementById('services-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:border-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:border-blue-600 transition-all hover:-translate-y-0.5 cursor-pointer shadow-sm"
              >
                <s.icon className="h-3.5 w-3.5" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

      </section>

      {/* ─── 2. INTERACTIVE QUICK-BOOKING TIME SLOT SELECTOR TEASER ────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-30">
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-blue-500/20 shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  ⚡ Express Priority Reservation
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Instant Care Booking — Pick a Specialty & Slot
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

      {/* ─── 3. WHY CHOOSE US: HIGH-TECH BENTO GRID ────────────────────────────── */}
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

      {/* ─── 4. INTERACTIVE SERVICES & DIAGNOSTIC TESTS EXPLORER ──────────────── */}
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

      {/* ─── 5. FEATURED DOCTORS & SPECIALISTS SHOWCASE ─────────────────────────── */}
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

      {/* ─── 6. 24/7 EMERGENCY & CRITICAL URGENT CARE BANNER ────────────────────── */}
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

      {/* ─── 7. 5-STEP PATIENT JOURNEY INTERACTIVE FLOW ─────────────────────────── */}
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

      {/* ─── 8. PREVENTATIVE CARE & HEALTH PACKAGES ────────────────────────────── */}
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

      {/* ─── 9. VERIFIED PATIENT TESTIMONIALS CAROUSEL ─────────────────────────── */}
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

      {/* ─── 10. FAQ ACCORDION & QUICK CONTACT INQUIRY ──────────────────────────── */}
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
