import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Development configuration
const isNetworkAccess = process.env.NETWORK_ACCESS === 'true';
const networkHost = process.env.NETWORK_HOST || '192.168.118.157';

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@mui/icons-material': path.resolve(__dirname, 'node_modules/@mui/icons-material/esm'),
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  optimizeDeps: {
    include: [
      '@mui/icons-material',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled'
    ],
    esbuildOptions: {
      mainFields: ['module', 'main', 'browser'],
      resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx', '.json']
    }
  },
  server: {
    port: 5175,
    strictPort: true,
    host: isNetworkAccess ? networkHost : 'localhost',
    hmr: {
      host: isNetworkAccess ? networkHost : 'localhost'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
});
