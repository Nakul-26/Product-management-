import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Category } from '../models/Category';
import { Product } from '../models/Product';

type ProductFilters = {
  status?: 'active' | 'inactive';
  category?: string;
  createdBy?: string;
  price?: { $gte?: number; $lte?: number };
  expiryDate?: { $gte?: Date; $lte?: Date };
  $text?: { $search: string };
};

const generateSkuBase = (name: string) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.slice(0, 3))
    .join('') || 'SKU';

const generateUniqueSku = async (name: string): Promise<string> => {
  const base = generateSkuBase(name);
  let suffix = 1;
  let candidate = `${base}-${String(suffix).padStart(4, '0')}`;

  while (await Product.findOne({ sku: candidate })) {
    suffix += 1;
    candidate = `${base}-${String(suffix).padStart(4, '0')}`;
  }

  return candidate;
};

export const getProducts = async (req: AuthenticatedRequest, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = (req.query.search as string | undefined)?.trim();
  const status = req.query.status as 'active' | 'inactive' | undefined;
  const category = req.query.category as string | undefined;
  const createdBy = req.query.createdBy as string | undefined;
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

  const filter: ProductFilters = {};

  if (search) filter.$text = { $search: search };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (createdBy) filter.createdBy = createdBy;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined && !Number.isNaN(minPrice)) filter.price.$gte = minPrice;
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) filter.price.$lte = maxPrice;
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter)
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

export const getProductById = async (req: AuthenticatedRequest, res: Response) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  const { name, sku, price, costPrice, category, barcode } = req.body;
  if (!name || price === undefined || costPrice === undefined || !category) {
    return res.status(400).json({ error: 'name, price, costPrice and category are required' });
  }
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const categoryExists = await Category.findById(category);
  if (!categoryExists) return res.status(400).json({ error: 'Category not found' });

  if (barcode) {
    const existingBarcode = await Product.findOne({ barcode });
    if (existingBarcode) return res.status(400).json({ error: 'Barcode already exists' });
  }

  const resolvedSku = sku?.trim() ? String(sku).toUpperCase() : await generateUniqueSku(name);
  const existingSku = await Product.findOne({ sku: resolvedSku });
  if (existingSku) return res.status(400).json({ error: 'SKU already exists' });

  const product = await Product.create({ ...req.body, sku: resolvedSku, createdBy: req.user.id });
  const populated = await Product.findById(product._id).populate('category', 'name slug');
  res.status(201).json(populated);
};

export const bulkImportProducts = async (req: AuthenticatedRequest, res: Response) => {
  const rows = Array.isArray(req.body?.items) ? req.body.items : [];
  if (rows.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const results: Array<{ index: number; status: 'created' | 'failed'; product?: unknown; error?: string }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const { name, price, costPrice, category } = row;
      if (!name || price === undefined || costPrice === undefined || !category) {
        throw new Error('name, price, costPrice and category are required');
      }

      const categoryExists = await Category.findById(category);
      if (!categoryExists) throw new Error('Category not found');

      const resolvedSku = row.sku?.trim() ? String(row.sku).toUpperCase() : await generateUniqueSku(name);
      if (await Product.findOne({ sku: resolvedSku })) throw new Error('SKU already exists');
      if (row.barcode && (await Product.findOne({ barcode: row.barcode }))) throw new Error('Barcode already exists');

      const product = await Product.create({ ...row, sku: resolvedSku, createdBy: req.user.id });
      results.push({ index: i, status: 'created', product });
    } catch (error) {
      results.push({ index: i, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  res.status(201).json({
    createdCount: results.filter((result) => result.status === 'created').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    results
  });
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) return res.status(400).json({ error: 'Category not found' });
  }

  if (req.body.sku) {
    const existingSku = await Product.findOne({ sku: String(req.body.sku).toUpperCase(), _id: { $ne: req.params.id } });
    if (existingSku) return res.status(400).json({ error: 'SKU already exists' });
    req.body.sku = String(req.body.sku).toUpperCase();
  }

  if (req.body.barcode) {
    const existingBarcode = await Product.findOne({ barcode: req.body.barcode, _id: { $ne: req.params.id } });
    if (existingBarcode) return res.status(400).json({ error: 'Barcode already exists' });
  }

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('category', 'name slug');
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted successfully' });
};

export const getLowStockProducts = async (_req: AuthenticatedRequest, res: Response) => {
  const lowStock = await Product.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, status: 'active' })
    .populate('category', 'name slug')
    .sort({ stock: 1 });
  res.json(lowStock);
};
