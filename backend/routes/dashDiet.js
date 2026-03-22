const express = require('express');
const router = express.Router();
const axios = require('axios');
const VitalSigns = require('../models/VitalSigns');
const Patient = require('../models/Patient');
const DashDiet = require('../models/DashDiet');
const { auth } = require('../middleware/auth');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Call Gemini AI with a prompt
async function callGemini(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null;
  }
  try {
    const response = await axios.post(GEMINI_URL, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    }, { timeout: 15000 });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return null;
  }
}

// @route   GET /api/dash-diet/records
router.get('/records', auth, async (req, res) => {
  try {
    const {
      riskLevel = 'all',
      status = 'all',
      timePeriod = 'all',
      searchTerm = '',
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (riskLevel !== 'all') query.riskLevel = riskLevel;
    if (status !== 'all') query.status = status;

    if (timePeriod !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      if (timePeriod === 'today') filterDate.setHours(0, 0, 0, 0);
      else if (timePeriod === 'week') filterDate.setDate(now.getDate() - 7);
      else if (timePeriod === 'month') filterDate.setMonth(now.getMonth() - 1);
      query.generatedAt = { $gte: filterDate };
    }

    if (searchTerm) {
      query.$or = [
        { patientName: { $regex: searchTerm, $options: 'i' } },
        { patientId: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const total = await DashDiet.countDocuments(query);
    const pages = Math.ceil(total / limit);
    const records = await DashDiet.find(query)
      .sort({ generatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const allRecords = await DashDiet.find({});
    const stats = {
      totalRecords: allRecords.length,
      activePlans: allRecords.filter(r => r.status === 'active').length,
      completedPlans: allRecords.filter(r => r.status === 'completed').length,
      highRiskPatients: allRecords.filter(r => r.riskLevel === 'high').length,
      moderateRiskPatients: allRecords.filter(r => r.riskLevel === 'moderate').length,
      lowRiskPatients: allRecords.filter(r => r.riskLevel === 'low').length
    };

    res.json({
      success: true,
      data: records,
      stats,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages }
    });
  } catch (error) {
    console.error('Error fetching DASH diet records:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/dash-diet/records
router.post('/records', auth, async (req, res) => {
  try {
    const {
      patientId, patientName, planType, riskLevel,
      bloodPressure, bmi, weight, height,
      dietaryRestrictions, goals, notes
    } = req.body;

    if (!patientId || !patientName || !planType || !riskLevel || !bloodPressure || !bmi || !weight || !height) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Generate AI insights for the new plan
    let aiInsights = { summary: '', recommendations: [], warnings: [], generatedAt: new Date() };
    const aiPrompt = `You are a clinical dietitian AI. A patient has been enrolled in a DASH diet program.

Patient Data:
- Plan Type: ${planType}
- Risk Level: ${riskLevel}
- Blood Pressure: ${bloodPressure.systolic}/${bloodPressure.diastolic} mmHg
- BMI: ${bmi}
- Weight: ${weight} kg, Height: ${height} cm
- Dietary Restrictions: ${(dietaryRestrictions || []).join(', ') || 'None'}
- Goals: ${(goals || []).join(', ') || 'General wellness'}
- Notes: ${notes || 'None'}

Provide a JSON response with:
1. "summary": A 2-sentence clinical summary of this patient's DASH diet needs
2. "recommendations": Array of 4 specific, actionable dietary recommendations
3. "warnings": Array of 2-3 important warnings or things to watch for

Respond ONLY with valid JSON, no markdown.`;

    const aiText = await callGemini(aiPrompt);
    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        aiInsights = {
          summary: parsed.summary || '',
          recommendations: parsed.recommendations || [],
          warnings: parsed.warnings || [],
          generatedAt: new Date()
        };
      } catch (e) {
        aiInsights.summary = aiText.substring(0, 300);
      }
    }

    const record = new DashDiet({
      patientId,
      patientName,
      planType,
      riskLevel,
      bloodPressure: {
        systolic: parseInt(bloodPressure.systolic),
        diastolic: parseInt(bloodPressure.diastolic)
      },
      bmi: parseFloat(bmi),
      weight: parseFloat(weight),
      height: parseFloat(height),
      dietaryRestrictions: dietaryRestrictions || [],
      goals: goals || [],
      notes: notes || '',
      status: 'active',
      aiInsights,
      generatedBy: req.user.id,
      generatedByName: req.user.name
    });

    await record.save();

    res.status(201).json({
      success: true,
      message: 'DASH diet record created successfully',
      data: record
    });
  } catch (error) {
    console.error('Error creating DASH diet record:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/dash-diet/records/:recordId
router.put('/records/:recordId', auth, async (req, res) => {
  try {
    const { recordId } = req.params;
    const updates = {
      ...req.body,
      updatedBy: req.user.id,
      updatedByName: req.user.name
    };

    const record = await DashDiet.findByIdAndUpdate(recordId, updates, { new: true });
    if (!record) {
      return res.status(404).json({ success: false, message: 'DASH diet record not found' });
    }

    res.json({ success: true, message: 'DASH diet record updated successfully', data: record });
  } catch (error) {
    console.error('Error updating DASH diet record:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/dash-diet/records/:recordId
router.delete('/records/:recordId', auth, async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await DashDiet.findByIdAndDelete(recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'DASH diet record not found' });
    }
    res.json({ success: true, message: 'DASH diet record deleted successfully' });
  } catch (error) {
    console.error('Error deleting DASH diet record:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/dash-diet/records/:recordId
router.get('/records/:recordId', auth, async (req, res) => {
  try {
    const record = await DashDiet.findById(req.params.recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'DASH diet record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/dash-diet/patients/:patientId/records
router.get('/patients/:patientId/records', auth, async (req, res) => {
  try {
    const records = await DashDiet.find({ patientId: req.params.patientId }).sort({ generatedAt: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/dash-diet/ai-chat
// @desc    AI nutritionist chat for DASH diet questions
router.post('/ai-chat', auth, async (req, res) => {
  try {
    const { message, patientContext, chatHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.json({
        success: true,
        reply: 'AI assistant is not configured yet. Please add your GEMINI_API_KEY to the backend .env file to enable AI features.',
        isAIAvailable: false
      });
    }

    const patientInfo = patientContext ? `
Patient Context:
- Name: ${patientContext.patientName || 'Unknown'}
- Risk Level: ${patientContext.riskLevel || 'Unknown'}
- Plan Type: ${patientContext.planType || 'DASH'}
- Blood Pressure: ${patientContext.systolic || '?'}/${patientContext.diastolic || '?'} mmHg
- BMI: ${patientContext.bmi || 'Unknown'}
- Goals: ${(patientContext.goals || []).join(', ') || 'Not specified'}
- Restrictions: ${(patientContext.dietaryRestrictions || []).join(', ') || 'None'}
` : '';

    const historyText = chatHistory.slice(-4).map(h => `${h.role === 'user' ? 'Patient/Nurse' : 'AI Dietitian'}: ${h.content}`).join('\n');

    const systemPrompt = `You are an expert clinical dietitian AI assistant specializing in the DASH (Dietary Approaches to Stop Hypertension) diet. You work at New Life Clinic and assist healthcare staff in managing patient nutrition plans.

${patientInfo}

${historyText ? `Recent conversation:\n${historyText}\n` : ''}

Guidelines:
- Give practical, evidence-based dietary advice
- Be concise but thorough (2-4 sentences per point)
- Always recommend consulting the attending physician for medical decisions
- Focus on DASH diet principles: low sodium, high potassium, fruits, vegetables, whole grains, lean proteins
- If asked about medications or medical diagnoses, defer to the physician

User question: ${message}

Respond helpfully and professionally.`;

    const reply = await callGemini(systemPrompt);

    res.json({
      success: true,
      reply: reply || 'I apologize, I could not generate a response. Please try again.',
      isAIAvailable: true
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: 'AI service error', error: error.message });
  }
});

// @route   POST /api/dash-diet/ai-insights/:recordId
// @desc    Regenerate AI insights for an existing record
router.post('/ai-insights/:recordId', auth, async (req, res) => {
  try {
    const record = await DashDiet.findById(req.params.recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.json({ success: false, message: 'AI not configured', isAIAvailable: false });
    }

    const prompt = `You are a clinical dietitian AI. Analyze this DASH diet patient record and provide updated insights.

Patient: ${record.patientName}
Plan Type: ${record.planType}
Risk Level: ${record.riskLevel}
Blood Pressure: ${record.bloodPressure.systolic}/${record.bloodPressure.diastolic} mmHg
BMI: ${record.bmi}
Weight: ${record.weight} kg
Goals: ${record.goals.join(', ')}
Dietary Restrictions: ${record.dietaryRestrictions.join(', ') || 'None'}
Status: ${record.status}
Notes: ${record.notes || 'None'}

Provide a JSON response with:
1. "summary": 2-sentence clinical summary
2. "recommendations": Array of 4 specific actionable recommendations
3. "warnings": Array of 2-3 clinical warnings or monitoring points

Respond ONLY with valid JSON, no markdown.`;

    const aiText = await callGemini(prompt);
    let aiInsights = { summary: '', recommendations: [], warnings: [], generatedAt: new Date() };

    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        aiInsights = {
          summary: parsed.summary || '',
          recommendations: parsed.recommendations || [],
          warnings: parsed.warnings || [],
          generatedAt: new Date()
        };
      } catch (e) {
        aiInsights.summary = aiText.substring(0, 500);
      }
    }

    record.aiInsights = aiInsights;
    await record.save();

    res.json({ success: true, data: aiInsights, isAIAvailable: true });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/dash-diet/generate/:patientId
router.post('/generate/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { planType = 'dash' } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const latestVitals = await VitalSigns.findOne({ patientId, isActive: true }).sort({ measurementDate: -1 });
    if (!latestVitals) {
      return res.status(404).json({ success: false, message: 'No vital signs found for this patient' });
    }

    const conditions = analyzePatientCondition(latestVitals);
    const dashDietPlan = generateDashDietPlan(patient, latestVitals, conditions, planType);

    // Generate AI insights
    let aiInsights = { summary: '', recommendations: [], warnings: [], generatedAt: new Date() };
    const aiPrompt = `You are a clinical dietitian AI. Generate personalized DASH diet insights for this patient.

Patient: ${patient.firstName} ${patient.lastName}, Age: ${patient.age || 'Unknown'}, Gender: ${patient.gender || 'Unknown'}
Blood Pressure: ${latestVitals.systolic || '?'}/${latestVitals.diastolic || '?'} mmHg
Blood Sugar: ${latestVitals.bloodSugar || 'Not measured'} mg/dL
BMI: ${latestVitals.bmi || 'Not calculated'}
Weight: ${latestVitals.weight || 'Unknown'} kg
Conditions: ${Object.entries(conditions).filter(([k,v]) => v === true).map(([k]) => k).join(', ') || 'None detected'}
Risk Level: ${conditions.riskLevel}
Plan Type: ${planType}

Provide JSON with:
1. "summary": 2-sentence personalized clinical summary
2. "recommendations": Array of 5 specific, personalized dietary recommendations  
3. "warnings": Array of 3 important clinical warnings for this patient

Respond ONLY with valid JSON, no markdown.`;

    const aiText = await callGemini(aiPrompt);
    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        aiInsights = {
          summary: parsed.summary || '',
          recommendations: parsed.recommendations || [],
          warnings: parsed.warnings || [],
          generatedAt: new Date()
        };
      } catch (e) {
        aiInsights.summary = aiText.substring(0, 300);
      }
    }

    const record = new DashDiet({
      patientId: patient._id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      planType,
      riskLevel: conditions.riskLevel,
      bloodPressure: {
        systolic: latestVitals.systolic || 0,
        diastolic: latestVitals.diastolic || 0
      },
      bmi: latestVitals.bmi || 0,
      weight: latestVitals.weight || 0,
      height: latestVitals.height || 0,
      dietaryRestrictions: dashDietPlan.restrictions,
      goals: dashDietPlan.goals,
      notes: `Auto-generated DASH diet plan for ${conditions.riskLevel} risk patient`,
      status: 'active',
      aiInsights,
      generatedBy: req.user.id,
      generatedByName: req.user.name
    });

    await record.save();

    res.json({
      success: true,
      message: 'DASH diet plan generated successfully',
      data: {
        record,
        plan: dashDietPlan,
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          age: patient.age,
          gender: patient.gender,
          patientId: patient.patientId
        },
        vitalSigns: {
          bloodPressure: latestVitals.systolic && latestVitals.diastolic ?
            `${latestVitals.systolic}/${latestVitals.diastolic}` : 'Not measured',
          bloodSugar: latestVitals.bloodSugar || 'Not measured',
          weight: latestVitals.weight || 'Not measured',
          height: latestVitals.height || 'Not measured',
          bmi: latestVitals.bmi || 'Not calculated',
          measurementDate: latestVitals.measurementDate
        },
        conditions,
        aiInsights
      }
    });
  } catch (error) {
    console.error('Error generating DASH diet plan:', error);
    res.status(500).json({ success: false, message: 'Error generating DASH diet plan', error: error.message });
  }
});

// @route   GET /api/dash-diet/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const all = await DashDiet.find({});
    const stats = {
      totalRecords: all.length,
      activePlans: all.filter(r => r.status === 'active').length,
      completedPlans: all.filter(r => r.status === 'completed').length,
      highRiskPatients: all.filter(r => r.riskLevel === 'high').length,
      moderateRiskPatients: all.filter(r => r.riskLevel === 'moderate').length,
      lowRiskPatients: all.filter(r => r.riskLevel === 'low').length
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/dash-diet/search-patients
router.get('/search-patients', auth, async (req, res) => {
  try {
    const { searchTerm } = req.query;
    if (!searchTerm) return res.json({ success: true, data: [] });

    const patients = await Patient.find({
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { patientId: { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(10).select('_id firstName lastName patientId age gender');

    const formattedPatients = patients.map(p => ({
      id: p._id,
      name: `${p.firstName} ${p.lastName}`,
      patientId: p.patientId,
      age: p.age,
      gender: p.gender
    }));

    res.json({ success: true, data: formattedPatients });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/dash-diet/recommendations/:patientId
router.get('/recommendations/:patientId', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const latestVitals = await VitalSigns.findOne({ patientId: req.params.patientId, isActive: true }).sort({ measurementDate: -1 });
    if (!latestVitals) return res.status(404).json({ success: false, message: 'No vital signs found' });

    const conditions = analyzePatientCondition(latestVitals);
    const recommendations = {
      recommendedPlanType: conditions.riskLevel === 'high' ? 'low_sodium' : 'dash',
      riskLevel: conditions.riskLevel,
      dietaryRestrictions: [],
      goals: [],
      notes: ''
    };

    if (conditions.hypertension) {
      recommendations.dietaryRestrictions.push('Low Sodium');
      recommendations.goals.push('Lower Blood Pressure');
      recommendations.notes += 'Patient has hypertension. ';
    }
    if (conditions.diabetes) {
      recommendations.dietaryRestrictions.push('Low Sugar');
      recommendations.goals.push('Diabetes Management');
      recommendations.notes += 'Patient has diabetes. ';
    }
    if (conditions.obesity) {
      recommendations.goals.push('Weight Loss');
      recommendations.notes += 'Patient is overweight. ';
    }
    if (conditions.highCholesterol) {
      recommendations.dietaryRestrictions.push('Low Fat', 'Low Cholesterol');
      recommendations.goals.push('Cholesterol Reduction');
      recommendations.notes += 'Patient has high cholesterol. ';
    }
    if (recommendations.goals.length === 0) {
      recommendations.goals.push('Heart Health', 'General Wellness');
    }

    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/dash-diet/templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = {
      dash: {
        name: 'Standard DASH Diet',
        description: 'Dietary Approaches to Stop Hypertension',
        sodiumLimit: '2,300 mg daily',
        foodGroups: {
          grains: '6-8 servings daily', vegetables: '4-5 servings daily',
          fruits: '4-5 servings daily', dairy: '2-3 servings daily',
          proteins: '6 or fewer servings daily', nuts: '4-5 servings weekly',
          fats: '2-3 servings daily', sweets: '5 or fewer servings weekly'
        }
      },
      low_sodium: {
        name: 'Lower Sodium DASH Diet',
        description: 'DASH diet with reduced sodium intake',
        sodiumLimit: '1,500 mg daily',
        foodGroups: {
          grains: '6-8 servings daily', vegetables: '4-5 servings daily',
          fruits: '4-5 servings daily', dairy: '2-3 servings daily',
          proteins: '6 or fewer servings daily', nuts: '4-5 servings weekly',
          fats: '2-3 servings daily', sweets: '5 or fewer servings weekly'
        }
      },
      heart_healthy: {
        name: 'Heart Healthy Diet',
        description: 'General heart-healthy eating plan',
        sodiumLimit: '2,000 mg daily',
        foodGroups: {
          grains: '6-8 servings daily', vegetables: '4-5 servings daily',
          fruits: '4-5 servings daily', dairy: '2-3 servings daily',
          proteins: '6 or fewer servings daily', nuts: '4-5 servings weekly',
          fats: '2-3 servings daily', sweets: '5 or fewer servings weekly'
        }
      }
    };
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Helper: analyze patient condition from vitals
function analyzePatientCondition(vitals) {
  const conditions = {
    hypertension: false, diabetes: false,
    highCholesterol: false, obesity: false, riskLevel: 'low'
  };

  if (vitals.systolic && vitals.diastolic) {
    if (vitals.systolic >= 140 || vitals.diastolic >= 90) {
      conditions.hypertension = true; conditions.riskLevel = 'high';
    } else if (vitals.systolic >= 130 || vitals.diastolic >= 80) {
      conditions.hypertension = true; conditions.riskLevel = 'moderate';
    }
  }

  if (vitals.bloodSugar) {
    if (vitals.bloodSugar >= 126) {
      conditions.diabetes = true; conditions.riskLevel = 'high';
    } else if (vitals.bloodSugar >= 100) {
      conditions.diabetes = true;
      if (conditions.riskLevel === 'low') conditions.riskLevel = 'moderate';
    }
  }

  if (vitals.bmi && vitals.bmi >= 30) {
    conditions.obesity = true;
    if (conditions.riskLevel === 'low') conditions.riskLevel = 'moderate';
  }

  if (conditions.hypertension && conditions.diabetes) conditions.highCholesterol = true;

  return conditions;
}

// Helper: generate DASH diet plan
function generateDashDietPlan(patient, vitals, conditions, planType) {
  const basePlan = {
    planName: 'DASH Diet Plan', duration: '4 weeks',
    goals: [], restrictions: [], foodsToEat: [], foodsToAvoid: [],
    dailyMeals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    weeklyMealPlan: {}, nutritionalGuidelines: {}, lifestyleRecommendations: []
  };

  if (conditions.hypertension) {
    basePlan.goals.push('Lower blood pressure');
    basePlan.restrictions.push('Limit sodium to < 2,300mg daily');
    basePlan.nutritionalGuidelines.sodium = 'Less than 2,300mg per day';
    basePlan.foodsToEat.push(
      'Fresh fruits and vegetables (especially leafy greens)',
      'Low-sodium or no-salt-added canned vegetables',
      'Fresh herbs and spices instead of salt',
      'Whole grains (brown rice, quinoa, oats)',
      'Lean proteins (fish, skinless poultry, beans)',
      'Low-fat dairy products',
      'Nuts and seeds (unsalted)',
      'Potassium-rich foods (bananas, sweet potatoes, spinach)'
    );
    basePlan.foodsToAvoid.push(
      'Processed and canned foods (high sodium)',
      'Fast food and restaurant meals',
      'Salted snacks (chips, pretzels, crackers)',
      'Cured meats (bacon, ham, deli meats)',
      'Soups and broths (unless low-sodium)',
      'Pickled foods', 'Table salt and salty seasonings'
    );
  }

  if (conditions.diabetes) {
    basePlan.goals.push('Control blood sugar levels');
    basePlan.restrictions.push('Monitor carbohydrate intake');
    basePlan.nutritionalGuidelines.carbohydrates = '45-60g per meal';
    basePlan.foodsToEat.push(
      'Non-starchy vegetables (broccoli, spinach, peppers)',
      'Whole grains with fiber (brown rice, quinoa)',
      'Lean proteins (fish, chicken, turkey, tofu)',
      'Healthy fats (avocado, olive oil, nuts)',
      'Low-glycemic fruits (berries, apples, pears)'
    );
    basePlan.foodsToAvoid.push(
      'Sugary drinks (soda, fruit juices, energy drinks)',
      'Refined carbohydrates (white bread, white rice)',
      'Sweets and desserts', 'Fried foods'
    );
  }

  if (conditions.obesity) {
    basePlan.goals.push('Achieve healthy weight');
    basePlan.restrictions.push('Control portion sizes');
    basePlan.nutritionalGuidelines.calories = '1,500-2,000 calories daily';
    basePlan.foodsToEat.push(
      'High-fiber vegetables (broccoli, cauliflower, leafy greens)',
      'Lean proteins (chicken breast, fish, egg whites)',
      'Low-calorie, high-volume foods (soup, salad)'
    );
    basePlan.foodsToAvoid.push(
      'High-calorie, low-nutrient foods', 'Fried foods and fast food',
      'Sugary beverages and alcohol'
    );
  }

  if (conditions.highCholesterol) {
    basePlan.goals.push('Lower cholesterol levels');
    basePlan.restrictions.push('Limit saturated fats');
    basePlan.nutritionalGuidelines.fats = 'Less than 7% saturated fat';
    basePlan.foodsToEat.push(
      'Oily fish (salmon, mackerel, sardines)',
      'Oats and barley (soluble fiber)',
      'Nuts (almonds, walnuts)', 'Avocados and olive oil'
    );
    basePlan.foodsToAvoid.push(
      'Red meat and processed meats', 'Full-fat dairy products',
      'Fried foods and trans fats'
    );
  }

  if (basePlan.foodsToEat.length === 0) {
    basePlan.foodsToEat = [
      'Fresh fruits and vegetables', 'Whole grains (brown rice, quinoa, oats)',
      'Lean proteins (fish, chicken, beans)', 'Healthy fats (avocado, olive oil, nuts)',
      'Low-fat dairy products', 'Water and herbal teas'
    ];
  }

  if (basePlan.foodsToAvoid.length === 0) {
    basePlan.foodsToAvoid = [
      'Processed foods and snacks', 'Sugary drinks and desserts',
      'Excessive fried foods', 'High-sodium foods'
    ];
  }

  basePlan.foodsToEat = [...new Set(basePlan.foodsToEat)];
  basePlan.foodsToAvoid = [...new Set(basePlan.foodsToAvoid)];
  basePlan.weeklyMealPlan = generateWeeklyMealPlan(conditions);
  basePlan.lifestyleRecommendations = [
    'Drink 8-10 glasses of water daily',
    'Exercise for at least 30 minutes, 5 days a week',
    'Get 7-9 hours of sleep nightly',
    'Manage stress through relaxation techniques',
    'Regular monitoring of vital signs'
  ];

  return basePlan;
}

// Helper: generate weekly meal plan
function generateWeeklyMealPlan(conditions) {
  const meals = {
    monday: {
      breakfast: 'Oatmeal with berries and low-fat milk',
      lunch: 'Grilled chicken salad with mixed vegetables',
      dinner: 'Baked salmon with quinoa and steamed broccoli',
      snack: 'Apple slices with almond butter'
    },
    tuesday: {
      breakfast: 'Greek yogurt with nuts and honey',
      lunch: 'Turkey and avocado wrap with whole grain tortilla',
      dinner: 'Vegetable stir-fry with brown rice',
      snack: 'Carrot sticks with hummus'
    },
    wednesday: {
      breakfast: 'Scrambled eggs with spinach and whole grain toast',
      lunch: 'Lentil soup with mixed green salad',
      dinner: 'Grilled chicken breast with sweet potato and green beans',
      snack: 'Mixed berries with low-fat yogurt'
    },
    thursday: {
      breakfast: 'Smoothie with spinach, banana, and protein powder',
      lunch: 'Quinoa salad with chickpeas and vegetables',
      dinner: 'Baked cod with roasted vegetables',
      snack: 'Handful of unsalted nuts'
    },
    friday: {
      breakfast: 'Whole grain cereal with low-fat milk and berries',
      lunch: 'Grilled vegetable sandwich on whole grain bread',
      dinner: 'Turkey meatballs with whole wheat pasta and marinara',
      snack: 'Orange slices'
    },
    saturday: {
      breakfast: 'Avocado toast with poached egg',
      lunch: 'Chicken and vegetable soup',
      dinner: 'Grilled fish with brown rice and steamed vegetables',
      snack: 'Low-fat cheese with whole grain crackers'
    },
    sunday: {
      breakfast: 'Whole grain pancakes with berries',
      lunch: 'Large mixed salad with grilled chicken',
      dinner: 'Roasted chicken with roasted vegetables',
      snack: 'Greek yogurt with granola'
    }
  };

  if (conditions.diabetes) {
    Object.values(meals).forEach(day => {
      day.breakfast += ' (limit to 1 serving)';
      day.lunch += ' (add extra protein)';
    });
  }

  if (conditions.hypertension) {
    Object.values(meals).forEach(day => {
      day.breakfast += ' (no added salt)';
      day.dinner += ' (herbs instead of salt)';
    });
  }

  return meals;
}

module.exports = router;
