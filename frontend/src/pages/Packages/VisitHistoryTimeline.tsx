import React from 'react';
import { PackageVisit } from '../../services/healthPackageService';
import { Calendar, User, FileText, Pill, FlaskConical, CircleDollarSign, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

interface VisitHistoryTimelineProps {
  visits: PackageVisit[];
}

const VisitHistoryTimeline: React.FC<VisitHistoryTimelineProps> = ({ visits }) => {
  if (!visits || visits.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border/60 rounded-xl bg-muted/10">
        <Calendar className="w-8 h-8 text-muted-foreground/35 mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No visits consumed yet.</p>
        <p className="text-xs text-muted-foreground mt-0.5">Visits will appear here once checked-in and logged.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="relative ml-6 pl-6 border-l border-border/80 space-y-8 py-2">
      {visits.map((visit, index) => {
        const hasVitals = 
          visit.blood_pressure_systolic || 
          visit.blood_pressure_diastolic || 
          visit.blood_sugar_fasting || 
          visit.blood_sugar_random || 
          visit.weight_kg;

        return (
          <div key={visit._id || index} className="relative group">
            {/* Timeline Circle Node */}
            <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background group-hover:scale-125 transition-transform duration-200" />
            
            <div className="bg-card border border-border/50 hover:border-primary/20 hover:shadow-sm rounded-xl p-5 space-y-4 transition-all duration-200">
              
              {/* Header: Visit #, Date, Attendant, Payment Status */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border/40 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/10">
                    Visit #{visit.visit_number}
                  </span>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(visit.visit_date)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-semibold sm:justify-end">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Attended by: </span>
                    <span className="text-foreground">
                      {visit.attended_by 
                        ? typeof visit.attended_by === 'object'
                          ? `${visit.attended_by.firstName || ''} ${visit.attended_by.lastName || ''}`.trim()
                          : visit.attended_by
                        : 'Unknown Staff'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold inline-flex items-center gap-1
                    ${visit.payment_collected > 0 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'}`}>
                    <CircleDollarSign className="w-3.5 h-3.5" />
                    {visit.payment_collected > 0 ? `${visit.payment_collected.toLocaleString()} ETB Collected` : 'No additional payment (Included in package)'}
                  </span>
                </div>
              </div>

              {/* Vitals Summary */}
              <div>
                <p className="text-xs font-bold text-foreground/80 mb-2">Vitals Recorded:</p>
                {hasVitals ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* BP */}
                    {(visit.blood_pressure_systolic || visit.blood_pressure_diastolic) && (
                      <div className="bg-muted/40 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Blood Pressure</p>
                        <p className="text-sm font-extrabold text-rose-600">
                          {visit.blood_pressure_systolic || '—'}/{visit.blood_pressure_diastolic || '—'}
                          <span className="text-[9px] font-semibold text-muted-foreground ml-0.5">mmHg</span>
                        </p>
                      </div>
                    )}
                    
                    {/* Fasting Sugar */}
                    {visit.blood_sugar_fasting && (
                      <div className="bg-muted/40 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Sugar (Fasting)</p>
                        <p className="text-sm font-extrabold text-emerald-600">
                          {visit.blood_sugar_fasting}
                          <span className="text-[9px] font-semibold text-muted-foreground ml-0.5">mg/dL</span>
                        </p>
                      </div>
                    )}

                    {/* Random Sugar */}
                    {visit.blood_sugar_random && (
                      <div className="bg-muted/40 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Sugar (Random)</p>
                        <p className="text-sm font-extrabold text-amber-600">
                          {visit.blood_sugar_random}
                          <span className="text-[9px] font-semibold text-muted-foreground ml-0.5">mg/dL</span>
                        </p>
                      </div>
                    )}

                    {/* Weight & BMI */}
                    {visit.weight_kg && (
                      <div className="bg-muted/40 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Weight & BMI</p>
                        <p className="text-sm font-extrabold text-indigo-600">
                          {visit.weight_kg}kg 
                          {visit.bmi && <span className="text-xs font-semibold text-muted-foreground ml-1">({visit.bmi} BMI)</span>}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-600 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Vitals sign check was bypassed/skipped for this visit.
                  </div>
                )}
              </div>

              {/* Diagnosis and Notes */}
              {visit.diagnosis_notes && (
                <div className="bg-muted/20 border border-border/40 p-3 rounded-lg space-y-1">
                  <p className="text-xs font-bold text-foreground/80 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Clinical Diagnosis / Consultation Notes:
                  </p>
                  <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                    {visit.diagnosis_notes}
                  </p>
                </div>
              )}

              {/* Medications & Labs Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Medications */}
                <div className="bg-muted/10 p-3 rounded-lg border border-border/30 space-y-2">
                  <p className="font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/35 pb-1">
                    <Pill className="w-4 h-4 text-indigo-500" />
                    Prescribed Medications:
                  </p>
                  {visit.medications_given && visit.medications_given.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {visit.medications_given.map((med, i) => (
                        <Badge key={i} variant="secondary" className="px-2.5 py-0.5 text-[10px] font-semibold">{med}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic font-medium block pt-0.5">None prescribed.</span>
                  )}
                </div>

                {/* Lab Orders */}
                <div className="bg-muted/10 p-3 rounded-lg border border-border/30 space-y-2">
                  <p className="font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/35 pb-1">
                    <FlaskConical className="w-4 h-4 text-purple-500" />
                    Ordered Laboratory Tests:
                  </p>
                  {visit.lab_services_ordered && visit.lab_services_ordered.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {visit.lab_services_ordered.map((test, i) => (
                        <Badge key={i} variant="outline" className="px-2.5 py-0.5 text-[10px] font-semibold border-purple-500/25 text-purple-600 bg-purple-500/5">{test}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic font-medium block pt-0.5">None ordered.</span>
                  )}
                </div>

              </div>

              {/* Next Visit Routing Target info */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
                {visit.needs_vitals && <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-0 text-[10px] font-bold">Routed: Nurse Vitals</Badge>}
                {visit.needs_consultation && <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-0 text-[10px] font-bold">Routed: Doctor Consultation</Badge>}
                {visit.needs_lab && <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-0 text-[10px] font-bold">Routed: Lab Queue</Badge>}
                
                {visit.next_visit_due_date && (
                  <div className="ml-auto text-[10px] font-bold text-indigo-600 bg-indigo-500/5 border border-indigo-500/15 px-2 py-0.5 rounded">
                    Next visit scheduled: {formatDate(visit.next_visit_due_date)}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VisitHistoryTimeline;
