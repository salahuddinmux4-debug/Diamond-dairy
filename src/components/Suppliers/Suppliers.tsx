import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Supplier, SupplierLedgerEntry } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import {
  Truck,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  FileText,
  CreditCard,
  Edit2,
  Trash2,
  X,
  Printer,
  Download,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { canEdit, canDelete } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Supplier Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Quick Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidFrom, setPaidFrom] = useState<'Cash' | 'Bank'>('Cash');
  const [payNote, setPayNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Ledger / Statement View
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openAddForm = () => {
    setEditingSupplier(null);
    setName('');
    setContactNumber('');
    setAddress('');
    setOpeningBalance('0');
    setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (sup: Supplier) => {
    if (!canEdit) return;
    setEditingSupplier(sup);
    setName(sup.name);
    setContactNumber(sup.contactNumber || '');
    setAddress(sup.address || '');
    setOpeningBalance(sup.openingBalance.toString());
    setOpeningBalanceDate(sup.openingBalanceDate || new Date().toISOString().split('T')[0]);
    setError(null);
    setIsFormOpen(true);
  };

  const openQuickPayment = (sup: Supplier) => {
    setPaymentSupplier(sup);
    setPayAmount(sup.currentBalance > 0 ? sup.currentBalance.toString() : '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPaidFrom('Cash');
    setPayNote('');
    setError(null);
    setIsPaymentOpen(true);
  };

  const openStatement = async (sup: Supplier) => {
    setStatementSupplier(sup);
    setLoadingLedger(true);
    try {
      const logs = await api.getSupplierLedger(sup.id, startDate, endDate);
      setLedgerEntries(logs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load statement');
    } finally {
      setLoadingLedger(false);
    }
  };

  const filterStatement = async () => {
    if (!statementSupplier) return;
    setLoadingLedger(true);
    try {
      const logs = await api.getSupplierLedger(statementSupplier.id, startDate, endDate);
      setLedgerEntries(logs);
    } catch (err: any) {
      setError(err?.message || 'Failed to filter statement');
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Supplier Name is required');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingSupplier) {
        if (!canEdit) return;
        await api.updateSupplier(editingSupplier.id, {
          name: trimmed,
          contactNumber: contactNumber.trim(),
          address: address.trim(),
          openingBalance: Number(openingBalance) || 0,
          openingBalanceDate,
        });
        setSuccessMsg(`Supplier "${trimmed}" updated.`);
      } else {
        await api.addSupplier({
          name: trimmed,
          contactNumber: contactNumber.trim(),
          address: address.trim(),
          openingBalance: Number(openingBalance) || 0,
          openingBalanceDate,
        });
        setSuccessMsg(`Supplier "${trimmed}" added.`);
      }
      setIsFormOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setError(err?.message || 'Failed to save supplier');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSupplier) return;
    setError(null);

    const amt = Number(payAmount);
    if (amt <= 0) {
      setError('Payment amount must be greater than zero');
      return;
    }

    setPaymentSubmitting(true);
    try {
      await api.recordSupplierPayment(paymentSupplier.id, {
        amount: amt,
        date: payDate,
        paidFrom,
        note: payNote,
      });
      setSuccessMsg(`Payment of ${formatCurrency(amt)} recorded to ${paymentSupplier.name} via ${paidFrom}.`);
      setIsPaymentOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    if (!canDelete) return;
    if (!confirm(`Delete supplier "${sup.name}"? If they have transactions, deletion will be blocked.`)) return;

    try {
      await api.deleteSupplier(sup.id);
      setSuccessMsg(`Supplier "${sup.name}" deleted.`);
      fetchSuppliers();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete supplier');
    }
  };

  const handleExportCsv = () => {
    if (!statementSupplier) return;
    const headers = ['Date', 'Type', 'Reference/Note', 'Debit (Payment)', 'Credit (Purchase)', 'Balance'];
    const rows = ledgerEntries.map((e) => [
      e.date,
      e.type,
      e.referenceNote || '',
      e.debit,
      e.credit,
      e.runningBalance,
    ]);
    exportToCSV(`Supplier_Ledger_${statementSupplier.name.replace(/\s+/g, '_')}`, headers, rows);
  };

  const totalPayable = suppliers.reduce(
    (sum, s) => (s.currentBalance > 0 ? sum + s.currentBalance : sum),
    0
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactNumber && s.contactNumber.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Suppliers</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Raw material & packing vendors with automatic transaction-backed ledgers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-rose-950/40 border border-rose-800/60 rounded-xl text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Payable Owed</span>
            <span className="text-base font-bold text-rose-400">{formatCurrency(totalPayable)}</span>
          </div>

          <button
            onClick={openAddForm}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Supplier
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

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <span className="text-xs text-slate-400">{filteredSuppliers.length} supplier(s) found</span>
      </div>

      {/* Supplier List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No Suppliers Registered</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Add dairy milk collection centers, local farmers, or packaging vendors. Existing balances are fully supported.
            </p>
            <button
              onClick={openAddForm}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add First Supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Supplier Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4 text-right">Opening Balance</th>
                  <th className="py-3.5 px-4 text-right">Current Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSuppliers.map((sup) => {
                  const weOwe = sup.currentBalance > 0;
                  const advance = sup.currentBalance < 0;

                  return (
                    <tr key={sup.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{sup.name}</div>
                        <span className="text-[10px] text-slate-500">ID: {sup.id}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {sup.contactNumber ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" /> {sup.contactNumber}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {sup.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {sup.address}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatCurrency(sup.openingBalance)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span
                          className={
                            weOwe ? 'text-rose-400' : advance ? 'text-emerald-400' : 'text-slate-300'
                          }
                        >
                          {formatCurrency(Math.abs(sup.currentBalance))}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            weOwe
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : advance
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {weOwe ? 'Payable (We Owe)' : advance ? 'Advance (Credit)' : 'Settled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Payment Button */}
                          <button
                            type="button"
                            onClick={() => openQuickPayment(sup)}
                            title="Record Payment to Supplier"
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" /> Pay
                          </button>

                          {/* Statement / Ledger */}
                          <button
                            type="button"
                            onClick={() => openStatement(sup)}
                            title="View Statement & Ledger"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-sky-400" />
                          </button>

                          {/* Admin Only: Edit and Delete */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditForm(sup)}
                              title="Edit Supplier"
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(sup)}
                              title="Delete Supplier"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Supplier Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Al-Madina Milk Center, Rehman Packaging"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Address / Location
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Grain Market, Sargodha"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Opening Balance continuity */}
              <div className="p-3.5 bg-slate-800/50 border border-slate-700/80 rounded-xl space-y-3">
                <span className="text-xs font-bold text-amber-400 block uppercase">
                  Historical Balance Continuity
                </span>
                <p className="text-[11px] text-slate-400">
                  Positive = Diamond Dairy owes them (Payable). Negative = Advance paid to them.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Opening Balance (Rs.)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      As of Date
                    </label>
                    <input
                      type="date"
                      value={openingBalanceDate}
                      onChange={(e) => setOpeningBalanceDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
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
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Quick Payment Modal */}
      {isPaymentOpen && paymentSupplier && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Record Payment to Supplier</h2>
                <p className="text-xs text-amber-400">{paymentSupplier.name}</p>
              </div>
              <button
                onClick={() => setIsPaymentOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3 bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Outstanding Balance:</span>
                <span className="font-bold text-rose-400">{formatCurrency(paymentSupplier.currentBalance)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Payment Amount (Rs.) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Paid From
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
                  Reference / Note
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Online Transfer Ref #9812 / Cash voucher"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {paymentSubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger / Statement Modal & Printable View */}
      {statementSupplier && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            {/* Header with Print & Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-4 gap-3">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Diamond Dairy &bull; Supplier Ledger Statement
                </span>
                <h2 className="text-xl font-bold text-white">{statementSupplier.name}</h2>
                <p className="text-xs text-slate-400">
                  Contact: {statementSupplier.contactNumber || 'N/A'} &bull; Address:{' '}
                  {statementSupplier.address || 'N/A'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
                <button
                  onClick={() => setStatementSupplier(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 mb-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-slate-300">Filter Range:</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>
              <button
                onClick={filterStatement}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Apply
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    api.getSupplierLedger(statementSupplier.id).then(setLedgerEntries);
                  }}
                  className="text-amber-400 hover:underline text-[11px] cursor-pointer"
                >
                  Clear Filter
                </button>
              )}

              <div className="ml-auto text-right">
                <span className="text-slate-400 text-[11px] block">Current Balance:</span>
                <span className="text-sm font-bold text-rose-400">
                  {formatCurrency(statementSupplier.currentBalance)}
                </span>
              </div>
            </div>

            {/* Ledger Table */}
            {loadingLedger ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading ledger entries...</div>
            ) : ledgerEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No ledger activity found for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference / Note</th>
                      <th className="py-2.5 px-3 text-right">Debit (Paid)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Purchases)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {ledgerEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                          {formatDate(e.date)}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              e.type === 'Purchase'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : e.type === 'Payment Made'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={e.referenceNote}>
                          {e.referenceNote || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-400">
                          {e.debit > 0 ? formatCurrency(e.debit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-rose-400">
                          {e.credit > 0 ? formatCurrency(e.credit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {formatCurrency(e.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Diamond Dairy &bull; Proprietor: Muhammad Imran</span>
              <span>Developed by MAS Account Solution</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
