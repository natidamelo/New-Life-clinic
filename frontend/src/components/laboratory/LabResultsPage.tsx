import React, { useState, useEffect } from 'react';
import { FlaskConical, RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

// Mapping of test types to their specific parameters
const TEST_TYPE_PARAMETERS = {
  'Stool': [
    { key: 'consistency', label: 'Consistency' },
    { key: 'color', label: 'Color' },
    { key: 'occultBlood', label: 'Occult Blood' },
    { key: 'helicobacterPyloriAntigen', label: 'H. Pylori Antigen' }
  ],
  'Urine': [
    { key: 'color', label: 'Color' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'pH', label: 'pH' },
    { key: 'protein', label: 'Protein' },
    { key: 'leukocytes', label: 'Leukocytes' }
  ],
  'Blood': [
    { key: 'hemoglobin', label: 'Hemoglobin' },
    { key: 'whiteBloodCells', label: 'White Blood Cells' },
    { key: 'redBloodCells', label: 'Red Blood Cells' },
    { key: 'platelets', label: 'Platelets' }
  ]
};

const LabResultsPage = ({ patientId }) => {
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      fetchLabResults();
    }
  }, [patientId]);

  const fetchLabResults = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/lab-results/patient/${patientId}`);
      if (response.data) {
        setLabResults(response.data);
      }
    } catch (error) {
      console.error('Error fetching lab results:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTestResults = (result) => {
    // Determine test type (default to 'default' if not specified)
    const testType = result.test?.category || 'default';
    const parameters = TEST_TYPE_PARAMETERS[testType] || [];

    return (
      <div className="mt-3 pt-3 border-t border-border/20">
        <h5 className="text-sm font-medium mb-2">Detailed Results:</h5>
        
        {/* Normal Range */}
        {result.normalRange && (
          <div className="mb-2 flex items-center">
            <span className="text-sm font-medium mr-2">Normal Range:</span>
            <span className="text-sm text-muted-foreground">{result.normalRange}</span>
          </div>
        )}

        {/* Interpretation */}
        <div className="mb-2 flex items-center">
          <span className="text-sm font-medium mr-2">Interpretation:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            result.interpretation === 'Normal' ? 'bg-primary/20 text-primary' :
            result.interpretation === 'Abnormal' ? 'bg-destructive/20 text-destructive' :
            result.interpretation === 'Critical' ? 'bg-destructive/30 text-destructive' :
            result.interpretation === 'Borderline' ? 'bg-accent/20 text-accent-foreground' :
            'bg-muted/20 text-muted-foreground'
          }`}>
            {result.interpretation || 'Inconclusive'}
          </span>
        </div>

        {/* Specific Test Parameters */}
        {parameters.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {parameters.map(param => (
              <div key={param.key} className="flex justify-between items-center">
                <span className="text-sm font-medium">{param.label}:</span>
                <span className="text-sm">
                  {result.results?.[param.key] !== undefined 
                    ? String(result.results[param.key]) 
                    : 'Not Recorded'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Additional Notes */}
        {result.notes && (
          <div className="mt-2 border-t border-border/20 pt-2">
            <h6 className="text-xs font-medium text-muted-foreground mb-1">Notes:</h6>
            <p className="text-sm text-muted-foreground">{result.notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-primary-foreground rounded-lg border border-border/30 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          Laboratory Results
        </h3>
        <button 
          onClick={fetchLabResults}
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary-foreground text-muted-foreground hover:bg-muted/20 border border-border/40 shadow-sm transition-colors"
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-4 text-muted-foreground">Loading lab results...</div>
      ) : labResults.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">No lab results found for this patient.</div>
      ) : (
        <div className="space-y-4">
          {labResults.map((result, index) => (
            <div key={result._id || result.id || index} className="border border-border/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {result.testName || 'Unknown Test'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {result.resultDate ? new Date(result.resultDate).toLocaleDateString() : 'Date not available'}
                  </p>
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${
                    result.status === 'Completed' ? 'bg-primary/20 text-primary' : 
                    result.status === 'In Progress' ? 'bg-primary/20 text-primary' :
                    'bg-muted/20 text-muted-foreground'
                  }`}>
                    {result.status === 'Completed' ? <CheckCircle className="h-3.5 w-3.5" /> : 
                     result.status === 'In Progress' ? <AlertCircle className="h-3.5 w-3.5" /> : null}
                    {result.status || 'Status unknown'}
                  </span>
                </div>
              </div>
              
              {renderTestResults(result)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LabResultsPage; 