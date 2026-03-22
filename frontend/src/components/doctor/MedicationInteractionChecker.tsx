import React, { useState } from 'react';
import { MedicationInteraction } from '../../services/doctorService';
import doctorService from '../../services/doctorService';

interface MedicationInteractionCheckerProps {
  currentMedications: string[];
}

const MedicationInteractionChecker: React.FC<MedicationInteractionCheckerProps> = ({
  currentMedications
}) => {
  const [interactions, setInteractions] = useState<MedicationInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkInteractions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await doctorService.checkMedicationInteractions(currentMedications);
      setInteractions(data);
    } catch (err) {
      setError('Failed to check medication interactions');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-destructive/20 text-destructive';
      case 'medium':
        return 'bg-accent/20 text-accent-foreground';
      case 'low':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  return (
    <div className="bg-primary-foreground p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Medication Interaction Checker</h3>
      
      <div className="mb-4">
        <button
          onClick={checkInteractions}
          disabled={isLoading}
          className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary disabled:bg-primary/40"
        >
          {isLoading ? 'Checking...' : 'Check Interactions'}
        </button>
      </div>

      {error && (
        <div className="text-destructive mb-4">{error}</div>
      )}

      {interactions.length > 0 && (
        <div className="space-y-4">
          {interactions.map((interaction, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${getSeverityColor(interaction.severity)}`}
            >
              <div className="font-medium">
                {interaction.medication1} + {interaction.medication2}
              </div>
              <div className="mt-2">{interaction.description}</div>
              <div className="mt-2 text-sm">
                Severity: {interaction.severity.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && interactions.length === 0 && !error && (
        <div className="text-muted-foreground">
          No interactions found. Click the button above to check.
        </div>
      )}
    </div>
  );
};

export default MedicationInteractionChecker; 