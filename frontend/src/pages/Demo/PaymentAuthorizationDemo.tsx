import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { CheckCircle, XCircle, Clock, AlertTriangle, DollarSign } from 'lucide-react';

const PaymentAuthorizationDemo: React.FC = () => {
  const [paymentAmount, setPaymentAmount] = useState(1500);
  
  // Mock medication data
  const medicationData = {
    patientName: "Natan KInfe",
    medication: "Ceftriaxone",
    totalAmount: 3500,
    totalDays: 7,
    dosesPerDay: 2, // BID
    frequency: "BID (Twice daily)"
  };
  
  const calculateAuthorization = () => {
    const { totalAmount, totalDays, dosesPerDay } = medicationData;
    const totalDoses = totalDays * dosesPerDay;
    const costPerDose = totalAmount / totalDoses;
    const costPerDay = dosesPerDay * costPerDose;
    
    const paidDays = Math.min(Math.floor(paymentAmount / costPerDay), totalDays);
    const paidDoses = paidDays * dosesPerDay;
    const unpaidDays = totalDays - paidDays;
    const unpaidDoses = unpaidDays * dosesPerDay;
    const outstandingAmount = totalAmount - paymentAmount;
    
    return {
      totalDoses,
      costPerDose,
      costPerDay,
      paidDays,
      paidDoses,
      unpaidDays,
      unpaidDoses,
      outstandingAmount,
      isPartialPayment: paidDays < totalDays
    };
  };
  
  const auth = calculateAuthorization();
  
  const createSchedule = () => {
    const schedule = [];
    for (let day = 1; day <= medicationData.totalDays; day++) {
      const canAdminister = day <= auth.paidDays;
      
      // Morning dose
      schedule.push({
        day,
        time: "09:00",
        dose: "Morning",
        canAdminister,
        status: canAdminister ? "Authorized" : "Payment Required"
      });
      
      // Evening dose
      schedule.push({
        day,
        time: "21:00",
        dose: "Evening",
        canAdminister,
        status: canAdminister ? "Authorized" : "Payment Required"
      });
    }
    return schedule;
  };
  
  const schedule = createSchedule();
  
  return (
    <div className="min-h-screen bg-muted/10 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-muted-foreground mb-2">
            Medication Payment Authorization Demo
          </h1>
          <p className="text-muted-foreground">
            This demo shows how partial payments work with medication administration authorization
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Payment Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Patient: {medicationData.patientName}</h3>
                <p className="text-sm text-primary">Medication: {medicationData.medication}</p>
                <p className="text-sm text-primary">Frequency: {medicationData.frequency}</p>
                <p className="text-sm text-primary">Duration: {medicationData.totalDays} days</p>
                <p className="text-sm text-primary font-semibold">Total Cost: ETB {medicationData.totalAmount.toFixed(2)}</p>
              </div>
              
              <div>
                <Label htmlFor="payment">Payment Amount (ETB)</Label>
                <Input
                  id="payment"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  min="0"
                  max={medicationData.totalAmount}
                  step="100"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/10 rounded">
                  <div className="text-sm text-muted-foreground">Cost per Day</div>
                  <div className="font-semibold">ETB {auth.costPerDay.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-muted/10 rounded">
                  <div className="text-sm text-muted-foreground">Cost per Dose</div>
                  <div className="font-semibold">ETB {auth.costPerDose.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => setPaymentAmount(1500)} variant="outline" size="sm">
                  Pay ETB 1500
                </Button>
                <Button onClick={() => setPaymentAmount(2500)} variant="outline" size="sm">
                  Pay ETB 2500
                </Button>
                <Button onClick={() => setPaymentAmount(3500)} variant="outline" size="sm">
                  Pay Full Amount
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Authorization Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Authorization Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded border border-primary/30">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-primary mr-2" />
                    <div>
                      <div className="font-semibold text-primary">Authorized</div>
                      <div className="text-sm text-primary">Days 1-{auth.paidDays}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">{auth.paidDoses} doses</div>
                    <div className="text-sm text-primary">Can administer</div>
                  </div>
                </div>
                
                {auth.isPartialPayment && (
                  <div className="flex items-center justify-between p-3 bg-destructive/10 rounded border border-destructive/30">
                    <div className="flex items-center">
                      <XCircle className="w-5 h-5 text-destructive mr-2" />
                      <div>
                        <div className="font-semibold text-destructive">Unauthorized</div>
                        <div className="text-sm text-destructive">Days {auth.paidDays + 1}-{medicationData.totalDays}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-destructive">{auth.unpaidDoses} doses</div>
                      <div className="text-sm text-destructive">Cannot administer</div>
                    </div>
                  </div>
                )}
              </div>
              
              {auth.isPartialPayment && (
                <div className="p-3 bg-accent/10 rounded border border-yellow-200">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-accent-foreground mr-2" />
                    <div>
                      <div className="font-semibold text-accent-foreground">Outstanding Payment</div>
                      <div className="text-sm text-accent-foreground">
                        ETB {auth.outstandingAmount.toFixed(2)} needed for remaining {auth.unpaidDays} days
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                <div className="font-semibold mb-1">Administration Rules:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Nurses can only administer doses for paid days</li>
                  <li>System blocks administration for unpaid days</li>
                  <li>Inventory deducted only when administered</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Medication Schedule */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>7-Day Medication Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map(day => {
                const daySchedule = schedule.filter(s => s.day === day);
                const canAdminister = day <= auth.paidDays;
                
                return (
                  <div key={day} className={`p-4 rounded-lg border-2 ${
                    canAdminister 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-destructive/10 border-destructive/30'
                  }`}>
                    <div className="text-center mb-3">
                      <div className="font-semibold text-lg">Day {day}</div>
                      <div className={`text-sm font-medium ${
                        canAdminister ? 'text-primary' : 'text-destructive'
                      }`}>
                        {canAdminister ? '✅ Authorized' : '❌ Payment Required'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {daySchedule.map((dose, index) => (
                        <div key={index} className={`p-2 rounded text-sm ${
                          dose.canAdminister 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          <div className="font-medium">{dose.time}</div>
                          <div className="text-xs">{dose.dose}</div>
                          <div className="text-xs font-medium">{dose.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Nurse Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Nurse Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-semibold text-primary mb-2">Current Status:</h3>
              <p className="text-primary mb-2">
                Patient has paid for <strong>{auth.paidDays} days</strong> of treatment 
                ({auth.paidDoses} doses authorized).
              </p>
              
              {auth.isPartialPayment ? (
                <div className="space-y-2">
                  <p className="text-primary">
                    <strong>⚠️ Partial Payment:</strong> Only administer doses for Days 1-{auth.paidDays}.
                  </p>
                  <p className="text-primary">
                    <strong>🚫 Restricted:</strong> Cannot administer doses for Days {auth.paidDays + 1}-{medicationData.totalDays} 
                    until additional payment of ETB {auth.outstandingAmount.toFixed(2)} is received.
                  </p>
                </div>
              ) : (
                <p className="text-primary">
                  <strong>✅ Fully Paid:</strong> All doses can be administered as scheduled.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentAuthorizationDemo; 