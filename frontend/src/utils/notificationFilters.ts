/**
 * Utility functions for filtering notifications consistently across components
 */

export interface NotificationData {
  _id: string;
  type: string;
  read: boolean;
  data?: {
    paymentStatus?: string;
    paidAt?: string;
    invoiceId?: string;
    amount?: number;
    totalAmount?: number;
    patientName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Check if a medication extension notification should be hidden
 * Medication extension notifications should only be hidden when payment is collected
 */
export const shouldHideMedicationExtensionNotification = (notification: NotificationData): boolean => {
  if (notification.type !== 'medication_payment_required' || !notification.data?.isExtension) {
    return false;
  }

  // Hide if payment is fully collected
  const isFullyPaid = Boolean(
    notification.data?.paymentStatus === 'paid' ||
    notification.data?.paidAt ||
    notification.data?.invoiceId
  );

  return isFullyPaid;
};

/**
 * Check if a lab payment notification should be hidden
 * Lab notifications should be hidden after ANY payment activity (partial or full)
 */
export const shouldHideLabNotification = (notification: NotificationData): boolean => {
  if (notification.type !== 'lab_payment_required') {
    return false;
  }

  // Hide if already read
  if (notification.read) {
    return true;
  }

  // Hide if there's any payment activity
  const hasAnyPayment = Boolean(
    notification.data?.paymentStatus === 'paid' ||
    notification.data?.paymentStatus === 'partially_paid' ||
    notification.data?.paymentStatus === 'partial' ||
    notification.data?.paidAt ||
    notification.data?.invoiceId
  );

  return hasAnyPayment;
};

/**
 * Filter notifications to hide lab payment notifications after any payment activity
 */
export const filterLabNotifications = (notifications: NotificationData[]): NotificationData[] => {
  return notifications.filter(notification => {
    if (notification.type === 'lab_payment_required') {
      return !shouldHideLabNotification(notification);
    }
    return true;
  });
};

/**
 * Get active notifications (not read and not hidden by business logic)
 */
export const getActiveNotifications = (notifications: NotificationData[]): NotificationData[] => {
  console.log('🔍 [getActiveNotifications] Input notifications:', notifications.length);
  
  const activeNotifications = notifications.filter(notification => {
    // Handle payment notifications with special logic
    if (['medication_payment_required', 'lab_payment_required', 'service_payment_required', 'card_payment_required'].includes(notification.type)) {
      
      // Check if payment has been fully completed
      const paymentStatus = notification.data?.paymentStatus;
      const isFullyPaid = paymentStatus === 'paid' || paymentStatus === 'fully_paid';
      
      if (isFullyPaid) {
        console.log(`🚫 [getActiveNotifications] Hiding fully paid notification: ${notification.type} for ${notification.data?.patientName}`);
        return false;
      }

      // For partial payments, keep notification visible but with updated info
      const isPartiallyPaid = paymentStatus === 'partial' || paymentStatus === 'partially_paid';
      if (isPartiallyPaid) {
        console.log(`💰 [getActiveNotifications] Keeping partially paid notification: ${notification.type} for ${notification.data?.patientName}`);
        return true;
      }

      // ROOT CAUSE FIX: Medication extension notifications should never be hidden as read
      // They should only be hidden when payment is collected
      if (notification.type === 'medication_payment_required' && notification.data?.isExtension) {
        const shouldHide = shouldHideMedicationExtensionNotification(notification);
        if (shouldHide) {
          console.log(`🚫 [getActiveNotifications] Hiding paid medication extension: ${notification.data?.patientName}`);
          return false;
        }
        console.log(`✅ [getActiveNotifications] Keeping medication extension: ${notification.data?.patientName} - amount: ${notification.data?.amount}`);
        return true;
      }

      // Apply special filtering for lab notifications
      if (notification.type === 'lab_payment_required') {
        const shouldHide = shouldHideLabNotification(notification);
        if (shouldHide) {
          console.log(`🚫 [getActiveNotifications] Hiding lab notification: ${notification.data?.patientName}`);
        }
        return !shouldHide;
      }

      // For other payment notifications, check if not read
      if (notification.read) {
        console.log(`🚫 [getActiveNotifications] Hiding read payment notification: ${notification.type} for ${notification.data?.patientName}`);
        return false;
      }

      console.log(`✅ [getActiveNotifications] Keeping payment notification: ${notification.type} for ${notification.data?.patientName}`);
      return true;
    }

    // For non-payment notifications, simple read check
    if (notification.read) {
      console.log(`🚫 [getActiveNotifications] Hiding read notification: ${notification.type} for ${notification.data?.patientName}`);
      return false;
    }

    // Keep all other unread notifications
    console.log(`✅ [getActiveNotifications] Keeping notification: ${notification.type} for ${notification.data?.patientName}`);
    return true;
  });
  
  console.log('🔍 [getActiveNotifications] Output active notifications:', activeNotifications.length);
  return activeNotifications;
};

/**
 * Count notifications by type, excluding hidden lab notifications
 */
export const countNotificationsByType = (notifications: NotificationData[], type: string): number => {
  return notifications.filter(notification => {
    if (notification.type === type) {
      if (type === 'lab_payment_required') {
        return !shouldHideLabNotification(notification);
      }
      if (type === 'medication_payment_required' && notification.data?.isExtension) {
        return !shouldHideMedicationExtensionNotification(notification);
      }
      return !notification.read;
    }
    return false;
  }).length;
};
