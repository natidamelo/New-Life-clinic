import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import adminService from '../../services/adminService';
import api from '../../services/apiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import {
  QrCode, Download, CheckCircle, XCircle, UserX, Users, Shield, Smartphone,
  UserPlus, Search, ChevronDown, ChevronUp, Eye, EyeOff, Mail, KeyRound,
  Pencil, Trash2, RotateCw, RefreshCw, AlertTriangle
} from 'lucide-react';

const availableRoles = [
  'admin', 'reception', 'nurse', 'lab', 'imaging', 'doctor', 'billing', 'inventory', 'finance', 'pharmacy'
];

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  reception: 'bg-blue-100 text-blue-700 border-blue-200',
  nurse: 'bg-teal-100 text-teal-700 border-teal-200',
  lab: 'bg-purple-100 text-purple-700 border-purple-200',
  imaging: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  doctor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  billing: 'bg-amber-100 text-amber-700 border-amber-200',
  inventory: 'bg-orange-100 text-orange-700 border-orange-200',
  finance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pharmacy: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const roleIcons: Record<string, string> = {
  admin: '🛡️', reception: '🖥️', nurse: '🩺', lab: '🔬', imaging: '📡',
  doctor: '👨‍⚕️', billing: '💳', inventory: '📦', finance: '💰', pharmacy: '💊',
};

const isAdminUser = (user: { email?: string; username?: string; role?: string }): boolean => {
  if (!user) return false;
  return user.role === 'admin' ||
    (user.email != null && user.email.toLowerCase().includes('admin')) ||
    (user.username != null && user.username.toLowerCase().includes('admin'));
};

const specializations = [
  "General Medicine", "Cardiology", "Pediatrics", "Orthopedics", "Dermatology",
  "Neurology", "Gynecology", "Oncology", "Radiology", "Psychiatry", "Surgery", "Other"
];

const StaffManagement: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>('');
  const [specialization, setSpecialization] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', username: '', email: '', role: '', specialization: '',
    telegramChatId: '', telegramNotificationsEnabled: false, telegramUsername: '',
    notificationPreferences: {
      patientAssignments: true, vitalsUpdates: true, labOrders: true, imagingRequests: true,
      procedures: true, medicationOrders: true, emergencyAlerts: true, systemUpdates: false,
      billingUpdates: true, dailyRevenue: true, paymentAlerts: true, attendanceUpdates: true
    }
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedUserForQR, setSelectedUserForQR] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [deviceRegistrationStatus, setDeviceRegistrationStatus] = useState<{[key: string]: boolean}>({});
  const [deregistering, setDeregistering] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => fetchUsers(), 120000);
    return () => clearInterval(interval);
  }, []);

  const checkDeviceRegistrationStatus = async (userId: string) => {
    try {
      if (!userId || userId.length !== 24) return false;
      const response = await api.get(`/api/qr/staff-registration-status/${userId}`);
      return response?.data?.data?.isRegistered === true;
    } catch {
      return false;
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const fetchedUsers = await adminService.getUsers();
      const normalized = (fetchedUsers || []).map((u: any) => ({ ...u, _id: u._id || u.id }));
      setUsers(normalized);

      const userIds = normalized.map((user: any) => user._id || user.id).filter(Boolean);
      if (userIds.length > 0) {
        try {
          const response = await api.post('/api/qr/staff-registration-status/batch', { userIds });
          setDeviceRegistrationStatus(response.data.data || {});
        } catch {
          // Batch endpoint unavailable; skip individual lookups to avoid N+1
        }
      }
    } catch {
      toast.error("Failed to load staff list");
    } finally {
      setLoadingUsers(false);
    }
  };

  const clearForm = () => {
    setFirstName(''); setLastName(''); setUsername(''); setEmail('');
    setPassword(''); setConfirmPassword(''); setRole(''); setSpecialization('');
  };

  const handleRoleChange = (selectedRole: string) => {
    setRole(selectedRole);
    if (selectedRole !== 'doctor') setSpecialization('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match!'); return; }
    if (!role) { toast.error('Please select a role.'); return; }
    if (role === 'doctor' && !specialization) { toast.error('Specialization is required for doctors.'); return; }
    if (!firstName || !lastName || !username || !email || !password) { toast.error('Please fill in all required fields.'); return; }

    setIsLoading(true);
    try {
      const userData: any = { firstName, lastName, username, email, password, role };
      if (role === 'doctor') userData.specialization = specialization;
      await adminService.createUser(userData);
      toast.success(`Staff member '${firstName} ${lastName}' created successfully!`);
      clearForm();
      setShowCreateForm(false);
      await fetchUsers();
    } catch (error: any) {
      toast.error(`Failed to create user: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId) { toast.error("Invalid user ID."); return; }
    if (window.confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) {
      setIsLoading(true);
      try {
        await adminService.deleteUser(userId);
        toast.success("Staff member deleted successfully");
        fetchUsers();
      } catch (error: any) {
        toast.error(`Failed to delete: ${error.response?.data?.message || error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditUser = (user: any) => {
    setEditUserId(user._id || user.id);
    const userIsAdmin = isAdminUser(user);
    const userRole = userIsAdmin ? 'admin' : (user.role || '');
    const defaultPrefs = {
      patientAssignments: true, vitalsUpdates: true, labOrders: true, imagingRequests: true,
      procedures: true, medicationOrders: true, emergencyAlerts: true, systemUpdates: false,
      billingUpdates: true, dailyRevenue: true, paymentAlerts: true, attendanceUpdates: true
    };
    setEditForm({
      firstName: user.firstName || '', lastName: user.lastName || '',
      username: user.username || '', email: user.email || '',
      role: userRole, specialization: user.specialization || '',
      telegramChatId: user.telegramChatId || '',
      telegramNotificationsEnabled: user.telegramNotificationsEnabled || false,
      telegramUsername: user.telegramUsername || '',
      notificationPreferences: { ...defaultPrefs, ...(user.notificationPreferences || {}) }
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setEditForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editUserId) return;
    const originalUser = users.find(u => (u._id || u.id) === editUserId);
    const userIsAdmin = originalUser ? isAdminUser(originalUser) : false;
    const finalRole = userIsAdmin ? 'admin' : editForm.role;

    if (!editForm.firstName || !editForm.lastName || !editForm.username || !editForm.email || !finalRole) {
      setEditError('Please fill in all required fields.'); return;
    }
    if (finalRole === 'doctor' && !editForm.specialization) {
      setEditError('Specialization is required for doctors.'); return;
    }
    if (editPassword || editConfirmPassword) {
      if (editPassword.length < 6) { setEditError('Password must be at least 6 characters.'); return; }
      if (editPassword !== editConfirmPassword) { setEditError('Passwords do not match.'); return; }
    }
    setEditLoading(true);
    try {
      const { ...editPayload } = editForm;
      const updatedUser: any = { ...editPayload, role: finalRole };
      if (editPassword) updatedUser.password = editPassword;
      await adminService.updateUser(editUserId, updatedUser);
      toast.success('Staff member updated successfully');
      setEditUserId(null); setShowEditModal(false);
      setEditPassword(''); setEditConfirmPassword('');
      fetchUsers();
    } catch (error: any) {
      setEditError(error?.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const getQRCode = async (user: any) => {
    if (!user || (!user._id && !user.id)) { toast.error('Invalid user data'); return; }
    setSelectedUserForQR(user); setGeneratingQR(true); setShowQRModal(true);
    try {
      const userId = user._id || user.id;
      const response = await api.get(`/api/qr/enhanced/staff-registration/${userId}`);
      if (response.data.success && response.data.data) {
        const d = response.data.data;
        setQrCodeData({
          ...d, qrCodeDataUrl: d.qrCode, qrData: d.url, registrationUrl: d.url,
          hash: d.hash, user: d.user, generatedAt: new Date().toISOString(),
          isNew: !deviceRegistrationStatus[userId]
        });
      } else { setQrCodeData(null); }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to get QR code');
      setQrCodeData(null);
    } finally { setGeneratingQR(false); }
  };

  const generateNewQRCode = async (user: any) => {
    if (!user || (!user._id && !user.id)) { toast.error('Invalid user data'); return; }
    setSelectedUserForQR(user); setGeneratingQR(true); setShowQRModal(true);
    try {
      const response = await api.get(`/api/qr/staff-registration/${user._id || user.id}`);
      if (response.data.success && response.data.data) {
        const d = response.data.data;
        setQrCodeData({
          ...d, qrCodeDataUrl: d.qrCode || d.qrCodeDataUrl,
          qrData: d.url || d.qrData, registrationUrl: d.url || d.registrationUrl,
          hash: d.hash, user: d.user, generatedAt: new Date().toISOString(),
          isNew: true, enhanced: d.enhanced || false, version: d.version || '2.0'
        });
      } else { setQrCodeData(null); }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate QR');
      setQrCodeData(null);
    } finally { setGeneratingQR(false); }
  };

  const downloadQRCode = () => {
    if (!qrCodeData?.qrCodeDataUrl) { toast.error('No QR code data'); return; }
    const link = document.createElement('a');
    link.href = qrCodeData.qrCodeDataUrl;
    link.download = `staff-registration-${selectedUserForQR?.username || 'qr'}.png`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const deregisterCurrentDevice = async () => {
    if (!selectedUserForQR) return;
    const userId = selectedUserForQR._id || selectedUserForQR.id;
    const userName = `${selectedUserForQR.firstName} ${selectedUserForQR.lastName}`;
    if (window.confirm(`Deregister device for ${userName}? They will need to re-register.`)) {
      setDeregistering(true);
      try {
        const response = await api.post(`/api/qr/deactivate-device/${userId}`);
        if (response.data.success) {
          toast.success(`Device deregistered for ${userName}`);
          fetchUsers(); setShowQRModal(false); setQrCodeData(null); setSelectedUserForQR(null);
        } else { toast.error(response.data.message || 'Failed to deregister'); }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to deregister');
      } finally { setDeregistering(false); }
    }
  };

  const clearAllDeviceRegistrations = async () => {
    if (window.confirm('Clear ALL device registrations? All staff will need to re-register their devices. This cannot be undone.')) {
      setClearingAll(true);
      try {
        const response = await api.delete('/api/qr/clear-all-registrations');
        if (response.data.success) {
          toast.success('All device registrations cleared'); fetchUsers();
        } else { toast.error('Failed to clear registrations'); }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to clear registrations');
      } finally { setClearingAll(false); }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchQuery ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    registered: Object.values(deviceRegistrationStatus).filter(Boolean).length,
    byRole: availableRoles.reduce((acc, r) => {
      acc[r] = users.filter(u => u.role === r).length;
      return acc;
    }, {} as Record<string, number>)
  }), [users, deviceRegistrationStatus]);

  const getInitials = (first: string, last: string) =>
    `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your clinic staff members, roles, and device registrations</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
          {showCreateForm ? <ChevronUp className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showCreateForm ? 'Hide Form' : 'Add Staff Member'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.registered}</p>
              <p className="text-xs text-muted-foreground">Devices Registered</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byRole['doctor'] || 0}</p>
              <p className="text-xs text-muted-foreground">Doctors</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total - stats.registered}</p>
              <p className="text-xs text-muted-foreground">Unregistered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Staff Form (Collapsible) */}
      {showCreateForm && (
        <Card className="border-dashed border-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Create New Staff Member</CardTitle>
                <CardDescription>Fill in the details below to add a new team member</CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Personal Information
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-medium">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter first name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-medium">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter last name" required />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Account Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-xs font-medium">Username</Label>
                    <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email address" required />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5" /> Security
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required className="pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" required className="pr-10" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" /> Role Assignment
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs font-medium">Role</Label>
                    <Select value={role} onValueChange={handleRoleChange} required>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(r => (
                          <SelectItem key={r} value={r}>
                            <span className="flex items-center gap-2">
                              <span>{roleIcons[r] || '👤'}</span>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {role === 'doctor' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="specialization" className="text-xs font-medium">Specialization</Label>
                      <Select value={specialization} onValueChange={setSpecialization} required>
                        <SelectTrigger id="specialization">
                          <SelectValue placeholder="Select specialization..." />
                        </SelectTrigger>
                        <SelectContent>
                          {specializations.map(spec => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button type="button" variant="ghost" onClick={() => { clearForm(); setShowCreateForm(false); }}>Cancel</Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {isLoading ? 'Creating...' : 'Create Staff Member'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Staff List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Staff Directory</CardTitle>
              <CardDescription>{filteredUsers.length} of {users.length} members shown</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllDeviceRegistrations} disabled={clearingAll || loadingUsers}
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <UserX className="h-3.5 w-3.5" />
                {clearingAll ? 'Clearing...' : 'Clear All Devices'}
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, username, or email..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map(r => (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-2">
                      <span>{roleIcons[r]}</span> {r.charAt(0).toUpperCase() + r.slice(1)}
                      <span className="text-muted-foreground ml-1">({stats.byRole[r] || 0})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loadingUsers ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px] rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No staff members found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery || roleFilter !== 'all' ? 'Try adjusting your search or filter' : 'Click "Add Staff Member" to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user, index) => {
                const userId = user._id || user.id;
                const isRegistered = deviceRegistrationStatus[userId];
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                return (
                  <div key={userId || `user-${index}`}
                    className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200">

                    {/* Avatar */}
                    <div className={`h-11 w-11 rounded-full ${getAvatarColor(fullName)} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                      {getInitials(user.firstName, user.lastName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{fullName}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${roleColors[user.role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {roleIcons[user.role] || '👤'} {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                        </span>
                        {user.specialization && (
                          <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{user.specialization}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">{user.email}</span>
                      </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Device */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isRegistered ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {isRegistered ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span className="hidden md:inline">{isRegistered ? 'Registered' : 'Unregistered'}</span>
                      </div>

                      {/* Telegram */}
                      {user.telegramChatId && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          <span>📱</span>
                          <span className="hidden lg:inline">Telegram</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => getQRCode(user)} className="h-8 w-8 p-0" title="Show QR Code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="h-8 w-8 p-0" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => { const id = user._id || user.id; if (id) handleDeleteUser(id); }}
                        disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isRegistered && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Clear Device Registration"
                          onClick={async () => {
                            if (window.confirm(`Clear device registration for ${fullName}?`)) {
                              try {
                                const response = await api.delete(`/api/qr/deactivate-device/${userId}`);
                                if (response.data.success) {
                                  toast.success(`Device cleared for ${fullName}`);
                                  setDeviceRegistrationStatus(prev => ({ ...prev, [userId]: false }));
                                  setTimeout(() => fetchUsers(), 500);
                                }
                              } catch { toast.error('Failed to clear device'); }
                            }
                          }}>
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Staff Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Staff Member
            </DialogTitle>
            <DialogDescription>Update staff details, credentials, and notification preferences.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            {editLoading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-50 rounded-lg">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editFirstName" className="text-xs">First Name</Label>
                <Input id="editFirstName" name="firstName" value={editForm.firstName} onChange={handleEditFormChange} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editLastName" className="text-xs">Last Name</Label>
                <Input id="editLastName" name="lastName" value={editForm.lastName} onChange={handleEditFormChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editUsername" className="text-xs">Username</Label>
                <Input id="editUsername" name="username" value={editForm.username} onChange={handleEditFormChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editEmail" className="text-xs">Email</Label>
                <Input id="editEmail" name="email" type="email" value={editForm.email} onChange={handleEditFormChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editRole" className="text-xs">Role</Label>
                {(() => {
                  const originalUser = users.find(u => (u._id || u.id) === editUserId);
                  const userIsAdmin = originalUser ? isAdminUser(originalUser) : false;
                  return (
                    <>
                      <Select value={editForm.role} onValueChange={v => setEditForm(prev => ({ ...prev, role: v }))} disabled={userIsAdmin}>
                        <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(r => (
                            <SelectItem key={r} value={r}>{roleIcons[r]} {r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {userIsAdmin && <p className="text-xs text-amber-600 mt-1">Admin role cannot be changed.</p>}
                    </>
                  );
                })()}
              </div>
              {editForm.role === 'doctor' && (
                <div className="space-y-1.5">
                  <Label htmlFor="editSpecialization" className="text-xs">Specialization</Label>
                  <Select value={editForm.specialization} onValueChange={v => setEditForm(prev => ({ ...prev, specialization: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {specializations.map(spec => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="editPassword" className="text-xs">New Password <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="editPassword" type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} minLength={6} placeholder="Leave blank to keep current" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editConfirmPassword" className="text-xs">Confirm Password</Label>
                <Input id="editConfirmPassword" type="password" value={editConfirmPassword} onChange={e => setEditConfirmPassword(e.target.value)} minLength={6} placeholder="Confirm new password" />
              </div>
            </div>

            {/* Telegram Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">📱 Telegram Notifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Chat ID</Label>
                  <Input name="telegramChatId" value={editForm.telegramChatId} onChange={handleEditFormChange} placeholder="e.g. 429020716" />
                  <p className="text-[11px] text-muted-foreground">Get via @Newlifeclinicnotifcationbot</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Username</Label>
                  <Input name="telegramUsername" value={editForm.telegramUsername} onChange={handleEditFormChange} placeholder="Optional" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input id="editTelegramEnabled" name="telegramNotificationsEnabled" type="checkbox"
                    checked={editForm.telegramNotificationsEnabled} onChange={handleEditFormChange} className="rounded" />
                  <Label htmlFor="editTelegramEnabled" className="text-sm cursor-pointer">Enable Telegram notifications</Label>
                </div>
              </div>

              {editForm.telegramNotificationsEnabled && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Notification Preferences</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(editForm.notificationPreferences).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                        <input type="checkbox" checked={value} className="rounded"
                          onChange={e => setEditForm(prev => ({
                            ...prev, notificationPreferences: { ...prev.notificationPreferences, [key]: e.target.checked }
                          }))} />
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {editError && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">{editError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={editLoading} className="gap-2">
                {editLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={open => { setShowQRModal(open); if (!open) { setQrCodeData(null); setSelectedUserForQR(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              {qrCodeData?.isNew ? 'New Registration QR' : 'Staff QR Code'}
            </DialogTitle>
            <DialogDescription>
              QR code for {selectedUserForQR?.firstName} {selectedUserForQR?.lastName} (@{selectedUserForQR?.username})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {generatingQR ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-64 w-64 rounded-xl" />
              </div>
            ) : qrCodeData?.qrCodeDataUrl ? (
              <>
                <div className="flex justify-center p-4 bg-muted/30 rounded-xl">
                  <img src={qrCodeData.qrCodeDataUrl} alt="QR Code" className="w-56 h-56 rounded-lg"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>

                <div className="space-y-2 text-sm bg-muted/20 p-3 rounded-lg">
                  <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{qrCodeData.user?.firstName || selectedUserForQR?.firstName} {qrCodeData.user?.lastName || selectedUserForQR?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{qrCodeData.user?.role || selectedUserForQR?.role}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${qrCodeData.isNew ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {qrCodeData.isNew ? 'New' : 'Existing'}
                    </span>
                  </div>
                  {qrCodeData.expiresAt && <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span>{new Date(qrCodeData.expiresAt).toLocaleDateString()}</span></div>}
                </div>

                <div className="space-y-2">
                  <Button onClick={downloadQRCode} className="w-full gap-2" variant="outline">
                    <Download className="h-4 w-4" /> Download QR Code
                  </Button>
                  {deviceRegistrationStatus[selectedUserForQR?._id || selectedUserForQR?.id] && (
                    <Button onClick={deregisterCurrentDevice} className="w-full gap-2" variant="destructive" disabled={deregistering}>
                      <UserX className="h-4 w-4" /> {deregistering ? 'Deregistering...' : 'Deregister Device'}
                    </Button>
                  )}
                </div>

                <div className="text-xs bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-200">
                  <p className="font-semibold mb-1.5">Instructions for Staff:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Scan this QR code with your phone</li>
                    <li>Tap "Register This Device"</li>
                    <li>Device will be registered for check-in/out</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground">No QR code data available</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
