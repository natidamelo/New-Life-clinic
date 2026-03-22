import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as expenseService from '../../services/expenseService';
import ExpenseForm, { ExpenseFormValues } from './ExpenseForm';
import { toast } from 'react-hot-toast';
import { 
  Trash2Icon, 
  EditIcon 
} from 'lucide-react'; // Using Lucide React for icons
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

interface ExpenseItem {
  _id: string;
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
  recurring?: boolean;
}

const defaultForm: ExpenseFormValues = {
  description: '',
  category: 'other',
  amount: '',
  expenseDate: new Date().toISOString().substr(0, 10),
  recurring: false
};

const ExpenseManager: React.FC = () => {
  const { getToken } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<ExpenseFormValues>(defaultForm);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = getToken();
      // Fetch all expenses (no date filter for now)
      const data = await expenseService.fetchExpenses('2000-01-01', '2100-01-01', token!);
      setExpenses(data as ExpenseItem[]);
    } catch (err: any) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line
  }, []);

  const handleAdd = async (values: ExpenseFormValues) => {
    setFormLoading(true);
    try {
      const token = getToken();
      await expenseService.addExpense({
        description: values.description,
        category: values.category,
        amount: parseFloat(values.amount),
        expenseDate: values.expenseDate,
        recurring: values.recurring
      }, token!);
      toast.success('Expense added');
      setFormValues(defaultForm);
      fetchExpenses();
    } catch (err: any) {
      toast.error('Failed to add expense');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (expense: ExpenseItem) => {
    setEditId(expense._id);
    setFormValues({
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().substr(0, 10) : new Date().toISOString().substr(0, 10),
      recurring: expense.recurring ?? false
    });
  };

  const handleUpdate = async (values: ExpenseFormValues) => {
    if (!editId) return;
    setFormLoading(true);
    try {
      const token = getToken();
      await expenseService.updateExpense(editId, {
        description: values.description,
        category: values.category,
        amount: parseFloat(values.amount),
        expenseDate: values.expenseDate,
        recurring: values.recurring
      }, token!);
      toast.success('Expense updated');
      setEditId(null);
      setFormValues(defaultForm);
      fetchExpenses();
    } catch (err: any) {
      toast.error('Failed to update expense');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const token = getToken();
      await expenseService.deleteExpense(deleteId, token!);
      toast.success('Expense deleted');
      fetchExpenses();
      setDeleteId(null);
    } catch (err: any) {
      toast.error('Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormValues(defaultForm);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4 bg-muted/10 min-h-screen">
      <div className="md:w-2/3 w-full bg-primary-foreground rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-muted-foreground">Operating Expenses</h2>
        <p className="text-sm text-muted-foreground mb-3">Amounts are monthly (e.g. monthly rent, salary, utilities). Add one entry per month for recurring costs.</p>
        {loading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/20 text-muted-foreground">
                  <th className="border px-4 py-2 text-left">Description</th>
                  <th className="border px-4 py-2 text-left">Category</th>
                  <th className="border px-4 py-2 text-right">Amount (ETB/month)</th>
                  <th className="border px-4 py-2 text-left">Date</th>
                  <th className="border px-4 py-2 text-center">Recurring</th>
                  <th className="border px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp._id} className="hover:bg-muted/10 transition-colors">
                    <td className="border px-4 py-2">{exp.description}</td>
                    <td className="border px-4 py-2 capitalize">{exp.category}</td>
                    <td className="border px-4 py-2 text-right">{exp.amount.toLocaleString()}</td>
                    <td className="border px-4 py-2">
                      {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {exp.recurring ? <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Every month</span> : '—'}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      <div className="flex justify-center space-x-2">
                        <button 
                          onClick={() => handleEdit(exp)} 
                          className="text-primary hover:text-primary transition-colors"
                          title="Edit Expense"
                        >
                          <EditIcon size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(exp._id)} 
                          className="text-destructive hover:text-destructive transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2Icon size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="md:w-1/3 w-full">
        <ExpenseForm
          initialValues={formValues}
          onSubmit={editId ? handleUpdate : handleAdd}
          loading={formLoading}
          mode={editId ? 'edit' : 'add'}
          onCancelEdit={editId ? handleCancelEdit : undefined}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseManager; 