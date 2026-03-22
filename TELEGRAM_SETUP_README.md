# Telegram Notification Setup Guide

## Overview
The clinic management system now supports Telegram notifications for doctors. When new patients are registered and assigned to doctors, they can receive instant notifications via Telegram about their assigned patients.

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a conversation with BotFather
3. Send the command `/newbot`
4. Follow the instructions to create your bot:
   - Choose a name for your bot (e.g., "Clinic Notifications")
   - Choose a username for your bot (must end with "bot")
5. Copy the **Bot Token** that BotFather provides

### 2. Get Your Chat ID

There are several ways to get your chat ID:

#### Method 1: Message your bot
1. Start a conversation with your bot
2. Send any message to your bot
3. Visit this URL in your browser (replace YOUR_BOT_TOKEN):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. Look for the `"chat":{"id":...}` field in the response

#### Method 2: Use a bot like @userinfobot
1. Search for `@userinfobot` on Telegram
2. Start a conversation and send `/start`
3. Forward any message from your chat to @userinfobot
4. It will reply with your chat ID

### 3. Configure Environment Variables

Add these variables to your `.env` file:

```env
# Telegram Bot Configuration (Required for doctor notifications)
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 4. Doctor Setup (Individual Doctors)

Doctors need to set up their own Telegram notifications:

1. **Get Your Chat ID:**
   - Message your clinic bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your chat ID in the response

2. **Set Up Your Settings:**
   ```bash
   # As a doctor, set your Telegram settings
   POST /api/telegram/doctors/{your_doctor_id}/settings
   {
     "telegramChatId": "your_chat_id_here",
     "telegramUsername": "your_telegram_username",
     "enableNotifications": true
   }
   ```

3. **Test Your Notifications:**
   ```bash
   # Test if notifications work
   POST /api/telegram/doctors/{your_doctor_id}/test
   ```

### 5. API Endpoints for Configuration

Once your backend is running, you can use these endpoints to manage Telegram notifications:

#### Configure Telegram Bot
```bash
POST /api/telegram/config
{
  "botToken": "your_bot_token_here",
  "chatIds": ["your_chat_id_here"],
  "botUsername": "your_bot_username"
}
```

#### Test Connection
```bash
POST /api/telegram/test
```

#### Add Chat ID
```bash
POST /api/telegram/chat-ids
{
  "chatId": "additional_chat_id_here"
}
```

#### Remove Chat ID
```bash
DELETE /api/telegram/chat-ids/your_chat_id_here
```

#### Disable Notifications
```bash
PUT /api/telegram/disable
```

#### Doctor-Specific Endpoints

```bash
# Set doctor's Telegram settings (Admin or Doctor themselves)
POST /api/telegram/doctors/{doctorId}/settings
{
  "telegramChatId": "your_telegram_chat_id",
  "telegramUsername": "your_telegram_username",
  "enableNotifications": true
}

# Get doctors with Telegram notifications enabled
GET /api/telegram/doctors

# Test notification to a specific doctor
POST /api/telegram/doctors/{doctorId}/test

# Remove doctor's Telegram settings
DELETE /api/telegram/doctors/{doctorId}/settings
```

## Notification Format

When a new patient is registered and assigned to you, you'll receive a message like:

```
👨‍⚕️ New Patient Assigned to You

🆕 Patient Registered: John Doe
🆔 Patient ID: P12345-1234567890
📅 Registration Date: October 3, 2025 at 2:30 PM
📞 Contact: +1234567890
🎂 Age: 30
🚻 Gender: male

⚕️ Action Required: Please review this patient and schedule a consultation.
```

## Troubleshooting

### Common Issues:

1. **Bot token invalid**: Make sure you copied the token correctly from BotFather
2. **Chat ID not found**: Ensure the chat ID is correct (should be a negative number for groups, positive for users)
3. **Bot not responding**: Make sure:
   - The bot token is correct
   - The chat ID is correct
   - You've started a conversation with the bot
   - The bot hasn't been blocked

### Logs to Check:
- Server console for Telegram initialization messages
- Check if the bot shows "📱 Telegram bot initialized successfully"

## Security Notes

- Keep your bot token secure and never commit it to version control
- Only add trusted chat IDs to avoid spam
- Consider creating a dedicated group/channel for notifications
- The bot token is stored encrypted in the database

## Support

If you encounter any issues:
1. Check the server logs for detailed error messages
2. Verify your bot token and chat ID are correct
3. Test the connection using the `/api/telegram/test` endpoint
4. Ensure your bot is not blocked or restricted
