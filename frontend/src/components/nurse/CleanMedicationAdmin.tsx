import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import medicationAdministrationService from '../../services/medicationAdministrationService';
import { CheckCircle, XCircle, Clock, AlertTriangle, HelpCircle, Pill } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';

interface DoseRecord {
  day: number;
  timeSlot: string;
  administered: boolean;
  administeredAt?: Date | string;
  administeredBy?: string;
  notes?: string;
  missed?: boolean;
  overdue?: boolean;
  processed?: boolean;
}

interface MedicationDetails {
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  instructions: string;
  duration: number;
  startDate: Date | string;
  doseRecords?: DoseRecord[];
}

interface NurseTask {
  _id?: string;
  id?: string;
  patientId: string;
  patientName: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  taskType: 'MEDICATION' | 'VITAL_SIGNS' | 'ASSESSMENT' | 'PROCEDURE' | 'OTHER';
  dueDate: string;
  notes?: string;
  medicationDetails?: MedicationDetails;
  serviceId?: string;
  paymentAuthorization?: {
    paidDays: number;
    totalDays: number;
    outstandingAmount?: number;
  };
}

interface CleanMedicationAdminProps {
  task: NurseTask;
  day: number;
  timeSlot: string;
  onDoseAdministered: (taskId: string, day: number, timeSlot: string) => void;
}

const CleanMedicationAdmin: React.FC<CleanMedicationAdminProps> = ({
  task,
  day,
  timeSlot,
  onDoseAdministered
}) => {
  const { token } = useAuth();
  const [isAdministering, setIsAdministering] = useState(false);
  const [notes, setNotes] = useState('');
  const [isAdministered, setIsAdministered] = useState(false);
  const [administrationDetails, setAdministrationDetails] = useState<any>(null);
  const administeringRef = useRef(false);
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  const taskId = task._id || task.id || '';
  const medicationName = task.medicationDetails?.medicationName || task.description;

  // Fetch patient data including age and gender
  const fetchPatientData = async () => {
    const patientId = task?.patientId;
    if (!patientId) {
      console.log('⚠️ [PATIENT DATA] No patient ID found in task');
      return;
    }

    setLoadingPatient(true);
    try {
      console.log(`🔍 [PATIENT DATA] Fetching patient data for ID: ${patientId}`);
      const response = await patientService.getPatientById(patientId);
      console.log('🔍 [PATIENT DATA] Raw response:', response);
      
      if (response) {
        setPatientData(response);
        console.log(`✅ [PATIENT DATA] Patient data loaded:`, {
          name: `${response.firstName} ${response.lastName}`,
          age: response.age,
          gender: response.gender
        });
      } else {
        console.warn('⚠️ [PATIENT DATA] No patient data found');
      }
    } catch (error) {
      console.error('❌ [PATIENT DATA] Error fetching patient data:', error);
    } finally {
      setLoadingPatient(false);
    }
  };

  // Check dose status on component mount
  useEffect(() => {
    checkDoseStatus();
    fetchPatientData();
  }, [taskId, day, timeSlot]);

  const checkDoseStatus = async () => {
    try {
      const response = await medicationAdministrationService.getDoseStatus(taskId, day, timeSlot);
      setIsAdministered(response.data.administered);
      if (response.data.administered) {
        setAdministrationDetails({
          administeredAt: response.data.administeredAt,
          administeredBy: response.data.administeredBy,
          notes: response.data.notes,
          inventoryDeducted: response.data.inventoryDeducted
        });
      }
    } catch (error) {
      console.error('Failed to check dose status:', error);
    }
  };

  const handleAdministerDose = async () => {
    // Prevent double-clicking
    if (administeringRef.current || isAdministering) {
      console.log('🚫 [CLEAN ADMIN] Already administering, ignoring click');
      return;
    }

    administeringRef.current = true;
    setIsAdministering(true);

    try {
      console.log('🚀 [CLEAN ADMIN] Starting dose administration:', {
        taskId,
        day,
        timeSlot,
        medicationName
      });

      // Check if user data exists, if not, try to restore it from token
      let userStr = localStorage.getItem('user_data') || localStorage.getItem('user') || localStorage.getItem('USER_DATA_KEY');
      if (!userStr) {
        console.log('🔧 [CLEAN ADMIN] No user data found, attempting to restore from token...');
        try {
          // Decode the token to get user information
          const payload = token?.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          console.log('🔍 [CLEAN ADMIN] Decoded token payload:', decoded);
          
          // Create user data from token payload
          const userData = {
            id: decoded.userId || decoded.id || decoded.user_id,
            _id: decoded.userId || decoded.id || decoded.user_id,
            email: decoded.email || 'user@clinic.com',
            name: decoded.name || 'User',
            role: decoded.role || 'nurse',
            firstName: decoded.firstName || decoded.first_name || 'User',
            lastName: decoded.lastName || decoded.last_name || 'Name'
          };
          
          // Store the user data
          localStorage.setItem('user_data', JSON.stringify(userData));
          console.log('✅ [CLEAN ADMIN] User data restored from token:', userData);
          
          // Check if user has the right role
          const allowedRoles = ['nurse', 'admin', 'doctor'];
          if (!allowedRoles.includes(userData.role)) {
            throw new Error(`Access denied. Your role '${userData.role}' does not have permission to administer medications.`);
          }
          
          console.log(`✅ [CLEAN ADMIN] User role '${userData.role}' is authorized to administer medications`);
        } catch (e) {
          console.error('❌ [CLEAN ADMIN] Failed to restore user data from token:', e);
          throw new Error('Unable to verify user permissions. Please log in again.');
        }
      }

      const response = await medicationAdministrationService.administerDose({
        taskId,
        day,
        timeSlot,
        notes
      });

      console.log('✅ [CLEAN ADMIN] Dose administered successfully:', response);

      // Update local state
      setIsAdministered(true);
      setAdministrationDetails({
        administeredAt: response.data.administeredAt,
        administeredBy: response.data.administeredBy,
        notes: (response.data as any).notes || notes,
        inventoryDeducted: response.data.inventoryDeducted,
        inventoryDetails: response.data.inventoryDetails
      });

      // Show success message with inventory details
      let successMessage = `✅ ${medicationName} administered successfully!`;
      if (response.data.inventoryDeducted && response.data.inventoryDetails) {
        const { itemsDeducted } = response.data.inventoryDetails;
        const deductionSummary = itemsDeducted.map(item => 
          `${item.name}: ${item.quantityDeducted} unit (${item.previousQuantity} → ${item.newQuantity})`
        ).join(', ');
        successMessage += `\n📦 Inventory deducted: ${deductionSummary}`;
      }

      toast.success(successMessage);

      // Notify parent component
      onDoseAdministered(taskId, day, timeSlot);

      // Clear notes
      setNotes('');

    } catch (error: any) {
      console.error('❌ [CLEAN ADMIN] Failed to administer dose:', error);
      toast.error(error.message || 'Failed to administer medication');
    } finally {
      administeringRef.current = false;
      setIsAdministering(false);
    }
  };

  const formatDateTime = (dateTime: string | Date) => {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleString();
  };

  // Payment authorization logic
  const paymentAuth = (task as any).paymentAuthorization;
  let canAdminister = true;
  let paymentWarning = null;
  if (paymentAuth) {
    // Determine if this dose is authorized
    const totalDoses = (paymentAuth.authorizedDoses || 0) + (paymentAuth.unauthorizedDoses || 0);
    // Calculate which doses are paid for (by day)
    // If paidDays < day, this dose is not authorized
    if (paymentAuth.paidDays < day) {
      canAdminister = false;
      paymentWarning = (
        <div className="mb-4 p-2 bg-accent/10 border border-yellow-200 rounded flex items-center">
          <AlertTriangle className="w-4 h-4 text-accent-foreground mr-2" />
          <span className="text-accent-foreground text-sm font-medium">
            This dose is <b>not authorized</b> for administration. Payment required for Day {day}.<br/>
            Outstanding: ETB {paymentAuth.outstandingAmount?.toFixed(2) || '0'}
          </span>
        </div>
      );
    }
  }

  // Add authentication help section
  const renderAuthHelp = () => {
    if (!showAuthHelp) return null;
    
    return (
      <div className="mt-4 p-4 bg-accent/10 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-accent-foreground mb-2">🔐 Authentication Help</h4>
        <p className="text-sm text-accent-foreground mb-3">
          If you're getting "Access denied" or "403 Forbidden" errors, you need to log in with proper credentials.
        </p>
        <div className="space-y-2 text-sm">
          <div><strong>Quick Login:</strong> Go to <code className="bg-accent/20 px-2 py-1 rounded">/auth-debug</code></div>
          <div><strong>Test Credentials:</strong></div>
          <ul className="ml-4 space-y-1">
            <li>• Admin: admin@clinic.com / admin123</li>
            <li>• Doctor: DR Natan / doctor123</li>
            <li>• Nurse: nurse@clinic.com / nurse123</li>
          </ul>
        </div>
        <button
          onClick={() => setShowAuthHelp(false)}
          className="mt-3 px-3 py-1 bg-accent text-primary-foreground text-sm rounded hover:bg-accent"
        >
          Close Help
        </button>
      </div>
    );
  };

  return (
    <div className="bg-primary-foreground rounded-lg shadow-md p-4 border border-border/30">
      {/* Debug section - remove in production */}
      <div className="mb-4 p-3 bg-accent/10 border border-yellow-200 rounded">
        <h4 className="text-sm font-medium text-accent-foreground mb-2">🔧 Debug Info</h4>
        <button
          onClick={() => {
            const userStr = localStorage.getItem('user_data') || localStorage.getItem('user') || localStorage.getItem('USER_DATA_KEY');
            if (userStr) {
              try {
                const userData = JSON.parse(userStr);
                console.log('👤 [CLEAN ADMIN] Current user:', userData);
                console.log('👤 [CLEAN ADMIN] User role:', userData.role);
                console.log('👤 [CLEAN ADMIN] User ID:', userData.id || userData._id);
                
                const allowedRoles = ['nurse', 'admin', 'doctor'];
                if (allowedRoles.includes(userData.role)) {
                  alert(`✅ User authorized!\nRole: ${userData.role}\nID: ${userData.id || userData._id}`);
                } else {
                  alert(`❌ User NOT authorized!\nRole: ${userData.role}\nAllowed roles: ${allowedRoles.join(', ')}`);
                }
              } catch (e) {
                alert('Error parsing user data: ' + e);
              }
            } else {
              alert('No user data found in localStorage');
            }
          }}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary"
        >
          Check User Role
        </button>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('clinic_auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
              if (!token) {
                alert('No token found');
                return;
              }
              
              const response = await fetch('/api/medication-administration/test-auth', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                alert(`✅ Auth test successful!\n${JSON.stringify(data, null, 2)}`);
              } else {
                const errorData = await response.json();
                alert(`❌ Auth test failed!\nStatus: ${response.status}\n${JSON.stringify(errorData, null, 2)}`);
              }
            } catch (error) {
              alert('Auth test error: ' + error);
            }
          }}
          className="ml-2 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary"
        >
          Test Auth Endpoint
        </button>
      </div>

      {/* Header with authentication help */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Pill className="h-5 w-5 text-primary" />
          <span className="font-medium text-muted-foreground">{medicationName}</span>
        </div>
        <button
          onClick={() => setShowAuthHelp(!showAuthHelp)}
          className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title="Authentication Help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Authentication Help Section */}
      {renderAuthHelp()}

      <div className="flex items-center justify-between mb-4">
        {/* Payment Authorization Info */}
        {paymentAuth && (
          <div className="mb-3">
            <div className="flex items-center mb-1">
              <CheckCircle className="w-4 h-4 text-primary mr-1" />
              <span className="font-semibold text-xs text-primary">
                Paid Days: {paymentAuth.paidDays} / {paymentAuth.totalDays} &nbsp; | &nbsp; Outstanding: <span className="text-destructive">ETB {paymentAuth.outstandingAmount?.toFixed(2) || '0'}</span>
              </span>
            </div>
            {paymentWarning}
          </div>
        )}
        <div className="medication-info mb-4">
          <h4 className="font-semibold text-lg text-muted-foreground">{medicationName}</h4>
          <p className="text-sm text-muted-foreground">
            Patient: {task.patientName}
            {patientData && (
              <span className="ml-2 font-bold">
                ({patientData.age ? `${patientData.age}y` : 'Age N/A'}, {patientData.gender || 'Gender N/A'})
              </span>
            )}
            {loadingPatient && (
              <span className="ml-2 text-xs">Loading patient info...</span>
            )}
            {' | '}Day {day} | {timeSlot}
          </p>
          {task.medicationDetails && (
            <div className="text-sm text-muted-foreground mt-1">
              <span>Dosage: {task.medicationDetails.dosage}</span>
              <span className="ml-4">Route: {task.medicationDetails.route}</span>
              <span className="ml-4">Frequency: {task.medicationDetails.frequency}</span>
            </div>
          )}
        </div>
      </div>

      {isAdministered ? (
        <div className="administered-info bg-primary/10 border border-primary/30 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="text-primary font-semibold">✅ Administered</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <p><strong>When:</strong> {formatDateTime(administrationDetails?.administeredAt)}</p>
            <p><strong>By:</strong> {administrationDetails?.administeredBy}</p>
            {administrationDetails?.notes && (
              <p><strong>Notes:</strong> {administrationDetails.notes}</p>
            )}
            {administrationDetails?.inventoryDeducted && (
              <p className="text-primary mt-2">
                <strong>📦 Inventory deducted successfully</strong>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="administration-form">
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-2">
              Administration Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter any notes about the administration..."
              disabled={isAdministering}
            />
          </div>

          <button
            onClick={handleAdministerDose}
            disabled={isAdministering || !canAdminister}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
              isAdministering || !canAdminister
                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary active:bg-primary'
            }`}
          >
            {isAdministering ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Administering...
              </span>
            ) : (
              canAdminister ? 'Confirm Administration' : 'Payment Required'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CleanMedicationAdmin; 