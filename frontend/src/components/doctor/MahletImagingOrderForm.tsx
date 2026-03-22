import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface ImagingOrderFormProps {
  onClose: () => void;
  onOrderCreated: () => void;
}

const imagingTypes = [
  'X-Ray',
  'Ultrasound',
  'CT Scan',
  'MRI',
  'Mammography',
  'Echocardiogram',
  'Other',
];

const bodyParts = [
  'Head',
  'Chest',
  'Abdomen',
  'Spine',
  'Pelvis',
  'Upper Extremity',
  'Lower Extremity',
  'Other',
];

const MahletImagingOrderForm: React.FC<ImagingOrderFormProps> = ({ onClose, onOrderCreated }) => {
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [imagingType, setImagingType] = useState('X-Ray');
  const [bodyPart, setBodyPart] = useState('Chest');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [orderedBy, setOrderedBy] = useState('Dr. Natan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientName || !patientId || !imagingType || !bodyPart || !clinicalInfo || !orderedBy) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real application, this would be an API call
      // const response = await axios.post('/api/imaging/orders', {
      //   patientName,
      //   patientId,
      //   imagingType,
      //   bodyPart,
      //   clinicalInfo,
      //   orderedBy,
      //   date: new Date().toISOString().split('T')[0],
      //   status: 'pending'
      // });
      
      // Simulate successful API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Imaging order created successfully');
      onOrderCreated();
      onClose();
    } catch (err) {
      console.error('Error creating imaging order:', err);
      toast.error('Failed to create imaging order');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-muted bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-primary-foreground rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Imaging Order</h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Patient Name*
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Patient ID*
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Imaging Type*
              </label>
              <select
                value={imagingType}
                onChange={(e) => setImagingType(e.target.value)}
                className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
                required
              >
                {imagingTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Body Part*
              </label>
              <select
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
                required
              >
                {bodyParts.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Clinical Information*
              </label>
              <textarea
                value={clinicalInfo}
                onChange={(e) => setClinicalInfo(e.target.value)}
                className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
                rows={3}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Ordered By*
              </label>
              <input
                type="text"
                value={orderedBy}
                onChange={(e) => setOrderedBy(e.target.value)}
                className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
                required
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border/40 rounded-md text-muted-foreground hover:bg-muted/10"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MahletImagingOrderForm; 