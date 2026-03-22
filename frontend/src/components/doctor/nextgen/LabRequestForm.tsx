import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, IconButton, Paper, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { createLabRequest, getLabRequestsByPatient, updateLabRequest } from '../../../api/labs';

interface LabRequestFormProps {
  patientId: string;
  recordId?: string;
  disabled?: boolean;
}

interface LabTest {
  id: string;
  name: string;
  notes: string;
}

const LabRequestForm: React.FC<LabRequestFormProps> = ({ 
  patientId,
  recordId,
  disabled = false
}) => {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [testName, setTestName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId) {
      fetchLabRequests();
    }
  }, [recordId]);

  const fetchLabRequests = async () => {
    try {
      setLoading(true);
      const response = await getLabRequestsByPatient(patientId);
      const requests = response.data.filter(r => r.recordId === recordId);
      if (requests.length > 0) {
        setLabTests(requests);
      }
    } catch (err) {
      setError('Failed to load lab requests');
    } finally {
      setLoading(false);
    }
  };

  // Available lab test options
  const availableTests = [
    'Complete Blood Count (CBC)',
    'Basic Metabolic Panel (BMP)',
    'Comprehensive Metabolic Panel (CMP)',
    'Lipid Panel',
    'Liver Function Tests',
    'Thyroid Function Tests',
    'Hemoglobin A1C',
    'Urinalysis',
    'Stool Analysis',
    'COVID-19 Test',
    'Chest X-Ray',
    'ECG/EKG',
    'Ultrasound',
    'MRI',
    'CT Scan'
  ];

  const handleAddTest = () => {
    if (!testName) return;
    
    const newTest: LabTest = {
      id: Date.now().toString(),
      name: testName,
      notes: notes
    };
    
    setLabTests([...labTests, newTest]);
    setTestName('');
    setNotes('');
  };

  const handleRemoveTest = (id: string) => {
    setLabTests(labTests.filter(test => test.id !== id));
  };

  const saveLabTest = async (test: LabTest) => {
    try {
      if (test.id) {
        await updateLabRequest(test.id, test);
      } else {
        await createLabRequest({
          ...test,
          patientId,
          recordId,
        });
      }
    } catch (err) {
      throw new Error('Failed to save lab test');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {!disabled && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom>Add Lab Test</Typography>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
            <FormControl fullWidth sx={{ flex: 2 }}>
              <InputLabel id="lab-test-select-label">Test Name</InputLabel>
              <Select
                labelId="lab-test-select-label"
                value={testName}
                label="Test Name"
                onChange={(e) => setTestName(e.target.value)}
                disabled={disabled}
              >
                {availableTests.map((test) => (
                  <MenuItem key={test} value={test}>{test}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              sx={{ flex: 3 }}
              disabled={disabled}
            />
            <Button
              variant="contained"
              startIcon={<DeleteIcon />}
              onClick={handleAddTest}
              disabled={!testName || disabled}
              sx={{ height: { md: 56 }, flex: { xs: '1 1 auto', md: '0 0 auto' } }}
            >
              Add Test
            </Button>
          </Box>
        </Box>
      )}

      {labTests.length > 0 ? (
        <TableContainer component={Paper}>
          <Table aria-label="lab tests table">
            <TableHead>
              <TableRow>
                <TableCell>Test Name</TableCell>
                <TableCell>Notes</TableCell>
                {!disabled && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {labTests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell>{test.name}</TableCell>
                  <TableCell>{test.notes}</TableCell>
                  {!disabled && (
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveTest(test.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          No lab tests requested yet.
        </Typography>
      )}
    </Box>
  );
};

export default LabRequestForm; 