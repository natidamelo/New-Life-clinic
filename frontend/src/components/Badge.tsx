import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  className = ''
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center font-medium';

  // Variant classes
  const variantClasses = {
    primary: 'bg-primary/20 text-primary',
    secondary: 'bg-muted/20 text-muted-foreground',
    success: 'bg-primary/20 text-primary',
    warning: 'bg-accent/20 text-accent-foreground',
    danger: 'bg-destructive/20 text-destructive',
    info: 'bg-indigo-100 text-indigo-800'
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  // Rounded class
  const roundedClass = rounded ? 'rounded-full' : 'rounded';

  // Combine all classes
  const badgeClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClass} ${className}`;

  return (
    <span className={badgeClasses}>
      {children}
    </span>
  );
};

export default Badge; 