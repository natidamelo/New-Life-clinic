import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  SpeakerWaveIcon, 
  EyeIcon, 
  ShieldCheckIcon, 
  BeakerIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface EarIrrigationAssessmentProps {
  procedureId: string;
  patientName: string;
  onAssessmentComplete?: (assessmentData: EarIrrigationAssessmentData) => void;
  onClose?: () => void;
  existingData?: EarIrrigationAssessmentData;
  isViewMode?: boolean;
}

interface EarIrrigationAssessmentData {
  earIrrigationDetails: {
    earType: string;
    earSide: string;
    earCondition: string;
    earAnatomy: {
      externalCanal: string;
      tympanicMembrane: string;
      discharge: string;
    };
    contraindications: string[];
  };
  earIrrigationAssessment: {
    painLevel: number;
    hearingLevel: string;
    earCanalCondition: string;
    irrigationTolerance: string;
    complications: string[];
    patientComfort: string;
  };
  earIrrigationSupplies: {
    irrigationSolution: string;
    irrigationTemperature: string;
    syringeType: string;
    additionalSupplies: string[];
    protectiveEquipment: string[];
  };
  earIrrigationPlan: {
    irrigationMethod: string;
    pressureLevel: string;
    duration: number;
    frequency: string;
    followUpRequired: boolean;
    followUpInstructions?: string;
    patientEducation: string;
  };
}

export default function EarIrrigationAssessment({
  procedureId,
  patientName,
  onAssessmentComplete,
  onClose,
  existingData,
  isViewMode = false
}: EarIrrigationAssessmentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EarIrrigationAssessmentData>(() => {
    const defaultData = {
      earIrrigationDetails: {
        earType: '',
        earSide: '',
        earCondition: '',
        earAnatomy: {
          externalCanal: '',
          tympanicMembrane: '',
          discharge: ''
        },
        contraindications: []
      },
      earIrrigationAssessment: {
        painLevel: 0,
        hearingLevel: '',
        earCanalCondition: '',
        irrigationTolerance: '',
        complications: [],
        patientComfort: ''
      },
      earIrrigationSupplies: {
        irrigationSolution: '',
        irrigationTemperature: '',
        syringeType: '',
        additionalSupplies: [],
        protectiveEquipment: []
      },
      earIrrigationPlan: {
        irrigationMethod: '',
        pressureLevel: '',
        duration: 15,
        frequency: '',
        followUpRequired: false,
        followUpInstructions: '',
        patientEducation: ''
      }
    };

    if (existingData) {
      return {
        earIrrigationDetails: {
          ...defaultData.earIrrigationDetails,
          ...existingData.earIrrigationDetails,
          earAnatomy: {
            ...defaultData.earIrrigationDetails.earAnatomy,
            ...(existingData.earIrrigationDetails?.earAnatomy || {})
          }
        },
        earIrrigationAssessment: {
          ...defaultData.earIrrigationAssessment,
          ...(existingData.earIrrigationAssessment || {})
        },
        earIrrigationSupplies: {
          ...defaultData.earIrrigationSupplies,
          ...(existingData.earIrrigationSupplies || {})
        },
        earIrrigationPlan: {
          ...defaultData.earIrrigationPlan,
          ...(existingData.earIrrigationPlan || {})
        }
      };
    }

    return defaultData;
  });

  const handleInputChange = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleArrayToggle = (path: string, value: string) => {
    const keys = path.split('.');
    const currentArray = keys.reduce((obj, key) => obj[key], formData);
    
    if (currentArray.includes(value)) {
      handleInputChange(path, currentArray.filter((item: string) => item !== value));
    } else {
      handleInputChange(path, [...currentArray, value]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Call the parent component's completion handler to save the data
      onAssessmentComplete?.(formData);
      onClose?.();
    } catch (error) {
      toast.error('Failed to save assessment');
      console.error('Assessment submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Ear Details', icon: SpeakerWaveIcon },
    { id: 2, title: 'Assessment', icon: EyeIcon },
    { id: 3, title: 'Supplies', icon: BeakerIcon },
    { id: 4, title: 'Treatment Plan', icon: ClockIcon }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <EarDetailsStep formData={formData} onInputChange={handleInputChange} onArrayToggle={handleArrayToggle} isViewMode={isViewMode} />;
      case 2:
        return <AssessmentStep formData={formData} onInputChange={handleInputChange} onArrayToggle={handleArrayToggle} isViewMode={isViewMode} />;
      case 3:
        return <SuppliesStep formData={formData} onInputChange={handleInputChange} onArrayToggle={handleArrayToggle} isViewMode={isViewMode} />;
      case 4:
        return <TreatmentPlanStep formData={formData} onInputChange={handleInputChange} onArrayToggle={handleArrayToggle} isViewMode={isViewMode} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose?.()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SpeakerWaveIcon className="h-6 w-6 text-blue-600" />
            </div>
            Ear Irrigation Assessment
            <Badge variant="outline" className="ml-auto">
              {patientName}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentStep === step.id 
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                    : currentStep > step.id 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setCurrentStep(step.id)}
              >
                <step.icon className="h-5 w-5" />
                <span className="font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  currentStep > step.id ? 'bg-green-300' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose?.()}
            disabled={isSubmitting}
          >
            {isViewMode ? 'Close' : (currentStep === 1 ? 'Cancel' : 'Previous')}
          </Button>
          
          {!isViewMode ? (
            <div className="flex gap-2">
              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving Assessment...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Complete Assessment
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  Previous
                </Button>
              )}
              {currentStep < 4 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  Next
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Ear Details
function EarDetailsStep({ 
  formData, 
  onInputChange, 
  onArrayToggle,
  isViewMode = false
}: {
  formData: EarIrrigationAssessmentData;
  onInputChange: (path: string, value: any) => void;
  onArrayToggle: (path: string, value: string) => void;
  isViewMode?: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <SpeakerWaveIcon className="h-5 w-5 text-blue-600" />
        Ear Examination Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ear Type */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Ear Irrigation Type</Label>
          <Select
            value={formData.earIrrigationDetails.earType}
            onValueChange={(value) => onInputChange('earIrrigationDetails.earType', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select irrigation type" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="cerumen_removal">Cerumen Removal</SelectItem>
              <SelectItem value="debris_removal">Debris Removal</SelectItem>
              <SelectItem value="foreign_body_removal">Foreign Body Removal</SelectItem>
              <SelectItem value="infection_treatment">Infection Treatment</SelectItem>
              <SelectItem value="diagnostic_irrigation">Diagnostic Irrigation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ear Side */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Affected Ear(s)</Label>
          <Select
            value={formData.earIrrigationDetails.earSide}
            onValueChange={(value) => onInputChange('earIrrigationDetails.earSide', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select affected ear(s)" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="left">Left Ear</SelectItem>
              <SelectItem value="right">Right Ear</SelectItem>
              <SelectItem value="both">Both Ears</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ear Condition */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Ear Condition</Label>
          <Select
            value={formData.earIrrigationDetails.earCondition}
            onValueChange={(value) => onInputChange('earIrrigationDetails.earCondition', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ear condition" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="impacted_cerumen">Impacted Cerumen</SelectItem>
              <SelectItem value="infected">Infected</SelectItem>
              <SelectItem value="inflamed">Inflamed</SelectItem>
              <SelectItem value="foreign_body">Foreign Body</SelectItem>
              <SelectItem value="perforated_drum">Perforated Drum</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ear Anatomy */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800">Ear Anatomy Assessment</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">External Canal</Label>
            <Select
              value={formData.earIrrigationDetails.earAnatomy?.externalCanal || ''}
              onValueChange={(value) => onInputChange('earIrrigationDetails.earAnatomy.externalCanal', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select canal condition" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="inflamed">Inflamed</SelectItem>
                <SelectItem value="swollen">Swollen</SelectItem>
                <SelectItem value="narrowed">Narrowed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tympanic Membrane</Label>
            <Select
              value={formData.earIrrigationDetails.earAnatomy?.tympanicMembrane || ''}
              onValueChange={(value) => onInputChange('earIrrigationDetails.earAnatomy.tympanicMembrane', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select membrane condition" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="perforated">Perforated</SelectItem>
                <SelectItem value="inflamed">Inflamed</SelectItem>
                <SelectItem value="retracted">Retracted</SelectItem>
                <SelectItem value="bulging">Bulging</SelectItem>
                <SelectItem value="not_visible">Not Visible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Discharge</Label>
            <Select
              value={formData.earIrrigationDetails.earAnatomy?.discharge || ''}
              onValueChange={(value) => onInputChange('earIrrigationDetails.earAnatomy.discharge', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select discharge type" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="clear">Clear</SelectItem>
                <SelectItem value="purulent">Purulent</SelectItem>
                <SelectItem value="bloody">Bloody</SelectItem>
                <SelectItem value="waxy">Waxy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contraindications */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Contraindications</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'tympanic_perforation',
            'ear_tube',
            'recent_surgery',
            'severe_infection',
            'foreign_body',
            'none'
          ].map((contraindication) => (
            <label key={contraindication} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.earIrrigationDetails.contraindications.includes(contraindication)}
                onChange={() => onArrayToggle('earIrrigationDetails.contraindications', contraindication)}
                disabled={isViewMode}
                className="rounded border-gray-300"
              />
              <span className="text-sm capitalize">
                {contraindication.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2: Assessment
function AssessmentStep({ 
  formData, 
  onInputChange, 
  onArrayToggle,
  isViewMode = false
}: {
  formData: EarIrrigationAssessmentData;
  onInputChange: (path: string, value: any) => void;
  onArrayToggle: (path: string, value: string) => void;
  isViewMode?: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <EyeIcon className="h-5 w-5 text-blue-600" />
        Patient Assessment
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pain Level */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">
            Pain Level: {formData.earIrrigationAssessment.painLevel}/10
          </Label>
          <input
            type="range"
            min="0"
            max="10"
            value={formData.earIrrigationAssessment.painLevel}
            onChange={(e) => onInputChange('earIrrigationAssessment.painLevel', parseInt(e.target.value))}
            disabled={isViewMode}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-700">
            <span>No Pain</span>
            <span>Severe Pain</span>
          </div>
        </div>

        {/* Hearing Level */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Hearing Level</Label>
          <Select
            value={formData.earIrrigationAssessment.hearingLevel}
            onValueChange={(value) => onInputChange('earIrrigationAssessment.hearingLevel', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select hearing level" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="mild_loss">Mild Loss</SelectItem>
              <SelectItem value="moderate_loss">Moderate Loss</SelectItem>
              <SelectItem value="severe_loss">Severe Loss</SelectItem>
              <SelectItem value="not_assessed">Not Assessed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ear Canal Condition */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Ear Canal Condition</Label>
          <Select
            value={formData.earIrrigationAssessment.earCanalCondition}
            onValueChange={(value) => onInputChange('earIrrigationAssessment.earCanalCondition', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select canal condition" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="clear">Clear</SelectItem>
              <SelectItem value="partially_blocked">Partially Blocked</SelectItem>
              <SelectItem value="completely_blocked">Completely Blocked</SelectItem>
              <SelectItem value="inflamed">Inflamed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Irrigation Tolerance */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Irrigation Tolerance</Label>
          <Select
            value={formData.earIrrigationAssessment.irrigationTolerance}
            onValueChange={(value) => onInputChange('earIrrigationAssessment.irrigationTolerance', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tolerance level" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="intolerant">Intolerant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Patient Comfort */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Patient Comfort Level</Label>
          <Select
            value={formData.earIrrigationAssessment.patientComfort}
            onValueChange={(value) => onInputChange('earIrrigationAssessment.patientComfort', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select comfort level" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="mild_discomfort">Mild Discomfort</SelectItem>
              <SelectItem value="moderate_pain">Moderate Pain</SelectItem>
              <SelectItem value="severe_pain">Severe Pain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Complications */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Complications Observed</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'bleeding',
            'dizziness',
            'nausea',
            'vomiting',
            'severe_pain',
            'hearing_loss',
            'tinnitus',
            'facial_weakness',
            'none'
          ].map((complication) => (
            <label key={complication} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.earIrrigationAssessment.complications.includes(complication)}
                onChange={() => onArrayToggle('earIrrigationAssessment.complications', complication)}
                disabled={isViewMode}
                className="rounded border-gray-300"
              />
              <span className="text-sm capitalize">
                {complication.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 3: Supplies
function SuppliesStep({ 
  formData, 
  onInputChange, 
  onArrayToggle,
  isViewMode = false
}: {
  formData: EarIrrigationAssessmentData;
  onInputChange: (path: string, value: any) => void;
  onArrayToggle: (path: string, value: string) => void;
  isViewMode?: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <BeakerIcon className="h-5 w-5 text-blue-600" />
        Supplies & Equipment
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Irrigation Solution */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Irrigation Solution</Label>
          <Select
            value={formData.earIrrigationSupplies.irrigationSolution}
            onValueChange={(value) => onInputChange('earIrrigationSupplies.irrigationSolution', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select irrigation solution" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="normal_saline">Normal Saline</SelectItem>
              <SelectItem value="sterile_water">Sterile Water</SelectItem>
              <SelectItem value="warm_water">Warm Water</SelectItem>
              <SelectItem value="hydrogen_peroxide">Hydrogen Peroxide</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Irrigation Temperature */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Solution Temperature</Label>
          <Select
            value={formData.earIrrigationSupplies.irrigationTemperature}
            onValueChange={(value) => onInputChange('earIrrigationSupplies.irrigationTemperature', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select temperature" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="room_temperature">Room Temperature</SelectItem>
              <SelectItem value="body_temperature">Body Temperature</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cool">Cool</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Syringe Type */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Syringe Type</Label>
          <Select
            value={formData.earIrrigationSupplies.syringeType}
            onValueChange={(value) => onInputChange('earIrrigationSupplies.syringeType', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select syringe type" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="bulb_syringe">Bulb Syringe</SelectItem>
              <SelectItem value="electronic_irrigator">Electronic Irrigator</SelectItem>
              <SelectItem value="manual_syringe">Manual Syringe</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Protective Equipment */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Protective Equipment</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'gown',
            'gloves',
            'eye_protection',
            'face_shield'
          ].map((equipment) => (
            <label key={equipment} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.earIrrigationSupplies.protectiveEquipment.includes(equipment)}
                onChange={() => onArrayToggle('earIrrigationSupplies.protectiveEquipment', equipment)}
                disabled={isViewMode}
                className="rounded border-gray-300"
              />
              <span className="text-sm capitalize">
                {equipment.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Additional Supplies */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Additional Supplies</Label>
        <Textarea
          placeholder="List any additional supplies used (e.g., cotton swabs, gauze, etc.)"
          value={formData.earIrrigationSupplies.additionalSupplies.join(', ')}
          onChange={(e) => onInputChange('earIrrigationSupplies.additionalSupplies', e.target.value.split(', ').filter(item => item.trim()))}
          disabled={isViewMode}
          rows={3}
        />
      </div>
    </div>
  );
}

// Step 4: Treatment Plan
function TreatmentPlanStep({ 
  formData, 
  onInputChange, 
  onArrayToggle,
  isViewMode = false
}: {
  formData: EarIrrigationAssessmentData;
  onInputChange: (path: string, value: any) => void;
  onArrayToggle: (path: string, value: string) => void;
  isViewMode?: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <ClockIcon className="h-5 w-5 text-blue-600" />
        Treatment Plan
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Irrigation Method */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Irrigation Method</Label>
          <Select
            value={formData.earIrrigationPlan.irrigationMethod}
            onValueChange={(value) => onInputChange('earIrrigationPlan.irrigationMethod', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select irrigation method" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="gentle_flush">Gentle Flush</SelectItem>
              <SelectItem value="pulsatile">Pulsatile</SelectItem>
              <SelectItem value="continuous">Continuous</SelectItem>
              <SelectItem value="manual_removal">Manual Removal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pressure Level */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Pressure Level</Label>
          <Select
            value={formData.earIrrigationPlan.pressureLevel}
            onValueChange={(value) => onInputChange('earIrrigationPlan.pressureLevel', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select pressure level" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Duration (minutes)</Label>
          <Input
            type="number"
            min="1"
            max="60"
            value={formData.earIrrigationPlan.duration}
            onChange={(e) => onInputChange('earIrrigationPlan.duration', parseInt(e.target.value) || 15)}
            disabled={isViewMode}
            placeholder="15"
          />
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Frequency</Label>
          <Select
            value={formData.earIrrigationPlan.frequency}
            onValueChange={(value) => onInputChange('earIrrigationPlan.frequency', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="single_session">Single Session</SelectItem>
              <SelectItem value="multiple_sessions">Multiple Sessions</SelectItem>
              <SelectItem value="as_needed">As Needed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Patient Education */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Patient Education</Label>
          <Select
            value={formData.earIrrigationPlan.patientEducation}
            onValueChange={(value) => onInputChange('earIrrigationPlan.patientEducation', value)}
            disabled={isViewMode}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select education status" />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="provided">Provided</SelectItem>
              <SelectItem value="not_needed">Not Needed</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Follow-up */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="followUpRequired"
              checked={formData.earIrrigationPlan.followUpRequired}
              onChange={(e) => onInputChange('earIrrigationPlan.followUpRequired', e.target.checked)}
              disabled={isViewMode}
              className="rounded border-gray-300"
            />
          <Label htmlFor="followUpRequired" className="text-sm font-semibold cursor-pointer">
            Follow-up Required
          </Label>
        </div>

        {formData.earIrrigationPlan.followUpRequired && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Follow-up Instructions</Label>
        <Textarea
          placeholder="Enter follow-up instructions..."
          value={formData.earIrrigationPlan.followUpInstructions || ''}
          onChange={(e) => onInputChange('earIrrigationPlan.followUpInstructions', e.target.value)}
          disabled={isViewMode}
          rows={3}
        />
          </div>
        )}
      </div>
    </div>
  );
}
