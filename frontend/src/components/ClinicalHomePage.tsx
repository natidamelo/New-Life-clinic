import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, ShieldCheck, Clock, Users, ArrowRight, Activity, Calendar, Star,
  Award, Stethoscope, FileText, ChevronRight, ChevronLeft, Phone, Mail,
  MapPin, CheckCircle, HelpCircle, MessageSquare, Compass, Send, Check, Play, Globe,
  Pill, AlertCircle, Sparkles, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  specialization: string;
  experience?: string;
  languages?: string[];
  availability?: string;
}

interface Service {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  duration?: string;
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
  onNavigateTab: (tab: 'services' | 'packages' | 'appointment' | 'card' | 'login') => void;
}

export const ClinicalHomePage: React.FC<ClinicalHomePageProps> = ({
  doctors,
  services,
  packages,
  isDarkMode,
  onNavigateTab
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [doctorIndex, setDoctorIndex] = useState(0);

  // Quick contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Auto-slide testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      toast.error('Please fill out all fields.');
      return;
    }
    setIsSubmittingContact(true);
    setTimeout(() => {
      toast.success('Thank you for reaching out! Our clinical staff will contact you shortly.');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setIsSubmittingContact(false);
    }, 1500);
  };

  // Static items mapping
  const whyChooseUs = [
    { title: 'Experienced Specialists', desc: 'Board-certified medical team covering internal medicine, pediatrics, and custom diagnostics.', icon: Stethoscope, color: 'from-blue-500/10 to-indigo-500/10 text-blue-500 border-blue-500/15' },
    { title: 'Modern Laboratory', desc: 'Accredited high-throughput lab equipment providing CBC, chemistries, and cultures.', icon: Activity, color: 'from-emerald-500/10 to-teal-500/10 text-emerald-500 border-emerald-500/15' },
    { title: 'Digital Health Records', desc: 'Secure patient EMR with instant Telegram card ID generation and real-time portal results.', icon: ShieldCheck, color: 'from-teal-500/10 to-cyan-500/10 text-teal-500 border-teal-500/15' },
    { title: 'Advanced Ultrasound', desc: 'High-definition 3D/4D obstetric, pelvic, and abdominal sonography checks.', icon: Heart, color: 'from-purple-500/10 to-pink-500/10 text-purple-500 border-purple-500/15' },
    { title: '24/7 Emergency Support', desc: 'Continuous clinical backup on call for urgent treatment, procedures, and ambulance.', icon: Clock, color: 'from-rose-500/10 to-orange-500/10 text-rose-500 border-rose-500/15' },
    { title: 'Fast Appointment Booking', desc: 'Digital check-in kiosk integration allowing patient waiting times under 15 minutes.', icon: Users, color: 'from-indigo-500/10 to-cyan-500/10 text-indigo-500 border-indigo-500/15' }
  ];

  const departmentsList = [
    { name: 'General Medicine', desc: 'Comprehensive adult health checkups, chronic disease management, and internal medicine.', icon: Stethoscope, count: '12 Services', color: 'bg-blue-500/5 text-blue-500 border-blue-500/10' },
    { name: 'Pediatrics', desc: 'Compassionate pediatric healthcare, developmental monitoring, and child vaccinations.', icon: Users, count: '8 Services', color: 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' },
    { name: 'Gynecology', desc: 'Expert obstetrics care, antenatal screening, maternal wellness, and pelvic imaging.', icon: Heart, count: '6 Services', color: 'bg-pink-500/5 text-pink-500 border-pink-500/10' },
    { name: 'Internal Medicine', desc: 'In-depth diagnostics and specialist management for complex metabolic and systemic diseases.', icon: ShieldCheck, count: '10 Services', color: 'bg-indigo-500/5 text-indigo-500 border-indigo-500/10' },
    { name: 'Laboratory', desc: 'Fully-automated testing facility providing instant chemistry, hematology, and serology updates.', icon: Activity, count: '45 Services', color: 'bg-cyan-500/5 text-cyan-500 border-cyan-500/10' },
    { name: 'Radiology & ECG', desc: 'Diagnostic electrical activity charting, chest radiography review, and physical analysis.', icon: FileText, count: '5 Services', color: 'bg-teal-500/5 text-teal-500 border-teal-500/10' },
    { name: 'Ultrasound', desc: 'High-resolution imaging for abdominal organs, pregnancy progression, and vascular scans.', icon: Award, count: '6 Services', color: 'bg-purple-500/5 text-purple-500 border-purple-500/10' },
    { name: 'Pharmacy', desc: 'In-house pharmacy stocked with certified medications and patient safety counseling.', icon: Pill, count: '250+ Meds', color: 'bg-green-500/5 text-green-500 border-green-500/10' },
    { name: 'Emergency', desc: 'Immediate clinical rescue, minor surgeries, trauma support, and intravenous therapy.', icon: AlertCircle, count: '24/7 Open', color: 'bg-rose-500/5 text-rose-500 border-rose-500/10' }
  ];

  // Enrich doctors fallback list
  const enrichedDoctors = doctors.map((doc, idx) => ({
    ...doc,
    experience: idx % 2 === 0 ? '12 Years' : '8 Years',
    languages: idx % 2 === 0 ? ['English', 'Amharic'] : ['Amharic', 'Oromiffa', 'English'],
    availability: 'Mon - Fri (8:00 AM - 4:00 PM)'
  }));

  return (
    <div className="space-y-24 transition-colors duration-300 font-sans">
      
      {/* ─── Premium Split Hero ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
        <div className="lg:col-span-7 space-y-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500">
            <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
            Accredited Private Clinic in Addis Ababa
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Healthcare That Puts <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-500">Your Life</span> First
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 max-w-xl leading-relaxed">
            Experience compassionate care, advanced diagnostics, and expert medical professionals—all in one trusted clinic. Empower your health journey with our premium patient portal.
          </p>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => onNavigateTab('appointment')}
              className="px-6 h-12 rounded-xl text-xs font-bold tracking-wide bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Book Appointment
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('doctors-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 h-12 rounded-xl text-xs font-bold border border-slate-700/10 text-slate-700 dark:text-slate-200 hover:bg-slate-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Find a Doctor
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-4 pt-4 max-w-md border-t border-slate-700/10">
            {[
              'Licensed Specialists',
              'Advanced Laboratory',
              'Digital Health Card',
              'Same-Day Checkups'
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Illustration */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
          <div className="relative w-80 h-80 sm:w-96 sm:h-96">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-teal-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-6 rounded-full border border-blue-500/10 flex items-center justify-center">
              <div className="h-56 w-56 rounded-full border border-teal-500/15 flex items-center justify-center relative bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-xl">
                <Stethoscope className="h-16 w-16 text-white animate-pulse" />
                {/* Floating elements mock */}
                <div className="absolute -top-4 -left-4 p-3 rounded-2xl border bg-white dark:bg-slate-900 shadow-md border-slate-700/5">
                  <Activity className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="absolute -bottom-4 -right-4 p-3 rounded-2xl border bg-white dark:bg-slate-900 shadow-md border-slate-700/5">
                  <Heart className="h-4 w-4 text-rose-500" />
                </div>
              </div>
            </div>
            
            {/* ECG wave animation backdrop */}
            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30">
              <svg className="w-full h-full text-blue-500" viewBox="0 0 100 100">
                <path d="M 0 50 L 30 50 L 35 40 L 40 60 L 45 10 L 50 85 L 55 45 L 60 50 L 100 50" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="100" strokeDashoffset="100" className="animate-dash" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Animated Counters ─── */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {[
          { label: 'Licensed Doctors', val: '30+' },
          { label: 'Clinical Services', val: '250+' },
          { label: 'Patients Served', val: '25k+' },
          { label: 'Satisfaction Rate', val: '99%' },
          { label: 'Clinic Experience', val: '15 Yrs' }
        ].map((stat, i) => (
          <div key={i} className="p-5 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 text-center shadow-sm">
            <span className="text-3xl font-extrabold text-blue-500 block">{stat.val}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-1">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Why Choose New Life Clinic</h2>
          <p className="text-sm text-slate-500">We are committed to delivering standard clinical excellence with modern digital processes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyChooseUs.map((item, i) => (
            <div 
              key={i} 
              className={`p-6 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 flex flex-col justify-between space-y-4 hover:shadow-lg hover:border-blue-500/25 hover:translate-y-[-2px] transition-all duration-300`}
            >
              <div className="space-y-3">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center border shadow-inner`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-extrabold">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
              <div className="pt-2 border-t border-slate-700/5">
                <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
                  Clinical standard <Check className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Meet Our Doctors ─── */}
      <section id="doctors-section" className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Meet Our Medical Team</h2>
            <p className="text-sm text-slate-500">Highly qualified clinical practitioners and medical specialists ready to serve you.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => setDoctorIndex(prev => Math.max(0, prev - 1))}
              disabled={doctorIndex === 0}
              className="h-10 w-10 rounded-full border border-slate-700/10 flex items-center justify-center hover:bg-slate-500/5 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setDoctorIndex(prev => Math.min(enrichedDoctors.length - 1, prev + 1))}
              disabled={doctorIndex === enrichedDoctors.length - 1}
              className="h-10 w-10 rounded-full border border-slate-700/10 flex items-center justify-center hover:bg-slate-500/5 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {enrichedDoctors.slice(doctorIndex, doctorIndex + 3).map((doc) => (
            <div key={doc.id} className="p-6 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-500 font-extrabold text-lg">
                  {doc.firstName[0]}{doc.lastName[0]}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">Dr. {doc.firstName} {doc.lastName}</h4>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold mt-0.5">{doc.role}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs border-y border-slate-700/5 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Specialization:</span>
                  <span className="font-bold">{doc.specialization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Experience:</span>
                  <span className="font-bold">{doc.experience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Languages:</span>
                  <span className="font-bold">{doc.languages?.join(', ')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={() => onNavigateTab('appointment')}
                  className="w-full py-2.5 rounded-xl text-[10px] font-bold tracking-wide bg-blue-500 hover:bg-blue-600 text-white cursor-pointer transition-colors text-center"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Departments ─── */}
      <section className="space-y-12 bg-slate-500/5 p-8 sm:p-12 rounded-3xl border border-slate-700/5">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Our Departments</h2>
          <p className="text-sm text-slate-500">Comprehensive medical care across primary and specialty practices.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departmentsList.map((dept, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-700/10 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${dept.color}`}>
                <dept.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm">{dept.name}</h4>
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">{dept.count}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{dept.desc}</p>
                <button 
                  onClick={() => onNavigateTab('services')}
                  className="text-[10px] font-bold text-blue-500 flex items-center gap-0.5 hover:underline pt-1 cursor-pointer"
                >
                  Learn More <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Clinical Services Preview ─── */}
      <section className="space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Popular Clinical Services</h2>
          <p className="text-sm text-slate-500">Direct booking for our most frequently requested clinical checkups and diagnostic tests.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.slice(0, 4).map((service) => (
            <div key={service._id} className="p-5 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 flex flex-col justify-between h-full space-y-4 hover:shadow-md transition-all duration-300">
              <div className="space-y-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/5 text-blue-500 flex items-center justify-center">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{service.category}</span>
                  <h4 className="text-sm font-extrabold mt-1">{service.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{service.description}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Price</span>
                  <span className="text-sm font-black text-blue-500">{service.price} ETB</span>
                </div>
                <button
                  onClick={() => onNavigateTab('appointment')}
                  className="px-4 py-2 rounded-xl text-[10px] font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white cursor-pointer transition-colors"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <button 
            onClick={() => onNavigateTab('services')}
            className="px-6 h-11 rounded-xl text-xs font-bold border border-slate-700/10 text-slate-700 dark:text-slate-200 hover:bg-slate-500/5 cursor-pointer transition-all inline-flex items-center gap-1.5"
          >
            View All Services
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ─── Health Packages Preview ─── */}
      <section className="space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Our Tailored Health Packages</h2>
          <p className="text-sm text-slate-500">Regular checkups and diagnostic monitoring bundles designed for your family.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.slice(0, 3).map((pkg) => (
            <div 
              key={pkg._id} 
              className={`p-6 rounded-3xl border flex flex-col justify-between h-full space-y-6 relative transition-all ${
                pkg.featured 
                  ? 'bg-gradient-to-b from-blue-500/5 to-indigo-500/5 border-blue-500 shadow-md scale-[1.02]'
                  : 'bg-white dark:bg-slate-900/40 border-slate-700/10 hover:shadow-md'
              }`}
            >
              {pkg.featured && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-blue-500 text-white uppercase tracking-widest shadow-sm">
                  Recommended
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-extrabold">{pkg.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>
                </div>

                <div className="space-y-2 text-xs border-y border-slate-700/5 py-4">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">Validity Period:</span>
                    <span>{pkg.validity_days} Days</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">Visits Included:</span>
                    <span>{pkg.total_visits} Visits</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-700/5">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Price</span>
                  <span className="text-base font-black text-blue-500">{pkg.price} ETB</span>
                </div>
                <button
                  onClick={() => onNavigateTab('appointment')}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                    pkg.featured 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                  }`}
                >
                  Book Package
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Patient Journey Timeline ─── */}
      <section className="space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Your Patient Journey</h2>
          <p className="text-sm text-slate-500">How your consultation, clinical care, and laboratory results sync seamlessly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {[
            { step: '1', title: 'Book Appointment', desc: 'Select a clinical doctor, preferred slot, and request visit online.' },
            { step: '2', title: 'Meet Doctor', desc: 'Visit our Bole Sub-City clinic and receive standard clinical checkup.' },
            { step: '3', title: 'Lab / Radiology', desc: 'Get same-day diagnostic tests under one unified medical system.' },
            { step: '4', title: 'Treatment Plan', desc: 'Receive certified medical advice and medications at our pharmacy.' },
            { step: '5', title: 'Digital Results', desc: 'Check verified lab test results immediately on Telegram and patient portal.' }
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl border border-slate-700/10 bg-white dark:bg-slate-900/40 relative space-y-3">
              <div className="h-9 w-9 rounded-full bg-blue-500/10 text-blue-500 font-extrabold text-sm flex items-center justify-center">
                {item.step}
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider">{item.title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials Section ─── */}
      <section className="py-12 bg-slate-500/5 rounded-3xl border border-slate-700/5 text-center overflow-hidden relative">
        <div className="max-w-xl mx-auto px-6 space-y-4">
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
            ))}
          </div>

          <p className="text-xs sm:text-sm italic text-slate-600 dark:text-slate-300 leading-relaxed">
            {testimonialIndex === 0 
              ? '"New Life Clinic has completely transformed my healthcare experience. The smart portal allowed me to register and generate my card in seconds, and the doctors are incredibly thorough."'
              : testimonialIndex === 1 
              ? '"As a mother, convenience is everything. Booking self-appointments for my kids is simple, and the pediatric department is outstanding. Highly recommended!"'
              : '"I am thoroughly impressed by the integration of clinical services, lab diagnostics, and patient portal workflows. It is a highly professional system that respects patient time."'}
          </p>

          <div>
            <span className="font-extrabold text-xs block text-slate-800 dark:text-slate-100">
              {testimonialIndex === 0 ? 'Samuel Kebede' : testimonialIndex === 1 ? 'Helen Tekle' : 'Dr. Nataniel Girma'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 block uppercase mt-0.5">Verified Patient</span>
          </div>

          <div className="flex justify-center gap-1.5 pt-2">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => setTestimonialIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  testimonialIndex === idx ? 'w-4 bg-blue-500' : 'w-1.5 bg-slate-700/20'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Accordion FAQ ─── */}
      <section className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-500 mt-1">Got questions? We have answers to help you navigate our clinical services.</p>
        </div>

        <div className="space-y-3">
          {[
            { q: 'How do I register as a new patient?', a: 'Click on the "Self-Appointment" tab and choose "No, I am a new patient" to register. You can also visit the "Get Patient Card" tab to instantly generate your official clinical ID card.' },
            { q: 'What is the benefit of the Patient Card?', a: 'The Patient Card contains your unique Patient ID and QR code. Depending on your chosen card tier (Basic, Premium, VIP, Family), it grants you direct service discounts of up to 25%, free clinical consultations, and priority appointment booking.' },
            { q: 'How do I check in for my self-appointment?', a: 'When you arrive at the clinic, present your digital or printed Patient Card (with barcode/QR code) at the reception desk, or scan it at our check-in kiosk for immediate queue integration.' },
            { q: 'Can I choose my specific physician or specialist?', a: 'Yes, in Step 3 of the Self-Appointment wizard, you can select your preferred practitioner or specialist depending on the selected medical department.' },
            { q: 'Are clinical laboratory results accessible online?', a: 'Yes, clinic staff record laboratory results securely. Patients can verify their credentials or scan their QR code on the patient portal to view their active clinical records instantly.' }
          ].map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-2xl border border-slate-700/10 bg-white dark:bg-slate-900/40 overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-xs font-bold text-left cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="p-4 pt-0 text-[11px] text-slate-500 leading-relaxed border-t border-slate-700/5">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Contact & Form Section ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Contact Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Contact New Life</h2>
            <p className="text-sm text-slate-500">Reach out to our clinical reception desks or working staff.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px]">Location</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px]">Phone / Emergency</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">+251 925 959 219 (or +251 11 661 2345)</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px]">Email Address</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">newlifemediumclinic@gmail.com</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px]">Working Hours</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">Mon - Fri: 8:00 AM - 8:00 PM</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">Sat: 8:00 AM - 5:00 PM | Sun: 9:00 AM - 2:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl border bg-white dark:bg-slate-900/40 border-slate-700/10 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold tracking-tight">Quick Inquiry Form</h3>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-10 px-3 text-xs rounded-xl outline-none border border-slate-700/10 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full h-10 px-3 text-xs rounded-xl outline-none border border-slate-700/10 bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Message</label>
              <textarea
                value={contactMessage}
                rows={4}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can our clinical team help you?"
                className="w-full p-3 text-xs rounded-xl outline-none border border-slate-700/10 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingContact}
              className="w-full h-11 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmittingContact ? 'Sending Inquiry...' : 'Submit Inquiry'}
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

    </div>
  );
};
