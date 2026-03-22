import React from 'react';
import AttendanceOverlayControl from '../../components/admin/AttendanceOverlayControl';

const SystemControls: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-muted-foreground">System Controls</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Control global system settings and attendance overlay behavior
        </p>
      </div>
      
      <AttendanceOverlayControl />
    </div>
  );
};

export default SystemControls;
