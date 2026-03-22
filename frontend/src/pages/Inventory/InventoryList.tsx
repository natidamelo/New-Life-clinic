import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  FileDownload as ExportIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import inventoryService, { InventoryItem } from '../../services/inventoryService';
import { format } from 'date-fns';
// import * as XLSX from 'xlsx';

// Using InventoryItem interface from inventoryService
// interface InventoryItem {
  // _id: string;
  // name: string;
  // description: string;
  // category: string;
  // quantity: number;
  // unitPrice: number;
  // reorderLevel: number;
  // expiryDate?: string;
  // createdAt: string;
  // updatedAt: string;
  // status: 'in-stock' | 'low-stock' | 'out-of-stock';
  // Add missing properties to match the service interface
  // sellingPrice?: number;
  // minimumStockLevel?: number;
  // costPrice?: number;
  // unit?: string;
  // location?: string;
  // manufacturer?: string;
  // batchNumber?: string;
  // supplier?: string;
  // attachments?: string[];
  // isActive?: boolean;
  // createdBy?: string;
  // minStock?: number;
  // transactions?: any[];
  // stockMovements?: any[];
  // __v?: number;
// }

type SortField = 'name' | 'quantity' | 'category' | 'unitPrice' | 'expiryDate';
type SortOrder = 'asc' | 'desc';

const InventoryList: React.FC = () => {
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Fetch inventory items
  const fetchInventoryItems = async () => {
    setLoading(true);
    try {
      const items = await inventoryService.getAllInventoryItems();
      setInventoryItems(items);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(items.map(item => item.category)));
      setCategories(uniqueCategories);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory items:', err);
      setError('Failed to load inventory items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Search inventory items
  const searchInventoryItems = async () => {
    if (!searchTerm.trim() && selectedCategory === 'all' && selectedStatus === 'all') {
      fetchInventoryItems();
      return;
    }
    
    setLoading(true);
    try {
      const items = await inventoryService.searchInventoryItems(searchTerm);
      setInventoryItems(items);
      setError(null);
    } catch (err) {
      console.error('Error searching inventory items:', err);
      setError('Failed to search inventory items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Delete inventory item
  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryService.deleteInventoryItem(id);
        setSnackbar({
          open: true,
          message: 'Item deleted successfully',
          severity: 'success'
        });
        fetchInventoryItems();
      } catch (err) {
        console.error('Error deleting inventory item:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete item. Please try again.',
          severity: 'error'
        });
      }
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected items?`)) {
      try {
        await Promise.all(selectedItems.map(id => inventoryService.deleteInventoryItem(id)));
        setSnackbar({
          open: true,
          message: `${selectedItems.length} items deleted successfully`,
          severity: 'success'
        });
        setSelectedItems([]);
        fetchInventoryItems();
      } catch (err) {
        console.error('Error deleting items:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete items. Please try again.',
          severity: 'error'
        });
      }
    }
  };

  // Export to Excel
  const handleExport = () => {
    const data = inventoryItems.map(item => ({
      'Item Name': item.name,
      'Category': item.category,
      'Quantity': item.quantity,
      'Unit Price': item.unitPrice,
      'Reorder Level': item.reorderLevel,
      'Status': item.status,
      'Last Updated': formatDate(item.updatedAt)
    }));

    // Commented out XLSX functionality for now
    console.log('Export data:', data);
    alert('Export functionality temporarily disabled');
  };

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Load inventory items on component mount
  useEffect(() => {
    fetchInventoryItems();
  }, []);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'success';
      case 'low-stock': return 'warning';
      case 'out-of-stock': return 'error';
      default: return 'default';
    }
  };

  // Filter and sort items
  const filteredItems = inventoryItems
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortField === 'expiryDate') {
        const aDate = aValue ? new Date(aValue).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = bValue ? new Date(bValue).getTime() : Number.MAX_SAFE_INTEGER;
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  // Get items for current page
  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Grid>
            <Typography variant="h4" component="h1" gutterBottom>
              Inventory Management
            </Typography>
          </Grid>
          <Grid>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/inventory/new-item')}
            >
              Add New Item
            </Button>
          </Grid>
        </Grid>

        <Card sx={{ p: 2, mb: 3 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <TextField
                fullWidth
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchInventoryItems()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </div>
            <div>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            <div>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="in-stock">In Stock</MenuItem>
                  <MenuItem value="low-stock">Low Stock</MenuItem>
                  <MenuItem value="out-of-stock">Out of Stock</MenuItem>
                </Select>
              </FormControl>
            </div>
            <div>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button variant="outlined" onClick={searchInventoryItems}>
                  Search
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<ExportIcon />}
                  onClick={handleExport}
                >
                  Export
                </Button>
                {selectedItems.length > 0 && (
                  <Tooltip title={`Delete ${selectedItems.length} selected items`}>
                    <IconButton
                      color="error"
                      onClick={handleBatchDelete}
                      size="small"
                      sx={{ 
                        ml: 1,
                        '&:hover': {
                          backgroundColor: 'error.light',
                          color: 'white'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </div>
          </div>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <Card>
              <Box sx={{ minWidth: 1050 }}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItems.length === filteredItems.length}
                            indeterminate={selectedItems.length > 0 && selectedItems.length < filteredItems.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(filteredItems.map(item => item._id));
                              } else {
                                setSelectedItems([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => {
                              setSortField('name');
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                          >
                            Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => {
                              setSortField('category');
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                          >
                            Category {sortField === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => {
                              setSortField('quantity');
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                          >
                            Quantity {sortField === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => {
                              setSortField('unitPrice');
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                          >
                            Unit Price {sortField === 'unitPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </Button>
                        </TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Updated</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body1" color="textSecondary" sx={{ py: 3 }}>
                              No items found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((item) => (
                          <TableRow 
                            hover 
                            key={item._id}
                            selected={selectedItems.includes(item._id)}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedItems.includes(item._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems([...selectedItems, item._id]);
                                  } else {
                                    setSelectedItems(selectedItems.filter(id => id !== item._id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {item.quantity <= item.reorderLevel && (
                                  <Tooltip title="Low stock alert">
                                    <WarningIcon color="warning" sx={{ mr: 1 }} />
                                  </Tooltip>
                                )}
                                {item.name}
                              </Box>
                            </TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={item.status.charAt(0).toUpperCase() + item.status.slice(1)} 
                                color={getStatusColor(item.status) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{formatDate(item.updatedAt)}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit item">
                                <IconButton
                                  onClick={() => navigate(`/app/inventory/edit/${item._id}`)}
                                  size="small"
                                  sx={{ 
                                    mr: 1,
                                    '&:hover': {
                                      backgroundColor: 'primary.light',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete item">
                                <IconButton
                                  onClick={() => handleDeleteItem(item._id)}
                                  size="small"
                                  color="error"
                                  sx={{ 
                                    '&:hover': {
                                      backgroundColor: 'error.light',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredItems.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Box>
            </Card>
          </>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default InventoryList; 
