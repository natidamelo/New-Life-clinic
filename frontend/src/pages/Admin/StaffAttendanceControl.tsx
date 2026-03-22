import React from 'react';
import StaffAttendanceControl from '../../components/admin/StaffAttendanceControl';

const StaffAttendanceControlPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-muted-foreground">Staff Attendance Control</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Control attendance overlay requirements for individual staff members
        </p>
      </div>
      
      <StaffAttendanceControl />
    </div>
  );
};

export default StaffAttendanceControlPage;
