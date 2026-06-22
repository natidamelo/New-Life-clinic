import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Label } from './ui/label';
import { Calendar } from 'lucide-react';
import {
  ETHIOPIAN_MONTHS,
  getCurrentEthiopianDate,
  ethiopianToGregorian,
  gregorianToEthiopian,
  isValidEthiopianDate,
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

interface EthiopianDatePickerInlineProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  focusClassName?: string;
}

const EthiopianDatePickerInline: React.FC<EthiopianDatePickerInlineProps> = ({
  label,
  value,
  onChange,
  className = "",
  focusClassName = "focus:ring-emerald-500/30 focus:border-emerald-400"
}) => {
  const cur = getCurrentEthiopianDate();

  // Derive initial values from value prop
  const [ethYear, setEthYear] = useState<number | "">("");
  const [ethMonth, setEthMonth] = useState<number | "">("");
  const [ethDay, setEthDay] = useState<number | "">("");

  // Sync state with value changes
  useEffect(() => {
    if (value) {
      try {
        const e = gregorianToEthiopian(value);
        setEthYear(e.year);
        setEthMonth(e.month);
        setEthDay(e.day);
      } catch (err) {
        console.error(err);
      }
    } else {
      setEthYear("");
      setEthMonth("");
      setEthDay("");
    }
  }, [value]);

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = cur.year - 15; y <= cur.year + 2; y++) opts.push(y);
    return opts;
  }, [cur.year]);

  const dayOptions = useMemo(() => {
    if (ethMonth === "" || ethYear === "") return [];
    const max = getMaxDaysForMonth(ethMonth, ethYear);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [ethMonth, ethYear]);

  const commit = useCallback((y: number | "", m: number | "", d: number | "") => {
    if (y === "" || m === "" || d === "") {
      onChange(null);
      return;
    }
    if (!isValidEthiopianDate(y, m, d)) {
      onChange(null);
      return;
    }
    try {
      const greg = ethiopianToGregorian(y, m, d);
      onChange(greg);
    } catch (err) {
      console.error(err);
      onChange(null);
    }
  }, [onChange]);

  const handleYear = (y: number | "") => {
    setEthYear(y);
    if (y !== "" && ethMonth !== "") {
      const maxD = getMaxDaysForMonth(ethMonth, y);
      const safeDay = ethDay !== "" ? Math.min(ethDay, maxD) : "";
      setEthDay(safeDay);
      commit(y, ethMonth, safeDay);
    } else {
      commit(y, ethMonth, ethDay);
    }
  };

  const handleMonth = (m: number | "") => {
    setEthMonth(m);
    if (ethYear !== "" && m !== "") {
      const maxD = getMaxDaysForMonth(m, ethYear);
      const safeDay = ethDay !== "" ? Math.min(ethDay, maxD) : "";
      setEthDay(safeDay);
      commit(ethYear, m, safeDay);
    } else {
      commit(ethYear, m, ethDay);
    }
  };

  const handleDay = (d: number | "") => {
    setEthDay(d);
    commit(ethYear, ethMonth, d);
  };

  return (
    <div className={className}>
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
        <Calendar className="h-3 w-3 inline mr-1 text-gray-400" />{label}
      </Label>
      <div className="flex gap-1.5">
        {/* Year */}
        <select
          value={ethYear}
          onChange={e => handleYear(e.target.value === "" ? "" : Number(e.target.value))}
          className={`flex-1 h-9 text-sm border border-gray-200 rounded-lg px-1.5 focus:outline-none focus:ring-2 bg-white ${focusClassName}`}
        >
          <option value="">Year</option>
          {yearOptions.map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {/* Month */}
        <select
          value={ethMonth}
          onChange={e => handleMonth(e.target.value === "" ? "" : Number(e.target.value))}
          className={`flex-[1.8] h-9 text-sm border border-gray-200 rounded-lg px-1.5 focus:outline-none focus:ring-2 bg-white ${focusClassName}`}
        >
          <option value="">Month</option>
          {ETHIOPIAN_MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        {/* Day */}
        <select
          value={ethDay}
          onChange={e => handleDay(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={ethMonth === "" || ethYear === ""}
          className={`w-14 h-9 text-sm border border-gray-200 rounded-lg px-1 focus:outline-none focus:ring-2 bg-white ${focusClassName} disabled:bg-gray-50 disabled:text-gray-400`}
        >
          <option value="">Day</option>
          {dayOptions.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default EthiopianDatePickerInline;
