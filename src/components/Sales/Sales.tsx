import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { SaleInvoice, Customer, Item } from '../../types';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/formatters';
import {
  Receipt,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X,
  Printer,
  FileText,
  Calendar,
} from 'lucide-react';

export const Sales: React.FC = () => {
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Invoice Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<{ itemId: string; quantity: string; rate: string }[]>([
    { itemId: '', quantity: '1', rate: '0' },
  ]);
  const [amountPaidNow, setAmountPaidNow] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  // View / Print Invoice Modal
  const [detailInvoice, setDetailInvoice] = useState<SaleInvoice | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invList, custList, itemList] = await Promise.all([
        api.getSales(startDate, endDate, filterCustomer),
        api.getCustomers(),
        api.getItems(),
      ]);
      setInvoices(invList);
      setCustomers(custList);
      setItems(itemList);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, filterCustomer]);

  const finishedProducts = items.filter((i) => i.category === 'Finished Product');

  const openNewInvoice = () => {
    setCustomerId(customers[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    const firstProd = finishedProducts[0];
    setLines([
      {
        itemId: firstProd?.id || '',
        quantity: '1',
        rate: firstProd ? firstProd.saleRate.toString() : '0',
      },
    ]);
    setAmountPaidNow('0');
    setPaymentMethod('Cash');
    setNote('');
    setError(null);
    setStockWarning(null);
    setIsFormOpen(true);
  };

  const handleAddLine = () => {
    const firstProd = finishedProducts[0];
    setLines([
      ...lines,
      {
        itemId: firstProd?.id || '',
        quantity: '1',
        rate: firstProd ? firstProd.saleRate.toString() : '0',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const updated = [...lines];
    updated[index].itemId = itemId;
    if (item) {
      updated[index].rate = item.saleRate.toString();
    }
    setLines(updated);
  };

  const handleLineValueChange = (index: number, field: 'quantity' | 'rate', value: string) => {
    const updated = [...lines];
    updated[index][field] = value;
    setLines(updated);
  };

  const invoiceTotal = lines.reduce((sum, line) => {
    const q = Number(line.quantity) || 0;
    const r = Number(line.rate) || 0;
    return sum + q * r;
  }, 0);

  const balanceDue = Math.max(0, invoiceTotal - (Number(amountPaidNow) || 0));

  const checkStockSufficiency = () => {
    const warnings: string[] = [];
    for (const line of lines) {
      const it = items.find((i) => i.id === line.itemId);
      const reqQty = Number(line.quantity) || 0;
      if (it && it.currentStockQty < reqQty) {
        warnings.push(
          `"${it.name}" has stock ${it.currentStockQty} ${it.unit}, but invoice sells ${reqQty} ${it.unit}.`
        );
      }
    }
    return warnings;
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!customerId) {
      setError('Please select a Customer');
      return;
    }

    const validLines = lines.filter(
      (l) => l.itemId && Number(l.quantity) > 0 && Number(l.rate) >= 0
    );

    if (validLines.length === 0) {
      setError('Please provide at least one valid item line with quantity > 0');
      return;
    }

    // Stock check
    const warnings = checkStockSufficiency();
    if (warnings.length > 0 && !stockWarning) {
      setStockWarning(
        `Notice: ${warnings.join(' ')} Allowed so physical delivery can precede system entry. Click "Confirm & Create Invoice" to continue.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const saved = await api.createSale({
        customerId,
        date,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          rate: Number(l.rate),
        })),
        amountPaidNow: Number(amountPaidNow) || 0,
        paymentMethod,
        note,
      });

      setSuccessMsg(`Invoice #${saved.invoiceNumber} created successfully. Stock & accounts updated.`);
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.items.some((i) => i.itemName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Sales & Invoicing
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dispatch finished goods to dealers with instant stock deduction & customer ledger postings
          </p>
        </div>

        <button
          onClick={openNewInvoice}
          disabled={finishedProducts.length === 0 || customers.length === 0}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Sale Invoice
        </button>
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

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer, item..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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

          {(startDate || endDate || filterCustomer) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setFilterCustomer('');
              }}
              className="text-amber-400 hover:underline text-[11px] cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No Invoices Issued</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              When finished dairy goods are dispatched, issue a sale invoice to record revenue, reduce stock, and track receivables.
            </p>
            {finishedProducts.length > 0 && customers.length > 0 && (
              <button
                onClick={openNewInvoice}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4 text-right">Invoice Total</th>
                  <th className="py-3.5 px-4 text-right">Paid Now</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-amber-300">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{inv.customerName}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {inv.items.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatCurrency(inv.invoiceTotal)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                      {formatCurrency(inv.amountPaidNow)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-400">
                      {formatCurrency(inv.balanceDue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDetailInvoice(inv)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-400" /> View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Sale Invoice Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Create Sale Invoice</h2>
                <p className="text-xs text-slate-400">Dispatch Finished Goods to Customer</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {stockWarning && (
              <div className="mb-4 p-3.5 bg-amber-950/60 border border-amber-800 text-amber-200 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">{stockWarning}</div>
              </div>
            )}

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Customer / Dealer <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="" disabled>Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Bal: Rs. {c.currentBalance})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Invoice Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Finished Products Sold
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Line
                  </button>
                </div>

                {lines.map((line, idx) => {
                  const it = items.find((i) => i.id === line.itemId);
                  const lineTotal = (Number(line.quantity) || 0) * (Number(line.rate) || 0);

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 items-center text-xs"
                    >
                      <div className="col-span-5">
                        <select
                          required
                          value={line.itemId}
                          onChange={(e) => handleLineItemChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="" disabled>Select Finished Product</option>
                          {finishedProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.currentStockQty} {p.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3 flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => handleLineValueChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-[11px] text-slate-400 shrink-0 w-6">
                          {it?.unit || ''}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Rate"
                          value={line.rate}
                          onChange={(e) => handleLineValueChange(idx, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="col-span-1 text-right font-semibold text-amber-300 truncate" title={formatCurrency(lineTotal)}>
                        Rs. {lineTotal.toFixed(0)}
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded hover:bg-slate-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals and Immediate Payment */}
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-semibold">Total Invoice Amount:</span>
                  <span className="font-bold text-white text-base">
                    {formatCurrency(invoiceTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/60">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Amount Paid Now (Rs.)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={invoiceTotal}
                      value={amountPaidNow}
                      onChange={(e) => setAmountPaidNow(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank')}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="Cash">Cash-in-Hand</option>
                      <option value="Bank">Bank Account</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Balance Added to Customer Receivable:</span>
                  <span className="font-bold text-amber-400">{formatCurrency(balanceDue)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Delivery Details / Note
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Dispatched via van #LES-4210"
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
                  {submitting ? 'Creating...' : stockWarning ? 'Confirm & Create Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice View / Print Modal */}
      {detailInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-4 gap-3">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Commercial Tax Invoice
                </span>
                <h2 className="text-xl font-bold text-white">{detailInvoice.invoiceNumber}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
                <button
                  onClick={() => setDetailInvoice(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Business & Customer Header */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-4 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-semibold">Billed By:</span>
                <p className="text-white font-bold text-sm">Diamond Dairy</p>
                <p className="text-amber-400 text-xs">Proprietor: Muhammad Imran</p>
                <p className="text-slate-400 text-[11px]">Dairy Processing & Supply</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-semibold">Billed To (Customer):</span>
                <p className="text-white font-bold text-sm">{detailInvoice.customerName}</p>
                <p className="text-slate-400 text-xs mt-0.5">Date: {formatDate(detailInvoice.date)}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl mb-4">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {detailInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-white">{it.itemName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {formatQuantity(it.quantity, it.unit)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatCurrency(it.rate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                        {formatCurrency(it.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Box */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Invoice Amount:</span>
                <span className="font-bold text-white text-sm">{formatCurrency(detailInvoice.invoiceTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Paid On Spot ({detailInvoice.paymentMethod}):</span>
                <span className="font-semibold">{formatCurrency(detailInvoice.amountPaidNow)}</span>
              </div>
              <div className="flex justify-between text-amber-300 border-t border-slate-700/60 pt-2 font-bold text-sm">
                <span>Net Balance Due:</span>
                <span>{formatCurrency(detailInvoice.balanceDue)}</span>
              </div>
            </div>

            {detailInvoice.note && (
              <p className="text-xs text-slate-400 mt-3 italic">
                Note: {detailInvoice.note}
              </p>
            )}

            {/* Official Branding Footer Required for printed invoices & reports */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-1">
              <span>Diamond Dairy &bull; Proprietor: Muhammad Imran</span>
              <span className="font-medium text-slate-300">Developed by MAS Account Solution</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
