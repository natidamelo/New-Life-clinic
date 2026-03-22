
import { toast } from 'react-toastify';
import { WS_BASE_URL, API_BASE_URL as CONFIG_API_BASE_URL } from '../config';
import AuthService from './authService';

// Constants for API and WebSocket URLs
const API_BASE_URL = CONFIG_API_BASE_URL;

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  senderId?: string;
  senderRole?: 'nurse' | 'doctor';
  recipientId?: string;
  priority?: 'low' | 'medium' | 'high';
  data?: any;
}

class NotificationService {
  private socket: WebSocket | null = null;
  private messageHandlers: ((notification: Notification) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced from 5 to 3
  private reconnectInterval = 10000; // Increased from 5000 to 10000
  private wsEnabled = true;
  private longPollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastNotificationId: string | null = null;
  private errorToastShown: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private userId: string | null = null;
  private userRole: string | null = null;
  private lastNotificationTimestamp: Date | null = null;
  private onMessageCallback?: (notification: any) => void;

  // Get all notifications for a user
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      if (!userId) {
        console.log('[Notification Service] No userId provided, skipping fetch');
        return [];
      }

      // Get authentication token using AuthService singleton
      const token = AuthService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server did not return JSON');
      }

      const data = await response.json();
      return data.notifications || [];
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Mark a notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      // Get authentication token using AuthService singleton
      const token = AuthService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        }
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Create a new notification
  async createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> {
    try {
      // Get authentication token using AuthService singleton
      const token = AuthService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(notification)
      });
      
      if (!response.ok) throw new Error('Failed to create notification');
      
      const newNotification = await response.json();
      
      // Show toast notification
      toast(notification.message, {
        type: notification.type || 'info',
        autoClose: notification.priority === 'high' ? false : 5000
      });
      
      return newNotification;
    } catch (error: any) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Test if WebSocket is supported and the server is accessible
  async testWebSocketSupport(userId: string, role: string): Promise<boolean> {
    // Disable WebSocket testing to prevent connection attempts
    console.log('[WS Service] WebSocket testing disabled - using long polling instead');
    this.wsEnabled = false;
    return false;
  }

  // Connect to WebSocket for real-time notifications
  connectWebSocket = async (userId: string | undefined, role: string, onMessageCallback?: (notification: any) => void) => {
    if (!userId) {
      console.log('[WS Service] No userId provided, skipping WebSocket connection');
      return null;
    }

    // Force use long polling instead of WebSocket to avoid connection issues
    console.log('[WS Service] Using long polling for notifications instead of WebSockets');
    this.userId = userId;
    this.userRole = role;
    this.onMessageCallback = onMessageCallback;
    this.startLongPolling();
    return null;
  };

  // Start long polling for notifications (fallback)
  private async startLongPolling(): Promise<void> {
    console.log('[WS Service] Starting notification polling...');
    
    const poll = async () => {
      try {
        const params = new URLSearchParams({
          since: this.lastNotificationTimestamp?.toISOString() || '',
          role: this.userRole || 'user'
        });

        // Get authentication token using AuthService singleton
        const token = AuthService.getToken();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased from 15000ms to 30000ms

        const response = await fetch(
          `${API_BASE_URL}/api/notifications/${this.userId}/poll?${params}`,
          {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.notifications && data.notifications.length > 0) {
            data.notifications.forEach((notification: any) => {
              this.handleMessage(notification);
            });
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.log('[WS Service] Poll timeout - this is normal, continuing...');
        } else if (error.message === 'Failed to fetch') {
          console.warn('[WS Service] Network connection issue - will retry on next poll');
        } else {
          console.error('[WS Service] Error polling for notifications:', error);
        }
      }
    };

    // Poll every 20 seconds instead of 10 and keep reference for cleanup
    this.longPollingInterval = setInterval(poll, 20000); // Increased from 10000ms to 20000ms
    poll(); // Initial poll
  }

  // Handle incoming notification messages
  private handleMessage(notification: any): void {
    try {
      console.log('[WS Service] Processing notification:', notification);
      
      // Immediately mark notification as read so it won't be re-fetched / re-polled
      try {
        const idToMark = (notification as any)._id || (notification as any).id;
        if (idToMark) {
          // Fire and forget – we don't await to keep UI snappy
          this.markAsRead(idToMark);
        }
      } catch (readErr) {
        console.warn('[WS Service] Failed to mark notification as read:', readErr);
      }
      
      // Update last notification timestamp
      if (notification.timestamp) {
        this.lastNotificationTimestamp = new Date(notification.timestamp);
      }
      
      // Call the onMessage callback if provided
      if (this.onMessageCallback) {
        this.onMessageCallback(notification);
      }
      
      // Show toast notification for important messages
      if (notification.priority === 'high' || notification.type === 'vitals_update') {
        const message = notification.message || 'New notification received';
        if (notification.type === 'error') {
          toast.error(message);
        } else {
          toast.success(message);
        }
      }
    } catch (error: any) {
      console.error('[WS Service] Error handling notification:', error);
    }
  }

  // Disconnect WebSocket and stop polling
  disconnect() {
    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Stop WebSocket if active
    if (this.socket) {
      console.log('[WS Service] Disconnecting WebSocket intentionally.');
      this.socket.onclose = null; // Prevent reconnect on intentional close
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
    
    // Stop long polling if active
    if (this.longPollingInterval) {
      clearInterval(this.longPollingInterval);
      this.longPollingInterval = null;
      console.log('[WS Service] Stopped long-polling');
    }
    
    // Reset state
    this.messageHandlers = [];
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.errorToastShown = false;
  }
}

export const notificationService = new NotificationService(); 