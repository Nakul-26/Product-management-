import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  bulkImportProducts,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} from '../controllers/productsController';
import { getPayments, createPayment, updatePayment } from '../controllers/paymentsController';
import { createCategory, getCategories, getCategoryById } from '../controllers/categoriesController';
import { getDeliveries, createDelivery, updateDelivery } from '../controllers/deliveriesController';
import { createSale, getSales, getSaleById, getDailySalesSummary, getSaleInvoice } from '../controllers/salesController';
import { getDashboard } from '../controllers/dashboardController';
import { createPurchase, getPurchases } from '../controllers/purchasesController';
import { getProfitSummary } from '../controllers/analyticsController';
import { createExpense, getExpenses } from '../controllers/expensesController';
import { createStockAdjustment, getStockAdjustments } from '../controllers/stockAdjustmentsController';
import authRouter from './authRoutes';
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware';

const asyncHandler =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

router.use('/auth', authRouter);
router.use(asyncHandler(requireAuth));

router.get('/products', asyncHandler(getProducts));
router.post('/products', asyncHandler(authorizeRoles('owner')), asyncHandler(createProduct));
router.post('/products/bulk-import', asyncHandler(authorizeRoles('owner')), asyncHandler(bulkImportProducts));
router.get('/products/:id', asyncHandler(getProductById));
router.put('/products/:id', asyncHandler(authorizeRoles('owner')), asyncHandler(updateProduct));
router.delete('/products/:id', asyncHandler(authorizeRoles('owner')), asyncHandler(deleteProduct));
router.get('/stock/alerts/low', asyncHandler(getLowStockProducts));

router.post('/categories', asyncHandler(authorizeRoles('owner')), asyncHandler(createCategory));
router.get('/categories', asyncHandler(getCategories));
router.get('/categories/:id', asyncHandler(getCategoryById));

router.post('/sales', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(createSale));
router.get('/sales', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getSales));
router.get('/sales/summary/daily', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getDailySalesSummary));
router.get('/sales/:id/invoice', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getSaleInvoice));
router.get('/sales/:id', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getSaleById));

router.get('/payments', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getPayments));
router.post('/payments', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(createPayment));
router.put('/payments/:id', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(updatePayment));

router.get('/deliveries', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getDeliveries));
router.post('/deliveries', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(createDelivery));
router.put('/deliveries/:id', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(updateDelivery));

router.get('/dashboard', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getDashboard));
router.get('/analytics/profit', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getProfitSummary));

router.post('/purchases', asyncHandler(authorizeRoles('owner')), asyncHandler(createPurchase));
router.get('/purchases', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getPurchases));

router.post('/expenses', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(createExpense));
router.get('/expenses', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getExpenses));

router.post('/stock-adjustments', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(createStockAdjustment));
router.get('/stock-adjustments', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getStockAdjustments));

export default router;
