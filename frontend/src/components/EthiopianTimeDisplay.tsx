import React, { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendanceService';

interface EthiopianTimeDisplayProps {
  showWorkingHours?: boolean;
  className?: string;
}

const EthiopianTimeDisplay: React.FC<EthiopianTimeDisplayProps> = ({ 
  showWorkingHours = true, 
  className = '' 
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isWorkingHours, setIsWorkingHours] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const time = attendanceService.getCurrentEthiopianTime();
      const workingHours = attendanceService.isWorkingHours();
      setCurrentTime(time);
      setIsWorkingHours(workingHours);
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium text-muted-foreground">EAT:</span>
        <span className="text-sm font-mono text-muted-foreground">{currentTime}</span>
      </div>
      
      {showWorkingHours && (
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isWorkingHours ? 'bg-primary' : 'bg-destructive'}`}></div>
          <span className="text-xs text-muted-foreground">
            {isWorkingHours ? 'Working Hours' : 'Outside Hours'}
          </span>
        </div>
      )}
    </div>
  );
};

export default EthiopianTimeDisplay;
