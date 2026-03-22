import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  Typography,
  MenuItem,
  Stack,
  Divider,
  Autocomplete
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import billingService, {
  Invoice,
  InvoiceItem,
  ItemType,
  Insurance,
  CreateInvoiceData,
  UpdateInvoiceData
} from '../../services/billingService';
import { Patient } from '../../types/patient';
import { Doctor } from '../../types/doctor';
import { Service } from '../../types/service';
import { formatCurrency } from '../../utils/formatters';
import billableItemService, { BillableItem } from '../../services/billableItemService';
import PendingDispensedCharges from './PendingDispensedCharges';
import dispensedChargeService from '../../services/dispensedChargeService';

interface FormInvoiceItem extends Omit<InvoiceItem, 'total'> {
  dispensedChargeId?: string;
  billableItemId?: string;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  patients: Patient[];
  doctors: Doctor[];
  onSubmit: (data: CreateInvoiceData | UpdateInvoiceData) => Promise<Invoice | void>;
}

const itemTypes: ItemType[] = [
  'service',
  'procedure',
  'medication',
  'supply',
  'lab',
  'imaging',
  'consultation',
  'other'
];

const insuranceStatuses = [
  'pending',
  'approved',
  'partial',
  'denied',
  'not_submitted'
] as const;

const emptyItem: FormInvoiceItem = {
  itemType: 'service',
  description: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  tax: 0,
  dispensedChargeId: undefined,
  billableItemId: undefined,
};

const emptyInsurance: Insurance = {
  provider: '',
  policyNumber: '',
  claimNumber: '',
  coveragePercent: 0,
  approvalCode: '',
  status: 'not_submitted'
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  patients,
  doctors,
  onSubmit
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Omit<CreateInvoiceData | UpdateInvoiceData, 'items'> & { items: FormInvoiceItem[] }>(() => {
    const initialItems = invoice?.items.map(item => ({
      ...item,
      total: undefined,
      dispensedChargeId: (item as any).dispensedChargeId || undefined
    })) || [{ ...emptyItem }];
    return {
      patient: (typeof invoice?.patient === 'object' ? invoice?.patient._id : invoice?.patient) || '',
      provider: invoice?.provider?._id || '',
      items: initialItems,
      dueDate: invoice?.dueDate
        ? format(new Date(invoice.dueDate), 'yyyy-MM-dd')
        : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      insurance: invoice?.insurance || { ...emptyInsurance },
      notes: invoice?.notes || ''
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>((typeof invoice?.patient === 'object' ? invoice?.patient._id : invoice?.patient) || null);

  useEffect(() => {
    billableItemService.getAll({ isActive: true }).then(setBillableItems);
  }, []);

  useEffect(() => {
    setSelectedPatientId((formData as any).patient || null);
  }, [(formData as any).patient]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!(formData as any).patient) {
      newErrors.patient = 'Patient is required';
    }

    if (!formData.items.length) {
      newErrors.items = 'At least one item is required';
    } else {
      formData.items.forEach((item, index) => {
        if (!item.description) {
          newErrors[`items.${index}.description`] = 'Description is required';
        }
        if (item.quantity <= 0) {
          newErrors[`items.${index}.quantity`] = 'Quantity must be greater than 0';
        }
        if (item.unitPrice < 0) {
          newErrors[`items.${index}.unitPrice`] = 'Unit price cannot be negative';
        }
      });
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const savedInvoice = await onSubmit(formData as CreateInvoiceData | UpdateInvoiceData);
        
        if (savedInvoice && savedInvoice._id) {
          for (const item of formData.items) {
            if (item.dispensedChargeId) {
              try {
                await dispensedChargeService.markChargeAsBilled(item.dispensedChargeId, savedInvoice._id);
              } catch (markError) {
                console.error(`Failed to mark dispensed charge ${item.dispensedChargeId} as billed:`, markError);
              }
            }
          }
        } else {
          console.warn('Invoice ID not available after submission, cannot mark dispensed items as billed.');
        }

        navigate('/billing/invoices');
      } catch (error) {
        console.error('Error submitting invoice:', error);
        setErrors({ submit: 'Failed to submit invoice. Please try again.' });
      }
    }
  };

  const handleItemChange = (index: number, field: keyof FormInvoiceItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      } as FormInvoiceItem;
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleInsuranceChange = (field: keyof Insurance, value: any) => {
    setFormData(prev => ({
      ...prev,
      insurance: {
        ...prev.insurance!,
        [field]: value
      }
    }));
  };

  const handleAddItemFromPendingCharge = useCallback((itemToAdd: Omit<InvoiceItem, 'total' | 'tax' | 'discount'> & { dispensedChargeId: string }) => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...emptyItem,
          itemType: itemToAdd.itemType || 'medication',
          description: itemToAdd.description,
          quantity: itemToAdd.quantity,
          unitPrice: itemToAdd.unitPrice,
          dispensedChargeId: itemToAdd.dispensedChargeId,
          tax: 0,
          discount: 0,
        } as FormInvoiceItem,
      ],
    }));
  }, []);

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              options={patients}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option._id})`}
              value={patients.find(p => p._id === (formData as any).patient) || null}
              onChange={(_, newValue) => {
                const newPatientId = newValue?._id || '';
                setFormData(prev => ({
                  ...prev,
                  ...(prev as any),
                  patient: newPatientId
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Patient"
                  required
                  error={!!errors.patient}
                  helperText={errors.patient}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              options={doctors}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              value={doctors.find(d => d._id === (formData as any).provider) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  provider: newValue?._id || ''
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Provider"
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              required
              error={!!errors.dueDate}
              helperText={errors.dueDate}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {selectedPatientId && (
        <PendingDispensedCharges 
          patientId={selectedPatientId}
          onAddItemToInvoice={handleAddItemFromPendingCharge} 
        />
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Items</Typography>
        {formData.items.map((item, index) => {
          const selectedBillable = billableItems.find(bi => bi._id === item.billableItemId);
          return (
            <Box key={index} sx={{ mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Autocomplete
                    options={billableItems}
                    groupBy={option => option.type.charAt(0).toUpperCase() + option.type.slice(1)}
                    getOptionLabel={option => option.name}
                    value={billableItems.find(bi => bi._id === item.billableItemId) || null}
                    onChange={(_, newValue) => {
                      handleItemChange(index, 'billableItemId', newValue?._id || '');
                      handleItemChange(index, 'description', newValue?.name || '');
                      handleItemChange(index, 'unitPrice', newValue?.price || 0);
                      handleItemChange(index, 'itemType', newValue?.type || 'service');
                    }}
                    renderInput={params => (
                      <TextField {...params} label="Billable Item" required />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                    required
                    error={!!errors[`items.${index}.quantity`]}
                    helperText={errors[`items.${index}.quantity`]}
                    inputProps={{ min: 0.1, step: 0.1 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Unit Price"
                    type="number"
                    value={item.unitPrice}
                    onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                    required
                    error={!!errors[`items.${index}.unitPrice`]}
                    helperText={errors[`items.${index}.unitPrice`]}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 1 }}>
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveItem(index)}
                    disabled={formData.items.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
              {selectedBillable && (selectedBillable.type === 'medication' || selectedBillable.type === 'supply') && selectedBillable.inventoryItem && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Stock: {selectedBillable.inventoryItem.quantity} {selectedBillable.inventoryItem.unit || ''}
                </Typography>
              )}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Discount"
                    type="number"
                    value={item.discount}
                    onChange={e => handleItemChange(index, 'discount', parseFloat(e.target.value))}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Tax %"
                    type="number"
                    value={item.tax}
                    onChange={e => handleItemChange(index, 'tax', parseFloat(e.target.value))}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                  />
                </Grid>
              </Grid>
              {index < formData.items.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          );
        })}
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          sx={{ mt: 2 }}
        >
          Add Item
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Insurance</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Insurance Provider"
              value={formData.insurance?.provider}
              onChange={(e) => handleInsuranceChange('provider', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Policy Number"
              value={formData.insurance?.policyNumber}
              onChange={(e) => handleInsuranceChange('policyNumber', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Claim Number"
              value={formData.insurance?.claimNumber}
              onChange={(e) => handleInsuranceChange('claimNumber', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Coverage Percentage"
              type="number"
              value={formData.insurance?.coveragePercent}
              onChange={(e) => handleInsuranceChange('coveragePercent', parseFloat(e.target.value))}
              inputProps={{ min: 0, max: 100, step: 1 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Approval Code"
              value={formData.insurance?.approvalCode}
              onChange={(e) => handleInsuranceChange('approvalCode', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Insurance Status"
              value={formData.insurance?.status}
              onChange={(e) => handleInsuranceChange('status', e.target.value)}
            >
              {insuranceStatuses.map(status => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Additional Information</Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </Paper>

      {errors.submit && (
        <Typography color="error" sx={{ mb: 2 }}>
          {errors.submit}
        </Typography>
      )}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate('/billing/invoices')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
        >
          {invoice ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </Stack>
    </Box>
  );
};

export default InvoiceForm; 