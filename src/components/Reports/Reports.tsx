import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ProfitLossReport, StockReport } from '../../types';
import { formatCurrency, formatQuantity, formatDate, exportToCSV } from '../../utils/formatters';
import {
  BarChart3,
  Calendar,
  Printer,
  Download,
  AlertTriangle,
  Factory,
  Receipt,
  Boxes,
  Truck,
  Users,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

type ReportTab = 'pnl' | 'production' | 'sales' | 'stock' | 'supplier-due' | 'customer-due';

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportTab>('pnl');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report Data States
  const [pnlData, setPnlData] = useState<ProfitLossReport | null>(null);
  const [stockData, setStockData] = useState<StockReport | null>(null);
  const [productionBatches, setProductionBatches] = useState<any[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const fetchActiveReport = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeReport === 'pnl') {
        const res = await api.getProfitLossReport(startDate, endDate);
        setPnlData(res);
      } else if (activeReport === 'stock') {
        const res = await api.getStockReport();
        setStockData(res);
      } else if (activeReport === 'production') {
        const res = await api.getProductions(startDate, endDate);
        setProductionBatches(res);
      } else if (activeReport === 'sales') {
        const res = await api.getSales(startDate, endDate);
        setSalesInvoices(res);
      } else if (activeReport === 'supplier-due') {
        const res = await api.getSuppliers();
        setSuppliers(res);
      } else if (activeReport === 'customer-due') {
        const res = await api.getCustomers();
        setCustomers(res);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveReport();
  }, [activeReport, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeReport === 'pnl' && pnlData) {
      const headers = ['Financial Metric', 'Amount (Rs.)'];
      const rows = [
        ['Total Sales Revenue', pnlData.totalSalesRevenue],
        ['Cost of Goods Sold (COGS)', pnlData.costOfGoodsSold],
        ['Gross Profit', pnlData.grossProfit],
        ['Total Operating Expenses', pnlData.totalOperatingExpenses],
        ['Net Profit / Loss', pnlData.netProfitOrLoss],
      ];
      exportToCSV('Profit_and_Loss_Report', headers, rows);
    } else if (activeReport === 'stock' && stockData) {
      const headers = ['Item Name', 'Category', 'Current Stock', 'Unit', 'Valuation Rate', 'Stock Value'];
      const rows = stockData.items.map((i) => [
        i.name,
        i.category,
        i.currentStockQty,
        i.unit,
        i.rate,
        i.value,
      ]);
      exportToCSV('Inventory_Stock_Report', headers, rows);
    } else if (activeReport === 'sales') {
      const headers = ['Invoice #', 'Date', 'Customer', 'Invoice Total', 'Paid Now', 'Balance Due'];
      const rows = salesInvoices.map((inv) => [
        inv.invoiceNumber,
        inv.date,
        inv.customerName,
        inv.invoiceTotal,
        inv.amountPaidNow,
        inv.balanceDue,
      ]);
      exportToCSV('Sales_Report', headers, rows);
    } else if (activeReport === 'production') {
      const headers = ['Batch #', 'Date', 'Finished Product', 'Produced Qty', 'Total Cost', 'Cost/Unit'];
      const rows = productionBatches.map((b) => [
        b.batchNumber,
        b.date,
        b.finishedProductName,
        b.quantityProduced,
        b.totalBatchCost,
        b.costPerUnit,
      ]);
      exportToCSV('Production_Report', headers, rows);
    } else if (activeReport === 'supplier-due') {
      const headers = ['Supplier Name', 'Contact', 'Address', 'Balance Payable (Rs.)'];
      const rows = suppliers.map((s) => [s.name, s.contactNumber || '', s.address || '', s.currentBalance]);
      exportToCSV('Supplier_Outstanding_Report', headers, rows);
    } else if (activeReport === 'customer-due') {
      const headers = ['Customer Name', 'Contact', 'Delivery Area', 'Balance Receivable (Rs.)'];
      const rows = customers.map((c) => [c.name, c.contactNumber || '', c.address || '', c.currentBalance]);
      exportToCSV('Customer_Outstanding_Report', headers, rows);
    }
  };

  const reportTabs = [
    { id: 'pnl', label: 'Profit & Loss (P&L)', icon: TrendingUp },
    { id: 'stock', label: 'Stock Valuation & Low Stock', icon: Boxes },
    { id: 'sales', label: 'Sales & Revenue', icon: Receipt },
    { id: 'production', label: 'Production Summary', icon: Factory },
    { id: 'supplier-due', label: 'Supplier Payables', icon: Truck },
    { id: 'customer-due', label: 'Customer Receivables', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Business Intelligence & Reports
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Financial analytics, audit-ready statements, stock valuation, and production yields
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print Report
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Navigation Tabs & Date Range Filter */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id as ReportTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter Bar */}
        {activeReport !== 'stock' && (
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Date Range Filter:
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-amber-400 hover:underline text-[11px] cursor-pointer"
              >
                Clear Range
              </button>
            )}
            <button
              onClick={fetchActiveReport}
              disabled={loading}
              className="ml-auto px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* Main Report Body Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden">
        {/* Diamond Dairy Header Banner for Print / Display */}
        <div className="border-b border-slate-800 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              Diamond Dairy Management System
            </span>
            <h2 className="text-xl font-bold text-white">
              {reportTabs.find((t) => t.id === activeReport)?.label}
            </h2>
            <p className="text-xs text-slate-400">
              Proprietor: Muhammad Imran &bull; Period: {startDate ? formatDate(startDate) : 'Beginning'} to{' '}
              {endDate ? formatDate(endDate) : 'Today'}
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-400">
            <span className="block font-medium text-slate-300">MAS Account Solution</span>
            <span className="text-[11px] text-slate-400">Standard Accounting Principles</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Generating report data...</div>
        ) : (
          <div>
            {/* 1. PROFIT & LOSS REPORT */}
            {activeReport === 'pnl' && pnlData && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-slate-800/40 rounded-xl border border-slate-800 p-5 space-y-4">
                  {/* Revenue */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-white text-base">Sales Revenue</h3>
                      <p className="text-xs text-slate-400">Total gross value of all sales invoices</p>
                    </div>
                    <span className="text-xl font-bold text-emerald-400">
                      {formatCurrency(pnlData.totalSalesRevenue)}
                    </span>
                  </div>

                  {/* COGS */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-white text-base">Cost of Goods Sold (COGS)</h3>
                      <p className="text-xs text-slate-400">Direct ingredient & packing costs attributed to sold goods</p>
                    </div>
                    <span className="text-lg font-bold text-rose-400">
                      − {formatCurrency(pnlData.costOfGoodsSold)}
                    </span>
                  </div>

                  {/* Gross Profit */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                    <div>
                      <span className="font-bold text-white text-base">Gross Profit</span>
                      <p className="text-[11px] text-slate-400">Sales Revenue − COGS</p>
                    </div>
                    <span
                      className={`text-xl font-extrabold ${
                        pnlData.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(pnlData.grossProfit)}
                    </span>
                  </div>

                  {/* Operating Expenses Breakdown */}
                  <div className="pt-2 space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Operating Expenses Breakdown:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(pnlData.operatingExpensesBreakdown).map(([cat, amt]) => (
                        <div
                          key={cat}
                          className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800"
                        >
                          <span className="text-slate-300 font-medium">{cat}</span>
                          <span className="text-rose-400 font-bold">{formatCurrency(Number(amt) || 0)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 pt-2 border-t border-slate-800">
                      <span>Total Operating Expenses:</span>
                      <span className="text-rose-400 font-bold">
                        − {formatCurrency(pnlData.totalOperatingExpenses)}
                      </span>
                    </div>
                  </div>

                  {/* Net Profit / Loss */}
                  <div
                    className={`p-5 rounded-2xl border flex items-center justify-between mt-4 ${
                      pnlData.netProfitOrLoss >= 0
                        ? 'bg-emerald-950/40 border-emerald-800'
                        : 'bg-rose-950/40 border-rose-800'
                    }`}
                  >
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                        Net Operating Performance
                      </span>
                      <h4 className="text-xl font-bold text-white">
                        {pnlData.netProfitOrLoss >= 0 ? 'Net Profit' : 'Net Loss'}
                      </h4>
                    </div>
                    <span
                      className={`text-2xl sm:text-3xl font-extrabold ${
                        pnlData.netProfitOrLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(pnlData.netProfitOrLoss)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. STOCK VALUATION & LOW STOCK */}
            {activeReport === 'stock' && stockData && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-800 gap-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Inventory Valuation</span>
                    <span className="text-2xl font-bold text-amber-300">
                      {formatCurrency(stockData.grandTotalStockValue)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    {stockData.categorySummary.map((c) => (
                      <div key={c.category} className="text-right">
                        <span className="text-slate-400 block">{c.category}</span>
                        <span className="font-bold text-white">{formatCurrency(c.totalValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Current Stock</th>
                        <th className="py-2.5 px-3 text-right">Valuation Rate</th>
                        <th className="py-2.5 px-3 text-right">Total Value</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {stockData.items.map((it) => (
                        <tr
                          key={it.id}
                          className={`hover:bg-slate-800/30 ${it.isLowStock ? 'bg-rose-950/20' : ''}`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-white">{it.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                              {it.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                            {formatQuantity(it.currentStockQty, it.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {formatCurrency(it.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                            {formatCurrency(it.value)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {it.isLowStock ? (
                              <span className="text-rose-400 font-semibold text-[10px]">
                                Low Stock (&le; {it.lowStockThreshold})
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-[10px]">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. SALES REPORT */}
            {activeReport === 'sales' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-4">
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Total Sales Amount:</span>
                    <span className="text-xl font-bold text-white">
                      {formatCurrency(salesInvoices.reduce((sum, i) => sum + i.invoiceTotal, 0))}
                    </span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Cash Collected Now:</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {formatCurrency(salesInvoices.reduce((sum, i) => sum + i.amountPaidNow, 0))}
                    </span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Added to Customer Receivables:</span>
                    <span className="text-xl font-bold text-amber-400">
                      {formatCurrency(salesInvoices.reduce((sum, i) => sum + i.balanceDue, 0))}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3 text-right">Invoice Total</th>
                        <th className="py-2.5 px-3 text-right">Paid Now</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {salesInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-bold text-amber-300">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3">{formatDate(inv.date)}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{inv.customerName}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {formatCurrency(inv.invoiceTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            {formatCurrency(inv.amountPaidNow)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                            {formatCurrency(inv.balanceDue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. PRODUCTION SUMMARY REPORT */}
            {activeReport === 'production' && (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Batch #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Quantity Produced</th>
                        <th className="py-2.5 px-3 text-right">Total Cost</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {productionBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-bold text-amber-300">{b.batchNumber}</td>
                          <td className="py-2.5 px-3">{formatDate(b.date)}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{b.finishedProductName}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {formatQuantity(b.quantityProduced, b.finishedProductUnit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {formatCurrency(b.totalBatchCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-300">
                            {formatCurrency(b.costPerUnit)} / {b.finishedProductUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. SUPPLIER OUTSTANDING REPORT */}
            {activeReport === 'supplier-due' && (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Supplier</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3">Address</th>
                        <th className="py-2.5 px-3 text-right">Balance Payable (We Owe)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {suppliers.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-white">{s.name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{s.contactNumber || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-400">{s.address || '-'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                            {formatCurrency(s.currentBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. CUSTOMER OUTSTANDING REPORT */}
            {activeReport === 'customer-due' && (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Customer / Dealer</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3">Delivery Area</th>
                        <th className="py-2.5 px-3 text-right">Balance Receivable (They Owe Us)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {customers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-white">{c.name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{c.contactNumber || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-400">{c.address || '-'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {formatCurrency(c.currentBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Credit line */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-1">
          <span>Diamond Dairy &bull; Proprietor: Muhammad Imran</span>
          <span>Developed by MAS Account Solution</span>
        </div>
      </div>
    </div>
  );
};
