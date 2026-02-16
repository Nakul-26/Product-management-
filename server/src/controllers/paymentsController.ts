import { Request, Response } from 'express';
import { Payment } from '../models/Payment';

export const getPayments = async (_req: Request, res: Response) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json(payments);
};

export const createPayment = async (req: Request, res: Response) => {
  const { amount, paymentMethod } = req.body;
  if (amount === undefined || !paymentMethod) {
    return res.status(400).json({ error: 'Amount and paymentMethod are required' });
  }
  const payment = await Payment.create(req.body);
  res.status(201).json(payment);
};

export const updatePayment = async (req: Request, res: Response) => {
  const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
};
