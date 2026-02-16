import { Request, Response } from 'express';
import { Delivery } from '../models/Delivery';
import { Payment } from '../models/Payment';
import { Product } from '../models/Product';

export const getDashboard = async (_req: Request, res: Response) => {
  const [products, lowStock, pendingPayments, pendingDeliveries, completedRevenue] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, status: 'active' }),
    Payment.find({ paymentStatus: 'pending' }),
    Delivery.countDocuments({ deliveryStatus: 'pending' }),
    Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const pendingPaymentsAmount = pendingPayments.reduce((sum, item) => sum + item.amount, 0);

  res.json({
    products,
    lowStock,
    pendingPayments: pendingPayments.length,
    pendingPaymentsAmount,
    pendingDeliveries,
    totalRevenue: completedRevenue[0]?.total ?? 0
  });
};
