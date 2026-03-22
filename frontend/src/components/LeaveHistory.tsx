import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from './ui/use-toast';
import api from '../services/apiService';

interface LeaveRequest {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  isHalfDay: boolean;
  halfDayType?: string;
}

const LeaveHistory: React.FC = () => {
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchLeaveHistory();
  }, [selectedYear]);

  const fetchLeaveHistory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/leave/my-leaves?year=${selectedYear}`);
      console.log('📋 [LeaveHistory] API Response:', response.data);
      console.log('📋 [LeaveHistory] Data structure:', {
        hasData: !!response.data.data,
        hasLeaveRequests: !!response.data.data?.leaveRequests,
        leaveRequestsType: typeof response.data.data?.leaveRequests,
        leaveRequestsLength: response.data.data?.leaveRequests?.length
      });
      const leaveRequestsData = response.data.data?.leaveRequests || response.data.leaves || response.data || [];
      // Ensure it's always an array
      const safeLeaveRequests = Array.isArray(leaveRequestsData) ? leaveRequestsData : [];
      console.log('📋 [LeaveHistory] Final leaveRequests:', safeLeaveRequests);
      setLeaveRequests(safeLeaveRequests);
    } catch (error) {
      console.error('Error fetching leave history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (leaveId: string) => {
    try {
      await api.patch(`/api/leave/${leaveId}/cancel`);
      toast({
        title: "Success",
        description: "Leave request cancelled successfully",
        variant: "default"
      });
      fetchLeaveHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cancel request",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-accent/20 text-accent-foreground', icon: Clock },
      'pending review': { color: 'bg-accent/20 text-accent-foreground', icon: Clock },
      approved: { color: 'bg-primary/20 text-primary', icon: CheckCircle },
      rejected: { color: 'bg-destructive/20 text-destructive', icon: XCircle },
      cancelled: { color: 'bg-muted/20 text-muted-foreground', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status === 'pending review' ? 'Pending Review' : status.charAt(0).toUpperCase() + status.slice(1)}
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
        {type.charAt(0).toUpperCase() + type.slice(1)}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">My Leave History</h2>
          <p className="text-muted-foreground">View all your leave requests and their status</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-border/40 rounded-md px-3 py-1 text-sm"
          >
            {[2023, 2024, 2025, 2026].map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {leaveRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No leave requests found for {selectedYear}</p>
              <p className="text-sm text-muted-foreground/50 mt-2">
                You haven't submitted any leave requests this year
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {leaveRequests.map((request) => (
            <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {getLeaveTypeBadge(request.leaveType)}
                      {getStatusBadge(request.status)}
                      <span className="text-sm font-medium">
                        {request.numberOfDays} day{request.numberOfDays !== 1 ? 's' : ''}
                        {request.isHalfDay && ` (${request.halfDayType})`}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">Period:</span> {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Reason:</span> {request.reason}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Requested on {formatDate(request.requestedAt)}
                      </div>
                      
                      {request.approvedBy && (
                        <div className="text-sm text-muted-foreground">
                          {request.status === 'approved' ? 'Approved' : 'Processed'} by {request.approvedBy.firstName} {request.approvedBy.lastName}
                          {request.approvedAt && ` on ${formatDate(request.approvedAt)}`}
                        </div>
                      )}
                      
                      {request.rejectionReason && (
                        <div className="text-sm text-destructive">
                          <span className="font-medium">Rejection Reason:</span> {request.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {request.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelRequest(request._id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      {leaveRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary for {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {leaveRequests.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-foreground">
                  {leaveRequests.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {leaveRequests.filter(r => r.status === 'approved').length}
                </div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {leaveRequests.filter(r => r.status === 'rejected').length}
                </div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeaveHistory;
