import React, { useEffect, useState } from 'react';
import { RefreshCw, Camera } from 'lucide-react';
import { Button } from '../ui/button';
import imagingService, { ImagingOrder } from '../../services/imagingService';
import { formatDate } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import ImagingResultsViewer from '../imaging/ImagingResultsViewer';

interface ImagingResultsListProps {
  doctorId?: string;
}

const ImagingResultsList: React.FC<ImagingResultsListProps> = ({ doctorId }) => {
  const [results, setResults] = useState<ImagingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ImagingOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchResults = async () => {
    try {
      setLoading(true);
      const orders = await imagingService.getImagingOrders();
      
      // Show all orders for this doctor, not just completed ones
      const filtered = orders.filter((o) => {
        const docMatch = doctorId
          ? (typeof o.doctor === 'object' ? o.doctor._id === doctorId : o.doctor === doctorId)
          : true;
        return docMatch;
      });
      
      // Sort by most recent date first (newest to oldest)
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.orderDateTime || a.createdAt || 0).getTime();
        const dateB = new Date(b.orderDateTime || b.createdAt || 0).getTime();
        return dateB - dateA; // Descending order (most recent first)
      });
      
      setResults(sorted);
      // Update pagination
      const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
      setTotalPages(pages);
      setCurrentPage((p) => Math.min(p, pages));
    } catch (err) {
      console.error('Error fetching imaging results:', err);
      toast.error('Failed to load imaging results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [doctorId]);

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-muted-foreground">Imaging Orders</h2>
        <Button variant="outline" size="sm" onClick={fetchResults} disabled={loading}>
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-2">Loading imaging results...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center p-8 bg-muted/10 rounded-lg">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-2 text-lg font-medium text-muted-foreground">No imaging orders found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Imaging orders will appear here once they are created.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Imaging Type</th>
                <th className="px-4 py-2 text-left">Body Part</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results
                .slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)
                .map((order) => {
                const patientName = typeof order.patient === 'object'
                  ? order.patient.name
                  : 'Patient';
                const status = order.status?.toLowerCase() || 'ordered';
                const hasResults = status === 'results available' || status === 'completed';
                
                return (
                  <tr key={order._id} className="hover:bg-muted/10">
                    <td className="px-4 py-2">
                      <div className="font-medium text-muted-foreground">{patientName}</div>
                      <div className="text-sm text-muted-foreground">ID: {order._id}</div>
                    </td>
                    <td className="px-4 py-2">{order.imagingType}</td>
                    <td className="px-4 py-2">{order.bodyPart}</td>
                    <td className="px-4 py-2">{formatDate(order.orderDateTime)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        hasResults 
                          ? 'bg-primary/20 text-primary' 
                          : status === 'ordered'
                            ? 'bg-accent/20 text-accent-foreground'
                            : 'bg-muted/20 text-muted-foreground'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={async () => {
                          try {
                            console.log('Viewing results for order:', order._id);
                            
                            if (!order._id) {
                              console.error('Order ID is undefined:', order);
                              toast.error('Invalid order ID');
                              return;
                            }
                            
                            // Force refresh data before viewing results
                            await fetchResults();
                            // Find the updated order
                            const orders = await imagingService.getImagingOrders();
                            const updatedOrder = orders.find(o => o._id === order._id);
                            console.log('Updated order found:', updatedOrder ? 'Yes' : 'No');
                            console.log('Order has results:', updatedOrder?.results ? 'Yes' : 'No');
                            
                            setSelectedOrder(updatedOrder || order);
                          } catch (error) {
                            console.error('Error viewing results:', error);
                            toast.error('Failed to load results');
                          }
                        }}
                        className="px-3 py-1 text-sm font-medium text-primary bg-primary/10 border border-primary/30 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        View Results
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t mt-2">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * pageSize + 1, results.length)} - {Math.min(currentPage * pageSize, results.length)} of {results.length} results
              <span className="ml-2 text-xs">(Page {currentPage} of {totalPages})</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>Next</Button>
            </div>
          </div>
        </div>
      )}

      {/* Imaging Results Viewer */}
      {selectedOrder && (
        <ImagingResultsViewer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default ImagingResultsList; 