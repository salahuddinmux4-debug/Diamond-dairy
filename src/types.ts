export type ItemCategory = 'Raw Material' | 'Packing Material' | 'Finished Product';
export type ItemUnit = 'Kg' | 'Liter' | 'Pcs';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  unit: ItemUnit;
  purchaseRate: number; // For Raw Material & Packing Material
  saleRate: number; // For Finished Product
  openingStockQty: number;
  openingStockDate: string;
  currentStockQty: number; // System-calculated, read-only
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'Opening Stock'
  | 'Purchase'
  | 'Production In'
  | 'Consumption Out'
  | 'Sale Out'
  | 'Stock Adjustment';

export interface StockMovementLog {
  id: string;
  itemId: string;
  itemName: string;
  itemCategory: ItemCategory;
  itemUnit: ItemUnit;
  date: string;
  type: StockMovementType;
  quantityChange: number; // positive for additions, negative for deductions
  resultingBalance: number;
  referenceId?: string;
  referenceNote?: string;
  createdAt: string;
}

export interface BOMIngredient {
  itemId: string;
  itemName?: string;
  defaultQty: number; // Quantity required for the recipe output unit
  unit?: ItemUnit;
}

export interface BOM {
  id: string;
  finishedProductId: string;
  finishedProductName?: string;
  outputQty: number; // e.g. 1 (Kg/Liter/Pcs)
  ingredients: BOMIngredient[];
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactNumber?: string;
  address?: string;
  openingBalance: number; // positive = we owe them, negative = they owe us / advance
  openingBalanceDate: string;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  type: 'Opening Balance' | 'Purchase' | 'Payment Made';
  referenceId?: string;
  referenceNote?: string;
  debit: number; // Payment made to them, reduces our liability
  credit: number; // Purchase made from them, increases our liability
  runningBalance: number;
  createdAt: string;
}

export interface PurchaseItemLine {
  itemId: string;
  itemName: string;
  category: ItemCategory;
  unit: ItemUnit;
  quantity: number;
  rate: number;
  lineTotal: number;
}

export interface PurchaseEntry {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItemLine[];
  billTotal: number;
  amountPaidNow: number;
  paymentMethod: 'Cash' | 'Bank';
  balanceDue: number;
  note?: string;
  createdAt: string;
}

export interface ProductionIngredientLine {
  itemId: string;
  itemName: string;
  unit: ItemUnit;
  quantityConsumed: number;
  purchaseRate: number;
  lineCost: number;
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  date: string;
  finishedProductId: string;
  finishedProductName: string;
  finishedProductUnit: ItemUnit;
  quantityProduced: number;
  ingredients: ProductionIngredientLine[];
  batchProductionCost: number; // sum of (ingredient qty * rate)
  costPerUnit: number; // batchProductionCost / quantityProduced
  batchNote?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  contactNumber?: string;
  address?: string;
  openingBalance: number; // positive = customer owes us (udhaar), negative = advance
  openingBalanceDate: string;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  type: 'Opening Balance' | 'Sale' | 'Payment Received';
  referenceId?: string;
  referenceNote?: string;
  debit: number; // Sale invoice amount, increases receivable
  credit: number; // Payment received, decreases receivable
  runningBalance: number;
  createdAt: string;
}

export interface SaleItemLine {
  itemId: string;
  itemName: string;
  unit: ItemUnit;
  quantity: number;
  saleRate: number;
  lineTotal: number;
  costPerUnit: number; // production cost per unit
  profit: number; // (saleRate - costPerUnit) * quantity
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  items: SaleItemLine[];
  invoiceTotal: number;
  amountReceivedNow: number;
  paymentMethod: 'Cash' | 'Bank';
  balanceDue: number;
  totalCost: number;
  totalProfit: number;
  note?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note?: string;
  paidFrom: 'Cash' | 'Bank';
  createdAt: string;
}

export interface CashBankAdjustment {
  id: string;
  date: string;
  account: 'Cash' | 'Bank';
  adjustmentType: 'Deposit' | 'Withdrawal' | 'Correction' | 'Transfer';
  transferToAccount?: 'Cash' | 'Bank';
  amount: number;
  note?: string;
  createdAt: string;
}

export interface CashBankLedgerEntry {
  id: string;
  date: string;
  account: 'Cash' | 'Bank';
  type:
    | 'Opening Balance'
    | 'Customer Payment'
    | 'Sale Receipt'
    | 'Supplier Payment'
    | 'Purchase Payment'
    | 'Expense'
    | 'Manual Adjustment'
    | 'Transfer In'
    | 'Transfer Out';
  referenceId?: string;
  referenceNote?: string;
  description?: string;
  amountIn: number;
  amountOut: number;
  debit?: number;
  credit?: number;
  runningBalance: number;
  createdAt: string;
}

export type UserRole = 'Admin' | 'Accountant';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface AppSettings {
  businessName: string;
  proprietor: string;
  developerCredit: string;
  currencySymbol: string;
  allowNegativeStockOverride: boolean;
  cashOpeningBalance: number;
  cashOpeningDate: string;
  bankOpeningBalance: number;
  bankOpeningDate: string;
}

export interface DashboardSummary {
  grandTotalStockValue: number;
  categoryStockSummary: {
    category: ItemCategory;
    itemCount: number;
    totalValue: number;
  }[];
  lowStockItemsCount: number;
  itemsStockTable: {
    id: string;
    name: string;
    category: ItemCategory;
    unit: ItemUnit;
    currentStockQty: number;
    rate: number;
    value: number;
    isLowStock: boolean;
    lowStockThreshold?: number;
  }[];
  todaySummary: {
    productionQuantity: number;
    productionValue: number;
    salesAmount: number;
    salesCount: number;
  };
  receivablesPayables: {
    totalReceivable: number; // positive customer balances sum
    totalPayable: number; // positive supplier balances sum
  };
  cashBank: {
    cashBalance: number;
    bankBalance: number;
    combinedTotal: number;
  };
}

export type ExpenseCategory = 'Fuel' | 'Electricity' | 'Labor' | 'Maintenance' | 'Rent' | 'Other' | string;
export type ExpenseEntry = Expense & { description?: string; referenceNumber?: string };
export type ProductionEntry = ProductionBatch;

export interface ProfitLossReport {
  totalSalesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpensesBreakdown: Record<string, number>;
  totalOperatingExpenses: number;
  netProfitOrLoss: number;
}

export interface StockReport {
  grandTotalStockValue: number;
  categorySummary: {
    category: string;
    itemCount: number;
    totalValue: number;
  }[];
  items: {
    id: string;
    name: string;
    category: string;
    unit: string;
    currentStockQty: number;
    rate: number;
    value: number;
    isLowStock: boolean;
    lowStockThreshold?: number;
  }[];
}
