const express = require('express');
const router = express.Router();
const MedicalInvoice = require('../models/MedicalInvoice');

// Cleanup duplicate invoices endpoint
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    console.log('🧹 Starting duplicate invoice cleanup...');
    
    // Find all Natan kinfe invoices
    const invoices = await MedicalInvoice.find({
      patientName: { $regex: /natan.*kinfe/i }
    }).sort({ createdAt: -1 });
    
    console.log(`📋 Found ${invoices.length} invoices for Natan kinfe`);
    
    if (invoices.length <= 1) {
      return res.json({
        success: true,
        message: 'No duplicates found',
        removed: 0,
        remaining: invoices.length
      });
    }
    
    // Group by total amount and status
    const groups = {};
    invoices.forEach(invoice => {
      const key = `${invoice.total}_${invoice.status}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(invoice);
    });
    
    let removedCount = 0;
    const removedInvoices = [];
    
    // Remove duplicates (keep newest in each group)
    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        console.log(`🔍 Found ${group.length} duplicates for: ${key}`);
        
        // Sort by creation date (newest first)
        group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Keep the first (newest) and remove the rest
        const toRemove = group.slice(1);
        
        for (const invoice of toRemove) {
          console.log(`❌ Removing duplicate: ${invoice.invoiceNumber}`);
          await MedicalInvoice.findByIdAndDelete(invoice._id);
          removedInvoices.push(invoice.invoiceNumber);
          removedCount++;
        }
      }
    }
    
    // Get remaining invoices
    const remaining = await MedicalInvoice.find({
      patientName: { $regex: /natan.*kinfe/i }
    }).sort({ createdAt: -1 });
    
    console.log(`✅ Cleanup complete! Removed ${removedCount} duplicates`);
    
    res.json({
      success: true,
      message: `Successfully removed ${removedCount} duplicate invoices`,
      removed: removedCount,
      removedInvoices,
      remaining: remaining.length,
      remainingInvoices: remaining.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        total: inv.total,
        status: inv.status,
        createdAt: inv.createdAt
      }))
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup duplicates',
      details: error.message
    });
  }
});

module.exports = router;
