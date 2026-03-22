import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Users, Search, Edit, Save, X, Plus } from 'lucide-react';
import { useToast } from './ui/use-toast';
import api from '../services/apiService';

interface StaffMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
}

interface LeaveBalance {
  staff: StaffMember;
  balance: {
    annual: { allocated: number; used: number; pending: number };
    sick: { allocated: number; used: number; pending: number };
    personal: { allocated: number; used: number; pending: number };
    maternity: { allocated: number; used: number; pending: number };
    paternity: { allocated: number; used: number; pending: number };
    bereavement: { allocated: number; used: number; pending: number };
    other: { allocated: number; used: number; pending: number };
  };
  remaining: {
    annual: number;
    sick: number;
    personal: number;
    maternity: number;
    paternity: number;
    bereavement: number;
    other: number;
  };
  totalRemaining: number;
}

const LeaveBalanceManagement: React.FC = () => {
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);

  useEffect(() => {
    fetchStaffMembers();
    fetchLeaveBalances();
  }, [selectedYear]);

  const fetchStaffMembers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      const staff = response.data.users.filter((user: StaffMember) => user.role !== 'admin');
      setStaffMembers(staff);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    }
  };

  const fetchLeaveBalances = async () => {
    setIsLoading(true);
    try {
      // Fetch real leave balances from API
      const response = await api.get(`/api/leave/all-balances?year=${selectedYear}`);
      setLeaveBalances(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      setLeaveBalances([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (balance: LeaveBalance) => {
    setEditingBalance(balance.staff._id);
    setEditingData({
      annual: balance.balance.annual.allocated,
      sick: balance.balance.sick.allocated,
      personal: balance.balance.personal.allocated,
      maternity: balance.balance.maternity.allocated,
      paternity: balance.balance.paternity.allocated,
      bereavement: balance.balance.bereavement.allocated,
      other: balance.balance.other.allocated
    });
  };

  const handleSave = async (staffId: string) => {
    try {
      const leaveTypes = {
        annual: { allocated: editingData.annual },
        sick: { allocated: editingData.sick },
        personal: { allocated: editingData.personal },
        maternity: { allocated: editingData.maternity },
        paternity: { allocated: editingData.paternity },
        bereavement: { allocated: editingData.bereavement },
        other: { allocated: editingData.other }
      };

      await api.put(`/api/leave/balance/${staffId}`, { leaveTypes });

      toast({
        title: "Success",
        description: "Leave balance updated successfully",
        variant: "default"
      });

      setEditingBalance(null);
      setEditingData(null);
      fetchLeaveBalances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update balance",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingBalance(null);
    setEditingData(null);
  };

  const filteredBalances = leaveBalances.filter(balance =>
    balance.staff.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.staff.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.staff.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const leaveTypes = [
    { key: 'annual', label: 'Annual', color: 'bg-primary/20 text-primary' },
    { key: 'sick', label: 'Sick', color: 'bg-destructive/20 text-destructive' },
    { key: 'personal', label: 'Personal', color: 'bg-primary/20 text-primary' },
    { key: 'maternity', label: 'Maternity', color: 'bg-pink-100 text-pink-800' },
    { key: 'paternity', label: 'Paternity', color: 'bg-secondary/20 text-secondary-foreground' },
    { key: 'bereavement', label: 'Bereavement', color: 'bg-muted/20 text-muted-foreground' },
    { key: 'other', label: 'Other', color: 'bg-accent/20 text-accent-foreground' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Balance Management</h1>
          <p className="text-muted-foreground">Manage leave balances for all staff members</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Search Staff</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
                <Input
                  placeholder="Search by name or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBalances.map((balance) => (
            <Card key={balance.staff._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {balance.staff.firstName.charAt(0)}{balance.staff.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">
                          {balance.staff.firstName} {balance.staff.lastName}
                        </h3>
                        <Badge variant="outline">{balance.staff.role}</Badge>
                        <Badge variant="outline">{balance.staff.department}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {balance.staff.email}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Total Remaining:</span>
                        <Badge className="bg-primary/20 text-primary">
                          {balance.totalRemaining} days
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {editingBalance === balance.staff._id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSave(balance.staff._id)}
                          className="bg-primary hover:bg-primary"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(balance)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {leaveTypes.map((type) => (
                      <div key={type.key} className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Badge className={type.color}>{type.label}</Badge>
                        </div>
                        {editingBalance === balance.staff._id ? (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Allocated</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editingData[type.key]}
                                onChange={(e) => setEditingData(prev => ({
                                  ...prev,
                                  [type.key]: parseInt(e.target.value) || 0
                                }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Used: {balance.balance[type.key as keyof typeof balance.balance].used}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Pending: {balance.balance[type.key as keyof typeof balance.balance].pending}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-lg font-bold text-primary">
                              {balance.remaining[type.key as keyof typeof balance.remaining]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {balance.balance[type.key as keyof typeof balance.balance].allocated} allocated
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {balance.balance[type.key as keyof typeof balance.balance].used} used
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveBalanceManagement;
