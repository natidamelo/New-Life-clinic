import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to disable host checking (allows access via hostname)
// This bypasses Vite's security check that blocks unknown hostnames
const disableHostCheck = () => {
  return {
    name: 'disable-host-check',
    configureServer(server) {
      // Intercept requests before Vite's host check
      server.middlewares.use('/' as any, (req: any, res: any, next: any) => {
        // Always allow the request - bypass host checking
        next();
      });
    }
  };
};

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
    disableHostCheck(), // Add custom plugin to disable host checking
  ],
  build: {
    target: 'es2018',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-vendor';
            }
            if (id.includes('chart.js') || id.includes('recharts')) {
              return 'charts-vendor';
            }
            if (id.includes('socket.io') || id.includes('jwt-decode')) {
              return 'utils-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Other large libraries
            if (id.includes('html2pdf') || id.includes('jspdf')) {
              return 'pdf-vendor';
            }
            if (id.includes('xlsx') || id.includes('file-saver')) {
              return 'export-vendor';
            }
            // Group smaller node_modules together
            return 'vendor';
          }

          // Application chunks based on feature
          if (id.includes('/pages/') || id.includes('/components/')) {
            if (id.includes('doctor') || id.includes('Doctor')) {
              return 'doctor';
            }
            if (id.includes('nurse') || id.includes('Nurse')) {
              return 'nurse';
            }
            if (id.includes('reception') || id.includes('Reception')) {
              return 'reception';
            }
            if (id.includes('lab') || id.includes('Lab')) {
              return 'lab';
            }
            if (id.includes('billing') || id.includes('Billing')) {
              return 'billing';
            }
            if (id.includes('inventory') || id.includes('Inventory')) {
              return 'inventory';
            }
          }

          // Services chunk - separate commonly used services
          if (id.includes('/services/')) {
            if (id.includes('patientService')) {
              return 'patient-service';
            }
            if (id.includes('labService')) {
              return 'lab-service';
            }
            return 'services';
          }

          // Utils chunk
          if (id.includes('/utils/')) {
            return 'utils';
          }

          // Special handling for components that are both dynamically and statically imported
          if (id.includes('LeaveManagement')) {
            return 'leave-management';
          }
        }
      }
    },
    chunkSizeWarningLimit: 10000,
    cssCodeSplit: true,
    reportCompressedSize: false
  },
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
  esbuild: {
    target: 'es2018',
    format: 'esm',
    logLevel: 'error',
    drop: ['console', 'debugger'],
    minify: true,
    legalComments: 'none',
    sourcemap: false,
    treeShaking: true,
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  },
  server: {
    port: 5175,
    strictPort: true,
    host: '0.0.0.0', // Explicitly bind to all interfaces - allows network access
    allowedHosts: 'all', // Allow any host to access the dev server (needed for cross-device access)
    hmr: {
      protocol: 'ws',
      host: 'localhost', // HMR uses localhost for WebSocket (works even when accessing via hostname)
      port: 5175
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:5002',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        // Use localhost for proxy since backend runs on same machine
        // When accessing via hostname, the proxy will still work
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        // Configure proxy with better error handling
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log('⚠️ Proxy error:', err.message);
            // Don't crash on proxy errors, just log them
            if (res && !res.headersSent) {
              res.writeHead(502, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({
                error: 'Backend connection failed',
                message: 'Unable to connect to backend server. Please ensure backend is running on port 5002.'
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Only log in development to reduce noise
            if (process.env.NODE_ENV === 'development') {
              console.log('→ Proxy Request:', req.method, req.url);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Only log errors in development
            if (process.env.NODE_ENV === 'development' && proxyRes.statusCode >= 400) {
              console.log('← Proxy Response:', proxyRes.statusCode, req.url);
            }
          });
        }
      }
    }
  }
}); 