import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import nurseTaskService from '../../services/nurseTaskService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from 'react-hot-toast';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface CreateTaskFormProps {
  onTaskCreated: () => void;
  initialPatientId?: string;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  onTaskCreated,
  initialPatientId,
}) => {
  const { user, token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientId: initialPatientId || '',
    taskType: 'MEDICATION',
    description: '',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    medicationDetails: {
      medicationName: '',
      dosage: '',
      frequency: '',
      route: 'Oral',
      instructions: '',
    },
  });

  useEffect(() => {
    // Fetch patients
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setPatients(data);
      } catch (error) {
        console.error('Error fetching patients:', error);
        toast.error('Failed to load patients');
      }
    };

    fetchPatients();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('medicationDetails.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        medicationDetails: {
          ...formData.medicationDetails,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Find patient name
      const patient = patients.find(p => p.id === formData.patientId);
      const patientName = patient 
        ? `${patient.firstName} ${patient.lastName}`
        : `Unknown Patient (ID: ${formData.patientId})`;
      
      // Prepare task data
      const taskData = {
        ...formData,
        taskType: formData.taskType as 'MEDICATION' | 'VITAL_SIGNS' | 'PROCEDURE' | 'OTHER',
        priority: formData.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        patientName,
        status: 'PENDING' as const,
        assignedBy: user?.id || '',
        assignedByName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        // Only include medication details for medication tasks
        medicationDetails: formData.taskType === 'MEDICATION' ? formData.medicationDetails : undefined,
      };
      
      await nurseTaskService.createNurseTask(taskData, token || '');
      
      // Reset form
      setFormData({
        patientId: '',
        taskType: 'MEDICATION',
        description: '',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        medicationDetails: {
          medicationName: '',
          dosage: '',
          frequency: '',
          route: 'Oral',
          instructions: '',
        },
      });
      
      onTaskCreated();
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-2 text-sm font-medium text-muted-foreground">
          Patient
        </label>
        <Select
          name="patientId"
          value={formData.patientId}
          onValueChange={(value) => handleInputChange({ target: { name: 'patientId', value } } as any)}
          required
        >
          <option value="">Select Patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.firstName} {patient.lastName}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-muted-foreground">
          Task Type
        </label>
        <Select
          name="taskType"
          value={formData.taskType}
          onValueChange={(value) => handleInputChange({ target: { name: 'taskType', value } } as any)}
          required
        >
          <option value="MEDICATION">Medication</option>
          <option value="VITAL_SIGNS">Vital Signs</option>
          <option value="PROCEDURE">Procedure</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-muted-foreground">
          Description
        </label>
        <Input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          required
          placeholder="Enter task description"
        />
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-muted-foreground">
          Priority
        </label>
        <Select
          name="priority"
          value={formData.priority}
          onValueChange={(value) => handleInputChange({ target: { name: 'priority', value } } as any)}
          required
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-muted-foreground">
          Due Date
        </label>
        <Input
          type="date"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleInputChange}
          required
        />
      </div>

      {formData.taskType === 'MEDICATION' && (
        <div className="space-y-4 border-t pt-4 mt-4">
          <h3 className="font-medium">Medication Details</h3>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-muted-foreground">
              Medication Name
            </label>
            <Input
              type="text"
              name="medicationDetails.medicationName"
              value={formData.medicationDetails.medicationName}
              onChange={handleInputChange}
              required
              placeholder="Enter medication name"
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-muted-foreground">
              Dosage
            </label>
            <Input
              type="text"
              name="medicationDetails.dosage"
              value={formData.medicationDetails.dosage}
              onChange={handleInputChange}
              required
              placeholder="e.g., 500mg"
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-muted-foreground">
              Frequency
            </label>
            <Input
              type="text"
              name="medicationDetails.frequency"
              value={formData.medicationDetails.frequency}
              onChange={handleInputChange}
              required
              placeholder="e.g., Once daily"
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-muted-foreground">
              Route
            </label>
            <Select
              name="medicationDetails.route"
              value={formData.medicationDetails.route}
              onValueChange={(value) => handleInputChange({ target: { name: 'medicationDetails.route', value } } as any)}
            >
              <option value="Oral">Oral</option>
              <option value="Intravenous">Intravenous</option>
              <option value="Intramuscular">Intramuscular</option>
              <option value="Subcutaneous">Subcutaneous</option>
              <option value="Topical">Topical</option>
              <option value="Rectal">Rectal</option>
              <option value="Nasal">Nasal</option>
              <option value="Other">Other</option>
            </Select>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-muted-foreground">
              Instructions
            </label>
            <Textarea
              name="medicationDetails.instructions"
              value={formData.medicationDetails.instructions}
              onChange={handleInputChange}
              placeholder="Special instructions for medication administration"
              rows={3}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block mb-2 text-sm font-medium text-muted-foreground">
          Notes
        </label>
        <Textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Additional notes about this task"
          rows={3}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};

export default CreateTaskForm; 