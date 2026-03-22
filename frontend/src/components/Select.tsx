import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Option[];
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, fullWidth = false, className = '', onChange, ...props }, ref) => {
    // Base classes
    const baseClasses = 'block rounded-md border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 sm:text-sm';
    
    // Width class
    const widthClass = fullWidth ? 'w-full' : '';
    
    // Error classes
    const errorClasses = error ? 'border-destructive/40 text-destructive focus:border-destructive focus:ring-red-500' : '';
    
    // Combine all classes
    const selectClasses = `${baseClasses} ${widthClass} ${errorClasses} ${className}`;
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };
    
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {label}
          </label>
        )}
        
        <select
          ref={ref}
          className={selectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-description` : undefined}
          onChange={handleChange}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
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

Select.displayName = 'Select';

export default Select; 