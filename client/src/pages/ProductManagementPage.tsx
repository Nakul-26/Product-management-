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
    loadData();
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
    <main className="app">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h1>Product Management</h1>
            <p className="muted">Add, view, edit, and delete products.</p>
          </div>
          <button type="button" className="btn btn-light" onClick={loadData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {categories.length === 0 && !loading && (
          <p className="warning">No categories found. Create a category first to add products.</p>
        )}

        {error && <p className="error-text">{error}</p>}
        {notice && <p className="success-text">{notice}</p>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Name *
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </label>
          <label>
            SKU (optional)
            <input value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} />
          </label>
          <label>
            Barcode
            <input value={form.barcode} onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))} />
          </label>
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
          <label>
            Price *
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
            Cost Price *
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))}
              required
            />
          </label>
          <label>
            Stock
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
            />
          </label>
          <label>
            Low Stock Threshold
            <input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={(e) => setForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <label className="full-width">
            Description
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </label>

          <div className="full-width form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading || categories.length === 0}>
              {editingId ? 'Update Product' : 'Add Product'}
            </button>
            <button type="button" className="btn btn-light" onClick={resetForm}>
              Clear
            </button>
          </div>
        </form>

        {selectedCategoryName && <p className="muted">Selected category: {selectedCategoryName}</p>}

        <h2>Products</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <strong>{product.name}</strong>
                    {product.description && <div className="muted">{product.description}</div>}
                  </td>
                  <td>{product.sku}</td>
                  <td>{parseCategoryName(product.category)}</td>
                  <td>₹{product.price.toFixed(2)}</td>
                  <td>
                    {product.stock}
                    {product.stock <= product.lowStockThreshold && <span className="warning"> (Low)</span>}
                  </td>
                  <td>{product.status}</td>
                  <td>
                    <div className="action-row">
                      <button type="button" className="btn btn-light" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => handleDelete(product._id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default ProductManagementPage;
