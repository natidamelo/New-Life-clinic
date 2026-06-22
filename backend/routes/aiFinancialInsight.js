const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

/**
 * POST /api/ai/financial-insight
 * Body: { period, snapshot, loans, profitConfig? }
 * Returns: { summary, bullets, direction }
 */
router.post('/financial-insight', auth, async (req, res) => {
  try {
    const { period, snapshot, loans, profitConfig } = req.body;

    if (!snapshot || !period) {
      return res.status(400).json({ success: false, message: 'period and snapshot are required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'sk-ant-YOUR_KEY_HERE') {
      // Return mock data when key is not configured
      return res.json({
        success: true,
        data: {
          summary: `Your clinic's <b>${period}</b> financial performance shows <b>ETB ${(snapshot.totalRevenue || 0).toLocaleString()}</b> in revenue with a collection rate of <b>${snapshot.collectionRate || 0}%</b>. Review the action points below to improve profitability.`,
          bullets: [
            `Focus on reducing the ${snapshot.outstandingAmount > 0 ? 'ETB ' + snapshot.outstandingAmount.toLocaleString() + ' outstanding' : 'outstanding'} amount by following up on pending invoices within 7 days.`,
            `With ${snapshot.patientCount || 0} patients seen, target a 10% increase through referral incentives and appointment reminders.`,
            `Maintain your ${snapshot.collectionRate || 0}% collection rate — the industry benchmark for private clinics is 85%+.`,
          ],
          direction: snapshot.collectionRate >= 85 ? 'grow' : snapshot.collectionRate >= 70 ? 'maintain' : 'caution',
        },
      });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const userContent = `Analyze this ${period} financial data and give directional advice: ${JSON.stringify({ snapshot, loans: loans || [], profitConfig })}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `You are a financial advisor for New Life Clinic, a healthcare center in Addis Ababa.
All amounts are in ETB (Ethiopian Birr). Be specific, data-driven, and actionable.
Respond ONLY in JSON with this exact shape (no markdown, no code fences):
{
  "summary": "2-sentence summary with key metric highlighted in <b> tags",
  "bullets": ["action point 1", "action point 2", "action point 3"],
  "direction": "grow" | "maintain" | "caution"
}`,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content[0]?.text || '';

    // Parse JSON — strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_) {
      // Attempt to extract JSON object from the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Claude returned non-JSON response');
      }
    }

    if (!parsed.summary || !parsed.bullets || !parsed.direction) {
      throw new Error('Claude response missing required fields');
    }

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('POST /api/ai/financial-insight error:', err.message);
    // Return fallback instead of error so UI doesn't break
    res.json({
      success: true,
      data: {
        summary: `Unable to generate AI insight at this time. <b>Review the key metrics</b> manually and focus on outstanding collections.`,
        bullets: [
          'Follow up on all pending invoices within 48 hours.',
          'Review your pricing structure to ensure alignment with market rates.',
          'Consider running a patient recall campaign to boost visit volume.',
        ],
        direction: 'maintain',
      },
    });
  }
});

/**
 * POST /api/ai/clinical-insights
 * Body: { age, gender, hpi }
 * Returns: { success: true, data: { differentials: [], suggestedLabs: [], focusedExam: [] } }
 */
router.post('/clinical-insights', auth, async (req, res) => {
  try {
    const { age, gender, hpi } = req.body;

    if (!hpi || !hpi.trim()) {
      return res.status(400).json({ success: false, message: 'HPI is required' });
    }

    const systemPrompt = `You are assisting a physician by suggesting differential diagnoses based on a patient's documented History of Present Illness. Given the following patient demographics and HPI, return the top 3-5 most clinically relevant differential diagnoses given ALL symptoms mentioned (not just the chief complaint). For each, give a one-line rationale tied to specific findings in the HPI. Separately, flag any RED FLAG differential only if specific red-flag features are actually present in the HPI (e.g. don't flag meningitis/SAH unless thunderclap onset, high fever, neck stiffness, or photophobia are actually mentioned — flag a febrile/systemic differential like viral syndrome, influenza, typhoid, or malaria if fever/chills + joint pain + cough are present instead, when clinically appropriate for the patient's context). Also suggest relevant lab tests and focused physical exam maneuvers based on what would help distinguish between the differentials given. Respond ONLY in JSON, no preamble, matching this exact schema:
{
  "differentials": [
    { "diagnosis": "string", "rationale": "string", "redFlag": boolean }
  ],
  "suggestedLabs": ["string"],
  "focusedExam": ["string"]
}`;

    const userContent = `Patient Demographics:
Age: ${age || 'unknown'}
Gender: ${gender || 'patient'}

HPI Narrative:
${hpi}`;

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let parsedResult = null;

    if (anthropicKey && anthropicKey !== 'sk-ant-YOUR_KEY_HERE') {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: anthropicKey });

        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        });

        const rawText = response.content[0]?.text || '';
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      } catch (anthropicErr) {
        console.error('[Clinical Insights AI] Anthropic call failed:', anthropicErr.message);
      }
    }

    // Secondary fallback: Gemini AI
    if (!parsedResult) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
        try {
          const axios = require('axios');
          const geminiPrompt = `${systemPrompt}\n\nUser Data:\n${userContent}`;
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
          const response = await axios.post(url, {
            contents: [{ parts: [{ text: geminiPrompt }] }]
          }, { timeout: 20000 });

          const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = rawText.replace(/```json|```/g, '').trim();
          parsedResult = JSON.parse(cleaned);
        } catch (geminiErr) {
          console.error('[Clinical Insights AI] Gemini fallback call failed:', geminiErr.message);
        }
      }
    }

    // Tertiary fallback: Local programmatic clinical rules
    if (!parsedResult) {
      parsedResult = getLocalClinicalInsightsFallback(hpi);
    }

    res.json({ success: true, data: parsedResult });
  } catch (err) {
    console.error('POST /api/ai/clinical-insights error:', err.message);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

function getLocalClinicalInsightsFallback(hpi) {
  const text = (hpi || '').toLowerCase();
  
  // 1. Febrile / Systemic presentation (e.g. headache + chills + joint pain + cough + back pain)
  if (text.includes('chill') || text.includes('fever') || (text.includes('headache') && (text.includes('joint') || text.includes('cough') || text.includes('back')))) {
    return {
      differentials: [
        { diagnosis: "Influenza / Viral Respiratory Syndrome", rationale: "Chills, joint pain, cough, and headache are classic systemic indicators of a viral/influenza syndrome.", redFlag: false },
        { diagnosis: "Malaria Rule-out", rationale: "Acute febrile illness with headache, joint pain, and back pain in an endemic context requires malaria evaluation.", redFlag: true },
        { diagnosis: "Typhoid Fever", rationale: "Systemic febrile presentation with headache and body aches.", redFlag: false }
      ],
      suggestedLabs: ["CBC with Differential", "Blood Film for Malaria", "Widal Test / Typhodot", "Blood Culture"],
      focusedExam: ["Temperature Monitoring", "Lung Auscultation", "Abdominal Palpation for Splenomegaly"]
    };
  }

  // 2. Chest pain
  if (text.includes('chest') || text.includes('heart') || text.includes('substernal')) {
    const isRedFlag = text.includes('exert') || text.includes('radiat') || text.includes('pressure') || text.includes('shortness of breath');
    return {
      differentials: [
        { diagnosis: "Acute Coronary Syndrome (ACS)", rationale: "Substernal chest pain, pressure-like character, or exertional components require urgent rule-out.", redFlag: isRedFlag },
        { diagnosis: "Gastroesophageal Reflux Disease (GERD)", rationale: "Substernal burning discomfort often aggravated postprandially.", redFlag: false },
        { diagnosis: "Musculoskeletal Chest Wall Pain", rationale: "Localized pain that may be reproduced by palpation.", redFlag: false }
      ],
      suggestedLabs: ["12-Lead ECG", "Cardiac Troponin I/T", "Chest X-ray", "CBC"],
      focusedExam: ["Cardiac Auscultation", "Chest Wall Palpation (Tenderness)", "Lung Auscultation"]
    };
  }

  // 3. Abdominal pain
  if (text.includes('abdom') || text.includes('stomach') || text.includes('epigastric') || text.includes('flank')) {
    const isAppendicitis = text.includes('right lower') || text.includes('rlq') || text.includes('rebound');
    return {
      differentials: [
        { diagnosis: isAppendicitis ? "Acute Appendicitis" : "Acute Gastroenteritis", rationale: isAppendicitis ? "Right lower quadrant tenderness and rebound suggest appendicitis." : "Crampy abdominal pain with associated GI symptoms.", redFlag: isAppendicitis },
        { diagnosis: "Peptic Ulcer Disease (PUD)", rationale: "Epigastric discomfort, burning in character, sometimes related to meals.", redFlag: false },
        { diagnosis: "Urinary Tract Infection (UTI) / Pyelonephritis", rationale: "Abdominal/flank discomfort; consider if dysuria or frequency is present.", redFlag: false }
      ],
      suggestedLabs: ["Abdominal Ultrasound", "CBC with Differential", "Urinalysis", "Amylase & Lipase"],
      focusedExam: ["Abdominal Palpation (Guarding, Rebound)", "Costovertebral Angle (CVA) Tenderness", "Bowel Sounds Auscultation"]
    };
  }

  // 4. Headache alone (primary headache)
  if (text.includes('head') || text.includes('migraine') || text.includes('cephalalgia')) {
    const isRedFlag = text.includes('thunderclap') || text.includes('stiff') || text.includes('fever') || text.includes('photophobia') || text.includes('aura');
    return {
      differentials: [
        { diagnosis: "Migraine Headache", rationale: "Episodic headache, often unilateral, described as throbbing or associated with sensitivity.", redFlag: false },
        { diagnosis: "Tension Headache", rationale: "Bilateral, dull, band-like aching headache often associated with neck tightness.", redFlag: false },
        { diagnosis: "Acute Meningitis / SAH", rationale: "Red flag rule-out is critical if high fever, neck rigidity, or sudden thunderclap onset is reported.", redFlag: isRedFlag }
      ],
      suggestedLabs: ["CBC", "CRP / ESR", "Non-contrast Brain CT (if red flags present)"],
      focusedExam: ["Neurological Status Assessment", "Neck Rigidity (Kernig/Brudzinski signs)", "Fundoscopic Exam"]
    };
  }

  // 5. Default generic fallback
  return {
    differentials: [
      { diagnosis: "Viral Syndrome", rationale: "Nonspecific systemic presentation consistent with a viral etiology.", redFlag: false },
      { diagnosis: "Bacterial Infection", rationale: "Consider if symptoms are progressive or show focal signs of localized infection.", redFlag: false }
    ],
    suggestedLabs: ["CBC with Differential", "CRP", "Urinalysis"],
    focusedExam: ["Vitals Check & Temperature", "General Physical Examination"]
  };
}

module.exports = router;
