export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: { _id: string; name: string; slug: string } | string | null;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  description: string;
  price: number;
  costPrice: number;
  category: { _id: string; name: string; slug: string } | string;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  expiryDate?: string | null;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductListResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  costPriceAtSale?: number;
  itemRevenue?: number;
  itemCogs?: number;
  itemProfit?: number;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subTotal: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  grossRevenue?: number;
  cogs?: number;
  grossProfit?: number;
  margin?: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface SalesListResponse {
  data: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DailySalesSummary {
  date: string;
  totalSales: number;
  totalGst: number;
  totalOrders: number;
  paymentBreakdown: Record<string, number>;
}

export interface Payment {
  _id: string;
  orderId?: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  customerName?: string;
}

export interface Delivery {
  _id: string;
  orderId?: string;
  customerName: string;
  customerAddress: string;
  deliveryStatus: 'pending' | 'in_transit' | 'delivered';
}

export interface Dashboard {
  products: number;
  lowStock: number;
  pendingPayments: number;
  pendingPaymentsAmount: number;
  pendingDeliveries: number;
  totalRevenue: number;
}

export interface ProfitSummary {
  range: { from: string | null; to: string | null };
  totalRevenue: number;
  totalCOGS: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  avgMargin: number;
  topProfitableProducts: Array<{
    productId: string;
    productName: string;
    sku?: string;
    totalRevenue: number;
    totalCOGS: number;
    totalProfit: number;
    totalQuantity: number;
    margin: number;
  }>;
}

export type ExpenseCategory = 'rent' | 'utilities' | 'salary' | 'transport' | 'misc' | 'other';

export interface Expense {
  _id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export interface ExpenseListResponse {
  data: Expense[];
  totalsByCategory: Array<{ _id: ExpenseCategory; amount: number }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type StockAdjustmentReason = 'damaged' | 'expired' | 'count_correction' | 'theft' | 'return' | 'other';

export interface StockAdjustment {
  _id: string;
  productId: { _id: string; name: string; sku: string; stock?: number } | string;
  quantityChange: number;
  reason: StockAdjustmentReason;
  notes?: string;
  createdBy: { _id?: string; name?: string; email?: string } | string;
  createdAt: string;
}

export interface StockAdjustmentListResponse {
  data: StockAdjustment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PurchaseItem {
  productId: { _id: string; name: string; sku: string } | string;
  quantity: number;
  costPrice: number;
}

export interface Purchase {
  _id: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  purchaseDate: string;
  createdBy: string;
  createdAt?: string;
}

export interface PurchaseListResponse {
  data: Purchase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
