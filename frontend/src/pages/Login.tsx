import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { Moon, Sun, Eye, EyeOff, Users, Activity, ShieldCheck, Clock } from 'lucide-react';
import { getClinicTenantId } from '../utils/authToken';
import api from '../services/apiService';
import { motion } from 'framer-motion';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
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

const leftContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const leftItemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

// Cold-start warm-up: max 5 minutes in 1-second ticks
const WARMUP_MAX_SECONDS = 300;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, testLogin, getRoleBasedRoute } = useAuth();
  const { clinic } = useClinic();
  const { isDarkMode, toggleTheme } = useSafeTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupSeconds, setWarmupSeconds] = useState(0);
  const warmupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
    // Network errors (server not reachable yet during cold start)
    if (typeof err?.message === 'string' && (
      err.message.includes('Network Error') ||
      err.message.includes('ERR_NETWORK') ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.toLowerCase().includes('not responding')
    )) return true;
    // 503 with database_unavailable means Atlas isn't connected yet
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
          // Server/DB cold-start: show warming banner and auto-retry every 8s
          if (!isWarmingUp) {
            startWarmup();
            toast.loading('Server is warming up… retrying automatically.', { duration: 6000 });
          }
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => formik.submitForm(), 8000);
        }
        // other errors (wrong password, etc.) handled by AuthContext
      } finally {
        setIsLoading(false);
      }
    },
  });  const inputStyle = {
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

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gradient-to-tr from-slate-50 via-slate-100 to-cyan-50/30 text-slate-800'}`}>
      {isDarkMode ? (
        <>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 12% 18%, rgba(59,130,246,0.32), transparent 40%), radial-gradient(circle at 85% 75%, rgba(14,165,233,0.18), transparent 45%), linear-gradient(140deg, #020617 0%, #050d1e 50%, #081126 100%)' }} />
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          
          {/* Floating ambient glow orbs */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            transition={{ duration: 1.8 }}
            className="bg-glow-orb bg-glow-orb-1" 
          />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            transition={{ duration: 1.8, delay: 0.3 }}
            className="bg-glow-orb bg-glow-orb-2" 
          />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            transition={{ duration: 1.8, delay: 0.6 }}
            className="bg-glow-orb bg-glow-orb-3" 
          />
        </>
      ) : (
        <>
          {/* --- Antigravity Ambient Background Elements --- */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl animate-float-slow pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/10 to-teal-200/20 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        </>
      )}

      {/* Floating Abstract Cross Shapes (Medical Theme) in both modes */}
      <div className={`absolute top-20 right-[15%] text-8xl font-thin select-none pointer-events-none animate-float-slow transition-colors duration-500 ${isDarkMode ? 'text-cyan-500/10' : 'text-slate-200/60'}`}>
        +
      </div>
      <div className={`absolute bottom-20 left-[15%] text-6xl font-thin select-none pointer-events-none animate-float-delayed transition-colors duration-500 ${isDarkMode ? 'text-indigo-500/10' : 'text-slate-300/40'}`}>
        +
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <img
          src={clinic?.logo || "/assets/images/logo.jpg"}
          alt=""
          aria-hidden="true"
          className="hidden lg:block absolute left-[6%] top-1/2 -translate-y-1/2 w-[520px] h-[520px] object-cover rounded-full opacity-[0.07] blur-[1px]"
        />
        <img
          src={clinic?.logo || "/assets/images/logo.jpg"}
          alt=""
          aria-hidden="true"
          className="absolute -right-20 -bottom-20 w-[280px] h-[280px] object-cover rounded-full opacity-[0.06] blur-[1px]"
        />
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-30 p-2.5 rounded-xl border transition-all duration-200 hover:scale-105"
        style={{ 
          background: isDarkMode ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)', 
          borderColor: isDarkMode ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.3)', 
          backdropFilter: 'blur(10px)',
          boxShadow: isDarkMode ? 'none' : '0 4px 12px rgba(15,23,42,0.03)'
        }}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-teal-600" />}
      </button>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.2fr_0.9fr]">
        <section className="hidden lg:flex flex-col justify-between px-14 py-12">
          <motion.div 
            variants={leftContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={leftItemVariants} className={`inline-flex items-center gap-3 rounded-2xl border ${isDarkMode ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' : 'border-teal-400/25 bg-teal-400/10 text-teal-700'} px-4 py-2`}>
              <span className={`inline-block h-2 w-2 rounded-full ${isDarkMode ? 'bg-cyan-300' : 'bg-teal-500'} animate-pulse`} />
              <span className="text-xs font-semibold tracking-[0.12em] uppercase">Clinical Operations Ready</span>
            </motion.div>

            <motion.div variants={leftItemVariants}>
              <p className={`${isDarkMode ? 'text-slate-300/80' : 'text-slate-500'} text-sm uppercase tracking-[0.2em] mb-4`}>
                <span className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{clinic?.name || "New Life Clinic"}</span> Platform
              </p>
              <h1 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black leading-[1.02] tracking-tight text-[clamp(2.9rem,4.5vw,4.6rem)]`}>
                Specialized access for
                <span className={`block text-transparent bg-clip-text bg-gradient-to-r ${isDarkMode ? 'from-cyan-300 via-blue-300 to-indigo-300' : 'from-teal-600 to-cyan-600'}`}>
                  every care team
                </span>
              </h1>
              <p className={`mt-6 ${isDarkMode ? 'text-slate-300/85' : 'text-slate-600'} max-w-[560px] text-[15px] leading-relaxed`}>
                A secure login experience for {clinic?.name || "New Life Clinic"}, designed for speed, clarity, and secure daily operations across your staff.
              </p>
            </motion.div>

            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-2 gap-5 max-w-[520px]"
            >
              {stats.map(({ value, label, icon: Icon }) => (
                <motion.div 
                  key={label}
                  variants={itemVariants}
                  className={`group relative rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${
                    isDarkMode 
                      ? 'border-white/5 bg-white/5 text-white hover:border-cyan-500/35 hover:bg-white/10 hover:shadow-[0_12px_30px_-10px_rgba(6,182,212,0.18)]' 
                      : 'border-slate-200/50 bg-white/60 text-slate-800 hover:border-teal-500/30 hover:bg-white/90 hover:shadow-[0_12px_30px_-10px_rgba(13,148,136,0.12)]'
                  } px-5 py-5`}
                >
                  {/* Subtle top highlighting line */}
                  <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r ${isDarkMode ? 'from-transparent via-cyan-400/30 to-transparent' : 'from-transparent via-teal-400/30 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`${isDarkMode ? 'text-cyan-200' : 'text-teal-600'} font-black text-3xl tracking-tight transition-transform duration-300 group-hover:scale-[1.03]`}>{value}</p>
                      <p className={`${isDarkMode ? 'text-slate-300/75' : 'text-slate-500'} text-xs mt-2 font-medium tracking-wide`}>{label}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-slate-800/40 border-white/10 text-cyan-300 group-hover:text-cyan-200 group-hover:bg-cyan-500/20 group-hover:border-cyan-400/30' 
                        : 'bg-slate-100/60 border-slate-200 text-teal-600 group-hover:text-teal-700 group-hover:bg-teal-50 group-hover:border-teal-300/50'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <div className={`text-xs ${isDarkMode ? 'text-slate-400/80' : 'text-slate-400'}`}>© {new Date().getFullYear()} New Life Clinic. Built for better outcomes.</div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="auth-login-card w-full max-w-[440px] rounded-3xl p-7 sm:p-9 space-y-7"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(170deg, rgba(8,15,33,0.94) 0%, rgba(11,24,48,0.94) 60%, rgba(7,16,34,0.94) 100%)' 
                : 'rgba(255,255,255,0.7)',
              border: isDarkMode 
                ? '1px solid rgba(148,163,184,0.28)' 
                : '1px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(16px)',
              boxShadow: isDarkMode 
                ? '0 30px 90px rgba(2,6,23,0.7)' 
                : '0 20px 50px rgba(15,23,42,0.06)',
              ['--shine-color' as any]: isDarkMode ? 'rgba(103, 232, 249, 0.12)' : 'rgba(13, 148, 136, 0.08)'
            }}
          >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/20 flex-shrink-0"
              style={{ background: isDarkMode ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'linear-gradient(135deg,#0d9488,#0ea5e9)' }}>
              <img src={clinic?.logo || "/assets/images/logo.jpg"} alt="logo" className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{clinic?.name || "New Life Clinic"}</p>
              <p className={`text-[10px] ${isDarkMode ? 'text-sky-400/60' : 'text-teal-600/70'}`}>{clinic?.tagline || "Healthcare Management"}</p>
            </div>
          </div>

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

            {/* Username field */}
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

            {/* Password field */}
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
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                  <span>⚠</span> {formik.errors.password}
                </p>
              )}
            </div>

            {/* Clinic code — remembered after first login; collapsible for returning users */}
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
                <p className="text-[10px] text-slate-400/80 leading-snug">
                  Your clinic <strong className={`${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>slug</strong> from Clinic Management. Leave blank if unsure.
                </p>
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

            {/* Cold-start warming banner */}
            {isWarmingUp && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ 
                  background: isDarkMode ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.05)', 
                  border: isDarkMode ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(251,191,36,0.3)' 
                }}
              >
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 flex-shrink-0" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs font-semibold animate-pulse" style={{ color: isDarkMode ? '#fcd34d' : '#d97706' }}>
                    Server is waking up — please wait ({warmupSeconds}s)
                  </p>
                </div>
                <p className="text-[10px] leading-snug" style={{ color: isDarkMode ? 'rgba(253,211,77,0.65)' : 'rgba(180,83,9,0.8)' }}>
                  The server was asleep to save resources. It will be ready in &lt;2 minutes.
                  Login will retry automatically.
                </p>
                {/* Progress bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(251,191,36,0.15)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min((warmupSeconds / WARMUP_MAX_SECONDS) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
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
              {/* Shimmer hover layer */}
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-200 rounded-xl" />
              {/* Animated shimmer sweep line */}
              <span className="btn-shimmer-sweep" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : isWarmingUp ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Waiting for server…
                  </>
                ) : (
                  <>
                    Sign in
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
            <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-455'} text-xs`}>secured by</span>
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
          </div>

          {/* Footer trust badges */}
          <div className="flex items-center justify-center gap-3">
            {['SSL Encrypted', 'HIPAA Ready', '99.9% Uptime'].map(badge => (
              <span key={badge} className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-455'} font-medium`}>{badge}</span>
            ))}
          </div>

          <p className="text-center text-xs">
            Having trouble? Contact your{' '}
            <span className={`${isDarkMode ? 'text-cyan-300/80 hover:text-cyan-200' : 'text-teal-600 hover:text-teal-700'} cursor-pointer transition-colors`}>system administrator</span>.
          </p>
        </motion.div>
        </section>
      </div>
    </div>
  );
};

export default Login;
