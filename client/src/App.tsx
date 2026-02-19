import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './api/client';
import {
  Category,
  DailySalesSummary,
  Dashboard,
  Delivery,
  Payment,
  Product,
  ProductListResponse,
  Sale,
  SalesListResponse
} from './types';
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

type SaleFormState = {
  customerName: string;
  customerPhone: string;
  discount: string;
  gstRate: string;
  paymentMethod: 'cash' | 'upi' | 'card';
  createdBy: string;
  notes: string;
};

type CartItem = {
  productId: string;
  quantity: number;
  lineDiscount: number;
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

const defaultSaleForm: SaleFormState = {
  customerName: 'Walk-in Customer',
  customerPhone: '',
  discount: '0',
  gstRate: '0',
  paymentMethod: 'cash',
  createdBy: '',
  notes: ''
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
  const [sales, setSales] = useState<Sale[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySalesSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [tab, setTab] = useState<'products' | 'categories' | 'sales' | 'payments' | 'deliveries'>('products');
  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm);
  const [saleForm, setSaleForm] = useState<SaleFormState>(defaultSaleForm);
  const [saleCart, setSaleCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productError, setProductError] = useState<string>('');
  const [categoryError, setCategoryError] = useState<string>('');
  const [salesError, setSalesError] = useState<string>('');
  const [productNotice, setProductNotice] = useState<string>('');
  const [salesNotice, setSalesNotice] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const parentCategories = useMemo(() => categories.filter((category) => !category.parent), [categories]);

  const cartPreview = useMemo(() => {
    const lineItems = saleCart
      .map((item) => {
        const product = products.find((p) => p._id === item.productId);
        if (!product) return null;
        const lineTotal = Math.max(product.price * item.quantity - item.lineDiscount, 0);
        return { product, ...item, lineTotal };
      })
      .filter(Boolean) as Array<{ product: Product; productId: string; quantity: number; lineDiscount: number; lineTotal: number }>;

    const subTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Number(saleForm.discount || 0);
    const taxable = Math.max(subTotal - discount, 0);
    const gstAmount = (taxable * Number(saleForm.gstRate || 0)) / 100;
    const grandTotal = taxable + gstAmount;

    return { lineItems, subTotal, gstAmount, grandTotal };
  }, [products, saleCart, saleForm.discount, saleForm.gstRate]);

  const loadCategories = async () => {
    const response = await api.get<Category[]>('/categories');
    setCategories(response.data);
  };

  const loadSalesData = async () => {
    const [salesRes, summaryRes] = await Promise.all([
      api.get<SalesListResponse>('/sales', { params: { page: 1, limit: 10 } }),
      api.get<DailySalesSummary>('/sales/summary/daily')
    ]);
    setSales(salesRes.data.data);
    setDailySummary(summaryRes.data);
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
    Promise.all([loadData(1, '', 'all', 'all'), loadCategories(), loadSalesData()]);
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

  const resetSalesForm = () => {
    setSaleForm(defaultSaleForm);
    setSaleCart([]);
    setSelectedProductId('');
    setSalesError('');
  };

  const addProductToCart = () => {
    if (!selectedProductId) return;
    const exists = saleCart.find((item) => item.productId === selectedProductId);
    if (exists) return;
    setSaleCart((prev) => [...prev, { productId: selectedProductId, quantity: 1, lineDiscount: 0 }]);
    setSelectedProductId('');
  };

  const updateCartItem = (productId: string, key: 'quantity' | 'lineDiscount', value: number) => {
    setSaleCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, [key]: Math.max(value, 0) } : item))
    );
  };

  const removeCartItem = (productId: string) => {
    setSaleCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const printInvoice = async (saleId: string) => {
    try {
      const { data } = await api.get(`/sales/${saleId}/invoice`);
      const win = window.open('', '_blank');
      if (!win) return;

      const rows = data.items
        .map(
          (item: any) =>
            `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>₹${item.unitPrice.toFixed(2)}</td><td>₹${item.lineTotal.toFixed(2)}</td></tr>`
        )
        .join('');

      win.document.write(`
        <html><head><title>Invoice ${data.invoiceNumber}</title></head>
        <body>
          <h2>Invoice: ${data.invoiceNumber}</h2>
          <p><strong>Customer:</strong> ${data.customerName || 'Walk-in Customer'}</p>
          <p><strong>Date:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
          <table border="1" cellspacing="0" cellpadding="6" width="100%">
            <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p><strong>Sub Total:</strong> ₹${Number(data.subTotal).toFixed(2)}</p>
          <p><strong>Discount:</strong> ₹${Number(data.discount).toFixed(2)}</p>
          <p><strong>GST (${data.gstRate}%):</strong> ₹${Number(data.gstAmount).toFixed(2)}</p>
          <h3>Grand Total: ₹${Number(data.grandTotal).toFixed(2)}</h3>
        </body></html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch {
      setSalesError('Unable to fetch invoice for printing.');
    }
  };

  const handleCreateSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalesError('');
    setSalesNotice('');

    if (saleCart.length === 0) {
      setSalesError('Add at least one product to cart.');
      return;
    }
    if (!saleForm.createdBy) {
      setSalesError('createdBy is required.');
      return;
    }

    const payload = {
      customerName: saleForm.customerName,
      customerPhone: saleForm.customerPhone,
      discount: Number(saleForm.discount || 0),
      gstRate: Number(saleForm.gstRate || 0),
      paymentMethod: saleForm.paymentMethod,
      createdBy: saleForm.createdBy,
      notes: saleForm.notes,
      items: saleCart.map((item) => ({ productId: item.productId, quantity: item.quantity, lineDiscount: item.lineDiscount }))
    };

    try {
      const { data } = await api.post<Sale>('/sales', payload);
      setSalesNotice(`Sale created successfully. Invoice: ${data.invoiceNumber}`);
      resetSalesForm();
      await Promise.all([loadData(page, search, statusFilter, categoryFilter), loadSalesData()]);
    } catch (error: any) {
      setSalesError(error?.response?.data?.error || 'Unable to create sale.');
    }
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
        <button onClick={() => setTab('sales')} className={tab === 'sales' ? 'active' : ''}>Sales</button>
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
          <table><thead><tr><th>Name</th><th>Slug</th><th>Parent</th><th>Status</th><th>CreatedBy</th></tr></thead><tbody>{categories.map((c) => (<tr key={c._id}><td>{c.name}</td><td>{c.slug}</td><td>{parentLabel(c)}</td><td>{c.status}</td><td>{c.createdBy}</td></tr>))}</tbody></table>
        </section>
      )}

      {tab === 'sales' && (
        <section className="panel">
          <h2>Sales Management</h2>

          {dailySummary && (
            <div className="sales-summary-cards">
              <article><h4>Daily Sales</h4><p>₹{dailySummary.totalSales.toFixed(2)}</p></article>
              <article><h4>Orders</h4><p>{dailySummary.totalOrders}</p></article>
              <article><h4>GST Collected</h4><p>₹{dailySummary.totalGst.toFixed(2)}</p></article>
            </div>
          )}

          <form className="sale-cart-form" onSubmit={handleCreateSale}>
            <div className="cart-add-row">
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                <option value="">Select product to add</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>{product.name} ({product.sku}) - Stock {product.stock}</option>
                ))}
              </select>
              <button type="button" className="btn btn-light" onClick={addProductToCart}>Add to Cart</button>
            </div>

            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Line Discount</th><th>Line Total</th><th>Action</th></tr></thead>
              <tbody>
                {cartPreview.lineItems.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.product.name}</td>
                    <td><input type="number" min={1} value={item.quantity} onChange={(e) => updateCartItem(item.productId, 'quantity', Number(e.target.value || 1))} /></td>
                    <td><input type="number" min={0} step="0.01" value={item.lineDiscount} onChange={(e) => updateCartItem(item.productId, 'lineDiscount', Number(e.target.value || 0))} /></td>
                    <td>₹{item.lineTotal.toFixed(2)}</td>
                    <td><button type="button" className="btn btn-danger" onClick={() => removeCartItem(item.productId)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="form-grid">
              <label>Customer Name<input value={saleForm.customerName} onChange={(e) => setSaleForm((prev) => ({ ...prev, customerName: e.target.value }))} /></label>
              <label>Customer Phone<input value={saleForm.customerPhone} onChange={(e) => setSaleForm((prev) => ({ ...prev, customerPhone: e.target.value }))} /></label>
              <label>Discount<input type="number" min={0} step="0.01" value={saleForm.discount} onChange={(e) => setSaleForm((prev) => ({ ...prev, discount: e.target.value }))} /></label>
              <label>GST %<input type="number" min={0} step="0.01" value={saleForm.gstRate} onChange={(e) => setSaleForm((prev) => ({ ...prev, gstRate: e.target.value }))} /></label>
              <label>Payment Method<select value={saleForm.paymentMethod} onChange={(e) => setSaleForm((prev) => ({ ...prev, paymentMethod: e.target.value as 'cash' | 'upi' | 'card' }))}><option value="cash">cash</option><option value="upi">upi</option><option value="card">card</option></select></label>
              <label>Created By (User ID) *<input value={saleForm.createdBy} onChange={(e) => setSaleForm((prev) => ({ ...prev, createdBy: e.target.value }))} /></label>
              <label className="full-width">Notes<textarea value={saleForm.notes} onChange={(e) => setSaleForm((prev) => ({ ...prev, notes: e.target.value }))} /></label>
            </div>

            <div className="sale-totals">
              <p>Sub Total: ₹{cartPreview.subTotal.toFixed(2)}</p>
              <p>GST: ₹{cartPreview.gstAmount.toFixed(2)}</p>
              <h3>Grand Total: ₹{cartPreview.grandTotal.toFixed(2)}</h3>
            </div>

            <div className="form-actions"><button className="btn btn-primary" type="submit">Create Sale</button><button type="button" className="btn btn-light" onClick={resetSalesForm}>Clear</button></div>
          </form>

          {salesError && <p className="error-text">{salesError}</p>}
          {salesNotice && <p className="success-text">{salesNotice}</p>}

          <h3>Recent Sales</h3>
          <table>
            <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>GST</th><th>Total</th><th>Actions</th></tr></thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td>{sale.invoiceNumber}</td>
                  <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td>{sale.customerName}</td>
                  <td>{sale.paymentMethod}</td>
                  <td>₹{sale.gstAmount.toFixed(2)}</td>
                  <td>₹{sale.grandTotal.toFixed(2)}</td>
                  <td><button className="btn btn-light" type="button" onClick={() => printInvoice(sale._id)}>Print Invoice</button></td>
                </tr>
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
