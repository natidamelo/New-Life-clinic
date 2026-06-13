import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ClinicProvider } from './context/ClinicContext'
import { ThemeProvider as CustomThemeProvider } from './context/EnhancedThemeContext'
import { CardTypeProvider } from './context/CardTypeContextNew'
import { SettingsProvider } from './context/SettingsContext'
import { GlobalSettingsProvider } from './context/GlobalSettingsContext'
import { ToastProvider } from './components/ui/toast'
import { Toaster } from './components/ui/toaster'
import ErrorBoundary from './components/common/ErrorBoundary'
import router from './router'
import './index.css'
import './styles/globals.css'
import {
  VeltProvider,
  VeltComments,
  VeltCursor,
  VeltHuddle,
} from '@veltdev/react';
// Debug utilities loaded on-demand only in development (not bundled in production)
if (import.meta.env.DEV) {
  import('./utils/serviceExposure');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

import { VeltDocIdProvider } from './context/VeltContext';

// Make query client available globally for cache invalidation
declare global {
  interface Window {
    queryClient: QueryClient;
  }
}

window.queryClient = queryClient;
const veltApiKey = import.meta.env.VITE_VELT_API_KEY?.trim();
console.log('🔍 [Velt Info] VITE_VELT_API_KEY presence:', !!veltApiKey);
console.log('🔍 [Velt Info] VITE_VELT_API_KEY length:', veltApiKey?.length || 0);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <VeltProvider apiKey={veltApiKey}>
    <VeltComments />
    <VeltCursor />
    <VeltHuddle />
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <VeltDocIdProvider>
            <ClinicProvider>
              <SettingsProvider>
                <GlobalSettingsProvider>
                  <CustomThemeProvider>
                    <CardTypeProvider>
                      <ToastProvider>
                        <RouterProvider router={router} />
                        <Toaster />
                      </ToastProvider>
                    </CardTypeProvider>
                  </CustomThemeProvider>
                </GlobalSettingsProvider>
              </SettingsProvider>
            </ClinicProvider>
          </VeltDocIdProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </VeltProvider>
)
 