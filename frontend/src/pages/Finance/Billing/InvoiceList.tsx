import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Badge, Button } from 'react-bootstrap'; // Import necessary components
import api from '../../../services/api';
import billingService, { Invoice } from '../../../services/billingService'; // Import service and Invoice type
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; // For linking to invoice details

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLabOrders, setPendingLabOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchPendingLabOrders();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the data
      const apiResponse = await billingService.getAllInvoices(); 
      
      // Check the structure and set state
      if (apiResponse && Array.isArray(apiResponse)) {
        setInvoices(apiResponse); // Directly set the data array
      } else if (apiResponse && apiResponse.data && Array.isArray(apiResponse.data)) {
        setInvoices(apiResponse.data); // Handle wrapped response
      } else {
        // Handle unexpected structure
        console.error("API response did not contain a valid 'data' array:", apiResponse);
        setInvoices([]); 
        throw new Error('Received invalid data format for invoices.');
      }
    } catch (err: any) {
      console.error("Failed to fetch invoices:", err);
      const message = err.response?.data?.message || err.message || 'Failed to load invoices. Please try again.';
      setError(message);
      toast.error(message);
      setInvoices([]); // Ensure invoices is empty on error
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingLabOrders = async () => {
    try {
      const response = await api.get('/api/lab-orders/pending-for-reception');
      const labOrders = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const filtered = (labOrders || []).filter((o: any) => {
        const isPaid = (o.paymentStatus || '').toLowerCase() === 'paid';
        const amount = Number(o.totalPrice || o.servicePrice || 0);
        return !isPaid && amount > 0;
      });
      setPendingLabOrders(filtered);
    } catch (e) {
      console.error('Failed to fetch pending lab orders', e);
      setPendingLabOrders([]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge bg="success">Paid</Badge>;
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'partial':
        return <Badge bg="info">Partial</Badge>;
      case 'overdue':
        return <Badge bg="danger">Overdue</Badge>;
      case 'cancelled':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="light" text="dark">{status || 'Unknown'}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString; // Return original if formatting fails
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading invoices...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger">Error loading invoices: {error}</Alert>
        <Button variant="primary" onClick={fetchInvoices}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
         <h2 className="text-xl font-semibold">Invoice List</h2>
         {/* Add button to create new invoice - link needs to be adjusted */}
         {/* <Link to="/finance/billing/invoices/new" className="btn btn-primary">Create Invoice</Link> */}
       </div>

      {/* Pending Lab Orders to process payment */}
      {pendingLabOrders.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2">Lab Tests Awaiting Payment</h5>
          <Table striped bordered hover responsive size="sm">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Test</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingLabOrders.map((o: any) => {
                const patient = o.patient || o.patientId || {};
                const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
                const amount = Number(o.totalPrice || o.servicePrice || 0);
                return (
                  <tr key={o._id}>
                    <td>{fullName}</td>
                    <td>{o.testName || 'Lab Test'}</td>
                    <td>ETB {amount}</td>
                    <td><Badge bg="warning">Pending</Badge></td>
                    <td>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          toast('Opening payment form...', { icon: '💳' });
                          // Invoices page relies on invoice-based payment.
                          // Trigger backend to create/update invoice via process-lab-payment with this single order
                          // Then refresh invoice list.
                          (async () => {
                            try {
                              const payBody = {
                                labOrderIds: [o._id],
                                amountPaid: amount,
                                paymentMethod: 'cash',
                                notes: `Lab payment for ${o.testName}`
                              };
                              await api.post('/api/billing/process-lab-payment', payBody);
                              toast.success('Lab payment processed');
                              await Promise.all([fetchInvoices(), fetchPendingLabOrders()]);
                            } catch (err: any) {
                              console.error('Payment failed', err?.response?.data || err);
                              toast.error(err?.response?.data?.message || 'Payment failed');
                            }
                          })();
                        }}
                      >
                        Process Payment
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
      
      {invoices.length === 0 ? (
        <Alert variant="info">No invoices found.</Alert>
      ) : (
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Patient</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Total Amount</th>
              <th>Amount Due</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice: Invoice) => ( // Use the correct Invoice type
              <tr key={invoice._id}>
                <td>{invoice.invoiceNumber || invoice._id}</td>
                {/* Use patientId directly as patientName isn't populated */}
                <td>{invoice.patientId}</td> 
                {/* Use issueDate or createdAt */}
                <td>{formatDate(invoice.issueDate || invoice.createdAt)}</td> 
                {/* Use dueDate if available, otherwise N/A */}
                <td>{formatDate(invoice.dueDate)}</td> 
                {/* Use amount for total */}
                <td>${invoice.total?.toFixed(2) ?? 'N/A'}</td> 
                {/* Use balance property from Invoice interface */}
                <td>${invoice.balance?.toFixed(2) ?? 'N/A'}</td> 
                <td>{getStatusBadge(invoice.status)}</td>
                <td>
                  {/* Add view/action buttons - links need to be adjusted */}
                  {/* <Link to={`/finance/billing/invoices/${invoice._id}`} className="btn btn-sm btn-outline-primary me-1">View</Link> */}
                  {/* Add other actions like payment recording if applicable */}
                  <Button variant="outline-secondary" size="sm" disabled>Actions</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {/* TODO: Add pagination controls if needed */}
    </div>
  );
};

export default InvoiceList; 
