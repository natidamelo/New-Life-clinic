// AI Assistant Service for Clinical Decision Support

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
  differentialDiagnoses: string[];
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
    const fallback: GeminiHPIResult = {
      isAIAvailable: false,
      narrative: AIAssistantService.generateHPINarrative(patientData),
      suggestedPhrases: AIAssistantService.buildLocalSuggestedPhrases(patientData),
      redFlags: [],
      differentialDiagnoses: []
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

      return {
        isAIAvailable: true,
        narrative: data.narrative || fallback.narrative,
        suggestedPhrases: data.suggestedPhrases || fallback.suggestedPhrases,
        redFlags: data.redFlags || [],
        differentialDiagnoses: data.differentialDiagnoses || []
      };
    } catch {
      return fallback;
    }
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
