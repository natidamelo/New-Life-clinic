const mongoose = require('mongoose');

const WeeklyDiseasesReportSchema = new mongoose.Schema({
  // Report metadata
  reportDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  healthCenter: {
    type: String,
    required: true,
    default: 'Health Center'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  },

  // Section 1: Weekly Disease Indicators
  weeklyIndicators: {
    // Malaria indicators
    totalMalariaCases: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    totalMalariaSuspectedFeverCases: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    malariaPositiveCases: {
      pFalciparum: {
        outPatient: { type: Number, default: 0 },
        inPatient: { type: Number, default: 0 },
        deaths: { type: Number, default: 0 }
      },
      pVivax: {
        outPatient: { type: Number, default: 0 },
        inPatient: { type: Number, default: 0 },
        deaths: { type: Number, default: 0 }
      },
      mixed: {
        outPatient: { type: Number, default: 0 },
        inPatient: { type: Number, default: 0 },
        deaths: { type: Number, default: 0 }
      }
    },
    
    // Other diseases
    meningitis: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    dysentery: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    scabies: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    relapsingFever: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    severeAcuteMalnutrition: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    moderateAcuteMalnutritionU5C: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    moderateAcuteMalnutritionPLW: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    diarrheaWithDehydration: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    acuteJaundiceSyndrome: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    severePneumonia: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    diabeticMellitusNewCase: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    hivNewCases: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    tuberculosisNewCases: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    hypertensionNewCases: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    chemicalPoisoning: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    }
  },

  // Section 2: Immediately Reportable Case-based Disease/Conditions
  reportableConditions: {
    afpPolio: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    anthrax: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    cholera: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    dracunculiasis: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    chikungunya: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    adverseEventsFollowingImmunization: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    measles: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    neonatalTetanus: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    humanInfluenzaNewSubtype: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    suspectedRabiesExposure: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    humanRabies: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    dengueFever: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    sars: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    smallPox: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    viralHemorrhagicFever: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    yellowFever: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    covid19: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    monkeypoxVirus: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    riftValleyFever: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    brucellosis: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    maternalDeath: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    perinatalDeath: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    obstetricFistula: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    other1: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    other2: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    },
    other3: {
      outPatient: { type: Number, default: 0 },
      inPatient: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
WeeklyDiseasesReportSchema.index({ reportDate: 1, weekStartDate: 1, weekEndDate: 1 });
WeeklyDiseasesReportSchema.index({ createdBy: 1 });

module.exports = mongoose.model('WeeklyDiseasesReport', WeeklyDiseasesReportSchema);
