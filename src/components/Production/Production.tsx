import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ProductionEntry, Item, BOM } from '../../types';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/formatters';
import {
  Factory,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Boxes,
  ScrollText,
} from 'lucide-react';

export const Production: React.FC = () => {
  const { canEdit, canDelete } = useAuth();
  const [productions, setProductions] = useState<ProductionEntry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [finishedProductId, setFinishedProductId] = useState('');
  const [quantityProduced, setQuantityProduced] = useState('1');
  const [ingredients, setIngredients] = useState<
    { itemId: string; quantityConsumed: string; costRate: string }[]
  >([]);
  const [laborOverheadCost, setLaborOverheadCost] = useState('0');
  const [batchRemarks, setBatchRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  // View / Print batch sheet
  const [detailBatch, setDetailBatch] = useState<ProductionEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodList, itemList, bomList] = await Promise.all([
        api.getProductions(),
        api.getItems(),
        api.getBOMs(),
      ]);
      setProductions(prodList);
      setItems(itemList);
      setBoms(bomList);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch production records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const finishedProducts = items.filter((i) => i.category === 'Finished Product');
  const rawAndPacking = items.filter(
    (i) => i.category === 'Raw Material' || i.category === 'Packing Material'
  );

  // Helper to load ingredients from BOM for the selected product and batch size
  const applyBOMToForm = (prodId: string, batchQtyNum: number) => {
    const bom = boms.find((b) => b.finishedProductId === prodId);
    if (bom && bom.ingredients.length > 0 && bom.outputQty > 0) {
      const scale = batchQtyNum / bom.outputQty;
      const rows = bom.ingredients.map((ing) => {
        const it = items.find((i) => i.id === ing.itemId);
        return {
          itemId: ing.itemId,
          quantityConsumed: (ing.defaultQty * scale).toFixed(2),
          costRate: (it ? it.purchaseRate : 0).toString(),
        };
      });
      setIngredients(rows);
    } else {
      // No BOM: provide an empty row
      const firstIng = rawAndPacking[0];
      setIngredients([
        {
          itemId: firstIng?.id || '',
          quantityConsumed: '1',
          costRate: firstIng ? firstIng.purchaseRate.toString() : '0',
        },
      ]);
    }
  };

  const openNewProduction = () => {
    const firstProd = finishedProducts[0];
    const initialProdId = firstProd?.id || '';
    setFinishedProductId(initialProdId);
    setDate(new Date().toISOString().split('T')[0]);
    setQuantityProduced('10');
    setLaborOverheadCost('0');
    setBatchRemarks('');
    setError(null);
    setStockWarning(null);

    if (initialProdId) {
      applyBOMToForm(initialProdId, 10);
    } else {
      setIngredients([]);
    }

    setIsFormOpen(true);
  };

  const handleProductChange = (prodId: string) => {
    setFinishedProductId(prodId);
    const qty = Number(quantityProduced) || 1;
    applyBOMToForm(prodId, qty);
  };

  const handleBatchQtyChange = (qtyStr: string) => {
    setQuantityProduced(qtyStr);
    const qtyNum = Number(qtyStr);
    if (qtyNum > 0 && finishedProductId) {
      // Re-scale only if user hasn't heavily customized or if BOM exists
      const bom = boms.find((b) => b.finishedProductId === finishedProductId);
      if (bom) {
        applyBOMToForm(finishedProductId, qtyNum);
      }
    }
  };

  const handleAddIngredientRow = () => {
    const firstIng = rawAndPacking[0];
    setIngredients([
      ...ingredients,
      {
        itemId: firstIng?.id || '',
        quantityConsumed: '1',
        costRate: firstIng ? firstIng.purchaseRate.toString() : '0',
      },
    ]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleIngredientItemChange = (idx: number, itemId: string) => {
    const it = items.find((i) => i.id === itemId);
    const updated = [...ingredients];
    updated[idx].itemId = itemId;
    if (it) {
      updated[idx].costRate = it.purchaseRate.toString();
    }
    setIngredients(updated);
  };

  const handleIngredientValChange = (
    idx: number,
    field: 'quantityConsumed' | 'costRate',
    val: string
  ) => {
    const updated = [...ingredients];
    updated[idx][field] = val;
    setIngredients(updated);
  };

  // Cost calculations
  const rawMaterialCost = ingredients.reduce((sum, ing) => {
    const q = Number(ing.quantityConsumed) || 0;
    const r = Number(ing.costRate) || 0;
    return sum + q * r;
  }, 0);

  const overhead = Number(laborOverheadCost) || 0;
  const totalBatchCost = rawMaterialCost + overhead;
  const batchQtyNum = Number(quantityProduced) || 1;
  const costPerUnit = batchQtyNum > 0 ? totalBatchCost / batchQtyNum : 0;

  // Check for stock warning before save
  const validateStockLevels = () => {
    const lowWarnings: string[] = [];
    for (const ing of ingredients) {
      const it = items.find((i) => i.id === ing.itemId);
      const reqQty = Number(ing.quantityConsumed) || 0;
      if (it && it.currentStockQty < reqQty) {
        lowWarnings.push(
          `"${it.name}" has current stock of ${it.currentStockQty} ${it.unit}, but this batch consumes ${reqQty} ${it.unit}.`
        );
      }
    }
    return lowWarnings;
  };

  const handleSaveProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!finishedProductId) {
      setError('Please select a Finished Product to produce');
      return;
    }

    if (batchQtyNum <= 0) {
      setError('Produced Quantity must be greater than zero');
      return;
    }

    const validIngredients = ingredients.filter(
      (ing) => ing.itemId && Number(ing.quantityConsumed) > 0
    );

    if (validIngredients.length === 0) {
      setError('Please specify at least one consumed ingredient');
      return;
    }

    // Check stock warning
    const warnings = validateStockLevels();
    if (warnings.length > 0 && !stockWarning) {
      setStockWarning(
        `Notice: ${warnings.join(' ')} System allows this so real-world operations aren't blocked. Click "Confirm & Save Batch" to proceed.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const saved = await api.recordProduction({
        date,
        finishedProductId,
        quantityProduced: batchQtyNum,
        ingredients: validIngredients.map((ing) => ({
          itemId: ing.itemId,
          quantityConsumed: Number(ing.quantityConsumed),
          costRate: Number(ing.costRate) || 0,
        })),
        laborOverheadCost: overhead,
        batchRemarks,
      });

      setSuccessMsg(
        `Batch #${saved.batchNumber} recorded: Produced ${saved.quantityProduced} ${saved.finishedProductUnit} of ${saved.finishedProductName}. Stock levels adjusted.`
      );
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record production');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFinishedItem = items.find((i) => i.id === finishedProductId);
  const bomMatches = boms.some((b) => b.finishedProductId === finishedProductId);

  const filteredProductions = productions.filter(
    (p) =>
      p.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.finishedProductName.toLowerCase().includes(search.toLowerCase()) ||
      p.ingredients.some((ing) => ing.itemName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Production</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Transform raw milk & packing materials into finished Desi Ghee, Butter, and dairy products
          </p>
        </div>

        <button
          onClick={openNewProduction}
          disabled={finishedProducts.length === 0 || rawAndPacking.length === 0}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Record New Batch
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

      {/* Search & Filter */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by batch #, product, or ingredient..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <span className="text-xs text-slate-400">{filteredProductions.length} batch(es) recorded</span>
      </div>

      {/* Production Batches List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading production batches...</div>
        ) : filteredProductions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Factory className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No Production Batches Recorded</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              When milk is processed into desi ghee or butter, enter the batch here to automatically deduct milk & container stock and add finished product inventory.
            </p>
            {finishedProducts.length > 0 && (
              <button
                onClick={openNewProduction}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record First Batch
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Batch #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Finished Product</th>
                  <th className="py-3.5 px-4 text-right">Quantity Produced</th>
                  <th className="py-3.5 px-4 text-right">Total Batch Cost</th>
                  <th className="py-3.5 px-4 text-right">Cost / Unit</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProductions.map((p) => {
                  const isExpanded = expandedId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-amber-300 flex items-center gap-2">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <span>{p.batchNumber}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {formatDate(p.date)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {p.finishedProductName}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {formatQuantity(p.quantityProduced, p.finishedProductUnit)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {formatCurrency(p.totalBatchCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-300 font-medium">
                          {formatCurrency(p.costPerUnit)} / {p.finishedProductUnit}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDetailBatch(p)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-400" /> Batch Sheet
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Ingredients Row */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-b border-slate-800">
                          <td colSpan={7} className="p-4">
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 space-y-2">
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Consumed Ingredients for Batch {p.batchNumber}:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {p.ingredients.map((ing, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs flex justify-between"
                                  >
                                    <div>
                                      <span className="text-white font-medium block">{ing.itemName}</span>
                                      <span className="text-[11px] text-slate-400">
                                        {formatQuantity(ing.quantityConsumed, ing.unit)} @ {formatCurrency(ing.costRate)}
                                      </span>
                                    </div>
                                    <span className="font-semibold text-amber-400 self-center">
                                      {formatCurrency(ing.lineCost)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {p.laborOverheadCost > 0 && (
                                <p className="text-[11px] text-slate-400 pt-1">
                                  Includes direct overhead/labor cost: <strong className="text-white">{formatCurrency(p.laborOverheadCost)}</strong>
                                </p>
                              )}
                              {p.batchRemarks && (
                                <p className="text-[11px] text-slate-400 italic">
                                  Remarks: {p.batchRemarks}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Production Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Record Production Batch</h2>
                <p className="text-xs text-slate-400">Convert Raw Materials into Finished Dairy Products</p>
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

            <form onSubmit={handleSaveProduction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Batch Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Finished Product <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={finishedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="" disabled>Select Finished Product</option>
                    {finishedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Quantity Produced ({selectedFinishedItem?.unit || 'Kg/Units'}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={quantityProduced}
                  onChange={(e) => handleBatchQtyChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {bomMatches && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <ScrollText className="w-3 h-3" /> Auto-populated & scaled from saved BOM recipe. You can edit any value below.
                  </p>
                )}
              </div>

              {/* Consumed Ingredients */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Ingredients Consumed (Raw Milk, Cream, Packing)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Ingredient Row
                  </button>
                </div>

                {ingredients.map((ing, idx) => {
                  const it = items.find((i) => i.id === ing.itemId);
                  const lineTotal = (Number(ing.quantityConsumed) || 0) * (Number(ing.costRate) || 0);

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 items-center text-xs"
                    >
                      <div className="col-span-5">
                        <select
                          required
                          value={ing.itemId}
                          onChange={(e) => handleIngredientItemChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="" disabled>Select Item</option>
                          {rawAndPacking.map((rp) => (
                            <option key={rp.id} value={rp.id}>
                              {rp.name} (Stock: {rp.currentStockQty} {rp.unit})
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
                          value={ing.quantityConsumed}
                          onChange={(e) => handleIngredientValChange(idx, 'quantityConsumed', e.target.value)}
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
                          placeholder="Rate"
                          value={ing.costRate}
                          onChange={(e) => handleIngredientValChange(idx, 'costRate', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="col-span-1 text-right font-semibold text-amber-300 truncate" title={formatCurrency(lineTotal)}>
                        Rs. {lineTotal.toFixed(0)}
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          disabled={ingredients.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded hover:bg-slate-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Direct Overhead / Labor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Direct Overhead / Labor (Rs.)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={laborOverheadCost}
                    onChange={(e) => setLaborOverheadCost(e.target.value)}
                    placeholder="Optional labor/gas/electric cost"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Batch Remarks / Lot #
                  </label>
                  <input
                    type="text"
                    value={batchRemarks}
                    onChange={(e) => setBatchRemarks(e.target.value)}
                    placeholder="e.g. Morning churn, 18% loss yield"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Batch Cost Summary Box */}
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Raw Material & Packing Cost:</span>
                  <span className="font-semibold text-white">{formatCurrency(rawMaterialCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overhead / Labor Cost:</span>
                  <span className="font-semibold text-white">{formatCurrency(overhead)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-700/60 pt-2">
                  <span className="text-white">Total Batch Cost:</span>
                  <span className="text-amber-300">{formatCurrency(totalBatchCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-400 font-semibold pt-1">
                  <span>Calculated Cost Per Unit:</span>
                  <span>{formatCurrency(costPerUnit)} / {selectedFinishedItem?.unit || 'Kg'}</span>
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
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Recording Batch...' : stockWarning ? 'Confirm & Save Batch' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production Batch Sheet Modal */}
      {detailBatch && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Diamond Dairy &bull; Production Batch Sheet
                </span>
                <h2 className="text-xl font-bold text-white">{detailBatch.batchNumber}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Sheet
                </button>
                <button
                  onClick={() => setDetailBatch(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block">Product Output:</span>
                <span className="text-white font-bold text-base">{detailBatch.finishedProductName}</span>
                <span className="text-emerald-400 font-semibold block mt-0.5">
                  Quantity: {formatQuantity(detailBatch.quantityProduced, detailBatch.finishedProductUnit)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Batch Date:</span>
                <span className="text-white font-medium">{formatDate(detailBatch.date)}</span>
                <span className="text-amber-300 font-semibold block mt-0.5">
                  Cost: {formatCurrency(detailBatch.costPerUnit)} / {detailBatch.finishedProductUnit}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl mb-4">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Ingredient Consumed</th>
                    <th className="py-2.5 px-3 text-right">Quantity Consumed</th>
                    <th className="py-2.5 px-3 text-right">Cost Rate</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {detailBatch.ingredients.map((ing, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-white">{ing.itemName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {formatQuantity(ing.quantityConsumed, ing.unit)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatCurrency(ing.costRate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                        {formatCurrency(ing.lineCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Direct Overhead / Labor:</span>
                <span className="font-semibold text-white">{formatCurrency(detailBatch.laborOverheadCost)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white border-t border-slate-700/60 pt-2">
                <span>Total Production Cost:</span>
                <span className="text-amber-300">{formatCurrency(detailBatch.totalBatchCost)}</span>
              </div>
            </div>

            {detailBatch.batchRemarks && (
              <p className="text-xs text-slate-400 mt-3 italic">
                Remarks: {detailBatch.batchRemarks}
              </p>
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
