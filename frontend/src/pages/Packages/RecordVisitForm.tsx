import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { 
  Activity, 
  User, 
  FlaskConical, 
  DollarSign, 
  Calendar, 
  ShieldAlert, 
  Plus, 
  X, 
  ArrowRightCircle, 
  CheckCircle2 
} from 'lucide-react';
import healthPackageService, { PatientPackage, PackageVisit } from '../../services/healthPackageService';
import userService from '../../services/userService';
import toast from 'react-hot-toast';

interface RecordVisitFormProps {
  patientPackage: PatientPackage;
  onComplete: () => void;
  onCancel: () => void;
}

const RecordVisitForm: React.FC<RecordVisitFormProps> = ({ patientPackage, onComplete, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSameDayDialog, setShowSameDayDialog] = useState<boolean>(false);

  // Staff lists
  const [doctors, setDoctors] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(true);

  // Core Form State
  const [needsVitals, setNeedsVitals] = useState<boolean>(true);
  const [needsConsultation, setNeedsConsultation] = useState<boolean>(false);
  const [needsLab, setNeedsLab] = useState<boolean>(false);

  // Lab Tests State
  const [labInput, setLabInput] = useState<string>('');
  const [labTests, setLabTests] = useState<string[]>([]);

  // Dispatch Assignment
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>('');
  const [assignedNurseId, setAssignedNurseId] = useState<string>('');

  // Payment State
  const [paymentCollected, setPaymentCollected] = useState<number>(0);

  // Scheduling State
  const [nextVisitDate, setNextVisitDate] = useState<string>('');
  const [nextVisitNotes, setNextVisitNotes] = useState<string>('');

  // Fetch doctors and nurses on mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const [docsData, nursesData] = await Promise.all([
          userService.getUsersByRole('doctor'),
          userService.getUsersByRole('nurse')
        ]);
        setDoctors(docsData || []);
        setNurses(nursesData || []);
      } catch (error) {
        console.error('Failed to load clinic staff:', error);
        toast.error('Failed to load doctor and nurse lists.');
      } finally {
        setIsLoadingStaff(false);
      }
    };
    fetchStaff();
  }, []);

  const handleAddLabTest = () => {
    if (labInput.trim() && !labTests.includes(labInput.trim())) {
      setLabTests([...labTests, labInput.trim()]);
      setLabInput('');
    }
  };

  const handleRemoveLabTest = (idx: number) => {
    setLabTests(labTests.filter((_, i) => i !== idx));
  };

  // Submit visit logging
  const handleFormSubmit = async (bypassSameDay: boolean = false) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        bypassSameDayWarning: bypassSameDay,
        lab_services_ordered: labTests,
        payment_collected: paymentCollected,
        needs_vitals: needsVitals,
        needs_consultation: needsConsultation,
        needs_lab: needsLab,
        assignedDoctorId: needsConsultation ? assignedDoctorId : undefined,
        assignedNurseId: needsVitals ? assignedNurseId : undefined,
        next_visit_due_date: nextVisitDate || undefined,
        next_visit_notes: nextVisitNotes || undefined
      };

      const response = await healthPackageService.recordVisit(patientPackage._id || patientPackage.id || '', payload);
      
      if (response.success) {
        toast.success('Patient checked-in and routed successfully!');
        onComplete();
      }
    } catch (error: any) {
      console.error('Failed to log package visit:', error);
      
      // Handle 409 conflict for same day visit warning
      if (error?.response?.status === 409 || error?.response?.data?.warning === 'same_day_visit') {
        setShowSameDayDialog(true);
      } else {
        const msg = error?.response?.data?.message || 'Failed to record package visit.';
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check routing dependencies
    if (needsVitals && !assignedNurseId) {
      toast.error('Please assign a nurse for vitals check.');
      return;
    }
    if (needsConsultation && !assignedDoctorId) {
      toast.error('Please assign a doctor for consultation.');
      return;
    }
    if (needsLab && labTests.length === 0) {
      toast.error('Please add at least one lab service test to route to Lab.');
      return;
    }
    if (paymentCollected > patientPackage.balance_due) {
      toast.error(`Payment cannot exceed the balance due of ${patientPackage.balance_due} ETB.`);
      return;
    }

    handleFormSubmit(false);
  };

  return (
    <Card className="border-primary/10 rounded-2xl shadow-lg relative overflow-hidden bg-card/90">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
      
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-5.5 h-5.5 text-emerald-500 animate-pulse" />
          Log Package Visit (Check-in)
        </CardTitle>
        <CardDescription className="text-xs">
          Patient: <strong className="text-foreground">{(patientPackage.patient_id as any)?.firstName} {(patientPackage.patient_id as any)?.lastName}</strong> | 
          Package: <strong className="text-foreground">{(patientPackage.package_id as any)?.name}</strong> (Visit #{patientPackage.visits_used + 1})
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={validateAndSubmit} className="space-y-6 text-left">
          
          {/* Step 1: Routing Stations Selection */}
          <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase text-indigo-900 dark:text-indigo-200 tracking-wider flex items-center gap-1.5">
              <ArrowRightCircle className="w-4 h-4 text-indigo-500" />
              1. Where does the patient need to go?
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              
              <div className="flex items-center space-x-2.5 bg-background border border-border/80 px-3.5 py-3 rounded-lg hover:border-indigo-500/20 transition-colors">
                <input 
                  type="checkbox"
                  id="route-nurse" 
                  checked={needsVitals} 
                  onChange={(e) => setNeedsVitals(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="route-nurse" className="text-xs font-semibold text-foreground cursor-pointer flex-1 pl-2">
                  Nurse (Vitals Signs)
                </label>
              </div>

              <div className="flex items-center space-x-2.5 bg-background border border-border/80 px-3.5 py-3 rounded-lg hover:border-indigo-500/20 transition-colors">
                <input 
                  type="checkbox"
                  id="route-doc" 
                  checked={needsConsultation} 
                  onChange={(e) => setNeedsConsultation(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="route-doc" className="text-xs font-semibold text-foreground cursor-pointer flex-1 pl-2">
                  Doctor (Consultation)
                </label>
              </div>

              <div className="flex items-center space-x-2.5 bg-background border border-border/80 px-3.5 py-3 rounded-lg hover:border-indigo-500/20 transition-colors">
                <input 
                  type="checkbox"
                  id="route-lab" 
                  checked={needsLab} 
                  onChange={(e) => setNeedsLab(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="route-lab" className="text-xs font-semibold text-foreground cursor-pointer flex-1 pl-2">
                  Laboratory (Lab Order)
                </label>
              </div>

            </div>
          </div>

          {/* Step 2: Lab Orders (Optional at reception, if Lab is checked) */}
          <div className="space-y-4">
            {needsLab && (
              <div className="p-4 border border-purple-500/20 rounded-xl space-y-3 bg-purple-500/5">
                <div className="flex items-center gap-1.5 border-b border-purple-500/10 pb-2">
                  <FlaskConical className="w-4 h-4 text-purple-500" />
                  <h5 className="text-xs font-bold text-foreground/90">Laboratory Orders</h5>
                </div>
                
                {/* Lab tests list tag editor */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-muted-foreground">Select Lab Service Tests for Patient</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type test name (e.g. HbA1c, CBC, FBS) and click Add" 
                      value={labInput} 
                      onChange={(e) => setLabInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabTest())} 
                    />
                    <Button type="button" variant="secondary" onClick={handleAddLabTest}>Add</Button>
                  </div>
                  {labTests.length > 0 ? (
                    <div className="flex flex-wrap gap-1 border border-border/50 p-2 rounded-lg bg-background">
                      {labTests.map((test, idx) => (
                        <Badge key={idx} variant="outline" className="flex items-center gap-1 border-purple-500/30 text-purple-600">
                          {test}
                          <button type="button" onClick={() => handleRemoveLabTest(idx)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-purple-600 flex items-center gap-1 mt-1 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Must list at least one laboratory service test to queue in Lab Dashboard.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Staff Assignment Dropdowns */}
          {(needsVitals || needsConsultation) && (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <h4 className="text-xs font-bold uppercase text-foreground/80 tracking-wider">
                2. Dispatch & Staff Assignment
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needsVitals && (
                  <div className="space-y-1">
                    <Label htmlFor="nurse-select" className="text-[11px] font-bold text-muted-foreground">Assign Nurse (Vitals signs)</Label>
                    {isLoadingStaff ? (
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    ) : (
                      <Select value={assignedNurseId} onValueChange={setAssignedNurseId}>
                        <SelectTrigger id="nurse-select">
                          <SelectValue placeholder="Choose nurse..." />
                        </SelectTrigger>
                        <SelectContent>
                          {nurses.map((n) => (
                            <SelectItem key={n._id || n.id} value={n._id || n.id || ''}>
                              {n.firstName} {n.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {needsConsultation && (
                  <div className="space-y-1">
                    <Label htmlFor="doc-select" className="text-[11px] font-bold text-muted-foreground">Assign Doctor (Consultation)</Label>
                    {isLoadingStaff ? (
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    ) : (
                      <Select value={assignedDoctorId} onValueChange={setAssignedDoctorId}>
                        <SelectTrigger id="doc-select">
                          <SelectValue placeholder="Choose doctor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((d) => (
                            <SelectItem key={d._id || d.id} value={d._id || d.id || ''}>
                              {d.firstName} {d.lastName} {d.specialty ? `(${d.specialty})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Payments & Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/40 pt-5">
            {/* Installment Payment */}
            <div className="space-y-2">
              <Label htmlFor="payment" className="text-xs font-bold text-foreground/80 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Installment Payment Collected (ETB)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">ETB</span>
                <Input 
                  id="payment" 
                  type="number" 
                  min={0} 
                  max={patientPackage.balance_due}
                  className="pl-12"
                  value={paymentCollected} 
                  onChange={(e) => setPaymentCollected(parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div className="bg-muted/40 p-2.5 rounded-lg text-[10px] text-muted-foreground flex justify-between font-semibold border border-border/30">
                <span>Remaining Balance Due:</span>
                <span className="text-foreground">{(patientPackage.balance_due - paymentCollected).toLocaleString()} ETB</span>
              </div>
            </div>

            {/* Next Checkup scheduling */}
            <div className="space-y-2">
              <Label htmlFor="next-date" className="text-xs font-bold text-foreground/80 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Schedule Next Package Checkup Date
              </Label>
              <Input 
                id="next-date" 
                type="date" 
                value={nextVisitDate} 
                onChange={(e) => setNextVisitDate(e.target.value)} 
              />
              <Input 
                placeholder="Next visit notes/instructions..." 
                value={nextVisitNotes} 
                onChange={(e) => setNextVisitNotes(e.target.value)} 
                className="text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border/40 pt-5">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? 'Logging Check-in...' : 'Record & Consume Visit'}
            </Button>
          </div>

        </form>
      </CardContent>

      {/* Same-day Bypass Warning Dialog */}
      {showSameDayDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="max-w-md w-full border-red-500/20 shadow-2xl relative overflow-hidden bg-background">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-1.5 text-red-600">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                Same-Day Visit Warning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                A visit has already been logged for this package subscription today. 
                According to clinical package rules, patients are restricted to a maximum of one package check-in per day.
              </p>
              <p className="text-xs font-bold text-foreground">
                Do you wish to bypass this rule and record another visit anyway?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowSameDayDialog(false);
                    setIsSubmitting(false);
                  }}
                >
                  Cancel Check-in
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white" 
                  size="sm"
                  onClick={() => {
                    setShowSameDayDialog(false);
                    handleFormSubmit(true); // Bypass Same Day Warning
                  }}
                >
                  Yes, Bypass Warning
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </Card>
  );
};

export default RecordVisitForm;
