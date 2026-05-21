// AI Assistant Service for Clinical Decision Support

export interface DDxItem {
  condition: string;
  reasoning: string;
  isRedFlag: boolean;
}

export interface AmbientExtractionResult {
  isClinical: boolean;          // false = noise, discard
  noiseReason?: string;         // why it was flagged as noise
  chiefComplaint: string;
  chiefComplaintConfidence: number;   // 0–100
  duration: string;
  durationConfidence: number;
  severity: string;
  severityConfidence: number;
  progression: string;
  progressionConfidence: number;
  location: string;
  locationConfidence: number;
  hpiNarrative: string;
  diarizedTranscript: string;
}

export interface GeminiHPIResult {
  isAIAvailable: boolean;
  narrative: string;
  suggestedPhrases: {
    duration?: string[];
    severity?: string[];
    progression?: string[];
    location?: string[];
    character?: string[];
    aggravating?: string[];
    relieving?: string[];
    associated?: string[];
  };
  redFlags: string[];
  differentialDiagnoses: DDxItem[];
  suggestedLabs?: string[];
  suggestedExams?: string[];
}

export interface AISuggestion {
  diagnoses: string[];
  medications: string[];
  labTests: string[];
  imaging: string[];
  followUp: string[];
  redFlags: string[];
  clinicalNotes: string[];
  differentialDiagnoses: string[];
  hpiSuggestions: string[];
  hpiTemplate?: string;
}

export interface PhysicalExamSuggestions {
  general: string[];
  heent: { head: string[]; eyes: string[]; ears: string[]; nose: string[]; throat: string[] };
  cardiovascular: string[];
  respiratory: string[];
  gastrointestinal: string[];
  neurological: string[];
  musculoskeletal: string[];
  skin: string[];
}

export interface PatientData {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  symptoms?: string[];
  vitals?: Record<string, any>;
  age?: number;
  gender?: string;
  allergies?: string[];
  pastMedicalHistory?: string;
  currentMedications?: string[];
  socialHistory?: string;
  familyHistory?: string;
  // OLD CARTS fields
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  timing?: string;
  severity?: string;
  // Additional clinical fields
  progression?: string;
  associatedSymptoms?: string[];
}

export class AIAssistantService {
  /**
   * Generate comprehensive AI suggestions based on patient data
   */
  static generateSuggestions(patientData: PatientData): AISuggestion {
    const {
      chiefComplaint = '',
      symptoms = [],
      vitals = {},
      age = 0,
      gender = '',
      allergies = [],
      pastMedicalHistory = '',
      currentMedications = []
    } = patientData;

    const complaint = chiefComplaint.toLowerCase();
    const symptomList = symptoms.map(s => s.toLowerCase());
    
    const suggestions: AISuggestion = {
      diagnoses: [],
      medications: [],
      labTests: [],
      imaging: [],
      followUp: [],
      redFlags: [],
      clinicalNotes: [],
      differentialDiagnoses: [],
      hpiSuggestions: []
    };

    // Headache analysis
    if (complaint.includes('headache') || symptomList.includes('headache')) {
      suggestions.diagnoses.push(
        'Tension headache',
        'Migraine',
        'Sinus headache',
        'Cluster headache'
      );
      suggestions.medications.push(
        'Acetaminophen 500-1000mg PO q6h PRN',
        'Ibuprofen 400-600mg PO q6-8h PRN',
        'Sumatriptan 50mg PO PRN (for migraine)'
      );
      suggestions.redFlags.push(
        'Sudden onset severe headache',
        'Headache with neck stiffness',
        'Headache with fever and rash',
        'Headache with visual changes'
      );
      
      // HPI writing suggestions for headache
      suggestions.hpiSuggestions.push(
        'Document headache onset: sudden vs gradual',
        'Describe headache character: throbbing, pressure, sharp, dull',
        'Note headache location: frontal, temporal, occipital, generalized',
        'Assess headache severity: mild, moderate, severe (1-10 scale)',
        'Document headache triggers: stress, foods, sleep, weather',
        'Note associated symptoms: nausea, vomiting, photophobia, phonophobia',
        'Assess headache impact on daily activities',
        'Document previous headache episodes and treatments'
      );
    }

    // Respiratory symptoms
    if (complaint.includes('cough') || complaint.includes('fever') || 
        symptomList.includes('cough') || symptomList.includes('fever')) {
      suggestions.diagnoses.push(
        'Upper respiratory tract infection',
        'Viral syndrome',
        'Acute bronchitis',
        'Pneumonia (if severe)'
      );
      suggestions.medications.push(
        'Amoxicillin 500mg PO TID x 7 days',
        'Dextromethorphan 15mg PO q4-6h PRN cough',
        'Acetaminophen 500mg PO q6h PRN fever',
        'Guaifenesin 200mg PO q4h PRN'
      );
      suggestions.labTests.push(
        'Complete Blood Count (CBC)',
        'C-Reactive Protein (CRP)',
        'Chest X-ray (if pneumonia suspected)'
      );
      
      // HPI writing suggestions for respiratory symptoms
      suggestions.hpiSuggestions.push(
        'Document symptom onset and duration',
        'Describe cough character: dry, productive, hacking, paroxysmal',
        'Note sputum characteristics: color, consistency, amount',
        'Document fever pattern: continuous, intermittent, remittent',
        'Assess respiratory distress: dyspnea, chest tightness, wheezing',
        'Note associated symptoms: sore throat, nasal congestion, fatigue',
        'Document exposure history: sick contacts, travel, environmental',
        'Assess functional impact: sleep, appetite, daily activities'
      );
    }

    // Fever analysis
    if (complaint.includes('fever') || symptomList.includes('fever')) {
      suggestions.clinicalNotes.push(
        'Monitor temperature regularly',
        'Assess for dehydration',
        'Consider antipyretic therapy'
      );
      suggestions.redFlags.push(
        'High fever (>39°C)',
        'Fever with rash',
        'Fever with neck stiffness',
        'Fever lasting >3 days'
      );
    }

    // Chest pain analysis
    if (complaint.includes('chest pain') || symptomList.includes('chest pain')) {
      suggestions.diagnoses.push(
        'Musculoskeletal chest pain',
        'Costochondritis',
        'GERD',
        'Cardiac evaluation needed'
      );
      suggestions.redFlags.push(
        'Chest pain with radiation',
        'Chest pain with shortness of breath',
        'Chest pain with diaphoresis',
        'Chest pain with nausea/vomiting'
      );
      suggestions.labTests.push(
        'ECG',
        'Cardiac enzymes (Troponin)',
        'Chest X-ray'
      );
    }

    // Abdominal pain analysis
    if (complaint.includes('abdominal pain') || symptomList.includes('abdominal pain')) {
      suggestions.diagnoses.push(
        'Gastroenteritis',
        'Appendicitis (rule out)',
        'GERD',
        'Irritable bowel syndrome'
      );
      suggestions.redFlags.push(
        'Severe abdominal pain',
        'Abdominal pain with fever',
        'Abdominal pain with vomiting',
        'Abdominal pain with blood in stool'
      );
      suggestions.labTests.push(
        'Complete Blood Count (CBC)',
        'Comprehensive Metabolic Panel (CMP)',
        'Urinalysis'
      );
    }

    // Age-specific considerations
    if (age > 65) {
      suggestions.clinicalNotes.push(
        'Consider frailty assessment',
        'Review medication interactions',
        'Assess fall risk',
        'Consider cognitive assessment'
      );
    }

    if (age < 18) {
      suggestions.clinicalNotes.push(
        'Consider pediatric dosing',
        'Review vaccination status',
        'Assess growth and development'
      );
    }

    // Gender-specific considerations
    if (gender === 'female' && age >= 18 && age <= 50) {
      suggestions.clinicalNotes.push(
        'Consider pregnancy status',
        'Review menstrual history if relevant',
        'Consider contraception history'
      );
    }

    // Allergy considerations
    if (allergies && allergies.length > 0) {
      suggestions.clinicalNotes.push(
        `Patient has allergies: ${allergies.join(', ')}`,
        'Verify medication allergies before prescribing',
        'Consider alternative medications if needed'
      );
    }

    // Medication interactions
    if (currentMedications && currentMedications.length > 0) {
      suggestions.clinicalNotes.push(
        'Review current medications for interactions',
        'Consider drug-drug interactions',
        'Assess medication adherence'
      );
    }

    // General follow-up recommendations
    suggestions.followUp.push(
      'Return if symptoms worsen',
      'Follow up in 1 week if not improved',
      'Seek immediate care for red flag symptoms',
      'Rest and increased fluid intake'
    );

    // General HPI writing template
    if (suggestions.hpiSuggestions.length === 0) {
      suggestions.hpiSuggestions.push(
        'Use SOAP format: Subjective, Objective, Assessment, Plan',
        'Document chief complaint in patient\'s own words',
        'Include symptom timeline: onset, duration, progression',
        'Describe symptom characteristics: quality, quantity, timing',
        'Note associated symptoms and relieving/aggravating factors',
        'Include relevant past medical history and medications',
        'Document social history and family history if relevant',
        'Assess patient\'s functional status and concerns'
      );
    }

    // Quality improvement suggestions
    suggestions.clinicalNotes.push(
      'Ensure complete documentation',
      'Document assessment and plan clearly',
      'Consider patient education needs'
    );

    // Generate HPI template
    suggestions.hpiTemplate = this.generateHPITemplate(patientData);

    return suggestions;
  }

  /**
   * Analyze vital signs for abnormalities
   */
  static analyzeVitals(vitals: Record<string, any>): string[] {
    const alerts: string[] = [];
    
    if (vitals.temperature && vitals.temperature > 38.5) {
      alerts.push('High fever detected - consider antipyretics');
    }
    
    if (vitals.bloodPressure) {
      const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
      if (systolic > 140 || diastolic > 90) {
        alerts.push('Elevated blood pressure - monitor closely');
      }
    }
    
    if (vitals.heartRate && vitals.heartRate > 100) {
      alerts.push('Tachycardia detected - investigate cause');
    }
    
    if (vitals.respiratoryRate && vitals.respiratoryRate > 20) {
      alerts.push('Tachypnea detected - assess for respiratory distress');
    }
    
    return alerts;
  }

  /**
   * Generate medication suggestions based on diagnosis
   */
  static getMedicationSuggestions(diagnosis: string): string[] {
    const medicationMap: Record<string, string[]> = {
      'upper respiratory tract infection': [
        'Amoxicillin 500mg PO TID x 7 days',
        'Dextromethorphan 15mg PO q4-6h PRN cough',
        'Acetaminophen 500mg PO q6h PRN fever'
      ],
      'migraine': [
        'Sumatriptan 50mg PO PRN',
        'Ibuprofen 400mg PO q6h PRN',
        'Ondansetron 4mg PO PRN nausea'
      ],
      'hypertension': [
        'Lisinopril 10mg PO daily',
        'Hydrochlorothiazide 25mg PO daily',
        'Monitor blood pressure'
      ]
    };
    
    return medicationMap[diagnosis.toLowerCase()] || [];
  }

  /**
   * Generate lab test suggestions based on symptoms
   */
  static getLabTestSuggestions(symptoms: string[]): string[] {
    const labTests: string[] = [];
    
    if (symptoms.some(s => s.includes('fever'))) {
      labTests.push('Complete Blood Count (CBC)', 'C-Reactive Protein (CRP)');
    }
    
    if (symptoms.some(s => s.includes('chest pain'))) {
      labTests.push('ECG', 'Cardiac enzymes (Troponin)');
    }
    
    if (symptoms.some(s => s.includes('abdominal pain'))) {
      labTests.push('Complete Blood Count (CBC)', 'Comprehensive Metabolic Panel (CMP)');
    }
    
    return labTests;
  }

  /**
   * Generate a detailed HPI writing template using the OLD CARTS framework.
   * OLD CARTS: Onset, Location, Duration, Character, Aggravating, Relieving, Timing, Severity.
   */
  static generateHPITemplate(patientData: PatientData): string {
    const { chiefComplaint, age, gender, duration, severity, progression, location } = patientData;
    const complaint = chiefComplaint?.toLowerCase() || '';

    let template = `HPI Template (OLD CARTS) for ${age}-year-old ${gender}:\n\n`;
    template += `Chief Complaint: ${chiefComplaint || 'Not specified'}\n`;
    if (duration) template += `Duration: ${duration}\n`;
    if (severity) template += `Severity: ${severity}\n`;
    if (progression) template += `Progression: ${progression}\n`;
    if (location) template += `Location: ${location}\n`;
    template += `\nOLD CARTS Framework:\n`;
    template += `  O – Onset: [When and how did symptoms begin? Sudden vs gradual?]\n`;
    template += `  L – Location: [Where is the symptom? Does it radiate?]\n`;
    template += `  D – Duration: [How long has it lasted? Constant vs intermittent?]\n`;
    template += `  C – Character: [What does it feel like? Quality of the symptom]\n`;
    template += `  A – Aggravating: [What makes it worse?]\n`;
    template += `  R – Relieving: [What makes it better?]\n`;
    template += `  T – Timing: [When does it occur? Pattern? Frequency?]\n`;
    template += `  S – Severity: [How bad is it? 1-10 scale? Impact on function?]\n\n`;

    template += `Narrative opening:\n`;
    template += `This is a ${age}-year-old ${gender} who presents with ${chiefComplaint || 'symptoms'}.`;
    if (duration || severity || progression || location) {
      template += ` [Weave in: ${[duration && `duration ${duration}`, severity && `severity ${severity}`, progression && `progression ${progression}`, location && `location ${location}`].filter(Boolean).join(', ')}.]`;
    }
    template += `\n\n`;

    const category = AIAssistantService.classifyComplaint(complaint);
    const categoryPrompts: Record<string, string> = {
      headache: `Headache-specific prompts:\n• Character: Throbbing, pressure, sharp, dull, band-like\n• Location: Frontal, temporal, occipital, unilateral, generalized\n• Aggravating: Bright light, noise, physical activity, stress\n• Relieving: Rest, dark room, analgesics, sleep\n• Associated: Nausea, photophobia, phonophobia, aura\n• Negatives: No worst headache of life, no focal deficit, no fever/trauma\n`,
      respiratory: `Respiratory-specific prompts:\n• Character: Dry vs productive cough; sputum color/amount\n• Aggravating: Cold air, exertion, lying flat\n• Relieving: Warm fluids, rest, antipyretics\n• Timing: Fever pattern (continuous, intermittent, remittent)\n• Associated: Sore throat, rhinorrhea, congestion, myalgias, fatigue\n• Negatives: No hemoptysis, no significant dyspnea at rest\n`,
      chest_pain: `Chest Pain-specific prompts:\n• Character: Pressure, sharp, burning, pleuritic\n• Location: Substernal; radiation to arm, jaw, back\n• Aggravating: Exertion, inspiration, palpation\n• Relieving: Rest, NTG, antacids\n• Associated: SOB, diaphoresis, palpitations, nausea, syncope\n• Negatives: No acute dyspnea at rest, no syncope, no edema\n`,
      abdominal: `Abdominal-specific prompts:\n• Character: Burning, crampy, colicky, sharp\n• Location: Epigastric, periumbilical, RLQ, diffuse\n• Aggravating: Meals, spicy food, lying flat\n• Relieving: Antacids, fasting, position change\n• Timing: Relationship to meals (postprandial, nocturnal)\n• Associated: Nausea, vomiting, bloating, bowel habit changes\n• Negatives: No hematemesis, melena, jaundice\n`,
      back_pain: `Back Pain-specific prompts:\n• Character: Aching, sharp, shooting\n• Location: Lumbar; radiation to buttock, leg, foot\n• Aggravating: Prolonged sitting, bending, lifting\n• Relieving: Rest, position change, analgesics\n• Associated: Numbness, tingling, weakness\n• Negatives: No saddle anesthesia, no incontinence, no fever\n`,
      dizziness: `Dizziness-specific prompts:\n• Character: True vertigo vs lightheadedness vs presyncope\n• Aggravating: Head movement, position changes, standing\n• Relieving: Lying still, fixation\n• Timing: Seconds, minutes, hours; episodic vs constant\n• Associated: Nausea, tinnitus, hearing change\n• Negatives: No focal weakness, no slurred speech\n`,
      skin: `Skin-specific prompts:\n• Character: Macular, papular, vesicular; color; scaling\n• Location: Distribution and evolution\n• Aggravating: Scratching, heat, sun exposure\n• Relieving: Cool compresses, topical agents\n• Associated: Pruritus, fever, joint pain\n• Negatives: No mucosal involvement, no new medication exposure\n`
    };

    if (categoryPrompts[category]) {
      template += categoryPrompts[category] + '\n';
    }

    template += `Additional documentation:\n`;
    template += `• Associated symptoms and pertinent negatives\n`;
    template += `• Past medical history (relevant)\n`;
    template += `• Current medications and allergies\n`;
    template += `• Review of systems pertinent to chief complaint\n`;

    return template;
  }

  /**
   * Parse duration from chief complaint text (e.g. "fever of 3 days", "pain for 2 weeks", "Throat pain, fever of 3 days").
   * Returns the duration string if found, otherwise null.
   */
  static parseDurationFromChiefComplaint(chiefComplaint: string): string | null {
    if (!chiefComplaint || !chiefComplaint.trim()) return null;
    const text = chiefComplaint.trim();
    // "of 3 days", "for 3 days", "for 2 weeks"
    const ofFor = text.match(/\b(?:of|for)\s+(\d+)\s*(day|days|week|weeks|month|months)s?\b/i);
    if (ofFor) return `${ofFor[1]} ${ofFor[2]}`.trim();
    // "3 days", "2 weeks", "1 month"
    const simple = text.match(/\b(\d+)\s*(day|days|week|weeks|month|months)s?\b/i);
    return simple ? `${simple[1]} ${simple[2]}`.trim() : null;
  }

  /**
   * Generate a structured HPI narrative using the OLD CARTS framework:
   * Onset, Location, Duration, Character, Aggravating factors, Relieving factors, Timing, Severity.
   *
   * Produces a professional, concise paragraph suitable for a medical record.
   * Fills in available data and generates clinically appropriate phrasing for missing elements
   * based on the chief complaint category.
   */
  /**
   * Extract semantic descriptors from the raw chief complaint text so the narrative
   * can be customised per patient rather than always producing the same boilerplate.
   */
  private static extractComplaintDescriptors(complaint: string): {
    characterWords: string[];
    locationHint: string;
    onsetHint: string;
    associatedHints: string[];
    aggravatingHints: string[];
    relievingHints: string[];
    symptomNoun: string;
    negatives: string;
  } {
    const c = complaint.toLowerCase();

    // --- Character / quality descriptors ---
    const characterMap: Record<string, string> = {
      swollen:     'a sensation of swelling and distension',
      swelling:    'a sensation of swelling and distension',
      bloated:     'bloating and abdominal distension',
      bloating:    'bloating and abdominal distension',
      fullness:    'a feeling of abdominal fullness and early satiety',
      full:        'a feeling of abdominal fullness',
      tight:       'tightness and a constricting sensation',
      tightness:   'tightness and a constricting sensation',
      pressure:    'a pressure-like sensation',
      heavy:       'heaviness and dull pressure',
      heaviness:   'heaviness and dull pressure',
      sharp:       'sharp and stabbing',
      stabbing:    'sharp and stabbing',
      burning:     'burning',
      burn:        'burning',
      crampy:      'crampy and colicky',
      cramp:       'crampy and colicky',
      cramping:    'crampy and colicky',
      colicky:     'colicky',
      dull:        'dull and aching',
      aching:      'dull and aching',
      throbbing:   'throbbing and pulsating',
      squeezing:   'squeezing and pressure-like',
      gnawing:     'gnawing and persistent',
      gripping:    'gripping and colicky',
      twisting:    'twisting and colicky',
      gurgling:    'gurgling with discomfort',
    };

    const characterWords: string[] = [];
    for (const [word, phrase] of Object.entries(characterMap)) {
      if (c.includes(word) && !characterWords.includes(phrase)) {
        characterWords.push(phrase);
      }
    }

    // --- Location hints from complaint text ---
    let locationHint = '';
    if (c.includes('epigastric') || c.includes('epigastrium') || c.includes('upper middle') || c.includes('upper abdomen') || c.includes('upper stomach')) {
      locationHint = 'the epigastric region';
    } else if (c.includes('right upper') || c.includes('rug') || c.includes('right side')) {
      locationHint = 'the right upper quadrant';
    } else if (c.includes('left upper') || c.includes('luq')) {
      locationHint = 'the left upper quadrant';
    } else if (c.includes('right lower') || c.includes('rlq') || c.includes('right iliac')) {
      locationHint = 'the right lower quadrant';
    } else if (c.includes('left lower') || c.includes('llq') || c.includes('left iliac')) {
      locationHint = 'the left lower quadrant';
    } else if (c.includes('periumbilical') || c.includes('umbilical') || c.includes('around navel')) {
      locationHint = 'the periumbilical region';
    } else if (c.includes('abdominal') || c.includes('abdomen') || c.includes('belly') || c.includes('stomach')) {
      locationHint = 'the abdomen';
    }

    // --- Onset hints ---
    let onsetHint = 'gradually';
    if (c.includes('sudden') || c.includes('suddenly') || c.includes('acute') || c.includes('abrupt')) {
      onsetHint = 'suddenly';
    } else if (c.includes('gradual') || c.includes('slowly') || c.includes('insidious')) {
      onsetHint = 'gradually';
    } else if (c.includes('intermittent') || c.includes('on and off') || c.includes('comes and goes')) {
      onsetHint = 'gradually, with intermittent episodes';
    }

    // --- Associated symptoms from complaint text ---
    const associatedHints: string[] = [];
    if (c.includes('nausea') && c.includes('vomit')) associatedHints.push('nausea and vomiting');
    else if (c.includes('nausea')) associatedHints.push('nausea without vomiting');
    else if (c.includes('vomit')) associatedHints.push('vomiting');
    if (c.includes('diarrhea') || c.includes('loose stool') || c.includes('watery stool')) associatedHints.push('loose stools');
    if (c.includes('constipat')) associatedHints.push('constipation');
    if (c.includes('heartburn') || c.includes('acid') || c.includes('reflux') || c.includes('regurgit')) associatedHints.push('heartburn and acid regurgitation');
    if (c.includes('belch') || c.includes('burp') || c.includes('gas') || c.includes('flatulence')) associatedHints.push('belching and flatulence');
    if (c.includes('loss of appetite') || c.includes('anorexia') || c.includes('no appetite')) associatedHints.push('decreased appetite');
    if (c.includes('fever')) associatedHints.push('low-grade fever');
    if (c.includes('sweat') || c.includes('night sweat')) associatedHints.push('night sweats');
    if (c.includes('weight loss') || c.includes('losing weight')) associatedHints.push('unintentional weight loss');

    // --- Aggravating hints ---
    const aggravatingHints: string[] = [];
    if (c.includes('after eating') || c.includes('after meal') || c.includes('postprandial') || c.includes('food') || c.includes('eating')) {
      aggravatingHints.push('meals and food intake');
    }
    if (c.includes('spicy') || c.includes('spice')) aggravatingHints.push('spicy food');
    if (c.includes('fatty') || c.includes('fried') || c.includes('greasy')) aggravatingHints.push('fatty or fried food');
    if (c.includes('alcohol') || c.includes('drinking')) aggravatingHints.push('alcohol consumption');
    if (c.includes('lying') || c.includes('lying down') || c.includes('supine') || c.includes('bending')) aggravatingHints.push('lying flat and bending forward');
    if (c.includes('empty stomach') || c.includes('fasting') || c.includes('hunger')) aggravatingHints.push('an empty stomach');
    if (c.includes('movement') || c.includes('moving') || c.includes('activity')) aggravatingHints.push('physical movement');

    // --- Relieving hints ---
    const relievingHints: string[] = [];
    if (c.includes('antacid') || c.includes('tums') || c.includes('omeprazole') || c.includes('proton pump')) relievingHints.push('antacids');
    if (c.includes('rest') || c.includes('lying') || c.includes('sleep')) relievingHints.push('rest');
    if (c.includes('eating') || c.includes('food') || c.includes('after eating')) relievingHints.push('eating small meals');
    if (c.includes('water') || c.includes('fluid') || c.includes('drink')) relievingHints.push('drinking water');

    // --- Symptom noun based on dominant complaint ---
    let symptomNoun = 'discomfort';
    if (c.includes('pain')) symptomNoun = 'pain';
    else if (c.includes('swollen') || c.includes('swelling') || c.includes('bloat') || c.includes('distension')) symptomNoun = 'sensation';
    else if (c.includes('cramp')) symptomNoun = 'cramping';
    else if (c.includes('burn')) symptomNoun = 'burning';
    else if (c.includes('nausea')) symptomNoun = 'nausea';
    else if (c.includes('ache') || c.includes('aching')) symptomNoun = 'aching';

    // --- Pertinent negatives: derived from what the patient's region implies ---
    let negatives = 'The patient denies any other significant symptoms.';
    if (
      locationHint.includes('epigastric') || locationHint.includes('periumbilical') ||
      locationHint.includes('right upper') || locationHint.includes('left upper') ||
      locationHint.includes('abdomen') ||
      c.includes('stomach') || c.includes('abdominal') || c.includes('epigastric') ||
      c.includes('gastric') || c.includes('gastritis') || c.includes('gerd') ||
      c.includes('heartburn') || c.includes('reflux')
    ) {
      negatives = 'The patient denies hematemesis, melena, hematochezia, jaundice, and changes in urine color. Bowel movements are normal in frequency and consistency.';
    } else if (c.includes('chest') || c.includes('cardiac') || c.includes('heart')) {
      negatives = 'The patient denies radiation to the arm or jaw, diaphoresis, palpitations, syncope, and lower extremity edema.';
    } else if (c.includes('headache') || c.includes('head') || c.includes('migraine')) {
      negatives = 'The patient denies visual aura, neck stiffness, fever, focal neurological deficits, and recent head trauma.';
    } else if (c.includes('cough') || c.includes('respiratory') || c.includes('throat') || c.includes('fever')) {
      negatives = 'The patient denies hemoptysis, significant dyspnea at rest, and recent sick contacts or travel.';
    } else if (c.includes('back') || c.includes('lumbar') || c.includes('spine')) {
      negatives = 'The patient denies radiation to the lower extremities, numbness, tingling, saddle anesthesia, and bowel or bladder dysfunction.';
    } else if (c.includes('urinary') || c.includes('dysuria') || c.includes('urine')) {
      negatives = 'The patient denies hematuria, flank pain, fever, and vaginal or urethral discharge.';
    } else if (c.includes('flank')) {
      negatives = 'The patient denies fever, chills, hematuria, and dysuria. Urinary output is normal.';
    } else if (c.includes('dizz') || c.includes('vertigo')) {
      negatives = 'The patient denies hearing loss, tinnitus, focal weakness, and slurred speech.';
    } else if (c.includes('rash') || c.includes('skin') || c.includes('itch')) {
      negatives = 'The patient denies fever, joint pain, mucosal involvement, and recent new medication or allergen exposure.';
    }

    return { characterWords, locationHint, onsetHint, associatedHints, aggravatingHints, relievingHints, symptomNoun, negatives };
  }

  static generateHPINarrative(patientData: PatientData): string {
    const {
      chiefComplaint = '',
      age,
      gender,
      onset,
      location,
      duration,
      character,
      aggravatingFactors = [],
      relievingFactors = [],
      timing,
      severity,
      progression,
      associatedSymptoms = [],
      pastMedicalHistory
    } = patientData;

    const complaint = chiefComplaint.toLowerCase().trim();
    const ageStr = age ? `${age}-year-old` : 'adult';
    const genderStr = gender || 'patient';
    const durationResolved = duration || AIAssistantService.parseDurationFromChiefComplaint(chiefComplaint) || '';

    const complaintCategory = AIAssistantService.classifyComplaint(complaint);

    // Extract dynamic descriptors from the actual complaint text
    const desc = AIAssistantService.extractComplaintDescriptors(complaint);
    const categoryDefaults = AIAssistantService.getOLDCARTSDefaults(complaintCategory, complaint);

    // --- Resolve each OLDCARTS element ---
    // Priority: (1) form field entered by user  (2) extracted from complaint text
    // Category defaults are ONLY used for onset, location, character, and negatives.
    // Aggravating / relieving / timing / associated are NEVER assumed from defaults —
    // they are only written when we actually know them.

    const resolvedLocation  = location || desc.locationHint || categoryDefaults.location;
    const resolvedOnset     = onset    || desc.onsetHint    || categoryDefaults.onset;
    const resolvedNoun      = desc.symptomNoun !== 'discomfort' ? desc.symptomNoun : categoryDefaults.symptomNoun;

    // Character: form field > complaint-extracted > category default (character is safe to default)
    let resolvedCharacter = '';
    if (character && character.trim()) {
      resolvedCharacter = character.trim();
    } else if (desc.characterWords.length > 0) {
      resolvedCharacter = desc.characterWords.slice(0, 2).join(' and ');
    } else if (categoryDefaults.character) {
      resolvedCharacter = categoryDefaults.character;
    }

    // Aggravating: form field > complaint-extracted ONLY (no category fallback)
    let aggravatingText = '';
    if (aggravatingFactors.length > 0) {
      aggravatingText = `The ${resolvedNoun} is aggravated by ${AIAssistantService.joinList(aggravatingFactors)}.`;
    } else if (desc.aggravatingHints.length > 0) {
      aggravatingText = `The ${resolvedNoun} is aggravated by ${AIAssistantService.joinList(desc.aggravatingHints)}.`;
    }
    // ← no categoryDefaults.aggravating fallback: never assume "meals and spicy food" if patient didn't say so

    // Relieving: form field > complaint-extracted ONLY (no category fallback)
    let relievingText = '';
    if (relievingFactors.length > 0) {
      relievingText = `The patient reports partial relief with ${AIAssistantService.joinList(relievingFactors)}.`;
    } else if (desc.relievingHints.length > 0) {
      relievingText = `The patient reports partial relief with ${AIAssistantService.joinList(desc.relievingHints)}.`;
    }
    // ← no categoryDefaults.relieving fallback: never assume "antacids" if patient didn't say so

    // Timing: form field ONLY — never inject "postprandially" or "nocturnal" unless entered
    const resolvedTiming = timing || '';
    // ← categoryDefaults.timing removed: it hardcodes things like "The pain is worse postprandially"

    // Associated: form field > complaint-extracted ONLY (no category fallback)
    let associatedText = '';
    if (associatedSymptoms.length > 0) {
      associatedText = `Associated symptoms include ${AIAssistantService.joinList(associatedSymptoms)}.`;
    } else if (desc.associatedHints.length > 0) {
      associatedText = `Associated with ${AIAssistantService.joinList(desc.associatedHints)}.`;
    }
    // ← no categoryDefaults.associated fallback: never inject "nausea but no vomiting" unless known

    // Build the narrative sentence by sentence
    const sentences: string[] = [];

    sentences.push(
      `This is a ${ageStr} ${genderStr} patient who presented with a chief complaint of ${chiefComplaint.trim()}.`
    );

    if (resolvedOnset) {
      sentences.push(`The symptoms began ${resolvedOnset}.`);
    }

    if (resolvedLocation) {
      sentences.push(`The ${resolvedNoun} is localized to the ${resolvedLocation}.`);
    }

    if (durationResolved) {
      sentences.push(`The symptoms have been present for ${durationResolved}.`);
    }

    if (resolvedCharacter) {
      sentences.push(`The ${resolvedNoun} is described as ${resolvedCharacter} in nature.`);
    }

    if (aggravatingText) sentences.push(aggravatingText);
    if (relievingText)   sentences.push(relievingText);
    if (resolvedTiming)  sentences.push(resolvedTiming);

    if (severity && severity.trim()) {
      sentences.push(`The patient rates the severity as ${severity.toLowerCase()}.`);
    }

    if (progression && progression.trim()) {
      sentences.push(`The symptoms have been ${progression.toLowerCase()} since onset.`);
    }

    if (associatedText) sentences.push(associatedText);

    // Pertinent negatives: always derived from the complaint location, not category defaults
    sentences.push(desc.negatives);

    if (pastMedicalHistory && pastMedicalHistory.trim()) {
      sentences.push(`Past medical history is significant for ${pastMedicalHistory.trim()}.`);
    }

    sentences.push('Review of systems is otherwise negative.');

    return sentences.join(' ');
  }

  /**
   * Generate a rich HPI narrative and suggested phrases using the Gemini backend endpoint.
   * Falls back to the local generateHPINarrative() if the backend is unavailable or not configured.
   */
  static async generateHPIWithGemini(
    patientData: PatientData,
    apiBaseUrl: string = '',
    authToken?: string
  ): Promise<GeminiHPIResult> {
    const complaint = (patientData.chiefComplaint || '').toLowerCase();
    const hpiText = (patientData.historyOfPresentIllness || '').toLowerCase();
    const textToAnalyze = `${complaint} ${hpiText}`;
    
    // Create mock DDx based on both complaint and HPI
    const mockDDx: DDxItem[] = [];
    let mockLabs: string[] = [];
    let mockExams: string[] = [];
    
    if (
      textToAnalyze.includes('epigastric') ||
      textToAnalyze.includes('heartburn') ||
      textToAnalyze.includes('heart burn') ||
      textToAnalyze.includes('acid reflux') ||
      textToAnalyze.includes('gerd') ||
      textToAnalyze.includes('gastric') ||
      textToAnalyze.includes('peptic') ||
      textToAnalyze.includes('ulcer') ||
      textToAnalyze.includes('stomach') ||
      textToAnalyze.includes('abdomen') ||
      textToAnalyze.includes('diarrhea') ||
      textToAnalyze.includes('loose stool') ||
      textToAnalyze.includes('watery') ||
      textToAnalyze.includes('nausea') ||
      textToAnalyze.includes('vomit')
    ) {
      if (textToAnalyze.includes('diarrhea') || textToAnalyze.includes('loose stool') || textToAnalyze.includes('watery')) {
        mockDDx.push({
          condition: 'Acute Gastroenteritis',
          reasoning: 'Watery diarrhea and epigastric discomfort suggests viral vs. bacterial gastroenteritis.',
          isRedFlag: false
        });
      }
      if (textToAnalyze.includes('heartburn') || textToAnalyze.includes('heart burn') || textToAnalyze.includes('reflux') || textToAnalyze.includes('gerd')) {
        mockDDx.push({
          condition: 'GERD (Gastroesophageal Reflux Disease)',
          reasoning: 'Retrosternal burning sensation, potentially exacerbated by meals or lying flat.',
          isRedFlag: false
        });
      }
      mockDDx.push({
        condition: 'Gastritis / Peptic Ulcer Disease (PUD)',
        reasoning: 'Epigastric pain burning in nature, related to meals or gastric acidity.',
        isRedFlag: false
      });
      if (textToAnalyze.includes('fever') || textToAnalyze.includes('severe') || textToAnalyze.includes('blood') || textToAnalyze.includes('melena')) {
        mockDDx.push({
          condition: 'Upper Gastrointestinal Bleeding',
          reasoning: 'Must exclude immediately if severe burning pain, hematemesis, or melena is present.',
          isRedFlag: true
        });
      } else {
        mockDDx.push({
          condition: 'Appendicitis (early)',
          reasoning: 'Keep under consideration if pain shifts or localizes to the right lower quadrant (RLQ).',
          isRedFlag: true
        });
      }
      mockLabs.push('CBC', 'Basic Metabolic Panel', 'H. pylori stool antigen', 'Stool routine and microscopy');
      mockExams.push('Abdominal Palpation', 'Bowel Sounds', 'Vitals Assessment');
    } else if (textToAnalyze.includes('headache') || textToAnalyze.includes('migraine') || textToAnalyze.includes('head pain')) {
      mockDDx.push({ condition: 'Migraine', reasoning: 'Unilateral or throbbing head pain, often with photophobia or nausea.', isRedFlag: false });
      mockDDx.push({ condition: 'Tension Headache', reasoning: 'Bilateral, pressing headache, often related to muscle tension or stress.', isRedFlag: false });
      mockDDx.push({ condition: 'Meningitis / Subarachnoid Hemorrhage', reasoning: 'Rule out if sudden severe ("thunderclap") onset, fever, or neck stiffness is present.', isRedFlag: true });
      mockLabs.push('CBC', 'CRP');
      mockExams.push('Neurological Exam', 'Fundoscopy', 'Neck Rigidity Check');
    } else if (textToAnalyze.includes('chest pain') || textToAnalyze.includes('angina') || textToAnalyze.includes('myocardial') || textToAnalyze.includes('heart pain')) {
      mockDDx.push({ condition: 'Acute Coronary Syndrome (ACS)', reasoning: 'Substernal chest pressure/pain requiring immediate ECG and Troponin evaluation.', isRedFlag: true });
      mockDDx.push({ condition: 'Costochondritis', reasoning: 'Localized chest wall pain, typically reproducible on palpation.', isRedFlag: false });
      mockDDx.push({ condition: 'GERD', reasoning: 'Acid reflux can present as retrosternal burning pain mimicking chest pain.', isRedFlag: false });
      mockLabs.push('ECG', 'Troponin', 'Chest X-ray');
      mockExams.push('Chest Palpation', 'Cardiac Auscultation', 'Lungs Auscultation');
    } else if (
      textToAnalyze.includes('cough') ||
      textToAnalyze.includes('fever') ||
      textToAnalyze.includes('dyspnea') ||
      textToAnalyze.includes('shortness of breath') ||
      textToAnalyze.includes('congestion') ||
      textToAnalyze.includes('throat')
    ) {
      mockDDx.push({ condition: 'Viral Upper Respiratory Tract Infection (URTI)', reasoning: 'Acute cough, nasal congestion, and low-grade fever.', isRedFlag: false });
      mockDDx.push({ condition: 'Acute Bronchitis', reasoning: 'Self-limiting airway inflammation presenting with persistent cough.', isRedFlag: false });
      mockDDx.push({ condition: 'Pneumonia', reasoning: 'Expose to further workup if high fever, tachypnea, productive cough, or lung crackles exist.', isRedFlag: true });
      mockLabs.push('CBC', 'CRP', 'Sputum culture');
      mockExams.push('Lungs Auscultation', 'Throat Examination', 'Oxygen Saturation');
    } else {
      mockDDx.push({ condition: 'Viral Syndrome', reasoning: 'General symptoms suggest a viral etiology.', isRedFlag: false });
      mockDDx.push({ condition: 'Bacterial Infection', reasoning: 'Consider if symptoms are severe or progressive.', isRedFlag: true });
      mockLabs.push('CBC', 'Basic Metabolic Panel');
      mockExams.push('General Physical', 'Vitals Assessment');
    }

    const fallback: GeminiHPIResult = {
      isAIAvailable: false,
      narrative: AIAssistantService.generateHPINarrative(patientData),
      suggestedPhrases: AIAssistantService.buildLocalSuggestedPhrases(patientData),
      redFlags: [],
      differentialDiagnoses: mockDDx,
      suggestedLabs: mockLabs,
      suggestedExams: mockExams
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(`${apiBaseUrl}/api/medical-records/generate-hpi`, {
        method: 'POST',
        headers,
        body: JSON.stringify(patientData),
        signal: AbortSignal.timeout(25000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (!data.success) return fallback;
      if (!data.isAIAvailable) {
        // AI not configured — use local generation but still return suggested phrases
        return { ...fallback, isAIAvailable: false };
      }

      // If backend returns string[] instead of DDxItem[], map it
      const ddx = (data.differentialDiagnoses || []).map((d: any) => {
        if (typeof d === 'string') return { condition: d, reasoning: 'Suggested by AI based on clinical presentation.', isRedFlag: false };
        return d;
      });

      return {
        isAIAvailable: true,
        narrative: data.narrative || fallback.narrative,
        suggestedPhrases: data.suggestedPhrases || fallback.suggestedPhrases,
        redFlags: data.redFlags || [],
        differentialDiagnoses: ddx.length > 0 ? ddx : fallback.differentialDiagnoses,
        suggestedLabs: data.suggestedLabs || fallback.suggestedLabs,
        suggestedExams: data.suggestedExams || fallback.suggestedExams
      };
    } catch {
      return fallback;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SELF-LEARNING CLINICAL MEMORY — Learns from doctor corrections
  // ─────────────────────────────────────────────────────────────────────────

  private static readonly LEARNING_STORE_KEY = 'clinicalLearningStore';

  /**
   * Retrieve learned corrections from localStorage.
   * Structure: { symptomMappings: { transcriptPhrase: correctedLabel }[], 
   *              durationMappings, severityMappings, locationMappings }
   */
  static getLearningStore(): {
    symptomMappings: Record<string, string>;
    durationMappings: Record<string, string>;
    severityMappings: Record<string, string>;
    progressionMappings: Record<string, string>;
    locationMappings: Record<string, string>;
    correctionCount: number;
  } {
    try {
      const stored = localStorage.getItem(AIAssistantService.LEARNING_STORE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { symptomMappings: {}, durationMappings: {}, severityMappings: {}, progressionMappings: {}, locationMappings: {}, correctionCount: 0 };
  }

  /**
   * Save a doctor's correction so the system learns for next time.
   * Called when the doctor edits a field in the Review Modal before confirming.
   */
  static learnCorrection(
    field: 'chiefComplaint' | 'duration' | 'severity' | 'progression' | 'location',
    originalTranscript: string,
    correctedValue: string
  ): void {
    if (!correctedValue.trim() || !originalTranscript.trim()) return;

    const store = AIAssistantService.getLearningStore();
    // Extract key phrases from transcript (first 80 chars as context key)
    const contextKey = originalTranscript.toLowerCase().slice(0, 80).trim();

    switch (field) {
      case 'chiefComplaint':
        store.symptomMappings[contextKey] = correctedValue;
        break;
      case 'duration':
        store.durationMappings[contextKey] = correctedValue;
        break;
      case 'severity':
        store.severityMappings[contextKey] = correctedValue;
        break;
      case 'progression':
        store.progressionMappings[contextKey] = correctedValue;
        break;
      case 'location':
        store.locationMappings[contextKey] = correctedValue;
        break;
    }

    store.correctionCount++;
    try {
      localStorage.setItem(AIAssistantService.LEARNING_STORE_KEY, JSON.stringify(store));
      console.log(`[ClinicalLearning] Saved correction for "${field}": "${correctedValue}" (Total: ${store.correctionCount})`);
    } catch { /* storage full, ignore */ }
  }

  /**
   * Apply learned corrections to extraction results.
   * Checks if a similar transcript has been corrected before.
   */
  static applyLearnedCorrections(
    transcript: string,
    result: AmbientExtractionResult
  ): AmbientExtractionResult {
    const store = AIAssistantService.getLearningStore();
    const lower = transcript.toLowerCase().slice(0, 80).trim();

    // Check each mapping store for a match
    for (const [key, value] of Object.entries(store.symptomMappings)) {
      if (lower.includes(key.slice(0, 30)) || key.includes(lower.slice(0, 30))) {
        result.chiefComplaint = value;
        result.chiefComplaintConfidence = 98; // High confidence from learned data
      }
    }
    for (const [key, value] of Object.entries(store.durationMappings)) {
      if (lower.includes(key.slice(0, 30)) || key.includes(lower.slice(0, 30))) {
        result.duration = value;
        result.durationConfidence = 98;
      }
    }
    for (const [key, value] of Object.entries(store.severityMappings)) {
      if (lower.includes(key.slice(0, 30)) || key.includes(lower.slice(0, 30))) {
        result.severity = value;
        result.severityConfidence = 98;
      }
    }
    for (const [key, value] of Object.entries(store.progressionMappings)) {
      if (lower.includes(key.slice(0, 30)) || key.includes(lower.slice(0, 30))) {
        result.progression = value;
        result.progressionConfidence = 98;
      }
    }
    for (const [key, value] of Object.entries(store.locationMappings)) {
      if (lower.includes(key.slice(0, 30)) || key.includes(lower.slice(0, 30))) {
        result.location = value;
        result.locationConfidence = 98;
      }
    }

    return result;
  }

  /**
   * Get stats about what the system has learned
   */
  static getLearningStats(): { totalCorrections: number; fields: Record<string, number> } {
    const store = AIAssistantService.getLearningStore();
    return {
      totalCorrections: store.correctionCount,
      fields: {
        symptoms: Object.keys(store.symptomMappings).length,
        durations: Object.keys(store.durationMappings).length,
        severities: Object.keys(store.severityMappings).length,
        progressions: Object.keys(store.progressionMappings).length,
        locations: Object.keys(store.locationMappings).length,
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLINICAL PRECISION FILTER — Clinical Entity Recognition (CER) Layer
  // ─────────────────────────────────────────────────────────────────────────

  /** Vocabulary for noise detection and entity scoring */
  private static readonly MEDICAL_SYMPTOMS = [
    'pain','ache','aching','fever','cough','nausea','vomit','diarrhea','constipation',
    'headache','dizzy','dizziness','fatigue','tired','weakness','shortness','breath',
    'swelling','rash','bleeding','burn','burning','cramp','cramping','itching','itch',
    'discharge','pressure','tightness','palpitation','chest','abdomen','stomach',
    'throat','ear','eye','nose','back','leg','arm','joint','muscle','skin','head',
    // Amharic symptom indicators
    'አለኝ','ያስቸግረኛል','ሰውነቴ','ሆዴ','ራሴ','ህመም','ትኩሳት','ማቅለሽለሽ','ራስ ምታት'
  ];

  private static readonly TEMPORAL_MARKERS = [
    'day','days','week','weeks','month','months','hour','hours','minute','ago',
    'since','yesterday','today','morning','night','started','began','onset',
    'ቀን','ቀናት','ሳምንት','ወር','ትናንት','ዛሬ','ጀመረ'
  ];

  private static readonly BODY_PARTS = [
    'head','neck','chest','abdomen','stomach','back','arm','leg','knee','hip',
    'shoulder','elbow','wrist','ankle','foot','hand','finger','eye','ear','nose',
    'throat','mouth','jaw','forehead','temple','groin','pelvis','flank','spine',
    'right','left','upper','lower','central','bilateral','frontal','temporal',
    'occipital','epigastric','periumbilical','suprapubic','lumbar','cervical',
    'ሆድ','ራስ','ደረት','ጀርባ','እጅ','እግር','አንገት','ዓይን','귀','አፍ'
  ];

  private static readonly SEVERITY_WORDS = [
    'mild','moderate','severe','sharp','dull','burning','throbbing','stabbing',
    'aching','pressure','squeezing','cramping','unbearable','tolerable','slight',
    'intense','excruciating','mild','faint','heavy','light',
    'ቀላል','ከባድ','መካከለኛ','ሹል','ድብርት'
  ];

  private static readonly PROGRESSION_WORDS = [
    'worse','worsening','better','improving','stable','same','constant',
    'intermittent','coming','going','fluctuating','spreading','radiating',
    'increasing','decreasing','progressive','sudden','gradual',
    'እየባሰ','እየቀለለ','ተረጋጋ'
  ];

  private static readonly NOISE_PHRASES = [
    'set alarm','set a reminder','open app','call','text message','email',
    'send message','google','search','ok google','hey siri','alexa',
    'play music','pause','stop music','volume','wifi','bluetooth'
  ];

  private static readonly CONFIDENCE_THRESHOLD = 0.85;

  /**
   * Checks if a transcript contains clinical content (not noise).
   * Returns { isClinical, reason, score }
   */
  static isClinicalContent(transcript: string): { isClinical: boolean; reason: string; score: number } {
    const lower = transcript.toLowerCase();

    // 1. Hard reject: known noise phrases
    for (const noise of AIAssistantService.NOISE_PHRASES) {
      if (lower.includes(noise)) {
        return { isClinical: false, reason: `Non-clinical noise detected: "${noise}"`, score: 0 };
      }
    }

    // 2. Score clinical signals
    let clinicalSignals = 0;
    let totalChecks = 4;

    const hasSymptom = AIAssistantService.MEDICAL_SYMPTOMS.some(s => lower.includes(s));
    const hasTemporal = AIAssistantService.TEMPORAL_MARKERS.some(t => lower.includes(t));
    const hasBodyPart = AIAssistantService.BODY_PARTS.some(b => lower.includes(b));
    const hasSeverity = AIAssistantService.SEVERITY_WORDS.some(s => lower.includes(s));

    if (hasSymptom) clinicalSignals++;
    if (hasTemporal) clinicalSignals++;
    if (hasBodyPart) clinicalSignals++;
    if (hasSeverity) clinicalSignals++;

    const score = clinicalSignals / totalChecks;

    if (score < 0.25) {
      return {
        isClinical: false,
        reason: `Transcript lacks clinical content (score: ${Math.round(score * 100)}%). No recognizable symptoms, body parts, or temporal markers found.`,
        score
      };
    }

    return { isClinical: true, reason: '', score };
  }

  /**
   * Extract a single clinical field with a confidence score.
   * Returns { value, confidence } — empty string if below threshold.
   */
  private static extractField<T extends Record<string, string[]>>(
    lower: string,
    vocabMap: T,
    fieldName: string
  ): { value: string; confidence: number } {
    let bestMatch = '';
    let bestScore = 0;

    for (const [canonical, synonyms] of Object.entries(vocabMap)) {
      for (const syn of synonyms) {
        if (lower.includes(syn.toLowerCase())) {
          const score = syn.length / (lower.length + 1); // longer match = more specific
          if (score > bestScore) {
            bestScore = score;
            bestMatch = canonical;
          }
        }
      }
    }

    // Normalize 0–1 score to 0–100 confidence
    const confidence = Math.min(100, Math.round(bestScore * 5000));
    return {
      value: confidence >= (AIAssistantService.CONFIDENCE_THRESHOLD * 100) ? bestMatch : '',
      confidence
    };
  }

  /**
   * Ambient Clinical Mapper Pipeline — High-Precision Edition
   * Runs CER noise gate first, then structured fact extraction with confidence scoring.
   */
  static async extractAmbientClinicalData(
    rawTranscript: string,
    patientName: string,
    apiBaseUrl: string = '',
    authToken?: string
  ): Promise<AmbientExtractionResult> {

    // ── STEP 1: Clinical Gatekeeper ──────────────────────────────────────────
    const { isClinical, reason, score } = AIAssistantService.isClinicalContent(rawTranscript);
    if (!isClinical) {
      console.warn('[CER] Non-clinical noise rejected:', reason);
      return {
        isClinical: false,
        noiseReason: reason,
        chiefComplaint: '', chiefComplaintConfidence: 0,
        duration: '', durationConfidence: 0,
        severity: '', severityConfidence: 0,
        progression: '', progressionConfidence: 0,
        location: '', locationConfidence: 0,
        hpiNarrative: '',
        diarizedTranscript: rawTranscript
      };
    }

    // ── STEP 2: Try Backend (Gemini / BioGPT) ────────────────────────────────
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(`${apiBaseUrl}/api/medical-records/ambient-extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcript: rawTranscript, patientName, clinicalScore: score }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error('Backend returned failure');

      return {
        isClinical: true,
        chiefComplaint: data.chiefComplaint || '',
        chiefComplaintConfidence: data.chiefComplaintConfidence ?? 90,
        duration: data.duration || '',
        durationConfidence: data.durationConfidence ?? 90,
        severity: data.severity || '',
        severityConfidence: data.severityConfidence ?? 90,
        progression: data.progression || '',
        progressionConfidence: data.progressionConfidence ?? 90,
        location: data.location || '',
        locationConfidence: data.locationConfidence ?? 90,
        hpiNarrative: data.hpiNarrative || '',
        diarizedTranscript: data.diarizedTranscript || rawTranscript
      };
    } catch {
      console.warn('[CER] Backend unavailable — running local full-spectrum extractor.');
    }

    // ── STEP 3: Full-Spectrum Exhaustive Extraction (Local Fallback) ────────
    const lower = rawTranscript.toLowerCase();

    // ─── EXHAUSTIVE SYMPTOM CAPTURE (No-Summary Policy) ───
    // Extract ALL medical complaints, not just the first one
    const symptomLexicon: Array<[RegExp, string]> = [
      [/headache/gi, 'Headache'],
      [/head\s*ache/gi, 'Headache'],
      [/migraine/gi, 'Migraine'],
      [/vomit(?:ing|s)?/gi, 'Vomiting'],
      [/watery\s+vomit(?:ing)?/gi, 'Watery Vomiting'],
      [/nause(?:a|ous)/gi, 'Nausea'],
      [/(?:abdominal|stomach)\s*(?:cramp|pain)/gi, 'Abdominal Cramp'],
      [/abdominal\s+pain/gi, 'Abdominal Pain'],
      [/epigastric\s+(?:burn(?:ing)?|pain)/gi, 'Epigastric Burning'],
      [/stomach\s+burn(?:ing)?/gi, 'Epigastric Burning'],
      [/burn(?:ing)?\s+(?:in\s+)?(?:my\s+)?stomach/gi, 'Epigastric Burning'],
      [/diarrhea/gi, 'Diarrhea'],
      [/constipation/gi, 'Constipation'],
      [/fever/gi, 'Fever'],
      [/cough(?:ing)?/gi, 'Cough'],
      [/chest\s+pain/gi, 'Chest Pain'],
      [/back\s+pain/gi, 'Back Pain'],
      [/dizz(?:y|iness)/gi, 'Dizziness'],
      [/fatigue|tired(?:ness)?/gi, 'Fatigue'],
      [/weakness/gi, 'Weakness'],
      [/shortness\s+of\s+breath/gi, 'Shortness of Breath'],
      [/swelling/gi, 'Swelling'],
      [/rash/gi, 'Rash'],
      [/bleeding/gi, 'Bleeding'],
      [/itching|itch/gi, 'Itching'],
      [/sore\s+throat/gi, 'Sore Throat'],
      [/joint\s+pain/gi, 'Joint Pain'],
      [/muscle\s+pain/gi, 'Muscle Pain'],
      // Additional symptoms
      [/appetite\s+loss|loss\s+of\s+appetite|no\s+appetite|poor\s+appetite|decreased\s+appetite/gi, 'Loss of Appetite'],
      [/belching|burping/gi, 'Belching'],
      [/bloat(?:ing|ed)?/gi, 'Bloating'],
      [/flatulence|gas/gi, 'Flatulence'],
      [/heartburn|acid\s+reflux/gi, 'Heartburn'],
      [/weight\s+loss/gi, 'Weight Loss'],
      [/insomnia|can'?t\s+sleep|trouble\s+sleeping/gi, 'Insomnia'],
      [/chills?/gi, 'Chills'],
      [/body\s+(?:pain|ache)/gi, 'Body Pain'],
      [/runny\s+nose|nasal\s+(?:discharge|congestion)/gi, 'Nasal Congestion'],
      [/urinary|dysuria|painful\s+urination/gi, 'Dysuria'],
      [/palpitation/gi, 'Palpitation'],
      // Amharic symptoms (expanded)
      [/ራስ\s*ምታት|ራሴ\s*ያመኛል|ራሴ\s*ይመታኛል/g, 'Headache'],
      [/ማቅለሽለሽ|ማስቀለሽ/g, 'Nausea'],
      [/ማስታወክ|አስታውኳል|ታውኳል/g, 'Vomiting'],
      [/ሆዴ\s*ያመኛል|ሆድ\s*ህመም|የሆድ\s*ቁርጠት/g, 'Abdominal Pain'],
      [/ሆድ\s*ቁርጠት|ቁርጠት/g, 'Abdominal Cramp'],
      [/ትኩሳት|ሙቀት\s*አለኝ/g, 'Fever'],
      [/ተቅማጥ|ተስቃል/g, 'Diarrhea'],
      [/ሳል|ያስላል/g, 'Cough'],
      [/የምግብ\s*ፍላጎት|ምግብ\s*አይፈልግም/g, 'Loss of Appetite'],
      [/ድካም|ደክሞኛል/g, 'Fatigue'],
      [/ዐይኔ\s*ያመኛል|ዓይን\s*ህመም/g, 'Eye Pain'],
      [/ጀርባ\s*ያመኛል|የጀርባ\s*ህመም/g, 'Back Pain'],
      [/ደረት\s*ያመኛል|የደረት\s*ህመም/g, 'Chest Pain'],
      [/አንገት\s*ያመኛል/g, 'Neck Pain'],
      [/ማዞር|ይዞረኛል/g, 'Dizziness'],
      [/እብጠት|አብጦአል/g, 'Swelling'],
      [/ቆዳ\s*(?:ሽፍታ|ብጉር)/g, 'Rash'],
      [/ደም\s*(?:ይወጣል|መፍሰስ)/g, 'Bleeding'],
      [/እርግዝ|ትንፋሽ\s*ያጥረኛል/g, 'Shortness of Breath'],
      // Transliterated Amharic (what speech recognition may produce in English mode)
      [/yamenal|yamagnal|hode|rase/gi, 'Pain'],
      [/tikusat/gi, 'Fever'],
      [/ras\s*mitat/gi, 'Headache'],
      [/tekmat/gi, 'Diarrhea'],
    ];

    const foundSymptoms: string[] = [];
    for (const [pattern, label] of symptomLexicon) {
      if (pattern.test(rawTranscript)) {
        if (!foundSymptoms.includes(label)) {
          foundSymptoms.push(label);
        }
      }
    }

    const ccValue = foundSymptoms.join(', ');
    const ccConfidence = foundSymptoms.length > 0 ? 95 : 0;

    // ─── MEDICATION / SELF-TREATMENT DETECTION ───
    const medicationPatterns: Array<[RegExp, string]> = [
      [/(?:auntie|aunty|aunt)\s*(?:'s\s+)?(?:pain\s+)?(?:medication|medicine|pill|drug|tablet)/gi, 'Self-medicated with unknown analgesics (family-sourced)'],
      [/paracetamol|acetaminophen|tylenol/gi, 'Self-medicated with Paracetamol'],
      [/ibuprofen|advil|brufen/gi, 'Self-medicated with Ibuprofen'],
      [/aspirin/gi, 'Self-medicated with Aspirin'],
      [/omeprazole|antacid/gi, 'Self-medicated with Antacid/Omeprazole'],
      [/took\s+(?:some|a)\s+(?:pain\s*)?(?:killer|medicine|medication|pill|tablet)/gi, 'Self-medicated with unknown analgesics'],
    ];
    const selfMedications: string[] = [];
    for (const [pattern, label] of medicationPatterns) {
      if (pattern.test(rawTranscript)) {
        if (!selfMedications.includes(label)) selfMedications.push(label);
      }
    }

    // ─── PERTINENT NEGATIVES DETECTION ───
    const negativePatterns: Array<[RegExp, string]> = [
      [/(?:no|denies?|don'?t\s+have|didn'?t\s+have|not?\s+any)\s+(?:.*?)fever/gi, 'Patient denies fever'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)blood\s+in\s+(?:stool|feces)/gi, 'Patient denies blood in stool'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)blood/gi, 'Patient denies blood in stool'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)diarrhea/gi, 'Patient denies diarrhea'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)vomit(?:ing)?/gi, 'Patient denies vomiting'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)cough/gi, 'Patient denies cough'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)chest\s+pain/gi, 'Patient denies chest pain'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)rash/gi, 'Patient denies rash'],
      [/(?:no|denies?|don'?t\s+have)\s+(?:.*?)shortness/gi, 'Patient denies shortness of breath'],
    ];
    const pertinentNegatives: string[] = [];
    for (const [pattern, label] of negativePatterns) {
      if (pattern.test(rawTranscript)) {
        if (!pertinentNegatives.includes(label)) pertinentNegatives.push(label);
      }
    }

    // ─── DURATION EXTRACTION (expanded patterns) ───
    const durationPatterns: Array<[RegExp, Function]> = [
      // "lasts 3 days", "lasting 3 days", "lasted 3 days"
      [/(?:lasts?|lasting|lasted)\s*(\d+)\s*days?/i, (m: RegExpMatchArray) => `${m[1]} days`],
      [/(?:lasts?|lasting|lasted)\s*(\d+)\s*weeks?/i, (m: RegExpMatchArray) => `${m[1]} weeks`],
      [/(?:lasts?|lasting|lasted)\s*(\d+)\s*months?/i, (m: RegExpMatchArray) => `${m[1]} months`],
      [/(?:lasts?|lasting|lasted)\s*(\d+)\s*hours?/i, (m: RegExpMatchArray) => `${m[1]} hours`],
      // "3 days ago", "for 3 days", "past 3 days", "3 days now", "3 days duration"
      [/(\d+)\s*days?\s*(?:ago|now|duration)|for\s*(\d+)\s*days?|(?:past|last)\s*(\d+)\s*days?/i, (m: RegExpMatchArray) => `${m[1] || m[2] || m[3]} days`],
      [/(\d+)\s*weeks?\s*(?:ago|now)|for\s*(\d+)\s*weeks?|(?:past|last)\s*(\d+)\s*weeks?/i, (m: RegExpMatchArray) => `${m[1] || m[2] || m[3]} weeks`],
      [/(\d+)\s*months?\s*(?:ago|now)|for\s*(\d+)\s*months?|(?:past|last)\s*(\d+)\s*months?/i, (m: RegExpMatchArray) => `${m[1] || m[2] || m[3]} months`],
      [/(\d+)\s*hours?\s*(?:ago|now)|for\s*(\d+)\s*hours?|(?:past|last)\s*(\d+)\s*hours?/i, (m: RegExpMatchArray) => `${m[1] || m[2] || m[3]} hours`],
      // Word-form durations
      [/since\s+yesterday/i, () => '1 day'],
      [/since\s+last\s+night/i, () => '1 day'],
      [/(?:two|couple(?:\s+of)?)\s+days/i, () => '2 days'],
      [/three\s+days/i, () => '3 days'],
      [/(?:one|a)\s+week/i, () => '1 week'],
      [/(?:two|couple(?:\s+of)?)\s+weeks/i, () => '2 weeks'],
      [/(?:one|a)\s+month/i, () => '1 month'],
      // "started X days ago"
      [/started\s+(\d+)\s*days?\s*ago/i, (m: RegExpMatchArray) => `${m[1]} days`],
      [/started\s+(?:yesterday|last\s+night)/i, () => '1 day'],
    ];
    let durValue = '';
    let durConfidence = 0;
    for (const [pattern, formatter] of durationPatterns) {
      const match = rawTranscript.match(pattern as RegExp);
      if (match) { durValue = formatter(match); durConfidence = 92; break; }
    }
    // Amharic duration patterns (expanded)
    if (!durValue) {
      const amDurPatterns: Array<[RegExp, string]> = [
        [/(\d+)\s*ቀ[ናን]/,       'days'],
        [/(\d+)\s*ሳምንት/,       'weeks'],
        [/(\d+)\s*ወር/,         'months'],
        [/(\d+)\s*ሰዓት/,        'hours'],
        [/ከ\s*(\d+)\s*ቀ[ናን]/,  'days'],
        [/ከ\s*(\d+)\s*ሳምንት/,  'weeks'],
        [/ከ\s*(\d+)\s*ወር/,    'months'],
        [/ትናንት|ከትናንት/,       '___1 day'],
        [/ከሁለት?\s*ቀን/,       '___2 days'],
        [/ከሶስት?\s*ቀን/,       '___3 days'],
        [/ከአንድ\s*ሳምንት/,     '___1 week'],
        [/ከሁለት?\s*ሳምንት/,   '___2 weeks'],
        [/ከአንድ\s*ወር/,       '___1 month'],
      ];
      for (const [pattern, unit] of amDurPatterns) {
        const match = rawTranscript.match(pattern);
        if (match) {
          if (unit.startsWith('___')) {
            durValue = unit.replace('___', '');
          } else {
            durValue = `${match[1]} ${unit}`;
          }
          durConfidence = 88;
          break;
        }
      }
    }

    // ─── SEVERITY (with Amharic) ───
    const severityMap: Record<string, string[]> = {
      Mild: ['mild','slight','faint','little','tolerable','ቀላል','ትንሽ','ብዙም','ይቻላል'],
      Moderate: ['moderate','medium','not too bad','መካከለኛ','ይበቃል','በጣም አይደለም'],
      Severe: ['severe','sharp','stabbing','intense','unbearable','excruciating','very bad','worst','ከባድ','ሹል','ድብርት','በጣም','አስቸጋሪ','የሚያቃጥል','ጠንካራ']
    };
    let sevValue = '';
    let sevConfidence = 0;
    for (const [canonical, synonyms] of Object.entries(severityMap)) {
      if (synonyms.some(s => lower.includes(s))) { sevValue = canonical; sevConfidence = 88; break; }
    }

    // ─── PROGRESSION (with Amharic) ───
    const progressionMap: Record<string, string[]> = {
      Worsening: ['worse','worsening','getting worse','increasing','spreading','እየባሰ','እየጨመረ','ይባሳል','እየተባባሰ'],
      Improving: ['better','improving','getting better','decreasing','resolved','እየቀለለ','ተሻሽሏል','ይሻላል','እየተሻሻለ'],
      Stable: ['same','stable','unchanged','constant','no change','ተረጋጋ','እንዳለ','ተመሳሳይ','አልተለወጠም'],
    };
    let progValue = '';
    let progConfidence = 0;
    for (const [canonical, synonyms] of Object.entries(progressionMap)) {
      if (synonyms.some(s => lower.includes(s))) { progValue = canonical; progConfidence = 88; break; }
    }

    // ─── LOCATION (multi-match) ───
    const locationPriority: Array<[string, string]> = [
      ['right upper quadrant','Right Upper Quadrant'],
      ['left upper quadrant','Left Upper Quadrant'],
      ['right lower quadrant','Right Lower Quadrant'],
      ['left lower quadrant','Left Lower Quadrant'],
      ['epigastric','Epigastric Region'],
      ['periumbilical','Periumbilical Region'],
      ['chest','Chest'],['abdomen','Abdomen'],
      ['stomach','Abdomen'],['back','Back'],
      ['head','Head'],['neck','Neck'],
      ['shoulder','Shoulder'],['leg','Leg'],
      ['knee','Knee'],['hip','Hip'],
      // Amharic body parts
      ['ሆድ','Abdomen'],['ራስ','Head'],['ደረት','Chest'],
      ['ጀርባ','Back'],['እግር','Leg'],['እጅ','Arm'],
      ['አንገት','Neck'],['ዓይን','Eye'],['ጆሮ','Ear'],
      ['አፍ','Mouth'],['ጉሮሮ','Throat'],['ወገብ','Lumbar'],
    ];
    const foundLocations: string[] = [];
    for (const [keyword, label] of locationPriority) {
      if (lower.includes(keyword) && !foundLocations.includes(label)) foundLocations.push(label);
    }
    const locValue = foundLocations.join(', ');
    const locConfidence = foundLocations.length > 0 ? 90 : 0;

    // ─── SYNTHESIZED HPI WITH FIDELITY AUDIT ───
    const buildHPI = (): string => {
      const parts: string[] = [];
      // Opening line with primary complaint (first symptom) and demographics
      const primaryComplaint = foundSymptoms[0] || '[chief complaint]';
      const otherSymptoms = foundSymptoms.slice(1);
      
      parts.push(`The patient presents with`);
      if (durValue) parts.push(`a ${durValue} history of`);
      if (sevValue) parts.push(sevValue.toLowerCase());
      parts.push(primaryComplaint);
      if (locValue) parts.push(`located in the ${locValue}`);
      parts.push('.');
      if (progValue) parts.push(`Symptoms are ${progValue.toLowerCase()}.`);
      // List additional symptoms WITHOUT repeating the primary
      if (otherSymptoms.length > 0) {
        parts.push(`Associated symptoms include ${otherSymptoms.join(', ')}.`);
      }
      // Self-medication
      if (selfMedications.length > 0) {
        parts.push(selfMedications.join('. ') + '.');
      }
      // Pertinent negatives
      if (pertinentNegatives.length > 0) {
        parts.push(pertinentNegatives.join('. ') + '.');
      }
      parts.push('Review of systems is otherwise negative.');
      return parts.join(' ').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
    };

    let hpiNarrative = buildHPI();

    // ─── FIDELITY AUDIT: Cross-check transcript keywords vs HPI ───
    const hpiLower = hpiNarrative.toLowerCase();
    const missingSymptoms = foundSymptoms.filter(s => !hpiLower.includes(s.toLowerCase()));
    if (missingSymptoms.length > 0) {
      // Append missing symptoms to ensure 100% fidelity
      hpiNarrative = hpiNarrative.replace(
        'Review of systems is otherwise negative.',
        `Additionally, the patient reports ${missingSymptoms.join(', ')}. Review of systems is otherwise negative.`
      );
    }

    // ─── SMART DIARIZED TRANSCRIPT (intent-based speaker attribution) ───
    const doctorPatterns = [
      // Greetings / openers from doctor
      /^hi\b/i, /^hello\b/i, /^good\s+(morning|afternoon|evening)/i,
      /how\s+are\s+you/i, /what\s+happened/i, /what\s+brings\s+you/i,
      /what\s+seem/i, /tell\s+me/i, /describe/i, /explain/i,
      // Questions (doctor asks)
      /\?$/, /^do\s+you/i, /^did\s+you/i, /^have\s+you/i, /^are\s+you/i,
      /^is\s+(it|there|the)/i, /^when\s+did/i, /^how\s+long/i, /^where\s+does/i,
      /^any\s+(other|fever|pain|blood|vomit|cough|history|allerg)/i,
      /^does\s+it/i, /^can\s+you/i, /^what\s+(kind|type|medication)/i,
      // Clinical commands
      /let\s+me\s+(check|examine|see)/i, /^ok\s+let/i, /^I('ll|\s+will)\s+(prescribe|order|recommend)/i,
      /^take\s+a\s+deep/i, /^lie\s+down/i, /^open\s+your/i,
    ];

    const patientPatterns = [
      // First-person symptom descriptions
      /^I\s+(have|feel|got|am|had|been|can't|don't|didn't|took|started)/i,
      /^my\s+(head|stomach|chest|back|body|leg|arm|eye|ear|throat|skin)/i,
      /^it\s+(hurts|burns|aches|started|lasts|comes|goes|gets)/i,
      /^yes/i, /^no/i, /^not\s+really/i, /^since/i, /^about/i,
      /^for\s+(\d|the\s+past)/i,
      // Symptom keywords as sentence starters
      /^(pain|headache|fever|diarrhea|vomit|nausea|cramp|burn)/i,
    ];

    const classifySpeaker = (sentence: string): 'Doctor' | 'Patient' => {
      const trimmed = sentence.trim();
      for (const p of doctorPatterns) {
        if (p.test(trimmed)) return 'Doctor';
      }
      for (const p of patientPatterns) {
        if (p.test(trimmed)) return 'Patient';
      }
      // Fallback: if it contains a symptom keyword, likely Patient
      const hasSymptom = AIAssistantService.MEDICAL_SYMPTOMS.some(s => trimmed.toLowerCase().includes(s));
      if (hasSymptom) return 'Patient';
      // Default: alternate based on previous speaker would be complex, just use Doctor for short, Patient for long
      return trimmed.split(/\s+/).length <= 5 ? 'Doctor' : 'Patient';
    };

    const sentences = rawTranscript.split(/[.!?,]+/).filter(s => s.trim().length > 2);
    const diarized = sentences.map(s => `**${classifySpeaker(s)}:** ${s.trim()}`).join('\n');

    const extractionResult: AmbientExtractionResult = {
      isClinical: true,
      chiefComplaint: ccValue,
      chiefComplaintConfidence: ccConfidence,
      duration: durConfidence >= 85 ? durValue : '',
      durationConfidence: durConfidence,
      severity: sevConfidence >= 85 ? sevValue : '',
      severityConfidence: sevConfidence,
      progression: progConfidence >= 85 ? progValue : '',
      progressionConfidence: progConfidence,
      location: locValue,
      locationConfidence: locConfidence,
      hpiNarrative,
      diarizedTranscript: diarized || rawTranscript
    };

    // ─── APPLY LEARNED CORRECTIONS (Self-Learning Memory) ───
    const finalResult = AIAssistantService.applyLearnedCorrections(rawTranscript, extractionResult);
    const stats = AIAssistantService.getLearningStats();
    if (stats.totalCorrections > 0) {
      console.log(`[ClinicalLearning] Applied ${stats.totalCorrections} learned corrections to extraction.`);
    }

    return finalResult;
  }

  /**
   * Build locally-generated suggested phrases that are specific to the actual
   * chief complaint text (not just the broad category).
   */
  static buildLocalSuggestedPhrases(patientData: PatientData): GeminiHPIResult['suggestedPhrases'] {
    const complaint  = (patientData.chiefComplaint || '').toLowerCase();
    const category   = AIAssistantService.classifyComplaint(complaint);
    const desc       = AIAssistantService.extractComplaintDescriptors(complaint);

    const durationOptions    = ['2 days', '3 days', '1 week', '2 weeks', '1 month'];
    const severityOptions    = ['Mild', 'Moderate', 'Severe'];
    const progressionOptions = ['Stable', 'Worsening', 'Improving', 'Fluctuating'];

    // Location: prefer what the complaint text says, fall back to category defaults
    const categoryLocations: Record<string, string[]> = {
      abdominal:      ['epigastric area', 'periumbilical region', 'right upper quadrant', 'diffuse abdomen'],
      headache:       ['frontal region', 'temporal area', 'occipital region', 'generalized'],
      chest_pain:     ['substernal area', 'left chest', 'epigastric region'],
      respiratory:    ['upper respiratory tract', 'chest'],
      back_pain:      ['lumbar region', 'lumbosacral area', 'thoracic spine'],
      dizziness:      [],
      flank:          ['left flank', 'right flank', 'bilateral flank'],
      musculoskeletal:['affected joint', 'lumbar region', 'cervical spine'],
      urinary:        ['suprapubic region', 'lower abdomen'],
      skin:           ['affected area', 'trunk', 'extremities'],
      general:        []
    };

    const locations = desc.locationHint
      ? [desc.locationHint, ...(categoryLocations[category] || []).filter(l => l !== desc.locationHint)].slice(0, 4)
      : (categoryLocations[category] || []);

    // Character: put extracted descriptors first, then add category-based options
    const categoryChars: Record<string, string[]> = {
      abdominal:      ['burning and crampy', 'sharp and stabbing', 'dull and aching', 'colicky', 'a sensation of fullness and distension'],
      headache:       ['throbbing and pulsating', 'pressure-like', 'sharp and stabbing', 'band-like'],
      chest_pain:     ['pressure-like and squeezing', 'sharp and pleuritic', 'burning'],
      respiratory:    ['dry and hacking', 'productive with sputum', 'wheezing'],
      back_pain:      ['dull and aching', 'sharp with radiation', 'muscle spasm'],
      dizziness:      ['true vertigo (spinning)', 'lightheadedness', 'presyncope'],
      flank:          ['dull and aching', 'colicky', 'sharp'],
      musculoskeletal:['aching', 'sharp on movement', 'stiffness'],
      urinary:        ['burning', 'dysuria', 'urgency'],
      general:        ['dull', 'aching', 'intermittent']
    };

    const extractedChars = desc.characterWords.slice(0, 3);
    const catChars = (categoryChars[category] || []).filter(c => !extractedChars.includes(c));
    const characters = [...extractedChars, ...catChars].slice(0, 4);

    // Aggravating: extracted hints first
    const categoryAgg: Record<string, string[]> = {
      abdominal:   ['meals and spicy food', 'lying flat after eating', 'fatty foods', 'empty stomach'],
      headache:    ['bright light and noise', 'physical activity', 'stress', 'skipping meals'],
      chest_pain:  ['exertion and physical activity', 'deep inspiration', 'lying flat'],
      respiratory: ['cold air and exertion', 'lying flat at night', 'allergen exposure'],
      back_pain:   ['prolonged sitting and bending', 'lifting heavy objects', 'twisting movements'],
      dizziness:   ['head movement', 'position changes', 'standing suddenly'],
      flank:       ['movement and percussion', 'physical activity'],
      urinary:     ['urination', 'holding urine', 'sexual activity'],
      general:     ['physical activity', 'stress']
    };
    const extractedAgg = desc.aggravatingHints;
    const catAgg = (categoryAgg[category] || []).filter(a => !extractedAgg.some(e => e.includes(a.split(' ')[0])));
    const aggravating = [...extractedAgg, ...catAgg].slice(0, 3);

    // Relieving: extracted hints first
    const categoryRel: Record<string, string[]> = {
      abdominal:   ['antacids', 'rest and fasting', 'small frequent meals', 'position change'],
      headache:    ['rest in dark room', 'analgesics', 'sleep', 'cold compress'],
      chest_pain:  ['rest', 'antacids', 'nitroglycerin', 'leaning forward'],
      respiratory: ['warm fluids and rest', 'cough suppressants', 'inhaler'],
      back_pain:   ['rest and position change', 'analgesics', 'heat application'],
      dizziness:   ['lying still', 'fixating on a point', 'hydration'],
      flank:       ['rest and hydration', 'analgesics', 'heat application'],
      urinary:     ['increased fluid intake', 'urinating frequently', 'analgesics'],
      general:     ['rest', 'analgesics', 'hydration']
    };
    const extractedRel = desc.relievingHints;
    const catRel = (categoryRel[category] || []).filter(r => !extractedRel.some(e => e.includes(r.split(' ')[0])));
    const relieving = [...extractedRel, ...catRel].slice(0, 3);

    // Associated: extracted hints first
    const categoryAssoc: Record<string, string[]> = {
      abdominal:   ['nausea without vomiting', 'bloating and early satiety', 'belching', 'decreased appetite'],
      headache:    ['nausea and photophobia', 'phonophobia', 'visual aura'],
      chest_pain:  ['shortness of breath', 'diaphoresis', 'palpitations'],
      respiratory: ['sore throat and nasal congestion', 'fatigue and myalgias', 'low-grade fever'],
      back_pain:   ['mild morning stiffness', 'no lower extremity radiation'],
      dizziness:   ['nausea', 'tinnitus', 'hearing changes'],
      flank:       ['urinary frequency', 'dysuria', 'hematuria'],
      urinary:     ['urinary urgency and frequency', 'dysuria', 'lower abdominal discomfort'],
      general:     ['fatigue', 'malaise', 'decreased appetite']
    };
    const extractedAssoc = desc.associatedHints;
    const catAssoc = (categoryAssoc[category] || []).filter(a => !extractedAssoc.some(e => e.includes(a.split(' ')[0])));
    const associated = [...extractedAssoc, ...catAssoc].slice(0, 3);

    return {
      duration:    durationOptions,
      severity:    severityOptions,
      progression: progressionOptions,
      location:    locations,
      character:   characters.length > 0 ? characters : (categoryChars[category] || []).slice(0, 3),
      aggravating: aggravating.length > 0 ? aggravating : (categoryAgg[category] || []).slice(0, 3),
      relieving:   relieving.length > 0  ? relieving  : (categoryRel[category] || []).slice(0, 3),
      associated:  associated.length > 0 ? associated : (categoryAssoc[category] || []).slice(0, 3)
    };
  }

  /**
   * Classify a chief complaint into a clinical category for OLD CARTS defaults.
   */
  private static classifyComplaint(complaint: string): string {
    if (complaint.includes('headache') || complaint.includes('migraine')) return 'headache';
    if (complaint.includes('chest pain')) return 'chest_pain';
    // Flank pain (often renal) before generic abdominal so it gets urinary/flank-appropriate phrasing
    if (complaint.includes('flank')) return 'flank';
    if (complaint.includes('abdominal') || complaint.includes('stomach') || complaint.includes('epigastric') || complaint.includes('abdominal cramp')) return 'abdominal';
    if (complaint.includes('back pain') || complaint.includes('lower back') || complaint.includes('lumbar')) return 'back_pain';
    if (complaint.includes('cough') || complaint.includes('fever') || complaint.includes('cold') || complaint.includes('sore throat') || complaint.includes('throat pain') || complaint.includes('respiratory')) return 'respiratory';
    if (complaint.includes('dizziness') || complaint.includes('vertigo')) return 'dizziness';
    if (complaint.includes('rash') || complaint.includes('skin') || complaint.includes('itching')) return 'skin';
    if (complaint.includes('joint') || complaint.includes('arthralgia') || complaint.includes('knee') || complaint.includes('shoulder')) return 'musculoskeletal';
    if (complaint.includes('urinary') || complaint.includes('dysuria') || complaint.includes('burning urine')) return 'urinary';
    return 'general';
  }

  /**
   * Return clinically appropriate default phrases for each OLD CARTS element
   * based on the complaint category. These fill in when the clinician has not
   * yet documented a specific element.
   */
  private static getOLDCARTSDefaults(category: string, complaint: string): {
    symptomNoun: string;
    onset: string;
    location: string;
    character: string;
    aggravating: string;
    relieving: string;
    timing: string;
    associated: string;
    negatives: string;
  } {
    const base = {
      symptomNoun: 'symptom',
      onset: '',
      location: '',
      character: '',
      aggravating: '',
      relieving: '',
      timing: '',
      associated: '',
      negatives: 'The patient denies any other significant symptoms.'
    };

    switch (category) {
      case 'headache':
        return {
          ...base,
          symptomNoun: 'pain',
          onset: 'gradually',
          location: 'frontal region',
          character: 'throbbing',
          aggravating: 'The pain is aggravated by bright light and physical activity.',
          relieving: 'The patient reports partial relief with rest and analgesics.',
          timing: 'The episodes are intermittent with no fixed pattern.',
          associated: 'Associated symptoms include nausea and photophobia.',
          negatives: 'The patient denies visual aura, neck stiffness, fever, focal neurological deficits, and recent head trauma.'
        };

      case 'chest_pain':
        return {
          ...base,
          symptomNoun: 'pain',
          onset: 'acutely',
          location: 'substernal area',
          character: 'pressure-like',
          aggravating: 'The pain is aggravated by exertion.',
          relieving: 'The pain is partially relieved by rest.',
          timing: 'The episodes are intermittent.',
          associated: 'Associated symptoms include mild shortness of breath.',
          negatives: 'The patient denies radiation to the arm or jaw, diaphoresis, palpitations, syncope, and lower extremity edema.'
        };

      case 'flank':
        return {
          ...base,
          symptomNoun: 'pain',
          onset: 'gradually',
          location: 'the flank',
          character: 'dull and aching',
          aggravating: 'The pain may be aggravated by movement or percussion.',
          relieving: 'The patient reports partial relief with rest and position change.',
          timing: 'The pain is constant with intermittent exacerbations.',
          associated: 'May be associated with urinary frequency or dysuria.',
          negatives: 'The patient denies fever, chills, hematuria, dysuria, or recent trauma. Urinary output is normal.'
        };

      case 'abdominal': {
        // Antacids/meals/postprandial only for upper GI (epigastric, stomach); use neutral phrasing for lower/general abdominal
        const isUpperGI = /epigastric|stomach|heartburn|reflux|gastritis|indigestion/.test(complaint);
        return {
          ...base,
          symptomNoun: 'pain',
          onset: 'gradually',
          location: isUpperGI ? 'epigastric region' : 'the abdomen',
          character: isUpperGI ? 'burning and crampy' : 'crampy or aching',
          aggravating: isUpperGI ? 'The pain is aggravated by meals and spicy food.' : 'The pain may be aggravated by movement or meals.',
          relieving: isUpperGI ? 'The patient reports partial relief with antacids.' : 'The patient reports partial relief with rest and position change.',
          timing: isUpperGI ? 'The pain is worse postprandially.' : 'The pain is intermittent.',
          associated: isUpperGI ? 'Associated with nausea but no vomiting.' : 'May be associated with nausea or changes in bowel habits.',
          negatives: 'The patient denies hematemesis, melena, hematochezia, jaundice, and changes in urine color. Bowel movements are normal in frequency and consistency.'
        };
      }

      case 'back_pain':
        return {
          ...base,
          symptomNoun: 'pain',
          onset: 'gradually',
          location: 'lumbar region',
          character: 'dull and aching',
          aggravating: 'The pain is aggravated by prolonged sitting and bending.',
          relieving: 'The patient reports partial relief with rest and change of position.',
          timing: 'The pain is constant with intermittent exacerbations.',
          associated: '',
          negatives: 'The patient denies radiation to the lower extremities, numbness, tingling, weakness, saddle anesthesia, and bowel or bladder dysfunction.'
        };

      case 'respiratory':
        return {
          ...base,
          symptomNoun: 'symptoms',
          onset: 'acutely',
          location: '',
          character: '',
          aggravating: 'Symptoms are aggravated by cold air and exertion.',
          relieving: 'The patient reports partial relief with warm fluids and rest.',
          timing: 'The symptoms are continuous.',
          associated: 'Associated symptoms include sore throat, nasal congestion, and fatigue.',
          negatives: 'The patient denies hemoptysis, significant dyspnea at rest, chest pain, and recent travel or known sick contacts.'
        };

      case 'dizziness':
        return {
          ...base,
          symptomNoun: 'dizziness',
          onset: 'suddenly',
          location: '',
          character: 'a spinning sensation (true vertigo)',
          aggravating: 'The dizziness is aggravated by head movement and position changes.',
          relieving: 'The patient reports improvement with lying still.',
          timing: 'The episodes are intermittent, lasting seconds to minutes.',
          associated: 'Associated with nausea.',
          negatives: 'The patient denies hearing loss, tinnitus, focal weakness, slurred speech, and visual changes.'
        };

      case 'skin':
        return {
          ...base,
          symptomNoun: 'lesion',
          onset: 'gradually',
          location: '',
          character: 'erythematous and pruritic',
          aggravating: 'The rash is aggravated by scratching and heat.',
          relieving: 'The patient reports partial relief with cool compresses.',
          timing: 'The rash has been spreading since onset.',
          associated: 'Associated with pruritus.',
          negatives: 'The patient denies fever, joint pain, mucosal involvement, and recent new medication or allergen exposure.'
        };

      case 'musculoskeletal':
        return {
          ...base,
          symptomNoun: 'pain',
          onset: 'gradually',
          location: 'the affected joint',
          character: 'aching',
          aggravating: 'The pain is aggravated by movement and weight-bearing.',
          relieving: 'The patient reports partial relief with rest and analgesics.',
          timing: 'The pain is worse with activity and improves with rest.',
          associated: '',
          negatives: 'The patient denies joint swelling, redness, warmth, locking, and constitutional symptoms such as fever or weight loss.'
        };

      case 'urinary':
        return {
          ...base,
          symptomNoun: 'symptoms',
          onset: 'acutely',
          location: 'suprapubic region',
          character: 'burning',
          aggravating: 'Symptoms are aggravated during micturition.',
          relieving: 'The patient reports partial relief with increased fluid intake.',
          timing: 'The symptoms are present with each void.',
          associated: 'Associated with urinary frequency and urgency.',
          negatives: 'The patient denies hematuria, flank pain, fever, chills, and vaginal or urethral discharge.'
        };

      default:
        return {
          ...base,
          symptomNoun: 'symptoms',
          negatives: 'The patient denies fever, chills, weight loss, and other constitutional symptoms.'
        };
    }
  }

  /**
   * Join a list of strings with commas and "and" before the last item.
   */
  private static joinList(items: string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }

  /**
   * Generate physical examination suggestions based on chief complaint
   */
  static getPhysicalExamSuggestions(patientData: PatientData): PhysicalExamSuggestions {
    const { chiefComplaint = '', vitals } = patientData;
    const complaint = chiefComplaint.toLowerCase();

    const defaultNormal: PhysicalExamSuggestions = {
      general: ['Alert', 'Oriented x3 (person, place, time)', 'No acute distress', 'Well-appearing', 'Well-nourished'],
      heent: {
        head: ['Normocephalic', 'Atraumatic'],
        eyes: ['PERRLA', 'EOMI', 'No icterus', 'No conjunctival pallor'],
        ears: ['TMs intact bilaterally', 'No erythema', 'No discharge'],
        nose: ['Patent nares', 'No discharge', 'No tenderness'],
        throat: ['Moist mucous membranes', 'No erythema', 'No exudates', 'Tonsils normal']
      },
      cardiovascular: ['Regular rate and rhythm', 'S1 S2 present', 'No murmurs', 'No rubs', 'No gallops', 'Peripheral pulses intact'],
      respiratory: ['Clear to auscultation bilaterally', 'No wheezes', 'No rales', 'No rhonchi', 'Normal respiratory effort'],
      gastrointestinal: ['Soft', 'Non-tender', 'Non-distended', 'Normal bowel sounds', 'No organomegaly', 'No guarding', 'No rebound tenderness'],
      neurological: ['Alert and oriented x3', 'Cranial nerves II-XII intact', 'Motor strength 5/5 all extremities', 'Sensation intact', 'Reflexes 2+ symmetric'],
      musculoskeletal: ['Full range of motion', 'No joint swelling', 'No tenderness', 'Normal gait'],
      skin: ['Warm', 'Dry', 'Intact', 'No rashes', 'No lesions', 'Good turgor']
    };

    // Customize based on chief complaint
    if (complaint.includes('epigastric pain') || complaint.includes('abdominal pain') || complaint.includes('stomach')) {
      defaultNormal.general = ['Alert', 'Oriented x3', 'Appears uncomfortable', 'In mild distress due to pain'];
      defaultNormal.gastrointestinal = [
        'Soft abdomen',
        'Epigastric tenderness on palpation',
        'No guarding',
        'No rebound tenderness',
        'Normal bowel sounds',
        'No hepatosplenomegaly',
        'No palpable masses',
        'Murphy\'s sign negative'
      ];
      defaultNormal.cardiovascular = ['Regular rate and rhythm', 'S1 S2 present', 'No murmurs'];
      defaultNormal.respiratory = ['Clear to auscultation bilaterally', 'No respiratory distress'];
    } else if (complaint.includes('chest pain')) {
      defaultNormal.general = ['Alert', 'Oriented x3', 'Appears anxious', 'No acute respiratory distress'];
      defaultNormal.cardiovascular = [
        'Regular rate and rhythm',
        'S1 S2 present',
        'No murmurs',
        'No rubs or gallops',
        'No JVD',
        'Peripheral pulses 2+ bilaterally',
        'No peripheral edema'
      ];
      defaultNormal.respiratory = [
        'Clear to auscultation bilaterally',
        'No wheezes or crackles',
        'Normal respiratory effort',
        'No accessory muscle use'
      ];
    } else if (complaint.includes('headache')) {
      defaultNormal.general = ['Alert', 'Oriented x3', 'Appears uncomfortable', 'Photophobic'];
      defaultNormal.heent = {
        head: ['Normocephalic', 'Atraumatic', 'No scalp tenderness', 'No temporal artery tenderness'],
        eyes: ['PERRLA', 'EOMI', 'No papilledema', 'No nystagmus'],
        ears: ['TMs intact bilaterally'],
        nose: ['Patent nares', 'No sinus tenderness'],
        throat: ['Moist mucous membranes', 'No meningismus']
      };
      defaultNormal.neurological = [
        'Alert and oriented x3',
        'Cranial nerves II-XII intact',
        'No focal neurological deficits',
        'Neck supple',
        'No Kernig\'s or Brudzinski\'s sign',
        'Normal gait and coordination'
      ];
    } else if (complaint.includes('cough') || complaint.includes('fever') || complaint.includes('respiratory') || complaint.includes('shortness of breath')) {
      defaultNormal.general = ['Alert', 'Oriented x3', complaint.includes('fever') ? 'Febrile appearing' : 'No acute distress', 'Mild respiratory distress'];
      defaultNormal.heent = {
        head: ['Normocephalic', 'Atraumatic'],
        eyes: ['PERRLA', 'EOMI', 'No conjunctival injection'],
        ears: ['TMs intact bilaterally'],
        nose: ['Nasal congestion', 'Clear discharge'],
        throat: ['Mild pharyngeal erythema', 'No exudates', 'No tonsillar enlargement']
      };
      defaultNormal.respiratory = [
        complaint.includes('wheezing') ? 'Expiratory wheezes bilaterally' : 'Clear to auscultation bilaterally',
        'No rales or rhonchi',
        'Normal respiratory effort',
        'No accessory muscle use',
        'Symmetric chest expansion'
      ];
    } else if (complaint.includes('back pain') || complaint.includes('lower back')) {
      defaultNormal.general = ['Alert', 'Oriented x3', 'Appears uncomfortable', 'Antalgic posture'];
      defaultNormal.musculoskeletal = [
        'Lumbar paraspinal muscle tenderness',
        'Limited lumbar range of motion',
        'No midline spinal tenderness',
        'Negative straight leg raise bilaterally',
        'Normal lower extremity strength',
        'Normal sensation in lower extremities',
        'Normal reflexes'
      ];
      defaultNormal.neurological = [
        'Alert and oriented x3',
        'Lower extremity strength 5/5',
        'Sensation intact in lower extremities',
        'Reflexes 2+ symmetric',
        'No saddle anesthesia'
      ];
    } else if (complaint.includes('dizziness') || complaint.includes('vertigo')) {
      defaultNormal.general = ['Alert', 'Oriented x3', 'Appears unsteady', 'Nauseous'];
      defaultNormal.heent = {
        head: ['Normocephalic', 'Atraumatic'],
        eyes: ['PERRLA', 'EOMI', 'Nystagmus absent at rest', 'Dix-Hallpike test performed'],
        ears: ['TMs intact bilaterally', 'No erythema'],
        nose: ['Patent nares'],
        throat: ['Moist mucous membranes']
      };
      defaultNormal.neurological = [
        'Alert and oriented x3',
        'Cranial nerves II-XII intact',
        'No focal neurological deficits',
        'Romberg test performed',
        'Gait ataxic',
        'Finger-nose test normal'
      ];
    }

    return defaultNormal;
  }

  /**
   * Get HPI sentence completions that are tailored to the specific chief complaint
   * text, including descriptors like "swollen", "burning", "fullness", etc.
   */
  static getHPICompletions(partialText: string, chiefComplaint: string): string[] {
    const complaint = chiefComplaint.toLowerCase();
    const text      = partialText.toLowerCase();
    const completions: string[] = [];

    // --- Generic OLD CARTS completions based on what the user has typed ---
    const genericByTyped: Record<string, string[]> = {
      onset: [
        'The symptoms began suddenly.',
        'The symptoms began gradually over several days.',
        'The patient reports an insidious onset with gradual worsening.'
      ],
      aggravat: [
        'The symptoms are aggravated by physical activity.',
        'The pain is worsened by movement and deep palpation.'
      ],
      reliev: [
        'The patient reports partial relief with rest.',
        'The patient reports partial relief with over-the-counter analgesics.'
      ],
      sever: [
        'The patient rates the severity as moderate (5–6/10).',
        'The patient rates the pain as 7 out of 10.'
      ],
      denies: [
        'The patient denies fever, chills, or night sweats.',
        'The patient denies nausea, vomiting, or diarrhea.',
        'The patient denies chest pain or shortness of breath.'
      ]
    };
    for (const [key, phrases] of Object.entries(genericByTyped)) {
      if (text.includes(key)) completions.push(...phrases);
    }

    // --- Descriptor-based phrases derived from the chief complaint itself ---
    const desc = AIAssistantService.extractComplaintDescriptors(complaint);
    const noun = desc.symptomNoun !== 'discomfort' ? desc.symptomNoun : 'symptom';

    // Character phrases from extracted descriptors
    if (desc.characterWords.length > 0) {
      completions.push(
        `The ${noun} is described as ${desc.characterWords.slice(0, 2).join(' and ')} in nature.`
      );
    }

    // Location-specific completion
    if (desc.locationHint) {
      completions.push(`The ${noun} is localized to the ${desc.locationHint}.`);
    }

    // Aggravating from extracted
    if (desc.aggravatingHints.length > 0) {
      completions.push(
        `The ${noun} is aggravated by ${AIAssistantService.joinList(desc.aggravatingHints)}.`
      );
    }

    // Relieving from extracted
    if (desc.relievingHints.length > 0) {
      completions.push(
        `The patient reports partial relief with ${AIAssistantService.joinList(desc.relievingHints)}.`
      );
    }

    // Associated from extracted
    if (desc.associatedHints.length > 0) {
      completions.push(`Associated with ${AIAssistantService.joinList(desc.associatedHints)}.`);
    }

    // Pertinent negatives
    completions.push(desc.negatives);

    // --- Category-level extra completions ---
    const category = AIAssistantService.classifyComplaint(complaint);
    const extras: Record<string, string[]> = {
      abdominal: [
        'The pain is worse postprandially.',
        'The patient denies hematemesis, melena, hematochezia, and jaundice.',
        'Bowel movements are normal in frequency and consistency.'
      ],
      headache: [
        'No visual aura or focal neurological deficits.',
        'No neck stiffness, fever, or recent head trauma.',
        'The headache is not the worst headache of the patient\'s life.'
      ],
      chest_pain: [
        'No radiation to the arm, jaw, or back.',
        'No diaphoresis, palpitations, or syncope.',
        'The pain is not pleuritic in character.'
      ],
      respiratory: [
        'No hemoptysis or significant dyspnea at rest.',
        'No known sick contacts or recent travel.',
        'Oxygen saturation is within normal limits.'
      ],
      back_pain: [
        'No radiation to the lower extremities.',
        'No numbness, tingling, or lower extremity weakness.',
        'No saddle anesthesia or bowel/bladder dysfunction.'
      ],
      dizziness: [
        'No hearing loss or tinnitus.',
        'No focal weakness or slurred speech.',
        'The episodes are intermittent, lasting seconds to minutes.'
      ],
      flank: [
        'No fever, chills, or hematuria.',
        'No dysuria or urinary frequency.',
        'Urinary output is normal in volume and appearance.'
      ],
      urinary: [
        'The patient reports urinary frequency and urgency.',
        'No hematuria, flank pain, or fever.',
        'No vaginal or urethral discharge.'
      ]
    };
    if (extras[category]) completions.push(...extras[category]);

    if (completions.length === 0) {
      completions.push(
        'The symptoms began gradually.',
        'The patient rates the severity as moderate.',
        'The patient reports partial relief with rest.',
        'The patient denies fever, chills, or night sweats.',
        'Review of systems is otherwise negative.'
      );
    }

    return [...new Set(completions)].slice(0, 8);
  }
}

export default AIAssistantService;
