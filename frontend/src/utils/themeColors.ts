/**
 * Theme Color Utilities
 * Provides consistent color application using semantic color tokens
 */

// Priority color utilities
export const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'bg-[hsl(var(--priority-urgent))] text-[hsl(var(--priority-urgent-foreground))] border-[hsl(var(--priority-urgent-border))]';
    case 'high':
      return 'bg-[hsl(var(--priority-high))] text-[hsl(var(--priority-high-foreground))] border-[hsl(var(--priority-high-border))]';
    case 'medium':
      return 'bg-[hsl(var(--priority-medium))] text-[hsl(var(--priority-medium-foreground))] border-[hsl(var(--priority-medium-border))]';
    case 'low':
      return 'bg-[hsl(var(--priority-low))] text-[hsl(var(--priority-low-foreground))] border-[hsl(var(--priority-low-border))]';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

// Task status color utilities
export const getTaskStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-[hsl(var(--task-completed))] text-[hsl(var(--task-completed-foreground))] border-[hsl(var(--task-completed-border))]';
    case 'in_progress':
    case 'in-progress':
      return 'bg-[hsl(var(--task-in-progress))] text-[hsl(var(--task-in-progress-foreground))] border-[hsl(var(--task-in-progress-border))]';
    case 'pending':
      return 'bg-[hsl(var(--task-pending))] text-[hsl(var(--task-pending-foreground))] border-[hsl(var(--task-pending-border))]';
    case 'cancelled':
      return 'bg-[hsl(var(--task-cancelled))] text-[hsl(var(--task-cancelled-foreground))] border-[hsl(var(--task-cancelled-border))]';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

// Patient status color utilities
export const getPatientStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'admitted':
      return 'bg-[hsl(var(--patient-admitted))] text-[hsl(var(--patient-admitted-foreground))] border-[hsl(var(--patient-admitted-border))]';
    case 'discharged':
      return 'bg-[hsl(var(--patient-discharged))] text-[hsl(var(--patient-discharged-foreground))] border-[hsl(var(--patient-discharged-border))]';
    case 'outpatient':
      return 'bg-[hsl(var(--patient-outpatient))] text-[hsl(var(--patient-outpatient-foreground))] border-[hsl(var(--patient-outpatient-border))]';
    case 'emergency':
      return 'bg-[hsl(var(--patient-emergency))] text-[hsl(var(--patient-emergency-foreground))] border-[hsl(var(--patient-emergency-border))]';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

// Department color utilities
export const getDepartmentColor = (department: string): string => {
  switch (department.toLowerCase()) {
    case 'nurse':
      return 'bg-[hsl(var(--dept-nurse))] text-[hsl(var(--dept-nurse-foreground))] border-[hsl(var(--dept-nurse-border))]';
    case 'doctor':
      return 'bg-[hsl(var(--dept-doctor))] text-[hsl(var(--dept-doctor-foreground))] border-[hsl(var(--dept-doctor-border))]';
    case 'lab':
      return 'bg-[hsl(var(--dept-lab))] text-[hsl(var(--dept-lab-foreground))] border-[hsl(var(--dept-lab-border))]';
    case 'imaging':
      return 'bg-[hsl(var(--dept-imaging))] text-[hsl(var(--dept-imaging-foreground))] border-[hsl(var(--dept-imaging-border))]';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

// General status color utilities
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'paid':
      return 'bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] border-[hsl(var(--status-success-border))]';
    case 'warning':
    case 'pending':
    case 'partial':
      return 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] border-[hsl(var(--status-warning-border))]';
    case 'error':
    case 'cancelled':
    case 'overdue':
      return 'bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] border-[hsl(var(--status-error-border))]';
    case 'info':
    case 'in-progress':
    case 'active':
      return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

// Payment status color utilities
export const getPaymentStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] border-[hsl(var(--status-success-border))]';
    case 'pending':
      return 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] border-[hsl(var(--status-warning-border))]';
    case 'partial':
      return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
    case 'overdue':
      return 'bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] border-[hsl(var(--status-error-border))]';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

// Appointment status color utilities
export const getAppointmentStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'scheduled':
      return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
    case 'waiting':
      return 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] border-[hsl(var(--status-warning-border))]';
    case 'in-progress':
    case 'active':
      return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
    case 'completed':
      return 'bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] border-[hsl(var(--status-success-border))]';
    case 'cancelled':
      return 'bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] border-[hsl(var(--status-error-border))]';
    default:
      return 'bg-muted/20 text-muted-foreground border-border/30';
  }
};

// Utility function to get background color only
export const getBackgroundColor = (type: 'priority' | 'status' | 'task' | 'patient' | 'department', value: string): string => {
  switch (type) {
    case 'priority':
      return getPriorityColor(value).split(' ')[0];
    case 'status':
      return getStatusColor(value).split(' ')[0];
    case 'task':
      return getTaskStatusColor(value).split(' ')[0];
    case 'patient':
      return getPatientStatusColor(value).split(' ')[0];
    case 'department':
      return getDepartmentColor(value).split(' ')[0];
    default:
      return 'bg-muted/20';
  }
};

// Utility function to get text color only
export const getTextColor = (type: 'priority' | 'status' | 'task' | 'patient' | 'department', value: string): string => {
  switch (type) {
    case 'priority':
      return getPriorityColor(value).split(' ')[1];
    case 'status':
      return getStatusColor(value).split(' ')[1];
    case 'task':
      return getTaskStatusColor(value).split(' ')[1];
    case 'patient':
      return getPatientStatusColor(value).split(' ')[1];
    case 'department':
      return getDepartmentColor(value).split(' ')[1];
    default:
      return 'text-muted-foreground';
  }
};
