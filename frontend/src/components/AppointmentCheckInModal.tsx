import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'react-hot-toast';
import api from '../services/api';

interface AppointmentCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    patientName: string;
    doctorName: string;
    type: string;
    appointmentDateTime: string;
    status: string;
    selectedLabService?: {
      _id: string;
      name: string;
      price: number;
      category: string;
      description?: string;
    };
    selectedImagingService?: {
      _id: string;
      name: string;
      price: number;
      category: string;
      description?: string;
    };
  } | null;
  onCheckInSuccess: () => void;
}

const AppointmentCheckInModal: React.FC<AppointmentCheckInModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onCheckInSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [servicePrice, setServicePrice] = useState(500);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [loadingService, setLoadingService] = useState(false);

  // Define fallback appointment pricing
  const appointmentPricing = {
    'consultation': 500,
    'follow-up': 300,
    'emergency': 800,
    'routine': 400,
    'specialist': 600,
    'New Patient': 500,
    'Follow-up': 300,
    'Check-up': 400,
    'Procedure': 600,
    'Emergency': 800
  };

  // Get service data from appointment when it changes
  useEffect(() => {
    if (!appointment) {
      console.log('❌ No appointment provided');
      return;
    }

    console.log('🔍 [AppointmentCheckInModal] Processing appointment:', appointment);
    console.log('🔍 [AppointmentCheckInModal] Appointment type:', appointment.type);
    console.log('🔍 [AppointmentCheckInModal] Selected lab service:', appointment.selectedLabService);
    console.log('🔍 [AppointmentCheckInModal] Selected imaging service:', appointment.selectedImagingService);
    console.log('🔍 [AppointmentCheckInModal] Appointment ID:', (appointment as any).id || (appointment as any)._id);
    console.log('🔍 [AppointmentCheckInModal] Full appointment keys:', Object.keys(appointment));

    // Determine which service to use based on appointment type
    let selectedService = null;
    
    if (appointment.type === 'lab-test' && appointment.selectedLabService) {
      selectedService = appointment.selectedLabService;
      console.log('✅ Using selected lab service:', selectedService);
    } else if (appointment.type === 'imaging' && appointment.selectedImagingService) {
      selectedService = appointment.selectedImagingService;
      console.log('✅ Using selected imaging service:', selectedService);
    }

    if (selectedService) {
      setServicePrice(selectedService.price);
      setServiceName(selectedService.name);
      setServiceDescription(selectedService.description || `${selectedService.name} - ${selectedService.category}`);
      console.log('✅ Set service data:', {
        price: selectedService.price,
        name: selectedService.name,
        description: selectedService.description
      });
    } else {
      // Fallback to hardcoded pricing for other appointment types
      const fallbackPrice = appointmentPricing[appointment.type] || 500;
      setServicePrice(fallbackPrice);
      setServiceName(`${appointment.type} Appointment`);
      setServiceDescription(`Standard ${appointment.type} appointment service`);
      console.log('⚠️ Using fallback pricing:', fallbackPrice);
    }
  }, [appointment]);

  // Use the service price from the appointment data
  const basePrice = servicePrice;

  const handleCheckIn = async () => {
    if (!appointment) return;

    setIsLoading(true);
    try {
      const checkInData: any = {
        paymentMethod: paymentMethod || 'cash',
        amountPaid: amountPaid ? parseFloat(amountPaid) : 0,
        notes: notes || ''
      };

      const appointmentId = (appointment as any).id || (appointment as any)._id;
      console.log('🔍 [AppointmentCheckInModal] Using appointment ID:', appointmentId);
      console.log('🔍 [AppointmentCheckInModal] Full appointment object:', appointment);
      
      const response = await api.post(`/api/appointment-payments/${appointmentId}/check-in`, checkInData);
      
      if (response.data.success) {
        toast.success('Appointment checked in successfully!');
        onCheckInSuccess();
        handleClose();
      } else {
        toast.error(response.data.message || 'Failed to check in appointment');
      }
    } catch (error: any) {
      console.error('Error checking in appointment:', error);
      toast.error(error.response?.data?.message || 'Failed to check in appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPaymentMethod('');
    setAmountPaid('');
    setNotes('');
    setShowPayment(false);
    onClose();
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Check In Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Patient</Label>
                  <p className="font-medium">{appointment.patientName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Doctor</Label>
                  <p className="font-medium">{appointment.doctorName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <Badge variant="secondary">{appointment.type}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date & Time</Label>
                  <p className="font-medium">
                    {new Date(appointment.appointmentDateTime).toLocaleDateString()} at{' '}
                    {new Date(appointment.appointmentDateTime).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service & Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Service & Payment</span>
                  <Badge variant="secondary" className="text-xs">
                    {appointment.type}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-lg font-bold">
                  ${basePrice}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Details */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Service Type:</span>
                  <span className="font-medium capitalize">{appointment.type}</span>
                </div>
                {serviceName && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Service Name:</span>
                    <span className="font-medium text-sm">{serviceName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Service Fee:</span>
                  <div className="flex items-center gap-2">
                    {loadingService ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="font-bold text-lg">${basePrice}</span>
                    )}
                  </div>
                </div>
                {serviceDescription && (
                  <div className="pt-2 border-t border-muted-foreground/20">
                    <span className="text-sm font-medium text-muted-foreground">Description:</span>
                    <p className="text-sm text-muted-foreground mt-1">{serviceDescription}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  This payment covers the {appointment.type} service for your appointment
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includePayment"
                  checked={showPayment}
                  onChange={(e) => setShowPayment(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="includePayment">Process payment now</Label>
              </div>

              {showPayment && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="bank_transfer_dashen">Bank Transfer - Dashen Bank</SelectItem>
                          <SelectItem value="bank_transfer_abyssinia">Bank Transfer - Abyssinia Bank</SelectItem>
                          <SelectItem value="bank_transfer_cbe">Bank Transfer - Commercial Bank of Ethiopia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amountPaid">Amount Paid</Label>
                      <Input
                        id="amountPaid"
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder={`${basePrice}`}
                        max={basePrice}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Payment notes..."
                      rows={2}
                    />
                  </div>
                  {amountPaid && parseFloat(amountPaid) > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Service Fee:</span>
                        <span className="font-medium">${basePrice}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Amount Paid:</span>
                        <span className="font-medium text-primary">${amountPaid}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">Balance Due:</span>
                          <span className={`font-bold ${Math.max(0, basePrice - parseFloat(amountPaid || '0')) === 0 ? 'text-green-600' : 'text-destructive'}`}>
                            ${Math.max(0, basePrice - parseFloat(amountPaid || '0'))}
                          </span>
                        </div>
                      </div>
                      {Math.max(0, basePrice - parseFloat(amountPaid || '0')) === 0 && (
                        <div className="text-xs text-green-600 font-medium text-center">
                          ✓ Service payment complete
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCheckIn} disabled={isLoading}>
            {isLoading ? 'Checking In...' : 'Check In Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentCheckInModal;
