module.exports = {
  apps: [
    {
      name: 'clinic-backend',
      script: 'backend/server.js',
      instances: 1, // Runs a single instance. (Cluster mode is not recommended unless Redis is set up for Socket.io)
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Restart the process automatically if it leaks memory beyond 1GB
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: 5002
      }
    }
  ]
};
