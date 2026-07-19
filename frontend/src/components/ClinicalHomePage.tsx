import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart, ShieldCheck, Clock, Users, ArrowRight, Activity,
  Star, Award, Stethoscope, FileText, ChevronRight, Phone,
  Mail, MapPin, CheckCircle, Send, Check, Sparkles,
  ChevronDown, Pill, AlertCircle, Zap, Globe, Search, Brain
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { HomeContent } from '../services/homeContentService';

interface Doctor { id: string; firstName: string; lastName: string; role: string; specialization: string; }
interface Service { _id: string; name: string; category: string; price: number; description: string; duration?: string; }
interface Package { _id: string; name: string; price: number; description: string; validity_days: number; total_visits: number; services: any[]; featured?: boolean; }

interface ClinicalHomePageProps {
  doctors: Doctor[];
  services: Service[];
  packages: Package[];
  isDarkMode: boolean;
  homeContent?: HomeContent | null;
  onNavigateTab: (tab: 'services' | 'packages' | 'appointment' | 'card' | 'login') => void;
}

const DEPT_ICONS: Record<string, React.ComponentType<any>> = {
  'General Medicine': Stethoscope, 'Pediatrics': Users, 'Gynecology': Heart,
  'Internal Medicine': ShieldCheck, 'Laboratory': Activity, 'Radiology & ECG': FileText,
  'Ultrasound': Award, 'Pharmacy': Pill, 'Emergency': AlertCircle,
};

const SERVICE_TAB_COLORS = ['bg-blue-500/5 text-blue-500', 'bg-emerald-500/5 text-emerald-500', 'bg-purple-500/5 text-purple-500', 'bg-rose-500/5 text-rose-500', 'bg-amber-500/5 text-amber-500', 'bg-teal-500/5 text-teal-500'];

const QUICK_SHORTCUTS = [
  { icon: Heart, label: 'Cardiology', key: 'cardiology' },
  { icon: Users, label: 'Pediatrics', key: 'pediatrics' },
  { icon: Sparkles, label: 'Dental', key: 'dental' },
  { icon: FileText, label: 'Radiology', key: 'radiology' },
  { icon: Activity, label: 'Laboratory', key: 'laboratory' },
  { icon: Pill, label: 'Pharmacy', key: 'pharmacy' },
  { icon: AlertCircle, label: 'Emergency', key: 'emergency' },
  { icon: Brain, label: 'Neurology', key: 'neurology' }
];

export const ClinicalHomePage: React.FC<ClinicalHomePageProps> = ({
  doctors, services, packages, isDarkMode, homeContent, onNavigateTab
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [servicesTab, setServicesTab] = useState<'services' | 'departments'>('services');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Mouse Parallax Coordinates
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

  const hc = homeContent;
  const heroTitle = hc?.heroTitle || 'Healthcare';
  const heroHighlight = hc?.heroHighlight || 'Designed Around Your Life';
  const heroTitleEnd = hc?.heroTitleEnd || '.';
  const heroSubtitle = hc?.heroSubtitle || 'Experience exceptional healthcare through expert physicians, advanced diagnostics, modern technology, digital patient services, and compassionate care—all under one trusted medical center.';
  const heroBadge = hc?.heroBadge || '⭐ Trusted Private Healthcare in Addis Ababa';
  const trustBadges = hc?.trustBadges?.length ? hc.trustBadges : ['Same-Day Appointments', 'Digital Patient Portal', 'Insurance Accepted', 'Certified Specialists'];
  const stats = hc?.stats?.length ? hc.stats : [
    { label: 'Licensed Doctors', value: '30+' }, { label: 'Clinical Services', value: '250+' },
    { label: 'Patients Served', value: '25k+' }, { label: 'Satisfaction Rate', value: '99%' },
    { label: 'Clinic Experience', value: '15 Yrs' }
  ];
  const contactAddress = hc?.contactAddress || 'Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia';
  const contactPhone = hc?.contactPhone || '+251 925 959 219';
  const contactEmailAddr = hc?.contactEmail || 'newlifemediumclinic@gmail.com';
  const workingHours = hc?.workingHours?.length ? hc.workingHours : [
    { day: 'Mon – Fri', time: '8:00 AM – 8:00 PM' },
    { day: 'Sat', time: '8:00 AM – 5:00 PM' },
    { day: 'Sun', time: '9:00 AM – 2:00 PM' },
    { day: 'Emergency', time: '24/7' },
  ];
  const faqs = hc?.faqs?.length ? hc.faqs : [];
  const departments = hc?.departments?.length ? hc.departments : [];
  const showPackages = hc?.showPackages !== false;
  const showFaq = hc?.showFaq !== false;
  const showContactForm = hc?.showContactForm !== false;

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) { toast.error('Please fill all fields.'); return; }
    setSubmitting(true);
    setTimeout(() => {
      toast.success('Thank you! Our team will reach out shortly.');
      setContactName(''); setContactEmail(''); setContactMessage('');
      setSubmitting(false);
    }, 1400);
  };

  return (
    <div className="space-y-0 pb-8 font-sans bg-[#F8FBFF] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden">

      {/* ─── STYLE DEFINITION FOR ECG SCROLLING & GRADIENT SHIFT ─────────────────── */}
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
      `}} />

      {/* ─── 100VH LUXURY HERO SECTION ─────────────────────────────────────────── */}
      <section 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[calc(100vh-4rem)] min-h-[720px] flex flex-col justify-between items-center bg-[#F8FBFF] dark:bg-slate-950 transition-colors duration-500 overflow-hidden px-4 sm:px-6 lg:px-8 border-b border-slate-200/50 dark:border-slate-800/40 select-none z-10"
      >
        {/* Soft Shifting Medical Gradient Background Blobs (z-5) */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 blur-[120px] pointer-events-none animate-float-slow z-5" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-indigo-500/10 to-blue-600/10 blur-[100px] pointer-events-none animate-float-medium z-5" />

        {/* Large Transparent Medical Cross Watermark in BG (z-0) */}
        <div className="absolute right-12 top-24 opacity-[0.02] dark:opacity-[0.03] pointer-events-none scale-125 z-0">
          <svg width="400" height="400" viewBox="0 0 100 100" fill="currentColor">
            <path d="M 38 10 H 62 V 38 H 90 V 62 H 62 V 90 H 38 V 62 H 10 V 38 H 38 Z" />
          </svg>
        </div>

        {/* Live ECG Heartbeat Line Background (z-0) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 opacity-[0.06] dark:opacity-[0.08] pointer-events-none w-full z-0">
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
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-grow pt-4 relative">
          
          {/* LEFT COLUMN: Texts & Core Actions (z-40) */}
          <div className="lg:col-span-6 space-y-6 text-left relative z-40">
            {/* Small Premium Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-blue-600 dark:text-blue-400"
            >
              <span className="text-yellow-400">★</span> {heroBadge}
            </motion.div>

            {/* Giant Stripe-like Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[72px] font-black tracking-tight leading-[1.05] text-slate-900 dark:text-white"
            >
              Healthcare <br />
              <span className="text-transparent bg-clip-text [-webkit-background-clip:text] [background-clip:text] shimmer-gradient inline-block">
                {heroHighlight}
              </span>
              {heroTitleEnd}
            </motion.h1>

            {/* Subtitle / Description */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-[22px] leading-relaxed max-w-xl font-normal"
            >
              {heroSubtitle}
            </motion.p>

            {/* Buttons Area */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4 items-center"
            >
              {/* Premium Gradient Button */}
              <button
                onClick={() => onNavigateTab('appointment')}
                className="px-8 h-12 rounded-[24px] text-xs font-bold tracking-wide shimmer-gradient text-white shadow-lg hover:shadow-blue-500/30 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer relative overflow-hidden"
              >
                Book Appointment
              </button>
              
              {/* Luxury Secondary Button */}
              <button
                onClick={() => {
                  const el = document.getElementById('doctors-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 h-12 rounded-[24px] text-xs font-bold border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
              >
                Find a Doctor
              </button>
            </motion.div>

            {/* Premium Trust Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-x-4 gap-y-3 pt-6 border-t border-slate-200/50 dark:border-slate-800/40 max-w-lg"
            >
              {trustBadges.slice(0, 4).map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <Check className="h-3 w-3 text-emerald-500" />
                  </div>
                  <span>{badge}</span>
                </div>
              ))}
            </motion.div>

            {/* Google Rating & Avatar proof */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-3 pt-2"
            >
              {/* Overlapping Avatars */}
              <div className="flex -space-x-2">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80'
                ].map((src, i) => (
                  <img key={i} src={src} alt="Patient Avatar" className="h-7 w-7 rounded-full object-cover border-2 border-white dark:border-slate-900" />
                ))}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-snug">
                <span className="text-yellow-500 font-bold block">⭐⭐⭐⭐⭐ 4.9 Rating</span>
                Trusted by 30,000+ Happy Patients
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Futuristic Health Dashboard (Parallax) */}
          <div 
            className="lg:col-span-6 relative flex justify-center items-center h-[420px] md:h-[500px] w-full"
            style={{
              transform: `translate(${parallax.x}px, ${parallax.y}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {/* 1. Glowing background Circle (z-10) */}
            <div className="absolute h-64 w-64 md:h-80 md:w-80 rounded-full border border-blue-500/20 bg-gradient-to-tr from-blue-500/20 to-cyan-500/10 shadow-2xl shadow-blue-500/10 animate-float-slow z-10" />

            {/* 2. Doctor Image centered inside circular mask, overlays above circle (z-20) */}
            <div className="absolute h-60 w-60 md:h-76 md:w-76 rounded-full overflow-hidden z-20 animate-float-slow pointer-events-none flex items-center justify-center bg-[#E2EDFF] dark:bg-slate-900">
              <img 
                src="/assets/hero_doctor.png" 
                alt="Professional Doctor Portrait" 
                className="w-full h-full object-cover object-top scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80";
                }}
              />
            </div>

            {/* Watermark/Orbiting glass rings */}
            <div className="absolute inset-0 border border-slate-200/30 dark:border-slate-800/30 rounded-full scale-[1.25] pointer-events-none animate-spin-slow opacity-20 z-10" />

            {/* 3. TELEMETRY GLASS CARDS (Floating Orbiting Widgets) (z-30) */}

            {/* 1. Appointment Today (Top Left) */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-4 left-4 p-3 rounded-[24px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg text-[10px] w-40 text-left z-30 animate-float-slow"
            >
              <div className="flex items-center gap-1.5 text-blue-500 font-bold uppercase tracking-widest text-[9px] mb-1">
                <Clock className="h-3 w-3" /> Appointment Today
              </div>
              <p className="font-extrabold text-slate-800 dark:text-white">09:30 AM</p>
              <p className="text-slate-400 font-medium">General Consultation</p>
            </motion.div>

            {/* 2. Heart Rate Card (Top Right) */}
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute top-8 right-0 p-3 rounded-[24px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg text-[10px] w-28 text-left z-30"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Heart Rate</span>
                <Heart className="h-3.5 w-3.5 text-rose-500 animate-heartbeat" />
              </div>
              <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">72 BPM</span>
              <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-rose-500 w-[72%]" />
              </div>
            </motion.div>

            {/* 3. Blood Pressure Card (Middle Left) */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              className="absolute top-1/2 -translate-y-1/2 -left-8 p-3 rounded-[24px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg text-[10px] w-32 text-left"
            >
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Blood Pressure</span>
              <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">120 / 80</span>
              <span className="text-[9px] font-semibold text-emerald-500 flex items-center gap-0.5 mt-0.5"><CheckCircle className="h-2.5 w-2.5" /> Normal</span>
            </motion.div>

            {/* 4. Patient Satisfaction (Middle Right) */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="absolute top-1/2 -translate-y-1/2 -right-8 p-3 rounded-[24px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg text-[10px] w-28 text-left z-30"
            >
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Satisfaction</span>
              </div>
              <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">98%</span>
            </motion.div>

            {/* 5. Metrics Footer Card (Bottom Left) */}
            <motion.div 
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
              className="absolute -bottom-4 left-6 p-4 rounded-[24px] border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg text-[10px] grid grid-cols-2 gap-x-4 gap-y-1 w-64 text-left z-30"
            >
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block">Doctors</span>
                <span className="text-base font-black text-blue-500">30+</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block">Experience</span>
                <span className="text-base font-black text-blue-500">15+ Yrs</span>
              </div>
              <div className="col-span-2 border-t border-slate-200/50 dark:border-slate-800/40 pt-1 mt-1 flex justify-between items-center">
                <span>Served: <b>25,000+</b></span>
                <span className="text-rose-500 font-extrabold flex items-center gap-0.5 uppercase text-[8px] tracking-wide"><AlertCircle className="h-2.5 w-2.5 animate-pulse" /> Emergency 24/7</span>
              </div>
            </motion.div>
          </div>

        </div>

        {/* BOTTOM SECTION: Floating Glass Search & Shortcuts (z-40) */}
        <div className="w-full max-w-4xl mx-auto pb-4 relative z-40 space-y-3">
          {/* Glass Search Panel */}
          <div className="p-2 rounded-[24px] border border-white/30 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg flex items-center gap-2 group hover:scale-[1.01] hover:border-blue-500/30 transition-all duration-300">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Search className="h-4 w-4" />
            </div>
            <input 
              type="text" 
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search doctors, specialties, treatments..." 
              className="flex-grow bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none placeholder-slate-400 py-2"
            />
            <button className="px-5 h-10 shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold transition-all shadow-md shadow-blue-500/10">
              Find Services
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_SHORTCUTS.map((s, i) => (
              <button 
                key={i} 
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-500 hover:border-blue-500 hover:text-white dark:hover:bg-blue-500 dark:hover:border-blue-500 transition-all hover:-translate-y-0.5 cursor-pointer shadow-sm"
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* SCROLL INDICATOR (z-40) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce pointer-events-none opacity-50 dark:opacity-40 z-40">
          <div className="w-5 h-8 rounded-full border-2 border-slate-400 dark:border-slate-600 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-slate-400 dark:bg-slate-600 rounded-full" />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Scroll to Explore</span>
        </div>

      </section>

      {/* ─── CENTERING CONTAINER FOR REMAINDER OF HOME PAGE ──────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

        {/* ─── SERVICES + DEPARTMENTS (TABBED) ──────────────────────────────── */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">What We Offer</h2>
              <p className="text-xs text-slate-500 mt-1">Clinical services and specialist departments under one roof.</p>
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
              <button
                onClick={() => setServicesTab('services')}
                className={`px-4 h-8 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${servicesTab === 'services' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Top Services
              </button>
              <button
                onClick={() => setServicesTab('departments')}
                className={`px-4 h-8 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${servicesTab === 'departments' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Departments
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {servicesTab === 'services' ? (
              <motion.div key="services" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* 1. Large Feature Card: Full Laboratory Checkup */}
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition-all group">
                    <div className="md:w-1/2 relative h-48 md:h-auto overflow-hidden">
                      <img 
                        src="/assets/full_lab_checkup.png" 
                        alt="Full Lab Checkup" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900/60 to-transparent" />
                      <span className="absolute bottom-4 left-4 px-2 py-1 rounded bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider">
                        Popular Diagnostic Package
                      </span>
                    </div>
                    
                    <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base font-black text-slate-800 dark:text-white">Full Laboratory Checkup</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Complete hematology panel, comprehensive metabolic profile, lipid panels, urine chemistry, and key organ function screenings under one single visit.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Standard Price</span>
                          <span className="text-sm font-black text-blue-500">From 450 ETB</span>
                        </div>
                        <button 
                          onClick={() => onNavigateTab('appointment')} 
                          className="px-4 py-2 rounded-xl text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white cursor-pointer transition-colors shadow-sm"
                        >
                          Book Lab Test
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Core Service List / Grid Column */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* Card: High Resolution Ultrasound */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-blue-500/20 transition-all flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                        <Award className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold">3D/4D Obstetric & Abdominal Ultrasound</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed">High-definition pelvic, pregnancy, and abdominal sonographies with instant reports.</p>
                        <button onClick={() => onNavigateTab('appointment')} className="text-[9px] font-bold text-blue-500 hover:underline pt-1 flex items-center gap-0.5 cursor-pointer">
                          Book scan <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Card: Primary Care */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-blue-500/20 transition-all flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold">Specialist & Doctor Consultations</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Comprehensive primary health checkups, pediatrics diagnostics, and internal care.</p>
                        <button onClick={() => onNavigateTab('appointment')} className="text-[9px] font-bold text-blue-500 hover:underline pt-1 flex items-center gap-0.5 cursor-pointer">
                          Schedule visit <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Card: E-Pharmacy & Meds */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-blue-500/20 transition-all flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Pill className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold">Fully-Stocked Pharmacy Services</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Instant fulfillment of certified clinical prescriptions and patient counseling.</p>
                        <button onClick={() => onNavigateTab('services')} className="text-[9px] font-bold text-blue-500 hover:underline pt-1 flex items-center gap-0.5 cursor-pointer">
                          View medications <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
                <div className="text-center pt-4">
                  <button onClick={() => onNavigateTab('services')} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-600 cursor-pointer">
                    Explore complete list of 250+ services & tests <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="departments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((dept, i) => {
                    const IconComp = DEPT_ICONS[dept.name] || Stethoscope;
                    const color = SERVICE_TAB_COLORS[i % SERVICE_TAB_COLORS.length];
                    return (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-blue-500/20 transition-all">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                          <IconComp className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-xs font-bold">{dept.name}</h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500">{dept.count}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{dept.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ─── HEALTH PACKAGES ──────────────────────────────────────────────── */}
        {showPackages && packages.length > 0 && (
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Health Packages</h2>
                <p className="text-xs text-slate-500 mt-1">Bundled care plans for regular monitoring and checkups.</p>
              </div>
              <button onClick={() => onNavigateTab('packages')} className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer shrink-0">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {packages.slice(0, 3).map((pkg, i) => (
                <div key={pkg._id} className={`relative p-5 rounded-2xl border flex flex-col gap-4 transition-all ${pkg.featured ? 'border-blue-500 bg-gradient-to-b from-blue-500/5 to-indigo-500/5 shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md'}`}>
                  {pkg.featured && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-blue-500 text-white">Popular</span>
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm">{pkg.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{pkg.description}</p>
                  </div>
                  <div className="text-[11px] border-y border-slate-100 dark:border-slate-700 py-3 space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-400">Validity</span><span className="font-semibold">{pkg.validity_days} Days</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Visits</span><span className="font-semibold">{pkg.total_visits}</span></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-blue-500">{pkg.price} <span className="text-xs font-semibold text-slate-400">ETB</span></span>
                    <button
                      onClick={() => onNavigateTab('appointment')}
                      className={`px-4 h-8 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${pkg.featured ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white'}`}
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
        {showFaq && faqs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight">Common Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-bold text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown className={`h-3.5 w-3.5 opacity-50 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <p className="px-4 pb-3 pt-0 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-700">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── CONTACT STRIP + FORM ─────────────────────────────────────────── */}
        {showContactForm && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Info */}
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Get in Touch</h2>
                <p className="text-xs text-slate-500 mt-1">Our reception is ready to assist you.</p>
              </div>

              {/* Contact chips */}
              <div className="space-y-3">
                <a href={`https://maps.google.com/?q=${encodeURIComponent(contactAddress)}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500/30 transition-colors group">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-[11px]">
                    <span className="block font-bold text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Location</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-500 transition-colors">{contactAddress}</span>
                  </div>
                </a>

                <div className="grid grid-cols-2 gap-3">
                  <a href={`tel:${contactPhone.replace(/\s/g,'')}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500/30 transition-colors group">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-[11px] min-w-0">
                      <span className="block font-bold text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{contactPhone}</span>
                    </div>
                  </a>
                  <a href={`mailto:${contactEmailAddr}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500/30 transition-colors group">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-[11px] min-w-0">
                      <span className="block font-bold text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Email</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{contactEmailAddr}</span>
                    </div>
                  </a>
                </div>
              </div>

              {/* Hours grid */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Working Hours</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {workingHours.map((wh, i) => (
                    <div key={i} className="flex flex-col text-[11px]">
                      <span className="font-bold text-slate-600 dark:text-slate-300">{wh.day}</span>
                      <span className="text-slate-400">{wh.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Form */}
            <form onSubmit={handleContact} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold">Quick Inquiry</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-400 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Your email" className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-400 transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Message</label>
                <textarea rows={3} value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-400 transition-colors resize-none" />
              </div>
              <button type="submit" disabled={submitting} className="w-full h-10 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60">
                {submitting ? 'Sending…' : 'Send Inquiry'}
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </section>
        )}

      </div>
    </div>
  );
};
