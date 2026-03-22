import React from 'react';

interface TodaysScheduleComponentProps {
  showInLabResults?: boolean;
  date?: string;
}

// This component will only show Today's Schedule when appropriate
const TodaysScheduleComponent: React.FC<TodaysScheduleComponentProps> = ({ 
  showInLabResults = false,
  date = '4/24/2025'
}) => {
  // Check if we're in a tab where we shouldn't show the component
  const isInLabResults = document.querySelector('[data-tab="lab-results"]') !== null || 
                         document.querySelector('[value="laboratory-results"]') !== null;
  
  // Don't render in lab results unless specifically requested
  if (isInLabResults && !showInLabResults) {
    return null;
  }
  
  return (
    <div className="todays-schedule">
      <div className="p-2 border rounded-lg bg-[hsl(var(--primary-color-50))] border-[hsl(var(--primary-color-200))] mb-3">
        <h3 className="font-medium text-sm mb-2 flex items-center text-[hsl(var(--primary-color-800))]">
          <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Today's Schedule
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="bg-[hsl(var(--primary-color-100))] text-[hsl(var(--primary-color-800))] px-2 py-0.5 rounded text-xs">
              {date}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 bg-[hsl(var(--primary-color-50))] text-sm mb-4">
        <div className="py-1 px-2 text-[hsl(var(--primary-color-800))] font-medium">PATIENT</div>
        <div className="py-1 px-2 text-[hsl(var(--primary-color-800))] font-medium">TIME</div>
        <div className="py-1 px-2 text-[hsl(var(--primary-color-800))] font-medium">STATUS</div>
      </div>
    </div>
  );
};

export default TodaysScheduleComponent; 