import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Calendar, FileText, BarChart3 } from 'lucide-react';
import LeaveRequestForm from '../components/LeaveRequestForm';
import LeaveManagement from '../components/LeaveManagement';
import LeaveHistory from '../components/LeaveHistory';
import { useAuth } from '../context/AuthContext';

const LeaveRequest: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('request');

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-muted-foreground">Leave Management</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'Manage leave requests and balances' : 'Request and track your leave'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="request" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Request Leave
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Leave History
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Manage Leave
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          <LeaveRequestForm />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <LeaveHistory />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="manage" className="space-y-4">
            <LeaveManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default LeaveRequest;
