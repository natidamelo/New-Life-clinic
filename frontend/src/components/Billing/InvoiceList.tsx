import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import billingService, { Invoice, InvoiceStatus } from '../../services/billingService';
import { formatCurrency } from '../../utils/formatters';

const statusColors: Record<InvoiceStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  paid: 'success',
  partial: 'primary',
  overdue: 'error',
  cancelled: 'default',
  refunded: 'default'
};

const statusLabels: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
};

interface InvoiceListProps {
  patientId?: string;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ patientId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await billingService.getInvoices(
        {
          patient: patientId,
          status: filters.status as InvoiceStatus || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        },
        {
          page: page + 1,
          limit: rowsPerPage,
          sort: '-issueDate'
        }
      );
      setInvoices(response.data);
      setTotalCount(response.pagination.total);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, rowsPerPage, filters, patientId]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const handleDownload = async (id: string, invoiceNumber: string) => {
    try {
      const blob = await billingService.downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setError('Failed to download invoice. Please try again.');
    }
  };

  if (loading) {
    return <Box p={3}>Loading invoices...</Box>;
  }

  if (error) {
    return <Box p={3} color="error.main">{error}</Box>;
  }

  return (
    <Box>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Invoices</Typography>
        <Button
          component={Link}
          to="/billing/invoices/new"
          startIcon={<AddIcon />}
          variant="contained"
          color="primary"
        >
          New Invoice
        </Button>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Box p={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FilterIcon color="action" />
            <TextField
              select
              name="status"
              label="Status"
              value={filters.status}
              onChange={handleFilterChange}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              name="startDate"
              label="Start Date"
              value={filters.startDate}
              onChange={handleFilterChange}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              name="endDate"
              label="End Date"
              value={filters.endDate}
              onChange={handleFilterChange}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice._id}>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>
                  {typeof invoice.patient === 'object' ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : invoice.patient}
                </TableCell>
                <TableCell>
                  {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(invoice.total)}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(invoice.balance)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[invoice.status]}
                    color={statusColors[invoice.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="View">
                      <IconButton
                        component={Link}
                        to={`/billing/invoices/${invoice._id}`}
                        size="small"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                      <Tooltip title="Edit">
                        <IconButton
                          component={Link}
                          to={`/billing/invoices/${invoice._id}/edit`}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Download PDF">
                      <IconButton
                        onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)}
                        size="small"
                      >
                        <ReceiptIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No invoices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>
    </Box>
  );
};

export default InvoiceList; 