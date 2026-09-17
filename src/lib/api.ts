import {
  Item,
  StockMovementLog,
  BOM,
  Supplier,
  SupplierLedgerEntry,
  PurchaseEntry,
  ProductionBatch,
  Customer,
  CustomerLedgerEntry,
  SaleInvoice,
  Expense,
  CashBankLedgerEntry,
  AppSettings,
  DashboardSummary,
  User,
} from '../types';

let currentUserRole: 'Admin' | 'Accountant' = 'Admin';

export function setCurrentApiRole(role: 'Admin' | 'Accountant') {
  currentUserRole = role;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-role', currentUserRole);

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Server error ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ success: boolean; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  changePassword: (data: { targetRole: 'Admin' | 'Accountant'; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Settings
  getSettings: () => request<AppSettings>('/api/settings'),
  updateSettings: (settings: Partial<AppSettings>) =>
    request<AppSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Items
  getItems: () => request<Item[]>('/api/items'),
  addItem: (data: any) =>
    request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateItem: (id: string, data: any) =>
    request<Item>(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteItem: (id: string) =>
    request<{ success: boolean }>(`/api/items/${id}`, {
      method: 'DELETE',
    }),
  getItemMovements: (id: string) => request<StockMovementLog[]>(`/api/items/${id}/movements`),

  // BOM
  getBOMs: () => request<BOM[]>('/api/boms'),
  getBOMByFinishedProduct: (finishedProductId: string) =>
    request<BOM>(`/api/boms/${finishedProductId}`),
  saveBOM: (data: any) =>
    request<BOM>('/api/boms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBOM: (id: string) =>
    request<{ success: boolean }>(`/api/boms/${id}`, {
      method: 'DELETE',
    }),

  // Suppliers
  getSuppliers: () => request<Supplier[]>('/api/suppliers'),
  addSupplier: (data: any) =>
    request<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id: string, data: any) =>
    request<Supplier>(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: string) =>
    request<{ success: boolean }>(`/api/suppliers/${id}`, {
      method: 'DELETE',
    }),
  getSupplierLedger: (id: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<SupplierLedgerEntry[]>(`/api/suppliers/${id}/ledger?${params.toString()}`);
  },
  recordSupplierPayment: (id: string, data: any) =>
    request<{ success: boolean }>(`/api/suppliers/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Purchases
  getPurchases: (startDate?: string, endDate?: string, supplierId?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (supplierId) params.set('supplierId', supplierId);
    return request<PurchaseEntry[]>(`/api/purchases?${params.toString()}`);
  },
  recordPurchase: (data: any) =>
    request<PurchaseEntry>('/api/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Production
  getProductionBatches: (startDate?: string, endDate?: string, finishedProductId?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (finishedProductId) params.set('finishedProductId', finishedProductId);
    return request<ProductionBatch[]>(`/api/production?${params.toString()}`);
  },
  getProductions: (startDate?: string, endDate?: string, finishedProductId?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (finishedProductId) params.set('finishedProductId', finishedProductId);
    return request<ProductionBatch[]>(`/api/production?${params.toString()}`);
  },
  getProductionBatch: (id: string) => request<ProductionBatch>(`/api/production/${id}`),
  recordProduction: (data: any) =>
    request<ProductionBatch>('/api/production', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Customers
  getCustomers: () => request<Customer[]>('/api/customers'),
  addCustomer: (data: any) =>
    request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: string, data: any) =>
    request<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCustomer: (id: string) =>
    request<{ success: boolean }>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),
  getCustomerLedger: (id: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<CustomerLedgerEntry[]>(`/api/customers/${id}/ledger?${params.toString()}`);
  },
  recordCustomerPayment: (id: string, data: any) =>
    request<{ success: boolean }>(`/api/customers/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Sales
  getSales: (startDate?: string, endDate?: string, customerId?: string, itemId?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (customerId) params.set('customerId', customerId);
    if (itemId) params.set('itemId', itemId);
    return request<SaleInvoice[]>(`/api/sales?${params.toString()}`);
  },
  getSale: (id: string) => request<SaleInvoice>(`/api/sales/${id}`),
  recordSale: (data: any) =>
    request<SaleInvoice>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createSale: (data: any) =>
    request<SaleInvoice>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Expenses
  getExpenses: (startDate?: string, endDate?: string, category?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (category) params.set('category', category);
    return request<Expense[]>(`/api/expenses?${params.toString()}`);
  },
  recordExpense: (data: any) =>
    request<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addExpense: (data: any) =>
    request<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteExpense: (id: string) =>
    request<{ success: boolean }>(`/api/expenses/${id}`, {
      method: 'DELETE',
    }),

  // Cash & Bank
  getCashBankBalances: () =>
    request<{ cashBalance: number; bankBalance: number; combinedTotal: number }>(
      '/api/cash-bank/balances'
    ),
  getCashBank: async () => {
    const [balances, settings] = await Promise.all([
      request<{ cashBalance: number; bankBalance: number; combinedTotal: number }>(
        '/api/cash-bank/balances'
      ),
      request<AppSettings>('/api/settings'),
    ]);
    return {
      cashBalance: balances.cashBalance,
      bankBalance: balances.bankBalance,
      combinedTotal: balances.combinedTotal,
      cashOpeningBalance: settings.cashOpeningBalance || 0,
      bankOpeningBalance: settings.bankOpeningBalance || 0,
      openingBalanceDate: settings.cashOpeningDate || '',
    };
  },
  getCashBankLedger: (account?: 'Cash' | 'Bank', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (account) params.set('account', account);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<CashBankLedgerEntry[]>(`/api/cash-bank/ledger?${params.toString()}`);
  },
  updateCashBankOpening: (data: any) =>
    request<any>('/api/cash-bank/opening', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  recordCashBankAdjustment: (data: any) =>
    request<{ success: boolean }>('/api/cash-bank/adjustment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  transferCashBank: (data: {
    fromAccount: 'Cash' | 'Bank';
    toAccount: 'Cash' | 'Bank';
    amount: number;
    date: string;
    note?: string;
  }) =>
    request<{ success: boolean }>('/api/cash-bank/adjustment', {
      method: 'POST',
      body: JSON.stringify({
        account: data.fromAccount,
        transferToAccount: data.toAccount,
        amount: data.amount,
        date: data.date,
        note: data.note,
        adjustmentType: 'Transfer',
      }),
    }),

  // Dashboard
  getDashboard: () => request<DashboardSummary>('/api/dashboard'),

  // Reports
  getPnLReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<any>(`/api/reports/pnl?${params.toString()}`);
  },
  getProfitLossReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<any>(`/api/reports/pnl?${params.toString()}`);
  },
  getStockReport: async () => {
    const dash = await request<DashboardSummary>('/api/dashboard');
    return {
      grandTotalStockValue: dash.grandTotalStockValue,
      categorySummary: dash.categoryStockSummary,
      items: dash.itemsStockTable,
    };
  },

  // Backup
  exportBackup: () => request<any>('/api/backup/export'),
  importBackup: (backupData: any) =>
    request<{ success: boolean; message: string }>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify(backupData),
    }),
};
