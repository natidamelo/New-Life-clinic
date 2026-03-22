import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Plus, X, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types/user';

interface PatientAllergiesProps {
  patientId: string;
  user: User | null;
  isEditable?: boolean;
}

interface Allergy {
  _id: string;
  name: string;
  type: 'food' | 'medication' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'unknown';
  reaction: string;
  notes?: string;
  dateIdentified: string;
  lastUpdated?: string;
  reportedBy?: string;
  status: 'active' | 'inactive' | 'resolved';
}

const PatientAllergies: React.FC<PatientAllergiesProps> = ({ patientId, user, isEditable = false }) => {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);
  
  // New allergy form state
  const [newAllergy, setNewAllergy] = useState({
    name: '',
    type: 'medication',
    severity: 'moderate',
    reaction: '',
    notes: '',
    status: 'active'
  });

  const fetchAllergies = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/allergies/patient/${patientId}`);
      
      if (response.data && Array.isArray(response.data)) {
        setAllergies(response.data);
      } else {
        setAllergies([]);
      }
    } catch (error) {
      console.error('Error fetching allergies:', error);
      setError('Failed to load allergies');
      setAllergies([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAllergies();
  }, [patientId]);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };
  
  const getSeverityBadge = (severity: string) => {
    let color, bg;
    
    switch (severity) {
      case 'mild':
        color = 'text-primary';
        bg = 'bg-primary/20';
        break;
      case 'moderate':
        color = 'text-accent-foreground';
        bg = 'bg-accent/20';
        break;
      case 'severe':
        color = 'text-destructive';
        bg = 'bg-destructive/20';
        break;
      default:
        color = 'text-muted-foreground';
        bg = 'bg-muted/20';
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
        {severity === 'severe' && <AlertCircle className="h-3.5 w-3.5 mr-1" />}
        {severity === 'moderate' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };
  
  const getTypeBadge = (type: string) => {
    let color, bg;
    
    switch (type) {
      case 'medication':
        color = 'text-secondary-foreground';
        bg = 'bg-secondary/20';
        break;
      case 'food':
        color = 'text-primary';
        bg = 'bg-primary/20';
        break;
      case 'environmental':
        color = 'text-teal-700';
        bg = 'bg-teal-100';
        break;
      default:
        color = 'text-muted-foreground';
        bg = 'bg-muted/20';
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };
  
  const getStatusBadge = (status: string) => {
    let color, bg;
    
    switch (status) {
      case 'active':
        color = 'text-destructive';
        bg = 'bg-destructive/10';
        break;
      case 'inactive':
        color = 'text-muted-foreground';
        bg = 'bg-muted/20';
        break;
      case 'resolved':
        color = 'text-primary';
        bg = 'bg-primary/10';
        break;
      default:
        color = 'text-muted-foreground';
        bg = 'bg-muted/20';
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAllergy(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...newAllergy,
        patientId
      };
      
      await api.post('/api/allergies', payload);
      
      // Reset form and close modal
      setNewAllergy({
        name: '',
        type: 'medication',
        severity: 'moderate',
        reaction: '',
        notes: '',
        status: 'active'
      });
      
      setIsAddModalOpen(false);
      fetchAllergies();
    } catch (error) {
      console.error('Error adding allergy:', error);
      setError('Failed to add allergy');
    }
  };
  
  const handleEditAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAllergy) return;
    
    try {
      await api.put(`/api/allergies/${editingAllergy._id}`, {
        ...newAllergy,
        patientId
      });
      
      setEditingAllergy(null);
      setNewAllergy({
        name: '',
        type: 'medication',
        severity: 'moderate',
        reaction: '',
        notes: '',
        status: 'active'
      });
      
      fetchAllergies();
    } catch (error) {
      console.error('Error updating allergy:', error);
      setError('Failed to update allergy');
    }
  };
  
  const startEdit = (allergy: Allergy) => {
    setEditingAllergy(allergy);
    setNewAllergy({
      name: allergy.name,
      type: allergy.type,
      severity: allergy.severity,
      reaction: allergy.reaction,
      notes: allergy.notes || '',
      status: allergy.status
    });
  };
  
  const handleDeleteAllergy = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this allergy?')) {
      try {
        await api.delete(`/api/allergies/${id}`);
        fetchAllergies();
      } catch (error) {
        console.error('Error deleting allergy:', error);
        setError('Failed to delete allergy');
      }
    }
  };

  return (
    <div className="p-4 bg-primary-foreground rounded-lg border border-border/30 shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Allergies & Adverse Reactions
        </h3>
        <div className="flex items-center gap-2">
          {isEditable && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Allergy
            </button>
          )}
          <button
            onClick={fetchAllergies}
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-muted/10 text-muted-foreground hover:bg-muted/20 border border-border/30 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Allergies Content */}
      <div className="space-y-2 max-h-[calc(75vh-180px)] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
        {isLoading ? (
          <div className="py-8 text-center">
            <RefreshCw className="h-8 w-8 mx-auto text-destructive animate-spin mb-4" />
            <p className="text-muted-foreground">Loading allergies...</p>
          </div>
        ) : allergies.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {allergies.map((allergy) => (
              <div key={allergy._id} className="bg-primary-foreground border border-border/30 rounded-lg overflow-hidden hover:shadow-md transition-all duration-150">
                <div className="bg-gradient-to-r from-gray-50 to-white p-3 border-b border-border/30">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      <span className="font-medium text-muted-foreground mr-2">{allergy.name}</span>
                      {getStatusBadge(allergy.status)}
                    </div>
                    {isEditable && (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => startEdit(allergy)}
                          className="text-muted-foreground/50 hover:text-primary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAllergy(allergy._id)}
                          className="text-muted-foreground/50 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center space-x-2 mt-1">
                    {getTypeBadge(allergy.type)}
                    {getSeverityBadge(allergy.severity)}
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  {allergy.reaction && (
                    <div>
                      <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Reaction</h5>
                      <p className="text-sm text-muted-foreground">{allergy.reaction}</p>
                    </div>
                  )}
                  
                  {allergy.notes && (
                    <div>
                      <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Notes</h5>
                      <p className="text-sm text-muted-foreground">{allergy.notes}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Identified</h5>
                      <p>{formatDate(allergy.dateIdentified)}</p>
                    </div>
                    {allergy.reportedBy && (
                      <div>
                        <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Reported By</h5>
                        <p>{allergy.reportedBy}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-muted/10 rounded-lg border border-border/30">
            <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3">
              <AlertCircle className="h-full w-full" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">No allergies found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This patient has no recorded allergies.
              {isEditable && " Click 'Add Allergy' to record a new allergy."}
            </p>
          </div>
        )}
      </div>

      {/* Add Allergy Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/30">
              <h3 className="text-lg font-semibold text-muted-foreground">Add New Allergy</h3>
              <button 
                className="text-muted-foreground/50 hover:text-muted-foreground" 
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddAllergy} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Allergy Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newAllergy.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                  <select
                    id="type"
                    name="type"
                    value={newAllergy.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  >
                    <option value="medication">Medication</option>
                    <option value="food">Food</option>
                    <option value="environmental">Environmental</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="severity" className="block text-sm font-medium text-muted-foreground mb-1">Severity</label>
                  <select
                    id="severity"
                    name="severity"
                    value={newAllergy.severity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="reaction" className="block text-sm font-medium text-muted-foreground mb-1">Reaction</label>
                <textarea
                  id="reaction"
                  name="reaction"
                  value={newAllergy.reaction}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={newAllergy.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  rows={2}
                />
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <select
                  id="status"
                  name="status"
                  value={newAllergy.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-border/40 rounded-md shadow-sm text-sm font-medium text-muted-foreground bg-primary-foreground hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Allergy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Allergy Modal */}
      {editingAllergy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/30">
              <h3 className="text-lg font-semibold text-muted-foreground">Edit Allergy</h3>
              <button 
                className="text-muted-foreground/50 hover:text-muted-foreground" 
                onClick={() => setEditingAllergy(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditAllergy} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-muted-foreground mb-1">Allergy Name</label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={newAllergy.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-type" className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                  <select
                    id="edit-type"
                    name="type"
                    value={newAllergy.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  >
                    <option value="medication">Medication</option>
                    <option value="food">Food</option>
                    <option value="environmental">Environmental</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="edit-severity" className="block text-sm font-medium text-muted-foreground mb-1">Severity</label>
                  <select
                    id="edit-severity"
                    name="severity"
                    value={newAllergy.severity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="edit-reaction" className="block text-sm font-medium text-muted-foreground mb-1">Reaction</label>
                <textarea
                  id="edit-reaction"
                  name="reaction"
                  value={newAllergy.reaction}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="edit-notes" className="block text-sm font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                <textarea
                  id="edit-notes"
                  name="notes"
                  value={newAllergy.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                  rows={2}
                />
              </div>
              
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <select
                  id="edit-status"
                  name="status"
                  value={newAllergy.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border/40 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingAllergy(null)}
                  className="px-4 py-2 border border-border/40 rounded-md shadow-sm text-sm font-medium text-muted-foreground bg-primary-foreground hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update Allergy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAllergies; 