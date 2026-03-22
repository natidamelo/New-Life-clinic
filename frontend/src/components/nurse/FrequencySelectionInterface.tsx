import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, Clock, Calendar, Pill } from 'lucide-react';
import { toast } from 'react-toastify';

interface FrequencySelectionInterfaceProps {
  currentFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  isEditable?: boolean;
  showLabels?: boolean;
}

interface FrequencyOption {
  value: string;
  label: string;
  abbreviation: string;
  dosesPerDay: number;
  description: string;
  timeSlots: string[];
}

const FrequencySelectionInterface: React.FC<FrequencySelectionInterfaceProps> = ({
  currentFrequency,
  onFrequencyChange,
  isEditable = true,
  showLabels = true
}) => {
  const [selectedFrequency, setSelectedFrequency] = useState<string>(currentFrequency);

  const frequencyOptions: FrequencyOption[] = [
    {
      value: 'QD (once daily)',
      label: 'Once Daily',
      abbreviation: 'QD',
      dosesPerDay: 1,
      description: '1 dose per day',
      timeSlots: ['09:00']
    },
    {
      value: 'BID (twice daily)',
      label: 'Twice Daily',
      abbreviation: 'BID',
      dosesPerDay: 2,
      description: '2 doses per day',
      timeSlots: ['09:00', '21:00']
    },
    {
      value: 'TID (three times daily)',
      label: 'Three Times Daily',
      abbreviation: 'TID',
      dosesPerDay: 3,
      description: '3 doses per day',
      timeSlots: ['09:00', '15:00', '21:00']
    },
    {
      value: 'QID (four times daily)',
      label: 'Four Times Daily',
      abbreviation: 'QID',
      dosesPerDay: 4,
      description: '4 doses per day',
      timeSlots: ['06:00', '12:00', '18:00', '00:00']
    }
  ];

  useEffect(() => {
    setSelectedFrequency(currentFrequency);
  }, [currentFrequency]);

  const handleFrequencyChange = (frequency: string) => {
    if (!isEditable) {
      toast.warning('Frequency cannot be changed for this medication');
      return;
    }

    setSelectedFrequency(frequency);
    onFrequencyChange(frequency);
    
    const selectedOption = frequencyOptions.find(opt => opt.value === frequency);
    if (selectedOption) {
      toast.success(`Frequency changed to ${selectedOption.label} (${selectedOption.dosesPerDay} doses/day)`);
    }
  };

  const getCurrentOption = () => {
    return frequencyOptions.find(opt => opt.value === selectedFrequency) || frequencyOptions[0];
  };

  const currentOption = getCurrentOption();

  return (
    <div className="frequency-selection-interface">
      {/* Frequency Selection Header */}
      <div className="mb-3 p-2 bg-primary/10 rounded-lg border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-primary text-sm">Medication Frequency</h4>
          </div>
          {isEditable && (
            <div className="text-xs text-primary bg-primary/20 px-2 py-1 rounded">
              Click to change
            </div>
          )}
        </div>
        
        {/* Current Frequency Display */}
        <div className="mt-2 p-2 bg-primary-foreground rounded border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-muted-foreground">{currentOption.label}</div>
              <div className="text-xs text-muted-foreground">{currentOption.description}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{currentOption.abbreviation}</div>
              <div className="text-xs text-muted-foreground">{currentOption.dosesPerDay} doses/day</div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequency Selection Checkboxes */}
      {isEditable && (
        <div className="frequency-options">
          <div className="text-xs font-medium text-muted-foreground mb-2">Select Frequency:</div>
          <div className="grid grid-cols-2 gap-2">
            {frequencyOptions.map((option) => (
              <div
                key={option.value}
                className={`frequency-option p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedFrequency === option.value
                    ? 'bg-primary/20 border-primary/40 shadow-sm'
                    : 'bg-primary-foreground border-border/30 hover:bg-muted/10 hover:border-border/40'
                }`}
                onClick={() => handleFrequencyChange(option.value)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedFrequency === option.value
                        ? 'bg-primary border-primary'
                        : 'border-border/40'
                    }`}>
                      {selectedFrequency === option.value && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-muted-foreground">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{option.abbreviation}</div>
                  </div>
                </div>
                
                {/* Time Slots Preview */}
                {showLabels && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {option.timeSlots.map((timeSlot, index) => (
                      <div
                        key={index}
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          selectedFrequency === option.value
                            ? 'bg-primary/30 text-primary'
                            : 'bg-muted/20 text-muted-foreground'
                        }`}
                      >
                        {timeSlot}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency Information */}
      <div className="mt-3 p-2 bg-muted/10 rounded-lg">
        <div className="text-xs text-muted-foreground">
          <div className="font-medium mb-1">Frequency Guide:</div>
          <div className="space-y-1">
            <div><strong>QD:</strong> Once daily (1 dose)</div>
            <div><strong>BID:</strong> Twice daily (2 doses)</div>
            <div><strong>TID:</strong> Three times daily (3 doses)</div>
            <div><strong>QID:</strong> Four times daily (4 doses)</div>
          </div>
        </div>
      </div>

      {/* Current Selection Summary */}
      <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/30">
        <div className="flex items-center space-x-2">
          <Check className="w-4 h-4 text-primary" />
          <div className="text-sm">
            <span className="font-medium text-primary">Current:</span>{' '}
            <span className="text-primary">{currentOption.label} ({currentOption.abbreviation})</span>
          </div>
        </div>
        <div className="text-xs text-primary mt-1">
          {currentOption.dosesPerDay} dose{currentOption.dosesPerDay > 1 ? 's' : ''} per day
        </div>
      </div>
    </div>
  );
};

export default FrequencySelectionInterface;
