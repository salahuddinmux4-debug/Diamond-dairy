import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { BOM, Item } from '../../types';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import {
  ScrollText,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  X,
  Factory,
} from 'lucide-react';

export const BOMSetup: React.FC = () => {
  const { canEdit, canDelete } = useAuth();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active setup modal/form
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [outputQty, setOutputQty] = useState<string>('1');
  const [ingredients, setIngredients] = useState<{ itemId: string; defaultQty: string }[]>([
    { itemId: '', defaultQty: '' },
  ]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bomList, itemList] = await Promise.all([api.getBOMs(), api.getItems()]);
      setBoms(bomList);
      setItems(itemList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load BOM recipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const finishedProducts = items.filter((i) => i.category === 'Finished Product');
  const availableIngredients = items.filter(
    (i) => i.category === 'Raw Material' || i.category === 'Packing Material'
  );

  const openNewBom = () => {
    // Pick the first finished product without a BOM if available
    const unusedProduct = finishedProducts.find(
      (fp) => !boms.some((b) => b.finishedProductId === fp.id)
    );
    setSelectedProductId(unusedProduct ? unusedProduct.id : finishedProducts[0]?.id || '');
    setOutputQty('1');
    setIngredients([{ itemId: availableIngredients[0]?.id || '', defaultQty: '1' }]);
    setError(null);
    setIsEditorOpen(true);
  };

  const openEditBom = (bom: BOM) => {
    setSelectedProductId(bom.finishedProductId);
    setOutputQty(bom.outputQty.toString());
    setIngredients(
      bom.ingredients.map((ing) => ({
        itemId: ing.itemId,
        defaultQty: ing.defaultQty.toString(),
      }))
    );
    setError(null);
    setIsEditorOpen(true);
  };

  const handleAddIngredientLine = () => {
    setIngredients([...ingredients, { itemId: availableIngredients[0]?.id || '', defaultQty: '1' }]);
  };

  const handleRemoveIngredientLine = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: 'itemId' | 'defaultQty', value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const handleSaveBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedProductId) {
      setError('Please select a Finished Product');
      return;
    }

    const outNum = Number(outputQty);
    if (outNum <= 0) {
      setError('Output quantity must be greater than zero');
      return;
    }

    const validLines = ingredients.filter((ing) => ing.itemId && Number(ing.defaultQty) > 0);
    if (validLines.length === 0) {
      setError('Please provide at least one valid ingredient with quantity > 0');
      return;
    }

    setSaving(true);
    try {
      await api.saveBOM({
        finishedProductId: selectedProductId,
        outputQty: outNum,
        ingredients: validLines.map((line) => ({
          itemId: line.itemId,
          defaultQty: Number(line.defaultQty),
        })),
      });

      const productName = items.find((i) => i.id === selectedProductId)?.name;
      setSuccessMsg(`BOM Recipe for "${productName}" saved successfully.`);
      setIsEditorOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save BOM recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBOM = async (id: string, name?: string) => {
    if (!canDelete) {
      alert('Only Admin can delete BOM recipes');
      return;
    }
    if (!confirm(`Are you sure you want to delete the recipe for "${name}"?`)) return;

    try {
      await api.deleteBOM(id);
      setSuccessMsg('Recipe removed.');
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete BOM');
    }
  };

  const selectedFinishedItem = items.find((i) => i.id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Bill of Materials (BOM Recipes)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Standard production recipes that auto-populate and scale during batch entry
          </p>
        </div>

        <button
          onClick={openNewBom}
          disabled={finishedProducts.length === 0}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Recipe
        </button>
      </div>

      {/* Helpful Concept Note */}
      <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs text-slate-300 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">How BOM Recipes Work in Diamond Dairy:</p>
          <p className="text-slate-400">
            A BOM is a default suggestion (e.g. 3L cream + 1 plastic container = 1 Kg Desi Ghee). During production entry, the system scales these ingredients automatically based on your batch size. <strong className="text-slate-200">Ratios are never rigidly enforced</strong> — you can edit quantities or swap ingredients for every individual batch as real milk quality and processing yields fluctuate.
          </p>
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

      {/* Existing Recipes List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading recipes...</div>
        ) : boms.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ScrollText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No BOM Recipes Defined Yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {finishedProducts.length === 0
                ? 'Register at least one Finished Product in the Item Master first.'
                : 'Create default ingredient formulas for your finished products like Desi Ghee or Makhan.'}
            </p>
            {finishedProducts.length > 0 && (
              <button
                onClick={openNewBom}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Recipe
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {boms.map((bom) => {
              const finished = items.find((i) => i.id === bom.finishedProductId);
              const unit = finished?.unit || 'Kg';

              // Estimate default batch cost
              const estimatedCost = bom.ingredients.reduce((sum, ing) => {
                const item = items.find((i) => i.id === ing.itemId);
                return sum + ing.defaultQty * (item?.purchaseRate || 0);
              }, 0);

              const costPerUnit = bom.outputQty > 0 ? estimatedCost / bom.outputQty : 0;

              return (
                <div
                  key={bom.id}
                  className="bg-slate-800/40 border border-slate-700/70 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">
                            {bom.finishedProductName || finished?.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Recipe Base: {bom.outputQty} {unit}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Standard estimated cost: <span className="text-amber-400 font-semibold">{formatCurrency(costPerUnit)} / {unit}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => openEditBom(bom)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
                            title="Edit Recipe"
                          >
                            <Save className="w-4 h-4 text-blue-400" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteBOM(bom.id, bom.finishedProductName)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                            title="Delete Recipe"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-700/50 pt-3">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Ingredients Consumed per {bom.outputQty} {unit}:
                      </p>
                      {bom.ingredients.map((ing, idx) => {
                        const item = items.find((i) => i.id === ing.itemId);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60 border border-slate-800"
                          >
                            <span className="text-slate-200 font-medium">
                              {ing.itemName || item?.name}
                            </span>
                            <span className="text-amber-300 font-semibold">
                              {ing.defaultQty} {ing.unit || item?.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOM Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h2 className="text-lg font-bold text-white">Configure BOM Recipe</h2>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBOM} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Finished Product <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="" disabled>
                    Select Finished Product
                  </option>
                  {finishedProducts.map((fp) => (
                    <option key={fp.id} value={fp.id}>
                      {fp.name} (Unit: {fp.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Recipe Output Quantity ({selectedFinishedItem?.unit || 'Units'}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={outputQty}
                  onChange={(e) => setOutputQty(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The quantities below specify what is needed to produce this output amount.
                </p>
              </div>

              {/* Ingredient Lines */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Ingredient Requirements
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientLine}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Ingredient
                  </button>
                </div>

                {availableIngredients.length === 0 ? (
                  <p className="text-xs text-rose-400">
                    No Raw Materials or Packing Materials found. Please create them first in Item Master.
                  </p>
                ) : (
                  ingredients.map((ing, idx) => {
                    const itemObj = items.find((i) => i.id === ing.itemId);
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                        <div className="flex-1">
                          <select
                            required
                            value={ing.itemId}
                            onChange={(e) => handleIngredientChange(idx, 'itemId', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="" disabled>Select Item</option>
                            {availableIngredients.map((ingItem) => (
                              <option key={ingItem.id} value={ingItem.id}>
                                {ingItem.name} ({ingItem.category} - {ingItem.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-28 flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            required
                            placeholder="Qty"
                            value={ing.defaultQty}
                            onChange={(e) => handleIngredientChange(idx, 'defaultQty', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-right"
                          />
                          <span className="text-[11px] text-slate-400 shrink-0 w-8">
                            {itemObj?.unit || ''}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientLine(idx)}
                          disabled={ingredients.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || availableIngredients.length === 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
