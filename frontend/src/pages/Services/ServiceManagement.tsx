import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Edit, CheckCircle, XCircle, Plus, Link as LinkIcon, Package } from 'lucide-react';
import serviceService from '../../services/serviceService';
import { Service } from '../../types/service';
import ServiceForm from './ServiceForm';
import { toast } from 'react-toastify';

const categories = [
  'consultation', 'procedure', 
  // Lab service categories (same as lab items)
  'chemistry', 'hematology', 'parasitology', 'immunology', 'urinalysis', 'endocrinology', 'cardiology', 'tumor-markers',
  'imaging', 'injection', 'ultrasound', 'blood_test', 'rbs', 'other'
];

const ServiceManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [active, setActive] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (category && category !== 'all') params.category = category;
      if (active !== 'all') params.active = active === 'active';

        console.log('🔍 Fetching services with inventory status...');
        // ✅ ENHANCEMENT: Fetch services with inventory information
        const data = await serviceService.getAllWithInventory(params);
        console.log('📋 Services fetched with inventory:', data);
        console.log('📋 Services count:', data.length);
        setServices(data);
    } catch (err: any) {
      console.error('❌ Error fetching services:', err);
      setError(err.response?.data?.message || 'Failed to fetch services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line
  }, [search, category, active]);

  const handleAdd = () => {
    setEditService(null);
    setFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditService(service);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Partial<Service>) => {
    setFormLoading(true);
    try {
      if (editService && editService._id) {
        await serviceService.update(editService._id, data);
        toast.success('Service updated');
      } else {
        await serviceService.create(data);
        toast.success('Service created');
      }
      setFormOpen(false);
      fetchServices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save service.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      if (service.isActive) {
        await serviceService.deactivate(service._id);
        toast.success('Service deactivated');
      } else {
        await serviceService.activate(service._id);
        toast.success('Service activated');
      }
      fetchServices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleLinkInventory = async (service: any) => {
    try {
      // If service has a suggestion for matching inventory item
      if (service.inventoryStatus?.suggestion?.available) {
        await serviceService.linkInventory(service._id, service.inventoryStatus.suggestion.inventoryItemId);
        toast.success(`Linked to ${service.inventoryStatus.suggestion.inventoryItemName}`);
        fetchServices();
      } else {
        // Open edit form to manually link inventory
        handleEdit(service);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to link inventory.');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Service Management</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <Input
              placeholder="Search by name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={active} onValueChange={setActive}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-48">
              <Skeleton className="h-8 w-32" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-8">{error}</p>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Code</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
                    <TableHead className="text-muted-foreground">Price</TableHead>
                    <TableHead className="text-muted-foreground">Unit</TableHead>
                    <TableHead className="text-muted-foreground">Inventory Status</TableHead>
                    <TableHead className="text-muted-foreground">Stock</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map(service => (
                    <TableRow key={service._id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{service.name}</TableCell>
                      <TableCell className="text-muted-foreground">{service.code}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{service.price.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{service.unit}</TableCell>
                      <TableCell>
                        {service.inventoryStatus?.linked ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        ) : service.inventoryStatus?.suggestion?.available ? (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            <Package className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Linked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {service.inventoryStatus?.linked ? (
                          <span className="font-medium">{service.inventoryStatus.quantity}</span>
                        ) : service.inventoryStatus?.suggestion?.available ? (
                          <span className="text-yellow-600">{service.inventoryStatus.suggestion.quantity}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {service.isActive ? (
                          <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(service)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit service"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!service.inventoryStatus?.linked && service.inventoryStatus?.suggestion?.available && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLinkInventory(service)}
                              className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700"
                              title={`Link to ${service.inventoryStatus.suggestion.inventoryItemName}`}
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(service)}
                            className={`h-8 w-8 p-0 ${service.isActive ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            title={service.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {service.isActive ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <ServiceForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSubmit={handleFormSubmit}
            initialData={editService || {}}
            loading={formLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceManagement;
