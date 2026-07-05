import React from 'react';

export type StatusType = 
  | 'scheduled' 
  | 'completed' 
  | 'pending' 
  | 'cancelled' 
  | 'active' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'admitted' 
  | 'discharged' 
  | 'emergency' 
  | 'outpatient'
  | 'checked_in'
  | 'overtime_active'
  | 'overtime_completed';

interface StatusBadgeProps {
  status: StatusType | string;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className = '',
  size = 'sm'
}) => {
  const normStatus = status.toLowerCase().replace(/[\s_-]+/g, '');

  let badgeColorClass = 'bg-[var(--color-status-scheduled-subtle)] text-[var(--color-status-scheduled)] border border-[var(--color-status-scheduled-subtle)]/30';

  if (
    normStatus === 'completed' || 
    normStatus === 'success' || 
    normStatus === 'discharged' || 
    normStatus === 'active' || 
    normStatus === 'checkedin' || 
    normStatus === 'given' || 
    normStatus === 'administered' ||
    normStatus === 'completed'
  ) {
    badgeColorClass = 'bg-[var(--color-status-success-subtle)] text-[var(--color-status-success)] border border-[var(--color-status-success-subtle)]/30';
  } else if (
    normStatus === 'pending' || 
    normStatus === 'scheduled' || 
    normStatus === 'outpatient' || 
    normStatus === 'inprogress'
  ) {
    badgeColorClass = 'bg-[var(--color-status-scheduled-subtle)] text-[var(--color-status-scheduled)] border border-[var(--color-status-scheduled-subtle)]/30';
  } else if (
    normStatus === 'warning' || 
    normStatus === 'rescheduled' || 
    normStatus === 'overtimeactive' || 
    normStatus === 'pendingpayment' ||
    normStatus === 'partiallypaid'
  ) {
    badgeColorClass = 'bg-[var(--color-status-warning-subtle)] text-[var(--color-status-warning)] border border-[var(--color-status-warning-subtle)]/30';
  } else if (
    normStatus === 'cancelled' || 
    normStatus === 'danger' || 
    normStatus === 'emergency' || 
    normStatus === 'failed' || 
    normStatus === 'overdue' || 
    normStatus === 'absent' || 
    normStatus === 'high' || 
    normStatus === 'unpaid'
  ) {
    badgeColorClass = 'bg-[var(--color-status-danger-subtle)] text-[var(--color-status-danger)] border border-[var(--color-status-danger-subtle)]/30';
  } else if (
    normStatus === 'info' || 
    normStatus === 'admitted' || 
    normStatus === 'normal' || 
    normStatus === 'referred' ||
    normStatus === 'overtimecompleted'
  ) {
    badgeColorClass = 'bg-[var(--color-status-info-subtle)] text-[var(--color-status-info)] border border-[var(--color-status-info-subtle)]/30';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-md uppercase',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-lg uppercase',
    lg: 'px-3 py-1.5 text-sm font-semibold rounded-xl uppercase'
  };

  const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap';

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${badgeColorClass} ${className}`}>
      {children || status.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
