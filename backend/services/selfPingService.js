const https = require('https');
const http = require('http');
require('dotenv').config();

let pingInterval = null;

/**
 * Self-pinging service to keep Render free tier server awake.
 * Render free tier spins down the server after 15 minutes of inactivity.
 * Pinging the server every 13 minutes keeps it active.
 */
const selfPingService = {
  start: () => {
    // Only run ping in production or when explicitly enabled
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const hasPingUrl = !!(process.env.SELF_PING_URL || process.env.RENDER_EXTERNAL_URL);
    
    // Default to the known Render URL, but allow overrides
    let pingUrl = process.env.SELF_PING_URL || process.env.RENDER_EXTERNAL_URL || 'https://new-life-clinic.onrender.com/ping';
    
    // Ensure the URL ends with /ping or has the correct path
    if (pingUrl && !pingUrl.endsWith('/ping') && !pingUrl.endsWith('/ping/')) {
      // Remove trailing slash if present
      const baseUrl = pingUrl.endsWith('/') ? pingUrl.slice(0, -1) : pingUrl;
      pingUrl = `${baseUrl}/ping`;
    }

    console.log(`🛡️ [SelfPingService] Initializing self-ping service...`);
    console.log(`🛡️ [SelfPingService] Target URL: ${pingUrl}`);
    console.log(`🛡️ [SelfPingService] Environment conditions: Production=${isProduction}, Has configured URL=${hasPingUrl}`);

    // If we're not in production and don't have a configured ping URL, skip to prevent noise in dev environment
    if (!isProduction && !process.env.SELF_PING_URL) {
      console.log(`ℹ️ [SelfPingService] Development environment detected without SELF_PING_URL. Skipping auto-ping.`);
      return;
    }

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    // Ping immediately on start
    selfPingService.ping(pingUrl);

    // Set interval to ping every 13 minutes (780,000 ms)
    const intervalMs = 13 * 60 * 1000;
    pingInterval = setInterval(() => {
      selfPingService.ping(pingUrl);
    }, intervalMs);

    console.log(`✅ [SelfPingService] Background job scheduled successfully (every 13 minutes)`);
  },

  stop: () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
      console.log(`🛑 [SelfPingService] Service stopped`);
    }
  },

  ping: (url) => {
    try {
      console.log(`📡 [SelfPingService] Sending keep-alive request to: ${url}`);
      
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, { timeout: 20000 }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ [SelfPingService] Keep-alive success! Status: ${res.statusCode}`);
          } else {
            console.warn(`⚠️ [SelfPingService] Keep-alive responded with status: ${res.statusCode}`);
          }
        });
      });

      req.on('timeout', () => {
        console.warn(`⚠️ [SelfPingService] Keep-alive request timed out (20s)`);
        req.destroy();
      });

      req.on('error', (err) => {
        console.error(`❌ [SelfPingService] Keep-alive connection error:`, err.message);
      });

    } catch (error) {
      console.error(`❌ [SelfPingService] Failed to execute ping:`, error.message);
    }
  }
};

module.exports = selfPingService;
