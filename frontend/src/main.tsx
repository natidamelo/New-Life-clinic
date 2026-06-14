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



// Make query client available globally for cache invalidation
declare global {
  interface Window {
    queryClient: QueryClient;
  }
}

window.queryClient = queryClient;

// Clear old Velt/Firebase IndexedDB cache databases to resolve any stuck 413 sync queues
if (typeof window !== 'undefined') {
  const CLEANUP_KEY = 'velt_indexeddb_cleanup_v5';
  if (!localStorage.getItem(CLEANUP_KEY)) {
    console.log('🧹 [Velt Cleanup] Running thorough cleanup of IndexedDB, LocalStorage, and SessionStorage...');
    
    // Clear LocalStorage and SessionStorage keys containing 'velt'
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.toLowerCase().includes('velt')) {
          console.log(`🧹 [Velt Cleanup] Removing localStorage key: ${key}`);
          localStorage.removeItem(key);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.toLowerCase().includes('velt')) {
          console.log(`🧹 [Velt Cleanup] Removing sessionStorage key: ${key}`);
          sessionStorage.removeItem(key);
        }
      }
    } catch (err) {
      console.warn('⚠️ [Velt Cleanup] Failed to clear storage keys:', err);
    }

    // Clear common IndexedDB databases
    const commonDbs = ['velt-db', 'velt', 'localforage', 'firestore', 'firebase'];
    commonDbs.forEach(name => {
      try {
        console.log(`🧹 [Velt Cleanup] Deleting common IndexedDB database: ${name}`);
        window.indexedDB.deleteDatabase(name);
      } catch (err) {
        console.warn(`⚠️ [Velt Cleanup] Failed to delete database ${name}:`, err);
      }
    });

    if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
      window.indexedDB.databases().then((dbs) => {
        dbs.forEach((db) => {
          if (db.name && (db.name.toLowerCase().includes('velt') || db.name.toLowerCase().includes('firebase'))) {
            console.log(`🧹 [Velt Cleanup] Deleting detected IndexedDB database: ${db.name}`);
            window.indexedDB.deleteDatabase(db.name);
          }
        });
        localStorage.setItem(CLEANUP_KEY, 'true');
      }).catch(err => {
        console.warn('⚠️ [Velt Cleanup] Failed to list IndexedDB databases:', err);
        localStorage.setItem(CLEANUP_KEY, 'true');
      });
    } else {
      localStorage.setItem(CLEANUP_KEY, 'true');
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
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
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)