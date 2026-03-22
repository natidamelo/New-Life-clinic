import React, { useState, useEffect, useMemo } from 'react';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar, RefreshCw } from 'lucide-react';
import { 
  ETHIOPIAN_MONTHS, 
  getCurrentEthiopianDate, 
  ethiopianToGregorian,
  gregorianToEthiopian,
  isValidEthiopianDate,
  formatEthiopianDate,
  type EthiopianDate 
} from '../utils/ethiopianCalendar';

// Helper function to check if a Gregorian year is a leap year
const isLeapYear = (year: number): boolean => {
  return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
};

// Helper function to get maximum days for a given Ethiopian month and year
const getMaxDaysForMonth = (month: number, year: number): number => {
  if (month >= 1 && month <= 12) {
    return 30; // Regular months have 30 days
  } else if (month === 13) {
    // Pagumē month - check if it's a leap year in Gregorian calendar
    const gregorianYear = year + 7;
    return isLeapYear(gregorianYear) ? 6 : 5;
  }
  return 0; // Invalid month
};

interface EthiopianDatePickerSimpleProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date | null, ethiopianDate: EthiopianDate | null) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showGregorianEquivalent?: boolean;
}

const EthiopianDatePickerSimple: React.FC<EthiopianDatePickerSimpleProps> = ({
  label = "Select Date",
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  showGregorianEquivalent = true
}) => {
  const currentEthiopian = useMemo(() => getCurrentEthiopianDate(), []);

  // Initialize state
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (value) {
      const ethiopianDate = gregorianToEthiopian(value);
      return ethiopianDate.year.toString();
    }
    return currentEthiopian.year.toString();
  });
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (value) {
      const ethiopianDate = gregorianToEthiopian(value);
      return ethiopianDate.month.toString();
    }
    return '';
  });
  
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    if (value) {
      const ethiopianDate = gregorianToEthiopian(value);
      return ethiopianDate.day.toString();
    }
    return '';
  });

  const [errorMessage, setErrorMessage] = useState<string>('');

  // Generate year options
  const yearOptions = useMemo(() => {
    const options = [];
    for (let i = currentEthiopian.year - 10; i <= currentEthiopian.year + 5; i++) {
      options.push(i);
    }
    return options;
  }, [currentEthiopian.year]);

  // Generate day options based on selected month and year
  const dayOptions = useMemo(() => {
    if (!selectedMonth || !selectedYear) {
      return [];
    }
    
    const monthNum = parseInt(selectedMonth);
    const yearNum = parseInt(selectedYear);
    const maxDays = getMaxDaysForMonth(monthNum, yearNum);
    
    const days = [];
    for (let i = 1; i <= maxDays; i++) {
      days.push(i);
    }
    
    return days;
  }, [selectedMonth, selectedYear]);

  // Handle date selection changes
  useEffect(() => {
    if (selectedYear && selectedMonth && selectedDay) {
      const yearNum = parseInt(selectedYear);
      const monthNum = parseInt(selectedMonth);
      const dayNum = parseInt(selectedDay);
      
      if (isValidEthiopianDate(yearNum, monthNum, dayNum)) {
        try {
          const gregorianDate = ethiopianToGregorian(yearNum, monthNum, dayNum);
          const ethiopianDate: EthiopianDate = {
            year: yearNum,
            month: monthNum,
            day: dayNum,
            monthName: ETHIOPIAN_MONTHS[monthNum - 1],
            dayName: '',
            formatted: `${dayNum} ${ETHIOPIAN_MONTHS[monthNum - 1]} ${yearNum}`,
            shortFormatted: `${dayNum}/${monthNum}/${yearNum}`
          };
          
          onChange(gregorianDate, ethiopianDate);
          setErrorMessage('');
        } catch (error) {
          console.error('Date conversion error:', error);
          setErrorMessage('Invalid date combination');
          onChange(null, null);
        }
      } else {
        setErrorMessage('Invalid Ethiopian date');
        onChange(null, null);
      }
    } else {
      setErrorMessage('');
      onChange(null, null);
    }
  }, [selectedYear, selectedMonth, selectedDay, onChange]);

  // Handle year change
  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    console.log('🔄 Year changed to:', value);
    setSelectedYear(value);
    
    // Reset day if current day exceeds the max days for the selected month in the new year
    if (selectedMonth && selectedDay) {
      const monthNum = parseInt(selectedMonth);
      const yearNum = parseInt(value);
      const dayNum = parseInt(selectedDay);
      const maxDays = getMaxDaysForMonth(monthNum, yearNum);
      
      if (dayNum > maxDays) {
        setSelectedDay('');
      }
    }
  };

  // Handle month change
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    console.log('🔄 Month changed to:', value);
    setSelectedMonth(value);
    setSelectedDay(''); // Reset day when month changes
  };

  // Handle day change
  const handleDayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    console.log('🔄 Day changed to:', value);
    setSelectedDay(value);
  };

  // Set to today's Ethiopian date
  const handleSetToday = () => {
    const today = getCurrentEthiopianDate();
    console.log('🔄 Setting to today:', today);
    setSelectedYear(today.year.toString());
    setSelectedMonth(today.month.toString());
    setSelectedDay(today.day.toString());
  };

  // Get Gregorian equivalent display
  const getGregorianEquivalent = () => {
    if (selectedYear && selectedMonth && selectedDay) {
      const yearNum = parseInt(selectedYear);
      const monthNum = parseInt(selectedMonth);
      const dayNum = parseInt(selectedDay);
      
      if (isValidEthiopianDate(yearNum, monthNum, dayNum)) {
        try {
          const gregorianDate = ethiopianToGregorian(yearNum, monthNum, dayNum);
          return gregorianDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        } catch {
          return 'Invalid date';
        }
      }
    }
    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
        <span className="text-xs text-muted-foreground ml-2">(Ethiopian Calendar - Simple Version)</span>
      </Label>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Ethiopian Date Picker (Native Selects)
          </CardTitle>
          <CardDescription className="text-xs">
            Select date using the Ethiopian calendar (13 months) - Native HTML version
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Date Selection Controls */}
          <div className="space-y-4">
            {/* Year Row */}
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Year</Label>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                disabled={disabled}
                className="w-full h-11 mt-1 px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Row */}
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Month</Label>
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                disabled={disabled}
                className="w-full h-11 mt-1 px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              >
                <option value="">Select Month</option>
                {ETHIOPIAN_MONTHS.map((month, index) => {
                  const monthValue = index + 1;
                  return (
                    <option key={monthValue} value={monthValue.toString()}>
                      {month} {monthValue === 13 ? '(5-6 days)' : '(30 days)'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Day Row */}
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Day</Label>
              <select
                value={selectedDay}
                onChange={handleDayChange}
                disabled={disabled || !selectedMonth}
                className="w-full h-11 mt-1 px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              >
                <option value="">Select Day</option>
                {dayOptions.map((day) => (
                  <option key={day} value={day.toString()}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action Button */}
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={handleSetToday}
            disabled={disabled}
            className="w-full"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Set to Today ({formatEthiopianDate(currentEthiopian, 'short')})
          </Button>

          {/* Debug Information */}
          <div className="bg-primary/10 p-3 rounded text-xs border border-primary/30">
            <div className="font-medium text-primary">Simple Version Debug:</div>
            <div className="text-primary mt-1">
              Year: {selectedYear || 'Not selected'} | 
              Month: {selectedMonth || 'Not selected'} | 
              Day: {selectedDay || 'Not selected'}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="text-destructive text-xs bg-destructive/10 p-2 rounded border border-destructive/30">
              <div className="font-medium">Error:</div>
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Gregorian Equivalent */}
          {showGregorianEquivalent && getGregorianEquivalent() && (
            <div className="bg-primary/10 p-3 rounded text-xs border border-primary/30">
              <div className="font-medium text-primary">Gregorian Equivalent:</div>
              <div className="text-primary">{getGregorianEquivalent()}</div>
            </div>
          )}

          {/* Selected Ethiopian Date Display */}
          {selectedYear && selectedMonth && selectedDay && !errorMessage && (
            <div className="bg-primary/10 p-3 rounded text-xs border border-primary/30">
              <div className="font-medium text-primary">Selected Ethiopian Date:</div>
              <div className="text-primary">
                {selectedDay} {ETHIOPIAN_MONTHS[parseInt(selectedMonth) - 1]} {selectedYear}
              </div>
              {parseInt(selectedMonth) === 13 && (
                <div className="text-primary text-xs mt-1">
                  Pagumē month ({getMaxDaysForMonth(parseInt(selectedMonth), parseInt(selectedYear))} days this year)
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EthiopianDatePickerSimple;
