import api from './apiService';

export interface InventoryItem {
  _id: string;
  id?: string;
  itemCode?: string;
  name: string;
  description: string;
  category: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  reorderLevel: number;
  minimumStockLevel?: number;
  reorderPoint?: number;
  costPrice?: number;
  sellingPrice?: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  location?: string;
  expiryDate?: string;
  supplier?: Supplier;
  notes?: string;
  isActive?: boolean;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
  needsReorder?: boolean;
  // Additional properties
  storageTemperature?: string;
  specimenType?: string;
  testType?: string;
  processTime?: string;
  manufacturer?: string;
  batchNumber?: string;
  purchaseDate?: string;
  expiryReminder?: string;
  minOrderQuantity?: string;
  attachments?: string[];
  customTags?: string;
  // Medication-specific properties
  dosage?: string;
  dosageCustom?: string;
  administrationRoute?: string;
  adminRouteCustom?: string;
  activeIngredient?: string;
  prescriptionRequired?: boolean;
}

export interface StockUpdatePayload {
  quantity: number;
  type: 'add' | 'remove' | 'set';
  reason: string;
  reference?: string;
}

export interface InventoryReports {
  count: number;
  items: InventoryItem[];
}

// Export the detailed Supplier interface
export interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

// Add supplier functions (integrated into service object below)

// Define StockMovement interface
interface StockMovement {
  _id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  reason: string;
  user: string;
}



// Stock movement functions (integrated into service object below)

const inventoryService = {
  // Get all inventory items
  getAllInventoryItems: async (params?: { withServices?: boolean }): Promise<InventoryItem[]> => {
    try {
      const queryParams: any = {};
      if (params?.withServices) {
        queryParams.withServices = 'true';
      }
      const response = await api.get('/api/inventory', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  },

  // Get inventory items with filters
  getInventoryItems: async (token: string, filters?: any): Promise<InventoryItem[]> => {
    try {
      let url = '/api/inventory';
      const params = new URLSearchParams();
      
      if (filters?.category) {
        params.append('category', filters.category);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory items with filters:', error);
      throw error;
    }
  },

  // Get inventory item by ID
  getInventoryItemById: async (id: string): Promise<InventoryItem> => {
    try {
      const response = await api.get(`/api/inventory/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching inventory item with ID ${id}:`, error);
      throw error;
    }
  },

  // Create new inventory item
  createInventoryItem: async (item: any): Promise<InventoryItem> => {
    try {
      console.log('Creating inventory item with data:', item);
      const response = await api.post('/api/inventory', item);
      return response.data;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw new Error('Failed to create inventory item. Please check your connection and try again.');
    }
  },

  // Update inventory item
  updateInventoryItem: async (id: string, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    try {
      const response = await api.put(`/api/inventory/${id}`, item);
      return response.data;
    } catch (error) {
      console.error(`Error updating inventory item with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete inventory item (strict: only succeeds on 200/204)
  deleteInventoryItem: async (id: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/api/inventory/${id}`);
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error(`Error deleting inventory item with ID ${id}:`, error);
      return false;
    }
  },

  // Delete inventory item by name
  deleteInventoryItemByName: async (name: string): Promise<{ success: boolean; message: string; deletedItem?: any }> => {
    try {
      console.log(`🗑️ [InventoryService] Deleting item by name: ${name}`);
      
      // Use DELETE method with proper data handling
      const response = await api.delete('/api/inventory/delete-by-name', {
        data: { name }
      });
      
      console.log(`✅ [InventoryService] Delete successful:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [InventoryService] Error deleting item "${name}":`, error);
      
      // Handle different error types
      if (error.response?.status === 404) {
        return {
          success: false,
          message: `Item "${name}" not found in laboratory category`
        };
      } else if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Authentication required. Please log in again.'
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          message: 'Access denied. You do not have permission to delete items.'
        };
      } else {
        return {
          success: false,
          message: error.response?.data?.message || error.message || 'Failed to delete item'
        };
      }
    }
  },

  // Search inventory items
  searchInventoryItems: async (searchTerm: string): Promise<InventoryItem[]> => {
    try {
      const response = await api.get(`/api/inventory/search?q=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      console.error(`Error searching inventory items with term "${searchTerm}":`, error);
      throw error;
    }
  },

  // Get low stock inventory items
  getLowStockItems: async (): Promise<InventoryItem[]> => {
    try {
      const response = await api.get('/api/inventory/low-stock');
      return response.data;
    } catch (error) {
      console.error('Error fetching low stock inventory items:', error);
      throw error;
    }
  },

  // Update inventory item quantity
  updateItemQuantity: async (id: string, quantityChange: number): Promise<InventoryItem> => {
    try {
      const response = await api.patch(`/api/inventory/${id}/quantity`, { quantityChange });
      return response.data;
    } catch (error) {
      console.error(`Error updating quantity for inventory item with ID ${id}:`, error);
      throw error;
    }
  },

  // Get all inventory items with optional filters
  getAllItems: async (filters?: { 
    category?: string; 
    lowStock?: boolean; 
    search?: string;
  }): Promise<InventoryItem[]> => {
    try {
      console.log('Fetching inventory items with filters:', filters);
      const response = await api.get('/api/inventory', { params: filters });
      
      const items = response.data;
      console.log(`Found ${items.length} inventory items`);
      
      // Ensure each item has an id field
      return items.map((item: InventoryItem) => {
        if (item._id && !item.id) {
          item.id = item._id.toString();
        }
        return item;
      });
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      return [];
    }
  },

  // Get low stock report
  getLowStockReport: async (): Promise<InventoryReports> => {
    try {
      console.log('Fetching low stock report');
      const response = await api.get('/api/inventory/reports/low-stock');
      
      // Ensure each item has an id field
      const processedItems = response.data.items.map((item: InventoryItem) => {
        if (item._id && !item.id) {
          item.id = item._id.toString();
        }
        return item;
      });
      
      return {
        count: response.data.count,
        items: processedItems
      };
    } catch (error) {
      console.error('Error fetching low stock report:', error);
      return { count: 0, items: [] };
    }
  },

  // Get suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    try {
      const response = await api.get('/api/suppliers');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error('Failed to fetch suppliers. Please check your connection and try again.');
    }
  },

  // Create supplier - ensure signature uses the exported Supplier
  createSupplier: async (supplierData: Partial<Supplier>): Promise<Supplier> => {
    try {
      const response = await api.post('/api/suppliers', supplierData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw new Error('Failed to create supplier. Please check your connection and try again.');
    }
  },

  // Get stock movements
  getStockMovements: async (): Promise<StockMovement[]> => {
    try {
      const response = await api.get('/api/inventory/movements');
      const raw = (response.data && (response.data.data || response.data.movements)) || response.data || [];

      // Normalize backend transaction shape → frontend StockMovement shape
      const normalized: StockMovement[] = (Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : []).map((m: any) => {
        const transactionType: string | undefined = m.transactionType || m.type;
        const numericQuantity: number | undefined = typeof m.quantity === 'number' ? m.quantity : undefined;
        const inferredType: 'in' | 'out' = ((): 'in' | 'out' => {
          if (m.type === 'in' || m.type === 'out') return m.type;
          if (transactionType === 'purchase' || transactionType === 'add') return 'in';
          if (transactionType === 'medical-use' || transactionType === 'remove' || transactionType === 'adjustment') {
            if (typeof numericQuantity === 'number') return numericQuantity >= 0 ? 'in' : 'out';
            return 'out';
          }
          if (typeof numericQuantity === 'number') return numericQuantity >= 0 ? 'in' : 'out';
          return 'in';
        })();

        const userName = m.performedBy
          ? `${m.performedBy.firstName || ''} ${m.performedBy.lastName || ''}`.trim() || 'System'
          : m.user || 'System';

        return {
          _id: m._id || m.id,
          itemId: (m.item && (m.item._id || m.item.id)) || m.itemId || '',
          itemName: (m.item && (m.item.name || m.item.itemCode)) || m.itemName || 'Unknown Item',
          type: inferredType,
          quantity: Math.abs(numericQuantity ?? 0),
          date: m.createdAt || m.date || new Date().toISOString(),
          reason: m.reason || m.documentReference || m.notes || '',
          user: userName,
        } as StockMovement;
      });

      return normalized;
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      throw new Error('Failed to fetch stock movements. Please check your connection and try again.');
    }
  },

  // Record stock movement
  recordStockMovement: async (movementData: {
    itemId: string;
    type: 'in' | 'out';
    quantity: number;
    reason: string;
    itemName?: string;
  }): Promise<StockMovement> => {
    try {
      // Backend expects type: 'add' | 'remove'
      const payload = {
        itemId: movementData.itemId,
        type: movementData.type === 'in' ? 'add' : 'remove',
        quantity: movementData.quantity,
        reason: movementData.reason,
        reference: movementData.itemName,
      };
      const response = await api.post('/api/inventory/movements', payload);
      const tx = response.data?.transaction || response.data?.data || response.data;
      // Normalize single result
      const normalized: StockMovement = {
        _id: tx._id || tx.id,
        itemId: (tx.item && (tx.item._id || tx.item.id)) || tx.itemId || payload.itemId,
        itemName: (tx.item && (tx.item.name || tx.item.itemCode)) || movementData.itemName || 'Unknown Item',
        type: movementData.type,
        quantity: Math.abs(tx.quantity ?? movementData.quantity),
        date: tx.createdAt || new Date().toISOString(),
        reason: tx.reason || payload.reason,
        user: tx.performedBy ? `${tx.performedBy.firstName || ''} ${tx.performedBy.lastName || ''}`.trim() || 'System' : 'System',
      };
      return normalized;
    } catch (error) {
      console.error('Error recording stock movement:', error);
      throw new Error('Failed to record stock movement. Please check your connection and try again.');
    }
  },

  // Dispense item to patient (for billing linkage)
  dispenseToPatient: async (dispenseData: {
    items: Array<{ itemId: string; quantity: number; notes?: string }>;
    patientId: string;
    reference?: string;
    notes?: string;
  }): Promise<any> => { // Adjust return type based on actual backend response
    try {
      // The backend route is POST /api/inventory/dispense
      // It expects an object with an 'items' array.
      // Each object in items should have itemId, quantity, patientId, notes.
      const response = await api.post('/api/inventory/dispense', dispenseData);
      return response.data; // Contains { updatedItems, createdCharges }
    } catch (error) {
      console.error('Error dispensing item to patient:', error);
      throw error;
    }
  },

  // Get medications from inventory for prescription use
  getMedicationsForPrescription: async (): Promise<InventoryItem[]> => {
    try {
      // Use the new public endpoint that doesn't require auth
      const response = await api.get('/api/inventory/medications-for-prescription');
      const medications = response.data || [];
      
      console.log(`🔍 [FRONTEND] Fetched ${medications.length} medications for prescription`);
      return medications;
    } catch (error) {
      console.error('Error fetching medications for prescription:', error);
      // No mock data - only use real inventory data
      throw new Error('Failed to fetch medications from inventory. Please check your connection and try again.');
    }
  },

  // Check medication availability and deduct stock
  dispenseMedication: async (medicationId: string, quantity: number, patientId: string, prescriptionId: string): Promise<boolean> => {
    try {
      const response = await api.post('/api/inventory/dispense', {
        items: [{
          itemId: medicationId,
          quantity: quantity
        }],
        patientId: patientId,
        reference: prescriptionId,
        notes: `Dispensed for prescription ${prescriptionId}`
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Error dispensing medication:', error);
      return false;
    }
  }
};

export default inventoryService;
