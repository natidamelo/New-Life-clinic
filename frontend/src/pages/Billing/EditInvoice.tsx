import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  ArrowLeft as ArrowLeftIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon
} from 'lucide-react';
import billingService, { Invoice, InvoiceItem as CoreInvoiceItem } from '../../services/billingService';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  // Preserve the original itemType from backend (service, lab, imaging, etc.)
  itemType?: CoreInvoiceItem['itemType'] | string;
}

const EditInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({
    dueDate: '',
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const fetched = await billingService.getInvoiceById(id);
        setInvoice(fetched);

        setFormData({
          dueDate: fetched.dueDate ? fetched.dueDate.split('T')[0] : '',
          notes: fetched.notes || ''
        });

        const mappedItems: InvoiceItem[] = (fetched.items || []).map((item: CoreInvoiceItem, index: number) => ({
          id: String(index + 1),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          itemType: item.itemType || 'service'
        }));

        setItems(mappedItems.length > 0 ? mappedItems : [{
          id: '1',
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0
        }]);
      } catch (err: any) {
        console.error('Error loading invoice for edit:', err);
        setError(err?.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [id]);

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const updated: InvoiceItem = { ...item, [field]: value } as InvoiceItem;
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = Number(updated.quantity) || 0;
          const price = Number(updated.unitPrice) || 0;
          updated.total = qty * price;
        }
        return updated;
      })
    );
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      itemType: 'service'
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => (prev.length > 1 ? prev.filter(item => item.id !== itemId) : prev));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  };

  const validateForm = () => {
    if (!invoice) {
      setError('Invoice not loaded');
      return false;
    }

    if (items.some(item => !item.description.trim())) {
      setError('Please fill in all item descriptions');
      return false;
    }

    if (items.some(item => Number(item.quantity) <= 0)) {
      setError('All quantities must be greater than 0');
      return false;
    }

    if (items.some(item => Number(item.unitPrice) <= 0)) {
      setError('All unit prices must be greater than 0');
      return false;
    }

    if (calculateSubtotal() <= 0) {
      setError('Invoice total must be greater than 0');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const updatePayload = {
        items: items.map(item => ({
          itemType: item.itemType || 'service',
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          // Backend MedicalInvoice schema expects total on each item
          total: Number(item.total) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
          discount: 0,
          tax: 0
        })),
        dueDate: formData.dueDate || invoice?.dueDate,
        notes: formData.notes
      };

      console.log('Updating invoice with data:', updatePayload);
      const updated = await billingService.updateInvoice(id, updatePayload);
      console.log('Invoice updated successfully:', updated);

      navigate(`/app/billing/invoices/${id}`);
    } catch (err: any) {
      console.error('Error updating invoice:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Invalid invoice ID</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/app/billing/invoices')}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Invoices
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Edit Invoice</h1>
          {invoice && (
            <p className="text-muted-foreground mt-1">
              Invoice #{invoice.invoiceNumber}
            </p>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice && (
              <div className="p-4 bg-muted rounded-lg space-y-1 text-sm text-muted-foreground">
                <p>
                  <strong>Patient:</strong>{' '}
                  {invoice.patientName ||
                    (typeof invoice.patient === 'object'
                      ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
                      : invoice.patientId ||
                        (typeof invoice.patient === 'string' ? invoice.patient : 'Unknown'))}
                </p>
                <p>
                  <strong>Current Status:</strong> {invoice.status}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2 space-y-1">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                    placeholder="Service description"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e => handleItemChange(item.id, 'unitPrice', Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Total</Label>
                  <Input value={item.total.toFixed(2)} readOnly />
                </div>
                <div className="flex justify-end md:col-span-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Remove item"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end border-t pt-4 mt-2">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-2xl font-bold">
                  ETB {calculateSubtotal().toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/app/billing/invoices')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditInvoice;


