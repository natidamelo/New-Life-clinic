import React, { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Modal, Form, Alert, Table, Badge, Spinner, InputGroup, Row, Col, ListGroup } from 'react-bootstrap';
import patientService, { Patient } from '../../services/patientService';
import patientCardService, { PatientCard, PatientCardStatusEnum } from '../../services/patientCardService';
import cardTypeService from '../../services/cardTypeService';
import { useCardTypes, CardType } from '../../context/CardTypeContextNew';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

// Define paymentMethods for the frontend dropdown
const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit/Debit Card' }, // Single option for frontend simplicity
  { value: 'insurance', label: 'Insurance' },
  { value: 'mobileMoney', label: 'Mobile Money' }, // Keep for frontend if needed, map to 'Other'?
  { value: 'bankTransfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' } // Added 'other' to match backend potential
];

// --- Mapping from frontend value to backend enum --- 
const paymentMethodBackendMapping: Record<string, string> = {
  'cash': 'Cash',
  'card': 'Credit Card', // Map frontend 'card' to backend 'Credit Card'
  'insurance': 'Insurance',
  'mobileMoney': 'Debit Card', // Changed from 'Other' to 'Debit Card' which is allowed by backend
  'bankTransfer': 'Bank Transfer',
  'other': 'Debit Card' // Changed from 'Other' to 'Debit Card' which is allowed by backend
};
// --- End Mapping ---

interface CardFormValues {
  patientId: string;
  cardType: string;
  amount: number;
  paymentMethod: string;
}

// Card type edit interface
interface CardTypeEdit extends Omit<CardType, 'validityMonths' | 'createdAt' | 'updatedAt'> {
  label: string;
  benefits: string;
  validityMonths?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Admin Card Settings component
const AdminCardSettings: React.FC<{ 
  cardTypes: CardTypeEdit[];
  onUpdateCardType: (cardType: CardTypeEdit) => void;
  onAddCardType: (cardType: CardTypeEdit) => void;
}> = memo(({ cardTypes, onUpdateCardType, onAddCardType }) => {
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingCard, setEditingCard] = useState<CardTypeEdit | null>(null);
  const [newCardType, setNewCardType] = useState<Partial<CardTypeEdit>>({
    value: '',
    label: '',
    price: 0,
    benefits: '',
    validityMonths: 12
  });
  
  console.log('AdminCardSettings rendering with card types:', cardTypes);
  
  const handleEditClick = (cardType: CardTypeEdit) => {
    try {
      console.log('Edit clicked for card type:', cardType);
      // Create a deep copy of the card type to avoid reference issues
      // Make sure to include _id and other required fields
      setEditingCard({
        _id: cardType._id, // Ensure _id is copied
        value: cardType.value,
        label: cardType.label,
        name: cardType.name, // Include name field from the original card type
        price: cardType.price,
        benefits: cardType.benefits,
        validityMonths: cardType.validityMonths || 12,
        isActive: cardType.isActive !== undefined ? cardType.isActive : true,
        createdAt: cardType.createdAt,
        updatedAt: cardType.updatedAt
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error in handleEditClick:', error);
      toast.error('An error occurred while trying to edit this card type');
    }
  };
  
  const handleSaveEdit = () => {
    try {
      if (!editingCard) {
        toast.error('No card type selected for editing');
        return;
      }
      
      console.log('Saving edited card:', editingCard);
      
      // Make sure we have all required fields
      if (!editingCard._id) {
        console.error('Missing _id field in editingCard:', editingCard);
        toast.error('Card type is missing required ID field');
        return;
      }
      
      // Create a complete card object ensuring all required fields
      const cardToUpdate = {
        _id: editingCard._id, // Required for update
        name: editingCard.name || editingCard.label, // Make sure name field is set
        label: editingCard.label,
        value: editingCard.value,
        price: editingCard.price,
        benefits: editingCard.benefits,
        validityMonths: editingCard.validityMonths || 12,
        isActive: editingCard.isActive !== undefined ? editingCard.isActive : true
      };
      
      console.log('Prepared card for update:', cardToUpdate);
      
      // Call parent component's update function with properly formed object
      onUpdateCardType(cardToUpdate);
      
      // Show success message and close modal
      toast.success(`Card type "${editingCard.label}" updated successfully!`);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error in handleSaveEdit:', error);
      toast.error('An error occurred while saving the edited card type');
    }
  };
  
  const handleAddClick = () => {
    setNewCardType({
      value: '',
      label: '',
      price: 0,
      benefits: '',
      validityMonths: 12
    });
    setShowAddModal(true);
  };
  
  const handleSaveNewCard = () => {
    if (!newCardType.label || !newCardType.value) {
      toast.error('Please provide a valid card label and value');
      return;
    }
    
    // Check if the value already exists
    if (cardTypes.some(card => card.value === newCardType.value)) {
      toast.error(`A card type with the value "${newCardType.value}" already exists`);
      return;
    }
    
    // Call parent component's add function
    onAddCardType({
      ...newCardType,
      _id: newCardType._id || '',
      name: newCardType.name || newCardType.label || '',
      label: newCardType.label || newCardType.name || '',
      benefits: newCardType.benefits || newCardType.description || '',
      value: newCardType.value || newCardType.name || '',
      price: newCardType.price || 0,
      isActive: newCardType.isActive || true
    });
    
    // Show success message and close modal
    toast.success(`New card type "${newCardType.label}" added successfully!`);
    setShowAddModal(false);
  };
  
  return (
    <Card className="mb-4 border-primary">
      <Card.Header className="bg-primary text-primary-foreground">
        <h4>Card Settings (Admin Only)</h4>
      </Card.Header>
      <Card.Body>
        <Alert variant="info">
          <p className="mb-0">
            As an administrator, you can change card types and pricing. These settings will apply to all new cards issued.
          </p>
        </Alert>
        
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Card Type</th>
              <th>Validity (months)</th>
              <th>Price</th>
              <th>Benefits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cardTypes.map((type) => (
              <tr key={`card-type-${type.value}`} className="card-type-row">
                <td>{type.label}</td>
                <td>{type.validityMonths || 12}</td>
                <td>ETB {type.price}</td>
                <td>{type.benefits}</td>
                <td>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="me-2 px-3 py-1"
                    onClick={() => {
                      console.log('Edit button clicked for:', type);
                      handleEditClick(type);
                    }}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        
        <div className="d-flex justify-content-end">
          <Button 
            variant="success" 
            size="sm"
            onClick={handleAddClick}
          >
            Add New Card Type
          </Button>
        </div>
        
        <p className="text-muted mt-3">
          <small>
            Note: Editing card types and prices will not affect existing cards, only new ones.
            Full card type management will be available in a future update.
          </small>
        </p>
      </Card.Body>
      
      {/* Edit Card Type Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Card Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingCard && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Card Label</Form.Label>
                <Form.Control 
                  type="text" 
                  value={editingCard.label}
                  onChange={(e) => setEditingCard({...editingCard, label: e.target.value})}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Validity (months)</Form.Label>
                <Form.Control 
                  type="number" 
                  value={editingCard.validityMonths || 12}
                  onChange={(e) => setEditingCard({...editingCard, validityMonths: parseInt(e.target.value) || 12})}
                  min="1"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Price (ETB)</Form.Label>
                <Form.Control 
                  type="number" 
                  value={editingCard.price}
                  onChange={(e) => setEditingCard({...editingCard, price: parseFloat(e.target.value) || 0})}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Benefits</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3}
                  value={editingCard.benefits}
                  onChange={(e) => setEditingCard({...editingCard, benefits: e.target.value})}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Add New Card Type Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Card Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Card Value (unique identifier)</Form.Label>
              <Form.Control 
                type="text" 
                value={newCardType.value}
                onChange={(e) => setNewCardType({...newCardType, value: e.target.value})}
                placeholder="e.g., Basic, Premium, etc."
              />
              <Form.Text className="text-muted">
                This is the internal identifier for the card type. Use only letters, numbers, and underscores.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Card Label (display name)</Form.Label>
              <Form.Control 
                type="text" 
                value={newCardType.label}
                onChange={(e) => setNewCardType({...newCardType, label: e.target.value})}
                placeholder="e.g., Basic Plan, Premium Plan, etc."
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Validity (months)</Form.Label>
              <Form.Control 
                type="number" 
                value={newCardType.validityMonths || 12}
                onChange={(e) => setNewCardType({...newCardType, validityMonths: parseInt(e.target.value) || 12})}
                min="1"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Price (ETB)</Form.Label>
              <Form.Control 
                type="number" 
                value={newCardType.price}
                onChange={(e) => setNewCardType({...newCardType, price: parseFloat(e.target.value) || 0})}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Benefits</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                value={newCardType.benefits}
                onChange={(e) => setNewCardType({...newCardType, benefits: e.target.value})}
                placeholder="e.g., 5% discount, free consultations, etc."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSaveNewCard}>
            Add Card Type
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
});

const PatientCardManagement: React.FC = () => {
  const { patientId: urlPatientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // --- Use more specific state --- 
  const [patient, setPatient] = useState<Patient | null>(null); // Use Patient type
  const [isLoadingCardTypes, setIsLoadingCardTypes] = useState(false);
  const [isLoadingExistingCard, setIsLoadingExistingCard] = useState(false);
  const { cardTypes } = useCardTypes();
  const [selectedCardType, setSelectedCardType] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethods[0]?.value || '');
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading state
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [renewalAmount, setRenewalAmount] = useState<number>(0);
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<string>(paymentMethods[0]?.value || '');
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- State for existing card check --- 
  const [existingCard, setExistingCard] = useState<PatientCard | null>(null);
  // --- End State for existing card check --- 

  // Permissions Check
  useEffect(() => {
    checkUserPermissions();
  }, [user]);

  // Initial data loading
  useEffect(() => {
    loadCardTypes();
    const queryParams = new URLSearchParams(location.search);
    const patientIdFromQuery = queryParams.get('patientId');
    const finalPatientId = urlPatientId || patientIdFromQuery;

    if (finalPatientId) {
      // Use handlePatientSelect which calls fetchPatientData internally
      handlePatientSelect(finalPatientId);
    } else {
      // If no patient ID is provided, ensure loading states are false
      setIsLoading(false);
      setIsLoadingExistingCard(false);
    }
  }, [urlPatientId, location.search]); // Dependencies

  // Load card types function
  const loadCardTypes = useCallback(async () => {
    try {
      await cardTypeService.fetchCardTypes();
    } catch (error) {
      console.error('Error loading card types:', error);
    }
  }, []);

  // Load card types on mount
  useEffect(() => {
    loadCardTypes();
  }, [loadCardTypes]);

  // Fetch patient details AND their existing card status
  const fetchPatientData = useCallback(async (id: string) => {
    if (!id) return;
    console.log(`Fetching data for patient ID: ${id}`);
    setIsLoading(true); // General loading for patient details
    setIsLoadingExistingCard(true); // Specific loading for card status
    setExistingCard(null); // Reset card state
    setError(null); // Reset errors
    setPatient(null); // Reset patient state

    try {
      // Fetch patient details first
      const patientDetails = await patientService.getPatientById(id);
      setPatient(patientDetails);
      setIsLoading(false); // Stop general loading after patient details
      console.log('Patient details fetched:', patientDetails);

      // Now fetch ALL patient cards (not just active/grace)
      try {
        const cards = await patientCardService.getPatientCards({ patient: id });
        console.log('All patient cards fetched:', cards);
        
        if (cards.length > 0) {
          // Log all cards for debugging with full data
          console.log('All patient cards with detailed status:', cards.map(card => ({
            id: card._id,
            number: card.cardNumber,
            status: card.status,
            issuedDate: card.issuedDate,
            expiryDate: card.expiryDate,
            type: card.type
          })));
          
          // First check for active cards
          const activeCard = cards.find(card => isCardActive(card));
          if (activeCard) {
            console.log('Found active card:', activeCard);
            setExistingCard(activeCard);
            
            // Pre-fill renewal details based on existing card
            const matchingCardType = cardTypes.find(ct => ct.value === activeCard.type);
            setRenewalAmount(matchingCardType?.price || 0);
            setRenewalPaymentMethod(paymentMethods[0]?.value || '');
            return; // Exit early if we found an active card
          }
          
          // Then check for grace period cards
          const graceCard = cards.find(card => isCardInGracePeriod(card));
          if (graceCard) {
            console.log('Found grace period card:', graceCard);
            setExistingCard(graceCard);
            
            // Pre-fill renewal details
            const matchingCardType = cardTypes.find(ct => ct.value === graceCard.type);
            setRenewalAmount(matchingCardType?.price || 0);
            setRenewalPaymentMethod(paymentMethods[0]?.value || '');
            return; // Exit early if we found a grace period card
          }
          
          // Check for any card marked with status "Active" (string comparison for safety)
          const stringActiveCard = cards.find(card => String(card.status).toLowerCase() === 'active');
          if (stringActiveCard && !activeCard) {
            console.log('Found string "active" card (potential enum mismatch):', stringActiveCard);
            setExistingCard(stringActiveCard);
            
            // Pre-fill renewal details
            const matchingCardType = cardTypes.find(ct => ct.value === stringActiveCard.type);
            setRenewalAmount(matchingCardType?.price || 0);
            setRenewalPaymentMethod(paymentMethods[0]?.value || '');
            return; // Exit early
          }
          
          // No active/grace card, but still display the most recent card if it exists
          // Sort by issuedDate descending to get the most recent card
          const sortedCards = [...cards].sort((a, b) => 
            new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
          );
          
          console.log('No active/grace card found. Most recent card:', sortedCards[0]);
          setExistingCard(sortedCards[0]);
          
          // Since there's no active card, set defaults for the issue form
          const firstCardType = cardTypes[0];
          setSelectedCardType(firstCardType?.value || '');
          setAmount(firstCardType?.price || 0);
          setPaymentMethod(paymentMethods[0]?.value || '');
        } else {
          console.log('No cards found for this patient.');
          setExistingCard(null);
          
          // Reset/set defaults for the issue form
          const firstCardType = cardTypes[0];
          setSelectedCardType(firstCardType?.value || '');
          setAmount(firstCardType?.price || 0);
          setPaymentMethod(paymentMethods[0]?.value || '');
        }
      } catch (cardError) {
        console.error('Error fetching existing patient card:', cardError);
        toast.error('Could not fetch existing card details.');
        setExistingCard(null); // Ensure card is null on error
      }

    } catch (err) {
      console.error('Error fetching patient details:', err);
      setError(`Failed to load patient data: ${err instanceof Error ? err.message : String(err)}`);
      setPatient(null); // Clear patient on error
      setExistingCard(null); // Clear card on error
      setIsLoading(false); // Ensure general loading stops
      toast.error('Failed to load patient details.');
    } finally {
      // Finish card loading regardless of patient fetch success/failure
      setIsLoadingExistingCard(false); 
    }
  }, [cardTypes]); // Depend on cardTypes as it's used for setting defaults/renewal amount

  // Select Patient and trigger data fetch
  const handlePatientSelect = useCallback(async (id: string) => {
    setSearchTerm(''); 
    setSearchResults([]);
    // Update URL without adding duplicate history entry if already there
    if (`/billing/patient-cards/${id}` !== location.pathname) {
      navigate(`/billing/patient-cards/${id}`);
    } else {
      // If already on the correct URL, fetch data
      await fetchPatientData(id);
      // Also directly synchronize with backend for most accurate state
      await synchronizeCardStatus(id);
    }
  }, [navigate, fetchPatientData, location.pathname]); // Add dependencies

  // Handle Card Type Change (for issue form)
  const handleCardTypeChange = (typeValue: string) => {
    setSelectedCardType(typeValue);
    const selectedType = cardTypes.find(ct => ct.value === typeValue);
    setAmount(selectedType?.price || 0); // Update amount based on selected type
  };
  
  // Handle Amount Change (for issue form)
  const handleAmountChange = (amountValue: string) => {
    setAmount(parseFloat(amountValue) || 0);
  };
  
  // Handle Payment Method Change (for issue form)
  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
  };

  // Safe Operation Wrapper
  const safeOperation = async (operation: () => Promise<void>, errorMessage: string) => {
    try {
      await operation();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      // Check if it's an axios error with a response from the server
      if (axios.isAxiosError(error) && error.response) {
        // Handle the specific "already has an active card" error
        if (error.response.data?.message === 'Patient already has an active card') {
          // Log the active card details from the response
          const activeCard = error.response.data?.card;
          console.log('Server reports this active card exists:', activeCard);
          
          toast.error('This patient already has an active card. Synchronizing with server...');
          
          // Directly set the existing card from the response to force UI update
          if (activeCard) {
            setExistingCard(activeCard);
          }
          
          // Synchronize with backend for most accurate state
          if (patient) {
            await synchronizeCardStatus(patient._id);
          }
          return;
        }
        
        // Display the server's error message if available
        const serverMessage = error.response.data?.message || error.response.data?.errors?.[0]?.msg;
        if (serverMessage) {
          toast.error(`${errorMessage}: ${serverMessage}`);
          
          // Always synchronize on error to ensure our UI matches backend state
          if (patient) {
            await synchronizeCardStatus(patient._id);
          }
          return;
        }
      }
      
      // Fallback to generic error message
      toast.error(errorMessage);
      
      // Try to synchronize anyway to fix potential state mismatch
      if (patient) {
        await synchronizeCardStatus(patient._id);
      }
    }
  };

  // Check Billing Permission
  const hasBillingPermission = () => {
    // If user is admin or finance, they have billing permission
    if (user?.role === 'admin' || user?.role === 'finance') {
      return true;
    }
    
    // Check for specific permission in the permissions object
    if (user?.permissions) {
      return !!user.permissions.manageBilling;
    }
    
    return false;
  };
  
  // Utility functions to check card status (handle both enum and string values)
  const isCardActive = (card: PatientCard | null): boolean => {
    if (!card) return false;
    return card.status === PatientCardStatusEnum.ACTIVE || 
           String(card.status).toLowerCase() === 'active';
  };
  
  const isCardInGracePeriod = (card: PatientCard | null): boolean => {
    if (!card) return false;
    return card.status === PatientCardStatusEnum.GRACE || 
           String(card.status).toLowerCase() === 'grace';
  };
  
  const isCardActiveOrGrace = (card: PatientCard | null): boolean => {
    return isCardActive(card) || isCardInGracePeriod(card);
  };

  // Issue Card function
  const issueCard = async () => {
    if (!patient) {
      toast.error('Please select a patient first.');
      return;
    }

    // First, synchronize with backend to ensure we have most accurate card status
    console.log('Synchronizing card status before attempting to issue card...');
    await synchronizeCardStatus(patient._id);
    
    // Check if synchronization found an active card
    if (existingCard && (isCardActive(existingCard) || isCardInGracePeriod(existingCard))) {
      toast.error(`Cannot issue a new card; patient already has a ${existingCard.status.toLowerCase()} card.`);
      return;
    }

    if (!selectedCardType || !paymentMethod || amount <= 0) {
      toast.error('Please select card type, payment method, and enter a valid amount.');
      return;
    }

    const backendPaymentMethod = paymentMethodBackendMapping[paymentMethod];
    if (!backendPaymentMethod) {
      toast.error(`Invalid payment method selected: ${paymentMethod}.`);
      return; 
    }
    
    // --- Prepare the final data object --- 
    const cardData = {
      patient: patient._id, 
      type: selectedCardType as "Basic" | "Premium" | "VIP" | "Family",
      amountPaid: amount,
      paymentMethod: backendPaymentMethod,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastPaymentDate: new Date().toISOString()
    };

    // --- Add detailed console logs for debugging --- 
    console.log('DEBUG: Attempting to issue card with data:', JSON.stringify(cardData, null, 2));
    console.log('Patient ID:', patient._id);
    console.log('Selected card type:', selectedCardType);
    console.log('Amount:', amount);
    console.log('Payment method (frontend):', paymentMethod);
    console.log('Payment method (backend):', backendPaymentMethod);
    // --- End console logs ---

    await safeOperation(async () => {
      setIsLoading(true); 
      try {
        // Add try/catch inside to get more detailed error info
        const newCard = await patientCardService.createPatientCard(cardData);
        toast.success(`Card ${newCard.cardNumber} issued successfully for ${patient.firstName} ${patient.lastName}!`);
        await fetchPatientData(patient._id);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          console.error('Card creation error details:', {
            message: err.message,
            status: err.response?.status,
            responseData: err.response?.data
          });
        }
        throw err; // Re-throw for safeOperation to handle
      }
    }, 'Failed to issue patient card. Please try again.');
    
    setIsLoading(false); 
  };

  // Renew Card function
  const renewCard = async () => {
    if (!existingCard || !patient) { // Need existing card and patient
      toast.error('Cannot renew: Missing card or patient details.');
      return;
    }
    if (renewalAmount <= 0 || !renewalPaymentMethod) {
        toast.error('Please ensure renewal amount and payment method are valid.')
        return;
    }

    // --- Get mapped payment method for renewal --- 
    const backendRenewalPaymentMethod = paymentMethodBackendMapping[renewalPaymentMethod];
    if (!backendRenewalPaymentMethod) {
        toast.error(`Invalid renewal payment method selected: ${renewalPaymentMethod}. Please choose a valid option.`);
        return; // Stop if mapping fails
    }
    // --- End mapped payment method --- 

    await safeOperation(async () => {
        setIsLoading(true); // Use general loading state
        const paymentDetails = {
            amount: renewalAmount,
            paymentMethod: backendRenewalPaymentMethod, // Use the mapped value
            transactionId: null // Placeholder, real systems might generate/link one
        };
        console.log(`Renewing card ${existingCard._id} with mapped details:`, paymentDetails);
        // Use the service method
        await patientCardService.renewPatientCard(existingCard._id, paymentDetails); 
        toast.success('Patient card renewed successfully');
        setShowRenewModal(false);
        // Refresh data to show updated expiry/status
        await fetchPatientData(patient._id);
    }, 'Failed to renew patient card. Please try again.');
    setIsLoading(false); // Ensure loading stops
  };

  // Get Badge for Status - Use Enum
  const getCardStatusBadge = (status: PatientCardStatusEnum | undefined) => {
    if (status === undefined) {
        return <Badge bg="secondary">Unknown</Badge>;
    }
    switch (status) {
      case PatientCardStatusEnum.ACTIVE:
        return <Badge bg="success">Active</Badge>;
      case PatientCardStatusEnum.GRACE:
        // Get days left from the existingCard object if available
        const daysLeft = existingCard?.daysLeftInGrace;
        return <Badge bg="warning">Grace Period {daysLeft !== undefined ? `(${daysLeft} days left)` : ''}</Badge>; 
      case PatientCardStatusEnum.EXPIRED:
        return <Badge bg="danger">Expired</Badge>;
      case PatientCardStatusEnum.CANCELLED:
        return <Badge bg="danger">Cancelled</Badge>;
      case PatientCardStatusEnum.NONE:
        return <Badge bg="secondary">No Card</Badge>;
      case PatientCardStatusEnum.ERROR:
         return <Badge bg="danger">Error Checking</Badge>; 
      default:
        // Handle potential string values if enum isn't perfectly aligned with backend yet
        const statusString = String(status);
        if (statusString === 'Active') return <Badge bg="success">Active</Badge>;
        if (statusString === 'Grace') return <Badge bg="warning">Grace Period</Badge>;
        if (statusString === 'Expired') return <Badge bg="danger">Expired</Badge>;
        if (statusString === 'Cancelled') return <Badge bg="danger">Cancelled</Badge>;
        return <Badge bg="secondary">{statusString}</Badge>; // Fallback
    }
  };
  
  // Search Patients
  const searchPatients = async () => {
    setIsSearching(true);
    try {
      console.log('Searching patients...');
      // Assuming patientService.getAllPatients returns { patients: Patient[] } or similar
      const result = await patientService.getAllPatients(); 
      let patients: Patient[] = result.patients || (Array.isArray(result) ? result : []);

      let filteredPatients = patients;
      if (searchTerm.trim()) {
        const termLower = searchTerm.toLowerCase().trim();
        filteredPatients = patients.filter(p => 
          (p.firstName?.toLowerCase().includes(termLower)) ||
          (p.lastName?.toLowerCase().includes(termLower)) ||
          (p.patientId?.toLowerCase().includes(termLower)) ||
          (p.contactNumber?.includes(termLower))
        );
      }
      
      // Ensure IDs are consistent if needed by selection logic
      const processedPatients = filteredPatients.map(p => ({ ...p, id: p._id })); 
      setSearchResults(processedPatients);

      if (filteredPatients.length === 0 && patients.length > 0 && searchTerm.trim()) {
        toast(`No patients found matching "${searchTerm}".`);
      } else if (patients.length === 0) {
        toast('No patients registered in the system yet.');
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      toast.error('Failed to search patients.');
    } finally {
      setIsSearching(false);
    }
  };

  // Check User Permissions
  const checkUserPermissions = () => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
    console.log('User permissions:', user?.permissions);
    console.log('Has billing permission check:', hasBillingPermission());
    console.log('manageBilling permission value:', user?.permissions?.manageBilling);
    
    // Display as toast for visual feedback
    if (user) {
      toast.success(`User: ${user.email}, Role: ${user.role}`);
      toast(`Billing permission: ${user.permissions?.manageBilling ? 'YES' : 'NO'}`);
    } else {
      toast.error('No user data available. Try logging in again.');
    }
  };

  // Admin: Update Card Type
  const handleUpdateCardType = useCallback((updatedCard: CardTypeEdit) => {
    console.log('Updating card type:', updatedCard);
    
    try {
      // Find the full card type with _id from our card types array
      const existingCard = cardTypes.find(card => card.value === updatedCard.value);
      
      if (!existingCard) {
        toast.error(`Could not find card type with value ${updatedCard.value}`);
        return;
      }
      
      // Create a complete card object with the _id field included
      const cardToUpdate = {
        _id: existingCard._id,
        name: updatedCard.label || existingCard.name,
        value: updatedCard.value,
        price: updatedCard.price,
        validityMonths: updatedCard.validityMonths || existingCard.validityMonths || 12,
        isActive: existingCard.isActive !== undefined ? existingCard.isActive : true
      };
      
      console.log('Updating card with complete data:', cardToUpdate);
      
      // Update using cardTypeService
      cardTypeService.updateCardType(cardToUpdate)
        .then(() => {
          toast.success(`Card type ${updatedCard.label} updated successfully!`);
          
          // Refresh card types
          loadCardTypes();
          
          // Update amount if this is the selected card type
          if (selectedCardType === updatedCard.value) {
            setAmount(updatedCard.price);
          }
        })
        .catch(error => {
          console.error('Error updating card type:', error);
          toast.error('Failed to update card type. Please try again.');
        });
    } catch (error) {
      console.error('Error in handleUpdateCardType:', error);
      toast.error('An unexpected error occurred while updating the card type.');
    }
  }, [selectedCardType, cardTypes, loadCardTypes]);
  
  // Admin: Add Card Type
  const handleAddCardType = useCallback((newCard: CardTypeEdit) => {
    const cardTypeData = {
      name: newCard.name,
      value: newCard.value,
      price: newCard.price,
      validityMonths: newCard.validityMonths || 12,
      isActive: true,
      description: newCard.benefits
    };
    cardTypeService.createCardType(cardTypeData);
  }, []);

  // Helper to format date
  const formatDate = (date: string | number | Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Function to synchronize frontend card state with backend
  const synchronizeCardStatus = async (patientId: string): Promise<void> => {
    if (!patientId) return;
    
    console.log(`Synchronizing card status for patient ${patientId}`);
    setIsLoadingExistingCard(true);
    
    try {
      // Get fresh data directly from the API
      const apiUrl = API_BASE_URL || import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/api/patient-cards?patient=${patientId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Error synchronizing card status:', response.status, response.statusText);
        toast.error('Could not retrieve current card status from server.');
        return;
      }
      
      const cards = await response.json();
      console.log('SYNC: Retrieved cards from server:', cards);
      
      if (Array.isArray(cards) && cards.length > 0) {
        // Sort by status priority: Active > Grace > most recent by date
        const activeCard = cards.find(card => 
          card.status === 'Active' || card.status === PatientCardStatusEnum.ACTIVE
        );
        
        const graceCard = cards.find(card => 
          card.status === 'Grace' || card.status === PatientCardStatusEnum.GRACE
        );
        
        const sortedCards = [...cards].sort((a, b) => 
          new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
        );
        
        // Set based on priority
        if (activeCard) {
          console.log('SYNC: Found active card, setting in state:', activeCard);
          setExistingCard(activeCard);
          
          // Pre-fill renewal details
          const matchingCardType = cardTypes.find(ct => ct.value === activeCard.type);
          setRenewalAmount(matchingCardType?.price || 0);
          setRenewalPaymentMethod(paymentMethods[0]?.value || '');
        } else if (graceCard) {
          console.log('SYNC: Found grace card, setting in state:', graceCard);
          setExistingCard(graceCard);
          
          // Pre-fill renewal details
          const matchingCardType = cardTypes.find(ct => ct.value === graceCard.type);
          setRenewalAmount(matchingCardType?.price || 0);
          setRenewalPaymentMethod(paymentMethods[0]?.value || '');
        } else if (sortedCards.length > 0) {
          console.log('SYNC: Found other card, setting most recent in state:', sortedCards[0]);
          setExistingCard(sortedCards[0]);
        } else {
          console.log('SYNC: No cards found, clearing state');
          setExistingCard(null);
        }
      } else {
        console.log('SYNC: No cards found, clearing state');
        setExistingCard(null);
      }
    } catch (error) {
      console.error('Error in synchronizeCardStatus:', error);
      toast.error('Failed to synchronize card status with server.');
    } finally {
      setIsLoadingExistingCard(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <Row>
        {/* Patient Selection/Search Column */}
        <Col md={4} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header>
              <h4>Search for a Patient</h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={(e) => { e.preventDefault(); searchPatients(); }}>
                <InputGroup className="mb-3">
                  <Form.Control
                    placeholder="Search by name, patient ID, or contact number"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchPatients();
                      }
                    }}
                  />
                  <Button 
                    variant="primary" 
                    onClick={searchPatients} 
                    disabled={isSearching}
                  >
                    {isSearching ? <Spinner as="span" size="sm" animation="border"/> : 'Search'}
                  </Button>
                </InputGroup>
              </Form>
              
              <div className="d-flex justify-content-end mb-3">
                <Button 
                  variant="outline-secondary" 
                  onClick={() => { setSearchTerm(''); searchPatients(); }} 
                  disabled={isSearching}
                  size="sm"
                >
                  View All Patients
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <Table striped bordered hover responsive size="sm" className="mt-3">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((p) => (
                      // Use p._id which should be reliable from backend
                      <tr key={p._id}> 
                        <td>{p.patientId || p._id}</td> 
                        <td>{`${p.firstName} ${p.lastName}`}</td>
                        <td>
                          <Button 
                            variant="info" 
                            size="sm" 
                            onClick={() => handlePatientSelect(p._id)} // Use p._id
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              
              {searchTerm && !isSearching && searchResults.length === 0 && (
                <Alert variant="info">
                  No patients found matching your search criteria.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Card Management Column */}
        <Col md={8}>
          {/* Admin Settings Toggle/Panel (Keep as is) */}
          {isAdmin && (
             <div className="d-flex justify-content-end mb-3">
               {/* ... toggle button ... */} 
             </div>
           )}
          {isAdmin && showAdminSettings && (
             <AdminCardSettings 
               cardTypes={cardTypes as CardTypeEdit[]} 
               onUpdateCardType={handleUpdateCardType}
               onAddCardType={handleAddCardType}
             />
           )}

          {/* === Conditional Rendering for Card Details / Issue Form === */} 
          {patient ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                {/* Show loading spinner in header if patient data is loading */}
                {isLoading && !patient && <Spinner animation="border" size="sm" className="me-2"/>}
                <h4 className="mb-0 d-inline-block">
                  Card Management for {patient.firstName} {patient.lastName} ({patient.patientId || patient._id})
                </h4>
              </Card.Header>
              <Card.Body style={{ minHeight: '200px' }}> {/* Added minHeight for better loading state */} 
                {/* 1. Show loading spinner while checking for existing card */} 
                {isLoadingExistingCard ? (
                  <div className="text-center my-5">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading card status...</span>
                    </Spinner>
                    <p className="mt-2 text-muted">Checking existing card...</p>
                  </div>
                ) : 
                /* 2. If loading is done and an existing card WAS found */ 
                existingCard ? (
                  <div>
                    <h5>Patient Card Information</h5>
                    {(!isCardActive(existingCard) && !isCardInGracePeriod(existingCard)) && (
                      <Alert variant="warning" className="mb-3">
                        <strong>Note:</strong> This card is {existingCard.status.toLowerCase()}. 
                        {existingCard.status === PatientCardStatusEnum.EXPIRED ? 
                          " You can renew it or issue a new card." : 
                          " You can issue a new card for this patient."}
                      </Alert>
                    )}
                    <ListGroup variant="flush" className="mb-3">
                      <ListGroup.Item>
                        <strong>Card Number:</strong> {existingCard.cardNumber}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Type:</strong> {existingCard.type}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Status:</strong> {getCardStatusBadge(existingCard.status)}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Issued:</strong> {formatDate(existingCard.issuedDate)}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Expires:</strong> {formatDate(existingCard.expiryDate)}
                         {existingCard.status === PatientCardStatusEnum.GRACE && existingCard.graceEndDate && (
                           <span className="text-warning ms-2 fst-italic">(Grace period ends: {formatDate(existingCard.graceEndDate)})</span>
                         )}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Last Payment:</strong> {formatDate(existingCard.lastPaymentDate)}
                      </ListGroup.Item>
                      {/* Display Benefits */}
                      <ListGroup.Item>
                         <strong>Benefits:</strong>
                         {existingCard.benefits ? (
                             <ul className="list-unstyled ms-3 mt-1 small text-muted">
                               <li>Discount: {existingCard.benefits.discountPercentage || 0}%</li>
                               <li>Free Consultations: {existingCard.benefits.freeConsultations || 0}</li>
                               <li>Priority Appointments: {existingCard.benefits.priorityAppointments ? 'Yes' : 'No'}</li>
                               <li>Free Lab Tests: {existingCard.benefits.freeLabTests || 0}</li>
                             </ul>
                         ) : (
                            <span className="text-muted ms-2">N/A</span>
                         )}
                       </ListGroup.Item>
                    </ListGroup>
                    
                    {/* --- Action Buttons for Existing Card --- */} 
                    <div className="d-flex justify-content-end gap-2">
                       {/* Show Renew button only if card is Active, Grace, or Expired */} 
                       {(isCardActive(existingCard) || 
                         isCardInGracePeriod(existingCard) || 
                         existingCard.status === PatientCardStatusEnum.EXPIRED) && (
                           <Button 
                             variant="success" 
                             onClick={() => setShowRenewModal(true)}
                             disabled={isLoading} 
                           >
                             Renew Card
                           </Button>
                       )}
                       
                       {/* Show Issue New Card button only for expired/cancelled cards */}
                       {(existingCard.status === PatientCardStatusEnum.EXPIRED || 
                         existingCard.status === PatientCardStatusEnum.CANCELLED) && (
                           <Button
                             variant="primary"
                             onClick={() => {
                               // Clear the existing card so the UI shows the issue form
                               setExistingCard(null);
                               // Reset form values
                               const firstCardType = cardTypes[0];
                               setSelectedCardType(firstCardType?.value || '');
                               setAmount(firstCardType?.price || 0);
                               setPaymentMethod(paymentMethods[0]?.value || '');
                             }}
                             disabled={isLoading}
                           >
                             Issue New Card
                           </Button>
                       )}
                       
                       {/* Add Cancel button maybe? */} 
                       {/* <Button variant="danger" size="sm" onClick={handleCancelCard}>Cancel Card</Button> */} 
                    </div>
                    
                    {/* Payment History Table */}
                    {existingCard.paymentHistory && existingCard.paymentHistory.length > 0 && (
                      <div className="mt-4">
                        <h6>Payment History</h6>
                        <Table striped bordered hover size="sm" responsive>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {existingCard.paymentHistory.map((payment, index) => (
                              <tr key={`payment-${index}-${payment.paymentDate}`}> {/* Improved key */} 
                                <td>{formatDate(payment.paymentDate)}</td>
                                <td>${payment.amount?.toFixed(2)}</td>
                                <td>{payment.paymentMethod}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : 
                /* 3. If loading is done and NO active/grace card was found */ 
                (
                  <div>
                    <h5>Issue New Patient Card</h5>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={(e) => { e.preventDefault(); issueCard(); }}> {/* Added onSubmit handler */} 
                      <Form.Group as={Row} className="mb-3" controlId="cardTypeSelect">
                        <Form.Label column sm={3}>Card Type:</Form.Label>
                        <Col sm={9}>
                          <Form.Select 
                            value={selectedCardType} 
                            onChange={(e) => handleCardTypeChange(e.target.value)}
                            disabled={isLoading || cardTypes.length === 0}
                            aria-label="Select Card Type"
                            required // Make selection required
                          >
                            <option value="" disabled>-- Select Card Type --</option>
                            {cardTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.name} - {type.description || `${type.name} patient membership with ${type.name.toLowerCase()} benefits.`} (ETB {type.price})
                              </option>
                            ))}
                          </Form.Select>
                          {cardTypes.length === 0 && !isLoading && (
                              <Form.Text className="text-danger">No card types available. Configure in Admin settings.</Form.Text>
                          )}
                        </Col>
                      </Form.Group>

                      <Form.Group as={Row} className="mb-3" controlId="amountInput">
                        <Form.Label column sm={3}>Amount:</Form.Label>
                        <Col sm={9}>
                           <InputGroup>
                             <InputGroup.Text>ETB</InputGroup.Text>
                             <Form.Control 
                               type="number" 
                               value={amount} 
                               onChange={(e) => handleAmountChange(e.target.value)} 
                               disabled={isLoading} // Amount might be auto-set based on type
                               readOnly={!isAdmin} // Only admin can override default price
                               min="0.01" // Ensure positive amount
                               step="0.01"
                               aria-label="Amount"
                               required
                             />
                           </InputGroup>
                           {!isAdmin && <Form.Text className="text-muted">Amount is determined by card type.</Form.Text>} 
                         </Col>
                      </Form.Group>

                      <Form.Group as={Row} className="mb-3" controlId="paymentMethodSelect">
                        <Form.Label column sm={3}>Payment Method:</Form.Label>
                        <Col sm={9}>
                          <Form.Select 
                            value={paymentMethod} 
                            onChange={(e) => handlePaymentMethodChange(e.target.value)}
                            disabled={isLoading}
                            aria-label="Select Payment Method"
                            required
                          >
                             {paymentMethods.map(method => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                      </Form.Group>

                      <div className="d-flex justify-content-end">
                        <Button 
                          type="submit" // Changed to type submit
                          variant="primary" 
                          // onClick={issueCard} // Removed onClick, using form onSubmit now
                          disabled={isLoading || !selectedCardType || amount <= 0 || !paymentMethod}
                        >
                          {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Issue Card'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                )}
              </Card.Body>
            </Card>
          ) : (
            /* 4. If no patient is selected yet */ 
            <Alert variant="secondary" className="text-center p-4">
              <Spinner animation="grow" size="sm" className="me-2" /> Please search for and select a patient to manage their card.
            </Alert>
          )}
          {/* === End Conditional Rendering === */} 
        </Col>
      </Row>

      {/* Renew Card Modal (Only render if existingCard is available) */}
       {existingCard && (
         <Modal show={showRenewModal} onHide={() => setShowRenewModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Renew Card: {existingCard.cardNumber}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={(e) => { e.preventDefault(); renewCard(); }}> {/* Added onSubmit */} 
             <Modal.Body>
               <p>Renewing card for <strong>{patient?.firstName} {patient?.lastName}</strong>.</p>
               <p>Current Type: <strong>{existingCard.type}</strong></p>
               <p>Current Expiry: <strong>{formatDate(existingCard.expiryDate)}</strong></p>
               <hr />
               <Form.Group className="mb-3" controlId="renewalAmountInput">
                 <Form.Label>Renewal Amount</Form.Label>
                 <InputGroup>
                    <InputGroup.Text>ETB</InputGroup.Text>
                    <Form.Control 
                      type="number" 
                      value={renewalAmount} 
                      onChange={(e) => setRenewalAmount(parseFloat(e.target.value) || 0)}
                      min="0.01"
                      step="0.01"
                      aria-label="Renewal Amount"
                      readOnly={!isAdmin} // Allow admin to override default price
                      required
                    />
                  </InputGroup>
                    {!isAdmin && (
                     <Form.Text className="text-muted">
                       Default price for {existingCard.type} card.
                     </Form.Text>
                   )}
               </Form.Group>
               <Form.Group className="mb-3" controlId="renewalPaymentMethodSelect">
                 <Form.Label>Payment Method</Form.Label>
                 <Form.Select 
                   value={renewalPaymentMethod} 
                   onChange={(e) => setRenewalPaymentMethod(e.target.value)}
                   aria-label="Select Renewal Payment Method"
                   required
                 >
                    {paymentMethods.map((method) => (
                     <option key={method.value} value={method.value}>
                       {method.label}
                     </option>
                   ))}
                 </Form.Select>
               </Form.Group>
            </Modal.Body>
             <Modal.Footer>
               <Button variant="secondary" onClick={() => setShowRenewModal(false)}>Cancel</Button>
               <Button 
                 type="submit" // Changed to type submit
                 variant="success" 
                 // onClick={renewCard} // Removed onClick
                 disabled={isLoading || renewalAmount <= 0 || !renewalPaymentMethod}
                >
                 {isLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Confirm Renewal'}
               </Button>
            </Modal.Footer>
            </Form>
         </Modal>
       )}
    </div>
  );
};

export default PatientCardManagement; 