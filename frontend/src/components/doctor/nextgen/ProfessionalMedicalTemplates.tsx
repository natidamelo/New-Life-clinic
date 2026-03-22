import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardHeader, Grid,
  Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, Divider,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Autocomplete, Alert, AlertTitle
} from '@mui/material';
import {
  Assignment as TemplateIcon,
  LocalHospital as HospitalIcon,
  Psychology as PsychIcon,
  Healing as EmergencyIcon,
  FitnessCenter as SportsIcon,
  ChildCare as PediatricsIcon,
  Elderly as GeriatricsIcon,
  Favorite as CardiologyIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface MedicalTemplate {
  id: string;
  name: string;
  specialty: string;
  description: string;
  sections: {
    chiefComplaint: string[];
    physicalExam: Record<string, string>;
    commonDiagnoses: string[];
    treatmentPlans: string[];
  };
  icon: React.ReactNode;
  color: string;
}

const professionalTemplates: MedicalTemplate[] = [
  {
    id: 'general-medicine',
    name: 'General Medicine Consultation',
    specialty: 'Internal Medicine',
    description: 'Comprehensive template for general internal medicine consultations',
    icon: <HospitalIcon />,
    color: 'primary',
    sections: {
      chiefComplaint: [
        'Routine health maintenance',
        'Follow-up for chronic conditions',
        'New symptom evaluation',
        'Medication review',
        'Preventive care screening'
      ],
      physicalExam: {
        general: 'Well-appearing, alert, oriented x3, in no acute distress',
        vitals: 'Stable vital signs within normal limits',
        heent: 'PERRL, EOMI, TMs clear, throat non-erythematous',
        cardiovascular: 'Regular rate and rhythm, no murmurs, rubs, or gallops',
        respiratory: 'Clear to auscultation bilaterally, no wheezes or rales',
        abdomen: 'Soft, non-tender, non-distended, normal bowel sounds',
        extremities: 'No clubbing, cyanosis, or edema',
        neurological: 'Alert and oriented, normal reflexes, no focal deficits'
      },
      commonDiagnoses: [
        'Hypertension (I10)',
        'Type 2 Diabetes Mellitus (E11.9)',
        'Hyperlipidemia (E78.5)',
        'Annual physical examination (Z00.00)',
        'Essential hypertension monitoring (Z87.891)'
      ],
      treatmentPlans: [
        'Continue current medications as prescribed',
        'Lifestyle modifications: diet and exercise',
        'Follow-up in 3-6 months',
        'Laboratory studies as indicated',
        'Preventive care screenings per guidelines'
      ]
    }
  },
  {
    id: 'emergency-medicine',
    name: 'Emergency Department Evaluation',
    specialty: 'Emergency Medicine',
    description: 'Template for emergency department encounters',
    icon: <EmergencyIcon />,
    color: 'error',
    sections: {
      chiefComplaint: [
        'Chest pain',
        'Shortness of breath',
        'Abdominal pain',
        'Headache',
        'Trauma evaluation'
      ],
      physicalExam: {
        general: 'Alert, appears stated age, cooperative with examination',
        vitals: 'See nursing documentation for vital signs',
        heent: 'Atraumatic, PERRL, no obvious facial trauma',
        cardiovascular: 'RRR, no murmurs, peripheral pulses intact',
        respiratory: 'Lungs clear bilaterally, no respiratory distress',
        abdomen: 'Soft, bowel sounds present, examined for tenderness',
        neurological: 'Alert and oriented, normal speech, no focal deficits'
      },
      commonDiagnoses: [
        'Acute chest pain (R06.02)',
        'Dyspnea (R06.00)',
        'Acute abdominal pain (R10.9)',
        'Headache (R51)',
        'Contusion of unspecified body region (T14.0)'
      ],
      treatmentPlans: [
        'Symptom management as appropriate',
        'Diagnostic workup as clinically indicated',
        'Disposition: discharge home vs admission',
        'Return precautions provided',
        'Follow-up with primary care physician'
      ]
    }
  },
  {
    id: 'mental-health',
    name: 'Mental Health Assessment',
    specialty: 'Psychiatry',
    description: 'Comprehensive mental health evaluation template',
    icon: <PsychIcon />,
    color: 'secondary',
    sections: {
      chiefComplaint: [
        'Depression screening',
        'Anxiety evaluation',
        'Medication management',
        'Behavioral concerns',
        'Crisis intervention'
      ],
      physicalExam: {
        appearance: 'Well-groomed, appropriate dress, good eye contact',
        behavior: 'Cooperative, calm, no psychomotor agitation',
        speech: 'Normal rate, rhythm, and volume',
        mood: 'Patient reports mood as [describe]',
        affect: 'Congruent with stated mood, appropriate range',
        thought: 'Organized, goal-directed, no flight of ideas',
        perception: 'No reported hallucinations or delusions',
        cognition: 'Alert, oriented x3, intact memory and concentration',
        insight: 'Good insight into current difficulties',
        judgment: 'Fair to good judgment demonstrated'
      },
      commonDiagnoses: [
        'Major depressive disorder (F32.9)',
        'Generalized anxiety disorder (F41.1)',
        'Adjustment disorder (F43.20)',
        'Bipolar disorder (F31.9)',
        'Post-traumatic stress disorder (F43.10)'
      ],
      treatmentPlans: [
        'Psychopharmacological intervention',
        'Psychotherapy referral',
        'Safety planning and risk assessment',
        'Lifestyle modifications',
        'Regular follow-up appointments'
      ]
    }
  },
  {
    id: 'pediatric',
    name: 'Pediatric Well-Child Visit',
    specialty: 'Pediatrics',
    description: 'Template for pediatric well-child examinations',
    icon: <PediatricsIcon />,
    color: 'info',
    sections: {
      chiefComplaint: [
        'Well-child check',
        'Immunization visit',
        'Growth and development assessment',
        'Behavioral concerns',
        'School physical'
      ],
      physicalExam: {
        general: 'Well-appearing child, alert and interactive',
        growth: 'Height, weight, and head circumference plotted on growth charts',
        heent: 'Red reflexes present, TMs mobile and translucent',
        cardiovascular: 'RRR, no murmurs, femoral pulses palpable',
        respiratory: 'Clear lung fields, no retractions or wheeze',
        abdomen: 'Soft, no masses, umbilicus healed',
        genitourinary: 'Normal external genitalia, testes descended (males)',
        musculoskeletal: 'Normal range of motion, no hip dysplasia',
        neurological: 'Age-appropriate development and reflexes'
      },
      commonDiagnoses: [
        'Routine child health examination (Z00.129)',
        'Normal growth and development',
        'Immunization encounter (Z23)',
        'Health supervision (Z76.2)'
      ],
      treatmentPlans: [
        'Age-appropriate immunizations per CDC schedule',
        'Anticipatory guidance provided',
        'Nutritional counseling',
        'Safety education',
        'Next well-child visit scheduled'
      ]
    }
  }
];

// Common medical conditions with ICD-10 codes
const commonConditions = [
  { label: 'Hypertension', code: 'I10', category: 'Cardiovascular' },
  { label: 'Type 2 Diabetes', code: 'E11.9', category: 'Endocrine' },
  { label: 'Hyperlipidemia', code: 'E78.5', category: 'Endocrine' },
  { label: 'Acute URI', code: 'J06.9', category: 'Respiratory' },
  { label: 'UTI', code: 'N39.0', category: 'Genitourinary' },
  { label: 'Headache', code: 'R51', category: 'Neurological' },
  { label: 'Back Pain', code: 'M54.9', category: 'Musculoskeletal' },
  { label: 'Depression', code: 'F32.9', category: 'Mental Health' },
  { label: 'Anxiety', code: 'F41.9', category: 'Mental Health' },
  { label: 'Gastroenteritis', code: 'K59.1', category: 'Gastrointestinal' }
];

// Professional medication database
const commonMedications = [
  { name: 'Lisinopril', strength: '10mg', frequency: 'Once daily', indication: 'Hypertension' },
  { name: 'Metformin', strength: '500mg', frequency: 'Twice daily', indication: 'Diabetes' },
  { name: 'Atorvastatin', strength: '20mg', frequency: 'Once daily', indication: 'Hyperlipidemia' },
  { name: 'Amoxicillin', strength: '500mg', frequency: 'Three times daily', indication: 'Infection' },
  { name: 'Ibuprofen', strength: '400mg', frequency: 'As needed', indication: 'Pain/Inflammation' },
  { name: 'Omeprazole', strength: '20mg', frequency: 'Once daily', indication: 'GERD' },
  { name: 'Sertraline', strength: '50mg', frequency: 'Once daily', indication: 'Depression' },
  { name: 'Lorazepam', strength: '0.5mg', frequency: 'As needed', indication: 'Anxiety' }
];

interface ProfessionalMedicalTemplatesProps {
  onTemplateSelect: (template: MedicalTemplate) => void;
  onConditionSelect: (condition: any) => void;
  onMedicationSelect: (medication: any) => void;
  handleCreateTemplate: () => void;
}

const ProfessionalMedicalTemplates: React.FC<ProfessionalMedicalTemplatesProps> = ({
  onTemplateSelect,
  onConditionSelect,
  onMedicationSelect,
  handleCreateTemplate
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<MedicalTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [conditionSearch, setConditionSearch] = useState('');
  const [medicationSearch, setMedicationSearch] = useState('');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Professional Medical Templates & Resources
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Professional Templates</AlertTitle>
        These templates follow current medical documentation standards and include ICD-10 codes, 
        evidence-based assessment guidelines, and professional terminology.
      </Alert>

      <Grid container spacing={3}>
                                   <Grid size={{ xs: 12 }} component="div">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Professional Medical Templates</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateTemplate}
            >
              Create Template
            </Button>
          </Box>
        </Grid>
                                   <Grid size={{ xs: 12 }} component="div">
          <Typography variant="body2" color="text.secondary">
            Select a template to view its details and apply it to the current medical record.
          </Typography>
        </Grid>
      </Grid>

      {/* Template Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
                                   <Grid size={{ xs: 12 }} component="div">
          <Typography variant="h5" gutterBottom>Documentation Templates</Typography>
        </Grid>
        {professionalTemplates.map((template) => (
             <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id} component="div">
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                '&:hover': { elevation: 4 }
              }}
              onClick={() => {
                setSelectedTemplate(template);
                setTemplateDialogOpen(true);
              }}
            >
              <CardHeader
                avatar={React.cloneElement(template.icon as React.ReactElement, { 
                  color: template.color as any 
                })}
                title={template.name}
                subheader={template.specialty}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={template.specialty} 
                    size="small" 
                    color={template.color as any}
                    variant="outlined" 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Reference Sections */}
      <Grid container spacing={3}>
        {/* Common Conditions */}
           <Grid size={{ xs: 12, md: 6 }} component="div">
          <Card>
            <CardHeader title="Common Diagnoses (ICD-10)" />
            <CardContent>
              <Autocomplete
                options={commonConditions}
                groupBy={(option) => option.category}
                getOptionLabel={(option) => `${option.label} (${option.code})`}
                onChange={(_, value) => value && onConditionSelect(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search conditions..."
                    variant="outlined"
                    fullWidth
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.code} - {option.category}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Frequently Used:</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {commonConditions.slice(0, 6).map((condition) => (
                    <Chip
                      key={condition.code}
                      label={`${condition.label} (${condition.code})`}
                      size="small"
                      onClick={() => onConditionSelect(condition)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Common Medications */}
           <Grid size={{ xs: 12, md: 6 }} component="div">
          <Card>
            <CardHeader title="Common Medications" />
            <CardContent>
              <Autocomplete
                options={commonMedications}
                getOptionLabel={(option) => `${option.name} ${option.strength}`}
                onChange={(_, value) => value && onMedicationSelect(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search medications..."
                    variant="outlined"
                    fullWidth
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.name} {option.strength}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.frequency} - {option.indication}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Frequently Prescribed:</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {commonMedications.slice(0, 6).map((med) => (
                    <Chip
                      key={med.name}
                      label={`${med.name} ${med.strength}`}
                      size="small"
                      onClick={() => onMedicationSelect(med)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Template Preview Dialog */}
      <Dialog 
        open={templateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedTemplate?.icon}
            {selectedTemplate?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedTemplate.description}
              </Typography>
              
              <Typography variant="h6" gutterBottom>Template Sections:</Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>Chief Complaint Options:</Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {selectedTemplate.sections.chiefComplaint.map((cc, index) => (
                  <Chip key={index} label={cc} size="small" variant="outlined" />
                ))}
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>Physical Exam Template:</Typography>
              <List dense>
                {Object.entries(selectedTemplate.sections.physicalExam).map(([system, finding]) => (
                  <ListItem key={system}>
                    <ListItemText
                      primary={system.toUpperCase()}
                      secondary={finding}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Typography variant="subtitle1" gutterBottom>Common Diagnoses:</Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {selectedTemplate.sections.commonDiagnoses.map((dx, index) => (
                  <Chip key={index} label={dx} size="small" variant="outlined" color="primary" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (selectedTemplate) {
                onTemplateSelect(selectedTemplate);
                setTemplateDialogOpen(false);
              }
            }}
          >
            Use Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfessionalMedicalTemplates; 