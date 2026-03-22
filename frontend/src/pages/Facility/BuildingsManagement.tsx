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
import facilityService, { Building } from '../../services/facilityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';

interface BuildingsManagementProps {
  buildings: Building[];
}

const BuildingsManagement: React.FC<BuildingsManagementProps> = ({ buildings }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    floors: 1,
    status: 'active',
    contactPerson: '',
    contactNumber: '',
    description: '',
    dateBuilt: '',
    lastRenovation: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddBuilding = async () => {
    setIsLoading(true);
    try {
      const buildingData = {
        ...formData,
        status: formData.status as 'active' | 'maintenance' | 'construction'
      };
      await facilityService.createBuilding(buildingData);
      setIsAddDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error creating building:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBuilding = (building: Building) => {
    setSelectedBuilding(building);
    setFormData({
      name: building.name,
      address: building.address,
      floors: building.floors,
      status: building.status,
      contactPerson: building.contactPerson,
      contactNumber: building.contactNumber,
      description: building.description || '',
      dateBuilt: building.dateBuilt || '',
      lastRenovation: building.lastRenovation || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBuilding = async () => {
    if (!selectedBuilding) return;
    
    setIsLoading(true);
    try {
      const buildingData = {
        ...formData,
        status: formData.status as 'active' | 'maintenance' | 'construction'
      };
      await facilityService.updateBuilding(selectedBuilding.id, buildingData);
      setIsEditDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error updating building:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmation = (building: Building) => {
    setSelectedBuilding(building);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBuilding = async () => {
    if (!selectedBuilding) return;
    
    setIsLoading(true);
    try {
      await facilityService.deleteBuilding(selectedBuilding.id);
      setIsDeleteDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error deleting building:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColorMap: Record<string, string> = {
    active: 'bg-primary/20 text-primary',
    maintenance: 'bg-accent/20 text-accent-foreground',
    construction: 'bg-primary/20 text-primary'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Buildings Management</h2>
        <Button onClick={() => {
          setFormData({
            name: '',
            address: '',
            floors: 1,
            status: 'active',
            contactPerson: '',
            contactNumber: '',
            description: '',
            dateBuilt: '',
            lastRenovation: ''
          });
          setIsAddDialogOpen(true);
        }}>
          Add Building
        </Button>
      </div>

      <Card className="bg-primary-foreground">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Floors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.length > 0 ? (
                buildings.map(building => (
                  <TableRow key={building.id}>
                    <TableCell className="font-medium">{building.name}</TableCell>
                    <TableCell>{building.address}</TableCell>
                    <TableCell>{building.floors}</TableCell>
                    <TableCell>
                      <Badge className={statusColorMap[building.status] || 'bg-muted/20'}>
                        {building.status.charAt(0).toUpperCase() + building.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{building.contactPerson}</TableCell>
                    <TableCell>{building.contactNumber}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditBuilding(building)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteConfirmation(building)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No buildings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Building Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Building</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Building Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Building"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floors">Number of Floors</Label>
                <Input
                  id="floors"
                  name="floors"
                  type="number"
                  min="1"
                  value={formData.floors.toString()}
                  onChange={handleInputChange}
                />
              </div>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="Building administrator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateBuilt">Date Built</Label>
                <Input
                  id="dateBuilt"
                  name="dateBuilt"
                  type="date"
                  value={formData.dateBuilt}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastRenovation">Last Renovation</Label>
                <Input
                  id="lastRenovation"
                  name="lastRenovation"
                  type="date"
                  value={formData.lastRenovation}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional details about the building"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBuilding} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Building'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Building Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Building</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Building Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-floors">Number of Floors</Label>
                <Input
                  id="edit-floors"
                  name="floors"
                  type="number"
                  min="1"
                  value={formData.floors.toString()}
                  onChange={handleInputChange}
                />
              </div>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contactPerson">Contact Person</Label>
                <Input
                  id="edit-contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactNumber">Contact Number</Label>
                <Input
                  id="edit-contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dateBuilt">Date Built</Label>
                <Input
                  id="edit-dateBuilt"
                  name="dateBuilt"
                  type="date"
                  value={formData.dateBuilt}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastRenovation">Last Renovation</Label>
                <Input
                  id="edit-lastRenovation"
                  name="lastRenovation"
                  type="date"
                  value={formData.lastRenovation}
                  onChange={handleInputChange}
                />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBuilding} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Building'}
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
            Are you sure you want to delete building "{selectedBuilding?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBuilding} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Building'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuildingsManagement; 