import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Expense } from '../models/Expense';
import { Sale } from '../models/Sale';

export const getProfitSummary = async (req: AuthenticatedRequest, res: Response) => {
  const fromParam = req.query.from as string | undefined;
  const toParam = req.query.to as string | undefined;

  const match: Record<string, unknown> = {};

  if (fromParam || toParam) {
    const range: Record<string, Date> = {};
    if (fromParam) range.$gte = new Date(`${fromParam}T00:00:00.000Z`);
    if (toParam) range.$lte = new Date(`${toParam}T23:59:59.999Z`);
    match.createdAt = range;
  }

  const expenseMatch: Record<string, unknown> = {};
  if (match.createdAt) {
    expenseMatch.expenseDate = match.createdAt;
  }

  const [totalsAgg, topProductsAgg, expenseAgg] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grossRevenue' },
          totalCOGS: { $sum: '$cogs' },
          totalProfit: { $sum: '$grossProfit' }
        }
      }
    ]),
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
          totalRevenue: { $sum: '$items.itemRevenue' },
          totalCOGS: { $sum: '$items.itemCogs' },
          totalProfit: { $sum: '$items.itemProfit' },
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalProfit: -1 } },
      { $limit: 10 }
    ]),
    Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ])
  ]);

  const totals = totalsAgg[0] || { totalRevenue: 0, totalCOGS: 0, totalProfit: 0 };
  const totalExpenses = expenseAgg[0]?.totalExpenses ?? 0;
  const netProfit = totals.totalProfit - totalExpenses;
  const avgMargin = totals.totalRevenue > 0 ? (totals.totalProfit / totals.totalRevenue) * 100 : 0;

  res.json({
    range: { from: fromParam || null, to: toParam || null },
    totalRevenue: totals.totalRevenue,
    totalCOGS: totals.totalCOGS,
    totalProfit: totals.totalProfit,
    totalExpenses,
    netProfit,
    avgMargin,
    topProfitableProducts: topProductsAgg.map((row) => ({
      productId: row._id,
      productName: row.productName,
      sku: row.sku,
      totalRevenue: row.totalRevenue,
      totalCOGS: row.totalCOGS,
      totalProfit: row.totalProfit,
      totalQuantity: row.totalQuantity,
      margin: row.totalRevenue > 0 ? (row.totalProfit / row.totalRevenue) * 100 : 0
    }))
  });
};
