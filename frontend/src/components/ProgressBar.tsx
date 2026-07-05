import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'brand';
  className?: string;
  height?: 'sm' | 'md' | 'lg';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'brand',
  className = '',
  height = 'sm'
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const barColors = {
    blue: 'bg-[var(--color-status-scheduled)]',
    green: 'bg-[var(--color-status-success)]',
    yellow: 'bg-[var(--color-status-warning)]',
    purple: 'bg-[var(--color-status-info)]',
    red: 'bg-[var(--color-status-danger)]',
    brand: 'bg-[var(--color-brand-primary)]'
  };

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={`w-full rounded-full bg-[var(--color-border)]/50 dark:bg-[var(--color-border)] overflow-hidden ${heightClasses[height]} ${className}`}>
      <div 
        className={`h-full rounded-full transition-all duration-300 ${barColors[color]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
