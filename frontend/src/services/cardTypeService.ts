import api from './apiService';
import { CardType } from '../context/CardTypeContextNew';

// Event listeners for card type changes
type CardTypeListener = () => void;
const listeners: CardTypeListener[] = [];

/**
 * Card Type Manager - Singleton service for managing card types
 */
class CardTypeManager {
  private cardTypes: CardType[] = [];
  private isLoading: boolean = false;
  private error: string | null = null;

  constructor() {
    // Initialize with empty array - will be populated from API
    this.cardTypes = [];
  }

  // Add a listener for card type changes
  addListener(listener: CardTypeListener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of card type changes
  notifyListeners() {
    listeners.forEach(listener => listener());
  }

  // Get current card types
  getCardTypes(): CardType[] {
    return this.cardTypes;
  }

  // Set card types
  setCardTypes(cardTypes: CardType[]) {
    this.cardTypes = cardTypes;
    this.notifyListeners();
  }

  // Fetch from backend
  async fetchCardTypes(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Check if API is available
      if (!api || typeof api.get !== 'function') {
        console.warn('API client not available, using empty array');
        this.cardTypes = [];
        this.isLoading = false;
        return;
      }
      
      try {
        // Attempt to fetch card types from the backend
        // Using ApiService's default 10-second timeout
        const response = await api.get('/api/card-types');

        if (response.data && Array.isArray(response.data)) {
          this.cardTypes = response.data;
          console.log('✅ Successfully fetched card types from API:', this.cardTypes.length);
        } else {
          console.warn('Unexpected card types response format, using empty array:', response.data);
          this.cardTypes = [];
        }
      } catch (fetchError: any) {
        console.error('Error fetching card types:', fetchError);
        
        // If it's a timeout error, provide default card types
        if (fetchError.name === 'TimeoutError' || fetchError.message.includes('timeout')) {
          console.warn('Card types API timeout, using default card types');
          const now = new Date().toISOString();
          this.cardTypes = [
            { _id: '1', name: 'Basic', value: 'basic', price: 100, validityMonths: 12, description: 'Basic patient membership card.', isActive: true, createdAt: now, updatedAt: now },
            { _id: '2', name: 'Premium', value: 'premium', price: 200, validityMonths: 12, description: 'Premium patient membership with additional benefits.', isActive: true, createdAt: now, updatedAt: now },
            { _id: '3', name: 'VIP', value: 'vip', price: 400, validityMonths: 12, description: 'VIP patient membership with exclusive benefits.', isActive: true, createdAt: now, updatedAt: now },
            { _id: '4', name: 'Family', value: 'family', price: 500, validityMonths: 12, description: 'Family membership for multiple family members.', isActive: true, createdAt: now, updatedAt: now },
            { _id: '5', name: 'Insurance', value: 'insurance', price: 150, validityMonths: 12, description: 'Insurance patient membership with insurance benefits.', isActive: true, createdAt: now, updatedAt: now }
          ] as any;
        } else {
          // Use empty array on other errors
          this.cardTypes = [];
        }
      }
      
      this.isLoading = false;
      this.notifyListeners();
    } catch (error) {
      console.error('Error in fetchCardTypes:', error);
      this.error = 'Failed to fetch card types';
      this.cardTypes = [];
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  // Create a new card type
  async createCardType(card: Omit<CardType, '_id' | 'createdAt' | 'updatedAt'>): Promise<CardType> {
    try {
      console.log('🔧 Creating card type:', card);

      // Use the configured API client (authentication is handled automatically by the API service)
      const response = await api.post('/api/card-types', card);

      // Add the new card to the local cache
      const newCard = response.data.data || response.data;
      this.cardTypes = [...this.cardTypes, newCard];
      this.notifyListeners();
      
      console.log('✅ Card type created successfully:', newCard);
      return newCard;
    } catch (error: any) {
      console.error('❌ Error creating card type:', error);
      
      // The API service will handle authentication errors and provide appropriate messages
      // Just re-throw the error to let the calling component handle it
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Invalid card type data';
        throw new Error(`Validation error: ${errorMsg}`);
      }
      
      throw error;
    }
  }

  // Update an existing card type
  async updateCardType(card: { _id: string; name: string; value: string; price: number; validityMonths: number; isActive: boolean; description?: string }) {
    try {
      // Make sure we have a valid ID
      if (!card._id) {
        console.error("Missing card ID for update:", card);
        throw new Error("Card ID is required for updates");
      }

      // For static IDs, only do local updates to avoid authentication issues
      if (card._id.startsWith('static')) {
        console.log("⚠️  Static card type update - updating locally only:", card.name);
        
        // Find the card in the local cache
        const index = this.cardTypes.findIndex(ct => ct._id === card._id);
        
        if (index >= 0) {
          // Create a new array with the updated card
          const updatedTypes = [...this.cardTypes];
          updatedTypes[index] = {...updatedTypes[index], ...card, updatedAt: new Date().toISOString()};
          
          // Update the internal state
          this.cardTypes = updatedTypes;
          this.notifyListeners();
          
          // Return a mock response similar to what the API would return
          return {
            success: true,
            message: 'Card type updated successfully (local only)',
            data: updatedTypes[index]
          };
        }
        
        throw new Error(`Static card type with ID ${card._id} not found`);
      } else {
        // For MongoDB ObjectIDs (not starting with 'static' or 'mock')
        // Real MongoDB ObjectID - use the API to update in the database
        const response = await api.put(`/api/card-types/${card._id}`, card);

        // After successful update, update the local cache
        const updatedCard = response.data.data || response.data;
        const index = this.cardTypes.findIndex(ct => ct._id === card._id);
        
        if (index >= 0) {
          // Create a new array with the updated card
          const updatedTypes = [...this.cardTypes];
          updatedTypes[index] = {...updatedTypes[index], ...updatedCard};
          
          // Update the internal state
          this.cardTypes = updatedTypes;
          this.notifyListeners();
        } else {
          // If the card wasn't found in the cache, refresh the entire list
          await this.fetchCardTypes();
        }
        
        return response.data;
      }
    } catch (error: any) {
      console.error("Error updating card type:", error);
      throw error;
    }
  }

  // Delete a card type
  async deleteCardType(id: string): Promise<void> {
    try {

      // Use the configured API client
      const response = await api.delete(`/api/card-types/${id}`);

      // Remove the card from the local cache
      this.cardTypes = this.cardTypes.filter(card => card._id !== id);
      this.notifyListeners();
    } catch (error: any) {
      console.error('Error deleting card type:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const cardTypeManager = new CardTypeManager();

// Export the service methods
export const cardTypeService = {
  getCardTypes: () => cardTypeManager.getCardTypes(),
  setCardTypes: (cardTypes: CardType[]) => cardTypeManager.setCardTypes(cardTypes),
  fetchCardTypes: () => cardTypeManager.fetchCardTypes(),
  createCardType: (card: Omit<CardType, '_id' | 'createdAt' | 'updatedAt'>) => cardTypeManager.createCardType(card),
  updateCardType: (card: { _id: string; name: string; value: string; price: number; validityMonths: number; isActive: boolean; description?: string }) => 
    cardTypeManager.updateCardType(card),
  deleteCardType: (id: string) => cardTypeManager.deleteCardType(id),
  addListener: (listener: () => void) => cardTypeManager.addListener(listener)
};

export default cardTypeService; 