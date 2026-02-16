import { Request, Response } from 'express';
import { Category } from '../models/Category';

export const createCategory = async (req: Request, res: Response) => {
  const { name, slug, createdBy, parent } = req.body;
  if (!name || !slug || !createdBy) {
    return res.status(400).json({ error: 'name, slug and createdBy are required' });
  }

  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return res.status(400).json({ error: 'Parent category not found' });
    }
  }

  const category = await Category.create(req.body);
  res.status(201).json(category);
};

export const getCategories = async (req: Request, res: Response) => {
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

export const getCategoryById = async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id).populate('parent', 'name slug');
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
};
