import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Bed, Heart, DollarSign, LogOut, RefreshCw, Stethoscope, Pill, Users, FileText, Copy, Printer, CheckCircle, Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ipdService, IPDAdmission, IPDPatient } from '../../services/ipdService';
import patientService from '../../services/patientService';
import prescriptionService from '../../services/prescriptionService';
import vitalSignsService from '../../services/vitalSignsService';
import nurseTaskService from '../../services/nurseTaskService';
import api from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useToast } from '../../components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const IPDManagement: React.FC = () => {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const isDoctorOrAdmin = user?.role === 'doctor' || user?.role === 'admin';
  const isNurse = user?.role === 'nurse';
  const { toast } = useToast();
  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
  const [patients, setPatients] = useState<IPDPatient[]>([]);
  const [allPatients, setAllPatients] = useState<{ _id: string; firstName: string; lastName: string; patientId?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState<string | null>(null);
  const [bedChargeOpen, setBedChargeOpen] = useState<string | null>(null);
  const [vitalsOrdered, setVitalsOrdered] = useState<Set<string>>(new Set());

  // Admit form
  const [admitPatientId, setAdmitPatientId] = useState('');
  const [admitWard, setAdmitWard] = useState('General Ward');
  const [admitRoom, setAdmitRoom] = useState('');
  const [admitBed, setAdmitBed] = useState('');
  const [admitNotes, setAdmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Discharge
  const [dischargeNotes, setDischargeNotes] = useState('');

  // Bed charge
  const [bedDays, setBedDays] = useState(1);
  const [bedUnitPrice, setBedUnitPrice] = useState('');
  const [bedDescription, setBedDescription] = useState('');

  // Nurse report: detailed medications + vitals + report to doctor
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAdmissionId, setReportAdmissionId] = useState<string | null>(null);
  const [reportPatientId, setReportPatientId] = useState<string | null>(null);
  const [reportPatientName, setReportPatientName] = useState('');
  const [reportWardInfo, setReportWardInfo] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    prescriptions: any[];
    vitalsHistory: any[];
    nurseTasks: any[];
  }>({ prescriptions: [], vitalsHistory: [], nurseTasks: [] });
  const [reportCopied, setReportCopied] = useState(false);
  const [reportNursingNotes, setReportNursingNotes] = useState('');

  // Doctor: view nurse reports sent for an admission
  const [nurseReportsOpen, setNurseReportsOpen] = useState(false);
  const [nurseReportsAdmissionId, setNurseReportsAdmissionId] = useState<string | null>(null);
  const [nurseReportsPatientName, setNurseReportsPatientName] = useState('');
  const [nurseReportsList, setNurseReportsList] = useState<any[]>([]);
  const [nurseReportsLoading, setNurseReportsLoading] = useState(false);
  const [nurseReportSelected, setNurseReportSelected] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [admRes, patRes] = await Promise.all([
        ipdService.getAdmissions('active'),
        ipdService.getPatients(),
      ]);
      setAdmissions(admRes);
      setPatients(patRes);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load IPD data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadPatientsForAdmit = async () => {
    try {
      const res = await patientService.getPatients(1, 500);
      const list = (res as any)?.patients ?? (res as any)?.data ?? (Array.isArray(res) ? res : []);
      setAllPatients((Array.isArray(list) ? list : []).map((p: any) => ({
        _id: p._id || p.id,
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        patientId: p.patientId,
      })));
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load patients', variant: 'destructive' });
    }
  };

  const handleOpenAdmit = () => {
    setAdmitPatientId('');
    setAdmitRoom('');
    setAdmitBed('');
    setAdmitNotes('');
    setAdmitWard('General Ward');
    loadPatientsForAdmit();
    setAdmitOpen(true);
  };

  const handleAdmit = async () => {
    if (!admitPatientId || !admitRoom.trim() || !admitBed.trim()) {
      toast({ title: 'Validation', description: 'Please select patient and enter room and bed number', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await ipdService.admitPatient({
        patientId: admitPatientId,
        wardName: admitWard,
        roomNumber: admitRoom.trim(),
        bedNumber: admitBed.trim(),
        admissionNotes: admitNotes.trim() || undefined,
      });
      toast({ title: 'Success', description: 'Patient admitted to IPD' });
      setAdmitOpen(false);
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed to admit patient', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async () => {
    if (!dischargeOpen) return;
    setSubmitting(true);
    try {
      await ipdService.dischargeAdmission(dischargeOpen, dischargeNotes);
      toast({ title: 'Success', description: 'Patient discharged' });
      setDischargeOpen(null);
      setDischargeNotes('');
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed to discharge', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBedCharge = async () => {
    if (!bedChargeOpen) return;
    const price = parseFloat(bedUnitPrice);
    if (!(bedDays >= 1 && price > 0)) {
      toast({ title: 'Validation', description: 'Days must be ≥ 1 and unit price > 0', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await ipdService.addBedCharge(bedChargeOpen, bedDays, price, bedDescription.trim() || undefined);
      toast({ title: 'Success', description: 'Bed charge added to invoice' });
      setBedChargeOpen(null);
      setBedDays(1);
      setBedUnitPrice('');
      setBedDescription('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed to add bed charge', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderVitals = async (admissionId: string) => {
    try {
      await ipdService.orderVitals(admissionId);
      setVitalsOrdered(prev => new Set(prev).add(admissionId));
      toast({ title: 'Success', description: 'Vitals order sent to nurse' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed to order vitals', variant: 'destructive' });
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return d;
    }
  };

  const openReport = async (adm: IPDAdmission) => {
    const pid = typeof adm.patientId === 'object' && adm.patientId ? (adm.patientId as any)._id : adm.patientId;
    if (!pid) return;
    setReportAdmissionId(adm._id);
    setReportPatientId(pid);
    setReportPatientName(adm.patientName);
    setReportWardInfo(`${adm.wardName} · Room ${adm.roomNumber} · Bed ${adm.bedNumber}`);
    setReportNursingNotes('');
    setReportOpen(true);
    setReportLoading(true);
    setReportData({ prescriptions: [], vitalsHistory: [], nurseTasks: [] });
    try {
      const token = getToken() || '';
      const [prescriptions, historyRes, nurseTasks] = await Promise.all([
        prescriptionService.getPrescriptionsByPatient(pid),
        api.get(`/api/vital-signs/patient/${pid}/history?limit=50`).then((r: any) => r.data?.data?.vitalSignsHistory || []).catch(() => []),
        nurseTaskService.getPatientNurseTasks(pid, token),
      ]);
      setReportData({
        prescriptions: prescriptions || [],
        vitalsHistory: Array.isArray(historyRes) ? historyRes : [],
        nurseTasks: nurseTasks || [],
      });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
    } finally {
      setReportLoading(false);
    }
  };

  const buildReportToDoctorText = () => {
    const lines: string[] = [
      `IPD NURSING REPORT — ${reportPatientName}`,
      `Ward: ${reportWardInfo}`,
      `Report date: ${new Date().toLocaleString()}`,
      '',
      '——— MEDICATIONS ———',
    ];
    reportData.prescriptions.forEach((p: any) => {
      const meds = p.medications || [];
      meds.forEach((m: any) => {
        const task = reportData.nurseTasks.find((t: any) => t.taskType === 'MEDICATION' && (t.medicationDetails?.medicationName === (m.medication || m.name) || (t.description && String(t.description).includes(m.medication || m.name))));
        const status = task?.status === 'COMPLETED' ? 'Given' : 'Pending';
        const route = (m.route || 'Oral').trim();
        const duration = (m.duration || '').trim();
        const detail = [m.medication || m.name, m.dosage ? `${m.dosage}` : '', route !== 'Oral' ? route : ''].filter(Boolean).join(' ');
        const freqDur = [m.frequency, duration ? `for ${duration}` : ''].filter(Boolean).join(', ');
        lines.push(`• ${detail}${freqDur ? ` — ${freqDur}` : ''} — ${status}`);
      });
    });
    if (reportData.prescriptions.length === 0) lines.push('No prescribed medications on file.');
    lines.push('', '——— VITALS HISTORY ———');
    reportData.vitalsHistory.slice(0, 15).forEach((v: any) => {
      const date = v.measurementDate ? new Date(v.measurementDate).toLocaleString() : '';
      const parts = [];
      if (v.systolic != null && v.diastolic != null) parts.push(`BP ${v.systolic}/${v.diastolic}`);
      if (v.temperature != null) parts.push(`Temp ${v.temperature}°C`);
      if (v.pulse != null) parts.push(`Pulse ${v.pulse}`);
      if (v.weight != null) parts.push(`Weight ${v.weight} kg`);
      if (v.height != null) parts.push(`Height ${v.height} cm`);
      if (v.spo2 != null) parts.push(`SpO2 ${v.spo2}%`);
      if (v.respiratoryRate != null) parts.push(`RR ${v.respiratoryRate}`);
      if (v.bloodSugar != null) parts.push(`Blood sugar ${v.bloodSugar}`);
      if (v.pain != null) parts.push(`Pain ${v.pain}/10`);
      if (v.measuredByName) parts.push(`by ${v.measuredByName}`);
      lines.push(`${date}: ${parts.join(' · ')}`);
    });
    if (reportData.vitalsHistory.length === 0) lines.push('No vitals recorded yet.');
    if (reportNursingNotes.trim()) {
      lines.push('', '——— NURSING NOTES / REPORT TO DOCTOR ———', reportNursingNotes.trim(), '');
    }
    lines.push('——— END OF REPORT ———');
    return lines.join('\n');
  };

  const handleCopyReport = () => {
    const text = buildReportToDoctorText();
    navigator.clipboard.writeText(text).then(() => {
      setReportCopied(true);
      toast({ title: 'Copied', description: 'Report copied to clipboard for handoff to doctor.' });
      setTimeout(() => setReportCopied(false), 2000);
    });
  };

  const handleSendReportToDoctor = async () => {
    if (!reportAdmissionId) {
      toast({ title: 'Error', description: 'Admission not found.', variant: 'destructive' });
      return;
    }
    const text = buildReportToDoctorText();
    setReportSending(true);
    try {
      await ipdService.sendReportToDoctor(reportAdmissionId, text);
      toast({ title: 'Report sent', description: 'Nursing report has been sent to the attending doctor.' });
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e?.response?.data?.message || 'Could not send report to doctor.', variant: 'destructive' });
    } finally {
      setReportSending(false);
    }
  };

  const handlePrintReport = () => {
    const printContent = document.getElementById('nurse-report-content');
    if (!printContent) return;
    const notesEscaped = String(reportNursingNotes).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const notesHtml = reportNursingNotes.trim()
      ? `<div class="section"><h3>Nursing notes / Report to doctor</h3><p>${notesEscaped}</p></div>`
      : '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>IPD Report - ${reportPatientName}</title>
      <style>body{font-family:system-ui;padding:20px;max-width:900px;margin:0 auto;} h2{margin-top:0;} .section{margin:16px 0;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px;} th{background:#f5f5f5;}</style>
      </head><body>${printContent.innerHTML}${notesHtml}</body></html>`);
    win.document.close();
    win.print();
    win.close();
  };

  const openNurseReports = async (adm: IPDAdmission) => {
    setNurseReportsPatientName(adm.patientName);
    setNurseReportsAdmissionId(adm._id);
    setNurseReportsOpen(true);
    setNurseReportsList([]);
    setNurseReportSelected(null);
    setNurseReportsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: any[] }>('/api/notifications?type=ipd_nurse_report&limit=50');
      const list = res.data?.data || [];
      const forThisAdmission = list.filter((n: any) => n.data?.admissionId?.toString() === adm._id);
      setNurseReportsList(forThisAdmission);
      if (forThisAdmission.length === 1) setNurseReportSelected(forThisAdmission[0]);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load nurse reports', variant: 'destructive' });
    } finally {
      setNurseReportsLoading(false);
    }
  };

  const patientName = (p: { firstName?: string; lastName?: string; patientName?: string }) =>
    p.patientName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown';

  return (
    <div className="min-h-screen bg-slate-50/50 p-5 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">IPD Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isDoctorOrAdmin
                ? 'Admit patients, order medications & vitals, add bed charges.'
                : 'View admitted patients. Record vitals and administer prescribed medications — saved and visible to the doctor.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isDoctorOrAdmin && (
              <Button size="sm" onClick={handleOpenAdmit}>
                <UserPlus className="h-4 w-4 mr-1" />
                Admit Patient
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="admitted">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="admitted">
              <Users className="h-4 w-4 mr-2" />
              Admitted ({admissions.length})
            </TabsTrigger>
            <TabsTrigger value="info">Workflow</TabsTrigger>
          </TabsList>
          <TabsContent value="admitted" className="mt-4">
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : admissions.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                <Bed className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p>{isDoctorOrAdmin ? 'No patients currently admitted. Click "Admit Patient" to add one.' : 'No patients currently admitted.'}</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {admissions.map((adm) => {
                  const pid = typeof adm.patientId === 'object' && adm.patientId ? (adm.patientId as any)._id : adm.patientId;
                  return (
                    <Card key={adm._id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{adm.patientName}</p>
                          <p className="text-sm text-slate-500">
                            {adm.wardName} · Room {adm.roomNumber} · Bed {adm.bedNumber}
                          </p>
                          <p className="text-xs text-slate-400">
                            Admitted {formatDate(adm.admitDate)} by {adm.admittingDoctorName || 'Doctor'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isDoctorOrAdmin ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openNurseReports(adm)}>
                                <FileText className="h-4 w-4 mr-1" />
                                Nurse report
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOrderVitals(adm._id)}
                                disabled={vitalsOrdered.has(adm._id)}
                              >
                                <Stethoscope className="h-4 w-4 mr-1" />
                                {vitalsOrdered.has(adm._id) ? 'Ordered' : 'Order Vitals'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => navigate('/app/doctor', { state: { openPrescriptionForPatientId: pid } })}>
                                <Pill className="h-4 w-4 mr-1" />
                                Prescribe
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { setBedChargeOpen(adm._id); setBedDays(1); setBedUnitPrice(''); setBedDescription(''); }}>
                                <DollarSign className="h-4 w-4 mr-1" />
                                Bed Charge
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => { setDischargeOpen(adm._id); setDischargeNotes(''); }}>
                                <LogOut className="h-4 w-4 mr-1" />
                                Discharge
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/app/ward/vitals${pid ? `?patientId=${encodeURIComponent(pid)}` : ''}`)}
                              >
                                <Stethoscope className="h-4 w-4 mr-1" />
                                Record Vitals
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => navigate(`/app/ward/medications-backup${pid ? `?patientId=${encodeURIComponent(pid)}` : ''}`)}>
                                <Pill className="h-4 w-4 mr-1" />
                                Administer Meds
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openReport(adm)}>
                                <FileText className="h-4 w-4 mr-1" />
                                View report
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="info" className="mt-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">IPD workflow</h3>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li><strong>Doctor:</strong> Admit patient (ward/room/bed) → Prescribe medications → Order vitals/ward tasks.</li>
                <li><strong>Nurse:</strong> Sees admitted patients and tasks on Ward / Nurse Station; records vitals, administers meds, completes procedures; results visible to doctor.</li>
                <li><strong>Billing:</strong> Add bed charge (per day) here; medications and procedures are billed via existing prescription and procedure flows.</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Admit dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admit patient to IPD</DialogTitle>
            <DialogDescription>Set ward, room and bed. Patient status will be set to Admitted.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Patient</Label>
              <Select value={admitPatientId} onValueChange={setAdmitPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {allPatients.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.firstName} {p.lastName} {p.patientId ? `(${p.patientId})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ward name</Label>
              <Input value={admitWard} onChange={(e) => setAdmitWard(e.target.value)} placeholder="General Ward" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Room number</Label>
                <Input value={admitRoom} onChange={(e) => setAdmitRoom(e.target.value)} placeholder="e.g. 101" />
              </div>
              <div>
                <Label>Bed number</Label>
                <Input value={admitBed} onChange={(e) => setAdmitBed(e.target.value)} placeholder="e.g. 1" />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={admitNotes} onChange={(e) => setAdmitNotes(e.target.value)} placeholder="Admission notes" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitOpen(false)}>Cancel</Button>
            <Button onClick={handleAdmit} disabled={submitting}>{submitting ? 'Saving...' : 'Admit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discharge dialog */}
      <Dialog open={!!dischargeOpen} onOpenChange={() => setDischargeOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discharge patient</DialogTitle>
            <DialogDescription>Patient will be marked Discharged and bed freed.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Discharge notes (optional)</Label>
            <Textarea value={dischargeNotes} onChange={(e) => setDischargeNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeOpen(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDischarge} disabled={submitting}>{submitting ? 'Discharging...' : 'Discharge'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bed charge dialog */}
      <Dialog open={!!bedChargeOpen} onOpenChange={() => setBedChargeOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add bed charge</DialogTitle>
            <DialogDescription>Add per-day bed charge to the patient&apos;s IPD invoice.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Number of days</Label>
              <Input type="number" min={1} value={bedDays} onChange={(e) => setBedDays(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div>
              <Label>Price per day (e.g. ETB)</Label>
              <Input type="number" min={0} step={0.01} value={bedUnitPrice} onChange={(e) => setBedUnitPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={bedDescription} onChange={(e) => setBedDescription(e.target.value)} placeholder="Bed charge" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBedChargeOpen(null)}>Cancel</Button>
            <Button onClick={handleAddBedCharge} disabled={submitting}>{submitting ? 'Adding...' : 'Add charge'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nurse report to doctor */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              IPD nursing report — Report to doctor
            </DialogTitle>
            <DialogDescription>
              Summary of medications and vitals for handoff. Copy or print to share with the attending doctor.
            </DialogDescription>
          </DialogHeader>
          {reportLoading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground">
              Loading report data…
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div id="nurse-report-content" className="space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-800 border-b pb-1">Patient &amp; location</h3>
                  <p className="text-sm text-slate-700 mt-1">{reportPatientName}</p>
                  <p className="text-sm text-slate-600">{reportWardInfo}</p>
                  <p className="text-xs text-slate-500 mt-1">Report generated: {new Date().toLocaleString()}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 border-b pb-1 flex items-center gap-2">
                    <Pill className="h-4 w-4" /> Medications
                  </h3>
                  {reportData.prescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">No prescribed medications on file.</p>
                  ) : (
                    <ul className="mt-2 space-y-3">
                      {reportData.prescriptions.flatMap((p: any) => (p.medications || []).map((m: any, idx: number) => {
                        const task = reportData.nurseTasks.find((t: any) => t.taskType === 'MEDICATION' && (t.medicationDetails?.medicationName === (m.medication || m.name) || (t.description && String(t.description).includes(m.medication || m.name))));
                        const given = task?.status === 'COMPLETED';
                        const route = (m.route || 'Oral').trim();
                        const duration = (m.duration || '').trim();
                        const parts = [m.medication || m.name, m.dosage].filter(Boolean);
                        if (route && route !== 'Oral') parts.push(route);
                        const main = parts.join(' ');
                        const freqDur = [m.frequency, duration ? `for ${duration}` : ''].filter(Boolean).join(', ');
                        return (
                          <li key={`${p._id}-${idx}`} className="flex items-start justify-between gap-2 text-sm py-2 border-b border-slate-100 last:border-0">
                            <div>
                              <span className="font-medium">{main}</span>
                              {freqDur && <span className="text-slate-600"> — {freqDur}</span>}
                            </div>
                            {given ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" /> : <span className="text-amber-600 shrink-0">Pending</span>}
                          </li>
                        );
                      }))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 border-b pb-1 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" /> Vitals history
                  </h3>
                  {reportData.vitalsHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">No vitals recorded yet.</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left p-2 whitespace-nowrap">Date / time</th>
                            <th className="text-left p-2">BP</th>
                            <th className="text-left p-2">Temp</th>
                            <th className="text-left p-2">Pulse</th>
                            <th className="text-left p-2">Weight</th>
                            <th className="text-left p-2">Height</th>
                            <th className="text-left p-2">SpO2</th>
                            <th className="text-left p-2">RR</th>
                            <th className="text-left p-2">BS</th>
                            <th className="text-left p-2">Pain</th>
                            <th className="text-left p-2">Recorded by</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.vitalsHistory.slice(0, 20).map((v: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="p-2 whitespace-nowrap">{v.measurementDate ? new Date(v.measurementDate).toLocaleString() : '—'}</td>
                              <td className="p-2">{v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '—'}</td>
                              <td className="p-2">{v.temperature != null ? `${v.temperature}°C` : '—'}</td>
                              <td className="p-2">{v.pulse ?? '—'}</td>
                              <td className="p-2">{v.weight != null ? `${v.weight} kg` : '—'}</td>
                              <td className="p-2">{v.height != null ? `${v.height} cm` : '—'}</td>
                              <td className="p-2">{v.spo2 != null ? `${v.spo2}%` : '—'}</td>
                              <td className="p-2">{v.respiratoryRate ?? '—'}</td>
                              <td className="p-2">{v.bloodSugar != null ? v.bloodSugar : '—'}</td>
                              <td className="p-2">{v.pain != null ? `${v.pain}/10` : '—'}</td>
                              <td className="p-2">{v.measuredByName || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 border-b pb-1">Write report to doctor</h3>
                  <p className="text-sm text-slate-600 mt-2">Add your nursing notes or handoff summary below. This will be included when you copy or print the report.</p>
                  <Textarea
                    className="mt-2 min-h-[100px] resize-y"
                    placeholder="e.g. Patient stable. Vitals within normal limits. Diclofenac 75mg IM given as ordered for 3 days. No complaints. Will continue to monitor."
                    value={reportNursingNotes}
                    onChange={(e) => setReportNursingNotes(e.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={handleSendReportToDoctor}
                      disabled={reportSending || !reportAdmissionId}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {reportSending ? 'Sending…' : 'Send report to doctor'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyReport}>
                      {reportCopied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {reportCopied ? 'Copied' : 'Copy summary'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintReport}>
                      <Printer className="h-4 w-4 mr-1" />
                      Print report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Doctor: view nurse reports for this admission */}
      <Dialog open={nurseReportsOpen} onOpenChange={setNurseReportsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nurse reports — {nurseReportsPatientName}
            </DialogTitle>
            <DialogDescription>
              Reports sent by the nurse for this patient. Click a report to view the full handoff.
            </DialogDescription>
          </DialogHeader>
          {nurseReportsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : nurseReportsList.length === 0 ? (
            <div className="py-6 text-center text-slate-500">
              No nurse reports yet for this patient. Reports will appear here after the nurse sends one from their IPD view.
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[200px]">
                {nurseReportsList.map((n: any) => {
                  const senderName = n.senderId?.firstName != null ? `${n.senderId.firstName} ${n.senderId.lastName || ''}`.trim() : n.data?.nurseName || 'Nurse';
                  const date = n.timestamp ? new Date(n.timestamp).toLocaleString() : '';
                  const isSelected = nurseReportSelected?._id === n._id;
                  return (
                    <button
                      key={n._id}
                      type="button"
                      onClick={() => setNurseReportSelected(n)}
                      className={`text-left px-3 py-2 rounded-md border transition-colors ${isSelected ? 'bg-slate-100 border-slate-300' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <span className="font-medium text-slate-800">{senderName}</span>
                      <span className="text-slate-500 text-sm ml-2">{date}</span>
                    </button>
                  );
                })}
              </div>
              {nurseReportSelected?.data?.reportText != null && (
                <div className="flex-1 min-h-0 flex flex-col border rounded-md bg-slate-50/50">
                  <p className="text-xs text-slate-500 px-3 pt-2">Full report</p>
                  <pre className="flex-1 overflow-auto p-4 text-sm text-slate-700 whitespace-pre-wrap font-sans border-t">
                    {nurseReportSelected.data.reportText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IPDManagement;
