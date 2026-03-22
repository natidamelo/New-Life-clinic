import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import facilityService, { Room, Building, Department, Equipment, MaintenanceRequest } from '../../services/facilityService';

// Import components for facility management
import RoomsManagement from './RoomsManagement';
import BuildingsManagement from './BuildingsManagement';
import EquipmentManagement from './EquipmentManagement';
import MaintenanceRequests from './MaintenanceRequests';
import DepartmentsManagement from './DepartmentsManagement';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const FacilityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    maintenanceRooms: 0,
    activeEquipment: 0,
    maintenanceEquipment: 0,
    pendingRequests: 0,
    departments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all facility data
        const [statsData, buildingsData, roomsData, departmentsData, equipmentData, maintenanceData] = await Promise.all([
          facilityService.getFacilityStats(),
          facilityService.getBuildings(),
          facilityService.getRooms(),
          facilityService.getDepartments(),
          facilityService.getEquipment(),
          facilityService.getMaintenanceRequests()
        ]);
        
        setStats(statsData);
        setBuildings(buildingsData);
        setRooms(roomsData);
        setDepartments(departmentsData);
        setEquipment(equipmentData);
        setMaintenanceRequests(maintenanceData);
      } catch (error) {
        console.error('Error fetching facility data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const roomStatusData = [
    { name: 'Available', value: stats.availableRooms },
    { name: 'Occupied', value: stats.occupiedRooms },
    { name: 'Maintenance', value: stats.maintenanceRooms }
  ];
  
  const equipmentStatusData = [
    { name: 'Operational', value: stats.activeEquipment },
    { name: 'Maintenance', value: stats.maintenanceEquipment }
  ];
  
  const departmentRoomsData = departments.map(dept => ({
    name: dept.name,
    rooms: rooms.filter(room => 
      room.floor === dept.floor && room.building === dept.building
    ).length
  }));

  const priorityCountData = [
    { name: 'Low', count: maintenanceRequests.filter(r => r.priority === 'low').length },
    { name: 'Medium', count: maintenanceRequests.filter(r => r.priority === 'medium').length },
    { name: 'High', count: maintenanceRequests.filter(r => r.priority === 'high').length },
    { name: 'Urgent', count: maintenanceRequests.filter(r => r.priority === 'urgent').length }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Facility Management</h1>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="maintenance">
            Maintenance
            {stats.pendingRequests > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingRequests}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Dashboard */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <h3 className="text-muted-foreground text-sm font-medium">Buildings</h3>
              <p className="text-3xl font-bold">{stats.totalBuildings}</p>
            </Card>
            
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <h3 className="text-muted-foreground text-sm font-medium">Total Rooms</h3>
              <p className="text-3xl font-bold">{stats.totalRooms}</p>
              <div className="mt-2 text-sm">
                <span className="text-primary">{stats.availableRooms} available</span>
              </div>
            </Card>
            
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <h3 className="text-muted-foreground text-sm font-medium">Departments</h3>
              <p className="text-3xl font-bold">{stats.departments}</p>
            </Card>
            
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <h3 className="text-muted-foreground text-sm font-medium">Equipment</h3>
              <p className="text-3xl font-bold">{stats.activeEquipment + stats.maintenanceEquipment}</p>
              <div className="mt-2 text-sm">
                <span className="text-accent-foreground">{stats.maintenanceEquipment} in maintenance</span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <h3 className="text-muted-foreground text-lg font-medium mb-4">Room Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {roomStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <h3 className="text-muted-foreground text-lg font-medium mb-4">Maintenance Requests by Priority</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={priorityCountData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="mb-8">
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <h3 className="text-muted-foreground text-lg font-medium mb-4">Rooms by Department</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentRoomsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rooms" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="mb-8">
            <Card className="p-6 bg-primary-foreground shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-muted-foreground text-lg font-medium">Recent Maintenance Requests</h3>
                <Button variant="outline" onClick={() => setActiveTab('maintenance')}>
                  View All
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date Requested
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-primary-foreground divide-y divide-gray-200">
                    {maintenanceRequests.slice(0, 5).map((request) => (
                      <tr key={request.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.itemName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={
                            request.priority === 'urgent' ? 'bg-destructive' :
                            request.priority === 'high' ? 'bg-accent' :
                            request.priority === 'medium' ? 'bg-primary' :
                            'bg-primary'
                          }>
                            {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={
                            request.status === 'completed' ? 'bg-primary' :
                            request.status === 'in-progress' ? 'bg-primary' :
                            request.status === 'pending' ? 'bg-accent' :
                            request.status === 'cancelled' ? 'bg-muted' :
                            'bg-secondary'
                          }>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(request.requestDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed content for other tabs */}
        <TabsContent value="rooms">
          <RoomsManagement rooms={rooms} buildings={buildings} />
        </TabsContent>
        
        <TabsContent value="buildings">
          <BuildingsManagement buildings={buildings} />
        </TabsContent>
        
        <TabsContent value="departments">
          <DepartmentsManagement departments={departments} buildings={buildings} />
        </TabsContent>
        
        <TabsContent value="equipment">
          <EquipmentManagement equipment={equipment} departments={departments.map(d => d.name)} />
        </TabsContent>
        
        <TabsContent value="maintenance">
          <MaintenanceRequests 
            requests={maintenanceRequests} 
            staffMembers={[]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FacilityDashboard; 