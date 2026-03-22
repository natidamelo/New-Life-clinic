import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Heart, Plus, Eye, Edit, Trash2, Search, FileText, XCircle, User, Calendar, Clock, Wrench, Bot, Send, Sparkles, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldAlert, Lightbulb, Activity } from 'lucide-react';
import vitalSignsService from '../../services/vitalSignsService';
import PrintableEatingPlan from '../../components/PrintableEatingPlan';
import { getBMICategory } from '../../utils/vitalSignsUtils';
import { API_BASE_URL } from '../../config';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import api from '../../services/api';

interface AIAnalysis {
  summary: string;
  classification: string;
  trend: string;
  riskLevel: string;
  recommendations: string[];
  warnings: string[];
  lifestyle: string[];
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VitalSigns {
  _id: string;
  id?: string;
  patientId: string | object;
  patientName: string | object;
  name?: string | object;
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
  fileType: 'single' | 'weekly' | 'monthly';
  status?: 'normal' | 'warning' | 'critical';
  type?: string;
}

const BloodPressure: React.FC = () => {
  const { user, getToken } = useAuth();
  const [pendingVitalSigns, setPendingVitalSigns] = useState<VitalSigns[]>([]);
  const [completedVitalSigns, setCompletedVitalSigns] = useState<VitalSigns[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VitalSigns | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('all');
  const [selectedMeasurementType, setSelectedMeasurementType] = useState('blood_pressure');
  const [searchStats, setSearchStats] = useState({
    totalRecords: 0,
    timePeriod: 'all',
    status: 'all',
    completedRecords: 0,
    pendingTasks: 0
  });

  // Print functionality states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    frequency: 'daily',
    startDate: '',
    endDate: '',
    patientId: '',
    patientName: '',
    includeNotes: true
  });
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'procedures'>('pending');
  const [bloodPressureProcedures, setBloodPressureProcedures] = useState<any[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [showEatingPlanModal, setShowEatingPlanModal] = useState(false);
  const [showPatientSelectionModal, setShowPatientSelectionModal] = useState(false);
  const [selectedPatientForEatingPlan, setSelectedPatientForEatingPlan] = useState<{id: string, name: string} | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [allPatientsWithVitals, setAllPatientsWithVitals] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    systolic: '',
    diastolic: '',
    pulse: '',
    temperature: '',
    weight: '',
    height: '',
    bmi: '',
    spo2: '',
    respiratoryRate: '',
    bloodSugar: '',
    position: 'sitting',
    arm: 'left',
    notes: '',
    fileType: 'single' as 'single' | 'weekly' | 'monthly',
    taskId: '' // Add taskId for nurse task completion
  });

  // AI state
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMessages, setAIChatMessages] = useState<AIChatMessage[]>([{
    role: 'assistant',
    content: 'Hello! I\'m your AI Cardiology assistant. I can analyze blood pressure readings, explain BP classifications, and provide clinical guidance. How can I help you today?',
    timestamp: new Date()
  }]);
  const [aiChatInput, setAIChatInput] = useState('');
  const [aiChatLoading, setAIChatLoading] = useState(false);
  const [activeChatRecord, setActiveChatRecord] = useState<VitalSigns | null>(null);
  const [aiAnalysisMap, setAIAnalysisMap] = useState<Record<string, AIAnalysis>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickChatPrompts = [
    'What is Stage 2 Hypertension?',
    'When should I escalate to a doctor?',
    'What causes high blood pressure?',
    'How to take accurate BP readings?'
  ];

  // Auto-calculate BMI when weight or height changes
  useEffect(() => {
    if (formData.weight && formData.height) {
      const weight = parseFloat(formData.weight);
      const height = parseFloat(formData.height) / 100; // Convert cm to meters
      if (weight > 0 && height > 0) {
        const bmi = (weight / (height * height)).toFixed(1);
        const category = getBMICategory(bmi);
        const bmiWithCategory = `${bmi} (${category})`;
        setFormData(prev => ({ ...prev, bmi: bmiWithCategory }));
      }
    }
  }, [formData.weight, formData.height]);

  useEffect(() => {
    fetchVitalSigns();
    fetchBloodPressureProcedures();
    // Debug: Check what's in the database
    debugNurseTasks();
  }, []);

  // Debug function to check nurse tasks
  const debugNurseTasks = async () => {
    try {
      console.log('🔍 [Debug] Checking nurse tasks in database...');
      const response = await fetch('/api/vital-signs/debug/tasks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clinic_auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('🔍 [Debug] Nurse tasks debug data:', data);
    } catch (error) {
      console.error('❌ [Debug] Error checking nurse tasks:', error);
    }
  };

  // Fetch all patients with vital signs records for eating plan
  const fetchAllPatientsWithVitals = async () => {
    try {
      setLoadingPatients(true);
      console.log('🔍 [BloodPressure] Fetching all patients with vital signs...');
      
      // Get all vital signs records to extract unique patients
      const [allPending, allCompleted] = await Promise.all([
        vitalSignsService.getPendingVitalSigns('comprehensive'),
        vitalSignsService.getVitalSignsHistory('comprehensive')
      ]);
      
      // Combine all records
      const allRecords = [
        ...(Array.isArray(allPending) ? allPending : []),
        ...(Array.isArray(allCompleted) ? allCompleted : [])
      ];
      
      // Get unique patients from all records
      const uniquePatients = new Map();
      
      allRecords.forEach(record => {
        const patientId = record.patientId || record.id || record._id;
        const patientName = record.patientName || record.name || 'Unknown Patient';
        
        if (patientId && !uniquePatients.has(patientId)) {
          uniquePatients.set(patientId, {
            _id: record._id,
            patientId: patientId,
            patientName: patientName,
            systolic: record.systolic,
            diastolic: record.diastolic,
            bloodSugar: record.bloodSugar,
            weight: record.weight,
            height: record.height,
            bmi: record.bmi,
            measurementDate: record.measurementDate || record.createdAt || record.recordedAt,
            status: record.systolic && record.diastolic ? 'completed' : 'pending'
          });
        }
      });
      
      const patientsArray = Array.from(uniquePatients.values());
      setAllPatientsWithVitals(patientsArray);
      
      console.log('✅ [BloodPressure] Found unique patients with vitals:', patientsArray.length);
    } catch (error) {
      console.error('❌ [BloodPressure] Error fetching patients with vitals:', error);
      toast.error('Failed to load patients for eating plan');
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchBloodPressureProcedures = async () => {
    try {
      setLoadingProcedures(true);
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/procedures?procedureType=blood_pressure`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Also filter by name/description to catch any procedures with "blood pressure" in the name
        const filtered = data.filter((p: any) => {
          const isBloodPressureType = p.procedureType === 'blood_pressure' || 
                                      p.procedureType?.toLowerCase().includes('blood_pressure');
          const hasBloodPressureName = p.procedureName?.toLowerCase().includes('blood pressure') ||
                                       p.description?.toLowerCase().includes('blood pressure');
          return isBloodPressureType || hasBloodPressureName;
        });
        setBloodPressureProcedures(filtered);
      } else {
        console.error('Failed to fetch blood pressure procedures');
      }
    } catch (error) {
      console.error('Error fetching blood pressure procedures:', error);
    } finally {
      setLoadingProcedures(false);
    }
  };

  const updateProcedureStatus = async (procedureId: string, status: string) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/procedures/${procedureId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success('Procedure status updated successfully');
        fetchBloodPressureProcedures();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update procedure status');
      }
    } catch (error: any) {
      console.error('Update procedure status error:', error);
      toast.error(`Failed to update procedure status: ${error.message}`);
    }
  };

  const fetchVitalSigns = async () => {
    try {
      setLoading(true);
      console.log('🔍 [BloodPressure] Starting to fetch vital signs...');
      
      // Fetch pending nurse tasks and completed vital signs records
      const [pendingTasks, completedBloodPressure, completedComprehensive] = await Promise.all([
        vitalSignsService.getPendingVitalSigns('blood_pressure'),
        vitalSignsService.getVitalSignsHistory('blood_pressure'),
        vitalSignsService.getVitalSignsHistory('comprehensive')
      ]);
      
      // Filter comprehensive records to only include those with blood pressure data
      const bloodPressureFromComprehensive = (completedComprehensive || []).filter(record => 
        record.systolic && record.diastolic
      );
      
      // Pending records: Only nurse tasks that are still PENDING
      const allPendingRecords = Array.isArray(pendingTasks) ? pendingTasks : [];
      
      // Completed records: All vital signs records that have been recorded
      const allCompletedRecords = [
        ...(Array.isArray(completedBloodPressure) ? completedBloodPressure : []),
        ...bloodPressureFromComprehensive
      ];
      
      console.log('📊 [BloodPressure] Pending tasks:', allPendingRecords.length);
      console.log('📊 [BloodPressure] Completed records:', allCompletedRecords.length);
      console.log('📊 [BloodPressure] Sample pending task:', allPendingRecords[0]);
      console.log('📊 [BloodPressure] Sample completed record:', allCompletedRecords[0]);
      console.log('📊 [BloodPressure] Raw pending tasks from API:', pendingTasks);
      console.log('📊 [BloodPressure] Raw completed blood pressure from API:', completedBloodPressure);
      console.log('📊 [BloodPressure] Raw completed comprehensive from API:', completedComprehensive);
      
      setPendingVitalSigns(allPendingRecords.map(r => ({
        ...r,
        measurementDate: typeof r.measurementDate === 'string' ? r.measurementDate : new Date(r.measurementDate).toISOString()
      })) as any);
      setCompletedVitalSigns(allCompletedRecords as unknown as VitalSigns[]);
    } catch (error) {
      console.error('❌ [BloodPressure] Error fetching vital signs:', error);
      toast.error('Failed to load blood pressure records');
      setPendingVitalSigns([]);
      setCompletedVitalSigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a patient name to search');
      return;
    }

    try {
      setSearchLoading(true);
      setShowSearchModal(true);
      
      // Determine the status based on the active tab
      const searchStatus = activeTab === 'pending' ? 'pending' : 'completed';
      
      // Use the enhanced search service method with time period, measurement type, and status
      const response = await vitalSignsService.searchVitalSignsByPatientName(
        searchTerm, 
        selectedTimePeriod, 
        selectedMeasurementType,
        searchStatus
      );
      
      setSearchResults(response.data || []);
      setSearchStats({
        totalRecords: response.totalRecords || 0,
        timePeriod: response.timePeriod || 'all',
        status: response.status || 'all',
        completedRecords: response.completedRecords || 0,
        pendingTasks: response.pendingTasks || 0
      });
    } catch (error) {
      console.error('Error searching vital signs:', error);
      toast.error('Failed to search blood pressure records');
      setSearchResults([]);
      setSearchStats({ 
        totalRecords: 0, 
        timePeriod: 'all',
        status: 'all',
        completedRecords: 0,
        pendingTasks: 0
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 [BloodPressure] Form submission started');
    console.log('📊 [BloodPressure] Form data:', formData);
    console.log('🔐 [BloodPressure] User context:', user);
    console.log('🔐 [BloodPressure] Auth token check:', localStorage.getItem('clinic_auth_token') ? 'Token found' : 'No token');
    
    if (!formData.patientId || !formData.patientName) {
      toast.error('Please fill in patient ID and name');
      return;
    }

    // Check if at least one vital sign is recorded
    const hasVitalSigns = formData.systolic || formData.diastolic || formData.pulse || 
                         formData.temperature || formData.weight || formData.height || 
                         formData.spo2 || formData.respiratoryRate || formData.bloodSugar;
    
    console.log('🔍 [BloodPressure] Has vital signs:', hasVitalSigns);
    console.log('📊 [BloodPressure] Vital signs values:', {
      systolic: formData.systolic,
      diastolic: formData.diastolic,
      pulse: formData.pulse,
      temperature: formData.temperature,
      weight: formData.weight,
      height: formData.height,
      spo2: formData.spo2,
      respiratoryRate: formData.respiratoryRate,
      bloodSugar: formData.bloodSugar
    });
    
    if (!hasVitalSigns) {
      toast.error('Please record at least one vital sign measurement');
      return;
    }

    try {
      const vitalSignsData = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        measurementType: 'comprehensive' as 'height' | 'weight' | 'blood_pressure' | 'temperature' | 'pulse' | 'comprehensive',
        measurementDate: new Date(),
        systolic: formData.systolic ? parseInt(formData.systolic) : undefined,
        diastolic: formData.diastolic ? parseInt(formData.diastolic) : undefined,
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        bmi: formData.bmi ? parseFloat(formData.bmi) : undefined,
        spo2: formData.spo2 ? parseInt(formData.spo2) : undefined,
        respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : undefined,
        bloodSugar: formData.bloodSugar ? parseFloat(formData.bloodSugar) : undefined,
        position: formData.position,
        arm: formData.arm,
        notes: formData.notes,
        fileType: formData.fileType,
        location: 'Clinic',
        device: 'Standard Device',
        taskId: formData.taskId || undefined // Include taskId if available
      } as any;

      console.log('🔍 [BloodPressure] Sending vital signs data:', vitalSignsData);
      
      if (editingRecord) {
        console.log('🔍 [BloodPressure] Updating existing record');
        await vitalSignsService.updateVitalSigns(editingRecord._id, vitalSignsData);
        toast.success('Blood pressure record updated successfully');
      } else {
        console.log('🔍 [BloodPressure] Creating new record');
        const result = await vitalSignsService.saveVitalSigns(vitalSignsData);
        console.log('✅ [BloodPressure] Save result:', result);
        toast.success('Blood pressure record saved successfully');
      }

      setShowForm(false);
      setEditingRecord(null);
      resetForm();
      fetchVitalSigns();
      // Refresh patients list for eating plan
      fetchAllPatientsWithVitals();
    } catch (error) {
      console.error('❌ [BloodPressure] Error saving vital signs:', error);
      console.error('❌ [BloodPressure] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Failed to save blood pressure record');
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      patientName: '',
      systolic: '',
      diastolic: '',
      pulse: '',
      temperature: '',
      weight: '',
      height: '',
      bmi: '',
      spo2: '',
      respiratoryRate: '',
      bloodSugar: '',
      position: 'sitting',
      arm: 'left',
      notes: '',
      fileType: 'single',
      taskId: ''
    });
  };

  const handleEdit = (record: VitalSigns) => {
    setEditingRecord(record);
    
    // Helper function to extract patient name safely
    const getPatientName = (record: any) => {
      if (typeof record?.patientName === 'string') {
        return record.patientName;
      } else if (typeof record?.patientName === 'object' && record?.patientName !== null) {
        return record.patientName.fullName || 
               record.patientName.name || 
               `${record.patientName.firstName || ''} ${record.patientName.lastName || ''}`.trim() ||
               '';
      } else if (typeof record?.name === 'string') {
        return record.name;
      } else if (typeof record?.name === 'object' && record?.name !== null) {
        return record.name.fullName || 
               record.name.name || 
               `${record.name.firstName || ''} ${record.name.lastName || ''}`.trim() ||
               '';
      }
      return '';
    };
    
    // Helper function to extract patient ID safely
    const getPatientId = (record: any) => {
      if (typeof record?.patientId === 'string') {
        return record.patientId;
      } else if (typeof record?.patientId === 'object' && record?.patientId !== null) {
        return record.patientId._id || record.patientId.id || '';
      } else if (typeof record?.id === 'string') {
        return record.id;
      } else if (typeof record?.id === 'object' && record?.id !== null) {
        return record.id._id || record.id.id || '';
      }
      return '';
    };
    
    setFormData({
      patientId: getPatientId(record),
      patientName: getPatientName(record),
      systolic: record.systolic?.toString() || '',
      diastolic: record.diastolic?.toString() || '',
      pulse: record.pulse?.toString() || '',
      temperature: record.temperature?.toString() || '',
      weight: record.weight?.toString() || '',
      height: record.height?.toString() || '',
      bmi: record.bmi?.toString() || '',
      spo2: record.spo2?.toString() || '',
      respiratoryRate: record.respiratoryRate?.toString() || '',
      bloodSugar: record.bloodSugar?.toString() || '',
      position: record.position || 'sitting',
      arm: record.arm || 'left',
      notes: record.notes || '',
      fileType: record.fileType,
      taskId: (record as any).taskId || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await vitalSignsService.deleteVitalSigns(recordId);
      toast.success('Blood pressure record deleted successfully');
      fetchVitalSigns();
    } catch (error) {
      console.error('Error deleting vital signs:', error);
      toast.error('Failed to delete blood pressure record');
    }
  };

  const handleGenerateEatingPlan = (patientId: string, patientName: string) => {
    setSelectedPatientForEatingPlan({ id: patientId, name: patientName });
    setShowEatingPlanModal(true);
  };

  const handleCompleteTask = (task: any) => {
    // Pre-fill the form with patient information from the task
    setFormData({
      patientId: task?.patientId || task?.id || '',
      patientName: task?.patientName || task?.name || '',
      systolic: '',
      diastolic: '',
      pulse: '',
      temperature: '',
      weight: '',
      height: '',
      bmi: '',
      spo2: '',
      respiratoryRate: '',
      bloodSugar: '',
      position: 'sitting',
      arm: 'left',
      notes: '',
      fileType: 'single',
      taskId: task?._id || task?.id || '' // Store the task ID for completion
    });
    setShowForm(true);
  };

  // Print functionality
  const handlePrintRecord = (patientId: string, patientName: string) => {
    setPrintOptions(prev => ({
      ...prev,
      patientId,
      patientName,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }));
    setShowPrintModal(true);
  };

  const handlePrint = async () => {
    try {
      const { frequency, startDate, endDate, patientId, patientName, includeNotes } = printOptions;
      
      // Show loading state
      console.log('🖨️ [Print] Starting print process...');
      
      // Validate required fields
      if (!patientId) {
        toast.error('Patient ID is required for printing');
        return;
      }
      
      if (!startDate || !endDate) {
        toast.error('Please select a date range for the report');
        return;
      }
      
      // Fetch fresh data from backend based on date range
      console.log('🖨️ [Print] Fetching records from backend...');
      const response = await vitalSignsService.getPatientRecordsForPrint(
        patientId,
        startDate,
        endDate,
        selectedMeasurementType
      );
      
      if (!response || !response.success) {
        console.error('🖨️ [Print] Backend response error:', response);
        toast.error('Failed to fetch patient records from server');
        return;
      }
      
      const records = response.data?.records || [];
      const actualPatientName = response.data?.patient?.name || patientName;
      
      console.log('🖨️ [Print] Fetched records:', {
        patientName: actualPatientName,
        recordCount: records.length,
        dateRange: { startDate, endDate }
      });
      
      // Generate print content
      console.log('🖨️ [Print] Generating print content...');
      const printContent = generatePrintContent(records, {
        frequency,
        patientName: actualPatientName,
        startDate,
        endDate,
        includeNotes
      });

      // Open print window
      console.log('🖨️ [Print] Opening print window...');
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Unable to open print window. Please check your popup blocker.');
        return;
      }

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait a moment before printing
      setTimeout(() => {
        printWindow.print();
      }, 100);
      
      // Close the print modal
      setShowPrintModal(false);
      
      toast.success(`Print report generated with ${records.length} records`);
      
    } catch (error) {
      console.error('❌ [Print] Error printing records:', error);
      toast.error(`Failed to generate print report: ${error.message || 'Unknown error'}`);
    }
  };

  const generatePrintContent = (records: any[], options: any) => {
    const { frequency, patientName, startDate, endDate, includeNotes } = options;
    
    const formatDate = (date: string) => new Date(date).toLocaleDateString();
    const formatTime = (date: string) => new Date(date).toLocaleTimeString();
    
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Blood Pressure Report - ${patientName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
          .report-title { font-size: 20px; font-weight: bold; color: #374151; margin-bottom: 10px; }
          .report-details { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
          .patient-info { margin-bottom: 20px; background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; }
          .report-info { margin-bottom: 20px; font-size: 14px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
          .status-normal { color: #059669; font-weight: bold; }
          .status-warning { color: #d97706; font-weight: bold; }
          .status-critical { color: #dc2626; font-weight: bold; }
          .summary { margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
          .chart-placeholder { text-align: center; padding: 20px; background-color: #f0f0f0; margin: 20px 0; border-radius: 8px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          @media print { 
            body { margin: 0; padding: 15px; } 
            .no-print { display: none; } 
            .header { page-break-inside: avoid; }
            .summary { page-break-inside: avoid; }
            @page { margin: 0.5in; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">NEW LIFE CLINIC HEALTHCARE CENTER</div>
          <div class="report-title">Blood Pressure Report</div>
          <div class="report-details">
            Region: Addis Ababa | Report Type: ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Report | 
            Generated on: ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} at ${new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div class="patient-info">
          <h3 style="margin-top: 0; color: #1e40af;">Patient Information</h3>
          <p><strong>Patient Name:</strong> ${patientName}</p>
          <p><strong>Report Period:</strong> ${formatDate(startDate)} - ${formatDate(endDate)}</p>
          <p><strong>Report Type:</strong> ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Blood Pressure Report</p>
          <p><strong>Total Records:</strong> ${records.length}</p>
        </div>
    `;

    if (records.length > 0) {
      content += `
        <h3 style="color: #1e40af; margin-bottom: 15px;">Blood Pressure Records</h3>
        <table>
          <thead>
            <tr>
              <th style="background-color: #1e40af; color: white;">Date</th>
              <th style="background-color: #1e40af; color: white;">Time</th>
              <th style="background-color: #1e40af; color: white;">Blood Pressure</th>
              <th style="background-color: #1e40af; color: white;">Status</th>
              <th style="background-color: #1e40af; color: white;">Position/Arm</th>
              <th style="background-color: #1e40af; color: white;">Notes</th>
              <th style="background-color: #1e40af; color: white;">Recorded By</th>
            </tr>
          </thead>
          <tbody>
      `;

      records.forEach(record => {
        const status = getBPStatus(record.systolic, record.diastolic);
        const statusClass = `status-${status}`;
        const bpValue = record.systolic && record.diastolic ? 
          `${record.systolic}/${record.diastolic} mmHg` : 'N/A';
        
        content += `
          <tr>
            <td>${formatDate(record.measurementDate || record.createdAt)}</td>
            <td>${formatTime(record.measurementDate || record.createdAt)}</td>
            <td>${bpValue}</td>
            <td class="${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
            <td>${(record.position || 'sitting').charAt(0).toUpperCase() + (record.position || 'sitting').slice(1)} / ${(record.arm || 'left').charAt(0).toUpperCase() + (record.arm || 'left').slice(1)}</td>
            <td>${includeNotes ? (record.notes || 'No notes') : 'N/A'}</td>
            <td>${record.measuredByName || 'N/A'}</td>
          </tr>
        `;
      });

      content += `
          </tbody>
        </table>
      `;

      // Add summary statistics
      const avgSystolic = records.reduce((sum, r) => sum + (r.systolic || 0), 0) / records.length;
      const avgDiastolic = records.reduce((sum, r) => sum + (r.diastolic || 0), 0) / records.length;
      const normalCount = records.filter(r => getBPStatus(r.systolic, r.diastolic) === 'normal').length;
      const warningCount = records.filter(r => getBPStatus(r.systolic, r.diastolic) === 'warning').length;
      const criticalCount = records.filter(r => getBPStatus(r.systolic, r.diastolic) === 'critical').length;

      content += `
        <div class="summary">
          <h3 style="color: #1e40af; margin-top: 0;">Summary Statistics</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p><strong>Average Blood Pressure:</strong> ${avgSystolic.toFixed(1)}/${avgDiastolic.toFixed(1)} mmHg</p>
              <p><strong>Total Readings:</strong> ${records.length}</p>
            </div>
            <div>
              <p><strong>Normal Readings:</strong> ${normalCount} (${((normalCount/records.length)*100).toFixed(1)}%)</p>
              <p><strong>Warning Readings:</strong> ${warningCount} (${((warningCount/records.length)*100).toFixed(1)}%)</p>
              <p><strong>Critical Readings:</strong> ${criticalCount} (${((criticalCount/records.length)*100).toFixed(1)}%)</p>
            </div>
          </div>
        </div>
      `;

      // Chart section removed as requested
    } else {
      content += `
        <div class="summary">
          <p>No blood pressure records found for the selected period.</p>
        </div>
      `;
    }

    content += `
        <div class="footer">
          <p>This report was generated by New Life Clinic Healthcare Center</p>
          <p>For questions about this report, please contact the clinic administration</p>
          <p>Report generated on ${new Date().toLocaleString()} | Page 1 of 1</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Print Report</button>
          <button onclick="window.close()" style="padding: 10px 20px; background-color: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `;

    return content;
  };

  // AI functions — pass the VitalSigns record _id in URL, patient data in body
  const handleAIAnalyze = async (record: VitalSigns) => {
    const key = record._id;
    if (!key) return;
    try {
      setLoadingAnalysis(key);
      const patientIdVal = record.patientId && typeof record.patientId === 'object'
        ? (record.patientId as any)._id || (record.patientId as any).id
        : typeof record.patientId === 'string' ? record.patientId : undefined;
      const patientNameVal = typeof record.patientName === 'string'
        ? record.patientName
        : record.patientName && typeof record.patientName === 'object'
          ? (record.patientName as any).fullName || ((record.patientName as any).firstName || '') + ' ' + ((record.patientName as any).lastName || '')
          : '';
      const response = await api.post(`/api/vital-signs/ai-analyze/${record._id}`, {
        patientId: patientIdVal,
        patientName: patientNameVal.trim(),
        systolic: record.systolic,
        diastolic: record.diastolic,
        pulse: record.pulse,
        spo2: record.spo2,
        bloodSugar: record.bloodSugar,
        bmi: record.bmi
      });
      if (response.data.success && response.data.analysis) {
        setAIAnalysisMap(prev => ({ ...prev, [key]: response.data.analysis }));
        setExpandedAnalysis(key);
        if (!response.data.isAIAvailable) {
          toast('AI not configured. Add GEMINI_API_KEY to enable.', { icon: '⚙️' });
        } else {
          toast.success('AI analysis complete!');
        }
      }
    } catch (error) {
      toast.error('Failed to get AI analysis');
    } finally {
      setLoadingAnalysis(null);
    }
  };

  const handleSendAIChat = async (messageText?: string) => {
    const msg = messageText || aiChatInput.trim();
    if (!msg || aiChatLoading) return;
    const userMsg: AIChatMessage = { role: 'user', content: msg, timestamp: new Date() };
    setAIChatMessages(prev => [...prev, userMsg]);
    setAIChatInput('');
    setAIChatLoading(true);
    try {
      const patientContext = activeChatRecord ? {
        patientName: typeof activeChatRecord.patientName === 'string' ? activeChatRecord.patientName : 'Unknown',
        systolic: activeChatRecord.systolic,
        diastolic: activeChatRecord.diastolic,
        pulse: activeChatRecord.pulse,
        spo2: activeChatRecord.spo2,
        bloodSugar: activeChatRecord.bloodSugar,
        bmi: activeChatRecord.bmi,
        position: activeChatRecord.position,
        classification: activeChatRecord.systolic && activeChatRecord.diastolic
          ? (activeChatRecord.systolic >= 180 || activeChatRecord.diastolic >= 110 ? 'Hypertensive Crisis'
            : activeChatRecord.systolic >= 140 || activeChatRecord.diastolic >= 90 ? 'Stage 2 Hypertension'
            : activeChatRecord.systolic >= 130 || activeChatRecord.diastolic >= 80 ? 'Stage 1 Hypertension'
            : 'Normal') : 'Unknown'
      } : undefined;
      const response = await api.post('/api/vital-signs/ai-chat', {
        message: msg,
        patientContext,
        chatHistory: aiChatMessages.slice(-4).map(m => ({ role: m.role, content: m.content }))
      });
      setAIChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.reply || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      }]);
    } catch {
      setAIChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setAIChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const getClassificationColor = (classification: string) => {
    if (!classification) return 'bg-gray-100 text-gray-700';
    const c = classification.toLowerCase();
    if (c.includes('crisis')) return 'bg-red-100 text-red-800 border border-red-300';
    if (c.includes('stage 2')) return 'bg-orange-100 text-orange-800 border border-orange-300';
    if (c.includes('stage 1')) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    if (c.includes('elevated')) return 'bg-amber-100 text-amber-800 border border-amber-300';
    if (c.includes('normal')) return 'bg-green-100 text-green-800 border border-green-300';
    if (c.includes('hypotension')) return 'bg-blue-100 text-blue-800 border border-blue-300';
    return 'bg-gray-100 text-gray-700';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (trend === 'worsening') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === 'stable') return <Minus className="h-4 w-4 text-blue-500" />;
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getRiskBadgeColor = (risk: string) => {
    if (risk === 'critical') return 'bg-red-100 text-red-800';
    if (risk === 'high') return 'bg-orange-100 text-orange-800';
    if (risk === 'moderate') return 'bg-yellow-100 text-yellow-800';
    if (risk === 'low') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-700';
  };

  const getBPStatus = (systolic: number, diastolic: number) => {
    if (systolic >= 180 || diastolic >= 110) return 'critical';
    if (systolic >= 140 || diastolic >= 90) return 'warning';
    return 'normal';
  };

  const getBPStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-destructive bg-destructive/10';
      case 'warning': return 'text-accent-foreground bg-accent/10';
      case 'pending': return 'text-primary bg-primary/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  // Pagination logic
  const getCurrentPageRecords = () => {
    const allRecords = activeTab === 'pending' ? pendingVitalSigns : completedVitalSigns;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return allRecords.slice(startIndex, endIndex);
  };

  // Update pagination when records change
  useEffect(() => {
    const allRecords = activeTab === 'pending' ? pendingVitalSigns : completedVitalSigns;
    const totalPages = Math.ceil(allRecords.length / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: allRecords.length,
      pages: totalPages,
      page: prev.page > totalPages ? 1 : prev.page
    }));
  }, [pendingVitalSigns, completedVitalSigns, activeTab, pagination.limit]);

  // Reset pagination when switching tabs
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-2 lg:mb-0">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-destructive/20">
                  <Heart className="h-4 w-4 text-destructive" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg lg:text-xl font-bold text-muted-foreground flex items-center gap-2">
                  Blood Pressure Management
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-600 border border-purple-200">
                    <Sparkles className="h-3 w-3" /> AI Enhanced
                  </span>
                </h1>
                <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">Record and manage vital signs with AI-powered clinical analysis</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowAIChat(true)}
                className="flex items-center justify-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 shadow-sm"
              >
                <Bot className="h-4 w-4 mr-1.5" />
                <span className="text-sm font-medium">AI Cardiologist</span>
              </button>
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center justify-center px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors duration-200 shadow-sm"
              >
                <Search className="h-4 w-4 mr-1.5" />
                <span className="text-sm font-medium">Search History</span>
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center px-3 py-1.5 bg-destructive text-primary-foreground rounded-md hover:bg-destructive transition-colors duration-200 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="text-sm font-medium">New Vital Signs Record</span>
              </button>
              <button
                onClick={async () => {
                  await fetchAllPatientsWithVitals();
                  setShowPatientSelectionModal(true);
                }}
                className="flex items-center justify-center px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors duration-200 shadow-sm"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                <span className="text-sm font-medium">Generate Eating Plan</span>
              </button>
            </div>
          </div>
        </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2">
          <div className="bg-primary-foreground rounded-lg p-3 w-full max-w-4xl">
            <h2 className="text-base font-bold mb-2">
              {editingRecord ? 'Edit Vital Signs Record' : 'New Vital Signs Record'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Patient Information Section */}
              <div className="border-b pb-2">
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">Patient Information</h3>
                                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Patient ID *
                      </label>
                      <input
                        type="text"
                        value={formData.patientId}
                        onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Patient Name *
                      </label>
                      <input
                        type="text"
                        value={formData.patientName}
                        onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        required
                      />
                    </div>
                  </div>
              </div>

              {/* Blood Pressure Section */}
              <div className="border-b pb-2">
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">Blood Pressure (Required)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                      Systolic (mmHg) *
                    </label>
                    <input
                      type="number"
                      value={formData.systolic}
                      onChange={(e) => setFormData({...formData, systolic: e.target.value})}
                      className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                      Diastolic (mmHg) *
                    </label>
                    <input
                      type="number"
                      value={formData.diastolic}
                      onChange={(e) => setFormData({...formData, diastolic: e.target.value})}
                      className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Additional Vital Signs - Optional */}
              <div className="border-b pb-2">
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">Additional Vital Signs (Optional)</h3>
                
                {/* Cardiovascular */}
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Cardiovascular</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Pulse (bpm)
                      </label>
                      <input
                        type="number"
                        value={formData.pulse}
                        onChange={(e) => setFormData({...formData, pulse: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="e.g., 72"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        SpO2 (%)
                      </label>
                      <input
                        type="number"
                        value={formData.spo2}
                        onChange={(e) => setFormData({...formData, spo2: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="e.g., 98"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Temperature & Respiratory */}
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Temperature & Respiratory</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Temperature (°C)
                      </label>
                      <input
                        type="number"
                        value={formData.temperature}
                        onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="e.g., 36.8"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Respiratory Rate (breaths/min)
                      </label>
                      <input
                        type="number"
                        value={formData.respiratoryRate}
                        onChange={(e) => setFormData({...formData, respiratoryRate: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="e.g., 16"
                      />
                    </div>
                  </div>
                </div>

                {/* Blood Sugar */}
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Blood Sugar <span className="text-xs text-primary">(Optional)</span></h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Blood Sugar (mg/dL)
                      </label>
                      <input
                        type="number"
                        value={formData.bloodSugar}
                        onChange={(e) => setFormData({...formData, bloodSugar: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="e.g., 100 (optional)"
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Anthropometric */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Anthropometric</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData({...formData, weight: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="e.g., 70"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        value={formData.height}
                        onChange={(e) => setFormData({...formData, height: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                        placeholder="e.g., 170"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                        BMI
                      </label>
                      <input
                        type="text"
                        value={formData.bmi}
                        onChange={(e) => setFormData({...formData, bmi: e.target.value})}
                        className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-muted/10 text-xs"
                        placeholder="Auto-calculated with category"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="border-b pb-2">
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">Additional Settings</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                      Position
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                    >
                      <option value="sitting">Sitting</option>
                      <option value="standing">Standing</option>
                      <option value="lying">Lying</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                      Arm
                    </label>
                    <select
                      value={formData.arm}
                      onChange={(e) => setFormData({...formData, arm: e.target.value})}
                      className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                      File Type
                    </label>
                    <select
                      value={formData.fileType}
                      onChange={(e) => setFormData({...formData, fileType: e.target.value as 'single' | 'weekly' | 'monthly'})}
                      className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                    >
                      <option value="single">Single Record</option>
                      <option value="weekly">Weekly File</option>
                      <option value="monthly">Monthly File</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-0.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-2 py-1 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                  rows={2}
                  placeholder="Enter any additional notes or observations..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingRecord(null);
                    resetForm();
                  }}
                  className="px-3 py-1 text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-destructive text-primary-foreground rounded-md hover:bg-destructive font-medium text-xs"
                >
                  {editingRecord ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Records Section with Tabs */}
        <div className="bg-primary-foreground rounded-xl shadow-sm border border-border/30 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-border/30">
            <div className="px-6 py-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-muted-foreground">Blood Pressure Records</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'pending'
                        ? 'bg-destructive text-primary-foreground'
                        : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
                    }`}
                  >
                    Pending ({pendingVitalSigns.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'history'
                        ? 'bg-destructive text-primary-foreground'
                        : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
                    }`}
                  >
                    History ({completedVitalSigns.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('procedures');
                      fetchBloodPressureProcedures();
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'procedures'
                        ? 'bg-destructive text-primary-foreground'
                        : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
                    }`}
                  >
                    Procedures ({bloodPressureProcedures.length})
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Pending and History Tabs Content */}
        {(activeTab === 'pending' || activeTab === 'history') && (
          <>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-destructive mx-auto mb-4"></div>
                <p className="text-muted-foreground font-medium">Loading vital signs records...</p>
                <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch your data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-muted/10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vital Signs
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Position/Arm
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      File Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Recorded
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                             <tbody className="bg-primary-foreground divide-y divide-gray-200">
                 {getCurrentPageRecords().map((record) => {
                   // Check if this is a pending task or completed record
                    const isPendingTask = activeTab === 'pending' || (record.status as any) === 'PENDING' || record.type === 'VITAL_SIGNS';
                   const status = isPendingTask ? 'pending' : getBPStatus(record.systolic, record.diastolic);
                   
                   // Extract the Patient's MongoDB _id from the record.
                   // After .populate(), patientId becomes an object { _id, firstName, lastName, patientId }
                   // We need the _id (Patient document ID) to query VitalSigns by patientId ref.
                   const recordPatientId = (() => {
                     const pid = record.patientId;
                     if (pid && typeof pid === 'object') {
                       return (pid as any)._id?.toString() || (pid as any).id?.toString() || record._id;
                     }
                     if (typeof pid === 'string' && pid.length === 24) return pid; // MongoDB ObjectId string
                     // Fallback: use the record's own _id and let backend resolve it
                     return record._id;
                   })();
                   const recordKey = record._id;
                   const recordAnalysis = aiAnalysisMap[recordKey];

                   return (
                     <React.Fragment key={record._id}>
                     <tr className={`hover:bg-muted/10 transition-colors duration-150 ${isPendingTask ? 'bg-accent/10 border-l-4 border-l-yellow-400' : ''}`}>
                       <td className="px-3 py-2 whitespace-nowrap">
                         <div>
                           <div className="text-xs font-semibold text-muted-foreground">
                             {(() => {
                               // Handle both string and object formats for patient name
                               if (typeof record?.patientName === 'string') {
                                 return record.patientName;
                               } else if (typeof record?.patientName === 'object' && record?.patientName !== null) {
                                // If patientName is an object, extract the name
                                return (record.patientName as any).fullName || 
                                       (record.patientName as any).name || 
                                       `${(record.patientName as any).firstName || ''} ${(record.patientName as any).lastName || ''}`.trim() ||
                                        'Unknown Patient';
                               } else if (typeof record?.name === 'string') {
                                 return record.name;
                               } else if (typeof record?.name === 'object' && record?.name !== null) {
                                // If name is an object, extract the name
                                return (record.name as any).fullName || 
                                       (record.name as any).name || 
                                       `${(record.name as any).firstName || ''} ${(record.name as any).lastName || ''}`.trim() ||
                                        'Unknown Patient';
                               }
                               return 'Unknown Patient';
                             })()}
                           </div>
                           <div className="text-xs text-muted-foreground font-mono">
                             ID: {(() => {
                               // Handle both string and object formats for patient ID
                               if (typeof record?.patientId === 'string') {
                                 return record.patientId;
                               } else if (typeof record?.patientId === 'object' && record?.patientId !== null) {
                                 return (record.patientId as any)._id || (record.patientId as any).id || 'Unknown ID';
                               } else if (typeof record?.id === 'string') {
                                 return record.id;
                               } else if (typeof record?.id === 'object' && record?.id !== null) {
                                 return (record.id as any)._id || (record.id as any).id || 'Unknown ID';
                               }
                               return 'Unknown ID';
                             })()}
                           </div>
                         </div>
                       </td>
                       <td className="px-3 py-2 whitespace-nowrap">
                         {isPendingTask ? (
                           <div className="text-sm font-semibold text-muted-foreground/50">
                             Pending
                           </div>
                         ) : (
                           <div className="text-sm font-bold text-muted-foreground">
                             {record.systolic}/{record.diastolic}
                           </div>
                         )}
                         <div className="text-xs text-muted-foreground font-medium">mmHg</div>
                       </td>
                       <td className="px-3 py-2 whitespace-nowrap">
                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isPendingTask ? 'text-accent-foreground bg-accent/20 border border-yellow-200' : getBPStatusColor(status)}`}>
                           {isPendingTask ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
                         </span>
                       </td>
                       <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                         {isPendingTask ? 'Not measured' : `${(record?.position || 'sitting').charAt(0).toUpperCase() + (record?.position || 'sitting').slice(1)} / ${(record?.arm || 'left').charAt(0).toUpperCase() + (record?.arm || 'left').slice(1)}`}
                       </td>
                       <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                         {isPendingTask ? 'Not set' : (record?.fileType || 'single').charAt(0).toUpperCase() + (record?.fileType || 'single').slice(1)}
                       </td>
                       <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                         {isPendingTask ? 'Pending' : new Date(record?.measurementDate || record?.recordedAt || record?.createdAt || new Date()).toLocaleDateString()}
                       </td>
                       <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                         <div className="flex space-x-1 flex-wrap gap-1">
                           {isPendingTask ? (
                             <button
                               onClick={() => handleCompleteTask(record)}
                               className="p-1 text-primary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                               title="Complete Blood Pressure Check"
                             >
                               <Plus className="h-4 w-4" />
                             </button>
                           ) : (
                             <>
                              <button
                                onClick={() => handleAIAnalyze(record)}
                                disabled={loadingAnalysis === record._id}
                                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50"
                                title="AI Analysis"
                              >
                                {loadingAnalysis === record._id
                                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                                  : <Bot className="h-4 w-4" />
                                }
                              </button>
                               <button
                                 onClick={() => { setActiveChatRecord(record); setShowAIChat(true); }}
                                 className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-md transition-colors"
                                 title="Ask AI about this patient"
                               >
                                 <Sparkles className="h-4 w-4" />
                               </button>
                               <button
                                 onClick={() => handleEdit(record)}
                                 className="p-1 text-primary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                 title="Edit Record"
                               >
                                 <Edit className="h-4 w-4" />
                               </button>
                               <button
                                 onClick={() => handleDelete(record._id)}
                                 className="p-1 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                 title="Delete Record"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </button>
                             </>
                           )}
                         </div>
                       </td>
                      </tr>
                    {/* AI Analysis Expandable Row */}
                    {!isPendingTask && recordAnalysis && expandedAnalysis === recordKey && (
                       <tr>
                         <td colSpan={7} className="px-4 py-0">
                           <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 my-2">
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-2">
                                 <Bot className="h-4 w-4 text-purple-600" />
                                 <span className="text-sm font-semibold text-purple-700">AI Cardiology Analysis</span>
                                 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getClassificationColor(recordAnalysis.classification)}`}>
                                   {recordAnalysis.classification}
                                 </span>
                                 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskBadgeColor(recordAnalysis.riskLevel)}`}>
                                   {recordAnalysis.riskLevel?.toUpperCase()} RISK
                                 </span>
                                 <div className="flex items-center gap-1 text-xs text-gray-500">
                                   {getTrendIcon(recordAnalysis.trend)}
                                   <span className="capitalize">{recordAnalysis.trend?.replace('_', ' ')}</span>
                                 </div>
                               </div>
                               <button onClick={() => setExpandedAnalysis(null)} className="text-gray-400 hover:text-gray-600">
                                 <XCircle className="h-4 w-4" />
                               </button>
                             </div>
                             <p className="text-sm text-gray-700 italic mb-3">{recordAnalysis.summary}</p>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               {recordAnalysis.recommendations?.length > 0 && (
                                 <div>
                                   <div className="flex items-center gap-1 mb-2">
                                     <Lightbulb className="h-3 w-3 text-amber-500" />
                                     <span className="text-xs font-semibold text-gray-700">Clinical Recommendations</span>
                                   </div>
                                   <ul className="space-y-1">
                                     {recordAnalysis.recommendations.map((r, i) => (
                                       <li key={i} className="flex items-start gap-1 text-xs text-gray-600">
                                         <span className="text-green-500 mt-0.5">✓</span> {r}
                                       </li>
                                     ))}
                                   </ul>
                                 </div>
                               )}
                               {recordAnalysis.warnings?.length > 0 && (
                                 <div>
                                   <div className="flex items-center gap-1 mb-2">
                                     <ShieldAlert className="h-3 w-3 text-red-500" />
                                     <span className="text-xs font-semibold text-gray-700">Warnings</span>
                                   </div>
                                   <ul className="space-y-1">
                                     {recordAnalysis.warnings.map((w, i) => (
                                       <li key={i} className="flex items-start gap-1 text-xs text-red-600">
                                         <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {w}
                                       </li>
                                     ))}
                                   </ul>
                                 </div>
                               )}
                               {recordAnalysis.lifestyle?.length > 0 && (
                                 <div>
                                   <div className="flex items-center gap-1 mb-2">
                                     <Activity className="h-3 w-3 text-blue-500" />
                                     <span className="text-xs font-semibold text-gray-700">Lifestyle Modifications</span>
                                   </div>
                                   <ul className="space-y-1">
                                     {recordAnalysis.lifestyle.map((l, i) => (
                                       <li key={i} className="flex items-start gap-1 text-xs text-blue-700">
                                         <span className="text-blue-400 mt-0.5">•</span> {l}
                                       </li>
                                     ))}
                                   </ul>
                                 </div>
                               )}
                             </div>
                           </div>
                         </td>
                       </tr>
                     )}
                     </React.Fragment>
                   );
                 })}
               </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && (pendingVitalSigns.length > 0 || completedVitalSigns.length > 0) && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-border/30 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 text-sm text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Empty State for Pending Tab */}
        {!loading && activeTab === 'pending' && pendingVitalSigns.length === 0 && (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-accent/20 mx-auto mb-4">
              <Heart className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No pending blood pressure checks</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              All blood pressure checks have been completed. Check the History tab to view completed records.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center px-4 py-2.5 bg-destructive text-primary-foreground rounded-lg hover:bg-destructive transition-colors mx-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Record
            </button>
          </div>
        )}

        {/* Empty State for History Tab */}
        {!loading && activeTab === 'history' && completedVitalSigns.length === 0 && (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted/20 mx-auto mb-4">
              <Heart className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No completed blood pressure records</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              No completed blood pressure records found. Check the Pending tab for tasks that need to be completed.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors"
              >
                <Search className="h-5 w-5 mr-2" />
                Search History
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center px-4 py-2.5 bg-destructive text-primary-foreground rounded-lg hover:bg-destructive transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Record
              </button>
            </div>
          </div>
        )}
          </>
        )}

        {/* Procedures Tab */}
        {activeTab === 'procedures' && (
          <div className="p-6">
            {loadingProcedures ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-destructive mx-auto mb-4"></div>
                <p className="text-muted-foreground font-medium">Loading blood pressure procedures...</p>
              </div>
            ) : bloodPressureProcedures.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted/20 mx-auto mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No blood pressure procedures</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  No blood pressure procedures found. All procedures will appear here when they are scheduled.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {bloodPressureProcedures.map((procedure) => (
                  <Card key={procedure._id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-muted-foreground" />
                            {procedure.patientName}
                          </CardTitle>
                          <p className="text-lg font-semibold text-muted-foreground mt-1">
                            {procedure.procedureName}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={
                            procedure.status === 'scheduled' 
                              ? 'bg-blue-500 text-white' 
                              : procedure.status === 'in_progress'
                              ? 'bg-yellow-500 text-white'
                              : procedure.status === 'completed'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-500 text-white'
                          }>
                            {procedure.status?.replace('_', ' ') || procedure.status}
                          </Badge>
                          <Badge className={
                            procedure.priority === 'urgent'
                              ? 'bg-red-500 text-white'
                              : procedure.priority === 'high'
                              ? 'bg-orange-500 text-white'
                              : procedure.priority === 'normal'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-500 text-white'
                          }>
                            {procedure.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {new Date(procedure.scheduledTime).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {new Date(procedure.scheduledTime).toLocaleTimeString()} ({procedure.duration} min)
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Location: {procedure.location} {procedure.roomNumber && `- Room ${procedure.roomNumber}`}
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mt-3">{procedure.description}</p>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {procedure.status === 'scheduled' && (
                          <Button 
                            size="default" 
                            onClick={() => updateProcedureStatus(procedure._id, 'in_progress')}
                            className="bg-accent hover:bg-accent whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                          >
                            Start Procedure
                          </Button>
                        )}
                        {procedure.status === 'in_progress' && (
                          <Button 
                            size="default" 
                            onClick={() => updateProcedureStatus(procedure._id, 'completed')}
                            className="bg-primary hover:bg-primary whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                          >
                            Complete
                          </Button>
                        )}
                        {procedure.status !== 'completed' && procedure.status !== 'cancelled' && (
                          <Button 
                            size="default" 
                            onClick={() => updateProcedureStatus(procedure._id, 'cancelled')}
                            className="bg-destructive hover:bg-destructive whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
       </div>

       {/* Search Modal */}
       {showSearchModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
           <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-[98vw] min-w-[1000px] max-h-[95vh] overflow-hidden">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-bold">Search Blood Pressure History</h2>
                               <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchTerm('');
                    setSearchResults([]);
                    setSelectedTimePeriod('all');
                    setSelectedMeasurementType('blood_pressure');
                    setSearchStats({ 
                      totalRecords: 0, 
                      timePeriod: 'all',
                      status: 'all',
                      completedRecords: 0,
                      pendingTasks: 0
                    });
                  }}
                  className="text-muted-foreground hover:text-muted-foreground"
                >
                  ✕
                </button>
             </div>
             
                           <div className="mb-4 space-y-3">
                {/* Search Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter patient name or ID..."
                    className="flex-1 px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searchLoading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary disabled:opacity-50"
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Time Period Filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Time Period
                    </label>
                    <select
                      value={selectedTimePeriod}
                      onChange={(e) => {
                        setSelectedTimePeriod(e.target.value);
                        // Auto-search when time period changes if there's already a search term
                        if (searchTerm.trim()) {
                          setTimeout(() => handleSearch(), 100);
                        }
                      }}
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="1week">Last Week</option>
                      <option value="2weeks">Last 2 Weeks</option>
                      <option value="1month">Last Month</option>
                      <option value="3months">Last 3 Months</option>
                      <option value="6months">Last 6 Months</option>
                      <option value="1year">Last Year</option>
                    </select>
                  </div>
                  
                  {/* Measurement Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Measurement Type
                    </label>
                    <select
                      value={selectedMeasurementType}
                      onChange={(e) => {
                        setSelectedMeasurementType(e.target.value);
                        // Auto-search when measurement type changes if there's already a search term
                        if (searchTerm.trim()) {
                          setTimeout(() => handleSearch(), 100);
                        }
                      }}
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="blood_pressure">Blood Pressure</option>
                      <option value="temperature">Temperature</option>
                      <option value="pulse">Pulse</option>
                      <option value="weight">Weight</option>
                      <option value="height">Height</option>
                      <option value="all">All Types</option>
                    </select>
                  </div>
                </div>
                
                {/* Search Stats */}
                {searchStats.totalRecords > 0 && (
                  <div className="bg-primary/10 border border-primary/30 rounded-md p-3">
                    <div className="text-sm text-primary">
                      <span className="font-medium">Found {searchStats.totalRecords} total items</span>
                      {searchStats.timePeriod !== 'all' && (
                        <span> for the {(() => {
                          const timePeriodMap: { [key: string]: string } = {
                            '1week': 'last week',
                            '2weeks': 'last 2 weeks', 
                            '1month': 'last month',
                            '3months': 'last 3 months',
                            '6months': 'last 6 months',
                            '1year': 'last year'
                          };
                          return timePeriodMap[searchStats.timePeriod] || searchStats.timePeriod;
                        })()}</span>
                      )}
                      <div className="mt-1 text-xs text-primary">
                        {searchStats.completedRecords > 0 && (
                          <span>• {searchStats.completedRecords} completed records</span>
                        )}
                        {searchStats.pendingTasks > 0 && (
                          <span>• {searchStats.pendingTasks} pending tasks</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

             <div className="overflow-y-auto max-h-[60vh]">
               {searchLoading ? (
                 <div className="text-center py-8">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                   <p className="mt-2 text-muted-foreground">Searching...</p>
                 </div>
               ) : searchResults.length === 0 && searchTerm ? (
                 <div className="text-center py-8">
                   <p className="text-muted-foreground">No blood pressure records found for "{searchTerm}"</p>
                 </div>
                               ) : searchResults.length > 0 ? (
                  <div className="space-y-6">
                    {searchResults.map((patientGroup) => (
                      <div key={patientGroup?.patientId || 'unknown'} className="bg-primary-foreground border border-border/30 rounded-lg overflow-hidden">
                        {/* Patient Header */}
                        <div className="bg-muted/10 px-4 py-3 border-b border-border/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-muted-foreground">
                                {(() => {
                                  // Handle both string and object formats for patient name
                                  if (typeof patientGroup?.patientName === 'string') {
                                    return patientGroup.patientName;
                                  } else if (typeof patientGroup?.patientName === 'object' && patientGroup?.patientName !== null) {
                                    return patientGroup.patientName.fullName || 
                                           patientGroup.patientName.name || 
                                           `${patientGroup.patientName.firstName || ''} ${patientGroup.patientName.lastName || ''}`.trim() ||
                                           'Unknown Patient';
                                  }
                                  return 'Unknown Patient';
                                })()}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Patient ID: {(() => {
                                  // Handle both string and object formats for patient ID
                                  if (typeof patientGroup?.patientId === 'string') {
                                    return patientGroup.patientId;
                                  } else if (typeof patientGroup?.patientId === 'object' && patientGroup?.patientId !== null) {
                                    return patientGroup.patientId._id || patientGroup.patientId.id || 'Unknown ID';
                                  }
                                  return 'Unknown ID';
                                })()} • 
                                {(patientGroup?.records || []).length > 0 && ` ${(patientGroup?.records || []).length} completed records`}
                                {(patientGroup?.records || []).length > 0 && (patientGroup?.pendingTasks || []).length > 0 && ' • '}
                                {(patientGroup?.pendingTasks || []).length > 0 && ` ${(patientGroup?.pendingTasks || []).length} pending tasks`}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const patientName = (() => {
                                  if (typeof patientGroup?.patientName === 'string') {
                                    return patientGroup.patientName;
                                  } else if (typeof patientGroup?.patientName === 'object' && patientGroup?.patientName !== null) {
                                    return patientGroup.patientName.fullName || 
                                           patientGroup.patientName.name || 
                                           `${patientGroup.patientName.firstName || ''} ${patientGroup.patientName.lastName || ''}`.trim() ||
                                           'Unknown Patient';
                                  }
                                  return 'Unknown Patient';
                                })();
                                
                                const patientId = (() => {
                                  if (typeof patientGroup?.patientId === 'string') {
                                    return patientGroup.patientId;
                                  } else if (typeof patientGroup?.patientId === 'object' && patientGroup?.patientId !== null) {
                                    return patientGroup.patientId._id || patientGroup.patientId.id || 'Unknown ID';
                                  }
                                  return 'Unknown ID';
                                })();
                                
                                handlePrintRecord(patientId, patientName);
                              }}
                              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                              title="Print All Records for This Patient"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              <span>Print All</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Records Table */}
                        <div className="overflow-x-auto w-full">
                          <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-muted/10">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                                  Measurement
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-48">
                                  Value
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                                  Details
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-64">
                                  Notes
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                                  File Type
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                                  Recorded
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                                  By
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-primary-foreground divide-y divide-gray-200">
                              {[...(patientGroup?.records || []), ...(patientGroup?.pendingTasks || [])].map((record) => {
                                const isPendingTask = !record._id || record.status === 'PENDING';
                                const status = isPendingTask ? 'pending' : (record.measurementType === 'blood_pressure' 
                                  ? getBPStatus(record.systolic, record.diastolic)
                                  : 'normal');
                                
                                const getMeasurementValue = () => {
                                  if (isPendingTask) {
                                    return 'Not measured';
                                  }
                                  
                                  // If searching for blood pressure, show only BP values
                                  if (selectedMeasurementType === 'blood_pressure') {
                                    if (record?.systolic && record?.diastolic) {
                                      return `${record.systolic}/${record.diastolic} mmHg`;
                                    } else if (record?.systolic) {
                                      return `${record.systolic}/-- mmHg`;
                                    } else if (record?.diastolic) {
                                      return `--/${record.diastolic} mmHg`;
                                    } else {
                                      return 'N/A';
                                    }
                                  }
                                  
                                  // For other measurement types or when showing all, show multiple values
                                  const values = [];
                                  
                                  if (record?.systolic && record?.diastolic) {
                                    values.push(`${record.systolic}/${record.diastolic} mmHg`);
                                  }
                                  if (record?.pulse) {
                                    values.push(`${record.pulse} bpm`);
                                  }
                                  if (record?.temperature) {
                                    values.push(`${record.temperature}°C`);
                                  }
                                  if (record?.spo2) {
                                    values.push(`SpO2 ${record.spo2}%`);
                                  }
                                  if (record?.weight) {
                                    values.push(`${record.weight} kg`);
                                  }
                                  if (record?.height) {
                                    values.push(`${record.height} cm`);
                                  }
                                  if (record?.bmi) {
                                    values.push(`BMI ${record.bmi}`);
                                  }
                                  if (record?.respiratoryRate) {
                                    values.push(`${record.respiratoryRate} breaths/min`);
                                  }
                                  
                                  return values.length > 0 ? values.join(' | ') : 'N/A';
                                };
                                
                                const getMeasurementDetails = () => {
                                  if (isPendingTask) {
                                    return 'Not set';
                                  }
                                  
                                  // If searching for blood pressure, show BP specific details
                                  if (selectedMeasurementType === 'blood_pressure' && (record?.systolic || record?.diastolic)) {
                                    return `${(record?.position || 'sitting').charAt(0).toUpperCase() + (record?.position || 'sitting').slice(1)} / ${(record?.arm || 'left').charAt(0).toUpperCase() + (record?.arm || 'left').slice(1)}`;
                                  }
                                  
                                  if (record?.measurementType === 'blood_pressure') {
                                    return `${(record?.position || 'sitting').charAt(0).toUpperCase() + (record?.position || 'sitting').slice(1)} / ${(record?.arm || 'left').charAt(0).toUpperCase() + (record?.arm || 'left').slice(1)}`;
                                  }
                                  return record?.notes || 'N/A';
                                };
                                
                                return (
                                  <tr key={record._id} className="hover:bg-muted/10">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-muted-foreground capitalize">
                                        {isPendingTask ? 'Blood Pressure' : (() => {
                                          // If we're searching for blood pressure and this is a comprehensive record with BP data, show "Blood Pressure"
                                          if (selectedMeasurementType === 'blood_pressure' && 
                                              record?.measurementType === 'comprehensive' && 
                                              (record?.systolic || record?.diastolic)) {
                                            return 'Blood Pressure';
                                          }
                                          return (record?.measurementType || 'unknown').replace('_', ' ');
                                        })()}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="text-lg font-semibold text-muted-foreground break-words">
                                        {getMeasurementValue()}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBPStatusColor(status)}`}>
                                        {isPendingTask ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-muted-foreground break-words">
                                      {getMeasurementDetails()}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-muted-foreground">
                                      <div className="max-w-md break-words" title={record?.notes || 'No notes'}>
                                        {isPendingTask ? 'No notes' : (record?.notes || 'No notes')}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                      {isPendingTask ? 'Not set' : ((record?.fileType || 'single').charAt(0).toUpperCase() + (record?.fileType || 'single').slice(1))}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                      {isPendingTask ? 'Pending' : new Date(record?.measurementDate || record?.recordedAt || record?.createdAt || new Date()).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                      {isPendingTask ? 'N/A' : (record?.measuredByName || 'N/A')}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex space-x-2">
                                        {isPendingTask ? (
                                          <button
                                            onClick={() => handleCompleteTask(record)}
                                            className="text-primary hover:text-primary"
                                            title="Complete Blood Pressure Check"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => {
                                                // Ensure the record has patientId and patientName from the patientGroup
                                                const enrichedRecord = {
                                                  ...record,
                                                  patientId: record.patientId || patientGroup.patientId,
                                                  patientName: record.patientName || patientGroup.patientName
                                                };
                                                handleEdit(enrichedRecord);
                                              }}
                                              className="text-primary hover:text-primary"
                                              title="Edit Record"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                // Helper function to extract patient name safely
                                                const getPatientName = (record: any) => {
                                                  if (typeof record?.patientName === 'string') {
                                                    return record.patientName;
                                                  } else if (typeof record?.patientName === 'object' && record?.patientName !== null) {
                                                    return record.patientName.fullName || 
                                                           record.patientName.name || 
                                                           `${record.patientName.firstName || ''} ${record.patientName.lastName || ''}`.trim() ||
                                                           'Unknown Patient';
                                                  } else if (typeof record?.name === 'string') {
                                                    return record.name;
                                                  } else if (typeof record?.name === 'object' && record?.name !== null) {
                                                    return record.name.fullName || 
                                                           record.name.name || 
                                                           `${record.name.firstName || ''} ${record.name.lastName || ''}`.trim() ||
                                                           'Unknown Patient';
                                                  }
                                                  return 'Unknown Patient';
                                                };
                                                
                                                // Helper function to extract patient ID safely
                                                const getPatientId = (record: any) => {
                                                  if (typeof record?.patientId === 'string') {
                                                    return record.patientId;
                                                  } else if (typeof record?.patientId === 'object' && record?.patientId !== null) {
                                                    return record.patientId._id || record.patientId.id || '';
                                                  } else if (typeof record?.id === 'string') {
                                                    return record.id;
                                                  } else if (typeof record?.id === 'object' && record?.id !== null) {
                                                    return record.id._id || record.id.id || '';
                                                  }
                                                  return '';
                                                };
                                                
                                                handleGenerateEatingPlan(
                                                  getPatientId(record), 
                                                  getPatientName(record)
                                                );
                                              }}
                                              className="text-primary hover:text-primary"
                                              title="Generate Eating Plan"
                                            >
                                              <FileText className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                // Helper function to extract patient name safely
                                                const getPatientName = (record: any) => {
                                                  if (typeof record?.patientName === 'string') {
                                                    return record.patientName;
                                                  } else if (typeof record?.patientName === 'object' && record?.patientName !== null) {
                                                    return record.patientName.fullName || 
                                                           record.patientName.name || 
                                                           `${record.patientName.firstName || ''} ${record.patientName.lastName || ''}`.trim() ||
                                                           'Unknown Patient';
                                                  } else if (typeof record?.name === 'string') {
                                                    return record.name;
                                                  } else if (typeof record?.name === 'object' && record?.name !== null) {
                                                    return record.name.fullName || 
                                                           record.name.name || 
                                                           `${record.name.firstName || ''} ${record.name.lastName || ''}`.trim() ||
                                                           'Unknown Patient';
                                                  }
                                                  return 'Unknown Patient';
                                                };
                                                
                                                // Helper function to extract patient ID safely
                                                const getPatientId = (record: any) => {
                                                  if (typeof record?.patientId === 'string') {
                                                    return record.patientId;
                                                  } else if (typeof record?.patientId === 'object' && record?.patientId !== null) {
                                                    return record.patientId._id || record.patientId.id || '';
                                                  } else if (typeof record?.id === 'string') {
                                                    return record.id;
                                                  } else if (typeof record?.id === 'object' && record?.id !== null) {
                                                    return record.id._id || record.id.id || '';
                                                  }
                                                  return '';
                                                };
                                                
                                                handlePrintRecord(
                                                  getPatientId(record), 
                                                  getPatientName(record)
                                                );
                                              }}
                                              className="text-green-600 hover:text-green-700"
                                              title="Print Record"
                                            >
                                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => handleDelete(record._id)}
                                              className="text-destructive hover:text-destructive"
                                              title="Delete Record"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
               ) : (
                 <div className="text-center py-8">
                   <p className="text-muted-foreground">Enter a patient name or ID to search for blood pressure history</p>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}

       {/* Patient Selection Modal for Eating Plan */}
       {showPatientSelectionModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-primary-foreground rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-muted-foreground flex items-center">
                 <FileText className="h-5 w-5 text-primary mr-2" />
                 Select Patient for Eating Plan
               </h3>
               <button
                 onClick={() => {
                   setShowPatientSelectionModal(false);
                   setPatientSearchTerm('');
                 }}
                 className="text-muted-foreground/50 hover:text-muted-foreground"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
             
             <p className="text-muted-foreground mb-4">
               Choose a patient to generate a personalized eating plan based on their vital signs and medical conditions.
             </p>
             
             {/* Search Input */}
             <div className="mb-4">
               <input
                 type="text"
                 placeholder="Search patients by name or ID..."
                 value={patientSearchTerm}
                 onChange={(e) => setPatientSearchTerm(e.target.value)}
                 className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
               />
             </div>
             
             <div className="space-y-2 max-h-96 overflow-y-auto">
               {loadingPatients ? (
                 <div className="text-center py-8">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                   <p className="mt-2 text-muted-foreground">Loading patients...</p>
                 </div>
               ) : allPatientsWithVitals
                 .filter(patient => {
                   try {
                     const patientName = String(patient?.patientName || patient?.name || '').toLowerCase();
                     const patientId = String(patient?.patientId || patient?.id || '').toLowerCase();
                     const searchTerm = String(patientSearchTerm || '').toLowerCase();
                     
                     return patientName.includes(searchTerm) || patientId.includes(searchTerm);
                   } catch (error) {
                     console.error('Error filtering patient:', error);
                     return false;
                   }
                 })
                 .map((patient) => {
                   try {
                     // Extract patient information safely
                     let patientName = patient?.patientName || patient?.name || 'Unknown Patient';
                     let patientId = patient?.patientId || patient?.id || 'Unknown ID';
                     
                     // Ensure patientName is a string
                     if (typeof patientName === 'object' && patientName !== null) {
                       patientName = patientName.fullName || 
                                    patientName.name || 
                                    `${patientName.firstName || ''} ${patientName.lastName || ''}`.trim() ||
                                    'Unknown Patient';
                     }
                     
                     // Ensure patientId is a string
                     if (typeof patientId === 'object' && patientId !== null) {
                       patientId = patientId._id || patientId.id || String(patientId) || 'Unknown ID';
                     }
                     
                     // Convert to string to be safe
                     patientName = String(patientName);
                     patientId = String(patientId);
                     const measurementDate = patient?.measurementDate || patient?.createdAt || new Date();
                     
                     return (
                     <div
                       key={patient._id || patient.id}
                       className="flex items-center justify-between p-3 border border-border/30 rounded-lg hover:bg-muted/10 cursor-pointer"
                       onClick={() => {
                         handleGenerateEatingPlan(patientId, patientName);
                         setShowPatientSelectionModal(false);
                       }}
                     >
                       <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                           <User className="h-5 w-5 text-primary" />
                         </div>
                         <div>
                           <p className="font-medium text-muted-foreground">{patientName}</p>
                           <p className="text-sm text-muted-foreground">ID: {patientId}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-sm text-muted-foreground">
                           {patient?.systolic && patient?.diastolic 
                             ? `${patient.systolic}/${patient.diastolic} mmHg`
                             : 'Pending'
                           }
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {new Date(measurementDate).toLocaleDateString()}
                         </p>
                       </div>
                     </div>
                     );
                   } catch (error) {
                     console.error('Error rendering patient:', error);
                     return null;
                   }
                 })}
               
               {/* No patients found message */}
               {!loadingPatients && allPatientsWithVitals
                 .filter(patient => {
                   try {
                     const patientName = String(patient?.patientName || patient?.name || '').toLowerCase();
                     const patientId = String(patient?.patientId || patient?.id || '').toLowerCase();
                     const searchTerm = String(patientSearchTerm || '').toLowerCase();
                     
                     return patientName.includes(searchTerm) || patientId.includes(searchTerm);
                   } catch (error) {
                     console.error('Error filtering patient:', error);
                     return false;
                   }
                 }).length === 0 && (
                 <div className="text-center py-8">
                   <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                   <p className="text-muted-foreground">
                     {allPatientsWithVitals.length === 0 
                       ? 'No patients with vital signs records found.' 
                       : 'No patients found matching your search.'}
                   </p>
                 </div>
               )}
             </div>
             
             <div className="flex justify-end mt-4">
               <button
                 onClick={() => {
                   setShowPatientSelectionModal(false);
                   setPatientSearchTerm('');
                 }}
                 className="px-4 py-2 border border-border/40 rounded-md text-muted-foreground hover:bg-muted/10 transition-colors"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Eating Plan Modal */}
       {showEatingPlanModal && selectedPatientForEatingPlan && (
         <PrintableEatingPlan
           patientId={selectedPatientForEatingPlan.id}
           patientName={selectedPatientForEatingPlan.name}
           onClose={() => {
             setShowEatingPlanModal(false);
             setSelectedPatientForEatingPlan(null);
           }}
         />
       )}
       </div>

       {/* Print Modal */}
       {showPrintModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
           <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-md">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold">Print Blood Pressure Report</h2>
               <button
                 onClick={() => setShowPrintModal(false)}
                 className="text-muted-foreground hover:text-muted-foreground"
               >
                 ✕
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-muted-foreground mb-1">
                   Patient
                 </label>
                 <input
                   type="text"
                   value={printOptions.patientName}
                   disabled
                   className="w-full px-3 py-2 border border-border/40 rounded-md bg-muted/50 text-sm"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-muted-foreground mb-1">
                   Report Frequency
                 </label>
                 <select
                   value={printOptions.frequency}
                   onChange={(e) => {
                     const frequency = e.target.value;
                     const today = new Date();
                     const startDate = new Date();
                     
                     // Calculate date range based on frequency
                     switch (frequency) {
                       case 'daily':
                         startDate.setDate(today.getDate());
                         break;
                       case 'weekly':
                         startDate.setDate(today.getDate() - 7);
                         break;
                       case 'biweekly':
                         startDate.setDate(today.getDate() - 14);
                         break;
                       case 'monthly':
                         startDate.setDate(today.getDate() - 30);
                         break;
                       case 'quarterly':
                         startDate.setDate(today.getDate() - 90);
                         break;
                       case 'yearly':
                         startDate.setDate(today.getDate() - 365);
                         break;
                       default:
                         // Custom - don't change dates
                         break;
                     }
                     
                     setPrintOptions(prev => ({
                       ...prev,
                       frequency,
                       startDate: frequency !== 'custom' ? startDate.toISOString().split('T')[0] : prev.startDate,
                       endDate: today.toISOString().split('T')[0]
                     }));
                   }}
                   className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                 >
                   <option value="daily">Daily Report</option>
                   <option value="weekly">Weekly Report</option>
                   <option value="biweekly">Bi-weekly Report</option>
                   <option value="monthly">Monthly Report</option>
                   <option value="quarterly">Quarterly Report</option>
                   <option value="yearly">Yearly Report</option>
                   <option value="custom">Custom Date Range</option>
                 </select>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-sm font-medium text-muted-foreground mb-1">
                     Start Date
                   </label>
                   <input
                     type="date"
                     value={printOptions.startDate}
                     onChange={(e) => setPrintOptions(prev => ({ ...prev, startDate: e.target.value }))}
                     className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-muted-foreground mb-1">
                     End Date
                   </label>
                   <input
                     type="date"
                     value={printOptions.endDate}
                     onChange={(e) => setPrintOptions(prev => ({ ...prev, endDate: e.target.value }))}
                     className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                   />
                 </div>
               </div>
               
               <div className="space-y-2">
                 <label className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={printOptions.includeNotes}
                     onChange={(e) => setPrintOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                     className="rounded"
                   />
                   <span className="text-sm text-muted-foreground">Include Notes</span>
                 </label>
               </div>
               
               <div className="flex justify-end space-x-2 pt-4">
                 <button
                   onClick={() => setShowPrintModal(false)}
                   className="px-4 py-2 text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 text-sm"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handlePrint}
                   className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary text-sm"
                 >
                   Print Report
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* AI Cardiologist Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ height: '600px' }}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-600 to-purple-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-full bg-white/20">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Cardiology Assistant</h3>
                  <p className="text-xs text-red-200">
                    {activeChatRecord
                      ? `Context: ${typeof activeChatRecord.patientName === 'string' ? activeChatRecord.patientName : 'Patient'} — ${activeChatRecord.systolic}/${activeChatRecord.diastolic} mmHg`
                      : 'General Blood Pressure Assistant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeChatRecord && (
                  <button
                    onClick={() => setActiveChatRecord(null)}
                    className="text-xs text-red-200 hover:text-white px-2 py-1 rounded border border-red-400 hover:border-white transition-colors"
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
            {aiChatMessages.length <= 1 && (
              <div className="p-3 border-b bg-red-50">
                <p className="text-xs text-red-600 font-medium mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-1">
                  {quickChatPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendAIChat(prompt)}
                      className="text-xs px-2 py-1 bg-white border border-red-200 rounded-full text-red-700 hover:bg-red-50 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiChatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-purple-500 flex items-center justify-center mr-2 mt-1">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-red-600 to-purple-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-red-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {aiChatLoading && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-purple-500 flex items-center justify-center mr-2">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                  value={aiChatInput}
                  onChange={(e) => setAIChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendAIChat()}
                  placeholder="Ask about blood pressure, hypertension, interventions..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                  disabled={aiChatLoading}
                />
                <button
                  onClick={() => handleSendAIChat()}
                  disabled={!aiChatInput.trim() || aiChatLoading}
                  className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                AI guidance only. Always consult the attending physician for treatment decisions.
              </p>
            </div>
          </div>
        </div>
      )}

     </div>
   );
};

export default BloodPressure;