import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  Pill, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  Heart,
  Shield,
  Sparkles,
  Eye,
  RefreshCw
} from 'lucide-react';
import SimplifiedMedicationAdmin from './SimplifiedMedicationAdmin';
import '../../styles/ui-upgrades.css';

interface ModernMedicationListProps {
  medications: any[];
  onMedicationSelect?: (medication: any) => void;
  loading?: boolean;
}

const ModernMedicationList: React.FC<ModernMedicationListProps> = ({
  medications,
  onMedicationSelect,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'detailed'>('cards');

  const filteredMedications = medications.filter(med => {
    const matchesSearch = !searchTerm || 
      med.medicationDetails?.medicationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.patientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'pending' && !med.completed) ||
      (filterStatus === 'completed' && med.completed) ||
      (filterStatus === 'overdue' && med.isOverdue) ||
      (filterStatus === 'extension' && med.medicationDetails?.isExtension);
    
    return matchesSearch && matchesFilter;
  });

  const getMedicationStatus = (medication: any) => {
    if (medication.completed) return 'completed';
    if (medication.isOverdue) return 'overdue';
    if (medication.medicationDetails?.isExtension) return 'extension';
    return 'pending';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle size={20} />,
          color: 'text-primary',
          bgColor: 'bg-primary/20',
          label: 'Completed',
          gradient: 'gradient-success'
        };
      case 'overdue':
        return {
          icon: <AlertTriangle size={20} />,
          color: 'text-destructive',
          bgColor: 'bg-destructive/20',
          label: 'Overdue',
          gradient: 'gradient-warning'
        };
      case 'extension':
        return {
          icon: <Zap size={20} />,
          color: 'text-accent-foreground',
          bgColor: 'bg-accent/20',
          label: 'Extension',
          gradient: 'gradient-info'
        };
      default:
        return {
          icon: <Clock size={20} />,
          color: 'text-primary',
          bgColor: 'bg-primary/20',
          label: 'Pending',
          gradient: 'gradient-primary'
        };
    }
  };

  const renderMedicationCard = (medication: any) => {
    const status = getMedicationStatus(medication);
    const config = getStatusConfig(status);
    
    return (
      <div key={medication._id || medication.id} className="modern-card p-4 cursor-pointer hover:scale-105">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${config.gradient} rounded-full flex items-center justify-center text-primary-foreground`}>
              <Pill size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-muted-foreground text-sm">
                {medication.medicationDetails?.medicationName || 'Unknown'}
              </h4>
              <p className="text-xs text-muted-foreground flex items-center space-x-1">
                <User size={12} />
                <span>{medication.patientName}</span>
              </p>
            </div>
          </div>
          
          <div className={`status-badge ${status === 'completed' ? 'success' : status === 'overdue' ? 'warning' : 'info'} text-xs`}>
            {config.label}
          </div>
        </div>

        {/* Medication Details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center space-x-1">
              <Heart size={12} />
              <span>Frequency:</span>
            </span>
            <span className="font-medium text-muted-foreground">
              {medication.medicationDetails?.frequency || 'Unknown'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center space-x-1">
              <Shield size={12} />
              <span>Dosage:</span>
            </span>
            <span className="font-medium text-muted-foreground">
              {medication.medicationDetails?.dosage || 'Unknown'}
            </span>
          </div>

          {medication.medicationDetails?.isExtension && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center space-x-1">
                <Sparkles size={12} />
                <span>Extension:</span>
              </span>
              <span className="font-medium text-accent-foreground">
                +{medication.medicationDetails?.extensionDetails?.additionalDays || 0} days
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-muted-foreground">
              {medication.progress || 0}%
            </span>
          </div>
          <div className="modern-progress">
            <div 
              className="modern-progress-bar" 
              style={{ width: `${medication.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedMedication(medication)}
            className="flex-1 py-2 px-3 bg-gradient-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-1"
          >
            <Eye size={12} />
            <span>View Details</span>
          </button>
          
          {!medication.completed && (
            <button
              onClick={() => onMedicationSelect?.(medication)}
              className="flex-1 py-2 px-3 bg-gradient-success text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-1"
            >
              <Pill size={12} />
              <span>Administer</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDetailedView = (medication: any) => {
    return (
      <div key={medication._id || medication.id} className="mb-6">
        <SimplifiedMedicationAdmin 
          task={medication}
          onRefresh={() => {
            // Refresh the medication data
            console.log('Dose administered, refreshing...');
          }}
          displayName={medication.medicationDetails?.medicationName || 'Unknown Medication'}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="modern-card p-4">
            <div className="loading-skeleton h-4 w-3/4 mb-2"></div>
            <div className="loading-skeleton h-3 w-1/2 mb-2"></div>
            <div className="loading-skeleton h-2 w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="modern-medication-list">
      {/* Header Controls */}
      <div className="modern-card p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50" size={16} />
              <input
                type="text"
                placeholder="Search medications or patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-border/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent glass-effect"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50" size={16} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-border/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent glass-effect appearance-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="extension">Extensions</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">View:</span>
            <div className="flex rounded-lg overflow-hidden border border-border/30">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'cards' 
                    ? 'bg-gradient-primary text-primary-foreground' 
                    : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'detailed' 
                    ? 'bg-gradient-primary text-primary-foreground' 
                    : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'
                }`}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/30">
          <div className="text-center">
            <div className="text-lg font-bold text-muted-foreground">
              {filteredMedications.length}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {filteredMedications.filter(m => !m.completed).length}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {filteredMedications.filter(m => m.completed).length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent-foreground">
              {filteredMedications.filter(m => m.medicationDetails?.isExtension).length}
            </div>
            <div className="text-xs text-muted-foreground">Extensions</div>
          </div>
        </div>
      </div>

      {/* Medication List */}
      {filteredMedications.length === 0 ? (
        <div className="modern-card p-8 text-center">
          <Pill className="mx-auto mb-4 text-muted-foreground/50" size={48} />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No medications found</h3>
          <p className="text-muted-foreground">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No medications are currently assigned to you.'}
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'cards' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-6'
        }>
          {filteredMedications.map(medication => 
            viewMode === 'cards' 
              ? renderMedicationCard(medication)
              : renderDetailedView(medication)
          )}
        </div>
      )}

      {/* Detailed Modal */}
      {selectedMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-foreground rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-muted-foreground">Medication Details</h2>
                <button
                  onClick={() => setSelectedMedication(null)}
                  className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              <SimplifiedMedicationAdmin 
                task={selectedMedication}
                onRefresh={() => {
                  // Refresh and close modal
                  setSelectedMedication(null);
                }}
                displayName={selectedMedication.medicationDetails?.medicationName || 'Unknown Medication'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button className="fab modern-tooltip" data-tooltip="Refresh medications">
        <RefreshCw size={24} />
      </button>
    </div>
  );
};

export default ModernMedicationList;
