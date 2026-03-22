import React, { useState, useEffect } from 'react';
import { Service } from '../../types/service';
import inventoryService, { InventoryItem } from '../../services/inventoryService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';

const categories = ['consultation', 'procedure', 'lab', 'imaging', 'injection', 'ultrasound', 'blood_test', 'rbs', 'other'];

interface ServiceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Service>) => Promise<void>;
  initialData?: Partial<Service>;
  loading?: boolean;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ open, onClose, onSubmit, initialData = {}, loading }) => {
  const [form, setForm] = useState<Partial<Service>>({
    name: '',
    code: '',
    category: 'other' as 'consultation' | 'procedure' | 'lab' | 'imaging' | 'injection' | 'ultrasound' | 'blood_test' | 'rbs' | 'other',
    price: 0,
    unit: '',
    description: '',
    isActive: true,
    linkedInventoryItems: [],
    // Add inventory fields
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    ...initialData,
  });
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const formData = {
      name: '',
      code: '',
      category: 'other' as 'consultation' | 'procedure' | 'lab' | 'imaging' | 'injection' | 'ultrasound' | 'blood_test' | 'rbs' | 'other',
      price: 0,
      unit: '',
      description: '',
      isActive: true,
      linkedInventoryItems: [],
      // Add inventory fields
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      ...initialData,
    };
    setForm(formData);
    setErrors({});
    if (open) {
      (async () => {
        try {
          setInventoryLoading(true);
          const items = await inventoryService.getAllInventoryItems();
          setInventoryList(items);
        } catch (err) {
          console.error('Failed to load inventory items', err);
        } finally {
          setInventoryLoading(false);
        }
      })();
    }
  }, [initialData, open]);

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!form.name) errs.name = 'Name is required';
    if (!form.category) errs.category = 'Category is required';
    if (form.price === undefined || form.price === null || isNaN(Number(form.price)) || Number(form.price) < 0) errs.price = 'Price must be a positive number';
    if (form.quantity === undefined || form.quantity === null || isNaN(Number(form.quantity)) || Number(form.quantity) < 0) errs.quantity = 'Quantity must be a positive number';
    if (form.costPrice === undefined || form.costPrice === null || isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) errs.costPrice = 'Cost price must be a positive number';
    if (form.sellingPrice === undefined || form.sellingPrice === null || isNaN(Number(form.sellingPrice)) || Number(form.sellingPrice) < 0) errs.sellingPrice = 'Selling price must be a positive number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: keyof Service, value: any) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Auto-calculate selling price if not manually set
      if (field === 'price' && (!prev.sellingPrice || prev.sellingPrice === 0)) {
        newForm.sellingPrice = value;
      }
      
      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form._id ? 'Edit Service' : 'Add Service'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Basic Service Information */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name || ''}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Enter service name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code || ''}
                onChange={e => handleChange('code', e.target.value)}
                placeholder="Enter service code"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={form.category || 'other'}
                onChange={(e) => {
                  console.log('Category changed to:', e.target.value);
                  handleChange('category', e.target.value);
                }}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${errors.category ? 'border-destructive' : ''}`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
              <p className="text-xs text-muted-foreground">Selected: {form.category}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Service Price *</Label>
              <Input
                id="price"
                type="number"
                value={form.price || ''}
                onChange={e => handleChange('price', Number(e.target.value))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={form.unit || ''}
                onChange={e => handleChange('unit', e.target.value)}
                placeholder="e.g., ml, units, service"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Enter service description"
                rows={2}
              />
            </div>

            {/* Inventory Information */}
            <div className="mt-6 mb-4">
              <h4 className="text-lg font-medium text-foreground mb-2">Inventory Settings</h4>
              <p className="text-sm text-muted-foreground">
                Configure inventory details for this service. When you create this service, an inventory item will be automatically created with these settings.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Initial Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={form.quantity || ''}
                  onChange={e => handleChange('quantity', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                  className={errors.quantity ? 'border-destructive' : ''}
                />
                {errors.quantity ? (
                  <p className="text-sm text-destructive">{errors.quantity}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Initial stock quantity</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price *</Label>
                <Input
                  id="costPrice"
                  type="number"
                  value={form.costPrice || ''}
                  onChange={e => handleChange('costPrice', Number(e.target.value))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={errors.costPrice ? 'border-destructive' : ''}
                />
                {errors.costPrice ? (
                  <p className="text-sm text-destructive">{errors.costPrice}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Cost per unit</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  value={form.sellingPrice || ''}
                  onChange={e => handleChange('sellingPrice', Number(e.target.value))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={errors.sellingPrice ? 'border-destructive' : ''}
                />
                {errors.sellingPrice ? (
                  <p className="text-sm text-destructive">{errors.sellingPrice}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Selling price per unit</p>
                )}
              </div>
            </div>

            {/***** Linked Inventory Items *****/}
            <div className="space-y-2">
              <Label>Link to Existing Inventory Items (Optional)</Label>
              {inventoryLoading ? (
                <div className="flex justify-center py-4">
                  <Skeleton className="h-6 w-24" />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Selected inventory items will be linked to this service</p>
                  {/* Note: This would need a proper multi-select component for full functionality */}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Switch
                id="isActive"
                checked={!!form.isActive}
                onCheckedChange={checked => handleChange('isActive', checked)}
              />
              <Label htmlFor="isActive" className="text-sm font-medium">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Skeleton className="mr-2 h-4 w-4" />
                  {form._id ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                form._id ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm; 