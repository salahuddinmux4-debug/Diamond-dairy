import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Item, ItemCategory, ItemUnit, StockMovementLog } from '../../types';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/formatters';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  History,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  FileSpreadsheet,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

export const ItemMaster: React.FC = () => {
  const { canEdit, canDelete } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [movementLogs, setMovementLogs] = useState<StockMovementLog[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Raw Material');
  const [unit, setUnit] = useState<ItemUnit>('Kg');
  const [purchaseRate, setPurchaseRate] = useState<string>('0');
  const [saleRate, setSaleRate] = useState<string>('0');
  const [openingStockQty, setOpeningStockQty] = useState<string>('0');
  const [openingStockDate, setOpeningStockDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getItems();
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openAddForm = () => {
    setEditingItem(null);
    setName('');
    setCategory('Raw Material');
    setUnit('Kg');
    setPurchaseRate('0');
    setSaleRate('0');
    setOpeningStockQty('0');
    setOpeningStockDate(new Date().toISOString().split('T')[0]);
    setLowStockThreshold('');
    setError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: Item) => {
    if (!canEdit) return;
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setPurchaseRate(item.purchaseRate.toString());
    setSaleRate(item.saleRate.toString());
    setOpeningStockQty(item.openingStockQty.toString());
    setOpeningStockDate(item.openingStockDate || new Date().toISOString().split('T')[0]);
    setLowStockThreshold(item.lowStockThreshold !== undefined ? item.lowStockThreshold.toString() : '');
    setError(null);
    setIsFormOpen(true);
  };

  const openDetailModal = async (item: Item) => {
    setDetailItem(item);
    setLoadingMovements(true);
    try {
      const logs = await api.getItemMovements(item.id);
      setMovementLogs(logs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load stock movement log');
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Item Name is required');
      return;
    }

    const pRate = Number(purchaseRate) || 0;
    const sRate = Number(saleRate) || 0;
    const opQty = Number(openingStockQty) || 0;

    if (pRate < 0 || sRate < 0) {
      setError('Rates must be greater than or equal to 0');
      return;
    }

    if (category === 'Finished Product' && sRate <= 0) {
      // warning or error
      setError('Sale Rate is required for Finished Products');
      return;
    }

    if (category !== 'Finished Product' && pRate <= 0) {
      setError(`Purchase Rate is required for ${category}`);
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingItem) {
        if (!canEdit) {
          setError('Permission Denied: Only Admin can edit items.');
          return;
        }
        await api.updateItem(editingItem.id, {
          name: trimmedName,
          category,
          unit,
          purchaseRate: pRate,
          saleRate: sRate,
          openingStockQty: opQty,
          openingStockDate,
          lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
        });
        setSuccessMsg(`Item "${trimmedName}" updated successfully.`);
      } else {
        await api.addItem({
          name: trimmedName,
          category,
          unit,
          purchaseRate: pRate,
          saleRate: sRate,
          openingStockQty: opQty,
          openingStockDate,
          lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
        });
        setSuccessMsg(`Item "${trimmedName}" created with opening stock of ${opQty} ${unit}.`);
      }

      setIsFormOpen(false);
      fetchItems();
    } catch (err: any) {
      setError(err?.message || 'Error saving item');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    if (!canDelete) {
      alert('Only Admin can delete items.');
      return;
    }

    if (!confirm(`Are you sure you want to delete item "${item.name}"? If it has transactions, deletion will be blocked.`)) {
      return;
    }

    try {
      await api.deleteItem(item.id);
      setSuccessMsg(`Item "${item.name}" deleted.`);
      fetchItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete item');
    }
  };

  // Filtered list
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Item Master</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage Raw Materials, Packing Materials, and Finished Products with auditable stock tracking
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
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

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Raw Material', 'Packing Material', 'Finished Product'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Boxes className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No Items Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {items.length === 0
                ? 'Your Item Master is currently empty. Start by adding Raw Materials (Milk, Cream), Packing Materials, or Finished Products (Desi Ghee, Butter).'
                : 'No items match your search or category filter.'}
            </p>
            {items.length === 0 && (
              <button
                onClick={openAddForm}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Item Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Unit</th>
                  <th className="py-3.5 px-4 text-right">Purchase Rate</th>
                  <th className="py-3.5 px-4 text-right">Sale Rate</th>
                  <th className="py-3.5 px-4 text-right">Opening Qty</th>
                  <th className="py-3.5 px-4 text-right">Current Stock</th>
                  <th className="py-3.5 px-4 text-center">Threshold</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => {
                  const isLow =
                    item.lowStockThreshold !== undefined &&
                    item.lowStockThreshold > 0 &&
                    item.currentStockQty <= item.lowStockThreshold;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isLow ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {isLow && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                              <AlertTriangle className="w-3 h-3" /> Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.category === 'Raw Material'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : item.category === 'Packing Material'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{item.unit}</td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {item.category !== 'Finished Product' ? formatCurrency(item.purchaseRate) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {item.category === 'Finished Product' ? formatCurrency(item.saleRate) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatQuantity(item.openingStockQty, item.unit)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">
                        <span className={isLow ? 'text-rose-400' : 'text-slate-100'}>
                          {formatQuantity(item.currentStockQty, item.unit)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">
                        {item.lowStockThreshold ? `${item.lowStockThreshold} ${item.unit}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailModal(item)}
                            title="Stock Movement Log"
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Admin Only: Edit and Delete */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              title="Edit Item"
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              title="Delete Item"
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

      {/* Add / Edit Item Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingItem ? `Edit Item: ${editingItem.name}` : 'Add New Item'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Item Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Raw Milk, Desi Ghee 1Kg, Plastic Container"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Must be unique across all items.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItemCategory)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Packing Material">Packing Material</option>
                    <option value="Finished Product">Finished Product</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Unit <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ItemUnit)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Liter">Liter</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {category !== 'Finished Product' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Purchase Rate (Rs.) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={purchaseRate}
                      onChange={(e) => setPurchaseRate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Sale Rate (Rs.) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={saleRate}
                      onChange={(e) => setSaleRate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Optional (e.g. 50)"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Opening Stock Section (Supported everywhere for running business migration) */}
              <div className="p-3.5 bg-slate-800/50 border border-slate-700/80 rounded-xl space-y-3">
                <span className="text-xs font-bold text-amber-400 block uppercase">
                  Opening Balance Continuity
                </span>
                <p className="text-[11px] text-slate-400">
                  Enter existing stock at the time of system switch-over. Stock will automatically move from this base with every transaction.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Opening Quantity ({unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={openingStockQty}
                      onChange={(e) => setOpeningStockQty(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      As of Date
                    </label>
                    <input
                      type="date"
                      value={openingStockDate}
                      onChange={(e) => setOpeningStockDate(e.target.value)}
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
                  {formSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail / Stock Movement Log Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{detailItem.name}</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                    {detailItem.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full Stock Movement Log & Mini Ledger &bull; Current Stock:{' '}
                  <span className="font-bold text-white">
                    {formatQuantity(detailItem.currentStockQty, detailItem.unit)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingMovements ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading movement history...</div>
            ) : movementLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No stock transactions logged yet for this item.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction Type</th>
                      <th className="py-2.5 px-3">Reference / Note</th>
                      <th className="py-2.5 px-3 text-right">Qty In (+)</th>
                      <th className="py-2.5 px-3 text-right">Qty Out (−)</th>
                      <th className="py-2.5 px-3 text-right">Resulting Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {movementLogs.map((log) => {
                      const isAddition = log.quantityChange > 0;
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            {formatDate(log.date)}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                log.type === 'Opening Stock'
                                  ? 'bg-slate-800 text-slate-300'
                                  : log.type === 'Purchase'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : log.type === 'Production In'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : log.type === 'Consumption Out'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : log.type === 'Sale Out'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isAddition ? (
                                <ArrowDownCircle className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <ArrowUpCircle className="w-3 h-3 text-rose-400" />
                              )}
                              {log.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={log.referenceNote}>
                            {log.referenceNote || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-emerald-400">
                            {isAddition ? formatQuantity(log.quantityChange, log.itemUnit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-rose-400">
                            {!isAddition ? formatQuantity(Math.abs(log.quantityChange), log.itemUnit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {formatQuantity(log.resultingBalance, log.itemUnit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
