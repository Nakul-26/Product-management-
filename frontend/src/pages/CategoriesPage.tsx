import { FormEvent, useEffect, useState } from 'react';
import api from '../api/api';
import { Category } from '../types';

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  parent: string;
  status: 'active' | 'inactive';
};

const defaultForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  parent: '',
  status: 'active'
};

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get<Category[]>('/categories');
      setCategories(response.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const payload = {
      ...form,
      parent: form.parent || null
    };

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        setNotice('Category updated successfully.');
      } else {
        await api.post('/categories', payload);
        setNotice('Category created successfully.');
      }
      resetForm();
      await fetchCategories();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to save category.');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category._id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent: typeof category.parent === 'string' ? category.parent : category.parent?._id || '',
      status: category.status
    });
  };

  return (
    <div className="categories-page-wrapper">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Product Categories</h1>
        <p>Organize your inventory with a structured hierarchy.</p>
      </header>

      {error && <p className="error-text" style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '1.5rem' }}>{error}</p>}
      {notice && <p className="success-text" style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '1.5rem' }}>{notice}</p>}

      <div className="purchases-layout" style={{ gridTemplateColumns: '1fr 380px' }}>
        <section className="panel">
          <div className="panel-header">
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Category List</h2>
            <button type="button" className="btn btn-light" onClick={fetchCategories} disabled={loading} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="table-container mobile-stack-table" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Category Info</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '3rem' }}>
                      No categories found. Start by adding one.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category._id}>
                      <td data-label="Category Info">
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{category.name}</div>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>/{category.slug}</div>
                      </td>
                      <td data-label="Parent">
                        {typeof category.parent === 'object' ? (
                          <span className="status-pill" style={{ background: '#f1f5f9', color: '#475569' }}>
                            {category.parent?.name}
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className={`status-pill ${category.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                          {category.status}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <button type="button" className="btn btn-light" onClick={() => handleEdit(category)} style={{ padding: '0.4rem 0.6rem' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </button>
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
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h2>
          
          <form className="login-form" onSubmit={handleSubmit} style={{ gap: '1rem' }}>
            <label>
              Category Name
              <input 
                value={form.name} 
                onChange={(e) => handleNameChange(e.target.value)} 
                placeholder="e.g. Electronics"
                required 
              />
            </label>
            
            <label>
              Slug (URL friendly)
              <input 
                value={form.slug} 
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} 
                placeholder="electronics"
                required 
              />
            </label>
            
            <label>
              Parent Category
              <select value={form.parent} onChange={(e) => setForm((prev) => ({ ...prev, parent: e.target.value }))}>
                <option value="">None (Top Level)</option>
                {categories
                  .filter((c) => c._id !== editingId)
                  .map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            
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
                placeholder="Optional category description..."
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '0.75rem' }}>
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-outline" onClick={resetForm} style={{ padding: '0.75rem' }}>
                Cancel
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default CategoriesPage;
