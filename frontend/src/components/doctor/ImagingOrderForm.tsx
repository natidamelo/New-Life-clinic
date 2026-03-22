import React, { useState } from 'react';

interface ImagingOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  patientId: string;
  patientName: string;
}

interface ImagingTypeConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  typicalDuration: string;
}

const imagingTypeConfigs: Record<string, ImagingTypeConfig> = {
  'X-Ray': {
    label: 'X-Ray',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    color: 'blue',
    description: 'Bone fractures, lung conditions, chest',
    typicalDuration: '15–30 min',
  },
  'Ultrasound': {
    label: 'Ultrasound',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    color: 'green',
    description: 'Soft tissue, abdomen, obstetrics',
    typicalDuration: '30–45 min',
  },
  'CT Scan': {
    label: 'CT Scan',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1M3 12h1m16 0h1m-2.636-7.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707M17.657 17.657l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
    color: 'orange',
    description: 'Detailed cross-sectional imaging',
    typicalDuration: '15–60 min',
  },
  'MRI': {
    label: 'MRI',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    color: 'purple',
    description: 'Soft tissue, brain, spine, joints',
    typicalDuration: '45–90 min',
  },
  'Mammography': {
    label: 'Mammography',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    color: 'pink',
    description: 'Breast tissue screening & diagnosis',
    typicalDuration: '20–30 min',
  },
  'Echocardiogram': {
    label: 'Echocardiogram',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'red',
    description: 'Heart structure and function',
    typicalDuration: '30–60 min',
  },
  'Fluoroscopy': {
    label: 'Fluoroscopy',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    color: 'teal',
    description: 'Real-time X-ray imaging, GI studies',
    typicalDuration: '30–60 min',
  },
  'Other': {
    label: 'Other',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    color: 'gray',
    description: 'Specify in clinical information',
    typicalDuration: 'Varies',
  },
};

// Body parts organized by region
const bodyPartsByRegion: Record<string, string[]> = {
  'Head & Neck': ['Head', 'Brain', 'Skull', 'Neck', 'Cervical Spine', 'Sinuses', 'Orbits', 'Temporal Bones', 'Thyroid'],
  'Chest': ['Chest', 'Lungs', 'Heart', 'Mediastinum', 'Ribs', 'Sternum', 'Thoracic Spine'],
  'Abdomen & Pelvis': ['Abdomen', 'Pelvis', 'Liver', 'Gallbladder', 'Pancreas', 'Spleen', 'Kidneys', 'Bladder', 'Uterus', 'Ovaries', 'Prostate'],
  'Spine': ['Cervical Spine', 'Thoracic Spine', 'Lumbar Spine', 'Sacrum', 'Coccyx', 'Full Spine'],
  'Upper Extremity': ['Shoulder', 'Clavicle', 'Humerus', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Fingers'],
  'Lower Extremity': ['Hip', 'Femur', 'Knee', 'Tibia/Fibula', 'Ankle', 'Foot', 'Toes', 'Calcaneus'],
};

// Priority config
const priorityConfig = {
  Routine: { label: 'Routine', color: 'blue', description: 'Standard scheduling', icon: '📋' },
  Urgent: { label: 'Urgent', color: 'amber', description: 'Within 24 hours', icon: '⚡' },
  STAT: { label: 'STAT', color: 'red', description: 'Immediate', icon: '🚨' },
};

const colorMap: Record<string, { bg: string; border: string; text: string; ring: string; selectedBg: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   ring: 'ring-blue-400',   selectedBg: 'bg-blue-100' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  ring: 'ring-green-400',  selectedBg: 'bg-green-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', ring: 'ring-orange-400', selectedBg: 'bg-orange-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', ring: 'ring-purple-400', selectedBg: 'bg-purple-100' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   ring: 'ring-pink-400',   selectedBg: 'bg-pink-100' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    ring: 'ring-red-400',    selectedBg: 'bg-red-100' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   ring: 'ring-teal-400',   selectedBg: 'bg-teal-100' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-600',   ring: 'ring-gray-400',   selectedBg: 'bg-gray-100' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  ring: 'ring-amber-400',  selectedBg: 'bg-amber-100' },
};

const ImagingOrderForm: React.FC<ImagingOrderFormProps> = ({ open, onClose, onSubmit, patientId, patientName }) => {
  const [imagingType, setImagingType] = useState('X-Ray');
  const [bodyPart, setBodyPart] = useState('');
  const [customBodyPart, setCustomBodyPart] = useState('');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'STAT'>('Routine');
  const [laterality, setLaterality] = useState<'N/A' | 'Left' | 'Right' | 'Bilateral'>('N/A');
  const [contrastRequired, setContrastRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const effectiveBodyPart = bodyPart === 'Other (specify)' ? customBodyPart : bodyPart;

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!imagingType) errors.imagingType = 'Please select an imaging type.';
    if (!effectiveBodyPart.trim()) errors.bodyPart = 'Please select or specify a body part.';
    if (!clinicalInfo.trim()) errors.clinicalInfo = 'Clinical information is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        patientId,
        patientName,
        imagingType,
        bodyPart: effectiveBodyPart.trim(),
        clinicalInfo: clinicalInfo.trim(),
        priority,
        laterality: laterality !== 'N/A' ? laterality : undefined,
        contrastRequired,
        requestDate: new Date().toISOString(),
      });
      handleClose();
    } catch (e) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFieldErrors({});
    setImagingType('X-Ray');
    setBodyPart('');
    setCustomBodyPart('');
    setClinicalInfo('');
    setPriority('Routine');
    setLaterality('N/A');
    setContrastRequired(false);
    onClose();
  };

  const selectedTypeConfig = imagingTypeConfigs[imagingType];
  const selectedColors = colorMap[selectedTypeConfig?.color || 'blue'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Request Imaging</h2>
              <p className="text-indigo-200 text-xs mt-0.5">Order imaging studies for the patient</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Patient Info Bar */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
            {patientName ? patientName.charAt(0).toUpperCase() : 'P'}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-indigo-900">{patientName || 'Unknown Patient'}</span>
            <span className="text-indigo-300">·</span>
            <span className="text-indigo-500 text-xs font-mono">{patientId}</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Imaging Type Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Imaging Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(imagingTypeConfigs).map(([type, config]) => {
                const colors = colorMap[config.color];
                const isSelected = imagingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setImagingType(type); setFieldErrors(p => ({ ...p, imagingType: '' })); }}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 text-center ${
                      isSelected
                        ? `${colors.selectedBg} ${colors.border} ring-2 ${colors.ring} shadow-sm`
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && (
                      <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                        <svg className={`w-2.5 h-2.5 ${colors.text}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <span className={isSelected ? colors.text : 'text-gray-400'}>{config.icon}</span>
                    <span className={`text-xs font-semibold ${isSelected ? colors.text : 'text-gray-600'}`}>{config.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Selected type info */}
            {selectedTypeConfig && (
              <div className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-lg ${selectedColors.bg} ${selectedColors.border} border`}>
                <span className={selectedColors.text}>{selectedTypeConfig.icon}</span>
                <div>
                  <p className={`text-xs font-medium ${selectedColors.text}`}>{selectedTypeConfig.description}</p>
                  <p className="text-xs text-gray-400">Typical duration: {selectedTypeConfig.typicalDuration}</p>
                </div>
              </div>
            )}
            {fieldErrors.imagingType && <p className="text-xs text-red-500 mt-1">{fieldErrors.imagingType}</p>}
          </div>

          {/* Body Part */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Body Part / Examination Area <span className="text-red-400">*</span>
            </label>
            <select
              value={bodyPart}
              onChange={e => { setBodyPart(e.target.value); setFieldErrors(p => ({ ...p, bodyPart: '' })); }}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 ${
                fieldErrors.bodyPart ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <option value="">— Select examination area —</option>
              {Object.entries(bodyPartsByRegion).map(([region, parts]) => (
                <optgroup key={region} label={region}>
                  {parts.map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Other">
                <option value="Other (specify)">Other (specify below)</option>
              </optgroup>
            </select>
            {bodyPart === 'Other (specify)' && (
              <input
                type="text"
                value={customBodyPart}
                onChange={e => { setCustomBodyPart(e.target.value); setFieldErrors(p => ({ ...p, bodyPart: '' })); }}
                placeholder="Specify body part or area..."
                className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50"
              />
            )}
            {fieldErrors.bodyPart && <p className="text-xs text-red-500 mt-1">{fieldErrors.bodyPart}</p>}
          </div>

          {/* Laterality + Contrast row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Laterality
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {(['N/A', 'Left', 'Right', 'Bilateral'] as const).map(side => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setLaterality(side)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      laterality === side
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Contrast
              </label>
              <button
                type="button"
                onClick={() => setContrastRequired(c => !c)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                  contrastRequired
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  contrastRequired ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                }`}>
                  {contrastRequired && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                Contrast Required
              </button>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(Object.entries(priorityConfig) as [string, typeof priorityConfig.Routine][]).map(([key, config]) => {
                const isSelected = priority === key;
                const pColors = colorMap[config.color];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key as 'Routine' | 'Urgent' | 'STAT')}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `${pColors.selectedBg} ${pColors.border} shadow-sm`
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-base">{config.icon}</span>
                    <span className={`text-xs font-bold ${isSelected ? pColors.text : 'text-gray-600'}`}>{config.label}</span>
                    <span className={`text-xs ${isSelected ? pColors.text : 'text-gray-400'} opacity-80`}>{config.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clinical Information */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Clinical Information <span className="text-red-400">*</span>
            </label>
            <textarea
              value={clinicalInfo}
              onChange={e => { setClinicalInfo(e.target.value); setFieldErrors(p => ({ ...p, clinicalInfo: '' })); }}
              placeholder="Describe the clinical indication, relevant history, symptoms, or specific areas of concern..."
              rows={3}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 resize-none placeholder-gray-300 ${
                fieldErrors.clinicalInfo ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            <div className="flex justify-between mt-1">
              {fieldErrors.clinicalInfo
                ? <p className="text-xs text-red-500">{fieldErrors.clinicalInfo}</p>
                : <span />
              }
              <span className="text-xs text-gray-300">{clinicalInfo.length} chars</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
          {/* Summary chip */}
          {imagingType && effectiveBodyPart && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${selectedColors.bg} ${selectedColors.text} border ${selectedColors.border}`}>
              <span>{selectedTypeConfig?.icon}</span>
              <span>{imagingType} — {effectiveBodyPart}</span>
              {laterality !== 'N/A' && <span className="opacity-70">· {laterality}</span>}
              {contrastRequired && <span className="opacity-70">· +Contrast</span>}
            </div>
          )}
          {(!imagingType || !effectiveBodyPart) && <span />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-6 py-2 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                priority === 'STAT'
                  ? 'bg-red-600 hover:bg-red-700'
                  : priority === 'Urgent'
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagingOrderForm;
