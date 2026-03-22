import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import cardTypeService from '../services/cardTypeService';

export interface CardType {
  _id: string;
  name: string;
  value: string;
  price: number;
  validityMonths: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

interface CardTypeContextProps {
  cardTypes: CardType[];
  isLoading: boolean;
  error: string | null;
  setCardTypes: React.Dispatch<React.SetStateAction<CardType[]>>;
  refreshCardTypes: () => Promise<void>;
}

const CardTypeContext = createContext<CardTypeContextProps | undefined>(undefined);

export const CardTypeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCardTypes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await cardTypeService.fetchCardTypes();
      const fetchedCardTypes = cardTypeService.getCardTypes();
      setCardTypes(fetchedCardTypes);
      console.log('✅ Card types refreshed from API:', fetchedCardTypes.length);
    } catch (err) {
      console.error('❌ Error refreshing card types:', err);
      setError('Failed to fetch card types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch of card types
    const initializeCardTypes = async () => {
      try {
        await refreshCardTypes();
      } catch (error) {
        console.error('Error initializing card types:', error);
        // Continue with empty card types rather than failing
      }
    };

    initializeCardTypes();

    // Listen for card type changes
    const unsubscribe = cardTypeService.addListener(() => {
      const updatedCardTypes = cardTypeService.getCardTypes();
      setCardTypes(updatedCardTypes);
    });

    return unsubscribe;
  }, []);

  return (
    <CardTypeContext.Provider value={{ 
      cardTypes, 
      isLoading, 
      error,
      setCardTypes,
      refreshCardTypes
    }}>
      {children}
    </CardTypeContext.Provider>
  );
};

export const useCardTypes = () => {
  const context = useContext(CardTypeContext);
  if (!context) {
    throw new Error('useCardTypes must be used within a CardTypeProvider');
  }
  return context;
}; 