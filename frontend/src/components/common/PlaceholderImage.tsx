import React from 'react';

interface PlaceholderImageProps {
  alt: string;
  className?: string;
  size?: number;
  type?: 'avatar' | 'image';
}

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({
  alt,
  className = '',
  size = 40,
  type = 'avatar'
}) => {
  // Use a reliable placeholder service with fallback
  const getPlaceholderUrl = () => {
    // Try placehold.co first (most reliable)
    return `https://placehold.co/${size}x${size}/e2e8f0/64748b?text=${encodeURIComponent(alt.charAt(0).toUpperCase())}`;
  };

  // Fallback to a data URL if the placeholder service fails
  const getFallbackDataUrl = () => {
    // Create a simple colored circle with the first letter
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw circle
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw text
      ctx.fillStyle = '#64748b';
      ctx.font = `${size/2}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(alt.charAt(0).toUpperCase(), size/2, size/2);
    }
    return canvas.toDataURL();
  };

  return (
    <img
      src={getPlaceholderUrl()}
      alt={alt}
      className={`${type === 'avatar' ? 'rounded-full' : ''} ${className}`}
      loading="lazy"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null; // Prevent infinite loop
        target.src = getFallbackDataUrl();
      }}
    />
  );
};

export default PlaceholderImage; 