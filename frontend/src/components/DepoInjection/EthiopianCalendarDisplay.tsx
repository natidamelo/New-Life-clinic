/**
 * Ethiopian Calendar Display Component
 * 
 * Displays dates in both Gregorian and Ethiopian calendars
 */

import React from 'react';
import { Calendar, Globe } from 'lucide-react';

interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  formatted: string;
}

interface EthiopianCalendarDisplayProps {
  ethiopianDate: EthiopianDate;
  gregorianDate: string;
  showBoth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EthiopianCalendarDisplay: React.FC<EthiopianCalendarDisplayProps> = ({
  ethiopianDate,
  gregorianDate,
  showBoth = true,
  size = 'md',
  className = ''
}) => {
  const formatGregorianDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Ethiopian Date */}
      <div className="flex items-center gap-2">
        <Globe className={`${getIconSize()} text-primary`} />
        <div className={getSizeClasses()}>
          <p className="font-medium text-muted-foreground">
            {ethiopianDate.formatted}
          </p>
          <p className="text-muted-foreground">
            Ethiopian Calendar
          </p>
        </div>
      </div>

      {/* Gregorian Date */}
      {showBoth && (
        <div className="flex items-center gap-2">
          <Calendar className={`${getIconSize()} text-primary`} />
          <div className={getSizeClasses()}>
            <p className="font-medium text-muted-foreground">
              {formatGregorianDate(gregorianDate)}
            </p>
            <p className="text-muted-foreground">
              Gregorian Calendar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EthiopianCalendarDisplay;

