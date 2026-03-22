import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { 
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  Printer
} from 'lucide-react';
import axios from 'axios';

interface Invoice {
  id: string;
  patientName: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/billing/invoices');
        console.log('API Response:', response.data);
        
        // Check if the data is an array, otherwise handle it appropriately
        if (Array.isArray(response.data)) {
          setInvoices(response.data);
        } else if (response.data && response.data.invoices && Array.isArray(response.data.invoices)) {
          // If the data is nested in an 'invoices' property
          setInvoices(response.data.invoices);
        } else {
          // If we received something unexpected, log it and use mock data
          console.error('Unexpected data format:', response.data);
          // Use mock data for development
          setInvoices(getMockInvoices());
          setError('Received unexpected data format from server. Using mock data instead.');
        }
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to load invoices. Using mock data instead.');
        // Use mock data for development
        setInvoices(getMockInvoices());
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);

  // Function to generate mock invoice data for development
  const getMockInvoices = (): Invoice[] => {
    return [
      {
        id: 'INV-001',
        patientName: 'John Doe',
        date: '2024-03-15',
        amount: 150.00,
        status: 'paid'
      },
      {
        id: 'INV-002',
        patientName: 'Sarah Johnson',
        date: '2024-03-14',
        amount: 275.50,
        status: 'pending'
      },
      {
        id: 'INV-003',
        patientName: 'Robert Johnson',
        date: '2024-03-13',
        amount: 200.00,
        status: 'overdue'
      },
      {
        id: 'INV-004',
        patientName: 'Emily Davis',
        date: '2024-03-12',
        amount: 350.00,
        status: 'paid'
      },
      {
        id: 'INV-005',
        patientName: 'Michael Wilson',
        date: '2024-03-11',
        amount: 125.75,
        status: 'pending'
      }
    ];
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-primary/20 text-primary';
      case 'pending':
        return 'bg-accent/20 text-accent-foreground';
      case 'overdue':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your invoices</p>
        </div>
        <button className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          New Invoice
        </button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative w-full md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="pl-10 pr-4 py-2 border border-border/30 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex space-x-3">
            <button className="btn btn-secondary flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filter
            </button>
            <button className="btn btn-secondary flex items-center">
              <Download className="w-5 h-5 mr-2" />
              Export
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-accent/10 border border-amber-200 text-accent-foreground px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border/30">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/10 border-b border-border/30">
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Invoice ID</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Patient Name</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices && invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-primary mr-2" />
                            <span className="font-medium">{invoice.id}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium">{invoice.patientName}</td>
                        <td className="py-4 px-6 text-muted-foreground">{invoice.date}</td>
                        <td className="py-4 px-6 font-medium">${invoice.amount.toFixed(2)}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex space-x-2">
                            <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-full bg-muted/10 text-muted-foreground hover:bg-muted/20 transition-colors">
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {invoices.length > 0 ? `1 to ${invoices.length} of ${invoices.length}` : '0'} invoices
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-muted/20 text-muted-foreground rounded-md font-medium">Previous</button>
                <button className="px-3 py-1 text-sm bg-primary/20 text-primary rounded-md font-medium">1</button>
                <button className="px-3 py-1 text-sm bg-muted/20 text-muted-foreground rounded-md font-medium">Next</button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default InvoiceList; 