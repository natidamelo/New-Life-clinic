import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import authService from '../services/authService';
import api from '../services/apiService';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { motion } from 'framer-motion';
import { 
  User, Lock, Mail, Phone, Calendar, Heart, ArrowRight, Activity, 
  ChevronLeft, Sparkles, ShieldCheck
} from 'lucide-react';

const PatientSignupSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'First name is too short')
    .max(50, 'First name is too long')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name is too short')
    .max(50, 'Last name is too long')
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email address is required'),
  contactNumber: Yup.string()
    .matches(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number (10-15 digits)')
    .required('Phone number is required'),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other'], 'Please select a gender')
    .required('Gender is required'),
  dateOfBirth: Yup.date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .required('Date of birth is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  patientCardId: Yup.string()
    .optional(),
});

const PatientSignup: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useSafeTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingCard, setIsVerifyingCard] = useState(false);

  const handleCardIdLookup = async (cardId: string) => {
    if (!cardId || !cardId.trim()) return;
    
    try {
      setIsVerifyingCard(true);
      const response = await api.get(`/api/auth/patient/check-card/${cardId.trim()}`, { skipAuth: true } as any);
      if (response.data.success && response.data.data) {
        const patientInfo = response.data.data;
        
        // Pre-fill the Formik values
        formik.setFieldValue('firstName', patientInfo.firstName || '');
        formik.setFieldValue('lastName', patientInfo.lastName || '');
        formik.setFieldValue('email', patientInfo.email || '');
        formik.setFieldValue('contactNumber', patientInfo.contactNumber || '');
        formik.setFieldValue('gender', patientInfo.gender || '');
        formik.setFieldValue('dateOfBirth', patientInfo.dateOfBirth || '');
        
        toast.success('Patient Card verified! Details autofilled.', {
          position: 'top-center',
        });
      }
    } catch (error: any) {
      console.error('❌ Card lookup failed:', error);
      const errorMsg = error.response?.data?.message || 'Patient card not found or already linked.';
      toast.error(errorMsg, {
        position: 'top-center',
      });
    } finally {
      setIsVerifyingCard(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      gender: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
      patientCardId: '',
    },
    validationSchema: PatientSignupSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        // Exclude confirmPassword
        const { confirmPassword, ...signupData } = values;
        
        console.log('🔄 [PatientSignup] Sending signup payload:', signupData);
        await authService.registerPatient(signupData);
        
        toast.success('Registration successful! Welcome to the Patient Portal.', {
          position: 'top-center',
          duration: 4000
        });
        
        // Force full refresh to initialize AuthContext with new credentials
        window.location.href = '/patient/dashboard';
      } catch (error: any) {
        console.error('❌ [PatientSignup] Signup failed:', error);
        toast.error(error.message || 'Registration failed. Please try again.', {
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
      
      <div className="z-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        <Link 
          to="/login"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide mb-6 uppercase transition-colors ${
            isDarkMode ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-teal-600'
          }`}
        >
          <ChevronLeft className="h-4 w-4" /> Back to Sign In
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
            Patient Portal Self-Registration
          </p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-2 sm:mx-auto sm:w-full sm:max-w-2xl z-10"
      >
        <div className="rounded-3xl border p-7 sm:p-10 space-y-8" style={cardStyle}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-0.5 w-10 rounded-full bg-gradient-to-r ${isDarkMode ? 'from-cyan-300 to-indigo-300' : 'from-teal-500 to-cyan-500'}`} />
              <span className={`text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'text-cyan-300' : 'text-teal-600'}`}>
                Create Your Account
              </span>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Join the Patient Portal
            </h2>
            <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Please fill in your clinical information. If you have previously visited the clinic, please use the same email or phone number to link your health history.
            </p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Patient Card ID (Optional) */}
            <div className="space-y-1.5 p-4 rounded-2xl border transition-all duration-200" style={{
              borderColor: isDarkMode ? 'rgba(148,163,184,0.1)' : 'rgba(226,232,240,0.8)',
              background: isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.4)',
            }}>
              <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Existing Patient Card ID (Optional)
              </label>
              <p className="text-[10px] text-slate-500 mb-2">
                If you already have a clinic card, enter your Card ID (e.g. P12345-6789) to autofill your profile details and link your clinical history.
              </p>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  {isVerifyingCard ? (
                    <svg className="animate-spin h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                </span>
                <input
                  name="patientCardId"
                  type="text"
                  placeholder="e.g. P12345-6789"
                  {...formik.getFieldProps('patientCardId')}
                  onBlur={(e) => {
                    formik.handleBlur(e);
                    handleCardIdLookup(e.target.value);
                  }}
                  style={inputStyle}
                  className="w-full h-11 pl-9 pr-20 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 uppercase"
                />
                <button
                  type="button"
                  disabled={isVerifyingCard || !formik.values.patientCardId}
                  onClick={() => handleCardIdLookup(formik.values.patientCardId)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode 
                      ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/15' 
                      : 'border-teal-200 text-teal-600 bg-teal-50 hover:bg-teal-100'
                  }`}
                >
                  Verify
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* First Name */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  First Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    name="firstName"
                    type="text"
                    placeholder="Enter first name"
                    {...formik.getFieldProps('firstName')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                {formik.touched.firstName && formik.errors.firstName && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Last Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    name="lastName"
                    type="text"
                    placeholder="Enter last name"
                    {...formik.getFieldProps('lastName')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                {formik.touched.lastName && formik.errors.lastName && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    {...formik.getFieldProps('email')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                {formik.touched.email && formik.errors.email && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    name="contactNumber"
                    type="text"
                    placeholder="e.g. +251911223344"
                    {...formik.getFieldProps('contactNumber')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                {formik.touched.contactNumber && formik.errors.contactNumber && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.contactNumber}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Gender */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Gender
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Heart className="h-4 w-4" />
                  </span>
                  <select
                    name="gender"
                    {...formik.getFieldProps('gender')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer appearance-none bg-no-repeat bg-right"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {formik.touched.gender && formik.errors.gender && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.gender}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Date of Birth
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    name="dateOfBirth"
                    type="date"
                    {...formik.getFieldProps('dateOfBirth')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                {formik.touched.dateOfBirth && formik.errors.dateOfBirth && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.dateOfBirth}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    placeholder="Enter strong password"
                    {...formik.getFieldProps('password')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                {formik.touched.password && formik.errors.password && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    {...formik.getFieldProps('confirmPassword')}
                    style={inputStyle}
                    className="w-full h-11 pl-9 pr-4 text-xs rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                  <p className="text-[11px] text-red-400 font-semibold">{formik.errors.confirmPassword}</p>
                )}
              </div>
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
                {isLoading ? 'Creating Account…' : 'Register Account'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs font-semibold uppercase tracking-wider`}>
              Secure Platform
            </span>
            <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
          </div>

          {/* HIPAA & Security details */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              256-Bit SSL Encrypted & HIPAA Compliant Database
            </span>
            <span>
              Already have an account?{' '}
              <Link to="/login" className={`font-bold underline ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-teal-600 hover:text-teal-700'}`}>
                Sign In
              </Link>
            </span>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default PatientSignup;
