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
import facilityService, { Department, Building } from '../../services/facilityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';

interface DepartmentsManagementProps {
  departments: Department[];
  buildings: Building[];
}

const DepartmentsManagement: React.FC<DepartmentsManagementProps> = ({ departments, buildings }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: '',
    head: '',
    staffCount: 0,
    status: 'active',
    description: '',
    contactExtension: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [availableFloors, setAvailableFloors] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'building') {
      // When building changes, get available floors
      const selectedBuilding = buildings.find(b => b.name === value);
      if (selectedBuilding) {
        const floors = Array.from({ length: selectedBuilding.floors }, (_, i) => (i + 1).toString());
        setAvailableFloors(floors);
        setFormData(prev => ({ ...prev, [name]: value, floor: '1' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleAddDepartment = async () => {
    setIsLoading(true);
    try {
      const departmentData = {
        ...formData,
        status: formData.status as 'active' | 'inactive'
      };
      await facilityService.createDepartment(departmentData);
      setIsAddDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error creating department:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    
    // Get available floors for the selected building
    const selectedBuilding = buildings.find(b => b.name === department.building);
    if (selectedBuilding) {
      const floors = Array.from({ length: selectedBuilding.floors }, (_, i) => (i + 1).toString());
      setAvailableFloors(floors);
    }
    
    setFormData({
      name: department.name,
      building: department.building,
      floor: department.floor,
      head: department.head,
      staffCount: department.staffCount,
      status: department.status,
      description: department.description || '',
      contactExtension: department.contactExtension || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (!selectedDepartment) return;
    
    setIsLoading(true);
    try {
      const departmentData = {
        ...formData,
        status: formData.status as 'active' | 'inactive'
      };
      await facilityService.updateDepartment(selectedDepartment.id, departmentData);
      setIsEditDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error updating department:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmation = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;
    
    setIsLoading(true);
    try {
      await facilityService.deleteDepartment(selectedDepartment.id);
      setIsDeleteDialogOpen(false);
      // Refresh data would be handled by parent component
    } catch (error) {
      console.error('Error deleting department:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColorMap: Record<string, string> = {
    active: 'bg-primary/20 text-primary',
    inactive: 'bg-destructive/20 text-destructive'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Departments Management</h2>
        <Button onClick={() => {
          // Set default building and get available floors
          if (buildings.length > 0) {
            const defaultBuilding = buildings[0];
            const floors = Array.from({ length: defaultBuilding.floors }, (_, i) => (i + 1).toString());
            setAvailableFloors(floors);
            
            setFormData({
              name: '',
              building: defaultBuilding.name,
              floor: '1',
              head: '',
              staffCount: 0,
              status: 'active',
              description: '',
              contactExtension: ''
            });
          } else {
            setFormData({
              name: '',
              building: '',
              floor: '',
              head: '',
              staffCount: 0,
              status: 'active',
              description: '',
              contactExtension: ''
            });
          }
          setIsAddDialogOpen(true);
        }}>
          Add Department
        </Button>
      </div>

      <Card className="bg-primary-foreground">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Staff Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length > 0 ? (
                departments.map(department => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">{department.name}</TableCell>
                    <TableCell>{department.building}</TableCell>
                    <TableCell>{department.floor}</TableCell>
                    <TableCell>{department.head}</TableCell>
                    <TableCell>{department.staffCount}</TableCell>
                    <TableCell>
                      <Badge className={statusColorMap[department.status] || 'bg-muted/20'}>
                        {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{department.contactExtension || '—'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditDepartment(department)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteConfirmation(department)}
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
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Department Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Cardiology, Pediatrics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('building', value)}
                  value={formData.building}
                >
                  <SelectTrigger id="building">
                    <SelectValue placeholder="Select Building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.name}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('floor', value)}
                  value={formData.floor}
                >
                  <SelectTrigger id="floor">
                    <SelectValue placeholder="Select Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFloors.map(floor => (
                      <SelectItem key={floor} value={floor}>
                        {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="head">Head of Department</Label>
                <Input
                  id="head"
                  name="head"
                  value={formData.head}
                  onChange={handleInputChange}
                  placeholder="e.g., Dr. John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffCount">Staff Count</Label>
                <Input
                  id="staffCount"
                  name="staffCount"
                  type="number"
                  min="0"
                  value={formData.staffCount.toString()}
                  onChange={handleNumberInputChange}
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactExtension">Contact Extension</Label>
                <Input
                  id="contactExtension"
                  name="contactExtension"
                  value={formData.contactExtension}
                  onChange={handleInputChange}
                  placeholder="e.g., x1234"
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
                placeholder="Additional details about the department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDepartment} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-building">Building</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('building', value)}
                  value={formData.building}
                >
                  <SelectTrigger id="edit-building">
                    <SelectValue placeholder="Select Building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.name}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-floor">Floor</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('floor', value)}
                  value={formData.floor}
                >
                  <SelectTrigger id="edit-floor">
                    <SelectValue placeholder="Select Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFloors.map(floor => (
                      <SelectItem key={floor} value={floor}>
                        {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-head">Head of Department</Label>
                <Input
                  id="edit-head"
                  name="head"
                  value={formData.head}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-staffCount">Staff Count</Label>
                <Input
                  id="edit-staffCount"
                  name="staffCount"
                  type="number"
                  min="0"
                  value={formData.staffCount.toString()}
                  onChange={handleNumberInputChange}
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactExtension">Contact Extension</Label>
                <Input
                  id="edit-contactExtension"
                  name="contactExtension"
                  value={formData.contactExtension}
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
            <Button onClick={handleUpdateDepartment} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Department'}
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
            Are you sure you want to delete the "{selectedDepartment?.name}" department? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDepartment} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentsManagement; 