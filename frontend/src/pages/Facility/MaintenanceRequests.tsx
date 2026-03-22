import React, { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import facilityService, { MaintenanceRequest } from '../../services/facilityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { format } from 'date-fns';

interface MaintenanceRequestsProps {
  requests: MaintenanceRequest[];
  staffMembers: { id: string; name: string }[];
}

const MaintenanceRequests: React.FC<MaintenanceRequestsProps> = ({ 
  requests, 
  staffMembers 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [formData, setFormData] = useState({
    type: 'room' as 'room' | 'equipment' | 'building',
    itemId: '',
    itemName: '',
    requestDate: format(new Date(), 'yyyy-MM-dd'),
    requestedBy: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    description: '',
    status: 'pending' as 'pending' | 'approved' | 'in-progress' | 'completed' | 'cancelled',
    assignedTo: '',
    completedDate: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRequest = async () => {
    setIsLoading(true);
    try {
      await facilityService.createMaintenanceRequest(formData);
      setIsAddDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error creating maintenance request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setFormData({
      type: request.type,
      itemId: request.itemId,
      itemName: request.itemName,
      requestDate: request.requestDate,
      requestedBy: request.requestedBy,
      priority: request.priority,
      description: request.description,
      status: request.status,
      assignedTo: request.assignedTo || '',
      completedDate: request.completedDate || '',
      notes: request.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;
    
    setIsLoading(true);
    try {
      await facilityService.updateMaintenanceRequest(selectedRequest.id, formData);
      setIsEditDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error updating maintenance request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmation = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    setIsLoading(true);
    try {
      await facilityService.deleteMaintenanceRequest(selectedRequest.id);
      setIsDeleteDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error deleting maintenance request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const priorityColorMap: Record<string, string> = {
    low: 'bg-primary/20 text-primary',
    medium: 'bg-accent/20 text-accent-foreground',
    high: 'bg-accent/20 text-accent-foreground',
    urgent: 'bg-destructive/20 text-destructive'
  };

  const statusColorMap: Record<string, string> = {
    'pending': 'bg-muted/20 text-muted-foreground',
    'approved': 'bg-primary/20 text-primary',
    'in-progress': 'bg-accent/20 text-accent-foreground',
    'completed': 'bg-primary/20 text-primary',
    'cancelled': 'bg-destructive/20 text-destructive'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Maintenance Requests</h2>
        <Button onClick={() => {
          setFormData({
            type: 'room',
            itemId: '',
            itemName: '',
            requestDate: format(new Date(), 'yyyy-MM-dd'),
            requestedBy: '',
            priority: 'medium',
            description: '',
            status: 'pending',
            assignedTo: '',
            completedDate: '',
            notes: ''
          });
          setIsAddDialogOpen(true);
        }}>
          Add Request
        </Button>
      </div>

      <Card className="bg-primary-foreground">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Date Requested</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell className="capitalize">{request.type}</TableCell>
                    <TableCell>{request.itemName}</TableCell>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell>{request.requestedBy}</TableCell>
                    <TableCell>
                      <Badge className={priorityColorMap[request.priority] || 'bg-muted/20'}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColorMap[request.status] || 'bg-muted/20'}>
                        {request.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.assignedTo || '—'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditRequest(request)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteConfirmation(request)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No maintenance requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Request Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Maintenance Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Request Type</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('type', value)}
                  value={formData.type}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('priority', value)}
                  value={formData.priority}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                placeholder="e.g., Room 101, MRI Machine"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemId">Item ID</Label>
              <Input
                id="itemId"
                name="itemId"
                value={formData.itemId}
                onChange={handleInputChange}
                placeholder="ID of the item requiring maintenance"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestDate">Request Date</Label>
                <Input
                  id="requestDate"
                  name="requestDate"
                  type="date"
                  value={formData.requestDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedBy">Requested By</Label>
                <Input
                  id="requestedBy"
                  name="requestedBy"
                  value={formData.requestedBy}
                  onChange={handleInputChange}
                  placeholder="Name of the requester"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('status', value)}
                  value={formData.status}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('assignedTo', value)}
                  value={formData.assignedTo}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder="Select Staff Member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Not Assigned</SelectItem>
                    {staffMembers.map(staff => (
                      <SelectItem key={staff.id} value={staff.name}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed description of the maintenance required"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information or instructions"
              />
            </div>
            {(formData.status === 'completed') && (
              <div className="space-y-2">
                <Label htmlFor="completedDate">Completion Date</Label>
                <Input
                  id="completedDate"
                  name="completedDate"
                  type="date"
                  value={formData.completedDate}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRequest} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Maintenance Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Request Type</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('type', value)}
                  value={formData.type}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('priority', value)}
                  value={formData.priority}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-itemName">Item Name</Label>
              <Input
                id="edit-itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-itemId">Item ID</Label>
              <Input
                id="edit-itemId"
                name="itemId"
                value={formData.itemId}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-requestDate">Request Date</Label>
                <Input
                  id="edit-requestDate"
                  name="requestDate"
                  type="date"
                  value={formData.requestDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-requestedBy">Requested By</Label>
                <Input
                  id="edit-requestedBy"
                  name="requestedBy"
                  value={formData.requestedBy}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('status', value)}
                  value={formData.status}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assignedTo">Assigned To</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('assignedTo', value)}
                  value={formData.assignedTo}
                >
                  <SelectTrigger id="edit-assignedTo">
                    <SelectValue placeholder="Select Staff Member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Not Assigned</SelectItem>
                    {staffMembers.map(staff => (
                      <SelectItem key={staff.id} value={staff.name}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Additional Notes</Label>
              <Textarea
                id="edit-notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
              />
            </div>
            {(formData.status === 'completed') && (
              <div className="space-y-2">
                <Label htmlFor="edit-completedDate">Completion Date</Label>
                <Input
                  id="edit-completedDate"
                  name="completedDate"
                  type="date"
                  value={formData.completedDate}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRequest} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete maintenance request for "{selectedRequest?.itemName}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRequest} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceRequests; 