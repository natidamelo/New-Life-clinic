/**
 * Inventory Update Service
 * 
 * Handles inventory updates when medications are administered
 * Updates inventory quantities and Cost of Goods Sold (COGS)
 */

const mongoose = require('mongoose');

class InventoryUpdateService {
  /**
   * Update inventory when a medication is administered
   */
  static async updateInventoryOnMedicationAdministration(task, adminUserId) {
    try {
      console.log(`🔄 [INVENTORY UPDATE] Processing medication administration for task ${task._id}`);
      
      const InventoryItem = require('../models/InventoryItem');
      const InventoryTransaction = require('../models/InventoryTransaction');
      
      // Get medication details and clean up the name
      let medicationName = task.medicationDetails?.medicationName || task.description || 'Unknown Medication';
      
      // Clean up medication name for better matching
      if (medicationName.toLowerCase().includes('depo injection')) {
        medicationName = 'depo injection';
      } else if (medicationName.toLowerCase().includes('injection')) {
        // Extract the medication name before "injection"
        const match = medicationName.match(/(.+?)\s+injection/i);
        if (match) {
          medicationName = match[1].toLowerCase().trim();
        }
      }
      
      // Check if this is a Depo injection for automatic scheduling
      const isDepoInjection = medicationName.toLowerCase().includes('depo');
      
      const dosage = task.medicationDetails?.dosage;
      const quantityUsed = this.calculateQuantityUsed(dosage);
      
      if (!medicationName) {
        console.log('⚠️ [INVENTORY UPDATE] No medication name found in task');
        return { success: false, message: 'No medication name found' };
      }
      
      console.log(`📋 [INVENTORY UPDATE] Medication: ${medicationName}, Quantity used: ${quantityUsed}`);
      
      // Find the inventory item for this medication
      const inventoryItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(medicationName, 'i') },
        category: { $in: ['medication', 'injection', 'service'] }
      });
      
      if (!inventoryItem) {
        console.log(`⚠️ [INVENTORY UPDATE] No inventory item found for medication: ${medicationName}`);
        return { success: false, message: `No inventory item found for ${medicationName}` };
      }
      
      console.log(`📦 [INVENTORY UPDATE] Found inventory item: ${inventoryItem.name} (ID: ${inventoryItem._id})`);
      console.log(`📊 [INVENTORY UPDATE] Current quantity: ${inventoryItem.quantity}`);
      
      // Check if there's enough inventory
      if (inventoryItem.quantity < quantityUsed) {
        console.log(`❌ [INVENTORY UPDATE] Insufficient inventory: ${inventoryItem.quantity} < ${quantityUsed}`);
        return { 
          success: false, 
          message: `Insufficient inventory. Available: ${inventoryItem.quantity}, Required: ${quantityUsed}` 
        };
      }
      
      // Calculate costs
      const unitCost = inventoryItem.costPrice || 0;
      const totalCost = unitCost * quantityUsed;
      
      // Update inventory quantity
      const previousQuantity = inventoryItem.quantity;
      const newQuantity = previousQuantity - quantityUsed;
      
      inventoryItem.quantity = newQuantity;
      inventoryItem.lastUpdated = new Date();
      inventoryItem.updatedBy = adminUserId;
      
      await inventoryItem.save();
      
      console.log(`✅ [INVENTORY UPDATE] Updated inventory: ${previousQuantity} → ${newQuantity}`);
      
      // Create inventory transaction record
      const transaction = new InventoryTransaction({
        transactionType: 'medical-use',
        item: inventoryItem._id,
        quantity: quantityUsed,
        unitCost: unitCost,
        totalCost: totalCost,
        previousQuantity: previousQuantity,
        newQuantity: newQuantity,
        reason: `Medication administered to patient: ${task.patientName}`,
        reference: `Nurse Task: ${task._id}`,
        patientId: task.patientId,
        patientName: task.patientName,
        medicationName: medicationName,
        dosage: dosage,
        administeredBy: adminUserId,
        administeredAt: new Date(),
        notes: `Administered via nurse task completion`,
        _skipInventoryUpdate: true // ✅ FIX: Skip hook - inventory already updated manually above
      });
      
      await transaction.save();
      
      console.log(`📝 [INVENTORY UPDATE] Created transaction record: ${transaction._id}`);
      console.log(`💰 [INVENTORY UPDATE] COGS: ${totalCost} ETB (${quantityUsed} × ${unitCost})`);
      
      return {
        success: true,
        message: 'Inventory updated successfully',
        data: {
          inventoryItem: {
            id: inventoryItem._id,
            name: inventoryItem.name,
            previousQuantity,
            newQuantity,
            quantityUsed
          },
          transaction: {
            id: transaction._id,
            totalCost,
            unitCost,
            quantityUsed
          }
        }
      };
      
      // Handle Depo injection scheduling
      if (isDepoInjection && result.success) {
        try {
          await this.handleDepoInjectionScheduling(task, adminUserId, transaction._id);
        } catch (depoError) {
          console.error('⚠️ [INVENTORY UPDATE] Error handling Depo injection scheduling:', depoError);
          // Don't fail the main operation if Depo scheduling fails
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ [INVENTORY UPDATE] Error updating inventory:', error);
      return {
        success: false,
        message: 'Failed to update inventory',
        error: error.message
      };
    }
  }
  
  /**
   * Handle Depo injection scheduling
   */
  static async handleDepoInjectionScheduling(task, adminUserId, inventoryTransactionId) {
    try {
      console.log('💉 [DEPO SCHEDULING] Handling Depo injection scheduling for task:', task._id);
      
      const DepoInjectionService = require('./depoInjectionService');
      const Patient = require('../models/Patient');
      const User = require('../models/User');
      
      // Get patient information
      const patient = await Patient.findById(task.patientId);
      if (!patient) {
        console.log('⚠️ [DEPO SCHEDULING] Patient not found:', task.patientId);
        return;
      }
      
      // Get admin user information
      const adminUser = await User.findById(adminUserId);
      if (!adminUser) {
        console.log('⚠️ [DEPO SCHEDULING] Admin user not found:', adminUserId);
        return;
      }
      
      // Check if patient already has an active Depo schedule
      const existingSchedules = await DepoInjectionService.getPatientSchedules(task.patientId);
      const activeSchedule = existingSchedules.find(schedule => schedule.status === 'active');
      
      if (activeSchedule) {
        // Record injection in existing schedule
        console.log('📝 [DEPO SCHEDULING] Recording injection in existing schedule:', activeSchedule._id);
        
        await DepoInjectionService.recordInjection(activeSchedule._id, {
          injectionDate: new Date().toISOString(),
          administeredBy: adminUserId,
          administeredByName: `${adminUser.firstName} ${adminUser.lastName}`,
          notes: 'Injection administered via medication administration',
          inventoryTransactionId: inventoryTransactionId
        });
        
        console.log('✅ [DEPO SCHEDULING] Injection recorded successfully');
      } else {
        // Create new schedule
        console.log('🆕 [DEPO SCHEDULING] Creating new Depo injection schedule');
        
        // Find the prescribing doctor (could be the admin user or someone else)
        const prescribingDoctor = adminUser.role === 'doctor' ? adminUser : 
          await User.findOne({ role: 'doctor' });
        
        if (!prescribingDoctor) {
          console.log('⚠️ [DEPO SCHEDULING] No doctor found for prescribing');
          return;
        }
        
        await DepoInjectionService.createSchedule({
          patientId: task.patientId,
          firstInjectionDate: new Date().toISOString(),
          prescribingDoctorId: prescribingDoctor._id,
          prescribingDoctorName: `${prescribingDoctor.firstName} ${prescribingDoctor.lastName}`,
          notes: 'Schedule created automatically from medication administration',
          instructions: 'Depo-Provera injection every 12 weeks (84 days)',
          injectionInterval: 84,
          reminderSettings: {
            enabled: true,
            daysBeforeReminder: 7,
            reminderMethod: 'sms'
          },
          createdBy: adminUserId
        });
        
        console.log('✅ [DEPO SCHEDULING] New schedule created successfully');
      }
      
    } catch (error) {
      console.error('❌ [DEPO SCHEDULING] Error handling Depo injection scheduling:', error);
      throw error;
    }
  }

  /**
   * Calculate quantity used based on dosage
   */
  static calculateQuantityUsed(dosage) {
    if (!dosage) return 1; // Default to 1 unit
    
    // Extract number from dosage string (e.g., "1 injection" → 1, "2 tablets" → 2)
    const match = dosage.toString().match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
  
  /**
   * Get inventory status for a medication
   */
  static async getInventoryStatus(medicationName) {
    try {
      const InventoryItem = require('../models/InventoryItem');
      
      const inventoryItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(medicationName, 'i') },
        category: { $in: ['medication', 'injection', 'service'] }
      });
      
      if (!inventoryItem) {
        return { found: false, message: `No inventory item found for ${medicationName}` };
      }
      
      return {
        found: true,
        data: {
          id: inventoryItem._id,
          name: inventoryItem.name,
          quantity: inventoryItem.quantity,
          unit: inventoryItem.unit,
          costPrice: inventoryItem.costPrice,
          sellingPrice: inventoryItem.sellingPrice,
          minimumStockLevel: inventoryItem.minimumStockLevel,
          isLowStock: inventoryItem.quantity <= inventoryItem.minimumStockLevel
        }
      };
      
    } catch (error) {
      console.error('❌ [INVENTORY UPDATE] Error getting inventory status:', error);
      return { found: false, error: error.message };
    }
  }
}

module.exports = InventoryUpdateService;
