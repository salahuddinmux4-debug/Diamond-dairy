import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { storage } from './server/storage.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Role authorization middleware
  // Admin has full access. Accountant can only read (GET) and create (POST).
  // Any PUT or DELETE by Accountant is strictly rejected with 403.
  const requireRole = (allowedRoles: ('Admin' | 'Accountant')[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = (req.headers['x-user-role'] as string) || 'Admin';
      if (!allowedRoles.includes(userRole as any)) {
        res.status(403).json({
          error: `Access Denied: Role "${userRole}" is not permitted to perform this action.`,
        });
        return;
      }
      next();
    };
  };

  // General audit check: accountants cannot edit or delete ANY record
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers['x-user-role'] as string) || 'Admin';
    if (userRole === 'Accountant' && (req.method === 'PUT' || req.method === 'DELETE')) {
      res.status(403).json({
        error: 'Permission Denied: Accountant role is strictly restricted to adding new entries. Editing and deleting records is reserved exclusively for Admin.',
      });
      return;
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Auth Endpoints ---
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const user = storage.authenticate(username, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    res.json({ success: true, user });
  });

  app.get('/api/auth/users', requireRole(['Admin']), (req, res) => {
    res.json(storage.getUsers());
  });

  app.post('/api/auth/change-password', (req, res) => {
    const { targetRole, newPassword } = req.body;
    const actorRole = (req.headers['x-user-role'] as string) || 'Admin';

    if (actorRole !== 'Admin') {
      res.status(403).json({ error: 'Only Admin can change passwords' });
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters long' });
      return;
    }

    if (targetRole === 'Accountant') {
      storage.updateAccountantPassword(newPassword);
      res.json({ success: true, message: 'Accountant password updated successfully' });
    } else if (targetRole === 'Admin') {
      storage.updateAdminPassword(newPassword);
      res.json({ success: true, message: 'Admin password updated successfully' });
    } else {
      res.status(400).json({ error: 'Invalid target role' });
    }
  });

  // --- Settings ---
  app.get('/api/settings', (req, res) => {
    res.json(storage.getSettings());
  });

  app.put('/api/settings', requireRole(['Admin']), (req, res) => {
    const updated = storage.updateSettings(req.body);
    res.json(updated);
  });

  // --- Items Master ---
  app.get('/api/items', (req, res) => {
    res.json(storage.getItems());
  });

  app.post('/api/items', (req, res) => {
    const result = storage.addItem(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.item);
  });

  app.put('/api/items/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.updateItem(req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.item);
  });

  app.delete('/api/items/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.deleteItem(req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  app.get('/api/items/:id/movements', (req, res) => {
    const movements = storage.getStockMovementsForItem(req.params.id);
    res.json(movements);
  });

  // --- BOM (Recipe) ---
  app.get('/api/boms', (req, res) => {
    res.json(storage.getBOMs());
  });

  app.get('/api/boms/:finishedProductId', (req, res) => {
    const bom = storage.getBOMByFinishedProductId(req.params.finishedProductId);
    if (!bom) {
      res.status(404).json({ error: 'BOM not found' });
      return;
    }
    res.json(bom);
  });

  app.post('/api/boms', (req, res) => {
    const result = storage.saveBOM(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.bom);
  });

  app.delete('/api/boms/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.deleteBOM(req.params.id);
    res.json(result);
  });

  // --- Suppliers ---
  app.get('/api/suppliers', (req, res) => {
    res.json(storage.getSuppliers());
  });

  app.post('/api/suppliers', (req, res) => {
    const result = storage.addSupplier(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.supplier);
  });

  app.put('/api/suppliers/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.updateSupplier(req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.supplier);
  });

  app.delete('/api/suppliers/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.deleteSupplier(req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  app.get('/api/suppliers/:id/ledger', (req, res) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const ledger = storage.getSupplierLedger(req.params.id, startDate, endDate);
    res.json(ledger);
  });

  app.post('/api/suppliers/:id/payment', (req, res) => {
    const result = storage.recordSupplierPayment({
      supplierId: req.params.id,
      amount: req.body.amount,
      date: req.body.date,
      paidFrom: req.body.paidFrom,
      note: req.body.note,
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  // --- Purchases ---
  app.get('/api/purchases', (req, res) => {
    const { startDate, endDate, supplierId } = req.query as {
      startDate?: string;
      endDate?: string;
      supplierId?: string;
    };
    res.json(storage.getPurchases(startDate, endDate, supplierId));
  });

  app.post('/api/purchases', (req, res) => {
    const result = storage.recordPurchase(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.purchase);
  });

  // --- Production ---
  app.get('/api/production', (req, res) => {
    const { startDate, endDate, finishedProductId } = req.query as {
      startDate?: string;
      endDate?: string;
      finishedProductId?: string;
    };
    res.json(storage.getProductionBatches(startDate, endDate, finishedProductId));
  });

  app.get('/api/production/:id', (req, res) => {
    const batch = storage.getProductionBatchById(req.params.id);
    if (!batch) {
      res.status(404).json({ error: 'Production batch not found' });
      return;
    }
    res.json(batch);
  });

  app.post('/api/production', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || 'Admin';
    // If admin requested override stock
    const override = userRole === 'Admin' && req.body.adminOverrideStock === true;
    const result = storage.recordProduction({
      ...req.body,
      adminOverrideStock: override,
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.batch);
  });

  // --- Customers ---
  app.get('/api/customers', (req, res) => {
    res.json(storage.getCustomers());
  });

  app.post('/api/customers', (req, res) => {
    const result = storage.addCustomer(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.customer);
  });

  app.put('/api/customers/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.updateCustomer(req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.customer);
  });

  app.delete('/api/customers/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.deleteCustomer(req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  app.get('/api/customers/:id/ledger', (req, res) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const ledger = storage.getCustomerLedger(req.params.id, startDate, endDate);
    res.json(ledger);
  });

  app.post('/api/customers/:id/payment', (req, res) => {
    const result = storage.recordCustomerPayment({
      customerId: req.params.id,
      amount: req.body.amount,
      date: req.body.date,
      depositedTo: req.body.depositedTo,
      note: req.body.note,
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  // --- Sales & Invoices ---
  app.get('/api/sales', (req, res) => {
    const { startDate, endDate, customerId, itemId } = req.query as {
      startDate?: string;
      endDate?: string;
      customerId?: string;
      itemId?: string;
    };
    res.json(storage.getSales(startDate, endDate, customerId, itemId));
  });

  app.get('/api/sales/:id', (req, res) => {
    const sale = storage.getSaleById(req.params.id);
    if (!sale) {
      res.status(404).json({ error: 'Sale invoice not found' });
      return;
    }
    res.json(sale);
  });

  app.post('/api/sales', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || 'Admin';
    const override = userRole === 'Admin' && req.body.adminOverrideStock === true;
    const result = storage.recordSale({
      ...req.body,
      adminOverrideStock: override,
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.sale);
  });

  // --- Expenses ---
  app.get('/api/expenses', (req, res) => {
    const { startDate, endDate, category } = req.query as {
      startDate?: string;
      endDate?: string;
      category?: string;
    };
    res.json(storage.getExpenses(startDate, endDate, category));
  });

  app.post('/api/expenses', (req, res) => {
    const result = storage.recordExpense(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.expense);
  });

  app.delete('/api/expenses/:id', requireRole(['Admin']), (req, res) => {
    const result = storage.deleteExpense(req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  // --- Cash & Bank ---
  app.get('/api/cash-bank/balances', (req, res) => {
    res.json(storage.getCashBankBalances());
  });

  app.get('/api/cash-bank/ledger', (req, res) => {
    const { account, startDate, endDate } = req.query as {
      account?: 'Cash' | 'Bank';
      startDate?: string;
      endDate?: string;
    };
    res.json(storage.getCashBankLedger(account, startDate, endDate));
  });

  app.put('/api/cash-bank/opening', requireRole(['Admin']), (req, res) => {
    const balances = storage.updateCashBankOpeningBalances(req.body);
    res.json(balances);
  });

  app.post('/api/cash-bank/adjustment', requireRole(['Admin']), (req, res) => {
    const result = storage.recordCashBankAdjustment(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  // --- Dashboard Summary ---
  app.get('/api/dashboard', (req, res) => {
    res.json(storage.getDashboardSummary());
  });

  // --- Reports ---
  app.get('/api/reports/pnl', (req, res) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    res.json(storage.getProfitAndLossReport(startDate, endDate));
  });

  // --- Backup / Export / Import ---
  app.get('/api/backup/export', requireRole(['Admin']), (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="diamond_dairy_backup_${new Date().toISOString().split('T')[0]}.json"`
    );
    res.json(storage.exportData());
  });

  app.post('/api/backup/import', requireRole(['Admin']), (req, res) => {
    const success = storage.importData(req.body);
    if (!success) {
      res.status(400).json({ error: 'Invalid backup file format' });
      return;
    }
    res.json({ success: true, message: 'Database restored successfully' });
  });

  // --- Vite Middleware or Static Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Diamond Dairy Server running on http://localhost:${PORT}`);
  });
}

startServer();
