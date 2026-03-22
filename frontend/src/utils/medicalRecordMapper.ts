/**
 * Medical Record Data Mapper Utility
 * 
 * This utility provides functions to map between backend medical record data
 * and frontend form data structures, ensuring consistent data handling.
 */

export interface BackendMedicalRecord {
  _id?: string;
  patient?: string;
  patientId?: string;
  doctor?: string;
  doctorId?: string;
  chiefComplaint?: {
    description?: string;
    duration?: string;
    severity?: string;
    onsetPattern?: string;
    progression?: string;
    location?: string;
    aggravatingFactors?: string[];
    relievingFactors?: string[];
    associatedSymptoms?: string[];
    impactOnDailyLife?: string;
    previousEpisodes?: boolean;
    previousEpisodesDetails?: string;
    recordedBy?: string;
    recordedAt?: string;
  };
  historyOfPresentIllness?: string;
  physicalExamination?: {
    general?: string;
    heent?: {
      head?: string;
      eyes?: string;
      ears?: string;
      nose?: string;
      throat?: string;
    };
    cardiovascular?: string;
    respiratory?: string;
    gastrointestinal?: string;
    neurological?: string;
    musculoskeletal?: string;
    skin?: string;
    summary?: string;
  };
  vitalSigns?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    height?: string;
    weight?: string;
    bmi?: string;
  };
  assessment?: {
    primaryDiagnosis?: string;
    secondaryDiagnoses?: any[];
    plan?: string;
    followUp?: string;
  };
  diagnosis?: string;
  plan?: string;
  treatmentPlan?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormMedicalRecord {
  _id?: string;
  patient?: string;
  chiefComplaint?: {
    description: string;
    duration: string;
    severity: string;
    onsetPattern: string;
    progression: string;
    location: string;
    aggravatingFactors: string[];
    relievingFactors: string[];
    associatedSymptoms: string[];
    impactOnDailyLife: string;
    previousEpisodes: boolean;
    previousEpisodesDetails: string;
    recordedBy?: string;
    recordedAt?: string;
  };
  historyOfPresentIllness?: string;
  physicalExamination?: {
    general: string;
    heent: {
      head: string;
      eyes: string;
      ears: string;
      nose: string;
      throat: string;
    };
    cardiovascular: string;
    respiratory: string;
    gastrointestinal: string;
    neurological: string;
    musculoskeletal: string;
    skin: string;
    summary: string;
  };
  vitalSigns?: {
    temperature: string;
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    oxygenSaturation: string;
    height: string;
    weight: string;
    bmi: string;
  };
  assessment?: {
    primaryDiagnosis: string;
    secondaryDiagnoses: any[];
    plan: string;
    followUp: string;
  };
  diagnosis?: string;
  plan?: string;
  treatmentPlan?: string;
  notes?: string;
  status?: string;
}

/**
 * Map backend medical record data to frontend form structure
 */
export const mapBackendToForm = (backendData: BackendMedicalRecord): FormMedicalRecord => {
  console.log('🔄 [MAPPER] Mapping backend data to form structure:', backendData);
  
  const formData: FormMedicalRecord = {
    _id: backendData._id,
    patient: backendData.patient || backendData.patientId,
    status: backendData.status || 'Draft'
  };

  // Map chief complaint
  if (backendData.chiefComplaint) {
    formData.chiefComplaint = {
      description: backendData.chiefComplaint.description || '',
      duration: backendData.chiefComplaint.duration || '',
      severity: backendData.chiefComplaint.severity || 'Mild',
      onsetPattern: backendData.chiefComplaint.onsetPattern || 'Acute',
      progression: backendData.chiefComplaint.progression || 'Stable',
      location: backendData.chiefComplaint.location || '',
      aggravatingFactors: backendData.chiefComplaint.aggravatingFactors || [],
      relievingFactors: backendData.chiefComplaint.relievingFactors || [],
      associatedSymptoms: backendData.chiefComplaint.associatedSymptoms || [],
      impactOnDailyLife: backendData.chiefComplaint.impactOnDailyLife || '',
      previousEpisodes: backendData.chiefComplaint.previousEpisodes || false,
      previousEpisodesDetails: backendData.chiefComplaint.previousEpisodesDetails || '',
      recordedBy: backendData.chiefComplaint.recordedBy,
      recordedAt: backendData.chiefComplaint.recordedAt
    };
  }

  // Map history of present illness
  if (backendData.historyOfPresentIllness) {
    formData.historyOfPresentIllness = backendData.historyOfPresentIllness;
  }

  // Map physical examination
  if (backendData.physicalExamination) {
    formData.physicalExamination = {
      general: backendData.physicalExamination.general || '',
      heent: {
        head: backendData.physicalExamination.heent?.head || '',
        eyes: backendData.physicalExamination.heent?.eyes || '',
        ears: backendData.physicalExamination.heent?.ears || '',
        nose: backendData.physicalExamination.heent?.nose || '',
        throat: backendData.physicalExamination.heent?.throat || ''
      },
      cardiovascular: backendData.physicalExamination.cardiovascular || '',
      respiratory: backendData.physicalExamination.respiratory || '',
      gastrointestinal: backendData.physicalExamination.gastrointestinal || '',
      neurological: backendData.physicalExamination.neurological || '',
      musculoskeletal: backendData.physicalExamination.musculoskeletal || '',
      skin: backendData.physicalExamination.skin || '',
      summary: backendData.physicalExamination.summary || ''
    };
  }

  // Map vital signs
  if (backendData.vitalSigns) {
    formData.vitalSigns = {
      temperature: backendData.vitalSigns.temperature || '',
      bloodPressure: backendData.vitalSigns.bloodPressure || '',
      heartRate: backendData.vitalSigns.heartRate || '',
      respiratoryRate: backendData.vitalSigns.respiratoryRate || '',
      oxygenSaturation: backendData.vitalSigns.oxygenSaturation || '',
      height: backendData.vitalSigns.height || '',
      weight: backendData.vitalSigns.weight || '',
      bmi: backendData.vitalSigns.bmi || ''
    };
  }

  // Map assessment
  if (backendData.assessment) {
    formData.assessment = {
      primaryDiagnosis: backendData.assessment.primaryDiagnosis || '',
      secondaryDiagnoses: backendData.assessment.secondaryDiagnoses || [],
      plan: backendData.assessment.plan || '',
      followUp: backendData.assessment.followUp || ''
    };
  }

  // Map other fields
  if (backendData.diagnosis) {
    formData.diagnosis = backendData.diagnosis;
  }
  if (backendData.plan) {
    formData.plan = backendData.plan;
  }
  if (backendData.treatmentPlan) {
    formData.treatmentPlan = backendData.treatmentPlan;
  }
  if (backendData.notes) {
    formData.notes = backendData.notes;
  }

  console.log('✅ [MAPPER] Mapped form data:', formData);
  return formData;
};

/**
 * Map frontend form data to backend structure
 */
export const mapFormToBackend = (formData: FormMedicalRecord): BackendMedicalRecord => {
  console.log('🔄 [MAPPER] Mapping form data to backend structure:', formData);
  
  const backendData: BackendMedicalRecord = {
    _id: formData._id,
    patient: formData.patient,
    status: formData.status || 'Draft'
  };

  // Map chief complaint
  if (formData.chiefComplaint) {
    backendData.chiefComplaint = {
      description: formData.chiefComplaint.description,
      duration: formData.chiefComplaint.duration,
      severity: formData.chiefComplaint.severity,
      onsetPattern: formData.chiefComplaint.onsetPattern,
      progression: formData.chiefComplaint.progression,
      location: formData.chiefComplaint.location,
      aggravatingFactors: formData.chiefComplaint.aggravatingFactors,
      relievingFactors: formData.chiefComplaint.relievingFactors,
      associatedSymptoms: formData.chiefComplaint.associatedSymptoms,
      impactOnDailyLife: formData.chiefComplaint.impactOnDailyLife,
      previousEpisodes: formData.chiefComplaint.previousEpisodes,
      previousEpisodesDetails: formData.chiefComplaint.previousEpisodesDetails,
      recordedBy: formData.chiefComplaint.recordedBy,
      recordedAt: formData.chiefComplaint.recordedAt
    };
  }

  // Map other fields
  if (formData.historyOfPresentIllness) {
    backendData.historyOfPresentIllness = formData.historyOfPresentIllness;
  }
  if (formData.physicalExamination) {
    backendData.physicalExamination = formData.physicalExamination;
  }
  if (formData.vitalSigns) {
    backendData.vitalSigns = formData.vitalSigns;
  }
  if (formData.assessment) {
    backendData.assessment = formData.assessment;
  }
  if (formData.diagnosis) {
    backendData.diagnosis = formData.diagnosis;
  }
  if (formData.plan) {
    backendData.plan = formData.plan;
  }
  if (formData.treatmentPlan) {
    backendData.treatmentPlan = formData.treatmentPlan;
  }
  if (formData.notes) {
    backendData.notes = formData.notes;
  }

  console.log('✅ [MAPPER] Mapped backend data:', backendData);
  return backendData;
};

/**
 * Check if a medical record has meaningful data
 */
export const hasMedicalRecordData = (record: BackendMedicalRecord | FormMedicalRecord): boolean => {
  if (!record) return false;
  
  // Check if chief complaint has description
  if (record.chiefComplaint?.description && record.chiefComplaint.description.trim() !== '') {
    return true;
  }
  
  // Check if there's a diagnosis
  if (record.diagnosis && record.diagnosis.trim() !== '') {
    return true;
  }
  
  // Check if there's a plan
  if (record.plan && record.plan.trim() !== '') {
    return true;
  }
  
  // Check if there's assessment data
  if (record.assessment?.primaryDiagnosis && record.assessment.primaryDiagnosis.trim() !== '') {
    return true;
  }
  
  return false;
};

/**
 * Get a summary of the medical record for display
 */
export const getMedicalRecordSummary = (record: BackendMedicalRecord | FormMedicalRecord): string => {
  if (!record) return 'No data';
  
  const parts: string[] = [];
  
  if (record.chiefComplaint?.description) {
    parts.push(`Chief Complaint: ${record.chiefComplaint.description}`);
  }
  
  if (record.diagnosis) {
    parts.push(`Diagnosis: ${record.diagnosis}`);
  }
  
  if (record.assessment?.primaryDiagnosis) {
    parts.push(`Primary Diagnosis: ${record.assessment.primaryDiagnosis}`);
  }
  
  if (record.plan) {
    parts.push(`Plan: ${record.plan}`);
  }
  
  if (record.assessment?.plan) {
    parts.push(`Treatment Plan: ${record.assessment.plan}`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : 'No data available';
};
