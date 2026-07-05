import React from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'brand';
  progress?: number;
  trend?: number; // e.g. +12 or -5
  to?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  color = 'brand',
  progress,
  trend,
  to
}) => {
  const colorMaps = {
    blue: {
      subtleBg: 'bg-[var(--color-status-scheduled-subtle)]',
      text: 'text-[var(--color-status-scheduled)]',
      border: 'border-[var(--color-status-scheduled-subtle)]/40',
      splash: 'bg-[var(--color-status-scheduled-subtle)]/40'
    },
    green: {
      subtleBg: 'bg-[var(--color-status-success-subtle)]',
      text: 'text-[var(--color-status-success)]',
      border: 'border-[var(--color-status-success-subtle)]/40',
      splash: 'bg-[var(--color-status-success-subtle)]/40'
    },
    yellow: {
      subtleBg: 'bg-[var(--color-status-warning-subtle)]',
      text: 'text-[var(--color-status-warning)]',
      border: 'border-[var(--color-status-warning-subtle)]/40',
      splash: 'bg-[var(--color-status-warning-subtle)]/40'
    },
    purple: {
      subtleBg: 'bg-[var(--color-status-info-subtle)]',
      text: 'text-[var(--color-status-info)]',
      border: 'border-[var(--color-status-info-subtle)]/40',
      splash: 'bg-[var(--color-status-info-subtle)]/40'
    },
    red: {
      subtleBg: 'bg-[var(--color-status-danger-subtle)]',
      text: 'text-[var(--color-status-danger)]',
      border: 'border-[var(--color-status-danger-subtle)]/40',
      splash: 'bg-[var(--color-status-danger-subtle)]/40'
    },
    brand: {
      subtleBg: 'bg-[var(--color-brand-primary)]/10',
      text: 'text-[var(--color-brand-primary)]',
      border: 'border-[var(--color-brand-primary)]/20',
      splash: 'bg-[var(--color-brand-primary)]/5'
    }
  };

  const selectedColor = colorMaps[color];

  const cardContent = (
    <>
      {/* Background corner splash */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full ${selectedColor.splash} pointer-events-none`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 truncate">{title}</p>
          <p className="text-3xl font-extrabold text-[var(--color-text-primary)] leading-tight">{value}</p>
          
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {trend !== undefined && (
              <span className={`text-xs font-bold ${trend >= 0 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}`}>
                {trend >= 0 ? `+${trend}%` : `${trend}%`}
              </span>
            )}
            {subtext && (
              <p className="text-xs text-[var(--color-text-muted)] truncate">{subtext}</p>
            )}
          </div>
        </div>

        {icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${selectedColor.subtleBg} ${selectedColor.text} ${selectedColor.border}`}>
            {icon}
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4 relative z-10">
          <ProgressBar value={progress} color={color} />
        </div>
      )}
    </>
  );

  const containerClasses = "relative overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow duration-300 p-5 block h-full";

  if (to) {
    return (
      <Link to={to} className={containerClasses}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={containerClasses}>
      {cardContent}
    </div>
  );
};

export default StatCard;
