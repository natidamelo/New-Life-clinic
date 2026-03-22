
// Migration script to clean up existing duplicate transactions
const cleanupDuplicates = async () => {
  try {
    const InventoryTransaction = require('./models/InventoryTransaction');
    const InventoryItem = require('./models/InventoryItem');
    
    // Find all items with potential duplicates
    const items = await InventoryItem.find({ category: 'service' });
    
    for (const item of items) {
      console.log(`🔍 Checking item: ${item.name}`);
      
      // Find transactions for this item
      const transactions = await InventoryTransaction.find({
        item: item._id,
        transactionType: 'medical-use',
        quantity: -1
      }).sort({ createdAt: 1 });
      
      // Group by document reference and time window
      const groups = {};
      transactions.forEach(t => {
        const key = `${t.documentReference}_${Math.floor(t.createdAt.getTime() / 30000)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      
      // Remove duplicates from each group
      for (const [key, group] of Object.entries(groups)) {
        if (group.length > 1) {
          console.log(`🔧 Found ${group.length} duplicate transactions for ${item.name}`);
          
          // Keep the first, remove the rest
          const keepTransaction = group[0];
          const removeTransactions = group.slice(1);
          
          // Calculate adjustment needed
          const adjustment = removeTransactions.length;
          
          // Remove duplicate transactions
          await InventoryTransaction.deleteMany({
            _id: { $in: removeTransactions.map(t => t._id) }
          });
          
          // Adjust inventory quantity
          await InventoryItem.findByIdAndUpdate(item._id, {
            $inc: { quantity: adjustment }
          });
          
          console.log(`✅ Removed ${removeTransactions.length} duplicates, adjusted quantity by +${adjustment}`);
        }
      }
    }
    
    console.log('🎉 Duplicate cleanup completed');
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
  }
};

module.exports = { cleanupDuplicates };
