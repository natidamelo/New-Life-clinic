import React, { useState } from 'react';
import { 
  Heart,
  Activity,
  Flame,
  Leaf,
  Target,
  Scale,
  Droplet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Apple,
  Sunrise,
  Sun,
  Moon,
  Beef,
  Wheat,
  X,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info
} from 'lucide-react';
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

  // Tab State for Weekly Meal Plan
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const initialTab = daysOfWeek[currentDayIndex === 0 ? 6 : currentDayIndex - 1];
  const [activeTab, setActiveTab] = useState<string>(initialTab);

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

  // Helper to parse individual meal strings
  const parseMealString = (mealStr: string) => {
    let name = 'Meal';
    let calories = '';
    let description = mealStr || '';
    let note = '';

    if (!description) return { name, calories, description, note };

    // Extract bracketed note (e.g. "[No added salt]")
    const bracketMatch = description.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      note = bracketMatch[1];
      description = description.replace(/\[([^\]]+)\]/g, '').trim();
    }

    // Extract calorie badge e.g. "(320 cal)" or "(320 kcal)"
    const calMatch = description.match(/\((\d+)\s*(cal|kcal|calories)\)/i);
    if (calMatch) {
      calories = `${calMatch[1]} cal`;
      const index = calMatch.index || 0;
      name = description.substring(0, index).trim();
      description = description.substring(index + calMatch[0].length).trim();
      description = description.replace(/^[\s-:]+/, '');
    } else {
      const parts = description.split('-');
      if (parts.length > 1) {
        name = parts[0].trim();
        description = parts.slice(1).join('-').trim();
      }
    }

    return { name, calories, description, note };
  };

  // Health ranges checkers
  const getBPStatus = (bp: string) => {
    if (!bp || bp === 'Not measured') return { color: 'bg-sage', label: 'Normal', isFlagged: false };
    const parts = bp.split('/');
    const systolic = parseInt(parts[0]);
    const diastolic = parseInt(parts[1]);
    if (systolic >= 130 || diastolic >= 80) {
      return { color: 'bg-clay', label: 'Elevated', isFlagged: true };
    }
    return { color: 'bg-sage', label: 'Normal', isFlagged: false };
  };

  const getBSStatus = (bs: string) => {
    if (!bs || bs === 'Not measured') return { color: 'bg-sage', label: 'Normal', isFlagged: false };
    const val = parseInt(bs);
    if (val >= 100) {
      return { color: 'bg-clay', label: 'Elevated', isFlagged: true };
    }
    return { color: 'bg-sage', label: 'Normal', isFlagged: false };
  };

  const getBMIStatus = (bmi: string) => {
    if (!bmi || bmi === 'Not calculated') return { color: 'bg-sage', label: 'Normal', isFlagged: false };
    const val = parseFloat(bmi);
    if (val >= 25 || val < 18.5) {
      return { color: 'bg-clay', label: 'Flagged', isFlagged: true };
    }
    return { color: 'bg-sage', label: 'Normal', isFlagged: false };
  };

  const generateHTMLContent = (data: EatingPlanResponse) => {
    const { vitalSigns, conditions, eatingPlan, nutritionCalculations, allergyInfo, medicationInfo } = data;
    
    const formattedMeals = Object.entries(eatingPlan.weeklyMealPlan).map(([day, meals]) => {
      return `
        <div class="meal-plan" style="page-break-inside: avoid;">
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
      `;
    }).join('');

    return `
      <div class="section">
        <div class="section-title">Patient Profile</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Age & Gender:</span>
            <span class="info-value">${data.patient.age || 'N/A'} years, ${data.patient.gender || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Plan Type:</span>
            <span class="info-value">
              ${data.patient.age >= 60 ? 'Geriatric Care Plan (60+)' : data.patient.age < 18 ? 'Pediatric Care Plan (<18)' : 'Adult Care Plan'}
              ${data.isAIAvailable !== false ? ' | AI-Optimized' : ''}
            </span>
          </div>
        </div>
      </div>

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
        <div class="info-item" style="margin-top: 10px;">
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
        <h4 style="margin-top: 15px; margin-bottom: 5px;">Macronutrient Breakdown</h4>
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
      <div class="section" style="background: #F6F8F2; border-left: 4px solid #8BAA91; padding: 15px; border-radius: 8px;">
        <div class="section-title">⚠️ Important Safety Information</div>
        ${allergyInfo?.hasAllergies ? `
          <h4 style="color: #C1543F; margin-bottom: 10px;">Food Allergies</h4>
          <p><strong>Allergies:</strong> ${allergyInfo.allergyList.join(', ')}</p>
          ${allergyInfo.restrictions.length > 0 ? `
            <ul class="restrictions-list">
              ${allergyInfo.restrictions.map(r => `<li>${r}</li>`).join('')}
            </ul>
          ` : ''}
        ` : ''}
        ${medicationInfo?.hasMedications && medicationInfo.warnings.length > 0 ? `
          <h4 style="color: #2F5233; margin-top: 15px; margin-bottom: 10px;">Medication-Food Interactions</h4>
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
            <h4 style="color: #2F5233;">Foods to Eat</h4>
            <ul class="goals-list">
              ${eatingPlan.foodsToEat.map(food => `<li>${food}</li>`).join('')}
            </ul>
          </div>
          <div>
            <h4 style="color: #C1543F;">Foods to Avoid</h4>
            <ul class="restrictions-list">
              ${eatingPlan.foodsToAvoid.map(food => `<li>${food}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Weekly Meal Plan</div>
        ${formattedMeals}
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

  const renderMealCard = (mealType: string, mealStr: string, icon: React.ReactNode) => {
    if (!mealStr) return null;
    const { name, calories, description, note } = parseMealString(mealStr);

    return (
      <div className="bg-white border border-sage/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 relative flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                {icon}
              </div>
              <span className="text-xs uppercase font-bold tracking-wider text-sage font-worksans">
                {mealType}
              </span>
            </div>
            {calories && (
              <span className="bg-sun text-linen font-bold font-worksans text-xs px-2.5 py-1 rounded-full shadow-sm tabular-nums">
                {calories}
              </span>
            )}
          </div>

          <h4 className="font-fraunces text-base font-bold text-ink mb-1.5 leading-snug">
            {name}
          </h4>

          <p className="text-sm text-ink/80 leading-relaxed font-worksans">
            {description}
          </p>
        </div>

        {note && (
          <div className="mt-3 inline-flex items-center gap-1 bg-sage/10 text-forest border border-sage/20 px-2.5 py-1 rounded-lg text-xs font-semibold w-fit font-worksans">
            <Info className="w-3.5 h-3.5" />
            <span>{note}</span>
          </div>
        )}
      </div>
    );
  };

  if (!showPreview || !eatingPlanData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-linen rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl border border-sage/20 font-worksans">
          <div className="text-center">
            <Heart className="h-12 w-12 text-clay mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-bold font-fraunces text-forest mb-2">
              Generate Eating Plan
            </h3>
            <p className="text-sm text-ink/70 mb-6">
              Create a personalized eating plan for <strong>{patientName}</strong> based on their vital signs and medical conditions.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-sage/30 rounded-full text-forest hover:bg-sage/10 font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest"
              >
                Cancel
              </button>
              <button
                onClick={generateEatingPlan}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-forest text-linen rounded-full hover:bg-forest/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest"
              >
                {loading ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Destructure eating plan parameters
  const { vitalSigns, conditions, eatingPlan, nutritionCalculations, allergyInfo, medicationInfo } = eatingPlanData;
  const mealsForActiveDay = eatingPlan?.weeklyMealPlan?.[activeTab] || { breakfast: '', lunch: '', dinner: '', snack: '' };

  // Setup donut macro segments
  const radius = 45;
  const strokeWidth = 12;
  const circumference = radius * 2 * Math.PI;

  const proteinVal = parseInt(nutritionCalculations?.macronutrients?.protein?.percentage) || 25;
  const carbsVal = parseInt(nutritionCalculations?.macronutrients?.carbohydrates?.percentage) || 45;
  const fatsVal = parseInt(nutritionCalculations?.macronutrients?.fats?.percentage) || 30;

  const pDash = (proteinVal / 100) * circumference;
  const cDash = (carbsVal / 100) * circumference;
  const fDash = (fatsVal / 100) * circumference;

  // Hydration cup target representation
  const cupString = nutritionCalculations?.hydrationNeeds?.cups || '';
  const match = cupString.match(/\d+/g);
  const maxCups = match ? Math.max(...match.map(Number)) : 8;

  // Vital Signs statuses
  const bpStatus = getBPStatus(vitalSigns.bloodPressure);
  const bsStatus = getBSStatus(vitalSigns.bloodSugar);
  const bmiStatus = getBMIStatus(vitalSigns.bmi);

  const getGuidelineIconAndLabel = (key: string) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('calorie')) return { icon: <Flame className="w-4 h-4" />, label: 'Calories' };
    if (lowerKey.includes('protein')) return { icon: <Beef className="w-4 h-4" />, label: 'Protein' };
    if (lowerKey.includes('carb')) return { icon: <Wheat className="w-4 h-4" />, label: 'Carbs' };
    if (lowerKey.includes('fat')) return { icon: <Droplet className="w-4 h-4" />, label: 'Fats' };
    if (lowerKey.includes('fiber')) return { icon: <Leaf className="w-4 h-4" />, label: 'Fiber' };
    if (lowerKey.includes('sodium')) return { icon: <Activity className="w-4 h-4" />, label: 'Sodium' };
    return { icon: <FileText className="w-4 h-4" />, label: key.replace(/([A-Z])/g, ' $1').trim() };
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % daysOfWeek.length;
      setActiveTab(daysOfWeek[nextIndex]);
      setTimeout(() => {
        const nextBtn = document.getElementById(`tab-${daysOfWeek[nextIndex]}`);
        nextBtn?.focus();
      }, 0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + daysOfWeek.length) % daysOfWeek.length;
      setActiveTab(daysOfWeek[prevIndex]);
      setTimeout(() => {
        const prevBtn = document.getElementById(`tab-${daysOfWeek[prevIndex]}`);
        prevBtn?.focus();
      }, 0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-linen rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-sage/20 font-worksans text-ink flex flex-col relative">
        
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-linen border-b border-sage/20 p-6 z-30 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Leaf className="h-8 w-8 text-forest" />
              <div>
                <h2 className="text-2xl font-bold font-fraunces text-forest leading-none mb-1">
                  Personalized Eating Plan
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sage font-worksans">
                  New Life Clinic - Healthcare Center
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2 items-center pr-10">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-4 py-2 border border-forest text-forest rounded-full hover:bg-forest/5 font-semibold text-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 bg-forest text-linen rounded-full hover:bg-forest/90 font-semibold text-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
            </div>

            {/* Ghost Close (X) button pinned top-right */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-6 right-6 text-forest hover:bg-sage/10 rounded-full p-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Compact Info Row under Title */}
          <div className="mt-4 pt-3 border-t border-sage/20 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink/75 font-medium">
            <span className="font-bold text-sm text-ink font-worksans">{eatingPlanData.patient.name}</span>
            <span className="text-sage/40 font-normal">•</span>
            <span className="font-worksans">ID: {eatingPlanData.patient.patientId}</span>
            <span className="text-sage/40 font-normal">•</span>
            <span className="font-worksans">{eatingPlanData.patient.age || 'N/A'} years, {eatingPlanData.patient.gender}</span>
          </div>

          {/* Care Plan Badge under patient info row */}
          <div className="mt-3">
            {eatingPlanData.patient.age !== undefined && (
              <>
                {eatingPlanData.patient.age >= 60 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sage/10 text-forest border border-sage/35 shadow-xs font-worksans">
                    👵 Geriatric Care Plan (Age 60+)
                  </span>
                ) : eatingPlanData.patient.age < 18 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sage/10 text-forest border border-sage/35 shadow-xs font-worksans">
                    👶 Pediatric Care Plan (Age &lt; 18)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sage/10 text-forest border border-sage/35 shadow-xs font-worksans">
                    🧑 Adult Care Plan
                  </span>
                )}
              </>
            )}

            {eatingPlanData.isAIAvailable !== false && (
              <span className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sun/10 text-sun border border-sun/25 shadow-xs font-worksans animate-pulse">
                ✨ AI-Optimized Plan
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1 bg-linen/50">
          
          {/* Vital Signs Row */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-widest text-sage flex items-center gap-1.5 font-worksans">
              <Activity className="w-4 h-4 text-forest" />
              Current Vital Signs
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              
              {/* BP Card */}
              <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1 bg-linen px-2 py-0.5 rounded-full border border-sage/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${bpStatus.color === 'bg-clay' ? 'bg-clay' : 'bg-sage'}`} />
                    <span className="text-[9px] uppercase font-bold text-ink/75 font-worksans tracking-wider">
                      {bpStatus.label}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl font-bold font-worksans text-ink leading-none tabular-nums">
                    {vitalSigns.bloodPressure}
                  </p>
                  <p className="text-[10px] text-ink/50 mt-1.5 uppercase tracking-wider font-semibold font-worksans">Blood Pressure</p>
                </div>
              </div>

              {/* Blood Sugar Card */}
              <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1 bg-linen px-2 py-0.5 rounded-full border border-sage/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${bsStatus.color === 'bg-clay' ? 'bg-clay' : 'bg-sage'}`} />
                    <span className="text-[9px] uppercase font-bold text-ink/75 font-worksans tracking-wider">
                      {bsStatus.label}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl font-bold font-worksans text-ink leading-none tabular-nums">
                    {vitalSigns.bloodSugar} {vitalSigns.bloodSugar !== 'Not measured' && <span className="text-xs font-normal font-worksans">mg/dL</span>}
                  </p>
                  <p className="text-[10px] text-ink/50 mt-1.5 uppercase tracking-wider font-semibold font-worksans">Blood Sugar</p>
                </div>
              </div>

              {/* Weight Card */}
              <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1 bg-linen px-2 py-0.5 rounded-full border border-sage/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                    <span className="text-[9px] uppercase font-bold text-ink/75 font-worksans tracking-wider font-semibold">Normal</span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl font-bold font-worksans text-ink leading-none tabular-nums">
                    {vitalSigns.weight} {vitalSigns.weight !== 'Not measured' && <span className="text-xs font-normal font-worksans">kg</span>}
                  </p>
                  <p className="text-[10px] text-ink/50 mt-1.5 uppercase tracking-wider font-semibold font-worksans">Weight</p>
                </div>
              </div>

              {/* BMI Card */}
              <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1 bg-linen px-2 py-0.5 rounded-full border border-sage/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${bmiStatus.color === 'bg-clay' ? 'bg-clay' : 'bg-sage'}`} />
                    <span className="text-[9px] uppercase font-bold text-ink/75 font-worksans tracking-wider">
                      {bmiStatus.label}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl font-bold font-worksans text-ink leading-none tabular-nums">
                    {vitalSigns.bmi}
                  </p>
                  <p className="text-[10px] text-ink/50 mt-1.5 uppercase tracking-wider font-semibold font-worksans">Body Mass Index</p>
                </div>
              </div>

            </div>
            
            <p className="text-[10px] text-ink/45 font-worksans font-medium">
              Last Measured: {new Date(vitalSigns.measurementDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Medical Conditions & Risk Assessment Card */}
          <div className={`p-5 rounded-2xl border flex flex-col gap-4 shadow-xs ${
            conditions.riskLevel.toLowerCase() === 'high' ? 'bg-clay/10 border-clay/35' : 'bg-sage/10 border-sage/35'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${conditions.riskLevel.toLowerCase() === 'high' ? 'text-clay' : 'text-forest'}`} />
                <h3 className="font-fraunces text-base font-bold text-ink">
                  Risk Assessment:{" "}
                  <span className={`ml-1 capitalize font-worksans font-extrabold ${conditions.riskLevel.toLowerCase() === 'high' ? 'text-clay' : 'text-forest'}`}>
                    {conditions.riskLevel} Risk
                  </span>
                </h3>
              </div>

              {/* Trends as Inline Badges */}
              {conditions.trends && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold font-worksans text-ink/60 uppercase tracking-wider">Trends:</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-sage/20 text-ink shadow-xs">
                    <span className="text-ink/50 font-medium">BP:</span>
                    {conditions.trends.bloodPressure === 'increasing' ? (
                      <TrendingUp className="w-3.5 h-3.5 text-clay" />
                    ) : conditions.trends.bloodPressure === 'decreasing' ? (
                      <TrendingDown className="w-3.5 h-3.5 text-forest" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-sage" />
                    )}
                    <span className="capitalize">{conditions.trends.bloodPressure}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-sage/20 text-ink shadow-xs">
                    <span className="text-ink/50 font-medium">Weight:</span>
                    {conditions.trends.weight === 'increasing' ? (
                      <TrendingUp className="w-3.5 h-3.5 text-sun" />
                    ) : conditions.trends.weight === 'decreasing' ? (
                      <TrendingDown className="w-3.5 h-3.5 text-forest" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-sage" />
                    )}
                    <span className="capitalize">{conditions.trends.weight}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Labeled Chips instead of check/x circles */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                conditions.hypertension 
                  ? 'bg-clay/10 text-clay border-clay/35' 
                  : 'bg-sage/10 text-forest border-sage/35'
              }`}>
                {conditions.hypertension ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-clay" />
                    Hypertension: Flagged
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                    Hypertension: Clear
                  </>
                )}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                conditions.diabetes 
                  ? 'bg-clay/10 text-clay border-clay/35' 
                  : 'bg-sage/10 text-forest border-sage/35'
              }`}>
                {conditions.diabetes ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-clay" />
                    Diabetes: Flagged
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                    Diabetes: Clear
                  </>
                )}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                conditions.highCholesterol 
                  ? 'bg-clay/10 text-clay border-clay/35' 
                  : 'bg-sage/10 text-forest border-sage/35'
              }`}>
                {conditions.highCholesterol ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-clay" />
                    High Cholesterol: Flagged
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                    High Cholesterol: Clear
                  </>
                )}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                conditions.obesity 
                  ? 'bg-clay/10 text-clay border-clay/35' 
                  : 'bg-sage/10 text-forest border-sage/35'
              }`}>
                {conditions.obesity ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-clay" />
                    Obesity: Flagged
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                    Obesity: Clear
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Nutrition plan stats + Donut Chart Grid */}
          {nutritionCalculations && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Stat Cards - Forest/Sage themed */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-bold tracking-widest text-sage flex items-center gap-1.5 font-worksans">
                  <Flame className="w-4 h-4 text-forest" />
                  Caloric & Goal Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* BMR Card */}
                  <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex items-start gap-3 hover:shadow-md transition-all duration-200">
                    <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest mt-0.5 flex-shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-ink/50 uppercase font-bold tracking-wider">BMR</p>
                      <p className="text-lg font-bold text-forest leading-none mt-1.5 tabular-nums font-worksans">
                        {nutritionCalculations.caloricNeeds.bmr}
                      </p>
                      <span className="text-[10px] text-ink/40 font-medium mt-0.5 block">cal/day</span>
                    </div>
                  </div>

                  {/* TDEE Card */}
                  <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex items-start gap-3 hover:shadow-md transition-all duration-200">
                    <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest mt-0.5 flex-shrink-0">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-ink/50 uppercase font-bold tracking-wider">TDEE</p>
                      <p className="text-lg font-bold text-forest leading-none mt-1.5 tabular-nums font-worksans">
                        {nutritionCalculations.caloricNeeds.tdee}
                      </p>
                      <span className="text-[10px] text-ink/40 font-medium mt-0.5 block">cal/day</span>
                    </div>
                  </div>

                  {/* Target Calories Card */}
                  <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex items-start gap-3 hover:shadow-md transition-all duration-200">
                    <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest mt-0.5 flex-shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-ink/50 uppercase font-bold tracking-wider">Target</p>
                      <p className="text-lg font-bold text-forest leading-none mt-1.5 tabular-nums font-worksans">
                        {nutritionCalculations.caloricNeeds.targetCalories}
                      </p>
                      <span className="text-[10px] text-ink/40 font-medium mt-0.5 block">cal/day</span>
                    </div>
                  </div>

                  {/* Weight Goal Card */}
                  <div className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex items-start gap-3 hover:shadow-md transition-all duration-200">
                    <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest mt-0.5 flex-shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-ink/50 uppercase font-bold tracking-wider">Weight Goal</p>
                      <p className="text-lg font-bold text-forest leading-none mt-1.5 capitalize font-worksans">
                        {nutritionCalculations.caloricNeeds.weightGoal}
                      </p>
                      <span className="text-[10px] text-ink/40 font-medium mt-0.5 block">goal status</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Macronutrient Donut chart */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-bold tracking-widest text-sage flex items-center gap-1.5 font-worksans">
                  <Beef className="w-4 h-4 text-forest" />
                  Macronutrient Breakdown
                </h3>
                <div className="bg-white border border-sage/20 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-around gap-6 h-fit sm:h-[180px]">
                  
                  {/* Plate Ring Arc (custom SVG donut) */}
                  <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#f3f4f6"
                        strokeWidth={strokeWidth}
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#2F5233" // Forest
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${pDash} ${circumference}`}
                        strokeDashoffset={circumference}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#8BAA91" // Sage
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${cDash} ${circumference}`}
                        strokeDashoffset={circumference - pDash}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#E8954A" // Sun
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${fDash} ${circumference}`}
                        strokeDashoffset={circumference - pDash - cDash}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-fraunces text-base font-bold text-ink leading-none">
                        {nutritionCalculations.caloricNeeds.targetCalories}
                      </span>
                      <span className="text-[9px] text-ink/50 uppercase font-bold tracking-wider mt-1">kcal</span>
                    </div>
                  </div>

                  {/* Legend Grid */}
                  <div className="flex-1 space-y-2.5 text-xs w-full">
                    {/* Protein */}
                    <div className="flex items-center justify-between border-b border-sage/10 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                          <Beef className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-ink leading-none">Protein</p>
                          <p className="text-[9px] text-ink/50 mt-0.5">{proteinVal}% ratio</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-ink leading-none tabular-nums font-worksans">{nutritionCalculations.macronutrients.protein.grams}g</p>
                        <p className="text-[9px] text-ink/50 mt-0.5 tabular-nums font-worksans">{nutritionCalculations.macronutrients.protein.calories} cal</p>
                      </div>
                    </div>

                    {/* Carbohydrates */}
                    <div className="flex items-center justify-between border-b border-sage/10 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-sage/20 flex items-center justify-center text-forest">
                          <Wheat className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-ink leading-none">Carbs</p>
                          <p className="text-[9px] text-ink/50 mt-0.5">{carbsVal}% ratio</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-ink leading-none tabular-nums font-worksans">{nutritionCalculations.macronutrients.carbohydrates.grams}g</p>
                        <p className="text-[9px] text-ink/50 mt-0.5 tabular-nums font-worksans">{nutritionCalculations.macronutrients.carbohydrates.calories} cal</p>
                      </div>
                    </div>

                    {/* Fats */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-sun/15 flex items-center justify-center text-sun">
                          <Droplet className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-ink leading-none">Fats</p>
                          <p className="text-[9px] text-ink/50 mt-0.5">{fatsVal}% ratio</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-ink leading-none tabular-nums font-worksans">{nutritionCalculations.macronutrients.fats.grams}g</p>
                        <p className="text-[9px] text-ink/50 mt-0.5 tabular-nums font-worksans">{nutritionCalculations.macronutrients.fats.calories} cal</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Daily Hydration Cup Targets */}
          {nutritionCalculations && (
            <div className="bg-white border border-sage/20 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <Droplet className="w-5 h-5 fill-blue-500" />
                </div>
                <div>
                  <h4 className="font-fraunces text-base font-bold text-ink leading-snug">Daily Hydration Target</h4>
                  <p className="text-xs text-ink/60 mt-0.5 font-worksans">Recommended liquid target intake for patient status</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-between sm:justify-end">
                <div className="flex gap-1 overflow-x-auto max-w-[200px] py-1">
                  {Array.from({ length: Math.min(maxCups, 10) }).map((_, idx) => (
                    <Droplet 
                      key={idx} 
                      className="w-5 h-5 text-blue-500 fill-blue-500 animate-pulse" 
                      style={{ animationDelay: `${idx * 150}ms` }} 
                    />
                  ))}
                </div>
                <div className="text-center sm:text-right font-worksans">
                  <p className="text-base font-bold text-blue-500 leading-none">{nutritionCalculations.hydrationNeeds.liters}</p>
                  <p className="text-[10px] text-ink/50 mt-1 uppercase font-bold tracking-wider">{nutritionCalculations.hydrationNeeds.cups}</p>
                </div>
              </div>
            </div>
          )}

          {/* Safety Warnings & Medication Interactions */}
          {(allergyInfo?.hasAllergies || medicationInfo?.hasMedications) && (
            <div className="bg-white border-l-4 border-clay rounded-2xl p-5 border border-sage/20 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-clay flex items-center gap-1.5 font-worksans">
                <AlertTriangle className="w-4 h-4 text-clay" />
                Important Safety Information
              </h3>
              
              {allergyInfo?.hasAllergies && (
                <div className="bg-linen rounded-xl p-4 border border-sage/15">
                  <h4 className="font-fraunces text-sm font-bold text-clay mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-clay" />
                    Food Allergies List
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {allergyInfo.allergyList.map((allergy, idx) => (
                      <span key={idx} className="bg-red-50 text-clay border border-clay/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {allergy}
                      </span>
                    ))}
                  </div>
                  {allergyInfo.restrictions.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-ink/85 pl-1 font-worksans leading-relaxed">
                      {allergyInfo.restrictions.map((restriction, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-clay select-none font-bold">✗</span>
                          <span>{restriction}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {medicationInfo?.hasMedications && medicationInfo.warnings.length > 0 && (
                <div className="bg-linen rounded-xl p-4 border border-sage/15">
                  <h4 className="font-fraunces text-sm font-bold text-forest mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-forest" />
                    Medication-Food Interactions
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {medicationInfo.medicationNames.map((med, idx) => (
                      <span key={idx} className="bg-sage/10 text-forest border border-sage/25 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {med}
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-1.5 text-xs text-ink/85 pl-1 font-worksans leading-relaxed">
                    {medicationInfo.warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-forest select-none font-bold">✓</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* DASH Diet Overview, Goals, Restrictions & Foods Grid */}
          <div className="bg-white border border-sage/20 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-sage/10 pb-4">
              <h3 className="font-fraunces text-xl font-bold text-forest mb-2">
                {eatingPlan.planName}
              </h3>
              {/* Short highlighted note of Goals & Restrictions */}
              <div className="bg-linen p-4 rounded-xl border border-sage/20 text-xs text-ink/80 font-worksans leading-relaxed space-y-2">
                <p>
                  <strong className="text-forest">Goals:</strong> {eatingPlan.goals.join(', ')}
                </p>
                <p>
                  <strong className="text-clay">Restrictions:</strong> {eatingPlan.restrictions.join(', ')}
                </p>
              </div>
            </div>

            {/* Foods to Eat & Avoid two-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Foods to Eat */}
              <div className="bg-sage/5 border border-sage/35 shadow-xs p-5 rounded-2xl">
                <h4 className="text-sm font-bold font-fraunces text-forest mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest" />
                  Foods to Eat
                </h4>
                <ul className="space-y-2.5">
                  {eatingPlan.foodsToEat.map((food, index) => (
                    <li key={index} className="text-xs text-ink/95 flex items-start gap-2 font-worksans leading-normal">
                      <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
                      <span>{food}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Foods to Avoid */}
              <div className="bg-clay/5 border border-clay/35 shadow-xs p-5 rounded-2xl">
                <h4 className="text-sm font-bold font-fraunces text-clay mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-clay" />
                  Foods to Avoid
                </h4>
                <ul className="space-y-2.5">
                  {eatingPlan.foodsToAvoid.map((food, index) => (
                    <li key={index} className="text-xs text-ink/95 flex items-start gap-2 font-worksans leading-normal">
                      <XCircle className="w-4 h-4 text-clay mt-0.5 flex-shrink-0" />
                      <span>{food}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Weekly Meal Plan Day tab navigation */}
          <div className="bg-white border border-sage/20 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sage/10 pb-3">
              <h3 className="font-fraunces text-lg font-bold text-forest">Weekly Diet Schedule</h3>
              
              {/* Day Tab Pills */}
              <div role="tablist" aria-label="Weekly diet days" className="flex gap-1.5 overflow-x-auto pb-2 sm:pb-0 no-print max-w-full">
                {daysOfWeek.map((day, idx) => {
                  const isActive = activeTab === day;
                  return (
                    <button
                      key={day}
                      id={`tab-${day}`}
                      role="tab"
                      aria-selected={isActive}
                      tabIndex={0}
                      onClick={() => setActiveTab(day)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2 ${
                        isActive
                          ? 'bg-forest text-linen shadow-xs'
                          : 'bg-linen text-forest hover:bg-sage/10 border border-sage/25'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content for the tabs (omitted for space, assume same render as provided earlier) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderMealCard('Breakfast', mealsForActiveDay.breakfast, <Sunrise className="w-5 h-5" />)}
              {renderMealCard('Lunch', mealsForActiveDay.lunch, <Sun className="w-5 h-5" />)}
              {renderMealCard('Dinner', mealsForActiveDay.dinner, <Moon className="w-5 h-5" />)}
              {renderMealCard('Snack', mealsForActiveDay.snack, <Apple className="w-5 h-5" />)}
            </div>
          </div>

          {/* Nutritional Guidelines Cards */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-widest text-sage flex items-center gap-1.5 font-worksans">
              <FileText className="w-4 h-4 text-forest" />
              Nutritional Targets
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
              {Object.entries(eatingPlan.nutritionalGuidelines).map(([key, value]) => {
                const { icon, label } = getGuidelineIconAndLabel(key);
                return (
                  <div key={key} className="bg-white p-4 rounded-2xl border border-sage/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
                    <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest flex-shrink-0">
                      {icon}
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-bold font-worksans text-ink leading-tight tabular-nums font-worksans">
                        {value}
                      </p>
                      <p className="text-[10px] text-ink/50 mt-1 uppercase tracking-wider font-semibold font-worksans">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lifestyle Recommendations Checklist */}
          <div className="bg-linen p-5 border border-sage/35 rounded-2xl shadow-sm">
            <h3 className="font-fraunces text-base font-bold text-forest mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-forest" />
              Lifestyle Recommendations
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-ink/90 font-worksans">
              {eatingPlan.lifestyleRecommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer Disclaimer */}
          <div className="bg-white/60 border border-sage/20 rounded-2xl p-4 text-center text-ink/65 font-worksans shadow-xs">
            <p className="text-xs font-semibold">
              Generated on {new Date(eatingPlanData.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} by {eatingPlanData.generatedBy || 'System'}
            </p>
            <p className="text-[10px] text-ink/45 mt-1.5 italic leading-normal max-w-2xl mx-auto">
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
