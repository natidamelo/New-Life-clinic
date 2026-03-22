import React, { useState, useEffect } from 'react';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle, Shield, Users, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import systemSettingsService from '../../services/systemSettingsService';

interface AttendanceOverlayControlProps { className?: string; }

const AttendanceOverlayControl: React.FC<AttendanceOverlayControlProps> = ({ className }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoClockOut, setAutoClockOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const [overlaySetting, autoClockOutSetting] = await Promise.all([
        systemSettingsService.getSetting('attendance_overlay_enabled'),
        systemSettingsService.getSetting('auto_clockout_on_logout'),
      ]);
      if (overlaySetting) setIsEnabled(!!overlaySetting.value);
      if (autoClockOutSetting) setAutoClockOut(!!autoClockOutSetting.value);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOverlaySetting = async (newValue: boolean) => {
    setIsSaving(true);
    try {
      await systemSettingsService.updateAttendanceOverlaySetting(newValue);
      setIsEnabled(newValue);
      toast.success(
        newValue
          ? 'Attendance overlay enabled - staff must check in to access the system'
          : 'Attendance overlay disabled - staff can access the system without checking in'
      );
    } catch (error) {
      console.error('Failed to update overlay setting:', error);
      toast.error('Failed to update overlay setting');
      setIsEnabled(!newValue);
    } finally {
      setIsSaving(false);
    }
  };

  const updateAutoClockOutSetting = async (newValue: boolean) => {
    setIsSaving(true);
    try {
      await systemSettingsService.updateSetting('auto_clockout_on_logout', {
        value: newValue,
        description: 'Automatically clock out staff when they log out of the system',
        category: 'attendance',
      });
      setAutoClockOut(newValue);
      toast.success(
        newValue
          ? 'Auto clock-out enabled - staff will be automatically clocked out when they log out'
          : 'Auto clock-out disabled - staff will remain clocked in when they log out'
      );
    } catch (error) {
      console.error('Failed to update auto clock-out setting:', error);
      toast.error('Failed to update auto clock-out setting');
      setAutoClockOut(!newValue);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Attendance Overlay Control</span>
          </CardTitle>
          <CardDescription>
            Control whether staff must check in before accessing the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted/30 rounded w-3/4 mb-4"></div>
            <div className="h-6 bg-muted/30 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-teal-600" />
          <span>Attendance Overlay Control</span>
        </CardTitle>
        <CardDescription>
          Control whether staff must check in before accessing the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Require Check-in</span>
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, staff must check in before they can use the system
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={updateOverlaySetting}
            disabled={isSaving}
            className="data-[state=checked]:bg-teal-600"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Auto Clock-out on Logout</span>
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, staff will be automatically clocked out when they log out.
            </p>
          </div>
          <Switch
            checked={autoClockOut}
            onCheckedChange={updateAutoClockOutSetting}
            disabled={isSaving}
            className="data-[state=checked]:bg-teal-600"
          />
        </div>

        <div className={`p-4 rounded-lg border ${isEnabled ? 'bg-primary/10 border-primary/30' : 'bg-muted/10 border-border/30'}`}>
          <div className="flex items-start space-x-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <h4 className={`font-medium ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
                {isEnabled ? 'Overlay is Active' : 'Overlay is Inactive'}
              </h4>
              <p className={`text-sm mt-1 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
                {isEnabled
                  ? "Staff members will see a check-in overlay if they haven't checked in yet. Admin users are exempt from this requirement."
                  : 'Staff can access the system without checking in. Attendance tracking still works but is not enforced.'}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${autoClockOut ? 'bg-accent/10 border-orange-200' : 'bg-muted/10 border-border/30'}`}>
          <div className="flex items-start space-x-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 ${autoClockOut ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <h4 className={`font-medium ${autoClockOut ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                {autoClockOut ? 'Auto Clock-out is Active' : 'Auto Clock-out is Inactive'}
              </h4>
              <p className={`text-sm mt-1 ${autoClockOut ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                {autoClockOut
                  ? 'Staff will be automatically clocked out when they log out of the system. This ensures accurate work hour tracking.'
                  : 'Staff will remain clocked in when they log out. They must manually clock out when they finish work.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Changes take effect immediately'}</span>
        </div>

        <div className="pt-4 border-t">
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={isSaving} className="w-full">
            Refresh Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceOverlayControl;