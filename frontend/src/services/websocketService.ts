// WebSocket service - disabled to prevent connection issues
// import { io, Socket } from 'socket.io-client';

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

class WebSocketService {
  private socket: any = null; // Changed from Socket to any since we're not using Socket.IO
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private wsEnabled = false; // Flag to disable WebSocket functionality

  connect() {
    // Completely disable WebSocket connections to prevent console spam
    console.log('🔇 WebSocket connections disabled - server does not support Socket.IO');
    return null;
  }

  private reconnect() {
    // Disable reconnection attempts
    return;
  }

  disconnect() {
    if (this.socket) {
      // this.socket.disconnect(); // Commented out since we're not using Socket.IO
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event callback for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods for specific cleanup events
  onNotificationCleanup(callback: (event: CleanupEvent) => void) {
    this.on('data-cleanup', (event: CleanupEvent) => {
      if (event.type === 'notifications') {
        callback(event);
      }
    });
  }

  onNurseTaskCleanup(callback: (event: CleanupEvent) => void) {
    this.on('data-cleanup', (event: CleanupEvent) => {
      if (event.type === 'nurse-tasks') {
        callback(event);
      }
    });
  }

  onDataUpdate(type: string, callback: (event: DataUpdateEvent) => void) {
    this.on('data-update', (event: DataUpdateEvent) => {
      if (event.type === type) {
        callback(event);
      }
    });
  }

  // Check connection status
  isConnected(): boolean {
    return false; // Always return false since WebSocket is disabled
  }

  // Enable/disable WebSocket functionality
  enableWebSocket() {
    this.wsEnabled = true;
    console.log('🔊 WebSocket functionality enabled');
  }

  disableWebSocket() {
    this.wsEnabled = false;
    this.disconnect();
    console.log('🔇 WebSocket functionality disabled');
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService; 