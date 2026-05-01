const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const InventoryItem = require('../models/InventoryItem');
const labTestInventoryMap = require('../config/labTestInventoryMap');
const SystemSetting = require('../models/SystemSetting');

const DEFAULT_LAB_CATEGORIES = [
  { slug: 'chemistry', label: 'Chemistry' },
  { slug: 'hematology', label: 'Hematology' },
  { slug: 'parasitology', label: 'Parasitology' },
  { slug: 'mycology', label: 'Mycology' },
  { slug: 'immunology', label: 'Immunology' },
  { slug: 'urinalysis', label: 'Urinalysis' },
  { slug: 'endocrinology', label: 'Endocrinology' },
  { slug: 'cardiology', label: 'Cardiology' },
  { slug: 'tumor-markers', label: 'Tumor Markers' },
  { slug: 'other', label: 'Other' }
];

const toSlug = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toLabel = (slug = '') =>
  slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getLabCategoryOptions = async () => {
  const customCategories = await SystemSetting.getValue('lab_custom_categories', []);
  const parsedCustom = Array.isArray(customCategories) ? customCategories : [];
  const merged = [...DEFAULT_LAB_CATEGORIES];

  parsedCustom.forEach((entry) => {
    const slug = toSlug(entry?.slug || entry?.name || entry);
    if (!slug) return;
    if (merged.some(cat => cat.slug === slug)) return;
    merged.push({ slug, label: entry?.label || toLabel(slug) });
  });

  return merged;
};

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
    }).select('name itemCode description category quantity costPrice sellingPrice storageTemperature specimenType testType processTime labSubcategory');
    
    console.log(`📋 Found ${labItems.length} laboratory items`);
    
    // Create test categories and organize items
    const categoryOptions = await getLabCategoryOptions();
    const categoryLabelBySlug = categoryOptions.reduce((acc, category) => {
      acc[category.slug] = category.label;
      return acc;
    }, {});
    const categories = categoryOptions.reduce((acc, category) => {
      acc[category.label] = [];
      return acc;
    }, {});
    
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
      const category = item.labSubcategory
        ? (categoryLabelBySlug[item.labSubcategory] || toLabel(item.labSubcategory))
        : categorizeTest(item.name);
      if (!categories[category]) categories[category] = [];
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
    const categories = await getLabCategoryOptions();
    
    res.json({
      success: true,
      categories: categories.map(category => category.label)
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

/**
 * @route GET /api/lab-tests/category-options
 * @desc Get lab category options with slugs/labels for inventory form
 * @access Private
 */
router.get('/category-options', auth, async (req, res) => {
  try {
    const categories = await getLabCategoryOptions();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('❌ Error fetching lab category options:', error);
    res.status(500).json({ success: false, message: 'Error fetching lab category options', error: error.message });
  }
});

/**
 * @route POST /api/lab-tests/category-options
 * @desc Create a new lab category option for inventory + doctor flows
 * @access Private
 */
router.post('/category-options', auth, async (req, res) => {
  try {
    const rawName = req.body?.name || req.body?.label || '';
    const slug = toSlug(rawName);
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const categories = await getLabCategoryOptions();
    if (categories.some(category => category.slug === slug)) {
      return res.status(409).json({ success: false, message: 'Category already exists' });
    }

    const customCategories = await SystemSetting.getValue('lab_custom_categories', []);
    const parsedCustom = Array.isArray(customCategories) ? customCategories : [];
    parsedCustom.push({ slug, label: toLabel(slug) });

    await SystemSetting.setValue(
      'lab_custom_categories',
      parsedCustom,
      'Custom lab categories for inventory and doctor lab ordering'
    );

    const updatedCategories = await getLabCategoryOptions();
    return res.status(201).json({ success: true, categories: updatedCategories, category: { slug, label: toLabel(slug) } });
  } catch (error) {
    console.error('❌ Error creating lab category option:', error);
    res.status(500).json({ success: false, message: 'Error creating lab category option', error: error.message });
  }
});

module.exports = router;
