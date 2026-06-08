export const specialtyConfigs = {
  pediatrics: {
    step1_patientHistory: [
      { name: "birthWeight", label: "Birth weight (kg)", type: "number" },
      { name: "gestationalAge", label: "Gestational age at birth (weeks)", type: "number" },
      { name: "deliveryType", label: "Delivery type", type: "select", options: ["Normal vaginal", "C-section", "Instrumental"] },
      { name: "vaccinationHistory", label: "Vaccination history", type: "multi-select", options: ["BCG", "OPV", "DPT", "Measles", "Hepatitis B", "Pentavalent", "Rotavirus", "PCV"] },
      { name: "feedingHistory", label: "Feeding history", type: "select", options: ["Breastfeeding", "Formula", "Mixed", "Solid foods introduced"] },
    ],
    step2_physicalExam: [
      { name: "weightForAge", label: "Weight-for-age percentile", type: "number" },
      { name: "heightForAge", label: "Height-for-age percentile", type: "number" },
      { name: "headCircumference", label: "Head circumference (cm)", type: "number" },
      { name: "muac", label: "MUAC (cm)", type: "number" },
      { name: "nutritionStatus", label: "Nutrition status", type: "select", options: ["Normal", "Mild malnutrition", "Moderate malnutrition", "Severe acute malnutrition (SAM)"] },
    ],
    step3_assessment: [
      { name: "developmentalMilestones", label: "Developmental milestones", type: "multi-select", options: ["Appropriate for age", "Speech delay", "Motor delay", "Cognitive delay", "Social delay"] },
      { name: "immunizationStatus", label: "Immunization status", type: "select", options: ["Up to date", "Incomplete", "Not vaccinated"] },
    ],
  },

  gynecology: {
    step1_patientHistory: [
      { name: "lmpDate", label: "Last menstrual period (LMP)", type: "date" },
      { name: "cycleLength", label: "Cycle length (days)", type: "number" },
      { name: "gravida", label: "Gravida", type: "number" },
      { name: "para", label: "Para", type: "number" },
      { name: "abortus", label: "Abortus", type: "number" },
      { name: "contraceptiveUse", label: "Contraceptive use", type: "select", options: ["None", "OCP", "Injectable", "IUD", "Implant", "Barrier", "Natural"] },
      { name: "lastPapSmear", label: "Last Pap smear date", type: "date" },
    ],
    step2_physicalExam: [
      { name: "fundalHeight", label: "Fundal height (cm)", type: "number" },
      { name: "fetalHeartRate", label: "Fetal heart rate (bpm)", type: "number" },
      { name: "fetalPresentation", label: "Fetal presentation", type: "select", options: ["Cephalic", "Breech", "Transverse", "Not applicable"] },
      { name: "gestationalAgeByExam", label: "Gestational age by exam (weeks)", type: "number" },
      { name: "cervicalDilation", label: "Cervical dilation (cm)", type: "number" },
    ],
    step3_assessment: [
      { name: "ancVisitNumber", label: "ANC visit number", type: "number" },
      { name: "riskFactors", label: "Obstetric risk factors", type: "multi-select", options: ["Pre-eclampsia", "Gestational diabetes", "Anemia", "Placenta previa", "Multiple gestation", "Previous C-section", "None"] },
      { name: "birthPlan", label: "Planned delivery mode", type: "select", options: ["Vaginal delivery", "Elective C-section", "Emergency C-section", "Not yet decided"] },
    ],
  },

  cardiology: {
    step1_patientHistory: [
      { name: "chestPainType", label: "Chest pain type", type: "select", options: ["Typical angina", "Atypical angina", "Non-cardiac", "None"] },
      { name: "dyspnea", label: "Dyspnea on exertion", type: "select", options: ["None", "NYHA Class I", "NYHA Class II", "NYHA Class III", "NYHA Class IV"] },
      { name: "cardiacHistory", label: "Cardiac history", type: "multi-select", options: ["MI", "Heart failure", "Arrhythmia", "Valvular disease", "Hypertension", "None"] },
    ],
    step2_physicalExam: [
      { name: "ecgFindings", label: "ECG findings", type: "textarea" },
      { name: "heartSounds", label: "Heart sounds", type: "select", options: ["Normal S1 S2", "Murmur present", "S3 gallop", "S4 gallop", "Muffled"] },
      { name: "jvp", label: "JVP (cmH2O)", type: "number" },
      { name: "peripheralEdema", label: "Peripheral edema", type: "select", options: ["None", "1+", "2+", "3+", "4+"] },
    ],
    step3_assessment: [
      { name: "cardicRiskScore", label: "Cardiac risk score (GRACE/TIMI)", type: "text" },
      { name: "echoRequired", label: "Echo required", type: "select", options: ["Yes", "No", "Already done"] },
    ],
  },
};

export const specialtyColors = {
  general:    { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8" },
  pediatrics: { bg: "#F0FDF4", border: "#22C55E", text: "#15803D" },
  gynecology: { bg: "#FDF4FF", border: "#A855F7", text: "#7E22CE" },
  cardiology: { bg: "#FFF7ED", border: "#F97316", text: "#C2410C" },
};
