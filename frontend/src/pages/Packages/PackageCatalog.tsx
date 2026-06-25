import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import Dialog from '../../components/ui/dialog-wrapper';
import { Plus, Award, Calendar, Layers, CheckCircle2, AlertCircle, X, DollarSign, Activity, Edit, Power } from 'lucide-react';
import healthPackageService, { HealthPackage } from '../../services/healthPackageService';
import toast from 'react-hot-toast';

interface PackageCatalogProps {
  canManage: boolean;
}

const PackageCatalog: React.FC<PackageCatalogProps> = ({ canManage }) => {
  const [packages, setPackages] = useState<HealthPackage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [totalVisits, setTotalVisits] = useState<number>(5);
  const [validityDays, setValidityDays] = useState<number>(180);
  const [price, setPrice] = useState<number>(0);
  const [serviceInput, setServiceInput] = useState<string>('');
  const [services, setServices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const data = await healthPackageService.getPackages();
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
      toast.error('Failed to load package catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleAddService = () => {
    if (serviceInput.trim() && !services.includes(serviceInput.trim())) {
      setServices([...services, serviceInput.trim()]);
      setServiceInput('');
    }
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddService();
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTotalVisits(5);
    setValidityDays(180);
    setPrice(0);
    setServiceInput('');
    setServices([]);
  };

  const handleOpenEdit = (pkg: HealthPackage) => {
    setEditingPackageId(pkg._id || pkg.id || null);
    setName(pkg.name);
    setDescription(pkg.description || '');
    setTotalVisits(pkg.total_visits);
    setValidityDays(pkg.validity_days);
    setPrice(pkg.price);
    setServices(pkg.services || []);
    setIsCreateOpen(true);
  };

  const handleToggleStatus = async (pkg: HealthPackage) => {
    const newStatus = !pkg.is_active;
    const pkgId = pkg._id || pkg.id;
    if (!pkgId) return;

    try {
      await healthPackageService.updatePackage(pkgId, {
        is_active: newStatus
      });
      toast.success(`Package template ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchPackages();
    } catch (error) {
      console.error('Failed to toggle package status:', error);
      toast.error('Failed to update package status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Package name is required.');
      return;
    }
    if (totalVisits <= 0) {
      toast.error('Total visits must be greater than 0.');
      return;
    }
    if (validityDays <= 0) {
      toast.error('Validity period must be greater than 0 days.');
      return;
    }
    if (price < 0) {
      toast.error('Price cannot be negative.');
      return;
    }
    if (services.length === 0) {
      toast.error('Please add at least one service/test included in the package.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPackageId) {
        await healthPackageService.updatePackage(editingPackageId, {
          name,
          description,
          total_visits: totalVisits,
          validity_days: validityDays,
          price,
          services
        });
        toast.success('Package template updated successfully!');
      } else {
        await healthPackageService.createPackage({
          name,
          description,
          total_visits: totalVisits,
          validity_days: validityDays,
          price,
          services,
          is_active: true
        });
        toast.success('Package template created successfully!');
      }
      setIsCreateOpen(false);
      resetForm();
      setEditingPackageId(null);
      fetchPackages();
    } catch (error) {
      console.error(editingPackageId ? 'Failed to update package:' : 'Failed to create package:', error);
      toast.error(editingPackageId ? 'Failed to update package template.' : 'Failed to create package template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Available Health Packages</h2>
          <p className="text-sm text-muted-foreground">
            Configure preset templates that patients can purchase and subscribe to.
          </p>
        </div>
        {canManage && (
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md border-0"
          >
            <Plus className="w-4 h-4" /> Add Template
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-primary/5">
              <CardHeader className="h-28 bg-muted rounded-t-xl" />
              <CardContent className="space-y-3 p-6">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : packages.length === 0 ? (
        <Card className="border-dashed border-2 border-muted flex flex-col items-center justify-center p-12 text-center">
          <Award className="w-12 h-12 text-muted-foreground/45 mb-4" />
          <h3 className="text-lg font-semibold">No package templates configured</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Health packages define the total visits, duration validity, and list of tests/services included in a bundle.
          </p>
          {canManage && (
            <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
              Create First Template
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card 
              key={pkg._id} 
              className={`flex flex-col border border-primary/10 overflow-hidden hover:shadow-lg transition-all duration-300 group rounded-2xl relative ${!pkg.is_active ? 'opacity-65' : ''}`}
            >
              {/* Premium Gradient Header Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent pt-6 pb-4">
                <div className="flex justify-between items-start">
                  <Badge variant={pkg.is_active ? 'default' : 'secondary'} className={pkg.is_active ? 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20' : ''}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/40">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span>{pkg.total_visits} Visits</span>
                  </div>
                </div>
                <CardTitle className="text-xl font-bold mt-3 text-foreground group-hover:text-primary transition-colors">
                  {pkg.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-1 min-h-[40px] text-xs">
                  {pkg.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4 px-6 py-2">
                <div className="flex items-baseline gap-2 border-b border-border/40 pb-3">
                  <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {pkg.price.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">ETB</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Valid for {pkg.validity_days} days ({Math.round(pkg.validity_days/30)} Months)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span>Includes {pkg.services.length} services/tests:</span>
                  </div>
                  <ul className="grid grid-cols-1 gap-1.5 pt-1 pl-1">
                    {pkg.services.map((service, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="truncate">{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/15 border-t border-border/30 px-6 py-4 flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground font-medium">
                  <span>Template Code: {pkg._id?.substring(18).toUpperCase()}</span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(pkg)}
                      className="h-8 px-2.5 flex items-center gap-1.5 hover:bg-muted text-foreground border-border/50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(pkg)}
                      className={`h-8 px-2.5 flex items-center gap-1.5 border-border/50 ${
                        pkg.is_active
                          ? 'hover:bg-red-500/10 hover:text-red-600 hover:border-red-200'
                          : 'hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{pkg.is_active ? 'Deactivate' : 'Activate'}</span>
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog 
        isOpen={isCreateOpen} 
        onClose={() => {
          setIsCreateOpen(false);
          resetForm();
          setEditingPackageId(null);
        }}
        title={editingPackageId ? "Edit Package Template" : "Create New Package Template"}
        description={editingPackageId ? "Update the package template details like pricing, visits, duration, and services." : "Configure a health package bundle including clinical service details, visits count, validity period, and pricing details."}
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-left">
          <div className="space-y-1">
            <Label htmlFor="pkg-name">Package Name</Label>
            <Input 
              id="pkg-name" 
              placeholder="e.g. Diabetic Package" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pkg-desc">Description</Label>
            <Textarea 
              id="pkg-desc" 
              placeholder="Provide a detailed explanation of what this package covers..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="pkg-visits">Total Visits</Label>
              <Input 
                id="pkg-visits" 
                type="number" 
                min={1} 
                value={totalVisits} 
                onChange={(e) => setTotalVisits(parseInt(e.target.value) || 0)} 
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pkg-validity">Validity (Days)</Label>
              <Input 
                id="pkg-validity" 
                type="number" 
                min={1} 
                value={validityDays} 
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 0)} 
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pkg-price">Price (ETB)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">ETB</span>
              <Input 
                id="pkg-price" 
                type="number" 
                min={0} 
                className="pl-12"
                value={price} 
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} 
                required
              />
            </div>
          </div>

          {/* Included Services Tags Input */}
          <div className="space-y-2">
            <Label>Included Services & Laboratory Tests</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Type service (e.g., HbA1c) and press Enter or Add" 
                value={serviceInput} 
                onChange={(e) => setServiceInput(e.target.value)} 
                onKeyDown={handleKeyPress}
              />
              <Button type="button" onClick={handleAddService} variant="secondary">Add</Button>
            </div>
            
            {services.length === 0 ? (
              <p className="text-xs text-amber-500 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Must add at least one service item to publish this package template.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto border border-border/50 p-2 rounded-lg bg-muted/30">
                {services.map((srv, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1 px-2.5 py-1 text-xs">
                    {srv}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveService(idx)}
                      className="text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
                setEditingPackageId(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (editingPackageId ? 'Saving...' : 'Creating...') : (editingPackageId ? 'Save Changes' : 'Create Template')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default PackageCatalog;
