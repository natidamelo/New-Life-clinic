import React from 'react';
import { UserIcon } from '@heroicons/react/24/solid';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'rounded' | 'square';
  className?: string;
  fallbackInitials?: string;
  seed?: string | number; // To determine rotating color
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  variant = 'circle',
  className = '',
  fallbackInitials,
  seed
}) => {
  // Size classes
  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-14 w-14 text-lg'
  };

  // Variant classes
  const variantClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-lg',
    square: 'rounded-none'
  };

  // Rotating avatar color based on seed
  let colorClass = 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border)]';
  if (seed !== undefined && !src) {
    const seedStr = seed.toString();
    const seedNum = Array.from(seedStr).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = (seedNum % 8) + 1; // 1 to 8
    colorClass = `bg-[var(--color-avatar-${colorIndex})] text-[var(--color-avatar-${colorIndex}-fg)] font-semibold border-0`;
  }

  // Base classes
  const baseClasses = 'inline-flex items-center justify-center flex-shrink-0';

  // Combine all classes
  const avatarClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${colorClass} ${className}`;

  // Handle image error
  const [hasError, setHasError] = React.useState(false);
  const handleError = () => setHasError(true);

  // Render fallback content
  const renderFallback = () => {
    if (fallbackInitials) {
      return <span className="font-semibold uppercase tracking-wider">{fallbackInitials}</span>;
    }
    return <UserIcon className="h-1/2 w-1/2" />;
  };

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        className={avatarClasses}
        onError={handleError}
      />
    );
  }

  return (
    <div className={avatarClasses}>
      {renderFallback()}
    </div>
  );
};

export default Avatar; 