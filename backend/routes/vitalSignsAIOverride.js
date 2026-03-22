var express = require('express');
var router = express.Router();
var axios = require('axios');
var authMw = require('../middleware/auth');
var auth = authMw.auth;
var VitalSigns = require('../models/VitalSigns');

var GEMINI_KEY = process.env.GEMINI_API_KEY;

function callGemini(prompt) {
  if (!GEMINI_KEY || GEMINI_KEY === 'your_gemini_api_key_here') return Promise.resolve(null);
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_KEY;
  return axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  }, { timeout: 15000 }).then(function(r) {
    var c = r.data && r.data.candidates;
    return c && c[0] && c[0].content && c[0].content.parts && c[0].content.parts[0] && c[0].content.parts[0].text || null;
  }).catch(function(err) {
    console.error('Gemini error:', err.message);
    return null;
  });
}

function classifyBP(s, d) {
  if (!s || !d) return 'Unknown';
  if (s >= 180 || d >= 110) return 'Hypertensive Crisis';
  if (s >= 140 || d >= 90) return 'Stage 2 Hypertension';
  if (s >= 130 || d >= 80) return 'Stage 1 Hypertension';
  if (s >= 120) return 'Elevated';
  if (s < 90 || d < 60) return 'Hypotension';
  return 'Normal';
}

function riskFromBP(s, d) {
  if (!s || !d) return 'unknown';
  if (s >= 180 || d >= 110) return 'critical';
  if (s >= 140 || d >= 90) return 'high';
  if (s >= 130 || d >= 80) return 'moderate';
  return 'low';
}

router.post('/ai-analyze/:recordId', auth, function(req, res) {
  var recordId = req.params.recordId;
  var bData = req.body || {};
  var bSys = bData.systolic;
  var bDia = bData.diastolic;
  var bPid = bData.patientId;
  var bName = bData.patientName;
  var bPulse = bData.pulse;
  var bSpo2 = bData.spo2;
  var bBs = bData.bloodSugar;
  var bBmi = bData.bmi;

  if (!GEMINI_KEY || GEMINI_KEY === 'your_gemini_api_key_here') {
    return res.json({ success: true, isAIAvailable: false });
  }

  var currentBP = (bSys && bDia) ? (bSys + '/' + bDia + ' mmHg') : 'Not available';
  var mongoose = require('mongoose');

  var historyPromise;

  if (mongoose.Types.ObjectId.isValid(recordId)) {
    historyPromise = VitalSigns.findById(recordId).then(function(thisRec) {
      if (thisRec && thisRec.patientId) {
        var pid = thisRec.patientId.toString();
        return VitalSigns.find({
          patientId: pid,
          isActive: true,
          systolic: { $exists: true, $ne: null },
          diastolic: { $exists: true, $ne: null }
        }).sort({ measurementDate: -1 }).limit(20);
      }
      return [];
    });
  } else {
    historyPromise = Promise.resolve([]);
  }

  historyPromise.then(function(h1) {
    if (h1.length > 0) return h1;
    if (bPid && mongoose.Types.ObjectId.isValid(bPid)) {
      return VitalSigns.find({
        patientId: bPid,
        isActive: true,
        systolic: { $exists: true, $ne: null },
        diastolic: { $exists: true, $ne: null }
      }).sort({ measurementDate: -1 }).limit(20);
    }
    return [];
  }).then(function(h2) {
    if (h2.length > 0) return h2;
    if (bName) {
      var fn = bName.split(' ')[0];
      return VitalSigns.find({
        patientName: { $regex: fn, $options: 'i' },
        isActive: true,
        systolic: { $exists: true, $ne: null },
        diastolic: { $exists: true, $ne: null }
      }).sort({ measurementDate: -1 }).limit(20);
    }
    return [];
  }).then(function(historyReadings) {
    var allReadings = historyReadings.length > 0
      ? historyReadings
      : [{ systolic: bSys, diastolic: bDia, measurementDate: new Date() }];

    var valid = allReadings.filter(function(v) { return v.systolic && v.diastolic; });

    var bpLines = valid.map(function(v) {
      return new Date(v.measurementDate).toLocaleDateString() + ': ' + v.systolic + '/' + v.diastolic + ' mmHg';
    }).join('\n');

    var avgSys = valid.length > 0
      ? Math.round(valid.reduce(function(s, v) { return s + (v.systolic || 0); }, 0) / valid.length)
      : (bSys || 0);
    var avgDia = valid.length > 0
      ? Math.round(valid.reduce(function(s, v) { return s + (v.diastolic || 0); }, 0) / valid.length)
      : (bDia || 0);

    var promptLines = [
      'You are a clinical cardiologist AI. Analyze this BP data and respond with JSON only.',
      '',
      'Patient: ' + (bName || 'Unknown'),
      'Current BP: ' + currentBP,
      'Average BP (' + valid.length + ' readings): ' + avgSys + '/' + avgDia + ' mmHg',
      'Pulse: ' + (bPulse || 'N/A') + ' bpm | SpO2: ' + (bSpo2 || 'N/A') + '% | Blood Sugar: ' + (bBs || 'N/A') + ' mg/dL | BMI: ' + (bBmi || 'N/A'),
      '',
      'BP History:',
      bpLines || currentBP,
      '',
      'Return ONLY this JSON (no markdown):',
      '{"summary":"clinical summary here","classification":"Normal","trend":"stable","riskLevel":"low","recommendations":["rec1","rec2","rec3","rec4"],"warnings":[],"lifestyle":["tip1","tip2","tip3"]}'
    ];

    return callGemini(promptLines.join('\n')).then(function(aiText) {
      var analysis = {
        summary: classifyBP(bSys, bDia) + ' reading: ' + currentBP,
        classification: classifyBP(bSys, bDia),
        trend: valid.length > 1 ? 'stable' : 'insufficient_data',
        riskLevel: riskFromBP(bSys, bDia),
        recommendations: ['Monitor BP regularly', 'Low-sodium diet', 'Exercise 30 min daily', 'Follow up with physician'],
        warnings: [],
        lifestyle: ['Reduce sodium', 'Exercise daily', 'Manage stress']
      };

      if (aiText) {
        try {
          var cleaned = aiText.replace(/```json\n?|\n?```/g, '').trim();
          var parsed = JSON.parse(cleaned);
          if (parsed && parsed.summary) analysis = parsed;
        } catch (e) {
          analysis.summary = aiText.substring(0, 400);
        }
      }

      res.json({
        success: true,
        isAIAvailable: true,
        analysis: analysis,
        stats: { totalReadings: valid.length, avgSystolic: avgSys, avgDiastolic: avgDia, currentBP: currentBP }
      });
    });
  }).catch(function(error) {
    console.error('BP AI analyze error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  });
});

// POST /api/vital-signs/ai-chat — override with fresh key reading
router.post('/ai-chat', auth, async function(req, res) {
  try {
    var message = req.body.message;
    var patientContext = req.body.patientContext;
    var chatHistory = req.body.chatHistory || [];

    if (!message) {
      return res.json({ success: true, reply: 'Please enter a message.', isAIAvailable: true });
    }

    var key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') {
      return res.json({ success: true, reply: 'AI not configured. Add GEMINI_API_KEY to .env file.', isAIAvailable: false });
    }

    var ctx = '';
    if (patientContext) {
      ctx = 'Current Patient: ' + (patientContext.patientName || 'Unknown') + '\n' +
        'BP: ' + (patientContext.systolic || '?') + '/' + (patientContext.diastolic || '?') + ' mmHg\n' +
        'Pulse: ' + (patientContext.pulse || 'N/A') + ' bpm | SpO2: ' + (patientContext.spo2 || 'N/A') + '% | BMI: ' + (patientContext.bmi || 'N/A') + '\n' +
        'Classification: ' + (patientContext.classification || 'N/A') + '\n';
    }

    var history = (chatHistory || []).slice(-4).map(function(h) {
      return (h.role === 'user' ? 'Nurse' : 'AI') + ': ' + h.content;
    }).join('\n');

    var parts = [
      'You are an expert AI cardiologist assistant at New Life Clinic helping nursing staff.',
      ctx,
      history ? ('Recent conversation:\n' + history) : '',
      'Give evidence-based clinical guidance on blood pressure. Be concise and professional.',
      '',
      'Question: ' + message
    ].filter(function(p) { return p && p.trim(); });

    var promptText = parts.join('\n');
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key;

    console.log('[AI Chat] Sending to Gemini, message:', message.substring(0, 50));

    var r = await axios.post(url, {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    }, { timeout: 20000 });

    var candidates = r.data && r.data.candidates;
    var reply = candidates && candidates[0] && candidates[0].content &&
      candidates[0].content.parts && candidates[0].content.parts[0] &&
      candidates[0].content.parts[0].text || null;

    console.log('[AI Chat] Reply received:', reply ? 'yes (' + reply.length + ' chars)' : 'null');

    res.json({
      success: true,
      reply: reply || 'I could not generate a response. Please try again.',
      isAIAvailable: true
    });
  } catch (err) {
    var status = err.response && err.response.status;
    var code = err.response && err.response.data && err.response.data.error && err.response.data.error.code;
    var friendlyMessage;

    if (status === 429 || code === 429) {
      friendlyMessage = 'The AI service has reached its usage limit for now. Please try again in a few minutes, or check your Google AI (Gemini) plan and billing at https://ai.google.dev/gemini-api/docs/rate-limits.';
      console.error('[AI Chat] Quota exceeded (429):', err.response && err.response.data ? JSON.stringify(err.response.data) : err.message);
    } else {
      var errMsg = err.response && err.response.data
        ? JSON.stringify(err.response.data).substring(0, 200)
        : err.message;
      friendlyMessage = 'Sorry, I encountered an error connecting to AI. Please try again.';
      console.error('[AI Chat] Error:', errMsg);
    }

    res.json({
      success: true,
      reply: friendlyMessage,
      isAIAvailable: true
    });
  }
});

module.exports = router;
