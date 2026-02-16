import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './api/client';
import { Category, Dashboard, Delivery, Payment, Product, ProductListResponse } from './types';
import './styles.css';

const defaultDashboard: Dashboard = {
  products: 0,
  lowStock: 0,
  pendingPayments: 0,
  pendingPaymentsAmount: 0,
  pendingDeliveries: 0,
  totalRevenue: 0
};

type ProductFormState = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  costPrice: string;
  category: string;
  stock: string;
  lowStockThreshold: string;
  images: string;
  expiryDate: string;
  status: 'active' | 'inactive';
  createdBy: string;
};

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  parent: string;
  status: 'active' | 'inactive';
  createdBy: string;
};

const defaultProductForm: ProductFormState = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  price: '',
  costPrice: '',
  category: '',
  stock: '0',
  lowStockThreshold: '5',
  images: '',
  expiryDate: '',
  status: 'active',
  createdBy: ''
};

const defaultCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  parent: '',
  status: 'active',
  createdBy: ''
};

const parseCsv = (content: string): Record<string, string>[] => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] || '').trim();
    });
    return row;
  });
};

function App() {
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [tab, setTab] = useState<'products' | 'categories' | 'payments' | 'deliveries'>('products');
  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productError, setProductError] = useState<string>('');
  const [categoryError, setCategoryError] = useState<string>('');
  const [productNotice, setProductNotice] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const parentCategories = useMemo(() => categories.filter((category) => !category.parent), [categories]);

  const loadCategories = async () => {
    const response = await api.get<Category[]>('/categories');
    setCategories(response.data);
  };

  const loadData = async (
    targetPage = page,
    querySearch = search,
    queryStatus = statusFilter,
    queryCategory = categoryFilter
  ) => {
    const params: Record<string, string | number> = { page: targetPage, limit: 10 };
    if (querySearch.trim()) params.search = querySearch.trim();
    if (queryStatus !== 'all') params.status = queryStatus;
    if (queryCategory !== 'all') params.category = queryCategory;

    const [dash, prod, pay, del] = await Promise.all([
      api.get<Dashboard>('/dashboard'),
      api.get<ProductListResponse>('/products', { params }),
      api.get<Payment[]>('/payments'),
      api.get<Delivery[]>('/deliveries')
    ]);

    setDashboard(dash.data);
    setProducts(prod.data.data);
    setTotalPages(prod.data.pagination.totalPages);
    setPage(prod.data.pagination.page);
    setPayments(pay.data);
    setDeliveries(del.data);
  };

  useEffect(() => {
    Promise.all([loadData(1, '', 'all', 'all'), loadCategories()]);
  }, []);

  const resetProductForm = () => {
    setProductForm(defaultProductForm);
    setEditingProductId(null);
    setProductError('');
    setProductNotice('');
  };

  const resetCategoryForm = () => {
    setCategoryForm(defaultCategoryForm);
    setCategoryError('');
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const toBase64 = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    try {
      const encoded = await Promise.all(Array.from(files).map((file) => toBase64(file)));
      const existing = productForm.images
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      setProductForm((prev) => ({ ...prev, images: [...existing, ...encoded].join(', ') }));
      setProductNotice(`${encoded.length} image(s) prepared for upload.`);
    } catch {
      setProductError('Unable to process selected image files.');
    }
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductError('');
    setProductNotice('');

    const requiredFields = ['name', 'price', 'costPrice', 'category', 'createdBy'];
    const missing = requiredFields.some((field) => !productForm[field as keyof ProductFormState]);
    if (missing) {
      setProductError('name, price, costPrice, category and createdBy are required.');
      return;
    }

    const payload = {
      name: productForm.name,
      sku: productForm.sku || undefined,
      barcode: productForm.barcode || undefined,
      description: productForm.description,
      price: Number(productForm.price),
      costPrice: Number(productForm.costPrice),
      category: productForm.category,
      stock: Number(productForm.stock || 0),
      lowStockThreshold: Number(productForm.lowStockThreshold || 5),
      images: productForm.images.split(',').map((image) => image.trim()).filter(Boolean),
      expiryDate: productForm.expiryDate ? new Date(productForm.expiryDate).toISOString() : null,
      status: productForm.status,
      createdBy: productForm.createdBy
    };

    try {
      const response = editingProductId
        ? await api.put(`/products/${editingProductId}`, payload)
        : await api.post('/products', payload);

      const resolvedSku = response.data?.sku;
      if (!editingProductId && !productForm.sku && resolvedSku) {
        setProductNotice(`SKU auto-generated: ${resolvedSku}`);
      }

      setProductForm(defaultProductForm);
      setEditingProductId(null);
      await loadData(1, search, statusFilter, categoryFilter);
    } catch (error: any) {
      setProductError(error?.response?.data?.error || 'Unable to save product.');
    }
  };

  const handleBulkImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setProductError('CSV file has no valid rows.');
        return;
      }

      const items = rows.map((row) => ({
        name: row.name,
        sku: row.sku || undefined,
        barcode: row.barcode || undefined,
        description: row.description || '',
        price: Number(row.price || 0),
        costPrice: Number(row.costPrice || 0),
        category: row.category,
        stock: Number(row.stock || 0),
        lowStockThreshold: Number(row.lowStockThreshold || 5),
        images: row.images ? row.images.split('|').map((value) => value.trim()).filter(Boolean) : [],
        expiryDate: row.expiryDate || null,
        status: row.status === 'inactive' ? 'inactive' : 'active',
        createdBy: row.createdBy
      }));

      const response = await api.post('/products/bulk-import', { items });
      const { createdCount, failedCount } = response.data;
      setProductNotice(`Bulk import complete: ${createdCount} created, ${failedCount} failed.`);
      await loadData(1, search, statusFilter, categoryFilter);
    } catch (error: any) {
      setProductError(error?.response?.data?.error || 'Bulk import failed. Check CSV format.');
    } finally {
      event.target.value = '';
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryError('');

    if (!categoryForm.name || !categoryForm.slug || !categoryForm.createdBy) {
      setCategoryError('name, slug and createdBy are required.');
      return;
    }

    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      description: categoryForm.description,
      parent: categoryForm.parent || null,
      status: categoryForm.status,
      createdBy: categoryForm.createdBy
    };

    try {
      await api.post('/categories', payload);
      resetCategoryForm();
      await loadCategories();
    } catch (error: any) {
      setCategoryError(error?.response?.data?.error || 'Unable to create category.');
    }
  };

  const startEditProduct = (product: Product) => {
    const categoryId = typeof product.category === 'string' ? product.category : product.category?._id || '';
    setEditingProductId(product._id);
    setProductError('');
    setProductNotice('');
    setProductForm({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      price: String(product.price),
      costPrice: String(product.costPrice),
      category: categoryId,
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
      images: (product.images || []).join(', '),
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : '',
      status: product.status,
      createdBy: product.createdBy
    });
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = window.confirm(`Delete ${product.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/products/${product._id}`);
      if (editingProductId === product._id) resetProductForm();
      await loadData(page, search, statusFilter, categoryFilter);
    } catch (error: any) {
      setProductError(error?.response?.data?.error || 'Unable to delete product.');
    }
  };

  const applyFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadData(1, search, statusFilter, categoryFilter);
  };

  const categoryLabel = (category: Product['category']) => (typeof category === 'string' ? category : category?.name || '-');
  const parentLabel = (category: Category) => {
    if (!category.parent) return '—';
    if (typeof category.parent === 'string') return category.parent;
    return category.parent.name;
  };

  return (
    <div className="app">
      <header>
        <h1>Shop Owner Automation Platform</h1>
        <p>MERN + TypeScript application for daily store operations.</p>
      </header>

      <section className="cards">
        <article><h3>Products</h3><p>{dashboard.products}</p></article>
        <article><h3>Low Stock</h3><p>{dashboard.lowStock}</p></article>
        <article><h3>Pending Payments</h3><p>{dashboard.pendingPayments}</p></article>
        <article><h3>Pending Deliveries</h3><p>{dashboard.pendingDeliveries}</p></article>
        <article><h3>Total Revenue</h3><p>₹{dashboard.totalRevenue.toFixed(2)}</p></article>
      </section>

      <nav className="tabs">
        <button onClick={() => setTab('products')} className={tab === 'products' ? 'active' : ''}>Products</button>
        <button onClick={() => setTab('categories')} className={tab === 'categories' ? 'active' : ''}>Categories</button>
        <button onClick={() => setTab('payments')} className={tab === 'payments' ? 'active' : ''}>Payments</button>
        <button onClick={() => setTab('deliveries')} className={tab === 'deliveries' ? 'active' : ''}>Deliveries</button>
      </nav>

      {tab === 'products' && (
        <section className="panel">
          <div className="panel-header">
            <h2>Inventory Management</h2>
            <div className="toolbar-actions">
              <label className="btn btn-light file-label">
                Bulk Import CSV
                <input type="file" accept=".csv,text/csv" onChange={handleBulkImport} />
              </label>
              {editingProductId && (
                <button className="btn btn-light" type="button" onClick={resetProductForm}>Cancel Edit</button>
              )}
            </div>
          </div>

          <form className="filter-row" onSubmit={applyFilters}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name/sku/barcode/description" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}>
              <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
            <button className="btn btn-primary" type="submit">Apply</button>
          </form>

          <form className="form-grid" onSubmit={handleProductSubmit}>
            <label>Name *<input value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} /></label>
            <label>SKU (optional, auto-generated if empty)<input value={productForm.sku} onChange={(e) => setProductForm((p) => ({ ...p, sku: e.target.value }))} /></label>
            <label>Barcode<input value={productForm.barcode} onChange={(e) => setProductForm((p) => ({ ...p, barcode: e.target.value }))} /></label>
            <label>Category *
              <select value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
              </select>
            </label>
            <label>Price *<input type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} /></label>
            <label>Cost Price *<input type="number" min="0" step="0.01" value={productForm.costPrice} onChange={(e) => setProductForm((p) => ({ ...p, costPrice: e.target.value }))} /></label>
            <label>Stock<input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} /></label>
            <label>Low Stock Threshold<input type="number" min="0" value={productForm.lowStockThreshold} onChange={(e) => setProductForm((p) => ({ ...p, lowStockThreshold: e.target.value }))} /></label>
            <label>Expiry Date<input type="date" value={productForm.expiryDate} onChange={(e) => setProductForm((p) => ({ ...p, expiryDate: e.target.value }))} /></label>
            <label>Status
              <select value={productForm.status} onChange={(e) => setProductForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">active</option><option value="inactive">inactive</option>
              </select>
            </label>
            <label>Created By (User ID) *<input value={productForm.createdBy} onChange={(e) => setProductForm((p) => ({ ...p, createdBy: e.target.value }))} /></label>
            <label className="full-width">Description<textarea value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <label className="full-width">Image URLs (comma separated)<input value={productForm.images} onChange={(e) => setProductForm((p) => ({ ...p, images: e.target.value }))} /></label>
            <label className="full-width">Upload Images
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
            </label>
            <div className="full-width form-actions"><button className="btn btn-primary" type="submit">{editingProductId ? 'Update Product' : 'Create Product'}</button></div>
          </form>

          {productError && <p className="error-text">{productError}</p>}
          {productNotice && <p className="success-text">{productNotice}</p>}

          <h3>All Products ({products.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>SKU</th><th>Barcode</th><th>Category</th><th>Status</th><th>Price</th><th>Cost</th><th>Stock</th><th>Threshold</th><th>Expiry</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td><td>{p.sku || '-'}</td><td>{p.barcode || '-'}</td><td>{categoryLabel(p.category)}</td><td>{p.status}</td>
                  <td>₹{p.price}</td><td>₹{p.costPrice}</td>
                  <td className={p.stock <= p.lowStockThreshold ? 'warning' : ''}>{p.stock}</td>
                  <td>{p.lowStockThreshold}</td>
                  <td>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}</td>
                  <td><div className="action-row"><button className="btn btn-light" type="button" onClick={() => startEditProduct(p)}>Edit</button><button className="btn btn-danger" type="button" onClick={() => handleDeleteProduct(p)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination-row">
            <button className="btn btn-light" type="button" disabled={page <= 1} onClick={() => loadData(page - 1, search, statusFilter, categoryFilter)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-light" type="button" disabled={page >= totalPages} onClick={() => loadData(page + 1, search, statusFilter, categoryFilter)}>Next</button>
          </div>
        </section>
      )}

      {tab === 'categories' && (
        <section className="panel">
          <h2>Category Module</h2>
          <form className="form-grid" onSubmit={handleCategorySubmit}>
            <label>Name *<input value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} /></label>
            <label>Slug *<input value={categoryForm.slug} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} placeholder="e.g. electronics" /></label>
            <label>Parent Category (optional)
              <select value={categoryForm.parent} onChange={(e) => setCategoryForm((p) => ({ ...p, parent: e.target.value }))}>
                <option value="">None (root category)</option>
                {parentCategories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
              </select>
            </label>
            <label>Status
              <select value={categoryForm.status} onChange={(e) => setCategoryForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">active</option><option value="inactive">inactive</option>
              </select>
            </label>
            <label>Created By (User ID) *<input value={categoryForm.createdBy} onChange={(e) => setCategoryForm((p) => ({ ...p, createdBy: e.target.value }))} /></label>
            <label className="full-width">Description<textarea value={categoryForm.description} onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <div className="full-width form-actions"><button className="btn btn-primary" type="submit">Create Category</button></div>
          </form>
          {categoryError && <p className="error-text">{categoryError}</p>}

          <h3>All Categories ({categories.length})</h3>
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Parent</th><th>Status</th><th>CreatedBy</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c._id}><td>{c.name}</td><td>{c.slug}</td><td>{parentLabel(c)}</td><td>{c.status}</td><td>{c.createdBy}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'payments' && (
        <section className="panel">
          <h2>Payment Tracking</h2>
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}><td>{p.orderId || '-'}</td><td>{p.customerName || '-'}</td><td>₹{p.amount}</td><td>{p.paymentMethod}</td><td>{p.paymentStatus}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Pending value: ₹{dashboard.pendingPaymentsAmount.toFixed(2)}</p>
        </section>
      )}

      {tab === 'deliveries' && (
        <section className="panel">
          <h2>Delivery Tracking</h2>
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Address</th><th>Status</th></tr></thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d._id}><td>{d.orderId || '-'}</td><td>{d.customerName}</td><td>{d.customerAddress}</td><td>{d.deliveryStatus}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default App;
