import React from 'react';

interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  children, 
  className = ''
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-muted/20 ${className}`}>
      {children}
    </div>
  );
};

interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({ 
  src, 
  alt = '',
  className = ''
}) => {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      onError={() => setHasError(true)}
    />
  );
};

interface AvatarFallbackProps {
  children: React.ReactNode;
  className?: string;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`flex h-full w-full items-center justify-center bg-muted/30 text-muted-foreground font-medium ${className}`}>
      {children}
    </div>
  );
}; 