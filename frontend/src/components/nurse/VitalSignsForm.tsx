import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  User, 
  Save, 
  X, 
  FileText,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';

interface VitalSignsFormProps {
  task: any;
  patient: any;
  onSave: (vitalSigns: any) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface VitalSignsData {
  measurementType: 'blood_pressure' | 'temperature' | 'pulse' | 'weight' | 'height';
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  notes: string;
  fileType: 'single' | 'weekly' | 'monthly';
  position: 'sitting' | 'standing' | 'lying';
  arm: 'left' | 'right';
  location: string;
  device: string;
}

const VitalSignsForm: React.FC<VitalSignsFormProps> = ({
  task,
  patient,
  onSave,
  onCancel,
  isOpen
}) => {
  const [formData, setFormData] = useState<VitalSignsData>({
    measurementType: 'blood_pressure',
    systolic: undefined,
    diastolic: undefined,
    pulse: undefined,
    temperature: undefined,
    weight: undefined,
    height: undefined,
    notes: '',
    fileType: 'single',
    position: 'sitting',
    arm: 'left',
    location: 'Clinic',
    device: 'Standard Device'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    if (task && task.vitalSignsOptions) {
      setFormData(prev => ({
        ...prev,
        measurementType: task.vitalSignsOptions.measurementType || 'blood_pressure'
      }));
    }
  }, [task]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate blood pressure readings
    if (formData.measurementType === 'blood_pressure') {
      if (!formData.systolic || formData.systolic < 50 || formData.systolic > 300) {
        newErrors.systolic = 'Systolic pressure must be between 50-300 mmHg';
      }
      if (!formData.diastolic || formData.diastolic < 30 || formData.diastolic > 200) {
        newErrors.diastolic = 'Diastolic pressure must be between 30-200 mmHg';
      }
      if (formData.systolic && formData.diastolic && formData.systolic <= formData.diastolic) {
        newErrors.systolic = 'Systolic pressure must be higher than diastolic pressure';
      }
    }

    // Validate pulse
    if (formData.measurementType === 'pulse') {
      if (!formData.pulse || formData.pulse < 30 || formData.pulse > 200) {
        newErrors.pulse = 'Pulse must be between 30-200 bpm';
      }
    }

    // Validate temperature
    if (formData.measurementType === 'temperature') {
      if (!formData.temperature || formData.temperature < 30 || formData.temperature > 45) {
        newErrors.temperature = 'Temperature must be between 30-45°C';
      }
    }

    // Validate weight
    if (formData.measurementType === 'weight') {
      if (!formData.weight || formData.weight < 0 || formData.weight > 500) {
        newErrors.weight = 'Weight must be between 0-500 kg';
      }
    }

    // Validate height
    if (formData.measurementType === 'height') {
      if (!formData.height || formData.height < 0 || formData.height > 300) {
        newErrors.height = 'Height must be between 0-300 cm';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getBloodPressureCategory = (systolic: number, diastolic: number): string => {
    if (systolic < 120 && diastolic < 80) return 'Normal';
    if (systolic >= 120 && systolic < 130 && diastolic < 80) return 'Elevated';
    if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) return 'Stage 1 Hypertension';
    if (systolic >= 140 || diastolic >= 90) return 'Stage 2 Hypertension';
    if (systolic > 180 || diastolic > 120) return 'Hypertensive Crisis';
    return 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const vitalSignsData = {
        ...formData,
        patientId: patient._id || patient.id,
        patientName: patient.fullName || `${patient.firstName} ${patient.lastName}`,
        measurementDate: new Date(),
        taskId: task._id || task.id,
        taskType: task.taskType
      };

      await onSave(vitalSignsData);
      toast.success('Vital signs recorded successfully!');
    } catch (error) {
      console.error('Error saving vital signs:', error);
      toast.error('Failed to save vital signs. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-foreground rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-muted-foreground">Record Vital Signs</h2>
              <p className="text-sm text-muted-foreground">
                {patient.fullName || `${patient.firstName} ${patient.lastName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Measurement Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Measurement Type
            </label>
            <select
              value={formData.measurementType}
              onChange={(e) => handleInputChange('measurementType', e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="blood_pressure">Blood Pressure</option>
              <option value="temperature">Temperature</option>
              <option value="pulse">Pulse</option>
              <option value="weight">Weight</option>
              <option value="height">Height</option>
            </select>
          </div>

          {/* Blood Pressure Fields */}
          {formData.measurementType === 'blood_pressure' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Systolic (mmHg)
                </label>
                <input
                  type="number"
                  value={formData.systolic || ''}
                  onChange={(e) => handleInputChange('systolic', parseInt(e.target.value) || undefined)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.systolic ? 'border-destructive' : 'border-border/40'
                  }`}
                  placeholder="120"
                  min="50"
                  max="300"
                />
                {errors.systolic && (
                  <p className="mt-1 text-sm text-destructive flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.systolic}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Diastolic (mmHg)
                </label>
                <input
                  type="number"
                  value={formData.diastolic || ''}
                  onChange={(e) => handleInputChange('diastolic', parseInt(e.target.value) || undefined)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.diastolic ? 'border-destructive' : 'border-border/40'
                  }`}
                  placeholder="80"
                  min="30"
                  max="200"
                />
                {errors.diastolic && (
                  <p className="mt-1 text-sm text-destructive flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.diastolic}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Category
                </label>
                <div className="w-full px-3 py-2 bg-muted/10 border border-border/40 rounded-md text-sm text-muted-foreground">
                  {formData.systolic && formData.diastolic 
                    ? getBloodPressureCategory(formData.systolic, formData.diastolic)
                    : 'Enter readings'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Other Measurement Fields */}
          {formData.measurementType === 'pulse' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Pulse Rate (bpm)
              </label>
              <input
                type="number"
                value={formData.pulse || ''}
                onChange={(e) => handleInputChange('pulse', parseInt(e.target.value) || undefined)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.pulse ? 'border-destructive' : 'border-border/40'
                }`}
                placeholder="72"
                min="30"
                max="200"
              />
              {errors.pulse && (
                <p className="mt-1 text-sm text-destructive flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.pulse}
                </p>
              )}
            </div>
          )}

          {formData.measurementType === 'temperature' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature || ''}
                onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || undefined)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.temperature ? 'border-destructive' : 'border-border/40'
                }`}
                placeholder="37.0"
                min="30"
                max="45"
              />
              {errors.temperature && (
                <p className="mt-1 text-sm text-destructive flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.temperature}
                </p>
              )}
            </div>
          )}

          {formData.measurementType === 'weight' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || undefined)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.weight ? 'border-destructive' : 'border-border/40'
                }`}
                placeholder="70.5"
                min="0"
                max="500"
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-destructive flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.weight}
                </p>
              )}
            </div>
          )}

          {formData.measurementType === 'height' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.height || ''}
                onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || undefined)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.height ? 'border-destructive' : 'border-border/40'
                }`}
                placeholder="170.0"
                min="0"
                max="300"
              />
              {errors.height && (
                <p className="mt-1 text-sm text-destructive flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.height}
                </p>
              )}
            </div>
          )}

          {/* Blood Pressure Specific Fields */}
          {formData.measurementType === 'blood_pressure' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Position
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sitting">Sitting</option>
                  <option value="standing">Standing</option>
                  <option value="lying">Lying</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Arm
                </label>
                <select
                  value={formData.arm}
                  onChange={(e) => handleInputChange('arm', e.target.value)}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          )}

          {/* File Type Selection */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              File Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center p-3 border border-border/40 rounded-lg cursor-pointer hover:bg-muted/10">
                <input
                  type="radio"
                  name="fileType"
                  value="single"
                  checked={formData.fileType === 'single'}
                  onChange={(e) => handleInputChange('fileType', e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-sm">Single</div>
                  <div className="text-xs text-muted-foreground">One-time measurement</div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-border/40 rounded-lg cursor-pointer hover:bg-muted/10">
                <input
                  type="radio"
                  name="fileType"
                  value="weekly"
                  checked={formData.fileType === 'weekly'}
                  onChange={(e) => handleInputChange('fileType', e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-sm">Weekly</div>
                  <div className="text-xs text-muted-foreground">Weekly tracking file</div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-border/40 rounded-lg cursor-pointer hover:bg-muted/10">
                <input
                  type="radio"
                  name="fileType"
                  value="monthly"
                  checked={formData.fileType === 'monthly'}
                  onChange={(e) => handleInputChange('fileType', e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-sm">Monthly</div>
                  <div className="text-xs text-muted-foreground">Monthly tracking file</div>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about the measurement..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/30">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-muted-foreground bg-muted/20 hover:bg-muted/30 rounded-md transition-colors duration-200 flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary disabled:bg-primary/50 rounded-md transition-colors duration-200 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Vital Signs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VitalSignsForm; 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 