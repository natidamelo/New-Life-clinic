import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Vercel sets VERCEL=1 during build. Heavy manualChunks can OOM on CI. */
const isVercel = process.env.VERCEL === '1';

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
    // Babel + emotion on full app is heavy; skip on Vercel CI to avoid OOM / fast-fail (esbuild handles JSX).
    react(
      isVercel
        ? { jsxImportSource: '@emotion/react' }
        : {
            jsxImportSource: '@emotion/react',
            babel: {
              plugins: ['@emotion/babel-plugin'],
            },
          }
    ),
    disableHostCheck(), // Add custom plugin to disable host checking
  ],
  build: {
    target: 'es2018',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      treeshake: true,
      output: {
        // Never emit .map files (saves RAM/disk on Vercel; maps were still appearing without this)
        sourcemap: false,
        ...(isVercel
          ? {}
          : {
              manualChunks: (id: string) => {
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
                  if (id.includes('html2pdf') || id.includes('jspdf')) {
                    return 'pdf-vendor';
                  }
                  if (id.includes('xlsx') || id.includes('file-saver')) {
                    return 'export-vendor';
                  }
                  return 'vendor';
                }

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

                if (id.includes('/services/')) {
                  if (id.includes('patientService')) {
                    return 'patient-service';
                  }
                  if (id.includes('labService')) {
                    return 'lab-service';
                  }
                  return 'services';
                }

                if (id.includes('/utils/')) {
                  return 'utils';
                }

                if (id.includes('LeaveManagement')) {
                  return 'leave-management';
                }
              }
            })
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    reportCompressedSize: false
  },
  resolve: {
    alias: {
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled'
    ],
  },
  esbuild: {
    target: 'es2018',
    logLevel: 'error',
    drop: isVercel ? [] : ['console', 'debugger'],
    legalComments: 'none',
    sourcemap: false,
  },
  server: {
    port: 5175,
    strictPort: true,
    host: '0.0.0.0', // Explicitly bind to all interfaces - allows network access
    allowedHosts: true,
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