# Global Dashboard Settings System

This guide explains how to use the new global dashboard settings system that allows administrators to apply settings across all dashboards (Lab, Imaging, Reception, Nurse) in the New Life Clinic application.

## Overview

The global settings system provides a centralized way to manage appearance, notifications, and dashboard-specific settings that can be applied to multiple dashboards simultaneously. This ensures consistency across the application and simplifies administration.

## Features

### 🎨 Appearance Settings
- **Theme**: Light, Dark, or Auto (follows system preference)
- **Colors**: Primary and secondary color customization
- **Font Size**: Small, Medium, or Large
- **Layout**: Compact mode and sidebar collapsed state

### 🔔 Notification Settings
- **Global Notifications**: Enable/disable all notifications
- **Sound**: Audio notification preferences
- **Desktop**: Browser desktop notifications
- **Email**: Email notification settings
- **SMS**: SMS notification preferences

### ⚙️ Dashboard Settings
- **Refresh Interval**: Auto-refresh timing for all dashboards
- **Welcome Messages**: Show/hide welcome messages
- **Quick Actions**: Enable/disable quick action buttons
- **Dashboard-Specific**: Custom settings for each dashboard type

## How to Use

### For Administrators

1. **Access Global Settings**
   - Navigate to Settings → Global Dashboards (admin only)
   - This section is only visible to users with admin role

2. **Select Target Dashboards**
   - Choose which dashboards to apply settings to:
     - 🧪 Laboratory Dashboard
     - 📷 Imaging Dashboard  
     - 🏥 Reception Dashboard
     - 👩‍⚕️ Nurse Dashboard

3. **Configure Settings**
   - **Appearance**: Customize theme, colors, font size, and layout
   - **Notifications**: Set notification preferences
   - **Dashboard**: Configure refresh intervals and features

4. **Apply Settings**
   - Click "Apply to All Dashboards" buttons for each section
   - Settings are applied immediately to selected dashboards

### For Developers

#### Using Global Settings in Dashboard Components

```typescript
import { useGlobalDashboardSettings, useDashboardRefreshInterval } from '../hooks/useGlobalDashboardSettings';

const MyDashboard: React.FC = () => {
  // Get global settings for this dashboard type
  const { settings, loading, error } = useGlobalDashboardSettings('lab');
  
  // Get specific refresh interval
  const refreshInterval = useDashboardRefreshInterval('lab');
  
  // Use settings in your component
  useEffect(() => {
    if (settings?.dashboard?.autoRefresh) {
      const interval = setInterval(() => {
        // Refresh data
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, settings]);
  
  return (
    <div className={settings?.appearance?.compactMode ? 'compact' : ''}>
      {/* Your dashboard content */}
    </div>
  );
};
```

#### Available Hooks

1. **`useGlobalDashboardSettings(dashboardType)`**
   - Returns complete settings object for the dashboard
   - Includes appearance, notifications, and dashboard settings

2. **`useDashboardRefreshInterval(dashboardType)`**
   - Returns the configured refresh interval in milliseconds
   - Defaults to 30 seconds if not configured

3. **`useDashboardNotifications(dashboardType)`**
   - Returns notification settings object
   - Includes enabled state and notification preferences

4. **`useDashboardSpecificSettings(dashboardType)`**
   - Returns dashboard-specific settings only
   - Useful for dashboard-unique configurations

## API Endpoints

### Backend Routes

```
GET    /api/global-settings                    # Get current global settings
PUT    /api/global-settings                    # Update global settings
POST   /api/global-settings/apply-to-dashboards # Apply settings to specific dashboards
GET    /api/global-settings/dashboard/:type    # Get settings for specific dashboard
POST   /api/global-settings/reset              # Reset to defaults
GET    /api/global-settings/history            # Get settings history
GET    /api/global-settings/export             # Export settings
POST   /api/global-settings/import             # Import settings
```

### Example API Usage

```javascript
// Apply appearance settings to all dashboards
const response = await fetch('/api/global-settings/apply-to-dashboards', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    dashboardTypes: ['lab', 'imaging', 'reception', 'nurse'],
    settings: {
      appearance: {
        theme: 'dark',
        primaryColor: '#3B82F6',
        fontSize: 'large'
      }
    }
  })
});
```

## Database Schema

### GlobalSettings Collection

```javascript
{
  appearance: {
    theme: 'light' | 'dark' | 'auto',
    primaryColor: string,
    secondaryColor: string,
    fontSize: 'small' | 'medium' | 'large',
    compactMode: boolean,
    sidebarCollapsed: boolean
  },
  notifications: {
    enabled: boolean,
    soundEnabled: boolean,
    desktopNotifications: boolean,
    emailNotifications: boolean,
    smsNotifications: boolean
  },
  dashboard: {
    refreshInterval: number,
    showWelcomeMessage: boolean,
    enableQuickActions: boolean,
    lab: { /* lab-specific settings */ },
    imaging: { /* imaging-specific settings */ },
    reception: { /* reception-specific settings */ },
    nurse: { /* nurse-specific settings */ }
  },
  security: {
    sessionTimeout: number,
    requirePasswordChange: boolean,
    passwordExpiryDays: number
  },
  system: {
    maintenanceMode: boolean,
    allowUserRegistration: boolean,
    enableAuditLog: boolean
  },
  lastUpdated: Date,
  updatedBy: ObjectId,
  version: string
}
```

## Security

- **Admin Only**: Global settings can only be modified by users with admin role
- **Authentication Required**: All API endpoints require valid authentication
- **Audit Trail**: All changes are logged with user and timestamp information
- **Validation**: Input validation prevents invalid settings from being saved

## Import/Export

### Export Settings
- Click "Export" button in Global Dashboard Settings
- Downloads a JSON file with current settings
- Includes metadata like version and export date

### Import Settings
- Click "Import" button and select a JSON file
- Validates file format before importing
- Replaces current settings with imported ones
- Requires admin privileges

## Troubleshooting

### Common Issues

1. **Settings Not Applying**
   - Check if user has admin role
   - Verify dashboard type is correct ('lab', 'imaging', 'reception', 'nurse')
   - Check browser console for errors

2. **Appearance Not Updating**
   - Clear browser cache
   - Check if CSS classes are being applied correctly
   - Verify theme settings in browser developer tools

3. **Notifications Not Working**
   - Check browser notification permissions
   - Verify notification settings are enabled
   - Check if user has granted notification access

### Debug Mode

Enable debug mode in advanced settings to see detailed logging:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

## Best Practices

1. **Test Settings**: Always test settings on a development environment first
2. **Backup**: Export settings before making major changes
3. **Gradual Rollout**: Apply settings to one dashboard type at a time
4. **User Feedback**: Gather feedback from users before applying globally
5. **Documentation**: Document any custom settings for future reference

## Future Enhancements

- **Role-Based Settings**: Different settings for different user roles
- **Time-Based Settings**: Schedule settings changes
- **A/B Testing**: Test different settings configurations
- **Analytics**: Track which settings improve user experience
- **Templates**: Pre-configured setting templates for different use cases

## Support

For technical support or questions about the global settings system:

1. Check this documentation first
2. Review the API endpoints and examples
3. Check browser console for error messages
4. Contact the development team with specific error details

---

*Last updated: December 2024*
