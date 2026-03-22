const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const VitalSigns = require('../models/VitalSigns');
const Prescription = require('../models/Prescription');
const asyncHandler = require('../middleware/async');

// @route   GET /api/nurse/all
// @desc    Get all nurses
// @access  Public
router.get('/all', asyncHandler(async (req, res) => {
  try {
    const nurses = await User.find({ 
      role: 'nurse', 
      isActive: true 
    }).select('firstName lastName email username role specialization');
    
    const formattedNurses = nurses.map(nurse => ({
      id: nurse._id,
      firstName: nurse.firstName || '',
      lastName: nurse.lastName || '',
      role: nurse.role,
      specialization: nurse.specialization || '',
      email: nurse.email,
      username: nurse.username,
      name: `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim()
    }));
    
    console.log(`[/api/nurse/all] Found ${formattedNurses.length} nurses`);
    
    res.json(formattedNurses);
  } catch (error) {
    console.error('[/api/nurse/all] Error fetching nurses:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch nurses', 
      error: error.message 
    });
  }
}));

// @route   GET /api/nurse/monthly-report
// @desc    Get monthly report with ESV-ICD-11 assessment statistics
// @access  Private (Nurse)
router.get('/monthly-report', auth, asyncHandler(async (req, res) => {
  const { year, month, startDate: startDateParam, endDate: endDateParam } = req.query;

  const isISODateOnly = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

  let startDate;
  let endDate;
  let startStr;
  let endStr;
  let rangeLabel;

  // Support either:
  // - year/month (Gregorian month), OR
  // - explicit date range (YYYY-MM-DD to YYYY-MM-DD), used for Ethiopian-month mapping on frontend
  if (startDateParam || endDateParam) {
    if (!startDateParam || !endDateParam) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required when using a date range'
      });
    }
    if (!isISODateOnly(startDateParam) || !isISODateOnly(endDateParam)) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate must be in YYYY-MM-DD format'
      });
    }

    startDate = new Date(`${startDateParam}T00:00:00.000Z`);
    endDate = new Date(`${endDateParam}T23:59:59.999Z`);
    startStr = startDateParam;
    endStr = endDateParam;
    rangeLabel = `${startStr} to ${endStr} (custom range, UTC)`;

    console.log(`[Monthly Report] Custom date range filter: ${startStr} to ${endStr} (UTC)`);
  } else {
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month parameters are required'
      });
    }

    // Exact month range in UTC so "March 2026" is strictly 2026-03-01 00:00:00.000Z to 2026-03-31 23:59:59.999Z
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    startStr = startDate.toISOString().split('T')[0];
    endStr = endDate.toISOString().split('T')[0];
    rangeLabel = `${startStr} to ${endStr} (exact month, UTC)`;

    console.log(`[Monthly Report] Exact month filter: ${startStr} to ${endStr} (UTC), year=${y}, month=${m}`);
  }

  try {
    // Date filter:
    // Use the real date from medical records.
    // Many records have a stale/default `visitDate` (e.g. all in March),
    // while `createdAt` reflects the true time the record was entered.
    // Recovered/imported records may also carry the true date in `metadata.createdDate` / `metadata.finalizedDate` (YYYY-MM-DD).
    // Include a record when ANY of these falls in range,
    // and when producing the report date pick whichever falls inside the range.
    const recordDateFilter = {
      $or: [
        { visitDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
        { 'metadata.createdDate': { $gte: startStr, $lte: endStr } },
        { 'metadata.finalizedDate': { $gte: startStr, $lte: endStr } }
      ]
    };
    const medicalRecords = await MedicalRecord.find({
      ...recordDateFilter,
      isDeleted: { $ne: true }
    }).populate('patient', 'firstName lastName gender dateOfBirth age');

    // Get all patients seen this month (same date filter)
    const uniquePatients = await MedicalRecord.distinct('patient', recordDateFilter);

    // Vital signs and prescriptions: use same exact month (by createdAt in UTC)
    const vitalSignsCount = await VitalSigns.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const prescriptionsCount = await Prescription.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'administered'
    });

    // Process ESV-ICD-11 data
    const diagnosisStats = {};
    const categoryStats = {};
    const severityStats = {};
    const dailyTrends = {};
    const diagnosisDetails = []; // Store detailed diagnosis records
    const patientRecordIds = new Set();

    const pickRecordDateInRange = (record) => {
      const md = record && typeof record === 'object' ? record.metadata : null;
      const mdCreated = md && typeof md.createdDate === 'string' ? md.createdDate.split('T')[0] : null;
      const mdFinalized = md && typeof md.finalizedDate === 'string' ? md.finalizedDate.split('T')[0] : null;
      const mdCreatedInRange = mdCreated && mdCreated >= startStr && mdCreated <= endStr;
      const mdFinalizedInRange = mdFinalized && mdFinalized >= startStr && mdFinalized <= endStr;
      if (mdFinalizedInRange) return new Date(`${mdFinalized}T00:00:00.000Z`);
      if (mdCreatedInRange) return new Date(`${mdCreated}T00:00:00.000Z`);

      const v = record.visitDate instanceof Date ? record.visitDate : null;
      const c = record.createdAt instanceof Date ? record.createdAt : null;
      const vInRange = v && v >= startDate && v <= endDate;
      const cInRange = c && c >= startDate && c <= endDate;
      if (vInRange) return v;
      if (cInRange) return c;
      // Fallback order: metadata date (even if outside range) -> createdAt -> visitDate
      if (mdFinalized) return new Date(`${mdFinalized}T00:00:00.000Z`);
      if (mdCreated) return new Date(`${mdCreated}T00:00:00.000Z`);
      return c || v || new Date(0);
    };

    for (const record of medicalRecords) {
      const assessment = record.assessment || {};
      const isPending = (record.status || '').toLowerCase() !== 'finalized';

      // Determine diagnosis metadata
      let diagnosis = 'Pending';
      let code = '';
      let category = isPending ? 'Pending Review' : 'General';
      let severity = (record.chiefComplaint?.severity || 'mild').toLowerCase();

      if (assessment.primaryDiagnosisICD11?.description) {
        diagnosis = assessment.primaryDiagnosisICD11.description;
        code = assessment.primaryDiagnosisICD11.code || '';
        category = assessment.primaryDiagnosisICD11.category || category;
      } else if (assessment.primaryDiagnosis) {
        diagnosis = assessment.primaryDiagnosis;
      } else if (record.diagnosis) {
        diagnosis = record.diagnosis;
      }

      if (record.chiefComplaint?.severity) {
        severity = record.chiefComplaint.severity.toLowerCase();
      } else if (assessment.severity) {
        severity = assessment.severity.toLowerCase();
      }

      diagnosisStats[diagnosis] = diagnosisStats[diagnosis] || { count: 0, code, category };
      diagnosisStats[diagnosis].count++;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      severityStats[severity] = (severityStats[severity] || 0) + 1;

      if (record.patient) {
        const patient = record.patient;
        const patientMongoId = patient._id?.toString();
        if (patientMongoId) {
          patientRecordIds.add(patientMongoId);
        }
        const patientName =
          [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
          patient.fullName ||
          patient.name ||
          'N/A';

        let age = 'N/A';
        if (typeof patient.age === 'number' && patient.age > 0) {
          age = patient.age;
        } else if (patient.dateOfBirth) {
          try {
            const birthDate = new Date(patient.dateOfBirth);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            age = calculatedAge >= 0 ? calculatedAge : 'N/A';
          } catch (error) {
            console.warn('Could not calculate age from date of birth:', patient.dateOfBirth);
            age = 'N/A';
          }
        }

        const recordDate = pickRecordDateInRange(record);
        diagnosisDetails.push({
          diagnosis,
          icd11Code: code,
          date: recordDate.toISOString().split('T')[0],
          patientId: patient._id?.toString().slice(-8) || 'N/A',
          patientName,
          sex: patient.gender || 'N/A',
          age,
          chiefComplaint: (!record.chiefComplaint || !record.chiefComplaint.description || isPending) ? 'Pending' : record.chiefComplaint.description,
          category,
          severity,
          status: isPending ? 'pending' : 'finalized'
        });
      }

      const recordDate = pickRecordDateInRange(record);
      const dateKey = recordDate.toISOString().split('T')[0];
      dailyTrends[dateKey] = dailyTrends[dateKey] || { assessments: 0, esvICD11Count: 0 };
      dailyTrends[dateKey].assessments++;
      dailyTrends[dateKey].esvICD11Count++;
    }

    // IMPORTANT: Do not inject "registered/recovered patients without medical records" into this report.
    // When patients are recovered/imported, `updatedAt/lastUpdated` often becomes the recovery time (e.g. March),
    // which pollutes the weekly/monthly report dates. This report should reflect ONLY real medical records.

    // Keep only entries whose date falls in the exact month (fixes March/other months appearing when February is selected)
    const diagnosisDetailsInMonth = diagnosisDetails.filter(d => {
      const dDate = d.date && d.date.split('T')[0];
      return dDate && dDate >= startStr && dDate <= endStr;
    });

    // Process statistics (counts stay from queries; table and sorted list use filtered details)
    const totalPatients = uniquePatients.length;
    const totalAssessments = medicalRecords.length;

    // Aggregated top diagnoses for charts
    const topDiagnoses = Object.entries(diagnosisStats)
      .map(([diagnosis, data]) => ({
        diagnosis,
        icd11Code: data.code,
        count: data.count,
        percentage: totalAssessments > 0 ? ((data.count / totalAssessments) * 100) : 0,
        category: data.category
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Detailed diagnosis records (only entries with date in the exact month)
    const totalPatientEntries = diagnosisDetailsInMonth.length;
    const diagnosisRecords = diagnosisDetailsInMonth
      .map(detail => ({
        diagnosis: detail.diagnosis,
        icd11Code: detail.icd11Code,
        count: 1,
        percentage: totalPatientEntries > 0 ? ((1 / totalPatientEntries) * 100) : 0,
        date: detail.date,
        patientId: detail.patientId,
        patientName: detail.patientName,
        sex: detail.sex,
        age: detail.age,
        chiefComplaint: detail.chiefComplaint,
        status: detail.status || 'finalized'
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Diagnosis categories
    const diagnosisCategories = Object.entries(categoryStats)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalAssessments > 0 ? ((count / totalAssessments) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Clinical trends
    const clinicalTrends = Object.entries(dailyTrends)
      .map(([date, data]) => ({
        date,
        assessments: data.assessments,
        esvICD11Count: data.esvICD11Count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Severity distribution
    const severityDistribution = Object.entries(severityStats)
      .map(([severity, count]) => ({
        severity,
        count,
        percentage: totalAssessments > 0 ? ((count / totalAssessments) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Patient demographics analysis
    const ageGroups = {};
    const genderDistribution = {};
    const visitAgeGroups = {
      male: {
        '<5 years': 0,
        '5-10 years': 0,
        '11-19 years': 0,
        '20-29 years': 0,
        '30-45 years': 0,
        '45-65 years': 0,
        '>66 years': 0
      },
      female: {
        '<5 years': 0,
        '5-10 years': 0,
        '11-19 years': 0,
        '20-29 years': 0,
        '30-45 years': 0,
        '45-65 years': 0,
        '>66 years': 0
      }
    };
    const combinedDemographics = [];
    
    await Promise.all(uniquePatients.map(async (patientId) => {
      const patient = await Patient.findById(patientId);
      if (patient) {
        // Get age from stored field or calculate from dateOfBirth
        let age = 0;
        
        // First try to use the stored age field
        if (patient.age && typeof patient.age === 'number' && patient.age > 0) {
          age = patient.age;
        }
        // If no stored age, try to calculate from dateOfBirth
        else if (patient.dateOfBirth) {
          try {
            const birthDate = new Date(patient.dateOfBirth);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            // Adjust age if birth month/day hasn't occurred yet this year
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            
            age = calculatedAge >= 0 ? calculatedAge : 0;
          } catch (error) {
            console.warn('Could not calculate age from date of birth:', patient.dateOfBirth);
            age = 0;
          }
        }
        
        let ageGroup = 'Unknown';
        if (age < 5) ageGroup = '<5 years';
        else if (age < 11) ageGroup = '5-10 years';
        else if (age < 20) ageGroup = '11-19 years';
        else if (age < 30) ageGroup = '20-29 years';
        else if (age < 46) ageGroup = '30-45 years';
        else if (age < 66) ageGroup = '45-65 years';
        else ageGroup = '>66 years';
        
        ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
        
        // Gender distribution
        const gender = patient.gender || 'unknown';
        genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
        
        // Visit age groups by gender
        const normalizedGender = gender.toLowerCase();
        if (normalizedGender === 'male' && visitAgeGroups.male[ageGroup] !== undefined) {
          visitAgeGroups.male[ageGroup]++;
        } else if (normalizedGender === 'female' && visitAgeGroups.female[ageGroup] !== undefined) {
          visitAgeGroups.female[ageGroup]++;
        }
      }
    }));

    // Create combined demographics
    Object.entries(visitAgeGroups.male).forEach(([ageGroup, count]) => {
      if (count > 0) {
        combinedDemographics.push({
          gender: 'Male',
          ageGroup,
          count,
          percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
        });
      }
    });
    
    Object.entries(visitAgeGroups.female).forEach(([ageGroup, count]) => {
      if (count > 0) {
        combinedDemographics.push({
          gender: 'Female',
          ageGroup,
          count,
          percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
        });
      }
    });

    // Convert demographics to arrays with percentages
    const patientDemographics = {
      ageGroups: Object.entries(ageGroups).map(([group, count]) => ({
        group,
        count,
        percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
      })),
      genderDistribution: Object.entries(genderDistribution).map(([gender, count]) => ({
        gender,
        count,
        percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
      })),
      combinedDemographics,
      visitAgeGroups
    };

    // Calculate nurse activity metrics (based on the actual selected range)
    const daysInRange = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );
    const averagePatientsPerDay = totalPatients / daysInRange;

    const nurseActivity = {
      totalVitalsRecorded: vitalSignsCount,
      totalMedicationsAdministered: prescriptionsCount,
      totalProcedures: 0, // This would need to be implemented based on your procedures model
      averagePatientsPerDay: Math.round(averagePatientsPerDay * 10) / 10
    };

    const reportData = {
      totalPatients,
      totalAssessments,
      esvICD11Assessments: totalAssessments,
      topDiagnoses,
      diagnosisCategories,
      patientDemographics,
      diagnosisRecords,
      clinicalTrends,
      severityDistribution,
      nurseActivity,
      dateRangeUsed: { start: startStr, end: endStr, label: rangeLabel }
    };

    res.json({
      success: true,
      data: reportData,
      message: `Monthly report generated for ${startStr} to ${endStr}`
    });

  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating monthly report',
      error: error.message
    });
  }
}));

// @route   GET /api/nurse/weekly-report
// @desc    Get weekly report with ESV-ICD-11 assessment statistics
// @access  Private (Nurse)
router.get('/weekly-report', auth, asyncHandler(async (req, res) => {
  const { year, month, day } = req.query;
  
  if (!year || !month || !day) {
    return res.status(400).json({
      success: false,
      message: 'Year, month, and day parameters are required'
    });
  }

  // Exact week range in UTC: 7 days starting from the given day
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const startDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  endDate.setUTCHours(23, 59, 59, 999);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  console.log(`[Weekly Report] Exact week filter: ${startStr} to ${endStr} (UTC)`);

  try {
    // Use the real date from medical records (same approach as monthly report).
    const recordDateFilter = {
      $or: [
        { visitDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
        { 'metadata.createdDate': { $gte: startStr, $lte: endStr } },
        { 'metadata.finalizedDate': { $gte: startStr, $lte: endStr } }
      ]
    };
    const medicalRecords = await MedicalRecord.find({
      ...recordDateFilter,
      isDeleted: { $ne: true }
    }).populate('patient', 'firstName lastName gender dateOfBirth age');

    const uniquePatients = await MedicalRecord.distinct('patient', recordDateFilter);

    const vitalSignsCount = await VitalSigns.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const prescriptionsCount = await Prescription.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'administered'
    });

    // Process the same statistics as monthly report
    const diagnosisStats = {};
    const categoryStats = {};
    const severityStats = {};
    const dailyTrends = {};
    const diagnosisDetails = []; // Store detailed diagnosis records
    const patientRecordIds = new Set();

    const pickRecordDateInRange = (record) => {
      const md = record && typeof record === 'object' ? record.metadata : null;
      const mdCreated = md && typeof md.createdDate === 'string' ? md.createdDate.split('T')[0] : null;
      const mdFinalized = md && typeof md.finalizedDate === 'string' ? md.finalizedDate.split('T')[0] : null;
      const mdCreatedInRange = mdCreated && mdCreated >= startStr && mdCreated <= endStr;
      const mdFinalizedInRange = mdFinalized && mdFinalized >= startStr && mdFinalized <= endStr;
      if (mdFinalizedInRange) return new Date(`${mdFinalized}T00:00:00.000Z`);
      if (mdCreatedInRange) return new Date(`${mdCreated}T00:00:00.000Z`);

      const v = record.visitDate instanceof Date ? record.visitDate : null;
      const c = record.createdAt instanceof Date ? record.createdAt : null;
      const vInRange = v && v >= startDate && v <= endDate;
      const cInRange = c && c >= startDate && c <= endDate;
      if (vInRange) return v;
      if (cInRange) return c;
      if (mdFinalized) return new Date(`${mdFinalized}T00:00:00.000Z`);
      if (mdCreated) return new Date(`${mdCreated}T00:00:00.000Z`);
      return c || v || new Date(0);
    };

    for (const record of medicalRecords) {
      const assessment = record.assessment || {};
      const isPending = (record.status || '').toLowerCase() !== 'finalized';

      let diagnosis = 'Pending';
      let code = '';
      let category = isPending ? 'Pending Review' : 'General';
      let severity = (record.chiefComplaint?.severity || 'mild').toLowerCase();

      if (assessment.primaryDiagnosisICD11?.description) {
        diagnosis = assessment.primaryDiagnosisICD11.description;
        code = assessment.primaryDiagnosisICD11.code || '';
        category = assessment.primaryDiagnosisICD11.category || category;
      } else if (assessment.primaryDiagnosis) {
        diagnosis = assessment.primaryDiagnosis;
      } else if (record.diagnosis) {
        diagnosis = record.diagnosis;
      }

      if (record.chiefComplaint?.severity) {
        severity = record.chiefComplaint.severity.toLowerCase();
      } else if (assessment.secondaryDiagnoses?.[0]?.severity) {
        severity = assessment.secondaryDiagnoses[0].severity.toLowerCase();
      }

      diagnosisStats[diagnosis] = diagnosisStats[diagnosis] || { count: 0, code, category };
      diagnosisStats[diagnosis].count++;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      severityStats[severity] = (severityStats[severity] || 0) + 1;

      if (record.patient) {
        const patient = record.patient;
        const patientMongoId = patient._id?.toString();
        if (patientMongoId) {
          patientRecordIds.add(patientMongoId);
        }
        const patientName =
          [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
          patient.fullName ||
          patient.name ||
          'N/A';

        let age = 'N/A';
        if (typeof patient.age === 'number' && patient.age > 0) {
          age = patient.age;
        } else if (patient.dateOfBirth) {
          try {
            const birthDate = new Date(patient.dateOfBirth);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            age = calculatedAge >= 0 ? calculatedAge : 'N/A';
          } catch (error) {
            console.warn('Could not calculate age from date of birth:', patient.dateOfBirth);
            age = 'N/A';
          }
        }

        const recordDate = pickRecordDateInRange(record);
        diagnosisDetails.push({
          diagnosis,
          icd11Code: code,
          date: recordDate.toISOString().split('T')[0],
          patientId: patient._id?.toString().slice(-8) || 'N/A',
          patientName,
          sex: patient.gender || 'N/A',
          age,
          chiefComplaint: (!record.chiefComplaint || !record.chiefComplaint.description || isPending) ? 'Pending' : record.chiefComplaint.description,
          category,
          severity,
          status: isPending ? 'pending' : 'finalized'
        });
      }

      const recordDate = pickRecordDateInRange(record);
      const dateKey = recordDate.toISOString().split('T')[0];
      dailyTrends[dateKey] = dailyTrends[dateKey] || { assessments: 0, esvICD11Count: 0 };
      dailyTrends[dateKey].assessments++;
      dailyTrends[dateKey].esvICD11Count++;
    }

    const totalPatients = uniquePatients.length;
    const totalAssessments = medicalRecords.length;

    // IMPORTANT: Do not inject "registered/recovered patients without medical records" into this report.
    // This weekly report should reflect ONLY real medical records in the selected week.

    // Keep only entries whose date falls in the exact week (applied after registered patients are added)
    const diagnosisDetailsInWeek = diagnosisDetails.filter(d => {
      const dDate = d.date && d.date.split('T')[0];
      return dDate && dDate >= startStr && dDate <= endStr;
    });

    // Same data processing as monthly report
    const topDiagnoses = Object.entries(diagnosisStats)
      .map(([diagnosis, data]) => ({
        diagnosis,
        icd11Code: data.code,
        count: data.count,
        percentage: totalAssessments > 0 ? ((data.count / totalAssessments) * 100) : 0,
        category: data.category
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalPatientEntries = diagnosisDetailsInWeek.length;
    const diagnosisRecords = diagnosisDetailsInWeek
      .map(detail => ({
        diagnosis: detail.diagnosis,
        icd11Code: detail.icd11Code,
        count: 1,
        percentage: totalPatientEntries > 0 ? ((1 / totalPatientEntries) * 100) : 0,
        date: detail.date,
        patientId: detail.patientId,
        patientName: detail.patientName,
        sex: detail.sex,
        age: detail.age,
        chiefComplaint: detail.chiefComplaint,
        status: detail.status || 'finalized'
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const diagnosisCategories = Object.entries(categoryStats)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalAssessments > 0 ? ((count / (totalAssessments || 1)) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const clinicalTrends = Object.entries(dailyTrends)
      .map(([date, data]) => ({
        date,
        assessments: data.assessments,
        esvICD11Count: data.esvICD11Count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const severityDistribution = Object.entries(severityStats)
      .map(([severity, count]) => ({
        severity,
        count,
        percentage: totalAssessments > 0 ? ((count / (totalAssessments || 1)) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Patient demographics for the week
    const ageGroups = {};
    const genderDistribution = {};
    const visitAgeGroups = {
      male: {
        '<5 years': 0, '5-10 years': 0, '11-19 years': 0, '20-29 years': 0,
        '30-45 years': 0, '45-65 years': 0, '>66 years': 0
      },
      female: {
        '<5 years': 0, '5-10 years': 0, '11-19 years': 0, '20-29 years': 0,
        '30-45 years': 0, '45-65 years': 0, '>66 years': 0
      }
    };
    const combinedDemographics = [];
    
    await Promise.all(uniquePatients.map(async (patientId) => {
      const patient = await Patient.findById(patientId);
      if (patient) {
        // Get age from stored field or calculate from dateOfBirth
        let age = 0;
        
        // First try to use the stored age field
        if (patient.age && typeof patient.age === 'number' && patient.age > 0) {
          age = patient.age;
        }
        // If no stored age, try to calculate from dateOfBirth
        else if (patient.dateOfBirth) {
          try {
            const birthDate = new Date(patient.dateOfBirth);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            // Adjust age if birth month/day hasn't occurred yet this year
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            
            age = calculatedAge >= 0 ? calculatedAge : 0;
          } catch (error) {
            console.warn('Could not calculate age from date of birth:', patient.dateOfBirth);
            age = 0;
          }
        }
        
        let ageGroup = 'Unknown';
        if (age < 5) ageGroup = '<5 years';
        else if (age < 11) ageGroup = '5-10 years';
        else if (age < 20) ageGroup = '11-19 years';
        else if (age < 30) ageGroup = '20-29 years';
        else if (age < 46) ageGroup = '30-45 years';
        else if (age < 66) ageGroup = '45-65 years';
        else ageGroup = '>66 years';
        
        ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
        const gender = patient.gender || 'unknown';
        genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;

        const normalizedGender = gender.toLowerCase();
        if (normalizedGender === 'male' && visitAgeGroups.male[ageGroup] !== undefined) {
          visitAgeGroups.male[ageGroup]++;
        } else if (normalizedGender === 'female' && visitAgeGroups.female[ageGroup] !== undefined) {
          visitAgeGroups.female[ageGroup]++;
        }
      }
    }));

    // Generate combined demographics
    Object.entries(visitAgeGroups.male).forEach(([ageGroup, count]) => {
      if (count > 0) {
        combinedDemographics.push({
          gender: 'Male',
          ageGroup,
          count,
          percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
        });
      }
    });

    Object.entries(visitAgeGroups.female).forEach(([ageGroup, count]) => {
      if (count > 0) {
        combinedDemographics.push({
          gender: 'Female',
          ageGroup,
          count,
          percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
        });
      }
    });

    const patientDemographics = {
      ageGroups: Object.entries(ageGroups).map(([group, count]) => ({
        group,
        count,
        percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
      })),
      genderDistribution: Object.entries(genderDistribution).map(([gender, count]) => ({
        gender,
        count,
        percentage: totalPatients > 0 ? ((count / totalPatients) * 100) : 0
      })),
      combinedDemographics,
      visitAgeGroups
    };

    // Weekly activity metrics (7 days)
    const averagePatientsPerDay = totalPatients / 7;

    const nurseActivity = {
      totalVitalsRecorded: vitalSignsCount,
      totalMedicationsAdministered: prescriptionsCount,
      totalProcedures: 0,
      averagePatientsPerDay: Math.round(averagePatientsPerDay * 10) / 10
    };

    const reportData = {
      totalPatients,
      totalAssessments,
      esvICD11Assessments: totalAssessments,
      topDiagnoses,
      diagnosisCategories,
      patientDemographics,
      diagnosisRecords,
      clinicalTrends,
      severityDistribution,
      nurseActivity,
      dateRangeUsed: { start: startStr, end: endStr, label: `${startStr} to ${endStr} (exact week, UTC)` }
    };

    res.json({
      success: true,
      data: reportData,
      message: `Weekly report generated for week starting ${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    });

  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating weekly report',
      error: error.message
    });
  }
}));

// @route   GET /api/nurseRoutes
// @desc    Get all nurseRoutes
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'nurseRoutes endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching nurseRoutes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/nurseRoutes
// @desc    Create new nurseRoutes
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'nurseRoutes created successfully'
    });
  } catch (error) {
    console.error('Error creating nurseRoutes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
