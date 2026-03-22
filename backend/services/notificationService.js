const telegramService = require('./telegramService');
const User = require('../models/User');

class NotificationService {
  constructor() {
    this.notificationTypes = {
      PATIENT_ASSIGNMENT: 'patientAssignment',
      VITALS_UPDATE: 'vitalsUpdate',
      LAB_ORDER: 'labOrder',
      IMAGING_REQUEST: 'imagingRequest',
      PROCEDURE: 'procedure',
      MEDICATION_ORDER: 'medicationOrder',
      EMERGENCY_ALERT: 'emergencyAlert',
      SYSTEM_UPDATE: 'systemUpdate',
      BILLING_UPDATE: 'billingUpdate',
      DAILY_REVENUE: 'dailyRevenue',
      PAYMENT_ALERT: 'paymentAlert',
      ATTENDANCE_UPDATE: 'attendanceUpdate'
    };
  }

  // Get staff members who should receive notifications for a specific type
  async getNotificationRecipients(notificationType, additionalFilters = {}) {
    try {
      console.log(`📱 [NOTIFICATION SERVICE] Getting recipients for type: ${notificationType}`);
      const baseQuery = {
        telegramNotificationsEnabled: true,
        telegramChatId: { $exists: true, $ne: null }
      };
      console.log(`📱 [NOTIFICATION SERVICE] Base query:`, JSON.stringify(baseQuery, null, 2));

      // Add role-specific filters
      let roleFilter = {};
      switch (notificationType) {
        case this.notificationTypes.PATIENT_ASSIGNMENT:
          roleFilter = { role: { $in: ['doctor', 'nurse'] } };
          break;
        case this.notificationTypes.VITALS_UPDATE:
          roleFilter = { role: { $in: ['nurse', 'doctor'] } };
          break;
        case 'labOrder':
        case this.notificationTypes.LAB_ORDER:
          roleFilter = { role: { $in: ['lab', 'doctor'] } };
          break;
        case this.notificationTypes.IMAGING_REQUEST:
          roleFilter = { role: { $in: ['imaging', 'doctor'] } };
          break;
        case this.notificationTypes.PROCEDURE:
          roleFilter = { role: { $in: ['nurse', 'doctor'] } };
          break;
        case this.notificationTypes.MEDICATION_ORDER:
          roleFilter = { role: { $in: ['pharmacy', 'nurse', 'doctor'] } };
          break;
        case this.notificationTypes.EMERGENCY_ALERT:
          roleFilter = { role: { $in: ['doctor', 'nurse', 'reception'] } };
          break;
        case this.notificationTypes.SYSTEM_UPDATE:
          roleFilter = { role: { $in: ['admin', 'reception'] } };
          break;
        case 'billingUpdate':
        case this.notificationTypes.BILLING_UPDATE:
          roleFilter = { role: { $in: ['admin', 'finance', 'reception', 'doctor'] } };
          break;
        case 'dailyRevenue':
        case this.notificationTypes.DAILY_REVENUE:
          roleFilter = { role: { $in: ['admin', 'finance', 'reception'] } };
          break;
        case 'paymentAlert':
        case this.notificationTypes.PAYMENT_ALERT:
          roleFilter = { role: { $in: ['admin', 'finance', 'reception', 'doctor'] } };
          break;
        case 'attendanceUpdate':
        case this.notificationTypes.ATTENDANCE_UPDATE:
          // No role restriction - anyone with the preference enabled can receive attendance notifications
          roleFilter = {};
          break;
        default:
          roleFilter = {};
      }

      const query = { ...baseQuery, ...roleFilter, ...additionalFilters };
      console.log(`📱 [NOTIFICATION SERVICE] Query for ${notificationType}:`, JSON.stringify(query, null, 2));
      const recipients = await User.find(query).select('firstName lastName role telegramChatId telegramNotificationsEnabled notificationPreferences');
      console.log(`📱 [NOTIFICATION SERVICE] Raw query result: Found ${recipients.length} users matching role filter`);

      // Filter by notification preferences
      const preferenceKey = this.getPreferenceKey(notificationType);
      console.log(`📱 [NOTIFICATION SERVICE] Preference key for ${notificationType}: ${preferenceKey}`);
      console.log(`📱 [NOTIFICATION SERVICE] Found ${recipients.length} potential recipients before preference filtering`);
      
      const filteredRecipients = recipients.filter(user => {
        const prefs = user.notificationPreferences || {};
        const hasPreference = prefs[preferenceKey] !== false; // Default to true if not set
        console.log(`📱 [NOTIFICATION SERVICE] User ${user.firstName} ${user.lastName} (${user.role}): preference ${preferenceKey} = ${prefs[preferenceKey]}, will receive: ${hasPreference}`);
        return hasPreference;
      });

      console.log(`📱 [NOTIFICATION SERVICE] Found ${filteredRecipients.length} recipients for ${notificationType} notification after filtering`);
      if (filteredRecipients.length > 0) {
        console.log(`📱 [NOTIFICATION SERVICE] Recipients:`, filteredRecipients.map(r => `${r.firstName} ${r.lastName} (${r.role})`).join(', '));
      }
      return filteredRecipients;
    } catch (error) {
      console.error('Error getting notification recipients:', error);
      return [];
    }
  }

  // Map notification types to preference keys
  getPreferenceKey(notificationType) {
    const mapping = {
      [this.notificationTypes.PATIENT_ASSIGNMENT]: 'patientAssignments',
      [this.notificationTypes.VITALS_UPDATE]: 'vitalsUpdates',
      [this.notificationTypes.LAB_ORDER]: 'labOrders',
      [this.notificationTypes.IMAGING_REQUEST]: 'imagingRequests',
      [this.notificationTypes.PROCEDURE]: 'procedures',
      [this.notificationTypes.MEDICATION_ORDER]: 'medicationOrders',
      [this.notificationTypes.EMERGENCY_ALERT]: 'emergencyAlerts',
      [this.notificationTypes.SYSTEM_UPDATE]: 'systemUpdates',
      [this.notificationTypes.BILLING_UPDATE]: 'billingUpdates',
      [this.notificationTypes.DAILY_REVENUE]: 'dailyRevenue',
      [this.notificationTypes.PAYMENT_ALERT]: 'paymentAlerts',
      [this.notificationTypes.ATTENDANCE_UPDATE]: 'attendanceUpdates',
      // Also support string types
      'patientAssignment': 'patientAssignments',
      'vitalsUpdate': 'vitalsUpdates',
      'labOrder': 'labOrders',
      'imagingRequest': 'imagingRequests',
      'procedure': 'procedures',
      'medicationOrder': 'medicationOrders',
      'emergencyAlert': 'emergencyAlerts',
      'systemUpdate': 'systemUpdates',
      'billingUpdate': 'billingUpdates',
      'dailyRevenue': 'dailyRevenue',
      'paymentAlert': 'paymentAlerts',
      'attendanceUpdate': 'attendanceUpdates'
    };
    return mapping[notificationType] || 'patientAssignments';
  }

  // Send notification to specific staff members
  async sendNotification(notificationType, data, recipients = null) {
    try {
      console.log(`📱 [NOTIFICATION SERVICE] sendNotification called with type: ${notificationType}`);
      console.log(`📱 [NOTIFICATION SERVICE] Data:`, JSON.stringify(data, null, 2));
      
      await telegramService.initialize();
      
      if (!telegramService.isBotInitialized()) {
        console.log('📱 Telegram bot not initialized, skipping notification');
        return { success: false, message: 'Bot not initialized' };
      }

      // Get recipients if not provided
      if (!recipients) {
        recipients = await this.getNotificationRecipients(notificationType);
      }

      if (recipients.length === 0) {
        console.log(`📱 No recipients found for ${notificationType} notification`);
        return { success: false, message: 'No recipients found' };
      }

      // Format message based on notification type
      const message = this.formatNotificationMessage(notificationType, data);
      
      const results = [];
      for (const recipient of recipients) {
        try {
          const result = await telegramService.sendMessageToStaff(
            recipient.telegramChatId,
            message,
            { parse_mode: 'HTML' }
          );
          
          results.push({
            recipientId: recipient._id,
            recipientName: `${recipient.firstName} ${recipient.lastName}`,
            success: result.success,
            message: result.message,
            messageId: result.messageId
          });
        } catch (error) {
          console.error(`❌ Error sending notification to ${recipient.firstName} ${recipient.lastName}:`, error);
          results.push({
            recipientId: recipient._id,
            recipientName: `${recipient.firstName} ${recipient.lastName}`,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`📱 Notification sent to ${successCount}/${results.length} recipients`);
      
      return {
        success: successCount > 0,
        results: results,
        message: `Sent to ${successCount}/${results.length} recipients`
      };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return { success: false, message: error.message };
    }
  }

  // Format notification message based on type
  formatNotificationMessage(notificationType, data) {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    switch (notificationType) {
      case this.notificationTypes.PATIENT_ASSIGNMENT:
        return `👨‍⚕️ <b>New Patient Assignment</b>\n\n` +
               `👤 <b>Patient:</b> ${data.patientName}\n` +
               `🆔 <b>Patient ID:</b> ${data.patientId}\n` +
               `📅 <b>Assignment Date:</b> ${timestamp}\n` +
               `📞 <b>Contact:</b> ${data.contactNumber || 'Not provided'}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `\n⚕️ <b>Action Required:</b> Please review this patient and schedule a consultation as needed.`;

      case this.notificationTypes.VITALS_UPDATE:
        {
          const vitals = (data && data.vitals) ? data.vitals : data || {};

          const fmt = (value) => (value === 0 || value === '0' || value ? String(value) : '—');

          const vitalsSection = `\n📋 <b>Vitals:</b>\n` +
            `• Blood Pressure: ${fmt(vitals.bloodPressure)}\n` +
            `• Heart Rate: ${fmt(vitals.heartRate)}\n` +
            `• Temperature: ${fmt(vitals.temperature)}\n` +
            `• Oxygen Saturation: ${fmt(vitals.oxygenSaturation)}`;

          return `📊 <b>Vitals Update</b>\n\n` +
                 `👤 <b>Patient:</b> ${data.patientName}\n` +
                 `🆔 <b>Patient ID:</b> ${data.patientId}\n` +
                 `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
                 `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
                 `📅 <b>Time:</b> ${timestamp}` +
                 `${vitalsSection}` +
                 `\n\n⚕️ <b>Action:</b> Please review the patient's vital signs.`;
        }

      case this.notificationTypes.LAB_ORDER:
        return `🧪 <b>New Lab Order</b>\n\n` +
               `👤 <b>Patient:</b> ${data.patientName}\n` +
               `🆔 <b>Patient ID:</b> ${data.patientId}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `📅 <b>Order Date:</b> ${timestamp}\n` +
               `\n🔬 <b>Lab Tests Required:</b>\n` +
               `${data.labTests.map(test => `• ${test.name} (${test.type})`).join('\n')}\n` +
               `\n⚕️ <b>Action Required:</b> Please process these lab tests.`;

      case this.notificationTypes.IMAGING_REQUEST:
        return `📷 <b>New Imaging Request</b>\n\n` +
               `👤 <b>Patient:</b> ${data.patientName}\n` +
               `🆔 <b>Patient ID:</b> ${data.patientId}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `📅 <b>Request Date:</b> ${timestamp}\n` +
               `\n📸 <b>Imaging Required:</b>\n` +
               `${data.imagingTypes.map(type => `• ${type}`).join('\n')}\n` +
               `\n⚕️ <b>Action Required:</b> Please schedule and perform the requested imaging.`;

      case this.notificationTypes.PROCEDURE:
        return `🏥 <b>Procedure Scheduled</b>\n\n` +
               `👤 <b>Patient:</b> ${data.patientName}\n` +
               `🆔 <b>Patient ID:</b> ${data.patientId}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `📅 <b>Procedure Date:</b> ${data.procedureDate}\n` +
               `⏰ <b>Time:</b> ${data.procedureTime}\n` +
               `\n🔧 <b>Procedure:</b> ${data.procedureName}\n` +
               `📝 <b>Notes:</b> ${data.notes || 'No additional notes'}\n` +
               `\n⚕️ <b>Action Required:</b> Please prepare for the scheduled procedure.`;

      case this.notificationTypes.MEDICATION_ORDER:
        return `💊 <b>New Medication Order</b>\n\n` +
               `👤 <b>Patient:</b> ${data.patientName}\n` +
               `🆔 <b>Patient ID:</b> ${data.patientId}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `📅 <b>Order Date:</b> ${timestamp}\n` +
               `\n💊 <b>Medications:</b>\n` +
               `${data.medications.map(med => `• ${med.name} - ${med.dosage} (${med.frequency})`).join('\n')}\n` +
               `\n⚕️ <b>Action Required:</b> Please prepare and dispense the medications.`;

      case this.notificationTypes.EMERGENCY_ALERT:
        return `🚨 <b>EMERGENCY ALERT</b>\n\n` +
               `👤 <b>Patient:</b> ${data.patientName}\n` +
               `🆔 <b>Patient ID:</b> ${data.patientId}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `📅 <b>Alert Time:</b> ${timestamp}\n` +
               `\n⚠️ <b>Emergency Type:</b> ${data.emergencyType}\n` +
               `📝 <b>Description:</b> ${data.description}\n` +
               `\n🚨 <b>IMMEDIATE ACTION REQUIRED</b>`;

      case this.notificationTypes.SYSTEM_UPDATE:
        return `🔧 <b>System Update</b>\n\n` +
               `📅 <b>Update Time:</b> ${timestamp}\n` +
               `\n📝 <b>Update Details:</b>\n${data.message}\n` +
               `\nℹ️ <b>System Information</b>`;

      case this.notificationTypes.BILLING_UPDATE: {
        let message = `💰 <b>Billing Update</b>\n\n` +
               `📅 <b>Update Time:</b> ${timestamp}\n` +
               `\n💵 <b>Amount Paid:</b> ${data.amount ? 'ETB ' + data.amount.toLocaleString() : 'N/A'}\n` +
               `📋 <b>Payment Type:</b> ${data.type || 'General update'}\n`;

        if (data.paymentMethod) {
          message += `💳 <b>Payment Method:</b> ${data.paymentMethod}\n`;
        }

        message += `👤 <b>Patient:</b> ${data.patientName || 'N/A'}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `🆔 <b>Invoice:</b> ${data.invoiceNumber || 'N/A'}\n`;

        if (data.remainingBalance !== undefined && data.remainingBalance > 0) {
          message += `⏳ <b>Remaining Balance:</b> ETB ${data.remainingBalance.toLocaleString()}\n`;
        }

        message += `\n💼 <b>Action:</b> ${data.action || 'Review billing update'}`;

        return message;
      }

      case this.notificationTypes.DAILY_REVENUE:
        return `📊 <b>End of Day Revenue Summary</b>\n\n` +
               `📅 <b>Date:</b> ${timestamp.split(',')[0]}\n` +
               `⏰ <b>Time:</b> 5:00 PM\n\n` +
               `💰 <b>Total Revenue:</b> ETB ${data.totalRevenue?.toLocaleString() || '0'}\n` +
               `💵 <b>Total Collected:</b> ETB ${data.totalCollected?.toLocaleString() || '0'}\n` +
               `⏳ <b>Outstanding:</b> ETB ${data.outstandingAmount?.toLocaleString() || '0'}\n` +
               `📊 <b>Invoices:</b> ${data.invoiceCount || 0} total\n` +
               `💳 <b>Payments:</b> ${data.paymentCount || 0} processed\n` +
               `\n📈 <b>Collection Rate:</b> ${data.collectionRate || 0}%`;

      case this.notificationTypes.ATTENDANCE_UPDATE: {
        const actionType = data.actionType || 'check-in'; // 'check-in' or 'check-out'
        const actionEmoji = actionType === 'check-in' ? '✅' : '🚪';
        const actionText = actionType === 'check-in' ? 'Checked In' : 'Checked Out';
        
        let attendanceMessage = `${actionEmoji} <b>Staff ${actionText}</b>\n\n` +
               `👤 <b>Staff:</b> ${data.staffName || 'Unknown'}\n` +
               `📅 <b>Time:</b> ${timestamp}\n`;
        
        if (data.location) {
          attendanceMessage += `📍 <b>Location:</b> ${data.location}\n`;
        }
        
        if (data.shiftType) {
          attendanceMessage += `⏰ <b>Shift Type:</b> ${data.shiftType}\n`;
        }
        
        if (actionType === 'check-out' && data.totalHours) {
          attendanceMessage += `⏱️ <b>Total Hours:</b> ${data.totalHours} hours\n`;
        }
        
        if (data.attendanceStatus) {
          attendanceMessage += `📊 <b>Status:</b> ${data.attendanceStatus}\n`;
        }
        
        return attendanceMessage;
      }

      case this.notificationTypes.PAYMENT_ALERT:
        return `💳 <b>Payment Alert</b>\n\n` +
               `📅 <b>Alert Time:</b> ${timestamp}\n` +
               `\n💰 <b>Payment Amount:</b> ETB ${data.amount?.toLocaleString() || '0'}\n` +
               `💳 <b>Method:</b> ${data.paymentMethod || 'Unknown'}\n` +
               `👤 <b>Patient:</b> ${data.patientName || 'N/A'}\n` +
               `🎂 <b>Age:</b> ${data.age || 'Not provided'}\n` +
               `🚻 <b>Gender:</b> ${data.gender || 'Not provided'}\n` +
               `🆔 <b>Invoice:</b> ${data.invoiceNumber || 'N/A'}\n` +
               `📊 <b>Status:</b> ${data.status || 'Processed'}\n` +
               `\n💼 <b>Action:</b> ${data.action || 'Payment processed successfully'}`;

      default:
        return `📱 <b>Notification</b>\n\n` +
               `📅 <b>Time:</b> ${timestamp}\n` +
               `\n📝 <b>Message:</b>\n${data.message || 'No additional details'}`;
    }
  }

  // Send notification to specific user by ID
  async sendNotificationToUser(userId, notificationType, data) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.telegramChatId || !user.telegramNotificationsEnabled) {
        return { success: false, message: 'User not found or notifications disabled' };
      }

      return await this.sendNotification(notificationType, data, [user]);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new NotificationService();
