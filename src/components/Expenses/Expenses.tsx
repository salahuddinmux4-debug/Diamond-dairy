import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ExpenseEntry, ExpenseCategory } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  WalletCards,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X,
  Calendar,
  Filter,
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { canDelete } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('Labor');
  const [amount, setAmount] = useState('');
  const [paidFrom, setPaidFrom] = useState<'Cash' | 'Bank'>('Cash');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses(
        startDate,
        endDate,
        filterCategory === 'All' ? undefined : filterCategory
      );
      setExpenses(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate, filterCategory]);

  const openAddForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Labor');
    setAmount('');
    setPaidFrom('Cash');
    setDescription('');
    setReferenceNumber('');
    setError(null);
    setIsFormOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const amt = Number(amount);
    if (amt <= 0) {
      setError('Expense amount must be greater than zero');
      return;
    }

    const desc = description.trim();
    if (!desc) {
      setError('Description / Paid To is required');
      return;
    }

    setSubmitting(true);
    try {
      await api.addExpense({
        date,
        category,
        amount: amt,
        paidFrom,
        description: desc,
        referenceNumber: referenceNumber.trim() || undefined,
      });

      setSuccessMsg(`Expense of ${formatCurrency(amt)} recorded under ${category} via ${paidFrom}.`);
      setIsFormOpen(false);
      fetchExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (!canDelete) {
      alert('Only Admin can delete expenses.');
      return;
    }

    if (!confirm(`Delete expense "${desc}"? The amount will be refunded back to Cash/Bank.`)) {
      return;
    }

    try {
      await api.deleteExpense(id);
      setSuccessMsg('Expense deleted and Cash/Bank updated.');
      fetchExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete expense');
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.referenceNumber && e.referenceNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Expenses</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track daily dairy operations, fuel, generator, labor, rent, and utility costs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Expenses Filtered</span>
            <span className="text-base font-bold text-white">{formatCurrency(totalSpent)}</span>
          </div>

          <button
            onClick={openAddForm}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Expense
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-200 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, payee, ref #..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Fuel">Fuel</option>
            <option value="Electricity">Electricity</option>
            <option value="Labor">Labor</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Rent">Rent</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          {(startDate || endDate || filterCategory !== 'All') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setFilterCategory('All');
              }}
              className="text-amber-400 hover:underline text-[11px] cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <WalletCards className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No Expenses Recorded</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Record fuel for dairy delivery vans, electricity bills, worker daily wages, or repair costs.
            </p>
            <button
              onClick={openAddForm}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Record First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Description / Paid To</th>
                  <th className="py-3.5 px-4">Paid From</th>
                  <th className="py-3.5 px-4">Ref #</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  {canDelete && <th className="py-3.5 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-amber-300 border border-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{exp.description}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          exp.paidFrom === 'Cash'
                            ? 'bg-teal-950 text-teal-300 border border-teal-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {exp.paidFrom === 'Cash' ? 'Cash-in-Hand' : 'Bank Account'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{exp.referenceNumber || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      {formatCurrency(exp.amount)}
                    </td>
                    {canDelete && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.description)}
                          title="Delete Expense"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white">Record Operating Expense</h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Expense Category <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="Fuel">Fuel (Delivery Van / Churner)</option>
                  <option value="Electricity">Electricity / Chilling Plant Bill</option>
                  <option value="Labor">Labor / Daily Wages</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Rent">Dairy Building Rent</option>
                  <option value="Other">Other Operating Cost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Amount (Rs.) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Paid From <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={paidFrom}
                    onChange={(e) => setPaidFrom(e.target.value as 'Cash' | 'Bank')}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Cash">Cash-in-Hand</option>
                    <option value="Bank">Bank Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description / Paid To <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Paid diesel for generator, Worker weekly salary"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Receipt / Reference #
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Optional bill or voucher number"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
