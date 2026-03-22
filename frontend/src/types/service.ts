export interface Service {
  _id: string;
  name: string;
  code?: string;
  category: 'consultation' | 'procedure' | 'lab' | 'imaging' | 'injection' | 'ultrasound' | 'blood_test' | 'rbs' | 'other';
  price: number;
  unit?: string;
  description?: string;
  isActive: boolean;
  /**
   * IDs of inventory items (e.g., consumables/medications) that are consumed when
   * this service is performed. Used for automatic stock deduction and availability checks.
   */
  linkedInventoryItems?: string[];
  // Inventory fields for automatic inventory item creation
  quantity?: number;
  costPrice?: number;
  sellingPrice?: number;
  // Service-specific fields
  serviceDuration?: string;
  serviceRequirements?: string;
  serviceEquipment?: string;
  serviceStaffRequired?: string;
  servicePreparation?: string;
  serviceFollowUp?: string;
  serviceContraindications?: string;
  serviceIndications?: string;
  // Additional lab-specific fields
  serviceStorageTemperature?: string;
  serviceSpecimenType?: string;
  serviceTestType?: string;
  createdAt?: string;
  updatedAt?: string;
} 