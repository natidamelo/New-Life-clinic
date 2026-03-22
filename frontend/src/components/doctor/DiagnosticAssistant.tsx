import React, { useState } from 'react';
import { DiagnosticSuggestion } from '../../services/doctorService';
import doctorService from '../../services/doctorService';

const DiagnosticAssistant: React.FC = () => {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [suggestions, setSuggestions] = useState<DiagnosticSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSymptom = () => {
    if (newSymptom.trim()) {
      setSymptoms([...symptoms, newSymptom.trim()]);
      setNewSymptom('');
    }
  };

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  const getDiagnosticSuggestions = async () => {
    if (symptoms.length === 0) {
      setError('Please add at least one symptom');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await doctorService.getDiagnosticSuggestions(symptoms);
      setSuggestions(data);
    } catch (err) {
      setError('Failed to get diagnostic suggestions');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-primary-foreground p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">AI Diagnostic Assistant</h3>

      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newSymptom}
            onChange={(e) => setNewSymptom(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
            placeholder="Enter symptom"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={addSymptom}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {symptoms.map((symptom, index) => (
            <div
              key={index}
              className="bg-muted/20 px-3 py-1 rounded-full flex items-center gap-2"
            >
              <span>{symptom}</span>
              <button
                onClick={() => removeSymptom(index)}
                className="text-destructive hover:text-destructive"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={getDiagnosticSuggestions}
        disabled={isLoading || symptoms.length === 0}
        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary disabled:bg-primary/40 mb-4"
      >
        {isLoading ? 'Analyzing...' : 'Get Diagnostic Suggestions'}
      </button>

      {error && (
        <div className="text-destructive mb-4">{error}</div>
      )}

      {suggestions && (
        <div className="space-y-4">
          <h4 className="font-medium">Possible Diagnoses:</h4>
          {suggestions.possibleDiagnoses.map((diagnosis, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="font-medium">{diagnosis.diagnosis}</div>
              <div className="text-sm text-muted-foreground">
                Probability: {(diagnosis.probability * 100).toFixed(1)}%
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium">Supporting Evidence:</div>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {diagnosis.supportingEvidence.map((evidence, i) => (
                    <li key={i}>{evidence}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiagnosticAssistant; 