// Debug utility for theme selection issues
export const debugThemeSelection = () => {
  console.log('🔍 Debug Theme Selection');
  
  // Check localStorage
  const storedTheme = localStorage.getItem('colorTheme');
  console.log('📦 Stored theme in localStorage:', storedTheme);
  
  // Check DOM elements
  const themeButtons = document.querySelectorAll('[title="Cool Breeze"], [title="Icy Mint"]');
  console.log('🎨 Found theme buttons:', themeButtons.length);
  
  themeButtons.forEach((button, index) => {
    const title = button.getAttribute('title');
    const isSelected = button.classList.contains('border-primary');
    console.log(`Button ${index + 1} (${title}): selected=${isSelected}`);
  });
  
  // Check CSS variables
  const root = document.documentElement;
  const primaryColor = root.style.getPropertyValue('--primary-color');
  console.log('🎨 Current primary color CSS variable:', primaryColor);
  
  // Test manual theme setting
  console.log('🧪 Testing manual theme setting...');
  
  // Test Cool Breeze
  setTimeout(() => {
    console.log('🧪 Setting Cool Breeze manually...');
    localStorage.setItem('colorTheme', 'cool-breeze');
    window.location.reload();
  }, 2000);
};

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).debugThemeSelection = debugThemeSelection;
  console.log('🔍 Debug function available: debugThemeSelection()');
}
