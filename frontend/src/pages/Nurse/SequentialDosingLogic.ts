// Sequential Dosing Logic for Nurse Tasks
// This module handles blocking subsequent medication instances until previous ones are completed

export interface NurseTask {
  _id?: string;
  id?: string;
  patientId: string;
  medicationDetails?: {
    medicationName: string;
    instanceOrder?: number;
    instanceLabel?: string;
    doseRecords?: Array<{
      administered: boolean;
      day: number;
      timeSlot: string;
    }>;
  };
}

export interface MedicationDetails {
  medicationName: string;
  instanceOrder?: number;
  instanceLabel?: string;
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
export const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

// Helper function to check if a task is fully completed
export const isTaskFullyCompleted = (task: NurseTask): boolean => {
  if (!task.medicationDetails?.doseRecords) return false;
  
  const totalDoses = task.medicationDetails.doseRecords.length;
  const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered).length;
  
  return totalDoses > 0 && administeredDoses === totalDoses;
};

// Check if a dose can be administered based on sequential instance rules
export const canAdministerDoseSequentially = (
  currentTask: NurseTask,
  allTasks: NurseTask[],
  normalizedMedicationDetails: MedicationDetails
): { canAdminister: boolean; reason?: string } => {
  const currentInstanceOrder = normalizedMedicationDetails.instanceOrder || 1;
  
  console.log(`🔍 [SEQUENTIAL] Checking dose for ${normalizedMedicationDetails.medicationName} (${normalizedMedicationDetails.instanceLabel || currentInstanceOrder + 'th'})`);
  console.log(`🔍 [SEQUENTIAL] Current instance order: ${currentInstanceOrder}`);
  
  // If this is the 1st instance, it can always be administered
  if (currentInstanceOrder === 1) {
    console.log(`✅ [SEQUENTIAL] 1st instance - allowing administration`);
    return { canAdminister: true };
  }
  
  // Find all tasks for the same patient and medication
  const samePatientTasks = allTasks.filter(t => 
    t.patientId === currentTask.patientId && 
    t.medicationDetails?.medicationName === normalizedMedicationDetails.medicationName
  );
  
  console.log(`🔍 [SEQUENTIAL] Found ${samePatientTasks.length} tasks for same patient+medication`);
  samePatientTasks.forEach(t => {
    console.log(`   - Task ${t._id}: instance ${t.medicationDetails?.instanceOrder || 1} (${t.medicationDetails?.instanceLabel || 'no label'})`);
  });
  
  // Check if all previous instances are completed
  for (let prevInstance = 1; prevInstance < currentInstanceOrder; prevInstance++) {
    const prevTask = samePatientTasks.find(t => 
      (t.medicationDetails?.instanceOrder || 1) === prevInstance
    );
    
    console.log(`🔍 [SEQUENTIAL] Checking previous instance ${prevInstance}:`, prevTask ? 'found' : 'not found');
    
    if (prevTask) {
      // Check if previous instance is fully completed
      const prevTaskCompleted = isTaskFullyCompleted(prevTask);
      console.log(`🔍 [SEQUENTIAL] Previous instance ${prevInstance} completed: ${prevTaskCompleted}`);
      
      if (!prevTaskCompleted) {
        const prevLabel = prevTask.medicationDetails?.instanceLabel || `${prevInstance}${getOrdinalSuffix(prevInstance)}`;
        console.log(`🚫 [SEQUENTIAL] Blocking - previous instance not completed: ${prevLabel}`);
        return { 
          canAdminister: false, 
          reason: `Complete ${normalizedMedicationDetails.medicationName} (${prevLabel}) first` 
        };
      }
    } else {
      // Previous instance doesn't exist, block this one
      console.log(`🚫 [SEQUENTIAL] Blocking - previous instance ${prevInstance} not found`);
      return { 
        canAdminister: false, 
        reason: `Previous instance of ${normalizedMedicationDetails.medicationName} not found` 
      };
    }
  }
  
  console.log(`✅ [SEQUENTIAL] All previous instances completed - allowing administration`);
  return { canAdminister: true };
};

// Get the CSS class for a dose button based on sequential restrictions
export const getDoseButtonClass = (
  isAlreadyAdministered: boolean,
  isBeingProcessed: boolean,
  timeSlot: any,
  isNotToday: boolean,
  isUnpaid: boolean,
  cannotAdministerSequentially: boolean,
  cannotAdministerConsecutively: boolean
): string => {
  const baseClass = "w-full p-1 rounded text-xs font-bold transition-all duration-200 min-h-[32px] flex flex-col items-center justify-center";
  
  if (isAlreadyAdministered) {
    return `${baseClass} bg-primary border border-primary text-primary-foreground cursor-default shadow-sm`;
  }
  
  if (isBeingProcessed) {
    return `${baseClass} bg-primary border border-primary text-primary-foreground cursor-wait animate-pulse shadow-sm`;
  }
  
  if (timeSlot.missed) {
    return `${baseClass} bg-destructive border border-destructive text-primary-foreground hover:bg-destructive shadow-sm`;
  }
  
  if (timeSlot.overdue) {
    return `${baseClass} bg-accent/20 border border-yellow-300 text-accent-foreground hover:bg-accent/30 shadow-sm`;
  }
  
  if (cannotAdministerSequentially) {
    return `${baseClass} bg-muted/50 border border-border text-muted-foreground cursor-not-allowed shadow-sm`;
  }
  
  if (cannotAdministerConsecutively) {
    return `${baseClass} bg-muted/40 border border-border/50 text-muted-foreground cursor-not-allowed shadow-sm`;
  }
  
  if (isNotToday) {
    return `${baseClass} bg-muted/30 border border-border/40 text-muted-foreground cursor-not-allowed shadow-sm`;
  }
  
  if (isUnpaid) {
    return `${baseClass} bg-destructive/20 border border-destructive/40 text-destructive cursor-not-allowed shadow-sm`;
  }
  
  return `${baseClass} bg-primary/10 border-2 border-primary/40 text-primary hover:bg-primary/20 hover:border-primary cursor-pointer shadow-sm transform hover:scale-105`;
};
