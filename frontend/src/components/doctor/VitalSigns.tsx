import React from 'react';
import Card from '../Card';

interface VitalSignsProps {
  selectedPatient: string | null;
  onPatientSelect: (patientId: string) => void;
}

const VitalSigns: React.FC<VitalSignsProps> = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Patient Vital Signs</h1>
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Latest Vital Signs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-2xl font-semibold text-primary">37.2°C</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                <p className="text-2xl font-semibold text-primary">120/80 mmHg</p>
              </div>
              <div className="bg-secondary/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Heart Rate</p>
                <p className="text-2xl font-semibold text-secondary-foreground">72 bpm</p>
              </div>
              <div className="bg-accent/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Respiratory Rate</p>
                <p className="text-2xl font-semibold text-accent-foreground">16 /min</p>
              </div>
              <div className="bg-destructive/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Oxygen Saturation</p>
                <p className="text-2xl font-semibold text-destructive">98%</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Vital Signs History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Temperature</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Blood Pressure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Heart Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Respiratory Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">O2 Saturation</th>
                  </tr>
                </thead>
                <tbody className="bg-primary-foreground divide-y divide-gray-200">
                  {/* Sample row - replace with actual data */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">2024-04-07 09:30</td>
                    <td className="px-6 py-4 whitespace-nowrap">37.2°C</td>
                    <td className="px-6 py-4 whitespace-nowrap">120/80 mmHg</td>
                    <td className="px-6 py-4 whitespace-nowrap">72 bpm</td>
                    <td className="px-6 py-4 whitespace-nowrap">16 /min</td>
                    <td className="px-6 py-4 whitespace-nowrap">98%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VitalSigns; 