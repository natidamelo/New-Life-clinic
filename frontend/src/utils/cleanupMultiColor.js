// Cleanup script to remove multi-color system data
// Run this in browser console to clean up localStorage

console.log('🧹 Starting multi-color system cleanup...');

// Remove multi-color related localStorage items
const itemsToRemove = [
  'multi-primary-colors',
  'primaryColorPreference',
  'multiColorConfig',
  'colorPreset',
  'primaryColor1',
  'primaryColor2', 
  'primaryColor3',
  'primaryColor4',
  'primaryColor5',
  'primaryColor6'
];

let removedCount = 0;
itemsToRemove.forEach(item => {
  if (localStorage.getItem(item)) {
    localStorage.removeItem(item);
    console.log(`✅ Removed: ${item}`);
    removedCount++;
  }
});

// Clean up any CSS custom properties related to multi-color
const root = document.documentElement;
const style = root.style;

// List of CSS custom properties to remove
const cssPropsToRemove = [
  '--primary-color-1-',
  '--primary-color-2-',
  '--primary-color-3-',
  '--primary-color-4-',
  '--primary-color-5-',
  '--primary-color-6-',
  '--primary-1-',
  '--primary-2-',
  '--primary-3-',
  '--primary-4-',
  '--primary-5-',
  '--primary-6-'
];

let cssRemovedCount = 0;
cssPropsToRemove.forEach(propPrefix => {
  // Get all CSS custom properties
  const computedStyle = getComputedStyle(root);
  const allProps = Array.from(computedStyle).filter(prop => prop.startsWith(propPrefix));
  
  allProps.forEach(prop => {
    style.removeProperty(prop);
    cssRemovedCount++;
  });
});

// Remove multi-color related classes
document.body.classList.remove('multi-primary-colors-updated');

console.log(`🎉 Cleanup complete!`);
console.log(`📊 Removed ${removedCount} localStorage items`);
console.log(`🎨 Removed ${cssRemovedCount} CSS custom properties`);
console.log('✨ Multi-color system has been completely removed!');
