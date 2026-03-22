require('dotenv').config({ path: __dirname + '/.env' });
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// Import User model first
const User = require('./models/User');

async function startTelegramServer() {
  try {
    console.log('🚀 Starting Enhanced Telegram Bot Server...');
    console.log('📋 Environment check:');
    console.log('  TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
    console.log('  TELEGRAM_BOT_TOKEN length:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 0);

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
      console.log('📝 Please create .env file with:');
      console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
      return;
    }

    // Connect to MongoDB for user verification
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for user verification');

    // Create bot instance
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: true,
      filepath: false
    });

    console.log('✅ Telegram bot initialized successfully');
    console.log('🤖 Bot info:');

    // Get bot information
    const botInfo = await bot.getMe();
    console.log('  - Username:', botInfo.username);
    console.log('  - Name:', botInfo.first_name);
    console.log('  - ID:', botInfo.id);

    // Store active user sessions
    const activeSessions = new Map();

    // Helper function to get user by Telegram chat ID
    async function getUserByChatId(chatId) {
      try {
        const user = await User.findOne({
          telegramChatId: chatId.toString(),
          telegramNotificationsEnabled: true,
          isActive: true
        });

        return user;
      } catch (error) {
        console.error('❌ Error getting user by chat ID:', error);
        return null;
      }
    }

    // Helper function to check user permissions
    function hasPermission(user, permission) {
      const rolePermissions = {
        admin: ['view_dashboard', 'manage_users', 'view_reports', 'manage_inventory', 'billing_access'],
        doctor: ['view_patients', 'manage_patients', 'view_appointments', 'billing_access'],
        nurse: ['view_patients', 'manage_patients', 'view_appointments'],
        lab: ['view_lab_orders', 'manage_lab_orders'],
        finance: ['view_billing', 'manage_billing', 'view_reports'],
        reception: ['view_patients', 'manage_appointments', 'billing_access']
      };

      return rolePermissions[user.role]?.includes(permission) || false;
    }

    // Helper function to create main menu keyboard based on user role
    function createMainMenuKeyboard(user) {
      const keyboard = [];

      // Common buttons for all users
      if (hasPermission(user, 'view_dashboard')) {
        keyboard.push([{ text: '🏠 Dashboard', callback_data: 'dashboard' }]);
      }

      // Patient-related buttons
      if (hasPermission(user, 'view_patients')) {
        keyboard.push([
          { text: '👥 View Patients', callback_data: 'view_patients' },
          { text: '📋 Patient Queue', callback_data: 'patient_queue' }
        ]);
      }

      // Appointment buttons
      if (hasPermission(user, 'view_appointments')) {
        keyboard.push([
          { text: '📅 Appointments', callback_data: 'appointments' },
          { text: '➕ New Appointment', callback_data: 'new_appointment' }
        ]);
      }

      // Lab buttons (for lab staff and doctors)
      if (hasPermission(user, 'view_lab_orders') || hasPermission(user, 'view_patients')) {
        keyboard.push([
          { text: '🧪 Lab Orders', callback_data: 'lab_orders' },
          { text: '📊 Lab Results', callback_data: 'lab_results' }
        ]);
      }

      // Billing buttons (for authorized staff)
      if (hasPermission(user, 'billing_access') || hasPermission(user, 'view_billing')) {
        keyboard.push([
          { text: '💰 Billing', callback_data: 'billing' },
          { text: '📈 Revenue', callback_data: 'revenue' }
        ]);
      }

      // Admin buttons
      if (hasPermission(user, 'manage_users')) {
        keyboard.push([
          { text: '👥 Staff Management', callback_data: 'staff_management' },
          { text: '⚙️ System Settings', callback_data: 'system_settings' }
        ]);
      }

      // Reports buttons (for authorized staff)
      if (hasPermission(user, 'view_reports')) {
        keyboard.push([
          { text: '📊 Reports', callback_data: 'reports' },
          { text: '📈 Analytics', callback_data: 'analytics' }
        ]);
      }

      return {
        reply_markup: {
          inline_keyboard: keyboard
        }
      };
    }

    // Handle callback queries (button clicks)
    bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const user = await getUserByChatId(chatId);

      if (!user) {
        bot.answerCallbackQuery(query.id, {
          text: '❌ Unauthorized access. Please contact admin.',
          show_alert: true
        });
        return;
      }

      const action = query.data;
      console.log(`🔘 Button clicked by ${user.firstName} ${user.lastName} (${user.role}): ${action}`);

      // Handle different actions based on user permissions
      switch (action) {
        case 'dashboard':
          if (hasPermission(user, 'view_dashboard')) {
            bot.sendMessage(chatId, `🏠 *Dashboard Access Granted*

Welcome back, ${user.firstName}!

📊 *Quick Stats:*
• Role: ${user.role}
• Department: ${user.specialization || 'General'}
• Status: Active

What would you like to do?`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'view_patients':
          if (hasPermission(user, 'view_patients')) {
            bot.sendMessage(chatId, `👥 *Patient Management*

You can:
• View patient records
• Search patients
• Access patient history
• Manage appointments

Use the main menu to navigate.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'patient_queue':
          if (hasPermission(user, 'view_patients')) {
            bot.sendMessage(chatId, `📋 *Patient Queue*

Current queue status and patient management tools available in the main system.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'appointments':
          if (hasPermission(user, 'view_appointments')) {
            bot.sendMessage(chatId, `📅 *Appointments*

View and manage appointments for today and upcoming days.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'new_appointment':
          if (hasPermission(user, 'view_appointments')) {
            bot.sendMessage(chatId, `➕ *New Appointment*

Please use the main system to create new appointments.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'lab_orders':
          if (hasPermission(user, 'view_lab_orders') || hasPermission(user, 'view_patients')) {
            bot.sendMessage(chatId, `🧪 *Lab Orders*

Access lab order management and results.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'lab_results':
          if (hasPermission(user, 'view_lab_orders') || hasPermission(user, 'view_patients')) {
            bot.sendMessage(chatId, `📊 *Lab Results*

View lab test results and reports.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'billing':
          if (hasPermission(user, 'billing_access') || hasPermission(user, 'view_billing')) {
            bot.sendMessage(chatId, `💰 *Billing System*

Access billing, invoices, and payment management.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'revenue':
          if (hasPermission(user, 'view_reports')) {
            bot.sendMessage(chatId, `📈 *Revenue Analytics*

View revenue reports and financial analytics.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'staff_management':
          if (hasPermission(user, 'manage_users')) {
            bot.sendMessage(chatId, `👥 *Staff Management*

Manage staff accounts, roles, and permissions.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'system_settings':
          if (hasPermission(user, 'manage_users')) {
            bot.sendMessage(chatId, `⚙️ *System Settings*

Configure system settings and preferences.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'reports':
          if (hasPermission(user, 'view_reports')) {
            bot.sendMessage(chatId, `📊 *Reports*

Access various system reports and analytics.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        case 'analytics':
          if (hasPermission(user, 'view_reports')) {
            bot.sendMessage(chatId, `📈 *Analytics Dashboard*

View detailed analytics and insights.`, {
              parse_mode: 'Markdown',
              ...createMainMenuKeyboard(user)
            });
            bot.answerCallbackQuery(query.id);
          } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Access denied' });
          }
          break;

        default:
          bot.answerCallbackQuery(query.id, { text: '❓ Unknown action' });
      }

      bot.answerCallbackQuery(query.id);
    });

    // Handle messages
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const user = await getUserByChatId(chatId);

      console.log('📨 Message received:');
      console.log('  - From:', `${msg.from.first_name} ${msg.from.last_name || ''}`.trim());
      console.log('  - Chat ID:', msg.chat.id);
      console.log('  - Username:', msg.from.username || 'No username');
      console.log('  - Text:', msg.text || 'No text');
      console.log('  - User found:', !!user);
      if (user) {
        console.log('  - User role:', user.role);
        console.log('  - User name:', `${user.firstName} ${user.lastName}`);
      }

      // If user is not authorized
      if (!user) {
        if (msg.text && msg.text.toLowerCase().includes('chat')) {
          bot.sendMessage(msg.chat.id, `Your chat ID is: \`${msg.chat.id}\`

To use this bot, please:
1. Contact your system administrator
2. Have them add your chat ID to your user profile
3. Enable Telegram notifications in Staff Management

Your chat ID: ${msg.chat.id}`, {
            parse_mode: 'Markdown'
          });
          return;
        }

        bot.sendMessage(msg.chat.id, `🔐 *Unauthorized Access*

Your chat ID is: \`${msg.chat.id}\`

To use this bot:
1. Contact your system administrator
2. Have them add your chat ID to your user profile in Staff Management
3. Enable Telegram notifications

Then you'll see personalized buttons based on your role and permissions.`, {
          parse_mode: 'Markdown',
          ...createMainMenuKeyboard({ role: 'guest' }) // Empty keyboard for unauthorized users
        });
        return;
      }

      // Authorized user - show main menu
      if (msg.text === '/start' || msg.text === '/menu' || !msg.text) {
        bot.sendMessage(chatId, `🏥 *New Life Clinic Bot*

Welcome back, ${user.firstName} ${user.lastName}!

👤 *Your Profile:*
• Role: ${user.role}
• Department: ${user.specialization || 'General'}
• Status: ✅ Authorized

Choose an option below to get started:`, {
          parse_mode: 'Markdown',
          ...createMainMenuKeyboard(user)
        });
      } else if (msg.text && msg.text.toLowerCase().includes('chat')) {
        bot.sendMessage(msg.chat.id, `✅ *Already Authorized*

Your chat ID: \`${msg.chat.id}\`
Role: ${user.role}
Name: ${user.firstName} ${user.lastName}

You're all set! Use the buttons below to navigate.`, {
          parse_mode: 'Markdown',
          ...createMainMenuKeyboard(user)
        });
      } else {
        // Echo with menu
        bot.sendMessage(msg.chat.id, `📨 *Message Received*

"${msg.text}"

Use the buttons below to access clinic features.`, {
          parse_mode: 'Markdown',
          ...createMainMenuKeyboard(user)
        });
      }
    });

    bot.on('polling_error', (error) => {
      console.error('❌ Polling error:', error);
    });

    console.log('🎉 Telegram Bot Server is running!');
    console.log('📱 Send a message to your bot to get your chat ID');
    console.log('🔄 Press Ctrl+C to stop');

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping Telegram Bot Server...');
      bot.stopPolling();
      console.log('✅ Telegram Bot Server stopped');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting Telegram server:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startTelegramServer();
