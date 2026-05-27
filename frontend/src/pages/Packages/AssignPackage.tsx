import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, Award, Calendar, DollarSign, User, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import healthPackageService, { HealthPackage } from '../../services/healthPackageService';
import patientService, { Patient } from '../../services/patientService';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';

interface AssignPackageProps {
  onComplete: () => void;
}

const AssignPackage: React.FC<AssignPackageProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<HealthPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(true);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<HealthPackage | null>(null);

  // Patient search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form states
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load catalog packages
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const catalog = await healthPackageService.getPackages();
        // Filter to only active packages for assignment
        setPackages(catalog.filter(p => p.is_active));
      } catch (error) {
        console.error('Failed to load packages:', error);
        toast.error('Failed to load package list.');
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchCatalog();
  }, []);

  // Handle clicking outside the patient dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selected package change
  useEffect(() => {
    if (selectedPackageId) {
      const pkg = packages.find(p => p._id === selectedPackageId || p.id === selectedPackageId);
      setSelectedPackage(pkg || null);
    } else {
      setSelectedPackage(null);
    }
  }, [selectedPackageId, packages]);

  // Debounced search for patients
  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      try {
        const results = await patientService.searchPatients(query);
        setSearchResults(Array.isArray(results) ? results : []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Patient search error:', error);
        toast.error('Search failed.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500)
  ).current;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setIsSearching(true);
      debouncedSearch(val);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(`${patient.firstName} ${patient.lastName}`);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Please select a patient.');
      return;
    }
    if (!selectedPackageId || !selectedPackage) {
      toast.error('Please select a package template.');
      return;
    }
    setIsSubmitting(true);
    try {
      const patientId = selectedPatient._id || selectedPatient.id;
      await healthPackageService.assignPackage(patientId, {
        package_id: selectedPackage._id || selectedPackage.id || '',
        start_date: startDate,
        amount_paid: 0
      });
      toast.success('Patient package subscribed successfully!');
      onComplete();
      navigate('/app/billing/invoices');
    } catch (error: any) {
      console.error('Failed to subscribe patient:', error);
      const msg = error?.response?.data?.message || 'Failed to assign package to patient.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto border-primary/10 rounded-2xl overflow-hidden shadow-md">
      <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-indigo-500" />
          Subscribe Patient to Health Package
        </CardTitle>
        <CardDescription>
          Assign a health package template to a patient to track their clinic visits, collect custom installment payments, and view vitals.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Patient Selector */}
          <div className="space-y-2 relative" ref={searchRef}>
            <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              1. Search Patient
            </Label>
            
            {selectedPatient ? (
              <div className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-foreground">{selectedPatient.firstName} {selectedPatient.lastName}</h4>
                  <p className="text-xs text-muted-foreground">Patient ID: {selectedPatient.patientId} | Age: {selectedPatient.age} | {selectedPatient.gender}</p>
                  <p className="text-xs text-muted-foreground">Phone: {selectedPatient.contactNumber || selectedPatient.phone || 'N/A'}</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearPatient}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  Change Patient
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Type patient name, phone number, or ID..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                  className="pl-10 h-11 rounded-xl"
                  autoComplete="off"
                />
                
                {isSearching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                    Searching...
                  </div>
                )}
                
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-background border border-border shadow-xl rounded-xl max-h-60 overflow-y-auto divide-y divide-border">
                    {searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No patients found matching "{searchQuery}"
                      </div>
                    ) : (
                      searchResults.map((p) => (
                        <div 
                          key={p._id || p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-3 hover:bg-muted/40 cursor-pointer transition-colors flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-sm">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-muted-foreground">ID: {p.patientId} • Phone: {p.contactNumber || p.phone || 'N/A'}</p>
                          </div>
                          <span className="text-xs font-semibold bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground">
                            {p.gender} • {p.age} yrs
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Package Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" />
              2. Select Health Package Template
            </Label>
            
            {isLoadingPackages ? (
              <div className="h-10 bg-muted animate-pulse rounded-xl" />
            ) : (
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Choose package catalog template..." />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg._id} value={pkg._id || ''}>
                      {pkg.name} — {pkg.price.toLocaleString()} ETB ({pkg.total_visits} Visits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Selected Package Preview Details */}
            {selectedPackage && (
              <div className="bg-gradient-to-br from-indigo-500/5 via-transparent to-pink-500/5 border border-primary/5 p-5 rounded-2xl mt-3 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-indigo-950 dark:text-indigo-100">{selectedPackage.name}</h4>
                    <p className="text-xs text-muted-foreground max-w-lg mt-1">{selectedPackage.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-foreground">{selectedPackage.price.toLocaleString()} ETB</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-border/40 py-3 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Validity Period: {selectedPackage.validity_days} Days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-500" />
                    <span>Total Visits Included: {selectedPackage.total_visits}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground/80 mb-2">Included Tests & Services:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPackage.services.map((srv, idx) => (
                      <span key={idx} className="bg-background border border-border/60 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date and Payment Info */}
          {selectedPackage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/40 pt-6">
              
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Subscription Start Date
                </Label>
                <Input 
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Expiry date will auto-calculate to {(selectedPackage) ? new Date(new Date(startDate).getTime() + selectedPackage.validity_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 'N/A'}.
                </p>
              </div>

              <div className="space-y-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl">
                <div className="flex items-start gap-3 text-left">
                  <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">Billing Information</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Confirming this subscription will automatically generate a pending EMR invoice of <strong className="text-foreground">{selectedPackage.price.toLocaleString()} ETB</strong>. 
                      The patient must make the payment (fully or partially) at the Billing Department, where the cashier can process it using cash, card, bank transfer, or insurance.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border/40 pt-5">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onComplete}
              disabled={isSubmitting}
              className="rounded-xl px-5 h-11"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedPatient || !selectedPackageId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-11 shadow-md"
            >
              {isSubmitting ? 'Subscribing...' : 'Confirm Subscription'}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
};

export default AssignPackage;
