
// Enhanced deduplication logic for inventory deductions
const improvedDeduplicationCheck = async (itemId, transactionType, quantity, documentReference, reason, timeWindow = 30000) => {
  try {
    const InventoryTransaction = require('./models/InventoryTransaction');
    
    // Check for existing transaction with same parameters within time window
    const existingTransaction = await InventoryTransaction.findOne({
      item: itemId,
      transactionType: transactionType,
      quantity: quantity,
      documentReference: documentReference,
      reason: reason,
      createdAt: { $gte: new Date(Date.now() - timeWindow) }
    });
    
    if (existingTransaction) {
      console.log(`⏭️ [DEDUPLICATION] Duplicate transaction prevented for item ${itemId}`);
      return {
        success: true,
        skipped: true,
        reason: 'Duplicate transaction prevented',
        existingTransactionId: existingTransaction._id
      };
    }
    
    // Additional check: Look for similar transactions with same reference and item
    const similarTransaction = await InventoryTransaction.findOne({
      item: itemId,
      documentReference: documentReference,
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - timeWindow) }
    });
    
    if (similarTransaction) {
      console.log(`⏭️ [DEDUPLICATION] Similar transaction found for same reference ${documentReference}`);
      return {
        success: true,
        skipped: true,
        reason: 'Similar transaction already exists',
        existingTransactionId: similarTransaction._id
      };
    }
    
    return { success: true, canProceed: true };
    
  } catch (error) {
    console.error('❌ Error in deduplication check:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { improvedDeduplicationCheck };
