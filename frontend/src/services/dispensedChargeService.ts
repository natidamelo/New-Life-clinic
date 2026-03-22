import { api } from './api'; // Assuming a configured axios instance

// Mirroring the backend DispensedItemCharge model structure (relevant fields)
export interface DispensedItemCharge {
  _id: string;
  patient: string; // Patient ID
  inventoryItem?: { // Populated from InventoryItem model
    _id: string;
    name: string;
    itemCode?: string;
  };
  itemName: string; // Fallback or specific name stored at dispense time
  quantityDispensed: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending_billing' | 'billed' | 'cancelled';
  dispenseDate: string; // ISO Date string
  dispensedBy?: { // Populated from User model
    _id: string;
    firstName: string;
    lastName: string;
  };
  invoice?: string; // Invoice ID, populated when billed
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const dispensedChargeService = {
  async getPendingChargesByPatient(patientId: string): Promise<DispensedItemCharge[]> {
    const response = await api.get<DispensedItemCharge[]>(`/dispensed-charges/pending/${patientId}`);
    return response.data;
  },

  async markChargeAsBilled(chargeId: string, invoiceId: string): Promise<{ message: string; charge: DispensedItemCharge }> {
    const response = await api.put<{ message: string; charge: DispensedItemCharge }>(
      `/dispensed-charges/${chargeId}/mark-billed`,
      { invoiceId }
    );
    return response.data;
  },

  async cancelCharge(chargeId: string): Promise<{ message: string; charge: DispensedItemCharge }> {
    const response = await api.put<{ message: string; charge: DispensedItemCharge }>(
      `/dispensed-charges/${chargeId}/cancel`
    );
    return response.data;
  },
};

export default dispensedChargeService; 