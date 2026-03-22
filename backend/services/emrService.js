const axios = require('axios');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const User = require('../models/User');

class EMRService {
  constructor() {
    // External API configurations
    this.drugAPIConfig = {
      // OpenFDA API for drug information
      fdaBaseUrl: 'https://api.fda.gov/drug',
      // RxNorm API for drug normalization
      rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
      // DrugBank API (requires API key)
      drugBankBaseUrl: 'https://go.drugbank.com/api/v1',
      // Interaction API
      interactionBaseUrl: 'https://rxnav.nlm.nih.gov/REST/interaction'
    };
  }

  /**
   * Search prescriptions with advanced filters
   */
  async searchPrescriptions(searchParams) {
    try {
      const {
        query,
        patientId,
        doctorId,
        medicationName,
        status,
        dateFrom,
        dateTo,
        limit = 50,
        page = 1
      } = searchParams;

      let searchQuery = {};

      // Text search across multiple fields
      if (query) {
        searchQuery.$or = [
          { medicationName: { $regex: query, $options: 'i' } },
          { 'medicationDetails.brandName': { $regex: query, $options: 'i' } },
          { 'medicationDetails.genericName': { $regex: query, $options: 'i' } },
          { instructions: { $regex: query, $options: 'i' } },
          { dosage: { $regex: query, $options: 'i' } }
        ];
      }

      // Filter by patient
      if (patientId) {
        searchQuery.patient = patientId;
      }

      // Filter by doctor
      if (doctorId) {
        searchQuery.doctor = doctorId;
      }

      // Filter by medication name
      if (medicationName) {
        searchQuery.medicationName = { $regex: medicationName, $options: 'i' };
      }

      // Filter by status
      if (status) {
        searchQuery.status = status;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        searchQuery.datePrescribed = {};
        if (dateFrom) {
          searchQuery.datePrescribed.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          searchQuery.datePrescribed.$lte = new Date(dateTo);
        }
      }

      const skip = (page - 1) * limit;

      const prescriptions = await Prescription.find(searchQuery)
        .populate('patient', 'firstName lastName dateOfBirth')
        .populate('doctor', 'firstName lastName')
        .sort({ datePrescribed: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Prescription.countDocuments(searchQuery);

      return {
        prescriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error searching prescriptions:', error);
      throw error;
    }
  }

  /**
   * Check for drug interactions
   */
  async checkDrugInteractions(medications) {
    try {
      const interactions = [];

      for (let i = 0; i < medications.length; i++) {
        for (let j = i + 1; j < medications.length; j++) {
          const drug1 = medications[i];
          const drug2 = medications[j];

          try {
            // Check interaction using RxNorm API
            const response = await axios.get(
              `${this.drugAPIConfig.interactionBaseUrl}/interaction.json`,
              {
                params: {
                  rxcui: drug1.rxNormId || drug1.name,
                  sources: 'DrugBank'
                },
                timeout: 5000
              }
            );

            if (response.data && response.data.interactionTypeGroup) {
              const interactionData = response.data.interactionTypeGroup[0];
              if (interactionData && interactionData.interactionType) {
                const interactionTypes = interactionData.interactionType;
                
                for (const interaction of interactionTypes) {
                  if (interaction.interactionPair) {
                    const pairs = interaction.interactionPair;
                    for (const pair of pairs) {
                      if (pair.interactionConcept.some(concept => 
                        concept.minConceptItem.name.toLowerCase().includes(drug2.name.toLowerCase())
                      )) {
                        interactions.push({
                          drug1: drug1.name,
                          drug2: drug2.name,
                          description: pair.description,
                          severity: interaction.comment || 'moderate',
                          interactionType: 'drug-drug'
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch (apiError) {
            console.warn(`Failed to check interaction between ${drug1.name} and ${drug2.name}:`, apiError.message);
            
            // Fallback to basic interaction checking
            const basicInteraction = this.checkBasicInteractions(drug1.name, drug2.name);
            if (basicInteraction) {
              interactions.push(basicInteraction);
            }
          }
        }
      }

      return interactions;
    } catch (error) {
      console.error('Error checking drug interactions:', error);
      return [];
    }
  }

  /**
   * Basic drug interaction checking (fallback)
   */
  checkBasicInteractions(drug1, drug2) {
    // Common drug interaction patterns
    const commonInteractions = {
      'warfarin': ['aspirin', 'ibuprofen', 'acetaminophen'],
      'metformin': ['alcohol', 'contrast dye'],
      'digoxin': ['furosemide', 'quinidine'],
      'lithium': ['nsaids', 'ace inhibitors'],
      'phenytoin': ['warfarin', 'digoxin']
    };

    const drug1Lower = drug1.toLowerCase();
    const drug2Lower = drug2.toLowerCase();

    for (const [mainDrug, interactingDrugs] of Object.entries(commonInteractions)) {
      if (drug1Lower.includes(mainDrug) && 
          interactingDrugs.some(interacting => drug2Lower.includes(interacting))) {
        return {
          drug1,
          drug2,
          description: `Potential interaction between ${drug1} and ${drug2}`,
          severity: 'moderate',
          interactionType: 'drug-drug'
        };
      }
      if (drug2Lower.includes(mainDrug) && 
          interactingDrugs.some(interacting => drug1Lower.includes(interacting))) {
        return {
          drug1: drug2,
          drug2: drug1,
          description: `Potential interaction between ${drug2} and ${drug1}`,
          severity: 'moderate',
          interactionType: 'drug-drug'
        };
      }
    }

    return null;
  }

  /**
   * Check patient allergies against prescribed medications
   */
  async checkAllergyAlerts(patientId, medications) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient || !patient.allergies) {
        return [];
      }

      const alerts = [];
      const patientAllergies = patient.allergies.map(allergy => allergy.toLowerCase());

      for (const medication of medications) {
        const medicationName = medication.name.toLowerCase();
        
        for (const allergy of patientAllergies) {
          if (medicationName.includes(allergy) || allergy.includes(medicationName)) {
            alerts.push({
              medication: medication.name,
              allergen: allergy,
              alertType: 'drug',
              severity: 'severe',
              description: `Patient has known allergy to ${allergy}. Prescribed medication ${medication.name} may contain this allergen.`
            });
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking allergy alerts:', error);
      return [];
    }
  }

  /**
   * Get drug information from external APIs
   */
  async getDrugInformation(drugName) {
    try {
      const drugInfo = {
        name: drugName,
        brandNames: [],
        genericName: '',
        indications: [],
        contraindications: [],
        sideEffects: [],
        dosageInfo: {},
        interactions: []
      };

      try {
        // Try to get information from OpenFDA API
        const fdaResponse = await axios.get(
          `${this.drugAPIConfig.fdaBaseUrl}/label.json`,
          {
            params: {
              search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
              limit: 1
            },
            timeout: 5000
          }
        );

        if (fdaResponse.data && fdaResponse.data.results && fdaResponse.data.results.length > 0) {
          const result = fdaResponse.data.results[0];
          
          if (result.openfda) {
            drugInfo.brandNames = result.openfda.brand_name || [];
            drugInfo.genericName = result.openfda.generic_name ? result.openfda.generic_name[0] : '';
          }

          drugInfo.indications = result.indications_and_usage || [];
          drugInfo.contraindications = result.contraindications || [];
          drugInfo.sideEffects = result.adverse_reactions || [];
        }
      } catch (apiError) {
        console.warn(`FDA API error for ${drugName}:`, apiError.message);
      }

      // Add basic drug information as fallback
      if (!drugInfo.genericName) {
        drugInfo.genericName = drugName;
      }

      return drugInfo;
    } catch (error) {
      console.error('Error getting drug information:', error);
      return {
        name: drugName,
        error: 'Unable to retrieve drug information'
      };
    }
  }

  /**
   * Generate prescription analytics
   */
  async getPrescriptionAnalytics(doctorId, dateRange) {
    try {
      const startDate = dateRange?.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

      const matchStage = {
        datePrescribed: { $gte: startDate, $lte: endDate }
      };

      if (doctorId) {
        matchStage.doctor = doctorId;
      }

      const analytics = await Prescription.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalPrescriptions: { $sum: 1 },
            uniquePatients: { $addToSet: '$patient' },
            mostPrescribedMeds: { $push: '$medicationName' },
            statusDistribution: {
              $push: {
                status: '$status',
                count: 1
              }
            }
          }
        },
        {
          $project: {
            totalPrescriptions: 1,
            uniquePatientCount: { $size: '$uniquePatients' },
            topMedications: {
              $slice: [
                {
                  $sortByCount: '$mostPrescribedMeds'
                },
                10
              ]
            },
            statusDistribution: 1
          }
        }
      ]);

      return analytics[0] || {
        totalPrescriptions: 0,
        uniquePatientCount: 0,
        topMedications: [],
        statusDistribution: []
      };
    } catch (error) {
      console.error('Error generating prescription analytics:', error);
      throw error;
    }
  }
}

module.exports = new EMRService();
