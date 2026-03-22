import React, { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import dataShareService, { DatasetKey } from '../../services/dataShareService';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, CardContent, CardHeader, MenuItem, Select, TextField, Typography, Chip, Stack, Divider } from '@mui/material';
import dayjs from 'dayjs';

const datasetOptions: { value: DatasetKey; label: string; defaultFields: string[] }[] = [
  { value: 'patients', label: 'Patients', defaultFields: ['patientId', 'firstName', 'lastName', 'gender', 'age', 'contactNumber', 'createdAt'] },
  { value: 'appointments', label: 'Appointments', defaultFields: ['patientId', 'doctorId', 'appointmentDateTime', 'type', 'status', 'createdAt'] },
  { value: 'invoices', label: 'Invoices', defaultFields: ['invoiceNumber', 'patientId', 'dateIssued', 'status', 'total', 'createdAt'] },
  { value: 'lab-orders', label: 'Lab Orders', defaultFields: ['patientId', 'testName', 'status', 'paymentStatus', 'orderDateTime', 'createdAt'] },
  { value: 'inventory', label: 'Inventory', defaultFields: ['itemCode', 'name', 'category', 'quantity', 'sellingPrice', 'createdAt'] },
];

const DataSharePage: React.FC = () => {
  const { user } = useAuth();
  const [dataset, setDataset] = useState<DatasetKey>('patients');
  const [fields, setFields] = useState<string[]>(datasetOptions[0].defaultFields);
  const [from, setFrom] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [title, setTitle] = useState<string>('Data Share');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['admin']);
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [filterJson, setFilterJson] = useState<string>('{}');
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const datasetMeta = useMemo(() => datasetOptions.find((d) => d.value === dataset)!, [dataset]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await dataShareService.exportCsv(dataset, { fields, from, to });
      saveAs(blob, `${dataset}-export.csv`);
    } finally {
      setLoading(false);
    }
  };

  const refreshShares = async () => {
    const list = await dataShareService.listShares();
    setShares(list);
  };

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      let filter: any = {};
      try { filter = JSON.parse(filterJson || '{}'); } catch {}
      await dataShareService.createShare({ title, dataset, fields, filter, expiresInDays, allowedRoles });
      await refreshShares();
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await dataShareService.revokeShare(id);
    await refreshShares();
  };

  React.useEffect(() => { refreshShares(); }, []);
  React.useEffect(() => { setFields(datasetMeta.defaultFields); }, [dataset]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Typography variant="h5">Data Share & Export</Typography>
        <Typography variant="body2" color="text.secondary">Export datasets to CSV and create secure share links.</Typography>
      </div>

      <div className="col-span-12 md:col-span-7">
        <Card>
          <CardHeader title="Export CSV" />
          <CardContent>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <Typography variant="caption">Dataset</Typography>
                <Select fullWidth value={dataset} onChange={(e) => setDataset(e.target.value as DatasetKey)}>
                  {datasetOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <Typography variant="caption">From</Typography>
                <TextField fullWidth type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <Typography variant="caption">To</Typography>
                <TextField fullWidth type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="col-span-12">
                <Typography variant="caption">Fields</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {datasetMeta.defaultFields.map((f) => (
                    <Chip key={f} label={f} color={fields.includes(f) ? 'primary' : 'default'} onClick={() => setFields((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])} />
                  ))}
                </Stack>
              </div>
              <div className="col-span-12">
                <Button variant="contained" onClick={handleExport} disabled={loading}>Export CSV</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-5">
        <Card>
          <CardHeader title="Create Share Link" />
          <CardContent>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <TextField fullWidth label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="col-span-12">
                <Typography variant="caption">Allowed Roles (optional)</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging'].map((r) => (
                    <Chip key={r} label={r} color={allowedRoles.includes(r) ? 'primary' : 'default'} onClick={() => setAllowedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])} />
                  ))}
                </Stack>
              </div>
               <div className="col-span-6">
                <TextField fullWidth type="number" label="Expires in days" value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} />
              </div>
              <div className="col-span-12">
                <Typography variant="caption">Filter (JSON)</Typography>
                <TextField fullWidth multiline minRows={3} value={filterJson} onChange={(e) => setFilterJson(e.target.value)} />
              </div>
              <div className="col-span-12">
                <Button variant="contained" onClick={handleCreateShare} disabled={loading}>Create Share</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12">
        <Card>
          <CardHeader title="Active Shares" />
          <CardContent>
            <Stack spacing={1} divider={<Divider flexItem />}>
              {shares.map((s) => (
                <Stack key={s._id} direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <div>
                    <Typography variant="subtitle2">{s.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.dataset} • Token: {s.token} • Active: {String(s.isActive)} • Expires: {s.expiresAt ? dayjs(s.expiresAt).format('YYYY-MM-DD') : '—'}</Typography>
                  </div>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" color="secondary" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/data-share/shared/${s.token}`)}>Copy Link</Button>
                    {s.isActive && <Button size="small" variant="contained" color="error" onClick={() => handleRevoke(s._id)}>Revoke</Button>}
                  </Stack>
                </Stack>
              ))}
              {!shares.length && <Typography variant="body2" color="text.secondary">No shares yet.</Typography>}
            </Stack>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataSharePage;


