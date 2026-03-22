import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-hot-toast'; // Replaced
import { toast } from 'react-toastify'; // Use react-toastify
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'; // Import MUI Icon

// Services
import billingService, { CreateInvoiceData, Invoice } from '../../services/billingService';
import patientService, { Patient } from '../../services/patientService'; // Assuming Patient type is exported
import doctorService from '../../services/doctorService';
import { Doctor } from '../../types/user'; // Import Doctor type

// Shared Components
import InvoiceForm from '../../components/Billing/InvoiceForm'; 
import { Card } from '../../components/ui/card'; // Keep for overall page structure if needed
import { Container, Typography, CircularProgress, Alert, Box, Button, Paper } from '@mui/material'; // For layout and feedback

const NewInvoicePage: React.FC = () => { // Renamed for clarity, assuming it's a "page"
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const patientResponse = await patientService.getAllPatients(false, false); // Adjust params as needed
        setPatients(patientResponse.patients || []);
        
        // Fetch doctors and ensure we always set an array
        const doctorResponse = await doctorService.getAllDoctors();
        let doctorsArr: Doctor[] = [];
        if (Array.isArray(doctorResponse)) {
          doctorsArr = doctorResponse;
        } else if (doctorResponse && Array.isArray(doctorResponse.doctors)) {
          doctorsArr = doctorResponse.doctors;
        }
        setDoctors(doctorsArr);

      } catch (err: any) {
        console.error('Error fetching initial data for new invoice:', err);
        setError(err.response?.data?.message || 'Failed to load necessary data. Please try again.');
        toast.error(err.response?.data?.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFormSubmit = async (invoiceData: CreateInvoiceData): Promise<Invoice | void> => {
    // This function is passed to InvoiceForm's onSubmit prop.
    // It must return the created invoice object for InvoiceForm to handle marking items as billed.
    try {
      // Note: Original NewInvoiceForm.tsx had patientId in invoiceData, 
      // but our shared InvoiceForm manages 'patient' field which is patient._id
      // Ensure invoiceData structure from InvoiceForm matches what createInvoice expects
      // The 'onSubmit' in InvoiceForm.tsx already prepares 'formData as CreateInvoiceData | UpdateInvoiceData'
      
      const newInvoice = await billingService.createInvoice(invoiceData);
      toast.success('Invoice created successfully!');
      // Navigation will be handled by InvoiceForm's own handleSubmit after this promise resolves
      return newInvoice; 
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create invoice. Please try again.';
      toast.error(errorMessage);
      // Re-throw or handle error state for InvoiceForm if needed.
      // For now, InvoiceForm's handleSubmit has its own catch block.
      // To make InvoiceForm aware of this specific error, we might need to throw it.
      throw new Error(errorMessage); // Propagate error to InvoiceForm
    }
  };

  const handleGoBack = () => {
    navigate('/billing'); // Or a more appropriate back destination
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={handleGoBack}>Go Back</Button>
      </Container>
    );
  }
  
  // Original NewInvoiceForm used Heroicons and a different Card.
  // We're now adopting the structure that InvoiceForm would fit into, likely Material-UI based on InvoiceForm's imports.
  // The outer structure from old NewInvoiceForm.tsx can be adapted.
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}> {/* Using Container for consistency with Material UI */}
      <Box display="flex" alignItems="center" mb={3}>
        <Button 
          variant="outlined"
          startIcon={<ArrowBackIcon />} // Use MUI Icon
          onClick={handleGoBack}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          New Invoice
        </Typography>
      </Box>
      
      {/* 
        The old NewInvoiceForm used a <Card> component from '../../components/ui/card'.
        InvoiceForm itself uses Material-UI <Paper> for its sections.
        We can wrap InvoiceForm in a Material-UI Card or Paper if desired for consistent page styling.
      */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <InvoiceForm
          patients={patients as any}
          doctors={doctors as any}
          onSubmit={handleFormSubmit}
          // invoice prop is omitted for new invoices
        />
      </Paper>
    </Container>
  );
};

export default NewInvoicePage; 