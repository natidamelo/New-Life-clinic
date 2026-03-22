import React from 'react';
import { Select, MenuItem, FormControl, InputLabel, FormHelperText } from '@mui/material';

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface MedicalDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

const MedicalDropdown: React.FC<MedicalDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  required = false,
  error,
  helperText,
  disabled = false,
  fullWidth = true,
  size = 'medium'
}) => {
  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={!!error}
      required={required}
      disabled={disabled}
    >
      <InputLabel id={`${label.toLowerCase().replace(/\s+/g, '-')}-label`}>
        {label}
      </InputLabel>
      <Select
        labelId={`${label.toLowerCase().replace(/\s+/g, '-')}-label`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        sx={{
          minHeight: size === 'small' ? 40 : 56,
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center'
          }
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500 }}>{option.label}</span>
              {option.description && (
                <span style={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  marginTop: '2px'
                }}>
                  {option.description}
                </span>
              )}
            </div>
          </MenuItem>
        ))}
      </Select>
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

// Predefined dropdown options for common medical fields
export const MEDICAL_DROPDOWN_OPTIONS = {
  severity: [
    { value: 'Mild', label: 'Mild', description: 'Minimal discomfort, no interference with daily activities' },
    { value: 'Moderate', label: 'Moderate', description: 'Noticeable discomfort, some interference with activities' },
    { value: 'Severe', label: 'Severe', description: 'Significant discomfort, major interference with activities' }
  ],

  onsetPattern: [
    { value: 'Acute', label: 'Acute', description: 'Sudden onset, develops rapidly' },
    { value: 'Subacute', label: 'Subacute', description: 'Gradual onset over days to weeks' },
    { value: 'Chronic', label: 'Chronic', description: 'Long-standing condition, persists over time' }
  ],

  progression: [
    { value: 'Improving', label: 'Improving', description: 'Symptoms are getting better' },
    { value: 'Worsening', label: 'Worsening', description: 'Symptoms are getting worse' },
    { value: 'Stable', label: 'Stable', description: 'Symptoms remain unchanged' },
    { value: 'Fluctuating', label: 'Fluctuating', description: 'Symptoms come and go' }
  ],

  impactOnDailyLife: [
    { value: 'None', label: 'None', description: 'No impact on daily activities' },
    { value: 'Mild', label: 'Mild', description: 'Minimal impact on daily activities' },
    { value: 'Moderate', label: 'Moderate', description: 'Moderate impact on daily activities' },
    { value: 'Severe', label: 'Severe', description: 'Significant impact on daily activities' },
    { value: 'Complete', label: 'Complete', description: 'Unable to perform daily activities' }
  ],

  medicationFrequency: [
    { value: 'QD', label: 'QD (Once daily)', description: 'Take once per day' },
    { value: 'BID', label: 'BID (Twice daily)', description: 'Take twice per day' },
    { value: 'TID', label: 'TID (Three times daily)', description: 'Take three times per day' },
    { value: 'QID', label: 'QID (Four times daily)', description: 'Take four times per day' },
    { value: 'Q4H', label: 'Q4H (Every 4 hours)', description: 'Take every 4 hours' },
    { value: 'Q6H', label: 'Q6H (Every 6 hours)', description: 'Take every 6 hours' },
    { value: 'Q8H', label: 'Q8H (Every 8 hours)', description: 'Take every 8 hours' },
    { value: 'Q12H', label: 'Q12H (Every 12 hours)', description: 'Take every 12 hours' },
    { value: 'PRN', label: 'PRN (As needed)', description: 'Take as needed' },
    { value: 'STAT', label: 'STAT (Immediately)', description: 'Take immediately' }
  ],

  medicationRoute: [
    { value: 'Oral', label: 'Oral', description: 'By mouth' },
    { value: 'IV', label: 'IV (Intravenous)', description: 'Into a vein' },
    { value: 'IM', label: 'IM (Intramuscular)', description: 'Into a muscle' },
    { value: 'SC', label: 'SC (Subcutaneous)', description: 'Under the skin' },
    { value: 'Topical', label: 'Topical', description: 'Applied to skin' },
    { value: 'Inhaled', label: 'Inhaled', description: 'Breathed in' },
    { value: 'Rectal', label: 'Rectal', description: 'Into the rectum' },
    { value: 'Ophthalmic', label: 'Ophthalmic', description: 'Into the eye' },
    { value: 'Otic', label: 'Otic', description: 'Into the ear' },
    { value: 'Nasal', label: 'Nasal', description: 'Into the nose' }
  ],

  testUrgency: [
    { value: 'Routine', label: 'Routine', description: 'Normal processing time' },
    { value: 'Urgent', label: 'Urgent', description: 'Results needed within hours' },
    { value: 'Emergency', label: 'Emergency', description: 'Immediate results required' },
    { value: 'STAT', label: 'STAT', description: 'Immediate attention required' }
  ],

  labTestType: [
    { value: 'Routine', label: 'Routine', description: 'Standard laboratory tests' },
    { value: 'Urgent', label: 'Urgent', description: 'Time-sensitive tests' },
    { value: 'STAT', label: 'STAT', description: 'Immediate results needed' },
    { value: 'Pre-op', label: 'Pre-operative', description: 'Before surgery' },
    { value: 'Post-op', label: 'Post-operative', description: 'After surgery' },
    { value: 'Monitoring', label: 'Monitoring', description: 'Ongoing condition monitoring' }
  ]
};

export default MedicalDropdown;
