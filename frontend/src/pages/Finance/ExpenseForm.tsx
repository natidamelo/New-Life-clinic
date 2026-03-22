import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export interface ExpenseFormValues {
  description: string;
  category: string;
  amount: string;
  expenseDate: string;
  recurring: boolean;
}

interface ExpenseFormProps {
  initialValues: ExpenseFormValues;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  loading: boolean;
  mode: 'add' | 'edit';
  onCancelEdit?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ initialValues, onSubmit, loading, mode, onCancelEdit }) => {
  const [form, setForm] = useState<ExpenseFormValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

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
    await onSubmit(form);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-primary-foreground rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{mode === 'add' ? 'Add Operating Expense' : 'Edit Operating Expense'}</h1>
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
        <div className="flex gap-2">
          <button disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded disabled:opacity-50" type="submit">
            {loading ? (mode === 'add' ? 'Saving...' : 'Updating...') : (mode === 'add' ? 'Save Expense' : 'Update Expense')}
          </button>
          {mode === 'edit' && onCancelEdit && (
            <button type="button" onClick={onCancelEdit} className="bg-muted/40 text-black px-4 py-2 rounded">Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm; 