import { VITAL_SIGNS_THRESHOLDS } from '../config/index';

export interface VitalSignsData {
  temperature: string;
  bloodPressure: string;
  heartRate: string;
  respiratoryRate: string;
  bloodSugar: string;
  oxygenSaturation: string;
  pain: string;
  height: string;
  weight: string;
  bmi: string;
}

export const determineVitalStatus = (vitals: VitalSignsData): 'normal' | 'warning' | 'critical' => {
  let status: 'normal' | 'warning' | 'critical' = 'normal';

  // Check temperature
  const temp = parseFloat(vitals.temperature);
  if (temp <= VITAL_SIGNS_THRESHOLDS.temperature.low || 
      temp >= VITAL_SIGNS_THRESHOLDS.temperature.critical) {
    return 'critical';
  }
  if (temp < VITAL_SIGNS_THRESHOLDS.temperature.normal[0] || 
      temp > VITAL_SIGNS_THRESHOLDS.temperature.normal[1]) {
    status = 'warning';
  }

  // Check blood pressure
  const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
  if (systolic <= VITAL_SIGNS_THRESHOLDS.bloodPressureSystolic.low || 
      systolic >= VITAL_SIGNS_THRESHOLDS.bloodPressureSystolic.critical ||
      diastolic <= VITAL_SIGNS_THRESHOLDS.bloodPressureDiastolic.low || 
      diastolic >= VITAL_SIGNS_THRESHOLDS.bloodPressureDiastolic.critical) {
    return 'critical';
  }
  if (systolic < VITAL_SIGNS_THRESHOLDS.bloodPressureSystolic.normal[0] || 
      systolic > VITAL_SIGNS_THRESHOLDS.bloodPressureSystolic.normal[1] ||
      diastolic < VITAL_SIGNS_THRESHOLDS.bloodPressureDiastolic.normal[0] || 
      diastolic > VITAL_SIGNS_THRESHOLDS.bloodPressureDiastolic.normal[1]) {
    status = 'warning';
  }

  // Check heart rate
  const hr = parseFloat(vitals.heartRate);
  if (hr <= VITAL_SIGNS_THRESHOLDS.heartRate.low || 
      hr >= VITAL_SIGNS_THRESHOLDS.heartRate.critical) {
    return 'critical';
  }
  if (hr < VITAL_SIGNS_THRESHOLDS.heartRate.normal[0] || 
      hr > VITAL_SIGNS_THRESHOLDS.heartRate.normal[1]) {
    status = 'warning';
  }

  // Check respiratory rate
  const rr = parseFloat(vitals.respiratoryRate);
  if (rr <= VITAL_SIGNS_THRESHOLDS.respiratoryRate.low || 
      rr >= VITAL_SIGNS_THRESHOLDS.respiratoryRate.critical) {
    return 'critical';
  }
  if (rr < VITAL_SIGNS_THRESHOLDS.respiratoryRate.normal[0] || 
      rr > VITAL_SIGNS_THRESHOLDS.respiratoryRate.normal[1]) {
    status = 'warning';
  }

  // Check oxygen saturation
  const o2 = parseFloat(vitals.oxygenSaturation);
  if (o2 <= VITAL_SIGNS_THRESHOLDS.oxygenSaturation.critical) {
    return 'critical';
  }
  if (o2 < VITAL_SIGNS_THRESHOLDS.oxygenSaturation.normal[0]) {
    status = 'warning';
  }

  // Check blood sugar
  const bs = parseFloat(vitals.bloodSugar);
  if (bs <= VITAL_SIGNS_THRESHOLDS.bloodGlucose.fasting.low || 
      bs >= VITAL_SIGNS_THRESHOLDS.bloodGlucose.fasting.critical) {
    return 'critical';
  }
  if (bs < VITAL_SIGNS_THRESHOLDS.bloodGlucose.fasting.normal[0] || 
      bs > VITAL_SIGNS_THRESHOLDS.bloodGlucose.fasting.normal[1]) {
    status = 'warning';
  }

  return status;
};

export const calculateBMI = (height: string, weight: string): string => {
  const heightInMeters = parseFloat(height) / 100;
  const weightInKg = parseFloat(weight);
  
  if (heightInMeters > 0 && weightInKg > 0) {
    const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
    return bmi;
  }
  return '';
};

export const getBMICategory = (bmi: string): string => {
  const bmiValue = parseFloat(bmi);
  if (isNaN(bmiValue)) return '';
  
  if (bmiValue < 16) return 'Severe Underweight';
  if (bmiValue < 18.5) return 'Underweight';
  if (bmiValue < 25) return 'Normal';
  if (bmiValue < 30) return 'Overweight';
  if (bmiValue < 35) return 'Obese Class I';
  if (bmiValue < 40) return 'Obese Class II';
  return 'Obese Class III';
};

export const formatVitalSign = (value: string, unit: string): string => {
  return value ? `${value} ${unit}` : 'Not recorded';
};

export const getVitalSignColor = (status: 'normal' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'normal':
      return 'text-primary';
    case 'warning':
      return 'text-accent-foreground';
    case 'critical':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}; 