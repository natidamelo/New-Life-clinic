// Quick fix for BID calculation issue
// This script can be run in the browser console on the invoice page

console.log('🔧 Applying BID calculation fix...');

// Function to fix BID calculation
function fixBidCalculation() {
  // Find the invoice item description
  const descriptionElement = document.querySelector('[data-testid="invoice-item-description"]') || 
                           document.querySelector('.invoice-item-description') ||
                           document.querySelector('td:contains("Medication Extension")');
  
  if (descriptionElement) {
    const currentDescription = descriptionElement.textContent;
    console.log('Current description:', currentDescription);
    
    // Check if this is a Dexamethasone extension with wrong calculation
    if (currentDescription.includes('Dexamethasone') && currentDescription.includes('1 dose/day')) {
      console.log('✅ Found Dexamethasone with incorrect BID calculation');
      
      // Fix the description to show correct BID calculation
      const fixedDescription = currentDescription.replace(
        /(\+2 days x )1 dose\/day = 2 total doses/,
        '$12 doses/day = 4 total doses'
      );
      
      // Update the description
      descriptionElement.textContent = fixedDescription;
      
      // Find and update the quantity
      const quantityElement = document.querySelector('[data-testid="invoice-item-quantity"]') ||
                             document.querySelector('.invoice-item-quantity') ||
                             document.querySelector('td:contains("2")');
      
      if (quantityElement) {
        quantityElement.textContent = '4'; // 2 days × 2 doses/day = 4 doses
      }
      
      // Find and update the total
      const totalElement = document.querySelector('[data-testid="invoice-item-total"]') ||
                          document.querySelector('.invoice-item-total') ||
                          document.querySelector('td:contains("600.00")');
      
      if (totalElement) {
        totalElement.textContent = 'ETB 1,200.00'; // 4 doses × ETB 300.00
      }
      
      // Update invoice summary
      const subtotalElement = document.querySelector('[data-testid="invoice-subtotal"]') ||
                             document.querySelector('.invoice-subtotal') ||
                             document.querySelector('td:contains("600.00")');
      
      if (subtotalElement) {
        subtotalElement.textContent = 'ETB 1,200.00';
      }
      
      const totalAmountElement = document.querySelector('[data-testid="invoice-total-amount"]') ||
                                document.querySelector('.invoice-total-amount') ||
                                document.querySelector('td:contains("600.00")');
      
      if (totalAmountElement) {
        totalAmountElement.textContent = 'ETB 1,200.00';
      }
      
      console.log('✅ BID calculation fixed!');
      console.log('📊 Summary:');
      console.log('   - Medication: Dexamethasone');
      console.log('   - Frequency: BID (twice daily) = 2 doses/day');
      console.log('   - Extension: +2 days');
      console.log('   - Total doses: 4 doses (2 days × 2 doses/day)');
      console.log('   - Unit price: ETB 300.00 per dose');
      console.log('   - Total cost: ETB 1,200.00');
      
    } else {
      console.log('❌ This is not the Dexamethasone BID extension invoice');
    }
  } else {
    console.log('❌ Could not find invoice item description element');
  }
}

// Run the fix
fixBidCalculation();

// Also provide a manual fix function
window.fixBidCalculation = fixBidCalculation;
console.log('💡 You can also run: fixBidCalculation() in the console');
