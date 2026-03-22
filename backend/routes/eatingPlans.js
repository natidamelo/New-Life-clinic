const express = require('express');
const router = express.Router();
const VitalSigns = require('../models/VitalSigns');
const Patient = require('../models/Patient');
const { auth } = require('../middleware/auth');

// Generate personalized eating plan based on patient's vital signs
router.post('/generate/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { planType = 'dash' } = req.body; // DASH, Mediterranean, etc.

    console.log('🍽️ [Eating Plan] Generating plan for patient:', patientId);

    // Get comprehensive patient information
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Get latest vital signs (and recent history for trends)
    const latestVitals = await VitalSigns.findOne({
      patientId: patientId,
      isActive: true
    }).sort({ measurementDate: -1 });

    if (!latestVitals) {
      return res.status(404).json({ 
        success: false, 
        message: 'No vital signs found for this patient' 
      });
    }

    // Get recent vital signs history (last 30 days) for trend analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentVitals = await VitalSigns.find({
      patientId: patientId,
      isActive: true,
      measurementDate: { $gte: thirtyDaysAgo }
    }).sort({ measurementDate: -1 }).limit(10);

    console.log('📊 [Eating Plan] Patient data:', {
      name: `${patient.firstName} ${patient.lastName}`,
      age: patient.age,
      gender: patient.gender,
      diabetic: patient.diabetic,
      allergiesCount: patient.allergies?.length || 0,
      medicalHistoryCount: patient.medicalHistory?.length || 0,
      medicationsCount: patient.medications?.length || 0,
      recentVitalsCount: recentVitals.length
    });

    // Analyze patient's condition comprehensively
    const conditions = analyzePatientCondition(patient, latestVitals, recentVitals);
    
    // Extract allergy information
    const allergyInfo = extractAllergyInfo(patient);
    
    // Extract medication information for potential interactions
    const medicationInfo = extractMedicationInfo(patient);
    
    // Calculate caloric and hydration needs
    const caloricNeeds = calculateCaloricNeeds(patient, latestVitals);
    const hydrationNeeds = calculateHydrationNeeds(latestVitals.weight || 70);
    
    // Generate comprehensive personalized eating plan
    const eatingPlan = generateEatingPlan(
      patient, 
      latestVitals, 
      conditions, 
      planType,
      allergyInfo,
      medicationInfo,
      caloricNeeds
    );

    res.json({
      success: true,
      data: {
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          age: patient.age,
          gender: patient.gender,
          patientId: patient.patientId,
          diabetic: patient.diabetic,
          allergies: allergyInfo.allergyList,
          medications: medicationInfo.medicationNames
        },
        vitalSigns: {
          bloodPressure: latestVitals.systolic && latestVitals.diastolic ? 
            `${latestVitals.systolic}/${latestVitals.diastolic}` : 'Not measured',
          bloodSugar: latestVitals.bloodSugar || 'Not measured',
          weight: latestVitals.weight || 'Not measured',
          height: latestVitals.height || 'Not measured',
          bmi: latestVitals.bmi || 'Not calculated',
          pulse: latestVitals.pulse || 'Not measured',
          temperature: latestVitals.temperature || 'Not measured',
          measurementDate: latestVitals.measurementDate
        },
        conditions,
        allergyInfo,
        medicationInfo,
        nutritionCalculations: {
          caloricNeeds,
          hydrationNeeds,
          macronutrients: {
            protein: {
              grams: Math.round(caloricNeeds.targetCalories * 0.25 / 4),
              percentage: '25%',
              calories: Math.round(caloricNeeds.targetCalories * 0.25)
            },
            carbohydrates: {
              grams: Math.round(caloricNeeds.targetCalories * 0.45 / 4),
              percentage: conditions.diabetes ? '40%' : '45%',
              calories: Math.round(caloricNeeds.targetCalories * (conditions.diabetes ? 0.40 : 0.45))
            },
            fats: {
              grams: Math.round(caloricNeeds.targetCalories * 0.30 / 9),
              percentage: '30%',
              calories: Math.round(caloricNeeds.targetCalories * 0.30)
            }
          }
        },
        eatingPlan,
        generatedAt: new Date(),
        generatedBy: req.user.name
      }
    });

  } catch (error) {
    console.error('❌ [Eating Plan] Error generating plan:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating eating plan',
      error: error.message 
    });
  }
});

// Analyze patient's condition based on vital signs and medical history
function analyzePatientCondition(patient, latestVitals, recentVitals) {
  const conditions = {
    hypertension: false,
    diabetes: false,
    highCholesterol: false,
    obesity: false,
    overweight: false,
    underweight: false,
    preDiabetes: false,
    metabolicSyndrome: false,
    riskLevel: 'low',
    trends: {
      bloodPressure: 'stable',
      weight: 'stable',
      bloodSugar: 'stable'
    }
  };

  // Check patient's diabetic status from medical history
  if (patient.diabetic === true || patient.diabetic === 'yes') {
    conditions.diabetes = true;
    conditions.riskLevel = 'high';
  }

  // Check for hypertension from latest readings
  if (latestVitals.systolic && latestVitals.diastolic) {
    if (latestVitals.systolic >= 140 || latestVitals.diastolic >= 90) {
      conditions.hypertension = true;
      conditions.riskLevel = 'high';
    } else if (latestVitals.systolic >= 130 || latestVitals.diastolic >= 80) {
      conditions.hypertension = true;
      if (conditions.riskLevel === 'low') conditions.riskLevel = 'moderate';
    }
  }

  // Analyze blood pressure trends
  if (recentVitals.length >= 3) {
    const bpReadings = recentVitals
      .filter(v => v.systolic && v.diastolic)
      .slice(0, 5);
    
    if (bpReadings.length >= 3) {
      const avgRecent = (bpReadings[0].systolic + bpReadings[0].diastolic) / 2;
      const avgOlder = (bpReadings[bpReadings.length - 1].systolic + bpReadings[bpReadings.length - 1].diastolic) / 2;
      
      if (avgRecent > avgOlder + 5) {
        conditions.trends.bloodPressure = 'increasing';
      } else if (avgRecent < avgOlder - 5) {
        conditions.trends.bloodPressure = 'decreasing';
      }
    }
  }

  // Check for diabetes and pre-diabetes
  if (latestVitals.bloodSugar) {
    if (latestVitals.bloodSugar >= 126) {
      conditions.diabetes = true;
      conditions.riskLevel = 'high';
    } else if (latestVitals.bloodSugar >= 100 && latestVitals.bloodSugar < 126) {
      conditions.preDiabetes = true;
      if (conditions.riskLevel === 'low') conditions.riskLevel = 'moderate';
    }
  }

  // Check for obesity and weight categories
  if (latestVitals.bmi) {
    if (latestVitals.bmi >= 30) {
      conditions.obesity = true;
      conditions.riskLevel = 'high';
    } else if (latestVitals.bmi >= 25) {
      conditions.overweight = true;
      if (conditions.riskLevel === 'low') conditions.riskLevel = 'moderate';
    } else if (latestVitals.bmi < 18.5) {
      conditions.underweight = true;
      if (conditions.riskLevel === 'low') conditions.riskLevel = 'moderate';
    }
  }

  // Analyze weight trends
  if (recentVitals.length >= 3) {
    const weightReadings = recentVitals
      .filter(v => v.weight)
      .slice(0, 5);
    
    if (weightReadings.length >= 3) {
      const recentWeight = weightReadings[0].weight;
      const olderWeight = weightReadings[weightReadings.length - 1].weight;
      
      if (recentWeight > olderWeight + 2) {
        conditions.trends.weight = 'increasing';
      } else if (recentWeight < olderWeight - 2) {
        conditions.trends.weight = 'decreasing';
      }
    }
  }

  // Check for metabolic syndrome (3 or more criteria)
  let metabolicCriteria = 0;
  if (conditions.hypertension) metabolicCriteria++;
  if (conditions.preDiabetes || conditions.diabetes) metabolicCriteria++;
  if (conditions.obesity) metabolicCriteria++;
  if (latestVitals.bmi >= 30) metabolicCriteria++;
  
  if (metabolicCriteria >= 3) {
    conditions.metabolicSyndrome = true;
    conditions.riskLevel = 'high';
  }

  // High cholesterol: assume if patient has hypertension + diabetes or metabolic syndrome
  if ((conditions.hypertension && conditions.diabetes) || conditions.metabolicSyndrome) {
    conditions.highCholesterol = true;
  }

  // Check medical history for additional conditions
  if (patient.medicalHistory && Array.isArray(patient.medicalHistory)) {
    patient.medicalHistory.forEach(history => {
      const condition = (history.condition || history).toLowerCase();
      if (condition.includes('cholesterol') || condition.includes('hyperlipidemia')) {
        conditions.highCholesterol = true;
      }
      if (condition.includes('diabetes')) {
        conditions.diabetes = true;
      }
      if (condition.includes('hypertension') || condition.includes('blood pressure')) {
        conditions.hypertension = true;
      }
    });
  }

  return conditions;
}

// Extract allergy information from patient data
function extractAllergyInfo(patient) {
  const allergyInfo = {
    hasAllergies: false,
    allergyList: [],
    foodAllergies: [],
    restrictions: []
  };

  if (patient.allergies && Array.isArray(patient.allergies) && patient.allergies.length > 0) {
    allergyInfo.hasAllergies = true;
    
    patient.allergies.forEach(allergy => {
      const allergyText = typeof allergy === 'string' ? allergy : (allergy.allergen || allergy.name || '');
      allergyInfo.allergyList.push(allergyText);
      
      // Identify food allergies
      const foodAllergens = ['milk', 'dairy', 'egg', 'eggs', 'peanut', 'peanuts', 'tree nut', 'nuts', 
                            'soy', 'wheat', 'gluten', 'fish', 'shellfish', 'seafood', 'sesame'];
      
      const lowerAllergyText = allergyText.toLowerCase();
      foodAllergens.forEach(allergen => {
        if (lowerAllergyText.includes(allergen)) {
          allergyInfo.foodAllergies.push(allergyText);
          allergyInfo.restrictions.push(`Avoid all ${allergyText} and ${allergyText}-containing products`);
        }
      });
    });
  }

  return allergyInfo;
}

// Extract medication information for potential food interactions
function extractMedicationInfo(patient) {
  const medicationInfo = {
    hasMedications: false,
    medicationNames: [],
    foodInteractions: [],
    warnings: []
  };

  if (patient.medications && Array.isArray(patient.medications) && patient.medications.length > 0) {
    medicationInfo.hasMedications = true;
    
    patient.medications.forEach(medication => {
      const medName = typeof medication === 'string' ? medication : (medication.name || medication.medicationName || '');
      medicationInfo.medicationNames.push(medName);
      
      const lowerMedName = medName.toLowerCase();
      
      // Common medication-food interactions
      if (lowerMedName.includes('warfarin') || lowerMedName.includes('coumadin')) {
        medicationInfo.foodInteractions.push('Warfarin: Maintain consistent vitamin K intake');
        medicationInfo.warnings.push('Be consistent with green leafy vegetables intake');
      }
      
      if (lowerMedName.includes('metformin')) {
        medicationInfo.foodInteractions.push('Metformin: Take with meals to reduce GI upset');
        medicationInfo.warnings.push('Avoid excessive alcohol consumption');
      }
      
      if (lowerMedName.includes('statin') || lowerMedName.includes('atorvastatin') || lowerMedName.includes('simvastatin')) {
        medicationInfo.foodInteractions.push('Statins: Avoid grapefruit and grapefruit juice');
        medicationInfo.warnings.push('Do not consume grapefruit products');
      }
      
      if (lowerMedName.includes('lisinopril') || lowerMedName.includes('ace inhibitor')) {
        medicationInfo.foodInteractions.push('ACE Inhibitors: Monitor potassium intake');
        medicationInfo.warnings.push('Avoid excessive potassium-rich foods');
      }
      
      if (lowerMedName.includes('levothyroxine') || lowerMedName.includes('synthroid')) {
        medicationInfo.foodInteractions.push('Levothyroxine: Take on empty stomach, 30-60 min before breakfast');
        medicationInfo.warnings.push('Avoid soy, iron, and calcium supplements within 4 hours');
      }
    });
  }

  return medicationInfo;
}

// Calculate daily caloric needs based on patient data
function calculateCaloricNeeds(patient, latestVitals) {
  let bmr = 0; // Basal Metabolic Rate
  const weight = latestVitals.weight || 70; // kg
  const height = latestVitals.height || 170; // cm
  const age = patient.age || 30;
  const gender = (patient.gender || 'male').toLowerCase();
  
  // Harris-Benedict Equation
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  // Activity level multiplier (assuming sedentary to light activity for clinic patients)
  const activityMultiplier = 1.375; // Light exercise
  const tdee = Math.round(bmr * activityMultiplier); // Total Daily Energy Expenditure
  
  // Adjust based on weight goals
  let targetCalories = tdee;
  
  if (latestVitals.bmi) {
    if (latestVitals.bmi >= 30) {
      // Obesity: create 500 calorie deficit for 1 lb/week weight loss
      targetCalories = tdee - 500;
    } else if (latestVitals.bmi >= 25) {
      // Overweight: create 300 calorie deficit
      targetCalories = tdee - 300;
    } else if (latestVitals.bmi < 18.5) {
      // Underweight: create 300 calorie surplus
      targetCalories = tdee + 300;
    }
  }
  
  // Minimum calorie floors for safety
  const minCalories = gender === 'male' ? 1500 : 1200;
  targetCalories = Math.max(targetCalories, minCalories);
  
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    weightGoal: latestVitals.bmi >= 30 ? 'lose' : (latestVitals.bmi < 18.5 ? 'gain' : 'maintain')
  };
}

// Calculate hydration needs based on weight
function calculateHydrationNeeds(weight) {
  // General guideline: 30-35 ml per kg of body weight
  const minWater = Math.round((weight * 30) / 1000 * 10) / 10; // Liters, rounded to 1 decimal
  const maxWater = Math.round((weight * 35) / 1000 * 10) / 10;
  
  // Convert to cups (1 liter = 4.227 cups)
  const minCups = Math.round(minWater * 4.227);
  const maxCups = Math.round(maxWater * 4.227);
  
  return {
    liters: `${minWater}-${maxWater}L`,
    cups: `${minCups}-${maxCups} cups`,
    ml: `${Math.round(weight * 30)}-${Math.round(weight * 35)}ml`
  };
}

// Generate personalized eating plan
function generateEatingPlan(patient, vitals, conditions, planType, allergyInfo, medicationInfo, caloricNeeds) {
  const basePlan = {
    planName: conditions.diabetes ? 'Diabetic-Friendly Diet Plan' : 
              conditions.hypertension ? 'DASH Diet Plan (for Hypertension)' : 
              'Balanced Healthy Eating Plan',
    duration: '4 weeks',
    targetCalories: caloricNeeds.targetCalories,
    weightGoal: caloricNeeds.weightGoal,
    goals: [],
    restrictions: [],
    foodsToEat: [],
    foodsToAvoid: [],
    dailyMeals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    },
    weeklyMealPlan: [],
    nutritionalGuidelines: {
      calories: `${caloricNeeds.targetCalories} calories per day`,
      protein: `${Math.round(caloricNeeds.targetCalories * 0.25 / 4)}g per day (25% of calories)`,
      carbohydrates: conditions.diabetes ? 
        `${Math.round(caloricNeeds.targetCalories * 0.40 / 4)}g per day (40% of calories)` :
        `${Math.round(caloricNeeds.targetCalories * 0.45 / 4)}g per day (45% of calories)`,
      fats: `${Math.round(caloricNeeds.targetCalories * 0.30 / 9)}g per day (30% of calories)`,
      fiber: '25-35g per day',
      sodium: conditions.hypertension ? 'Less than 1,500mg per day' : 'Less than 2,300mg per day'
    },
    lifestyleRecommendations: [],
    allergyConsiderations: allergyInfo.hasAllergies ? allergyInfo.restrictions : [],
    medicationInteractions: medicationInfo.hasMedications ? medicationInfo.warnings : []
  };

  // Set goals and food recommendations based on conditions
  if (conditions.hypertension) {
    basePlan.goals.push('Lower blood pressure');
    basePlan.restrictions.push('Limit sodium to < 2,300mg daily');
    basePlan.nutritionalGuidelines.sodium = 'Less than 2,300mg per day';
    
    // Foods to eat for hypertension
    basePlan.foodsToEat.push(
      'Fresh fruits and vegetables (especially leafy greens)',
      'Low-sodium or no-salt-added canned vegetables',
      'Fresh herbs and spices instead of salt',
      'Whole grains (brown rice, quinoa, oats)',
      'Lean proteins (fish, skinless poultry, beans)',
      'Low-fat dairy products',
      'Nuts and seeds (unsalted)',
      'Potassium-rich foods (bananas, sweet potatoes, spinach)'
    );
    
    // Foods to avoid for hypertension
    basePlan.foodsToAvoid.push(
      'Processed and canned foods (high sodium)',
      'Fast food and restaurant meals',
      'Salted snacks (chips, pretzels, crackers)',
      'Cured meats (bacon, ham, deli meats)',
      'Soups and broths (unless low-sodium)',
      'Pickled foods',
      'Table salt and salty seasonings',
      'Frozen meals and TV dinners'
    );
  }

  if (conditions.diabetes) {
    basePlan.goals.push('Control blood sugar levels');
    basePlan.restrictions.push('Monitor carbohydrate intake');
    basePlan.nutritionalGuidelines.carbohydrates = '45-60g per meal';
    
    // Foods to eat for diabetes
    basePlan.foodsToEat.push(
      'Non-starchy vegetables (broccoli, spinach, peppers)',
      'Whole grains with fiber (brown rice, quinoa, whole wheat)',
      'Lean proteins (fish, chicken, turkey, tofu)',
      'Healthy fats (avocado, olive oil, nuts)',
      'Low-glycemic fruits (berries, apples, pears)',
      'Legumes and beans',
      'Greek yogurt (unsweetened)',
      'Herbs and spices for flavor'
    );
    
    // Foods to avoid for diabetes
    basePlan.foodsToAvoid.push(
      'Sugary drinks (soda, fruit juices, energy drinks)',
      'Refined carbohydrates (white bread, white rice, pasta)',
      'Sweets and desserts',
      'Processed snacks and crackers',
      'Fried foods',
      'High-sugar fruits (grapes, mangoes, bananas in excess)',
      'Sweetened yogurt and dairy products',
      'Alcohol (can cause blood sugar fluctuations)'
    );
  }

  if (conditions.obesity) {
    basePlan.goals.push('Achieve healthy weight');
    basePlan.restrictions.push('Control portion sizes');
    basePlan.nutritionalGuidelines.calories = '1,500-2,000 calories daily';
    
    // Foods to eat for weight management
    basePlan.foodsToEat.push(
      'High-fiber vegetables (broccoli, cauliflower, leafy greens)',
      'Lean proteins (chicken breast, fish, egg whites)',
      'Whole grains in controlled portions',
      'Fresh fruits (in moderation)',
      'Low-calorie, high-volume foods (soup, salad)',
      'Water and herbal teas',
      'Greek yogurt (low-fat, unsweetened)',
      'Nuts and seeds (small portions)'
    );
    
    // Foods to avoid for weight management
    basePlan.foodsToAvoid.push(
      'High-calorie, low-nutrient foods',
      'Fried foods and fast food',
      'Sugary beverages and alcohol',
      'Large portions of starchy foods',
      'Processed snacks and chips',
      'High-fat dairy products',
      'Sweets and desserts',
      'Large portions of nuts and dried fruits'
    );
  }

  if (conditions.highCholesterol) {
    basePlan.goals.push('Lower cholesterol levels');
    basePlan.restrictions.push('Limit saturated fats');
    basePlan.nutritionalGuidelines.fats = 'Less than 7% saturated fat';
    
    // Foods to eat for cholesterol management
    basePlan.foodsToEat.push(
      'Oily fish (salmon, mackerel, sardines)',
      'Oats and barley (soluble fiber)',
      'Nuts (almonds, walnuts)',
      'Avocados and olive oil',
      'Fruits and vegetables (especially apples, pears)',
      'Legumes and beans',
      'Soy products (tofu, edamame)',
      'Green tea and dark chocolate (in moderation)'
    );
    
    // Foods to avoid for cholesterol management
    basePlan.foodsToAvoid.push(
      'Red meat and processed meats',
      'Full-fat dairy products',
      'Fried foods and trans fats',
      'Baked goods with hydrogenated oils',
      'Fast food and restaurant meals',
      'Egg yolks (limit to 2-3 per week)',
      'Organ meats (liver, kidney)',
      'Coconut oil and palm oil'
    );
  }

  // Add general healthy eating recommendations if no specific conditions
  if (basePlan.foodsToEat.length === 0) {
    basePlan.foodsToEat = [
      'Fresh fruits and vegetables',
      'Whole grains (brown rice, quinoa, oats)',
      'Lean proteins (fish, chicken, beans)',
      'Healthy fats (avocado, olive oil, nuts)',
      'Low-fat dairy products',
      'Water and herbal teas'
    ];
  }

  if (basePlan.foodsToAvoid.length === 0) {
    basePlan.foodsToAvoid = [
      'Processed foods and snacks',
      'Sugary drinks and desserts',
      'Excessive amounts of fried foods',
      'High-sodium foods',
      'Alcohol in excess'
    ];
  }

  // Remove duplicates from food recommendations
  basePlan.foodsToEat = [...new Set(basePlan.foodsToEat)];
  basePlan.foodsToAvoid = [...new Set(basePlan.foodsToAvoid)];

  // Generate weekly meal plan
  basePlan.weeklyMealPlan = generateWeeklyMealPlan(conditions);
  
  // Filter out foods based on allergies
  if (allergyInfo.hasAllergies && allergyInfo.foodAllergies.length > 0) {
    allergyInfo.foodAllergies.forEach(allergy => {
      const allergyLower = allergy.toLowerCase();
      
      // Remove allergenic foods from recommendations
      basePlan.foodsToEat = basePlan.foodsToEat.filter(food => {
        const foodLower = food.toLowerCase();
        
        // Check for common allergens
        if (allergyLower.includes('dairy') || allergyLower.includes('milk')) {
          return !foodLower.includes('dairy') && !foodLower.includes('milk') && 
                 !foodLower.includes('yogurt') && !foodLower.includes('cheese');
        }
        if (allergyLower.includes('nut')) {
          return !foodLower.includes('nut') && !foodLower.includes('almond') && 
                 !foodLower.includes('walnut') && !foodLower.includes('peanut');
        }
        if (allergyLower.includes('egg')) {
          return !foodLower.includes('egg');
        }
        if (allergyLower.includes('fish') || allergyLower.includes('seafood')) {
          return !foodLower.includes('fish') && !foodLower.includes('salmon') && 
                 !foodLower.includes('cod') && !foodLower.includes('tuna');
        }
        if (allergyLower.includes('gluten') || allergyLower.includes('wheat')) {
          return !foodLower.includes('wheat') && !foodLower.includes('bread') && 
                 !foodLower.includes('pasta') && !foodLower.includes('cereal');
        }
        if (allergyLower.includes('soy')) {
          return !foodLower.includes('soy') && !foodLower.includes('tofu') && 
                 !foodLower.includes('edamame');
        }
        
        return true;
      });
      
      // Add allergy-specific avoidance
      basePlan.foodsToAvoid.push(`⚠️ ALLERGY: Avoid all ${allergy} products`);
    });
  }
  
  // Add medication-specific dietary warnings
  if (medicationInfo.hasMedications && medicationInfo.foodInteractions.length > 0) {
    basePlan.restrictions.push('Follow medication-food interaction guidelines');
    medicationInfo.foodInteractions.forEach(interaction => {
      basePlan.foodsToAvoid.push(`💊 ${interaction}`);
    });
  }
  
  // Add personalized lifestyle recommendations
  const weight = vitals.weight || 70;
  const hydration = calculateHydrationNeeds(weight);
  
  basePlan.lifestyleRecommendations = [
    `Drink ${hydration.liters} (${hydration.cups}) of water daily`,
    conditions.obesity ? 'Exercise for 45-60 minutes, 5-6 days a week' : 
    'Exercise for at least 30 minutes, 5 days a week',
    'Get 7-9 hours of quality sleep nightly',
    'Manage stress through relaxation techniques (meditation, yoga, deep breathing)',
    'Regular monitoring of vital signs (blood pressure, weight, blood sugar)',
    conditions.hypertension ? 'Monitor blood pressure at the same time each day' : 
    'Track your progress with a food diary',
    'Eat meals at consistent times each day',
    conditions.diabetes ? 'Check blood sugar levels as prescribed by your doctor' :
    'Practice mindful eating and portion control'
  ];
  
  // Add weight-specific recommendations
  if (conditions.obesity || conditions.overweight) {
    basePlan.lifestyleRecommendations.push(
      'Use smaller plates to help control portions',
      'Avoid eating while watching TV or using devices',
      'Aim to lose 1-2 pounds per week for sustainable weight loss'
    );
  } else if (conditions.underweight) {
    basePlan.lifestyleRecommendations.push(
      'Eat 5-6 small meals throughout the day',
      'Add healthy calorie-dense foods to your diet',
      'Strength training exercises to build muscle mass'
    );
  }
  
  // Add trend-based recommendations
  if (conditions.trends) {
    if (conditions.trends.bloodPressure === 'increasing') {
      basePlan.lifestyleRecommendations.push('⚠️ Your blood pressure is trending upward - strictly limit sodium intake');
    }
    if (conditions.trends.weight === 'increasing' && (conditions.obesity || conditions.overweight)) {
      basePlan.lifestyleRecommendations.push('⚠️ Your weight is increasing - review portion sizes and increase physical activity');
    }
    if (conditions.trends.weight === 'decreasing' && conditions.underweight) {
      basePlan.lifestyleRecommendations.push('⚠️ Your weight continues to decrease - consult with your doctor');
    }
  }

  return basePlan;
}

// Generate detailed weekly meal plan based on conditions
function generateWeeklyMealPlan(conditions) {
  // Base meals with detailed descriptions and calorie estimates
  const baseMeals = {
    monday: {
      breakfast: {
        name: 'Steel-Cut Oatmeal Power Bowl',
        description: '½ cup steel-cut oats with ½ cup mixed berries (blueberries, strawberries), 1 tbsp ground flaxseed, ½ cup low-fat milk, drizzle of honey',
        calories: 320,
        protein: '12g',
        carbs: '52g',
        fats: '7g'
      },
      lunch: {
        name: 'Mediterranean Grilled Chicken Salad',
        description: '4 oz grilled chicken breast, 2 cups mixed greens, cherry tomatoes, cucumber, red onion, olives (5), feta cheese (1 oz), olive oil & lemon dressing',
        calories: 420,
        protein: '38g',
        carbs: '18g',
        fats: '22g'
      },
      dinner: {
        name: 'Herb-Crusted Baked Salmon',
        description: '5 oz wild-caught salmon with fresh dill & parsley, ¾ cup quinoa, 1.5 cups steamed broccoli with garlic, lemon wedge',
        calories: 520,
        protein: '42g',
        carbs: '45g',
        fats: '18g'
      },
      snack: {
        name: 'Apple & Almond Butter Delight',
        description: '1 medium apple sliced with 1.5 tbsp natural almond butter, sprinkle of cinnamon',
        calories: 200,
        protein: '5g',
        carbs: '28g',
        fats: '9g'
      }
    },
    tuesday: {
      breakfast: {
        name: 'Greek Yogurt Parfait',
        description: '1 cup plain Greek yogurt, ¼ cup granola (low-sugar), handful of walnuts (5 halves), 1 tbsp honey, dash of cinnamon',
        calories: 350,
        protein: '22g',
        carbs: '38g',
        fats: '12g'
      },
      lunch: {
        name: 'Turkey Avocado Power Wrap',
        description: 'Whole grain tortilla with 3 oz turkey breast, ½ avocado, lettuce, tomato, cucumber, mustard, side of baby carrots',
        calories: 440,
        protein: '32g',
        carbs: '42g',
        fats: '16g'
      },
      dinner: {
        name: 'Colorful Vegetable Stir-Fry',
        description: 'Mixed vegetables (bell peppers, snap peas, broccoli, carrots, mushrooms) with tofu or chicken (4 oz), garlic-ginger sauce, 1 cup brown rice',
        calories: 480,
        protein: '28g',
        carbs: '58g',
        fats: '14g'
      },
      snack: {
        name: 'Crunchy Veggie Sticks with Hummus',
        description: 'Carrot and celery sticks (1.5 cups) with ⅓ cup hummus',
        calories: 180,
        protein: '7g',
        carbs: '22g',
        fats: '8g'
      }
    },
    wednesday: {
      breakfast: {
        name: 'Veggie-Packed Scramble',
        description: '2 whole eggs + 1 egg white scrambled with spinach, mushrooms, tomatoes, 1 slice whole grain toast with ½ avocado',
        calories: 380,
        protein: '24g',
        carbs: '32g',
        fats: '18g'
      },
      lunch: {
        name: 'Hearty Lentil Soup & Salad Combo',
        description: '1.5 cups lentil vegetable soup, large mixed green salad with chickpeas, cucumber, tomatoes, balsamic vinaigrette',
        calories: 420,
        protein: '22g',
        carbs: '58g',
        fats: '12g'
      },
      dinner: {
        name: 'Grilled Chicken with Sweet Potato',
        description: '5 oz grilled chicken breast with herbs, 1 medium baked sweet potato with cinnamon, 1.5 cups steamed green beans with almonds',
        calories: 500,
        protein: '45g',
        carbs: '48g',
        fats: '12g'
      },
      snack: {
        name: 'Berry Yogurt Bowl',
        description: '¾ cup mixed berries (fresh or frozen) with ½ cup low-fat Greek yogurt, sprinkle of chia seeds',
        calories: 160,
        protein: '12g',
        carbs: '24g',
        fats: '3g'
      }
    },
    thursday: {
      breakfast: {
        name: 'Green Power Smoothie',
        description: 'Blend: 1 cup spinach, 1 banana, ½ cup frozen berries, 1 scoop protein powder, 1 tbsp peanut butter, 1 cup almond milk, ice',
        calories: 340,
        protein: '28g',
        carbs: '42g',
        fats: '10g'
      },
      lunch: {
        name: 'Quinoa Buddha Bowl',
        description: '¾ cup quinoa, ½ cup chickpeas, roasted vegetables (bell pepper, zucchini, eggplant), handful of arugula, tahini dressing',
        calories: 460,
        protein: '18g',
        carbs: '62g',
        fats: '16g'
      },
      dinner: {
        name: 'Lemon Herb Baked Cod',
        description: '6 oz cod fillet with lemon & herbs, roasted vegetable medley (Brussels sprouts, carrots, bell peppers), ½ cup wild rice',
        calories: 480,
        protein: '42g',
        carbs: '48g',
        fats: '10g'
      },
      snack: {
        name: 'Trail Mix Portion',
        description: 'Small handful (¼ cup) unsalted mixed nuts with dried cranberries (no sugar added)',
        calories: 200,
        protein: '6g',
        carbs: '16g',
        fats: '14g'
      }
    },
    friday: {
      breakfast: {
        name: 'High-Fiber Cereal Bowl',
        description: '1 cup whole grain cereal (high fiber), 1 cup low-fat milk, ½ cup mixed berries, 1 tbsp ground flaxseed',
        calories: 310,
        protein: '14g',
        carbs: '52g',
        fats: '6g'
      },
      lunch: {
        name: 'Grilled Veggie Sandwich',
        description: 'Whole grain bread with grilled zucchini, eggplant, bell peppers, fresh mozzarella (1 oz), pesto, side salad',
        calories: 430,
        protein: '18g',
        carbs: '48g',
        fats: '18g'
      },
      dinner: {
        name: 'Turkey Meatballs Marinara',
        description: '4 turkey meatballs (lean), 1 cup whole wheat pasta, ¾ cup marinara sauce (low-sodium), side of steamed spinach, parmesan (1 tbsp)',
        calories: 520,
        protein: '38g',
        carbs: '58g',
        fats: '14g'
      },
      snack: {
        name: 'Fresh Citrus Fruit',
        description: '1 large orange or 2 clementines with 10 raw almonds',
        calories: 170,
        protein: '5g',
        carbs: '24g',
        fats: '7g'
      }
    },
    saturday: {
      breakfast: {
        name: 'Avocado Toast Supreme',
        description: '2 slices whole grain bread with ½ avocado mashed, 1 poached egg, cherry tomatoes, everything bagel seasoning, microgreens',
        calories: 400,
        protein: '18g',
        carbs: '38g',
        fats: '20g'
      },
      lunch: {
        name: 'Homestyle Chicken Vegetable Soup',
        description: '2 cups chicken vegetable soup (low-sodium), whole grain roll, side cucumber & tomato salad',
        calories: 410,
        protein: '28g',
        carbs: '48g',
        fats: '12g'
      },
      dinner: {
        name: 'Grilled Tilapia with Brown Rice',
        description: '6 oz grilled tilapia with lime & cilantro, 1 cup brown rice, 2 cups mixed steamed vegetables (broccoli, carrots, cauliflower)',
        calories: 490,
        protein: '44g',
        carbs: '54g',
        fats: '9g'
      },
      snack: {
        name: 'Cheese & Crackers',
        description: 'Low-fat cheese (1.5 oz) with 6 whole grain crackers, grape tomatoes',
        calories: 190,
        protein: '12g',
        carbs: '20g',
        fats: '7g'
      }
    },
    sunday: {
      breakfast: {
        name: 'Whole Grain Berry Pancakes',
        description: '3 small whole grain pancakes with ½ cup mixed berries, 1 tbsp pure maple syrup, 1 turkey sausage link',
        calories: 380,
        protein: '18g',
        carbs: '56g',
        fats: '10g'
      },
      lunch: {
        name: 'Grilled Chicken Caesar Salad (Lightened)',
        description: 'Large romaine salad, 4 oz grilled chicken, light Caesar dressing (2 tbsp), parmesan shavings, whole grain croutons',
        calories: 400,
        protein: '36g',
        carbs: '28g',
        fats: '16g'
      },
      dinner: {
        name: 'Herb Roasted Chicken with Vegetables',
        description: '5 oz roasted chicken breast with rosemary, roasted vegetable mix (potatoes, carrots, onions, Brussels sprouts), herbs',
        calories: 510,
        protein: '42g',
        carbs: '48g',
        fats: '14g'
      },
      snack: {
        name: 'Yogurt with Granola',
        description: '¾ cup Greek yogurt with 3 tbsp low-sugar granola, drizzle of honey',
        calories: 200,
        protein: '15g',
        carbs: '28g',
        fats: '4g'
      }
    }
  };

  // Modify meals based on specific conditions
  if (conditions.diabetes || conditions.preDiabetes) {
    Object.keys(baseMeals).forEach(day => {
      // Reduce portion sizes for high-carb items
      baseMeals[day].breakfast.description = baseMeals[day].breakfast.description.replace(/1 cup/g, '¾ cup');
      baseMeals[day].breakfast.carbs = (parseInt(baseMeals[day].breakfast.carbs) * 0.85).toFixed(0) + 'g';
      
      // Add diabetes-specific note
      baseMeals[day].lunch.description += ' [Monitor carb intake: pair with protein]';
      baseMeals[day].dinner.carbs = (parseInt(baseMeals[day].dinner.carbs) * 0.9).toFixed(0) + 'g';
    });
  }

  if (conditions.hypertension) {
    Object.keys(baseMeals).forEach(day => {
      // Add low-sodium emphasis
      baseMeals[day].breakfast.description += ' [No added salt - use herbs & spices]';
      baseMeals[day].lunch.description = baseMeals[day].lunch.description.replace(/dressing/g, 'low-sodium dressing');
      baseMeals[day].dinner.description += ' [Season with fresh herbs, garlic, lemon instead of salt]';
    });
  }

  if (conditions.obesity) {
    Object.keys(baseMeals).forEach(day => {
      // Reduce calories by 10-15%
      baseMeals[day].breakfast.calories = Math.round(baseMeals[day].breakfast.calories * 0.9);
      baseMeals[day].lunch.calories = Math.round(baseMeals[day].lunch.calories * 0.9);
      baseMeals[day].dinner.calories = Math.round(baseMeals[day].dinner.calories * 0.9);
      baseMeals[day].snack.calories = Math.round(baseMeals[day].snack.calories * 0.85);
      
      // Add portion control notes
      baseMeals[day].dinner.description += ' [Use smaller plate, eat slowly]';
    });
  }

  if (conditions.highCholesterol) {
    Object.keys(baseMeals).forEach(day => {
      // Replace high-cholesterol items with heart-healthy alternatives
      baseMeals[day].breakfast.description = baseMeals[day].breakfast.description
        .replace(/egg/g, 'egg white or flax egg')
        .replace(/whole grain/g, 'heart-healthy whole grain');
      baseMeals[day].lunch.description += ' [Heart-healthy fats: focus on omega-3]';
      baseMeals[day].dinner.description = baseMeals[day].dinner.description
        .replace(/chicken/g, 'skinless chicken')
        .replace(/turkey/g, 'lean turkey');
    });
  }

  // Convert to simple format for compatibility
  const formattedMeals = {};
  Object.keys(baseMeals).forEach(day => {
    formattedMeals[day] = {
      breakfast: `${baseMeals[day].breakfast.name} (${baseMeals[day].breakfast.calories} cal) - ${baseMeals[day].breakfast.description}`,
      lunch: `${baseMeals[day].lunch.name} (${baseMeals[day].lunch.calories} cal) - ${baseMeals[day].lunch.description}`,
      dinner: `${baseMeals[day].dinner.name} (${baseMeals[day].dinner.calories} cal) - ${baseMeals[day].dinner.description}`,
      snack: `${baseMeals[day].snack.name} (${baseMeals[day].snack.calories} cal) - ${baseMeals[day].snack.description}`
    };
  });

  return formattedMeals;
}

module.exports = router;
