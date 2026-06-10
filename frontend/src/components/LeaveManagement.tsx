import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from './ui/use-toast';
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  User,
  AlertCircle,
  BarChart3,
  Trash2,
  MoreHorizontal,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Checkbox } from './ui/checkbox';
import html2pdf from 'html2pdf.js';
// import { useToast } from './ui/use-toast';
import api from '../services/apiService';

interface LeaveRequest {
  _id: string;
  staffId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    department: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: 'pending' | 'pending review' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  isHalfDay: boolean;
  halfDayType?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  department: string;
  year: number;
  attachments: Array<{
    filename: string;
    path: string;
  }>;
}

interface LeaveBalance {
  staff: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    department: string;
  };
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

interface LeaveStatistics {
  statusStats: Array<{ _id: string; count: number; totalDays: number }>;
  leaveTypeStats: Array<{ _id: string; count: number; totalDays: number; approvedDays: number }>;
  departmentStats: Array<{ _id: string; count: number; totalDays: number }>;
}

const LeaveManagement: React.FC = () => {
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [statistics, setStatistics] = useState<LeaveStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'requests' | 'balances' | 'statistics'>('requests');
  const [notificationCount, setNotificationCount] = useState(0);
  const [updatingBalance, setUpdatingBalance] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    year: new Date().getFullYear().toString(),
    search: '',
    leaveType: 'all',
    startDate: '',
    endDate: ''
  });

  // Bulk selection
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalRecords: 0
  });

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedTab, filters, pagination?.current]);

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRequests(leaveRequests.map(request => request._id));
    } else {
      setSelectedRequests([]);
    }
  };

  // Update selectAll state when individual selections change
  useEffect(() => {
    if (leaveRequests.length > 0) {
      const allSelected = leaveRequests.every(request => selectedRequests.includes(request._id));
      const someSelected = selectedRequests.length > 0;
      setSelectAll(allSelected);
    }
  }, [selectedRequests, leaveRequests]);

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
      setSelectAll(false);
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "Error",
        description: "Please select leave requests to delete",
        variant: "destructive"
      });
      return;
    }

    try {
      await Promise.all(selectedRequests.map(id => api.delete(`/api/leave/${id}`)));

      toast({
        title: "Success",
        description: `Deleted ${selectedRequests.length} leave request${selectedRequests.length > 1 ? 's' : ''} successfully`,
        variant: "default"
      });

      setSelectedRequests([]);
      setSelectAll(false);
      await fetchLeaveRequests();
      await fetchLeaveBalances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete selected requests",
        variant: "destructive"
      });
    }
  };

  const handleBulkPDF = () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "Error",
        description: "Please select leave requests to export",
        variant: "destructive"
      });
      return;
    }

    const selectedLeaveRequests = leaveRequests.filter(request =>
      selectedRequests.includes(request._id)
    );

    selectedLeaveRequests.forEach(request => {
      setTimeout(() => generatePDF(request), 500); // Small delay to avoid conflicts
    });

    toast({
      title: "Success",
      description: `Generating PDFs for ${selectedRequests.length} leave request${selectedRequests.length > 1 ? 's' : ''}`,
      variant: "default"
    });
  };

  const handleExportExcel = async () => {
    try {
      // Build query parameters from current filters
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '1000', // Export all matching records
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) =>
            value && value !== 'all' && key !== 'current'
          )
        )
      });

      // Fetch the data to export
      const response = await api.get(`/api/leave/export/csv?${queryParams}`, {
        responseType: 'blob'
      });

      // Create a blob from the response and download it
      const blob = new Blob([response.data], {
        type: 'text/csv'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const startDate = filters.startDate || 'all';
      const endDate = filters.endDate || 'all';
      const filename = `leave_requests_${startDate}_to_${endDate}.csv`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Excel file downloaded successfully",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to export Excel file",
        variant: "destructive"
      });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (selectedTab === 'requests') {
        await fetchLeaveRequests();
      } else if (selectedTab === 'balances') {
        await fetchLeaveBalances();
      } else if (selectedTab === 'statistics') {
        await fetchStatistics();
      }
      
      // Always fetch notification count
      await fetchNotificationCount();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    // Filter out "all" values and empty search before sending request
    const requestFilters = { ...filters };
    if (requestFilters.status === 'all') delete requestFilters.status;
    if (requestFilters.department === 'all') delete requestFilters.department;
    if (requestFilters.leaveType === 'all') delete requestFilters.leaveType;
    if (!requestFilters.search || requestFilters.search.trim() === '') delete requestFilters.search;
    if (!requestFilters.startDate) delete requestFilters.startDate;
    if (!requestFilters.endDate) delete requestFilters.endDate;

    const params = new URLSearchParams({
      page: (pagination?.current || 1).toString(),
      limit: '20',
      ...requestFilters
    });

    const response = await api.get(`/api/leave?${params}`);
    setLeaveRequests(response.data.leaves || []);
    setPagination(response.data.pagination || { current: 1, total: 1, totalRecords: 0 });
    
    // Mark leave notifications as read when admin views the requests
    try {
      await api.patch('/api/leave/notifications/mark-read');
      // Refresh notification count after marking as read
      await fetchNotificationCount();
    } catch (error) {
      console.error('Error marking leave notifications as read:', error);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const response = await api.get(`/api/leave/all-balances?year=${filters.year}`);
      setLeaveBalances(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      setLeaveBalances([]);
      toast({
        title: "Error",
        description: "Failed to fetch leave balances",
        variant: "destructive"
      });
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get(`/api/leave/statistics?year=${filters.year}`);
      setStatistics(response.data?.data || null);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setStatistics(null);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/api/leave/notifications/count');
      setNotificationCount(response.data.count);
    } catch (error) {
      console.error('Error fetching notification count:', error);
      setNotificationCount(0);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.patch(`/api/leave/${requestId}/status`, {
        status: 'approved'
      });

      toast({
        title: "Success",
        description: "Leave request approved successfully",
        variant: "default"
      });

      // Refresh both requests and balances to show updated data
      await fetchLeaveRequests();
      await fetchLeaveBalances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve request",
        variant: "destructive"
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive"
      });
      return;
    }

    try {
      await api.patch(`/api/leave/${selectedRequest._id}/status`, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim()
      });

      toast({
        title: "Success",
        description: "Leave request rejected successfully",
        variant: "default"
      });

      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);

      // Refresh both requests and balances to show updated data
      await fetchLeaveRequests();
      await fetchLeaveBalances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject request",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) {
      toast({
        title: "Error",
        description: "No request selected for deletion",
        variant: "destructive"
      });
      return;
    }

    try {
      await api.delete(`/api/leave/${selectedRequest._id}`);

      toast({
        title: "Success",
        description: "Leave request deleted successfully",
        variant: "default"
      });

      setShowDeleteModal(false);
      setSelectedRequest(null);

      // Refresh both requests and balances to show updated data
      await fetchLeaveRequests();
      await fetchLeaveBalances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete request",
        variant: "destructive"
      });
    }
  };

  const generatePDF = (request: LeaveRequest) => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">Leave Request Details</h1>

        <div style="margin: 20px 0;">
          <h2 style="color: #666; margin-bottom: 10px;">Staff Information</h2>
          <p><strong>Name:</strong> ${request.staffId.firstName || 'Unknown'} ${request.staffId.lastName || 'User'}</p>
          <p><strong>Email:</strong> ${request.staffId.email || 'No email'}</p>
          <p><strong>Role:</strong> ${request.staffId.role || 'No role'}</p>
          <p><strong>Department:</strong> ${request.staffId.department || 'No department'}</p>
        </div>

        <div style="margin: 20px 0;">
          <h2 style="color: #666; margin-bottom: 10px;">Leave Information</h2>
          <p><strong>Leave Type:</strong> ${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}</p>
          <p><strong>Status:</strong> ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</p>
          <p><strong>Number of Days:</strong> ${request.numberOfDays} ${request.isHalfDay ? `(${request.halfDayType})` : ''}</p>
          <p><strong>Period:</strong> ${formatDate(request.startDate)} - ${formatDate(request.endDate)}</p>
          <p><strong>Reason:</strong> ${request.reason}</p>
          <p><strong>Requested At:</strong> ${formatDate(request.requestedAt)}</p>
          ${request.approvedAt ? `<p><strong>Approved At:</strong> ${formatDate(request.approvedAt)}</p>` : ''}
          ${request.approvedBy ? `<p><strong>Approved By:</strong> ${request.approvedBy.firstName} ${request.approvedBy.lastName}</p>` : ''}
          ${request.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${request.rejectionReason}</p>` : ''}
        </div>

        ${request.emergencyContact ? `
        <div style="margin: 20px 0;">
          <h2 style="color: #666; margin-bottom: 10px;">Emergency Contact</h2>
          <p><strong>Name:</strong> ${request.emergencyContact.name}</p>
          <p><strong>Phone:</strong> ${request.emergencyContact.phone}</p>
          <p><strong>Relationship:</strong> ${request.emergencyContact.relationship}</p>
        </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666;">
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `leave-request-${request.staffId.firstName || 'Unknown'}-${request.staffId.lastName || 'User'}-${request._id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const updateLeaveBalance = async (staffId: string, leaveBalanceData: any) => {
    setUpdatingBalance(staffId);
    try {
      // Extract only the allocated values from the balance data
      const leaveTypes: { [key: string]: number } = {};
      Object.keys(leaveBalanceData).forEach(type => {
        leaveTypes[type] = leaveBalanceData[type].allocated;
      });

      console.log('Updating leave balance for:', staffId, 'with data:', leaveTypes);

      await api.put(`/api/leave/balance/${staffId}`, {
        leaveTypes
      });

      toast({
        title: "Success",
        description: "Leave balance updated successfully",
        variant: "default"
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating leave balance:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update balance",
        variant: "destructive"
      });
    } finally {
      setUpdatingBalance(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-accent/20 text-accent-foreground', icon: Clock },
      'pending review': { color: 'bg-accent/20 text-accent-foreground', icon: Clock },
      approved: { color: 'bg-primary/20 text-primary', icon: CheckCircle },
      rejected: { color: 'bg-destructive/20 text-destructive', icon: XCircle },
      cancelled: { color: 'bg-muted/20 text-muted-foreground', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status === 'pending review' ? 'Pending Review' : (status?.charAt(0)?.toUpperCase() || '') + (status?.slice(1) || '')}
      </Badge>
    );
  };

  const getLeaveTypeBadge = (type: string) => {
    const typeConfig = {
      annual: 'bg-primary/20 text-primary',
      sick: 'bg-destructive/20 text-destructive',
      personal: 'bg-primary/20 text-primary',
      maternity: 'bg-pink-100 text-pink-800',
      paternity: 'bg-secondary/20 text-secondary-foreground',
      bereavement: 'bg-muted/20 text-muted-foreground',
      other: 'bg-accent/20 text-accent-foreground'
    };

    return (
      <Badge className={typeConfig[type as keyof typeof typeConfig]}>
        {(type?.charAt(0)?.toUpperCase() || '') + (type?.slice(1) || '')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Manage staff leave requests and balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchData()}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted/20 p-1 rounded-lg">
                 <Button
           variant={selectedTab === 'requests' ? 'default' : 'ghost'}
           onClick={() => setSelectedTab('requests')}
           className="flex-1 relative"
         >
           <Calendar className="h-4 w-4 mr-2" />
           Leave Requests
           {notificationCount > 0 && (
             <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-primary-foreground text-xs rounded-full flex items-center justify-center">
               {notificationCount > 9 ? '9+' : notificationCount}
             </span>
           )}
         </Button>
        <Button
          variant={selectedTab === 'balances' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('balances')}
          className="flex-1"
        >
          <Users className="h-4 w-4 mr-2" />
          Leave Balances
        </Button>
        <Button
          variant={selectedTab === 'statistics' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('statistics')}
          className="flex-1"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Statistics
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
                <Input
                  placeholder="Search by name..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pending review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={filters.leaveType} onValueChange={(value) => setFilters(prev => ({ ...prev, leaveType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="paternity">Paternity</SelectItem>
                  <SelectItem value="bereavement">Bereavement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Nursing">Nursing</SelectItem>
                  <SelectItem value="Laboratory">Laboratory</SelectItem>
                  <SelectItem value="Imaging">Imaging</SelectItem>
                  <SelectItem value="Reception">Reception</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="px-3"
                  title="Export filtered data to CSV"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedRequests.length > 0 && (
            <div className="flex items-center justify-between mt-4 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedRequests.length} request{selectedRequests.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedRequests([]);
                    setSelectAll(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkPDF}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Export PDF ({selectedRequests.length})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedRequests.length})
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {selectedTab === 'requests' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leaveRequests || []).map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRequests.includes(request._id)}
                            onCheckedChange={(checked) => handleSelectRequest(request._id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="" />
                              <AvatarFallback className="text-xs">
                                {(request.staffId.firstName?.charAt(0) || '?')}{(request.staffId.lastName?.charAt(0) || '?')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {request.staffId.firstName || 'Unknown'} {request.staffId.lastName || 'User'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {request.staffId.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.staffId.department || 'No department'}</Badge>
                        </TableCell>
                        <TableCell>
                          {getLeaveTypeBadge(request.leaveType)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {request.numberOfDays} day{request.numberOfDays !== 1 ? 's' : ''}
                            {request.isHalfDay && ` (${request.halfDayType})`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(request.startDate)}<br />
                            <span className="text-muted-foreground">to</span><br />
                            {formatDate(request.endDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(request.requestedAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {(request.status === 'pending' || request.status === 'pending review') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleApprove(request._id)}
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRejectModal(true);
                                  }}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowViewModal(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => generatePDF(request)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDeleteModal(true);
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {leaveRequests.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Leave Requests Found</h3>
                    <p className="text-muted-foreground">No leave requests match your current filters.</p>
                  </div>
                )}

                {/* Pagination */}
                {pagination && pagination.total > 1 && (
                  <div className="flex justify-center space-x-2 p-4 border-t">
                    <Button
                      variant="outline"
                      disabled={pagination.current === 1}
                      onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {pagination.current} of {pagination.total}
                    </span>
                    <Button
                      variant="outline"
                      disabled={pagination.current === pagination.total}
                      onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedTab === 'balances' && (
            <div className="space-y-4">
              {(leaveBalances || []).map((balance) => (
                <Card key={balance.staff._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar>
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {(balance.staff.firstName?.charAt(0) || '?')}{(balance.staff.lastName?.charAt(0) || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">
                              {balance.staff.firstName || 'Unknown'} {balance.staff.lastName || 'User'}
                            </h3>
                            <Badge variant="outline">{balance.staff.role || 'No role'}</Badge>
                            <Badge variant="outline">{balance.staff.department || 'No department'}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {balance.staff.email || 'No email'}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {Object.entries(balance.balance).map(([type, data]: [string, any]) => (
                              <div key={type} className="space-y-1">
                                <Label className="text-xs font-medium capitalize">{type}</Label>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={data.allocated}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      const updatedBalances = (leaveBalances || []).map(b => 
                                        b.staff._id === balance.staff._id 
                                          ? {
                                              ...b,
                                              balance: {
                                                ...b.balance,
                                                [type]: {
                                                  ...b.balance[type],
                                                  allocated: newValue
                                                }
                                              }
                                            }
                                          : b
                                      );
                                      setLeaveBalances(updatedBalances);
                                    }}
                                    className="w-16 h-8 text-sm"
                                  />
                                  <span className="text-xs text-muted-foreground">days</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Used: {data.used} | Pending: {data.pending}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => updateLeaveBalance(balance.staff._id, balance.balance)}
                          disabled={updatingBalance === balance.staff._id}
                          className="bg-primary hover:bg-primary"
                        >
                          {updatingBalance === balance.staff._id ? (
                            <>
                              <Clock className="h-4 w-4 mr-1 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Update
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(leaveBalances || []).length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No Staff Found</h3>
                      <p className="text-muted-foreground">No staff members found for leave balance management.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {selectedTab === 'statistics' && statistics && (() => {
            // Aggregate status counts safely
            const statusMap = (statistics.statusStats || []).reduce((acc, curr) => {
              const status = (curr._id || '').toLowerCase();
              if (status.includes('approve')) {
                acc.approved.count += curr.count;
                acc.approved.days += curr.totalDays;
              } else if (status.includes('pending')) {
                acc.pending.count += curr.count;
                acc.pending.days += curr.totalDays;
              } else if (status.includes('reject')) {
                acc.rejected.count += curr.count;
                acc.rejected.days += curr.totalDays;
              } else if (status.includes('cancel')) {
                acc.cancelled.count += curr.count;
                acc.cancelled.days += curr.totalDays;
              } else {
                acc.other.count += curr.count;
                acc.other.days += curr.totalDays;
              }
              acc.total.count += curr.count;
              acc.total.days += curr.totalDays;
              return acc;
            }, {
              approved: { count: 0, days: 0 },
              pending: { count: 0, days: 0 },
              rejected: { count: 0, days: 0 },
              cancelled: { count: 0, days: 0 },
              other: { count: 0, days: 0 },
              total: { count: 0, days: 0 }
            });

            // Calculate percentages for status ratio
            const totalCount = statusMap.total.count || 1;
            const approvedPct = Math.round((statusMap.approved.count / totalCount) * 100);
            const pendingPct = Math.round((statusMap.pending.count / totalCount) * 100);
            const rejectedPct = Math.round((statusMap.rejected.count / totalCount) * 100);
            const otherPct = Math.round(((statusMap.cancelled.count + statusMap.other.count) / totalCount) * 100);

            // Normalize department requests to find max
            const maxDeptRequests = Math.max(...(statistics.departmentStats || []).map(d => d.count), 1);
            
            // Map leave types to premium colors and bars
            const getLeaveTypeStyle = (type: string) => {
              const t = type.toLowerCase();
              if (t.includes('annual')) return { bg: 'bg-blue-500/10', text: 'text-blue-500', bar: 'bg-blue-500' };
              if (t.includes('sick')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', bar: 'bg-emerald-500' };
              if (t.includes('maternity') || t.includes('paternity')) return { bg: 'bg-purple-500/10', text: 'text-purple-500', bar: 'bg-purple-500' };
              if (t.includes('personal')) return { bg: 'bg-amber-500/10', text: 'text-amber-500', bar: 'bg-amber-500' };
              if (t.includes('bereavement')) return { bg: 'bg-rose-500/10', text: 'text-rose-500', bar: 'bg-rose-500' };
              return { bg: 'bg-slate-500/10', text: 'text-slate-500', bar: 'bg-slate-500' };
            };

            return (
              <div className="space-y-6">
                {/* 1. Grid of Premium Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Requests */}
                  <Card className="relative overflow-hidden border-0 shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-blue-500/10 to-indigo-600/5 dark:from-blue-500/5 dark:to-indigo-600/2">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Requests</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight">{statusMap.total.count}</p>
                        <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
                      </div>
                      <div className="rounded-xl bg-blue-500/10 dark:bg-blue-500/20 p-3 text-blue-600 dark:text-blue-400">
                        <FileText className="h-6 w-6" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Approved Requests */}
                  <Card className="relative overflow-hidden border-0 shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-emerald-500/10 to-teal-600/5 dark:from-emerald-500/5 dark:to-teal-600/2">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved Days</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight text-emerald-600 dark:text-emerald-400">{statusMap.approved.days}</p>
                        <p className="text-xs text-muted-foreground mt-1">{statusMap.approved.count} requests approved</p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Pending Requests */}
                  <Card className="relative overflow-hidden border-0 shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-amber-500/10 to-yellow-600/5 dark:from-amber-500/5 dark:to-yellow-600/2">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight text-amber-600 dark:text-amber-400">{statusMap.pending.count}</p>
                        <p className="text-xs text-muted-foreground mt-1">{statusMap.pending.days} days awaiting decision</p>
                      </div>
                      <div className="rounded-xl bg-amber-500/10 dark:bg-amber-500/20 p-3 text-amber-600 dark:text-amber-400">
                        <Clock className="h-6 w-6" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 4: Rejected Requests */}
                  <Card className="relative overflow-hidden border-0 shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-rose-500/10 to-red-600/5 dark:from-rose-500/5 dark:to-red-600/2">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rejected Requests</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight text-rose-600 dark:text-rose-400">{statusMap.rejected.count}</p>
                        <p className="text-xs text-muted-foreground mt-1">{statusMap.rejected.days} days rejected</p>
                      </div>
                      <div className="rounded-xl bg-rose-500/10 dark:bg-rose-500/20 p-3 text-rose-600 dark:text-rose-400">
                        <XCircle className="h-6 w-6" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 2. Main Dashboard Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status Breakdown & Ratio (Spans 2 columns on lg) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Status Ratio Stack Bar */}
                    <Card className="border border-border/40 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Request Status Distribution
                        </CardTitle>
                        <CardDescription>Visual breakdown of leave request status ratios</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Segmented Progress Bar */}
                        <div className="h-6 w-full rounded-full bg-muted/40 overflow-hidden flex mb-6">
                          {statusMap.approved.count > 0 && (
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-500 relative group"
                              style={{ width: `${approvedPct}%` }}
                              title={`Approved: ${statusMap.approved.count} requests (${approvedPct}%)`}
                            />
                          )}
                          {statusMap.pending.count > 0 && (
                            <div 
                              className="bg-amber-500 h-full transition-all duration-500 relative group"
                              style={{ width: `${pendingPct}%` }}
                              title={`Pending: ${statusMap.pending.count} requests (${pendingPct}%)`}
                            />
                          )}
                          {statusMap.rejected.count > 0 && (
                            <div 
                              className="bg-rose-500 h-full transition-all duration-500 relative group"
                              style={{ width: `${rejectedPct}%` }}
                              title={`Rejected: ${statusMap.rejected.count} requests (${rejectedPct}%)`}
                            />
                          )}
                          {(statusMap.cancelled.count > 0 || statusMap.other.count > 0) && (
                            <div 
                              className="bg-slate-400 h-full transition-all duration-500 relative group"
                              style={{ width: `${otherPct}%` }}
                              title={`Other: ${statusMap.cancelled.count + statusMap.other.count} requests (${otherPct}%)`}
                            />
                          )}
                        </div>

                        {/* Detailed Legend */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/10 transition-colors">
                            <span className="h-3 w-3 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold">Approved</p>
                              <p className="text-base font-bold mt-0.5">{statusMap.approved.count}</p>
                              <p className="text-[10px] text-muted-foreground">{approvedPct}% of total</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/10 transition-colors">
                            <span className="h-3 w-3 rounded-full bg-amber-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold">Pending</p>
                              <p className="text-base font-bold mt-0.5">{statusMap.pending.count}</p>
                              <p className="text-[10px] text-muted-foreground">{pendingPct}% of total</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/10 transition-colors">
                            <span className="h-3 w-3 rounded-full bg-rose-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold">Rejected</p>
                              <p className="text-base font-bold mt-0.5">{statusMap.rejected.count}</p>
                              <p className="text-[10px] text-muted-foreground">{rejectedPct}% of total</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/10 transition-colors">
                            <span className="h-3 w-3 rounded-full bg-slate-400 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold">Cancelled/Other</p>
                              <p className="text-base font-bold mt-0.5">{statusMap.cancelled.count + statusMap.other.count}</p>
                              <p className="text-[10px] text-muted-foreground">{otherPct}% of total</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Leave Types Detailed Dashboard */}
                    <Card className="border border-border/40 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Leave Types Breakdown
                        </CardTitle>
                        <CardDescription>Distribution of requests and approval rates by leave type</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(statistics.leaveTypeStats || []).length > 0 ? (
                            (statistics.leaveTypeStats || []).map((stat) => {
                              const style = getLeaveTypeStyle(stat._id);
                              const approvalRate = stat.totalDays > 0 ? Math.round((stat.approvedDays / stat.totalDays) * 100) : 0;
                              
                              return (
                                <div key={stat._id} className="border border-border/20 rounded-xl p-4 space-y-3 hover:bg-muted/20 transition-all duration-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
                                        <Calendar className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <span className="capitalize font-semibold text-sm">{stat._id} Leave</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <Badge variant="outline" className="text-[10px] py-0 px-1">{stat.count} reqs</Badge>
                                          <span className="text-[10px] text-muted-foreground">· {stat.totalDays} total days</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-medium text-muted-foreground">Approval Rate</span>
                                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{approvalRate}%</p>
                                    </div>
                                  </div>
                                  
                                  {/* Progress bar representing approved days vs total requested days */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                      <span>Approved: <span className="font-medium text-foreground">{stat.approvedDays}d</span></span>
                                      <span>Total: {stat.totalDays}d</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${style.bar} rounded-full transition-all duration-500`}
                                        style={{ width: `${Math.max(approvalRate, stat.approvedDays > 0 ? 5 : 0)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-2 text-center py-6 text-muted-foreground text-sm">
                              No leave type statistics found for this year.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Department Distribution (Spans 1 column on lg) */}
                  <Card className="border border-border/40 shadow-sm h-full">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        By Department
                      </CardTitle>
                      <CardDescription>Leave requests volume across clinic departments</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {(statistics.departmentStats || []).length > 0 ? (
                        (statistics.departmentStats || []).map((stat) => {
                          const pct = Math.round((stat.count / maxDeptRequests) * 100);
                          return (
                            <div key={stat._id} className="space-y-2 group">
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{stat._id}</span>
                                <div className="text-right">
                                  <span className="font-bold">{stat.count} requests</span>
                                  <span className="text-xs text-muted-foreground ml-2">({stat.totalDays} days)</span>
                                </div>
                              </div>
                              <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 group-hover:opacity-90"
                                  style={{ width: `${Math.max(pct, 3)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No department leave records found.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* View Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Leave Request Details</CardTitle>
              <CardDescription>
                View detailed information about this leave request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Staff Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Staff Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {(selectedRequest.staffId.firstName?.charAt(0) || '?')}{(selectedRequest.staffId.lastName?.charAt(0) || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {selectedRequest.staffId.firstName || 'Unknown'} {selectedRequest.staffId.lastName || 'User'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p>{selectedRequest.staffId.email || 'No email'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                    <p>{selectedRequest.staffId.role || 'No role'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                    <p>{selectedRequest.staffId.department || 'No department'}</p>
                  </div>
                </div>
              </div>

              {/* Leave Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Leave Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Leave Type</Label>
                    <div>{getLeaveTypeBadge(selectedRequest.leaveType)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                    <p>
                      {selectedRequest.numberOfDays} day{selectedRequest.numberOfDays !== 1 ? 's' : ''}
                      {selectedRequest.isHalfDay && ` (${selectedRequest.halfDayType})`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Period</Label>
                    <p>{formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Requested At</Label>
                    <p>{formatDate(selectedRequest.requestedAt)}</p>
                  </div>
                  {selectedRequest.approvedAt && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Approved At</Label>
                      <p>{formatDate(selectedRequest.approvedAt)}</p>
                    </div>
                  )}
                  {selectedRequest.approvedBy && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Approved By</Label>
                      <p>{selectedRequest.approvedBy.firstName} {selectedRequest.approvedBy.lastName}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedRequest.reason}</p>
                  </div>
                </div>
                {selectedRequest.rejectionReason && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="whitespace-pre-wrap text-destructive">{selectedRequest.rejectionReason}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              {selectedRequest.emergencyContact && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                      <p>{selectedRequest.emergencyContact.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p>{selectedRequest.emergencyContact.phone}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Relationship</Label>
                      <p>{selectedRequest.emergencyContact.relationship}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Attachments</h3>
                  <div className="space-y-2">
                    {selectedRequest.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{attachment.filename}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-4 border-t">
                <Button
                  onClick={() => generatePDF(selectedRequest)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Leave Request</CardTitle>
              <CardDescription>
                Please provide a reason for rejecting this leave request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  rows={4}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleReject} className="flex-1">
                  Reject Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedRequest(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete Leave Request</CardTitle>
              <CardDescription>
                Are you sure you want to delete this leave request? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedRequest && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-2 text-sm">
                    <p><strong>Staff:</strong> {selectedRequest.staffId.firstName || 'Unknown'} {selectedRequest.staffId.lastName || 'User'}</p>
                    <p><strong>Leave Type:</strong> {selectedRequest.leaveType.charAt(0).toUpperCase() + selectedRequest.leaveType.slice(1)}</p>
                    <p><strong>Period:</strong> {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}</p>
                    <p><strong>Requested:</strong> {formatDate(selectedRequest.requestedAt)}</p>
                  </div>
                </div>
              )}
              <div className="flex space-x-2">
                <Button onClick={handleDelete} variant="destructive" className="flex-1">
                  Delete Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
