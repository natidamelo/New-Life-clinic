import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import NotificationSettings from '../components/settings/NotificationSettings';
import AdvancedSettings from '../components/settings/AdvancedSettings';
import GlobalDashboardSettings from '../components/settings/GlobalDashboardSettings';
import RoleSettings from '../components/settings/RoleSettings';
import ThemeSettings from './ThemeSettings';

// Define types for settings sections
type SettingsSection = 'overview' | 'appearance' | 'notifications' | 'security' | 'advanced' | 'profile' | 'global-dashboards' | 'role-settings';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { preferences, loading, updateProfile, changePassword, getDevices, revokeDevice } = useSettings();
  const navigate = useNavigate();
  
  // Current settings section
  const [activeSection, setActiveSection] = useState<SettingsSection>('overview');

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state for profile update
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: (user as any)?.phone || (user as any)?.contactNumber || '',
    specialization: user?.specialization || ''
  });

  // Form state for password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Device management
  const [devices, setDevices] = useState<any[]>([]);

  // Load devices when devices modal opens
  useEffect(() => {
    if (isDevicesModalOpen) {
      loadDevices();
    }
  }, [isDevicesModalOpen]);

  // Update profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: (user as any).contactNumber || '',
        specialization: user.specialization || ''
      });
    }
  }, [user]);


  const loadDevices = async () => {
    try {
      const devicesData = await getDevices();
      setDevices(devicesData);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  // Handle profile form changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value
    });
  };

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(profileForm);
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Handle password change submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
    }
  };

  // Handle device revocation
  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await revokeDevice(deviceId);
      await loadDevices(); // Reload devices
    } catch (error) {
      console.error('Error revoking device:', error);
    }
  };

  // Settings navigation items
  const settingsSections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'role-settings', label: 'My Dashboard Settings', icon: '🎯' },
    ...(user?.role === 'admin' ? [{ id: 'global-dashboards', label: 'Global Dashboards', icon: '🌐' }] : [])
  ];

  if (!user) {
    return (
      <div className="p-6 max-w-7xl mx-auto min-h-screen bg-muted/10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-muted-foreground mb-2">Settings</h1>
          <p className="text-destructive">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (user.role !== 'admin') {
    return (
      <div className="p-6 max-w-7xl mx-auto min-h-screen bg-muted/10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-muted-foreground mb-2">Access Denied</h1>
          <p className="text-destructive">You don't have permission to access settings. Only administrators can access this page.</p>
          <div className="mt-4">
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto min-h-screen bg-muted/10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-muted-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-muted/10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-muted-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <Card className="p-4">
            <nav className="space-y-2">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as SettingsSection)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted/10'
                  }`}
                >
                  <span className="text-lg">{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <Card className="p-6">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-muted-foreground">Settings Overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Account Information */}
                  <Card className="p-6 bg-primary-foreground shadow-lg border border-border/30">
                    <h3 className="text-xl font-semibold mb-4 text-muted-foreground">Account Information</h3>
                    <div className="space-y-4">
                      <div className="bg-muted/10 p-4 rounded-lg">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Name:</span> {user?.firstName || 'N/A'} {user?.lastName || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Role:</span> {user?.role || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Email:</span> {user?.email || 'Not provided'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">ID:</span> {user?.id || user?._id || 'Not provided'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => setActiveSection('profile')}
                      >
                        Manage Profile
                      </Button>
                    </div>
                  </Card>

                  {/* Current Settings Summary */}
                  <Card className="p-6 bg-primary-foreground shadow-lg border border-border/30">
                    <h3 className="text-xl font-semibold mb-4 text-muted-foreground">Current Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Theme</span>
                        <span className="text-sm font-medium capitalize">
                          {preferences?.appearance?.theme || 'light'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Notifications</span>
                        <span className="text-sm font-medium">
                          {preferences?.notifications?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Two-Factor Auth</span>
                        <span className="text-sm font-medium">
                          {preferences?.security?.twoFactorAuth?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Font Size</span>
                        <span className="text-sm font-medium capitalize">
                          {preferences?.appearance?.fontSize || 'medium'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="p-6 bg-primary-foreground shadow-lg border border-border/30">
                    <h3 className="text-xl font-semibold mb-4 text-muted-foreground">Quick Actions</h3>
                    <div className="space-y-3">
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => setActiveSection('security')}
                      >
                        Change Password
                      </Button>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => setIsDevicesModalOpen(true)}
                      >
                        Manage Devices
                      </Button>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => setActiveSection('appearance')}
                      >
                        Customize Appearance
                      </Button>
                    </div>
                  </Card>

                  {/* Security Status */}
                  <Card className="p-6 bg-primary-foreground shadow-lg border border-border/30">
                    <h3 className="text-xl font-semibold mb-4 text-muted-foreground">Security Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Password Strength</span>
                        <span className="text-sm font-medium text-primary">Strong</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Login Notifications</span>
                        <span className="text-sm font-medium">
                          {preferences?.security?.loginNotifications ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Session Timeout</span>
                        <span className="text-sm font-medium">
                          {Math.floor((preferences?.privacy?.sessionTimeout || 480) / 60)}h
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <ThemeSettings />
            )}

            {activeSection === 'notifications' && (
              <NotificationSettings onClose={() => setActiveSection('overview')} />
            )}

            {activeSection === 'advanced' && (
              <AdvancedSettings onClose={() => setActiveSection('overview')} />
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-muted-foreground">Security Settings</h2>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Password & Authentication</h3>
                  <div className="space-y-4">
                    <Button 
                      className="w-full" 
                      onClick={() => setIsPasswordModalOpen(true)}
                    >
                      Change Password
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="outline" 
                      onClick={() => setIs2FAModalOpen(true)}
                    >
                      Two-Factor Authentication
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Device Management</h3>
                  <div className="space-y-4">
                    <Button 
                      className="w-full" 
                      variant="outline" 
                      onClick={() => setIsDevicesModalOpen(true)}
                    >
                      Manage Devices
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {activeSection === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-muted-foreground">Profile Management</h2>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <Button 
                      className="w-full" 
                      onClick={() => setIsProfileModalOpen(true)}
                    >
                      Update Profile Information
                    </Button>
                  </div>
                </Card>
              </div>
            )}

        {activeSection === 'role-settings' && (
          <RoleSettings onClose={() => setActiveSection('overview')} />
        )}
        {activeSection === 'global-dashboards' && (
          <GlobalDashboardSettings onClose={() => setActiveSection('overview')} />
        )}
          </Card>
        </div>
      </div>

      {/* Profile Update Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Update Profile</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileForm.firstName}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={profileForm.lastName}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={profileForm.specialization}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                    placeholder="e.g., Internal Medicine, Cardiology"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Change Password</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 block w-full border border-border/40 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Change Password</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Two-Factor Authentication</h3>
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                Two-factor authentication adds an additional layer of security to your account by requiring more than just a password to sign in.
              </p>
              <div className="bg-accent/10 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-accent-foreground">
                  This feature is currently in development and will be available soon.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIs2FAModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Devices Modal */}
      {isDevicesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Manage Devices</h3>
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                View and manage devices that are currently signed in to your account.
              </p>
              <div className="space-y-4">
                {devices.length > 0 ? (
                  devices.map((device) => (
                    <div key={device.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {device.browser} • {device.os} • {device.location}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last active: {new Date(device.lastActive).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {device.isCurrent ? (
                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                              Current
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeDevice(device.id)}
                              className="text-destructive border-destructive hover:bg-destructive/10"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-accent/10 border-l-4 border-yellow-400 p-4">
                    <p className="text-accent-foreground">
                      No devices found. Device management functionality is currently in development.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDevicesModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 