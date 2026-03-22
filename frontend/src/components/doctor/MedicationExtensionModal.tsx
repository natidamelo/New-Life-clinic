import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface MedicationExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  prescriptionId: string;
  onExtensionComplete: () => void;
}

interface ExtensionEligibility {
  eligible: boolean;
  reason?: string;
  currentDays?: number;
  paymentStatus?: string;
  outstandingAmount?: number;
  activeTasks?: number;
}

const MedicationExtensionModal: React.FC<MedicationExtensionModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  prescriptionId,
  onExtensionComplete
}) => {
  const [selectedMedication, setSelectedMedication] = useState<string>('');
  const [additionalDays, setAdditionalDays] = useState<number>(1);
  const [medications, setMedications] = useState<string[]>([]);
  const [eligibility, setEligibility] = useState<ExtensionEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState(false);

  // Load patient's medications when modal opens
  useEffect(() => {
    if (isOpen && patientId) {
      loadPatientMedications();
    }
  }, [isOpen, patientId]);

  // Check eligibility when medication is selected
  useEffect(() => {
    if (selectedMedication && patientId) {
      checkExtensionEligibility();
    }
  }, [selectedMedication, patientId]);

  const loadPatientMedications = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/prescriptions/patient/${patientId}`);
      
      if (response.data.success) {
        const prescriptions = response.data.data;
        const uniqueMedications = [...new Set(
          prescriptions
            .filter((prescription: any) => prescription.medications && prescription.medications.length > 0)
            .flatMap((prescription: any) => 
              prescription.medications.map((med: any) => med.medication || med.name)
            )
        )];
        
        setMedications(uniqueMedications as string[]);
      }
    } catch (error) {
      console.error('Error loading patient medications:', error);
      toast.error('Failed to load patient medications');
    } finally {
      setLoading(false);
    }
  };

  const checkExtensionEligibility = async () => {
    try {
      const response = await api.get(`/api/prescriptions/extension-eligibility/${patientId}/${selectedMedication}`);
      
      if (response.data.success) {
        setEligibility(response.data.data);
      }
    } catch (error) {
      console.error('Error checking extension eligibility:', error);
      setEligibility({ eligible: false, reason: 'Error checking eligibility' });
    }
  };

  const handleExtendMedication = async () => {
    if (!selectedMedication || additionalDays <= 0) {
      toast.error('Please select a medication and specify additional days');
      return;
    }

    try {
      setExtending(true);
      
      const response = await api.post(`/api/prescriptions/extend/${prescriptionId}`, {
        medicationName: selectedMedication,
        additionalDays: additionalDays
      });

      if (response.data.success) {
        const result = response.data.data;
        
        toast.success(`Medication extended successfully! Added ${additionalDays} days. Total: ${result.newTotalDays} days.`);
        
        // Show payment information if there's outstanding amount
        if (result.outstandingAmount > 0) {
          toast.success(`Outstanding amount: ETB ${result.outstandingAmount.toFixed(2)}`);
        }
        
        onExtensionComplete();
        onClose();
      }
    } catch (error: any) {
      console.error('Error extending medication:', error);
      const errorMessage = error.response?.data?.message || 'Failed to extend medication';
      toast.error(errorMessage);
    } finally {
      setExtending(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'fully_paid':
      case 'paid':
        return 'bg-primary/20 text-primary';
      case 'partially_paid':
      case 'partial':
        return 'bg-accent/20 text-accent-foreground';
      case 'unpaid':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'fully_paid':
      case 'paid':
        return 'Fully Paid';
      case 'partially_paid':
      case 'partial':
        return 'Partially Paid';
      case 'unpaid':
        return 'Unpaid';
      default:
        return 'Unknown';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Extend Medication Prescription</span>
            <Badge variant="outline">{patientName}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Medication Selection */}
          <div>
            <Label htmlFor="medication">Select Medication to Extend</Label>
            <Select value={selectedMedication} onValueChange={setSelectedMedication}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a medication" />
              </SelectTrigger>
              <SelectContent>
                {medications.map((medication) => (
                  <SelectItem key={medication} value={medication}>
                    {medication}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Days */}
          <div>
            <Label htmlFor="additionalDays">Additional Days</Label>
            <Select value={additionalDays.toString()} onValueChange={(value) => setAdditionalDays(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((days) => (
                  <SelectItem key={days} value={days.toString()}>
                    {days} {days === 1 ? 'day' : 'days'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Eligibility Status */}
          {selectedMedication && eligibility && (
            <div>
              {eligibility.eligible ? (
                <Alert className="border-primary/30 bg-primary/10">
                  <AlertDescription className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">✅ Extension Eligible</span>
                      <Badge className={getPaymentStatusColor(eligibility.paymentStatus || '')}>
                        {getPaymentStatusLabel(eligibility.paymentStatus || '')}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div>Current Duration: <strong>{eligibility.currentDays} days</strong></div>
                      <div>New Duration: <strong>{eligibility.currentDays! + additionalDays} days</strong></div>
                      {eligibility.outstandingAmount && eligibility.outstandingAmount > 0 && (
                        <div className="text-accent-foreground">
                          Outstanding Amount: <strong>ETB {eligibility.outstandingAmount.toFixed(2)}</strong>
                        </div>
                      )}
                      <div>Active Tasks: <strong>{eligibility.activeTasks}</strong></div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-destructive/30 bg-destructive/10">
                  <AlertDescription>
                    ❌ Cannot extend medication: <strong>{eligibility.reason}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Extension Summary */}
          {selectedMedication && eligibility?.eligible && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <h4 className="font-medium text-primary mb-2">Extension Summary</h4>
              <div className="text-sm text-primary space-y-1">
                <div>Medication: <strong>{selectedMedication}</strong></div>
                <div>Current: <strong>{eligibility.currentDays} days</strong></div>
                <div>Adding: <strong>{additionalDays} days</strong></div>
                <div>New Total: <strong>{eligibility.currentDays! + additionalDays} days</strong></div>
                {eligibility.outstandingAmount && eligibility.outstandingAmount > 0 && (
                  <div className="text-accent-foreground">
                    Additional Payment Required: <strong>ETB {eligibility.outstandingAmount.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={extending}>
            Cancel
          </Button>
          <Button 
            onClick={handleExtendMedication}
            disabled={!selectedMedication || !eligibility?.eligible || extending}
            className="bg-primary hover:bg-primary"
          >
            {extending ? 'Extending...' : 'Extend Medication'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MedicationExtensionModal;


