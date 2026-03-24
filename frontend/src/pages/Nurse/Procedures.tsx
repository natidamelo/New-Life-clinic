import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar, Clock, User, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';
import WoundCareSchedule from '../../components/WoundCareSchedule';
import EarIrrigationAssessment from '../../components/EarIrrigationAssessment';
import { API_BASE_URL } from '../../config';
import apiService from '../../services/apiService';

interface Procedure {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  patientName: string;
  procedureType: string;
  procedureName: string;
  previousVisitId?: string;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledTime: string;
  duration: number;
  location: string;
  roomNumber?: string;
  bedNumber?: string;
  instructions?: string;
  preProcedureNotes?: string;
  postProcedureNotes?: string;
  complications?: string;
  assignedNurseName: string;
  amount?: number;
  currency?: string;
  billingStatus?: 'pending' | 'paid' | 'cancelled';
  // Enhanced wound care fields
  woundDetails?: {
    woundType: string;
    woundLocation: string;
    woundSize?: {
      length: number;
      width: number;
      depth: number;
    };
    woundStage: string;
    woundCharacteristics: {
      tissueType: string;
      exudateType: string;
      exudateAmount: string;
      odor: string;
    };
    woundAge: string;
    riskFactors: string[];
  };
  woundCareSupplies?: {
    primaryDressing: string;
    secondaryDressing: string;
    cleansingSolution: string;
    additionalSupplies: Array<{
      item: string;
      quantity: number;
      unit: string;
    }>;
  };
  woundAssessment?: {
    painLevel: number;
    temperature?: number;
    surroundingSkin: string;
    woundBed: string;
    infectionSigns: string[];
  };
  treatmentPlan?: {
    frequency: string;
    duration: number;
    specialInstructions?: string;
    followUpSchedule: string;
  };
  // Enhanced ear irrigation fields
  earIrrigationDetails?: {
    earType: string;
    earSide: string;
    earCondition: string;
    earAnatomy: {
      externalCanal: string;
      tympanicMembrane: string;
      discharge: string;
    };
    contraindications: string[];
  };
  earIrrigationAssessment?: {
    painLevel: number;
    hearingLevel: string;
    earCanalCondition: string;
    irrigationTolerance: string;
    complications: string[];
    patientComfort: string;
  };
  earIrrigationSupplies?: {
    irrigationSolution: string;
    irrigationTemperature: string;
    syringeType: string;
    additionalSupplies: string[];
    protectiveEquipment: string[];
  };
  earIrrigationPlan?: {
    irrigationMethod: string;
    pressureLevel: string;
    duration: number;
    frequency: string;
    followUpRequired: boolean;
    followUpInstructions?: string;
    patientEducation: string;
  };
}

const Procedures: React.FC = () => {
  const { user, getToken } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  // Group procedures by main procedure and sessions
  const groupProcedures = (procedures: Procedure[]) => {
    const grouped: { [key: string]: { main: Procedure; sessions: Procedure[]; } } = {};
    const standalone: Procedure[] = [];

    const byId = new Map(procedures.map(p => [p._id, p]));
    const parentIds = new Set(
      procedures
        .filter(p => p.previousVisitId)
        .map(p => p.previousVisitId!.toString())
    );

    procedures.forEach(procedure => {
      if (procedure.procedureName.includes('Session') && procedure.previousVisitId) {
        const mainId = procedure.previousVisitId.toString();
        if (!grouped[mainId]) {
          const mainProcedure = byId.get(mainId);
          if (mainProcedure) {
            grouped[mainId] = { main: mainProcedure, sessions: [] };
          }
        }
        if (grouped[mainId]) {
          grouped[mainId].sessions.push(procedure);
        }
      } else {
        if (parentIds.has(procedure._id)) {
          if (!grouped[procedure._id]) {
            grouped[procedure._id] = { main: procedure, sessions: [] };
          }
        } else {
          standalone.push(procedure);
        }
      }
    });

    // Sort sessions by session number
    Object.values(grouped).forEach(group => {
      group.sessions.sort((a, b) => {
        const aNum = parseInt(a.procedureName.match(/Session (\d+)/)?.[1] || '0');
        const bNum = parseInt(b.procedureName.match(/Session (\d+)/)?.[1] || '0');
        return aNum - bNum;
      });
    });

    return { grouped, standalone };
  };

  // Toggle expansion of procedure sessions
  const toggleProcedureExpansion = (procedureId: string) => {
    setExpandedProcedures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(procedureId)) {
        newSet.delete(procedureId);
      } else {
        newSet.add(procedureId);
      }
      return newSet;
    });
  };

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [filter, setFilter] = useState('all');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showWoundAssessmentModal, setShowWoundAssessmentModal] = useState(false);
  const [showVisitHistoryModal, setShowVisitHistoryModal] = useState(false);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any>({});
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [completionData, setCompletionData] = useState({
    postProcedureNotes: '',
    complications: '',
    amount: 0
  });
  const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());
  const [woundAssessmentData, setWoundAssessmentData] = useState({
    patientName: '',
    woundType: 'acute_wound',
    woundLocation: '',
    woundSize: { length: 0, width: 0, depth: 0 },
    woundStage: 'stage_1',
    tissueType: 'granulation',
    exudateType: 'serous',
    exudateAmount: 'minimal',
    odor: 'none',
    woundAge: 'acute',
    riskFactors: [] as string[],
    painLevel: 0,
    temperature: 37,
    surroundingSkin: 'normal',
    woundBed: 'clean',
    infectionSigns: [] as string[],
    primaryDressing: 'gauze',
    secondaryDressing: 'gauze_roll',
    cleansingSolution: 'normal_saline',
    frequency: 'daily',
    duration: 0,
    specialInstructions: ''
  });

  const [showEarIrrigationAssessment, setShowEarIrrigationAssessment] = useState(false);
  const [selectedEarIrrigationProcedure, setSelectedEarIrrigationProcedure] = useState<Procedure | null>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    procedureType: '',
    procedureName: '',
    description: '',
    priority: 'normal',
    scheduledTime: '',
    duration: '', // Let user specify duration
    location: 'Ward',
    roomNumber: '',
    bedNumber: '',
    instructions: '',
    preProcedureNotes: ''
  });

  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchVisitHistory = async (patientId: string) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/procedures/patient/${patientId}/history?procedureType=wound_care`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVisitHistory(data.visitHistory || []);
        setProgressData(data.progressData || {});
        setSelectedPatientId(patientId);
        setShowVisitHistoryModal(true);
      } else {
        toast.error('Failed to fetch visit history');
      }
    } catch (error) {
      console.error('Error fetching visit history:', error);
      toast.error('Failed to fetch visit history');
    }
  };

  const handleEarIrrigationAssessment = (procedure: Procedure) => {
    setSelectedEarIrrigationProcedure(procedure);
    setShowEarIrrigationAssessment(true);
  };

  const handleEarIrrigationAssessmentComplete = async (assessmentData: any) => {
    try {
      if (!selectedEarIrrigationProcedure) return;

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/procedures/${selectedEarIrrigationProcedure._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'completed',
          earIrrigationDetails: assessmentData.earIrrigationDetails,
          earIrrigationAssessment: assessmentData.earIrrigationAssessment,
          earIrrigationSupplies: assessmentData.earIrrigationSupplies,
          earIrrigationPlan: assessmentData.earIrrigationPlan,
          postProcedureNotes: 'Ear irrigation assessment completed successfully'
        })
      });

      if (response.ok) {
        toast.success('Ear irrigation assessment completed successfully!');
        await fetchProcedures(); // Refresh the procedures list
        setShowEarIrrigationAssessment(false);
        setSelectedEarIrrigationProcedure(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete assessment');
      }
    } catch (error) {
      console.error('Error completing ear irrigation assessment:', error);
      toast.error('Failed to complete ear irrigation assessment');
    }
  };

  const fetchProcedures = async () => {
    try {
      setLoading(true);
      console.log('Fetching procedures...');
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Current hostname:', window.location.hostname);
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await apiService.get('/api/procedures/my-procedures', {
        timeout: 30000,
        params: { limit: 100 },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setProcedures(response.data);
      
    } catch (error: any) {
      console.error('Error fetching procedures:', error);
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch') || error.code === 'ERR_NETWORK') {
        toast.error('Unable to connect to backend server. Please check your connection and try again.', { autoClose: 10000 });
      } else if (error.response) {
        console.error('Failed to fetch procedures:', error.response.status, error.response.statusText);
        toast.error(`Failed to fetch procedures: ${error.response.status}`);
      } else {
        toast.error(`Failed to fetch procedures: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/procedures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Procedure created successfully');
        setShowForm(false);
        setFormData({
          patientId: '',
          procedureType: '',
          procedureName: '',
          description: '',
          priority: 'normal',
          scheduledTime: '',
          duration: '', // Let user specify duration
          location: 'Ward',
          roomNumber: '',
          bedNumber: '',
          instructions: '',
          preProcedureNotes: ''
        });
        fetchProcedures();
      }
    } catch (error) {
      toast.error('Failed to create procedure');
    }
  };

  const updateStatus = async (procedureId: string, status: string, additionalData = {}) => {
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
        body: JSON.stringify({ status, ...additionalData })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Status updated successfully');
        fetchProcedures();
        return result;
      } else {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update status');
      throw error;
    }
  };

  const handleCompleteProcedure = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setShowCompletionModal(true);
  };

  const handleWoundAssessment = (procedure: Procedure) => {
    // Ensure wound details exist to prevent undefined errors
    if (!procedure.woundDetails) {
      procedure.woundDetails = {
        woundType: 'acute_wound',
        woundLocation: 'To be assessed',
        woundSize: { length: 0.1, width: 0.1, depth: 0.1 },
        woundStage: 'stage_1',
        woundCharacteristics: {
          tissueType: 'granulation',
          exudateType: 'serous',
          exudateAmount: 'minimal',
          odor: 'none'
        },
        woundAge: 'acute',
        riskFactors: []
      };
    }
    if (!procedure.woundDetails.woundCharacteristics) {
      procedure.woundDetails.woundCharacteristics = {
        tissueType: 'granulation',
        exudateType: 'serous',
        exudateAmount: 'minimal',
        odor: 'none'
      };
    }
    if (!procedure.woundAssessment) {
      procedure.woundAssessment = {
        painLevel: 0,
        temperature: 37,
        surroundingSkin: 'normal',
        woundBed: 'clean',
        infectionSigns: []
      };
    }
    if (!procedure.woundCareSupplies) {
      procedure.woundCareSupplies = {
        primaryDressing: 'gauze',
        secondaryDressing: 'gauze_roll',
        cleansingSolution: 'normal_saline',
        additionalSupplies: []
      };
    }
    if (!procedure.treatmentPlan) {
      procedure.treatmentPlan = {
        frequency: 'daily',
        duration: 0,
        specialInstructions: 'Assess wound and update treatment plan as needed',
        followUpSchedule: 'daily'
      };
    }
    setSelectedProcedure(procedure);
    // Pre-fill with existing data if available
    if (procedure.woundDetails) {
      setWoundAssessmentData({
        patientName: procedure.patientName || '',
        woundType: procedure.woundDetails.woundType,
        woundLocation: procedure.woundDetails.woundLocation,
        woundSize: procedure.woundDetails.woundSize || { length: 0, width: 0, depth: 0 },
        woundStage: procedure.woundDetails.woundStage,
        tissueType: procedure.woundDetails.woundCharacteristics.tissueType,
        exudateType: procedure.woundDetails.woundCharacteristics.exudateType,
        exudateAmount: procedure.woundDetails.woundCharacteristics.exudateAmount,
        odor: procedure.woundDetails.woundCharacteristics.odor,
        woundAge: procedure.woundDetails.woundAge,
        riskFactors: procedure.woundDetails.riskFactors,
        painLevel: procedure.woundAssessment?.painLevel || 0,
        temperature: procedure.woundAssessment?.temperature || 37,
        surroundingSkin: procedure.woundAssessment?.surroundingSkin || 'normal',
        woundBed: procedure.woundAssessment?.woundBed || 'clean',
        infectionSigns: procedure.woundAssessment?.infectionSigns || [],
        primaryDressing: procedure.woundCareSupplies?.primaryDressing || 'gauze',
        secondaryDressing: procedure.woundCareSupplies?.secondaryDressing || 'gauze_roll',
        cleansingSolution: procedure.woundCareSupplies?.cleansingSolution || 'normal_saline',
        frequency: procedure.treatmentPlan?.frequency || 'daily',
        duration: procedure.treatmentPlan?.duration || 0,
        specialInstructions: procedure.treatmentPlan?.specialInstructions || ''
      });
    }
    setShowWoundAssessmentModal(true);
  };

  const handleViewAssessment = (procedure: Procedure) => {
    // Check if this is an ear irrigation procedure
    if (procedure.procedureType === 'ear_irrigation' || procedure.procedureName.toLowerCase().includes('ear irrigation') || procedure.procedureName.toLowerCase().includes('ear irrgation')) {
      setSelectedEarIrrigationProcedure(procedure);
      setShowEarIrrigationAssessment(true);
      return;
    }

    // For wound care procedures, ensure wound details exist to prevent undefined errors
    if (!procedure.woundDetails) {
      procedure.woundDetails = {
        woundType: 'acute_wound',
        woundLocation: 'To be assessed',
        woundSize: { length: 0.1, width: 0.1, depth: 0.1 },
        woundStage: 'stage_1',
        woundCharacteristics: {
          tissueType: 'granulation',
          exudateType: 'serous',
          exudateAmount: 'minimal',
          odor: 'none'
        },
        woundAge: 'acute',
        riskFactors: []
      };
    }
    if (!procedure.woundDetails.woundCharacteristics) {
      procedure.woundDetails.woundCharacteristics = {
        tissueType: 'granulation',
        exudateType: 'serous',
        exudateAmount: 'minimal',
        odor: 'none'
      };
    }
    if (!procedure.woundAssessment) {
      procedure.woundAssessment = {
        painLevel: 0,
        temperature: 37,
        surroundingSkin: 'normal',
        woundBed: 'clean',
        infectionSigns: []
      };
    }
    if (!procedure.woundCareSupplies) {
      procedure.woundCareSupplies = {
        primaryDressing: 'gauze',
        secondaryDressing: 'gauze_roll',
        cleansingSolution: 'normal_saline',
        additionalSupplies: []
      };
    }
    if (!procedure.treatmentPlan) {
      procedure.treatmentPlan = {
        frequency: 'daily',
        duration: 0,
        specialInstructions: 'Assess wound and update treatment plan as needed',
        followUpSchedule: 'daily'
      };
    }
    setSelectedProcedure(procedure);
    // Pre-fill with existing data if available
    if (procedure.woundDetails) {
      setWoundAssessmentData({
        patientName: procedure.patientName || '',
        woundType: procedure.woundDetails.woundType,
        woundLocation: procedure.woundDetails.woundLocation,
        woundSize: procedure.woundDetails.woundSize || { length: 0, width: 0, depth: 0 },
        woundStage: procedure.woundDetails.woundStage,
        tissueType: procedure.woundDetails.woundCharacteristics.tissueType,
        exudateType: procedure.woundDetails.woundCharacteristics.exudateType,
        exudateAmount: procedure.woundDetails.woundCharacteristics.exudateAmount,
        odor: procedure.woundDetails.woundCharacteristics.odor,
        woundAge: procedure.woundDetails.woundAge,
        riskFactors: procedure.woundDetails.riskFactors,
        painLevel: procedure.woundAssessment?.painLevel || 0,
        temperature: procedure.woundAssessment?.temperature || 37,
        surroundingSkin: procedure.woundAssessment?.surroundingSkin || 'normal',
        woundBed: procedure.woundAssessment?.woundBed || 'clean',
        infectionSigns: procedure.woundAssessment?.infectionSigns || [],
        primaryDressing: procedure.woundCareSupplies?.primaryDressing || 'gauze',
        secondaryDressing: procedure.woundCareSupplies?.secondaryDressing || 'gauze_roll',
        cleansingSolution: procedure.woundCareSupplies?.cleansingSolution || 'normal_saline',
        frequency: procedure.treatmentPlan?.frequency || 'daily',
        duration: procedure.treatmentPlan?.duration || 0,
        specialInstructions: procedure.treatmentPlan?.specialInstructions || ''
      });
    }
    setShowWoundAssessmentModal(true);
  };

  const submitCompletion = async () => {
    if (!selectedProcedure) return;
    
    await updateStatus(selectedProcedure._id, 'completed', {
      postProcedureNotes: completionData.postProcedureNotes,
      complications: completionData.complications
      // Amount is not sent - it will use the service price automatically
    });
    
    setShowCompletionModal(false);
    setCompletionData({
      postProcedureNotes: '',
      complications: '',
      amount: 0
    });
    setSelectedProcedure(null);
  };

  const submitWoundAssessment = async () => {
    if (!selectedProcedure) {
      toast.error('No procedure selected');
      return;
    }

    // Validate required fields
    if (!woundAssessmentData.woundLocation.trim()) {
      toast.error('Please enter wound location');
      return;
    }

    if (woundAssessmentData.duration <= 0) {
      toast.error('Please enter a valid treatment duration (greater than 0)');
      return;
    }

    try {
      console.log('Submitting wound assessment for procedure:', selectedProcedure._id);
      console.log('Assessment data:', woundAssessmentData);
      console.log('Selected wound type:', woundAssessmentData.woundType);
      console.log('Selected wound location:', woundAssessmentData.woundLocation);
      console.log('Selected treatment frequency:', woundAssessmentData.frequency);

      const assessmentData = {
        woundDetails: {
          woundType: woundAssessmentData.woundType,
          woundLocation: woundAssessmentData.woundLocation,
          woundSize: woundAssessmentData.woundSize,
          woundStage: woundAssessmentData.woundStage,
          woundCharacteristics: {
            tissueType: woundAssessmentData.tissueType,
            exudateType: woundAssessmentData.exudateType,
            exudateAmount: woundAssessmentData.exudateAmount,
            odor: woundAssessmentData.odor
          },
          woundAge: woundAssessmentData.woundAge,
          riskFactors: woundAssessmentData.riskFactors
        },
        woundAssessment: {
          painLevel: woundAssessmentData.painLevel,
          temperature: woundAssessmentData.temperature,
          surroundingSkin: woundAssessmentData.surroundingSkin,
          woundBed: woundAssessmentData.woundBed,
          infectionSigns: woundAssessmentData.infectionSigns
        },
        woundCareSupplies: {
          primaryDressing: woundAssessmentData.primaryDressing,
          secondaryDressing: woundAssessmentData.secondaryDressing,
          cleansingSolution: woundAssessmentData.cleansingSolution,
          additionalSupplies: []
        },
        treatmentPlan: {
          frequency: woundAssessmentData.frequency,
          duration: woundAssessmentData.duration,
          specialInstructions: woundAssessmentData.specialInstructions,
          followUpSchedule: 'daily'
        }
      };

      console.log('Sending assessment data to backend:', assessmentData);

      const result = await updateStatus(selectedProcedure._id, 'in_progress', assessmentData);
      
      if (result && result.error) {
        throw new Error(result.error);
      }

      setShowWoundAssessmentModal(false);
      setWoundAssessmentData({
        patientName: '',
        woundType: 'acute_wound',
        woundLocation: '',
        woundSize: { length: 0, width: 0, depth: 0 },
        woundStage: 'stage_1',
        tissueType: 'granulation',
        exudateType: 'serous',
        exudateAmount: 'minimal',
        odor: 'none',
        woundAge: 'acute',
        riskFactors: [],
        painLevel: 0,
        temperature: 37,
        surroundingSkin: 'normal',
        woundBed: 'clean',
        infectionSigns: [],
        primaryDressing: 'gauze',
        secondaryDressing: 'gauze_roll',
        cleansingSolution: 'normal_saline',
        frequency: 'daily',
        duration: 0,
        specialInstructions: ''
      });
      setSelectedProcedure(null);
      toast.success('Wound assessment updated successfully');
      fetchProcedures();
    } catch (error) {
      console.error('Error updating wound assessment:', error);
      toast.error(`Failed to update wound assessment: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
      case 'in_progress': return 'bg-[hsl(var(--task-in-progress))] text-[hsl(var(--task-in-progress-foreground))] border-[hsl(var(--task-in-progress-border))]';
      case 'completed': return 'bg-[hsl(var(--task-completed))] text-[hsl(var(--task-completed-foreground))] border-[hsl(var(--task-completed-border))]';
      case 'cancelled': return 'bg-[hsl(var(--task-cancelled))] text-[hsl(var(--task-cancelled-foreground))] border-[hsl(var(--task-cancelled-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[hsl(var(--priority-urgent))] text-[hsl(var(--priority-urgent-foreground))] border-[hsl(var(--priority-urgent-border))]';
      case 'high': return 'bg-[hsl(var(--priority-high))] text-[hsl(var(--priority-high-foreground))] border-[hsl(var(--priority-high-border))]';
      case 'normal': return 'bg-[hsl(var(--priority-medium))] text-[hsl(var(--priority-medium-foreground))] border-[hsl(var(--priority-medium-border))]';
      case 'low': return 'bg-[hsl(var(--priority-low))] text-[hsl(var(--priority-low-foreground))] border-[hsl(var(--priority-low-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };



  // Helper function to check if a procedure is a blood pressure procedure
  const isBloodPressureProcedure = (procedure: Procedure) => {
    const isBloodPressureType = procedure.procedureType === 'blood_pressure' || 
                                procedure.procedureType?.toLowerCase().includes('blood_pressure');
    const hasBloodPressureName = procedure.procedureName?.toLowerCase().includes('blood pressure') ||
                                 procedure.description?.toLowerCase().includes('blood pressure');
    return isBloodPressureType || hasBloodPressureName;
  };

  // Filter out blood pressure procedures first
  const nonBloodPressureProcedures = procedures.filter(procedure => !isBloodPressureProcedure(procedure));

  // Group and filter procedures (excluding blood pressure)
  const { grouped, standalone } = groupProcedures(nonBloodPressureProcedures);
  
  const filteredStandalone = standalone.filter(procedure => {
    if (filter === 'all') return true;
    return procedure.status === filter;
  });

  const filteredGrouped = Object.entries(grouped).filter(([_, group]) => {
    if (filter === 'all') return true;
    return group.main.status === filter || group.sessions.some(session => session.status === filter);
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted/30 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/30 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Nursing Procedures
          </h1>
          <p className="text-muted-foreground mt-1">Manage wound care, dressing changes, and other procedures</p>
        </div>
                 <div className="flex gap-2">
           <Button onClick={fetchProcedures} variant="outline" className="border-border/40">
             Refresh
           </Button>
           <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary">
             <Wrench className="w-4 h-4 mr-2" />
             New Procedure
           </Button>
         </div>
      </div>



       {/* Filter */}
       <div className="flex gap-2">
         <Select value={filter} onValueChange={setFilter}>
           <SelectTrigger className="w-48">
             <SelectValue placeholder="Filter by status" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Procedures</SelectItem>
             <SelectItem value="scheduled">Scheduled</SelectItem>
             <SelectItem value="in_progress">In Progress</SelectItem>
             <SelectItem value="completed">Completed</SelectItem>
             <SelectItem value="cancelled">Cancelled</SelectItem>
           </SelectContent>
         </Select>
       </div>

      {/* Procedures List */}
      <div className="grid gap-4">
        {/* Standalone Procedures */}
        {filteredStandalone.map((procedure) => (
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
                  <Badge className={getStatusColor(procedure.status)}>
                    {procedure.status?.replace('_', ' ') || procedure.status}
                  </Badge>
                  <Badge className={getPriorityColor(procedure.priority)}>
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

              {/* Saved Wound Assessment Data */}
              {procedure.procedureType === 'wound_care' && procedure.woundDetails && (
                <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium text-primary mb-2">📋 Saved Assessment:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="text-primary">
                      <strong>Wound Type:</strong> {procedure.woundDetails.woundType?.replace('_', ' ') || 'Not set'}
                    </div>
                    <div className="text-primary">
                      <strong>Location:</strong> {procedure.woundDetails.woundLocation || 'Not set'}
                    </div>
                    <div className="text-primary">
                      <strong>Stage:</strong> {procedure.woundDetails.woundStage?.replace('_', ' ') || 'Not set'}
                    </div>
                    <div className="text-primary">
                      <strong>Tissue:</strong> {procedure.woundDetails.woundCharacteristics?.tissueType?.replace('_', ' ') || 'Not set'}
                    </div>
                    {procedure.woundAssessment && (
                      <>
                        <div className="text-primary">
                          <strong>Pain Level:</strong> {procedure.woundAssessment.painLevel}/10
                        </div>
                        <div className="text-primary">
                          <strong>Wound Bed:</strong> {procedure.woundAssessment.woundBed || 'Not set'}
                        </div>
                      </>
                    )}
                    {procedure.treatmentPlan && (
                      <>
                        <div className="text-primary">
                          <strong>Frequency:</strong> {procedure.treatmentPlan.frequency?.replace('_', ' ') || 'Not set'}
                        </div>
                        <div className="text-primary">
                          <strong>Duration:</strong> {procedure.treatmentPlan.duration} days
                        </div>
                      </>
                    )}
                  </div>
                  {procedure.woundCareSupplies && (
                    <div className="mt-2 pt-2 border-t border-primary/30">
                      <p className="text-xs font-medium text-primary mb-1">Supplies:</p>
                      <div className="text-xs text-primary">
                        {procedure.woundCareSupplies.primaryDressing && (
                          <span className="inline-block bg-primary/20 px-2 py-1 rounded mr-1 mb-1">
                            {procedure.woundCareSupplies.primaryDressing.replace('_', ' ')}
                          </span>
                        )}
                        {procedure.woundCareSupplies.secondaryDressing && procedure.woundCareSupplies.secondaryDressing !== 'none' && (
                          <span className="inline-block bg-primary/20 px-2 py-1 rounded mr-1 mb-1">
                            {procedure.woundCareSupplies.secondaryDressing.replace('_', ' ')}
                          </span>
                        )}
                        {procedure.woundCareSupplies.cleansingSolution && (
                          <span className="inline-block bg-primary/20 px-2 py-1 rounded mr-1 mb-1">
                            {procedure.woundCareSupplies.cleansingSolution.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}


              <div className="flex flex-wrap gap-2 mt-4">
                {procedure.status === 'scheduled' && (
                  <Button 
                    size="default" 
                    onClick={() => updateStatus(procedure._id, 'in_progress')}
                    className="bg-accent hover:bg-accent whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    Start Procedure
                  </Button>
                )}
                {procedure.status === 'in_progress' && (
                  <Button 
                    size="default" 
                    onClick={() => handleCompleteProcedure(procedure)}
                    className="bg-primary hover:bg-primary whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    Complete
                  </Button>
                )}
                {procedure.procedureType === 'wound_care' && procedure.status !== 'completed' && procedure.status !== 'cancelled' && (
                  <Button 
                    size="default" 
                    onClick={() => handleWoundAssessment(procedure)}
                    className="bg-[hsl(var(--status-info))] hover:bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    Wound Assessment
                  </Button>
                )}
                {(procedure.procedureType === 'ear_irrigation' || procedure.procedureName.toLowerCase().includes('ear irrigation') || procedure.procedureName.toLowerCase().includes('ear irrgation')) && procedure.status !== 'completed' && procedure.status !== 'cancelled' && (
                  <Button 
                    size="default" 
                    onClick={() => handleEarIrrigationAssessment(procedure)}
                    className="bg-[hsl(var(--status-info))] hover:bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    Ear Assessment
                  </Button>
                )}
                {procedure.procedureType === 'wound_care' && procedure.woundDetails && (
                  <Button 
                    size="default" 
                    onClick={() => handleViewAssessment(procedure)}
                    className="bg-[hsl(var(--status-success))] hover:bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    View Assessment
                  </Button>
                )}
                {(procedure.procedureType === 'ear_irrigation' || procedure.procedureName.toLowerCase().includes('ear irrigation') || procedure.procedureName.toLowerCase().includes('ear irrgation')) && procedure.earIrrigationDetails && (
                  <Button 
                    size="default" 
                    onClick={() => handleViewAssessment(procedure)}
                    className="bg-[hsl(var(--status-success))] hover:bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    View Assessment
                  </Button>
                )}
                {procedure.procedureType === 'wound_care' && (
                  <Button 
                    size="default" 
                    onClick={() => fetchVisitHistory(procedure.patientId._id)}
                    className="bg-[hsl(var(--dept-doctor))] hover:bg-[hsl(var(--dept-doctor))] text-[hsl(var(--dept-doctor-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    📊 View History
                  </Button>
                )}
                {procedure.status !== 'completed' && procedure.status !== 'cancelled' && (
                  <Button 
                    size="default" 
                    onClick={() => updateStatus(procedure._id, 'cancelled')}
                    className="bg-[hsl(var(--status-error))] hover:bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Grouped Procedures with Sessions */}
        {filteredGrouped.map(([procedureId, group]) => (
          <div key={procedureId} className="space-y-2">
            {/* Main Procedure Card */}
            <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-muted-foreground" />
                      {group.main.patientName}
                    </CardTitle>
                    <p className="text-lg font-semibold text-muted-foreground mt-1">
                      {group.main.procedureName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(group.main.scheduledTime).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(group.main.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge className={getStatusColor(group.main.status)}>
                      {group.main.status?.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(group.main.priority)}>
                      {group.main.priority}
                    </Badge>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {group.sessions.length} Sessions
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProcedureExpansion(procedureId)}
                      className="p-1"
                    >
                      {expandedProcedures.has(procedureId) ? '▼' : '▶'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-muted-foreground mb-4">{group.main.description}</p>
                
                {/* Session Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Session Progress</span>
                    <span>
                      {group.sessions.filter(s => s.status === 'completed').length} / {group.sessions.length} completed
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(group.sessions.filter(s => s.status === 'completed').length / group.sessions.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Main Procedure Actions */}
                <div className="flex flex-wrap gap-2">
                  {group.main.status === 'scheduled' && (
                    <Button 
                      size="default" 
                      onClick={() => updateStatus(group.main._id, 'in_progress')}
                      className="bg-accent hover:bg-accent whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                    >
                      Start Procedure
                    </Button>
                  )}
                  {group.main.status === 'in_progress' && (
                    <Button 
                      size="default" 
                      onClick={() => {
                        setSelectedProcedure(group.main);
                        setShowCompletionModal(true);
                      }}
                      className="bg-primary hover:bg-primary whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                    >
                      Complete
                    </Button>
                  )}
                  <Button 
                    size="default" 
                    onClick={() => {
                      setSelectedProcedure(group.main);
                      setShowWoundAssessmentModal(true);
                    }}
                    className="bg-[hsl(var(--status-info))] hover:bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    Wound Assessment
                  </Button>
                  <Button 
                    size="default" 
                    onClick={() => {
                      setSelectedProcedure(group.main);
                      setShowWoundAssessmentModal(true);
                    }}
                    className="bg-[hsl(var(--status-success))] hover:bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium procedure-button"
                  >
                    View Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Expandable Sessions */}
            {expandedProcedures.has(procedureId) && (
              <div className="ml-6 space-y-2">
                {group.sessions.map((session) => (
                  <Card key={session._id} className="bg-muted/10 border-l-2 border-l-gray-300">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-muted-foreground">{session.procedureName}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(session.scheduledTime).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(session.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge className={getStatusColor(session.status)}>
                            {session.status?.replace('_', ' ')}
                          </Badge>
                          {session.status === 'scheduled' && (
                            <>
                              <Button 
                                size="default" 
                                onClick={() => updateStatus(session._id, 'in_progress')}
                                className="bg-accent hover:bg-accent whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                              >
                                Start
                              </Button>
                              <Button 
                                size="default" 
                                onClick={() => {
                                  setSelectedProcedure(session);
                                  setShowCompletionModal(true);
                                }}
                                className="bg-primary hover:bg-primary whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                              >
                                Complete
                              </Button>
                            </>
                          )}
                          {session.status === 'in_progress' && (
                            <Button 
                              size="default" 
                              onClick={() => {
                                setSelectedProcedure(session);
                                setShowCompletionModal(true);
                              }}
                              className="bg-primary hover:bg-primary whitespace-nowrap min-w-fit px-4 py-2 text-sm font-medium"
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Procedure Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">New Procedure</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="procedureType">Procedure Type</Label>
                  <Select value={formData.procedureType} onValueChange={(value) => setFormData({...formData, procedureType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wound_care">Wound Care</SelectItem>
                      <SelectItem value="dressing_change">Dressing Change</SelectItem>
                      <SelectItem value="catheter_care">Catheter Care</SelectItem>
                      <SelectItem value="iv_care">IV Care</SelectItem>
                      <SelectItem value="injection">Injection</SelectItem>
                      <SelectItem value="blood_draw">Blood Draw</SelectItem>
                      <SelectItem value="vital_signs">Vital Signs</SelectItem>
                      <SelectItem value="medication_administration">Medication Administration</SelectItem>
                      <SelectItem value="patient_education">Patient Education</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="procedureName">Procedure Name</Label>
                <Input
                  id="procedureName"
                  value={formData.procedureName}
                  onChange={(e) => setFormData({...formData, procedureName: e.target.value})}
                  placeholder="e.g., Wound Dressing Change"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the procedure..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledTime">Scheduled Time</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    placeholder="Enter duration in minutes (e.g., 15, 30, 45)"
                    min="5"
                    max="480"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Ward, Room, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="roomNumber">Room Number</Label>
                  <Input
                    id="roomNumber"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  placeholder="Special instructions for the procedure..."
                />
              </div>

              <div>
                <Label htmlFor="preProcedureNotes">Pre-Procedure Notes</Label>
                <Textarea
                  id="preProcedureNotes"
                  value={formData.preProcedureNotes}
                  onChange={(e) => setFormData({...formData, preProcedureNotes: e.target.value})}
                  placeholder="Any notes before the procedure..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary">
                  Create Procedure
                </Button>
              </div>
            </form>
                     </div>
         </div>
       )}

       {/* Procedure Completion Modal */}
       {showCompletionModal && selectedProcedure && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <h2 className="text-2xl font-bold mb-4">Complete Procedure</h2>
             <div className="space-y-4">
               <div className="p-4 bg-primary/10 rounded-lg">
                 <p className="font-medium text-primary">Procedure: {selectedProcedure.procedureName}</p>
                 <p className="text-primary">Patient: {selectedProcedure.patientName}</p>
               </div>

               <div>
                 <Label htmlFor="postProcedureNotes">Post-Procedure Notes</Label>
                 <Textarea
                   id="postProcedureNotes"
                   value={completionData.postProcedureNotes}
                   onChange={(e) => setCompletionData({...completionData, postProcedureNotes: e.target.value})}
                   placeholder="Notes about the completed procedure..."
                 />
               </div>

               <div>
                 <Label htmlFor="complications">Complications (if any)</Label>
                 <Textarea
                   id="complications"
                   value={completionData.complications}
                   onChange={(e) => setCompletionData({...completionData, complications: e.target.value})}
                   placeholder="Any complications that occurred..."
                 />
               </div>

               <div>
                 <Label>Service Price (ETB)</Label>
                 <div className="p-3 bg-muted/10 rounded-md border">
                   <p className="text-lg font-semibold text-muted-foreground">
                     {selectedProcedure.amount || 0} ETB
                   </p>
                   <p className="text-sm text-muted-foreground mt-1">
                     Price is set from service configuration and cannot be changed by nurses
                   </p>
                 </div>
               </div>

               <div className="flex gap-2 justify-end">
                 <Button 
                   type="button" 
                   variant="outline" 
                   onClick={() => {
                     setShowCompletionModal(false);
                    setCompletionData({
                      postProcedureNotes: '',
                      complications: '',
                      amount: 0
                    });
                     setSelectedProcedure(null);
                   }}
                 >
                   Cancel
                 </Button>
                 <Button 
                   type="button" 
                   onClick={submitCompletion}
                   className="bg-primary hover:bg-primary"
                 >
                   Complete & Submit
                 </Button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Wound Assessment Modal */}
       {showWoundAssessmentModal && selectedProcedure && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
             <h2 className="text-2xl font-bold mb-4">Professional Wound Assessment</h2>
             <div className="p-4 bg-secondary/10 rounded-lg mb-4">
               <p className="font-medium text-secondary-foreground">Patient: {selectedProcedure.patientName}</p>
               <p className="text-secondary-foreground">Procedure: {selectedProcedure.procedureName}</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Wound Details Section */}
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">Wound Details</h3>
                 
                 <div>
                   <Label htmlFor="woundType">Wound Type</Label>
                   <Select value={woundAssessmentData.woundType} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, woundType: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="surgical_wound">Surgical Wound</SelectItem>
                       <SelectItem value="pressure_ulcer">Pressure Ulcer</SelectItem>
                       <SelectItem value="diabetic_ulcer">Diabetic Ulcer</SelectItem>
                       <SelectItem value="venous_ulcer">Venous Ulcer</SelectItem>
                       <SelectItem value="arterial_ulcer">Arterial Ulcer</SelectItem>
                       <SelectItem value="trauma_wound">Trauma Wound</SelectItem>
                       <SelectItem value="burn_wound">Burn Wound</SelectItem>
                       <SelectItem value="infected_wound">Infected Wound</SelectItem>
                       <SelectItem value="chronic_wound">Chronic Wound</SelectItem>
                       <SelectItem value="acute_wound">Acute Wound</SelectItem>
                       <SelectItem value="other">Other</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="woundLocation">Wound Location</Label>
                   <Input
                     id="woundLocation"
                     value={woundAssessmentData.woundLocation}
                     onChange={(e) => setWoundAssessmentData({...woundAssessmentData, woundLocation: e.target.value})}
                     placeholder="e.g., Right lower leg, anterior aspect"
                   />
                 </div>

                 <div className="grid grid-cols-3 gap-2">
                   <div>
                     <Label htmlFor="length">Length (cm)</Label>
                     <Input
                       id="length"
                       type="number"
                       value={woundAssessmentData.woundSize.length}
                       onChange={(e) => setWoundAssessmentData({
                         ...woundAssessmentData, 
                         woundSize: {...woundAssessmentData.woundSize, length: parseFloat(e.target.value) || 0}
                       })}
                       min="0"
                       step="0.1"
                     />
                   </div>
                   <div>
                     <Label htmlFor="width">Width (cm)</Label>
                     <Input
                       id="width"
                       type="number"
                       value={woundAssessmentData.woundSize.width}
                       onChange={(e) => setWoundAssessmentData({
                         ...woundAssessmentData, 
                         woundSize: {...woundAssessmentData.woundSize, width: parseFloat(e.target.value) || 0}
                       })}
                       min="0"
                       step="0.1"
                     />
                   </div>
                   <div>
                     <Label htmlFor="depth">Depth (cm)</Label>
                     <Input
                       id="depth"
                       type="number"
                       value={woundAssessmentData.woundSize.depth}
                       onChange={(e) => setWoundAssessmentData({
                         ...woundAssessmentData, 
                         woundSize: {...woundAssessmentData.woundSize, depth: parseFloat(e.target.value) || 0}
                       })}
                       min="0"
                       step="0.1"
                     />
                   </div>
                 </div>

                 <div>
                   <Label htmlFor="woundStage">Wound Stage</Label>
                   <Select value={woundAssessmentData.woundStage} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, woundStage: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="stage_1">Stage 1</SelectItem>
                       <SelectItem value="stage_2">Stage 2</SelectItem>
                       <SelectItem value="stage_3">Stage 3</SelectItem>
                       <SelectItem value="stage_4">Stage 4</SelectItem>
                       <SelectItem value="unstageable">Unstageable</SelectItem>
                       <SelectItem value="deep_tissue_injury">Deep Tissue Injury</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               {/* Wound Characteristics Section */}
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">Wound Characteristics</h3>
                 
                 <div>
                   <Label htmlFor="tissueType">Tissue Type</Label>
                   <Select value={woundAssessmentData.tissueType} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, tissueType: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="granulation">Granulation</SelectItem>
                       <SelectItem value="slough">Slough</SelectItem>
                       <SelectItem value="necrotic">Necrotic</SelectItem>
                       <SelectItem value="epithelial">Epithelial</SelectItem>
                       <SelectItem value="mixed">Mixed</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="exudateType">Exudate Type</Label>
                   <Select value={woundAssessmentData.exudateType} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, exudateType: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="serous">Serous</SelectItem>
                       <SelectItem value="sanguineous">Sanguineous</SelectItem>
                       <SelectItem value="serosanguineous">Serosanguineous</SelectItem>
                       <SelectItem value="purulent">Purulent</SelectItem>
                       <SelectItem value="none">None</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="exudateAmount">Exudate Amount</Label>
                   <Select value={woundAssessmentData.exudateAmount} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, exudateAmount: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">None</SelectItem>
                       <SelectItem value="minimal">Minimal</SelectItem>
                       <SelectItem value="moderate">Moderate</SelectItem>
                       <SelectItem value="heavy">Heavy</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="odor">Odor</Label>
                   <Select value={woundAssessmentData.odor} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, odor: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">None</SelectItem>
                       <SelectItem value="mild">Mild</SelectItem>
                       <SelectItem value="moderate">Moderate</SelectItem>
                       <SelectItem value="strong">Strong</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="painLevel">Pain Level (0-10)</Label>
                   <Input
                     id="painLevel"
                     type="number"
                     value={woundAssessmentData.painLevel}
                     onChange={(e) => setWoundAssessmentData({...woundAssessmentData, painLevel: parseInt(e.target.value) || 0})}
                     min="0"
                     max="10"
                   />
                 </div>
               </div>
             </div>

             {/* Treatment Plan Section */}
             <div className="mt-6 space-y-4">
               <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">Treatment Plan</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <Label htmlFor="primaryDressing">Primary Dressing</Label>
                   <Select value={woundAssessmentData.primaryDressing} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, primaryDressing: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="gauze">Gauze</SelectItem>
                       <SelectItem value="hydrocolloid">Hydrocolloid</SelectItem>
                       <SelectItem value="hydrogel">Hydrogel</SelectItem>
                       <SelectItem value="foam">Foam</SelectItem>
                       <SelectItem value="alginate">Alginate</SelectItem>
                       <SelectItem value="collagen">Collagen</SelectItem>
                       <SelectItem value="transparent_film">Transparent Film</SelectItem>
                       <SelectItem value="antimicrobial">Antimicrobial</SelectItem>
                       <SelectItem value="other">Other</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="cleansingSolution">Cleansing Solution</Label>
                   <Select value={woundAssessmentData.cleansingSolution} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, cleansingSolution: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="normal_saline">Normal Saline</SelectItem>
                       <SelectItem value="sterile_water">Sterile Water</SelectItem>
                       <SelectItem value="antiseptic_solution">Antiseptic Solution</SelectItem>
                       <SelectItem value="wound_cleanser">Wound Cleanser</SelectItem>
                       <SelectItem value="other">Other</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="frequency">Treatment Frequency</Label>
                   <Select value={woundAssessmentData.frequency} onValueChange={(value) => setWoundAssessmentData({...woundAssessmentData, frequency: value})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="daily">Daily</SelectItem>
                       <SelectItem value="twice_daily">Twice Daily</SelectItem>
                       <SelectItem value="every_other_day">Every Other Day</SelectItem>
                       <SelectItem value="weekly">Weekly</SelectItem>
                       <SelectItem value="as_needed">As Needed</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div>
                   <Label htmlFor="treatmentDuration">Treatment Duration (days)</Label>
                   <Input
                     id="treatmentDuration"
                     type="number"
                     value={woundAssessmentData.duration}
                     onChange={(e) => setWoundAssessmentData({...woundAssessmentData, duration: parseInt(e.target.value) || 0})}
                     placeholder="Enter duration in days (e.g., 7, 14, 30)"
                     min="0"
                     max="365"
                   />
                 </div>

               </div>

               {/* Schedule Preview */}
               <div className="mt-6 w-full">
                 <WoundCareSchedule
                   patientName={woundAssessmentData.patientName || 'Patient'}
                   frequency={woundAssessmentData.frequency}
                   duration={woundAssessmentData.duration}
                   startDate={new Date()}
                   className="w-full max-w-none"
                 />
               </div>

               <div>
                 <Label htmlFor="specialInstructions">Special Instructions</Label>
                 <Textarea
                   id="specialInstructions"
                   value={woundAssessmentData.specialInstructions}
                   onChange={(e) => setWoundAssessmentData({...woundAssessmentData, specialInstructions: e.target.value})}
                   placeholder="Any special instructions for wound care..."
                 />
               </div>
             </div>

             <div className="flex gap-2 justify-end mt-6">
               <Button 
                 type="button" 
                 variant="outline" 
                 onClick={() => {
                   setShowWoundAssessmentModal(false);
                   setSelectedProcedure(null);
                 }}
               >
                 Cancel
               </Button>
               <Button 
                 type="button" 
                 onClick={submitWoundAssessment}
                 className="bg-secondary hover:bg-secondary"
               >
                 Save Assessment
               </Button>
             </div>
           </div>
         </div>
       )}

       {/* Ear Irrigation Assessment Modal */}
       {showEarIrrigationAssessment && selectedEarIrrigationProcedure && (
         <EarIrrigationAssessment
           procedureId={selectedEarIrrigationProcedure._id}
           patientName={selectedEarIrrigationProcedure.patientName}
           onAssessmentComplete={handleEarIrrigationAssessmentComplete}
           onClose={() => {
             setShowEarIrrigationAssessment(false);
             setSelectedEarIrrigationProcedure(null);
           }}
           existingData={selectedEarIrrigationProcedure.earIrrigationDetails ? {
             earIrrigationDetails: selectedEarIrrigationProcedure.earIrrigationDetails,
             earIrrigationAssessment: selectedEarIrrigationProcedure.earIrrigationAssessment,
             earIrrigationSupplies: selectedEarIrrigationProcedure.earIrrigationSupplies,
             earIrrigationPlan: selectedEarIrrigationProcedure.earIrrigationPlan
           } : undefined}
           isViewMode={selectedEarIrrigationProcedure.status === 'completed'}
         />
       )}

       {/* Visit History Modal */}
       {showVisitHistoryModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-primary-foreground rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold">Patient Visit History & Progress</h2>
               <Button 
                 variant="outline" 
                 onClick={() => setShowVisitHistoryModal(false)}
                 className="text-muted-foreground"
               >
                 ✕
               </Button>
             </div>

             {/* Progress Summary */}
             {progressData && (
               <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                 <h3 className="text-lg font-semibold text-primary mb-3">📈 Progress Summary</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="text-center">
                     <div className="text-2xl font-bold text-primary">{progressData.totalVisits || 0}</div>
                     <div className="text-sm text-primary">Total Visits</div>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-primary">
                       {progressData.averageInterval ? Math.round(progressData.averageInterval) : 0}
                     </div>
                     <div className="text-sm text-primary">Avg. Days Between Visits</div>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-secondary-foreground">
                       {progressData.firstVisit ? new Date(progressData.firstVisit).toLocaleDateString() : 'N/A'}
                     </div>
                     <div className="text-sm text-secondary-foreground">First Visit</div>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-accent-foreground">
                       {progressData.lastVisit ? new Date(progressData.lastVisit).toLocaleDateString() : 'N/A'}
                     </div>
                     <div className="text-sm text-accent-foreground">Last Visit</div>
                   </div>
                 </div>
               </div>
             )}

             {/* Visit History List */}
             <div className="space-y-4">
               <h3 className="text-lg font-semibold text-muted-foreground">🕒 Visit History</h3>
               {visitHistory.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">
                   No previous visits found for this patient.
                 </div>
               ) : (
                 visitHistory.map((visit, index) => (
                   <div key={visit._id} className={`p-4 rounded-lg border ${visit.isLatest ? 'bg-accent/10 border-yellow-200' : 'bg-muted/10 border-border/30'}`}>
                     <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-bold ${visit.isLatest ? 'bg-accent' : 'bg-primary'}`}>
                           {visit.visitNumber}
                         </div>
                         <div>
                           <h4 className="font-semibold text-muted-foreground">
                             Visit #{visit.visitNumber} - {new Date(visit.scheduledTime).toLocaleDateString()}
                           </h4>
                           <p className="text-sm text-muted-foreground">
                             {new Date(visit.scheduledTime).toLocaleTimeString()} • {visit.assignedNurseName}
                           </p>
                         </div>
                       </div>
                       <div className="flex gap-2">
                         <Badge className={getStatusColor(visit.status)}>
                           {visit.status?.replace('_', ' ')}
                         </Badge>
                         {visit.isLatest && (
                           <Badge className="bg-accent/20 text-accent-foreground">
                             Latest
                           </Badge>
                         )}
                       </div>
                     </div>

                     {/* Wound Assessment Summary */}
                     {visit.woundDetails && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 p-3 bg-primary-foreground rounded border">
                         <div>
                           <strong className="text-muted-foreground">Wound Type:</strong>
                           <p className="text-sm">{visit.woundDetails.woundType?.replace('_', ' ') || 'Not set'}</p>
                         </div>
                         <div>
                           <strong className="text-muted-foreground">Stage:</strong>
                           <p className="text-sm">{visit.woundDetails.woundStage?.replace('_', ' ') || 'Not set'}</p>
                         </div>
                         <div>
                           <strong className="text-muted-foreground">Pain Level:</strong>
                           <p className="text-sm">{visit.woundAssessment?.painLevel || 'Not set'}/10</p>
                         </div>
                         <div>
                           <strong className="text-muted-foreground">Location:</strong>
                           <p className="text-sm">{visit.woundDetails.woundLocation || 'Not set'}</p>
                         </div>
                         <div>
                           <strong className="text-muted-foreground">Tissue:</strong>
                           <p className="text-sm">{visit.woundDetails.woundCharacteristics?.tissueType?.replace('_', ' ') || 'Not set'}</p>
                         </div>
                         <div>
                           <strong className="text-muted-foreground">Improvement:</strong>
                           <p className="text-sm">{visit.improvementStatus || 'Not assessed'}</p>
                         </div>
                       </div>
                     )}

                     {/* Progress Notes */}
                     {visit.progressNotes && (
                       <div className="mt-3 p-3 bg-primary/10 rounded border">
                         <strong className="text-primary">Progress Notes:</strong>
                         <p className="text-sm text-primary mt-1">{visit.progressNotes}</p>
                       </div>
                     )}
                   </div>
                 ))
               )}
             </div>

             <div className="flex justify-end mt-6">
               <Button 
                 onClick={() => setShowVisitHistoryModal(false)}
                 className="bg-primary hover:bg-primary"
               >
                 Close
               </Button>
             </div>
           </div>
         </div>
       )}

     </div>
   );
 };

export default Procedures; 