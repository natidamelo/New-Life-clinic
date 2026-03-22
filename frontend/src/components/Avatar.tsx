import React from 'react';
import { UserIcon } from '@heroicons/react/24/solid';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'rounded' | 'square';
  className?: string;
  fallbackInitials?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  variant = 'circle',
  className = '',
  fallbackInitials
}) => {
  // Size classes
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-14 w-14 text-xl'
  };

  // Variant classes
  const variantClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-lg',
    square: 'rounded-none'
  };

  // Base classes
  const baseClasses = 'inline-flex items-center justify-center bg-muted/20 text-muted-foreground';

  // Combine all classes
  const avatarClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  // Handle image error
  const [hasError, setHasError] = React.useState(false);
  const handleError = () => setHasError(true);

  // Render fallback content
  const renderFallback = () => {
    if (fallbackInitials) {
      return <span className="font-medium">{fallbackInitials}</span>;
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