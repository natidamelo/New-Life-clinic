import React, { useState } from 'react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ListboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
}

const Listbox: React.FC<ListboxProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select an option',
  label,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedOption = options.find(option => option.value === value);
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          className={`relative w-full cursor-default rounded-md bg-primary-foreground py-1.5 pl-3 pr-10 text-left text-muted-foreground shadow-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="block truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-primary-foreground py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border-b border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                className={`relative cursor-default select-none py-2 pl-3 pr-9 w-full text-left ${
                  option.value === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !option.disabled && handleSelect(option.value)}
                disabled={option.disabled}
              >
                <span className={`block truncate ${option.value === value ? 'font-semibold' : 'font-normal'}`}>
                  {option.label}
                </span>
                {option.value === value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="relative cursor-default select-none py-2 pl-3 pr-9 text-muted-foreground">
                No options found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Listbox;