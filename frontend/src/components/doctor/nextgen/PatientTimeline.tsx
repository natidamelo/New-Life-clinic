import React from 'react';
import { 
  Box, Typography, Paper
} from '@mui/material';
import { 
  Timeline, TimelineItem, 
  TimelineSeparator, TimelineConnector, TimelineContent, 
  TimelineDot, TimelineOppositeContent
} from '@mui/lab';
import {
  MedicalServices as MedicalIcon,
  Science as LabIcon,
  Medication as MedicationIcon,
  Event as AppointmentIcon
} from '@mui/icons-material';
import { formatDate } from '../../../utils/formatters';

interface PatientTimelineProps {
  patientId: string;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ patientId }) => {
  // This is a placeholder component that would show a timeline of patient events
  // In a real implementation, it would fetch data from an API
  
  // Sample timeline events
  const timelineEvents = [
    {
      id: '1',
      type: 'appointment',
      title: 'Follow-up Appointment',
      date: new Date(2023, 5, 15),
      description: 'Follow-up for previous treatment'
    },
    {
      id: '2',
      type: 'medication',
      title: 'Prescription Change',
      date: new Date(2023, 5, 10),
      description: 'Changed dosage of hypertension medication'
    },
    {
      id: '3',
      type: 'lab',
      title: 'Blood Work Results',
      date: new Date(2023, 5, 5),
      description: 'Complete blood count and metabolic panel'
    },
    {
      id: '4',
      type: 'visit',
      title: 'Initial Consultation',
      date: new Date(2023, 5, 1),
      description: 'First visit for hypertension'
    }
  ];

  // Get icon based on event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <AppointmentIcon />;
      case 'medication':
        return <MedicationIcon />;
      case 'lab':
        return <LabIcon />;
      case 'visit':
        return <MedicalIcon />;
      default:
        return <MedicalIcon />;
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Patient Timeline</Typography>
      
      <Timeline position="alternate">
        {timelineEvents.map((event) => (
          <TimelineItem key={event.id}>
            <TimelineOppositeContent color="text.secondary">
              {formatDate(event.date)}
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={
                event.type === 'visit' ? 'primary' : 
                event.type === 'lab' ? 'secondary' : 
                event.type === 'medication' ? 'success' : 
                'info'
              }>
                {getEventIcon(event.type)}
              </TimelineDot>
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Typography variant="subtitle1">{event.title}</Typography>
              <Typography variant="body2">{event.description}</Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Paper>
  );
};

export default PatientTimeline; 