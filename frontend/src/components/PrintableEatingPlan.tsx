import React, { useState } from 'react';
import { 
  HeartIcon, 
  PrinterIcon, 
  DocumentArrowDownIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import eatingPlanService, { EatingPlanResponse } from '../services/eatingPlanService';
import { generatePDF, downloadPDF } from '../utils/pdfGenerator';

interface PrintableEatingPlanProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

const PrintableEatingPlan: React.FC<PrintableEatingPlanProps> = ({
  patientId,
  patientName,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [eatingPlanData, setEatingPlanData] = useState<EatingPlanResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generateEatingPlan = async () => {
    try {
      setLoading(true);
      const data = await eatingPlanService.generateEatingPlan(patientId);
      setEatingPlanData(data);
      setShowPreview(true);
      toast.success('Eating plan generated successfully!');
    } catch (error) {
      console.error('Error generating eating plan:', error);
      toast.error('Failed to generate eating plan');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!eatingPlanData) return;
    
    const content = generateHTMLContent(eatingPlanData);
    generatePDF({
      title: 'Personalized Eating Plan',
      patientName: eatingPlanData?.patient?.name || 'Unknown Patient',
      patientId: eatingPlanData?.patient?.patientId || 'Unknown ID',
      generatedDate: new Date(eatingPlanData?.generatedAt || new Date()).toLocaleDateString(),
      content: content
    });
  };

  const handleDownloadPDF = () => {
    if (!eatingPlanData) return;
    
    const content = generateHTMLContent(eatingPlanData);
    downloadPDF({
      title: 'Personalized Eating Plan',
      patientName: eatingPlanData?.patient?.name || 'Unknown Patient',
      patientId: eatingPlanData?.patient?.patientId || 'Unknown ID',
      generatedDate: new Date(eatingPlanData?.generatedAt || new Date()).toLocaleDateString(),
      content: content
    }, `eating-plan-${eatingPlanData?.patient?.patientId || 'unknown'}.pdf`);
  };

  const getConditionIcon = (condition: boolean) => {
    return condition ? (
      <XCircleIcon className="h-5 w-5 text-destructive" />
    ) : (
      <CheckCircleIcon className="h-5 w-5 text-primary" />
    );
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-destructive bg-destructive/20';
      case 'moderate':
        return 'text-accent-foreground bg-accent/20';
      case 'low':
        return 'text-primary bg-primary/20';
      default:
        return 'text-muted-foreground bg-muted/20';
    }
  };

  const generateHTMLContent = (data: EatingPlanResponse) => {
    const { vitalSigns, conditions, eatingPlan, nutritionCalculations, allergyInfo, medicationInfo } = data;
    
    return `
      <div class="section">
        <div class="section-title">Current Vital Signs</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Blood Pressure:</span>
            <span class="info-value">${vitalSigns.bloodPressure}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Blood Sugar:</span>
            <span class="info-value">${vitalSigns.bloodSugar}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Weight:</span>
            <span class="info-value">${vitalSigns.weight}</span>
          </div>
          <div class="info-item">
            <span class="info-label">BMI:</span>
            <span class="info-value">${vitalSigns.bmi}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Medical Conditions Assessment</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Hypertension:</span>
            <span class="info-value">${conditions.hypertension ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Diabetes:</span>
            <span class="info-value">${conditions.diabetes ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">High Cholesterol:</span>
            <span class="info-value">${conditions.highCholesterol ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Obesity:</span>
            <span class="info-value">${conditions.obesity ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">Risk Level:</span>
          <span class="info-value">${conditions.riskLevel.toUpperCase()}</span>
        </div>
      </div>

      ${nutritionCalculations ? `
      <div class="section">
        <div class="section-title">📊 Personalized Nutrition Plan</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">BMR (Basal Metabolic Rate):</span>
            <span class="info-value">${nutritionCalculations.caloricNeeds.bmr} cal/day</span>
          </div>
          <div class="info-item">
            <span class="info-label">TDEE (Daily Energy Need):</span>
            <span class="info-value">${nutritionCalculations.caloricNeeds.tdee} cal/day</span>
          </div>
          <div class="info-item">
            <span class="info-label">Target Calories:</span>
            <span class="info-value">${nutritionCalculations.caloricNeeds.targetCalories} cal/day</span>
          </div>
          <div class="info-item">
            <span class="info-label">Weight Goal:</span>
            <span class="info-value">${nutritionCalculations.caloricNeeds.weightGoal.toUpperCase()}</span>
          </div>
        </div>
        <h4 style="margin-top: 15px;">Macronutrient Breakdown</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">🥩 Protein:</span>
            <span class="info-value">${nutritionCalculations.macronutrients.protein.grams}g (${nutritionCalculations.macronutrients.protein.percentage})</span>
          </div>
          <div class="info-item">
            <span class="info-label">🌾 Carbohydrates:</span>
            <span class="info-value">${nutritionCalculations.macronutrients.carbohydrates.grams}g (${nutritionCalculations.macronutrients.carbohydrates.percentage})</span>
          </div>
          <div class="info-item">
            <span class="info-label">🥑 Fats:</span>
            <span class="info-value">${nutritionCalculations.macronutrients.fats.grams}g (${nutritionCalculations.macronutrients.fats.percentage})</span>
          </div>
          <div class="info-item">
            <span class="info-label">💧 Hydration:</span>
            <span class="info-value">${nutritionCalculations.hydrationNeeds.liters} (${nutritionCalculations.hydrationNeeds.cups})</span>
          </div>
        </div>
      </div>
      ` : ''}

      ${(allergyInfo?.hasAllergies || medicationInfo?.hasMedications) ? `
      <div class="section" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
        <div class="section-title">⚠️ Important Safety Information</div>
        ${allergyInfo?.hasAllergies ? `
          <h4 style="color: #dc2626; margin-bottom: 10px;">Food Allergies</h4>
          <p><strong>Allergies:</strong> ${allergyInfo.allergyList.join(', ')}</p>
          ${allergyInfo.restrictions.length > 0 ? `
            <ul class="restrictions-list">
              ${allergyInfo.restrictions.map(r => `<li>${r}</li>`).join('')}
            </ul>
          ` : ''}
        ` : ''}
        ${medicationInfo?.hasMedications && medicationInfo.warnings.length > 0 ? `
          <h4 style="color: #0891b2; margin-top: 15px; margin-bottom: 10px;">Medication-Food Interactions</h4>
          <p><strong>Current Medications:</strong> ${medicationInfo.medicationNames.join(', ')}</p>
          <ul class="restrictions-list">
            ${medicationInfo.warnings.map(w => `<li>💊 ${w}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">${eatingPlan.planName}</div>
        <div class="info-grid">
          <div>
            <h4>Goals</h4>
            <ul class="goals-list">
              ${eatingPlan.goals.map(goal => `<li>${goal}</li>`).join('')}
            </ul>
          </div>
          <div>
            <h4>Restrictions</h4>
            <ul class="restrictions-list">
              ${eatingPlan.restrictions.map(restriction => `<li>${restriction}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Food Recommendations</div>
        <div class="info-grid">
          <div>
            <h4 style="color: #059669;">Foods to Eat</h4>
            <ul class="goals-list">
              ${eatingPlan.foodsToEat.map(food => `<li>${food}</li>`).join('')}
            </ul>
          </div>
          <div>
            <h4 style="color: #dc2626;">Foods to Avoid</h4>
            <ul class="restrictions-list">
              ${eatingPlan.foodsToAvoid.map(food => `<li>${food}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Weekly Meal Plan</div>
        ${Object.entries(eatingPlan.weeklyMealPlan).map(([day, meals]) => `
          <div class="meal-plan">
            <div class="day-title">${day.charAt(0).toUpperCase() + day.slice(1)}</div>
            <div class="meal-item">
              <span class="meal-type">Breakfast:</span>
              <span class="meal-description">${meals.breakfast}</span>
            </div>
            <div class="meal-item">
              <span class="meal-type">Lunch:</span>
              <span class="meal-description">${meals.lunch}</span>
            </div>
            <div class="meal-item">
              <span class="meal-type">Dinner:</span>
              <span class="meal-description">${meals.dinner}</span>
            </div>
            <div class="meal-item">
              <span class="meal-type">Snack:</span>
              <span class="meal-description">${meals.snack}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <div class="section-title">Nutritional Guidelines</div>
        <div class="info-grid">
          ${Object.entries(eatingPlan.nutritionalGuidelines).map(([key, value]) => `
            <div class="info-item">
              <span class="info-label">${key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span class="info-value">${value}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Lifestyle Recommendations</div>
        <ul class="goals-list">
          ${eatingPlan.lifestyleRecommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `;
  };

  if (!showPreview || !eatingPlanData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-primary-foreground rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <HeartIcon className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Generate Eating Plan
            </h3>
            <p className="text-muted-foreground mb-6">
              Create a personalized eating plan for <strong>{patientName}</strong> based on their vital signs and medical conditions.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border/40 rounded-md text-muted-foreground hover:bg-muted/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generateEatingPlan}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-destructive text-primary-foreground rounded-md hover:bg-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-foreground rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-primary-foreground border-b border-border/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HeartIcon className="h-8 w-8 text-destructive" />
              <div>
                <h2 className="text-xl font-bold text-muted-foreground">Personalized Eating Plan</h2>
                <p className="text-sm text-muted-foreground">New Life Clinic - Healthcare Center</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-4 py-2 border border-border/40 rounded-md text-muted-foreground hover:bg-muted/10 transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors"
              >
                <PrinterIcon className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border/40 rounded-md text-muted-foreground hover:bg-muted/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Patient Information */}
          <div className="bg-muted/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Patient Name</p>
                <p className="font-semibold">{eatingPlanData?.patient?.name || 'Unknown Patient'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patient ID</p>
                <p className="font-semibold">{eatingPlanData?.patient?.patientId || 'Unknown ID'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age & Gender</p>
                <p className="font-semibold">{eatingPlanData?.patient?.age || 'N/A'} years, {eatingPlanData?.patient?.gender || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vital Signs */}
          <div className="bg-primary/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center">
              <HeartIcon className="h-5 w-5 mr-2" />
              Current Vital Signs
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                <p className="font-semibold">{eatingPlanData?.vitalSigns?.bloodPressure || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blood Sugar</p>
                <p className="font-semibold">{eatingPlanData?.vitalSigns?.bloodSugar || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-semibold">{eatingPlanData?.vitalSigns?.weight || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">BMI</p>
                <p className="font-semibold">{eatingPlanData?.vitalSigns?.bmi || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Last Measured</p>
              <p className="text-sm">{new Date(eatingPlanData?.vitalSigns?.measurementDate || new Date()).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Medical Conditions */}
          <div className="bg-accent/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Medical Conditions Assessment
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                {getConditionIcon(eatingPlanData?.conditions?.hypertension || false)}
                <span className="text-sm">Hypertension</span>
              </div>
              <div className="flex items-center space-x-2">
                {getConditionIcon(eatingPlanData?.conditions?.diabetes || false)}
                <span className="text-sm">Diabetes</span>
              </div>
              <div className="flex items-center space-x-2">
                {getConditionIcon(eatingPlanData?.conditions?.highCholesterol || false)}
                <span className="text-sm">High Cholesterol</span>
              </div>
              <div className="flex items-center space-x-2">
                {getConditionIcon(eatingPlanData?.conditions?.obesity || false)}
                <span className="text-sm">Obesity</span>
              </div>
              {eatingPlanData?.conditions?.preDiabetes && (
                <div className="flex items-center space-x-2">
                  {getConditionIcon(true)}
                  <span className="text-sm">Pre-Diabetes</span>
                </div>
              )}
              {eatingPlanData?.conditions?.metabolicSyndrome && (
                <div className="flex items-center space-x-2">
                  {getConditionIcon(true)}
                  <span className="text-sm">Metabolic Syndrome</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-muted-foreground">Risk Level</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(eatingPlanData?.conditions?.riskLevel || 'low')}`}>
                  {(eatingPlanData?.conditions?.riskLevel || 'low').toUpperCase()}
                </span>
              </div>
              {eatingPlanData?.conditions?.trends && (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Trends</p>
                  <div className="flex space-x-3 text-xs">
                    <span className={`${eatingPlanData.conditions.trends.bloodPressure === 'increasing' ? 'text-destructive' : eatingPlanData.conditions.trends.bloodPressure === 'decreasing' ? 'text-primary' : 'text-muted-foreground'}`}>
                      BP: {eatingPlanData.conditions.trends.bloodPressure}
                    </span>
                    <span className={`${eatingPlanData.conditions.trends.weight === 'increasing' ? 'text-accent-foreground' : eatingPlanData.conditions.trends.weight === 'decreasing' ? 'text-primary' : 'text-muted-foreground'}`}>
                      Weight: {eatingPlanData.conditions.trends.weight}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nutrition Calculations - NEW! */}
          {eatingPlanData?.nutritionCalculations && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4">📊 Personalized Nutrition Plan</h3>
              
              {/* Caloric Needs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded p-3">
                  <p className="text-xs text-muted-foreground">BMR (Basal Rate)</p>
                  <p className="text-xl font-bold text-blue-600">{eatingPlanData.nutritionCalculations.caloricNeeds.bmr}</p>
                  <p className="text-xs text-muted-foreground">calories/day</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs text-muted-foreground">TDEE (Daily Need)</p>
                  <p className="text-xl font-bold text-green-600">{eatingPlanData.nutritionCalculations.caloricNeeds.tdee}</p>
                  <p className="text-xs text-muted-foreground">calories/day</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs text-muted-foreground">Target Calories</p>
                  <p className="text-xl font-bold text-purple-600">{eatingPlanData.nutritionCalculations.caloricNeeds.targetCalories}</p>
                  <p className="text-xs text-muted-foreground">calories/day</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs text-muted-foreground">Weight Goal</p>
                  <p className="text-xl font-bold text-indigo-600 capitalize">{eatingPlanData.nutritionCalculations.caloricNeeds.weightGoal}</p>
                  <p className="text-xs text-muted-foreground">weight</p>
                </div>
              </div>

              {/* Macronutrients */}
              <div className="mb-4">
                <h4 className="font-semibold text-muted-foreground mb-3">Macronutrient Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded p-3 border-l-4 border-red-500">
                    <p className="text-sm font-medium text-muted-foreground">🥩 Protein</p>
                    <p className="text-2xl font-bold text-red-600">{eatingPlanData.nutritionCalculations.macronutrients.protein.grams}g</p>
                    <p className="text-xs text-muted-foreground">{eatingPlanData.nutritionCalculations.macronutrients.protein.percentage} ({eatingPlanData.nutritionCalculations.macronutrients.protein.calories} cal)</p>
                  </div>
                  <div className="bg-white rounded p-3 border-l-4 border-yellow-500">
                    <p className="text-sm font-medium text-muted-foreground">🌾 Carbohydrates</p>
                    <p className="text-2xl font-bold text-yellow-600">{eatingPlanData.nutritionCalculations.macronutrients.carbohydrates.grams}g</p>
                    <p className="text-xs text-muted-foreground">{eatingPlanData.nutritionCalculations.macronutrients.carbohydrates.percentage} ({eatingPlanData.nutritionCalculations.macronutrients.carbohydrates.calories} cal)</p>
                  </div>
                  <div className="bg-white rounded p-3 border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-muted-foreground">🥑 Fats</p>
                    <p className="text-2xl font-bold text-blue-600">{eatingPlanData.nutritionCalculations.macronutrients.fats.grams}g</p>
                    <p className="text-xs text-muted-foreground">{eatingPlanData.nutritionCalculations.macronutrients.fats.percentage} ({eatingPlanData.nutritionCalculations.macronutrients.fats.calories} cal)</p>
                  </div>
                </div>
              </div>

              {/* Hydration */}
              <div className="bg-white rounded p-3">
                <p className="text-sm font-medium text-muted-foreground mb-2">💧 Daily Hydration Target</p>
                <p className="text-lg font-bold text-blue-600">{eatingPlanData.nutritionCalculations.hydrationNeeds.liters} ({eatingPlanData.nutritionCalculations.hydrationNeeds.cups})</p>
              </div>
            </div>
          )}

          {/* Allergies & Medications - NEW! */}
          {(eatingPlanData?.allergyInfo?.hasAllergies || eatingPlanData?.medicationInfo?.hasMedications) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4">⚠️ Important Safety Information</h3>
              
              {eatingPlanData?.allergyInfo?.hasAllergies && (
                <div className="mb-4">
                  <h4 className="font-semibold text-destructive mb-2">Food Allergies</h4>
                  <div className="bg-white rounded p-3 mb-2">
                    <p className="text-sm font-medium mb-1">Allergies:</p>
                    <div className="flex flex-wrap gap-2">
                      {eatingPlanData.allergyInfo.allergyList.map((allergy, idx) => (
                        <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                  {eatingPlanData.allergyInfo.restrictions.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {eatingPlanData.allergyInfo.restrictions.map((restriction, idx) => (
                        <li key={idx} className="flex items-start">
                          <XCircleIcon className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                          <span>{restriction}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {eatingPlanData?.medicationInfo?.hasMedications && eatingPlanData.medicationInfo.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-accent-foreground mb-2">Medication-Food Interactions</h4>
                  <div className="bg-white rounded p-3 mb-2">
                    <p className="text-sm font-medium mb-1">Current Medications:</p>
                    <div className="flex flex-wrap gap-2">
                      {eatingPlanData.medicationInfo.medicationNames.map((med, idx) => (
                        <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {eatingPlanData.medicationInfo.warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start">
                        <ExclamationTriangleIcon className="h-4 w-4 text-accent-foreground mr-2 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Eating Plan Overview */}
          <div className="bg-primary/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">
              {eatingPlanData?.eatingPlan?.planName || 'Personalized Eating Plan'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-muted-foreground mb-2">Goals</h4>
                <ul className="space-y-1">
                  {(eatingPlanData?.eatingPlan?.goals || []).map((goal, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground mb-2">Restrictions</h4>
                <ul className="space-y-1">
                  {(eatingPlanData?.eatingPlan?.restrictions || []).map((restriction, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center">
                      <XCircleIcon className="h-4 w-4 text-destructive mr-2" />
                      {restriction}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Food Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Foods to Eat */}
            <div className="bg-primary/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-primary mr-2" />
                Foods to Eat
              </h3>
              <ul className="space-y-2">
                {(eatingPlanData?.eatingPlan?.foodsToEat || []).map((food, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>{food}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Foods to Avoid */}
            <div className="bg-destructive/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center">
                <XCircleIcon className="h-5 w-5 text-destructive mr-2" />
                Foods to Avoid
              </h3>
              <ul className="space-y-2">
                {(eatingPlanData?.eatingPlan?.foodsToAvoid || []).map((food, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <XCircleIcon className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                    <span>{food}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Weekly Meal Plan */}
          <div className="bg-primary-foreground border border-border/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Weekly Meal Plan</h3>
            <div className="space-y-4">
              {Object.entries(eatingPlanData?.eatingPlan?.weeklyMealPlan || {}).map(([day, meals]) => (
                <div key={day} className="border border-border/30 rounded-lg p-4">
                  <h4 className="font-semibold text-muted-foreground mb-3 capitalize">{day}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Breakfast</p>
                      <p className="text-sm text-muted-foreground">{meals.breakfast}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Lunch</p>
                      <p className="text-sm text-muted-foreground">{meals.lunch}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Dinner</p>
                      <p className="text-sm text-muted-foreground">{meals.dinner}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Snack</p>
                      <p className="text-sm text-muted-foreground">{meals.snack}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nutritional Guidelines */}
          <div className="bg-secondary/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Nutritional Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(eatingPlanData?.eatingPlan?.nutritionalGuidelines || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-sm text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lifestyle Recommendations */}
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Lifestyle Recommendations</h3>
            <ul className="space-y-2">
              {(eatingPlanData?.eatingPlan?.lifestyleRecommendations || []).map((recommendation, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="bg-muted/20 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Generated on {new Date(eatingPlanData?.generatedAt || new Date()).toLocaleDateString()} by {eatingPlanData?.generatedBy || 'System'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This eating plan is personalized based on your current vital signs and medical conditions. 
              Please consult with your healthcare provider before making significant dietary changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableEatingPlan;
