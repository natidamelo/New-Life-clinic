import api from './api';

/**
 * WHO ICD-11 Service
 * Provides methods to search and retrieve ICD-11 classification data
 * from the backend WHO ICD-11 API proxy
 */

export interface ICD11SearchResult {
  nhdd: string;
  icd10: string;
  icd11: string;
  diagnosis: string;
  category: string;
  subcategory: string;
  severity: string;
  commonTerms: string[];
  nhddDescription: string;
  icd11Chapter: string;
  icd11Block: string;
  source?: string;
  matchScore?: number;
}

export interface ICD11SearchResponse {
  success: boolean;
  count: number;
  query: string;
  source: string;
  results: ICD11SearchResult[];
}

export interface ICD11EntityDetails {
  id: string;
  title: string;
  icd11Code: string;
  definition: string;
  longDefinition: string;
  synonyms: string[];
  chapter: string;
  parents: string[];
  children: string[];
  exclusions: string[];
  inclusions: string[];
  codingNote: string;
  blockId: string;
  url: string;
}

class ICD11Service {
  private baseURL = '/api/icd11';

  /**
   * Search ICD-11 entities by query string
   * @param query - Search query
   * @param maxResults - Maximum number of results (default: 20)
   * @returns Promise with search results
   */
  async search(query: string, maxResults: number = 20): Promise<ICD11SearchResult[]> {
    try {
      if (!query || query.trim() === '') {
        return [];
      }

      console.log(`[ICD-11 Service] Searching for: ${query}`);

      const response = await api.get<ICD11SearchResponse>(`${this.baseURL}/search`, {
        params: {
          q: query,
          maxResults
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.success) {
        console.log(`[ICD-11 Service] Found ${response.data.count} results`);
        return response.data.results;
      }

      return [];
    } catch (error: any) {
      console.error('[ICD-11 Service] Search error:', error);
      
      // Don't throw error, just return empty array
      // This allows the app to continue with local search results
      if (error.response?.status === 404 || error.code === 'ECONNABORTED') {
        console.warn('[ICD-11 Service] API unavailable, falling back to local search');
      }
      
      return [];
    }
  }

  /**
   * Search for ICD-11 entity by specific code
   * @param code - ICD-11 code (e.g., "1A00", "8B11.Z")
   * @returns Promise with entity details
   */
  async searchByCode(code: string): Promise<ICD11SearchResult | null> {
    try {
      if (!code || code.trim() === '') {
        return null;
      }

      console.log(`[ICD-11 Service] Searching by code: ${code}`);

      const response = await api.get(`${this.baseURL}/code/${code}`, {
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.result;
      }

      return null;
    } catch (error: any) {
      console.error('[ICD-11 Service] Code search error:', error);
      return null;
    }
  }

  /**
   * Get detailed information about an ICD-11 entity
   * @param entityId - ICD-11 entity ID
   * @returns Promise with entity details
   */
  async getEntityDetails(entityId: string): Promise<ICD11EntityDetails | null> {
    try {
      if (!entityId || entityId.trim() === '') {
        return null;
      }

      console.log(`[ICD-11 Service] Fetching entity details: ${entityId}`);

      const response = await api.get(`${this.baseURL}/entity/${entityId}`, {
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.details;
      }

      return null;
    } catch (error: any) {
      console.error('[ICD-11 Service] Entity details error:', error);
      return null;
    }
  }

  /**
   * Get cache statistics
   * @returns Promise with cache stats
   */
  async getCacheStats(): Promise<any> {
    try {
      const response = await api.get(`${this.baseURL}/cache/stats`);
      return response.data.cache;
    } catch (error: any) {
      console.error('[ICD-11 Service] Cache stats error:', error);
      return null;
    }
  }

  /**
   * Clear the cache
   * @returns Promise with success status
   */
  async clearCache(): Promise<boolean> {
    try {
      const response = await api.post(`${this.baseURL}/cache/clear`);
      return response.data.success;
    } catch (error: any) {
      console.error('[ICD-11 Service] Clear cache error:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new ICD11Service();

