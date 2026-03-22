import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import NurseTaskList from '../../components/nurse/NurseTaskList';
import CreateTaskForm from '../../components/nurse/CreateTaskForm';

const NurseTasks: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = () => {
    setShowCreateForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Nurse Tasks</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create New Task'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6 p-4">
          <h2 className="text-xl font-medium mb-4">Create New Task</h2>
          <CreateTaskForm onTaskCreated={handleTaskCreated} />
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NurseTaskList onTaskUpdated={handleTaskUpdated} />
        </TabsContent>
        <TabsContent value="pending">
          <NurseTaskList
            filterStatus="PENDING"
            onTaskUpdated={handleTaskUpdated}
          />
        </TabsContent>
        <TabsContent value="in-progress">
          <NurseTaskList
            filterStatus="IN_PROGRESS"
            onTaskUpdated={handleTaskUpdated}
          />
        </TabsContent>
        <TabsContent value="completed">
          <NurseTaskList
            filterStatus="COMPLETED"
            onTaskUpdated={handleTaskUpdated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NurseTasks; 