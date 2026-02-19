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

const asyncHandler =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

router.get('/products', asyncHandler(getProducts));
router.post('/products', asyncHandler(createProduct));
router.post('/products/bulk-import', asyncHandler(bulkImportProducts));
router.get('/products/:id', asyncHandler(getProductById));
router.put('/products/:id', asyncHandler(updateProduct));
router.delete('/products/:id', asyncHandler(deleteProduct));
router.get('/stock/alerts/low', asyncHandler(getLowStockProducts));

router.post('/categories', asyncHandler(createCategory));
router.get('/categories', asyncHandler(getCategories));
router.get('/categories/:id', asyncHandler(getCategoryById));

router.post('/sales', asyncHandler(createSale));
router.get('/sales', asyncHandler(getSales));
router.get('/sales/summary/daily', asyncHandler(getDailySalesSummary));
router.get('/sales/:id/invoice', asyncHandler(getSaleInvoice));
router.get('/sales/:id', asyncHandler(getSaleById));

router.get('/payments', asyncHandler(getPayments));
router.post('/payments', asyncHandler(createPayment));
router.put('/payments/:id', asyncHandler(updatePayment));

router.get('/deliveries', asyncHandler(getDeliveries));
router.post('/deliveries', asyncHandler(createDelivery));
router.put('/deliveries/:id', asyncHandler(updateDelivery));

router.get('/dashboard', asyncHandler(getDashboard));

export default router;
