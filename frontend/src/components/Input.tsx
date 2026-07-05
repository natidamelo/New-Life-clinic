import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, fullWidth = false, className = '', ...props }, ref) => {
    // Base classes
    const baseClasses = 'block rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-sm focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)] sm:text-sm';
    
    // Width class
    const widthClass = fullWidth ? 'w-full' : '';
    
    // Error classes
    const errorClasses = error ? 'border-[var(--color-status-danger)] text-[var(--color-status-danger)] placeholder-[var(--color-status-danger)]/55 focus:border-[var(--color-status-danger)] focus:ring-[var(--color-status-danger)]' : '';
    
    // Icon padding classes
    const leftIconClass = leftIcon ? 'pl-10' : '';
    const rightIconClass = rightIcon ? 'pr-10' : '';
    
    // Combine all classes
    const inputClasses = `${baseClasses} ${widthClass} ${errorClasses} ${leftIconClass} ${rightIconClass} ${className}`;
    
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={inputClasses}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-description` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-destructive" id={`${props.id}-error`}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-muted-foreground" id={`${props.id}-description`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 