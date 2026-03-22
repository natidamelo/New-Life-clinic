import React, { useEffect } from 'react';
import { initializePrimaryColor, getCurrentPrimaryColor } from '../utils/primaryColorUtils';

const PrimaryColorInitializer: React.FC = () => {
  useEffect(() => {
    // Initialize primary color on component mount
    initializePrimaryColor();
    
    // Also apply the color immediately
    const currentColor = getCurrentPrimaryColor();
    if (currentColor) {
      // Force apply the color to ensure it takes effect
      setTimeout(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', currentColor);
        
        // Apply to body to trigger re-render
        document.body.style.setProperty('--primary-color', currentColor);
      }, 100);
    }
  }, []);

  return null; // This component doesn't render anything
};

export default PrimaryColorInitializer;
