const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const InventoryItem = require('../models/InventoryItem');
const labTestInventoryMap = require('../config/labTestInventoryMap');

/**
 * @route GET /api/lab-tests/available
 * @desc Get all available lab tests for ordering from inventory
 * @access Private
 */
router.get('/available', auth, async (req, res) => {
  try {
    console.log('🔬 Fetching available lab tests for ordering from inventory...');
    
    // Get all laboratory category inventory items that are active
    const labItems = await InventoryItem.find({
      category: 'laboratory',
      isActive: true
    }).select('name itemCode description category quantity costPrice sellingPrice storageTemperature specimenType testType processTime');
    
    console.log(`📋 Found ${labItems.length} laboratory items`);
    
    // Create test categories and organize items
    const categories = {
      'Chemistry': [],
      'Hematology': [],
      'Parasitology': [],
      'Mycology': [],
      'Immunology': [],
      'Urinalysis': [],
      'Endocrinology': [],
      'Cardiology': [],
      'Tumor Markers': [],
      'Other': []
    };
    
    // Helper function to categorize tests
    const categorizeTest = (itemName) => {
      const name = itemName.toLowerCase();
      
      // Chemistry tests
      if (name.includes('glucose') || name.includes('urea') || name.includes('creatinine') || 
          name.includes('sodium') || name.includes('potassium') || name.includes('chloride') ||
          name.includes('alt') || name.includes('ast') || name.includes('bilirubin') ||
          name.includes('cholesterol') || name.includes('triglycerides') || name.includes('hdl') ||
          name.includes('ldl') || name.includes('calcium') || name.includes('phosphorus') ||
          name.includes('magnesium') || name.includes('uric acid') || name.includes('amylase') ||
          name.includes('lipase') || name.includes('alkaline phosphatase') || name.includes('ggt')) {
        return 'Chemistry';
      }
      
      // Hematology tests
      if (name.includes('hemoglobin') || name.includes('cbc') || name.includes('complete blood count') ||
          name.includes('wbc') || name.includes('white blood cell') || name.includes('rbc') || 
          name.includes('red blood cell') || name.includes('platelet') || name.includes('hematocrit') ||
          name.includes('esr') || name.includes('erythrocyte sedimentation') || 
          name.includes('mean corpuscular') || name.includes('mcv') || name.includes('mch') || name.includes('mchc') ||
          name.includes('differential count') || name.includes('prothrombin') || name.includes('inr') ||
          name.includes('international normalized ratio') || name.includes('partial thromboplastin') || 
          name.includes('ptt') || name.includes('aptt') || name.includes('reticulocyte') ||
          name.includes('neutrophil') || name.includes('lymphocyte') || name.includes('monocyte') ||
          name.includes('eosinophil') || name.includes('basophil') || name.includes('coagulation')) {
        return 'Hematology';
      }
      
      // Mycology / fungal tests
      if (name.includes('koh') || name.includes('fung') || name.includes('mycolo') ||
          name.includes('candida') || name.includes('dermatophyte')) {
        return 'Mycology';
      }

      // Parasitology tests (check before Immunology to catch H. pylori)
      if (name.includes('h. pylori') || name.includes('pylori') || name.includes('parasite') ||
          name.includes('stool') || name.includes('ova') || name.includes('occult blood') || 
          name.includes('fobt') || name.includes('fecal occult')) {
        return 'Parasitology';
      }
      
      // Immunology tests
      if (name.includes('hiv') || name.includes('hepatitis') || name.includes('syphilis') ||
          name.includes('covid') || name.includes('malaria') || name.includes('typhoid') ||
          name.includes('dengue') || name.includes('crp') || name.includes('rheumatoid') ||
          name.includes('vdrl') || name.includes('rpr') || name.includes('aso') ||
          name.includes('streptolysin') || name.includes('antibody') || name.includes('antigen') ||
          name.includes('immunology') || name.includes('serology')) {
        return 'Immunology';
      }
      
      // Urinalysis tests
      if (name.includes('urinalysis') || name.includes('urine') || (name.includes('hcg') && name.includes('urine'))) {
        return 'Urinalysis';
      }
      
      // Endocrinology tests
      if (name.includes('tsh') || name.includes('t4') || name.includes('t3') || name.includes('thyroid') ||
          name.includes('cortisol') || name.includes('testosterone') || name.includes('estrogen') ||
          name.includes('progesterone') || name.includes('insulin') || name.includes('hba1c') ||
          name.includes('c-peptide')) {
        return 'Endocrinology';
      }
      
      // Cardiology tests (cardiac markers only - coagulation tests moved to Hematology)
      if (name.includes('troponin') || name.includes('ck-mb') || name.includes('bnp')) {
        return 'Cardiology';
      }
      
      // Tumor markers
      if (name.includes('psa') || name.includes('afp') || name.includes('cea') ||
          name.includes('ca-125') || name.includes('ca 19-9') || (name.includes('hcg') && !name.includes('urine'))) {
        return 'Tumor Markers';
      }
      
      return 'Other';
    };
    
    // Organize items by category
    labItems.forEach(item => {
      const category = categorizeTest(item.name);
      categories[category].push({
        id: item._id,
        name: item.name,
        itemCode: item.itemCode,
        description: item.description,
        category: category,
        quantity: item.quantity,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        storageTemperature: item.storageTemperature,
        specimenType: item.specimenType,
        testType: item.testType,
        processTime: item.processTime,
        available: item.quantity > 0
      });
    });
    
    // Note: Glucose test strips are already added through the normal categorization logic above
    // No need to add them again to prevent duplication
    
    // Filter out empty categories
    const filteredCategories = Object.entries(categories)
      .filter(([name, items]) => items.length > 0)
      .reduce((acc, [name, items]) => {
        acc[name] = items;
        return acc;
      }, {});
    
    console.log(`📊 Organized into ${Object.keys(filteredCategories).length} categories`);
    Object.entries(filteredCategories).forEach(([category, items]) => {
      console.log(`   ${category}: ${items.length} tests`);
    });
    
    res.json({
      success: true,
      categories: filteredCategories,
      totalTests: labItems.length,
      message: 'Available lab tests retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error fetching available lab tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available lab tests',
      error: error.message
    });
  }
});

/**
 * @route GET /api/lab-tests/sync
 * @desc Get real-time lab test updates for doctor dashboard
 * @access Private
 */
router.get('/sync', auth, async (req, res) => {
  try {
    console.log('🔄 Syncing lab tests for doctor dashboard...');
    
    // Get recently added laboratory items (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentLabItems = await InventoryItem.find({
      category: 'laboratory',
      isActive: true,
      createdAt: { $gte: yesterday }
    }).select('name itemCode description category quantity costPrice sellingPrice storageTemperature specimenType testType processTime createdAt');
    
    console.log(`📋 Found ${recentLabItems.length} recently added laboratory items`);
    
    // Format for frontend consumption
    const formattedItems = recentLabItems.map(item => ({
      id: item._id,
      name: item.name,
      itemCode: item.itemCode,
      description: item.description,
      category: 'laboratory',
      quantity: item.quantity,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      storageTemperature: item.storageTemperature,
      specimenType: item.specimenType,
      testType: item.testType,
      processTime: item.processTime,
      available: item.quantity > 0,
      isNew: true,
      addedAt: item.createdAt
    }));
    
    res.json({
      success: true,
      newItems: formattedItems,
      count: formattedItems.length,
      message: `Found ${formattedItems.length} new lab items`
    });
    
  } catch (error) {
    console.error('❌ Error syncing lab tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing lab tests',
      error: error.message
    });
  }
});

/**
 * @route GET /api/lab-tests/categories
 * @desc Get lab test categories
 * @access Private
 */
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = [
      'Chemistry',
      'Hematology', 
      'Parasitology',
      'Mycology',
      'Immunology',
      'Urinalysis',
      'Endocrinology',
      'Cardiology',
      'Tumor Markers',
      'Other'
    ];
    
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('❌ Error fetching lab test categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lab test categories',
      error: error.message
    });
  }
});

module.exports = router;
