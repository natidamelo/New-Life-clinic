import api from './api';

export interface PatientCondition {
  hypertension: boolean;
  diabetes: boolean;
  highCholesterol: boolean;
  obesity: boolean;
  overweight: boolean;
  underweight: boolean;
  preDiabetes: boolean;
  metabolicSyndrome: boolean;
  riskLevel: 'low' | 'moderate' | 'high';
  trends: {
    bloodPressure: 'stable' | 'increasing' | 'decreasing';
    weight: 'stable' | 'increasing' | 'decreasing';
    bloodSugar: 'stable' | 'increasing' | 'decreasing';
  };
}

export interface VitalSignsData {
  bloodPressure: string;
  bloodSugar: string;
  weight: string;
  height: string;
  bmi: string;
  pulse: string;
  temperature: string;
  measurementDate: string;
}

export interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: string;
  patientId: string;
  diabetic: boolean | string;
  allergies: string[];
  medications: string[];
}

export interface AllergyInfo {
  hasAllergies: boolean;
  allergyList: string[];
  foodAllergies: string[];
  restrictions: string[];
}

export interface MedicationInfo {
  hasMedications: boolean;
  medicationNames: string[];
  foodInteractions: string[];
  warnings: string[];
}

export interface CaloricNeeds {
  bmr: number;
  tdee: number;
  targetCalories: number;
  weightGoal: 'lose' | 'maintain' | 'gain';
}

export interface HydrationNeeds {
  liters: string;
  cups: string;
  ml: string;
}

export interface Macronutrients {
  protein: {
    grams: number;
    percentage: string;
    calories: number;
  };
  carbohydrates: {
    grams: number;
    percentage: string;
    calories: number;
  };
  fats: {
    grams: number;
    percentage: string;
    calories: number;
  };
}

export interface NutritionCalculations {
  caloricNeeds: CaloricNeeds;
  hydrationNeeds: HydrationNeeds;
  macronutrients: Macronutrients;
}

export interface EatingPlan {
  planName: string;
  duration: string;
  targetCalories: number;
  weightGoal: 'lose' | 'maintain' | 'gain';
  goals: string[];
  restrictions: string[];
  foodsToEat: string[];
  foodsToAvoid: string[];
  dailyMeals: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snacks: string[];
  };
  weeklyMealPlan: {
    [key: string]: {
      breakfast: string;
      lunch: string;
      dinner: string;
      snack: string;
    };
  };
  nutritionalGuidelines: {
    [key: string]: string;
  };
  lifestyleRecommendations: string[];
  allergyConsiderations: string[];
  medicationInteractions: string[];
}

export interface EatingPlanResponse {
  patient: PatientData;
  vitalSigns: VitalSignsData;
  conditions: PatientCondition;
  allergyInfo: AllergyInfo;
  medicationInfo: MedicationInfo;
  nutritionCalculations: NutritionCalculations;
  eatingPlan: EatingPlan;
  generatedAt: string;
  generatedBy: string;
}

class EatingPlanService {
  /**
   * Generate a personalized eating plan for a patient
   */
  async generateEatingPlan(patientId: string, planType: string = 'dash'): Promise<EatingPlanResponse> {
    try {
      const response = await api.post(`/api/eating-plans/generate/${patientId}`, {
        planType
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating eating plan:', error);
      throw error;
    }
  }

  /**
   * Get eating plan history for a patient (if implemented)
   */
  async getEatingPlanHistory(patientId: string) {
    try {
      const response = await api.get(`/api/eating-plans/history/${patientId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching eating plan history:', error);
      throw error;
    }
  }
}

export default new EatingPlanService();
