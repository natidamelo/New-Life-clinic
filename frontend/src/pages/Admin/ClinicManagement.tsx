import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import clinicService, { Clinic } from '../../services/clinicService';
import { toast } from 'react-hot-toast';

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ClinicManagement: React.FC = () => {
  const { user } = useAuth();
  const canManageClinics = useMemo(() => user?.role === 'super_admin', [user?.role]);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);

  const [newClinic, setNewClinic] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [assignInputs, setAssignInputs] = useState<Record<string, string>>({});

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await clinicService.listClinics();
      setClinics(data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to load clinics'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageClinics) {
      loadClinics();
    }
  }, [canManageClinics]);

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinic.name.trim()) {
      toast.error('Clinic name is required');
      return;
    }

    try {
      await clinicService.createClinic({
        name: newClinic.name,
        slug: newClinic.slug || toSlug(newClinic.name),
        contactEmail: newClinic.contactEmail || undefined,
        contactPhone: newClinic.contactPhone || undefined
      });
      toast.success('Clinic created');
      setNewClinic({ name: '', slug: '', contactEmail: '', contactPhone: '' });
      await loadClinics();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to create clinic'
      );
    }
  };

  const handleToggleClinic = async (clinic: Clinic) => {
    try {
      await clinicService.setClinicActive(clinic.slug, !clinic.isActive);
      toast.success(`Clinic ${clinic.isActive ? 'deactivated' : 'activated'}`);
      await loadClinics();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update clinic status');
    }
  };

  const handleRehomeAllData = async (clinic: Clinic) => {
    if (
      !window.confirm(
        `Preview only: count how many documents in clinic-cms would get clinicId "${clinic.slug}"?`
      )
    ) {
      return;
    }
    try {
      const preview = await clinicService.rehomeAllData(clinic.slug, { dryRun: true });
      const n = preview.totalDocuments ?? 0;
      toast.success(
        `Dry run: ${n} document(s) would be updated across ${preview.perCollection?.filter((p) => p.count > 0).length ?? 0} collection(s).`
      );
      if (
        n === 0 ||
        !window.confirm(
          `Apply now? This sets clinicId to "${clinic.slug}" on all those documents (except super_admin users). Type OK in the next prompt must match exactly.`
        )
      ) {
        if (n === 0) toast('Nothing to change.');
        return;
      }
      const code = window.prompt(
        'Type REHOME_ALL_TO_CLINIC exactly to apply (case-sensitive):'
      );
      if (code !== 'REHOME_ALL_TO_CLINIC') {
        toast.error('Cancelled — confirmation text did not match.');
        return;
      }
      await clinicService.rehomeAllData(clinic.slug, {
        dryRun: false,
        confirmationCode: 'REHOME_ALL_TO_CLINIC'
      });
      toast.success(`All data is now tagged with clinic "${clinic.slug}". Refresh other pages.`);
      await loadClinics();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Rehome failed');
    }
  };

  const handleAssignAdmin = async (clinic: Clinic) => {
    const identifier = (assignInputs[clinic.slug] || '').trim();
    if (!identifier) {
      toast.error('Enter username or email');
      return;
    }

    try {
      await clinicService.assignClinicAdmin(clinic.slug, { identifier, makeAdmin: true });
      toast.success('Clinic admin assigned');
      setAssignInputs((prev) => ({ ...prev, [clinic.slug]: '' }));
      await loadClinics();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to assign clinic admin');
    }
  };

  if (!canManageClinics) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Only `super_admin` can manage clinics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clinic Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create clinics, activate/deactivate them, and assign a clinic admin.
        </p>
        <p className="text-xs text-violet-700 dark:text-violet-300 mt-2 rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-3 py-2">
          <strong>Attach Atlas data:</strong> use <strong>“Attach all data to this clinic”</strong> in the Actions column so every document’s{' '}
          <code className="text-[11px]">clinicId</code> matches this clinic’s <strong>slug</strong> (e.g. <code className="text-[11px]">new-life</code>).
          Then user counts and dashboards line up with <strong>clinic-cms</strong>.
        </p>
      </div>

      <form onSubmit={handleCreateClinic} className="rounded-xl border bg-card p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="Clinic name"
          value={newClinic.name}
          onChange={(e) => setNewClinic((p) => ({ ...p, name: e.target.value }))}
        />
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="Slug (optional)"
          value={newClinic.slug}
          onChange={(e) => setNewClinic((p) => ({ ...p, slug: toSlug(e.target.value) }))}
        />
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="Contact email (optional)"
          value={newClinic.contactEmail}
          onChange={(e) => setNewClinic((p) => ({ ...p, contactEmail: e.target.value }))}
        />
        <div className="flex gap-2">
          <input
            className="border rounded-md px-3 py-2 bg-background w-full"
            placeholder="Contact phone (optional)"
            value={newClinic.contactPhone}
            onChange={(e) => setNewClinic((p) => ({ ...p, contactPhone: e.target.value }))}
          />
          <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            Create
          </button>
        </div>
      </form>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3">Clinic</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Users</th>
              <th className="text-left px-4 py-3">Assign Admin</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading clinics...</td>
              </tr>
            ) : clinics.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No clinics yet</td>
              </tr>
            ) : (
              clinics.map((clinic) => (
                <tr key={clinic._id} className="border-t">
                  <td className="px-4 py-3 font-medium">{clinic.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{clinic.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${clinic.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {clinic.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {clinic.totalUsers || 0} users / {clinic.adminUsers || 0} admin
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <input
                        className="border rounded-md px-2 py-1 bg-background w-full max-w-[10rem] sm:max-w-[14rem]"
                        placeholder="username or email"
                        value={assignInputs[clinic.slug] || ''}
                        onChange={(e) => setAssignInputs((p) => ({ ...p, [clinic.slug]: e.target.value }))}
                      />
                      <button
                        className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => handleAssignAdmin(clinic)}
                        type="button"
                        disabled={!clinic.isActive}
                      >
                        Assign
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2 min-w-[11rem]">
                      <button
                        className="px-3 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 text-xs font-semibold text-left leading-snug"
                        onClick={() => handleRehomeAllData(clinic)}
                        type="button"
                        title="Sets clinicId to this clinic slug on all collections (single-clinic database)"
                      >
                        Attach all data to this clinic
                      </button>
                      <button
                        className={`px-3 py-2 rounded-md text-white text-xs font-medium ${clinic.isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        onClick={() => handleToggleClinic(clinic)}
                        type="button"
                      >
                        {clinic.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClinicManagement;

