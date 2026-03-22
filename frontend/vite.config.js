import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

// Attempt to kill any process using port 5175
try {
  execSync('npx kill-port 5175', { stdio: 'ignore' });
} catch (error) {
  console.log('Could not kill port 5175, continuing anyway...');
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    host: '0.0.0.0', // Allow network access for phone scanning
    allowedHosts: ['localhost', '10.94.141.157'],
    hmr: {
      port: 5175, // Use the same port for HMR
      host: 'localhost',
      protocol: 'ws',
      clientPort: 5175, // Ensure client connects to the same port
      overlay: true
    },
    proxy: {
              // Proxy API requests to backend
        '/api': {
          target: 'http://localhost:5002',
          changeOrigin: true,
          secure: false,
        },
              // Proxy WebSocket requests to backend
        '/ws': {
          target: 'ws://localhost:5002',
          ws: true,
        }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}); 