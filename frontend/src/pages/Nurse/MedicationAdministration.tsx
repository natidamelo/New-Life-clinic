import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'react-hot-toast';
import patientService from '../../services/patientService';
import { Calendar, Clock, User, Beaker, CheckCircle } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  roomNumber?: string;
  medications?: Medication[];
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  nextDue?: string;
  prescribedBy: string;
}

const MedicationAdministration: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [administrationForm, setAdministrationForm] = useState({
    dosageGiven: '',
    route: '',
    administrationTime: new Date().toISOString().slice(0, 16),
    notes: '',
    administeredBy: 'Current Nurse'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await patientService.getPatients();
      const patientsWithMeds = (response.data as any).patients?.filter((p: Patient) => 
        p.medications && p.medications.length > 0
      ) || [];
      setPatients(patientsWithMeds);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const handleAdministerMedication = async () => {
    if (!selectedPatient || !selectedMedication) {
      toast.error('Please select patient and medication');
      return;
    }

    setIsSubmitting(true);
    try {
      // Here you would call your API to record the medication administration
      // For now, just show success message
      toast.success(`${selectedMedication.name} administered to ${selectedPatient.firstName} ${selectedPatient.lastName}`);
      
      // Reset form
      setAdministrationForm({
        dosageGiven: '',
        route: '',
        administrationTime: new Date().toISOString().slice(0, 16),
        notes: '',
        administeredBy: 'Current Nurse'
      });
      setSelectedPatient(null);
      setSelectedMedication(null);
      setIsDialogOpen(false);
      
    } catch (error) {
      console.error('Error administering medication:', error);
      toast.error('Failed to record medication administration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-muted-foreground">Medication Administration</h1>
          <p className="text-muted-foreground mt-1">Record medication administration for patients</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {patients.length} Patients with Medications
        </Badge>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                {patient.firstName} {patient.lastName}
              </CardTitle>
              {patient.roomNumber && (
                <p className="text-sm text-muted-foreground">Room: {patient.roomNumber}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Current Medications:</Label>
                {patient.medications?.map((med) => (
                  <div key={med.id} className="flex items-center justify-between p-2 bg-muted/10 rounded">
                    <div>
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-muted-foreground">{med.dosage} - {med.route}</p>
                      <p className="text-xs text-muted-foreground">Every {med.frequency}</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedPatient(patient);
                            setSelectedMedication(med);
                            setAdministrationForm(prev => ({
                              ...prev,
                              dosageGiven: med.dosage,
                              route: med.route
                            }));
                          }}
                          className="bg-primary hover:bg-primary"
                        >
                          <Beaker className="h-4 w-4 mr-1" />
                          Give
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Administration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Administer Medication</DialogTitle>
          </DialogHeader>
          
          {selectedPatient && selectedMedication && (
            <div className="space-y-6">
              {/* Patient & Medication Info */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Patient & Medication Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-primary">Patient:</Label>
                    <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    {selectedPatient.age && (
                      <p className="text-sm text-muted-foreground font-bold">
                        Age: {selectedPatient.age}y, Gender: {selectedPatient.gender || 'N/A'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-primary">Room:</Label>
                    <p className="font-medium">{selectedPatient.roomNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-primary">Medication:</Label>
                    <p className="font-medium">{selectedMedication.name}</p>
                  </div>
                  <div>
                    <Label className="text-primary">Prescribed Dose:</Label>
                    <p className="font-medium">{selectedMedication.dosage}</p>
                  </div>
                </div>
              </div>

              {/* Administration Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dosageGiven">Dosage Given *</Label>
                    <Input
                      id="dosageGiven"
                      value={administrationForm.dosageGiven}
                      onChange={(e) => setAdministrationForm(prev => ({...prev, dosageGiven: e.target.value}))}
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="route">Route *</Label>
                    <Select 
                      value={administrationForm.route} 
                      onValueChange={(value) => setAdministrationForm(prev => ({...prev, route: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="iv">Intravenous (IV)</SelectItem>
                        <SelectItem value="im">Intramuscular (IM)</SelectItem>
                        <SelectItem value="sc">Subcutaneous (SC)</SelectItem>
                        <SelectItem value="topical">Topical</SelectItem>
                        <SelectItem value="inhalation">Inhalation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="administrationTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Administration Time *
                  </Label>
                  <Input
                    id="administrationTime"
                    type="datetime-local"
                    value={administrationForm.administrationTime}
                    onChange={(e) => setAdministrationForm(prev => ({...prev, administrationTime: e.target.value}))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={administrationForm.notes}
                    onChange={(e) => setAdministrationForm(prev => ({...prev, notes: e.target.value}))}
                    placeholder="Any additional notes about the administration..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAdministerMedication}
                  disabled={isSubmitting || !administrationForm.dosageGiven || !administrationForm.route}
                  className="bg-primary hover:bg-primary"
                >
                  {isSubmitting ? (
                    'Recording...'
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Record Administration
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicationAdministration;