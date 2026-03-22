import React from 'react';
import { Card, CardContent, Typography, Grid, Box, Chip } from '@mui/material';
import { formatDate, formatTime } from '../../utils/formatters';

interface ConsultationCardProps {
  record: {
    id: string;
    date: string;
    doctorName?: string;
    status?: string;
    chiefComplaint?: string;
    diagnosis?: string;
    recordType?: string;
  };
}

const ConsultationCard: React.FC<ConsultationCardProps> = ({ record }) => {
  const recordTitle = record.recordType || 'Consultation';

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Typography variant="h6">
              {recordTitle}
              {record.status === 'draft' && (
                <Chip 
                  label="Draft" 
                  size="small" 
                  color="warning" 
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {record.chiefComplaint || 'N/A'}
            </Typography>
          </Grid>
          <Grid size={12}>
            <Typography variant="body1">
              {record.diagnosis || 'No diagnosis recorded'}
            </Typography>
          </Grid>
          <Grid size={12}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mt: 1,
              pt: 1,
              borderTop: '1px solid #eee',
              color: 'text.secondary',
              fontSize: '0.75rem'
            }}>
              <Typography variant="caption">
                {record.status === 'draft' ? 'Draft created' : 'Created'} on {formatDate(record.date || new Date().toISOString())} at {formatTime(record.date || new Date().toISOString())} by Dr. {record.doctorName || 'Unknown'}
              </Typography>
              <Typography variant="caption">
                Record ID: {record.id}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ConsultationCard; 