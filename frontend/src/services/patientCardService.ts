import axios from 'axios';
import config from '../config';
import cardTypeService from './cardTypeService';
import { toast } from 'react-hot-toast';
import { getAuthToken } from '../utils/authToken';

// Define and export the status enum
export enum PatientCardStatusEnum {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  CANCELLED = 'Cancelled',
  GRACE = 'Grace',
  NONE = 'None', // Added for clarity in status checks
  ERROR = 'Error' // Added for error states
}

export interface PatientCard {
  _id: string;
  patient: string;
  cardNumber: string;
  type: 'Basic' | 'Premium' | 'VIP' | 'Family';
  status: PatientCardStatusEnum; // Use the enum here
  issuedDate: string;
  expiryDate: string;
  lastPaymentDate: string;
  amountPaid: number;
  graceEndDate?: string;
  benefits: {
    discountPercentage: number;
    freeConsultations: number;
    priorityAppointments: boolean;
    freeLabTests: number;
  };
  inGracePeriod?: boolean;
  daysLeftInGrace?: number;
  isValid?: boolean;
  // Add paymentHistory if it's expected from the backend
  paymentHistory?: Array<{ amount: number; paymentDate: string; paymentMethod: string; transaction?: string }>;
}

// This interface describes the simplified status returned by getPatientCardByPatientId
// It might be less necessary if getPatientCards is used primarily
export interface PatientCardSimpleStatus {
  hasCard: boolean;
  isValid: boolean;
  inGracePeriod: boolean;
  daysLeftInGrace: number;
  status: PatientCardStatusEnum;
  expiryDate?: string;
  graceEndDate?: string;
  cardType?: string;
  cardId?: string;
}

// Helper to get the correct API base URL
const getApiBaseUrl = () => {
  return config.API_BASE_URL || import.meta.env.VITE_API_BASE_URL;
};

// Add a helper function to get the price for a card type
export const getCardTypePrice = (type: string): number => {
  const cardTypes = cardTypeService.getCardTypes();
  const cardType = cardTypes.find(card => card.value === type);
  return cardType ? cardType.price : 20; // Default to 20 if not found
};

const patientCardService = {
  // Get all patient cards (fetches an array of full PatientCard objects)
  async getPatientCards(filter: { patient?: string }): Promise<PatientCard[]> {
    const apiUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (filter.patient) {
      params.append('patient', filter.patient);
    }
    
    // Check for auth token (use unified util)
    const token = getAuthToken();
    if (!token) {
      console.error('Authentication token is missing when fetching patient cards');
      throw new Error('Authentication required. Please log in again.');
    }
    
    try {
      console.log('Fetching patient cards with params:', params.toString());
      const response = await axios.get(`${apiUrl}/api/patient-cards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure the response data is an array
      const cards = Array.isArray(response.data) ? response.data : [];
      console.log(`Received ${cards.length} patient cards`);
      return cards;
    } catch (error) {
      console.error('Error fetching patient cards:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Handle authentication error
          toast.error('Authentication required. Please log in again.');
          throw new Error('Authentication required. Please log in again.');
        }
        // Log the server response if available
        console.error('Server response:', error.response?.data);
      }
      throw error;
    }
  },

  // Get patient card by ID
  async getPatientCardById(id: string): Promise<PatientCard> {
    const apiUrl = getApiBaseUrl();
    const response = await axios.get(`${apiUrl}/api/patient-cards/${id}`);
    return response.data;
  },

  // Get patient card by patient ID (Legacy? May not be needed if getPatientCards is used)
  async getPatientCardByPatientId(patientId: string): Promise<PatientCardSimpleStatus> {
    try {
      const apiUrl = getApiBaseUrl();
      const token = getAuthToken();
      
      if (!token) {
        console.error('Authentication token is missing when fetching patient card');
        throw new Error('Authentication required. Please log in again.');
      }
      
      const response = await axios.get(`${apiUrl}/api/patient-cards?patient=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.length > 0) {
        const card = response.data[0];
        return {
          hasCard: true,
          isValid: card.isValid ?? false,
          inGracePeriod: card.inGracePeriod ?? false,
          daysLeftInGrace: card.daysLeftInGrace ?? 0,
          status: card.status as PatientCardStatusEnum,
          expiryDate: card.expiryDate,
          graceEndDate: card.graceEndDate,
          cardType: card.type,
          cardId: card._id
        };
      }
      
      return {
        hasCard: false,
        isValid: false,
        inGracePeriod: false,
        daysLeftInGrace: 0,
        status: PatientCardStatusEnum.NONE
      };
    } catch (error) {
      console.error('Error fetching patient card:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast.error('Authentication required. Please log in again.');
          throw new Error('Authentication required. Please log in again.');
        }
        console.error('Server response:', error.response?.data);
      }
      return {
        hasCard: false,
        isValid: false,
        inGracePeriod: false,
        daysLeftInGrace: 0,
        status: PatientCardStatusEnum.ERROR
      };
    }
  },

  // Create Patient Card
  async createPatientCard(cardData: Omit<PatientCard, '_id' | 'cardNumber' | 'issuedDate' | 'status' | 'benefits'> & { type: string, patient: string, amountPaid: number, paymentMethod: string }): Promise<PatientCard> {
    const apiUrl = getApiBaseUrl();
    
    // Check for auth token and log if missing
    const token = getAuthToken();
    if (!token) {
      console.error('Authentication token is missing when creating patient card');
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Log the request details for debugging
    console.log('Creating patient card with URL:', `${apiUrl}/api/patient-cards`);
    console.log('Card data:', cardData);
    console.log('Token present:', !!token);
    
    try {
      const response = await axios.post(`${apiUrl}/api/patient-cards`, cardData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating patient card:', error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          toast.error('Authentication required. Please log in again.');
          throw new Error('Authentication required. Please log in again.');
        }
        console.error('Server response:', error.response.data);
        // Re-throw with more details if available
        throw error;
      }
      throw error;
    }
  },

  // Renew patient card. When invoiceOnly is true, creates a pending billing invoice; payment is processed in Billing, then card activates.
  async renewPatientCard(
    cardId: string,
    paymentDetails: { amount: number; paymentMethod?: string; transactionId?: string | null; invoiceOnly?: boolean }
  ): Promise<PatientCard & { invoiceOnly?: boolean; invoiceId?: string; invoiceNumber?: string; message?: string }> {
    const apiUrl = getApiBaseUrl();
    const response = await axios.post(`${apiUrl}/api/patient-cards/${cardId}/renew`, paymentDetails, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    return response.data;
  },

  // Cancel patient card
  async cancelPatientCard(cardId: string, reason: string): Promise<PatientCard> {
    const apiUrl = getApiBaseUrl();
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required. Please log in again.');
      throw new Error('Authentication required. Please log in again.');
    }
    try {
      const response = await axios.post(`${apiUrl}/api/patient-cards/${cardId}/cancel`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          toast.error('Authentication required. Please log in again.');
          throw new Error('Authentication required. Please log in again.');
        }
      }
      throw error;
    }
  },

  // Get card price by type
  getCardPrice(type: string): number {
    return getCardTypePrice(type);
  }
};

export default patientCardService; 