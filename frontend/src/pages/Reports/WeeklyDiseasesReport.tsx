import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
  DocumentChartBarIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

interface DiseaseData {
  outPatient: number;
  inPatient: number;
  deaths: number;
}

interface WeeklyIndicators {
  totalMalariaCases: DiseaseData;
  totalMalariaSuspectedFeverCases: DiseaseData;
  malariaPositiveCases: {
    pFalciparum: DiseaseData;
    pVivax: DiseaseData;
    mixed: DiseaseData;
  };
  meningitis: DiseaseData;
  dysentery: DiseaseData;
  scabies: DiseaseData;
  relapsingFever: DiseaseData;
  severeAcuteMalnutrition: DiseaseData;
  moderateAcuteMalnutritionU5C: DiseaseData;
  moderateAcuteMalnutritionPLW: DiseaseData;
  diarrheaWithDehydration: DiseaseData;
  acuteJaundiceSyndrome: DiseaseData;
  severePneumonia: DiseaseData;
  diabeticMellitusNewCase: DiseaseData;
  hivNewCases: DiseaseData;
  tuberculosisNewCases: DiseaseData;
  hypertensionNewCases: DiseaseData;
  chemicalPoisoning: DiseaseData;
}

interface ReportableConditions {
  afpPolio: DiseaseData;
  anthrax: DiseaseData;
  cholera: DiseaseData;
  dracunculiasis: DiseaseData;
  chikungunya: DiseaseData;
  adverseEventsFollowingImmunization: DiseaseData;
  measles: DiseaseData;
  neonatalTetanus: DiseaseData;
  humanInfluenzaNewSubtype: DiseaseData;
  suspectedRabiesExposure: DiseaseData;
  humanRabies: DiseaseData;
  dengueFever: DiseaseData;
  sars: DiseaseData;
  smallPox: DiseaseData;
  viralHemorrhagicFever: DiseaseData;
  yellowFever: DiseaseData;
  covid19: DiseaseData;
  monkeypoxVirus: DiseaseData;
  riftValleyFever: DiseaseData;
  brucellosis: DiseaseData;
  maternalDeath: DiseaseData;
  perinatalDeath: DiseaseData;
  obstetricFistula: DiseaseData;
}

interface WeeklyDiseasesReport {
  _id: string;
  reportDate: string;
  weekStartDate: string;
  weekEndDate: string;
  healthCenter: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  lastModified: string;
  weeklyIndicators: WeeklyIndicators;
  reportableConditions: ReportableConditions;
}

const WeeklyDiseasesReportPage: React.FC = () => {
  const [reports, setReports] = useState<WeeklyDiseasesReport[]>([]);
  const [currentReport, setCurrentReport] = useState<WeeklyDiseasesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    weekStartDate: string;
    weekEndDate: string;
    healthCenter: string;
    weeklyIndicators: WeeklyIndicators;
    reportableConditions: ReportableConditions;
  }>({
    weekStartDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    weekEndDate: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
    healthCenter: 'Health Center',
    weeklyIndicators: {} as WeeklyIndicators,
    reportableConditions: {} as ReportableConditions
  });

  // Initialize default disease data structure
  const initializeDiseaseData = (): DiseaseData => ({
    outPatient: 0,
    inPatient: 0,
    deaths: 0
  });

  const initializeWeeklyIndicators = (): WeeklyIndicators => ({
    totalMalariaCases: initializeDiseaseData(),
    totalMalariaSuspectedFeverCases: initializeDiseaseData(),
    malariaPositiveCases: {
      pFalciparum: initializeDiseaseData(),
      pVivax: initializeDiseaseData(),
      mixed: initializeDiseaseData()
    },
    meningitis: initializeDiseaseData(),
    dysentery: initializeDiseaseData(),
    scabies: initializeDiseaseData(),
    relapsingFever: initializeDiseaseData(),
    severeAcuteMalnutrition: initializeDiseaseData(),
    moderateAcuteMalnutritionU5C: initializeDiseaseData(),
    moderateAcuteMalnutritionPLW: initializeDiseaseData(),
    diarrheaWithDehydration: initializeDiseaseData(),
    acuteJaundiceSyndrome: initializeDiseaseData(),
    severePneumonia: initializeDiseaseData(),
    diabeticMellitusNewCase: initializeDiseaseData(),
    hivNewCases: initializeDiseaseData(),
    tuberculosisNewCases: initializeDiseaseData(),
    hypertensionNewCases: initializeDiseaseData(),
    chemicalPoisoning: initializeDiseaseData()
  });

  const initializeReportableConditions = (): ReportableConditions => ({
    afpPolio: initializeDiseaseData(),
    anthrax: initializeDiseaseData(),
    cholera: initializeDiseaseData(),
    dracunculiasis: initializeDiseaseData(),
    chikungunya: initializeDiseaseData(),
    adverseEventsFollowingImmunization: initializeDiseaseData(),
    measles: initializeDiseaseData(),
    neonatalTetanus: initializeDiseaseData(),
    humanInfluenzaNewSubtype: initializeDiseaseData(),
    suspectedRabiesExposure: initializeDiseaseData(),
    humanRabies: initializeDiseaseData(),
    dengueFever: initializeDiseaseData(),
    sars: initializeDiseaseData(),
    smallPox: initializeDiseaseData(),
    viralHemorrhagicFever: initializeDiseaseData(),
    yellowFever: initializeDiseaseData(),
    covid19: initializeDiseaseData(),
    monkeypoxVirus: initializeDiseaseData(),
    riftValleyFever: initializeDiseaseData(),
    brucellosis: initializeDiseaseData(),
    maternalDeath: initializeDiseaseData(),
    perinatalDeath: initializeDiseaseData(),
    obstetricFistula: initializeDiseaseData()
  });

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/weekly-diseases-reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.data || []);
      } else {
        toast.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  // Get current week report
  const getCurrentWeekReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/weekly-diseases-reports/current-week', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentReport(data.data);
        
        // Initialize form data if report exists
        if (data.data) {
          setFormData({
            weekStartDate: format(new Date(data.data.weekStartDate), 'yyyy-MM-dd'),
            weekEndDate: format(new Date(data.data.weekEndDate), 'yyyy-MM-dd'),
            healthCenter: data.data.healthCenter,
            weeklyIndicators: data.data.weeklyIndicators || initializeWeeklyIndicators(),
            reportableConditions: data.data.reportableConditions || initializeReportableConditions()
          });
        } else {
          // Initialize with default values
          setFormData(prev => ({
            ...prev,
            weeklyIndicators: initializeWeeklyIndicators(),
            reportableConditions: initializeReportableConditions()
          }));
        }
      } else {
        toast.error('Failed to get current week report');
      }
    } catch (error) {
      console.error('Error getting current week report:', error);
      toast.error('Error getting current week report');
    } finally {
      setLoading(false);
    }
  };

  // Save or update report
  const saveReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const url = currentReport 
        ? `/api/weekly-diseases-reports/${currentReport._id}`
        : '/api/weekly-diseases-reports';
      
      const method = currentReport ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(currentReport ? 'Report updated successfully' : 'Report created successfully');
        setCurrentReport(data.data);
        setEditing(false);
        fetchReports();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to save report');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Error saving report');
    } finally {
      setLoading(false);
    }
  };

  // Refresh disease counts from assessments
  const refreshFromAssessments = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      
      // If no current report, try to get current week report first
      if (!currentReport) {
        await loadCurrentWeekReport();
        return;
      }
      
      const response = await fetch(`/api/weekly-diseases-reports/${currentReport._id}/refresh-counts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCurrentReport(result.data);
          const newFormData = {
            weekStartDate: formatDate(result.data.weekStartDate),
            weekEndDate: formatDate(result.data.weekEndDate),
            weeklyIndicators: result.data.weeklyIndicators,
            reportableConditions: result.data.reportableConditions
          };
          setFormData(newFormData);
          
          // Debug: Log the diabetes value after refresh
          console.log('Refresh - Diabetes value:', result.data.weeklyIndicators?.diabeticMellitusNewCase?.outPatient);
          console.log('Refresh - New formData:', newFormData.weeklyIndicators?.diabeticMellitusNewCase);
          
          await loadCurrentWeekReport();
          await loadReports();
          toast.success('Disease counts refreshed from assessments');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to refresh disease counts');
      }
    } catch (error) {
      console.error('Error refreshing disease counts:', error);
      toast.error('Error refreshing disease counts');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update form data
  const updateFormData = (section: 'weeklyIndicators' | 'reportableConditions', field: string, subField: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: {
          ...prev[section][field],
          [subField]: value
        }
      }
    }));
  };

  // Print current form function - exact EPHI format with data
  const printCurrentForm = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getValue = (section: 'weeklyIndicators' | 'reportableConditions', field: string, subField: string) => {
      const data = formData[section]?.[field];
      if (!data) return 0;
      return data[subField] || 0;
    };

    // Debug: Log the diabetes value
    console.log('Print - Diabetes value:', getValue('weeklyIndicators', 'diabeticMellitusNewCase', 'outPatient'));
    console.log('Print - FormData diabetes:', formData.weeklyIndicators?.diabeticMellitusNewCase);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Disease Report Form - EPHI Format</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 1.5cm;
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 14px; 
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .header-banner {
              background-color: #4a5568;
              color: white;
              padding: 12px 16px;
              text-align: center;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0 12px 0;
            }
            .table-container {
              margin-bottom: 25px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 15px;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px 10px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
              text-align: center;
              font-size: 13px;
            }
            .indicator-col {
              width: 50%;
              font-size: 11px;
            }
            .cases-col {
              width: 16%;
              text-align: center;
            }
            .deaths-col {
              width: 18%;
              text-align: center;
            }
            .input-cell {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
            }
            .greyed-out {
              background-color: #e5e7eb;
              color: #6b7280;
            }
            .notes {
              margin-top: 20px;
              font-size: 11px;
              font-style: italic;
            }
            .page-break {
              page-break-before: always;
            }
            .no-page-break {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          Weekly Disease Report Form for health center and above Outpatient and Inpatient Cases and Deaths (WRF)
        </div>

        <div class="section-title">1. Record below the total number of cases and deaths for each disease/condition for the current week (WHO Week XX)</div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="indicator-col">Indicator</th>
                <th class="cases-col">Out - Patient</th>
                <th class="cases-col">In - Patient</th>
                <th class="deaths-col">In - Patient</th>
              </tr>
              <tr>
                <th></th>
                <th>Cases</th>
                <th>Cases</th>
                <th>Deaths</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Malaria cases</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'totalMalariaCases', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'totalMalariaCases', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'totalMalariaCases', 'deaths')}</td>
              </tr>
              <tr>
                <td>Total malaria suspected fever cases tested by RDT or Microscopy</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'totalMalariaSuspectedFeverCases', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'totalMalariaSuspectedFeverCases', 'inPatient')}</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;Number cases positive for malaria parasites (either by RDT or Microscopy)</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;P. falciparum</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'pFalciparum')?.outPatient || 0}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'pFalciparum')?.inPatient || 0}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'pFalciparum')?.deaths || 0}</td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;P. vivax</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'pVivax')?.outPatient || 0}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'pVivax')?.inPatient || 0}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'pVivax')?.deaths || 0}</td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Mixed</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'mixed')?.outPatient || 0}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'mixed')?.inPatient || 0}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'malariaPositiveCases', 'mixed')?.deaths || 0}</td>
              </tr>
              <tr>
                <td>Meningitis</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'meningitis', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'meningitis', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'meningitis', 'deaths')}</td>
              </tr>
              <tr>
                <td>Dysentery</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'dysentery', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'dysentery', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'dysentery', 'deaths')}</td>
              </tr>
              <tr>
                <td>Scabies</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'scabies', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'scabies', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'scabies', 'deaths')}</td>
              </tr>
              <tr>
                <td>Relapsing fever</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'relapsingFever', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'relapsingFever', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'relapsingFever', 'deaths')}</td>
              </tr>
              <tr>
                <td>Severe Acute Malnutrition /MUAC < 11.5cm and/or Bilateral Edema in under 5 years children (new cases only)</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'severeAcuteMalnutrition', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'severeAcuteMalnutrition', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'severeAcuteMalnutrition', 'deaths')}</td>
              </tr>
              <tr>
                <td>Moderate Acute Malnutrition: U5C</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'moderateAcuteMalnutritionU5C', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'moderateAcuteMalnutritionU5C', 'inPatient')}</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>Moderate Acute Malnutrition: PLW</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'moderateAcuteMalnutritionPLW', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'moderateAcuteMalnutritionPLW', 'inPatient')}</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>Diarrhea with dehydration in children less than 5 years of age</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'diarrheaWithDehydration', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'diarrheaWithDehydration', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'diarrheaWithDehydration', 'deaths')}</td>
              </tr>
              <tr>
                <td>Acute jaundice syndrome within 14 days of illness</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'acuteJaundiceSyndrome', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'acuteJaundiceSyndrome', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'acuteJaundiceSyndrome', 'deaths')}</td>
              </tr>
              <tr>
                <td>Severe pneumonia in children under 5 years age</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'severePneumonia', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'severePneumonia', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'severePneumonia', 'deaths')}</td>
              </tr>
              <tr>
                <td>Diabetic mellitus new case</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'diabeticMellitusNewCase', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'diabeticMellitusNewCase', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'diabeticMellitusNewCase', 'deaths')}</td>
              </tr>
              <tr>
                <td>HIV New Cases</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'hivNewCases', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'hivNewCases', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'hivNewCases', 'deaths')}</td>
              </tr>
              <tr>
                <td>Tuberculosis new cases</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'tuberculosisNewCases', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'tuberculosisNewCases', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'tuberculosisNewCases', 'deaths')}</td>
              </tr>
              <tr>
                <td>Hypertension new cases</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'hypertensionNewCases', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'hypertensionNewCases', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'hypertensionNewCases', 'deaths')}</td>
              </tr>
              <tr>
                <td>Chemical poisoning</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'chemicalPoisoning', 'outPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'chemicalPoisoning', 'inPatient')}</td>
                <td class="input-cell">${getValue('weeklyIndicators', 'chemicalPoisoning', 'deaths')}</td>
              </tr>
            </tbody>
          </table>
        </div>

             <div class="notes">
               RDT = Rapid Diagnostic Test; MUAC = mid upper arm circumference
             </div>

             <div class="section-title">2. Summary for Immediately Reportable Case-based Disease / Conditions: (Total cases and deaths reported on case-based forms or line lists during the reporting week)</div>
             
             <div class="table-container">
               <table>
                 <thead>
                   <tr>
                     <th class="indicator-col">Indicator</th>
                     <th class="cases-col">Out - Patient</th>
                     <th class="cases-col">In - Patient</th>
                     <th class="deaths-col">In - Patient</th>
                   </tr>
                   <tr>
                     <th></th>
                     <th>Case</th>
                     <th>Case</th>
                     <th>Death</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr>
                     <td>AFP/Polio</td>
                     <td class="input-cell">${getValue('reportableConditions', 'afpPolio', 'outPatient')}</td>
                     <td class="input-cell">${getValue('reportableConditions', 'afpPolio', 'inPatient')}</td>
                     <td class="input-cell">${getValue('reportableConditions', 'afpPolio', 'deaths')}</td>
                   </tr>
              <tr>
                <td>Anthrax</td>
                <td class="input-cell">${getValue('reportableConditions', 'anthrax', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'anthrax', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'anthrax', 'deaths')}</td>
              </tr>
              <tr>
                <td>Cholera</td>
                <td class="input-cell">${getValue('reportableConditions', 'cholera', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'cholera', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'cholera', 'deaths')}</td>
              </tr>
              <tr>
                <td>Dracunculiasis (Guinea worm)</td>
                <td class="input-cell">${getValue('reportableConditions', 'dracunculiasis', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'dracunculiasis', 'inPatient')}</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>Chikungunya</td>
                <td class="input-cell">${getValue('reportableConditions', 'chikungunya', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'chikungunya', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'chikungunya', 'deaths')}</td>
              </tr>
              <tr>
                <td>Adverse events following immunization (AEFI)</td>
                <td class="input-cell">${getValue('reportableConditions', 'adverseEventsFollowingImmunization', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'adverseEventsFollowingImmunization', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'adverseEventsFollowingImmunization', 'deaths')}</td>
              </tr>
              <tr>
                <td>Measles</td>
                <td class="input-cell">${getValue('reportableConditions', 'measles', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'measles', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'measles', 'deaths')}</td>
              </tr>
              <tr>
                <td>Neonatal Tetanus</td>
                <td class="input-cell">${getValue('reportableConditions', 'neonatalTetanus', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'neonatalTetanus', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'neonatalTetanus', 'deaths')}</td>
              </tr>
              <tr>
                <td>Human influenza caused by new subtype</td>
                <td class="input-cell">${getValue('reportableConditions', 'humanInfluenzaNewSubtype', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'humanInfluenzaNewSubtype', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'humanInfluenzaNewSubtype', 'deaths')}</td>
              </tr>
              <tr>
                <td>Suspected rabies exposure</td>
                <td class="input-cell">${getValue('reportableConditions', 'suspectedRabiesExposure', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'suspectedRabiesExposure', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'suspectedRabiesExposure', 'deaths')}</td>
              </tr>
              <tr>
                <td>(Human) Rabies</td>
                <td class="input-cell">${getValue('reportableConditions', 'humanRabies', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'humanRabies', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'humanRabies', 'deaths')}</td>
              </tr>
              <tr>
                <td>Dengue fever</td>
                <td class="input-cell">${getValue('reportableConditions', 'dengueFever', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'dengueFever', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'dengueFever', 'deaths')}</td>
              </tr>
              <tr>
                <td>SARS</td>
                <td class="input-cell">${getValue('reportableConditions', 'sars', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'sars', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'sars', 'deaths')}</td>
              </tr>
              <tr>
                <td>Small pox</td>
                <td class="input-cell">${getValue('reportableConditions', 'smallPox', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'smallPox', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'smallPox', 'deaths')}</td>
              </tr>
              <tr>
                <td>Viral hemorrhagic fever</td>
                <td class="input-cell">${getValue('reportableConditions', 'viralHemorrhagicFever', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'viralHemorrhagicFever', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'viralHemorrhagicFever', 'deaths')}</td>
              </tr>
              <tr>
                <td>Yellow fever</td>
                <td class="input-cell">${getValue('reportableConditions', 'yellowFever', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'yellowFever', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'yellowFever', 'deaths')}</td>
              </tr>
              <tr>
                <td>COVID-19</td>
                <td class="input-cell">${getValue('reportableConditions', 'covid19', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'covid19', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'covid19', 'deaths')}</td>
              </tr>
              <tr>
                <td>Monkeypox virus</td>
                <td class="input-cell">${getValue('reportableConditions', 'monkeypoxVirus', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'monkeypoxVirus', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'monkeypoxVirus', 'deaths')}</td>
              </tr>
              <tr>
                <td>Rift Valley Fever</td>
                <td class="input-cell">${getValue('reportableConditions', 'riftValleyFever', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'riftValleyFever', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'riftValleyFever', 'deaths')}</td>
              </tr>
              <tr>
                <td>Brucellosis</td>
                <td class="input-cell">${getValue('reportableConditions', 'brucellosis', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'brucellosis', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'brucellosis', 'deaths')}</td>
              </tr>
              <tr>
                <td>Maternal death</td>
                <td class="input-cell">${getValue('reportableConditions', 'maternalDeath', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'maternalDeath', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'maternalDeath', 'deaths')}</td>
              </tr>
              <tr>
                <td>Perinatal death</td>
                <td class="input-cell">${getValue('reportableConditions', 'perinatalDeath', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'perinatalDeath', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'perinatalDeath', 'deaths')}</td>
              </tr>
              <tr>
                <td>Obstetric fistula</td>
                <td class="input-cell">${getValue('reportableConditions', 'obstetricFistula', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'obstetricFistula', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'obstetricFistula', 'deaths')}</td>
              </tr>
              <tr>
                <td>Other 1 (specify) ---</td>
                <td class="input-cell">${getValue('reportableConditions', 'other1', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'other1', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'other1', 'deaths')}</td>
              </tr>
              <tr>
                <td>Other 2 (specify) ---</td>
                <td class="input-cell">${getValue('reportableConditions', 'other2', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'other2', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'other2', 'deaths')}</td>
              </tr>
              <tr>
                <td>Other 3 (specify) ---</td>
                <td class="input-cell">${getValue('reportableConditions', 'other3', 'outPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'other3', 'inPatient')}</td>
                <td class="input-cell">${getValue('reportableConditions', 'other3', 'deaths')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Print blank form function - exact EPHI format
  const printBlankForm = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Disease Report Form - EPHI Format</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 1.5cm;
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 14px; 
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .header-banner {
              background-color: #4a5568;
              color: white;
              padding: 12px 16px;
              text-align: center;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0 12px 0;
            }
            .table-container {
              margin-bottom: 25px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 15px;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px 10px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
              text-align: center;
              font-size: 13px;
            }
            .indicator-col {
              width: 50%;
              font-size: 11px;
            }
            .cases-col {
              width: 16%;
              text-align: center;
            }
            .deaths-col {
              width: 18%;
              text-align: center;
            }
            .input-cell {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
            }
            .greyed-out {
              background-color: #e5e7eb;
              color: #6b7280;
            }
            .notes {
              margin-top: 20px;
              font-size: 11px;
              font-style: italic;
            }
            .page-break {
              page-break-before: always;
            }
            .no-page-break {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          Weekly Disease Report Form for health center and above Outpatient and Inpatient Cases and Deaths (WRF)
        </div>

        <div class="section-title">1. Record below the total number of cases and deaths for each disease/condition for the current week (WHO Week XX)</div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="indicator-col">Indicator</th>
                <th class="cases-col">Out - Patient</th>
                <th class="cases-col">In - Patient</th>
                <th class="deaths-col">In - Patient</th>
              </tr>
              <tr>
                <th></th>
                <th>Cases</th>
                <th>Cases</th>
                <th>Deaths</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Malaria cases</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Total malaria suspected fever cases tested by RDT or Microscopy</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;Number cases positive for malaria parasites (either by RDT or Microscopy)</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;P. falciparum</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;P. vivax</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Mixed</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Meningitis</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Dysentery</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Scabies</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Relapsing fever</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Severe Acute Malnutrition /MUAC < 11.5cm and/or Bilateral Edema in under 5 years children (new cases only)</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Moderate Acute Malnutrition: U5C</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>Moderate Acute Malnutrition: PLW</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>Diarrhea with dehydration in children less than 5 years of age</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Acute jaundice syndrome within 14 days of illness</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Severe pneumonia in children under 5 years age</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Diabetic mellitus new case</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>HIV New Cases</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Tuberculosis new cases</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Hypertension new cases</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Chemical poisoning</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
            </tbody>
          </table>
        </div>

             <div class="notes">
               RDT = Rapid Diagnostic Test; MUAC = mid upper arm circumference
             </div>

             <div class="section-title">2. Summary for Immediately Reportable Case-based Disease / Conditions: (Total cases and deaths reported on case-based forms or line lists during the reporting week)</div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="indicator-col">Indicator</th>
                <th class="cases-col">Out - Patient</th>
                <th class="cases-col">In - Patient</th>
                <th class="deaths-col">In - Patient</th>
              </tr>
              <tr>
                <th></th>
                <th>Case</th>
                <th>Case</th>
                <th>Death</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AFP/Polio</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Anthrax</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Cholera</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Dracunculiasis (Guinea worm)</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="greyed-out">-</td>
              </tr>
              <tr>
                <td>Chikungunya</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Adverse events following immunization (AEFI)</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Measles</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Neonatal Tetanus</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Human influenza caused by new subtype</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Suspected rabies exposure</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>(Human) Rabies</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Dengue fever</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>SARS</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Small pox</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Viral hemorrhagic fever</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Yellow fever</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>COVID-19</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Monkeypox virus</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Rift Valley Fever</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Brucellosis</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Maternal death</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Perinatal death</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Obstetric fistula</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Other 1 (specify) ---</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Other 2 (specify) ---</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
              <tr>
                <td>Other 3 (specify) ---</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
                <td class="input-cell">0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Render disease input row
  const renderDiseaseInput = (label: string, field: string, section: 'weeklyIndicators' | 'reportableConditions') => {
    const data = formData[section][field] || initializeDiseaseData();
    
    return (
      <div className="grid grid-cols-4 gap-4 items-center py-2 border-b">
        <Label className="text-sm font-medium">{label}</Label>
        <div>
          <Label className="text-xs text-gray-500">Out-Patient</Label>
          <Input
            type="number"
            min="0"
            value={data.outPatient}
            onChange={(e) => updateFormData(section, field, 'outPatient', parseInt(e.target.value) || 0)}
            disabled={!editing}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">In-Patient</Label>
          <Input
            type="number"
            min="0"
            value={data.inPatient}
            onChange={(e) => updateFormData(section, field, 'inPatient', parseInt(e.target.value) || 0)}
            disabled={!editing}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Deaths</Label>
          <Input
            type="number"
            min="0"
            value={data.deaths}
            onChange={(e) => updateFormData(section, field, 'deaths', parseInt(e.target.value) || 0)}
            disabled={!editing}
            className="text-sm"
          />
        </div>
      </div>
    );
  };

  useEffect(() => {
    getCurrentWeekReport();
    fetchReports();
  }, []);

  return (
    <>
        <style jsx="true" global="true">{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            font-size: 14px;
            line-height: 1.4;
          }
          .container {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            margin-bottom: 25px !important;
          }
          .card-header {
            background-color: #f0f0f0 !important;
            border-bottom: 2px solid #000 !important;
            padding: 15px !important;
          }
          .card-title {
            font-size: 18px !important;
            font-weight: bold !important;
            margin: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 25px !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 8px 10px !important;
            text-align: left !important;
            font-size: 12px !important;
          }
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
          }
          .section-title {
            background-color: #e0e0e0 !important;
            font-weight: bold !important;
          }
          .input-field {
            width: 60px !important;
            text-align: center !important;
            font-size: 14px !important;
          }
          .tabs {
            display: none !important;
          }
          .tabs-content {
            display: block !important;
          }
          .recent-reports {
            display: none !important;
          }
        }
      `}</style>
      <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Diseases Report</h1>
          <p className="text-gray-600 mt-2">Health Center Disease Surveillance and Reporting</p>
        </div>
        <div className="flex gap-2">
          {/* Debug info */}
          <div className="text-xs text-gray-500">
            Current Report: {currentReport ? 'Loaded' : 'Not loaded'}
          </div>
          {currentReport && (
            <Button
              variant={editing ? "default" : "outline"}
              onClick={() => setEditing(!editing)}
              disabled={loading}
            >
              {editing ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit Report
                </>
              )}
            </Button>
          )}
          {editing && (
            <Button onClick={saveReport} disabled={loading}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Report'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={refreshFromAssessments}
            disabled={isRefreshing}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Refreshing...' : 'Refresh from Assessments'}
          </Button>
          <Button
            variant="outline"
            onClick={() => printCurrentForm()}
            className="bg-gray-50 hover:bg-gray-100"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print Form
          </Button>
          <Button
            variant="outline"
            onClick={() => printBlankForm()}
            className="bg-gray-50 hover:bg-gray-100"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print Blank Form
          </Button>
        </div>
      </div>

      {/* Report Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentChartBarIcon className="w-5 h-5" />
            Report Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Health Center</Label>
              <Input
                value={formData.healthCenter}
                onChange={(e) => setFormData(prev => ({ ...prev, healthCenter: e.target.value }))}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Week Start Date</Label>
              <Input
                type="date"
                value={formData.weekStartDate}
                onChange={(e) => setFormData(prev => ({ ...prev, weekStartDate: e.target.value }))}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Week End Date</Label>
              <Input
                type="date"
                value={formData.weekEndDate}
                onChange={(e) => setFormData(prev => ({ ...prev, weekEndDate: e.target.value }))}
                disabled={!editing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Weekly Disease Indicators */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1. Record below the total number of cases and deaths for each disease/condition for the current week (WHO Week XX)</CardTitle>
          <p className="text-sm text-gray-600">RDT = Rapid Diagnostic Test; MUAC = mid upper arm circumference</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Malaria Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 text-blue-700">Malaria Indicators</h3>
              {renderDiseaseInput('Total Malaria cases', 'totalMalariaCases', 'weeklyIndicators')}
              {renderDiseaseInput('Total malaria suspected fever cases tested by RDT or Microscopy', 'totalMalariaSuspectedFeverCases', 'weeklyIndicators')}
              {renderDiseaseInput('P. falciparum', 'malariaPositiveCases.pFalciparum', 'weeklyIndicators')}
              {renderDiseaseInput('P. vivax', 'malariaPositiveCases.pVivax', 'weeklyIndicators')}
              {renderDiseaseInput('Mixed', 'malariaPositiveCases.mixed', 'weeklyIndicators')}
            </div>

            {/* Other Diseases */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 text-green-700">Other Diseases</h3>
              {renderDiseaseInput('Meningitis', 'meningitis', 'weeklyIndicators')}
              {renderDiseaseInput('Dysentery', 'dysentery', 'weeklyIndicators')}
              {renderDiseaseInput('Scabies', 'scabies', 'weeklyIndicators')}
              {renderDiseaseInput('Relapsing fever', 'relapsingFever', 'weeklyIndicators')}
              {renderDiseaseInput('Severe Acute Malnutrition /MUAC < 11.5cm and/or Bilateral Edema in under 5 years children (new cases only)', 'severeAcuteMalnutrition', 'weeklyIndicators')}
              {renderDiseaseInput('Moderate Acute Malnutrition: U5C', 'moderateAcuteMalnutritionU5C', 'weeklyIndicators')}
              {renderDiseaseInput('Moderate Acute Malnutrition: PLW', 'moderateAcuteMalnutritionPLW', 'weeklyIndicators')}
              {renderDiseaseInput('Diarrhea with dehydration in children less than 5 years of age', 'diarrheaWithDehydration', 'weeklyIndicators')}
              {renderDiseaseInput('Acute jaundice syndrome within 14 days of illness', 'acuteJaundiceSyndrome', 'weeklyIndicators')}
              {renderDiseaseInput('Severe pneumonia in children under 5 years age', 'severePneumonia', 'weeklyIndicators')}
              {renderDiseaseInput('Diabetic mellitus new case', 'diabeticMellitusNewCase', 'weeklyIndicators')}
              {renderDiseaseInput('HIV New Cases', 'hivNewCases', 'weeklyIndicators')}
              {renderDiseaseInput('Tuberculosis new cases', 'tuberculosisNewCases', 'weeklyIndicators')}
              {renderDiseaseInput('Hypertension new cases', 'hypertensionNewCases', 'weeklyIndicators')}
              {renderDiseaseInput('Chemical poisoning', 'chemicalPoisoning', 'weeklyIndicators')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Reportable Conditions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2. Summary for Immediately Reportable Case-based Disease / Conditions: (Total cases and deaths reported on case-based forms or line lists during the reporting week)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {renderDiseaseInput('AFP/Polio', 'afpPolio', 'reportableConditions')}
            {renderDiseaseInput('Anthrax', 'anthrax', 'reportableConditions')}
            {renderDiseaseInput('Cholera', 'cholera', 'reportableConditions')}
            {renderDiseaseInput('Dracunculiasis (Guinea worm)', 'dracunculiasis', 'reportableConditions')}
            {renderDiseaseInput('Chikungunya', 'chikungunya', 'reportableConditions')}
            {renderDiseaseInput('Adverse events following immunization (AEFI)', 'adverseEventsFollowingImmunization', 'reportableConditions')}
            {renderDiseaseInput('Measles', 'measles', 'reportableConditions')}
            {renderDiseaseInput('Neonatal Tetanus', 'neonatalTetanus', 'reportableConditions')}
            {renderDiseaseInput('Human influenza caused by new subtype', 'humanInfluenzaNewSubtype', 'reportableConditions')}
            {renderDiseaseInput('Suspected rabies exposure', 'suspectedRabiesExposure', 'reportableConditions')}
            {renderDiseaseInput('(Human) Rabies', 'humanRabies', 'reportableConditions')}
            {renderDiseaseInput('Dengue fever', 'dengueFever', 'reportableConditions')}
            {renderDiseaseInput('SARS', 'sars', 'reportableConditions')}
            {renderDiseaseInput('Small pox', 'smallPox', 'reportableConditions')}
            {renderDiseaseInput('Viral hemorrhagic fever', 'viralHemorrhagicFever', 'reportableConditions')}
            {renderDiseaseInput('Yellow fever', 'yellowFever', 'reportableConditions')}
            {renderDiseaseInput('COVID-19', 'covid19', 'reportableConditions')}
            {renderDiseaseInput('Monkeypox virus', 'monkeypoxVirus', 'reportableConditions')}
            {renderDiseaseInput('Rift Valley Fever', 'riftValleyFever', 'reportableConditions')}
            {renderDiseaseInput('Brucellosis', 'brucellosis', 'reportableConditions')}
            {renderDiseaseInput('Maternal death', 'maternalDeath', 'reportableConditions')}
            {renderDiseaseInput('Perinatal death', 'perinatalDeath', 'reportableConditions')}
            {renderDiseaseInput('Obstetric fistula', 'obstetricFistula', 'reportableConditions')}
            {renderDiseaseInput('Other 1 (specify)', 'other1', 'reportableConditions')}
            {renderDiseaseInput('Other 2 (specify)', 'other2', 'reportableConditions')}
            {renderDiseaseInput('Other 3 (specify)', 'other3', 'reportableConditions')}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <Card className="mt-6 recent-reports no-print">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.slice(0, 5).map((report) => (
                <div key={report._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      Week of {format(new Date(report.weekStartDate), 'MMM dd')} - {format(new Date(report.weekEndDate), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Created by {report.createdBy?.firstName || 'Unknown'} {report.createdBy?.lastName || 'User'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {format(new Date(report.reportDate), 'MMM dd, yyyy')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
};

export default WeeklyDiseasesReportPage;
