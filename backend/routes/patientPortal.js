const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const VitalSigns = require('../models/VitalSigns');
const LabOrder = require('../models/LabOrder');
const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const { logger } = require('../middleware/errorHandler');

/**
 * Middleware to verify that the logged-in user is a patient and has a linked patient record
 */
const verifyPatient = (req, res, next) => {
  if (req.user.role !== 'patient' || !req.user.patient) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only patients with linked clinical records can access this portal.'
    });
  }
  next();
};

router.use(verifyPatient);

/**
 * @route   GET /api/patient-portal/profile
 * @desc    Get patient profile and linked user details
 * @access  Private (Patient only)
 */
router.get('/profile', async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.user.patient);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Clinical patient record not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName
        },
        patient
      }
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal profile', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/vitals
 * @desc    Get patient vital signs measurement history
 * @access  Private (Patient only)
 */
router.get('/vitals', async (req, res, next) => {
  try {
    // 1. Fetch from standalone VitalSigns collection
    const standaloneVitals = await VitalSigns.find({
      patientId: req.user.patient,
      isActive: true
    }).sort({ measurementDate: -1 });

    const formattedStandalone = standaloneVitals.map(v => ({
      systolic: v.systolic,
      diastolic: v.diastolic,
      pulse: v.pulse,
      temperature: v.temperature,
      weight: v.weight,
      height: v.height,
      bmi: v.bmi,
      spo2: v.spo2,
      respiratoryRate: v.respiratoryRate,
      bloodSugar: v.bloodSugar,
      notes: v.notes,
      measuredByName: v.measuredByName || 'Clinical Nurse',
      measurementDate: v.measurementDate
    }));

    // 2. Fetch from MedicalRecord consult vital signs
    const medicalRecords = await MedicalRecord.find({
      patient: req.user.patient
    }).populate('doctorId', 'firstName lastName').sort({ visitDate: -1 });

    const recordVitals = [];
    for (const record of medicalRecords) {
      if (record.vitalSigns && (record.vitalSigns.bloodPressure || record.vitalSigns.temperature || record.vitalSigns.heartRate)) {
        // Parse BP (e.g. "120/80")
        let systolic = undefined;
        let diastolic = undefined;
        if (record.vitalSigns.bloodPressure) {
          const parts = record.vitalSigns.bloodPressure.split('/');
          if (parts.length === 2) {
            systolic = parseFloat(parts[0]);
            diastolic = parseFloat(parts[1]);
          }
        }

        // Parse temperature (convert Fahrenheit > 45 to Celsius)
        let temp = record.vitalSigns.temperature ? parseFloat(record.vitalSigns.temperature) : undefined;
        if (temp && temp > 45) {
          temp = Math.round(((temp - 32) * 5 / 9) * 10) / 10;
        }

        recordVitals.push({
          systolic,
          diastolic,
          pulse: record.vitalSigns.heartRate ? parseFloat(record.vitalSigns.heartRate) : undefined,
          temperature: temp,
          weight: record.vitalSigns.weight ? parseFloat(record.vitalSigns.weight) : undefined,
          height: record.vitalSigns.height ? parseFloat(record.vitalSigns.height) : undefined,
          bmi: record.vitalSigns.bmi ? parseFloat(record.vitalSigns.bmi) : undefined,
          spo2: record.vitalSigns.oxygenSaturation ? parseFloat(record.vitalSigns.oxygenSaturation) : undefined,
          respiratoryRate: record.vitalSigns.respiratoryRate ? parseFloat(record.vitalSigns.respiratoryRate) : undefined,
          measuredByName: record.doctorName || (record.doctorId ? `Dr. ${record.doctorId.lastName}` : 'Consulting Physician'),
          measurementDate: record.visitDate,
          notes: record.notes || 'Recorded during consultation'
        });
      }
    }

    // 3. Merge both lists and sort by date descending
    const allVitals = [...formattedStandalone, ...recordVitals].sort((a, b) => 
      new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );

    res.status(200).json({
      success: true,
      data: allVitals
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal vitals', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/lab-results
 * @desc    Get patient lab test orders and results
 * @access  Private (Patient only)
 */
router.get('/lab-results', async (req, res, next) => {
  try {
    const labOrders = await LabOrder.find({
      patient: req.user.patient
    }).populate('orderingDoctorId', 'firstName lastName specialization')
      .sort({ orderDateTime: -1 });

    res.status(200).json({
      success: true,
      data: labOrders
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal lab results', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/records
 * @desc    Get patient medical records, consultation notes, and recommendations
 * @access  Private (Patient only)
 */
router.get('/records', async (req, res, next) => {
  try {
    const medicalRecords = await MedicalRecord.find({
      patient: req.user.patient,
      status: 'Finalized',
      isDeleted: false
    }).populate('doctorId', 'firstName lastName specialization')
      .sort({ visitDate: -1 });

    res.status(200).json({
      success: true,
      data: medicalRecords
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal medical records', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/treatments
 * @desc    Get patient clinic medications and injections (Nurse Tasks)
 * @access  Private (Patient only)
 */
router.get('/treatments', async (req, res, next) => {
  try {
    const NurseTask = require('../models/NurseTask');
    const tasks = await NurseTask.find({
      patientId: req.user.patient
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal clinic treatments', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/prescriptions
 * @desc    Get patient prescriptions
 * @access  Private (Patient only)
 */
router.get('/prescriptions', async (req, res, next) => {
  try {
    const Prescription = require('../models/Prescription');
    const User = require('../models/User'); // Required so schema registers
    const prescriptions = await Prescription.find({
      patient: req.user.patient
    }).populate('doctor', 'firstName lastName specialization')
      .sort({ datePrescribed: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal prescriptions', { error: error.message });
    next(error);
  }
});

/**
 * @route   PUT /api/patient-portal/profile
 * @desc    Update patient contact information
 * @access  Private (Patient only)
 */
router.put('/profile', async (req, res, next) => {
  try {
    const { contactNumber, email, address, profilePic } = req.body;

    const patient = await Patient.findById(req.user.patient);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Clinical patient record not found.'
      });
    }

    if (contactNumber) patient.contactNumber = contactNumber;
    if (email) patient.email = email.toLowerCase();
    if (address) patient.address = address;
    if (profilePic !== undefined) patient.profilePic = profilePic;

    await patient.save();

    // Also update email in User record if changed
    if (email && email.toLowerCase() !== req.user.email) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.email = email.toLowerCase();
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: patient
    });
  } catch (error) {
    logger.error('Failed to update patient portal profile', { error: error.message });
    next(error);
  }
});

/**
 * @route   POST /api/patient-portal/chat
 * @desc    Chat with AI assistant using patient context
 * @access  Private (Patient only)
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { messages, userMessage } = req.body;
    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // 1. Fetch patient profile with clinical context
    const patient = await Patient.findById(req.user.patient);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Clinical patient record not found.' });
    }

    // 2. Fetch additional clinical context: recent vitals, lab orders, records, and prescriptions
    const standAloneVitals = await VitalSigns.find({ patientId: req.user.patient, isActive: true }).sort({ measurementDate: -1 }).limit(5);
    const labOrders = await LabOrder.find({ patient: req.user.patient }).sort({ orderDateTime: -1 }).limit(5);
    const medicalRecords = await MedicalRecord.find({ patient: req.user.patient, status: 'Finalized', isDeleted: false }).sort({ visitDate: -1 }).limit(5);
    
    const Prescription = require('../models/Prescription');
    const prescriptions = await Prescription.find({ patient: req.user.patient }).sort({ datePrescribed: -1 }).limit(5);

    // 3. Format clinical context for the AI prompt
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const age = patient.age || 'N/A';
    const gender = patient.gender || 'N/A';
    const bloodType = patient.bloodType || 'N/A';

    const allergiesStr = patient.allergies && patient.allergies.length > 0
      ? patient.allergies.map(a => `${a.allergen} (${a.reaction || 'unknown reaction'}, severity: ${a.severity || 'mild'})`).join(', ')
      : 'None reported';

    const historyStr = patient.medicalHistory && patient.medicalHistory.length > 0
      ? patient.medicalHistory.map(h => `${h.condition || h.diagnosis} (Notes: ${h.notes || 'none'})`).join(', ')
      : 'None reported';

    const recentVitalsStr = standAloneVitals.length > 0
      ? standAloneVitals.map(v => `${new Date(v.measurementDate).toLocaleDateString()}: BP ${v.systolic}/${v.diastolic || 'N/A'}, Pulse ${v.pulse || 'N/A'}, Temp ${v.temperature || 'N/A'}C, BloodSugar ${v.bloodSugar || 'N/A'}, SpO2 ${v.spo2 || 'N/A'}%`).join('\n')
      : patient.vitals && (patient.vitals.bloodPressure || patient.vitals.temperature)
        ? `Latest: BP ${patient.vitals.bloodPressure || 'N/A'}, HR ${patient.vitals.heartRate || 'N/A'}, Temp ${patient.vitals.temperature || 'N/A'}, BS ${patient.vitals.bloodSugar || 'N/A'}`
        : 'None recorded';

    const activeMedsStr = prescriptions.length > 0
      ? prescriptions.map(p => `- ${p.medicationName}: ${p.dosage || ''} ${p.frequency || ''} (Status: ${p.status}, Prescribed: ${new Date(p.datePrescribed).toLocaleDateString()})`).join('\n')
      : 'None recorded';

    const labResultsStr = labOrders.length > 0
      ? labOrders.map(l => `- Test: ${l.testName || (l.tests && l.tests.map(t => t.testName).join(', ')) || 'Lab Order'}, Status: ${l.status}, Date: ${new Date(l.orderDateTime).toLocaleDateString()}`).join('\n')
      : 'None ordered';

    const recentRecordsStr = medicalRecords.length > 0
      ? medicalRecords.map(r => `- Diagnosis: ${r.diagnosis || 'N/A'}, Doctor: ${r.doctorName || 'Consulting Doctor'}, Visit Date: ${new Date(r.visitDate).toLocaleDateString()}`).join('\n')
      : 'None recorded';

    // 4. Construct System Instruction / Prompt
    const systemPrompt = `You are "M-Bot", a friendly, supportive, and knowledgeable AI Health Assistant at New Life Clinic. 
You are chatting with a patient and answering their basic questions about their health, vitals, prescriptions, or clinical files.

Patient Profile & Clinical Context:
- Name: ${patientName}
- Age: ${age} years old
- Gender: ${gender}
- Blood Type: ${bloodType}
- Allergies: ${allergiesStr}
- Past Medical History: ${historyStr}
- Active Prescriptions / Medications:
${activeMedsStr}
- Recent Vital Signs:
${recentVitalsStr}
- Recent Lab Tests:
${labResultsStr}
- Recent Consultation/Medical Records:
${recentRecordsStr}

Guidelines:
1. Provide simple, clear, and reassuring answers. Avoid overly complex medical jargon, but be medically accurate.
2. Refer to the patient's actual medical details (like their vitals, medications, or allergies) to make the chat highly personalized and relevant. For example, if they ask about their medications, list what's active in their profile.
3. ALWAYS remind them that you are an AI assistant and that this is for informational purposes only. Include a disclaimer saying they should discuss any major symptoms or medication changes with their doctor at New Life Clinic.
4. If they describe severe, red-flag symptoms (e.g. crushing chest pain, difficulty breathing, sudden face drooping or limb weakness, severe bleeding, or sudden vision loss), urge them in clear, bold text to immediately seek emergency care or contact the clinic's emergency line.
5. Keep your responses relatively concise so they are easy to read in a chat window. Keep formatting clean with bullet points and bold text where appropriate. Do not output HTML. Use markdown format.`;

    // 5. Structure the history contents for Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    const isGeminiAvailable = geminiKey && geminiKey !== 'your_gemini_api_key_here';
    let replyText = '';
    let usedFallback = false;

    if (isGeminiAvailable) {
      try {
        const axiosModule = require('axios');
        const axios = axiosModule.default || axiosModule;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

        // Map history to Gemini format:
        // messages: [{ role: 'user' | 'model', content: string }]
        const contents = [];
        if (messages && Array.isArray(messages)) {
          messages.forEach(m => {
            contents.push({
              role: m.role === 'model' ? 'model' : 'user',
              parts: [{ text: m.content }]
            });
          });
        }

        // Append the new user message if not already included
        if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== userMessage) {
          contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
          });
        }

        // Call Gemini
        const payload = {
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1000
          }
        };

        const response = await axios.post(url, payload, { timeout: 25000 });
        replyText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I am unable to formulate a response at the moment. Please try again.';
        
        return res.json({
          success: true,
          data: {
            reply: replyText
          }
        });
      } catch (apiError) {
        console.warn('[Patient Portal Chat] Live Gemini API failed, using local fallback:', apiError.message);
        usedFallback = true;
      }
    } else {
      console.log('[Patient Portal Chat] Gemini API key not configured, using offline mode fallback.');
    }

    // Fallback block - runs if Gemini API failed OR if Gemini API key was not configured
    replyText = getLocalChatFallback(userMessage, {
      patientName,
      age,
      gender,
      bloodType,
      allergiesStr,
      historyStr,
      recentVitalsStr,
      activeMedsStr,
      labResultsStr,
      recentRecordsStr
    });
    
    const note = isGeminiAvailable && usedFallback
      ? '\n\n*(Note: Live AI service is temporarily rate-limited; this response was generated using your local clinic records fallback)*'
      : '\n\n*(Note: AI service is in offline mode; this response was generated using your local clinic records)*';

    res.json({
      success: true,
      data: {
        reply: replyText + note
      }
    });

  } catch (error) {
    console.error('Patient portal AI chat error:', error.message);
    res.status(500).json({ success: false, message: 'Server error occurred: ' + error.message });
  }
});

function getLocalChatFallback(query, context) {
  const q = (query || '').toLowerCase();
  
  // Check for emergency / red flag keywords first
  if (
    q.includes('chest pain') || q.includes('heart attack') || 
    q.includes('breathing') || q.includes('shortness of breath') || q.includes('dyspnea') ||
    q.includes('stroke') || q.includes('weakness') || q.includes('numbness') ||
    q.includes('suicid') || q.includes('kill myself') || q.includes('bleeding')
  ) {
    return `⚠️ **EMERGENCY WARNING** ⚠️\n\nBased on your symptoms, **please seek immediate medical attention or call emergency services right away!**\n\nIf you have crushing chest pain, difficulty breathing, sudden face drooping, or weakness on one side of your body, do not wait. Go to the nearest emergency room or contact New Life Clinic's emergency desk.`;
  }
  
  // 1. Medications
  if (q.includes('medication') || q.includes('medicine') || q.includes('pill') || q.includes('drug') || q.includes('prescrib')) {
    return `Hello ${context.patientName}. According to your medical file, here are your **Active Prescriptions / Medications**:\n\n${context.activeMedsStr}\n\n**General Precautions:**\n- Always follow the exact dosage and frequency prescribed by your doctor.\n- Do not stop taking any medication abruptly without consulting your physician first.\n- If you experience side effects (such as rashes, dizziness, or stomach pain), contact the clinic.`;
  }
  
  // 2. Vital signs
  if (q.includes('vital') || q.includes('bp') || q.includes('blood pressure') || q.includes('temp') || q.includes('temperature') || q.includes('pulse') || q.includes('heart rate')) {
    return `Hello ${context.patientName}. Here are your **Recent Vital Signs** on record:\n\n${context.recentVitalsStr}\n\n**General Information:**\n- Normal resting blood pressure for adults is generally under 120/80 mmHg.\n- Normal body temperature ranges from 36.5°C to 37.5°C.\n- A normal resting heart rate is between 60 and 100 beats per minute.`;
  }
  
  // 3. Allergies
  if (q.includes('allergy') || q.includes('allergic') || q.includes('reaction')) {
    return `Hello ${context.patientName}. Here are your **Allergies** on file:\n\n**Allergies:** ${context.allergiesStr}\n\n*Please ensure that our medical staff is aware of these allergies before any new treatment or medication is administered.*`;
  }
  
  // 4. Lab results
  if (q.includes('lab') || q.includes('test') || q.includes('result') || q.includes('blood test')) {
    return `Hello ${context.patientName}. Here are your **Recent Lab Orders** on file:\n\n${context.labResultsStr}\n\n*For finalized results, details, or normal ranges, please select the **Lab Results** tab on your dashboard or contact your ordering doctor.*`;
  }
  
  // 5. Medical History / Diagnosis
  if (q.includes('history') || q.includes('condition') || q.includes('diagnos') || q.includes('gout')) {
    return `Hello ${context.patientName}. Here is your clinical history profile:\n\n**Medical History / Diagnoses:**\n${context.historyStr}\n\n**Recent Medical Records:**\n${context.recentRecordsStr}\n\n*If you would like to know more details about a specific diagnosis, please consult your doctor during your next visit.*`;
  }
  
  // Default response
  return `Hello ${context.patientName}! I am M-Bot, your clinical AI assistant.\n\nI can help you understand your prescriptions, vital signs, lab orders, or medical records. \n\nBased on your clinical profile:\n- **Allergies:** ${context.allergiesStr}\n- **Active Medications:** ${context.activeMedsStr}\n\nWhat would you like to know more about? You can ask me questions like: "What medications am I taking?" or "What are my latest vitals?"`;
}

module.exports = router;
