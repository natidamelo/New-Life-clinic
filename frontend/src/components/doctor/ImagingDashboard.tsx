import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Card from '../Card';
import { useAuth } from '../../context/AuthContext';
import { useGlobalDashboardSettings, useDashboardRefreshInterval } from '../../hooks/useGlobalDashboardSettings';
import imagingService from '../../services/imagingService';
import ImagingResultsForm from '../imaging/ImagingResultsForm';
import ImagingResultsViewer from '../imaging/ImagingResultsViewer';
import { ImagingOrder as NewImagingOrder } from '../../services/imagingService';

interface ImagingOrder {
  id: string;
  type: string;
  orderedBy: string;
  date: string;
  status: string;
  results?: string;
  notes?: string;
  patientName?: string;
  patientId?: string;
  bodyPart?: string;
}

const MahletImagingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingOrders, setPendingOrders] = useState<ImagingOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<ImagingOrder[]>([]);
  const [ordersById, setOrdersById] = useState<Record<string, NewImagingOrder>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<NewImagingOrder | null>(null);
  const [selectedOrderForView, setSelectedOrderForView] = useState<NewImagingOrder | null>(null);
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  
  // Role-specific dashboard settings
  const { settings: roleSettings, loading: settingsLoading } = useGlobalDashboardSettings('imaging');
  const refreshInterval = useDashboardRefreshInterval('imaging');

  // Verify user is Mahlet or has imaging role
  useEffect(() => {
    const userData = user || JSON.parse(localStorage.getItem('user') || '{}');
    
    if (userData.role !== 'imaging') {
      console.warn(`Non-imaging user detected (${userData.role}). Redirecting to appropriate dashboard.`);
      // Use the getRoleBasedRoute function if available
      if (window.location && userData.role) {
        const redirectPath = userData.role === 'doctor' ? '/app/doctor' : 
                            userData.role === 'nurse' ? '/nurse' :
                            userData.role === 'reception' ? '/reception' :
                            userData.role === 'admin' ? '/admin' :
                            userData.role === 'lab' ? '/lab' :
                            userData.role === 'pharmacy' ? '/pharmacy' : '/';
        
        navigate(redirectPath);
      }
    } else {
      console.log('Correct user role (imaging) detected for Mahlet Yohannes.');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchImagingOrders();
  }, []);

  const fetchImagingOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we have a valid authentication token using AuthContext
      const token = getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('Attempting to fetch imaging orders from API...');
      const ordersFromApi: NewImagingOrder[] = await imagingService.getImagingOrders();

      const byId: Record<string, NewImagingOrder> = {};
      for (const o of ordersFromApi) {
        if (o?._id) byId[o._id] = o;
      }
      setOrdersById(byId);

      const formatted: ImagingOrder[] = ordersFromApi.map(o => ({
        id: o._id,
        date: o.orderDateTime ? o.orderDateTime.substring(0,10) : '',
        patientName: o.patient?.name ?? (`${o.patient?.firstName || ''} ${o.patient?.lastName || ''}`.trim() || 'Unknown patient'),
        type: o.imagingType,
        bodyPart: o.bodyPart,
        orderedBy: o.doctor?.name ?? (`${(o.doctor as any)?.firstName || ''} ${(o.doctor as any)?.lastName || ''}`.trim() || 'Unknown doctor'),
        status: o.status.toLowerCase(),
        results: o.results ?? null,
        notes: (o as any).notes ?? ''
      }));

      setPendingOrders(formatted.filter(o=> o.status !== 'completed' && o.status !== 'results available'));
      setCompletedOrders(formatted.filter(o=> o.status === 'completed' || o.status === 'results available'));
    } catch (err) {
      console.error('Error fetching imaging orders:', err);
      setError('Failed to load imaging orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, results?: string) => {
    try {
      // Persist status change to server
      await imagingService.updateImagingOrder(orderId, {
        status: status === 'completed' ? 'Completed' : status === 'cancelled' ? 'Cancelled' : 'Ordered',
        results: results
      });
      
      // Update local state
      const allOrders = [...pendingOrders, ...completedOrders];
      const updatedOrders = allOrders.map(order => 
        order.id === orderId ? { ...order, status, results: results || order.results } : order
      );
      
      setPendingOrders(updatedOrders.filter(order => order.status !== 'completed'));
      setCompletedOrders(updatedOrders.filter(order => order.status === 'completed'));
      
      toast.success(`Order ${status === 'completed' ? 'completed' : 'updated'} successfully`);
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Failed to update order status');
    }
  };

  const handleEnterResults = (order: ImagingOrder) => {
    const realOrder = ordersById[order.id];
    if (!realOrder) {
      toast.error('Could not load the selected imaging order. Please refresh.');
      return;
    }
    setSelectedOrderForEdit(realOrder);
  };
  
  const handleViewResults = (order: ImagingOrder) => {
    const realOrder = ordersById[order.id];
    if (!realOrder) {
      toast.error('Could not load the selected imaging order. Please refresh.');
      return;
    }
    setSelectedOrderForView(realOrder);
  };
  
  const handleEditResults = () => {
    if (selectedOrderForView) {
      setSelectedOrderForEdit(selectedOrderForView);
      setSelectedOrderForView(null);
    }
  };

  // Helper function to determine payment status from order data
  const getPaymentStatus = (order: any) => {
    if (!order.serviceRequestId) {
      return { status: 'No Invoice', color: 'bg-muted/20 text-muted-foreground border-border/30' };
    }
    
    const invoice = order.serviceRequestId?.invoice;
    if (!invoice) {
      return { status: 'Pending Payment', color: 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] border-[hsl(var(--status-warning-border))]' };
    }
    
    const invoiceStatus = invoice.status?.toLowerCase();
    switch (invoiceStatus) {
      case 'paid':
        return { status: 'Paid', color: 'bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] border-[hsl(var(--status-success-border))]' };
      case 'partial':
      case 'partially_paid':
        return { status: 'Partial', color: 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]' };
      case 'pending':
        return { status: 'Pending', color: 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] border-[hsl(var(--status-warning-border))]' };
      case 'overdue':
        return { status: 'Overdue', color: 'bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] border-[hsl(var(--status-error-border))]' };
      default:
        return { status: 'Unknown', color: 'bg-muted/20 text-muted-foreground border-border/30' };
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-destructive text-center p-4">{error}</div>;
  }

  // If editing, render the form page instead of dashboard
  if (selectedOrderForEdit) {
    return (
      <ImagingResultsForm 
        order={selectedOrderForEdit} 
        onSubmit={async(id,results)=>{
          const orderId = id || selectedOrderForEdit?._id;
          console.log('ImagingDashboard: onSubmit called with id:', orderId, 'results:', results);
          try {
            const updatedOrder = await imagingService.submitImagingResults(orderId,results);
            console.log('ImagingDashboard: Results submitted successfully');
            toast.success('Report finalized successfully');
            await fetchImagingOrders();
            // Keep the form open so user can "Send to Doctor"
            setSelectedOrderForEdit(updatedOrder);
          } catch (error) {
            console.error('ImagingDashboard: Error submitting results:', error);
            toast.error('Failed to save imaging results');
            throw error;
          }
        }} 
        onCancel={()=>setSelectedOrderForEdit(null)} 
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Imaging Dashboard - Mahlet</h1>
        <div className="flex space-x-2">
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary"
            onClick={() => setShowNewOrderForm(true)}
          >
            Create Order
          </button>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary"
            onClick={() => navigate('/imaging/schedule')}
          >
            View Schedule
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="border-b border-border/30">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pending Orders ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`${
                activeTab === 'completed'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Completed Orders ({completedOrders.length})
            </button>
          </nav>
        </div>
      </div>
      
      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {activeTab === 'pending' ? 'Pending Imaging Orders' : 'Completed Imaging Orders'}
          </h2>
          
          {(activeTab === 'pending' ? pendingOrders : completedOrders).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No {activeTab} orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Body Part</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Ordered By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-primary-foreground divide-y divide-gray-200">
                  {(activeTab === 'pending' ? pendingOrders : completedOrders).map((order) => {
                    const paymentStatus = getPaymentStatus(order);
                    return (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{order.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.patientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.bodyPart}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.orderedBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${paymentStatus.color}`}>
                          {paymentStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'pending' 
                            ? 'bg-accent/20 text-accent-foreground' 
                            : order.status === 'completed' 
                              ? 'bg-primary/20 text-primary'
                              : 'bg-destructive/20 text-destructive'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTab === 'pending' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEnterResults(order)}
                              className="bg-primary hover:bg-primary text-primary-foreground px-3 py-1 rounded text-xs"
                            >
                              {order.results ? 'Edit Results' : 'Enter Results'}
                            </button>
                            {order.results && (
                              <>
                                <button
                                  onClick={() => handleViewResults(order)}
                                  className="text-primary hover:text-primary text-xs px-2 py-1 border border-primary/30 rounded hover:bg-primary/10"
                                >
                                  View Results
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'completed')}
                                  className="bg-primary hover:bg-primary text-primary-foreground px-3 py-1 rounded text-xs"
                                >
                                  Complete
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="bg-destructive hover:bg-destructive text-primary-foreground px-3 py-1 rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewResults(order)}
                              className="text-primary hover:text-primary text-xs px-2 py-1 border border-primary/30 rounded hover:bg-primary/10"
                            >
                              View Results
                            </button>
                            <button
                              onClick={() => handleEnterResults(order)}
                              className="bg-accent hover:bg-accent text-primary-foreground px-3 py-1 rounded text-xs"
                            >
                              Edit Results
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      
      {/* This is where you would include the MahletImagingOrderForm component when showNewOrderForm is true */}
      {showNewOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground rounded-lg shadow-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Create New Imaging Order</h2>
            <form className="space-y-4">
              {/* Form fields would go here */}
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-border/40 rounded text-muted-foreground"
                  onClick={() => setShowNewOrderForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded"
                  onClick={() => {
                    toast.error('Order creation is not configured on this screen yet.');
                  }}
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOrderForView && (
        <ImagingResultsViewer 
          order={selectedOrderForView} 
          onClose={()=>setSelectedOrderForView(null)}
          onEdit={handleEditResults}
        />
      )}
    </div>
  );
};

export default MahletImagingDashboard; 