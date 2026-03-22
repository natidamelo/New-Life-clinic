import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import CleanMedicationAdmin from '../../components/nurse/CleanMedicationAdmin';
import nurseTaskService from '../../services/nurseTaskService';

interface NurseTask {
  _id?: string;
  id?: string;
  patientId: string;
  patientName: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  taskType: 'MEDICATION' | 'VITAL_SIGNS' | 'ASSESSMENT' | 'PROCEDURE' | 'OTHER';
  dueDate: string;
  notes?: string;
  medicationDetails?: any;
  serviceId?: string;
}

const CleanMedicationTest: React.FC = () => {
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<NurseTask | null>(null);

  useEffect(() => {
    fetchMedicationTasks();
  }, []);

  const fetchMedicationTasks = async () => {
    try {
      setLoading(true);
      const response = await nurseTaskService.getNurseTasks({
        taskType: 'MEDICATION',
        status: 'PENDING'
      }, '');
      
      // Filter for medication tasks with DEPO injection
      const medicationTasks = response.filter((task: NurseTask) => 
        task.taskType === 'MEDICATION' && 
        (task.description?.toLowerCase().includes('depo') || 
         task.medicationDetails?.medicationName?.toLowerCase().includes('depo'))
      );
      
      setTasks(medicationTasks);
      console.log('📋 Loaded medication tasks:', medicationTasks);
    } catch (error) {
      console.error('Failed to fetch medication tasks:', error);
      toast.error('Failed to load medication tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDoseAdministered = (taskId: string, day: number, timeSlot: string) => {
    console.log('✅ Dose administered callback:', { taskId, day, timeSlot });
    // Refresh the tasks to update the UI
    fetchMedicationTasks();
  };

  const handleTaskSelect = (task: NurseTask) => {
    setSelectedTask(task);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading medication tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 p-6">
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-muted-foreground mb-2">
            🧪 Clean Medication Administration Test
          </h1>
          <p className="text-muted-foreground">
            Testing the new clean medication administration system with proper inventory deduction
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Task List */}
          <div className="bg-primary-foreground rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-muted-foreground mb-4">
              Available Medication Tasks ({tasks.length})
            </h2>
            
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No medication tasks found</p>
                <button
                  onClick={fetchMedicationTasks}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary"
                >
                  Refresh Tasks
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const taskId = task._id || task.id || '';
                  const medicationName = task.medicationDetails?.medicationName || task.description;
                  
                  return (
                    <div
                      key={taskId}
                      onClick={() => handleTaskSelect(task)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTask && (selectedTask._id || selectedTask.id) === taskId
                          ? 'border-primary bg-primary/10'
                          : 'border-border/30 hover:border-border/40 hover:bg-muted/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-muted-foreground">{medicationName}</h3>
                          <p className="text-sm text-muted-foreground">Patient: {task.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            Priority: {task.priority} | Status: {task.status}
                          </p>
                          {task.medicationDetails && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.medicationDetails.dosage} - {task.medicationDetails.frequency}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority === 'HIGH' || task.priority === 'URGENT'
                            ? 'bg-destructive/20 text-destructive'
                            : task.priority === 'MEDIUM'
                            ? 'bg-accent/20 text-accent-foreground'
                            : 'bg-primary/20 text-primary'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Administration Panel */}
          <div className="bg-primary-foreground rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-muted-foreground mb-4">
              Medication Administration
            </h2>
            
            {selectedTask ? (
              <div>
                <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <h3 className="font-semibold text-primary mb-2">Selected Task</h3>
                  <p className="text-primary">
                    {selectedTask.medicationDetails?.medicationName || selectedTask.description}
                  </p>
                  <p className="text-sm text-primary">
                    Patient: {selectedTask.patientName}
                  </p>
                </div>

                {/* Test with Day 1, 09:00 dose */}
                <CleanMedicationAdmin
                  task={selectedTask}
                  day={1}
                  timeSlot="09:00"
                  onDoseAdministered={handleDoseAdministered}
                />

                <div className="mt-6 p-4 bg-muted/10 border border-border/30 rounded-lg">
                  <h4 className="font-semibold text-muted-foreground mb-2">Test Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• This test administers Day 1, 09:00 dose</li>
                    <li>• Inventory will be deducted only once per dose</li>
                    <li>• Button will be disabled after administration</li>
                    <li>• State persists on page refresh</li>
                    <li>• All safeguards are in place to prevent double deduction</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Select a medication task to administer</p>
                <div className="text-sm text-muted-foreground/50">
                  Click on a task from the list to start administration
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-primary-foreground rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-muted-foreground mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <h3 className="font-semibold text-primary">✅ Clean Backend</h3>
              <p className="text-sm text-primary">New medication administration route</p>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <h3 className="font-semibold text-primary">🔒 Safeguards Active</h3>
              <p className="text-sm text-primary">Prevents double deduction</p>
            </div>
            <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-lg">
              <h3 className="font-semibold text-secondary-foreground">📦 Inventory Tracking</h3>
              <p className="text-sm text-secondary-foreground">Real-time deduction monitoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanMedicationTest; 