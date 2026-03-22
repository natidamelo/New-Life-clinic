import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface Medication {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
  unitPrice: number;
}

interface MultiMedicationPrescriptionHelperProps {
  patientId: string;
  patientName: string;
  doctorId: string;
  onPrescriptionCreated: () => void;
}

const MultiMedicationPrescriptionHelper: React.FC<MultiMedicationPrescriptionHelperProps> = ({
  patientId,
  patientName,
  doctorId,
  onPrescriptionCreated
}) => {
  const [medications, setMedications] = useState<Medication[]>([
    {
      medication: 'Ceftriaxone 1g',
      dosage: '1g',
      frequency: 'BID',
      duration: '7 days',
      route: 'IV',
      quantity: 14,
      unitPrice: 30
    },
    {
      medication: 'Paracetamol 500mg',
      dosage: '500mg',
      frequency: 'TID',
      duration: '5 days',
      route: 'Oral',
      quantity: 15,
      unitPrice: 5
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addMedication = () => {
    setMedications([...medications, {
      medication: '',
      dosage: '',
      frequency: '',
      duration: '',
      route: 'Oral',
      quantity: 1,
      unitPrice: 0
    }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string | number) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const calculateTotal = () => {
    return medications.reduce((total, med) => total + (med.quantity * med.unitPrice), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create prescription using the prescription API
      const prescriptionData = {
        patient: patientId,
        doctorId: doctorId,
        visitId: "000000000000000000000000", // placeholder
        medications: medications.map(med => ({
          medication: med.medication,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          route: med.route,
          quantity: med.quantity,
          unitPrice: med.unitPrice,
          price: med.unitPrice,
          notes: ''
        })),
        sendToNurse: true,
        notes: 'Multi-medication prescription requiring payment authorization'
      };

      console.log('Creating prescription with data:', prescriptionData);

      // Submit to the prescription endpoint that creates payment notifications
      const response = await api.post('/api/prescriptions', prescriptionData);

      if (response.data) {
        toast.success('✅ Multi-medication prescription created! Payment notification sent to reception.');
        onPrescriptionCreated();
      }
    } catch (error: any) {
      console.error('Error creating prescription:', error);
      toast.error(error.response?.data?.message || 'Failed to create prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-primary-foreground p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Create Multi-Medication Prescription</h3>
      
      <div className="mb-4 p-3 bg-primary/10 rounded">
        <p className="text-sm text-primary">
          <strong>Patient:</strong> {patientName} (ID: {patientId})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {medications.map((medication, index) => (
          <div key={index} className="border border-border/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Medication {index + 1}</h4>
              {medications.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMedication(index)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={medication.medication}
                  onChange={(e) => updateMedication(index, 'medication', e.target.value)}
                  className="w-full p-2 border border-border/40 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  value={medication.dosage}
                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                  className="w-full p-2 border border-border/40 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Frequency
                </label>
                <select
                  value={medication.frequency}
                  onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                  className="w-full p-2 border border-border/40 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Once daily">Once daily</option>
                  <option value="BID">BID (twice daily)</option>
                  <option value="TID">TID (three times daily)</option>
                  <option value="QID">QID (four times daily)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  value={medication.duration}
                  onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                  className="w-full p-2 border border-border/40 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 7 days"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Route
                </label>
                <select
                  value={medication.route}
                  onChange={(e) => updateMedication(index, 'route', e.target.value)}
                  className="w-full p-2 border border-border/40 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Oral">Oral</option>
                  <option value="IV">IV</option>
                  <option value="IM">IM</option>
                  <option value="Topical">Topical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={medication.quantity}
                  onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value))}
                  className="w-full p-2 border border-border/40 rounded focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Unit Price (ETB)
                </label>
                <input
                  type="number"
                  value={medication.unitPrice}
                  onChange={(e) => updateMedication(index, 'unitPrice', parseFloat(e.target.value))}
                  className="w-full p-2 border border-border/40 rounded focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Total Cost
                </label>
                <div className="p-2 bg-muted/10 rounded border">
                  ETB {(medication.quantity * medication.unitPrice).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addMedication}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary"
          >
            Add Another Medication
          </button>
          
          <div className="text-right">
            <div className="text-lg font-bold">
              Total: ETB {calculateTotal().toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              {medications.length} medication(s)
            </div>
          </div>
        </div>
        
        <div className="bg-accent/10 p-4 rounded border border-yellow-200">
          <h4 className="font-medium text-accent-foreground mb-2">What happens next:</h4>
          <ul className="text-sm text-accent-foreground space-y-1">
            <li>• Payment notification will be sent to reception</li>
            <li>• Patient must pay before medication can be dispensed</li>
            <li>• Multi-medication payment options will be available</li>
            <li>• Nurse tasks will be created after payment authorization</li>
          </ul>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground py-3 px-4 rounded font-medium hover:bg-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Creating Prescription...' : 'Create Multi-Medication Prescription'}
        </button>
      </form>
    </div>
  );
};

export default MultiMedicationPrescriptionHelper; 