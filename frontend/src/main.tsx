import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
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
import { initializeAuthFromStorage } from './utils/auth'
// Debug utilities loaded on-demand only in development (not bundled in production)
if (import.meta.env.DEV) {
  import('./utils/serviceExposure');
}

// Initialize auth token from localStorage on app start
initializeAuthFromStorage();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Make query client available globally for cache invalidation
declare global {
  interface Window {
    queryClient: QueryClient;
  }
}

window.queryClient = queryClient;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
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
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
) 