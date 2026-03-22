import React from 'react';
import Card from '../Card';

interface ImagingProps {
  selectedPatient: string | null;
  onPatientSelect: (patientId: string) => void;
}

const Imaging = () => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Imaging Records</h1>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary">
          Order New Imaging
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Imaging Orders</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-primary-foreground divide-y divide-gray-200">
                  {/* Sample row - replace with actual data */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">2024-04-07</td>
                    <td className="px-6 py-4 whitespace-nowrap">John Doe</td>
                    <td className="px-6 py-4 whitespace-nowrap">X-Ray</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent-foreground">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-primary hover:text-primary">View</button>
                    </td>
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

export default Imaging; 