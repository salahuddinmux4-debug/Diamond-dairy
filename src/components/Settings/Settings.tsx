import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Settings as SettingsIcon,
  Shield,
  Building,
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { role, switchRole, isAdmin } = useAuth();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleBackupDownload = async () => {
    try {
      setIsExporting(true);
      setErrorMsg(null);
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diamond_Dairy_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('Backup downloaded successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      setErrorMsg('Only Admin can restore database backups.');
      return;
    }

    if (
      !confirm(
        'Warning: Restoring from a backup file will replace current database records. Are you sure?'
      )
    ) {
      e.target.value = '';
      return;
    }

    try {
      setIsImporting(true);
      setErrorMsg(null);
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.importBackup(parsed);
      setSuccessMsg('Database restored successfully from backup. Reloading page...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setErrorMsg('Invalid backup file or restore failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">System Settings</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Business profiles, user roles, security privileges, and database backups
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-200 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Business Profile Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Building className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Business Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-slate-400 uppercase text-[10px] font-semibold block mb-1">
              Business Name
            </span>
            <span className="text-base font-bold text-white">Diamond Dairy</span>
          </div>

          <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-slate-400 uppercase text-[10px] font-semibold block mb-1">
              Proprietor
            </span>
            <span className="text-base font-bold text-amber-400">Muhammad Imran</span>
          </div>

          <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-slate-400 uppercase text-[10px] font-semibold block mb-1">
              System Developer
            </span>
            <span className="text-base font-bold text-sky-400">MAS Account Solution</span>
          </div>
        </div>
      </div>

      {/* Role Management & Permissions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Role-Based Access Control (RBAC)</h2>
        </div>

        <p className="text-xs text-slate-300">
          The application enforces strict permission boundaries between administrative owners and daily operations staff:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div
            className={`p-4 rounded-xl border ${
              isAdmin
                ? 'bg-amber-950/20 border-amber-800/70'
                : 'bg-slate-800/30 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-white">Admin (Owner)</span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                  Active
                </span>
              )}
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
              <li>Full access to all modules and reports</li>
              <li>Can create, edit, and delete Items and BOM recipes</li>
              <li>Can adjust Opening Balances (Stock, Suppliers, Customers, Cash/Bank)</li>
              <li>Can delete expenses, purchases, and production entries</li>
              <li>Full access to Database Backups & Restore</li>
            </ul>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              !isAdmin
                ? 'bg-sky-950/20 border-sky-800/70'
                : 'bg-slate-800/30 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-white">Accountant (Data Entry)</span>
              {!isAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-slate-950">
                  Active
                </span>
              )}
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
              <li>Can record new purchases, production batches, and sales invoices</li>
              <li>Can record supplier payments and customer receipts</li>
              <li>Can record daily operating expenses</li>
              <li className="text-rose-400">Strictly prohibited from editing historical records</li>
              <li className="text-rose-400">Cannot delete entries or modify opening balances</li>
            </ul>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">Switch current session role:</span>
          <button
            onClick={() => switchRole(isAdmin ? 'Accountant' : 'Admin')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            Switch to {isAdmin ? 'Accountant' : 'Admin'} Mode
          </button>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Database className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Database Backup & Disaster Recovery</h2>
        </div>

        <p className="text-xs text-slate-400">
          Export your complete operational ledger (items, stock balances, customers, suppliers, purchases, production batches, and expenses) to a JSON file. Store this offline or on external storage for security.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleBackupDownload}
            disabled={isExporting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            {isExporting ? 'Exporting...' : 'Download Full Backup (JSON)'}
          </button>

          {isAdmin && (
            <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
              <Upload className="w-4 h-4 text-sky-400" />
              {isImporting ? 'Restoring...' : 'Restore from Backup'}
              <input
                type="file"
                accept=".json"
                onChange={handleBackupUpload}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
};
