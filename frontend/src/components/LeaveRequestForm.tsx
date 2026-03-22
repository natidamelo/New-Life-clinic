import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Calendar, Upload, AlertCircle, CheckCircle, XCircle, Globe } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/apiService';
import EthiopianDatePicker from './EthiopianDatePickerSimple';
import { formatEthiopianDate, type EthiopianDate } from '../utils/ethiopianCalendar';

interface LeaveBalance {
  annual: { allocated: number; used: number; pending: number };
  sick: { allocated: number; used: number; pending: number };
  personal: { allocated: number; used: number; pending: number };
  maternity: { allocated: number; used: number; pending: number };
  paternity: { allocated: number; used: number; pending: number };
  bereavement: { allocated: number; used: number; pending: number };
  other: { allocated: number; used: number; pending: number };
}

interface LeaveRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [useEthiopianCalendar, setUseEthiopianCalendar] = useState(true);
  const [ethiopianStartDate, setEthiopianStartDate] = useState<EthiopianDate | null>(null);
  const [ethiopianEndDate, setEthiopianEndDate] = useState<EthiopianDate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: '',
    notes: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  // Fetch leave balance on component mount
  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      const response = await api.get('/api/leave/my-balance');
      setLeaveBalance(response.data.data?.balance || response.data.balance);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave balance",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value
      }
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return formData.isHalfDay ? 0.5 : diffDays;
  };

  const getAvailableDays = () => {
    if (!leaveBalance || !formData.leaveType) return 0;
    
    const type = formData.leaveType as keyof LeaveBalance;
    const balance = leaveBalance[type];
    return balance.allocated - balance.used - balance.pending;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const requestedDays = calculateDays();
    const availableDays = getAvailableDays();

    if (requestedDays > availableDays) {
      toast({
        title: "Insufficient Leave Balance",
        description: `You only have ${availableDays} days available for ${formData.leaveType} leave`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('leaveType', formData.leaveType);
      formDataToSend.append('startDate', formData.startDate);
      formDataToSend.append('endDate', formData.endDate);
      formDataToSend.append('reason', formData.reason);
      formDataToSend.append('isHalfDay', formData.isHalfDay.toString());
      
      if (formData.isHalfDay) {
        formDataToSend.append('halfDayType', formData.halfDayType);
      }
      
      formDataToSend.append('emergencyContact', JSON.stringify(formData.emergencyContact));
      
      if (formData.notes) {
        formDataToSend.append('notes', formData.notes);
      }

      // Add files
      selectedFiles.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      await api.post('/api/leave', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
        variant: "default"
      });

      // Reset form
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDayType: '',
        notes: '',
        emergencyContact: {
          name: '',
          phone: '',
          relationship: ''
        }
      });
      setSelectedFiles([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit leave request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave', color: 'bg-primary/20 text-primary' },
    { value: 'sick', label: 'Sick Leave', color: 'bg-destructive/20 text-destructive' },
    { value: 'personal', label: 'Personal Leave', color: 'bg-primary/20 text-primary' },
    { value: 'maternity', label: 'Maternity Leave', color: 'bg-pink-100 text-pink-800' },
    { value: 'paternity', label: 'Paternity Leave', color: 'bg-secondary/20 text-secondary-foreground' },
    { value: 'bereavement', label: 'Bereavement Leave', color: 'bg-muted/20 text-muted-foreground' },
    { value: 'other', label: 'Other', color: 'bg-accent/20 text-accent-foreground' }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Request Leave
        </CardTitle>
        <CardDescription>
          Submit a leave request for approval. Please ensure you have sufficient leave balance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Balance Display */}
          {leaveBalance && (
            <div className="bg-muted/10 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Your Leave Balance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(leaveBalance).map(([type, balance]) => (
                  <div key={type} className="text-center">
                    <div className="text-sm font-medium capitalize">{type}</div>
                    <div className="text-lg font-bold text-primary">
                      {balance.allocated - balance.used - balance.pending}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {balance.pending > 0 && `${balance.pending} pending`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type *</Label>
            <Select value={formData.leaveType} onValueChange={(value) => handleInputChange('leaveType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={type.color}>{type.label}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar Type Toggle */}
          <div className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <Label className="text-sm font-medium">Calendar Type:</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={useEthiopianCalendar}
                onCheckedChange={setUseEthiopianCalendar}
              />
              <span className="text-sm text-muted-foreground">
                {useEthiopianCalendar ? 'Ethiopian Calendar' : 'Gregorian Calendar'}
              </span>
            </div>
          </div>

          {/* Date Range */}
          {useEthiopianCalendar ? (
            // Ethiopian Calendar Date Pickers
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EthiopianDatePicker
                label="Start Date"
                value={formData.startDate ? new Date(formData.startDate) : null}
                onChange={(date, ethiopianDate) => {
                  if (date) {
                    handleInputChange('startDate', date.toISOString().split('T')[0]);
                    setEthiopianStartDate(ethiopianDate);
                  } else {
                    handleInputChange('startDate', '');
                    setEthiopianStartDate(null);
                  }
                }}
                required
                showGregorianEquivalent
              />
              
              <EthiopianDatePicker
                label="End Date"
                value={formData.endDate ? new Date(formData.endDate) : null}
                onChange={(date, ethiopianDate) => {
                  if (date) {
                    handleInputChange('endDate', date.toISOString().split('T')[0]);
                    setEthiopianEndDate(ethiopianDate);
                  } else {
                    handleInputChange('endDate', '');
                    setEthiopianEndDate(null);
                  }
                }}
                required
                showGregorianEquivalent
              />
            </div>
          ) : (
            // Gregorian Calendar Date Inputs
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* Ethiopian Date Display (when using Ethiopian calendar) */}
          {useEthiopianCalendar && (ethiopianStartDate || ethiopianEndDate) && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <h4 className="font-medium text-primary mb-2">Ethiopian Calendar Dates:</h4>
              <div className="space-y-1 text-sm text-primary">
                {ethiopianStartDate && (
                  <div>Start: {formatEthiopianDate(ethiopianStartDate, 'long')}</div>
                )}
                {ethiopianEndDate && (
                  <div>End: {formatEthiopianDate(ethiopianEndDate, 'long')}</div>
                )}
              </div>
            </div>
          )}

          {/* Half Day Option */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isHalfDay"
              checked={formData.isHalfDay}
              onCheckedChange={(checked) => handleInputChange('isHalfDay', checked)}
            />
            <Label htmlFor="isHalfDay">Half Day</Label>
          </div>

          {formData.isHalfDay && (
            <div className="space-y-2">
              <Label htmlFor="halfDayType">Half Day Type</Label>
              <Select value={formData.halfDayType} onValueChange={(value) => handleInputChange('halfDayType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select half day type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Days Calculation */}
          {formData.startDate && formData.endDate && (
            <div className="bg-primary/10 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Days Requested:</span>
                <span className="text-lg font-bold text-primary">{calculateDays()} days</span>
              </div>
              {formData.leaveType && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm">Available Days:</span>
                  <span className={`text-sm font-medium ${getAvailableDays() >= calculateDays() ? 'text-primary' : 'text-destructive'}`}>
                    {getAvailableDays()} days
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Please provide a detailed reason for your leave request..."
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.reason.length}/500 characters
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <Label>Emergency Contact (Optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Name</Label>
                <Input
                  id="contactName"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactRelationship">Relationship</Label>
                <Input
                  id="contactRelationship"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                  placeholder="e.g., Spouse, Parent"
                />
              </div>
            </div>
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <div className="border-2 border-dashed border-border/40 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <div className="mt-2">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary hover:text-primary">Upload files</span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, JPG, PNG, GIF up to 5MB each
                  </p>
                </div>
              </div>
            </div>
            
            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files:</Label>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/10 p-2 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeaveRequestForm;
