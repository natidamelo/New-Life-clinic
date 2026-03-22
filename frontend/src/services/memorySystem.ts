import { debounce } from 'lodash';

export interface MemorySystemConfig {
  patientId: string;
  recordId?: string;
  debounceMs?: number;
  storageKey?: string;
}

export interface MemoryState {
  data: any;
  lastSaved: string;
  isDirty: boolean;
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  timestamp: string;
  recordId?: string;
}

class MemorySystem {
  private config: MemorySystemConfig;
  private storageKey: string;
  private autoSaveFunction: ((data: any) => Promise<SaveResult>) | null = null;
  private memoryState: MemoryState = {
    data: {},
    lastSaved: '',
    isDirty: false,
    isAutoSaving: false,
    hasUnsavedChanges: false
  };

  constructor(config: MemorySystemConfig) {
    this.config = {
      debounceMs: 2000,
      ...config
    };
    
    this.storageKey = this.config.storageKey || `medical-record-${this.config.patientId}-${this.config.recordId || 'draft'}`;
    this.initializeMemorySystem();
  }

  private initializeMemorySystem() {
    // Load existing data from localStorage
    this.loadFromStorage();
    
    // Set up auto-save function
    this.autoSaveFunction = debounce(async (data: any) => {
      return await this.performAutoSave(data);
    }, this.config.debounceMs);
  }

  /**
   * Save data to localStorage immediately
   */
  saveToStorage(data: any): void {
    try {
      const memoryData = {
        data,
        timestamp: new Date().toISOString(),
        patientId: this.config.patientId,
        recordId: this.config.recordId,
        version: '1.0'
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(memoryData));
      
      this.memoryState.lastSaved = new Date().toISOString();
      this.memoryState.hasUnsavedChanges = false;
      
      console.log('💾 [MEMORY] Data saved to localStorage:', {
        key: this.storageKey,
        timestamp: this.memoryState.lastSaved,
        dataSize: JSON.stringify(data).length
      });
    } catch (error) {
      console.error('❌ [MEMORY] Failed to save to localStorage:', error);
    }
  }

  /**
   * Load data from localStorage
   */
  loadFromStorage(): any | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        console.log('💾 [MEMORY] No stored data found for key:', this.storageKey);
        return null;
      }

      const memoryData = JSON.parse(stored);
      
      // Validate the stored data
      if (memoryData.patientId !== this.config.patientId) {
        console.warn('⚠️ [MEMORY] Patient ID mismatch, clearing storage');
        this.clearStorage();
        return null;
      }

      this.memoryState.data = memoryData.data;
      this.memoryState.lastSaved = memoryData.timestamp;
      this.memoryState.hasUnsavedChanges = false;

      console.log('💾 [MEMORY] Data loaded from localStorage:', {
        key: this.storageKey,
        timestamp: memoryData.timestamp,
        dataSize: JSON.stringify(memoryData.data).length
      });

      return memoryData.data;
    } catch (error) {
      console.error('❌ [MEMORY] Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear localStorage data
   */
  clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
      this.memoryState.data = {};
      this.memoryState.lastSaved = '';
      this.memoryState.hasUnsavedChanges = false;
      console.log('💾 [MEMORY] Storage cleared for key:', this.storageKey);
    } catch (error) {
      console.error('❌ [MEMORY] Failed to clear storage:', error);
    }
  }

  /**
   * Update form data with auto-save
   */
  updateData(data: any): void {
    this.memoryState.data = data;
    this.memoryState.isDirty = true;
    this.memoryState.hasUnsavedChanges = true;

    // Save to localStorage immediately
    this.saveToStorage(data);

    // Trigger auto-save if function is set
    if (this.autoSaveFunction) {
      this.memoryState.isAutoSaving = true;
      this.autoSaveFunction(data);
    }
  }

  /**
   * Perform auto-save to server
   */
  private async performAutoSave(data: any): Promise<SaveResult> {
    try {
      // This will be implemented by the component that uses the memory system
      // The component should provide a save function via setAutoSaveFunction
      console.log('🔄 [MEMORY] Auto-save triggered for:', this.storageKey);
      
      this.memoryState.isAutoSaving = false;
      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.memoryState.isAutoSaving = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Set the auto-save function from the component
   */
  setAutoSaveFunction(saveFunction: (data: any) => Promise<SaveResult>): void {
    this.autoSaveFunction = debounce(saveFunction, this.config.debounceMs);
  }

  /**
   * Get current memory state
   */
  getMemoryState(): MemoryState {
    return { ...this.memoryState };
  }

  /**
   * Check if there's unsaved data
   */
  hasUnsavedChanges(): boolean {
    return this.memoryState.hasUnsavedChanges;
  }

  /**
   * Get the last saved timestamp
   */
  getLastSaved(): string {
    return this.memoryState.lastSaved;
  }

  /**
   * Force save to server
   */
  async forceSave(): Promise<SaveResult> {
    if (this.autoSaveFunction) {
      this.memoryState.isAutoSaving = true;
      const result = await this.autoSaveFunction(this.memoryState.data);
      this.memoryState.isAutoSaving = false;
      return result;
    }
    
    return {
      success: false,
      error: 'No auto-save function configured',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Restore data from storage
   */
  restore(): any | null {
    const restoredData = this.loadFromStorage();
    if (restoredData) {
      this.memoryState.hasUnsavedChanges = false;
      console.log('🔄 [MEMORY] Data restored from storage');
    }
    return restoredData;
  }

  /**
   * Check if data exists in storage
   */
  hasStoredData(): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get storage info
   */
  getStorageInfo(): { key: string; size: number; lastSaved: string; hasData: boolean } {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return {
        key: this.storageKey,
        size: stored ? stored.length : 0,
        lastSaved: this.memoryState.lastSaved,
        hasData: stored !== null
      };
    } catch {
      return {
        key: this.storageKey,
        size: 0,
        lastSaved: this.memoryState.lastSaved,
        hasData: false
      };
    }
  }
}

export default MemorySystem;

