import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavTab } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { ItemMaster } from './components/ItemMaster/ItemMaster';
import { BOMSetup } from './components/BOM/BOMSetup';
import { Production } from './components/Production/Production';
import { Purchases } from './components/Purchases/Purchases';
import { Suppliers } from './components/Suppliers/Suppliers';
import { Sales } from './components/Sales/Sales';
import { Customers } from './components/Customers/Customers';
import { Expenses } from './components/Expenses/Expenses';
import { CashBank } from './components/CashBank/CashBank';
import { Reports } from './components/Reports/Reports';
import { Settings } from './components/Settings/Settings';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'items' && <ItemMaster />}
        {activeTab === 'bom' && <BOMSetup />}
        {activeTab === 'production' && <Production />}
        {activeTab === 'purchases' && <Purchases />}
        {activeTab === 'suppliers' && <Suppliers />}
        {activeTab === 'sales' && <Sales />}
        {activeTab === 'customers' && <Customers />}
        {activeTab === 'expenses' && <Expenses />}
        {activeTab === 'cash-bank' && <CashBank />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'settings' && <Settings />}
      </main>

      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
