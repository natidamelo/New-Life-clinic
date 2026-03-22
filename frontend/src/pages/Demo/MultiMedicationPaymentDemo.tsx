import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import MultiMedicationPaymentSummary from '../../components/Reception/MultiMedicationPaymentSummary';

const MultiMedicationPaymentDemo: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<number>(1);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [currentData, setCurrentData] = useState<any>(null);

  // Scenario 1: Doctor orders 2 medications
  const scenario1Data = {
    prescription: {
      id: 'PRES-001',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      medications: [
        {
          id: 'MED-001',
          name: 'Ceftriaxone',
          frequency: 'BID',
          duration: '7 days',
          price: 30,
          quantity: 14,
          instructions: 'Take with food'
        },
        {
          id: 'MED-002',
          name: 'Paracetamol',
          frequency: 'TID',
          duration: '5 days',
          price: 5,
          quantity: 15,
          instructions: 'Take after meals'
        }
      ]
    },
    totalCost: 495, // (30 * 14) + (5 * 15) = 420 + 75
    scenarios: [
      {
        name: 'Partial Payment - ETB 300',
        amountPaid: 300,
        description: 'Patient pays ETB 300 of ETB 495 total'
      },
      {
        name: 'Full Payment - ETB 495',
        amountPaid: 495,
        description: 'Patient pays full amount'
      },
      {
        name: 'Specific Medication Payment',
        amountPaid: 420,
        description: 'Patient pays only for Ceftriaxone (ETB 420)',
        breakdown: [
          { medicationName: 'Ceftriaxone', amountPaid: 420 },
          { medicationName: 'Paracetamol', amountPaid: 0 }
        ]
      }
    ]
  };

  // Scenario 2: Doctor orders 3 medications
  const scenario2Data = {
    prescription: {
      id: 'PRES-002',
      patientName: 'Sarah Johnson',
      doctorName: 'Dr. Johnson',
      medications: [
        {
          id: 'MED-003',
          name: 'Amoxicillin',
          frequency: 'TID',
          duration: '10 days',
          price: 15,
          quantity: 30,
          instructions: 'Complete full course'
        },
        {
          id: 'MED-004',
          name: 'Ibuprofen',
          frequency: 'BID',
          duration: '7 days',
          price: 8,
          quantity: 14,
          instructions: 'Take with food to avoid stomach upset'
        },
        {
          id: 'MED-005',
          name: 'Omeprazole',
          frequency: 'Once daily',
          duration: '14 days',
          price: 20,
          quantity: 14,
          instructions: 'Take before breakfast'
        }
      ]
    },
    totalCost: 842, // (15 * 30) + (8 * 14) + (20 * 14) = 450 + 112 + 280
    scenarios: [
      {
        name: 'Partial Payment - ETB 500',
        amountPaid: 500,
        description: 'Patient pays ETB 500 of ETB 842 total'
      },
      {
        name: 'Two Medications Full Payment',
        amountPaid: 562,
        description: 'Patient pays for Amoxicillin and Ibuprofen only',
        breakdown: [
          { medicationName: 'Amoxicillin', amountPaid: 450 },
          { medicationName: 'Ibuprofen', amountPaid: 112 },
          { medicationName: 'Omeprazole', amountPaid: 0 }
        ]
      },
      {
        name: 'Graduated Payment',
        amountPaid: 600,
        description: 'Different payment amounts for each medication',
        breakdown: [
          { medicationName: 'Amoxicillin', amountPaid: 300 }, // ~6.67 days
          { medicationName: 'Ibuprofen', amountPaid: 112 },   // Full 7 days
          { medicationName: 'Omeprazole', amountPaid: 188 }   // ~9.4 days
        ]
      }
    ]
  };

  const scenarios = [scenario1Data, scenario2Data];
  const currentScenario = scenarios[selectedScenario - 1];

  const calculatePaymentResult = (scenario: any, paymentData: any) => {
    const { prescription } = scenario;
    const { amountPaid, breakdown } = paymentData;

    // Extract medication details
    const medications = prescription.medications.map((med: any) => {
      const dosesPerDay = parseFrequency(med.frequency);
      const totalDays = parseDuration(med.duration);
      const totalCost = med.price * med.quantity;
      const costPerDose = totalCost / (totalDays * dosesPerDay);

      return {
        medicationName: med.name,
        medicationId: med.id,
        totalDays,
        dosesPerDay,
        costPerDose,
        totalCost,
        frequency: med.frequency,
        instructions: med.instructions
      };
    });

    // Calculate payment distribution
    let paymentDistribution;
    if (breakdown) {
      paymentDistribution = breakdown.map((item: any) => {
        const medication = medications.find(m => m.medicationName === item.medicationName);
        return {
          medicationName: item.medicationName,
          medicationId: medication?.medicationId || '',
          amountAllocated: item.amountPaid,
          totalCost: medication?.totalCost || 0,
          paymentPercentage: medication ? (item.amountPaid / medication.totalCost) * 100 : 0
        };
      });
    } else {
      // Proportional distribution
      const totalCost = medications.reduce((sum, med) => sum + med.totalCost, 0);
      paymentDistribution = medications.map(med => ({
        medicationName: med.medicationName,
        medicationId: med.medicationId,
        amountAllocated: (med.totalCost / totalCost) * amountPaid,
        totalCost: med.totalCost,
        paymentPercentage: ((med.totalCost / totalCost) * amountPaid / med.totalCost) * 100
      }));
    }

    // Create payment plans
    const medicationPaymentPlans = medications.map(med => {
      const payment = paymentDistribution.find(p => p.medicationName === med.medicationName);
      const costPerDay = med.dosesPerDay * med.costPerDose;
      const paidDays = Math.min(
        Math.floor(payment!.amountAllocated / costPerDay),
        med.totalDays
      );
      const paidDoses = paidDays * med.dosesPerDay;
      const unpaidDays = med.totalDays - paidDays;
      const unpaidDoses = unpaidDays * med.dosesPerDay;
      const paidAmount = paidDoses * med.costPerDose;
      const outstandingAmount = med.totalCost - paidAmount;

      return {
        medicationName: med.medicationName,
        medicationId: med.medicationId,
        totalDays: med.totalDays,
        paidDays,
        unpaidDays,
        dosesPerDay: med.dosesPerDay,
        totalDoses: med.totalDays * med.dosesPerDay,
        paidDoses,
        unpaidDoses,
        costPerDose: med.costPerDose,
        totalCost: med.totalCost,
        paidAmount,
        outstandingAmount,
        paymentStatus: paidDays >= med.totalDays ? 'fully_paid' : 
                      paidDays > 0 ? 'partially_paid' : 'unpaid',
        frequency: med.frequency,
        instructions: med.instructions
      };
    });

    // Create overall summary
    const fullyPaidMedications = medicationPaymentPlans.filter(p => p.paymentStatus === 'fully_paid').length;
    const partiallyPaidMedications = medicationPaymentPlans.filter(p => p.paymentStatus === 'partially_paid').length;
    const unpaidMedications = medicationPaymentPlans.filter(p => p.paymentStatus === 'unpaid').length;
    const totalCost = medicationPaymentPlans.reduce((sum, p) => sum + p.totalCost, 0);
    const totalPaid = medicationPaymentPlans.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalOutstanding = medicationPaymentPlans.reduce((sum, p) => sum + p.outstandingAmount, 0);
    const totalAuthorizedDoses = medicationPaymentPlans.reduce((sum, p) => sum + p.paidDoses, 0);
    const totalUnauthorizedDoses = medicationPaymentPlans.reduce((sum, p) => sum + p.unpaidDoses, 0);

    const overallSummary = {
      totalMedications: medicationPaymentPlans.length,
      fullyPaidMedications,
      partiallyPaidMedications,
      unpaidMedications,
      totalCost,
      totalPaid,
      totalOutstanding,
      paymentPercentage: (totalPaid / totalCost) * 100,
      totalAuthorizedDoses,
      totalUnauthorizedDoses,
      overallStatus: fullyPaidMedications === medicationPaymentPlans.length ? 'fully_paid' : 
                    partiallyPaidMedications > 0 || fullyPaidMedications > 0 ? 'partially_paid' : 'unpaid',
      medicationBreakdown: medicationPaymentPlans.map(plan => ({
        medicationName: plan.medicationName,
        status: plan.paymentStatus,
        paidDays: plan.paidDays,
        totalDays: plan.totalDays,
        authorizedDoses: plan.paidDoses,
        unauthorizedDoses: plan.unpaidDoses,
        outstandingAmount: plan.outstandingAmount
      }))
    };

    return {
      medicationPaymentPlans,
      paymentDistribution,
      overallSummary
    };
  };

  const parseFrequency = (frequency: string): number => {
    const freq = frequency.toLowerCase();
    if (freq.includes('bid') || freq.includes('twice')) return 2;
    if (freq.includes('tid') || freq.includes('three')) return 3;
    if (freq.includes('qid') || freq.includes('four')) return 4;
    if (freq.includes('once') || freq.includes('daily')) return 1;
    return 1;
  };

  const parseDuration = (duration: string): number => {
    const match = duration.match(/(\d+)\s*(day|week|month)/);
    if (match) {
      const number = parseInt(match[1]);
      const unit = match[2];
      if (unit === 'day') return number;
      if (unit === 'week') return number * 7;
      if (unit === 'month') return number * 30;
    }
    return 7;
  };

  const handleScenarioTest = (scenarioIndex: number) => {
    const scenario = currentScenario.scenarios[scenarioIndex];
    const result = calculatePaymentResult(currentScenario, scenario);
    setCurrentData(result);
    setPaymentAmount(scenario.amountPaid);
  };

  const handleCustomPayment = () => {
    if (paymentAmount > 0) {
      const result = calculatePaymentResult(currentScenario, { amountPaid: paymentAmount });
      setCurrentData(result);
    }
  };

  const handleAdditionalPayment = (medicationName: string, amount: number) => {
    console.log(`Additional payment for ${medicationName}: ETB ${amount}`);
    // In a real app, this would trigger an API call
    alert(`Additional payment of ETB ${amount} for ${medicationName} would be processed here.`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Multi-Medication Payment Authorization Demo</h1>
        <p className="text-muted-foreground">
          Demonstrates how the system handles payment authorization when a doctor orders multiple medications
        </p>
      </div>

      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={`p-4 border rounded cursor-pointer transition-all ${
                selectedScenario === 1 ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-border/40'
              }`}
              onClick={() => setSelectedScenario(1)}
            >
              <h3 className="font-semibold mb-2">Scenario 1: 2 Medications</h3>
              <div className="space-y-1 text-sm">
                <div>• Ceftriaxone: BID for 7 days (ETB 420)</div>
                <div>• Paracetamol: TID for 5 days (ETB 75)</div>
                <div className="font-medium">Total: ETB 495</div>
              </div>
            </div>
            
            <div 
              className={`p-4 border rounded cursor-pointer transition-all ${
                selectedScenario === 2 ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-border/40'
              }`}
              onClick={() => setSelectedScenario(2)}
            >
              <h3 className="font-semibold mb-2">Scenario 2: 3 Medications</h3>
              <div className="space-y-1 text-sm">
                <div>• Amoxicillin: TID for 10 days (ETB 450)</div>
                <div>• Ibuprofen: BID for 7 days (ETB 112)</div>
                <div>• Omeprazole: Once daily for 14 days (ETB 280)</div>
                <div className="font-medium">Total: ETB 842</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescription Details */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground">Patient</div>
              <div className="font-medium">{currentScenario.prescription.patientName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Doctor</div>
              <div className="font-medium">{currentScenario.prescription.doctorName}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Medications Ordered:</h4>
            {currentScenario.prescription.medications.map((med: any, index: number) => (
              <div key={med.id} className="border rounded p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{med.name}</div>
                    <div className="text-sm text-muted-foreground">{med.frequency} for {med.duration}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">ETB {(med.price * med.quantity).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">ETB {med.price}/dose × {med.quantity} doses</div>
                  </div>
                </div>
                {med.instructions && (
                  <div className="text-sm text-primary italic">{med.instructions}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-muted/10 rounded">
            <div className="font-semibold">Total Prescription Cost: ETB {currentScenario.totalCost.toFixed(2)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Test Payment Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentScenario.scenarios.map((scenario: any, index: number) => (
                <div key={index} className="border rounded p-3">
                  <h4 className="font-semibold mb-2">{scenario.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                  <Button 
                    onClick={() => handleScenarioTest(index)}
                    className="w-full"
                    variant="outline"
                  >
                    Test This Scenario
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Custom Payment Amount</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="Enter payment amount"
                  className="flex-1 p-2 border rounded"
                  min="0"
                  step="0.01"
                />
                <Button onClick={handleCustomPayment} disabled={paymentAmount <= 0}>
                  Test Custom Payment
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {currentData && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Payment Authorization Results</h2>
          <MultiMedicationPaymentSummary
            medicationPaymentPlans={currentData.medicationPaymentPlans}
            paymentDistribution={currentData.paymentDistribution}
            overallSummary={currentData.overallSummary}
            onAdditionalPayment={handleAdditionalPayment}
          />
        </div>
      )}

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>How This Works in Practice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold text-primary">For Nurses:</h4>
              <p className="text-sm">
                The system shows exactly which doses can be administered based on payment status. 
                Nurses can only give medications for days that have been paid for.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold text-primary">For Reception/Billing:</h4>
              <p className="text-sm">
                Clear visibility of payment status for each medication. Can process additional payments 
                for specific medications to unlock more doses.
              </p>
            </div>
            
            <div className="border-l-4 border-secondary pl-4">
              <h4 className="font-semibold text-secondary-foreground">For Patients:</h4>
              <p className="text-sm">
                Flexibility to pay for medications separately or partially. Can prioritize which 
                medications to pay for first based on urgency.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiMedicationPaymentDemo; 