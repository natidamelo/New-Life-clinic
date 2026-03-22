/**
 * Utility to fix the specific Ceftriaxone invoice MED-1756413452867-dltmv
 * 
 * This can be run from the browser console while on the invoice page
 * or integrated into the UI as needed.
 */

import api from '../services/api';

export const fixCeftriaxoneInvoice = async () => {
  try {
    console.log('🔧 Fixing Ceftriaxone invoice MED-1756413452867-dltmv...');
    
    const response = await api.post('/api/billing/fix-ceftriaxone-retroactive');
    
    console.log('✅ Fix applied successfully:', response.data);
    
    // Show success message
    if (response.data.success) {
      const { corrections } = response.data;
      alert(`✅ Invoice Fixed Successfully!\n\n` +
            `Invoice: ${corrections.invoiceNumber}\n` +
            `Quantity: ${corrections.quantity.from} → ${corrections.quantity.to} doses\n` +
            `Total: ETB ${corrections.total.from} → ETB ${corrections.total.to}\n\n` +
            `The page will refresh to show the corrected values.`);
      
      // Refresh the page to show updated values
      window.location.reload();
    } else {
      alert(`❌ Fix failed: ${response.data.message}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fixing invoice:', error);
    
    let errorMessage = 'Failed to fix invoice';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alert(`❌ Error: ${errorMessage}`);
    throw error;
  }
};

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.fixCeftriaxoneInvoice = fixCeftriaxoneInvoice;
  console.log('🔧 Fix utility available: window.fixCeftriaxoneInvoice()');
}

export default fixCeftriaxoneInvoice;
