import React, { useState, useEffect } from 'react';
// import { 
//   DocumentChartBarIcon, 
//   ArrowDownTrayIcon,
//   FunnelIcon,
//   MagnifyingGlassIcon
// } from '@heroicons/react/24/outline';
import patientService from '../../services/patientService';
import { toast } from 'react-toastify';

const PatientReports: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportType, setReportType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await patientService.getAllPatients(false, false);

      // The patientService returns an object that may contain the patients array
      // under either `patients` (preferred) or `data` (legacy).  Handle both
      // cases defensively so we never accidentally set `patients` to
      // undefined, which would break subsequent `.filter` calls.

      const fetchedPatients = (response as any)?.patients ?? (response as any)?.data ?? [];

      if (Array.isArray(fetchedPatients) && fetchedPatients.length >= 0) {
        setPatients(fetchedPatients);
      } else {
        toast.error('Failed to fetch patients – unexpected response format');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('An error occurred while fetching patient data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const idMatch = patient.patientId ? patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    return fullName.includes(searchTerm.toLowerCase()) || idMatch;
  });

  const getFilteredPatients = () => {
    switch (reportType) {
      case 'admitted':
        return filteredPatients.filter(p => p.status === 'Admitted');
      case 'discharged':
        return filteredPatients.filter(p => p.status === 'Discharged');
      case 'emergency':
        return filteredPatients.filter(p => p.priority === 'urgent');
      default:
        return filteredPatients;
    }
  };

  const handleDownloadReport = () => {
    toast.success('Report downloaded successfully');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-muted-foreground flex items-center gap-2">
            {/* <DocumentChartBarIcon className="h-8 w-8 text-teal-600" /> */}
            Patient Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            View and generate patient reports for monitoring and analysis
          </p>
        </div>
        
        <button 
          onClick={handleDownloadReport} 
          className="mt-4 md:mt-0 bg-teal-600 hover:bg-teal-700 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {/* <ArrowDownTrayIcon className="h-5 w-5" /> */}
          Download Report
        </button>
      </div>

      <div className="bg-primary-foreground rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              {/* <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 w-5 h-5" /> */}
              <input
                type="text"
                placeholder="Search patients by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border/30 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* <FunnelIcon className="h-5 w-5 text-muted-foreground" /> */}
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border border-border/30 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Patients</option>
              <option value="admitted">Admitted Patients</option>
              <option value="discharged">Discharged Patients</option>
              <option value="emergency">Emergency Patients</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading patient data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Patient ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date of Birth
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-primary-foreground divide-y divide-gray-200">
                {getFilteredPatients().map((patient) => (
                  <tr key={patient.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                      {patient.patientId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {patient.firstName} {patient.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1) || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        patient.status === 'Admitted' 
                          ? 'bg-primary/20 text-primary' 
                          : patient.status === 'Discharged' 
                            ? 'bg-muted/20 text-muted-foreground'
                            : 'bg-accent/20 text-accent-foreground'
                      }`}>
                        {patient.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        patient.priority === 'urgent' 
                          ? 'bg-destructive/20 text-destructive' 
                          : patient.priority === 'high'
                            ? 'bg-accent/20 text-accent-foreground'
                            : 'bg-primary/20 text-primary'
                      }`}>
                        {patient.priority?.charAt(0).toUpperCase() + patient.priority?.slice(1) || 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(patient.dateOfBirth).toLocaleDateString() || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {patient.contactNumber || '-'}
                    </td>
                  </tr>
                ))}
                
                {getFilteredPatients().length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No patients found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientReports; 