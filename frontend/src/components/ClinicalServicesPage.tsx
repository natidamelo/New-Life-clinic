import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Stethoscope, Activity, FileText, Heart, Award, Clipboard, 
  AlertCircle, Pill, Clock, ArrowRight, Check, ChevronRight, Mic, 
  MapPin, Phone, Mail, Sparkles, Star, Calendar, User, ShieldCheck, ChevronDown, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Service {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  duration?: string;
  preparation?: string;
  rating?: number;
  availableToday?: boolean;
  department?: string;
  insuranceAccepted?: boolean;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  specialization: string;
}

interface ClinicalServicesPageProps {
  services: Service[];
  isLoading: boolean;
  doctors: Doctor[];
  isDarkMode: boolean;
  onBookService: (service: Service, bookingDetails?: { doctorId: string; date: string; timeSlot: string }) => void;
}

export const CATEGORY_META = {
  All: { label: 'All Services', icon: Activity, gradient: 'from-blue-500 to-indigo-600', description: 'Complete catalog of clinical consultations, diagnostics, imaging, and treatments.' },
  consultation: { label: 'Consultation', icon: Stethoscope, gradient: 'from-emerald-500 to-teal-600', description: 'Comprehensive clinical evaluations with senior medical specialists and doctors.' },
  lab: { label: 'Laboratory', icon: Activity, gradient: 'from-blue-500 to-cyan-600', description: 'Certified blood tests, chemical panels, urinalysis, and microscopic evaluations.' },
  imaging: { label: 'Imaging', icon: FileText, gradient: 'from-indigo-500 to-blue-600', description: 'Diagnostic ultrasound scanning, prenatal sonography, pelvic & abdominal scans.' },
  ultrasound: { label: 'Ultrasound', icon: Heart, gradient: 'from-purple-500 to-indigo-600', description: 'High-resolution abdominal, pelvic, obstetric, and Doppler sonography.' },
  vaccination: { label: 'Vaccination', icon: Award, gradient: 'from-teal-500 to-emerald-600', description: 'Childhood immunizations, travel vaccines, and preventive booster shots.' },
  procedure: { label: 'Procedures', icon: Clipboard, gradient: 'from-cyan-500 to-blue-600', description: 'Minor surgical procedures, wound care, suturing, and clinical treatments.' },
  injection: { label: 'Injections', icon: Pill, gradient: 'from-amber-500 to-orange-600', description: 'Intramuscular (IM), intravenous (IV), subcutaneous injections, and contraceptive implants.' },
  emergency: { label: 'Emergency', icon: AlertCircle, gradient: 'from-rose-500 to-amber-600', description: 'Urgent medical care, acute stabilization, and vital signs monitoring.' },
  pharmacy: { label: 'Pharmacy', icon: Pill, gradient: 'from-green-500 to-emerald-600', description: 'Dispensing prescribed pharmaceuticals, oral medications, and therapeutic supplies.' }
};

export const normalizeCategory = (category: string = ''): string => {
  const cat = category.toLowerCase().trim();
  if (!cat) return 'consultation';
  if (cat.includes('lab') || cat.includes('blood') || cat.includes('stool') || cat.includes('urine') || cat.includes('test') || cat.includes('panel')) return 'lab';
  if (cat.includes('ultrasound') || cat.includes('sonograph')) return 'ultrasound';
  if (cat.includes('imaging') || cat.includes('x-ray') || cat.includes('xray') || cat.includes('radiolog') || cat.includes('scan')) return 'imaging';
  if (cat.includes('vaccin') || cat.includes('immuniz')) return 'vaccination';
  if (cat.includes('inject') || cat.includes('implanon') || cat.includes('depo')) return 'injection';
  if (cat.includes('procedure') || cat.includes('wound') || cat.includes('suture') || cat.includes('dressing') || cat.includes('nursing')) return 'procedure';
  if (cat.includes('emergency') || cat.includes('urgent') || cat.includes('trauma')) return 'emergency';
  if (cat.includes('pharma') || cat.includes('drug') || cat.includes('medicat')) return 'pharmacy';
  if (cat.includes('consult') || cat.includes('doctor') || cat.includes('specialist') || cat.includes('general')) return 'consultation';
  return cat;
};

export const isCategoryMatch = (serviceCat: string, selected: string) => {
  if (selected === 'All') return true;
  const norm = normalizeCategory(serviceCat);
  const selNorm = selected.toLowerCase();
  if (norm === selNorm) return true;
  // If user selected procedure, also allow injection services
  if (selNorm === 'procedure' && norm === 'injection') return true;
  return false;
};

const FEATURED_SERVICES_MOCK = [
  { id: '1', name: 'General Consultation', category: 'consultation', price: 300, duration: '20 mins', description: 'Comprehensive clinical evaluation with senior medical specialists.', availableToday: true },
  { id: '2', name: 'Complete Blood Count (CBC)', category: 'lab', price: 300, duration: '15 mins', description: 'Full laboratory hematological analysis detailing immune, oxygen and platelet metrics.', availableToday: true },
  { id: '3', name: 'Abdominal Ultrasound', category: 'imaging', price: 400, duration: '30 mins', description: 'High-resolution obstetric/pelvic scanning using state-of-the-art ultrasound imaging.', availableToday: true },
  { id: '4', name: 'ECG (Electrocardiogram)', category: 'procedure', price: 600, duration: '15 mins', description: 'Routine checking of blood pressure levels and cardiodynamics with detailed printout report.', availableToday: true }
];

const TESTIMONIALS = [
  { id: 1, name: 'Tadesse Kassa', rating: 5, review: 'I am thoroughly impressed by the integration of clinical services, lab diagnostics, and patient portal workflows. It is a highly professional system.' },
  { id: 2, name: 'Almaz Abraham', rating: 5, review: 'Fantastic patient experience. I booked an abdominal ultrasound through my phone, got immediate appointment confirmation, and my digital results were on Telegram.' },
  { id: 3, name: 'Gedion Tesfaye', rating: 5, review: 'Super clean clinic, professional medical staff, and transparent pricing. Highly recommend New Life Clinic to everyone in Addis.' }
];

const FAQS = [
  { q: 'How do I book a clinical service?', a: 'You can easily request any service or test online by clicking the "Book Now" button. You can choose a practitioner, select an available time slot, and finalize details instantly.' },
  { q: 'Do I need fasting before laboratory tests?', a: 'Some chemical panels (like Fasting Blood Sugar, Lipid Profiles) require 8-12 hours of fasting. Standard tests like CBC or pregnancy tests do not require fasting.' },
  { q: 'Can I cancel or reschedule my appointment?', a: 'Yes. You can cancel or reschedule up to 2 hours before your scheduled time slot directly from your patient portal or by contacting clinic support.' },
  { q: 'Do you accept private health insurance?', a: 'Yes, we accept major local corporate and private health insurance packages. Please verify your provider during booking or at the front desk.' },
  { q: 'When will I receive my diagnostic results?', a: 'Standard laboratory results are verified and sent to your portal within 1-2 hours. Complex cultures or pathology report updates may take up to 24-48 hours.' }
];

export const ClinicalServicesPage: React.FC<ClinicalServicesPageProps> = ({ 
  services, 
  isLoading, 
  doctors, 
  isDarkMode, 
  onBookService 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Advanced filters state
  const [priceRange, setPriceRange] = useState<number>(3000);
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);
  const [onlyInsurance, setOnlyInsurance] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'priceAsc' | 'priceDesc'>('name');

  // Search experiences states
  const [recentSearches, setRecentSearches] = useState<string[]>(['CBC Test', 'Consultation', 'Ultrasound']);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Booking Modal State
  const [selectedBookingService, setSelectedBookingService] = useState<Service | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>('');
  const [isSuccessBooking, setIsSuccessBooking] = useState(false);

  // FAQ Accordion index
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Testimonial Carousel Index
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Auto-slide testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Enrich services with realistic metadata (ratings, preparation, duration, etc.)
  const enrichedServices = useMemo(() => {
    return services.map((service, index) => {
      const norm = normalizeCategory(service.category);
      const duration = norm === 'lab' ? '15 mins' : (norm === 'imaging' || norm === 'ultrasound') ? '30 mins' : '20 mins';
      const rating = Number((4.6 + (index % 4) * 0.1).toFixed(1));
      const availableToday = index % 3 !== 0;
      const insuranceAccepted = index % 4 !== 0;
      const preparation = norm === 'lab' && service.name.toLowerCase().includes('glucose') 
        ? 'Fasting required (8-12 hrs)' 
        : (norm === 'imaging' || norm === 'ultrasound') && (service.name.toLowerCase().includes('pelvic') || service.name.toLowerCase().includes('obstetric'))
        ? 'Full bladder recommended'
        : 'No specific preparation required';
      
      const department = norm === 'lab' ? 'Laboratory' 
        : (norm === 'imaging' || norm === 'ultrasound') ? 'Imaging & Radiology' 
        : (norm === 'procedure' || norm === 'injection') ? 'Procedures & Nursing'
        : norm === 'emergency' ? 'Emergency Care'
        : norm === 'pharmacy' ? 'In-House Pharmacy'
        : 'General Practice & Consultation';

      return {
        ...service,
        duration,
        rating,
        availableToday,
        insuranceAccepted,
        preparation,
        department
      };
    });
  }, [services]);

  // Remove duplicates by name
  const uniqueServices = useMemo(() => {
    const seen = new Set();
    return enrichedServices.filter(el => {
      const duplicate = seen.has(el.name.toLowerCase());
      seen.add(el.name.toLowerCase());
      return !duplicate;
    });
  }, [enrichedServices]);

  // Dynamic service counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: uniqueServices.length };
    uniqueServices.forEach(s => {
      const normalized = normalizeCategory(s.category);
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return counts;
  }, [uniqueServices]);

  // Dynamic Featured Services based strictly on selectedCategory
  const featuredServices = useMemo(() => {
    if (uniqueServices.length === 0) {
      return FEATURED_SERVICES_MOCK.map(m => ({
        _id: m.id,
        name: m.name,
        category: m.category,
        price: m.price,
        description: m.description,
        duration: m.duration,
        availableToday: m.availableToday,
        rating: 4.8,
        insuranceAccepted: true,
        preparation: 'No specific preparation required',
        department: m.category === 'lab' ? 'Laboratory' : m.category === 'imaging' ? 'Imaging & Radiology' : 'General Practice'
      }));
    }

    if (selectedCategory === 'All') {
      // Pick top representative services across key clinic categories
      const targetCats = ['consultation', 'lab', 'imaging', 'procedure'];
      const picked: typeof uniqueServices = [];
      
      targetCats.forEach(cat => {
        const match = uniqueServices.find(s => normalizeCategory(s.category) === cat && !picked.some(p => p._id === s._id));
        if (match) picked.push(match);
      });

      // Fill up to 4 if needed
      if (picked.length < 4) {
        uniqueServices.forEach(s => {
          if (picked.length < 4 && !picked.some(p => p._id === s._id)) {
            picked.push(s);
          }
        });
      }
      return picked;
    } else {
      // Category is selected (e.g. 'imaging')!
      // Strictly ONLY show services that match selectedCategory!
      const catServices = uniqueServices.filter(s => isCategoryMatch(s.category, selectedCategory));
      
      // Prioritize available today and higher ratings
      const sorted = [...catServices].sort((a, b) => {
        if (a.availableToday && !b.availableToday) return -1;
        if (!a.availableToday && b.availableToday) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });

      return sorted.slice(0, 4);
    }
  }, [uniqueServices, selectedCategory]);

  // Filter and Search logic
  const filteredServices = useMemo(() => {
    return uniqueServices.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            service.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = isCategoryMatch(service.category, selectedCategory);
      const matchesPrice = service.price <= priceRange;
      const matchesToday = !onlyAvailableToday || service.availableToday;
      const matchesInsurance = !onlyInsurance || service.insuranceAccepted;

      return matchesSearch && matchesCategory && matchesPrice && matchesToday && matchesInsurance;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'priceDesc') return b.price - a.price;
      return 0;
    });
  }, [uniqueServices, searchQuery, selectedCategory, priceRange, onlyAvailableToday, onlyInsurance, sortBy]);

  const handleSelectCategory = (catKey: string, shouldScroll = false) => {
    setSelectedCategory(catKey);
    if (shouldScroll) {
      setTimeout(() => {
        const el = document.getElementById('services-grid');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleSearchSelect = (term: string) => {
    setSearchQuery(term);
    setIsSearchFocused(false);
  };

  const handleVoiceSearch = () => {
    toast.error('Voice search is only supported in secure HTTPS environments. Type to search.', {
      position: 'top-center'
    });
  };

  const triggerBookingFlow = (service: Service) => {
    setSelectedBookingService(service);
    // Intelligently pre-select doctor matching specialization
    const sCat = normalizeCategory(service.category);
    const matchingDoc = doctors.find(d => {
      const dRole = (d.role || '').toLowerCase();
      const dSpec = (d.specialization || '').toLowerCase();
      if (sCat === 'imaging' || sCat === 'ultrasound') return dRole.includes('imaging') || dSpec.includes('ultrasound') || dSpec.includes('radiolog');
      if (sCat === 'lab') return dRole.includes('lab') || dSpec.includes('lab');
      if (sCat === 'procedure' || sCat === 'injection') return dRole.includes('nurse') || dSpec.includes('nursing');
      return dRole.includes('doctor') || dSpec.includes('general');
    });

    setBookingDoctor(matchingDoc?.id || doctors[0]?.id || '');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTimeSlot('10:00 AM');
    setIsSuccessBooking(false);
  };

  const submitBookingModal = () => {
    if (!selectedBookingService) return;
    setIsSuccessBooking(true);
    setTimeout(() => {
      onBookService(selectedBookingService, {
        doctorId: bookingDoctor,
        date: bookingDate,
        timeSlot: bookingTimeSlot
      });
      setSelectedBookingService(null);
    }, 1200);
  };

  // Highlights search query text in items
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 dark:bg-yellow-500/30 text-yellow-950 dark:text-yellow-100 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className={`space-y-16 py-4 transition-colors duration-300`}>
      
      {/* ─── Hero Section ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
        <div className="lg:col-span-7 space-y-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500">
            <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
            Redesigned EMR clinical experience
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Clinical <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-500">Services</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 max-w-xl leading-relaxed">
            Comprehensive healthcare services delivered by experienced specialists using modern medical technology. Book clinical procedures, lab requests, or consultation cycles instantly.
          </p>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => {
                const el = document.getElementById('services-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 h-12 rounded-xl text-xs font-bold tracking-wide bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Explore Services
            </button>
          </div>

          {/* Search bar & suggestions container */}
          <div className="relative max-w-lg">
            <div className={`flex items-center h-12 px-4 rounded-2xl border transition-all ${
              isSearchFocused 
                ? 'ring-2 ring-blue-500/20 border-blue-500 bg-white dark:bg-slate-900 shadow-md' 
                : 'border-slate-700/10 bg-slate-100/60 dark:bg-slate-900/60'
            }`}>
              <Search className="h-4.5 w-4.5 text-slate-400 shrink-0 mr-3" />
              <input
                type="text"
                placeholder="Search doctors, services, laboratory tests..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100"
              />
              <button 
                onClick={handleVoiceSearch}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                title="Voice Search"
              >
                <Mic className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Live Search Suggestions Dropdown */}
            <AnimatePresence>
              {isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-14 left-0 right-0 p-4 rounded-2xl border bg-white dark:bg-slate-950 border-slate-700/10 dark:border-slate-800 shadow-xl z-50 space-y-3"
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Recent Searches</span>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => handleSearchSelect(term)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-700/10 hover:border-blue-500/30 hover:bg-blue-500/5 text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Popular Services</span>
                    <div className="divide-y divide-slate-700/10">
                      {FEATURED_SERVICES_MOCK.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleSearchSelect(s.name)}
                          className="w-full text-left py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-blue-500 flex items-center justify-between cursor-pointer"
                        >
                          <span>{s.name}</span>
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side Illustration or visual group */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
            {/* Animated Background shapes */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-teal-500/10 rounded-full blur-3xl animate-pulse" />
            
            {/* Centered medical shield illustration */}
            <div className="absolute inset-4 rounded-full border border-blue-500/10 flex items-center justify-center">
              <div className="h-48 w-48 rounded-full border border-teal-500/10 flex items-center justify-center">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl flex items-center justify-center text-white">
                  <Stethoscope className="h-12 w-12 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Floating medical badges */}
            <div className="absolute top-4 left-4 p-3 rounded-2xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg border-slate-700/10 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-bold">Lab Certified</span>
            </div>

            <div className="absolute bottom-10 right-4 p-3 rounded-2xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg border-slate-700/10 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-bold">100% Secure EMR</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Animated Statistics ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Clinical Services', val: 250 },
          { label: 'Medical Doctors', val: 30 },
          { label: 'Patients Cared', val: 15000, suffix: '+' },
          { label: 'Satisfaction', val: 98, suffix: '%' }
        ].map((stat, i) => (
          <div key={i} className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 text-center shadow-sm`}>
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-500 block">
              {stat.val.toLocaleString()}{stat.suffix || ''}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-1">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* ─── Service Categories ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">Medical Categories</h3>
            {selectedCategory !== 'All' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                1 active filter
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-400">Horizontal scroll for more</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const count = categoryCounts[key.toLowerCase()] || 0;
            if (key !== 'All' && count === 0) return null; // Skip empty categories
            
            const isSelected = selectedCategory === key;
            const Icon = meta.icon;
            
            return (
              <button
                key={key}
                onClick={() => handleSelectCategory(key, false)}
                className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left shrink-0 min-w-[220px] cursor-pointer transition-all duration-200 relative ${
                  isSelected 
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/25 scale-[1.02] ring-2 ring-blue-400/50'
                    : 'bg-white dark:bg-slate-900/60 border-slate-700/10 text-slate-700 dark:text-slate-300 hover:border-blue-500/30 hover:bg-blue-500/5'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${
                  isSelected ? 'bg-white/15 text-white' : 'bg-blue-500/5 text-blue-500'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs block truncate">{meta.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                  </div>
                  <span className={`text-[10px] font-semibold block mt-0.5 ${
                    isSelected ? 'text-white/80' : 'text-slate-400'
                  }`}>
                    {count} {count === 1 ? 'service' : 'services'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Selected Category Spotlight Banner ─── */}
      {selectedCategory !== 'All' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-teal-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              {(() => {
                const Icon = CATEGORY_META[selectedCategory.toLowerCase() as keyof typeof CATEGORY_META]?.icon || Activity;
                return <Icon className="h-5 w-5" />;
              })()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {CATEGORY_META[selectedCategory.toLowerCase() as keyof typeof CATEGORY_META]?.label || selectedCategory} Services
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500 text-white">
                  {filteredServices.length} {filteredServices.length === 1 ? 'Available' : 'Available'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                {CATEGORY_META[selectedCategory.toLowerCase() as keyof typeof CATEGORY_META]?.description || 'Filtered clinical department tests and medical procedures.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => handleSelectCategory('All', false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-500/30 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>✕ Show All Services</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── Featured Services (Category-Filtered & Dynamic) ─── */}
      {featuredServices.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {selectedCategory === 'All' 
                  ? 'Featured Procedures & Tests' 
                  : `Featured ${CATEGORY_META[selectedCategory.toLowerCase() as keyof typeof CATEGORY_META]?.label || selectedCategory} Services`}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {selectedCategory === 'All' 
                  ? 'High-demand clinic services available for booking today across departments' 
                  : `High-demand ${CATEGORY_META[selectedCategory.toLowerCase() as keyof typeof CATEGORY_META]?.label || selectedCategory} clinical tests and scans available for booking today`}
              </p>
            </div>
            {selectedCategory !== 'All' && (
              <span className="text-xs font-semibold text-blue-500 hidden sm:inline-block">
                Showing top {featuredServices.length} in category
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredServices.map((item) => {
              const normCat = normalizeCategory(item.category);
              const meta = CATEGORY_META[normCat as keyof typeof CATEGORY_META] || CATEGORY_META.All;
              const Icon = meta.icon;

              return (
                <div key={item._id} className="p-5 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 flex flex-col justify-between h-full space-y-4 hover:shadow-xl hover:border-blue-500/30 transition-all group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/5 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      {item.availableToday && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                          Available Today
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        {meta.label}
                      </h3>
                      <h4 className="text-sm font-extrabold mt-1 text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-slate-700/10">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Price</span>
                      <span className="text-sm font-black text-blue-500">{item.price} ETB</span>
                    </div>
                    <button
                      onClick={() => triggerBookingFlow(item)}
                      className="px-4 py-2 rounded-xl text-[10px] font-bold tracking-wide bg-slate-900 hover:bg-blue-600 text-white dark:bg-slate-800 dark:hover:bg-blue-600 cursor-pointer transition-colors shadow-sm"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Main Services Grid ─── */}
      <section id="services-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Filter Sidebar */}
        <aside className="lg:col-span-3 p-5 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/10">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Filter Options</h3>
            {(priceRange < 3000 || onlyAvailableToday || onlyInsurance || searchQuery || selectedCategory !== 'All') && (
              <button 
                onClick={() => {
                  setPriceRange(3000);
                  setOnlyAvailableToday(false);
                  setOnlyInsurance(false);
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl outline-none border border-slate-700/10 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:border-blue-500"
            >
              <option value="All">All Categories ({uniqueServices.length})</option>
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                if (key === 'All') return null;
                const count = categoryCounts[key.toLowerCase()] || 0;
                if (count === 0) return null;
                return (
                  <option key={key} value={key}>
                    {meta.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sort Services</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-9 px-3 text-xs rounded-xl outline-none border border-slate-700/10 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:border-blue-500"
            >
              <option value="name">Service Name (A-Z)</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Max Price</span>
              <span className="text-blue-500">{priceRange} ETB</span>
            </div>
            <input
              type="range"
              min={10}
              max={3000}
              step={50}
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Switch filters */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={onlyAvailableToday}
                onChange={(e) => setOnlyAvailableToday(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700/15 text-blue-500 focus:ring-blue-500/20"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                Available Today
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={onlyInsurance}
                onChange={(e) => setOnlyInsurance(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700/15 text-blue-500 focus:ring-blue-500/20"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                Insurance Accepted
              </span>
            </label>
          </div>
        </aside>

        {/* Services Results List */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-700/10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Showing <b className="text-slate-800 dark:text-slate-100">{filteredServices.length}</b> clinical services</span>
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {CATEGORY_META[selectedCategory.toLowerCase() as keyof typeof CATEGORY_META]?.label || selectedCategory}
                  <button 
                    onClick={() => handleSelectCategory('All', false)}
                    className="ml-1 hover:text-red-500 cursor-pointer font-black"
                    title="Clear category filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            
            {/* Quick Filter Tag Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setOnlyAvailableToday(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                  onlyAvailableToday 
                    ? 'bg-emerald-500 text-white border-transparent' 
                    : 'border-slate-700/10 hover:border-emerald-500/40 text-slate-500'
                }`}
              >
                {onlyAvailableToday ? '✓ Available Today' : '+ Available Today'}
              </button>
              <button
                onClick={() => setOnlyInsurance(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                  onlyInsurance 
                    ? 'bg-blue-500 text-white border-transparent' 
                    : 'border-slate-700/10 hover:border-blue-500/40 text-slate-500'
                }`}
              >
                {onlyInsurance ? '✓ Insurance' : '+ Insurance'}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500" />
              <p className="text-xs text-slate-400 mt-4">Loading clinical catalog...</p>
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredServices.map(service => {
                const normCat = normalizeCategory(service.category);
                const meta = CATEGORY_META[normCat as keyof typeof CATEGORY_META] || CATEGORY_META.consultation;
                const Icon = meta.icon;

                return (
                  <div 
                    key={service._id} 
                    className="p-5 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 flex flex-col justify-between space-y-4 hover:translate-y-[-4px] hover:shadow-lg hover:border-blue-500/35 transition-all duration-300 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/5 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{service.department}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{service.rating}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                          {highlightText(service.name, searchQuery)}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{service.description}</p>
                      </div>

                      {/* Prep and details */}
                      <div className="bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl space-y-1.5 text-[10px] font-semibold text-slate-500 border border-slate-700/5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Duration:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{service.duration}</span>
                        </div>
                        {service.preparation && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Preparation:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{service.preparation}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Insurance Accepted:</span>
                          <span className={service.insuranceAccepted ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                            {service.insuranceAccepted ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-700/10">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Fee</span>
                        <span className="text-sm font-black text-blue-500">{service.price} ETB</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => triggerBookingFlow(service)}
                          className="px-4 py-2 rounded-xl text-[10px] font-bold tracking-wide bg-blue-500 hover:bg-blue-600 text-white cursor-pointer transition-colors shadow-sm"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-6 border border-dashed rounded-3xl border-slate-700/20 bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Search className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Services Found</h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                No clinical services matched your current filters
                {selectedCategory !== 'All' ? ` in ${CATEGORY_META[selectedCategory.toLowerCase() as keyof typeof CATEGORY_META]?.label || selectedCategory}` : ''}.
              </p>
              <button
                onClick={() => {
                  setPriceRange(3000);
                  setOnlyAvailableToday(false);
                  setOnlyInsurance(false);
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Why Choose Our Care</h2>
          <p className="text-xs text-slate-500 leading-relaxed">Dedicated to raising the clinical standard through digitised patient workflows, real-time results, and trusted clinical guidance.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { title: 'Experienced Doctors', desc: 'Board-certified medical specialists.', icon: User },
            { title: 'Certified Laboratory', desc: 'Standardized and fully accredited tests.', icon: Activity },
            { title: 'Digital Reports', desc: 'All diagnostic findings delivered on Telegram.', icon: FileText },
            { title: 'Modern Equipment', desc: 'State-of-the-art radiology & imaging.', icon: Heart }
          ].map((item, i) => (
            <div key={i} className="p-5 rounded-2xl border bg-white dark:bg-slate-900/40 border-slate-700/10 text-center space-y-2.5">
              <div className="h-10 w-10 mx-auto rounded-full bg-blue-500/5 text-blue-500 flex items-center justify-center">
                <item.icon className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold">{item.title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials Carousel ─── */}
      <section className="py-10 bg-slate-500/5 rounded-3xl border border-slate-700/5 overflow-hidden relative">
        <div className="max-w-xl mx-auto px-6 text-center space-y-4">
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
            ))}
          </div>

          <p className="text-xs sm:text-sm italic text-slate-600 dark:text-slate-300 leading-relaxed">
            "{TESTIMONIALS[testimonialIndex].review}"
          </p>

          <div>
            <span className="font-extrabold text-xs block text-slate-800 dark:text-slate-100">
              {TESTIMONIALS[testimonialIndex].name}
            </span>
            <span className="text-[10px] font-bold text-slate-400 block uppercase mt-0.5">Patient Review</span>
          </div>

          {/* Indicator dots */}
          <div className="flex justify-center gap-1.5 pt-2">
            {TESTIMONIALS.map((t, idx) => (
              <button
                key={t.id}
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
          <h2 className="text-xl sm:text-2xl font-extrabold">FAQ & Patient Guide</h2>
          <p className="text-xs text-slate-500 mt-1">Frequently asked questions about our services</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div 
                key={idx} 
                className="rounded-2xl border border-slate-700/10 bg-white dark:bg-slate-900/40 overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
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

      {/* ─── CTA Banner ─── */}
      <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-center space-y-6 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
        <div className="space-y-3 max-w-xl mx-auto z-10 relative">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Ready to Receive Quality Healthcare?</h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Our medical staff and clinical practitioners are ready to serve you. Book your next visit or contact our front desk for custom queries.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 z-10 relative">
          <button 
            onClick={() => {
              const el = document.getElementById('services-grid');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 h-11 rounded-xl text-xs font-bold bg-white text-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            Explore Services Grid
          </button>
        </div>
      </section>

      {/* ─── Booking experience Modal ─── */}
      <AnimatePresence>
        {selectedBookingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBookingService(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md p-6 rounded-3xl border bg-white dark:bg-slate-900 border-slate-700/10 dark:border-slate-800 shadow-2xl space-y-5 overflow-hidden z-10"
            >
              {isSuccessBooking ? (
                <div className="py-10 text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                    <CheckCircle className="h-10 w-10 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Booking Pre-Configured!</h3>
                    <p className="text-xs text-slate-500 mt-1">Redirecting you to complete appointment details...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pb-3 border-b border-slate-700/10">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Clinical Booking Flow</span>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedBookingService.name}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Doctor selection */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Doctor</label>
                      <select
                        value={bookingDoctor}
                        onChange={(e) => setBookingDoctor(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl outline-none border border-slate-700/10 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                      >
                        {doctors.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.firstName} {doc.lastName} ({doc.specialization})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date select */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preferred Date</label>
                      <input
                        type="date"
                        value={bookingDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl outline-none border border-slate-700/10 bg-slate-50 dark:bg-slate-955 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    {/* Time slot select */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Time Slots</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['9:00 AM', '10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '4:30 PM'].map((slot) => {
                          const isSelected = bookingTimeSlot === slot;
                          return (
                            <button
                              type="button"
                              key={slot}
                              onClick={() => setBookingTimeSlot(slot)}
                              className={`py-2 text-[10px] font-bold rounded-xl border text-center cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-500 text-white border-transparent'
                                  : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border-slate-700/10 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Wait indicator */}
                    <div className="bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10 flex items-center gap-2.5">
                      <Clock className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide block">Estimated Clinic Wait</span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block -mt-0.5">Less than 15 minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/10 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBookingService(null)}
                      className="w-1/2 py-2.5 rounded-xl text-xs font-bold border border-slate-700/10 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitBookingModal}
                      className="w-1/2 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white cursor-pointer shadow-md transition-colors"
                    >
                      Continue Booking
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
