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
