const MedicalRecord = require('../models/MedicalRecord');
const { logger } = require('../middleware/errorHandler');

/**
 * Disease mapping service for Weekly Diseases Report
 * Maps assessment diagnoses to report indicators
 */

// Disease mapping configuration
const DISEASE_MAPPINGS = {
  // Weekly Indicators
  weeklyIndicators: {
    // Malaria indicators
    'malaria': 'totalMalariaCases',
    'malaria fever': 'totalMalariaCases',
    'malaria case': 'totalMalariaCases',
    'malarial': 'totalMalariaCases',
    'p. falciparum': 'malariaPositiveCases.pFalciparum',
    'p. vivax': 'malariaPositiveCases.pVivax',
    'falciparum': 'malariaPositiveCases.pFalciparum',
    'vivax': 'malariaPositiveCases.pVivax',
    'mixed malaria': 'malariaPositiveCases.mixed',
    'plasmodium falciparum': 'malariaPositiveCases.pFalciparum',
    'plasmodium vivax': 'malariaPositiveCases.pVivax',
    
    // Other diseases
    'meningitis': 'meningitis',
    'bacterial meningitis': 'meningitis',
    'viral meningitis': 'meningitis',
    'dysentery': 'dysentery',
    'scabies': 'scabies',
    'relapsing fever': 'relapsingFever',
    'severe acute malnutrition': 'severeAcuteMalnutrition',
    'moderate acute malnutrition': 'moderateAcuteMalnutritionU5C',
    'diarrhea with dehydration': 'diarrheaWithDehydration',
    'acute jaundice': 'acuteJaundiceSyndrome',
    'severe pneumonia': 'severePneumonia',
    'diabetes': 'diabeticMellitusNewCase',
    'diabetes mellitus': 'diabeticMellitusNewCase',
    'type 1 diabetes': 'diabeticMellitusNewCase',
    'type 2 diabetes': 'diabeticMellitusNewCase',
    'diabetic': 'diabeticMellitusNewCase',
    'dm': 'diabeticMellitusNewCase',
    'hiv': 'hivNewCases',
    'hiv infection': 'hivNewCases',
    'tuberculosis': 'tuberculosisNewCases',
    'tb': 'tuberculosisNewCases',
    'pulmonary tuberculosis': 'tuberculosisNewCases',
    'hypertension': 'hypertensionNewCases',
    'high blood pressure': 'hypertensionNewCases',
    'htn': 'hypertensionNewCases',
    'chemical poisoning': 'chemicalPoisoning'
  },
  
  // Reportable Conditions
  reportableConditions: {
    'afp': 'afpPolio',
    'polio': 'afpPolio',
    'acute flaccid paralysis': 'afpPolio',
    'anthrax': 'anthrax',
    'cholera': 'cholera',
    'dracunculiasis': 'dracunculiasis',
    'guinea worm': 'dracunculiasis',
    'chikungunya': 'chikungunya',
    'aefi': 'adverseEventsFollowingImmunization',
    'adverse events following immunization': 'adverseEventsFollowingImmunization',
    'measles': 'measles',
    'neonatal tetanus': 'neonatalTetanus',
    'influenza': 'humanInfluenzaCausedByNewSubtype',
    'rabies exposure': 'suspectedRabiesExposure',
    'rabies': 'humanRabies',
    'dengue': 'dengueFever',
    'dengue fever': 'dengueFever',
    'sars': 'sars',
    'smallpox': 'smallPox',
    'viral hemorrhagic fever': 'viralHemorrhagicFever',
    'yellow fever': 'yellowFever',
    'covid-19': 'covid19',
    'covid': 'covid19',
    'monkeypox': 'monkeypoxVirus',
    'rift valley fever': 'riftValleyFever',
    'brucellosis': 'brucellosis',
    'maternal death': 'maternalDeath',
    'perinatal death': 'perinatalDeath',
    'obstetric fistula': 'obstetricFistula'
  }
};

/**
 * Normalize diagnosis text for matching
 */
const normalizeDiagnosis = (diagnosis) => {
  if (!diagnosis) return '';
  
  return diagnosis
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize spaces
};

/**
 * Find matching disease indicator for a diagnosis
 */
const findDiseaseMapping = (diagnosis) => {
  const normalizedDiagnosis = normalizeDiagnosis(diagnosis);
  
  // Check weekly indicators first
  for (const [keyword, indicator] of Object.entries(DISEASE_MAPPINGS.weeklyIndicators)) {
    if (normalizedDiagnosis.includes(keyword)) {
      return {
        section: 'weeklyIndicators',
        indicator: indicator,
        field: 'outPatient' // Always out-patient for clinic
      };
    }
  }
  
  // Check reportable conditions
  for (const [keyword, indicator] of Object.entries(DISEASE_MAPPINGS.reportableConditions)) {
    if (normalizedDiagnosis.includes(keyword)) {
      return {
        section: 'reportableConditions',
        indicator: indicator,
        field: 'outPatient' // Always out-patient for clinic
      };
    }
  }
  
  return null;
};

/**
 * Count diseases from medical records for a specific week
 */
const countDiseasesFromAssessments = async (weekStartDate, weekEndDate) => {
  try {
    // Query medical records for the specified week
    const medicalRecords = await MedicalRecord.find({
      createdAt: {
        $gte: weekStartDate,
        $lte: weekEndDate
      },
      $or: [
        { 'assessment.primaryDiagnosis': { $exists: true, $ne: '' } },
        { 'assessment.secondaryDiagnoses': { $exists: true, $not: { $size: 0 } } }
      ]
    }).select('assessment');

    // Initialize with complete structure matching the model
    const diseaseCounts = {
      weeklyIndicators: {
        totalMalariaCases: { outPatient: 0, inPatient: 0, deaths: 0 },
        totalMalariaSuspectedFeverCases: { outPatient: 0, inPatient: 0, deaths: 0 },
        malariaPositiveCases: {
          pFalciparum: { outPatient: 0, inPatient: 0, deaths: 0 },
          pVivax: { outPatient: 0, inPatient: 0, deaths: 0 },
          mixed: { outPatient: 0, inPatient: 0, deaths: 0 }
        },
        meningitis: { outPatient: 0, inPatient: 0, deaths: 0 },
        dysentery: { outPatient: 0, inPatient: 0, deaths: 0 },
        scabies: { outPatient: 0, inPatient: 0, deaths: 0 },
        relapsingFever: { outPatient: 0, inPatient: 0, deaths: 0 },
        severeAcuteMalnutrition: { outPatient: 0, inPatient: 0, deaths: 0 },
        moderateAcuteMalnutritionU5C: { outPatient: 0, inPatient: 0, deaths: 0 },
        moderateAcuteMalnutritionPLW: { outPatient: 0, inPatient: 0, deaths: 0 },
        diarrheaWithDehydration: { outPatient: 0, inPatient: 0, deaths: 0 },
        acuteJaundiceSyndrome: { outPatient: 0, inPatient: 0, deaths: 0 },
        severePneumonia: { outPatient: 0, inPatient: 0, deaths: 0 },
        diabeticMellitusNewCase: { outPatient: 0, inPatient: 0, deaths: 0 },
        hivNewCases: { outPatient: 0, inPatient: 0, deaths: 0 },
        tuberculosisNewCases: { outPatient: 0, inPatient: 0, deaths: 0 },
        hypertensionNewCases: { outPatient: 0, inPatient: 0, deaths: 0 },
        chemicalPoisoning: { outPatient: 0, inPatient: 0, deaths: 0 }
      },
      reportableConditions: {
        afpPolio: { outPatient: 0, inPatient: 0, deaths: 0 },
        anthrax: { outPatient: 0, inPatient: 0, deaths: 0 },
        cholera: { outPatient: 0, inPatient: 0, deaths: 0 },
        dracunculiasis: { outPatient: 0, inPatient: 0, deaths: 0 },
        chikungunya: { outPatient: 0, inPatient: 0, deaths: 0 },
        adverseEventsFollowingImmunization: { outPatient: 0, inPatient: 0, deaths: 0 },
        measles: { outPatient: 0, inPatient: 0, deaths: 0 },
        neonatalTetanus: { outPatient: 0, inPatient: 0, deaths: 0 },
        humanInfluenzaNewSubtype: { outPatient: 0, inPatient: 0, deaths: 0 },
        suspectedRabiesExposure: { outPatient: 0, inPatient: 0, deaths: 0 },
        humanRabies: { outPatient: 0, inPatient: 0, deaths: 0 },
        dengueFever: { outPatient: 0, inPatient: 0, deaths: 0 },
        sars: { outPatient: 0, inPatient: 0, deaths: 0 },
        smallPox: { outPatient: 0, inPatient: 0, deaths: 0 },
        viralHemorrhagicFever: { outPatient: 0, inPatient: 0, deaths: 0 },
        yellowFever: { outPatient: 0, inPatient: 0, deaths: 0 },
        covid19: { outPatient: 0, inPatient: 0, deaths: 0 },
        monkeypoxVirus: { outPatient: 0, inPatient: 0, deaths: 0 },
        riftValleyFever: { outPatient: 0, inPatient: 0, deaths: 0 },
        brucellosis: { outPatient: 0, inPatient: 0, deaths: 0 },
        maternalDeath: { outPatient: 0, inPatient: 0, deaths: 0 },
        perinatalDeath: { outPatient: 0, inPatient: 0, deaths: 0 },
        obstetricFistula: { outPatient: 0, inPatient: 0, deaths: 0 },
        other1: { outPatient: 0, inPatient: 0, deaths: 0 },
        other2: { outPatient: 0, inPatient: 0, deaths: 0 },
        other3: { outPatient: 0, inPatient: 0, deaths: 0 }
      }
    };

    // Process each medical record
    for (const record of medicalRecords) {
      const assessment = record.assessment;
      
      if (!assessment) continue;

      // Process primary diagnosis
      if (assessment.primaryDiagnosis) {
        const mapping = findDiseaseMapping(assessment.primaryDiagnosis);
        if (mapping) {
          incrementDiseaseCount(diseaseCounts, mapping);
        }
      }

      // Process secondary diagnoses
      if (assessment.secondaryDiagnoses && Array.isArray(assessment.secondaryDiagnoses)) {
        for (const secondaryDiagnosis of assessment.secondaryDiagnoses) {
          if (secondaryDiagnosis.diagnosis) {
            const mapping = findDiseaseMapping(secondaryDiagnosis.diagnosis);
            if (mapping) {
              incrementDiseaseCount(diseaseCounts, mapping);
            }
          }
        }
      }
    }

    return diseaseCounts;
  } catch (error) {
    logger.error('Error counting diseases from assessments:', error);
    throw error;
  }
};

/**
 * Increment disease count in the appropriate section
 */
const incrementDiseaseCount = (diseaseCounts, mapping) => {
  const { section, indicator, field } = mapping;
  
  // The structure is already initialized, just increment the count
  if (diseaseCounts[section] && diseaseCounts[section][indicator]) {
    diseaseCounts[section][indicator][field] = (diseaseCounts[section][indicator][field] || 0) + 1;
  }
};

/**
 * Get disease statistics for a specific week
 */
const getDiseaseStatistics = async (weekStartDate, weekEndDate) => {
  try {
    const diseaseCounts = await countDiseasesFromAssessments(weekStartDate, weekEndDate);
    
    // Get total medical records for the week
    const totalRecords = await MedicalRecord.countDocuments({
      createdAt: {
        $gte: weekStartDate,
        $lte: weekEndDate
      }
    });

    return {
      diseaseCounts,
      totalRecords,
      weekStartDate,
      weekEndDate
    };
  } catch (error) {
    logger.error('Error getting disease statistics:', error);
    throw error;
  }
};

module.exports = {
  countDiseasesFromAssessments,
  getDiseaseStatistics,
  findDiseaseMapping,
  normalizeDiagnosis,
  DISEASE_MAPPINGS
};
