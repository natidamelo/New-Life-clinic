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
      name: 'go2rtc',
      script: 'go2rtc.exe',
      cwd: 'C:\\Users\\HP\\OneDrive\\Desktop\\clinic new life',
      args: '-config go2rtc.yaml',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      log_file: 'C:\\NewLifeClinic\\go2rtc.log',
      time: true
    }
  ]
};
