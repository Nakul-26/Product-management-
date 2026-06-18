import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Category, Product, ProductListResponse } from '../types';

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
  status: 'active' | 'inactive';
};

const defaultForm: ProductFormState = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  price: '',
  costPrice: '',
  category: '',
  stock: '0',
  lowStockThreshold: '5',
  status: 'active'
};

const parseCategoryId = (category: Product['category']) => (typeof category === 'string' ? category : category?._id || '');
const parseCategoryName = (category: Product['category']) => (typeof category === 'string' ? category : category?.name || 'Unknown');

function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCategoryName = useMemo(
    () => categories.find((item) => item._id === form.category)?.name || '',
    [categories, form.category]
  );

  const fetchProducts = async () => {
    const response = await api.get<ProductListResponse>('/products', { params: { page: 1, limit: 50 } });
    setProducts(response.data.data);
  };

  const fetchCategories = async () => {
    const response = await api.get<Category[]>('/categories');
    setCategories(response.data);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchProducts(), fetchCategories()]);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load product page data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchProducts(), fetchCategories()]);
        
        const params = new URLSearchParams(window.location.search);
        const barcode = params.get('barcode');
        const editId = params.get('edit');
        
        if (editId) {
          const response = await api.get<Product>(`/products/${editId}`);
          handleEdit(response.data);
          setNotice(`Editing product: ${response.data.name}`);
        } else if (barcode) {
          setForm(prev => ({ ...prev, barcode }));
          setNotice(`Pre-filled barcode: ${barcode}`);
        }
      } catch (requestError: any) {
        setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load product page data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      description: form.description.trim(),
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      category: form.category,
      stock: Number(form.stock || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      status: form.status
    };

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setNotice('Product updated successfully.');
      } else {
        await api.post('/products', payload);
        setNotice('Product created successfully.');
      }
      resetForm();
      await fetchProducts();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to save product.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      description: product.description || '',
      price: String(product.price),
      costPrice: String(product.costPrice),
      category: parseCategoryId(product.category),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      status: product.status
    });
  };

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    setError('');
    setNotice('');
    try {
      await api.delete(`/products/${productId}`);
      setNotice('Product deleted successfully.');
      if (editingId === productId) resetForm();
      await fetchProducts();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to delete product.');
    }
  };

  return (
    <div className="products-page-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Product Management</h1>
        <p>Maintain your inventory with detailed tracking and low-stock alerts.</p>
      </header>

      {categories.length === 0 && !loading && (
        <div style={{ padding: '1rem', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#f97316', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'grid', placeItems: 'center', fontWeight: 800 }}>!</div>
          <p style={{ margin: 0, color: '#9a3412', fontSize: '0.9rem' }}>
            No categories found. You need to 
            <button
              type="button"
              className="btn btn-outline"
              style={{ margin: '0 0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              onClick={() => {
                window.history.pushState({}, '', '/categories');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              Create a category
            </button> 
            first before you can add products.
          </p>
        </div>
      )}

      {error && <p className="error-text" style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '1.5rem' }}>{error}</p>}
      {notice && <p className="success-text" style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '1.5rem' }}>{notice}</p>}

      <div className="purchases-layout" style={{ gridTemplateColumns: '1fr 400px' }}>
        <section className="panel">
          <div className="panel-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>All Products</h2>
            <button type="button" className="btn btn-light" onClick={loadData} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="table-container mobile-stack-table" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Pricing</th>
                  <th>Inventory</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>
                      No products in your inventory.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product._id}>
                      <td data-label="Product Details">
                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>SKU: {product.sku || 'N/A'}</div>
                      </td>
                      <td data-label="Category">
                        <span className="status-pill" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>
                          {parseCategoryName(product.category)}
                        </span>
                      </td>
                      <td data-label="Pricing">
                        <div style={{ fontWeight: 700 }}>₹{product.price.toFixed(0)}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>Cost: ₹{product.costPrice.toFixed(0)}</div>
                      </td>
                      <td data-label="Inventory">
                        <div style={{ fontWeight: 600, color: product.stock <= product.lowStockThreshold ? 'var(--color-danger)' : 'inherit' }}>
                          {product.stock} units
                        </div>
                        {product.stock <= product.lowStockThreshold && (
                          <div className="warning" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            LOW STOCK
                          </div>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className={`status-pill ${product.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                          {product.status}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <div className="action-row" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-light" onClick={() => handleEdit(product)} style={{ padding: '0.4rem' }} title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button type="button" className="btn btn-light" onClick={() => handleDelete(product._id)} style={{ padding: '0.4rem', color: 'var(--color-danger)' }} title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel" style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>

          <form className="login-form" onSubmit={handleSubmit} style={{ gap: '0.875rem' }}>
            <label>
              Product Name *
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required placeholder="e.g. Wireless Mouse" />
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                SKU (optional)
                <input value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} placeholder="MOUSE-01" />
              </label>
              <label>
                Barcode
                <input value={form.barcode} onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))} placeholder="12345678" />
              </label>
            </div>

            <label>
              Category *
              <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Selling Price (₹) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  required
                />
              </label>
              <label>
                Cost Price (₹) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Current Stock
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                />
              </label>
              <label>
                Low Threshold
                <input
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))}
                />
              </label>
            </div>

            <label>
              Status
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label>
              Description
              <textarea 
                value={form.description} 
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} 
                style={{ minHeight: '80px' }}
                placeholder="Brief product description..."
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={loading || categories.length === 0}>
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-light" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default ProductManagementPage;
