import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import attendanceService from './services/attendanceService';
import AttendanceOverlay from './components/AttendanceOverlay';
import PrimaryColorInitializer from './components/PrimaryColorInitializer';
import './styles/ui-upgrades.css';

const App: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Delay starting attendance tracking to reduce initial load
      const timer = setTimeout(() => {
        attendanceService.startActivityTracking();
      }, 5000); // Increased to 5 second delay for better performance
      
      return () => {
        clearTimeout(timer);
        attendanceService.stopActivityTracking();
      };
    }
  }, [user]);

  // Handle chunk loading errors (e.g. "Failed to fetch dynamically imported module")
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const isChunkError = /dynamically imported module|Loading chunk|chunk load/i.test(event.message || '');
      if (isChunkError) {
        console.warn('Chunk loading error detected. Refreshing page in 2s...', event.message);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    };

    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  return (
    <AttendanceOverlay>
      <PrimaryColorInitializer />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 sm:p-6 md:p-8">
            <Outlet />
          </div>
        </main>
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 6000,
            style: {
              zIndex: 9999,
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              style: {
                background: '#10B981',
                color: 'white',
              },
            },
            error: {
              style: {
                background: '#EF4444',
                color: 'white',
                minWidth: '300px',
              },
            },
          }}
          containerStyle={{
            top: 20,
            right: 20,
          }}
          containerClassName="dark:bg-muted dark:text-primary-foreground"
        />
      </div>
      {/* <SimpleDebugOverlay /> */}
    </AttendanceOverlay>
  );
};

export default App;