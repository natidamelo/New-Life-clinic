import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Select, InputLabel, FormControl, Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import billableItemService, { BillableItem, BillableItemInput, BillableItemType } from '../../services/billableItemService';
import inventoryService from '../../services/inventoryService';

const BILLABLE_TYPES: BillableItemType[] = ['service', 'lab', 'medication', 'imaging', 'supply', 'procedure', 'other'];

const BillableItemsPage: React.FC = () => {
  const [items, setItems] = useState<BillableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<BillableItem | null>(null);
  const [form, setForm] = useState<BillableItemInput>({ name: '', type: 'service', price: 0 });
  const [inventoryOptions, setInventoryOptions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<BillableItemType | ''>('');

  useEffect(() => { fetchItems(); }, [filterType, search]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (search) params.search = search;
      const data = await billableItemService.getAll(params);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const data = await inventoryService.getAllInventoryItems();
      setInventoryOptions(data);
    } catch {}
  };

  const handleOpen = (item?: BillableItem) => {
    if (item) {
      setEditItem(item);
      setForm({
        name: item.name,
        type: item.type,
        price: item.price,
        inventoryItem: item.inventoryItem?._id,
        code: item.code,
        isActive: item.isActive
      });
      if (item.type === 'medication' || item.type === 'supply') fetchInventory();
    } else {
      setEditItem(null);
      setForm({ name: '', type: 'service', price: 0 });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditItem(null);
  };

  const handleFormChange = (field: keyof BillableItemInput, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'type' && (value === 'medication' || value === 'supply')) fetchInventory();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        await billableItemService.update(editItem._id, form);
      } else {
        await billableItemService.create(form);
      }
      fetchItems();
      handleClose();
    } catch (err) {
      alert('Error saving item');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this item?')) {
      await billableItemService.deactivate(id);
      fetchItems();
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Billable Items Management</Typography>
      <Box mb={2} display="flex" gap={2}>
        <TextField label="Search" value={search} onChange={e => setSearch(e.target.value)} size="small" />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filterType} label="Type" onChange={e => setFilterType(e.target.value as BillableItemType | '')}>
            <MenuItem value="">All</MenuItem>
            {BILLABLE_TYPES.map(type => (
              <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Item</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Inventory</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item._id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>${item.price.toFixed(2)}</TableCell>
                <TableCell>{item.inventoryItem ? item.inventoryItem.name : '-'}</TableCell>
                <TableCell>{item.code || '-'}</TableCell>
                <TableCell>{item.isActive ? 'Active' : 'Inactive'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton onClick={() => handleOpen(item)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Deactivate"><IconButton onClick={() => handleDeactivate(item._id)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">No items found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? 'Edit Billable Item' : 'Add Billable Item'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              label="Name"
              value={form.name}
              onChange={e => handleFormChange('name', e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={e => handleFormChange('type', e.target.value)}
                required
              >
                {BILLABLE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Price"
              type="number"
              value={form.price}
              onChange={e => handleFormChange('price', parseFloat(e.target.value))}
              fullWidth
              required
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
            />
            {(form.type === 'medication' || form.type === 'supply') && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Inventory Item</InputLabel>
                <Select
                  value={form.inventoryItem || ''}
                  label="Inventory Item"
                  onChange={e => handleFormChange('inventoryItem', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {inventoryOptions.map(inv => (
                    <MenuItem key={inv._id} value={inv._id}>{inv.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Code"
              value={form.code || ''}
              onChange={e => handleFormChange('code', e.target.value)}
              fullWidth
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">{editItem ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default BillableItemsPage; 