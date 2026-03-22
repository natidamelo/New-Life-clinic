import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Stack
} from '@mui/material';
import { AddCircleOutline as AddIcon, CancelOutlined as CancelIcon } from '@mui/icons-material';
// Assume a service exists to call the new backend endpoints
import dispensedChargeService, { DispensedItemCharge } from '../../services/dispensedChargeService'; // This service needs to be created
import { InvoiceItem } from '../../services/billingService'; // For the onAddItemToInvoice callback

interface PendingDispensedChargesProps {
  patientId: string | null;
  onAddItemToInvoice: (item: Omit<InvoiceItem, 'total' | 'tax' | 'discount'> & { dispensedChargeId: string }) => void;
  // We might need the invoiceId later to mark items as billed, or handle it in the parent
}

const PendingDispensedCharges: React.FC<PendingDispensedChargesProps> = ({ patientId, onAddItemToInvoice }) => {
  const [pendingCharges, setPendingCharges] = useState<DispensedItemCharge[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingCharges = async () => {
    if (!patientId) {
      setPendingCharges([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const charges = await dispensedChargeService.getPendingChargesByPatient(patientId);
      setPendingCharges(charges);
    } catch (err: any) {
      console.error('Error fetching pending dispensed charges:', err);
      setError(err.response?.data?.message || 'Failed to fetch pending charges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCharges();
  }, [patientId]);

  const handleAddToInvoice = (charge: DispensedItemCharge) => {
    // The parent InvoiceForm will handle marking as billed AFTER invoice is saved
    onAddItemToInvoice({
      dispensedChargeId: charge._id, // Important for linking back
      itemType: 'medication', // Or determine from charge.inventoryItem details if available
      description: charge.itemName || charge.inventoryItem?.name || 'Dispensed Item',
      quantity: charge.quantityDispensed,
      unitPrice: charge.unitPrice,
      // tax and discount can be defaulted or handled in InvoiceForm
    });
    // Optimistically remove from list, or refresh
    setPendingCharges(prev => prev.filter(c => c._id !== charge._id));
  };

  const handleCancelCharge = async (chargeId: string) => {
    if (!window.confirm('Are you sure you want to cancel this dispensed charge?')) return;
    try {
      await dispensedChargeService.cancelCharge(chargeId);
      // Refresh list
      fetchPendingCharges(); 
      // Add notification here: "Charge cancelled successfully"
    } catch (err: any) {
      console.error('Error cancelling charge:', err);
      setError(err.response?.data?.message || 'Failed to cancel charge.');
      // Add notification here: "Failed to cancel charge"
    }
  };

  if (!patientId) {
    return null; // Don't render if no patient is selected
  }

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Pending Dispensed Items</Typography>
      {pendingCharges.length === 0 ? (
        <Typography variant="body2">No pending dispensed items for this patient.</Typography>
      ) : (
        <List dense>
          {pendingCharges.map((charge) => (
            <ListItem 
              key={charge._id}
              divider
              sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
            >
              <ListItemText
                primary={`${charge.itemName || charge.inventoryItem?.name} (Qty: ${charge.quantityDispensed})`}
                secondary={`Dispensed: ${new Date(charge.dispenseDate).toLocaleDateString()} - Price: ${charge.totalPrice.toFixed(2)}`}
              />
              <ListItemSecondaryAction>
                <Stack direction="row" spacing={1}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<AddIcon />}
                    onClick={() => handleAddToInvoice(charge)}
                    aria-label={`Add ${charge.itemName || charge.inventoryItem?.name} to invoice`}
                  >
                    Add
                  </Button>
                  <IconButton 
                    edge="end" 
                    aria-label={`Cancel charge for ${charge.itemName || charge.inventoryItem?.name}`}
                    onClick={() => handleCancelCharge(charge._id)}
                    color="error"
                  >
                    <CancelIcon />
                  </IconButton>
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default PendingDispensedCharges; 