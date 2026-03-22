import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const TestNotifications: React.FC = () => {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Test Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This is a test component to verify imports are working.</p>
      </CardContent>
    </Card>
  );
};

export default TestNotifications; 