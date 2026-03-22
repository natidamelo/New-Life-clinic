import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import billingService, {
  Invoice,
  CreateInvoiceData,
  UpdateInvoiceData,
  AddPaymentData
} from '../../services/billingService';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import serviceService from '../../services/serviceService';
import InvoiceList from '../../components/Billing/InvoiceList';
import InvoiceForm from '../../components/Billing/InvoiceForm';
import InvoiceDetail from '../../components/Billing/InvoiceDetail';
import { Patient } from '../../types/patient';
import { Doctor } from '../../types/doctor';
import { Service } from '../../types/service';

const BillingContainer: React.FC = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [patientsData, doctorsData, servicesData] = await Promise.all([
          patientService.getAllPatients(),
          doctorService.getAllDoctors(),
          serviceService.getServices()
        ]);
        setPatients(Array.isArray(patientsData) ? patientsData : (patientsData as any)?.data || []);
        setDoctors(Array.isArray(doctorsData) ? doctorsData : (doctorsData as any)?.data || []);
        setServices(servicesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load required data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateInvoice = async (data: CreateInvoiceData) => {
    try {
      const invoice = await billingService.createInvoice(data);
      toast.success('Invoice created successfully');
      navigate(`/billing/invoices/${invoice._id}`);
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast.error('Failed to create invoice');
      throw err;
    }
  };

  const handleUpdateInvoice = async (id: string, data: UpdateInvoiceData) => {
    try {
      const invoice = await billingService.updateInvoice(id, data);
      toast.success('Invoice updated successfully');
      navigate(`/billing/invoices/${invoice._id}`);
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast.error('Failed to update invoice');
      throw err;
    }
  };

  const handleAddPayment = async (id: string, data: AddPaymentData) => {
    try {
      const invoice = await billingService.addPayment(id, data);
      setSelectedInvoice(invoice);
      toast.success('Payment processed successfully');
    } catch (err) {
      console.error('Error processing payment:', err);
      toast.error('Failed to process payment');
      throw err;
    }
  };

  const handleCancelInvoice = async (id: string, reason: string) => {
    try {
      const invoice = await billingService.cancelInvoice(id, reason);
      setSelectedInvoice(invoice);
      toast.success('Invoice cancelled successfully');
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      toast.error('Failed to cancel invoice');
      throw err;
    }
  };

  const InvoiceDetailWrapper: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
      const fetchInvoice = async () => {
        if (id) {
          try {
            setLoading(true);
            const invoice = await billingService.getInvoiceById(id);
            setSelectedInvoice(invoice);
            setError(null);
          } catch (err) {
            console.error('Error fetching invoice:', err);
            setError('Failed to load invoice details');
            navigate('/billing/invoices');
          } finally {
            setLoading(false);
          }
        }
      };

      fetchInvoice();
    }, [id]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (error || !selectedInvoice) {
      return <div>Error: {error || 'Invoice not found'}</div>;
    }

    return (
      <InvoiceDetail
        invoice={selectedInvoice}
        onPayment={async () => {
          if (id) {
            await handleAddPayment(id, {
              amount: selectedInvoice.balance,
              method: 'cash',
              reference: '',
              notes: ''
            });
          }
        }}
        onCancel={async (reason) => {
          if (id) {
            await handleCancelInvoice(id, reason);
          }
        }}
      />
    );
  };

  const InvoiceFormWrapper: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
      const fetchInvoice = async () => {
        if (id) {
          try {
            setLoading(true);
            const invoice = await billingService.getInvoiceById(id);
            setSelectedInvoice(invoice);
            setError(null);
          } catch (err) {
            console.error('Error fetching invoice:', err);
            setError('Failed to load invoice details');
            navigate('/billing/invoices');
          } finally {
            setLoading(false);
          }
        } else {
          setSelectedInvoice(null);
          setLoading(false);
        }
      };

      fetchInvoice();
    }, [id]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (error) {
      return <div>Error: {error}</div>;
    }

    return (
      <InvoiceForm
        invoice={selectedInvoice || undefined}
        patients={patients}
        doctors={doctors}
        onSubmit={async (data) => {
          if (id) {
            await handleUpdateInvoice(id, data as UpdateInvoiceData);
          } else {
            await handleCreateInvoice(data as CreateInvoiceData);
          }
        }}
      />
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<InvoiceList />} />
      <Route path="/new" element={<InvoiceFormWrapper />} />
      <Route path="/:id" element={<InvoiceDetailWrapper />} />
      <Route path="/:id/edit" element={<InvoiceFormWrapper />} />
    </Routes>
  );
};

export default BillingContainer; 