import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart, ShieldCheck, Clock, Users, ArrowRight, Activity,
  Star, Award, Stethoscope, FileText, ChevronRight, Phone,
  Mail, MapPin, CheckCircle, Send, Check, Sparkles,
  ChevronDown, Pill, AlertCircle, Zap, Globe
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

const FEATURE_HIGHLIGHTS = [
  { icon: Zap, label: 'Same-Day Results', color: 'text-amber-500 bg-amber-500/10' },
  { icon: ShieldCheck, label: 'HIPAA-Secure EMR', color: 'text-emerald-500 bg-emerald-500/10' },
  { icon: Globe, label: 'Digital Patient Card', color: 'text-blue-500 bg-blue-500/10' },
  { icon: Clock, label: '24/7 Emergency', color: 'text-rose-500 bg-rose-500/10' },
];

const SERVICE_TAB_COLORS = ['bg-blue-500/5 text-blue-500', 'bg-emerald-500/5 text-emerald-500', 'bg-purple-500/5 text-purple-500', 'bg-rose-500/5 text-rose-500', 'bg-amber-500/5 text-amber-500', 'bg-teal-500/5 text-teal-500'];

export const ClinicalHomePage: React.FC<ClinicalHomePageProps> = ({
  doctors, services, packages, isDarkMode, homeContent, onNavigateTab
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [servicesTab, setServicesTab] = useState<'services' | 'departments'>('services');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hc = homeContent;
  const heroTitle = hc?.heroTitle || 'Healthcare That Puts';
  const heroHighlight = hc?.heroHighlight || 'Your Life';
  const heroTitleEnd = hc?.heroTitleEnd || 'First';
  const heroSubtitle = hc?.heroSubtitle || 'Experience compassionate care, advanced diagnostics, and expert medical professionals—all in one trusted clinic.';
  const heroBadge = hc?.heroBadge || 'Accredited Private Clinic in Addis Ababa';
  const trustBadges = hc?.trustBadges?.length ? hc.trustBadges : ['Licensed Specialists', 'Advanced Laboratory', 'Digital Health Card', 'Same-Day Checkups'];
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
    <div className="space-y-16 pb-8 font-sans">

      {/* ─── STYLE DEFINITION FOR ECG SCROLLING ────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ecgScroll {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .animate-ecg {
          stroke-dasharray: 200 40;
          animation: ecgScroll 25s linear infinite;
        }
      `}} />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-8 sm:p-12 text-white shadow-2xl shadow-blue-600/30 border-y border-blue-500/20 -mx-4 sm:-mx-6 lg:-mx-8">
        
        {/* Live ECG Scrolling Wave Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none z-0">
          <svg className="w-full h-full text-blue-300" preserveAspectRatio="none" viewBox="0 0 1000 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M 0 60 H 150 L 160 45 L 170 75 L 180 15 L 190 105 L 200 55 L 205 60 H 350 L 360 45 L 370 75 L 380 15 L 390 105 L 400 55 L 405 60 H 550 L 560 45 L 570 75 L 580 15 L 590 105 L 600 55 L 605 60 H 750 L 760 45 L 770 75 L 780 15 L 790 105 L 800 55 L 805 60 H 1000" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ecg"
            />
          </svg>
        </div>

        {/* Background glow blobs */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-indigo-400/10 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 border border-white/20 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
              {heroBadge}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {heroTitle}{' '}
              <span className="text-yellow-300 italic">{heroHighlight}</span>{' '}
              {heroTitleEnd}
            </h1>

            <p className="text-sm text-blue-100 max-w-md leading-relaxed">
              {heroSubtitle}
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => onNavigateTab('appointment')}
                className="px-5 h-10 rounded-xl text-[11px] font-bold bg-white text-blue-600 hover:bg-blue-50 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                Book Appointment
              </button>
              <button
                onClick={() => onNavigateTab('card')}
                className="px-5 h-10 rounded-xl text-[11px] font-bold bg-white/15 border border-white/25 hover:bg-white/25 transition-all cursor-pointer"
              >
                Get Patient Card
              </button>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {FEATURE_HIGHLIGHTS.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-semibold text-blue-100">
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center bg-white/15`}>
                    <f.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: compact stats styled as live medical telemetry boards */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => {
              // Map key medical icons for stats
              let StatIcon = Activity;
              const labelLower = stat.label.toLowerCase();
              if (labelLower.includes('doctor')) StatIcon = Stethoscope;
              else if (labelLower.includes('patient') || labelLower.includes('serve')) StatIcon = Heart;
              else if (labelLower.includes('service') || labelLower.includes('clinical')) StatIcon = Activity;
              else if (labelLower.includes('satisfaction') || labelLower.includes('rate')) StatIcon = ShieldCheck;
              else if (labelLower.includes('experience') || labelLower.includes('yr')) StatIcon = Award;

              return (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:bg-white/10 hover:border-white/20 transition-all duration-300 ${i === 4 ? 'col-span-2' : ''}`}
                >
                  {/* Neon active blinking medical indicator */}
                  <span className="absolute top-3 right-3 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>

                  {/* Dynamic medical watermark icons */}
                  <div className="absolute -right-2 -bottom-2 opacity-5 text-white group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none">
                    <StatIcon className="h-16 w-16" />
                  </div>

                  <span className="text-2xl font-black block relative z-10">{stat.value}</span>
                  <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mt-0.5 relative z-10">{stat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center">
        {trustBadges.map((badge, i) => (
          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            {badge}
          </span>
        ))}
      </div>

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
  );
};
