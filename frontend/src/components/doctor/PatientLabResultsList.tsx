import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/formatters';
import { PatientLabResults } from '../../services/labService';
import { Search, RefreshCw, FileText, User } from 'lucide-react';
import ComprehensiveLabReport from './ComprehensiveLabReport';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent } from '../ui/dialog';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { label: string; className: string }> = {
    'Ordered':           { label: 'Ordered',          className: 'bg-gray-100 text-gray-600 border-gray-200' },
    'Pending':           { label: 'Ordered',          className: 'bg-gray-100 text-gray-600 border-gray-200' },
    'Scheduled':         { label: 'Scheduled',        className: 'bg-blue-50 text-blue-600 border-blue-200' },
    'Collected':         { label: 'Collected',        className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    'Processing':        { label: 'Processing',       className: 'bg-orange-50 text-orange-700 border-orange-200' },
    'Results Available': { label: 'Results Ready',    className: 'bg-purple-50 text-purple-700 border-purple-200' },
    'Sent to Doctor':    { label: 'Sent to Doctor',   className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'Completed':         { label: 'Completed',        className: 'bg-green-50 text-green-700 border-green-200' },
    'completed':         { label: 'Completed',        className: 'bg-green-50 text-green-700 border-green-200' },
  };
  const c = cfg[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      {c.label}
    </span>
  );
};

interface PatientLabResultsListProps {
  groupedResults: PatientLabResults[];
  isLoading: boolean;
  onRefresh: () => void;
}

const PatientLabResultsList: React.FC<PatientLabResultsListProps> = ({
  groupedResults,
  isLoading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientLabResults | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter patients based on search term
  const allFilteredResults = groupedResults.filter(patient => 
    patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.tests.some(test => 
      test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.category && test.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  // Apply pagination to filtered results
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredResults = allFilteredResults.slice(startIndex, endIndex);
  const totalPages = Math.ceil(allFilteredResults.length / itemsPerPage);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Search and actions bar */}
      <div className="flex justify-between items-center">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            type="text"
            placeholder="Search patients or tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Results table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Latest Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {allFilteredResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {isLoading ? (
                    <div className="flex justify-center items-center">
                      <RefreshCw size={24} className="animate-spin text-primary mr-3" />
                      <span className="text-muted-foreground">Loading lab results...</span>
                    </div>
                  ) : searchTerm ? (
                    <span className="text-muted-foreground">No matching patients or tests found</span>
                  ) : (
                    <span className="text-muted-foreground">No lab results available</span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map(patient => (
                <TableRow key={patient.patientId}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                        <User size={20} className="text-muted-foreground" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{patient?.patientName || 'Unknown Patient'}</div>
                        <div className="text-sm text-muted-foreground">ID: {patient?.patientId || 'Unknown ID'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{patient?.testCount || 0} tests</div>
                    <div className="text-xs text-muted-foreground">
                      {(patient?.tests || []).slice(0, 2).map(test => test?.testName || 'Unknown Test').join(', ')}
                      {(patient?.tests || []).length > 2 && '...'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{formatDate(patient?.latestDate || new Date())}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={patient?.status || 'Ordered'} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPatient(patient)}
                      className="flex items-center gap-1"
                    >
                      <FileText size={16} />
                      View Report
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {allFilteredResults.length > itemsPerPage && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, allFilteredResults.length)} of {allFilteredResults.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Comprehensive report modal */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] overflow-hidden p-0">
          {selectedPatient && (
            <ComprehensiveLabReport
              patientResults={selectedPatient}
              onClose={() => setSelectedPatient(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientLabResultsList; 