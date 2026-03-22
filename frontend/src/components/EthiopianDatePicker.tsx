import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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

interface EthiopianDatePickerProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date | null, ethiopianDate: EthiopianDate | null) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showGregorianEquivalent?: boolean;
}

const EthiopianDatePicker: React.FC<EthiopianDatePickerProps> = ({
  label = "Select Date",
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  showGregorianEquivalent = true
}) => {
  const currentEthiopian = useMemo(() => getCurrentEthiopianDate(), []);

  // Initialize state - always start with current year to enable month selection
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
      console.log('🏁 Initial month from value:', ethiopianDate.month.toString());
      return ethiopianDate.month.toString();
    }
    console.log('🏁 Initial month: empty string');
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

  // Debug: Track selectedMonth changes
  useEffect(() => {
    console.log('📊 selectedMonth state changed to:', selectedMonth);
  }, [selectedMonth]);

  // Generate year options (current year ±10 for better range)
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

  // Update state when value prop changes
  useEffect(() => {
    if (value) {
      const ethiopianDate = gregorianToEthiopian(value);
      const newYear = ethiopianDate.year.toString();
      const newMonth = ethiopianDate.month.toString();
      const newDay = ethiopianDate.day.toString();
      
      if (selectedYear !== newYear) setSelectedYear(newYear);
      if (selectedMonth !== newMonth) setSelectedMonth(newMonth);
      if (selectedDay !== newDay) setSelectedDay(newDay);
    } else if (!value && (selectedMonth || selectedDay)) {
      // Clear month and day when no value, but keep year
      setSelectedMonth('');
      setSelectedDay('');
    }
  }, [value, selectedYear, selectedMonth, selectedDay]);

  // Handle date selection changes and call onChange
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
            dayName: '', // Day name calculation would require more complex logic
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
      // Reset error when incomplete selection
      setErrorMessage('');
      onChange(null, null);
    }
  }, [selectedYear, selectedMonth, selectedDay, onChange]);

  // Handle year change
  const handleYearChange = (value: string) => {
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
  const handleMonthChange = (value: string) => {
    console.log('🔄 Month change handler called with value:', value);
    console.log('🔄 Current selectedMonth before change:', selectedMonth);
    setSelectedMonth(value);
    console.log('🔄 setSelectedMonth called with:', value);
    // Reset day when month changes to avoid invalid selections
    setSelectedDay('');
    console.log('🔄 Day reset to empty string');
  };

  // Handle day change
  const handleDayChange = (value: string) => {
    setSelectedDay(value);
  };

  // Set to today's Ethiopian date
  const handleSetToday = () => {
    const today = getCurrentEthiopianDate();
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
        <span className="text-xs text-muted-foreground ml-2">(Ethiopian Calendar)</span>
      </Label>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Ethiopian Date Picker
          </CardTitle>
          <CardDescription className="text-xs">
            Select date using the Ethiopian calendar (13 months)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Date Selection Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Year - Wider */}
            <div className="sm:col-span-4">
              <Label className="text-xs text-muted-foreground font-medium">Year</Label>
              <Select 
                value={selectedYear} 
                onValueChange={handleYearChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-10 w-full mt-1">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month - Much Wider */}
            <div className="sm:col-span-5">
              <Label className="text-xs text-muted-foreground font-medium">Month</Label>
              <Select 
                value={selectedMonth} 
                onValueChange={handleMonthChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-10 w-full mt-1">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {ETHIOPIAN_MONTHS.map((month, index) => {
                    const monthValue = index + 1;
                    return (
                      <SelectItem key={monthValue} value={monthValue.toString()}>
                        {month} {monthValue === 13 ? '(5-6 days)' : '(30 days)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Day - Smaller */}
            <div className="sm:col-span-3">
              <Label className="text-xs text-muted-foreground font-medium">Day</Label>
              <Select 
                value={selectedDay} 
                onValueChange={handleDayChange}
                disabled={disabled || !selectedMonth}
              >
                <SelectTrigger className="h-10 w-full mt-1">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {dayOptions.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Debug Information */}
          <div className="bg-accent/10 p-3 rounded text-xs border border-yellow-200">
            <div className="font-medium text-accent-foreground">Debug Info:</div>
            <div className="text-accent-foreground mt-1">
              Year: {selectedYear || 'Not selected'} | 
              Month: {selectedMonth || 'Not selected'} | 
              Day: {selectedDay || 'Not selected'}
            </div>
            <div className="text-accent-foreground">
              Disabled: {disabled ? 'Yes' : 'No'} | 
              Year Available: {selectedYear ? 'Yes' : 'No'}
            </div>
            <div className="mt-2 space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  console.log('🧪 Test: Setting month to 1 (Meskerem)');
                  setSelectedMonth('1');
                }}
              >
                Test: Set Month 1
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  console.log('🧪 Test: Setting month to 13 (Pagume)');
                  setSelectedMonth('13');
                }}
              >
                Test: Set Month 13
              </Button>
            </div>
          </div>

          {/* Month Information */}
          {selectedMonth && (
            <div className="bg-muted/10 p-3 rounded text-xs border border-border/30">
              <div className="font-medium text-muted-foreground">
                {ETHIOPIAN_MONTHS[parseInt(selectedMonth) - 1]} Information:
              </div>
              <div className="text-muted-foreground mt-1">
                {parseInt(selectedMonth) === 13 
                  ? `Pagumē has ${getMaxDaysForMonth(parseInt(selectedMonth), parseInt(selectedYear || currentEthiopian.year.toString()))} days in ${selectedYear || currentEthiopian.year} (${isLeapYear(parseInt(selectedYear || currentEthiopian.year.toString()) + 7) ? 'leap' : 'regular'} year)`
                  : `${ETHIOPIAN_MONTHS[parseInt(selectedMonth) - 1]} has 30 days`
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EthiopianDatePicker;