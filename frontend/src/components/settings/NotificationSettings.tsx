import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';

interface NotificationSettingsProps {
  onClose?: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const { preferences, toggleSetting, updatePreferenceSection } = useSettings();
  const [isTesting, setIsTesting] = useState(false);

  const handleToggle = async (path: string, currentValue: boolean) => {
    try {
      await toggleSetting(path, !currentValue);
    } catch (error) {
      console.error('Error toggling notification setting:', error);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('New Life Clinic', {
            body: 'This is a test notification from your clinic system.',
            icon: '/favicon.ico'
          });
          toast.success('Test notification sent!');
        } else {
          toast.error('Notification permission denied');
        }
      } else {
        toast.error('Notifications not supported in this browser');
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const handleBulkUpdate = async (section: string, updates: Record<string, boolean>) => {
    try {
      await updatePreferenceSection('notifications', {
        [section]: {
          ...preferences?.notifications?.[section],
          ...updates
        }
      });
      toast.success(`${section} notifications updated`);
    } catch (error) {
      console.error(`Error updating ${section} notifications:`, error);
      toast.error(`Failed to update ${section} notifications`);
    }
  };

  if (!preferences) return null;

  const notificationSettings = preferences.notifications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-muted-foreground">Notification Settings</h2>
        {onClose && (
          <Button onClick={onClose}>
            Save Changes
          </Button>
        )}
      </div>

      {/* Master Notification Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Enable Notifications</h3>
            <p className="text-sm text-muted-foreground">Master switch for all notifications</p>
          </div>
          <div 
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
              notificationSettings?.enabled ? 'bg-primary' : 'bg-muted/40'
            }`}
            onClick={() => handleToggle('notifications.enabled', notificationSettings?.enabled || false)}
          >
            <div 
              className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                notificationSettings?.enabled ? 'translate-x-6' : ''
              }`} 
            />
          </div>
        </div>
      </Card>

      {/* Email Notifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Email Notifications</h3>
          <div 
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
              notificationSettings?.email?.enabled ? 'bg-primary' : 'bg-muted/40'
            } ${!notificationSettings?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => notificationSettings?.enabled && handleToggle('notifications.email.enabled', notificationSettings?.email?.enabled || false)}
          >
            <div 
              className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                notificationSettings?.email?.enabled ? 'translate-x-6' : ''
              }`} 
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appointment Reminders</p>
              <p className="text-sm text-muted-foreground">Get notified about upcoming appointments</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.email?.appointmentReminders ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.email?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.email?.enabled) {
                  handleToggle('notifications.email.appointmentReminders', notificationSettings?.email?.appointmentReminders || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.email?.appointmentReminders ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Prescription Alerts</p>
              <p className="text-sm text-muted-foreground">Notifications about medication changes</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.email?.prescriptionAlerts ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.email?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.email?.enabled) {
                  handleToggle('notifications.email.prescriptionAlerts', notificationSettings?.email?.prescriptionAlerts || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.email?.prescriptionAlerts ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Lab Results</p>
              <p className="text-sm text-muted-foreground">When lab test results are ready</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.email?.labResults ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.email?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.email?.enabled) {
                  handleToggle('notifications.email.labResults', notificationSettings?.email?.labResults || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.email?.labResults ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">System Updates</p>
              <p className="text-sm text-muted-foreground">Important system announcements</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.email?.systemUpdates ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.email?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.email?.enabled) {
                  handleToggle('notifications.email.systemUpdates', notificationSettings?.email?.systemUpdates || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.email?.systemUpdates ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>
        </div>
      </Card>

      {/* SMS Notifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">SMS Notifications</h3>
          <div 
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
              notificationSettings?.sms?.enabled ? 'bg-primary' : 'bg-muted/40'
            } ${!notificationSettings?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => notificationSettings?.enabled && handleToggle('notifications.sms.enabled', notificationSettings?.sms?.enabled || false)}
          >
            <div 
              className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                notificationSettings?.sms?.enabled ? 'translate-x-6' : ''
              }`} 
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appointment Reminders</p>
              <p className="text-sm text-muted-foreground">Text reminders for appointments</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.sms?.appointmentReminders ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.sms?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.sms?.enabled) {
                  handleToggle('notifications.sms.appointmentReminders', notificationSettings?.sms?.appointmentReminders || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.sms?.appointmentReminders ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Urgent Alerts</p>
              <p className="text-sm text-muted-foreground">Critical notifications only</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.sms?.urgentAlerts ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.sms?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.sms?.enabled) {
                  handleToggle('notifications.sms.urgentAlerts', notificationSettings?.sms?.urgentAlerts || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.sms?.urgentAlerts ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Push Notifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Push Notifications</h3>
          <div 
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
              notificationSettings?.push?.enabled ? 'bg-primary' : 'bg-muted/40'
            } ${!notificationSettings?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => notificationSettings?.enabled && handleToggle('notifications.push.enabled', notificationSettings?.push?.enabled || false)}
          >
            <div 
              className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                notificationSettings?.push?.enabled ? 'translate-x-6' : ''
              }`} 
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appointment Reminders</p>
              <p className="text-sm text-muted-foreground">Browser notifications for appointments</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.push?.appointmentReminders ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.push?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.push?.enabled) {
                  handleToggle('notifications.push.appointmentReminders', notificationSettings?.push?.appointmentReminders || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.push?.appointmentReminders ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Medication Alerts</p>
              <p className="text-sm text-muted-foreground">Reminders for medication administration</p>
            </div>
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                notificationSettings?.push?.medicationAlerts ? 'bg-primary' : 'bg-muted/40'
              } ${!notificationSettings?.enabled || !notificationSettings?.push?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (notificationSettings?.enabled && notificationSettings?.push?.enabled) {
                  handleToggle('notifications.push.medicationAlerts', notificationSettings?.push?.medicationAlerts || false);
                }
              }}
            >
              <div 
                className={`bg-primary-foreground w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  notificationSettings?.push?.medicationAlerts ? 'translate-x-5' : ''
                }`} 
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleTestNotification}
            disabled={isTesting || !notificationSettings?.push?.enabled}
          >
            {isTesting ? 'Testing...' : 'Test Notification'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Send a test notification to verify your browser settings
          </p>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline"
            onClick={() => handleBulkUpdate('email', {
              appointmentReminders: true,
              prescriptionAlerts: true,
              labResults: true,
              systemUpdates: true
            })}
          >
            Enable All Email
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleBulkUpdate('push', {
              appointmentReminders: true,
              medicationAlerts: true
            })}
          >
            Enable All Push
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              updatePreferenceSection('notifications', {
                email: { enabled: false, appointmentReminders: false, prescriptionAlerts: false, labResults: false, systemUpdates: false },
                sms: { enabled: false, appointmentReminders: false, urgentAlerts: false },
                push: { enabled: false, appointmentReminders: false, medicationAlerts: false }
              });
            }}
          >
            Disable All
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotificationSettings;
