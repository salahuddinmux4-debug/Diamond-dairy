import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CashBankLedgerEntry } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import {
  Landmark,
  Wallet,
  ArrowRightLeft,
  Settings,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Download,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

export const CashBank: React.FC = () => {
  const { isAdmin } = useAuth();
  const [cashBalance, setCashBalance] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [combinedTotal, setCombinedTotal] = useState(0);
  const [activeAccount, setActiveAccount] = useState<'All' | 'Cash' | 'Bank'>('All');
  const [entries, setEntries] = useState<CashBankLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transfer Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<'Cash' | 'Bank'>('Cash');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Adjust Opening Balance Modal (Admin only)
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);
  const [openCashAmt, setOpenCashAmt] = useState('0');
  const [openBankAmt, setOpenBankAmt] = useState('0');
  const [openDate, setOpenDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingSubmitting, setOpeningSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cbData, ledgerData] = await Promise.all([
        api.getCashBank(),
        api.getCashBankLedger(
          activeAccount === 'All' ? undefined : activeAccount,
          startDate,
          endDate
        ),
      ]);
      setCashBalance(cbData.cashBalance);
      setBankBalance(cbData.bankBalance);
      setCombinedTotal(cbData.combinedTotal);
      setOpenCashAmt(cbData.cashOpeningBalance.toString());
      setOpenBankAmt(cbData.bankOpeningBalance.toString());
      setOpenDate(cbData.openingBalanceDate || new Date().toISOString().split('T')[0]);
      const normalized = (ledgerData || []).map((e) => ({
        ...e,
        debit: e.debit ?? e.amountIn ?? 0,
        credit: e.credit ?? e.amountOut ?? 0,
        description: e.description || e.referenceNote || '',
      }));
      setEntries(normalized);
    } catch (err: any) {
      setError(err?.message || 'Failed to load cash/bank records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeAccount, startDate, endDate]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const amt = Number(transferAmount);
    if (amt <= 0) {
      setError('Transfer amount must be greater than zero');
      return;
    }

    const toAccount: 'Cash' | 'Bank' = transferFrom === 'Cash' ? 'Bank' : 'Cash';
    setTransferSubmitting(true);
    try {
      await api.transferCashBank({
        fromAccount: transferFrom,
        toAccount,
        amount: amt,
        date: transferDate,
        note: transferNote,
      });

      setSuccessMsg(`Transferred ${formatCurrency(amt)} from ${transferFrom} to ${toAccount}.`);
      setIsTransferOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to execute transfer');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleSaveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admin can adjust opening balances.');
      return;
    }

    setOpeningSubmitting(true);
    try {
      await api.updateCashBankOpening({
        cashOpeningBalance: Number(openCashAmt) || 0,
        bankOpeningBalance: Number(openBankAmt) || 0,
        openingBalanceDate: openDate,
      });
      setSuccessMsg('Cash & Bank opening balances updated.');
      setIsOpeningOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update opening balances');
    } finally {
      setOpeningSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Account', 'Type', 'Description / Note', 'Debit (+ Inflow)', 'Credit (− Outflow)'];
    const rows = entries.map((e) => [
      e.date,
      e.account,
      e.type,
      e.description || '',
      e.debit,
      e.credit,
    ]);
    exportToCSV(`Cash_Bank_Ledger_${activeAccount}`, headers, rows);
  };

  const filteredEntries = entries.filter((e) =>
    (e.description || e.referenceNote || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Cash & Bank</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time liquid funds, bank deposits, customer collections, and petty cash
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsOpeningOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" /> Adjust Opening
            </button>
          )}

          <button
            onClick={() => {
              setTransferAmount('');
              setTransferNote('');
              setTransferDate(new Date().toISOString().split('T')[0]);
              setIsTransferOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" /> Transfer Funds
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

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Combined Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Combined Liquidity
          </span>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(combinedTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Available working capital across cash drawer and bank
          </p>
        </div>

        {/* Cash in Hand */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
              Cash-in-Hand
            </span>
            <Wallet className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(cashBalance)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Opening: {formatCurrency(Number(openCashAmt) || 0)}</span>
            <button
              onClick={() => setActiveAccount('Cash')}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Filter Cash Ledger
            </button>
          </div>
        </div>

        {/* Bank Account */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Bank Account
            </span>
            <Landmark className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(bankBalance)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Opening: {formatCurrency(Number(openBankAmt) || 0)}</span>
            <button
              onClick={() => setActiveAccount('Bank')}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Filter Bank Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {(['All', 'Cash', 'Bank'] as const).map((acc) => (
            <button
              key={acc}
              onClick={() => setActiveAccount(acc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeAccount === acc
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {acc === 'All' ? 'All Accounts' : acc === 'Cash' ? 'Cash-in-Hand' : 'Bank Account'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading cash/bank activity...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No transactions found for the selected account and date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description / Reference</th>
                  <th className="py-3 px-4 text-right">Debit (+ Inflow)</th>
                  <th className="py-3 px-4 text-right">Credit (− Outflow)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          e.account === 'Cash'
                            ? 'bg-teal-950 text-teal-300 border border-teal-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {e.account}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{e.type}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm truncate" title={e.description}>
                      {e.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-400">
                      {e.debit > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <ArrowDownCircle className="w-3 h-3" />
                          {formatCurrency(e.debit)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-rose-400">
                      {e.credit > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <ArrowUpCircle className="w-3 h-3" />
                          {formatCurrency(e.credit)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer Funds Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white">Transfer Cash &harr; Bank Funds</h2>
              <button
                onClick={() => setIsTransferOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Transfer From <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value as 'Cash' | 'Bank')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
                  >
                    <option value="Cash">Cash-in-Hand</option>
                    <option value="Bank">Bank Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Transfer To
                  </label>
                  <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 text-xs font-semibold">
                    {transferFrom === 'Cash' ? 'Bank Account' : 'Cash-in-Hand'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Amount to Transfer (Rs.) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Transfer Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Transfer Note / Cheque #
                </label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Cash deposited in HBL account by Imran"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {transferSubmitting ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Opening Balance Modal (Admin Only) */}
      {isOpeningOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Adjust Cash & Bank Opening Balance</h2>
                <p className="text-xs text-amber-400">Admin Authorization Only</p>
              </div>
              <button
                onClick={() => setIsOpeningOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Cash-in-Hand Opening Balance (Rs.)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={openCashAmt}
                  onChange={(e) => setOpenCashAmt(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Bank Account Opening Balance (Rs.)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={openBankAmt}
                  onChange={(e) => setOpenBankAmt(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  As of Date
                </label>
                <input
                  type="date"
                  required
                  value={openDate}
                  onChange={(e) => setOpenDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpeningOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={openingSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {openingSubmitting ? 'Saving...' : 'Update Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
