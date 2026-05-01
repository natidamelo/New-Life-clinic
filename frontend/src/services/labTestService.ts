import api from './apiService';

export interface LabTestItem {
  id: string;
  name: string;
  itemCode: string;
  description: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  storageTemperature?: string;
  specimenType?: string;
  testType?: string;
  processTime?: string;
  available: boolean;
  isNew?: boolean;
  addedAt?: string;
}

export interface LabTestCategories {
  [categoryName: string]: LabTestItem[];
}

export interface LabTestSyncResponse {
  success: boolean;
  newItems: LabTestItem[];
  count: number;
  message: string;
}

export interface LabTestAvailableResponse {
  success: boolean;
  categories: LabTestCategories;
  totalTests: number;
  message: string;
}

export interface LabCategoryOption {
  slug: string;
  label: string;
}

class LabTestService {
  /**
   * Get all available lab tests organized by category
   */
  async getAvailableLabTests(): Promise<LabTestAvailableResponse> {
    try {
      const response = await api.get('/api/lab-tests/available');
      return response.data;
    } catch (error) {
      console.error('Error fetching available lab tests:', error);
      throw error;
    }
  }

  /**
   * Get recently added lab tests for synchronization
   */
  async getNewLabTests(): Promise<LabTestSyncResponse> {
    try {
      const response = await api.get('/api/lab-tests/sync');
      return response.data;
    } catch (error) {
      console.error('Error syncing lab tests:', error);
      throw error;
    }
  }

  /**
   * Get lab test categories
   */
  async getLabTestCategories(): Promise<string[]> {
    try {
      const response = await api.get('/api/lab-tests/categories');
      return response.data?.categories || [];
    } catch (error) {
      console.error('Error fetching lab test categories:', error);
      throw error;
    }
  }

  async getLabCategoryOptions(): Promise<LabCategoryOption[]> {
    try {
      const response = await api.get('/api/lab-tests/category-options');
      return response.data?.categories || [];
    } catch (error) {
      console.error('Error fetching lab category options:', error);
      throw error;
    }
  }

  async createLabCategory(name: string): Promise<LabCategoryOption> {
    try {
      const response = await api.post('/api/lab-tests/category-options', { name });
      return response.data?.category;
    } catch (error) {
      console.error('Error creating lab category option:', error);
      throw error;
    }
  }

  /**
   * Check for new lab items and refresh if needed
   */
  async checkForNewItems(): Promise<LabTestItem[]> {
    try {
      const syncResponse = await this.getNewLabTests();
      if (syncResponse.success && syncResponse.newItems.length > 0) {
        console.log(`Found ${syncResponse.newItems.length} new lab items`);
        return syncResponse.newItems;
      }
      return [];
    } catch (error) {
      console.error('Error checking for new lab items:', error);
      return [];
    }
  }

  /**
   * Get lab test by name
   */
  async getLabTestByName(name: string): Promise<LabTestItem | null> {
    try {
      const response = await this.getAvailableLabTests();
      if (response.success && response.categories) {
        // Search through all categories for the test
        for (const [categoryName, tests] of Object.entries(response.categories)) {
          const test = tests.find(t => t.name.toLowerCase() === name.toLowerCase());
          if (test) {
            return test;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error finding lab test by name:', error);
      return null;
    }
  }

  /**
   * Get lab tests by category
   */
  async getLabTestsByCategory(category: string): Promise<LabTestItem[]> {
    try {
      const response = await this.getAvailableLabTests();
      if (response.success && response.categories) {
        return response.categories[category] || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching lab tests by category:', error);
      return [];
    }
  }
}

const labTestService = new LabTestService();
export default labTestService;
