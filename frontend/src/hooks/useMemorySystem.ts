import { useState, useEffect, useCallback, useRef } from 'react';
import MemorySystem, { MemorySystemConfig, MemoryState, SaveResult } from '../services/memorySystem';

export interface UseMemorySystemOptions extends MemorySystemConfig {
  onSave?: (data: any) => Promise<SaveResult>;
  onRestore?: (data: any) => void;
  autoLoad?: boolean;
}

export interface UseMemorySystemReturn {
  // Data management
  data: any;
  updateData: (newData: any) => void;
  
  // Memory system state
  memoryState: MemoryState;
  
  // Mode management
  isEditMode: boolean;
  isViewMode: boolean;
  toggleMode: () => void;
  setEditMode: () => void;
  setViewMode: () => void;
  
  // Storage operations
  saveToStorage: () => void;
  loadFromStorage: () => any | null;
  clearStorage: () => void;
  hasStoredData: () => boolean;
  restore: () => any | null;
  
  // Server operations
  saveToServer: () => Promise<SaveResult>;
  forceSave: () => Promise<SaveResult>;
  
  // Utility functions
  hasUnsavedChanges: () => boolean;
  getLastSaved: () => string;
  getStorageInfo: () => { key: string; size: number; lastSaved: string; hasData: boolean };
}

export const useMemorySystem = (options: UseMemorySystemOptions): UseMemorySystemReturn => {
  const {
    patientId,
    recordId,
    debounceMs = 2000,
    onSave,
    onRestore,
    autoLoad = true
  } = options;

  // Initialize memory system
  const memorySystemRef = useRef<MemorySystem | null>(null);
  const [data, setData] = useState<any>({});
  const [memoryState, setMemoryState] = useState<MemoryState>({
    data: {},
    lastSaved: '',
    isDirty: false,
    isAutoSaving: false,
    hasUnsavedChanges: false
  });
  const [isEditMode, setIsEditMode] = useState<boolean>(true);

  // Initialize memory system
  useEffect(() => {
    memorySystemRef.current = new MemorySystem({
      patientId,
      recordId,
      debounceMs
    });

    // Set up auto-save function if provided
    if (onSave) {
      memorySystemRef.current.setAutoSaveFunction(onSave);
    }

    // Auto-load data if enabled
    if (autoLoad) {
      const restoredData = memorySystemRef.current.restore();
      if (restoredData) {
        setData(restoredData);
        if (onRestore) {
          onRestore(restoredData);
        }
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [patientId, recordId, debounceMs, onSave, onRestore, autoLoad]);

  // Update memory state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (memorySystemRef.current) {
        setMemoryState(memorySystemRef.current.getMemoryState());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update data function
  const updateData = useCallback((newData: any) => {
    setData(newData);
    if (memorySystemRef.current) {
      memorySystemRef.current.updateData(newData);
    }
  }, []);

  // Mode management
  const toggleMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  const setEditMode = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const setViewMode = useCallback(() => {
    setIsEditMode(false);
  }, []);

  // Storage operations
  const saveToStorage = useCallback(() => {
    if (memorySystemRef.current) {
      memorySystemRef.current.saveToStorage(data);
    }
  }, [data]);

  const loadFromStorage = useCallback(() => {
    if (memorySystemRef.current) {
      const loadedData = memorySystemRef.current.loadFromStorage();
      if (loadedData) {
        setData(loadedData);
        if (onRestore) {
          onRestore(loadedData);
        }
      }
      return loadedData;
    }
    return null;
  }, [onRestore]);

  const clearStorage = useCallback(() => {
    if (memorySystemRef.current) {
      memorySystemRef.current.clearStorage();
      setData({});
    }
  }, []);

  const hasStoredData = useCallback(() => {
    return memorySystemRef.current ? memorySystemRef.current.hasStoredData() : false;
  }, []);

  const restore = useCallback(() => {
    if (memorySystemRef.current) {
      const restoredData = memorySystemRef.current.restore();
      if (restoredData) {
        setData(restoredData);
        if (onRestore) {
          onRestore(restoredData);
        }
      }
      return restoredData;
    }
    return null;
  }, [onRestore]);

  // Server operations
  const saveToServer = useCallback(async (): Promise<SaveResult> => {
    if (memorySystemRef.current && onSave) {
      return await memorySystemRef.current.forceSave();
    }
    return {
      success: false,
      error: 'No save function configured',
      timestamp: new Date().toISOString()
    };
  }, [onSave]);

  const forceSave = useCallback(async (): Promise<SaveResult> => {
    return await saveToServer();
  }, [saveToServer]);

  // Utility functions
  const hasUnsavedChanges = useCallback(() => {
    return memorySystemRef.current ? memorySystemRef.current.hasUnsavedChanges() : false;
  }, []);

  const getLastSaved = useCallback(() => {
    return memorySystemRef.current ? memorySystemRef.current.getLastSaved() : '';
  }, []);

  const getStorageInfo = useCallback(() => {
    return memorySystemRef.current ? memorySystemRef.current.getStorageInfo() : {
      key: '',
      size: 0,
      lastSaved: '',
      hasData: false
    };
  }, []);

  return {
    // Data management
    data,
    updateData,
    
    // Memory system state
    memoryState,
    
    // Mode management
    isEditMode,
    isViewMode: !isEditMode,
    toggleMode,
    setEditMode,
    setViewMode,
    
    // Storage operations
    saveToStorage,
    loadFromStorage,
    clearStorage,
    hasStoredData,
    restore,
    
    // Server operations
    saveToServer,
    forceSave,
    
    // Utility functions
    hasUnsavedChanges,
    getLastSaved,
    getStorageInfo
  };
};

export default useMemorySystem;

