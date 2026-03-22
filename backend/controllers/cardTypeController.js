const CardType = require('../models/CardType');
const { logger } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

/**
 * Helper function to check database connection
 */
const checkDbConnection = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

/**
 * Card Type Controller
 * Handles HTTP requests for card type routes
 */
const cardTypeController = {
  /**
   * Get all active card types
   * @route GET /api/card-types
   */
  getCardTypes: async (req, res, next) => {
    try {
      // Check database connection before querying
      if (!checkDbConnection()) {
        logger.warn('Database not connected, returning empty array for card types');
        return res.status(200).json([]);
      }

      logger.info('Fetching all active card types');
      
      const cardTypes = await CardType.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
      
      logger.info(`Found ${cardTypes.length} active card types`);
      
      res.status(200).json(cardTypes);
    } catch (error) {
      logger.error('Error fetching card types:', error);
      
      // If it's a database connection error, return empty array instead of 500
      if (error.name === 'MongoServerError' || error.name === 'MongooseError' || !checkDbConnection()) {
        logger.warn('Database error, returning empty array for card types');
        return res.status(200).json([]);
      }
      
      next(error);
    }
  },

  /**
   * Initialize default card types if none exist
   */
  initializeDefaultCardTypes: async () => {
    try {
      // Ensure DB connection is ready before attempting initialization
      const mongoose = require('mongoose');
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        logger.warn('Skipping default card types initialization: DB not connected');
        return;
      }
      
      logger.info('Checking for existing card types...');
      
      const existingCount = await CardType.countDocuments({ isActive: true });
      
      if (existingCount > 0) {
        logger.info(`Found ${existingCount} existing card types, skipping initialization`);
        return;
      }
      
      logger.info('No card types found, initializing default card types...');
      
      const defaultCardTypes = [
        {
          name: 'Basic',
          value: 'basic',
          price: 100,
          validityMonths: 12,
          description: 'Basic patient membership card.',
          isActive: true
        },
        {
          name: 'Premium',
          value: 'premium',
          price: 200,
          validityMonths: 12,
          description: 'Premium patient membership with additional benefits.',
          isActive: true
        },
        {
          name: 'VIP',
          value: 'vip',
          price: 400,
          validityMonths: 12,
          description: 'VIP patient membership with exclusive benefits.',
          isActive: true
        },
        {
          name: 'Family',
          value: 'family',
          price: 500,
          validityMonths: 12,
          description: 'Family membership for multiple family members.',
          isActive: true
        }
      ];
      
      const createdCardTypes = await CardType.insertMany(defaultCardTypes);
      
      logger.info(`✅ Successfully initialized ${createdCardTypes.length} default card types:`, 
        createdCardTypes.map(ct => ct.name));
      
    } catch (error) {
      logger.error('❌ Error initializing default card types:', error);
    }
  },
  
  /**
   * Get card type by ID
   * @route GET /api/card-types/:id
   */
  getCardTypeById: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      logger.info('Fetching card type by ID:', id);
      
      const cardType = await CardType.findById(id).lean();
      
      if (!cardType) {
        return res.status(404).json({
          success: false,
          message: 'Card type not found'
        });
      }
      
      logger.info('Card type found:', cardType.name);
      
      res.status(200).json(cardType);
    } catch (error) {
      logger.error('Error fetching card type by ID:', error);
      next(error);
    }
  },
  
  /**
   * Create a new card type
   * @route POST /api/card-types
   */
  createCardType: async (req, res, next) => {
    try {
      const cardTypeData = req.body;
      
      logger.info('Creating new card type:', cardTypeData.name);
      
      // Check if card type with same name already exists
      const existingCardType = await CardType.findOne({ 
        name: cardTypeData.name,
        isActive: true 
      });
      
      if (existingCardType) {
        return res.status(409).json({
          success: false,
          message: 'Card type with this name already exists'
        });
      }
      
      // Create new card type
      const cardType = new CardType({
        ...cardTypeData,
        isActive: true,
        createdBy: req.user._id
      });
      
      const savedCardType = await cardType.save();
      
      logger.info('Card type created successfully:', savedCardType.name);
      
      res.status(201).json({
        success: true,
        message: 'Card type created successfully',
        data: savedCardType
      });
    } catch (error) {
      logger.error('Error creating card type:', error);
      next(error);
    }
  },
  
  /**
   * Update an existing card type
   * @route PUT /api/card-types/:id
   */
  updateCardType: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      logger.info('Updating card type:', id);
      
      // Check if card type exists
      const existingCardType = await CardType.findById(id);
      if (!existingCardType) {
        return res.status(404).json({
          success: false,
          message: 'Card type not found'
        });
      }
      
      // Check if name is being changed and if it conflicts with existing names
      if (updateData.name && updateData.name !== existingCardType.name) {
        const nameConflict = await CardType.findOne({
          name: updateData.name,
          isActive: true,
          _id: { $ne: id }
        });
        
        if (nameConflict) {
          return res.status(409).json({
            success: false,
            message: 'Card type with this name already exists'
          });
        }
      }
      
      // Update card type
      const updatedCardType = await CardType.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedBy: req.user._id,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
      
      logger.info('Card type updated successfully:', updatedCardType.name);
      
      res.status(200).json({
        success: true,
        message: 'Card type updated successfully',
        data: updatedCardType
      });
    } catch (error) {
      logger.error('Error updating card type:', error);
      next(error);
    }
  },
  
  /**
   * Delete a card type (soft delete)
   * @route DELETE /api/card-types/:id
   */
  deleteCardType: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      logger.info('Deleting card type:', id);
      
      // Check if card type exists
      const existingCardType = await CardType.findById(id);
      if (!existingCardType) {
        return res.status(404).json({
          success: false,
          message: 'Card type not found'
        });
      }
      
      // Soft delete by setting isActive to false
      const deletedCardType = await CardType.findByIdAndUpdate(
        id,
        {
          isActive: false,
          updatedBy: req.user._id,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      logger.info('Card type deleted successfully:', deletedCardType.name);
      
      res.status(200).json({
        success: true,
        message: 'Card type deleted successfully',
        data: deletedCardType
      });
    } catch (error) {
      logger.error('Error deleting card type:', error);
      next(error);
    }
  },
  
  /**
   * Get card types by category
   * @route GET /api/card-types/category/:category
   */
  getCardTypesByCategory: async (req, res, next) => {
    try {
      const { category } = req.params;
      
      logger.info('Fetching card types by category:', category);
      
      const cardTypes = await CardType.find({
        category: category,
        isActive: true
      })
      .sort({ name: 1 })
      .lean();
      
      logger.info(`Found ${cardTypes.length} card types in category: ${category}`);
      
      res.status(200).json(cardTypes);
    } catch (error) {
      logger.error('Error fetching card types by category:', error);
      next(error);
    }
  },
  
  /**
   * Search card types
   * @route GET /api/card-types/search?q=query
   */
  searchCardTypes: async (req, res, next) => {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
      
      logger.info('Searching card types with query:', q);
      
      const searchRegex = new RegExp(q, 'i');
      const cardTypes = await CardType.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ],
        isActive: true
      })
      .sort({ name: 1 })
      .lean();
      
      logger.info(`Found ${cardTypes.length} card types matching query: ${q}`);
      
      res.status(200).json(cardTypes);
    } catch (error) {
      logger.error('Error searching card types:', error);
      next(error);
    }
  }
};

module.exports = cardTypeController;

