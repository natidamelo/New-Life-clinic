import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardHeader, Grid,
  TextField, Button, Chip, Avatar, Divider, Alert,
  FormControl, InputLabel, Select, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, List,
  ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction,
  IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, Rating
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarToday as DateIcon,
  Person as PersonIcon,
  LocalHospital as DiagnosisIcon,
  Assessment as QualityIcon,
  Category as CategoryIcon,
  Clear as ClearIcon,
  Refresh as RefreshCw
} from '@mui/icons-material';
import { formatDate, formatDateTime } from '../../../utils/formatters';
import { useAuth } from '../../../context/AuthContext';
import medicalRecordsApi from '../../../services/medicalRecords';
import prescriptionService from '../../../services/prescriptionService';
import labService from '../../../services/labService';
import { toast } from 'sonner';

interface MedicalRecord {
  _id: string;
  patient: string;
  status: 'Draft' | 'Finalized';
  qualityScore: number;
  visitDate?: string;
  createdAt: string;
  finalizedAt?: string;
  lastModified: string;
  modifiedBy?: string;
  modifiedByName?: string;
  finalizedBy?: string;
  finalizedByName?: string;
  version: number;
  metadata?: {
    patientName: string;
    patientId: string;
    chiefComplaintSummary: string;
    primaryDiagnosisCode?: string;
    primaryDiagnosisDescription?: string;
    secondaryDiagnoses?: Array<{
      code: string;
      description: string;
      category: string;
    }>;
    category?: string;
    createdDate: string;
    finalizedDate?: string;
    doctorId: string;
    doctorName: string;
    qualityScore: number;
    tags: string[];
    searchTerms: string;
    primaryDiagnosisICD10?: string;
  };
  chiefComplaint?: {
    description: string;
    severity: string;
    duration: string;
  };
  primaryDiagnosis?: {
    code: string;
    description: string;
    category: string;
  };
  plan?: string;
}

interface MedicalRecordHistoryProps {
  patientId?: string;
  onRecordSelect?: (record: MedicalRecord) => void;
  onEditRecord?: (recordId: string) => void;
}

const MedicalRecordHistory: React.FC<MedicalRecordHistoryProps> = ({
  patientId,
  onRecordSelect,
  onEditRecord
}) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<string>('All');
  const [qualityFilter, setQualityFilter] = useState<string>('All');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [recordsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [prescriptionsToday, setPrescriptionsToday] = useState<any[]>([]);
  const [labResultsToday, setLabResultsToday] = useState<any[]>([]);

  // Fetch medical records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      let response;
      if (patientId) {
        // Fetch records for specific patient
        response = await medicalRecordsApi.getRecordsByPatient(patientId);
      } else {
        // Fetch all records for current doctor
        response = await medicalRecordsApi.getRecordsByDoctor(user?.id);
      }
      
      if (response.data) {
        setRecords(response.data);
        setFilteredRecords(response.data);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast.error('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRecords();
    }
  }, [user?.id, patientId]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...records];

    const getRecordClinicalDate = (record: MedicalRecord) => {
      // Source of truth for reporting/history is the clinical visit date.
      // Fallback to createdAt for legacy records.
      return record.visitDate || record.createdAt;
    };

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record => {
        const searchFields = [
          record.metadata?.patientName,
          record.metadata?.chiefComplaintSummary,
          record.metadata?.primaryDiagnosisCode,
          record.metadata?.primaryDiagnosisDescription,
          record.metadata?.searchTerms,
          record._id
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchFields.includes(searchTerm.toLowerCase());
      });
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(record => record.metadata?.category === categoryFilter);
    }

    // Date range filter
    if (dateRange !== 'All') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'Today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'Week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'Month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'Year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      if (dateRange !== 'All') {
        filtered = filtered.filter(record => 
          new Date(getRecordClinicalDate(record)) >= filterDate
        );
      }
    }

    // Quality filter
    if (qualityFilter !== 'All') {
      filtered = filtered.filter(record => {
        const score = record.qualityScore || 0;
        switch (qualityFilter) {
          case 'High': return score >= 80;
          case 'Good': return score >= 60 && score < 80;
          case 'Low': return score < 60;
          default: return true;
        }
      });
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(getRecordClinicalDate(b)).getTime() - new Date(getRecordClinicalDate(a)).getTime();
        case 'date-asc':
          return new Date(getRecordClinicalDate(a)).getTime() - new Date(getRecordClinicalDate(b)).getTime();
        case 'quality-desc':
          return (b.qualityScore || 0) - (a.qualityScore || 0);
        case 'quality-asc':
          return (a.qualityScore || 0) - (b.qualityScore || 0);
        case 'patient-name':
          return (a.metadata?.patientName || '').localeCompare(b.metadata?.patientName || '');
        default:
          return 0;
      }
    });

    setFilteredRecords(filtered);
    setPage(1); // Reset to first page when filters change
  }, [records, searchTerm, statusFilter, categoryFilter, dateRange, qualityFilter, sortBy]);

  // Get unique categories for filter
  const categories = Array.from(new Set(
    records.map(record => record.metadata?.category).filter(Boolean)
  ));

  // Pagination
  const startIndex = (page - 1) * recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'High Quality';
    if (score >= 60) return 'Good Quality';
    return 'Needs Review';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setDateRange('All');
    setQualityFilter('All');
    setSortBy('date-desc');
  };

  const handleViewRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
    if (onRecordSelect) {
      onRecordSelect(record);
    }
  };

  const handleEditRecord = (recordId: string) => {
    if (onEditRecord) {
      onEditRecord(recordId);
    }
  };

  // Load prescriptions & lab results for the same visit day whenever a record is selected
  useEffect(() => {
    const fetchExtras = async () => {
      if (!selectedRecord) {
        setPrescriptionsToday([]);
        setLabResultsToday([]);
        return;
      }

      try {
        const pid = selectedRecord.metadata?.patientId || selectedRecord.patient;
        if (!pid) return;

        // Determine the start & end of the day for the clinical visit date (fallback: createdAt)
        const recordDate = new Date(selectedRecord.visitDate || selectedRecord.createdAt);
        const start = new Date(recordDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(recordDate);
        end.setHours(23, 59, 59, 999);

        // Fetch prescriptions for patient and filter by date range
        const allPresc = await prescriptionService.getPrescriptionsByPatient(pid);
        const todaysPresc = allPresc.filter((p: any) => {
          const dt = new Date(p.createdAt || p.created_date || p.date);
          return dt >= start && dt <= end;
        });
        setPrescriptionsToday(todaysPresc);

        // Fetch lab results for doctor, then filter by patient & date & completed
        const labResults = await labService.getDoctorLabResults(user?.id || '');
        const todaysLab = labResults.filter((lr: any) => {
          if (lr.patientId !== pid) return false;
          if ((lr.status || '').toLowerCase() !== 'completed') return false;
          const dt = new Date(lr.resultDate || lr.orderDate);
          return dt >= start && dt <= end;
        });
        setLabResultsToday(todaysLab);
      } catch (err) {
        console.error('Error loading prescriptions/lab results for record:', err);
      }
    };

    fetchExtras();
  }, [selectedRecord]);

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h5">
                {patientId ? 'Patient Medical History' : 'Medical Records History'}
              </Typography>
              <Chip 
                label={`${filteredRecords.length} records`} 
                color="primary" 
                variant="outlined" 
              />
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshCw />}
                onClick={fetchRecords}
                disabled={loading}
                size="small"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
              >
                Clear Filters
              </Button>
            </Box>
          }
        />
        
        <CardContent>
          {/* Search and Filters */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }} component="div">
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Search Records"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by patient, diagnosis, ID..."
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={() => {
                    // Trigger search by updating the search term (already handled by useEffect)
                    setPage(1); // Reset to first page
                  }}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  Search
                </Button>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 6, md: 2 }} component="div">
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="All">All Status</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Finalized">Finalized</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 6, md: 2 }} component="div">
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="All">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 6, md: 2 }} component="div">
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  label="Date Range"
                >
                  <MenuItem value="All">All Time</MenuItem>
                  <MenuItem value="Today">Today</MenuItem>
                  <MenuItem value="Week">Last Week</MenuItem>
                  <MenuItem value="Month">Last Month</MenuItem>
                  <MenuItem value="Year">Last Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 6, md: 2 }} component="div">
              <FormControl fullWidth>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={qualityFilter}
                  onChange={(e) => setQualityFilter(e.target.value)}
                  label="Quality"
                >
                  <MenuItem value="All">All Quality</MenuItem>
                  <MenuItem value="High">High (80%+)</MenuItem>
                  <MenuItem value="Good">Good (60-79%)</MenuItem>
                  <MenuItem value="Low">Low (&lt;60%)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Sort Options */}
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="date-desc">Newest First</MenuItem>
                <MenuItem value="date-asc">Oldest First</MenuItem>
                <MenuItem value="quality-desc">Highest Quality</MenuItem>
                <MenuItem value="quality-asc">Lowest Quality</MenuItem>
                <MenuItem value="patient-name">Patient Name</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Records List */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography>Loading medical records...</Typography>
            </Box>
          ) : paginatedRecords.length === 0 ? (
            <Alert severity="info">
              No medical records found matching your criteria.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell>Chief Complaint</TableCell>
                    <TableCell>Primary Diagnosis</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                            {record.metadata?.patientName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {record.metadata?.patientName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {record.metadata?.patientId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {record.metadata?.chiefComplaintSummary}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          {record.metadata?.primaryDiagnosisCode && (
                            <Chip
                              label={record.metadata.primaryDiagnosisCode}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', mb: 0.5 }}
                            />
                          )}
                          {record.metadata?.primaryDiagnosisICD10 && (
                            <Chip
                              label={`ICD-10: ${record.metadata.primaryDiagnosisICD10}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', mb: 0.5, ml: 0.5 }}
                            />
                          )}
                           {(record.metadata as any)?.primaryDiagnosisICD11 && (
                            <Chip
                              label={`ICD-11: ${(record.metadata as any).primaryDiagnosisICD11}`}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', mb: 0.5, ml: 0.5 }}
                            />
                          )}
                          <Typography variant="body2" sx={{ maxWidth: 250 }}>
                            {record.metadata?.primaryDiagnosisDescription}
                          </Typography>
                          {record.metadata?.category && (
                            <Chip
                              label={record.metadata.category}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Rating
                            value={Math.round((record.qualityScore || 0) / 20)}
                            readOnly
                            size="small"
                          />
                          <Chip
                            label={`${record.qualityScore || 0}%`}
                            size="small"
                            color={getQualityColor(record.qualityScore || 0)}
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          color={record.status === 'Finalized' ? 'success' : 'warning'}
                          variant={record.status === 'Finalized' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(record.visitDate || record.createdAt)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(record.visitDate || record.createdAt).split(' ')[1]}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Record">
                            <IconButton
                              size="small"
                              onClick={() => handleViewRecord(record)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                            {record.status !== 'Finalized' && record.status !== 'Draft' && (
                            <Tooltip title="Edit Record">
                              <IconButton
                                size="small"
                                onClick={() => handleEditRecord(record._id)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Print Record">
                            <IconButton size="small">
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(event, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* View Record Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Medical Record Details
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedRecord.metadata?.patientName}
                  </Typography>
                </Grid>
                
                  <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Record ID</Typography>
                  <Typography variant="body1" gutterBottom sx={{ fontFamily: 'monospace' }}>
                    {selectedRecord._id}
                  </Typography>
                </Grid>
                
                     <Grid size={{ xs: 12 }} component="div">
                  <Typography variant="subtitle2" color="text.secondary">Chief Complaint</Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedRecord.chiefComplaint?.description}
                  </Typography>
                </Grid>
                
                     <Grid size={{ xs: 12 }} component="div">
                  <Typography variant="subtitle2" color="text.secondary">Primary Diagnosis</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    {selectedRecord.metadata?.primaryDiagnosisCode && (
                      <Chip
                        label={`NHDD: ${selectedRecord.metadata.primaryDiagnosisCode}`}
                        color="primary"
                        size="small"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    )}
                    {selectedRecord.metadata?.primaryDiagnosisICD10 && (
                      <Chip
                        label={`ICD-10: ${selectedRecord.metadata.primaryDiagnosisICD10}`}
                        color="secondary"
                        size="small"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    )}
                     {(selectedRecord.metadata as any)?.primaryDiagnosisICD11 && (
                      <Chip
                        label={`ICD-11: ${(selectedRecord.metadata as any).primaryDiagnosisICD11}`}
                        color="success"
                        size="small"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    )}
                    {selectedRecord.metadata?.category && (
                      <Chip
                        label={selectedRecord.metadata.category}
                        color="info"
                        size="small"
                      />
                    )}
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    {selectedRecord.metadata?.primaryDiagnosisDescription}
                  </Typography>
                   {(selectedRecord.metadata as any)?.icd11Chapter && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>ICD-11 Chapter:</strong> {(selectedRecord.metadata as any).icd11Chapter}
                    </Typography>
                  )}
                  {(selectedRecord.metadata as any)?.icd11Block && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>ICD-11 Block:</strong> {(selectedRecord.metadata as any).icd11Block}
                    </Typography>
                  )}
                </Grid>
                
                {selectedRecord.metadata?.secondaryDiagnoses && selectedRecord.metadata.secondaryDiagnoses.length > 0 && (
                     <Grid size={{ xs: 12 }} component="div">
                    <Typography variant="subtitle2" color="text.secondary">Secondary Diagnoses</Typography>
                    {selectedRecord.metadata.secondaryDiagnoses.map((dx, index) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                          <Chip
                            label={`NHDD: ${dx.code}`}
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace' }}
                          />
                           {(dx as any).icd10 && (
                            <Chip
                              label={`ICD-10: ${(dx as any).icd10}`}
                              color="secondary"
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace' }}
                            />
                          )}
                           {(dx as any).severity && (
                            <Chip
                              label={(dx as any).severity}
                              color="warning"
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={dx.category}
                            color="info"
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="body2">{dx.description}</Typography>
                      </Box>
                    ))}
                  </Grid>
                )}
                
                  <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Quality Score</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating
                      value={Math.round((selectedRecord.qualityScore || 0) / 20)}
                      readOnly
                      size="small"
                    />
                    <Chip
                      label={`${selectedRecord.qualityScore || 0}%`}
                      color={getQualityColor(selectedRecord.qualityScore || 0)}
                    />
                    <Typography variant="body2">
                      {getQualityLabel(selectedRecord.qualityScore || 0)}
                    </Typography>
                  </Box>
                </Grid>
                
                  <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedRecord.status}
                    color={selectedRecord.status === 'Finalized' ? 'success' : 'warning'}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                
                  <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                  <Typography variant="body2">
                    {formatDateTime(selectedRecord.createdAt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {selectedRecord.metadata?.doctorName}
                  </Typography>
                </Grid>
                
                {selectedRecord.finalizedAt && (
                  <Grid size={{ xs: 12, md: 6 }} component="div">
                    <Typography variant="subtitle2" color="text.secondary">Finalized</Typography>
                    <Typography variant="body2">
                      {formatDateTime(selectedRecord.finalizedAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {selectedRecord.finalizedByName}
                    </Typography>
                  </Grid>
                )}
                
                     <Grid size={{ xs: 12 }} component="div">
                  <Typography variant="subtitle2" color="text.secondary">Tags</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {selectedRecord.metadata?.tags?.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        color="default"
                      />
                    ))}
                  </Box>
                </Grid>

                {/* Prescriptions Given Today */}
                {prescriptionsToday.length > 0 && (
                     <Grid size={{ xs: 12 }} component="div">
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Prescriptions Given</Typography>
                    <List dense>
                      {prescriptionsToday.map((presc: any) => (
                        <ListItem key={presc._id || presc.id} disablePadding>
                          <ListItemText
                            primary={`${presc.medicationName} ${presc.dosage} • ${presc.frequency}`}
                            secondary={formatDateTime(presc.createdAt)}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}

                {/* Completed Lab Results Today */}
                {labResultsToday.length > 0 && (
                     <Grid size={{ xs: 12 }} component="div">
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Lab Results Finalized</Typography>
                    <List dense>
                      {labResultsToday.map((lr: any) => (
                        <ListItem key={lr._id || lr.id} disablePadding>
                          <ListItemText
                            primary={`${lr.testName}${lr.results ? ` • ${lr.results}` : ''}`}
                            secondary={formatDateTime(lr.resultDate || lr.orderDate)}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            {selectedRecord?.status !== 'Finalized' && selectedRecord?.status !== 'Draft' && (
            <Button
              variant="contained"
              onClick={() => {
                setViewDialogOpen(false);
                handleEditRecord(selectedRecord._id);
              }}
            >
              Edit Record
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicalRecordHistory; 