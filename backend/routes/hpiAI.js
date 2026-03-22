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

  var lines = [
    'You are a clinical documentation AI at New Life Clinic. Generate a professional, UNIQUE HPI for this specific patient.',
    '',
    'PATIENT:',
    '  Age: ' + age + '  |  Gender: ' + gender,
    '  Chief Complaint: ' + cc,
    knownFields.length > 0 ? '  ' + knownFields.join('\n  ') : '',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. The HPI narrative MUST reflect the patient\'s exact chief complaint words and descriptors.',
    '   If the complaint says "swollen" — use phrases like "sensation of swelling and distension", NOT generic "burning".',
    '   If the complaint says "burning" — use "burning epigastric discomfort".',
    '   If the complaint says "tight" — use "tightness and constricting sensation".',
    '   NEVER produce a generic template. Every narrative must be unique to this chief complaint.',
    '',
    '2. Write a clear, professional HPI paragraph (OLD CARTS: Onset, Location, Duration, Character, Aggravating,',
    '   Relieving, Timing, Severity). Use third-person. Include pertinent negatives. 6–10 sentences.',
    '   Weave in the patient\'s own descriptors naturally into the character and associated symptoms.',
    '',
    '3. Generate complaint-SPECIFIC suggested phrases for each OLD CARTS category.',
    '   "duration", "severity", "progression", "location" → short values only (e.g. "2 days", "Moderate").',
    '   "character", "aggravating", "relieving", "associated" → complete clinical phrases tailored to THIS complaint.',
    '   The character options MUST reflect what the patient described (swollen/bloated/burning/sharp/etc.).',
    '',
    '4. List 3-5 red flag symptoms specific to this chief complaint the clinician should rule out.',
    '',
    '5. List 3-5 most likely differential diagnoses for this specific presentation.',
    '',
    'Return ONLY valid JSON (no markdown, no code fences):',
    '{',
    '  "narrative": "Unique HPI paragraph specific to this chief complaint and patient descriptors.",',
    '  "suggestedPhrases": {',
    '    "duration": ["2 days", "3 days", "1 week"],',
    '    "severity": ["Mild", "Moderate", "Severe"],',
    '    "progression": ["Stable", "Worsening", "Improving"],',
    '    "location": ["specific location from complaint"],',
    '    "character": ["descriptor matching patient words", "alternative descriptor"],',
    '    "aggravating": ["complaint-specific aggravating phrase"],',
    '    "relieving": ["complaint-specific relieving phrase"],',
    '    "associated": ["complaint-specific associated symptom"]',
    '  },',
    '  "redFlags": ["red flag 1", "red flag 2", "red flag 3"],',
    '  "differentialDiagnoses": ["diagnosis 1", "diagnosis 2", "diagnosis 3"]',
    '}'
  ];

  return lines.filter(function (l) { return l !== undefined; }).join('\n');
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
        // If JSON parsing fails, return the raw text as narrative
        return res.json({
          success: true,
          isAIAvailable: true,
          narrative: aiText.substring(0, 2000),
          suggestedPhrases: {},
          redFlags: [],
          differentialDiagnoses: []
        });
      }

      res.json({
        success: true,
        isAIAvailable: true,
        narrative: result.narrative || '',
        suggestedPhrases: result.suggestedPhrases || {},
        redFlags: result.redFlags || [],
        differentialDiagnoses: result.differentialDiagnoses || []
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
