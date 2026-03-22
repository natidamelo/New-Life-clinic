import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

// Kill processes on ports 5173, 5174, 5175 before starting
const findAndKillProcess = (port) => {
  try {
    // For Windows
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/\s+(\d+)$/);
          if (match && match[1]) {
            const pid = match[1];
            console.log(`Killing process ${pid} on port ${port}`);
            exec(`taskkill /F /PID ${pid}`);
          }
        }
      }
    });
  } catch (err) {
    console.log(`Failed to kill process on port ${port}:`, err);
  }
};

// Kill any existing processes
findAndKillProcess(5173);
findAndKillProcess(5174);
findAndKillProcess(5175);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
    // Custom plugin to force the resolution of @emotion/styled and MUI packages
    {
      name: 'resolve-mui-dependencies',
      resolveId(source) {
        // Map all known problematic imports to our custom resolver
        if (source === '@emotion/styled') {
          return { id: path.resolve(__dirname, './src/mui-resolver.js'), external: false };
        }
        if (source === '@emotion/react') {
          return { id: path.resolve(__dirname, './src/mui-resolver.js'), external: false };
        }
        if (source === '@mui/styled-engine') {
          return { id: path.resolve(__dirname, './src/mui-resolver.js'), external: false };
        }
        if (source.startsWith('@mui/x-date-pickers')) {
          // For imports like @mui/x-date-pickers/something
          return { id: path.resolve(__dirname, './src/mui-resolver.js'), external: false };
        }
        return null;
      }
    }
  ],
  server: {
    port: 5175,
    host: true,
    strictPort: true, // Will fail if port is in use
    watch: {
      usePolling: true
    },
    hmr: {
      overlay: false
    },
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      },
      '/patients': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/appointments': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/labTests': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/vitals': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/prescriptions': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:5002',
        ws: true,
        changeOrigin: true,
      }
    },
    force: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@emotion/styled': path.resolve(__dirname, './src/mui-resolver.js'),
      '@emotion/react': path.resolve(__dirname, './src/mui-resolver.js'),
      '@mui/styled-engine': path.resolve(__dirname, './src/mui-resolver.js'),
      '@mui/x-date-pickers': path.resolve(__dirname, './src/mui-resolver.js'),
      '@mui/x-date-pickers/DatePicker': path.resolve(__dirname, './src/mui-resolver.js'),
      '@mui/x-date-pickers/TimePicker': path.resolve(__dirname, './src/mui-resolver.js'),
      '@mui/x-date-pickers/DateTimePicker': path.resolve(__dirname, './src/mui-resolver.js'),
      '@mui/x-date-pickers/LocalizationProvider': path.resolve(__dirname, './src/mui-resolver.js'),
    },
  },
  optimizeDeps: {
    include: [
      '@emotion/styled',
      '@emotion/react',
      '@mui/material',
      '@mui/styled-engine'
    ],
    esbuildOptions: {
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      external: ['@emotion/styled', '@emotion/react']
    }
  }
}); 