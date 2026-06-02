module.exports = {
  apps: [
    {
      name: 'clinic-backend',
      script: 'server.js',
      cwd: 'C:\\Users\\HP\\OneDrive\\Desktop\\clinic new life\\backend',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      log_file: 'C:\\NewLifeClinic\\backend.log',
      time: true,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'go2rtc-tunnel',
      script: 'start-go2rtc-tunnel.js',
      cwd: 'C:\\Users\\HP\\OneDrive\\Desktop\\clinic new life',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      log_file: 'C:\\NewLifeClinic\\go2rtc.log',
      time: true
    }
  ]
};
