export interface DiseaseData {
  outPatient: number;
  inPatient: number;
  deaths: number;
}

export interface WeeklyIndicators {
  totalMalariaCases: DiseaseData;
  totalMalariaSuspectedFeverCases: DiseaseData;
  malariaPositiveCases: {
    pFalciparum: DiseaseData;
    pVivax: DiseaseData;
    mixed: DiseaseData;
  };
  meningitis: DiseaseData;
  dysentery: DiseaseData;
  scabies: DiseaseData;
  relapsingFever: DiseaseData;
  severeAcuteMalnutrition: DiseaseData;
  moderateAcuteMalnutritionU5C: DiseaseData;
  moderateAcuteMalnutritionPLW: DiseaseData;
  diarrheaWithDehydration: DiseaseData;
  acuteJaundiceSyndrome: DiseaseData;
  severePneumonia: DiseaseData;
  diabeticMellitusNewCase: DiseaseData;
  hivNewCases: DiseaseData;
  tuberculosisNewCases: DiseaseData;
  hypertensionNewCases: DiseaseData;
  chemicalPoisoning: DiseaseData;
}

export interface ReportableConditions {
  afpPolio: DiseaseData;
  anthrax: DiseaseData;
  cholera: DiseaseData;
  dracunculiasis: DiseaseData;
  chikungunya: DiseaseData;
  adverseEventsFollowingImmunization: DiseaseData;
  measles: DiseaseData;
  neonatalTetanus: DiseaseData;
  humanInfluenzaNewSubtype: DiseaseData;
  suspectedRabiesExposure: DiseaseData;
  humanRabies: DiseaseData;
  dengueFever: DiseaseData;
  sars: DiseaseData;
  smallPox: DiseaseData;
  viralHemorrhagicFever: DiseaseData;
  yellowFever: DiseaseData;
  covid19: DiseaseData;
  monkeypoxVirus: DiseaseData;
  riftValleyFever: DiseaseData;
  brucellosis: DiseaseData;
  maternalDeath: DiseaseData;
  perinatalDeath: DiseaseData;
  obstetricFistula: DiseaseData;
  other1: DiseaseData;
  other2: DiseaseData;
  other3: DiseaseData;
}

export interface WeeklyDiseasesReport {
  _id: string;
  reportDate: string;
  weekStartDate: string;
  weekEndDate: string;
  healthCenter: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lastModified: string;
  weeklyIndicators: WeeklyIndicators;
  reportableConditions: ReportableConditions;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWeeklyDiseasesReportRequest {
  weekStartDate: string;
  weekEndDate: string;
  healthCenter?: string;
  weeklyIndicators?: Partial<WeeklyIndicators>;
  reportableConditions?: Partial<ReportableConditions>;
}

export interface UpdateWeeklyDiseasesReportRequest {
  weeklyIndicators?: Partial<WeeklyIndicators>;
  reportableConditions?: Partial<ReportableConditions>;
}

export interface WeeklyDiseasesReportResponse {
  success: boolean;
  data: WeeklyDiseasesReport;
  message?: string;
}

export interface WeeklyDiseasesReportListResponse {
  success: boolean;
  data: WeeklyDiseasesReport[];
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
}

export interface WeeklyDiseasesReportStatistics {
  totalReports: number;
  latestReport: {
    id: string;
    reportDate: string;
    weekStartDate: string;
    weekEndDate: string;
    createdBy: {
      firstName: string;
      lastName: string;
    };
  } | null;
}
