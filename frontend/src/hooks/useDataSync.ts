import { useEffect, useCallback, useRef } from 'react';
import { useDataCleanup } from './useWebSocket';

interface DataSyncOptions {
  /**
   * Function to refetch data when cleanup events occur
   */
  refetchData: () => Promise<void> | void;
  
  /**
   * Data types to listen for cleanup events
   * e.g., ['notifications', 'nurse-tasks', 'patients']
   */
  dataTypes: string[];
  
  /**
   * Optional filter to only react to specific cleanup events
   */
  filter?: (event: any) => boolean;
  
  /**
   * Optional callback when data is cleaned up
   */
  onDataCleanup?: (event: any) => void;
  
  /**
   * Debounce time in milliseconds to prevent excessive refetching
   */
  debounceMs?: number;
}

/**
 * Hook for automatic data synchronization with WebSocket cleanup events
 * 
 * @param options Configuration options for data sync
 * 
 * @example
 * // Basic usage
 * useDataSync({
 *   refetchData: fetchNotifications,
 *   dataTypes: ['notifications']
 * });
 * 
 * @example
 * // Advanced usage with filtering
 * useDataSync({
 *   refetchData: fetchTasks,
 *   dataTypes: ['nurse-tasks'],
 *   filter: (event) => event.filter?.taskType === 'MEDICATION',
 *   onDataCleanup: (event) => toast.success(`${event.deletedCount} tasks removed`),
 *   debounceMs: 500
 * });
 */
export const useDataSync = (options: DataSyncOptions) => {
  const {
    refetchData,
    dataTypes,
    filter,
    onDataCleanup,
    debounceMs = 300
  } = options;
  
  const debounceRef = useRef<NodeJS.Timeout>();
  
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      refetchData();
    }, debounceMs);
  }, [refetchData, debounceMs]);
  
  useDataCleanup((event) => {
    // Check if this cleanup event is relevant to our data types
    const isRelevantType = dataTypes.includes(event.type);
    
    if (!isRelevantType) {
      return;
    }
    
    // Apply additional filtering if provided
    if (filter && !filter(event)) {
      return;
    }
    
    console.log(`🔄 Data sync triggered for ${event.type}:`, event);
    
    // Call the custom cleanup callback if provided
    if (onDataCleanup) {
      onDataCleanup(event);
    }
    
    // Trigger data refetch
    debouncedRefetch();
  }, [dataTypes, filter, onDataCleanup, debouncedRefetch]);
  
  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
};

/**
 * Specialized hook for notification data sync
 */
export const useNotificationSync = (
  refetchNotifications: () => Promise<void> | void,
  onCleanup?: (event: any) => void
) => {
  return useDataSync({
    refetchData: refetchNotifications,
    dataTypes: ['notifications'],
    onDataCleanup: onCleanup
  });
};

/**
 * Specialized hook for nurse task data sync
 */
export const useNurseTaskSync = (
  refetchTasks: () => Promise<void> | void,
  taskType?: string,
  onCleanup?: (event: any) => void
) => {
  return useDataSync({
    refetchData: refetchTasks,
    dataTypes: ['nurse-tasks'],
    filter: taskType ? (event) => event.filter?.taskType === taskType : undefined,
    onDataCleanup: onCleanup
  });
};

/**
 * Specialized hook for patient data sync
 */
export const usePatientSync = (
  refetchPatients: () => Promise<void> | void,
  onCleanup?: (event: any) => void
) => {
  return useDataSync({
    refetchData: refetchPatients,
    dataTypes: ['patients'],
    onDataCleanup: onCleanup
  });
}; 