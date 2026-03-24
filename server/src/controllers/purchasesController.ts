import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Product } from '../models/Product';
import { Purchase } from '../models/Purchase';

export const createPurchase = async (req: AuthenticatedRequest, res: Response) => {
  const { supplierName, items, purchaseDate } = req.body;

  if (!supplierName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'supplierName and items are required' });
  }
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    const normalizedItems: Array<{ productId: unknown; quantity: number; costPrice: number }> = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const quantity = Number(item.quantity || 0);
      const costPrice = Number(item.costPrice);

      if (!quantity || quantity < 1) throw new Error('Quantity must be at least 1');
      if (Number.isNaN(costPrice) || costPrice < 0) throw new Error('costPrice must be a valid non-negative number');

      product.stock += quantity;
      product.costPrice = costPrice;
      await product.save({ session });

      totalAmount += quantity * costPrice;
      normalizedItems.push({ productId: product._id, quantity, costPrice });
    }

    const [purchase] = await Purchase.create(
      [
        {
          supplierName: String(supplierName).trim(),
          items: normalizedItems,
          totalAmount,
          purchaseDate: purchaseDate || new Date(),
          createdBy: req.user.id
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const populated = await Purchase.findById(purchase._id).populate('items.productId', 'name sku');
    res.status(201).json(populated);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create purchase' });
  } finally {
    session.endSession();
  }
};

export const getPurchases = async (req: AuthenticatedRequest, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

  const [items, total] = await Promise.all([
    Purchase.find()
      .sort({ purchaseDate: -1, createdAt: -1 })
      .populate('items.productId', 'name sku')
      .skip((page - 1) * limit)
      .limit(limit),
    Purchase.countDocuments()
  ]);

  res.json({
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
};
