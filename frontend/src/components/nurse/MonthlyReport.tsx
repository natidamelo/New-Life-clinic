import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Download, TrendingUp, Users, Activity, FileText, BarChart3, PieChart, Clock, AlertTriangle, Pill, Stethoscope, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { isEthiopianLeapYear, toEthiopian, toGregorian } from 'ethiopian-calendar-new';

interface MonthlyReportData {
  totalPatients: number;
  totalAssessments: number;
  esvICD11Assessments: number;
  topDiagnoses: Array<{
    diagnosis: string;
    icd11Code: string;
    count: number;
    percentage: number;
  }>;
  diagnosisRecords: Array<{
    diagnosis: string;
    icd11Code: string;
    count: number;
    percentage: number;
    date: string;
    patientId: string;
    patientName: string;
    sex: string;
    age: string | number;
    chiefComplaint: string;
    status: 'pending' | 'finalized';
    recordId?: string;
  }>;
  diagnosisCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
     patientDemographics: {
     ageGroups: Array<{
       group: string;
       count: number;
       percentage: number;
     }>;
     genderDistribution: Array<{
       gender: string;
       count: number;
       percentage: number;
     }>;
           combinedDemographics: Array<{
        gender: string;
        ageGroup: string;
        count: number;
        percentage: number;
      }>;
      visitAgeGroups: {
        male: {
          '<5 years': number;
          '5-10 years': number;
          '11-19 years': number;
          '20-29 years': number;
          '30-45 years': number;
          '45-65 years': number;
          '>66 years': number;
        };
        female: {
          '<5 years': number;
          '5-10 years': number;
          '11-19 years': number;
          '20-29 years': number;
          '30-45 years': number;
          '45-65 years': number;
          '>66 years': number;
        };
      };
    };
  clinicalTrends: Array<{
    date: string;
    assessments: number;
    esvICD11Count: number;
  }>;
  severityDistribution: Array<{
    severity: string;
    count: number;
    percentage: number;
  }>;
  nurseActivity: {
    totalVitalsRecorded: number;
    totalMedicationsAdministered: number;
    totalProcedures: number;
    averagePatientsPerDay: number;
  };
  dateRangeUsed?: { start: string; end: string; label: string };
}

const NurseReport: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const [reportType, setReportType] = useState<'monthly' | 'weekly'>('monthly');
  const [monthlyCalendar, setMonthlyCalendar] = useState<'gregorian' | 'ethiopian'>('gregorian');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEthMonth, setSelectedEthMonth] = useState(() => {
    const now = new Date();
    const eth = toEthiopian(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return `${eth.year}-${String(eth.month).padStart(2, '0')}`;
  });
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
  });
  const [selectedEthWeek, setSelectedEthWeek] = useState(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState('overview');

  const ETH_MONTHS = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehasse', 'Pagume'
  ];

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const toISODateOnly = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

  const getEthiopianMonthRange = (ethYear: number, ethMonth: number) => {
    const daysInMonth = ethMonth === 13 ? (isEthiopianLeapYear(ethYear) ? 6 : 5) : 30;
    const startGreg = toGregorian(ethYear, ethMonth, 1);
    const endGreg = toGregorian(ethYear, ethMonth, daysInMonth);
    return {
      startDate: toISODateOnly(startGreg.year, startGreg.month, startGreg.day),
      endDate: toISODateOnly(endGreg.year, endGreg.month, endGreg.day)
    };
  };

  const formatDateForDisplay = (dateStr: string, compact?: boolean) => {
    if (!dateStr || dateStr === 'N/A') return dateStr || 'N/A';
    if (monthlyCalendar !== 'ethiopian') return dateStr;
    if (reportType !== 'monthly' && reportType !== 'weekly') return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts.map((p) => parseInt(p, 10));
    const eth = toEthiopian(y, m, d);
    if (compact) return `${eth.day}/${eth.month}/${eth.year} EC`;
    const monthName = ETH_MONTHS[eth.month - 1] || String(eth.month);
    return `${eth.day} ${monthName} ${eth.year} (EC)`;
  };

  // Generate last 12 months for dropdown
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    return options;
  };

  // Generate last 12 Ethiopian months for dropdown
  const getEthMonthOptions = () => {
    const options: Array<{ value: string; label: string }> = [];
    const now = new Date();
    const currentEth = toEthiopian(now.getFullYear(), now.getMonth() + 1, now.getDate());

    for (let i = 0; i < 12; i++) {
      let y = currentEth.year;
      let m = currentEth.month - i;
      while (m <= 0) {
        m += 13;
        y -= 1;
      }

      const value = `${y}-${pad2(m)}`;
      const monthName = ETH_MONTHS[m - 1] || `Month ${m}`;
      const label = `${monthName} ${y} (EC)`;
      options.push({ value, label });
    }

    return options;
  };

  // Generate last 12 weeks for dropdown
  const getWeekOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (now.getDay() + (i * 7)));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const value = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      const label = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      options.push({ value, label });
    }
    return options;
  };

  // Generate last 12 weeks for Ethiopian dropdown (value = Gregorian start for API, label = Ethiopian)
  const getEthWeekOptions = () => {
    const options: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (now.getDay() + (i * 7)));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const value = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      const startEth = toEthiopian(startOfWeek.getFullYear(), startOfWeek.getMonth() + 1, startOfWeek.getDate());
      const endEth = toEthiopian(endOfWeek.getFullYear(), endOfWeek.getMonth() + 1, endOfWeek.getDate());
      const startLabel = `${startEth.day} ${ETH_MONTHS[startEth.month - 1] || startEth.month} - ${endEth.day} ${ETH_MONTHS[endEth.month - 1] || endEth.month} ${endEth.year} (EC)`;
      options.push({ value, label: startLabel });
    }
    return options;
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let response;
      
      if (reportType === 'monthly') {
        response = await api.get('/api/nurse/monthly-report', {
          params: (() => {
            if (monthlyCalendar === 'ethiopian') {
              const [ethYearStr, ethMonthStr] = selectedEthMonth.split('-');
              const ethYear = parseInt(ethYearStr, 10);
              const ethMonth = parseInt(ethMonthStr, 10);
              const range = getEthiopianMonthRange(ethYear, ethMonth);
              return {
                startDate: range.startDate,
                endDate: range.endDate,
                calendar: 'ethiopian',
                ethYear,
                ethMonth
              };
            }

            const [year, month] = selectedMonth.split('-');
            return { year, month };
          })()
        });
      } else {
        const weekValue = monthlyCalendar === 'ethiopian' ? selectedEthWeek : selectedWeek;
        const [year, month, day] = weekValue.split('-');
        response = await api.get('/api/nurse/weekly-report', {
          params: { year, month, day }
        });
      }
      
      const data = response.data.data || response.data;
      console.log(`${reportType} report data received:`, data);
      
      // Even if totals are zero, keep a valid (empty) report so the UI shows zeros
      if (data) {
        setReportData(data);
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error(`Error fetching ${reportType} report:`, error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to remove this record? This will mark it as deleted and remove it from calculations.')) {
      return;
    }

    try {
      await api.delete(`/api/nurse/monthly-report/${recordId}`);
      // Re-fetch report data to refresh the list
      fetchReport();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };



  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedEthMonth, selectedWeek, selectedEthWeek, reportType, monthlyCalendar]);

  const handleExportReport = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report');
      return;
    }

    // Get current date for the report
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Format reporting period
    const getReportingPeriod = () => {
      if (reportType === 'monthly') {
        if (monthlyCalendar === 'ethiopian') {
          const [ethYearStr, ethMonthStr] = selectedEthMonth.split('-');
          const ethYear = parseInt(ethYearStr, 10);
          const ethMonth = parseInt(ethMonthStr, 10);
          const monthName = ETH_MONTHS[ethMonth - 1] || `Month ${ethMonth}`;
          return `${monthName} ${ethYear} (EC)`;
        }

        const [year, month] = selectedMonth.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' });
        return `${monthName} ${year}`;
      } else {
        const weekValue = monthlyCalendar === 'ethiopian' ? selectedEthWeek : selectedWeek;
        const [year, month, day] = weekValue.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        if (monthlyCalendar === 'ethiopian') {
          const startEth = toEthiopian(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
          const endEth = toEthiopian(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate());
          return `${startEth.day} ${ETH_MONTHS[startEth.month - 1] || startEth.month} - ${endEth.day} ${ETH_MONTHS[endEth.month - 1] || endEth.month} ${endEth.year} (EC)`;
        }
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    };

    // Create the HTML content for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportType === 'monthly' ? 'Monthly' : 'Weekly'} Report - New Life Medium Clinic</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
          }
          .header h1 {
            margin: 0;
            color: #333;
            font-size: 22px;
            font-weight: bold;
          }
          .header p {
            margin: 0;
            color: #666;
            font-size: 14px;
            line-height: 1.2;
          }
          .summary-stats {
            display: none;
          }
                     table {
             width: 100%;
             border-collapse: collapse;
             margin: 10px 0;
             page-break-inside: avoid;
             font-size: 12px;
           }
           th, td {
             border: 1px solid #ddd;
             padding: 5px 6px;
             text-align: left;
             font-size: 12px;
             word-wrap: break-word;
             max-width: 120px;
           }
           .diagnosis-table th, .diagnosis-table td {
             font-size: 11px;
             padding: 4px 5px;
           }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
            text-align: center;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 15px 0 8px 0;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 3px;
          }
          .age-group-header {
            background-color: #e9ecef;
            font-weight: bold;
            text-align: center;
          }
          .gender-header {
            background-color: #f8f9fa;
            font-weight: bold;
            text-align: center;
          }
          .total-row {
            background-color: #f1f3f4;
            font-weight: bold;
          }
                     @media print {
             body { margin: 0; }
             .no-print { display: none; }
             .page-break { page-break-before: always; }
             .page-break-after { page-break-after: always; }
             .avoid-break { page-break-inside: avoid; }
           }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NEW LIFE MEDIUM CLINIC</h1>
          <p>Region: Addis Ababa | Reporting Month/Year: ${getReportingPeriod()} | Reporting Type: OPD</p>
          <p>Generated on: ${currentDate}</p>
        </div>

        <div class="summary-stats">
          <div class="stat-box">
            <div class="stat-number">${reportData?.totalPatients || 0}</div>
            <div class="stat-label">Total Patients</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${reportData?.totalAssessments || 0}</div>
            <div class="stat-label">Total Assessments</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${reportData?.esvICD11Assessments || 0}</div>
            <div class="stat-label">ESV-ICD-11 Assessments</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${reportData?.nurseActivity?.averagePatientsPerDay?.toFixed(1) || '0.0'}</div>
            <div class="stat-label">Avg Patients/Day</div>
          </div>
        </div>

                 <div class="section-title">Top Diagnoses</div>
         <table class="avoid-break diagnosis-table">
           <thead>
             <tr>
               <th>ID</th>
               <th>Date</th>
               <th>Card No/Patient ID</th>
                  <th>Patient Name</th>
               <th>Sex</th>
               <th>Age</th>
               <th>Chief Complaint</th>
               <th>Disease/Diagnosis Name</th>
               <th>Count</th>
               <th>Percentage</th>
             </tr>
           </thead>
           <tbody>
            ${(reportData?.diagnosisRecords || []).map((diagnosis, index) => `
               <tr>
                 <td style="text-align: center;">${index + 1}</td>
                 <td style="text-align: center;">${formatDateForDisplay(diagnosis.date || 'N/A')}</td>
                 <td style="text-align: center; font-family: monospace; background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px;">${diagnosis.patientId || 'N/A'}</td>
                <td>${diagnosis.patientName || 'N/A'}</td>
                 <td style="text-align: center;">${diagnosis.sex || 'N/A'}</td>
                 <td style="text-align: center;">${diagnosis.age || 'N/A'}</td>
                 <td>${diagnosis.chiefComplaint || 'N/A'}</td>
                <td>${diagnosis.diagnosis}${diagnosis.status === 'pending' ? ' (Pending)' : ''}</td>
                 <td style="text-align: center;">${diagnosis.count}</td>
                 <td style="text-align: center;">${diagnosis.percentage.toFixed(1)}%</td>
               </tr>
             `).join('')}
           </tbody>
         </table>

                 </div>
         
         <!-- PAGE 2: Demographics -->
         <div class="page-break">
           <div class="header">
             <h1>NEW LIFE MEDIUM CLINIC</h1>
             <p>Region: Addis Ababa | Reporting Month/Year: ${getReportingPeriod()} | Reporting Type: OPD</p>
             <p>Generated on: ${currentDate}</p>
           </div>
           
           <div class="section-title">Patient Demographics by Age and Gender</div>
           <table class="avoid-break">
          <thead>
            <tr>
              <th rowspan="2">ID</th>
              <th rowspan="2">Diseases</th>
              <th rowspan="2">Age Category</th>
              <th colspan="7">Male</th>
              <th colspan="7">Female</th>
              <th rowspan="2">Total</th>
            </tr>
            <tr>
              <th class="age-group-header">&lt;1yr</th>
              <th class="age-group-header">1-4yr</th>
              <th class="age-group-header">5-14yr</th>
              <th class="age-group-header">15-29yr</th>
              <th class="age-group-header">30-64yr</th>
              <th class="age-group-header">&gt;=65yr</th>
              <th class="age-group-header">Subtotal</th>
              <th class="age-group-header">&lt;1yr</th>
              <th class="age-group-header">1-4yr</th>
              <th class="age-group-header">5-14yr</th>
              <th class="age-group-header">15-29yr</th>
              <th class="age-group-header">30-64yr</th>
              <th class="age-group-header">&gt;=65yr</th>
              <th class="age-group-header">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData?.patientDemographics?.combinedDemographics || []).map((demo, index) => {
              // Get diseases for this age group and gender
              const diseasesForThisGroup = (reportData?.diagnosisRecords || [])
                .filter(diagnosis => {
                  const diagnosisAge = parseInt(diagnosis.age as string) || 0;
                  const diagnosisGender = diagnosis.sex?.toLowerCase();
                  const demoGender = demo.gender?.toLowerCase();
                  
                  // Check if age matches the age group
                  let ageMatches = false;
                  if (demo.ageGroup === '1-4yr' && diagnosisAge >= 1 && diagnosisAge <= 4) ageMatches = true;
                  else if (demo.ageGroup === '15-29yr' && diagnosisAge >= 15 && diagnosisAge <= 29) ageMatches = true;
                  else if (demo.ageGroup === '30-64yr' && diagnosisAge >= 30 && diagnosisAge <= 64) ageMatches = true;
                  else if (demo.ageGroup === '<1yr' && diagnosisAge < 1) ageMatches = true;
                  else if (demo.ageGroup === '5-14yr' && diagnosisAge >= 5 && diagnosisAge <= 14) ageMatches = true;
                  else if (demo.ageGroup === '≥65yr' && diagnosisAge >= 65) ageMatches = true;
                  
                  return ageMatches && diagnosisGender === demoGender;
                })
                .map(d => d.diagnosis)
                .join(', ');
              
              // Calculate the correct age group column for this demographic
              const getAgeGroupColumn = (ageGroup: string) => {
                switch(ageGroup) {
                  case '<1yr': return 0; // First column (index 0)
                  case '1-4yr': return 1; // Second column (index 1)
                  case '5-14yr': return 2; // Third column (index 2)
                  case '15-29yr': return 3; // Fourth column (index 3)
                  case '30-64yr': return 4; // Fifth column (index 4)
                  case '≥65yr': return 5; // Sixth column (index 5)
                  default: return 0;
                }
              };
              
              const ageGroupIndex = getAgeGroupColumn(demo.ageGroup);
              const isMale = demo.gender === 'Male';
              const maleStartIndex = 3; // Male columns start at index 3 (after ID, Diseases, Age Category)
              const femaleStartIndex = 10; // Female columns start at index 10
              
              // Create array of 14 cells (7 male + 7 female)
              const cells = new Array(14).fill(0);
              
              // Set the correct cell based on gender and age group
              if (isMale) {
                cells[ageGroupIndex] = demo.count; // Male column
                cells[6] = demo.count; // Male subtotal
              } else {
                cells[ageGroupIndex + 7] = demo.count; // Female column (offset by 7)
                cells[13] = demo.count; // Female subtotal
              }
              
              return `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td style="font-size: 10px; max-width: 150px;">${diseasesForThisGroup || 'N/A'}</td>
                  <td>${demo.ageGroup}</td>
                  <td style="text-align: center;">${cells[0]}</td>
                  <td style="text-align: center;">${cells[1]}</td>
                  <td style="text-align: center;">${cells[2]}</td>
                  <td style="text-align: center;">${cells[3]}</td>
                  <td style="text-align: center;">${cells[4]}</td>
                  <td style="text-align: center;">${cells[5]}</td>
                  <td style="text-align: center;">${cells[6]}</td>
                  <td style="text-align: center;">${cells[7]}</td>
                  <td style="text-align: center;">${cells[8]}</td>
                  <td style="text-align: center;">${cells[9]}</td>
                  <td style="text-align: center;">${cells[10]}</td>
                  <td style="text-align: center;">${cells[11]}</td>
                  <td style="text-align: center;">${cells[12]}</td>
                  <td style="text-align: center;">${cells[13]}</td>
                  <td style="text-align: center;">${demo.count}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td style="text-align: center;">-</td>
              <td style="font-size: 10px; max-width: 150px;"></td>
              <td><strong>TOTAL</strong></td>
              <td style="text-align: center;"><strong>${reportData?.patientDemographics?.visitAgeGroups?.male?.['<5 years'] || 0}</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>${Object.values(reportData?.patientDemographics?.visitAgeGroups?.male || {}).reduce((sum: number, count: any) => sum + (count || 0), 0)}</strong></td>
              <td style="text-align: center;"><strong>${reportData?.patientDemographics?.visitAgeGroups?.female?.['<5 years'] || 0}</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>0</strong></td>
              <td style="text-align: center;"><strong>${Object.values(reportData?.patientDemographics?.visitAgeGroups?.female || {}).reduce((sum: number, count: any) => sum + (count || 0), 0)}</strong></td>
              <td style="text-align: center;"><strong>${reportData?.totalPatients || 0}</strong></td>
            </tr>
          </tbody>
        </table>

                   </tbody>
         </table>
       </div>
       
       <!-- PAGE 3: Detailed Age Distribution -->
       <div class="page-break">
         <div class="header">
           <h1>NEW LIFE MEDIUM CLINIC</h1>
           <p>Region: Addis Ababa | Reporting Month/Year: ${getReportingPeriod()} | Reporting Type: OPD</p>
           <p>Generated on: ${currentDate}</p>
         </div>
         
         <div class="section-title">Detailed Age Distribution</div>
         <table class="avoid-break">
           <thead>
             <tr>
               <th>ID</th>
               <th>Age Group</th>
               <th>Male</th>
               <th>Female</th>
               <th>Total</th>
             </tr>
           </thead>
           <tbody>
             ${['<5 years', '5-10 years', '11-19 years', '20-29 years', '30-45 years', '45-65 years', '>66 years'].map((ageGroup, index) => {
               const maleCount = reportData?.patientDemographics?.visitAgeGroups?.male?.[ageGroup] || 0;
               const femaleCount = reportData?.patientDemographics?.visitAgeGroups?.female?.[ageGroup] || 0;
               const total = maleCount + femaleCount;
               return `
                 <tr>
                   <td style="text-align: center;">${index + 1}</td>
                   <td>${ageGroup === '<5 years' ? '&lt;5 years' : ageGroup === '>66 years' ? '&gt;66 years' : ageGroup}</td>
                   <td style="text-align: center;">${maleCount}</td>
                   <td style="text-align: center;">${femaleCount}</td>
                   <td style="text-align: center;"><strong>${total}</strong></td>
                 </tr>
               `;
             }).join('')}
           </tbody>
         </table>

                 <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
           <p>Report generated by New Life Medium Clinic Management System</p>
           <p>This report contains confidential patient information</p>
         </div>
       </div>
      </body>
      </html>
    `;

    // Write the content to the new window
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'mild': return 'bg-primary/20 text-primary';
      case 'moderate': return 'bg-accent/20 text-accent-foreground';
      case 'severe': return 'bg-accent/20 text-accent-foreground';
      case 'very severe': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading {reportType} report...</span>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No data available</h3>
        <p className="text-muted-foreground">Unable to load {reportType} report data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-muted-foreground">
            {reportType === 'monthly' ? 'Monthly' : 'Weekly'} Report
          </h1>
          <p className="text-muted-foreground">ESV-ICD-11 Assessment Statistics</p>
          {reportData && (
            <>
              <p className="text-sm text-primary mt-1">
                ✅ Showing real patient data from medical records
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                📆 Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                {' · '}
                <span className="font-medium text-foreground">
                  {(reportData.diagnosisRecords || []).length} records
                </span>
                {' in this '}{reportType === 'monthly' ? 'month' : 'week'}
                {reportData.dateRangeUsed && (() => {
                  const today = new Date();
                  const start = new Date(reportData.dateRangeUsed!.start + 'T00:00:00Z');
                  const end = new Date(reportData.dateRangeUsed!.end + 'T23:59:59Z');
                  const endCapped = end > today ? today : end;
                  const daysTotal = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                  const daysSoFar = start > today ? 0 : Math.round((endCapped.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                  const isPartial = daysSoFar < daysTotal && end >= today;
                  return isPartial ? (
                    <span className="block mt-0.5 text-muted-foreground/90">
                      ({daysSoFar} of {daysTotal} days so far this {reportType === 'monthly' ? 'month' : 'week'})
                    </span>
                  ) : null;
                })()}
              </p>
              {reportData.dateRangeUsed && (
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  📅 Exact {reportType === 'monthly' ? 'month' : 'week'}: {reportData.dateRangeUsed.start} to {reportData.dateRangeUsed.end} (UTC)
                </p>
              )}
            </>
          )}
          {!reportData && !loading && (
            <p className="text-sm text-muted-foreground mt-1">
              📊 No data available for this {reportType === 'monthly' ? 'month' : 'week'}. Create medical records to see statistics.
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Report Type Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant={reportType === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReportType('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={reportType === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReportType('weekly')}
            >
              Weekly
            </Button>
          </div>
          
          {/* Date Selector */}
          {reportType === 'monthly' ? (
            <div className="flex items-center gap-2">
              <Select value={monthlyCalendar} onValueChange={(v) => setMonthlyCalendar(v as 'gregorian' | 'ethiopian')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gregorian">Gregorian</SelectItem>
                  <SelectItem value="ethiopian">Ethiopian</SelectItem>
                </SelectContent>
              </Select>

              {monthlyCalendar === 'ethiopian' ? (
                <Select value={selectedEthMonth} onValueChange={setSelectedEthMonth}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getEthMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={monthlyCalendar} onValueChange={(v) => setMonthlyCalendar(v as 'gregorian' | 'ethiopian')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gregorian">Gregorian</SelectItem>
                  <SelectItem value="ethiopian">Ethiopian</SelectItem>
                </SelectContent>
              </Select>
              {monthlyCalendar === 'ethiopian' ? (
                <Select value={selectedEthWeek} onValueChange={setSelectedEthWeek}>
                  <SelectTrigger className="w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getEthWeekOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getWeekOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          
          <Button onClick={handleExportReport} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>



      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diagnoses">Top Diagnoses</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="activity">Nurse Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Diagnosis Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis Categories</CardTitle>
                <CardDescription>Distribution by ESV-ICD-11 categories</CardDescription>
              </CardHeader>
              <CardContent>
                                 <div className="space-y-3">
                   {(reportData?.diagnosisCategories || []).map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1">
                        {category.category.replace('ESV-ICD-11: ', '')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted/30 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {category.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Assessment severity levels</CardDescription>
              </CardHeader>
              <CardContent>
                                 <div className="space-y-3">
                   {(reportData?.severityDistribution || []).map((severity, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(severity.severity)}>
                          {severity.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted/30 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${severity.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {severity.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagnoses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top ESV-ICD-11 Diagnoses</CardTitle>
              <CardDescription>Most common diagnoses this {reportType === 'monthly' ? 'month' : 'week'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-1.5 text-xs w-10">Rank</TableHead>
                    <TableHead className="py-1.5 text-xs w-20 whitespace-nowrap">Date</TableHead>
                    <TableHead className="py-1.5 text-xs w-20">Patient ID</TableHead>
                    <TableHead className="py-1.5 text-xs w-28">Patient Name</TableHead>
                    <TableHead className="py-1.5 text-xs w-14">Sex</TableHead>
                    <TableHead className="py-1.5 text-xs w-12">Age</TableHead>
                    <TableHead className="py-1.5 text-xs min-w-[120px]">Chief Complaint</TableHead>
                    <TableHead className="py-1.5 text-xs min-w-[140px]">Diagnosis</TableHead>
                    <TableHead className="py-1.5 text-xs w-14">Count</TableHead>
                    <TableHead className="py-1.5 text-xs w-14">%</TableHead>
                    {user?.role === 'doctor' && (
                      <TableHead className="py-1.5 text-xs w-14">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                                 <TableBody>
                  {(reportData?.diagnosisRecords || []).map((diagnosis, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-sm py-1.5 w-10">#{index + 1}</TableCell>
                      <TableCell className="text-sm py-1.5 w-20 whitespace-nowrap">{formatDateForDisplay(diagnosis.date || 'N/A', true)}</TableCell>
                      <TableCell className="text-sm font-mono bg-muted/10 px-2 py-1.5 rounded w-20 text-xs">
                        {diagnosis.patientId || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm py-1.5 w-28 truncate" title={diagnosis.patientName || 'N/A'}>
                        {diagnosis.patientName || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm capitalize py-1.5 w-14">{diagnosis.sex || 'N/A'}</TableCell>
                      <TableCell className="text-sm py-1.5 w-12">{diagnosis.age || 'N/A'}</TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate py-1.5" title={diagnosis.chiefComplaint || 'N/A'}>
                        {diagnosis.chiefComplaint || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] py-1.5" title={diagnosis.diagnosis}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate">{diagnosis.diagnosis}</span>
                          {diagnosis.status === 'pending' && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px] px-1 py-0 shrink-0">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm py-1.5 w-14">{diagnosis.count}</TableCell>
                      <TableCell className="text-sm py-1.5 w-14">{diagnosis.percentage.toFixed(1)}%</TableCell>
                      {user?.role === 'doctor' && (
                        <TableCell className="text-sm py-1.5 w-14">
                          {diagnosis.recordId && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteRecord(diagnosis.recordId!)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

                 <TabsContent value="demographics" className="space-y-4">
           {/* Top 10 Diagnoses Section */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <BarChart3 className="h-5 w-5 text-primary" />
                 Top 10 Diagnoses
               </CardTitle>
               <CardDescription>Most common diagnoses this {reportType === 'monthly' ? 'month' : 'week'}</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart
                     data={(reportData?.topDiagnoses || []).slice(0, 10).map((diagnosis, index) => ({
                       name: diagnosis.diagnosis.length > 20 ? diagnosis.diagnosis.substring(0, 20) + '...' : diagnosis.diagnosis,
                       fullName: diagnosis.diagnosis,
                       count: diagnosis.count,
                       percentage: diagnosis.percentage,
                       fill: `hsl(${200 + index * 20}, 70%, 50%)`
                     }))}
                     margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                   >
                     <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                     <XAxis 
                       dataKey="name" 
                       angle={-45}
                       textAnchor="end"
                       height={80}
                       fontSize={12}
                       stroke="#666"
                     />
                     <YAxis 
                       stroke="#666"
                       fontSize={12}
                     />
                     <Tooltip 
                       content={({ active, payload, label }) => {
                         if (active && payload && payload.length) {
                           const data = payload[0].payload;
                           return (
                             <div className="bg-primary-foreground p-3 border border-border/30 rounded-lg shadow-lg">
                               <p className="font-medium text-muted-foreground">{data.fullName}</p>
                               <p className="text-primary">Count: {data.count}</p>
                               <p className="text-primary">Percentage: {data.percentage.toFixed(1)}%</p>
                             </div>
                           );
                         }
                         return null;
                       }}
                     />
                     <Bar 
                       dataKey="count" 
                       radius={[4, 4, 0, 0]}
                       fill="#3b82f6"
                     />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             </CardContent>
           </Card>

           {/* Top 3 Diagnoses Pie Chart Section */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <PieChart className="h-5 w-5 text-primary" />
                 Top 3 Diagnoses Distribution
               </CardTitle>
               <CardDescription>Percentage breakdown of top 3 diagnoses</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Pie Chart */}
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <RechartsPieChart>
                       <Pie
                         data={(reportData?.topDiagnoses || []).slice(0, 3).map((diagnosis, index) => ({
                           name: diagnosis.diagnosis.length > 25 ? diagnosis.diagnosis.substring(0, 25) + '...' : diagnosis.diagnosis,
                           fullName: diagnosis.diagnosis,
                           value: diagnosis.percentage,
                           count: diagnosis.count,
                           fill: ['#3b82f6', '#10b981', '#f59e0b'][index]
                         }))}
                         cx="50%"
                         cy="50%"
                         labelLine={false}
                         label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                         outerRadius={80}
                         fill="#8884d8"
                         dataKey="value"
                       >
                         {(reportData?.topDiagnoses || []).slice(0, 3).map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index]} />
                         ))}
                       </Pie>
                       <Tooltip 
                         content={({ active, payload }) => {
                           if (active && payload && payload.length) {
                             const data = payload[0].payload;
                             return (
                               <div className="bg-primary-foreground p-3 border border-border/30 rounded-lg shadow-lg">
                                 <p className="font-medium text-muted-foreground">{data.fullName}</p>
                                 <p className="text-primary">Count: {data.count}</p>
                                 <p className="text-primary">Percentage: {data.value.toFixed(1)}%</p>
                               </div>
                             );
                           }
                           return null;
                         }}
                       />
                     </RechartsPieChart>
                   </ResponsiveContainer>
                 </div>

                 {/* Diagnosis List */}
                 <div className="space-y-3">
                   <h4 className="text-sm font-medium text-muted-foreground mb-3">Diagnosis Details</h4>
                   {(reportData?.topDiagnoses || []).slice(0, 3).map((diagnosis, index) => (
                     <div key={index} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                       <div className="flex-1">
                         <div className="flex items-center gap-2">
                           <div 
                             className="w-3 h-3 rounded-full"
                             style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'][index] }}
                           ></div>
                           <span className="text-sm font-medium text-muted-foreground">
                             {diagnosis.diagnosis}
                           </span>
                         </div>
                         <div className="text-xs text-muted-foreground mt-1">
                           ICD-11: {diagnosis.icd11Code}
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-sm font-semibold text-muted-foreground">
                           {diagnosis.count}
                         </div>
                         <div className="text-xs text-muted-foreground">
                           {diagnosis.percentage.toFixed(1)}%
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Original Demographics Section */}
           <Card>
             <CardHeader>
               <CardTitle>Patient Demographics</CardTitle>
               <CardDescription>Age and gender breakdown</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {/* Combined Age & Gender Distribution */}
                 <div>
                   <h4 className="text-sm font-medium text-muted-foreground mb-3">Age & Gender Distribution</h4>
                   <div className="space-y-3">
                     {(reportData?.patientDemographics?.combinedDemographics || []).map((item, index) => (
                       <div key={index} className="flex items-center justify-between">
                         <span className="text-sm font-medium">
                           {item.gender} {item.ageGroup}
                         </span>
                         <div className="flex items-center space-x-2">
                           <div className="w-20 bg-muted/30 rounded-full h-2">
                             <div
                               className="bg-primary h-2 rounded-full"
                               style={{ width: `${item.percentage}%` }}
                             ></div>
                           </div>
                           <span className="text-sm text-muted-foreground w-12 text-right">
                             {item.count}
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Summary Stats */}
                 <div className="border-t pt-4">
                   <h4 className="text-sm font-medium text-muted-foreground mb-3">Summary</h4>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                       <span className="font-medium">Total Patients:</span>
                       <span className="ml-2 text-muted-foreground">{reportData?.totalPatients || 0}</span>
                     </div>
                     <div>
                       <span className="font-medium">Age Groups:</span>
                       <span className="ml-2 text-muted-foreground">
                         {(reportData?.patientDemographics?.ageGroups || []).filter(ag => ag.count > 0).length} active
                       </span>
                     </div>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         </TabsContent>

        <TabsContent value="visits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Visits by Age & Gender</CardTitle>
              <CardDescription>Number of patients visited by age group and gender this {reportType === 'monthly' ? 'month' : 'week'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Male Patients */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Male Patients</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {reportData?.patientDemographics?.visitAgeGroups?.male?.['<5 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Male &lt;5 years</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {reportData?.patientDemographics?.visitAgeGroups?.male?.['5-10 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Male 5-10 years</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {reportData?.patientDemographics?.visitAgeGroups?.male?.['11-19 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Male 11-19 years</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {reportData?.patientDemographics?.visitAgeGroups?.male?.['20-29 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Male 20-29 years</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {reportData?.patientDemographics?.visitAgeGroups?.male?.['30-45 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Male 30-45 years</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {reportData?.patientDemographics?.visitAgeGroups?.male?.['45-65 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Male 45-65 years</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {reportData?.patientDemographics?.visitAgeGroups?.male?.['>66 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Male &gt;66 years</div>
                    </div>
                  </div>
                </div>

                {/* Female Patients */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Female Patients</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-lg font-bold text-pink-600">
                        {reportData?.patientDemographics?.visitAgeGroups?.female?.['<5 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Female &lt;5 years</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-lg font-bold text-pink-600">
                        {reportData?.patientDemographics?.visitAgeGroups?.female?.['5-10 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Female 5-10 years</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-lg font-bold text-pink-600">
                        {reportData?.patientDemographics?.visitAgeGroups?.female?.['11-19 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Female 11-19 years</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-lg font-bold text-pink-600">
                        {reportData?.patientDemographics?.visitAgeGroups?.female?.['20-29 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Female 20-29 years</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-lg font-bold text-pink-600">
                        {reportData?.patientDemographics?.visitAgeGroups?.female?.['30-45 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Female 30-45 years</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-lg font-bold text-pink-600">
                        {reportData?.patientDemographics?.visitAgeGroups?.female?.['45-65 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Female 45-65 years</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <div className="text-lg font-bold text-pink-600">
                        {reportData?.patientDemographics?.visitAgeGroups?.female?.['>66 years'] || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Female &gt;66 years</div>
                    </div>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Summary Table</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Age Group</TableHead>
                        <TableHead>Male</TableHead>
                        <TableHead>Female</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['<5 years', '5-10 years', '11-19 years', '20-29 years', '30-45 years', '45-65 years', '>66 years'].map((ageGroup) => {
                        const maleCount = reportData?.patientDemographics?.visitAgeGroups?.male?.[ageGroup] || 0;
                        const femaleCount = reportData?.patientDemographics?.visitAgeGroups?.female?.[ageGroup] || 0;
                        const total = maleCount + femaleCount;
                        return (
                          <TableRow key={ageGroup}>
                            <TableCell className="font-medium">
                              <span dangerouslySetInnerHTML={{
                                __html: ageGroup === '<5 years' ? '&lt;5 years' : 
                                        ageGroup === '>66 years' ? '&gt;66 years' : 
                                        ageGroup
                              }} />
                            </TableCell>
                            <TableCell>{maleCount}</TableCell>
                            <TableCell>{femaleCount}</TableCell>
                            <TableCell className="font-bold">{total}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Trends</CardTitle>
              <CardDescription>Daily assessment trends for this {reportType === 'monthly' ? 'month' : 'week'}</CardDescription>
            </CardHeader>
            <CardContent>
                             <div className="space-y-4">
                 {(reportData?.clinicalTrends || []).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDateForDisplay(trend.date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="font-semibold">{trend.assessments}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">ESV-ICD-11</div>
                        <div className="font-semibold text-primary">{trend.esvICD11Count}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Rate</div>
                                                 <div className="font-semibold text-primary">
                           {trend.assessments > 0 ? ((trend.esvICD11Count / trend.assessments) * 100).toFixed(1) : 0}%
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nurse Activity Summary</CardTitle>
              <CardDescription>Overview of nursing activities this {reportType === 'monthly' ? 'month' : 'week'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Vitals Recorded:</span>
                    <span className="ml-2 text-muted-foreground">{reportData?.nurseActivity?.totalVitalsRecorded || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium">Medications:</span>
                    <span className="ml-2 text-muted-foreground">{reportData?.nurseActivity?.totalMedicationsAdministered || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium">Procedures:</span>
                    <span className="ml-2 text-muted-foreground">{reportData?.nurseActivity?.totalProcedures || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium">Daily Average:</span>
                    <span className="ml-2 text-muted-foreground">{reportData?.nurseActivity?.averagePatientsPerDay || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NurseReport;
