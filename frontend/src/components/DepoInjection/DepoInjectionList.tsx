/**
 * Depo Injection List Component
 * 
 * Displays a list of Depo injection schedules with Ethiopian calendar dates
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Plus
} from 'lucide-react';
import depoInjectionService, { DepoInjectionSchedule } from '../../services/depoInjectionService';
import EthiopianCalendarDisplay from './EthiopianCalendarDisplay';

interface DepoInjectionListProps {
  schedules: DepoInjectionSchedule[];
  searchTerm: string;
  onRefresh: () => void;
  showAll?: boolean;
}

const DepoInjectionList: React.FC<DepoInjectionListProps> = ({
  schedules,
  searchTerm,
  onRefresh,
  showAll = false
}) => {
  const [allSchedules, setAllSchedules] = useState<DepoInjectionSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<DepoInjectionSchedule | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (showAll) {
      fetchAllSchedules();
    }
  }, [showAll]);

  const fetchAllSchedules = async () => {
    try {
      setLoading(true);
      const data = await depoInjectionService.getAllSchedules(1, 100);
      setAllSchedules(data.schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'text-destructive bg-destructive/20';
      case 'due':
        return 'text-accent-foreground bg-accent/20';
      case 'due_soon':
        return 'text-accent-foreground bg-accent/20';
      case 'upcoming':
        return 'text-primary bg-primary/20';
      default:
        return 'text-muted-foreground bg-muted/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return '⚠️';
      case 'due':
        return '🔴';
      case 'due_soon':
        return '🟡';
      case 'upcoming':
        return '🟢';
      default:
        return 'ℹ️';
    }
  };

  const handleViewDetails = (schedule: DepoInjectionSchedule) => {
    setSelectedSchedule(schedule);
    setShowDetailsModal(true);
  };

  const handleRecordInjection = async (scheduleId: string) => {
    try {
      const injectionData = {
        injectionDate: new Date().toISOString(),
        notes: 'Injection administered'
      };
      
      await depoInjectionService.recordInjection(scheduleId, injectionData);
      onRefresh();
    } catch (error) {
      console.error('Error recording injection:', error);
    }
  };

  const filteredSchedules = (showAll ? allSchedules : schedules).filter(schedule =>
    schedule.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filteredSchedules.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">No injection schedules found</p>
        {searchTerm && (
          <p className="text-sm text-muted-foreground/50 mt-2">
            No results for "{searchTerm}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {filteredSchedules.map((schedule) => (
          <div
            key={schedule._id}
            className="bg-primary-foreground border border-border/30 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{getStatusIcon(schedule.injectionStatus.status)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      {schedule.patientName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Patient ID: {schedule.patientId}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {/* Next Injection Date */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Next Injection</h4>
                    <EthiopianCalendarDisplay
                      ethiopianDate={schedule.nextInjectionEthiopianDate}
                      gregorianDate={schedule.nextInjectionDate}
                      size="sm"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.injectionStatus.status)}`}>
                      {schedule.injectionStatus.message}
                    </span>
                  </div>

                  {/* Doctor */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Prescribing Doctor</h4>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">
                        {schedule.prescribingDoctorName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Interval: {schedule.injectionInterval} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Total injections: {schedule.totalInjections}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Created: {new Date(schedule.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Notes */}
                {schedule.notes && (
                  <div className="mt-4 p-3 bg-muted/10 rounded-lg">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground">{schedule.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleViewDetails(schedule)}
                  className="p-2 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded-lg"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                
                {schedule.injectionStatus.status === 'due' || schedule.injectionStatus.status === 'overdue' ? (
                  <button
                    onClick={() => handleRecordInjection(schedule._id)}
                    className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Record
                  </button>
                ) : (
                  <button
                    onClick={() => handleViewDetails(schedule)}
                    className="p-2 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/10 rounded-lg"
                    title="More Options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedSchedule && (
        <DepoInjectionDetailsModal
          schedule={selectedSchedule}
          onClose={() => setShowDetailsModal(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};

// Simple details modal component
const DepoInjectionDetailsModal: React.FC<{
  schedule: DepoInjectionSchedule;
  onClose: () => void;
  onRefresh: () => void;
}> = ({ schedule, onClose, onRefresh }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-foreground rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-muted-foreground">Schedule Details</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground/50 hover:text-muted-foreground"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-medium text-muted-foreground">{schedule.patientName}</h3>
            <p className="text-sm text-muted-foreground">Patient ID: {schedule.patientId}</p>
          </div>
          
          <EthiopianCalendarDisplay
            ethiopianDate={schedule.nextInjectionEthiopianDate}
            gregorianDate={schedule.nextInjectionDate}
          />
          
          <div>
            <h4 className="font-medium text-muted-foreground mb-2">Injection History</h4>
            <div className="space-y-2">
              {schedule.injectionHistory.map((injection, index) => (
                <div key={index} className="p-3 bg-muted/10 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <EthiopianCalendarDisplay
                        ethiopianDate={injection.ethiopianDate}
                        gregorianDate={injection.injectionDate}
                        size="sm"
                      />
                    </div>
                    {injection.administeredByName && (
                      <span className="text-sm text-muted-foreground">
                        By: {injection.administeredByName}
                      </span>
                    )}
                  </div>
                  {injection.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{injection.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepoInjectionList;

