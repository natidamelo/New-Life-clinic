import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { motion } from 'framer-motion';
import { 
  User, Lock, ArrowRight, Activity, ChevronLeft, ShieldCheck
} from 'lucide-react';

const PatientLoginSchema = Yup.object().shape({
  identifier: Yup.string()
    .required('Email, Phone Number, or Card ID is required'),
  password: Yup.string()
    .required('Password is required'),
});

const PatientLogin: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useSafeTheme();
  const { login, isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated as a patient
  useEffect(() => {
    if (isAuthenticated && user && user.role === 'patient') {
      navigate('/patient/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const formik = useFormik({
    initialValues: {
      identifier: '',
      password: '',
    },
    validationSchema: PatientLoginSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        console.log('🔄 [PatientLogin] Attempting patient login...');
        
        // Call login from AuthContext
        const loggedInUser = await login(values.identifier, values.password, 'default');
        
        if (loggedInUser.role === 'patient') {
          toast.success('Successfully signed in to patient portal!', {
            position: 'top-center',
          });
          navigate('/patient/dashboard');
        } else {
          // If staff logs in here, redirect them to their staff dashboard
          toast.success(`Welcome back, ${loggedInUser.firstName}! Redirecting to Staff portal...`, {
            position: 'top-center',
          });
          navigate('/app/dashboard');
        }
      } catch (error: any) {
        console.error('❌ [PatientLogin] Login failed:', error);
        toast.error(error.message || 'Invalid credentials. Please try again.', {
          position: 'top-center'
        });
      } finally {
        setIsLoading(false);
      }
    },
  });

  const cardStyle = {
    background: isDarkMode 
      ? 'linear-gradient(170deg, rgba(8,15,33,0.94) 0%, rgba(11,24,48,0.94) 60%, rgba(7,16,34,0.94) 100%)' 
      : 'rgba(255,255,255,0.85)',
    borderColor: isDarkMode 
      ? 'rgba(148,163,184,0.15)' 
      : 'rgba(226,232,240,1)',
    backdropFilter: 'blur(16px)',
    boxShadow: isDarkMode 
      ? '0 30px 90px rgba(2,6,23,0.7)' 
      : '0 20px 50px rgba(15,23,42,0.06)',
  };

  const inputStyle = {
    background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
    border: isDarkMode ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(226,232,240,1)',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${isDarkMode ? 'bg-[#030712]' : 'bg-[#f8fafc]'}`}>
      
      {/* Decorative gradients */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-teal-500/10 via-cyan-500/5 to-transparent pointer-events-none blur-3xl z-0" />
      
      <div className="z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <Link 
          to="/login"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide mb-6 uppercase transition-colors ${
            isDarkMode ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-teal-600'
          }`}
        >
          <ChevronLeft className="h-4 w-4" /> Clinic Home Site
        </Link>

        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3.5 mb-2">
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg ${
              isDarkMode 
                ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-cyan-500/10' 
                : 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-teal-500/15'
            }`}>
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <span className={`font-extrabold text-2xl tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              New Life Clinic
            </span>
          </div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Dedicated Patient Portal Login
          </p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-2 sm:mx-auto sm:w-full sm:max-w-md z-10"
      >
        <div className="rounded-3xl border p-7 sm:p-10 space-y-8" style={cardStyle}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-0.5 w-10 rounded-full bg-gradient-to-r ${isDarkMode ? 'from-cyan-300 to-indigo-300' : 'from-teal-500 to-cyan-500'}`} />
              <span className={`text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'text-cyan-300' : 'text-teal-600'}`}>
                Sign In
              </span>
            </div>
            <h2 className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Welcome Back
            </h2>
            <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter your credentials to access your lab results, prescriptions, and health history.
            </p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Email / Card ID / Phone Number */}
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Email, Card ID, or Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  name="identifier"
                  type="text"
                  placeholder="e.g. email, P12345-6789, or 09..."
                  {...formik.getFieldProps('identifier')}
                  style={inputStyle}
                  className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              {formik.touched.identifier && formik.errors.identifier && (
                <p className="text-[11px] text-red-400 font-semibold">{formik.errors.identifier}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  {...formik.getFieldProps('password')}
                  style={inputStyle}
                  className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-[11px] text-red-400 font-semibold">{formik.errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !formik.isValid}
              className={`relative w-full h-12 rounded-xl text-xs font-bold tracking-wider transition-all duration-300 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                isDarkMode ? 'text-slate-950 focus:ring-cyan-300/50' : 'text-white focus:ring-teal-500/50'
              } mt-4`}
              style={{ 
                background: isDarkMode 
                  ? 'linear-gradient(90deg, #67e8f9 0%, #93c5fd 50%, #a5b4fc 100%)' 
                  : 'linear-gradient(90deg, #0d9488 0%, #0ea5e9 100%)', 
                boxShadow: isDarkMode 
                  ? '0 8px 24px rgba(6,182,212,0.25)' 
                  : '0 8px 24px rgba(13,148,136,0.15)' 
              }}
            >
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? 'Signing In…' : 'Sign In'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-semibold uppercase tracking-wider`}>
              New Patient?
            </span>
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
          </div>

          {/* HIPAA & Security details / signup link */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              HIPAA Compliant
            </span>
            <span>
              Don't have an account?{' '}
              <Link to="/patient/signup" className={`font-bold underline ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-teal-600 hover:text-teal-700'}`}>
                Sign Up Now
              </Link>
            </span>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default PatientLogin;
