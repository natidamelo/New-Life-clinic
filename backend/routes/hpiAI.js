var express = require('express');
var router = express.Router();
var axios = require('axios');
var authMw = require('../middleware/auth');
var auth = authMw.auth;

// Call Google Gemini 2.0 Flash with a prompt string
function callGemini(prompt) {
  var key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') return Promise.resolve(null);
  var url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    key;
  return axios
    .post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1500 }
      },
      { timeout: 20000 }
    )
    .then(function (r) {
      var c = r.data && r.data.candidates;
      return (
        (c &&
          c[0] &&
          c[0].content &&
          c[0].content.parts &&
          c[0].content.parts[0] &&
          c[0].content.parts[0].text) ||
        null
      );
    })
    .catch(function (err) {
      console.error('[HPI AI] Gemini error:', err.message);
      return null;
    });
}

// Build a structured prompt for HPI generation
function buildHPIPrompt(data) {
  var cc = data.chiefComplaint || 'unspecified complaint';
  var age = data.age || 'unknown age';
  var gender = data.gender || 'patient';
  var duration = data.duration || '';
  var severity = data.severity || '';
  var progression = data.progression || '';
  var location = data.location || '';
  var onset = data.onset || '';
  var character = data.character || '';
  var aggravating = Array.isArray(data.aggravatingFactors)
    ? data.aggravatingFactors.join(', ')
    : data.aggravatingFactors || '';
  var relieving = Array.isArray(data.relievingFactors)
    ? data.relievingFactors.join(', ')
    : data.relievingFactors || '';
  var associated = Array.isArray(data.associatedSymptoms)
    ? data.associatedSymptoms.join(', ')
    : data.associatedSymptoms || '';
  var pmh = data.pastMedicalHistory || '';
  var meds = Array.isArray(data.currentMedications)
    ? data.currentMedications.join(', ')
    : data.currentMedications || '';
  var hpi = data.historyOfPresentIllness || '';

  var knownFields = [];
  if (duration) knownFields.push('Duration: ' + duration);
  if (severity) knownFields.push('Severity: ' + severity);
  if (progression) knownFields.push('Progression: ' + progression);
  if (location) knownFields.push('Location: ' + location);
  if (onset) knownFields.push('Onset: ' + onset);
  if (character) knownFields.push('Character: ' + character);
  if (aggravating) knownFields.push('Aggravating factors: ' + aggravating);
  if (relieving) knownFields.push('Relieving factors: ' + relieving);
  if (associated) knownFields.push('Associated symptoms: ' + associated);
  if (pmh) knownFields.push('Past medical history: ' + pmh);
  if (meds) knownFields.push('Current medications: ' + meds);
  if (hpi) knownFields.push('Existing HPI Narrative: ' + hpi);

  var lines = [
    'You are a clinical documentation AI at New Life Clinic. Generate a professional, UNIQUE HPI for this specific patient.',
    '',
    'PATIENT:',
    '  Age: ' + age + '  |  Gender: ' + gender,
    '  Chief Complaint: ' + cc,
    knownFields.length > 0 ? '  ' + knownFields.join('\n  ') : '',
    '',
    'CRITICAL INSTRUCTIONS:',
    hpi 
      ? '1. The clinician has provided an Existing HPI Narrative. Use this Existing HPI Narrative as your primary source of clinical evidence. The differential diagnoses (DDx), red flags, and suggested labs/exams MUST be exact, highly specific, and directly generated based on the symptoms and details described in this HPI Narrative. Return this HPI narrative in the "narrative" field of the JSON output, or minorly polish it for medical grammar and professional terminology, but do not change its core symptoms.'
      : '1. The HPI narrative MUST reflect the patient\'s exact chief complaint words and descriptors. If the complaint says "swollen" — use phrases like "sensation of swelling and distension", NOT generic "burning". If the complaint says "burning" — use "burning epigastric discomfort". If the complaint says "tight" — use "tightness and constricting sensation". NEVER produce a generic template. Every narrative must be unique to this chief complaint.',
    '',
    '2. Write/polish a clear, professional HPI paragraph (OLD CARTS: Onset, Location, Duration, Character, Aggravating, Relieving, Timing, Severity). Use third-person. Include pertinent negatives. 6–10 sentences.',
    '',
    '3. Generate complaint-SPECIFIC suggested phrases for each OLD CARTS category.',
    '   "duration", "severity", "progression", "location" → short values only (e.g. "2 days", "Moderate").',
    '   "character", "aggravating", "relieving", "associated" → complete clinical phrases tailored to THIS complaint.',
    '',
    '4. List 3-5 red flag symptoms specific to this chief complaint the clinician should rule out.',
    '',
    '5. List 3-5 most likely differential diagnoses (DDx) for this specific presentation. Ensure they precisely match the symptoms in the HPI.',
    '   For example, if epigastric pain, heartburn, and loose stools/diarrhea are described, the top diagnoses should include GERD, Gastritis, and Acute Gastroenteritis.',
    '',
    'Return ONLY valid JSON (no markdown, no code fences):',
    '{',
    '  "narrative": "HPI paragraph specific to this chief complaint and patient descriptors.",',
    '  "suggestedPhrases": {',
    '    "duration": ["2 days", "3 days", "1 week"],',
    '    "severity": ["Mild", "Moderate", "Severe"],',
    '    "progression": ["Stable", "Worsening", "Improving"],',
    '    "location": ["specific location"],',
    '    "character": ["descriptor"],',
    '    "aggravating": ["aggravating phrase"],',
    '    "relieving": ["relieving phrase"],',
    '    "associated": ["associated symptom"]',
    '  },',
    '  "redFlags": ["red flag 1", "red flag 2", "red flag 3"],',
    '  "differentialDiagnoses": [',
    '    { "condition": "Condition Name", "reasoning": "Reasoning based on the HPI", "isRedFlag": false },',
    '    { "condition": "Condition Name 2", "reasoning": "Reasoning based on the HPI", "isRedFlag": true }',
    '  ],',
    '  "suggestedLabs": ["lab test 1", "lab test 2"],',
    '  "suggestedExams": ["physical exam check 1", "physical exam check 2"]',
    '}'
  ];

  return lines.filter(function (l) { return l !== undefined; }).join('\n');
}

// Local mock clinical insights generator as a fallback
function getLocalClinicalInsights(data) {
  var cc = (data.chiefComplaint || '').toLowerCase();
  var hpiText = (data.historyOfPresentIllness || '').toLowerCase();
  var textToAnalyze = cc + ' ' + hpiText;

  var mockDDx = [];
  var mockLabs = [];
  var mockExams = [];

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
    textToAnalyze.includes('urin') ||
    textToAnalyze.includes('dysuria') ||
    textToAnalyze.includes('micturition') ||
    textToAnalyze.includes('cystitis') ||
    textToAnalyze.includes('bladder') ||
    textToAnalyze.includes('flank pain') ||
    (textToAnalyze.includes('back pain') && textToAnalyze.includes('burn'))
  ) {
    mockDDx.push({ condition: 'Urinary Tract Infection (UTI) / Acute Cystitis', reasoning: 'Painful/burning urination (dysuria), potentially accompanied by urgency or suprapubic tenderness.', isRedFlag: false });
    mockDDx.push({ condition: 'Acute Pyelonephritis', reasoning: 'Upper urinary tract infection, strongly suspected with back/flank pain, fever, chills, or CVA tenderness.', isRedFlag: true });
    mockDDx.push({ condition: 'Nephrolithiasis (Kidney Stone)', reasoning: 'Colicky flank or back pain radiating to the groin, often with dysuria or hematuria.', isRedFlag: false });
    mockLabs.push('Urinalysis (U/A)', 'Urine Culture and Sensitivity', 'Complete Blood Count (CBC)', 'Renal Function Test (Creatinine/BUN)');
    mockExams.push('Costovertebral Angle (CVA) Tenderness', 'Abdominal Palpation', 'Suprapubic Tenderness Check', 'Vitals Assessment');
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

  return { ddx: mockDDx, labs: mockLabs, exams: mockExams };
}

// POST /api/medical-records/generate-hpi
// Generates AI-powered HPI narrative + suggested phrases using Gemini
router.post('/generate-hpi', auth, function (req, res) {
  var data = req.body || {};

  if (!data.chiefComplaint || !String(data.chiefComplaint).trim()) {
    return res.status(400).json({ success: false, message: 'chiefComplaint is required' });
  }

  var key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    return res.json({ success: true, isAIAvailable: false, message: 'AI not configured' });
  }

  var prompt = buildHPIPrompt(data);
  console.log('[HPI AI] Generating for chief complaint:', String(data.chiefComplaint).substring(0, 60));

  callGemini(prompt)
    .then(function (aiText) {
      if (!aiText) {
        return res.json({ success: true, isAIAvailable: false, message: 'AI returned no response' });
      }

      var result = null;
      try {
        var cleaned = aiText.replace(/```json\n?|\n?```/g, '').trim();
        result = JSON.parse(cleaned);
      } catch (e) {
        console.error('[HPI AI] JSON parse error:', e.message);
        var fallbackInsights = getLocalClinicalInsights(data);
        // If JSON parsing fails, return the raw text as narrative
        return res.json({
          success: true,
          isAIAvailable: true,
          narrative: aiText.substring(0, 2000),
          suggestedPhrases: {},
          redFlags: [],
          differentialDiagnoses: fallbackInsights.ddx,
          suggestedLabs: fallbackInsights.labs,
          suggestedExams: fallbackInsights.exams
        });
      }

      res.json({
        success: true,
        isAIAvailable: true,
        narrative: result.narrative || '',
        suggestedPhrases: result.suggestedPhrases || {},
        redFlags: result.redFlags || [],
        differentialDiagnoses: result.differentialDiagnoses || [],
        suggestedLabs: result.suggestedLabs || [],
        suggestedExams: result.suggestedExams || []
      });
    })
    .catch(function (err) {
      var status = err.response && err.response.status;
      if (status === 429) {
        return res.json({
          success: true,
          isAIAvailable: false,
          message: 'AI quota exceeded. Please try again later.'
        });
      }
      console.error('[HPI AI] Error:', err.message);
      res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    });
});

module.exports = router;
