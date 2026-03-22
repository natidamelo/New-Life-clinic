import React, { useEffect, useState } from 'react';
import { FlaskConical, FileText, RefreshCw, Beaker, Droplet, Activity, PieChart, Heart, Zap } from 'lucide-react';
import labService from '../../services/labService';
import { toast } from 'react-toastify';
import { api } from '../../services/api';
import { User } from '../../types/user';

interface LabResultsSectionProps {
  patientId: string;
  user: User | null;
  refreshTrigger?: number;
}

const LabResultsSection: React.FC<LabResultsSectionProps> = ({ patientId, user, refreshTrigger = 0 }) => {
  const [labResults, setLabResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const showTodaySchedule = false;
  
  const fetchLabResults = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to fetch from the standardized endpoint
      const response = await api.get(`/api/lab-results/patient/${patientId}`);
      
      if (response.data && Array.isArray(response.data)) {
        // Standardize the results
        const standardizedResults = response.data.map(result => 
          labService.standardizeLabResult(result)
        );
        setLabResults(standardizedResults);
        console.log('Fetched standardized lab results:', standardizedResults);
      } else {
        setLabResults([]);
        setError('No lab results found');
      }
    } catch (error) {
      console.error('Error fetching lab results:', error);
      setError('Failed to load lab results. Please try again later.');
      setLabResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch results when component mounts or patientId/refreshTrigger changes
  useEffect(() => {
    fetchLabResults();
  }, [patientId, refreshTrigger]);
  
  // Get test category and icon
  const getTestCategoryInfo = (testName: string) => {
    const lowerCaseName = testName.toLowerCase();
    
    if (lowerCaseName.includes('blood') || 
        lowerCaseName.includes('hemo') || 
        lowerCaseName.includes('rbc') || 
        lowerCaseName.includes('wbc') ||
        lowerCaseName.includes('cbc') ||
        lowerCaseName.includes('platelet')) {
      return { 
        category: 'Hematology', 
        icon: <Droplet className="h-4 w-4 text-destructive" /> 
      };
    }
    
    if (lowerCaseName.includes('glucose') || 
        lowerCaseName.includes('chem') || 
        lowerCaseName.includes('sodium') || 
        lowerCaseName.includes('potassium') ||
        lowerCaseName.includes('urea') ||
        lowerCaseName.includes('creatinine') ||
        lowerCaseName.includes('cholesterol') ||
        lowerCaseName.includes('lipid')) {
      return { 
        category: 'Chemistry', 
        icon: <Beaker className="h-4 w-4 text-secondary-foreground" /> 
      };
    }
    
    if (lowerCaseName.includes('hcg') || 
        lowerCaseName.includes('pregnancy') || 
        lowerCaseName.includes('beta') ||
        lowerCaseName.includes('human chorionic gonadotropin')) {
      return { 
        category: 'Hormone/Pregnancy', 
        icon: <Heart className="h-4 w-4 text-pink-500" /> 
      };
    }
    
    if (lowerCaseName.includes('thyroid') || 
        lowerCaseName.includes('tsh') || 
        lowerCaseName.includes('hormone') ||
        lowerCaseName.includes('testosterone') ||
        lowerCaseName.includes('estrogen') ||
        lowerCaseName.includes('cortisol') ||
        lowerCaseName.includes('insulin')) {
      return { 
        category: 'Endocrinology', 
        icon: <Activity className="h-4 w-4 text-purple-500" /> 
      };
    }
    
    if (lowerCaseName.includes('culture') || 
        lowerCaseName.includes('stain') || 
        lowerCaseName.includes('micro') ||
        lowerCaseName.includes('covid') ||
        lowerCaseName.includes('malaria')) {
      return { 
        category: 'Microbiology', 
        icon: <Zap className="h-4 w-4 text-primary" /> 
      };
    }
    
    if (lowerCaseName.includes('stool') || 
        lowerCaseName.includes('fecal') || 
        lowerCaseName.includes('parasite') ||
        lowerCaseName.includes('ova')) {
      return { 
        category: 'Parasitology', 
        icon: <Beaker className="h-4 w-4 text-orange-500" /> 
      };
    }
    
    if (lowerCaseName.includes('cardiac') || 
        lowerCaseName.includes('troponin') ||
        lowerCaseName.includes('ecg')) {
      return { 
        category: 'Cardiac', 
        icon: <Heart className="h-4 w-4 text-destructive" /> 
      };
    }
    
    if (lowerCaseName.includes('hepatitis') ||
        lowerCaseName.includes('hiv') ||
        lowerCaseName.includes('antibody') || 
        lowerCaseName.includes('vdrl') ||
        lowerCaseName.includes('syphilis')) {
      return { 
        category: 'Serology/Immunology', 
        icon: <Activity className="h-4 w-4 text-primary" /> 
      };
    }

    return { 
      category: 'Other', 
      icon: <PieChart className="h-4 w-4 text-muted-foreground" /> 
    };
  };
  
  // Render individual result values from a lab test
  const renderResultValues = (result: any) => {
    // Check if results is a nested object
    if (result.results && typeof result.results === 'object' && !Array.isArray(result.results)) {
      return Object.entries(result.results).map(([key, value], index) => {
        let displayValue = '';
        let normalRange = '';

        // Handle different result value formats
        if (typeof value === 'object' && value !== null) {
          // Structured format
          const typedValue = value as {value?: string; unit?: string; normalRange?: string};
          displayValue = typedValue.value || '';
          if (typedValue.unit) {
            displayValue += ` ${typedValue.unit}`;
          }
          normalRange = typedValue.normalRange || '';
        } else if (typeof value === 'string') {
          // String format
          displayValue = value;
        } else {
          // Fallback
          displayValue = JSON.stringify(value);
        }

        // Look for normal range
        if (!normalRange) {
          if (result.normalRanges && typeof result.normalRanges === 'object' && result.normalRanges[key]) {
            normalRange = result.normalRanges[key];
          } else if (result.normalRange && typeof result.normalRange === 'string') {
            normalRange = result.normalRange;
          }
        }

        return (
          <div key={`${result._id || result.id}-${index}-${key}`} className="flex justify-between border-b border-border/20 pb-1">
            <span className="font-medium text-sm">{key}:</span>
            <div className="flex items-center">
              <span className="text-sm">{displayValue}</span>
              {normalRange && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Normal: {normalRange})
                </span>
              )}
            </div>
          </div>
        );
      });
    }
    
    // If it's a simple string value
    if (typeof result.results === 'string') {
      return (
        <div className="flex justify-between border-b border-border/20 pb-1">
          <span className="font-medium text-sm">Result:</span>
          <div className="flex items-center">
            <span className="text-sm">{result.results}</span>
            {result.normalRange && (
              <span className="text-xs text-muted-foreground ml-2">
                (Normal: {result.normalRange})
              </span>
            )}
          </div>
        </div>
      );
    }
    
    // Last resort: just show raw data
    return (
      <div className="flex justify-between border-b border-border/20 pb-1">
        <span className="font-medium text-sm">Raw Data:</span>
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground italic">
            {typeof result.results === 'object' 
              ? 'Complex result data structure'
              : JSON.stringify(result).substring(0, 50) + '...'}
          </span>
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return <div className="py-4 text-center">Loading lab results...</div>;
  }
  
  if (error && labResults.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        {error}
      </div>
    );
  }
  
  if (labResults.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No lab results found for this patient.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Lab Results</h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLabResults}
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 shadow-sm transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      {labResults.map((result, index) => {
        const { category, icon } = getTestCategoryInfo(result.testName);
        
        return (
          <div key={result._id || result.id || index} className="border border-border/30 rounded-lg p-4 bg-primary-foreground">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                {icon}
                <h4 className="font-medium text-muted-foreground ml-2">{result.testName || result.name || 'Unknown Test'}</h4>
                <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  {category}
                </span>
                {result.sentToDoctor && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded flex items-center">
                    <FileText className="h-3 w-3 mr-1" />
                    Sent to Doctor
                  </span>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {new Date(result.resultDate || result.dateProcessed || result.createdAt || Date.now()).toLocaleDateString()}
              </div>
            </div>
            
            <div className="bg-muted/10 p-3 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderResultValues(result)}
              </div>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              Ordered by {result.orderedBy || 'Unknown'} on {new Date(result.orderDate || result.createdAt || Date.now()).toLocaleDateString()}
              {result.sentDate && (
                <span className="ml-2">
                  • Sent on {new Date(result.sentDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LabResultsSection; 