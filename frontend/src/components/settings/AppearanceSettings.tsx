import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { PaintBrushIcon } from '@heroicons/react/24/outline';
import SimpleThemeSelector from '../SimpleThemeSelector';

interface AppearanceSettingsProps {
  onClose?: () => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ onClose }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Appearance Settings</h2>
          <p className="text-muted-foreground mt-1">
            Customize how the application looks and feels
          </p>
        </div>
        {onClose && (
          <Button onClick={onClose} className="px-6">
            Save Changes
          </Button>
        )}
      </div>

      {/* Enhanced Theme Selector */}
      <SimpleThemeSelector showTitle={false} />

      {/* Link to Full Theme Settings */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <PaintBrushIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Microsoft Edge Style Settings</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Access the full theme customization interface with Microsoft Edge-style design and more options.
                </p>
              </div>
            </div>
            <Link to="/app/theme-settings">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/10">
                Open Full Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSettings;