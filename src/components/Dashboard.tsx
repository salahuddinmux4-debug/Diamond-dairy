import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DashboardSummary } from '../types';
import { formatCurrency, formatQuantity } from '../utils/formatters';
import {
  Boxes,
  TrendingUp,
  Receipt,
  Truck,
  Users,
  Landmark,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Factory,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { NavTab } from './Navbar';

interface DashboardProps {
  setActiveTab: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await api.getDashboard();
      setData(summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Business Overview</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time dairy processing, stock valuation, and cash flow snapshot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab('production')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Factory className="w-3.5 h-3.5" />
            New Batch
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            New Sale
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-200 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metrics Grid (Today Summary, Receivables/Payables, Cash/Bank) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Today's Summary Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Activity
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400">Today's Sales Revenue</p>
              <p className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(data?.todaySummary.salesAmount || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {data?.todaySummary.salesCount || 0} invoice(s) issued today
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Produced Today: </span>
                <span className="text-slate-200 font-semibold">
                  {formatQuantity(data?.todaySummary.productionQuantity || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Batch Cost: </span>
                <span className="text-amber-400 font-semibold">
                  {formatCurrency(data?.todaySummary.productionValue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Receivables / Payables Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receivables & Payables
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" /> Total Receivables (Customers Owe)
                </p>
                <button
                  onClick={() => setActiveTab('customers')}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  View
                </button>
              </div>
              <p className="text-2xl font-bold text-emerald-400 tracking-tight">
                {formatCurrency(data?.receivablesPayables.totalReceivable || 0)}
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" /> Total Payables (Owed to Suppliers)
                </p>
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  View
                </button>
              </div>
              <p className="text-xl font-bold text-rose-400 tracking-tight">
                {formatCurrency(data?.receivablesPayables.totalPayable || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Cash / Bank Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cash & Bank Balances
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Total Liquid Funds</p>
                <button
                  onClick={() => setActiveTab('cash-bank')}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Ledger
                </button>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(data?.cashBank.combinedTotal || 0)}
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Cash-in-Hand:</span>
                <span className="text-slate-200 font-semibold text-sm">
                  {formatCurrency(data?.cashBank.cashBalance || 0)}
                </span>
              </div>
              <div className="bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Bank Balance:</span>
                <span className="text-slate-200 font-semibold text-sm">
                  {formatCurrency(data?.cashBank.bankBalance || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Stock Summary Card (Item Master Overview with Category Breakdown & Low Stock) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Stock Summary & Valuation</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live calculated stock levels from transactions (Opening + Purchases + Production In − Consumption − Sales)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Grand Total Stock Value</span>
              <span className="text-base font-bold text-amber-300">
                {formatCurrency(data?.grandTotalStockValue || 0)}
              </span>
            </div>

            <button
              onClick={() => setActiveTab('items')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Manage Items
            </button>
          </div>
        </div>

        {/* Category Breakdown Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 bg-slate-900/50 border-b border-slate-800 text-xs">
          {data?.categoryStockSummary.map((cat) => (
            <div key={cat.category} className="p-4 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block font-medium">{cat.category}</span>
                <span className="text-slate-500 text-[11px]">{cat.itemCount} items</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-white block">
                  {formatCurrency(cat.totalValue)}
                </span>
                <span className="text-[10px] text-slate-400">Subtotal Value</span>
              </div>
            </div>
          ))}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          {(!data?.itemsStockTable || data.itemsStockTable.length === 0) ? (
            <div className="p-12 text-center text-slate-400">
              <Boxes className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-base font-medium text-slate-300">No Items Registered Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                The application starts empty and is ready for real operational data. Add your raw materials (e.g. Milk, Cream), packing items, and finished products (e.g. Desi Ghee).
              </p>
              <button
                onClick={() => setActiveTab('items')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4" /> Add First Item
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Total Valuation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.itemsStockTable.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      item.isLowStock ? 'bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.isLowStock && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      )}
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
                    <td className="py-3 px-4 text-right font-medium text-slate-200">
                      {formatQuantity(item.currentStockQty, item.unit)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-300">
                      {formatCurrency(item.value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isLowStock ? (
                        <span className="text-rose-400 font-medium text-[11px]">
                          Below min ({item.lowStockThreshold} {item.unit})
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium text-[11px]">Adequate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
