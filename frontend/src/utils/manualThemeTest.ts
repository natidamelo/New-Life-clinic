// Manual theme testing utility - can be called from browser console
export const testThemes = () => {
  console.log('🧪 Testing Cool Breeze and Icy Mint themes...');
  
  // Test Cool Breeze
  console.log('🎨 Testing Cool Breeze theme...');
  applyCoolBreeze();
  
  setTimeout(() => {
    console.log('🎨 Testing Icy Mint theme...');
    applyIcyMint();
  }, 3000);
};

export const applyCoolBreeze = () => {
  const root = document.documentElement;
  
  // Cool Breeze colors
  const primaryHsl = '195 100% 75%';
  const primaryColor = `hsl(${primaryHsl})`;
  
  // Set main primary color
  root.style.setProperty('--primary-color', primaryColor);
  
  // Generate and set color variations
  const variations = {
    '25': '195 100% 98%',
    '50': '195 100% 95%',
    '100': '195 100% 90%',
    '200': '195 100% 80%',
    '300': '195 100% 70%',
    '400': '195 100% 60%',
    '500': primaryHsl,
    '600': '195 100% 40%',
    '700': '195 100% 30%',
    '800': '195 100% 20%',
    '900': '195 100% 10%',
    '950': '195 100% 5%'
  };
  
  Object.entries(variations).forEach(([shade, value]) => {
    root.style.setProperty(`--primary-color-${shade}`, `hsl(${value})`);
  });
  
  root.style.setProperty('--primary-hover', `hsl(${variations['600']})`);
  root.style.setProperty('--primary-active', `hsl(${variations['700']})`);
  root.style.setProperty('--primary-focus', `hsl(${variations['500']})`);
  root.style.setProperty('--primary-disabled', `hsl(${variations['300']})`);
  
  console.log('✅ Cool Breeze theme applied manually');
};

export const applyIcyMint = () => {
  const root = document.documentElement;
  
  // Icy Mint colors
  const primaryHsl = '160 80% 70%';
  const primaryColor = `hsl(${primaryHsl})`;
  
  // Set main primary color
  root.style.setProperty('--primary-color', primaryColor);
  
  // Generate and set color variations
  const variations = {
    '25': '160 80% 98%',
    '50': '160 80% 95%',
    '100': '160 80% 90%',
    '200': '160 80% 80%',
    '300': '160 80% 70%',
    '400': '160 80% 60%',
    '500': primaryHsl,
    '600': '160 80% 40%',
    '700': '160 80% 30%',
    '800': '160 80% 20%',
    '900': '160 80% 10%',
    '950': '160 80% 5%'
  };
  
  Object.entries(variations).forEach(([shade, value]) => {
    root.style.setProperty(`--primary-color-${shade}`, `hsl(${value})`);
  });
  
  root.style.setProperty('--primary-hover', `hsl(${variations['600']})`);
  root.style.setProperty('--primary-active', `hsl(${variations['700']})`);
  root.style.setProperty('--primary-focus', `hsl(${variations['500']})`);
  root.style.setProperty('--primary-disabled', `hsl(${variations['300']})`);
  
  console.log('✅ Icy Mint theme applied manually');
};

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testThemes = testThemes;
  (window as any).applyCoolBreeze = applyCoolBreeze;
  (window as any).applyIcyMint = applyIcyMint;
  console.log('🧪 Theme test functions available: testThemes(), applyCoolBreeze(), applyIcyMint()');
}
