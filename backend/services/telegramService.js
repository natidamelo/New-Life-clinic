const TelegramBot = require('node-telegram-bot-api');
const TelegramConfig = require('../models/TelegramConfig');

class TelegramService {
  constructor() {
    this.bot = null;
    this.isInitialized = false;
    this.chatIds = [];
  }

  async initialize() {
    // Already initialized — don't create a second polling instance
    if (this.isInitialized && this.bot) {
      return true;
    }

    try {
      // Check for bot token in environment variable first
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        console.log('📱 Telegram bot not configured or inactive - no TELEGRAM_BOT_TOKEN in environment');
        return false;
      }

      // Initialize the bot
      this.bot = new TelegramBot(botToken, { polling: true });
      this.isInitialized = true;

      // Set up message handlers
      this.setupMessageHandlers();

      console.log(`📱 Telegram bot initialized successfully with environment token`);
      console.log(`📱 Bot token length: ${botToken.length}`);
      console.log(`📱 Bot is now listening for messages and button interactions`);

      return true;
    } catch (error) {
      console.error('❌ Error initializing Telegram bot:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async sendMessage(text, options = {}) {
    if (!this.isInitialized || !this.bot) {
      console.log('📱 Telegram bot not initialized, skipping message');
      return false;
    }

    try {
      const results = [];

      // Get all staff who have Telegram notifications enabled
      const staffWithTelegram = await this.getStaffWithTelegram();

      if (staffWithTelegram.length === 0) {
        console.log('📱 No staff have Telegram notifications enabled');
        return false;
      }

      for (const staff of staffWithTelegram) {
        try {
          const messageOptions = {
            parse_mode: 'HTML',
            ...options
          };

          const result = await this.bot.sendMessage(staff.telegramChatId, text, messageOptions);
          results.push({
            userId: staff._id,
            userName: `${staff.firstName} ${staff.lastName}`,
            chatId: staff.telegramChatId,
            success: true,
            messageId: result.message_id
          });
        } catch (chatError) {
          console.error(`❌ Error sending message to user ${staff.firstName} ${staff.lastName}:`, chatError);
          results.push({
            userId: staff._id,
            userName: `${staff.firstName} ${staff.lastName}`,
            chatId: staff.telegramChatId,
            success: false,
            error: chatError.message
          });
        }
      }

      console.log(`📱 Message sent to ${results.filter(r => r.success).length}/${results.length} staff`);
      return results;
    } catch (error) {
      console.error('❌ Error sending Telegram message:', error);
      return false;
    }
  }

  async getStaffWithTelegram() {
    try {
      const User = require('../models/User');
      const staff = await User.find({
        telegramNotificationsEnabled: true,
        telegramChatId: { $exists: true, $ne: null, $ne: '' }
      }).select('_id firstName lastName telegramChatId telegramUsername');

      return staff;
    } catch (error) {
      console.error('❌ Error fetching staff with Telegram:', error);
      return [];
    }
  }

  async sendMessageToStaff(chatId, text, options = {}) {
    if (!this.isInitialized || !this.bot) {
      console.log('📱 Telegram bot not initialized, skipping message');
      return { success: false, message: 'Bot not initialized' };
    }

    try {
      const result = await this.bot.sendMessage(chatId, text, options);
      console.log(`📱 Message sent to chat ${chatId}: ${result.message_id}`);
      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error(`❌ Error sending message to chat ${chatId}:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async sendMessageToDoctor(doctorId, text, options = {}) {
    if (!this.isInitialized || !this.bot) {
      console.log('📱 Telegram bot not initialized, skipping message');
      return { success: false, message: 'Bot not initialized' };
    }

    try {
      const User = require('../models/User');

      // Get specific doctor
      const doctor = await User.findOne({
        _id: doctorId,
        role: 'doctor',
        telegramNotificationsEnabled: true,
        telegramChatId: { $exists: true, $ne: null, $ne: '' }
      }).select('_id firstName lastName telegramChatId');

      if (!doctor) {
        return { success: false, message: 'Doctor not found or Telegram notifications not enabled' };
      }

      const messageOptions = {
        parse_mode: 'HTML',
        ...options
      };

      const result = await this.bot.sendMessage(doctor.telegramChatId, text, messageOptions);

      console.log(`📱 Message sent to Dr. ${doctor.firstName} ${doctor.lastName}`);
      return {
        success: true,
        doctorId: doctor._id,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        messageId: result.message_id
      };
    } catch (error) {
      console.error(`❌ Error sending message to doctor ${doctorId}:`, error);
      return {
        success: false,
        message: `Error sending message: ${error.message}`
      };
    }
  }

  async sendPatientRegistrationNotification(patientData, cardTypeInfo = null) {
    const patientName = `${patientData.firstName} ${patientData.lastName}`;
    const patientId = patientData.patientId || patientData._id;
    const registrationDate = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `👨‍⚕️ <b>New Patient Registration - Doctor Notification</b>\n\n`;
    message += `🆕 <b>New Patient Registered</b>\n\n`;
    message += `👤 <b>Patient:</b> ${patientName}\n`;
    message += `🆔 <b>Patient ID:</b> ${patientId}\n`;
    message += `📅 <b>Registration Date:</b> ${registrationDate}\n`;

    if (patientData.contactNumber) {
      message += `📞 <b>Contact:</b> ${patientData.contactNumber}\n`;
    }

    if (patientData.age) {
      message += `🎂 <b>Age:</b> ${patientData.age}\n`;
    }

    if (patientData.gender) {
      message += `🚻 <b>Gender:</b> ${patientData.gender}\n`;
    }

    if (patientData.priority && patientData.priority !== 'normal') {
      message += `🚨 <b>Priority:</b> ${patientData.priority}\n`;
    }

    if (cardTypeInfo) {
      message += `\n💳 <b>Card Type:</b> ${cardTypeInfo.name}\n`;
      message += `💰 <b>Card Fee:</b> ${cardTypeInfo.price} ETB\n`;
    }

    if (patientData.status) {
      message += `📋 <b>Status:</b> ${patientData.status}\n`;
    }

    message += `\n⚕️ <b>Action Required:</b> Please review and assign this patient for consultation.`;

    return await this.sendMessage(message);
  }

  async sendPatientRegistrationNotificationToDoctor(patientData, doctor, cardTypeInfo = null) {
    if (!this.isInitialized || !this.bot) {
      console.log('📱 Telegram bot not initialized, skipping message');
      return { success: false, message: 'Bot not initialized' };
    }

    try {
      const patientName = `${patientData.firstName} ${patientData.lastName}`;
      const patientId = patientData.patientId || patientData._id;
      const registrationDate = new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let message = `👨‍⚕️ <b>New Patient Assigned to You</b>\n\n`;
      message += `🆕 <b>Patient Registered:</b> ${patientName}\n`;
      message += `🆔 <b>Patient ID:</b> ${patientId}\n`;
      message += `📅 <b>Registration Date:</b> ${registrationDate}\n`;

      if (patientData.contactNumber) {
        message += `📞 <b>Contact:</b> ${patientData.contactNumber}\n`;
      }

      if (patientData.age) {
        message += `🎂 <b>Age:</b> ${patientData.age}\n`;
      }

      if (patientData.gender) {
        message += `🚻 <b>Gender:</b> ${patientData.gender}\n`;
      }

      if (patientData.priority && patientData.priority !== 'normal') {
        message += `🚨 <b>Priority:</b> ${patientData.priority}\n`;
      }

      if (cardTypeInfo) {
        message += `\n💳 <b>Card Type:</b> ${cardTypeInfo.name}\n`;
        message += `💰 <b>Card Fee:</b> ${cardTypeInfo.price} ETB\n`;
      }

      if (patientData.status) {
        message += `📋 <b>Status:</b> ${patientData.status}\n`;
      }

      message += `\n⚕️ <b>Action Required:</b> Please review this patient and schedule a consultation.`;

      // Send message directly to the assigned doctor
      const messageOptions = {
        parse_mode: 'HTML'
      };

      const result = await this.bot.sendMessage(doctor.telegramChatId, message, messageOptions);

      console.log(`📱 Patient registration notification sent to Dr. ${doctor.firstName} ${doctor.lastName}`);
      return {
        success: true,
        doctorId: doctor._id,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        messageId: result.message_id
      };
    } catch (error) {
      console.error(`❌ Error sending patient registration notification to doctor ${doctor.firstName} ${doctor.lastName}:`, error);
      return {
        success: false,
        message: `Error sending message: ${error.message}`
      };
    }
  }

  async sendPatientAssignmentNotification(patientData, doctor) {
    if (!this.isInitialized || !this.bot) {
      console.log('📱 Telegram bot not initialized, skipping message');
      return { success: false, message: 'Bot not initialized' };
    }

    try {
      const patientName = `${patientData.firstName} ${patientData.lastName}`;
      const patientId = patientData.patientId || patientData._id;
      const assignmentDate = new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let message = `👨‍⚕️ <b>New Patient Assigned to You</b>\n\n`;
      message += `📋 <b>Assignment Notification</b>\n\n`;
      message += `👤 <b>Patient:</b> ${patientName}\n`;
      message += `🆔 <b>Patient ID:</b> ${patientId}\n`;
      message += `📅 <b>Assignment Date:</b> ${assignmentDate}\n`;

      if (patientData.contactNumber) {
        message += `📞 <b>Contact:</b> ${patientData.contactNumber}\n`;
      }

      if (patientData.age) {
        message += `🎂 <b>Age:</b> ${patientData.age}\n`;
      }

      if (patientData.gender) {
        message += `🚻 <b>Gender:</b> ${patientData.gender}\n`;
      }

      if (patientData.priority && patientData.priority !== 'normal') {
        message += `🚨 <b>Priority:</b> ${patientData.priority}\n`;
      }

      if (patientData.status) {
        message += `📋 <b>Status:</b> ${patientData.status}\n`;
      }

      message += `\n⚕️ <b>Action Required:</b> Please review this patient and schedule a consultation as needed.`;

      // Send message directly to the assigned doctor
      const messageOptions = {
        parse_mode: 'HTML'
      };

      const result = await this.bot.sendMessage(doctor.telegramChatId, message, messageOptions);

      console.log(`📱 Patient assignment notification sent to Dr. ${doctor.firstName} ${doctor.lastName}`);
      return {
        success: true,
        doctorId: doctor._id,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        messageId: result.message_id
      };
    } catch (error) {
      console.error(`❌ Error sending patient assignment notification to doctor ${doctor.firstName} ${doctor.lastName}:`, error);
      return {
        success: false,
        message: `Error sending message: ${error.message}`
      };
    }
  }

  async sendErrorNotification(error, context = '') {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa'
    });

    let message = `🚨 <b>System Error</b>\n\n`;
    message += `⏰ <b>Time:</b> ${timestamp}\n`;

    if (context) {
      message += `📍 <b>Context:</b> ${context}\n`;
    }

    message += `❌ <b>Error:</b> ${error.message || error}\n`;

    if (error.stack) {
      // Truncate stack trace if too long
      const stack = error.stack.substring(0, 500);
      message += `\n🔍 <b>Stack:</b>\n<code>${stack}</code>`;
    }

    return await this.sendMessage(message);
  }

  async testConnection() {
    if (!this.isInitialized) {
      return { success: false, message: 'Bot not initialized' };
    }

    try {
      const testMessage = `🔧 <b>Telegram Bot Test</b>\n\n✅ Bot is working correctly!\n⏰ ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;
      const results = await this.sendMessage(testMessage);

      if (results && results.length > 0) {
        return {
          success: true,
          message: `Test message sent to ${results.length} chat(s)`,
          results
        };
      } else {
        return { success: false, message: 'Failed to send test message' };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error sending test message: ${error.message}`
      };
    }
  }

  async updateChatIds(newChatIds) {
    this.chatIds = newChatIds;
    return true;
  }

  isBotInitialized() {
    return this.isInitialized && this.bot !== null;
  }

  getBot() {
    return this.bot;
  }

  async sendSetupInstructions(chatId) {
    const setupMessage = `🏥 <b>New Life Clinic Bot Setup</b>

To set up your Telegram bot:

1️⃣ <b>Create a bot:</b>
   • Message @BotFather on Telegram
   • Send /newbot command
   • Choose a name for your bot
   • Copy the bot token

2️⃣ <b>Set the bot token:</b>
   • Add TELEGRAM_BOT_TOKEN to your .env file
   • Restart the server

3️⃣ <b>Set webhook (optional):</b>
   • Use this URL: https://your-domain.com/api/telegram/webhook/YOUR_BOT_TOKEN
   • Replace 'your-domain.com' with your actual domain

4️⃣ <b>Test the bot:</b>
   • Send /start to your bot
   • Try the interactive buttons

📱 <b>Current Status:</b> ${this.isBotInitialized() ? '✅ Bot is running' : '❌ Bot not configured'}`;

    return await this.sendMessageToStaff(chatId, setupMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
          [{ text: '🔧 Test Bot', callback_data: 'test_bot' }]
        ]
      }
    });
  }

  setupMessageHandlers() {
    if (!this.bot) return;

    // Handle callback queries (button interactions)
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      const messageId = query.message.message_id;

      console.log(`📱 Received callback query: ${data} from chat ${chatId}`);

      try {
        // Answer the callback query first
        await this.bot.answerCallbackQuery(query.id);

        // Handle different button actions
        await this.handleCallbackAction(chatId, data, messageId);

      } catch (error) {
        console.error('❌ Error handling callback query:', error);
        await this.bot.sendMessage(chatId, '❌ Sorry, an error occurred. Please try again.');
      }
    });

    // Handle text messages (for /start command and other interactions)
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      console.log(`📱 Received message: "${text}" from chat ${chatId}`);

      if (text === '/start') {
        await this.handleStartCommand(chatId);
      }
    });

    console.log('✅ Message handlers set up successfully');
  }

  async handleStartCommand(chatId) {
    const keyboard = this.createMainMenuKeyboard();

    await this.bot.sendMessage(chatId, `🏥 <b>Welcome to New Life Clinic Management System</b>

👨‍⚕️ <b>Patient Management</b>
You can:
• View patient records
• Search patients
• Access patient history
• Manage appointments

Use the main menu to navigate.`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async handleCallbackAction(chatId, action, messageId) {
    console.log(`🔄 Handling action: ${action} for chat ${chatId}`);

    try {
      switch (action) {
      case 'view_patients':
        await this.handleViewPatients(chatId);
        break;
      case 'patient_queue':
        await this.handlePatientQueue(chatId);
        break;
      case 'appointments':
        await this.handleAppointments(chatId);
        break;
      case 'new_appointment':
        await this.handleNewAppointment(chatId);
        break;
      case 'lab_orders':
        await this.handleLabOrders(chatId);
        break;
      case 'lab_results':
        await this.handleLabResults(chatId);
        break;
      case 'billing':
        await this.handleBilling(chatId);
        break;
      case 'revenue':
        await this.handleRevenue(chatId);
        break;
      case 'main_menu':
        await this.handleStartCommand(chatId);
        break;
      case 'test_bot':
        await this.handleTestBot(chatId);
        break;
      case 'setup_instructions':
        await this.sendSetupInstructions(chatId);
        break;
      // Patient Management submenu actions
      case 'search_patients':
        await this.handleSearchPatients(chatId);
        break;
      case 'list_all_patients':
        await this.handleListAllPatients(chatId);
        break;
      case 'patient_stats':
        await this.handlePatientStats(chatId);
        break;
      // Appointment Management submenu actions
      case 'today_appointments':
        await this.handleTodayAppointments(chatId);
        break;
      case 'all_appointments':
        await this.handleAllAppointments(chatId);
        break;
      case 'schedule_appointment':
        await this.handleScheduleAppointment(chatId);
        break;
      // Lab submenu actions
      case 'view_lab_orders':
        await this.handleViewLabOrders(chatId);
        break;
      case 'new_lab_order':
        await this.handleNewLabOrder(chatId);
        break;
      case 'search_lab_results':
        await this.handleSearchLabResults(chatId);
        break;
      case 'recent_lab_results':
        await this.handleRecentLabResults(chatId);
        break;
      // Billing submenu actions
      case 'view_invoices':
        await this.handleViewInvoices(chatId);
        break;
      case 'process_payment':
        await this.handleProcessPayment(chatId);
        break;
      // Revenue submenu actions
      case 'daily_revenue':
        await this.handleDailyRevenue(chatId);
        break;
      case 'monthly_revenue':
        await this.handleMonthlyRevenue(chatId);
        break;
      default:
        console.log(`❓ Unknown action received: ${action}`);
        await this.bot.sendMessage(chatId, '❓ Unknown action. Please use the main menu.');
    }
    } catch (error) {
      console.error(`❌ Error handling action ${action}:`, error);
      await this.bot.sendMessage(chatId, '❌ Sorry, an error occurred. Please try again or use the main menu.');
    }
  }

  createMainMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '👥 View Patients', callback_data: 'view_patients' },
          { text: '📋 Patient Queue', callback_data: 'patient_queue' }
        ],
        [
          { text: '📅 Appointments', callback_data: 'appointments' },
          { text: '➕ New Appointment', callback_data: 'new_appointment' }
        ],
        [
          { text: '🔬 Lab Orders', callback_data: 'lab_orders' },
          { text: '📊 Lab Results', callback_data: 'lab_results' }
        ],
        [
          { text: '💰 Billing', callback_data: 'billing' },
          { text: '📈 Revenue', callback_data: 'revenue' }
        ]
      ]
    };
  }

  async handleViewPatients(chatId) {
    try {
      console.log(`🔄 Getting patient data for chat ${chatId}`);
      // Get patient count from database
      const Patient = require('../models/Patient');
      const patientCount = await Patient.countDocuments();
      console.log(`✅ Found ${patientCount} patients`);

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Search Patients', callback_data: 'search_patients' }],
          [{ text: '📋 View All Patients', callback_data: 'list_all_patients' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, `👥 <b>Patient Management</b>

📊 <b>Total Patients:</b> ${patientCount}

Select an option below:`, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleViewPatients:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing patient data. Please try again.');
    }
  }

  async handlePatientQueue(chatId) {
    try {
      const Patient = require('../models/Patient');
      const Visit = require('../models/Visit');

      // Get patients with recent visits (waiting for consultation)
      const recentVisits = await Visit.find({
        status: { $in: ['checked_in', 'waiting', 'in_progress'] }
      })
      .populate('patientId', 'firstName lastName patientId')
      .sort({ checkInTime: -1 })
      .limit(10);

      let message = `📋 <b>Patient Queue</b>\n`;
      message += `📊 <b>Currently Waiting:</b> ${recentVisits.length} patients\n\n`;

      if (recentVisits.length === 0) {
        message += `✅ No patients currently waiting for consultation.\n\n`;
        message += `💡 <i>Patients will appear here when they check in for appointments.</i>`;
      } else {
        message += `<b>👥 Waiting Patients:</b>\n\n`;

        recentVisits.forEach((visit, index) => {
          const patientName = visit.patientId ?
            `${visit.patientId.firstName} ${visit.patientId.lastName}` :
            'Unknown Patient';

          const checkInTime = visit.checkInTime ?
            visit.checkInTime.toLocaleTimeString('en-US', {
              timeZone: 'Africa/Addis_Ababa',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Unknown';

          message += `${index + 1}. <b>${patientName}</b>\n`;
          message += `   ⏰ Checked in: ${checkInTime}\n`;
          message += `   📋 Status: ${visit.status || 'Waiting'}\n`;

          if (visit.priority && visit.priority !== 'normal') {
            message += `   🚨 Priority: ${visit.priority}\n`;
          }

          message += `\n`;
        });

        if (recentVisits.length >= 10) {
          message += `📌 <i>Showing most recent 10 patients. Check web interface for complete queue.</i>`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handlePatientQueue:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing patient queue. Please try again.');
    }
  }

  async handleAppointments(chatId) {
    try {
      const keyboard = {
        inline_keyboard: [
          [{ text: '📅 Today\'s Appointments', callback_data: 'today_appointments' }],
          [{ text: '📆 All Appointments', callback_data: 'all_appointments' }],
          [{ text: '➕ Schedule New', callback_data: 'schedule_appointment' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, `📅 <b>Appointment Management</b>

Manage patient appointments and scheduling.`, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleAppointments:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing appointments. Please try again.');
    }
  }

  async handleNewAppointment(chatId) {
    try {
      await this.bot.sendMessage(chatId, `➕ <b>New Appointment</b>

🚧 Appointment scheduling system is under development.

Please use the web interface to schedule new appointments.`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('❌ Error in handleNewAppointment:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing appointment system. Please try again.');
    }
  }

  async handleLabOrders(chatId) {
    try {
      // Call the view lab orders handler directly to show real data
      await this.handleViewLabOrders(chatId);
    } catch (error) {
      console.error('❌ Error in handleLabOrders:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing lab orders. Please try again.');
    }
  }

  async handleLabResults(chatId) {
    try {
      // Call the recent lab results handler directly to show real data
      await this.handleRecentLabResults(chatId);
    } catch (error) {
      console.error('❌ Error in handleLabResults:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing lab results. Please try again.');
    }
  }

  async handleBilling(chatId) {
    try {
      // Call the view invoices handler directly to show real data
      await this.handleViewInvoices(chatId);
    } catch (error) {
      console.error('❌ Error in handleBilling:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing billing system. Please try again.');
    }
  }

  async handleRevenue(chatId) {
    try {
      // Call the daily revenue handler directly to show real data
      await this.handleDailyRevenue(chatId);
    } catch (error) {
      console.error('❌ Error in handleRevenue:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing revenue reports. Please try again.');
    }
  }

  async handleTestBot(chatId) {
    try {
      const isInitialized = this.isBotInitialized();
      const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });

      let message = `🔧 <b>Bot Test Results</b>\n\n`;
      message += `⏰ <b>Timestamp:</b> ${timestamp}\n`;
      message += `📱 <b>Bot Status:</b> ${isInitialized ? '✅ Active' : '❌ Not Configured'}\n`;

      if (isInitialized) {
        message += `🤖 <b>Polling:</b> ✅ Enabled\n`;
        message += `📨 <b>Message Handlers:</b> ✅ Active\n`;
        message += `🔘 <b>Button Handlers:</b> ✅ Active\n\n`;
        message += `🎉 <b>Test Successful!</b> The bot is working correctly.\n`;
        message += `Try clicking the buttons below to test interactions.`;
      } else {
        message += `\n⚠️ <b>Setup Required:</b>\n`;
        message += `• Add TELEGRAM_BOT_TOKEN to your .env file\n`;
        message += `• Restart the server\n`;
        message += `• Use /start command in your bot\n\n`;
        message += `Use the setup instructions for detailed steps.`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
          [{ text: '📋 View Patients', callback_data: 'view_patients' }],
          ...(isInitialized ? [[{ text: '🔧 Setup Instructions', callback_data: 'setup_instructions' }]] : [])
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleTestBot:', error);
      await this.bot.sendMessage(chatId, '❌ Error running bot test. Please try again.');
    }
  }

  // Patient Management submenu handlers
  async handleSearchPatients(chatId) {
    try {
      const Patient = require('../models/Patient');

      // Simple search - find patients by name (case insensitive)
      const patients = await Patient.find({})
        .select('firstName lastName patientId age gender contactNumber')
        .limit(15);

      let message = `🔍 <b>Patient Search</b>\n`;
      message += `📊 <b>Found:</b> ${patients.length} patients\n\n`;

      if (patients.length === 0) {
        message += `📭 No patients found.\n\n`;
        message += `💡 <i>Add patients through the web interface first.</i>`;
      } else {
        message += `<b>📋 Patient Results:</b>\n\n`;

        patients.forEach((patient, index) => {
          const patientInfo = [];
          if (patient.firstName && patient.lastName) {
            patientInfo.push(`👤 ${patient.firstName} ${patient.lastName}`);
          }
          if (patient.patientId) {
            patientInfo.push(`🆔 ${patient.patientId}`);
          }
          if (patient.age) {
            patientInfo.push(`🎂 ${patient.age}y`);
          }
          if (patient.gender) {
            patientInfo.push(`🚻 ${patient.gender}`);
          }
          if (patient.contactNumber) {
            patientInfo.push(`📞 ${patient.contactNumber}`);
          }

          message += `${index + 1}. ${patientInfo.join(' | ')}\n`;
        });

        message += `\n💡 <i>Use the web interface for advanced search by specific criteria.</i>`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
          [{ text: '👥 View Patients', callback_data: 'view_patients' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleSearchPatients:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing patient search. Please try again.');
    }
  }

  async handleListAllPatients(chatId) {
    try {
      console.log(`🔄 Getting patient list for chat ${chatId}`);
      const Patient = require('../models/Patient');
      const patients = await Patient.find({}).limit(20).select('firstName lastName patientId age gender contactNumber');
      console.log(`✅ Found ${patients.length} patients for listing`);

      let message = `📋 <b>Patient Directory</b>\n\n`;
      message += `📊 <b>Total Patients:</b> ${patients.length}\n`;
      message += `📄 <b>Showing:</b> ${patients.length} patients\n\n`;

      if (patients.length === 0) {
        message += `📭 No patients found in the system.\n\n`;
        message += `💡 <i>Add patients through the web interface to see them here.</i>`;
      } else {
        message += `<b>📋 Patient List:</b>\n\n`;

        patients.forEach((patient, index) => {
          const patientInfo = [];
          if (patient.firstName && patient.lastName) {
            patientInfo.push(`👤 ${patient.firstName} ${patient.lastName}`);
          }
          if (patient.patientId) {
            patientInfo.push(`🆔 ${patient.patientId}`);
          }
          if (patient.age) {
            patientInfo.push(`🎂 ${patient.age}y`);
          }
          if (patient.gender) {
            patientInfo.push(`🚻 ${patient.gender}`);
          }
          if (patient.contactNumber) {
            patientInfo.push(`📞 ${patient.contactNumber}`);
          }

          message += `${index + 1}. ${patientInfo.join(' | ')}\n`;
        });

        if (patients.length >= 20) {
          message += `\n📌 <i>Showing first 20 patients. Use search for specific patients.</i>`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Search Patients', callback_data: 'search_patients' }],
          [{ text: '📊 Patient Stats', callback_data: 'patient_stats' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleListAllPatients:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing patient list. Please try again.');
    }
  }

  async handlePatientStats(chatId) {
    try {
      const Patient = require('../models/Patient');

      // Get basic statistics
      const totalPatients = await Patient.countDocuments();
      const malePatients = await Patient.countDocuments({ gender: 'male' });
      const femalePatients = await Patient.countDocuments({ gender: 'female' });
      const otherGenderPatients = await Patient.countDocuments({ gender: 'other' });

      // Get age statistics
      const ageStats = await Patient.aggregate([
        {
          $group: {
            _id: null,
            avgAge: { $avg: '$age' },
            minAge: { $min: '$age' },
            maxAge: { $max: '$age' },
            count: { $sum: 1 }
          }
        }
      ]);

      const stats = ageStats[0] || { avgAge: 0, minAge: 0, maxAge: 0, count: 0 };

      let message = `📊 <b>Patient Statistics</b>\n\n`;
      message += `👥 <b>Total Patients:</b> ${totalPatients}\n\n`;

      message += `<b>Gender Distribution:</b>\n`;
      message += `🚹 Male: ${malePatients}\n`;
      message += `🚺 Female: ${femalePatients}\n`;
      message += `🏳️ Other: ${otherGenderPatients}\n\n`;

      message += `<b>Age Statistics:</b>\n`;
      message += `📊 Average Age: ${Math.round(stats.avgAge || 0)} years\n`;
      message += `📉 Youngest: ${stats.minAge || 0} years\n`;
      message += `📈 Oldest: ${stats.maxAge || 0} years\n`;

      if (totalPatients > 0) {
        const malePercentage = Math.round((malePatients / totalPatients) * 100);
        const femalePercentage = Math.round((femalePatients / totalPatients) * 100);

        message += `\n📋 <b>Gender Breakdown:</b>\n`;
        message += `🚹 ${malePercentage}% Male | 🚺 ${femalePercentage}% Female`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📋 View All Patients', callback_data: 'list_all_patients' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handlePatientStats:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing patient statistics. Please try again.');
    }
  }

  // Appointment Management submenu handlers
  async handleTodayAppointments(chatId) {
    try {
      const Appointment = require('../models/Appointment');
      const Patient = require('../models/Patient');

      // Get today's date in Ethiopia timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find today's appointments
      const todaysAppointments = await Appointment.find({
        appointmentDateTime: {
          $gte: today,
          $lt: tomorrow
        },
        status: { $in: ['Scheduled', 'Checked In'] }
      })
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .sort({ appointmentDateTime: 1 })
      .limit(10);

      let message = `📅 <b>Today's Appointments</b>\n`;
      message += `📊 <b>Scheduled:</b> ${todaysAppointments.length} appointments\n\n`;

      if (todaysAppointments.length === 0) {
        message += `📭 No appointments scheduled for today.\n\n`;
        message += `💡 <i>Use the web interface to schedule appointments.</i>`;
      } else {
        message += `<b>📋 Appointment List:</b>\n\n`;

        todaysAppointments.forEach((appointment, index) => {
          const time = appointment.appointmentDateTime.toLocaleTimeString('en-US', {
            timeZone: 'Africa/Addis_Ababa',
            hour: '2-digit',
            minute: '2-digit'
          });

          const patientName = appointment.patientId ?
            `${appointment.patientId.firstName} ${appointment.patientId.lastName}` :
            'Unknown Patient';

          const doctorName = appointment.doctorId ?
            `Dr. ${appointment.doctorId.firstName} ${appointment.doctorId.lastName}` :
            'Unassigned';

          message += `${index + 1}. <b>${time}</b> - ${patientName}\n`;
          message += `   👨‍⚕️ ${doctorName}\n`;
          message += `   📋 ${appointment.type} (${appointment.status})\n`;

          if (appointment.reason) {
            message += `   📝 ${appointment.reason}\n`;
          }

          message += `\n`;
        });

        if (todaysAppointments.length >= 10) {
          message += `📌 <i>Showing first 10 appointments. Check web interface for complete list.</i>`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📆 All Appointments', callback_data: 'all_appointments' }],
          [{ text: '➕ Schedule New', callback_data: 'schedule_appointment' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleTodayAppointments:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing appointments. Please try again.');
    }
  }

  async handleAllAppointments(chatId) {
    try {
      const Appointment = require('../models/Appointment');
      const Patient = require('../models/Patient');

      // Get appointments for the next 7 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      // Find upcoming appointments
      const upcomingAppointments = await Appointment.find({
        appointmentDateTime: {
          $gte: today,
          $lt: weekFromNow
        },
        status: { $in: ['Scheduled', 'Checked In'] }
      })
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .sort({ appointmentDateTime: 1 })
      .limit(15);

      let message = `📆 <b>Upcoming Appointments (7 days)</b>\n`;
      message += `📊 <b>Scheduled:</b> ${upcomingAppointments.length} appointments\n\n`;

      if (upcomingAppointments.length === 0) {
        message += `📭 No upcoming appointments found.\n\n`;
        message += `💡 <i>Use the web interface to schedule appointments.</i>`;
      } else {
        // Group by date
        const appointmentsByDate = {};

        upcomingAppointments.forEach(appointment => {
          const dateKey = appointment.appointmentDateTime.toDateString();
          if (!appointmentsByDate[dateKey]) {
            appointmentsByDate[dateKey] = [];
          }
          appointmentsByDate[dateKey].push(appointment);
        });

        for (const [dateStr, appointments] of Object.entries(appointmentsByDate)) {
          const date = new Date(dateStr);
          const isToday = date.toDateString() === new Date().toDateString();

          message += `<b>${isToday ? '📅 TODAY' : '📅 ' + date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}:</b>\n`;

          appointments.forEach((appointment, index) => {
            const time = appointment.appointmentDateTime.toLocaleTimeString('en-US', {
              timeZone: 'Africa/Addis_Ababa',
              hour: '2-digit',
              minute: '2-digit'
            });

            const patientName = appointment.patientId ?
              `${appointment.patientId.firstName} ${appointment.patientId.lastName}` :
              'Unknown Patient';

            const doctorName = appointment.doctorId ?
              `Dr. ${appointment.doctorId.firstName} ${appointment.doctorId.lastName}` :
              'Unassigned';

            message += `   <b>${time}</b> - ${patientName}\n`;
            message += `      👨‍⚕️ ${doctorName} (${appointment.type})\n`;
          });

          message += `\n`;
        }

        if (upcomingAppointments.length >= 15) {
          message += `📌 <i>Showing first 15 appointments. Check web interface for complete list.</i>`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📅 Today Only', callback_data: 'today_appointments' }],
          [{ text: '➕ Schedule New', callback_data: 'schedule_appointment' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleAllAppointments:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing appointments. Please try again.');
    }
  }

  async handleScheduleAppointment(chatId) {
    try {
      await this.bot.sendMessage(chatId, `➕ <b>Schedule Appointment</b>

🚧 Appointment scheduling is under development.

Please use the web interface to schedule new appointments.`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
            [{ text: '📅 Appointments', callback_data: 'appointments' }]
          ]
        }
      });
    } catch (error) {
      console.error('❌ Error in handleScheduleAppointment:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing appointment scheduler. Please try again.');
    }
  }

  // Lab submenu handlers
  async handleViewLabOrders(chatId) {
    try {
      const LabOrder = require('../models/LabOrder');
      const Patient = require('../models/Patient');

      // Get recent lab orders - use patient field for population
      const recentOrders = await LabOrder.find({})
        .populate('patient', 'firstName lastName patientId')
        .populate('orderingDoctorId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10);

      let message = `📋 <b>Lab Orders</b>\n`;
      message += `📊 <b>Total Orders:</b> ${recentOrders.length}\n\n`;

      if (recentOrders.length === 0) {
        message += `📭 No lab orders found.\n\n`;
        message += `💡 <i>Create lab orders through the web interface to see them here.</i>`;
      } else {
        message += `<b>🔬 Recent Lab Orders:</b>\n\n`;

        recentOrders.forEach((order, index) => {
          const patientName = order.patient ?
            `${order.patient.firstName} ${order.patient.lastName}` :
            'Unknown Patient';

          const doctorName = order.orderingDoctorId ?
            `Dr. ${order.orderingDoctorId.firstName} ${order.orderingDoctorId.lastName}` :
            'Unknown Doctor';

          const orderDate = order.createdAt.toLocaleDateString('en-US', {
            timeZone: 'Africa/Addis_Ababa',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          message += `${index + 1}. <b>${patientName}</b>\n`;
          message += `   👨‍⚕️ ${doctorName}\n`;
          message += `   📅 ${orderDate}\n`;
          message += `   📋 ${order.testType || order.tests?.[0]?.testName || 'General Test'}\n`;
          message += `   📊 Status: ${order.status || 'Pending'}\n`;

          if (order.priority && order.priority !== 'normal') {
            message += `   🚨 Priority: ${order.priority}\n`;
          }

          message += `\n`;
        });

        if (recentOrders.length >= 10) {
          message += `📌 <i>Showing most recent 10 orders. Check web interface for complete list.</i>`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '➕ New Lab Order', callback_data: 'new_lab_order' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleViewLabOrders:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing lab orders. Please try again.');
    }
  }

  async handleNewLabOrder(chatId) {
    try {
      await this.bot.sendMessage(chatId, `➕ <b>New Lab Order</b>

🚧 Lab order creation is under development.

Please use the web interface to create new lab orders.`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
            [{ text: '🔬 Lab Orders', callback_data: 'lab_orders' }]
          ]
        }
      });
    } catch (error) {
      console.error('❌ Error in handleNewLabOrder:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing lab order creation. Please try again.');
    }
  }

  async handleSearchLabResults(chatId) {
    try {
      const LabServiceResult = require('../models/LabServiceResult');
      const Patient = require('../models/Patient');

      // Get recent lab results
      const recentResults = await LabServiceResult.find({})
        .populate('patientId', 'firstName lastName patientId gender age')
        .sort({ resultCreatedDate: -1 })
        .limit(8);

      let message = `🔍 <b>Lab Results Search</b>\n`;
      message += `📊 <b>Recent Results:</b> ${recentResults.length}\n\n`;

      if (recentResults.length === 0) {
        message += `📭 No lab results found.\n\n`;
        message += `💡 <i>Complete lab tests through the web interface to see results here.</i>`;
      } else {
        message += `<b>🧪 Recent Lab Results:</b>\n\n`;

        recentResults.forEach((result, index) => {
          const patientName = result.patientId ?
            `${result.patientId.firstName} ${result.patientId.lastName}` :
            'Unknown Patient';

          const patientInfo = [];
          if (result.patientId?.age) patientInfo.push(`Age: ${result.patientId.age}`);
          if (result.patientId?.gender) patientInfo.push(`Gender: ${result.patientId.gender}`);

          const resultDate = result.resultCreatedDate.toLocaleDateString('en-US', {
            timeZone: 'Africa/Addis_Ababa',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          message += `${index + 1}. <b>${patientName}</b>\n`;
          message += `   🧪 ${result.testName}\n`;
          message += `   📅 ${resultDate}\n`;
          message += `   📊 Status: ${result.status || 'Completed'}\n`;

          if (patientInfo.length > 0) {
            message += `   👤 ${patientInfo.join(', ')}\n`;
          }

          if (result.priority && result.priority !== 'Routine') {
            message += `   🚨 Priority: ${result.priority}\n`;
          }

          if (result.notes) {
            message += `   📝 ${result.notes.substring(0, 50)}${result.notes.length > 50 ? '...' : ''}\n`;
          }

          message += `\n`;
        });

        if (recentResults.length >= 8) {
          message += `📌 <i>Showing most recent 8 results. Use web interface for complete search.</i>`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📋 Recent Results', callback_data: 'recent_lab_results' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleSearchLabResults:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing lab results search. Please try again.');
    }
  }

  async handleRecentLabResults(chatId) {
    try {
      const LabServiceResult = require('../models/LabServiceResult');
      const Patient = require('../models/Patient');

      // Get recent lab results with more details
      const recentResults = await LabServiceResult.find({})
        .populate('patientId', 'firstName lastName patientId gender age')
        .sort({ resultCreatedDate: -1 })
        .limit(12);

      let message = `📋 <b>Recent Lab Results</b>\n`;
      message += `📊 <b>Total Results:</b> ${recentResults.length}\n\n`;

      if (recentResults.length === 0) {
        message += `📭 No lab results available.\n\n`;
        message += `💡 <i>Complete lab tests through the web interface to see results here.</i>`;
      } else {
        message += `<b>🧪 Latest Lab Results:</b>\n\n`;

        recentResults.forEach((result, index) => {
          const patientName = result.patientId ?
            `${result.patientId.firstName} ${result.patientId.lastName}` :
            'Unknown Patient';

          const resultDate = result.resultCreatedDate.toLocaleDateString('en-US', {
            timeZone: 'Africa/Addis_Ababa',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const patientInfo = [];
          if (result.patientId?.age) patientInfo.push(`Age: ${result.patientId.age}`);
          if (result.patientId?.gender) patientInfo.push(`Gender: ${result.patientId.gender}`);

          message += `${index + 1}. <b>${patientName}</b>\n`;
          message += `   🧪 ${result.testName}\n`;
          message += `   📅 ${resultDate}\n`;
          message += `   📊 Status: ${result.status || 'Completed'}\n`;

          if (patientInfo.length > 0) {
            message += `   👤 ${patientInfo.join(', ')}\n`;
          }

          if (result.priority && result.priority !== 'Routine') {
            message += `   🚨 Priority: ${result.priority}\n`;
          }

          if (result.notes && result.notes.length <= 100) {
            message += `   📝 ${result.notes}\n`;
          } else if (result.notes && result.notes.length > 100) {
            message += `   📝 ${result.notes.substring(0, 100)}...\n`;
          }

          message += `\n`;
        });

        if (recentResults.length >= 12) {
          message += `📌 <i>Showing most recent 12 results. Use search for specific results.</i>`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Search Results', callback_data: 'search_lab_results' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleRecentLabResults:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing recent lab results. Please try again.');
    }
  }

  // Billing submenu handlers
  async handleViewInvoices(chatId) {
    try {
      const Invoice = require('../models/Invoice');
      const Patient = require('../models/Patient');

      // Get recent invoices
      const recentInvoices = await Invoice.find({})
        .populate('patientId', 'firstName lastName patientId')
        .sort({ createdAt: -1 })
        .limit(10);

      let message = `📋 <b>Recent Invoices</b>\n`;
      message += `📊 <b>Total Invoices:</b> ${recentInvoices.length}\n\n`;

      if (recentInvoices.length === 0) {
        message += `📭 No invoices found.\n\n`;
        message += `💡 <i>Create invoices through the web interface to see them here.</i>`;
      } else {
        message += `<b>💼 Latest Invoices:</b>\n\n`;

        recentInvoices.forEach((invoice, index) => {
          const patientName = invoice.patientId ?
            `${invoice.patientId.firstName} ${invoice.patientId.lastName}` :
            'Unknown Patient';

          const invoiceDate = invoice.createdAt.toLocaleDateString('en-US', {
            timeZone: 'Africa/Addis_Ababa',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          const totalAmount = invoice.totalAmount || 0;

          message += `${index + 1}. <b>${patientName}</b>\n`;
          message += `   💰 ${totalAmount.toLocaleString()} ETB\n`;
          message += `   📅 ${invoiceDate}\n`;
          message += `   📊 Status: ${invoice.status || 'Pending'}\n`;

          if (invoice.description) {
            message += `   📝 ${invoice.description.substring(0, 50)}${invoice.description.length > 50 ? '...' : ''}\n`;
          }

          message += `\n`;
        });

        if (recentInvoices.length >= 10) {
          message += `📌 <i>Showing most recent 10 invoices. Check web interface for complete list.</i>`;
        }

        // Calculate totals
        const totalRevenue = recentInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const paidInvoices = recentInvoices.filter(inv => inv.status === 'paid').length;
        const pendingInvoices = recentInvoices.filter(inv => inv.status === 'pending').length;

        message += `\n<b>📈 Summary:</b>\n`;
        message += `💰 Total Value: ${totalRevenue.toLocaleString()} ETB\n`;
        message += `✅ Paid: ${paidInvoices}\n`;
        message += `⏳ Pending: ${pendingInvoices}`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '💳 Process Payment', callback_data: 'process_payment' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleViewInvoices:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing invoices. Please try again.');
    }
  }

  async handleProcessPayment(chatId) {
    try {
      const Payment = require('../models/Payment');
      const Invoice = require('../models/Invoice');

      // Get recent payments and pending invoices
      const recentPayments = await Payment.find({})
        .populate('patientId', 'firstName lastName patientId')
        .populate('invoiceId', 'totalAmount')
        .sort({ createdAt: -1 })
        .limit(5);

      const pendingInvoices = await Invoice.find({ status: 'pending' })
        .populate('patientId', 'firstName lastName patientId')
        .sort({ createdAt: 1 })
        .limit(5);

      let message = `💳 <b>Payment Processing</b>\n\n`;

      // Show recent payments
      if (recentPayments.length > 0) {
        message += `<b>💰 Recent Payments:</b>\n`;

        recentPayments.forEach((payment, index) => {
          const patientName = payment.patientId ?
            `${payment.patientId.firstName} ${payment.patientId.lastName}` :
            'Unknown Patient';

          const paymentDate = payment.createdAt.toLocaleDateString('en-US', {
            timeZone: 'Africa/Addis_Ababa',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          message += `${index + 1}. ${patientName} - ${payment.amount?.toLocaleString() || 0} ETB\n`;
          message += `   📅 ${paymentDate} (${payment.status || 'Completed'})\n`;
        });

        message += `\n`;
      }

      // Show pending invoices that need payment
      if (pendingInvoices.length > 0) {
        message += `<b>⏳ Pending Invoices:</b>\n`;

        pendingInvoices.forEach((invoice, index) => {
          const patientName = invoice.patientId ?
            `${invoice.patientId.firstName} ${invoice.patientId.lastName}` :
            'Unknown Patient';

          const invoiceDate = invoice.createdAt.toLocaleDateString('en-US', {
            timeZone: 'Africa/Addis_Ababa',
            month: 'short',
            day: 'numeric'
          });

          const amount = invoice.totalAmount || 0;

          message += `${index + 1}. ${patientName} - ${amount.toLocaleString()} ETB\n`;
          message += `   📅 ${invoiceDate}\n`;
        });

        message += `\n💡 <i>Use the web interface to process these payments.</i>`;
      } else {
        message += `✅ No pending invoices requiring payment.\n\n`;
        message += `💡 <i>All invoices are either paid or don't require payment processing.</i>`;
      }

      if (recentPayments.length === 0 && pendingInvoices.length === 0) {
        message += `📭 No payment activity found.\n\n`;
        message += `💡 <i>Process payments through the web interface to see them here.</i>`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📋 View Invoices', callback_data: 'view_invoices' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleProcessPayment:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing payment processing. Please try again.');
    }
  }

  // Revenue submenu handlers
  async handleDailyRevenue(chatId) {
    try {
      const today = new Date().toLocaleDateString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      let message = `📊 <b>Daily Revenue Report</b>\n`;
      message += `📅 <b>Date:</b> ${today}\n\n`;

      // Get invoice and payment data
      try {
        const Invoice = require('../models/Invoice');
        const Payment = require('../models/Payment');

        // Get today's date range in Ethiopia timezone
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        // Get today's invoices
        const todaysInvoices = await Invoice.find({
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd
          }
        });

        // Get today's payments
        const todaysPayments = await Payment.find({
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd
          },
          status: 'completed'
        });

        const totalRevenue = todaysInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalPaid = todaysPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
        const outstanding = totalRevenue - totalPaid;

        message += `💰 <b>Total Revenue:</b> ${totalRevenue.toLocaleString()} ETB\n`;
        message += `💳 <b>Paid Amount:</b> ${totalPaid.toLocaleString()} ETB\n`;
        message += `⏳ <b>Outstanding:</b> ${outstanding.toLocaleString()} ETB\n`;
        message += `🧾 <b>Invoices:</b> ${todaysInvoices.length}\n`;
        message += `💳 <b>Payments:</b> ${todaysPayments.length}\n`;

        if (totalRevenue > 0) {
          const collectionRate = ((totalPaid / totalRevenue) * 100).toFixed(1);
          message += `📊 <b>Collection Rate:</b> ${collectionRate}%\n\n`;

          if (todaysInvoices.length > 0) {
            const avgInvoice = Math.round(totalRevenue / todaysInvoices.length);
            message += `📋 <b>Average per Invoice:</b> ${avgInvoice.toLocaleString()} ETB`;
          }
        } else {
          message += `\n📭 No financial activity recorded today yet.`;
        }

        if (todaysInvoices.length > 0) {
          message += `\n\n<b>💼 Recent Invoices:</b>\n`;
          todaysInvoices.slice(0, 3).forEach((invoice, index) => {
            message += `${index + 1}. ${invoice.totalAmount?.toLocaleString() || 0} ETB - ${invoice.status || 'Pending'}\n`;
          });

          if (todaysInvoices.length > 3) {
            message += `... and ${todaysInvoices.length - 3} more`;
          }
        }

      } catch (dbError) {
        console.error('❌ Error accessing revenue data:', dbError);
        message += `📭 No revenue data available.\n\n`;
        message += `💡 <i>Start creating invoices to see revenue data here.</i>`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📈 Monthly Revenue', callback_data: 'monthly_revenue' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleDailyRevenue:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing daily revenue. Please try again.');
    }
  }

  async handleMonthlyRevenue(chatId) {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleDateString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: 'long'
      });

      let message = `📈 <b>Monthly Revenue Report</b>\n`;
      message += `📅 <b>Month:</b> ${currentMonth}\n\n`;

      // Get invoice and payment data for current month
      try {
        const Invoice = require('../models/Invoice');
        const Payment = require('../models/Payment');

        // Get current month date range
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        // Get monthly invoices
        const monthlyInvoices = await Invoice.find({
          createdAt: {
            $gte: monthStart,
            $lte: monthEnd
          }
        });

        // Get monthly payments
        const monthlyPayments = await Payment.find({
          createdAt: {
            $gte: monthStart,
            $lte: monthEnd
          },
          status: 'completed'
        });

        const totalRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalPaid = monthlyPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
        const outstanding = totalRevenue - totalPaid;

        message += `💰 <b>Total Revenue:</b> ${totalRevenue.toLocaleString()} ETB\n`;
        message += `💳 <b>Paid Amount:</b> ${totalPaid.toLocaleString()} ETB\n`;
        message += `⏳ <b>Outstanding:</b> ${outstanding.toLocaleString()} ETB\n`;
        message += `🧾 <b>Invoices:</b> ${monthlyInvoices.length}\n`;
        message += `💳 <b>Payments:</b> ${monthlyPayments.length}\n`;

        if (totalRevenue > 0) {
          const collectionRate = ((totalPaid / totalRevenue) * 100).toFixed(1);
          message += `📊 <b>Collection Rate:</b> ${collectionRate}%\n\n`;

          if (monthlyInvoices.length > 0) {
            const avgInvoice = Math.round(totalRevenue / monthlyInvoices.length);
            message += `📋 <b>Average per Invoice:</b> ${avgInvoice.toLocaleString()} ETB\n\n`;

            // Group by week for better insights
            const weeklyData = {};
            monthlyInvoices.forEach(invoice => {
              const weekStart = new Date(invoice.createdAt);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
              const weekKey = weekStart.toDateString();

              if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { revenue: 0, count: 0 };
              }
              weeklyData[weekKey].revenue += invoice.totalAmount || 0;
              weeklyData[weekKey].count += 1;
            });

            message += `<b>📊 Weekly Breakdown:</b>\n`;
            Object.entries(weeklyData).forEach(([week, data]) => {
              const weekDate = new Date(week).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
              message += `• Week of ${weekDate}: ${data.revenue.toLocaleString()} ETB (${data.count} invoices)\n`;
            });
          }
        } else {
          message += `\n📭 No financial activity recorded this month yet.`;
        }

      } catch (dbError) {
        console.error('❌ Error accessing monthly revenue data:', dbError);
        message += `📭 No revenue data available for this month.\n\n`;
        message += `💡 <i>Monthly reports will show here as invoices are created.</i>`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '📊 Daily Revenue', callback_data: 'daily_revenue' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('❌ Error in handleMonthlyRevenue:', error);
      await this.bot.sendMessage(chatId, '❌ Error accessing monthly revenue. Please try again.');
    }
  }
}

// Create singleton instance
const telegramService = new TelegramService();

module.exports = telegramService;
