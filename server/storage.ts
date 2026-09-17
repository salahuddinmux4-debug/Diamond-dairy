import fs from 'fs';
import path from 'path';
import {
  Item,
  StockMovementLog,
  BOM,
  Supplier,
  SupplierLedgerEntry,
  PurchaseEntry,
  PurchaseItemLine,
  ProductionBatch,
  ProductionIngredientLine,
  Customer,
  CustomerLedgerEntry,
  SaleInvoice,
  Expense,
  CashBankAdjustment,
  CashBankLedgerEntry,
  AppSettings,
  DashboardSummary,
  ItemCategory,
  ItemUnit,
  UserRole,
} from '../src/types';

interface StoredUser {
  id: string;
  username: string;
  password: string; // Plaintext for local single-tenant appliance or hashed
  role: UserRole;
  name: string;
}

interface DatabaseSchema {
  items: Item[];
  stockMovementLogs: StockMovementLog[];
  boms: BOM[];
  suppliers: Supplier[];
  supplierLedgerEntries: SupplierLedgerEntry[];
  purchases: PurchaseEntry[];
  productionBatches: ProductionBatch[];
  customers: Customer[];
  customerLedgerEntries: CustomerLedgerEntry[];
  sales: SaleInvoice[];
  expenses: Expense[];
  cashBankAdjustments: CashBankAdjustment[];
  cashBankLedgerEntries: CashBankLedgerEntry[];
  users: StoredUser[];
  settings: AppSettings;
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'diamond_dairy_db.json');

const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Diamond Dairy',
  proprietor: 'Muhammad Imran',
  developerCredit: 'Developed by MAS Account Solution',
  currencySymbol: 'Rs.',
  allowNegativeStockOverride: false,
  cashOpeningBalance: 0,
  cashOpeningDate: new Date().toISOString().split('T')[0],
  bankOpeningBalance: 0,
  bankOpeningDate: new Date().toISOString().split('T')[0],
};

const INITIAL_USERS: StoredUser[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin123',
    role: 'Admin',
    name: 'Muhammad Imran (Admin)',
  },
  {
    id: 'usr-accountant',
    username: 'accountant',
    password: 'accountant123',
    role: 'Accountant',
    name: 'Accountant Staff',
  },
];

class Storage {
  private db: DatabaseSchema;

  constructor() {
    this.db = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          items: parsed.items || [],
          stockMovementLogs: parsed.stockMovementLogs || [],
          boms: parsed.boms || [],
          suppliers: parsed.suppliers || [],
          supplierLedgerEntries: parsed.supplierLedgerEntries || [],
          purchases: parsed.purchases || [],
          productionBatches: parsed.productionBatches || [],
          customers: parsed.customers || [],
          customerLedgerEntries: parsed.customerLedgerEntries || [],
          sales: parsed.sales || [],
          expenses: parsed.expenses || [],
          cashBankAdjustments: parsed.cashBankAdjustments || [],
          cashBankLedgerEntries: parsed.cashBankLedgerEntries || [],
          users: parsed.users?.length ? parsed.users : INITIAL_USERS,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error('Error loading DB file, initializing empty store:', err);
    }

    const initialDb: DatabaseSchema = {
      items: [],
      stockMovementLogs: [],
      boms: [],
      suppliers: [],
      supplierLedgerEntries: [],
      purchases: [],
      productionBatches: [],
      customers: [],
      customerLedgerEntries: [],
      sales: [],
      expenses: [],
      cashBankAdjustments: [],
      cashBankLedgerEntries: [],
      users: INITIAL_USERS,
      settings: DEFAULT_SETTINGS,
    };

    this.saveDatabase(initialDb);
    return initialDb;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.db;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB file:', err);
    }
  }

  // --- Auth & Users ---
  public authenticate(username: string, password: string): { id: string; username: string; role: UserRole; name: string } | null {
    const user = this.db.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );
    if (!user) return null;
    return { id: user.id, username: user.username, role: user.role, name: user.name };
  }

  public getUsers() {
    return this.db.users.map(({ id, username, role, name }) => ({ id, username, role, name }));
  }

  public updateAccountantPassword(newPassword: string): boolean {
    const acc = this.db.users.find((u) => u.role === 'Accountant');
    if (!acc) return false;
    acc.password = newPassword;
    this.saveDatabase();
    return true;
  }

  public updateAdminPassword(newPassword: string): boolean {
    const admin = this.db.users.find((u) => u.role === 'Admin');
    if (!admin) return false;
    admin.password = newPassword;
    this.saveDatabase();
    return true;
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return this.db.settings;
  }

  public updateSettings(settings: Partial<AppSettings>): AppSettings {
    this.db.settings = { ...this.db.settings, ...settings };
    this.saveDatabase();
    return this.db.settings;
  }

  // --- Items Master ---
  public getItems(): Item[] {
    return this.db.items;
  }

  public getItemById(id: string): Item | undefined {
    return this.db.items.find((i) => i.id === id);
  }

  public addItem(itemData: {
    name: string;
    category: ItemCategory;
    unit: ItemUnit;
    purchaseRate: number;
    saleRate: number;
    openingStockQty: number;
    openingStockDate: string;
    lowStockThreshold?: number;
  }): { success: boolean; item?: Item; error?: string } {
    const trimmedName = itemData.name.trim();
    if (!trimmedName) return { success: false, error: 'Item name is required' };

    const exists = this.db.items.some(
      (i) => i.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      return { success: false, error: `An item named "${trimmedName}" already exists.` };
    }

    const openingQty = Number(itemData.openingStockQty) || 0;
    const now = new Date().toISOString();
    const id = 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const newItem: Item = {
      id,
      name: trimmedName,
      category: itemData.category,
      unit: itemData.unit,
      purchaseRate: Number(itemData.purchaseRate) || 0,
      saleRate: Number(itemData.saleRate) || 0,
      openingStockQty: openingQty,
      openingStockDate: itemData.openingStockDate || now.split('T')[0],
      currentStockQty: openingQty,
      lowStockThreshold: itemData.lowStockThreshold !== undefined ? Number(itemData.lowStockThreshold) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.db.items.push(newItem);

    // Record Opening Stock in Movement Log
    if (openingQty !== 0) {
      this.db.stockMovementLogs.push({
        id: 'sml-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: newItem.id,
        itemName: newItem.name,
        itemCategory: newItem.category,
        itemUnit: newItem.unit,
        date: newItem.openingStockDate,
        type: 'Opening Stock',
        quantityChange: openingQty,
        resultingBalance: openingQty,
        referenceNote: 'Initial Opening Balance',
        createdAt: now,
      });
    }

    this.saveDatabase();
    return { success: true, item: newItem };
  }

  public updateItem(
    id: string,
    updates: {
      name?: string;
      category?: ItemCategory;
      unit?: ItemUnit;
      purchaseRate?: number;
      saleRate?: number;
      openingStockQty?: number;
      openingStockDate?: string;
      lowStockThreshold?: number;
    }
  ): { success: boolean; item?: Item; error?: string } {
    const item = this.db.items.find((i) => i.id === id);
    if (!item) return { success: false, error: 'Item not found' };

    if (updates.name && updates.name.trim().toLowerCase() !== item.name.toLowerCase()) {
      const exists = this.db.items.some(
        (i) => i.id !== id && i.name.toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (exists) {
        return { success: false, error: `Item with name "${updates.name}" already exists.` };
      }
      item.name = updates.name.trim();
    }

    if (updates.category) item.category = updates.category;
    if (updates.unit) item.unit = updates.unit;
    if (updates.purchaseRate !== undefined) item.purchaseRate = Number(updates.purchaseRate) || 0;
    if (updates.saleRate !== undefined) item.saleRate = Number(updates.saleRate) || 0;
    if (updates.lowStockThreshold !== undefined) {
      item.lowStockThreshold = updates.lowStockThreshold ? Number(updates.lowStockThreshold) : undefined;
    }

    // If opening stock quantity changed, recalculate the stock movement log for this item
    if (updates.openingStockQty !== undefined && Number(updates.openingStockQty) !== item.openingStockQty) {
      const newOpening = Number(updates.openingStockQty) || 0;
      item.openingStockQty = newOpening;
      if (updates.openingStockDate) item.openingStockDate = updates.openingStockDate;

      // Update or create opening stock log
      const existingOpenLog = this.db.stockMovementLogs.find(
        (l) => l.itemId === id && l.type === 'Opening Stock'
      );
      if (existingOpenLog) {
        existingOpenLog.quantityChange = newOpening;
        existingOpenLog.date = item.openingStockDate;
      } else if (newOpening !== 0) {
        this.db.stockMovementLogs.unshift({
          id: 'sml-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          itemId: item.id,
          itemName: item.name,
          itemCategory: item.category,
          itemUnit: item.unit,
          date: item.openingStockDate,
          type: 'Opening Stock',
          quantityChange: newOpening,
          resultingBalance: newOpening,
          referenceNote: 'Initial Opening Balance',
          createdAt: new Date().toISOString(),
        });
      }

      this.recalculateItemStock(id);
    }

    item.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return { success: true, item };
  }

  public deleteItem(id: string): { success: boolean; error?: string } {
    const item = this.db.items.find((i) => i.id === id);
    if (!item) return { success: false, error: 'Item not found' };

    // Check if item has any transactional movements beyond opening stock
    const transactionMovements = this.db.stockMovementLogs.filter(
      (m) => m.itemId === id && m.type !== 'Opening Stock'
    );

    if (transactionMovements.length > 0) {
      return {
        success: false,
        error: `Cannot delete "${item.name}" because it has ${transactionMovements.length} transaction record(s) (purchases, production, or sales). To keep the ledger auditable, items with history cannot be deleted.`,
      };
    }

    // Check if used in any BOM
    const usedInBom = this.db.boms.some(
      (b) => b.finishedProductId === id || b.ingredients.some((ing) => ing.itemId === id)
    );
    if (usedInBom) {
      return {
        success: false,
        error: `Cannot delete "${item.name}" because it is part of a Bill of Materials (BOM) recipe. Remove it from the BOM recipe first.`,
      };
    }

    // Remove opening stock logs if any
    this.db.stockMovementLogs = this.db.stockMovementLogs.filter((m) => m.itemId !== id);
    this.db.items = this.db.items.filter((i) => i.id !== id);
    this.saveDatabase();
    return { success: true };
  }

  public getStockMovementsForItem(itemId: string): StockMovementLog[] {
    return this.db.stockMovementLogs
      .filter((m) => m.itemId === itemId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  private recalculateItemStock(itemId: string) {
    const item = this.db.items.find((i) => i.id === itemId);
    if (!item) return;

    const logs = this.db.stockMovementLogs
      .filter((m) => m.itemId === itemId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let running = 0;
    for (const log of logs) {
      running += log.quantityChange;
      log.resultingBalance = running;
    }
    item.currentStockQty = running;
  }

  // --- BOM (Bill of Materials) ---
  public getBOMs(): BOM[] {
    return this.db.boms.map((b) => {
      const finished = this.db.items.find((i) => i.id === b.finishedProductId);
      return {
        ...b,
        finishedProductName: finished?.name || 'Unknown Product',
        ingredients: b.ingredients.map((ing) => {
          const item = this.db.items.find((i) => i.id === ing.itemId);
          return {
            ...ing,
            itemName: item?.name || 'Unknown Item',
            unit: item?.unit || 'Kg',
          };
        }),
      };
    });
  }

  public getBOMByFinishedProductId(finishedProductId: string): BOM | undefined {
    const bom = this.db.boms.find((b) => b.finishedProductId === finishedProductId);
    if (!bom) return undefined;
    const finished = this.db.items.find((i) => i.id === bom.finishedProductId);
    return {
      ...bom,
      finishedProductName: finished?.name || 'Unknown Product',
      ingredients: bom.ingredients.map((ing) => {
        const item = this.db.items.find((i) => i.id === ing.itemId);
        return {
          ...ing,
          itemName: item?.name || 'Unknown Item',
          unit: item?.unit || 'Kg',
        };
      }),
    };
  }

  public saveBOM(data: {
    finishedProductId: string;
    outputQty: number;
    ingredients: { itemId: string; defaultQty: number }[];
  }): { success: boolean; bom?: BOM; error?: string } {
    const finished = this.db.items.find(
      (i) => i.id === data.finishedProductId && i.category === 'Finished Product'
    );
    if (!finished) return { success: false, error: 'Valid Finished Product required' };

    const outputQty = Number(data.outputQty) || 1;
    if (outputQty <= 0) return { success: false, error: 'Output quantity must be greater than 0' };

    const validIngredients = data.ingredients.filter(
      (ing) => ing.itemId && Number(ing.defaultQty) > 0
    );

    const now = new Date().toISOString();
    let bom = this.db.boms.find((b) => b.finishedProductId === data.finishedProductId);

    if (bom) {
      bom.outputQty = outputQty;
      bom.ingredients = validIngredients.map((ing) => ({
        itemId: ing.itemId,
        defaultQty: Number(ing.defaultQty),
      }));
      bom.updatedAt = now;
    } else {
      bom = {
        id: 'bom-' + Date.now(),
        finishedProductId: data.finishedProductId,
        outputQty,
        ingredients: validIngredients.map((ing) => ({
          itemId: ing.itemId,
          defaultQty: Number(ing.defaultQty),
        })),
        createdAt: now,
        updatedAt: now,
      };
      this.db.boms.push(bom);
    }

    this.saveDatabase();
    return { success: true, bom };
  }

  public deleteBOM(id: string): { success: boolean; error?: string } {
    this.db.boms = this.db.boms.filter((b) => b.id !== id);
    this.saveDatabase();
    return { success: true };
  }

  // --- Suppliers ---
  public getSuppliers(): Supplier[] {
    return this.db.suppliers;
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.db.suppliers.find((s) => s.id === id);
  }

  public addSupplier(data: {
    name: string;
    contactNumber?: string;
    address?: string;
    openingBalance?: number;
    openingBalanceDate?: string;
  }): { success: boolean; supplier?: Supplier; error?: string } {
    const trimmed = data.name.trim();
    if (!trimmed) return { success: false, error: 'Supplier name is required' };

    const exists = this.db.suppliers.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return { success: false, error: `Supplier "${trimmed}" already exists` };

    const now = new Date().toISOString();
    const openingBal = Number(data.openingBalance) || 0;
    const openingDate = data.openingBalanceDate || now.split('T')[0];

    const supplier: Supplier = {
      id: 'sup-' + Date.now(),
      name: trimmed,
      contactNumber: data.contactNumber?.trim(),
      address: data.address?.trim(),
      openingBalance: openingBal,
      openingBalanceDate: openingDate,
      currentBalance: openingBal,
      createdAt: now,
      updatedAt: now,
    };

    this.db.suppliers.push(supplier);

    if (openingBal !== 0) {
      this.db.supplierLedgerEntries.push({
        id: 'sle-' + Date.now(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: openingDate,
        type: 'Opening Balance',
        referenceNote: 'Initial Balance',
        debit: openingBal < 0 ? Math.abs(openingBal) : 0, // we paid in advance
        credit: openingBal > 0 ? openingBal : 0, // we owe them
        runningBalance: openingBal,
        createdAt: now,
      });
    }

    this.saveDatabase();
    return { success: true, supplier };
  }

  public updateSupplier(
    id: string,
    updates: {
      name?: string;
      contactNumber?: string;
      address?: string;
      openingBalance?: number;
      openingBalanceDate?: string;
    }
  ): { success: boolean; supplier?: Supplier; error?: string } {
    const supplier = this.db.suppliers.find((s) => s.id === id);
    if (!supplier) return { success: false, error: 'Supplier not found' };

    if (updates.name && updates.name.trim().toLowerCase() !== supplier.name.toLowerCase()) {
      const exists = this.db.suppliers.some(
        (s) => s.id !== id && s.name.toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (exists) return { success: false, error: `Supplier with name "${updates.name}" already exists` };
      supplier.name = updates.name.trim();
    }

    if (updates.contactNumber !== undefined) supplier.contactNumber = updates.contactNumber.trim();
    if (updates.address !== undefined) supplier.address = updates.address.trim();

    if (updates.openingBalance !== undefined && Number(updates.openingBalance) !== supplier.openingBalance) {
      const newBal = Number(updates.openingBalance) || 0;
      supplier.openingBalance = newBal;
      if (updates.openingBalanceDate) supplier.openingBalanceDate = updates.openingBalanceDate;

      const openEntry = this.db.supplierLedgerEntries.find(
        (e) => e.supplierId === id && e.type === 'Opening Balance'
      );
      if (openEntry) {
        openEntry.credit = newBal > 0 ? newBal : 0;
        openEntry.debit = newBal < 0 ? Math.abs(newBal) : 0;
        openEntry.date = supplier.openingBalanceDate;
      } else if (newBal !== 0) {
        this.db.supplierLedgerEntries.unshift({
          id: 'sle-' + Date.now(),
          supplierId: supplier.id,
          supplierName: supplier.name,
          date: supplier.openingBalanceDate,
          type: 'Opening Balance',
          referenceNote: 'Initial Balance',
          debit: newBal < 0 ? Math.abs(newBal) : 0,
          credit: newBal > 0 ? newBal : 0,
          runningBalance: newBal,
          createdAt: new Date().toISOString(),
        });
      }
      this.recalculateSupplierBalance(id);
    }

    supplier.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return { success: true, supplier };
  }

  public deleteSupplier(id: string): { success: boolean; error?: string } {
    const sup = this.db.suppliers.find((s) => s.id === id);
    if (!sup) return { success: false, error: 'Supplier not found' };

    const hasPurchases = this.db.purchases.some((p) => p.supplierId === id);
    const hasTransactions = this.db.supplierLedgerEntries.some(
      (e) => e.supplierId === id && e.type !== 'Opening Balance'
    );

    if (hasPurchases || hasTransactions) {
      return {
        success: false,
        error: `Cannot delete supplier "${sup.name}" because they have existing transaction records.`,
      };
    }

    this.db.supplierLedgerEntries = this.db.supplierLedgerEntries.filter((e) => e.supplierId !== id);
    this.db.suppliers = this.db.suppliers.filter((s) => s.id !== id);
    this.saveDatabase();
    return { success: true };
  }

  public getSupplierLedger(supplierId: string, startDate?: string, endDate?: string): SupplierLedgerEntry[] {
    let entries = this.db.supplierLedgerEntries
      .filter((e) => e.supplierId === supplierId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (startDate) {
      entries = entries.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      entries = entries.filter((e) => e.date <= endDate);
    }
    return entries;
  }

  private recalculateSupplierBalance(supplierId: string) {
    const supplier = this.db.suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    const entries = this.db.supplierLedgerEntries
      .filter((e) => e.supplierId === supplierId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let running = 0;
    for (const e of entries) {
      running += (e.credit - e.debit); // Credit increases liability (we owe them), Debit decreases liability (we paid)
      e.runningBalance = running;
    }
    supplier.currentBalance = running;
  }

  public recordSupplierPayment(data: {
    supplierId: string;
    amount: number;
    date: string;
    paidFrom: 'Cash' | 'Bank';
    note?: string;
  }): { success: boolean; error?: string } {
    const supplier = this.db.suppliers.find((s) => s.id === data.supplierId);
    if (!supplier) return { success: false, error: 'Supplier not found' };

    const amount = Number(data.amount);
    if (amount <= 0) return { success: false, error: 'Payment amount must be greater than zero' };

    const now = new Date().toISOString();
    const paymentDate = data.date || now.split('T')[0];

    // 1. Supplier ledger entry (Debit = we paid them)
    const newBal = supplier.currentBalance - amount;
    this.db.supplierLedgerEntries.push({
      id: 'sle-' + Date.now(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: paymentDate,
      type: 'Payment Made',
      referenceNote: data.note || `Paid via ${data.paidFrom}`,
      debit: amount,
      credit: 0,
      runningBalance: newBal,
      createdAt: now,
    });
    supplier.currentBalance = newBal;
    supplier.updatedAt = now;

    // 2. Post to Cash/Bank ledger
    this.postCashBankTransaction({
      date: paymentDate,
      account: data.paidFrom,
      type: 'Supplier Payment',
      amountIn: 0,
      amountOut: amount,
      referenceId: supplier.id,
      referenceNote: `Payment to Supplier: ${supplier.name}. ${data.note || ''}`.trim(),
    });

    this.saveDatabase();
    return { success: true };
  }

  // --- Purchases (Raw Materials & Packing Materials) ---
  public getPurchases(startDate?: string, endDate?: string, supplierId?: string): PurchaseEntry[] {
    let list = [...this.db.purchases].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (startDate) list = list.filter((p) => p.date >= startDate);
    if (endDate) list = list.filter((p) => p.date <= endDate);
    if (supplierId) list = list.filter((p) => p.supplierId === supplierId);
    return list;
  }

  public recordPurchase(data: {
    supplierId: string;
    date: string;
    items: { itemId: string; quantity: number; rate: number }[];
    amountPaidNow?: number;
    paymentMethod?: 'Cash' | 'Bank';
    note?: string;
  }): { success: boolean; purchase?: PurchaseEntry; error?: string } {
    const supplier = this.db.suppliers.find((s) => s.id === data.supplierId);
    if (!supplier) return { success: false, error: 'Supplier required' };

    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'At least one item line is required for purchase' };
    }

    const now = new Date().toISOString();
    const purchaseDate = data.date || now.split('T')[0];
    const billNumber = 'PUR-' + (this.db.purchases.length + 1).toString().padStart(4, '0');

    let billTotal = 0;
    const processedItems: PurchaseItemLine[] = [];

    for (const line of data.items) {
      const item = this.db.items.find((i) => i.id === line.itemId);
      if (!item) return { success: false, error: `Invalid item specified in purchase` };
      if (item.category === 'Finished Product') {
        return {
          success: false,
          error: `Item "${item.name}" is a Finished Product. Purchases are only for Raw Materials and Packing Materials.`,
        };
      }
      const qty = Number(line.quantity) || 0;
      const rate = Number(line.rate) || 0;
      if (qty <= 0) return { success: false, error: `Quantity must be greater than 0 for item ${item.name}` };
      if (rate < 0) return { success: false, error: `Rate cannot be negative for item ${item.name}` };

      const lineTotal = qty * rate;
      billTotal += lineTotal;
      processedItems.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        quantity: qty,
        rate: rate,
        lineTotal,
      });

      // Update item's purchase rate if provided
      item.purchaseRate = rate;

      // Update Item Current Stock
      item.currentStockQty += qty;
      item.updatedAt = now;

      // Log Stock Movement
      this.db.stockMovementLogs.push({
        id: 'sml-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        itemUnit: item.unit,
        date: purchaseDate,
        type: 'Purchase',
        quantityChange: qty,
        resultingBalance: item.currentStockQty,
        referenceId: billNumber,
        referenceNote: `Purchase from ${supplier.name} (Bill #${billNumber})`,
        createdAt: now,
      });
    }

    const amountPaid = Number(data.amountPaidNow) || 0;
    const balanceDue = billTotal - amountPaid;
    const paymentMethod = data.paymentMethod || 'Cash';

    const purchase: PurchaseEntry = {
      id: 'pur-' + Date.now(),
      billNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: purchaseDate,
      items: processedItems,
      billTotal,
      amountPaidNow: amountPaid,
      paymentMethod,
      balanceDue,
      note: data.note,
      createdAt: now,
    };
    this.db.purchases.push(purchase);

    // Supplier Ledger - Purchase increases what we owe (Credit)
    const balAfterBill = supplier.currentBalance + billTotal;
    this.db.supplierLedgerEntries.push({
      id: 'sle-' + Date.now() + '-1',
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: purchaseDate,
      type: 'Purchase',
      referenceId: billNumber,
      referenceNote: `Purchase Bill #${billNumber}`,
      debit: 0,
      credit: billTotal,
      runningBalance: balAfterBill,
      createdAt: now,
    });

    let finalBal = balAfterBill;
    if (amountPaid > 0) {
      // Immediate payment recorded
      finalBal = balAfterBill - amountPaid;
      this.db.supplierLedgerEntries.push({
        id: 'sle-' + Date.now() + '-2',
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: purchaseDate,
        type: 'Payment Made',
        referenceId: billNumber,
        referenceNote: `Paid on Bill #${billNumber} via ${paymentMethod}`,
        debit: amountPaid,
        credit: 0,
        runningBalance: finalBal,
        createdAt: now,
      });

      // Cash/Bank deduction
      this.postCashBankTransaction({
        date: purchaseDate,
        account: paymentMethod,
        type: 'Purchase Payment',
        amountIn: 0,
        amountOut: amountPaid,
        referenceId: billNumber,
        referenceNote: `Purchase Bill #${billNumber} (${supplier.name})`,
      });
    }

    supplier.currentBalance = finalBal;
    supplier.updatedAt = now;

    this.saveDatabase();
    return { success: true, purchase };
  }

  // --- Production Entries ---
  public getProductionBatches(startDate?: string, endDate?: string, finishedProductId?: string): ProductionBatch[] {
    let list = [...this.db.productionBatches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (startDate) list = list.filter((b) => b.date >= startDate);
    if (endDate) list = list.filter((b) => b.date <= endDate);
    if (finishedProductId) list = list.filter((b) => b.finishedProductId === finishedProductId);
    return list;
  }

  public getProductionBatchById(id: string): ProductionBatch | undefined {
    return this.db.productionBatches.find((b) => b.id === id);
  }

  public recordProduction(data: {
    date: string;
    finishedProductId: string;
    quantityProduced: number;
    ingredients: { itemId: string; quantityConsumed: number; purchaseRate?: number }[];
    batchNote?: string;
    adminOverrideStock?: boolean;
  }): { success: boolean; batch?: ProductionBatch; error?: string } {
    const finishedProduct = this.db.items.find(
      (i) => i.id === data.finishedProductId && i.category === 'Finished Product'
    );
    if (!finishedProduct) return { success: false, error: 'Valid Finished Product is required' };

    const qtyProduced = Number(data.quantityProduced) || 0;
    if (qtyProduced <= 0) return { success: false, error: 'Quantity Produced must be greater than zero' };

    if (!data.ingredients || data.ingredients.length === 0) {
      return { success: false, error: 'At least one ingredient is required for production' };
    }

    // 1. Stock check: Ensure sufficient stock for each ingredient unless override
    const allowOverride = data.adminOverrideStock || this.db.settings.allowNegativeStockOverride;
    for (const ing of data.ingredients) {
      const item = this.db.items.find((i) => i.id === ing.itemId);
      if (!item) return { success: false, error: 'Invalid ingredient item specified' };

      const qty = Number(ing.quantityConsumed) || 0;
      if (qty <= 0) {
        return { success: false, error: `Quantity consumed for ${item.name} must be greater than 0` };
      }

      if (item.currentStockQty < qty && !allowOverride) {
        return {
          success: false,
          error: `Insufficient stock for "${item.name}". Required: ${qty} ${item.unit}, Available: ${item.currentStockQty} ${item.unit}. (Admin override required to continue with negative stock).`,
        };
      }
    }

    const now = new Date().toISOString();
    const prodDate = data.date || now.split('T')[0];
    const batchNumber = 'BATCH-' + (this.db.productionBatches.length + 1).toString().padStart(4, '0');

    let totalProductionCost = 0;
    const processedIngredients: ProductionIngredientLine[] = [];

    // 2. Deduct ingredient stock & log consumption
    for (const ing of data.ingredients) {
      const item = this.db.items.find((i) => i.id === ing.itemId)!;
      const consumed = Number(ing.quantityConsumed) || 0;
      const rate = ing.purchaseRate !== undefined ? Number(ing.purchaseRate) : item.purchaseRate;
      const lineCost = consumed * rate;
      totalProductionCost += lineCost;

      processedIngredients.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        quantityConsumed: consumed,
        purchaseRate: rate,
        lineCost,
      });

      item.currentStockQty -= consumed;
      item.updatedAt = now;

      this.db.stockMovementLogs.push({
        id: 'sml-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        itemUnit: item.unit,
        date: prodDate,
        type: 'Consumption Out',
        quantityChange: -consumed,
        resultingBalance: item.currentStockQty,
        referenceId: batchNumber,
        referenceNote: `Consumed for Batch #${batchNumber} (${finishedProduct.name} ${qtyProduced} ${finishedProduct.unit})`,
        createdAt: now,
      });
    }

    // 3. Add produced quantity to Finished Product stock & log production
    finishedProduct.currentStockQty += qtyProduced;
    finishedProduct.updatedAt = now;

    const costPerUnit = qtyProduced > 0 ? totalProductionCost / qtyProduced : 0;

    this.db.stockMovementLogs.push({
      id: 'sml-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      itemId: finishedProduct.id,
      itemName: finishedProduct.name,
      itemCategory: finishedProduct.category,
      itemUnit: finishedProduct.unit,
      date: prodDate,
      type: 'Production In',
      quantityChange: qtyProduced,
      resultingBalance: finishedProduct.currentStockQty,
      referenceId: batchNumber,
      referenceNote: `Produced in Batch #${batchNumber} (Cost: Rs. ${costPerUnit.toFixed(2)}/${finishedProduct.unit})`,
      createdAt: now,
    });

    const batch: ProductionBatch = {
      id: 'batch-' + Date.now(),
      batchNumber,
      date: prodDate,
      finishedProductId: finishedProduct.id,
      finishedProductName: finishedProduct.name,
      finishedProductUnit: finishedProduct.unit,
      quantityProduced: qtyProduced,
      ingredients: processedIngredients,
      batchProductionCost: totalProductionCost,
      costPerUnit,
      batchNote: data.batchNote,
      createdAt: now,
    };

    this.db.productionBatches.push(batch);
    this.saveDatabase();
    return { success: true, batch };
  }

  // Helper to find latest cost per unit for a finished product
  public getLatestCostPerUnit(finishedProductId: string): number {
    const batches = this.db.productionBatches
      .filter((b) => b.finishedProductId === finishedProductId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (batches.length > 0 && batches[0].costPerUnit > 0) {
      return batches[0].costPerUnit;
    }

    // Fallback: estimate from BOM if exists
    const bom = this.db.boms.find((b) => b.finishedProductId === finishedProductId);
    if (bom && bom.outputQty > 0) {
      let cost = 0;
      for (const ing of bom.ingredients) {
        const item = this.db.items.find((i) => i.id === ing.itemId);
        if (item) cost += ing.defaultQty * item.purchaseRate;
      }
      return cost / bom.outputQty;
    }

    return 0;
  }

  // --- Customers & Dealers ---
  public getCustomers(): Customer[] {
    return this.db.customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.db.customers.find((c) => c.id === id);
  }

  public addCustomer(data: {
    name: string;
    contactNumber?: string;
    address?: string;
    openingBalance?: number;
    openingBalanceDate?: string;
  }): { success: boolean; customer?: Customer; error?: string } {
    const trimmed = data.name.trim();
    if (!trimmed) return { success: false, error: 'Customer name is required' };

    const exists = this.db.customers.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return { success: false, error: `Customer "${trimmed}" already exists` };

    const now = new Date().toISOString();
    const openingBal = Number(data.openingBalance) || 0;
    const openingDate = data.openingBalanceDate || now.split('T')[0];

    const customer: Customer = {
      id: 'cust-' + Date.now(),
      name: trimmed,
      contactNumber: data.contactNumber?.trim(),
      address: data.address?.trim(),
      openingBalance: openingBal,
      openingBalanceDate: openingDate,
      currentBalance: openingBal,
      createdAt: now,
      updatedAt: now,
    };

    this.db.customers.push(customer);

    if (openingBal !== 0) {
      this.db.customerLedgerEntries.push({
        id: 'cle-' + Date.now(),
        customerId: customer.id,
        customerName: customer.name,
        date: openingDate,
        type: 'Opening Balance',
        referenceNote: 'Initial Balance',
        debit: openingBal > 0 ? openingBal : 0, // They owe us (receivable)
        credit: openingBal < 0 ? Math.abs(openingBal) : 0, // Advance received
        runningBalance: openingBal,
        createdAt: now,
      });
    }

    this.saveDatabase();
    return { success: true, customer };
  }

  public updateCustomer(
    id: string,
    updates: {
      name?: string;
      contactNumber?: string;
      address?: string;
      openingBalance?: number;
      openingBalanceDate?: string;
    }
  ): { success: boolean; customer?: Customer; error?: string } {
    const customer = this.db.customers.find((c) => c.id === id);
    if (!customer) return { success: false, error: 'Customer not found' };

    if (updates.name && updates.name.trim().toLowerCase() !== customer.name.toLowerCase()) {
      const exists = this.db.customers.some(
        (c) => c.id !== id && c.name.toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (exists) return { success: false, error: `Customer "${updates.name}" already exists` };
      customer.name = updates.name.trim();
    }

    if (updates.contactNumber !== undefined) customer.contactNumber = updates.contactNumber.trim();
    if (updates.address !== undefined) customer.address = updates.address.trim();

    if (updates.openingBalance !== undefined && Number(updates.openingBalance) !== customer.openingBalance) {
      const newBal = Number(updates.openingBalance) || 0;
      customer.openingBalance = newBal;
      if (updates.openingBalanceDate) customer.openingBalanceDate = updates.openingBalanceDate;

      const openEntry = this.db.customerLedgerEntries.find(
        (e) => e.customerId === id && e.type === 'Opening Balance'
      );
      if (openEntry) {
        openEntry.debit = newBal > 0 ? newBal : 0;
        openEntry.credit = newBal < 0 ? Math.abs(newBal) : 0;
        openEntry.date = customer.openingBalanceDate;
      } else if (newBal !== 0) {
        this.db.customerLedgerEntries.unshift({
          id: 'cle-' + Date.now(),
          customerId: customer.id,
          customerName: customer.name,
          date: customer.openingBalanceDate,
          type: 'Opening Balance',
          referenceNote: 'Initial Balance',
          debit: newBal > 0 ? newBal : 0,
          credit: newBal < 0 ? Math.abs(newBal) : 0,
          runningBalance: newBal,
          createdAt: new Date().toISOString(),
        });
      }
      this.recalculateCustomerBalance(id);
    }

    customer.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return { success: true, customer };
  }

  public deleteCustomer(id: string): { success: boolean; error?: string } {
    const cust = this.db.customers.find((c) => c.id === id);
    if (!cust) return { success: false, error: 'Customer not found' };

    const hasSales = this.db.sales.some((s) => s.customerId === id);
    const hasTransactions = this.db.customerLedgerEntries.some(
      (e) => e.customerId === id && e.type !== 'Opening Balance'
    );

    if (hasSales || hasTransactions) {
      return {
        success: false,
        error: `Cannot delete customer "${cust.name}" because they have existing invoice or payment records.`,
      };
    }

    this.db.customerLedgerEntries = this.db.customerLedgerEntries.filter((e) => e.customerId !== id);
    this.db.customers = this.db.customers.filter((c) => c.id !== id);
    this.saveDatabase();
    return { success: true };
  }

  public getCustomerLedger(customerId: string, startDate?: string, endDate?: string): CustomerLedgerEntry[] {
    let entries = this.db.customerLedgerEntries
      .filter((e) => e.customerId === customerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (startDate) entries = entries.filter((e) => e.date >= startDate);
    if (endDate) entries = entries.filter((e) => e.date <= endDate);
    return entries;
  }

  private recalculateCustomerBalance(customerId: string) {
    const customer = this.db.customers.find((c) => c.id === customerId);
    if (!customer) return;

    const entries = this.db.customerLedgerEntries
      .filter((e) => e.customerId === customerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let running = 0;
    for (const e of entries) {
      running += (e.debit - e.credit); // Debit increases receivable, Credit decreases receivable
      e.runningBalance = running;
    }
    customer.currentBalance = running;
  }

  public recordCustomerPayment(data: {
    customerId: string;
    amount: number;
    date: string;
    depositedTo: 'Cash' | 'Bank';
    note?: string;
  }): { success: boolean; error?: string } {
    const customer = this.db.customers.find((c) => c.id === data.customerId);
    if (!customer) return { success: false, error: 'Customer not found' };

    const amount = Number(data.amount);
    if (amount <= 0) return { success: false, error: 'Payment amount must be greater than zero' };

    const now = new Date().toISOString();
    const paymentDate = data.date || now.split('T')[0];

    // 1. Customer ledger entry (Credit = customer paid us)
    const newBal = customer.currentBalance - amount;
    this.db.customerLedgerEntries.push({
      id: 'cle-' + Date.now(),
      customerId: customer.id,
      customerName: customer.name,
      date: paymentDate,
      type: 'Payment Received',
      referenceNote: data.note || `Received via ${data.depositedTo}`,
      debit: 0,
      credit: amount,
      runningBalance: newBal,
      createdAt: now,
    });
    customer.currentBalance = newBal;
    customer.updatedAt = now;

    // 2. Post to Cash/Bank ledger
    this.postCashBankTransaction({
      date: paymentDate,
      account: data.depositedTo,
      type: 'Customer Payment',
      amountIn: amount,
      amountOut: 0,
      referenceId: customer.id,
      referenceNote: `Payment from Customer: ${customer.name}. ${data.note || ''}`.trim(),
    });

    this.saveDatabase();
    return { success: true };
  }

  // --- Sales & Invoicing ---
  public getSales(startDate?: string, endDate?: string, customerId?: string, itemId?: string): SaleInvoice[] {
    let list = [...this.db.sales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (startDate) list = list.filter((s) => s.date >= startDate);
    if (endDate) list = list.filter((s) => s.date <= endDate);
    if (customerId) list = list.filter((s) => s.customerId === customerId);
    if (itemId) list = list.filter((s) => s.items.some((i) => i.itemId === itemId));
    return list;
  }

  public getSaleById(id: string): SaleInvoice | undefined {
    return this.db.sales.find((s) => s.id === id);
  }

  public recordSale(data: {
    customerId: string;
    date: string;
    items: { itemId: string; quantity: number; saleRate: number }[];
    amountReceivedNow?: number;
    paymentMethod?: 'Cash' | 'Bank';
    note?: string;
    adminOverrideStock?: boolean;
  }): { success: boolean; sale?: SaleInvoice; error?: string } {
    const customer = this.db.customers.find((c) => c.id === data.customerId);
    if (!customer) return { success: false, error: 'Customer is required' };

    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'At least one item line is required for sale' };
    }

    const allowOverride = data.adminOverrideStock || this.db.settings.allowNegativeStockOverride;

    // Validate finished product items & stock
    for (const line of data.items) {
      const item = this.db.items.find((i) => i.id === line.itemId);
      if (!item) return { success: false, error: 'Invalid item in sale' };
      if (item.category !== 'Finished Product') {
        return {
          success: false,
          error: `Item "${item.name}" is not a Finished Product. Sales can only be made for Finished Products.`,
        };
      }
      const qty = Number(line.quantity) || 0;
      if (qty <= 0) return { success: false, error: `Quantity must be greater than zero for ${item.name}` };

      if (item.currentStockQty < qty && !allowOverride) {
        return {
          success: false,
          error: `Insufficient stock for "${item.name}". In Stock: ${item.currentStockQty} ${item.unit}, Selling: ${qty} ${item.unit}. (Admin override required to continue with negative stock).`,
        };
      }
    }

    const now = new Date().toISOString();
    const saleDate = data.date || now.split('T')[0];
    const invoiceNumber = 'INV-' + (this.db.sales.length + 1).toString().padStart(4, '0');

    let invoiceTotal = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const processedLines = [];

    for (const line of data.items) {
      const item = this.db.items.find((i) => i.id === line.itemId)!;
      const qty = Number(line.quantity) || 0;
      const rate = Number(line.saleRate) !== undefined ? Number(line.saleRate) : item.saleRate;
      const lineTotal = qty * rate;
      const costPerUnit = this.getLatestCostPerUnit(item.id);
      const lineCost = qty * costPerUnit;
      const profit = lineTotal - lineCost;

      invoiceTotal += lineTotal;
      totalCost += lineCost;
      totalProfit += profit;

      processedLines.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        quantity: qty,
        saleRate: rate,
        lineTotal,
        costPerUnit,
        profit,
      });

      // Deduct sold quantity from Finished Product
      item.currentStockQty -= qty;
      item.updatedAt = now;

      // Log Stock Movement
      this.db.stockMovementLogs.push({
        id: 'sml-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        itemUnit: item.unit,
        date: saleDate,
        type: 'Sale Out',
        quantityChange: -qty,
        resultingBalance: item.currentStockQty,
        referenceId: invoiceNumber,
        referenceNote: `Sale to ${customer.name} (Invoice #${invoiceNumber})`,
        createdAt: now,
      });
    }

    const amountReceived = Number(data.amountReceivedNow) || 0;
    const balanceDue = invoiceTotal - amountReceived;
    const paymentMethod = data.paymentMethod || 'Cash';

    const sale: SaleInvoice = {
      id: 'sale-' + Date.now(),
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      date: saleDate,
      items: processedLines,
      invoiceTotal,
      amountReceivedNow: amountReceived,
      paymentMethod,
      balanceDue,
      totalCost,
      totalProfit,
      note: data.note,
      createdAt: now,
    };
    this.db.sales.push(sale);

    // Customer Ledger: Invoice increases receivable (Debit)
    const balAfterInvoice = customer.currentBalance + invoiceTotal;
    this.db.customerLedgerEntries.push({
      id: 'cle-' + Date.now() + '-1',
      customerId: customer.id,
      customerName: customer.name,
      date: saleDate,
      type: 'Sale',
      referenceId: invoiceNumber,
      referenceNote: `Invoice #${invoiceNumber}`,
      debit: invoiceTotal,
      credit: 0,
      runningBalance: balAfterInvoice,
      createdAt: now,
    });

    let finalCustomerBal = balAfterInvoice;
    if (amountReceived > 0) {
      finalCustomerBal = balAfterInvoice - amountReceived;
      this.db.customerLedgerEntries.push({
        id: 'cle-' + Date.now() + '-2',
        customerId: customer.id,
        customerName: customer.name,
        date: saleDate,
        type: 'Payment Received',
        referenceId: invoiceNumber,
        referenceNote: `Received on Invoice #${invoiceNumber} via ${paymentMethod}`,
        debit: 0,
        credit: amountReceived,
        runningBalance: finalCustomerBal,
        createdAt: now,
      });

      // Post to Cash/Bank
      this.postCashBankTransaction({
        date: saleDate,
        account: paymentMethod,
        type: 'Sale Receipt',
        amountIn: amountReceived,
        amountOut: 0,
        referenceId: invoiceNumber,
        referenceNote: `Sale Invoice #${invoiceNumber} (${customer.name})`,
      });
    }

    customer.currentBalance = finalCustomerBal;
    customer.updatedAt = now;

    this.saveDatabase();
    return { success: true, sale };
  }

  // --- Expenses ---
  public getExpenses(startDate?: string, endDate?: string, category?: string): Expense[] {
    let list = [...this.db.expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (startDate) list = list.filter((e) => e.date >= startDate);
    if (endDate) list = list.filter((e) => e.date <= endDate);
    if (category) list = list.filter((e) => e.category === category);
    return list;
  }

  public recordExpense(data: {
    date: string;
    category: string;
    amount: number;
    note?: string;
    paidFrom: 'Cash' | 'Bank';
  }): { success: boolean; expense?: Expense; error?: string } {
    const amount = Number(data.amount) || 0;
    if (amount <= 0) return { success: false, error: 'Expense amount must be greater than zero' };

    const category = data.category.trim();
    if (!category) return { success: false, error: 'Expense category is required' };

    const now = new Date().toISOString();
    const expDate = data.date || now.split('T')[0];

    const expense: Expense = {
      id: 'exp-' + Date.now(),
      date: expDate,
      category,
      amount,
      note: data.note,
      paidFrom: data.paidFrom,
      createdAt: now,
    };
    this.db.expenses.push(expense);

    // Deduct from Cash/Bank
    this.postCashBankTransaction({
      date: expDate,
      account: data.paidFrom,
      type: 'Expense',
      amountIn: 0,
      amountOut: amount,
      referenceId: expense.id,
      referenceNote: `Expense: ${category}. ${data.note || ''}`.trim(),
    });

    this.saveDatabase();
    return { success: true, expense };
  }

  public deleteExpense(id: string): { success: boolean; error?: string } {
    const expense = this.db.expenses.find((e) => e.id === id);
    if (!expense) return { success: false, error: 'Expense not found' };

    // Remove corresponding cash bank entry
    this.db.cashBankLedgerEntries = this.db.cashBankLedgerEntries.filter(
      (c) => !(c.type === 'Expense' && c.referenceId === id)
    );
    this.db.expenses = this.db.expenses.filter((e) => e.id !== id);
    this.recalculateCashBankBalances();
    this.saveDatabase();
    return { success: true };
  }

  // --- Cash & Bank Management ---
  public getCashBankBalances(): { cashBalance: number; bankBalance: number; combinedTotal: number } {
    let cash = this.db.settings.cashOpeningBalance || 0;
    let bank = this.db.settings.bankOpeningBalance || 0;

    for (const entry of this.db.cashBankLedgerEntries) {
      if (entry.account === 'Cash') {
        cash += (entry.amountIn - entry.amountOut);
      } else if (entry.account === 'Bank') {
        bank += (entry.amountIn - entry.amountOut);
      }
    }

    return {
      cashBalance: cash,
      bankBalance: bank,
      combinedTotal: cash + bank,
    };
  }

  public getCashBankLedger(account?: 'Cash' | 'Bank', startDate?: string, endDate?: string): CashBankLedgerEntry[] {
    let entries = [...this.db.cashBankLedgerEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (account) entries = entries.filter((e) => e.account === account);
    if (startDate) entries = entries.filter((e) => e.date >= startDate);
    if (endDate) entries = entries.filter((e) => e.date <= endDate);

    return entries;
  }

  private postCashBankTransaction(data: {
    date: string;
    account: 'Cash' | 'Bank';
    type: CashBankLedgerEntry['type'];
    amountIn: number;
    amountOut: number;
    referenceId?: string;
    referenceNote?: string;
  }) {
    const now = new Date().toISOString();
    // Compute current running balance for that account
    let current = data.account === 'Cash' ? this.db.settings.cashOpeningBalance : this.db.settings.bankOpeningBalance;
    for (const e of this.db.cashBankLedgerEntries) {
      if (e.account === data.account) {
        current += (e.amountIn - e.amountOut);
      }
    }
    const resulting = current + (data.amountIn - data.amountOut);

    this.db.cashBankLedgerEntries.push({
      id: 'cbe-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: data.date,
      account: data.account,
      type: data.type,
      referenceId: data.referenceId,
      referenceNote: data.referenceNote,
      amountIn: data.amountIn,
      amountOut: data.amountOut,
      runningBalance: resulting,
      createdAt: now,
    });
  }

  public updateCashBankOpeningBalances(data: {
    cashOpeningBalance?: number;
    cashOpeningDate?: string;
    bankOpeningBalance?: number;
    bankOpeningDate?: string;
  }) {
    if (data.cashOpeningBalance !== undefined) {
      this.db.settings.cashOpeningBalance = Number(data.cashOpeningBalance) || 0;
    }
    if (data.cashOpeningDate) {
      this.db.settings.cashOpeningDate = data.cashOpeningDate;
    }
    if (data.bankOpeningBalance !== undefined) {
      this.db.settings.bankOpeningBalance = Number(data.bankOpeningBalance) || 0;
    }
    if (data.bankOpeningDate) {
      this.db.settings.bankOpeningDate = data.bankOpeningDate;
    }

    this.recalculateCashBankBalances();
    this.saveDatabase();
    return this.getCashBankBalances();
  }

  private recalculateCashBankBalances() {
    let cashRunning = this.db.settings.cashOpeningBalance || 0;
    let bankRunning = this.db.settings.bankOpeningBalance || 0;

    const entries = this.db.cashBankLedgerEntries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const e of entries) {
      if (e.account === 'Cash') {
        cashRunning += (e.amountIn - e.amountOut);
        e.runningBalance = cashRunning;
      } else {
        bankRunning += (e.amountIn - e.amountOut);
        e.runningBalance = bankRunning;
      }
    }
  }

  public recordCashBankAdjustment(data: {
    date: string;
    account: 'Cash' | 'Bank';
    adjustmentType: 'Deposit' | 'Withdrawal' | 'Correction' | 'Transfer';
    transferToAccount?: 'Cash' | 'Bank';
    amount: number;
    note?: string;
  }): { success: boolean; error?: string } {
    const amount = Number(data.amount) || 0;
    if (amount <= 0) return { success: false, error: 'Adjustment amount must be greater than zero' };

    const now = new Date().toISOString();
    const date = data.date || now.split('T')[0];

    if (data.adjustmentType === 'Transfer') {
      if (!data.transferToAccount || data.transferToAccount === data.account) {
        return { success: false, error: 'Destination account for transfer must be different from source account' };
      }

      this.postCashBankTransaction({
        date,
        account: data.account,
        type: 'Transfer Out',
        amountIn: 0,
        amountOut: amount,
        referenceNote: `Transfer to ${data.transferToAccount}. ${data.note || ''}`.trim(),
      });

      this.postCashBankTransaction({
        date,
        account: data.transferToAccount,
        type: 'Transfer In',
        amountIn: amount,
        amountOut: 0,
        referenceNote: `Transfer from ${data.account}. ${data.note || ''}`.trim(),
      });
    } else if (data.adjustmentType === 'Deposit') {
      this.postCashBankTransaction({
        date,
        account: data.account,
        type: 'Manual Adjustment',
        amountIn: amount,
        amountOut: 0,
        referenceNote: `Manual Deposit: ${data.note || ''}`.trim(),
      });
    } else if (data.adjustmentType === 'Withdrawal') {
      this.postCashBankTransaction({
        date,
        account: data.account,
        type: 'Manual Adjustment',
        amountIn: 0,
        amountOut: amount,
        referenceNote: `Manual Withdrawal: ${data.note || ''}`.trim(),
      });
    } else {
      // Correction
      this.postCashBankTransaction({
        date,
        account: data.account,
        type: 'Manual Adjustment',
        amountIn: amount,
        amountOut: 0,
        referenceNote: `Correction Entry: ${data.note || ''}`.trim(),
      });
    }

    this.db.cashBankAdjustments.push({
      id: 'adj-' + Date.now(),
      date,
      account: data.account,
      adjustmentType: data.adjustmentType,
      transferToAccount: data.transferToAccount,
      amount,
      note: data.note,
      createdAt: now,
    });

    this.saveDatabase();
    return { success: true };
  }

  // --- Dashboard Summary ---
  public getDashboardSummary(): DashboardSummary {
    const today = new Date().toISOString().split('T')[0];

    // Stock Summary
    let grandTotalStockValue = 0;
    let lowStockCount = 0;
    const categoryTotals: Record<ItemCategory, { count: number; totalVal: number }> = {
      'Raw Material': { count: 0, totalVal: 0 },
      'Packing Material': { count: 0, totalVal: 0 },
      'Finished Product': { count: 0, totalVal: 0 },
    };

    const itemsStockTable = this.db.items.map((item) => {
      const rate = item.category === 'Finished Product' ? item.saleRate : item.purchaseRate;
      const value = item.currentStockQty * rate;
      grandTotalStockValue += value;

      categoryTotals[item.category].count += 1;
      categoryTotals[item.category].totalVal += value;

      const isLowStock =
        item.lowStockThreshold !== undefined &&
        item.lowStockThreshold > 0 &&
        item.currentStockQty <= item.lowStockThreshold;

      if (isLowStock) lowStockCount++;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStockQty: item.currentStockQty,
        rate,
        value,
        isLowStock,
        lowStockThreshold: item.lowStockThreshold,
      };
    });

    // Today's summary
    const todayProduction = this.db.productionBatches.filter((b) => b.date === today);
    const todayProdQty = todayProduction.reduce((sum, b) => sum + b.quantityProduced, 0);
    const todayProdVal = todayProduction.reduce((sum, b) => sum + b.batchProductionCost, 0);

    const todaySales = this.db.sales.filter((s) => s.date === today);
    const todaySalesAmt = todaySales.reduce((sum, s) => sum + s.invoiceTotal, 0);

    // Receivables & Payables
    // Total amount all customers owe (sum of positive customer balances)
    const totalReceivable = this.db.customers.reduce(
      (sum, c) => (c.currentBalance > 0 ? sum + c.currentBalance : sum),
      0
    );
    // Total amount owed to all suppliers (sum of positive supplier balances)
    const totalPayable = this.db.suppliers.reduce(
      (sum, s) => (s.currentBalance > 0 ? sum + s.currentBalance : sum),
      0
    );

    // Cash/Bank
    const cashBank = this.getCashBankBalances();

    return {
      grandTotalStockValue,
      categoryStockSummary: [
        {
          category: 'Raw Material',
          itemCount: categoryTotals['Raw Material'].count,
          totalValue: categoryTotals['Raw Material'].totalVal,
        },
        {
          category: 'Packing Material',
          itemCount: categoryTotals['Packing Material'].count,
          totalValue: categoryTotals['Packing Material'].totalVal,
        },
        {
          category: 'Finished Product',
          itemCount: categoryTotals['Finished Product'].count,
          totalValue: categoryTotals['Finished Product'].totalVal,
        },
      ],
      lowStockItemsCount: lowStockCount,
      itemsStockTable,
      todaySummary: {
        productionQuantity: todayProdQty,
        productionValue: todayProdVal,
        salesAmount: todaySalesAmt,
        salesCount: todaySales.length,
      },
      receivablesPayables: {
        totalReceivable,
        totalPayable,
      },
      cashBank,
    };
  }

  // --- Reports ---
  public getProfitAndLossReport(startDate?: string, endDate?: string) {
    let sales = [...this.db.sales];
    let expenses = [...this.db.expenses];

    if (startDate) {
      sales = sales.filter((s) => s.date >= startDate);
      expenses = expenses.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      sales = sales.filter((s) => s.date <= endDate);
      expenses = expenses.filter((e) => e.date <= endDate);
    }

    const totalSalesRevenue = sales.reduce((sum, s) => sum + s.invoiceTotal, 0);
    const totalCostOfGoodsSold = sales.reduce((sum, s) => sum + s.totalCost, 0);
    const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;

    const categoryWiseExpenses: Record<string, number> = {};
    let totalExpenses = 0;
    for (const exp of expenses) {
      categoryWiseExpenses[exp.category] = (categoryWiseExpenses[exp.category] || 0) + exp.amount;
      totalExpenses += exp.amount;
    }

    const netProfit = grossProfit - totalExpenses;

    return {
      startDate: startDate || 'All Time',
      endDate: endDate || 'All Time',
      totalSalesRevenue,
      totalCostOfGoodsSold,
      grossProfit,
      totalExpenses,
      categoryWiseExpenses,
      netProfit,
      salesCount: sales.length,
      expenseCount: expenses.length,
    };
  }

  // --- Backup / Export / Import ---
  public exportData(): DatabaseSchema {
    return this.db;
  }

  public importData(data: DatabaseSchema): boolean {
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.users)) {
      return false;
    }
    this.db = data;
    this.saveDatabase();
    return true;
  }
}

export const storage = new Storage();
