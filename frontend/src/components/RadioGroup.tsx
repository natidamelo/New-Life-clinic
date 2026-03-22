import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';

interface Option {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  label,
  className = ''
}) => {
  return (
    <div className={className}>
      {label && (
        <div className="text-base font-medium text-muted-foreground mb-3">
          {label}
        </div>
      )}
      
      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.value}
            className={`relative flex cursor-pointer rounded-lg p-4 focus:outline-none ${
              option.value === value
                ? 'ring-2 ring-primary bg-primary/5'
                : 'ring-1 ring-border hover:bg-accent/50'
            } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !option.disabled && !disabled && onChange(option.value)}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <div className="flex h-5 items-center">
                  <input
                    type="radio"
                    className="h-4 w-4 border-border text-primary focus:ring-primary"
                    checked={option.value === value}
                    onChange={() => !option.disabled && !disabled && onChange(option.value)}
                    disabled={option.disabled || disabled}
                  />
                </div>
                <div className="ml-3 flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-sm text-muted-foreground/70">
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
              {option.value === value && (
                <CheckCircleIcon className="h-5 w-5 text-primary" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadioGroup;