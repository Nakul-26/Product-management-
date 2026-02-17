import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Delivery } from '../models/Delivery';
import { Product } from '../models/Product';

export const getDeliveries = async (_req: Request, res: Response) => {
  const deliveries = await Delivery.find()
    .sort({ createdAt: -1 })
    .populate('items.productId', 'name');
  res.json(deliveries);
};

export const createDelivery = async (req: Request, res: Response) => {
  const { customerName, customerAddress, items } = req.body;
  if (!customerName || !customerAddress || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName, customerAddress and items are required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error('Product not found');
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      product.stock -= item.quantity;
      await product.save({ session });
    }

    const delivery = await Delivery.create([req.body], { session });
    await session.commitTransaction();
    res.status(201).json(delivery[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create delivery' });
  } finally {
    session.endSession();
  }
};

export const updateDelivery = async (req: Request, res: Response) => {
  const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
  res.json(delivery);
};
