// Primary Color Utility Functions

export interface ColorVariations {
  [key: string]: string;
}

export const colorVariationsMap: { [key: string]: ColorVariations } = {
  '#3B82F6': { // Blue
    '25': '#F8FAFC',
    '50': '#EFF6FF', '100': '#DBEAFE', '200': '#BFDBFE', '300': '#93C5FD',
    '400': '#60A5FA', '500': '#3B82F6', '600': '#2563EB', '700': '#1D4ED8',
    '800': '#1E40AF', '900': '#1E3A8A', '950': '#172554'
  },
  '#10B981': { // Green
    '25': '#F0FDF4',
    '50': '#ECFDF5', '100': '#D1FAE5', '200': '#A7F3D0', '300': '#6EE7B7',
    '400': '#34D399', '500': '#10B981', '600': '#059669', '700': '#047857',
    '800': '#065F46', '900': '#064E3B', '950': '#022C22'
  },
  '#F59E0B': { // Amber
    '25': '#FFFBEB',
    '50': '#FFFBEB', '100': '#FEF3C7', '200': '#FDE68A', '300': '#FCD34D',
    '400': '#FBBF24', '500': '#F59E0B', '600': '#D97706', '700': '#B45309',
    '800': '#92400E', '900': '#78350F', '950': '#451A03'
  },
  '#EF4444': { // Red
    '25': '#FEF2F2',
    '50': '#FEF2F2', '100': '#FEE2E2', '200': '#FECACA', '300': '#FCA5A5',
    '400': '#F87171', '500': '#EF4444', '600': '#DC2626', '700': '#B91C1C',
    '800': '#991B1B', '900': '#7F1D1D', '950': '#450A0A'
  },
  '#8B5CF6': { // Purple
    '25': '#FAF5FF',
    '50': '#F5F3FF', '100': '#EDE9FE', '200': '#DDD6FE', '300': '#C4B5FD',
    '400': '#A78BFA', '500': '#8B5CF6', '600': '#7C3AED', '700': '#6D28D9',
    '800': '#5B21B6', '900': '#4C1D95', '950': '#2E1065'
  },
  '#06B6D4': { // Cyan
    '25': '#ECFEFF',
    '50': '#ECFEFF', '100': '#CFFAFE', '200': '#A5F3FC', '300': '#67E8F9',
    '400': '#22D3EE', '500': '#06B6D4', '600': '#0891B2', '700': '#0E7490',
    '800': '#155E75', '900': '#164E63', '950': '#083344'
  },
  '#EC4899': { // Pink
    '25': '#FDF2F8',
    '50': '#FDF2F8', '100': '#FCE7F3', '200': '#FBCFE8', '300': '#F9A8D4',
    '400': '#F472B6', '500': '#EC4899', '600': '#DB2777', '700': '#BE185D',
    '800': '#9D174D', '900': '#831843', '950': '#500724'
  },
  '#84CC16': { // Lime
    '25': '#F7FEE7',
    '50': '#F7FEE7', '100': '#ECFCCB', '200': '#D9F99D', '300': '#BEF264',
    '400': '#A3E635', '500': '#84CC16', '600': '#65A30D', '700': '#4D7C0F',
    '800': '#3F6212', '900': '#365314', '950': '#1A2E05'
  },
  // Additional Colors
  '#6366F1': { // Indigo
    '25': '#EEF2FF',
    '50': '#EEF2FF', '100': '#E0E7FF', '200': '#C7D2FE', '300': '#A5B4FC',
    '400': '#818CF8', '500': '#6366F1', '600': '#4F46E5', '700': '#4338CA',
    '800': '#3730A3', '900': '#312E81', '950': '#1E1B4B'
  },
  '#059669': { // Emerald
    '25': '#ECFDF5',
    '50': '#ECFDF5', '100': '#D1FAE5', '200': '#A7F3D0', '300': '#6EE7B7',
    '400': '#34D399', '500': '#059669', '600': '#047857', '700': '#065F46',
    '800': '#064E3B', '900': '#064E3B', '950': '#022C22'
  },
  '#DC2626': { // Rose
    '25': '#FFF1F2',
    '50': '#FFF1F2', '100': '#FFE4E6', '200': '#FECDD3', '300': '#FDA4AF',
    '400': '#FB7185', '500': '#DC2626', '600': '#B91C1C', '700': '#991B1B',
    '800': '#7F1D1D', '900': '#7F1D1D', '950': '#450A0A'
  },
  '#7C3AED': { // Violet
    '25': '#F5F3FF',
    '50': '#F5F3FF', '100': '#EDE9FE', '200': '#DDD6FE', '300': '#C4B5FD',
    '400': '#A78BFA', '500': '#7C3AED', '600': '#6D28D9', '700': '#5B21B6',
    '800': '#4C1D95', '900': '#4C1D95', '950': '#2E1065'
  },
  '#0891B2': { // Sky
    '25': '#F0F9FF',
    '50': '#F0F9FF', '100': '#E0F2FE', '200': '#BAE6FD', '300': '#7DD3FC',
    '400': '#38BDF8', '500': '#0891B2', '600': '#0E7490', '700': '#155E75',
    '800': '#164E63', '900': '#164E63', '950': '#083344'
  },
  '#DB2777': { // Fuchsia
    '25': '#FDF2F8',
    '50': '#FDF2F8', '100': '#FCE7F3', '200': '#FBCFE8', '300': '#F9A8D4',
    '400': '#F472B6', '500': '#DB2777', '600': '#BE185D', '700': '#9D174D',
    '800': '#831843', '900': '#831843', '950': '#500724'
  },
  '#65A30D': { // Olive
    '25': '#F7FEE7',
    '50': '#F7FEE7', '100': '#ECFCCB', '200': '#D9F99D', '300': '#BEF264',
    '400': '#A3E635', '500': '#65A30D', '600': '#4D7C0F', '700': '#3F6212',
    '800': '#365314', '900': '#365314', '950': '#1A2E05'
  },
  '#EA580C': { // Orange
    '25': '#FFF7ED',
    '50': '#FFF7ED', '100': '#FFEDD5', '200': '#FED7AA', '300': '#FDBA74',
    '400': '#FB923C', '500': '#EA580C', '600': '#C2410C', '700': '#9A3412',
    '800': '#7C2D12', '900': '#7C2D12', '950': '#431407'
  },
  '#0D9488': { // Teal
    '25': '#F0FDFA',
    '50': '#F0FDFA', '100': '#CCFBF1', '200': '#99F6E4', '300': '#5EEAD4',
    '400': '#2DD4BF', '500': '#0D9488', '600': '#0F766E', '700': '#115E59',
    '800': '#134E4A', '900': '#134E4A', '950': '#042F2E'
  },
  '#BE185D': { // Magenta
    '25': '#FDF2F8',
    '50': '#FDF2F8', '100': '#FCE7F3', '200': '#FBCFE8', '300': '#F9A8D4',
    '400': '#F472B6', '500': '#BE185D', '600': '#9D174D', '700': '#831843',
    '800': '#831843', '900': '#831843', '950': '#500724'
  },
  '#374151': { // Slate
    '25': '#F8FAFC',
    '50': '#F8FAFC', '100': '#F1F5F9', '200': '#E2E8F0', '300': '#CBD5E1',
    '400': '#94A3B8', '500': '#374151', '600': '#1F2937', '700': '#111827',
    '800': '#0F172A', '900': '#0F172A', '950': '#020617'
  },
  '#B45309': { // Bronze
    '25': '#FFFBEB',
    '50': '#FFFBEB', '100': '#FEF3C7', '200': '#FDE68A', '300': '#FCD34D',
    '400': '#FBBF24', '500': '#B45309', '600': '#92400E', '700': '#78350F',
    '800': '#78350F', '900': '#78350F', '950': '#451A03'
  },
  '#7C2D12': { // Rust
    '25': '#FFF7ED',
    '50': '#FFF7ED', '100': '#FFEDD5', '200': '#FED7AA', '300': '#FDBA74',
    '400': '#FB923C', '500': '#7C2D12', '600': '#9A3412', '700': '#7C2D12',
    '800': '#7C2D12', '900': '#7C2D12', '950': '#431407'
  }
};

export const generateColorVariations = (baseColor: string): ColorVariations => {
  return colorVariationsMap[baseColor] || colorVariationsMap['#3B82F6'];
};

export const applyPrimaryColorToDashboard = (color: string): void => {
  const colorVariations = generateColorVariations(color);
  
  // Apply CSS custom properties
  document.documentElement.style.setProperty('--primary-color', color);
  
  Object.entries(colorVariations).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--primary-color-${key}`, value);
  });
  
  // Update state colors
  document.documentElement.style.setProperty('--primary-hover', colorVariations['600']);
  document.documentElement.style.setProperty('--primary-active', colorVariations['700']);
  document.documentElement.style.setProperty('--primary-focus', colorVariations['500']);
  document.documentElement.style.setProperty('--primary-disabled', colorVariations['300']);
  
  // Force apply to specific elements with high specificity
  const elementsToUpdate = [
    // Sidebar elements
    '.w-64.h-screen.flex.flex-col',
    '[data-sidebar="sidebar"]',
    '.sidebar',
    // Main content elements
    '.flex-1.p-6.overflow-y-auto',
    '.flex-1.flex.flex-col.overflow-hidden',
    '.main-content',
    // Card elements
    '.bg-primary-foreground',
    '.card',
    // Navigation elements
    'nav a',
    '.sidebar nav a',
    '[data-sidebar="menu-button"]'
  ];
  
  elementsToUpdate.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      
      // Apply background colors based on element type
      if (selector.includes('sidebar') || selector.includes('w-64')) {
        htmlElement.style.setProperty('background-color', colorVariations['50'], 'important');
        htmlElement.style.setProperty('border-right-color', colorVariations['200'], 'important');
      } else if (selector.includes('main-content') || selector.includes('flex-1.p-6')) {
        htmlElement.style.setProperty('background-color', colorVariations['25'], 'important');
      } else if (selector.includes('bg-primary-foreground') || selector.includes('card')) {
        htmlElement.style.setProperty('border-color', colorVariations['200'], 'important');
      } else if (selector.includes('nav a') || selector.includes('menu-button')) {
        htmlElement.style.setProperty('color', colorVariations['700'], 'important');
      }
    });
  });
  
  // Force re-render by adding and removing a class
  document.body.classList.add('primary-color-updated');
  setTimeout(() => {
    document.body.classList.remove('primary-color-updated');
  }, 100);
};

export const applyPrimaryColorToElement = (element: HTMLElement, color: string, variation: string = '500'): void => {
  const colorVariations = generateColorVariations(color);
  const colorValue = colorVariations[variation] || color;
  
  element.style.setProperty('background-color', colorValue, 'important');
};

export const applyPrimaryColorToText = (element: HTMLElement, color: string, variation: string = '800'): void => {
  const colorVariations = generateColorVariations(color);
  const colorValue = colorVariations[variation] || color;
  
  element.style.setProperty('color', colorValue, 'important');
};

export const applyPrimaryColorToBorder = (element: HTMLElement, color: string, variation: string = '200'): void => {
  const colorVariations = generateColorVariations(color);
  const colorValue = colorVariations[variation] || color;
  
  element.style.setProperty('border-color', colorValue, 'important');
};

// Function to initialize primary color on page load
export const initializePrimaryColor = (): void => {
  const savedColor = localStorage.getItem('primary-color') || '#3B82F6';
  applyPrimaryColorToDashboard(savedColor);
};

// Function to save primary color preference
export const savePrimaryColorPreference = (color: string): void => {
  localStorage.setItem('primary-color', color);
  applyPrimaryColorToDashboard(color);
};

// Function to get current primary color
export const getCurrentPrimaryColor = (): string => {
  return localStorage.getItem('primary-color') || '#3B82F6';
};

// Function to reset to default primary color
export const resetPrimaryColor = (): void => {
  savePrimaryColorPreference('#3B82F6');
};
