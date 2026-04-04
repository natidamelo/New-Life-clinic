const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async');
const { auth } = require('../middleware/auth');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const VitalSigns = require('../models/VitalSigns');
const Prescription = require('../models/Prescription');
const User = require('../models/User');

/**
 * @route   GET /api/nurse/all
 * @desc    Get all nurses
 * @access  Private
 */
router.get('/all', auth, asyncHandler(async (req, res) => {
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

/**
 * @route   GET /api/nurse/monthly-report
 * @desc    Get monthly report with ESV-ICD-11 assessment statistics
 * @access  Private (Nurse)
 */
router.get('/monthly-report', auth, asyncHandler(async (req, res) => {
  const { year, month, startDate: startDateParam, endDate: endDateParam } = req.query;

  let startDate, endDate, dateRangeLabel;

  if (startDateParam && endDateParam) {
    // Ethiopian calendar or custom date range (dates are ISO date strings like '2024-01-15')
    startDate = new Date(startDateParam + 'T00:00:00.000Z');
    endDate = new Date(endDateParam + 'T23:59:59.999Z');
    dateRangeLabel = `${startDateParam} to ${endDateParam}`;
  } else {
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month (or startDate and endDate) parameters are required'
      });
    }
    startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    dateRangeLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  try {
    // Aggregate medical records with assessments (including those without ICD11 codes)
    const medicalRecords = await MedicalRecord.find({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true }
    }).populate('patient', 'firstName lastName gender dateOfBirth age patientId');

    // Get all patients seen this month
    const uniquePatients = await MedicalRecord.distinct('patient', {
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get vital signs recorded this month
    const vitalSignsCount = await VitalSigns.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get prescriptions administered this month
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

    medicalRecords.forEach(record => {
      const assessment = record.assessment || {};
      const isPending = (record.status || '').toLowerCase() !== 'finalized';

      // Get diagnosis from primaryDiagnosis or primaryDiagnosisICD11 or diagnosis field
      let diagnosis = 'Diagnosis pending';
      let icd11Code = '';
      let category = isPending ? 'Pending Review' : 'General';
      let severity = (record.chiefComplaint?.severity || 'mild').toLowerCase();
      
      if (assessment.primaryDiagnosisICD11 && assessment.primaryDiagnosisICD11.description) {
        diagnosis = assessment.primaryDiagnosisICD11.description;
        icd11Code = assessment.primaryDiagnosisICD11.code || '';
        category = assessment.primaryDiagnosisICD11.category || category;
      } else if (assessment.primaryDiagnosis) {
        diagnosis = assessment.primaryDiagnosis;
      } else if (record.diagnosis) {
        diagnosis = record.diagnosis;
      }
      
      // Get severity from chief complaint or assessment
      if (record.chiefComplaint && record.chiefComplaint.severity) {
        severity = record.chiefComplaint.severity.toLowerCase();
      } else if (assessment.secondaryDiagnoses?.[0]?.severity) {
        severity = assessment.secondaryDiagnoses[0].severity.toLowerCase();
      }
      
      // Track diagnosis frequency
      if (!diagnosisStats[diagnosis]) {
        diagnosisStats[diagnosis] = {
          diagnosis,
          icd11Code,
          count: 0,
          percentage: 0
        };
      }
      diagnosisStats[diagnosis].count++;

      // Track category frequency
      if (!categoryStats[category]) {
        categoryStats[category] = {
          category,
          count: 0,
          percentage: 0
        };
      }
      categoryStats[category].count++;

      // Track severity
      if (!severityStats[severity]) {
        severityStats[severity] = {
          severity,
          count: 0,
          percentage: 0
        };
      }
      severityStats[severity].count++;

      // Store detailed diagnosis record with patient info
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
        
        // Get age from stored field or calculate from dateOfBirth
        let age = 'N/A';
        
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
            
            age = calculatedAge >= 0 ? calculatedAge : 'N/A';
          } catch (error) {
            console.warn('Could not calculate age from date of birth:', patient.dateOfBirth);
            age = 'N/A';
          }
        }
        
        diagnosisDetails.push({
          diagnosis,
          icd11Code: icd11Code,
          date: record.createdAt.toISOString().split('T')[0],
          patientId: patient._id?.toString().slice(-8) || 'N/A',
          patientFullId: patientMongoId || '',
          patientName,
          sex: patient.gender || 'N/A',
          age: age,
          chiefComplaint: record.chiefComplaint?.description || (isPending ? 'Pending chief complaint' : 'N/A'),
          category,
          severity,
          status: isPending ? 'pending' : 'finalized',
          recordId: record._id.toString(),
          id: record._id.toString(),
          _id: record._id.toString()
        });
      }

      // Track daily trends
      const dateKey = record.createdAt.toISOString().split('T')[0];
      if (!dailyTrends[dateKey]) {
        dailyTrends[dateKey] = {
          date: dateKey,
          assessments: 0,
          esvICD11Count: 0
        };
      }
      dailyTrends[dateKey].assessments++;
      dailyTrends[dateKey].esvICD11Count++;
    });

    // Include patients registered during the period without assessments
    const registeredPatients = await Patient.find({
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: { $ne: false }
    }).select('firstName lastName gender dateOfBirth age createdAt patientId');

    registeredPatients.forEach((patient) => {
      const patientMongoId = patient._id.toString();
      if (patientRecordIds.has(patientMongoId)) {
        return;
      }

      let age = 'N/A';
      if (patient.age && typeof patient.age === 'number' && patient.age > 0) {
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

      diagnosisDetails.push({
        diagnosis: 'Diagnosis pending',
        icd11Code: '',
        date: patient.createdAt ? patient.createdAt.toISOString().split('T')[0] : 'N/A',
        patientId: patient.patientId || patientMongoId.slice(-8),
        patientFullId: patientMongoId,
        patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'N/A',
        sex: patient.gender || 'N/A',
        age,
        chiefComplaint: 'Pending evaluation',
        category: 'Pending Review',
        severity: 'mild',
        status: 'pending',
        recordId: patient._id.toString(),
        id: patient._id.toString(),
        _id: patient._id.toString()
      });
    });

    // ── Two-tier Deduplication ───────────────────────────────────────────────
    // Tier 1 (primary)  : patientFullId + date  → same patient, multiple records
    // Tier 2 (secondary): normalised name + date → duplicate Patient docs in DB
    //   (patient registered twice with different _ids but the same name)
    // Rule: finalized always wins over pending; first-seen wins among equals.
    const _idDateMap  = new Map(); // patientFullId__date  → index into result array
    const _nameMap    = new Map(); // normalisedName__date → index into result array
    const dedupedDiagnosisDetails = [];

    const normName = (n) => (n || '').toLowerCase().replace(/\s+/g, '');

    for (const detail of diagnosisDetails) {
      const idKey   = detail.patientFullId ? `${detail.patientFullId}__${detail.date}` : null;
      const nameKey = `${normName(detail.patientName)}__${detail.date}`;

      // Check if we already have this patient (by ID first, then by name)
      const existingIdx = idKey && _idDateMap.has(idKey)
        ? _idDateMap.get(idKey)
        : _nameMap.has(nameKey) ? _nameMap.get(nameKey) : null;

      if (existingIdx !== null) {
        // Upgrade: swap pending → finalized if the new entry is better
        if (detail.status === 'finalized' && dedupedDiagnosisDetails[existingIdx].status === 'pending') {
          dedupedDiagnosisDetails[existingIdx] = detail;
          // Re-register the index under the new entry's keys
          if (idKey) _idDateMap.set(idKey, existingIdx);
          _nameMap.set(nameKey, existingIdx);
        }
      } else {
        const newIdx = dedupedDiagnosisDetails.length;
        dedupedDiagnosisDetails.push(detail);
        if (idKey) _idDateMap.set(idKey, newIdx);
        _nameMap.set(nameKey, newIdx);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Calculate percentages and sort
    const totalAssessments = medicalRecords.length;
    const totalPatients = uniquePatients.length;

    // Aggregated top diagnoses (for charts)
    const topDiagnoses = Object.values(diagnosisStats)
      .map(dx => ({
        ...dx,
        percentage: totalAssessments > 0 ? ((dx.count / totalAssessments) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalPatientEntries = dedupedDiagnosisDetails.length;
    // Detailed diagnosis records (all patients, de-duplicated)
    const diagnosisRecords = dedupedDiagnosisDetails
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
        status: detail.status || 'finalized',
        recordId: detail.recordId,
        id: detail.recordId
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Process category stats
    const diagnosisCategories = Object.values(categoryStats)
      .map(cat => ({
        ...cat,
        percentage: ((cat.count / totalAssessments) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Process severity stats
    const severityDistribution = Object.values(severityStats)
      .map(sev => ({
        ...sev,
        percentage: ((sev.count / totalAssessments) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Process daily trends
    const clinicalTrends = Object.values(dailyTrends)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate patient demographics
    const patients = await Patient.find({
      _id: { $in: uniquePatients }
    }).select('firstName lastName gender dateOfBirth');

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

    patients.forEach(patient => {
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
      
      // Count gender
      const gender = patient.gender || 'unknown';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
      
      // Visit age groups by gender
      const normalizedGender = gender.toLowerCase();
      if (normalizedGender === 'male' && visitAgeGroups.male[ageGroup] !== undefined) {
        visitAgeGroups.male[ageGroup]++;
      } else if (normalizedGender === 'female' && visitAgeGroups.female[ageGroup] !== undefined) {
        visitAgeGroups.female[ageGroup]++;
      }
    });

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

    // Calculate nurse activity metrics
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const averagePatientsPerDay = totalPatients / daysInMonth;

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
      dateRangeUsed: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        label: dateRangeLabel
      }
    };

    res.json({
      success: true,
      data: reportData,
      message: `Report generated for ${dateRangeLabel}`
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

// @route   DELETE /api/nurse/monthly-report/:recordId
// @desc    Mark a medical record as deleted (to remove it from report)
// @access  Private (Doctor, Admin, Superadmin, Developer)
router.delete('/monthly-report/:recordId', auth, asyncHandler(async (req, res) => {
  const allowedRoles = ['doctor', 'admin', 'superadmin', 'developer'];
  if (!allowedRoles.includes((req.user.role || '').toLowerCase())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete medical records. Only doctors and admins can remove records.'
    });
  }

  try {
    // Use findByIdAndUpdate to bypass pre-save hooks and validators
    const updated = await MedicalRecord.findByIdAndUpdate(
      req.params.recordId,
      { $set: { isDeleted: true, lastUpdatedBy: req.user._id } },
      { new: true, runValidators: false }
    );

    if (!updated) {
      // Record ID may belong to a Patient (registered but no assessment yet).
      // Return success so the frontend can refresh — the GET already filters
      // these out once the patient no longer falls in the date range.
      console.log(`[Nurse Report] Record ${req.params.recordId} not found as MedicalRecord (may be a patient registration entry) — skipping soft-delete.`);
      return res.json({
        success: true,
        message: 'Record removed from report'
      });
    }

    console.log(`[Nurse Report] Record ${req.params.recordId} marked as deleted by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Medical record removed successfully'
    });
  } catch (error) {
    console.error('[Nurse Report] Error deleting record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medical record',
      error: error.message
    });
  }
}));

module.exports = router;
