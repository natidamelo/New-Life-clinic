import React, { useState, useEffect } from 'react';
import Table from '../Table';
import Button from '../Button';
import Spinner from '../Spinner';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      const data = await response.json();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  const handleView = (id: string) => {
    // Implement view functionality
    console.log('View patient:', id);
  };

  const handleEdit = (id: string) => {
    // Implement edit functionality
    console.log('Edit patient:', id);
  };

  const columns = [
    { 
      header: 'Name', 
      accessor: (patient: Patient) => (
        <div 
          className="cursor-pointer hover:text-primary"
          onClick={() => handleView(patient.id)}
        >
          {patient.name}
        </div>
      )
    },
    { header: 'Email', accessor: 'email' as keyof Patient },
    { header: 'Phone', accessor: 'phone' as keyof Patient },
    { header: 'Date of Birth', accessor: 'dateOfBirth' as keyof Patient },
    { header: 'Gender', accessor: 'gender' as keyof Patient },
    { header: 'Address', accessor: 'address' as keyof Patient },
    {
      header: 'Actions',
      accessor: (patient: Patient) => (
        <div className="flex space-x-2">
          <Button variant="primary" size="sm" onClick={() => handleView(patient.id)}>
            View
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(patient.id)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Button variant="primary" onClick={() => console.log('Add new patient')}>
          Add Patient
        </Button>
      </div>
      <Table
        data={patients}
        columns={columns}
      />
    </div>
  );
};

export default PatientList; 