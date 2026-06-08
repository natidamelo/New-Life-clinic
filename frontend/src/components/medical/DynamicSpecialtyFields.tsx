import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { specialtyColors } from '../../config/specialtyConfigs';

interface FieldConfig {
  name: string;
  label: string;
  type: string; // "text" | "number" | "date" | "select" | "multi-select" | "textarea"
  options?: string[];
}

interface DynamicSpecialtyFieldsProps {
  fields: FieldConfig[];
  details: Record<string, any>;
  onChange: (name: string, value: any) => void;
  specialty: string;
  disabled?: boolean;
}

export const DynamicSpecialtyFields: React.FC<DynamicSpecialtyFieldsProps> = ({
  fields,
  details,
  onChange,
  specialty,
  disabled = false,
}) => {
  if (!fields || fields.length === 0) return null;

  const colors = specialtyColors[specialty as keyof typeof specialtyColors] || specialtyColors.general;

  return (
    <Box sx={{ mt: 3, mb: 1 }}>
      {/* Section Header */}
      <Box sx={{ borderLeft: `4px solid ${colors.border}`, pl: 1.5, mb: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.82rem' }}>
          {specialty === 'pediatrics' ? 'Pediatric Details' : `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Details`}
        </Typography>
      </Box>

      {/* Fields Grid */}
      <Grid container spacing={2}>
        {fields.map((field) => {
          const isFullWidth = field.type === 'textarea' || field.type === 'multi-select';
          const value = details[field.name] ?? '';

          return (
            <Grid key={field.name} size={{ xs: 12, sm: isFullWidth ? 12 : 6 }}>
              {(() => {
                switch (field.type) {
                  case 'select':
                    return (
                      <FormControl fullWidth size="small" disabled={disabled}>
                        <InputLabel id={`label-${field.name}`}>{field.label}</InputLabel>
                        <Select
                          labelId={`label-${field.name}`}
                          value={value}
                          label={field.label}
                          onChange={(e) => onChange(field.name, e.target.value)}
                        >
                          {(field.options || []).map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    );

                  case 'multi-select':
                    return (
                      <Autocomplete
                        multiple
                        size="small"
                        options={field.options || []}
                        value={Array.isArray(value) ? value : []}
                        onChange={(_, newValue) => onChange(field.name, newValue)}
                        disabled={disabled}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={field.label}
                            placeholder={`Select ${field.label}`}
                          />
                        )}
                      />
                    );

                  case 'textarea':
                    return (
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                        label={field.label}
                        value={value}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        disabled={disabled}
                      />
                    );

                  case 'date':
                    return (
                      <TextField
                        fullWidth
                        type="date"
                        size="small"
                        label={field.label}
                        InputLabelProps={{ shrink: true }}
                        value={value}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        disabled={disabled}
                      />
                    );

                  case 'number':
                    return (
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        label={field.label}
                        value={value}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange(field.name, val === '' ? '' : Number(val));
                        }}
                        disabled={disabled}
                      />
                    );

                  default:
                    return (
                      <TextField
                        fullWidth
                        size="small"
                        label={field.label}
                        value={value}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        disabled={disabled}
                      />
                    );
                }
              })()}
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
