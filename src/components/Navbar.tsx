import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  ScrollText,
  Factory,
  ShoppingBag,
  Truck,
  Receipt,
  Users,
  WalletCards,
  Landmark,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'items'
  | 'bom'
  | 'production'
  | 'purchases'
  | 'suppliers'
  | 'sales'
  | 'customers'
  | 'expenses'
  | 'cash-bank'
  | 'reports'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, switchRoleQuick, logout } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'items', label: 'Item Master', icon: Boxes },
    { id: 'bom', label: 'BOM / Recipes', icon: ScrollText },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'sales', label: 'Sales & Invoicing', icon: Receipt },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: WalletCards },
    { id: 'cash-bank', label: 'Cash & Bank', icon: Landmark },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      {/* Top Banner with Brand and User Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Company Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3h12l4 6-10 12L2 9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl text-white tracking-tight">
                  Diamond Dairy
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Business System
                </span>
              </div>
              <p className="text-xs text-amber-400/90 font-medium">Proprietor: Muhammad Imran</p>
            </div>
          </div>

          {/* User Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Badge & Switch */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => switchRoleQuick('Admin')}
                title="Switch to Admin role"
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAdmin
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => switchRoleQuick('Accountant')}
                title="Switch to Accountant role"
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isAdmin
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Accountant</span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60 text-xs sm:text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
