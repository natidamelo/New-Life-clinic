import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface PrescriptionPaymentPageProps {}

const PrescriptionPaymentPage: React.FC<PrescriptionPaymentPageProps> = () => {
  const { prescriptionId } = useParams<{ prescriptionId: string }>();
  const navigate = useNavigate();

  const handleBackToBilling = () => {
    navigate('/billing');
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Prescription Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Prescription Payment processing for ID: {prescriptionId}</p>
            <p className="text-muted-foreground">
              This feature is currently under development. Please use the main billing dashboard 
              to process payments.
            </p>
            <Button onClick={handleBackToBilling} variant="outline">
              Back to Billing Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrescriptionPaymentPage;
 