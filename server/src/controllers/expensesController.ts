import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Expense } from '../models/Expense';

export const createExpense = async (req: AuthenticatedRequest, res: Response) => {
  const { title, category, amount, expenseDate, notes } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount < 0) {
    return res.status(400).json({ error: 'amount must be a valid non-negative number' });
  }
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const expense = await Expense.create({
    title: title.trim(),
    category,
    amount: numericAmount,
    expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
    notes: typeof notes === 'string' ? notes.trim() : '',
    createdBy: req.user.id
  });

  res.status(201).json(expense);
};

export const getExpenses = async (req: AuthenticatedRequest, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const fromParam = req.query.from as string | undefined;
  const toParam = req.query.to as string | undefined;
  const category = req.query.category as string | undefined;

  const query: Record<string, unknown> = {};

  if (fromParam || toParam) {
    const range: Record<string, Date> = {};
    if (fromParam) range.$gte = new Date(`${fromParam}T00:00:00.000Z`);
    if (toParam) range.$lte = new Date(`${toParam}T23:59:59.999Z`);
    query.expenseDate = range;
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  const [items, total, totals] = await Promise.all([
    Expense.find(query)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Expense.countDocuments(query),
    Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' }
        }
      }
    ])
  ]);

  res.json({
    data: items,
    totalsByCategory: totals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
};
