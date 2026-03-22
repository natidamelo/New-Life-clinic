import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  rows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = false, className = '', rows = 4, ...props }, ref) => {
    // Base classes
    const baseClasses = 'block rounded-md border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 sm:text-sm';
    
    // Width class
    const widthClass = fullWidth ? 'w-full' : '';
    
    // Error classes
    const errorClasses = error ? 'border-destructive/40 text-destructive placeholder-red-300 focus:border-destructive focus:ring-red-500' : '';
    
    // Combine all classes
    const textareaClasses = `${baseClasses} ${widthClass} ${errorClasses} ${className}`;
    
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          rows={rows}
          className={textareaClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-description` : undefined}
          {...props}
        />
        
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

Textarea.displayName = 'Textarea';

export default Textarea; 