import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';

interface MedicationPaymentPlan {
  medicationName: string;
  medicationId: string;
  totalDays: number;
  paidDays: number;
  unpaidDays: number;
  dosesPerDay: number;
  totalDoses: number;
  paidDoses: number;
  unpaidDoses: number;
  costPerDose: number;
  totalCost: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: 'fully_paid' | 'partially_paid' | 'unpaid';
  frequency: string;
  instructions?: string;
}

interface PaymentDistribution {
  medicationName: string;
  medicationId: string;
  amountAllocated: number;
  totalCost: number;
  paymentPercentage: number;
}

interface OverallSummary {
  totalMedications: number;
  fullyPaidMedications: number;
  partiallyPaidMedications: number;
  unpaidMedications: number;
  totalCost: number;
  totalPaid: number;
  totalOutstanding: number;
  paymentPercentage: number;
  totalAuthorizedDoses: number;
  totalUnauthorizedDoses: number;
  overallStatus: 'fully_paid' | 'partially_paid' | 'unpaid';
  medicationBreakdown: Array<{
    medicationName: string;
    status: string;
    paidDays: number;
    totalDays: number;
    authorizedDoses: number;
    unauthorizedDoses: number;
    outstandingAmount: number;
  }>;
}

interface MultiMedicationPaymentSummaryProps {
  medicationPaymentPlans: MedicationPaymentPlan[];
  paymentDistribution: PaymentDistribution[];
  overallSummary: OverallSummary;
  onAdditionalPayment?: (medicationName: string, amount: number) => void;
}

const MultiMedicationPaymentSummary: React.FC<MultiMedicationPaymentSummaryProps> = ({
  medicationPaymentPlans,
  paymentDistribution,
  overallSummary,
  onAdditionalPayment
}) => {
  const [selectedMedication, setSelectedMedication] = useState<string>('');
  const [additionalAmount, setAdditionalAmount] = useState<number>(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return 'bg-primary/20 text-primary';
      case 'partially_paid':
        return 'bg-accent/20 text-accent-foreground';
      case 'unpaid':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return '✅';
      case 'partially_paid':
        return '⚠️';
      case 'unpaid':
        return '❌';
      default:
        return '❓';
    }
  };

  const handleAdditionalPayment = () => {
    if (selectedMedication && additionalAmount > 0 && onAdditionalPayment) {
      onAdditionalPayment(selectedMedication, additionalAmount);
      setSelectedMedication('');
      setAdditionalAmount(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className="border-2 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💊</span>
            Multi-Medication Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {overallSummary.totalMedications}
              </div>
              <div className="text-sm text-muted-foreground">Total Medications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {overallSummary.fullyPaidMedications}
              </div>
              <div className="text-sm text-muted-foreground">Fully Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-foreground">
                {overallSummary.partiallyPaidMedications}
              </div>
              <div className="text-sm text-muted-foreground">Partially Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {overallSummary.unpaidMedications}
              </div>
              <div className="text-sm text-muted-foreground">Unpaid</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Payment Progress</span>
              <span>{overallSummary.paymentPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={overallSummary.paymentPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-lg font-semibold">ETB {overallSummary.totalCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Amount Paid</div>
              <div className="text-lg font-semibold text-primary">ETB {overallSummary.totalPaid.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Outstanding</div>
              <div className="text-lg font-semibold text-destructive">ETB {overallSummary.totalOutstanding.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Authorized Doses</div>
              <div className="text-lg font-semibold text-primary">
                {overallSummary.totalAuthorizedDoses} / {overallSummary.totalAuthorizedDoses + overallSummary.totalUnauthorizedDoses}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Medication Details */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {medicationPaymentPlans.map((plan, index) => (
              <Card key={plan.medicationId} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{plan.medicationName}</h3>
                      <Badge className={getStatusColor(plan.paymentStatus)}>
                        {getStatusIcon(plan.paymentStatus)} {plan.paymentStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Payment</div>
                      <div className="font-semibold">
                        ETB {plan.paidAmount.toFixed(2)} / ETB {plan.totalCost.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Frequency</div>
                      <div className="font-medium">{plan.frequency}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Days Covered</div>
                      <div className="font-medium">{plan.paidDays} / {plan.totalDays}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Authorized Doses</div>
                      <div className="font-medium text-primary">{plan.paidDoses}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Restricted Doses</div>
                      <div className="font-medium text-destructive">{plan.unpaidDoses}</div>
                    </div>
                  </div>

                  {plan.outstandingAmount > 0 && (
                    <div className="mt-3 p-2 bg-accent/10 rounded border-l-4 border-yellow-400">
                      <div className="text-sm">
                        <strong>Outstanding:</strong> ETB {plan.outstandingAmount.toFixed(2)} 
                        <span className="text-muted-foreground ml-2">
                          (covers {plan.unpaidDays} days, {plan.unpaidDoses} doses)
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {medicationPaymentPlans.map((plan, index) => (
            <Card key={plan.medicationId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">💊</span>
                  {plan.medicationName}
                  <Badge className={getStatusColor(plan.paymentStatus)}>
                    {getStatusIcon(plan.paymentStatus)} {plan.paymentStatus.replace('_', ' ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Frequency</div>
                    <div className="font-medium">{plan.frequency}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Doses per Day</div>
                    <div className="font-medium">{plan.dosesPerDay}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Cost per Dose</div>
                    <div className="font-medium">ETB {plan.costPerDose.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Days</div>
                    <div className="font-medium">{plan.totalDays}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Paid Days</div>
                    <div className="font-medium text-primary">{plan.paidDays}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Unpaid Days</div>
                    <div className="font-medium text-destructive">{plan.unpaidDays}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Payment Progress</span>
                    <span>{((plan.paidAmount / plan.totalCost) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(plan.paidAmount / plan.totalCost) * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Financial Summary</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span>ETB {plan.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span className="text-primary">ETB {plan.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Outstanding:</span>
                        <span className="text-destructive">ETB {plan.outstandingAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Dose Authorization</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Doses:</span>
                        <span>{plan.totalDoses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Authorized:</span>
                        <span className="text-primary">{plan.paidDoses}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Restricted:</span>
                        <span className="text-destructive">{plan.unpaidDoses}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {plan.instructions && (
                  <div className="mt-4 p-3 bg-primary/10 rounded">
                    <div className="text-sm">
                      <strong>Instructions:</strong> {plan.instructions}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Additional Payment Section */}
      {overallSummary.totalOutstanding > 0 && (
        <Card className="border-2 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              Additional Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Medication for Additional Payment
                </label>
                <select
                  value={selectedMedication}
                  onChange={(e) => setSelectedMedication(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select medication...</option>
                  {medicationPaymentPlans
                    .filter(plan => plan.outstandingAmount > 0)
                    .map(plan => (
                      <option key={plan.medicationId} value={plan.medicationName}>
                        {plan.medicationName} (Outstanding: ETB {plan.outstandingAmount.toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional Amount (ETB)
                </label>
                <input
                  type="number"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  min="0"
                  step="0.01"
                />
              </div>

              <button
                onClick={handleAdditionalPayment}
                disabled={!selectedMedication || additionalAmount <= 0}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded disabled:bg-muted/50"
              >
                Process Additional Payment
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {overallSummary.unpaidMedications > 0 && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertDescription>
            <strong>Payment Required:</strong> {overallSummary.unpaidMedications} medication(s) 
            have no payment coverage. Nurses cannot administer these medications until payment is received.
          </AlertDescription>
        </Alert>
      )}

      {overallSummary.partiallyPaidMedications > 0 && (
        <Alert className="border-yellow-200 bg-accent/10">
          <AlertDescription>
            <strong>Partial Payment:</strong> {overallSummary.partiallyPaidMedications} medication(s) 
            have partial payment coverage. Nurses can only administer doses for paid days.
          </AlertDescription>
        </Alert>
      )}

      {overallSummary.overallStatus === 'fully_paid' && (
        <Alert className="border-primary/30 bg-primary/10">
          <AlertDescription>
            <strong>Fully Paid:</strong> All medications are fully paid. 
            Nurses can administer all prescribed doses without restrictions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MultiMedicationPaymentSummary; 