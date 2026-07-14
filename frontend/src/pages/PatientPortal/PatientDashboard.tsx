import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSafeTheme } from '../../hooks/useSafeTheme';
import api from '../../services/apiService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';
import {
  Activity, User, Clipboard, Heart, LogOut, Moon, Sun,
  MapPin, Phone, Mail, Award, CheckCircle2, AlertCircle,
  Lock, Edit3, Save, ChevronRight, FileText, Pill, FileSpreadsheet,
  Stethoscope, Camera, Bot, MessageSquare, Mic, MicOff, Volume2, VolumeX,
  Bell, Shield, Clock, TrendingUp, Thermometer, Wind, Droplets,
  Calendar, ChevronDown, ChevronUp, Send, Plus, Inbox, Star,
  MoreHorizontal, Home, X, Menu, Zap, Eye, Weight, Ruler,
  ArrowRight, CircleDot, UserCircle, Sparkles
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// INTERFACES (Exact same as original)
// ─────────────────────────────────────────────────────────────

interface PatientData {
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  contactNumber: string;
  email: string;
  profilePic?: string;
  address: any;
  bloodType?: string;
  allergies?: Array<{ allergen: string; reaction: string; severity: string }>;
  emergencyContact?: { name: string; relationship: string; contactNumber: string };
  faydaId?: string;
  nextCheckup?: string;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    prescribedBy?: string;
  }>;
  medicalHistory?: Array<{
    condition?: string;
    diagnosis?: string;
    diagnosedDate?: string;
    notes?: string;
  }>;
}

interface VitalSignsData {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  spo2?: number;
  respiratoryRate?: number;
  bloodSugar?: number;
  notes?: string;
  measuredByName: string;
  measurementDate: string;
  formattedValue: string;
}

interface LabResultData {
  _id: string;
  testName?: string;
  tests?: Array<{ testName: string; price: number }>;
  specimenType?: string;
  status: string;
  paymentStatus: string;
  normalRange?: string;
  results?: any;
  notes?: string;
  orderDateTime: string;
  orderingDoctorId?: { firstName: string; lastName: string; specialization: string };
}

interface MedicalRecordData {
  _id: string;
  doctorName: string;
  doctorId?: { firstName: string; lastName: string; specialization: string };
  chiefComplaint: { description: string; severity: string; duration: string };
  diagnosis: string;
  assessment?: {
    treatmentPlan?: {
      medications?: Array<{ name: string; dosage: string; frequency: string; duration: string; notes?: string }>;
      procedures?: Array<{ name: string; description?: string; urgency: string }>;
      followUpInstructions?: { instructions: string; timing: string };
    };
  };
  notes?: string;
  visitDate: string;
}

interface SecureMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: Date;
  read: boolean;
  category: string;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

const PatientDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useSafeTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'vitals' | 'labs' | 'medications' | 'records' | 'messages' | 'profile' | 'ai_chat'>('dashboard');

  // Data States
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [vitals, setVitals] = useState<VitalSignsData[]>([]);
  const [labs, setLabs] = useState<LabResultData[]>([]);
  const [records, setRecords] = useState<MedicalRecordData[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  // Loading & Edit States
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Edit Form Fields
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState({ street: '', city: '', state: '' });

  // AI Chat Bot States
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'model'; content: string; timestamp: Date }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Secure Messages (local state)
  const [secureMessages, setSecureMessages] = useState<SecureMessage[]>([
    {
      id: 'msg-1',
      from: 'Clinic Admin',
      subject: 'Welcome to New Life Clinic Patient Portal',
      body: 'Welcome to your new patient portal! Here you can view your medical records, lab results, vitals, prescriptions, and communicate with your care team. If you have any questions about using the portal, please don\'t hesitate to reach out.\n\nBest regards,\nNew Life Clinic Administration',
      date: new Date(Date.now() - 86400000),
      read: false,
      category: 'general'
    },
    {
      id: 'msg-2',
      from: 'System',
      subject: 'How to Use Secure Messaging',
      body: 'Secure messaging allows you to communicate directly with your healthcare providers. Here are some tips:\n\n• Use messaging for non-urgent questions\n• Include relevant details about your concern\n• Messages are typically responded to within 24-48 hours\n• For emergencies, please call our emergency line or visit the nearest ER\n\nYour messages are encrypted and stored securely.',
      date: new Date(Date.now() - 172800000),
      read: true,
      category: 'general'
    }
  ]);
  const [selectedMessage, setSelectedMessage] = useState<SecureMessage | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeCategory, setComposeCategory] = useState('General Inquiry');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Mobile more menu
  const [showMobileMore, setShowMobileMore] = useState(false);

  // Vitals chart metric toggles
  const [showSystolic, setShowSystolic] = useState(true);
  const [showDiastolic, setShowDiastolic] = useState(true);
  const [showPulse, setShowPulse] = useState(true);
  const [showOxygen, setShowOxygen] = useState(false);

  // Labs filter
  const [labFilter, setLabFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Records expand
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // SPEECH RECOGNITION INIT
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error('Voice input error: ' + event.error);
        }
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => {
          const space = prev.trim().length > 0 ? ' ' : '';
          return prev + space + transcript;
        });
      };

      setRecognition(rec);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // TEXT-TO-SPEECH
  // ─────────────────────────────────────────────────────────────
  const speakMessage = (msgId: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (speakingMsgId === msgId) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
        return;
      }

      window.speechSynthesis.cancel();

      const cleanText = text.replace(/[*#`_\-]/g, '').replace(/🧠✨/g, '').replace(/⚠️/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      utterance.onend = () => {
        setSpeakingMsgId(null);
      };
      utterance.onerror = () => {
        setSpeakingMsgId(null);
      };

      setSpeakingMsgId(msgId);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech is not supported in this browser.');
    }
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      toast.error('Voice input is not supported in this browser. Please try Chrome, Edge or Safari.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // WELCOME MESSAGE
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (patient) {
      setChatMessages([
        {
          id: 'welcome',
          role: 'model',
          content: `Hello, **${patient.firstName}**! I'm **M-Bot**, your clinical AI assistant at New Life Clinic. 🧠✨\n\nI have secure access to your clinical summary, active medications, recent vitals, and lab test status. How can I help you today?\n\n*Note: I'm here to provide clinical information. For any diagnostic decisions or emergencies, please consult our medical team.*`,
          timestamp: new Date()
        }
      ]);
    }
  }, [patient]);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch Profile
      const profileRes = await api.get('/api/patient-portal/profile');
      if (profileRes.data.success) {
        const pData = profileRes.data.data.patient;
        setPatient(pData);
        setEditPhone(pData.contactNumber || '');
        setEditEmail(pData.email || '');
        setEditAddress({
          street: pData.address?.street || '',
          city: pData.address?.city || '',
          state: pData.address?.state || ''
        });
      }

      // Fetch Vitals
      const vitalsRes = await api.get('/api/patient-portal/vitals');
      if (vitalsRes.data.success) {
        setVitals(vitalsRes.data.data);
      }

      // Fetch Labs
      const labsRes = await api.get('/api/patient-portal/lab-results');
      if (labsRes.data.success) {
        setLabs(labsRes.data.data);
      }

      // Fetch Medical Records
      const recordsRes = await api.get('/api/patient-portal/records');
      if (recordsRes.data.success) {
        setRecords(recordsRes.data.data);
      }

      // Fetch clinic treatments/injections (Nurse Tasks)
      const treatmentsRes = await api.get('/api/patient-portal/treatments');
      if (treatmentsRes.data.success) {
        setTreatments(treatmentsRes.data.data);
      }

      // Fetch prescriptions (Take-home / external medications)
      const prescriptionsRes = await api.get('/api/patient-portal/prescriptions');
      if (prescriptionsRes.data.success) {
        setPrescriptions(prescriptionsRes.data.data);
      }

    } catch (error: any) {
      console.error('❌ [PatientDashboard] Failed to fetch patient data:', error);
      toast.error('Failed to load portal records. Please try logging in again.');
      logout().then(() => navigate('/login'));
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CHAT SCROLL
  // ─────────────────────────────────────────────────────────────
  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTo({
        top: chatEndRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isSendingChat]);

  // ─────────────────────────────────────────────────────────────
  // CHAT MESSAGE HANDLER
  // ─────────────────────────────────────────────────────────────
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || inputMessage;
    if (!textToSend || !textToSend.trim() || isSendingChat) return;

    const userMsg = {
      id: Math.random().toString(36).substring(7),
      role: 'user' as const,
      content: textToSend,
      timestamp: new Date()
    };

    if (!presetText) {
      setInputMessage('');
    }

    setChatMessages(prev => [...prev, userMsg]);
    setIsSendingChat(true);

    try {
      const messageHistory = chatMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.post('/api/patient-portal/chat', {
        messages: messageHistory,
        userMessage: textToSend
      });

      if (res.data.success) {
        const replyMsg = {
          id: Math.random().toString(36).substring(7),
          role: 'model' as const,
          content: res.data.data.reply,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, replyMsg]);
      } else {
        toast.error(res.data.message || 'Failed to get response from assistant');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg = {
        id: Math.random().toString(36).substring(7),
        role: 'model' as const,
        content: 'I apologize, but I encountered an error communicating with the server. Please check your internet connection and try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // DYNAMIC SUGGESTION CHIPS
  // ─────────────────────────────────────────────────────────────
  const getDynamicSuggestionChips = () => {
    const chips: string[] = [];

    if (prescriptions && prescriptions.length > 0) {
      chips.push("What active medications do I have?");
      chips.push("Tell me about precautions for my medications.");
    }

    if (vitals && vitals.length > 0) {
      chips.push("Can you explain my recent vital signs?");
    }

    if (patient?.medicalHistory && patient.medicalHistory.length > 0) {
      const conditions = patient.medicalHistory.map(h => h.condition || h.diagnosis).filter(Boolean);
      if (conditions.length > 0) {
        chips.push(`What is ${conditions[0]} and how is it managed?`);
      }
    } else if (records && records.length > 0 && records[0].diagnosis) {
      chips.push(`What is ${records[0].diagnosis} and how is it managed?`);
    }

    chips.push("What are some general tips for maintaining a healthy blood pressure?");

    return Array.from(new Set(chips)).slice(0, 4);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER FORMATTED CONTENT (for AI chat markdown)
  // ─────────────────────────────────────────────────────────────
  const renderFormattedContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
      let content = line;
      if (isBullet) {
        content = line.replace(/^[-*]\s+/, '');
      }

      const parts = content.split(/(\*\*.*?\*\*)/g);
      const parsedElements = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-extrabold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={i} className="flex items-start gap-2 ml-4 my-1">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: isDarkMode ? '#22d3ee' : '#0d9488' }} />
            <span className="text-sm leading-relaxed">{parsedElements}</span>
          </div>
        );
      }

      return (
        <p key={i} className="text-sm leading-relaxed my-1 min-h-[1rem]">
          {parsedElements}
        </p>
      );
    });
  };

  // ─────────────────────────────────────────────────────────────
  // PROFILE UPDATE
  // ─────────────────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatePayload = {
        contactNumber: editPhone,
        email: editEmail,
        address: editAddress
      };

      const res = await api.put('/api/patient-portal/profile', updatePayload);
      if (res.data.success) {
        setPatient(res.data.data);
        setIsEditingProfile(false);
        toast.success('Contact details updated successfully.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update contact info.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // AVATAR UPLOAD
  // ─────────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

          try {
            toast.loading('Uploading profile photo...', { id: 'avatar-upload' });
            const res = await api.put('/api/patient-portal/profile', { profilePic: compressedBase64 });
            if (res.data.success) {
              setPatient(res.data.data);
              toast.success('Profile photo updated successfully!', { id: 'avatar-upload' });
            }
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to upload photo.', { id: 'avatar-upload' });
          }
        } else {
          toast.error('Failed to create image canvas.');
        }
      };
      img.onerror = () => {
        toast.error('Failed to load image file.');
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      toast.error('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER LAB RESULTS (exact same logic)
  // ─────────────────────────────────────────────────────────────
  const renderLabResults = (order: LabResultData) => {
    if (!order.results) return null;

    const tableHeaderStyle = `text-[10px] uppercase font-bold tracking-wider ${
      isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
    } px-4 py-2 border-b`;

    const tableRowStyle = `text-xs ${
      isDarkMode ? 'hover:bg-slate-800/20 border-slate-800/50' : 'hover:bg-slate-50/50 border-slate-100'
    } border-b`;

    // Case 1: Results is an object with "results" and "normalRange"
    if (typeof order.results === 'object' && order.results !== null) {
      const resValue = order.results.results;
      const refRange = order.results.normalRange || order.normalRange || 'N/A';

      const entries = Object.entries(order.results).filter(([key]) => key !== 'results' && key !== 'normalRange');

      if (resValue) {
        return (
          <div className="overflow-hidden rounded-2xl border mt-2" style={{ borderColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={tableHeaderStyle}>Test Parameter</th>
                  <th className={tableHeaderStyle}>Result Value</th>
                  <th className={tableHeaderStyle}>Reference Range</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(51,65,85,0.2)' : 'rgba(226,232,240,0.5)' }}>
                <tr className={tableRowStyle}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}>{order.testName || 'Result'}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: isDarkMode ? '#2dd4bf' : '#0d9488' }}>{resValue}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">{refRange}</td>
                </tr>
                {entries.map(([key, val]) => (
                  <tr key={key} className={tableRowStyle}>
                    <td className="px-4 py-2.5 font-semibold capitalize" style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}>{key.replace(/([A-Z])/g, ' $1')}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: isDarkMode ? '#2dd4bf' : '#0d9488' }}>{String(val)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Flat key-value object
      if (Object.keys(order.results).length > 0) {
        return (
          <div className="overflow-hidden rounded-2xl border mt-2" style={{ borderColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={tableHeaderStyle}>Parameter</th>
                  <th className={tableHeaderStyle}>Finding / Result</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(51,65,85,0.2)' : 'rgba(226,232,240,0.5)' }}>
                {Object.entries(order.results).map(([key, val]) => (
                  <tr key={key} className={tableRowStyle}>
                    <td className="px-4 py-2.5 font-semibold capitalize" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>{key.replace(/([A-Z])/g, ' $1')}</td>
                    <td className={`px-4 py-2.5 font-bold`} style={{
                      color: String(val).toLowerCase().includes('positive') || String(val).toLowerCase().includes('reactive')
                        ? '#ef4444'
                        : isDarkMode ? '#e2e8f0' : '#334155'
                    }}>{String(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // Case 2: Results is a string
    if (typeof order.results === 'string') {
      const rawStr = order.results.trim();

      // Check if it is a list of parameters
      if (rawStr.includes(':') && (rawStr.includes(';') || rawStr.includes('\n'))) {
        const delimiters = rawStr.includes(';') ? ';' : '\n';
        const pairs = rawStr
          .split(delimiters)
          .map(part => part.trim())
          .filter(part => part.length > 0 && part.includes(':'));

        if (pairs.length > 0) {
          return (
            <div className="overflow-hidden rounded-2xl border mt-2" style={{ borderColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className={tableHeaderStyle}>Parameter</th>
                    <th className={tableHeaderStyle}>Finding / Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(51,65,85,0.2)' : 'rgba(226,232,240,0.5)' }}>
                  {pairs.map((pair, i) => {
                    const idx = pair.indexOf(':');
                    const key = pair.slice(0, idx).trim();
                    const val = pair.slice(idx + 1).trim();
                    return (
                      <tr key={i} className={tableRowStyle}>
                        <td className="px-4 py-2 font-semibold capitalize" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>{key}</td>
                        <td className={`px-4 py-2 font-bold`} style={{
                          color: val === '-' || val.toLowerCase() === 'negative' || val.toLowerCase() === 'non-reactive'
                            ? isDarkMode ? '#64748b' : '#94a3b8'
                            : val.toLowerCase().includes('positive') || val.toLowerCase().includes('reactive')
                              ? '#ef4444'
                              : isDarkMode ? '#e2e8f0' : '#334155'
                        }}>{val}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Default string rendering
      return (
        <div className="mt-2 p-4 rounded-2xl text-xs font-bold border" style={{
          backgroundColor: rawStr.toLowerCase() === 'negative' || rawStr.toLowerCase() === 'non-reactive'
            ? 'rgba(16,185,129,0.05)'
            : rawStr.toLowerCase().includes('positive') || rawStr.toLowerCase().includes('reactive')
              ? 'rgba(239,68,68,0.05)'
              : isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
          borderColor: rawStr.toLowerCase() === 'negative' || rawStr.toLowerCase() === 'non-reactive'
            ? 'rgba(16,185,129,0.15)'
            : rawStr.toLowerCase().includes('positive') || rawStr.toLowerCase().includes('reactive')
              ? 'rgba(239,68,68,0.15)'
              : isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)',
          color: rawStr.toLowerCase() === 'negative' || rawStr.toLowerCase() === 'non-reactive'
            ? '#10b981'
            : rawStr.toLowerCase().includes('positive') || rawStr.toLowerCase().includes('reactive')
              ? '#ef4444'
              : isDarkMode ? '#cbd5e1' : '#334155'
        }}>
          {rawStr}
        </div>
      );
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────
  // PROCESS VITALS FOR RECHARTS
  // ─────────────────────────────────────────────────────────────
  const chartData = [...vitals]
    .reverse()
    .map(v => ({
      date: new Date(v.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      systolic: v.systolic,
      diastolic: v.diastolic,
      pulse: v.pulse,
      temp: v.temperature,
      oxygen: v.spo2,
      sugar: v.bloodSugar
    }));

  // ─────────────────────────────────────────────────────────────
  // HELPER: Time-based greeting
  // ─────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ─────────────────────────────────────────────────────────────
  // HELPER: Latest vitals
  // ─────────────────────────────────────────────────────────────
  const latestVital = vitals.length > 0 ? vitals[0] : null;

  // ─────────────────────────────────────────────────────────────
  // HELPER: Unread notification count
  // ─────────────────────────────────────────────────────────────
  const unreadLabsCount = labs.filter(l => l.status === 'Results Available' || l.status === 'Completed').length;
  const unreadMessagesCount = secureMessages.filter(m => !m.read).length;
  const notificationCount = unreadLabsCount + unreadMessagesCount;

  // ─────────────────────────────────────────────────────────────
  // HELPER: BP status color
  // ─────────────────────────────────────────────────────────────
  const getBPStatus = (sys?: number, dia?: number) => {
    if (!sys || !dia) return { label: 'N/A', color: '#94a3b8' };
    if (sys < 120 && dia < 80) return { label: 'Normal', color: '#10b981' };
    if (sys < 130 && dia < 80) return { label: 'Elevated', color: '#f59e0b' };
    if (sys < 140 || dia < 90) return { label: 'High Stage 1', color: '#f97316' };
    return { label: 'High Stage 2', color: '#ef4444' };
  };

  const getHRStatus = (hr?: number) => {
    if (!hr) return { label: 'N/A', color: '#94a3b8' };
    if (hr >= 60 && hr <= 100) return { label: 'Normal', color: '#10b981' };
    if (hr < 60) return { label: 'Low', color: '#3b82f6' };
    return { label: 'Elevated', color: '#f59e0b' };
  };

  const getSpO2Status = (spo2?: number) => {
    if (!spo2) return { label: 'N/A', color: '#94a3b8' };
    if (spo2 >= 95) return { label: 'Normal', color: '#10b981' };
    if (spo2 >= 90) return { label: 'Low', color: '#f59e0b' };
    return { label: 'Critical', color: '#ef4444' };
  };

  const getTempStatus = (temp?: number) => {
    if (!temp) return { label: 'N/A', color: '#94a3b8' };
    if (temp >= 36.1 && temp <= 37.2) return { label: 'Normal', color: '#10b981' };
    if (temp > 37.2 && temp <= 38) return { label: 'Mild Fever', color: '#f59e0b' };
    if (temp > 38) return { label: 'Fever', color: '#ef4444' };
    return { label: 'Low', color: '#3b82f6' };
  };

  // Severity badge colors
  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase() || '';
    if (s === 'mild') return { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', text: '#10b981' };
    if (s === 'moderate') return { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' };
    if (s === 'severe') return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: '#ef4444' };
    if (s === 'critical') return { bg: 'rgba(190,18,60,0.1)', border: 'rgba(190,18,60,0.25)', text: '#be123c' };
    return { bg: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,1)', border: isDarkMode ? 'rgba(71,85,105,0.4)' : 'rgba(226,232,240,1)', text: isDarkMode ? '#94a3b8' : '#64748b' };
  };

  // ─────────────────────────────────────────────────────────────
  // COMPOSE MESSAGE HANDLER (linked to backend)
  // ─────────────────────────────────────────────────────────────
  const handleSendSecureMessage = async () => {
    if (!composeSubject.trim() || !composeBody.trim()) {
      toast.error('Please fill in subject and message body.');
      return;
    }
    
    try {
      toast.loading('Sending secure message...', { id: 'send-msg' });
      
      const res = await api.post('/api/patient-portal/message', {
        recipientRole: 'doctor',
        subject: `[${composeCategory}] ${composeSubject}`,
        message: composeBody
      });
      
      if (res.data.success) {
        const newMsg: SecureMessage = {
          id: res.data.data._id || 'msg-' + Math.random().toString(36).substring(7),
          from: `${patient?.firstName} ${patient?.lastName}`,
          subject: `[${composeCategory}] ${composeSubject}`,
          body: composeBody,
          date: new Date(),
          read: true,
          category: composeCategory
        };
        setSecureMessages(prev => [newMsg, ...prev]);
        setComposeSubject('');
        setComposeBody('');
        setComposeCategory('General Inquiry');
        setIsComposing(false);
        toast.success('Message sent! You will receive a response within 24-48 hours.', { id: 'send-msg' });
      } else {
        toast.error(res.data.message || 'Failed to send message.', { id: 'send-msg' });
      }
    } catch (error: any) {
      console.error('Error sending secure message:', error);
      toast.error(error.response?.data?.message || 'Server error occurred while sending message.', { id: 'send-msg' });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION CONFIG
  // ─────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'vitals', label: 'Vitals', icon: Heart },
    { id: 'labs', label: 'Labs', icon: FileSpreadsheet },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'records', label: 'Records', icon: Stethoscope },
    { id: 'messages', label: 'Messages', icon: Inbox },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'ai_chat', label: 'AI Assistant', icon: Bot },
  ];

  const mobileMainNav = navItems.slice(0, 4);

  // ─────────────────────────────────────────────────────────────
  // DESIGN TOKENS
  // ─────────────────────────────────────────────────────────────
  const glassCard = isDarkMode
    ? { background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(51,65,85,0.3)' }
    : { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(226,232,240,0.6)' };

  const solidCard = isDarkMode
    ? { background: '#0f172a', border: '1px solid rgba(51,65,85,0.4)' }
    : { background: '#ffffff', border: '1px solid rgba(226,232,240,1)' };

  const inputStyle = {
    background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
    border: isDarkMode ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(226,232,240,1)',
    color: isDarkMode ? '#e2e8f0' : '#1e293b'
  };

  const accentColor = isDarkMode ? '#22d3ee' : '#0d9488';
  const accentBg = isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(13,148,136,0.1)';

  // ─────────────────────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #030712 0%, #0f172a 50%, #030712 100%)'
            : 'linear-gradient(135deg, #f0f4f8 0%, #e0f2fe 50%, #f0f4f8 100%)',
          color: isDarkMode ? '#fff' : '#0f172a'
        }}
      >
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 8 + i * 4,
                height: 8 + i * 4,
                background: isDarkMode
                  ? `rgba(34,211,238,${0.05 + i * 0.02})`
                  : `rgba(13,148,136,${0.05 + i * 0.02})`,
                left: `${15 + i * 14}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 z-10"
        >
          {/* Heartbeat logo */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}
            >
              <Activity className="h-8 w-8 text-white" />
            </motion.div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-lg font-extrabold tracking-wider uppercase">New Life Clinic</h1>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: accentColor }}>Patient Portal</p>
          </div>

          {/* Skeleton loading */}
          <div className="space-y-3 w-72">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="h-3 rounded-full"
                style={{ background: isDarkMode ? 'rgba(51,65,85,0.4)' : 'rgba(203,213,225,0.5)' }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>

          <p className="text-xs font-semibold" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Retrieving your secure clinical record...
          </p>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: isDarkMode ? '#030712' : '#f0f4f8',
        color: isDarkMode ? '#f1f5f9' : '#0f172a',
        transition: 'background 0.3s, color 0.3s'
      }}
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* GLASSMORPHIC HEADER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: isDarkMode ? 'rgba(11,21,45,0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.8)',
        }}
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}
            >
              <Activity className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <span className="font-extrabold text-sm uppercase tracking-wider block"
                style={{ color: isDarkMode ? '#f1f5f9' : '#0f172a' }}>
                New Life Clinic
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest block -mt-0.5"
                style={{ color: accentColor }}>
                Patient Portal
              </span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              onClick={() => setActiveTab('labs')}
              className="relative p-2 rounded-xl transition-colors cursor-pointer"
              style={{
                color: isDarkMode ? '#94a3b8' : '#64748b',
                background: 'transparent'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isDarkMode ? 'rgba(51,65,85,0.4)' : 'rgba(241,245,249,1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Bell className="h-[18px] w-[18px]" />
              {notificationCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: '#ef4444' }}
                >
                  {notificationCount}
                </motion.span>
              )}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-colors cursor-pointer"
              style={{
                color: isDarkMode ? '#fbbf24' : '#64748b',
                background: 'transparent'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isDarkMode ? 'rgba(51,65,85,0.4)' : 'rgba(241,245,249,1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {isDarkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            {/* Welcome text (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2 pl-3"
              style={{ borderLeft: isDarkMode ? '1px solid rgba(51,65,85,0.4)' : '1px solid rgba(226,232,240,0.8)' }}>
              <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Welcome,</span>
              <span className="text-xs font-bold">{patient?.firstName} {patient?.lastName}</span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide cursor-pointer transition-all"
              style={{
                border: isDarkMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(254,202,202,1)',
                color: isDarkMode ? '#f87171' : '#dc2626',
                background: isDarkMode ? 'rgba(239,68,68,0.05)' : 'rgba(254,242,242,1)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(254,226,226,1)')}
              onMouseLeave={e => (e.currentTarget.style.background = isDarkMode ? 'rgba(239,68,68,0.05)' : 'rgba(254,242,242,1)')}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        {/* Accent gradient line */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(to right, #14b8a6, #06b6d4, #8b5cf6, #14b8a6)' }} />
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 max-w-[1920px] w-full mx-auto">
        {/* ─── DESKTOP SIDEBAR (hidden on mobile) ─── */}
        <aside
          className="hidden lg:flex flex-col w-64 shrink-0 sticky top-[66px] h-[calc(100vh-66px)] py-6 px-3 overflow-y-auto"
          style={{
            background: isDarkMode ? 'rgba(11,21,45,0.5)' : 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(12px)',
            borderRight: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(226,232,240,0.6)',
          }}
        >
          {/* Patient mini card */}
          <div className="px-3 pb-5 mb-4" style={{ borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.8)' }}>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm shrink-0"
                style={{
                  background: isDarkMode ? '#0f172a' : '#f1f5f9',
                  border: isDarkMode ? '2px solid rgba(51,65,85,0.5)' : '2px solid rgba(226,232,240,1)',
                  color: accentColor
                }}
              >
                {patient?.profilePic ? (
                  <img src={patient.profilePic} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{(patient?.firstName?.[0] || '') + (patient?.lastName?.[0] || '')}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{patient?.firstName} {patient?.lastName}</p>
                <p className="text-[10px] font-semibold truncate" style={{ color: '#94a3b8' }}>ID: {patient?.patientId}</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all relative overflow-hidden"
                  style={{
                    background: isActive ? accentBg : 'transparent',
                    color: isActive ? accentColor : isDarkMode ? '#94a3b8' : '#64748b',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = isDarkMode ? 'rgba(51,65,85,0.2)' : 'rgba(241,245,249,1)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                      style={{ background: 'linear-gradient(180deg, #14b8a6, #06b6d4)' }}
                    />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                  {item.id === 'messages' && unreadMessagesCount > 0 && (
                    <span className="ml-auto h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                      style={{ background: '#ef4444' }}>
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="mt-6 px-3 pt-4" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.8)' }}>
            <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: '#64748b' }}>
              <Shield className="h-3.5 w-3.5" />
              <span>Secured & Encrypted</span>
            </div>
          </div>
        </aside>

        {/* ─── CONTENT AREA ─── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-5xl mx-auto"
            >

              {/* ════════════════════════════════════════════════════ */}
              {/* DASHBOARD HOME TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Greeting Banner */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-6 relative overflow-hidden"
                    style={{
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(6,182,212,0.1) 50%, rgba(15,23,42,0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(204,251,241,0.8) 0%, rgba(207,250,254,0.5) 50%, rgba(255,255,255,0.9) 100%)',
                      border: isDarkMode ? '1px solid rgba(20,184,166,0.2)' : '1px solid rgba(204,251,241,0.8)',
                    }}
                  >
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                          <div
                            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-lg sm:text-xl shadow-lg"
                            style={{
                              background: isDarkMode ? '#0f172a' : '#ffffff',
                              border: isDarkMode ? '3px solid rgba(34,211,238,0.3)' : '3px solid rgba(13,148,136,0.2)',
                              color: accentColor
                            }}
                          >
                            {patient?.profilePic ? (
                              <img src={patient.profilePic} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                              <span>{(patient?.firstName?.[0] || '') + (patient?.lastName?.[0] || '')}</span>
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                            <Camera className="h-5 w-5 text-white" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer rounded-full z-20"
                          />
                        </div>
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            {getGreeting()}, {patient?.firstName} 👋
                          </h1>
                          <p className="text-xs mt-1" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                            Fayda ID: <span className="font-semibold">{patient?.faydaId || 'N/A'}</span> • Card ID: <span className="font-semibold">{patient?.patientId}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'View Results', icon: FileSpreadsheet, color: '#3b82f6', tab: 'labs' },
                      { label: 'Message Doctor', icon: MessageSquare, color: '#8b5cf6', tab: 'messages' },
                      { label: 'My Medications', icon: Pill, color: '#10b981', tab: 'medications' },
                      { label: 'Ask AI Assistant', icon: Bot, color: '#06b6d4', tab: 'ai_chat' },
                    ].map((action, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        whileHover={{ y: -2, scale: 1.02 }}
                        onClick={() => setActiveTab(action.tab as any)}
                        className="p-4 rounded-2xl flex flex-col items-center gap-3 cursor-pointer transition-shadow"
                        style={{
                          ...glassCard,
                          boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: action.color + '15' }}>
                          <action.icon className="h-5 w-5" style={{ color: action.color }} />
                        </div>
                        <span className="text-xs font-bold">{action.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Action Items / To-Do Widget */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pl-1"
                      style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                      <Zap className="h-3.5 w-3.5" style={{ color: accentColor }} />
                      Action Items
                    </h3>
                    <div className="space-y-2">
                      {labs.filter(l => l.status === 'Results Available' || l.status === 'Completed').length > 0 && (
                        <motion.button
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ x: 4 }}
                          onClick={() => setActiveTab('labs')}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl cursor-pointer text-left transition-all"
                          style={{
                            ...solidCard,
                            borderLeft: '3px solid #3b82f6',
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
                            <FileSpreadsheet className="h-4 w-4" style={{ color: '#3b82f6' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">You have {labs.filter(l => l.status === 'Results Available' || l.status === 'Completed').length} lab result(s) available</p>
                            <p className="text-[11px]" style={{ color: '#64748b' }}>Tap to view your diagnostic results</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#94a3b8' }} />
                        </motion.button>
                      )}

                      {patient?.nextCheckup && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          className="flex items-center gap-3 p-3.5 rounded-xl"
                          style={{
                            ...solidCard,
                            borderLeft: '3px solid #f59e0b',
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
                            <Calendar className="h-4 w-4" style={{ color: '#f59e0b' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">Next checkup scheduled</p>
                            <p className="text-[11px]" style={{ color: '#64748b' }}>{new Date(patient.nextCheckup).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </motion.div>
                      )}

                      {prescriptions.length > 0 && (
                        <motion.button
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          whileHover={{ x: 4 }}
                          onClick={() => setActiveTab('medications')}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl cursor-pointer text-left transition-all"
                          style={{
                            ...solidCard,
                            borderLeft: '3px solid #10b981',
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                            <Pill className="h-4 w-4" style={{ color: '#10b981' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">{prescriptions.length} active medication(s) to manage</p>
                            <p className="text-[11px]" style={{ color: '#64748b' }}>Review your prescriptions and dosages</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#94a3b8' }} />
                        </motion.button>
                      )}

                      {records.length > 0 && (
                        <motion.button
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 }}
                          whileHover={{ x: 4 }}
                          onClick={() => setActiveTab('records')}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl cursor-pointer text-left transition-all"
                          style={{
                            ...solidCard,
                            borderLeft: '3px solid #8b5cf6',
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)' }}>
                            <Stethoscope className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">Review your recent medical record</p>
                            <p className="text-[11px]" style={{ color: '#64748b' }}>Latest visit: {new Date(records[0].visitDate).toLocaleDateString()}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#94a3b8' }} />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Health Snapshot */}
                  {latestVital && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pl-1"
                        style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                        <Heart className="h-3.5 w-3.5" style={{ color: '#f43f5e' }} />
                        Health Snapshot
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* BP */}
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="p-4 rounded-2xl space-y-2"
                          style={solidCard}
                        >
                          <div className="flex items-center justify-between">
                            <Heart className="h-4 w-4" style={{ color: '#f43f5e' }} />
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                              style={{
                                background: getBPStatus(latestVital.systolic, latestVital.diastolic).color + '15',
                                color: getBPStatus(latestVital.systolic, latestVital.diastolic).color
                              }}>
                              {getBPStatus(latestVital.systolic, latestVital.diastolic).label}
                            </span>
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold">
                              {latestVital.systolic && latestVital.diastolic
                                ? `${latestVital.systolic}/${latestVital.diastolic}`
                                : 'N/A'}
                            </p>
                            <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>mmHg • Blood Pressure</p>
                          </div>
                        </motion.div>

                        {/* Heart Rate */}
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="p-4 rounded-2xl space-y-2"
                          style={solidCard}
                        >
                          <div className="flex items-center justify-between">
                            <Activity className="h-4 w-4" style={{ color: '#10b981' }} />
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                              style={{
                                background: getHRStatus(latestVital.pulse).color + '15',
                                color: getHRStatus(latestVital.pulse).color
                              }}>
                              {getHRStatus(latestVital.pulse).label}
                            </span>
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold">{latestVital.pulse || 'N/A'}</p>
                            <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>bpm • Heart Rate</p>
                          </div>
                        </motion.div>

                        {/* SpO2 */}
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="p-4 rounded-2xl space-y-2"
                          style={solidCard}
                        >
                          <div className="flex items-center justify-between">
                            <Wind className="h-4 w-4" style={{ color: '#06b6d4' }} />
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                              style={{
                                background: getSpO2Status(latestVital.spo2).color + '15',
                                color: getSpO2Status(latestVital.spo2).color
                              }}>
                              {getSpO2Status(latestVital.spo2).label}
                            </span>
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold">{latestVital.spo2 ? `${latestVital.spo2}%` : 'N/A'}</p>
                            <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>SpO₂ • Oxygen Level</p>
                          </div>
                        </motion.div>

                        {/* BMI */}
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          className="p-4 rounded-2xl space-y-2"
                          style={solidCard}
                        >
                          <div className="flex items-center justify-between">
                            <TrendingUp className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                              style={{
                                background: latestVital.bmi && latestVital.bmi >= 18.5 && latestVital.bmi <= 24.9
                                  ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                color: latestVital.bmi && latestVital.bmi >= 18.5 && latestVital.bmi <= 24.9
                                  ? '#10b981' : '#f59e0b'
                              }}>
                              {latestVital.bmi
                                ? (latestVital.bmi >= 18.5 && latestVital.bmi <= 24.9 ? 'Normal' : latestVital.bmi < 18.5 ? 'Under' : 'Over')
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold">{latestVital.bmi || 'N/A'}</p>
                            <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>kg/m² • BMI</p>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {/* Allergy Banner */}
                  {patient?.allergies && patient.allergies.length > 0 ? (
                    <div className="rounded-2xl p-4 flex items-start gap-3"
                      style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: '#f87171' }}>Allergies Detected</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {patient.allergies.map((allergy, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                              {allergy.allergen} • {allergy.severity} ({allergy.reaction})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-4 flex items-start gap-3"
                      style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: '#34d399' }}>No Active Allergies</h4>
                        <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>No drug or food allergies have been reported.</p>
                      </div>
                    </div>
                  )}

                  {/* Recent Activity Timeline */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pl-1"
                      style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                      <Clock className="h-3.5 w-3.5" style={{ color: accentColor }} />
                      Recent Activity
                    </h3>
                    <div className="space-y-0">
                      {[
                        ...records.slice(0, 2).map(r => ({
                          type: 'record',
                          icon: Stethoscope,
                          color: '#8b5cf6',
                          title: `Medical record by ${r.doctorName}`,
                          desc: r.diagnosis,
                          date: r.visitDate,
                        })),
                        ...labs.slice(0, 2).map(l => ({
                          type: 'lab',
                          icon: FileSpreadsheet,
                          color: '#3b82f6',
                          title: l.tests && l.tests.length > 0 ? l.tests.map(t => t.testName).join(', ') : (l.testName || 'Lab Order'),
                          desc: l.status,
                          date: l.orderDateTime,
                        })),
                        ...prescriptions.slice(0, 1).map((rx: any) => ({
                          type: 'prescription',
                          icon: Pill,
                          color: '#10b981',
                          title: rx.medications?.[0]?.name || rx.medicationName || 'Prescription',
                          desc: rx.status || 'Active',
                          date: rx.datePrescribed || rx.createdAt,
                        }))
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 py-3 relative"
                          style={{ borderBottom: idx < 4 ? (isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)') : 'none' }}>
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                              style={{ background: item.color + '12' }}>
                              <item.icon className="h-4 w-4" style={{ color: item.color }} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{item.title}</p>
                            <p className="text-[11px]" style={{ color: '#64748b' }}>{item.desc}</p>
                          </div>
                          <span className="text-[10px] font-semibold shrink-0" style={{ color: '#94a3b8' }}>
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                      {records.length === 0 && labs.length === 0 && prescriptions.length === 0 && (
                        <div className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>
                          No recent activity to display.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Care Team / Clinic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Emergency Contact */}
                    <div className="p-4 rounded-2xl space-y-3" style={solidCard}>
                      <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                        style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                        <AlertCircle className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />
                        Emergency Contact
                      </h4>
                      {patient?.emergencyContact?.name ? (
                        <div className="space-y-1 text-xs">
                          <p className="font-bold">{patient.emergencyContact.name}</p>
                          <p style={{ color: '#64748b' }}>
                            {patient.emergencyContact.relationship} • {patient.emergencyContact.contactNumber}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: '#64748b' }}>No emergency contact registered.</p>
                      )}
                    </div>

                    {/* Clinic Info */}
                    <div className="p-4 rounded-2xl space-y-3" style={solidCard}>
                      <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                        style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                        <MapPin className="h-3.5 w-3.5" style={{ color: accentColor }} />
                        Your Care Facility
                      </h4>
                      <div className="space-y-1.5 text-xs" style={{ color: '#64748b' }}>
                        <p>Bole Sub-City, Woreda 03, Addis Ababa</p>
                        <p>📞 +251 11 661 2345</p>
                        <p>✉️ support@newlifeclinic.et</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* VITALS TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'vitals' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold">Vital Signs</h2>
                    <p className="text-xs" style={{ color: '#64748b' }}>Monitor your health measurements across visits</p>
                  </div>

                  {/* Hero vital cards */}
                  {latestVital && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: 'Blood Pressure', value: latestVital.systolic && latestVital.diastolic ? `${latestVital.systolic}/${latestVital.diastolic}` : 'N/A', unit: 'mmHg', icon: Heart, color: '#f43f5e', status: getBPStatus(latestVital.systolic, latestVital.diastolic) },
                        { label: 'Heart Rate', value: latestVital.pulse || 'N/A', unit: 'bpm', icon: Activity, color: '#10b981', status: getHRStatus(latestVital.pulse) },
                        { label: 'Temperature', value: latestVital.temperature ? `${latestVital.temperature}°` : 'N/A', unit: '°C', icon: Thermometer, color: '#f59e0b', status: getTempStatus(latestVital.temperature) },
                        { label: 'SpO₂', value: latestVital.spo2 ? `${latestVital.spo2}%` : 'N/A', unit: '', icon: Wind, color: '#06b6d4', status: getSpO2Status(latestVital.spo2) },
                        { label: 'Weight', value: latestVital.weight ? `${latestVital.weight}` : 'N/A', unit: 'kg', icon: TrendingUp, color: '#8b5cf6', status: { label: latestVital.weight ? 'Recorded' : 'N/A', color: '#94a3b8' } },
                        { label: 'BMI', value: latestVital.bmi || 'N/A', unit: 'kg/m²', icon: TrendingUp, color: '#ec4899', status: { label: latestVital.bmi ? (latestVital.bmi >= 18.5 && latestVital.bmi <= 24.9 ? 'Normal' : 'Abnormal') : 'N/A', color: latestVital.bmi && latestVital.bmi >= 18.5 && latestVital.bmi <= 24.9 ? '#10b981' : '#f59e0b' } },
                      ].map((card, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-3 rounded-2xl text-center space-y-1"
                          style={solidCard}
                        >
                          <card.icon className="h-4 w-4 mx-auto" style={{ color: card.color }} />
                          <p className="text-lg font-extrabold">{card.value}</p>
                          <p className="text-[9px] font-bold uppercase" style={{ color: '#94a3b8' }}>{card.label}</p>
                          <span className="inline-block text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                            style={{ background: card.status.color + '15', color: card.status.color }}>
                            {card.status.label}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* BP insight */}
                  {latestVital && latestVital.systolic && latestVital.diastolic && (
                    <div className="rounded-xl p-3 flex items-center gap-2 text-xs"
                      style={{
                        background: getBPStatus(latestVital.systolic, latestVital.diastolic).color + '08',
                        border: `1px solid ${getBPStatus(latestVital.systolic, latestVital.diastolic).color}20`,
                        color: getBPStatus(latestVital.systolic, latestVital.diastolic).color,
                      }}>
                      {getBPStatus(latestVital.systolic, latestVital.diastolic).label === 'Normal' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="font-semibold">Your blood pressure has been within normal range ✓</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span className="font-semibold">Your blood pressure reading is {getBPStatus(latestVital.systolic, latestVital.diastolic).label}. Please discuss with your doctor.</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Interactive Chart */}
                  {chartData.length > 0 && (
                    <div className="rounded-2xl p-4 sm:p-6 space-y-4" style={solidCard}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold">Trends Over Time</h3>
                          <p className="text-[11px]" style={{ color: '#64748b' }}>Blood pressure & heart rate across visits</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'systolic', label: 'Systolic', color: '#f43f5e', active: showSystolic, toggle: () => setShowSystolic(!showSystolic) },
                            { key: 'diastolic', label: 'Diastolic', color: '#3b82f6', active: showDiastolic, toggle: () => setShowDiastolic(!showDiastolic) },
                            { key: 'pulse', label: 'Heart Rate', color: '#10b981', active: showPulse, toggle: () => setShowPulse(!showPulse) },
                            { key: 'oxygen', label: 'SpO₂', color: '#06b6d4', active: showOxygen, toggle: () => setShowOxygen(!showOxygen) },
                          ].map(btn => (
                            <button key={btn.key} onClick={btn.toggle}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                              style={{
                                background: btn.active ? btn.color + '15' : 'transparent',
                                border: btn.active ? `1px solid ${btn.color}30` : (isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)'),
                                color: btn.active ? btn.color : '#94a3b8',
                                opacity: btn.active ? 1 : 0.6,
                              }}>
                              <div className="h-2 w-2 rounded-full" style={{ background: btn.color }} />
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="h-64 sm:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradSystolic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gradDiastolic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gradPulse" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gradOxygen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                background: isDarkMode ? '#0f172a' : '#ffffff',
                                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                color: isDarkMode ? '#ffffff' : '#0f172a',
                                fontSize: '11px',
                                borderRadius: '12px'
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            {showSystolic && <Area type="monotone" dataKey="systolic" name="Systolic BP" stroke="#f43f5e" strokeWidth={2.5} fill="url(#gradSystolic)" activeDot={{ r: 6 }} />}
                            {showDiastolic && <Area type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradDiastolic)" />}
                            {showPulse && <Area type="monotone" dataKey="pulse" name="Heart Rate" stroke="#10b981" strokeWidth={2.5} fill="url(#gradPulse)" strokeDasharray="4 4" />}
                            {showOxygen && <Area type="monotone" dataKey="oxygen" name="SpO₂" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gradOxygen)" />}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Vitals History Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest pl-1"
                      style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                      Measurements History
                    </h3>
                    {vitals.length > 0 ? (
                      <div className="overflow-x-auto rounded-2xl" style={solidCard}>
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr style={{ background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,1)' }}>
                              {['Date', 'BP (mmHg)', 'Heart Rate', 'Temp', 'SpO₂', 'Weight & Height', 'BMI', 'Recorded By'].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider"
                                  style={{ color: '#94a3b8', borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {vitals.map((v, i) => (
                              <tr key={i} className="transition-colors"
                                style={{
                                  borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)',
                                  background: i % 2 === 0 ? 'transparent' : (isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.5)'),
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = isDarkMode ? 'rgba(51,65,85,0.15)' : 'rgba(241,245,249,1)')}
                                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : (isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.5)'))}
                              >
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                  {new Date(v.measurementDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </td>
                                <td className="px-4 py-3 font-bold" style={{ color: '#f43f5e' }}>
                                  {v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : 'N/A'}
                                </td>
                                <td className="px-4 py-3 font-medium">{v.pulse ? `${v.pulse} bpm` : 'N/A'}</td>
                                <td className="px-4 py-3">{v.temperature ? `${v.temperature}°C` : 'N/A'}</td>
                                <td className="px-4 py-3 font-bold" style={{ color: accentColor }}>{v.spo2 ? `${v.spo2}%` : 'N/A'}</td>
                                <td className="px-4 py-3" style={{ color: '#64748b' }}>
                                  {v.weight ? `${v.weight} kg` : ''} {v.height ? `• ${v.height} cm` : ''}
                                </td>
                                <td className="px-4 py-3 font-bold">{v.bmi || 'N/A'}</td>
                                <td className="px-4 py-3" style={{ color: '#64748b' }}>{v.measuredByName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl text-center text-xs" style={{ ...solidCard, color: '#64748b' }}>
                        No vital signs measurements on record.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* LABS TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'labs' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-extrabold">My Diagnostic Results</h2>
                      <p className="text-xs" style={{ color: '#64748b' }}>Instant access to verified clinical lab tests</p>
                    </div>
                    {/* Filter pills */}
                    <div className="flex gap-2">
                      {(['all', 'pending', 'completed'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setLabFilter(f)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize cursor-pointer transition-all"
                          style={{
                            background: labFilter === f ? accentBg : 'transparent',
                            border: labFilter === f ? `1px solid ${accentColor}30` : (isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)'),
                            color: labFilter === f ? accentColor : '#94a3b8',
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const filtered = labs.filter(l => {
                      if (labFilter === 'completed') return l.status === 'Results Available' || l.status === 'Completed';
                      if (labFilter === 'pending') return l.status !== 'Results Available' && l.status !== 'Completed';
                      return true;
                    });

                    return filtered.length > 0 ? (
                      <div className="space-y-4">
                        {filtered.map((order, idx) => {
                          const isCompleted = order.status === 'Results Available' || order.status === 'Completed';
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="rounded-2xl overflow-hidden"
                              style={solidCard}
                            >
                              {/* Order Header */}
                              <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                style={{
                                  background: isDarkMode ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,1)',
                                  borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                                }}>
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                                    <FileSpreadsheet className="h-4 w-4" style={{ color: isCompleted ? '#10b981' : '#f59e0b' }} />
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Ordered</span>
                                    <span className="text-xs font-bold">
                                      {new Date(order.orderDateTime).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  {order.orderingDoctorId && (
                                    <span className="text-xs" style={{ color: '#64748b' }}>
                                      By: <span className="font-bold" style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}>Dr. {order.orderingDoctorId.lastName}</span>
                                    </span>
                                  )}
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                                    style={{
                                      background: isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                      border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                      color: isCompleted ? '#10b981' : '#f59e0b',
                                    }}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>

                              {/* Order Content */}
                              <div className="p-4 sm:p-6 space-y-4">
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Tests In This Order</span>
                                  <div className="flex flex-wrap gap-2">
                                    {order.tests && order.tests.length > 0 ? (
                                      order.tests.map((test, i) => (
                                        <span key={i} className="px-3 py-1 rounded-xl text-xs font-bold"
                                          style={{
                                            background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                                            border: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                                          }}>
                                          {test.testName}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="px-3 py-1 rounded-xl text-xs font-bold"
                                        style={{
                                          background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                                          border: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                                        }}>
                                        {order.testName}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {(order.status === 'Results Available' || order.results) ? (
                                  <div className="pt-4 space-y-4" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(226,232,240,0.8)' }}>
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Clinical Findings / Results</span>
                                      {renderLabResults(order)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {order.specimenType && (
                                        <div>
                                          <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Specimen</span>
                                          <span className="text-xs font-bold capitalize">{order.specimenType}</span>
                                        </div>
                                      )}
                                      {order.normalRange && (
                                        <div>
                                          <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Reference Range</span>
                                          <span className="text-xs font-bold font-mono">{order.normalRange}</span>
                                        </div>
                                      )}
                                    </div>
                                    {(order as any).stoolExamDetails && (
                                      <div className="pt-3" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.15)' : '1px solid rgba(241,245,249,1)' }}>
                                        <span className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#94a3b8' }}>Microscopic Details</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                          {Object.entries((order as any).stoolExamDetails).map(([key, value]) => {
                                            if (!value) return null;
                                            return (
                                              <div key={key}>
                                                <span className="text-[9px] uppercase tracking-wider block capitalize" style={{ color: '#94a3b8' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                                                <span className="font-bold">{value as string}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    {order.notes && (
                                      <div className="pt-3" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.15)' : '1px solid rgba(241,245,249,1)' }}>
                                        <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Laboratory Notes</span>
                                        <p className="text-xs italic mt-1" style={{ color: '#64748b' }}>{order.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="pt-4 flex items-center gap-2 text-xs" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(226,232,240,0.8)', color: '#64748b' }}>
                                    <AlertCircle className="h-4 w-4" style={{ color: '#f59e0b' }} />
                                    Findings will appear here once the lab results are verified by the technician.
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl text-center text-xs" style={{ ...solidCard, color: '#64748b' }}>
                        {labFilter === 'all' ? 'No diagnostic lab orders on file.' : `No ${labFilter} lab orders found.`}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* MEDICATIONS TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'medications' && (() => {
                const takeHomePrescriptions = prescriptions.filter(rx => !rx.sendToNurse);

                return (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-extrabold">My Medications & Injections</h2>
                      <p className="text-xs" style={{ color: '#64748b' }}>View your active prescriptions and clinic-administered treatments</p>
                    </div>

                    {/* Clinic Treatments */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pl-1"
                        style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.1)' }}>
                          <Activity className="h-3 w-3" style={{ color: '#f43f5e' }} />
                        </div>
                        Clinic Administered Treatments
                      </h3>

                      {treatments && treatments.length > 0 ? (
                        <div className="space-y-3">
                          {treatments.map((task, idx) => {
                            const medDetails = task.medicationDetails;
                            const totalDoses = medDetails?.doseRecords?.length || 0;
                            const givenDoses = medDetails?.doseRecords?.filter((r: any) => r.administered).length || 0;
                            const isAllGiven = totalDoses > 0 && givenDoses === totalDoses;
                            const displayStatus = isAllGiven ? 'COMPLETED' : task.status;
                            const progressPct = totalDoses > 0 ? (givenDoses / totalDoses) * 100 : 0;

                            return (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-4 rounded-2xl"
                                style={solidCard}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(244,63,94,0.1)' }}>
                                    <Activity className="h-5 w-5" style={{ color: '#f43f5e' }} />
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-extrabold">{medDetails?.medicationName || task.description}</p>
                                        {medDetails?.instructions && (
                                          <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{medDetails.instructions}</p>
                                        )}
                                      </div>
                                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase shrink-0"
                                        style={{
                                          background: displayStatus === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                          border: `1px solid ${displayStatus === 'PENDING' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                          color: displayStatus === 'PENDING' ? '#f59e0b' : '#10b981',
                                        }}>
                                        {displayStatus}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: '#64748b' }}>
                                      <span>💉 {medDetails?.dosage || '1 unit'} • <span className="capitalize">{medDetails?.route || 'Intravenous'}</span></span>
                                      <span>📅 {new Date(task.dueDate || task.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                      {task.assignedToName && <span>👩‍⚕️ {task.assignedToName}</span>}
                                    </div>
                                    {/* Progress bar */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 rounded-full overflow-hidden"
                                        style={{ background: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
                                        <motion.div
                                          className="h-full rounded-full"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${progressPct}%` }}
                                          transition={{ duration: 0.8, delay: 0.2 }}
                                          style={{ background: 'linear-gradient(to right, #14b8a6, #06b6d4)' }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-bold shrink-0" style={{ color: accentColor }}>
                                        {givenDoses}/{totalDoses}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl text-center text-xs" style={{ ...solidCard, color: '#64748b' }}>
                          No scheduled clinic medications or injections on record.
                        </div>
                      )}
                    </div>

                    {/* Prescribed Medications */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 pl-1"
                        style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.1)' }}>
                          <Pill className="h-3 w-3" style={{ color: accentColor }} />
                        </div>
                        Prescribed Medications (Take-Home)
                      </h3>

                      {takeHomePrescriptions && takeHomePrescriptions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {takeHomePrescriptions.map((rx, idx) => {
                            const medList = rx.medications && rx.medications.length > 0 ? rx.medications : [{
                              name: rx.medicationName || rx.medication,
                              dosage: rx.dosage,
                              frequency: rx.frequency,
                              route: rx.route,
                              notes: rx.instructions || rx.notes
                            }];
                            return medList.map((med: any, i: number) => (
                              <motion.div
                                key={`${idx}-${i}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: (idx * medList.length + i) * 0.05 }}
                                className="p-4 rounded-2xl"
                                style={solidCard}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: accentBg }}>
                                    <Pill className="h-5 w-5" style={{ color: accentColor }} />
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-extrabold">{med.name}</p>
                                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase shrink-0"
                                        style={{
                                          background: rx.status === 'Active' || rx.status === 'Completed'
                                            ? 'rgba(16,185,129,0.1)' : rx.status === 'Cancelled'
                                              ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                          border: `1px solid ${rx.status === 'Active' || rx.status === 'Completed'
                                            ? 'rgba(16,185,129,0.2)' : rx.status === 'Cancelled'
                                              ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                          color: rx.status === 'Active' || rx.status === 'Completed'
                                            ? '#10b981' : rx.status === 'Cancelled'
                                              ? '#ef4444' : '#f59e0b',
                                        }}>
                                        {rx.status}
                                      </span>
                                    </div>
                                    <p className="text-[11px]" style={{ color: '#64748b' }}>
                                      {med.dosage} • {med.frequency} • <span className="capitalize">{med.route || 'Oral'}</span>
                                    </p>
                                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                                      {new Date(rx.datePrescribed || rx.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                      {rx.doctor && ` • Dr. ${rx.doctor.lastName}`}
                                    </p>
                                    {med.notes && <p className="text-[10px] italic" style={{ color: '#64748b' }}>{med.notes}</p>}
                                  </div>
                                </div>
                              </motion.div>
                            ));
                          })}
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl text-center text-xs" style={{ ...solidCard, color: '#64748b' }}>
                          No take-home medications or prescriptions on file.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ════════════════════════════════════════════════════ */}
              {/* RECORDS / ADVICE TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'records' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold">Doctor Recommendations & Records</h2>
                    <p className="text-xs" style={{ color: '#64748b' }}>Official medical advice from your consultants</p>
                  </div>

                  {records.length > 0 ? (
                    <div className="space-y-4">
                      {records.map((record, idx) => {
                        const sevColor = getSeverityColor(record.chiefComplaint?.severity || '');
                        const isExpanded = expandedRecordId === record._id;
                        const doctorInitials = record.doctorId
                          ? (record.doctorId.firstName?.[0] || '') + (record.doctorId.lastName?.[0] || '')
                          : record.doctorName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR';

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="rounded-2xl overflow-hidden"
                            style={solidCard}
                          >
                            {/* Record Header */}
                            <div className="px-4 sm:px-6 py-4 flex items-center justify-between"
                              style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,1)',
                                borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                              }}>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                                  {doctorInitials}
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold">{record.doctorName}</h3>
                                  {record.doctorId?.specialization && (
                                    <span className="text-[10px]" style={{ color: '#64748b' }}>{record.doctorId.specialization}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase"
                                  style={{ background: sevColor.bg, border: `1px solid ${sevColor.border}`, color: sevColor.text }}>
                                  {record.chiefComplaint?.severity || 'Normal'}
                                </span>
                                <span className="text-[11px] font-semibold hidden sm:inline" style={{ color: '#94a3b8' }}>
                                  {new Date(record.visitDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                </span>
                              </div>
                            </div>

                            {/* Record Body */}
                            <div className="p-4 sm:p-6 space-y-4 text-xs">
                              {/* Chief Complaint */}
                              {record.chiefComplaint?.description && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Chief Complaint</span>
                                  <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                                    {record.chiefComplaint.description} {record.chiefComplaint.duration ? `(${record.chiefComplaint.duration})` : ''}
                                  </p>
                                </div>
                              )}

                              {/* Diagnosis */}
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Diagnosis</span>
                                <p className="text-base font-extrabold mt-1" style={{ color: accentColor }}>{record.diagnosis}</p>
                              </div>

                              {/* Date on mobile */}
                              <span className="text-[11px] font-semibold sm:hidden block" style={{ color: '#94a3b8' }}>
                                {new Date(record.visitDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                              </span>

                              {/* Treatment Plan (collapsible) */}
                              {record.assessment?.treatmentPlan && (
                                <div className="pt-3" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)' }}>
                                  <button
                                    onClick={() => setExpandedRecordId(isExpanded ? null : record._id)}
                                    className="w-full flex items-center justify-between cursor-pointer py-1"
                                  >
                                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Treatment Plan & Directives</span>
                                    {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: '#94a3b8' }} /> : <ChevronDown className="h-4 w-4" style={{ color: '#94a3b8' }} />}
                                  </button>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden space-y-4 pt-3"
                                      >
                                        {/* Medications */}
                                        {record.assessment.treatmentPlan.medications && record.assessment.treatmentPlan.medications.length > 0 && (
                                          <div className="space-y-2">
                                            <span className="text-[10px] font-semibold uppercase block" style={{ color: '#64748b' }}>Active Prescriptions</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              {record.assessment.treatmentPlan.medications.map((med, i) => (
                                                <div key={i} className="p-3.5 rounded-xl flex items-start gap-3"
                                                  style={{
                                                    background: isDarkMode ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.8)',
                                                    border: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                                                  }}>
                                                  <Pill className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accentColor }} />
                                                  <div className="space-y-1">
                                                    <p className="font-extrabold" style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{med.name}</p>
                                                    <p className="text-[11px]" style={{ color: '#64748b' }}>
                                                      Dosage: <span className="font-bold">{med.dosage}</span> • Freq: <span className="font-bold">{med.frequency}</span>
                                                    </p>
                                                    {med.duration && <p className="text-[10px]" style={{ color: '#94a3b8' }}>Duration: {med.duration}</p>}
                                                    {med.notes && <p className="text-[10px] italic" style={{ color: '#64748b' }}>Instructions: {med.notes}</p>}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Procedures */}
                                        {record.assessment.treatmentPlan.procedures && record.assessment.treatmentPlan.procedures.length > 0 && (
                                          <div className="space-y-2">
                                            <span className="text-[10px] font-semibold uppercase block" style={{ color: '#64748b' }}>Procedures</span>
                                            {record.assessment.treatmentPlan.procedures.map((proc, i) => (
                                              <div key={i} className="p-3 rounded-xl" style={{
                                                background: isDarkMode ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.8)',
                                                border: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                                              }}>
                                                <p className="font-bold">{proc.name}</p>
                                                {proc.description && <p className="text-[11px]" style={{ color: '#64748b' }}>{proc.description}</p>}
                                                <span className="text-[9px] font-bold uppercase" style={{ color: proc.urgency === 'urgent' ? '#ef4444' : '#f59e0b' }}>{proc.urgency}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Follow Up */}
                                        {record.assessment.treatmentPlan.followUpInstructions?.instructions && (
                                          <div className="p-4 rounded-xl space-y-1"
                                            style={{
                                              borderLeft: `3px solid ${accentColor}`,
                                              background: accentBg,
                                            }}>
                                            <span className="text-[10px] font-semibold uppercase block" style={{ color: accentColor }}>Follow Up Advice</span>
                                            <p className="font-medium">{record.assessment.treatmentPlan.followUpInstructions.instructions}</p>
                                            {record.assessment.treatmentPlan.followUpInstructions.timing && (
                                              <span className="text-[10px]" style={{ color: '#64748b' }}>Recommended timing: {record.assessment.treatmentPlan.followUpInstructions.timing}</span>
                                            )}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}

                              {/* Notes */}
                              {record.notes && (
                                <div className="pt-3 space-y-1" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)' }}>
                                  <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Consultation Remarks</span>
                                  <p className="italic" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>{record.notes}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl text-center text-xs" style={{ ...solidCard, color: '#64748b' }}>
                      No finalized recommendations on file.
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* SECURE MESSAGES TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'messages' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold">Secure Messages</h2>
                      <p className="text-xs" style={{ color: '#64748b' }}>Communicate with your care team</p>
                    </div>
                    <button
                      onClick={() => { setIsComposing(true); setSelectedMessage(null); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                        color: '#ffffff',
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Compose
                    </button>
                  </div>

                  {isComposing ? (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-5 space-y-4"
                      style={solidCard}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold">New Message</h3>
                        <button onClick={() => setIsComposing(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: '#94a3b8' }}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>To (Category)</label>
                          <select
                            value={composeCategory}
                            onChange={e => setComposeCategory(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl text-xs outline-none"
                            style={inputStyle}
                          >
                            {['General Inquiry', 'Medical Question', 'Prescription Refill', 'Appointment Request'].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Subject</label>
                          <input
                            type="text"
                            value={composeSubject}
                            onChange={e => setComposeSubject(e.target.value)}
                            placeholder="Enter subject..."
                            className="w-full h-10 px-3 rounded-xl text-xs outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Message</label>
                          <textarea
                            value={composeBody}
                            onChange={e => setComposeBody(e.target.value)}
                            placeholder="Type your message..."
                            rows={5}
                            className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                            style={inputStyle}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSendSecureMessage}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', color: '#fff' }}>
                            <Send className="h-3.5 w-3.5" />
                            Send Message
                          </button>
                          <button onClick={() => setIsComposing(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                            style={{ border: isDarkMode ? '1px solid rgba(51,65,85,0.4)' : '1px solid rgba(226,232,240,1)', color: '#94a3b8' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : selectedMessage ? (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-5 space-y-4"
                      style={solidCard}
                    >
                      <button onClick={() => setSelectedMessage(null)}
                        className="text-xs font-bold flex items-center gap-1 cursor-pointer" style={{ color: accentColor }}>
                        ← Back to messages
                      </button>
                      <div className="space-y-2">
                        <h3 className="text-base font-extrabold">{selectedMessage.subject}</h3>
                        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#64748b' }}>
                          <span className="font-bold">{selectedMessage.from}</span>
                          <span>•</span>
                          <span>{selectedMessage.date.toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
                        </div>
                      </div>
                      <div className="pt-3" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)' }}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                          {selectedMessage.body}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {secureMessages.map((msg, idx) => (
                        <motion.button
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            setSelectedMessage(msg);
                            if (!msg.read) {
                              setSecureMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
                            }
                          }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl cursor-pointer text-left transition-all"
                          style={{
                            ...solidCard,
                            fontWeight: msg.read ? 'normal' : 'bold',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = isDarkMode ? 'rgba(51,65,85,0.2)' : 'rgba(241,245,249,1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = solidCard.background)}
                        >
                          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: msg.read ? (isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,1)') : accentBg }}>
                            <Mail className="h-4 w-4" style={{ color: msg.read ? '#94a3b8' : accentColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {!msg.read && <div className="h-2 w-2 rounded-full shrink-0" style={{ background: '#3b82f6' }} />}
                              <p className="text-sm truncate" style={{ fontWeight: msg.read ? 500 : 700 }}>{msg.subject}</p>
                            </div>
                            <p className="text-[11px] truncate" style={{ color: '#64748b' }}>From: {msg.from}</p>
                          </div>
                          <span className="text-[10px] shrink-0" style={{ color: '#94a3b8' }}>
                            {msg.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#94a3b8' }} />
                        </motion.button>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-center" style={{ color: '#64748b' }}>
                    Messages are typically responded to within 24-48 hours. For emergencies, please call +251 11 661 2345.
                  </p>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* PROFILE TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Profile Hero Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-6 relative overflow-hidden"
                    style={{
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(20,184,166,0.1) 0%, rgba(15,23,42,0.9) 100%)'
                        : 'linear-gradient(135deg, rgba(204,251,241,0.6) 0%, rgba(255,255,255,0.9) 100%)',
                      border: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.8)',
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      {/* Large Avatar */}
                      <div className="relative group shrink-0">
                        <div
                          className="h-24 w-24 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-2xl shadow-lg"
                          style={{
                            background: isDarkMode ? '#0f172a' : '#ffffff',
                            border: isDarkMode ? '3px solid rgba(34,211,238,0.3)' : '3px solid rgba(13,148,136,0.2)',
                            color: accentColor
                          }}
                        >
                          {patient?.profilePic ? (
                            <img src={patient.profilePic} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <span>{(patient?.firstName?.[0] || '') + (patient?.lastName?.[0] || '')}</span>
                          )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                        <input type="file" accept="image/*" onChange={handleAvatarUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer rounded-full z-20" />
                      </div>

                      <div className="text-center sm:text-left space-y-2">
                        <h2 className="text-2xl font-extrabold">{patient?.firstName} {patient?.lastName}</h2>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: accentBg, border: `1px solid ${accentColor}25`, color: accentColor }}>
                            ID: {patient?.patientId}
                          </span>
                          {patient?.faydaId && (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6' }}>
                              Fayda: {patient.faydaId}
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize"
                            style={{ background: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,1)', border: isDarkMode ? '1px solid rgba(71,85,105,0.3)' : '1px solid rgba(226,232,240,1)', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                            {patient?.age} yrs • {patient?.gender}
                          </span>
                          {patient?.bloodType && (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                              🩸 {patient.bloodType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      {/* Contact Information */}
                      <div className="rounded-2xl p-5 space-y-4" style={solidCard}>
                        <div className="flex justify-between items-center pb-3" style={{ borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)' }}>
                          <div>
                            <h3 className="text-sm font-extrabold">Contact Information</h3>
                            <p className="text-[11px]" style={{ color: '#64748b' }}>Keep your details up to date</p>
                          </div>
                          {!isEditingProfile && (
                            <button onClick={() => setIsEditingProfile(true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                              style={{
                                border: isDarkMode ? '1px solid rgba(51,65,85,0.4)' : '1px solid rgba(226,232,240,1)',
                                color: accentColor,
                              }}>
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          )}
                        </div>

                        {isEditingProfile ? (
                          <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Phone Number</label>
                                <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                                  className="w-full h-11 px-4 rounded-xl outline-none text-xs focus:ring-2" style={{ ...inputStyle, outlineColor: accentColor }} required />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Email Address</label>
                                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                                  className="w-full h-11 px-4 rounded-xl outline-none text-xs focus:ring-2" style={{ ...inputStyle, outlineColor: accentColor }} required />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Street</label>
                                <input type="text" value={editAddress.street} onChange={e => setEditAddress({ ...editAddress, street: e.target.value })}
                                  className="w-full h-11 px-4 rounded-xl outline-none text-xs" style={inputStyle} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>City</label>
                                <input type="text" value={editAddress.city} onChange={e => setEditAddress({ ...editAddress, city: e.target.value })}
                                  className="w-full h-11 px-4 rounded-xl outline-none text-xs" style={inputStyle} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>State / Region</label>
                                <input type="text" value={editAddress.state} onChange={e => setEditAddress({ ...editAddress, state: e.target.value })}
                                  className="w-full h-11 px-4 rounded-xl outline-none text-xs" style={inputStyle} />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                              <button type="submit"
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md"
                                style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}>
                                <Save className="h-4 w-4" /> Save Changes
                              </button>
                              <button type="button"
                                onClick={() => { setIsEditingProfile(false); setEditPhone(patient?.contactNumber || ''); setEditEmail(patient?.email || ''); }}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                                style={{ border: isDarkMode ? '1px solid rgba(51,65,85,0.4)' : '1px solid rgba(226,232,240,1)', color: '#94a3b8' }}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Phone Number</span>
                              <span className="font-bold">{patient?.contactNumber || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Email Address</span>
                              <span className="font-bold">{patient?.email || 'N/A'}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Address</span>
                              <span className="font-bold">
                                {patient?.address?.street ? `${patient.address.street}, ` : ''}
                                {patient?.address?.city ? `${patient.address.city}, ` : ''}
                                {patient?.address?.state || ''}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Health Info - Allergies & History */}
                      <div className="rounded-2xl p-5 space-y-4" style={solidCard}>
                        <h3 className="text-sm font-extrabold">Health Information</h3>

                        {/* Allergies */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Allergies</span>
                          {patient?.allergies && patient.allergies.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {patient.allergies.map((a, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize"
                                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                                  ⚠️ {a.allergen} ({a.severity})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs" style={{ color: '#64748b' }}>No known allergies</p>
                          )}
                        </div>

                        {/* Medical History */}
                        <div className="space-y-2 pt-3" style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)' }}>
                          <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#94a3b8' }}>Past Medical History</span>
                          {patient?.medicalHistory && patient.medicalHistory.length > 0 ? (
                            <div className="space-y-2">
                              {patient.medicalHistory.map((h, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <CircleDot className="h-3 w-3 shrink-0 mt-1" style={{ color: accentColor }} />
                                  <div className="text-xs">
                                    <p className="font-bold">{h.condition || h.diagnosis}</p>
                                    {h.diagnosedDate && <p className="text-[10px]" style={{ color: '#94a3b8' }}>{new Date(h.diagnosedDate).toLocaleDateString()}</p>}
                                    {h.notes && <p className="text-[10px] italic" style={{ color: '#64748b' }}>"{h.notes}"</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs" style={{ color: '#64748b' }}>No past medical history recorded.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Emergency Contact */}
                      <div className="rounded-2xl p-5 space-y-3" style={solidCard}>
                        <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                          style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                          <AlertCircle className="h-4 w-4" style={{ color: '#f59e0b' }} />
                          Emergency Contact
                        </h4>
                        {patient?.emergencyContact?.name ? (
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Full Name</span>
                              <span className="font-bold">{patient.emergencyContact.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Relationship</span>
                                <span className="font-bold capitalize">{patient.emergencyContact.relationship}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Phone</span>
                                <span className="font-bold">{patient.emergencyContact.contactNumber}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs" style={{ color: '#64748b' }}>No emergency contact registered.</p>
                        )}
                      </div>

                      {/* Portal Credentials */}
                      <div className="rounded-2xl p-5 space-y-3" style={solidCard}>
                        <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                          style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                          <Lock className="h-4 w-4" style={{ color: '#06b6d4' }} />
                          Portal Credentials
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Username (Login ID)</span>
                            <span className="font-bold font-mono">{user?.username}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: '#94a3b8' }}>Role Scope</span>
                            <span className="font-bold capitalize">Patient Portal Access</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* AI CHAT TAB */}
              {/* ════════════════════════════════════════════════════ */}
              {activeTab === 'ai_chat' && (
                <div className="rounded-2xl overflow-hidden flex flex-col" style={{
                  ...solidCard,
                  height: 'calc(100vh - 140px)',
                  minHeight: '500px',
                }}>
                  {/* Chat Header */}
                  <div className="px-5 py-4 flex items-center justify-between shrink-0"
                    style={{
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(6,182,212,0.05))'
                        : 'linear-gradient(135deg, rgba(204,251,241,0.5), rgba(207,250,254,0.3))',
                      borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.8)',
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl" style={{ background: accentBg }}>
                        <Bot className="h-6 w-6" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold">AI Health Assistant</h2>
                        <p className="text-[11px]" style={{ color: '#64748b' }}>Powered by Gemini • Your personal clinical assistant</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ background: '#22c55e', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#22c55e' }} />
                      </span>
                      <span className="text-xs font-semibold" style={{ color: '#64748b' }}>Online</span>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div
                    className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col"
                    ref={chatEndRef}
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                      >
                        {/* Avatar */}
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{
                            background: msg.role === 'user' ? accentBg : (isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)'),
                            color: msg.role === 'user' ? accentColor : '#8b5cf6',
                          }}>
                          {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </div>

                        {/* Bubble */}
                        <div className="rounded-2xl p-3.5" style={{
                          background: msg.role === 'user'
                            ? (isDarkMode ? 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(6,182,212,0.15))' : 'linear-gradient(135deg, #0d9488, #0891b2)')
                            : (isDarkMode ? '#0f172a' : '#f1f5f9'),
                          border: msg.role === 'user'
                            ? (isDarkMode ? '1px solid rgba(20,184,166,0.25)' : 'none')
                            : (isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)'),
                          color: msg.role === 'user'
                            ? (isDarkMode ? '#e2e8f0' : '#ffffff')
                            : (isDarkMode ? '#cbd5e1' : '#334155'),
                          borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                          borderTopLeftRadius: msg.role === 'user' ? '16px' : '4px',
                        }}>
                          <div className="space-y-1">
                            {renderFormattedContent(msg.content)}
                          </div>
                          <div className="flex items-center justify-between gap-4 mt-2 pt-1.5"
                            style={{ borderTop: msg.role === 'user' ? '1px solid rgba(255,255,255,0.15)' : (isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(226,232,240,0.8)') }}>
                            <button
                              type="button"
                              onClick={() => speakMessage(msg.id, msg.content)}
                              className="p-1 rounded-lg transition-all flex items-center gap-1 text-[10px] cursor-pointer"
                              style={{
                                color: speakingMsgId === msg.id ? '#22d3ee' : (isDarkMode ? '#64748b' : '#94a3b8'),
                                background: speakingMsgId === msg.id ? 'rgba(34,211,238,0.1)' : 'transparent',
                              }}
                              title={speakingMsgId === msg.id ? "Stop voice" : "Read aloud"}
                            >
                              {speakingMsgId === msg.id ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                              <span>{speakingMsgId === msg.id ? 'Stop' : 'Listen'}</span>
                            </button>
                            <div className="text-[10px]" style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : '#94a3b8' }}>
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {isSendingChat && (
                      <div className="flex gap-3 max-w-[75%] self-start">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)' }}>
                          <Bot className="h-3.5 w-3.5" style={{ color: '#8b5cf6' }} />
                        </div>
                        <div className="p-4 rounded-2xl flex items-center gap-2"
                          style={{
                            background: isDarkMode ? '#0f172a' : '#f1f5f9',
                            border: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                            borderTopLeftRadius: '4px',
                          }}>
                          <span className="text-xs" style={{ color: '#64748b' }}>M-Bot is thinking</span>
                          <div className="flex gap-1">
                            {[0, 150, 300].map(delay => (
                              <span key={delay} className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  background: accentColor,
                                  animation: 'bounce 1s ease-in-out infinite',
                                  animationDelay: `${delay}ms`
                                }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {chatMessages.length <= 1 && (
                    <div className="px-4 pb-2 space-y-2 shrink-0">
                      <p className="text-[11px] font-bold" style={{ color: '#64748b' }}>Suggested questions:</p>
                      <div className="flex flex-wrap gap-2">
                        {getDynamicSuggestionChips().map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendChatMessage(chip)}
                            className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer transition-all"
                            style={{
                              background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                              border: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,1)',
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = accentColor + '50';
                              e.currentTarget.style.color = accentColor;
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)';
                              e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b';
                            }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input Area */}
                  <div className="px-4 pb-4 pt-2 shrink-0"
                    style={{ borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.2)' : '1px solid rgba(241,245,249,1)' }}>
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="Type a message or ask about your prescriptions..."
                          disabled={isSendingChat}
                          className="w-full pr-12 pl-4 py-3 rounded-2xl text-sm outline-none transition-all"
                          style={{
                            ...inputStyle,
                          }}
                        />
                        <button
                          type="button"
                          onClick={toggleListening}
                          disabled={isSendingChat}
                          className="absolute right-3.5 p-1.5 rounded-xl transition-all cursor-pointer"
                          style={{
                            color: isListening ? '#ef4444' : '#94a3b8',
                            background: isListening ? 'rgba(239,68,68,0.1)' : 'transparent',
                          }}
                          title={isListening ? "Stop listening" : "Voice search"}
                        >
                          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isSendingChat || !inputMessage.trim()}
                        className="p-3 rounded-2xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
                        style={{
                          background: isSendingChat || !inputMessage.trim()
                            ? (isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)')
                            : 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                          color: isSendingChat || !inputMessage.trim()
                            ? '#64748b' : '#ffffff',
                          cursor: isSendingChat || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </form>
                    <p className="text-[10px] text-center mt-2" style={{ color: '#64748b' }}>
                      M-Bot is an AI assistant. Clinical data is from your electronic medical file at New Life Clinic. Always consult your physician.
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MOBILE BOTTOM NAVIGATION (visible < lg) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-1"
        style={{
          background: isDarkMode ? 'rgba(11,21,45,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.8)',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
      >
        {mobileMainNav.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setShowMobileMore(false); }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl cursor-pointer transition-all min-w-[56px]"
              style={{
                color: isActive ? accentColor : '#94a3b8',
                background: isActive ? accentBg : 'transparent',
              }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-bold">{item.label}</span>
            </button>
          );
        })}

        {/* More button */}
        <div className="relative">
          <button
            onClick={() => setShowMobileMore(!showMobileMore)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl cursor-pointer transition-all min-w-[56px]"
            style={{
              color: ['records', 'messages', 'profile', 'ai_chat'].includes(activeTab) ? accentColor : '#94a3b8',
              background: ['records', 'messages', 'profile', 'ai_chat'].includes(activeTab) ? accentBg : 'transparent',
            }}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[9px] font-bold">More</span>
          </button>

          {/* More dropdown */}
          <AnimatePresence>
            {showMobileMore && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl p-2 shadow-2xl"
                style={{
                  background: isDarkMode ? '#0f172a' : '#ffffff',
                  border: isDarkMode ? '1px solid rgba(51,65,85,0.4)' : '1px solid rgba(226,232,240,1)',
                }}
              >
                {navItems.slice(4).map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id as any); setShowMobileMore(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                      style={{
                        color: isActive ? accentColor : isDarkMode ? '#94a3b8' : '#64748b',
                        background: isActive ? accentBg : 'transparent',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.id === 'messages' && unreadMessagesCount > 0 && (
                        <span className="ml-auto h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                          style={{ background: '#ef4444' }}>
                          {unreadMessagesCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FOOTER (hidden on mobile since bottom nav covers it) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer
        className="hidden lg:block py-6 text-center text-xs font-medium mt-auto"
        style={{
          background: isDarkMode ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,1)',
          borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.8)',
          color: '#64748b',
        }}
      >
        <p>© {new Date().getFullYear()} New Life Clinic. All clinical data is securely encrypted.</p>
      </footer>

      {/* Bounce animation keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PatientDashboard;
