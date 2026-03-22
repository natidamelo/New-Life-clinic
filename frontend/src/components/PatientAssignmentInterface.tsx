import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useToast } from './ui/use-toast';
import patientAssignmentService, { 
  PatientAssignmentStats, 
  AvailableStaff,
  RebalanceResult 
} from '../services/patientAssignmentService';
import patientService from '../services/patientService';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientId: string;
  status: string;
  assignedDoctorId?: string;
  assignedNurseId?: string;
  assignedDoctor?: {
    firstName: string;
    lastName: string;
  };
  assignedNurse?: {
    firstName: string;
    lastName: string;
  };
}

const PatientAssignmentInterface: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<PatientAssignmentStats | null>(null);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
  const [unassignedPatients, setUnassignedPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'doctor' | 'nurse'>('doctor');
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load all data in parallel
      const [statsData, staffData, patientsData] = await Promise.all([
        patientAssignmentService.getAssignmentStats(),
        patientAssignmentService.getAvailableStaff(),
        patientAssignmentService.getUnassignedPatients()
      ]);

      setStats(statsData);
      setAvailableStaff(Array.isArray(staffData) ? staffData : []);
      setUnassignedPatients(Array.isArray(patientsData) ? patientsData : []);
    } catch (error) {
      console.error('Error loading assignment data:', error);
      toast({
        title: "Error",
        description: "Failed to load assignment data. Please try again.",
        variant: "destructive",
      });
      // Set default values on error
      setStats(null);
      setAvailableStaff([]);
      setUnassignedPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRebalance = async () => {
    try {
      setIsRebalancing(true);
      const result: RebalanceResult = await patientAssignmentService.rebalanceAssignments();
      
      toast({
        title: "Success",
        description: result.message,
      });

      // Reload data after rebalancing
      await loadData();
    } catch (error) {
      console.error('Error rebalancing assignments:', error);
      toast({
        title: "Error",
        description: "Failed to rebalance assignments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRebalancing(false);
    }
  };

  const handleAssignPatient = async () => {
    if (!selectedPatient || !selectedStaff) {
      toast({
        title: "Error",
        description: "Please select both a patient and a staff member.",
        variant: "destructive",
      });
      return;
    }

    try {
      await patientAssignmentService.assignPatient({
        patientId: selectedPatient.id,
        staffId: selectedStaff,
        assignmentType
      });

      toast({
        title: "Success",
        description: `Patient assigned to ${assignmentType} successfully`,
      });

      // Close dialog and reload data
      setIsAssignmentDialogOpen(false);
      setSelectedPatient(null);
      setSelectedStaff('');
      await loadData();
    } catch (error: any) {
      console.error('Error assigning patient:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to assign patient",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (patientId: string, type: 'doctor' | 'nurse') => {
    try {
      await patientAssignmentService.removeAssignment({
        patientId,
        assignmentType: type
      });

      toast({
        title: "Success",
        description: `${type} assignment removed successfully`,
      });

      await loadData();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove assignment",
        variant: "destructive",
      });
    }
  };

  const filteredStaff = (Array.isArray(availableStaff) ? availableStaff : []).filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         staff.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-accent/20 text-accent-foreground';
      case 'scheduled': return 'bg-primary/20 text-primary';
      case 'Admitted': return 'bg-primary/20 text-primary';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor': return 'bg-primary/20 text-primary';
      case 'nurse': return 'bg-primary/20 text-primary';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin mr-2">
          <RefreshCw className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <span>Loading assignment interface...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-muted-foreground">Patient Assignment Interface</h2>
          <p className="text-muted-foreground">Manage patient assignments to staff members</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssignedPatients}</div>
              <p className="text-xs text-muted-foreground">Patients assigned to staff</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">{stats.unassignedPatients}</div>
              <p className="text-xs text-muted-foreground">Patients waiting for assignment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStaff}</div>
              <p className="text-xs text-muted-foreground">Available staff members</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleRebalance} 
                disabled={isRebalancing}
                className="w-full"
              >
                {isRebalancing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isRebalancing ? 'Rebalancing...' : 'Rebalance'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Load Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Department Load Distribution</CardTitle>
            <CardDescription>Current capacity utilization across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.departmentStats).map(([dept, data]) => (
                <div key={dept}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{dept}</span>
                    <span>{data.capacity}% Capacity</span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full">
                    <div 
                      className={`h-full rounded-full ${
                        data.capacity > 80 ? 'bg-destructive' :
                        data.capacity > 60 ? 'bg-accent' :
                        'bg-primary'
                      }`}
                      style={{ width: `${Math.min(data.capacity, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.assigned} assigned / {data.total} staff
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned Patients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-accent-foreground" />
              Unassigned Patients
            </CardTitle>
            <CardDescription>
              {unassignedPatients.length} patients waiting for assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unassignedPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-8 w-8 text-primary mb-2" />
                  <p>All patients are assigned!</p>
                </div>
              ) : (
                unassignedPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                      <div className="text-sm text-muted-foreground">ID: {patient.patientId}</div>
                      <Badge variant="outline" className={getStatusColor(patient.status)}>
                        {patient.status}
                      </Badge>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Patient</DialogTitle>
                          <DialogDescription>
                            Assign {patient.firstName} {patient.lastName} to a staff member
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Assignment Type</label>
                            <Select value={assignmentType} onValueChange={(value: 'doctor' | 'nurse') => setAssignmentType(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="doctor">Doctor</SelectItem>
                                <SelectItem value="nurse">Nurse</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Select Staff Member</label>
                            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a staff member" />
                              </SelectTrigger>
                                                             <SelectContent>
                                 {(Array.isArray(availableStaff) ? availableStaff : [])
                                   .filter(staff => staff.role === assignmentType && staff.available)
                                   .map((staff) => (
                                     <SelectItem key={staff.id} value={staff.id}>
                                       {staff.name} ({staff.assignedPatients}/10 patients)
                                     </SelectItem>
                                   ))}
                               </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedStaff('')}>
                            Cancel
                          </Button>
                          <Button onClick={handleAssignPatient} disabled={!selectedStaff}>
                            Assign Patient
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              Available Staff
            </CardTitle>
            <CardDescription>
              Staff members available for patient assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="nurse">Nurses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p>No staff members found</p>
                </div>
              ) : (
                filteredStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {staff.specialization && `${staff.specialization} • `}
                        {staff.department}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getRoleColor(staff.role)}>
                          {staff.role}
                        </Badge>
                        <Badge variant={staff.available ? "default" : "secondary"}>
                          {staff.assignedPatients}/10 patients
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      {staff.available ? (
                        <div className="flex items-center text-primary">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Available</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-destructive">
                          <Clock className="h-4 w-4 mr-1" />
                          <span className="text-sm">Full</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientAssignmentInterface;
