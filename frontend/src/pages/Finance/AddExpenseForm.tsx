import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as expenseService from '../../services/expenseService';
import { toast } from 'react-hot-toast';

const AddExpenseForm: React.FC = () => {
  const { getToken } = useAuth();

  const [form, setForm] = useState({
    description: '',
    category: 'other',
    amount: '',
    expenseDate: new Date().toISOString().substr(0, 10),
    recurring: false
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setForm({ ...form, [target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) {
      toast.error('Description and amount are required');
      return;
    }
    try {
      setLoading(true);
      const token = getToken();
      await expenseService.addExpense({
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        recurring: form.recurring
      }, token!);
      toast.success('Expense recorded');
      setForm({ description: '', category: 'other', amount: '', expenseDate: form.expenseDate, recurring: false });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-primary-foreground rounded shadow">
      <h1 className="text-xl font-semibold mb-4">Add Operating Expense</h1>
      <p className="text-sm text-muted-foreground mb-3">Enter monthly amounts. Use &quot;Repeats every month&quot; for rent, salary, etc.—one entry will apply to every month in reports automatically.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input name="description" value={form.description} onChange={handleChange} className="w-full border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select name="category" value={form.category} onChange={handleChange} className="w-full border px-2 py-1 rounded">
            <option value="rent">Rent</option>
            <option value="salary">Salary</option>
            <option value="overtime">Over-time</option>
            <option value="utilities">Utilities</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Monthly amount (ETB)</label>
          <input name="amount" type="number" step="0.01" value={form.amount} onChange={handleChange} className="w-full border px-2 py-1 rounded" placeholder="e.g. 130000 for rent" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date (month this expense applies to)</label>
          <input name="expenseDate" type="date" value={form.expenseDate} onChange={handleChange} className="w-full border px-2 py-1 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <input id="recurring" name="recurring" type="checkbox" checked={form.recurring} onChange={handleChange} className="rounded border-gray-300" />
          <label htmlFor="recurring" className="text-sm font-medium">Repeats every month (apply automatically to all months in reports)</label>
        </div>
        <button disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
};

export default AddExpenseForm; 