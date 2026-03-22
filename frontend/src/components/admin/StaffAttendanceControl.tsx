import React, { useState, useEffect } from 'react';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { AlertCircle, Users, Search, Shield, UserCheck, UserX } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../../services/apiService';

interface StaffMember {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  attendanceOverlayEnabled?: boolean;
}

const StaffAttendanceControl: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStaff, setUpdatingStaff] = useState<Set<string>>(new Set());

  // Fetch all staff members
  const fetchStaffMembers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch staff from the updated API endpoint using centralized API service
      const response = await apiService.get('/api/staff');
      const data = response.data;
      console.log('Staff data from /api/staff:', data);
      
      // Use the real data from the staff endpoint
      const staff = data.data || data;
      
      // Add default overlay setting if not present
      const staffWithOverlay = staff.map((member: StaffMember) => ({
        ...member,
        attendanceOverlayEnabled: member.attendanceOverlayEnabled ?? true // Default to enabled
      }));
      
      setStaffMembers(staffWithOverlay);
      setFilteredStaff(staffWithOverlay);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setIsLoading(false);
    }
  };

  // Update attendance overlay setting for specific staff member
  const updateStaffOverlaySetting = async (staffId: string, enabled: boolean) => {
    setUpdatingStaff(prev => new Set(prev).add(staffId));
    
    try {
      // For now, we'll just update the local state since the backend endpoint might not exist yet
      // In a real implementation, you would make an API call here
      
      // Update local state immediately for better UX
      setStaffMembers(prev => 
        prev.map(member => 
          member._id === staffId || member.id === staffId
            ? { ...member, attendanceOverlayEnabled: enabled }
            : member
        )
      );
      
      setFilteredStaff(prev => 
        prev.map(member => 
          member._id === staffId || member.id === staffId
            ? { ...member, attendanceOverlayEnabled: enabled }
            : member
        )
      );
      
      const staff = staffMembers.find(m => m._id === staffId || m.id === staffId);
      toast.success(
        `Attendance overlay ${enabled ? 'enabled' : 'disabled'} for ${staff?.firstName} ${staff?.lastName}`
      );
      
      // Make the actual API call to update the attendance overlay setting
      await apiService.put(`/api/staff/${staffId}/attendance-overlay`, {
        attendanceOverlayEnabled: enabled
      });
      
    } catch (error) {
      console.error('Error updating overlay setting:', error);
      toast.error('Failed to update overlay setting');
    } finally {
      setUpdatingStaff(prev => {
        const newSet = new Set(prev);
        newSet.delete(staffId);
        return newSet;
      });
    }
  };

  // Filter staff based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStaff(staffMembers);
    } else {
      const filtered = staffMembers.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStaff(filtered);
    }
  }, [searchTerm, staffMembers]);

  // Load staff on component mount
  useEffect(() => {
    fetchStaffMembers();
  }, []);

  // Bulk enable/disable for all staff
  const bulkUpdateOverlay = async (enabled: boolean) => {
    try {
      const promises = filteredStaff.map(staff =>
        updateStaffOverlaySetting(staff._id || staff.id!, enabled)
      );
      
      await Promise.all(promises);
      toast.success(`Attendance overlay ${enabled ? 'enabled' : 'disabled'} for all staff`);
    } catch (error) {
      toast.error('Failed to update overlay settings for all staff');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Staff Attendance Control</span>
          </CardTitle>
          <CardDescription>
            Control attendance overlay requirements for individual staff members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-muted/30 rounded w-32"></div>
                  <div className="h-3 bg-muted/30 rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted/30 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary" />
          <span>Staff Attendance Control</span>
        </CardTitle>
        <CardDescription>
          Control attendance overlay requirements for individual staff members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Bulk Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 w-4 h-4" />
            <Input
              placeholder="Search staff by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkUpdateOverlay(true)}
              className="flex items-center space-x-1"
            >
              <UserCheck className="w-4 h-4" />
              <span>Enable All</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkUpdateOverlay(false)}
              className="flex items-center space-x-1"
            >
              <UserX className="w-4 h-4" />
              <span>Disable All</span>
            </Button>
          </div>
        </div>

        {/* Staff List */}
        <div className="space-y-3">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No staff members found</p>
            </div>
          ) : (
            filteredStaff.map((staff) => {
              const staffId = staff._id || staff.id!;
              const isUpdating = updatingStaff.has(staffId);
              
              return (
                <div
                  key={staffId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-muted/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {staff.firstName[0]}{staff.lastName[0]}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-muted-foreground truncate">
                          {staff.firstName} {staff.lastName}
                        </p>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {staff.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {staff.email}
                      </p>
                      <div className="flex items-center mt-1">
                        <Shield className={`w-3 h-3 mr-1 ${
                          staff.attendanceOverlayEnabled 
                            ? 'text-primary' 
                            : 'text-muted-foreground/50'
                        }`} />
                        <span className={`text-xs ${
                          staff.attendanceOverlayEnabled 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                        }`}>
                          {staff.attendanceOverlayEnabled ? 'Overlay Required' : 'Overlay Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={staff.attendanceOverlayEnabled || false}
                      onCheckedChange={(enabled) => updateStaffOverlaySetting(staffId, enabled)}
                      disabled={isUpdating}
                      className="data-[state=checked]:bg-primary"
                    />
                    {isUpdating && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total Staff: {filteredStaff.length}</span>
            <div className="flex space-x-4">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-1"></div>
                Overlay Enabled: {filteredStaff.filter(s => s.attendanceOverlayEnabled).length}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-muted/50 rounded-full mr-1"></div>
                Overlay Disabled: {filteredStaff.filter(s => !s.attendanceOverlayEnabled).length}
              </span>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          onClick={fetchStaffMembers}
          disabled={isLoading}
          className="w-full"
        >
          Refresh Staff List
        </Button>
      </CardContent>
    </Card>
  );
};

export default StaffAttendanceControl;
