import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import attendanceService from './services/attendanceService';
import AttendanceOverlay from './components/AttendanceOverlay';
import PrimaryColorInitializer from './components/PrimaryColorInitializer';
import userService from './services/userService';
import {
  VeltNotificationsTool,
  VeltNotificationsPanel,
  useIdentify,
} from '@veltdev/react';
import './styles/ui-upgrades.css';

const App: React.FC = () => {
  const { user } = useAuth();
  const identifyResult = useIdentify();
  const identify = identifyResult?.identify;
  const location = useLocation();

  useEffect(() => {
    if (user && identify) {
      const initVelt = async () => {
        const userId = user.id || user._id;
        const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
        const email = user.email;
        const photoUrl = user.profileImage || user.photo || null;

        // 1. Identify locally logged-in user instantly
        try {
          identify({
            userId,
            name,
            email,
            photoUrl,
            contacts: []
          });
          console.log('✅ [Velt] Identified user instantly:', name);
        } catch (err) {
          console.error('❌ [Velt] Instant identify failed:', err);
        }

        // 2. Load contacts database in background
        try {
          const allClinicUsers = await userService.getAllUsers();
          if (allClinicUsers && allClinicUsers.length > 0) {
            identify({
              userId,
              name,
              email,
              photoUrl,
              contacts: allClinicUsers.map(u => ({
                userId: u.id || u._id,
                name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'User',
                email: u.email,
                photoUrl: u.profileImage || u.photo || null,
              }))
            });
            console.log('✅ [Velt] Contacts loaded and identified:', allClinicUsers.length);
          }
        } catch (error) {
          console.error('❌ [Velt] Failed to load contacts in background:', error);
        }
      };
      initVelt();
    }
  }, [user, identify]);

  const formatHeaderTitle = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Dashboard';
    const lastPart = parts[parts.length - 1];
    if (lastPart.match(/^[0-9a-fA-F]{24}$/)) {
      return parts[parts.length - 2] ? `${parts[parts.length - 2]} Detail` : 'Detail';
    }
    return lastPart.replace(/-/g, ' ');
  };

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
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Sticky Top Header with Notifications */}
          {user && (
            <header className="border-b border-border bg-card/65 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-40">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground capitalize tracking-wide">
                  {formatHeaderTitle(location.pathname)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-muted/40 hover:bg-muted/70 transition-colors rounded-xl px-3 py-1.5 border border-border/40">
                  <VeltNotificationsTool />
                  <VeltNotificationsPanel />
                </div>
              </div>
            </header>
          )}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
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