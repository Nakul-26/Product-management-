import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Category } from '../models/Category';

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  const { name, slug, parent } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'name and slug are required' });
  }
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return res.status(400).json({ error: 'Parent category not found' });
    }
  }

  const category = await Category.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json(category);
};

export const getCategories = async (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as 'active' | 'inactive' | undefined;
  const parent = req.query.parent as string | undefined;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  if (parent === 'null') {
    filter.parent = null;
  } else if (parent) {
    filter.parent = parent;
  }

  const categories = await Category.find(filter)
    .sort({ createdAt: -1 })
    .populate('parent', 'name slug');

  res.json(categories);
};

export const getCategoryById = async (req: AuthenticatedRequest, res: Response) => {
  const category = await Category.findById(req.params.id).populate('parent', 'name slug');
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
};
