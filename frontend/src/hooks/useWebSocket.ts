import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';

interface CleanupEvent {
  type: 'notifications' | 'nurse-tasks' | 'patients' | 'invoices';
  action: 'bulk-delete' | 'delete' | 'update';
  filter?: any;
  deletedCount?: number;
  deletedId?: string;
  timestamp: Date;
}

interface DataUpdateEvent {
  type: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;
  const listenersRef = useRef<Array<{ event: string; callback: Function }>>([]);

  useEffect(() => {
    if (autoConnect) {
      websocketService.connect();
      
      if (onConnect) {
        websocketService.on('connect', onConnect);
      }
      
      if (onDisconnect) {
        websocketService.on('disconnect', onDisconnect);
      }
      
      if (onError) {
        websocketService.on('connect_error', onError);
      }
    }

    return () => {
      // Cleanup all listeners added by this hook
      listenersRef.current.forEach(({ event, callback }) => {
        websocketService.off(event, callback);
      });
      listenersRef.current = [];
    };
  }, [autoConnect, onConnect, onDisconnect, onError]);

  const addListener = useCallback((event: string, callback: Function) => {
    websocketService.on(event, callback);
    listenersRef.current.push({ event, callback });
  }, []);

  const removeListener = useCallback((event: string, callback?: Function) => {
    websocketService.off(event, callback);
    if (callback) {
      listenersRef.current = listenersRef.current.filter(
        listener => !(listener.event === event && listener.callback === callback)
      );
    } else {
      listenersRef.current = listenersRef.current.filter(
        listener => listener.event !== event
      );
    }
  }, []);

  return {
    isConnected: websocketService.isConnected(),
    addListener,
    removeListener,
    connect: () => websocketService.connect(),
    disconnect: () => websocketService.disconnect()
  };
};

// Specialized hooks for common use cases
export const useDataCleanup = (
  onCleanup: (event: CleanupEvent) => void,
  dependencies: any[] = []
) => {
  const { addListener, removeListener } = useWebSocket();

  useEffect(() => {
    const handleCleanup = (event: CleanupEvent) => {
      onCleanup(event);
    };

    addListener('data-cleanup', handleCleanup);

    return () => {
      removeListener('data-cleanup', handleCleanup);
    };
  }, dependencies);
};

export const useNotificationCleanup = (
  onNotificationCleanup: (event: CleanupEvent) => void,
  dependencies: any[] = []
) => {
  useDataCleanup((event) => {
    if (event.type === 'notifications') {
      onNotificationCleanup(event);
    }
  }, dependencies);
};

export const useNurseTaskCleanup = (
  onTaskCleanup: (event: CleanupEvent) => void,
  dependencies: any[] = []
) => {
  useDataCleanup((event) => {
    if (event.type === 'nurse-tasks') {
      onTaskCleanup(event);
    }
  }, dependencies);
};

export const useDataUpdate = (
  dataType: string,
  onUpdate: (event: DataUpdateEvent) => void,
  dependencies: any[] = []
) => {
  const { addListener, removeListener } = useWebSocket();

  useEffect(() => {
    const handleUpdate = (event: DataUpdateEvent) => {
      if (event.type === dataType) {
        onUpdate(event);
      }
    };

    addListener('data-update', handleUpdate);

    return () => {
      removeListener('data-update', handleUpdate);
    };
  }, [dataType, ...dependencies]);
}; 