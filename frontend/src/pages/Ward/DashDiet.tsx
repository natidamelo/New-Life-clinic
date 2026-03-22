import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Heart,
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  FileText,
  XCircle,
  User,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ShieldAlert
} from 'lucide-react';
import vitalSignsService from '../../services/vitalSignsService';
import dashDietService, { DashDietRecord, ChatMessage } from '../../services/dashDietService';
import { getBMICategory } from '../../utils/vitalSignsUtils';
import PrintableEatingPlan from '../../components/PrintableEatingPlan';

interface VitalSigns {
  _id: string;
  id?: string;
  patientId: string;
  patientName: string;
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
  position?: string;
  arm?: string;
  notes?: string;
  measurementDate: string;
  recordedAt?: string;
  createdAt?: string;
  measuredBy: string;
  measuredByName: string;
  status?: 'normal' | 'warning' | 'critical';
}

const DashDiet: React.FC = () => {
  const { user } = useAuth();
  const [dashDietRecords, setDashDietRecords] = useState<DashDietRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DashDietRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [searchStats, setSearchStats] = useState({
    totalRecords: 0,
    timePeriod: 'all',
    riskLevel: 'all',
    activePlans: 0,
    completedPlans: 0
  });
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [showEatingPlanModal, setShowEatingPlanModal] = useState(false);
  const [showPatientSelectionModal, setShowPatientSelectionModal] = useState(false);
  const [selectedPatientForEatingPlan, setSelectedPatientForEatingPlan] = useState<{ id: string; name: string } | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [allPatientsWithVitals, setAllPatientsWithVitals] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [expandedInsights, setExpandedInsights] = useState<string | null>(null);
  const [regeneratingInsights, setRegeneratingInsights] = useState<string | null>(null);

  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI DASH Diet assistant. I can help you with dietary recommendations, meal planning tips, patient-specific advice, and answer questions about the DASH diet. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeChatRecord, setActiveChatRecord] = useState<DashDietRecord | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    planType: 'dash' as 'dash' | 'low_sodium' | 'heart_healthy',
    riskLevel: 'moderate' as 'low' | 'moderate' | 'high',
    bloodPressure: { systolic: '', diastolic: '' },
    bmi: '',
    weight: '',
    height: '',
    dietaryRestrictions: [] as string[],
    goals: [] as string[],
    notes: ''
  });

  const dashDietInfo = {
    description: "The DASH (Dietary Approaches to Stop Hypertension) diet is a flexible and balanced eating plan that helps create a heart-healthy eating style for life.",
    benefits: [
      "Lowers blood pressure",
      "Reduces risk of heart disease",
      "Helps with weight management",
      "Improves overall cardiovascular health",
      "May reduce risk of diabetes and stroke"
    ],
    foodGroups: {
      "Grains": "6-8 servings daily",
      "Vegetables": "4-5 servings daily",
      "Fruits": "4-5 servings daily",
      "Dairy": "2-3 servings daily",
      "Lean Proteins": "6 or fewer servings daily",
      "Nuts, Seeds, Legumes": "4-5 servings weekly",
      "Fats and Oils": "2-3 servings daily",
      "Sweets": "5 or fewer servings weekly"
    }
  };

  const dietaryRestrictions = [
    'Low Sodium', 'Low Fat', 'Low Cholesterol', 'High Fiber',
    'Low Sugar', 'Gluten Free', 'Dairy Free', 'Vegetarian', 'Vegan'
  ];

  const dietGoals = [
    'Lower Blood Pressure', 'Weight Loss', 'Heart Health',
    'Diabetes Management', 'Cholesterol Reduction', 'General Wellness'
  ];

  const quickChatPrompts = [
    "What foods are best for lowering blood pressure?",
    "How much sodium is allowed on DASH diet?",
    "What are good DASH diet breakfast ideas?",
    "How does DASH diet help with weight loss?"
  ];

  useEffect(() => {
    fetchDashDietRecords();
  }, [pagination.page, activeTab, selectedTimePeriod, selectedRiskLevel]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeTab]);

  useEffect(() => {
    if (formData.weight && formData.height) {
      const weight = parseFloat(formData.weight);
      const height = parseFloat(formData.height) / 100;
      if (weight > 0 && height > 0) {
        const bmi = (weight / (height * height)).toFixed(1);
        const category = getBMICategory(bmi);
        setFormData(prev => ({ ...prev, bmi: `${bmi} (${category})` }));
      }
    }
  }, [formData.weight, formData.height]);

  useEffect(() => {
    if (showAIChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showAIChat]);

  const fetchDashDietRecords = async () => {
    try {
      setLoading(true);
      const response = await dashDietService.getDashDietRecords({
        riskLevel: selectedRiskLevel === 'all' ? undefined : selectedRiskLevel as any,
        status: activeTab === 'active' ? 'active' : undefined,
        timePeriod: selectedTimePeriod === 'all' ? undefined : selectedTimePeriod as any,
        page: pagination.page,
        limit: pagination.limit
      });
      setDashDietRecords(response.data);
      setSearchStats(response.stats);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching DASH diet records:', error);
      toast.error('Failed to load DASH diet records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const recordData = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        planType: formData.planType,
        riskLevel: formData.riskLevel,
        bloodPressure: {
          systolic: parseInt(formData.bloodPressure.systolic),
          diastolic: parseInt(formData.bloodPressure.diastolic)
        },
        bmi: parseFloat(formData.bmi),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        dietaryRestrictions: formData.dietaryRestrictions,
        goals: formData.goals,
        notes: formData.notes,
        status: 'active' as const
      };

      if (editingRecord) {
        await dashDietService.updateDashDietRecord(editingRecord._id!, recordData);
        toast.success('DASH diet plan updated successfully');
      } else {
        toast.loading('Creating plan with AI insights...', { id: 'creating' });
        await dashDietService.createDashDietRecord(recordData);
        toast.success('DASH diet plan created with AI insights!', { id: 'creating' });
      }

      setShowForm(false);
      setEditingRecord(null);
      resetForm();
      fetchDashDietRecords();
    } catch (error) {
      console.error('Error saving DASH diet record:', error);
      toast.error('Failed to save DASH diet plan');
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '', patientName: '', planType: 'dash', riskLevel: 'moderate',
      bloodPressure: { systolic: '', diastolic: '' },
      bmi: '', weight: '', height: '', dietaryRestrictions: [], goals: [], notes: ''
    });
  };

  const handleEdit = (record: DashDietRecord) => {
    setEditingRecord(record);
    setFormData({
      patientId: record.patientId,
      patientName: record.patientName,
      planType: record.planType,
      riskLevel: record.riskLevel,
      bloodPressure: {
        systolic: record.bloodPressure.systolic.toString(),
        diastolic: record.bloodPressure.diastolic.toString()
      },
      bmi: record.bmi.toString(),
      weight: record.weight.toString(),
      height: record.height.toString(),
      dietaryRestrictions: record.dietaryRestrictions,
      goals: record.goals,
      notes: record.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this DASH diet plan?')) {
      try {
        await dashDietService.deleteDashDietRecord(recordId);
        toast.success('DASH diet plan deleted successfully');
        fetchDashDietRecords();
      } catch (error) {
        console.error('Error deleting DASH diet record:', error);
        toast.error('Failed to delete DASH diet plan');
      }
    }
  };

  const handleRegenerateInsights = async (record: DashDietRecord) => {
    if (!record._id) return;
    try {
      setRegeneratingInsights(record._id);
      const insights = await dashDietService.regenerateAIInsights(record._id);
      setDashDietRecords(prev =>
        prev.map(r => r._id === record._id ? { ...r, aiInsights: insights } : r)
      );
      toast.success('AI insights refreshed!');
    } catch (error) {
      toast.error('Failed to regenerate AI insights');
    } finally {
      setRegeneratingInsights(null);
    }
  };

  const searchPatients = async () => {
    if (!patientSearchTerm.trim()) return;
    try {
      setSearchLoading(true);
      const results = await dashDietService.searchPatientsForDashDiet(patientSearchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast.error('Failed to search patients');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectPatient = (patient: any) => {
    setFormData(prev => ({ ...prev, patientId: patient.id, patientName: patient.name }));
    setSearchResults([]);
    setPatientSearchTerm('');
  };

  const handleSendChat = async (messageText?: string) => {
    const msg = messageText || chatInput.trim();
    if (!msg || chatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: msg, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const patientContext = activeChatRecord ? {
        patientName: activeChatRecord.patientName,
        riskLevel: activeChatRecord.riskLevel,
        planType: activeChatRecord.planType,
        systolic: activeChatRecord.bloodPressure.systolic,
        diastolic: activeChatRecord.bloodPressure.diastolic,
        bmi: activeChatRecord.bmi,
        goals: activeChatRecord.goals,
        dietaryRestrictions: activeChatRecord.dietaryRestrictions
      } : undefined;

      const response = await dashDietService.sendAIChatMessage(msg, patientContext, chatMessages);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-primary/20 text-primary';
      case 'moderate': return 'bg-accent/20 text-accent-foreground';
      case 'high': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary/20 text-primary';
      case 'completed': return 'bg-primary/20 text-primary';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const filteredRecords = dashDietRecords.filter(record => {
    const matchesSearch = record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRiskLevel = selectedRiskLevel === 'all' || record.riskLevel === selectedRiskLevel;
    const matchesTab = activeTab === 'active' ? record.status === 'active' : record.status !== 'active';
    return matchesSearch && matchesRiskLevel && matchesTab;
  });

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-2 lg:mb-0">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/20">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg lg:text-xl font-bold text-muted-foreground flex items-center gap-2">
                  DASH Diet Management
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-600 border border-purple-200">
                    <Sparkles className="h-3 w-3" /> AI Enhanced
                  </span>
                </h1>
                <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">Create and manage DASH diet plans with AI-powered insights</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowAIChat(true)}
                className="inline-flex items-center px-3 py-2 border border-purple-300 text-xs font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                <Bot className="h-4 w-4 mr-1" />
                AI Nutritionist
              </button>
              <button
                onClick={() => setShowPatientSelectionModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                New DASH Plan
              </button>
            </div>
          </div>
        </div>

        {/* DASH Diet Information Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border/30 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground mb-2">About DASH Diet</h2>
              <p className="text-sm text-card-foreground mb-4">{dashDietInfo.description}</p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/20">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-card-foreground mb-3">Key Benefits</h3>
              <ul className="space-y-2">
                {dashDietInfo.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center text-sm text-card-foreground">
                    <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-card-foreground mb-3">Daily Food Groups</h3>
              <div className="space-y-2">
                {Object.entries(dashDietInfo.foodGroups).map(([group, servings]) => (
                  <div key={group} className="flex justify-between items-center text-sm">
                    <span className="text-card-foreground">{group}</span>
                    <span className="font-medium text-card-foreground">{servings}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Plans', value: searchStats.totalRecords, icon: FileText, color: 'primary' },
            { label: 'Active Plans', value: searchStats.activePlans, icon: CheckCircle, color: 'primary' },
            { label: 'Completed', value: searchStats.completedPlans, icon: Clock, color: 'primary' },
            { label: 'High Risk', value: dashDietRecords.filter(r => r.riskLevel === 'high').length, icon: AlertTriangle, color: 'destructive' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card rounded-lg shadow-sm border border-border/30 p-4">
              <div className="flex items-center">
                <div className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-${color}/20`}>
                  <Icon className={`h-4 w-4 text-${color}`} />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-card-foreground">{label}</p>
                  <p className="text-lg font-semibold text-card-foreground">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-card rounded-xl shadow-sm border border-border/30 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-border/40 rounded-md leading-5 bg-card placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-primary sm:text-sm"
                />
              </div>
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records Section */}
        <div className="bg-card rounded-xl shadow-sm border border-border/30 overflow-hidden">
          <div className="border-b border-border/30">
            <div className="px-6 py-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-muted-foreground">DASH Diet Plans</h3>
                <div className="flex space-x-1">
                  {(['active', 'history'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
                        }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)} ({dashDietRecords.filter(r => tab === 'active' ? r.status === 'active' : r.status !== 'active').length})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-sm font-medium text-muted-foreground">No DASH diet plans found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTab === 'active' ? 'No active DASH diet plans for the selected criteria.' : 'No completed DASH diet plans found.'}
                </p>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div key={record._id} className="p-6 hover:bg-muted/10 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/20">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <p className="text-sm font-medium text-muted-foreground truncate">{record.patientName}</p>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/20 text-muted-foreground">
                              {record.patientId}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(record.riskLevel)}`}>
                              {record.riskLevel.charAt(0).toUpperCase() + record.riskLevel.slice(1)} Risk
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                            {record.aiInsights?.summary && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                <Sparkles className="h-3 w-3 mr-1" /> AI Insights
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>BP: {record.bloodPressure.systolic}/{record.bloodPressure.diastolic} mmHg</span>
                            <span>BMI: {record.bmi}</span>
                            <span>Weight: {record.weight} kg</span>
                            <span>Height: {record.height} cm</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {record.dietaryRestrictions.map((restriction, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                {restriction}
                              </span>
                            ))}
                          </div>
                          {record.notes && (
                            <p className="mt-2 text-sm text-muted-foreground">{record.notes}</p>
                          )}

                          {/* AI Insights Panel */}
                          {record.aiInsights?.summary && (
                            <div className="mt-3">
                              <button
                                onClick={() => setExpandedInsights(expandedInsights === record._id ? null : record._id!)}
                                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
                              >
                                <Sparkles className="h-3 w-3" />
                                AI Clinical Insights
                                {expandedInsights === record._id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>

                              {expandedInsights === record._id && (
                                <div className="mt-2 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Bot className="h-4 w-4 text-purple-600" />
                                      <span className="text-xs font-semibold text-purple-700">AI Dietitian Analysis</span>
                                    </div>
                                    <button
                                      onClick={() => handleRegenerateInsights(record)}
                                      disabled={regeneratingInsights === record._id}
                                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                                    >
                                      <RefreshCw className={`h-3 w-3 ${regeneratingInsights === record._id ? 'animate-spin' : ''}`} />
                                      Refresh
                                    </button>
                                  </div>

                                  <p className="text-sm text-gray-700 mb-3 italic">{record.aiInsights.summary}</p>

                                  {record.aiInsights.recommendations && record.aiInsights.recommendations.length > 0 && (
                                    <div className="mb-3">
                                      <div className="flex items-center gap-1 mb-2">
                                        <Lightbulb className="h-3 w-3 text-amber-500" />
                                        <span className="text-xs font-semibold text-gray-700">Recommendations</span>
                                      </div>
                                      <ul className="space-y-1">
                                        {record.aiInsights.recommendations.map((rec, i) => (
                                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                            {rec}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {record.aiInsights.warnings && record.aiInsights.warnings.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-1 mb-2">
                                        <ShieldAlert className="h-3 w-3 text-red-500" />
                                        <span className="text-xs font-semibold text-gray-700">Clinical Warnings</span>
                                      </div>
                                      <ul className="space-y-1">
                                        {record.aiInsights.warnings.map((warn, i) => (
                                          <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                                            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                            {warn}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {record.aiInsights.generatedAt && (
                                    <p className="text-xs text-gray-400 mt-2">
                                      AI insights generated: {new Date(record.aiInsights.generatedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => {
                          setActiveChatRecord(record);
                          setShowAIChat(true);
                        }}
                        className="inline-flex items-center px-2 py-1.5 border border-purple-300 shadow-sm text-xs font-medium rounded text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none"
                        title="Ask AI about this patient"
                      >
                        <Bot className="h-3.5 w-3.5 mr-1" />
                        Ask AI
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPatientForEatingPlan({ id: record.patientId, name: record.patientName });
                          setShowEatingPlanModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-border/40 shadow-sm text-xs font-medium rounded text-muted-foreground bg-card hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Plan
                      </button>
                      <button
                        onClick={() => handleEdit(record)}
                        className="inline-flex items-center px-3 py-1.5 border border-border/40 shadow-sm text-xs font-medium rounded text-muted-foreground bg-card hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record._id!)}
                        className="inline-flex items-center px-3 py-1.5 border border-destructive/40 shadow-sm text-xs font-medium rounded text-destructive bg-card hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Chat Modal */}
        {showAIChat && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ height: '600px' }}>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-white/20">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">AI DASH Diet Nutritionist</h3>
                    <p className="text-xs text-purple-200">
                      {activeChatRecord ? `Context: ${activeChatRecord.patientName}` : 'General DASH Diet Assistant'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeChatRecord && (
                    <button
                      onClick={() => setActiveChatRecord(null)}
                      className="text-xs text-purple-200 hover:text-white px-2 py-1 rounded border border-purple-400 hover:border-white transition-colors"
                    >
                      Clear Context
                    </button>
                  )}
                  <button
                    onClick={() => { setShowAIChat(false); setActiveChatRecord(null); }}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Prompts */}
              {chatMessages.length <= 1 && (
                <div className="p-3 border-b bg-purple-50">
                  <p className="text-xs text-purple-600 font-medium mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-1">
                    {quickChatPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendChat(prompt)}
                        className="text-xs px-2 py-1 bg-white border border-purple-200 rounded-full text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mr-2 mt-1">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mr-2">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                    placeholder="Ask about DASH diet, meal plans, patient advice..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={() => handleSendChat()}
                    disabled={!chatInput.trim() || chatLoading}
                    className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  AI advice is for guidance only. Always consult the attending physician.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Patient Selection Modal */}
        {showPatientSelectionModal && (
          <div className="fixed inset-0 bg-muted bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-muted-foreground">Select Patient</h3>
                  <button
                    onClick={() => { setShowPatientSelectionModal(false); setPatientSearchTerm(''); setSearchResults([]); }}
                    className="text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search patients..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
                      className="block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                    />
                    <button onClick={searchPatients} className="absolute right-2 top-2 text-muted-foreground/50 hover:text-muted-foreground">
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {searchLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto">
                    {searchResults.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => { selectPatient(patient); setShowPatientSelectionModal(false); setShowForm(true); }}
                        className="p-3 hover:bg-muted/10 cursor-pointer border-b border-border/30 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-muted-foreground">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {patient.patientId}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-muted bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-muted-foreground">
                      {editingRecord ? 'Edit DASH Diet Plan' : 'Create New DASH Diet Plan'}
                    </h3>
                    {!editingRecord && (
                      <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                        <Sparkles className="h-3 w-3" />
                        AI insights will be automatically generated
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowForm(false); setEditingRecord(null); resetForm(); }}
                    className="text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Patient Name</label>
                      <input
                        type="text"
                        value={formData.patientName}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Plan Type</label>
                      <select
                        value={formData.planType}
                        onChange={(e) => setFormData(prev => ({ ...prev, planType: e.target.value as any }))}
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                      >
                        <option value="dash">DASH Diet</option>
                        <option value="low_sodium">Low Sodium DASH</option>
                        <option value="heart_healthy">Heart Healthy</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Systolic BP</label>
                      <input
                        type="number"
                        value={formData.bloodPressure.systolic}
                        onChange={(e) => setFormData(prev => ({ ...prev, bloodPressure: { ...prev.bloodPressure, systolic: e.target.value } }))}
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Diastolic BP</label>
                      <input
                        type="number"
                        value={formData.bloodPressure.diastolic}
                        onChange={(e) => setFormData(prev => ({ ...prev, bloodPressure: { ...prev.bloodPressure, diastolic: e.target.value } }))}
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Risk Level</label>
                      <select
                        value={formData.riskLevel}
                        onChange={(e) => setFormData(prev => ({ ...prev, riskLevel: e.target.value as any }))}
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                      >
                        <option value="low">Low Risk</option>
                        <option value="moderate">Moderate Risk</option>
                        <option value="high">High Risk</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Height (cm)</label>
                      <input
                        type="number"
                        value={formData.height}
                        onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">BMI</label>
                      <input
                        type="text"
                        value={formData.bmi}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm bg-muted/10 sm:text-sm"
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Dietary Restrictions</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {dietaryRestrictions.map((restriction) => (
                        <label key={restriction} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.dietaryRestrictions.includes(restriction)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, dietaryRestrictions: [...prev.dietaryRestrictions, restriction] }));
                              } else {
                                setFormData(prev => ({ ...prev, dietaryRestrictions: prev.dietaryRestrictions.filter(r => r !== restriction) }));
                              }
                            }}
                            className="h-4 w-4 text-primary focus:ring-green-500 border-border/40 rounded"
                          />
                          <span className="ml-2 text-sm text-muted-foreground">{restriction}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Diet Goals</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {dietGoals.map((goal) => (
                        <label key={goal} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.goals.includes(goal)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, goals: [...prev.goals, goal] }));
                              } else {
                                setFormData(prev => ({ ...prev, goals: prev.goals.filter(g => g !== goal) }));
                              }
                            }}
                            className="h-4 w-4 text-primary focus:ring-green-500 border-border/40 rounded"
                          />
                          <span className="ml-2 text-sm text-muted-foreground">{goal}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-primary sm:text-sm"
                      placeholder="Additional notes about the patient's condition or dietary requirements..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setEditingRecord(null); resetForm(); }}
                      className="px-4 py-2 border border-border/40 rounded-md shadow-sm text-sm font-medium text-muted-foreground bg-card hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center gap-2"
                    >
                      {!editingRecord && <Sparkles className="h-4 w-4" />}
                      {editingRecord ? 'Update Plan' : 'Create Plan with AI'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Eating Plan Modal */}
        {showEatingPlanModal && selectedPatientForEatingPlan && (
          <PrintableEatingPlan
            patientId={selectedPatientForEatingPlan.id}
            patientName={selectedPatientForEatingPlan.name}
            onClose={() => { setShowEatingPlanModal(false); setSelectedPatientForEatingPlan(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default DashDiet;
