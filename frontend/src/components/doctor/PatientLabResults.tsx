import React, { useState, useEffect } from 'react';
import { RefreshCw, FileBarChart, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types/user';

interface PatientLabResultsProps {
  patientId: string;
  user: User | null;
}

interface LabResult {
  _id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  referenceRange?: {
    min?: number;
    max?: number;
    text?: string;
  };
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  date: string;
  orderedBy?: string;
  notes?: string;
  sampleCollectedAt?: string;
  resultAvailableAt?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
  historicalValues?: {
    value: number;
    date: string;
  }[];
  [key: string]: any;
}

interface GroupedLabResults {
  [category: string]: LabResult[];
}

const PatientLabResults: React.FC<PatientLabResultsProps> = ({ patientId, user }) => {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<GroupedLabResults>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLabResults = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/lab-results/patient/${patientId}`);
      
      if (response.data && Array.isArray(response.data)) {
        setLabResults(response.data);
        
        // Group results by category
        const grouped: GroupedLabResults = {};
        response.data.forEach((result: LabResult) => {
          const category = result.category || 'Uncategorized';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(result);
        });
        
        setGroupedResults(grouped);
        
        // Expand the most recent category by default
        if (Object.keys(grouped).length > 0 && expandedCategories.length === 0) {
          setExpandedCategories([Object.keys(grouped)[0]]);
        }
      } else {
        setLabResults([]);
        setGroupedResults({});
        setError('No lab results found');
      }
    } catch (error) {
      console.error('Error fetching lab results:', error);
      setError('Failed to load lab results');
      setLabResults([]);
      setGroupedResults({});
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLabResults();
  }, [patientId]);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };
  
  const getStatusIndicator = (status: string, value: number, referenceRange?: { min?: number; max?: number; text?: string }) => {
    let color = 'text-muted-foreground';
    let bg = 'bg-muted/20';
    let icon = null;
    
    if (status === 'normal') {
      color = 'text-primary';
      bg = 'bg-primary/20';
    } else if (status === 'abnormal') {
      color = 'text-accent-foreground';
      bg = 'bg-accent/20';
      icon = <AlertTriangle className="h-3.5 w-3.5 mr-1" />;
    } else if (status === 'critical') {
      color = 'text-destructive';
      bg = 'bg-destructive/20';
      icon = <AlertCircle className="h-3.5 w-3.5 mr-1" />;
    }
    
    // If no explicit status but we have reference range and value
    if (status === 'normal' && referenceRange) {
      if (
        (referenceRange.min !== undefined && value < referenceRange.min) ||
        (referenceRange.max !== undefined && value > referenceRange.max)
      ) {
        color = 'text-accent-foreground';
        bg = 'bg-accent/20';
        icon = <AlertTriangle className="h-3.5 w-3.5 mr-1" />;
        status = 'abnormal';
      }
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  const getTrendIndicator = (trend?: string) => {
    if (!trend) return null;
    
    if (trend === 'increasing') {
      return <TrendingUp className="h-4 w-4 text-destructive" />;
    } else if (trend === 'decreasing') {
      return <TrendingDown className="h-4 w-4 text-primary" />;
    } else {
      return <Activity className="h-4 w-4 text-primary" />;
    }
  };
  
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };
  
  const toggleTest = (testId: string) => {
    setExpandedTests((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };
  
  const getReferenceRangeText = (referenceRange?: { min?: number; max?: number; text?: string }) => {
    if (!referenceRange) return 'Not specified';
    
    if (referenceRange.text) return referenceRange.text;
    
    if (referenceRange.min !== undefined && referenceRange.max !== undefined) {
      return `${referenceRange.min} - ${referenceRange.max}`;
    } else if (referenceRange.min !== undefined) {
      return `> ${referenceRange.min}`;
    } else if (referenceRange.max !== undefined) {
      return `< ${referenceRange.max}`;
    }
    
    return 'Not specified';
  };

  return (
    <div className="p-4 bg-primary-foreground rounded-lg border border-border/30 shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-primary" />
          Laboratory Results
        </h3>
        <button
          onClick={fetchLabResults}
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Lab Results Content */}
      <div className="space-y-6 max-h-[calc(95vh-280px)] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 text-center">
            <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading lab results...</p>
          </div>
        ) : Object.keys(groupedResults).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedResults).map(([category, results]) => (
              <div key={category} className="border border-border/30 rounded-lg overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-muted-foreground flex items-center">
                      <FileBarChart className="h-4 w-4 text-primary mr-2" />
                      {category}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({results.length} {results.length === 1 ? 'test' : 'tests'})
                      </span>
                    </div>
                    <div className="flex items-center">
                      {expandedCategories.includes(category) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedCategories.includes(category) && (
                  <div className="bg-primary-foreground p-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-muted/10">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/3">
                            Test Name
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Result
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Reference Range
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-primary-foreground divide-y divide-gray-200">
                        {results.map((result) => (
                          <React.Fragment key={result._id}>
                            <tr 
                              className={`hover:bg-muted/10 cursor-pointer ${expandedTests.includes(result._id) ? 'bg-primary/10' : ''}`}
                              onClick={() => toggleTest(result._id)}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium text-muted-foreground">{result.name}</div>
                                  <div>
                                    {expandedTests.includes(result._id) ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground/50" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-sm text-muted-foreground">
                                    {result.value} {result.unit}
                                  </span>
                                  <span className="ml-2">{getTrendIndicator(result.trend)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {getReferenceRangeText(result.referenceRange)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getStatusIndicator(result.status, result.value, result.referenceRange)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                {formatDate(result.date)}
                              </td>
                            </tr>
                            
                            {expandedTests.includes(result._id) && (
                              <tr>
                                <td colSpan={5} className="bg-muted/10 px-4 py-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      {result.notes && (
                                        <div className="mb-4">
                                          <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Clinical Notes</h5>
                                          <div className="text-sm text-muted-foreground bg-primary-foreground p-3 rounded border border-border/30">
                                            {result.notes}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {result.historicalValues && result.historicalValues.length > 0 && (
                                        <div>
                                          <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Historical Values</h5>
                                          <div className="text-sm text-muted-foreground bg-primary-foreground rounded border border-border/30">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-muted/10">
                                                <tr>
                                                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                                                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Value</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-200">
                                                {result.historicalValues.map((hv, idx) => (
                                                  <tr key={idx} className="hover:bg-muted/10">
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                                                      {formatDate(hv.date)}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                                                      {hv.value} {result.unit}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        {result.orderedBy && (
                                          <div>
                                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Ordered By</h5>
                                            <p className="text-sm text-muted-foreground">Dr. {result.orderedBy}</p>
                                          </div>
                                        )}
                                        
                                        {result.sampleCollectedAt && (
                                          <div>
                                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Sample Collected</h5>
                                            <p className="text-sm text-muted-foreground">{formatDate(result.sampleCollectedAt)}</p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {result.resultAvailableAt && (
                                        <div>
                                          <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Results Available</h5>
                                          <p className="text-sm text-muted-foreground">{formatDate(result.resultAvailableAt)}</p>
                                        </div>
                                      )}
                                      
                                      {result.performedBy && (
                                        <div>
                                          <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Performed By</h5>
                                          <p className="text-sm text-muted-foreground">{result.performedBy}</p>
                                        </div>
                                      )}
                                      
                                      {result.method && (
                                        <div>
                                          <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Testing Method</h5>
                                          <p className="text-sm text-muted-foreground">{result.method}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/10 rounded-lg border border-border/30">
            <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3">
              <FileBarChart className="h-full w-full" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">No lab results found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no laboratory results available for this patient.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientLabResults; 