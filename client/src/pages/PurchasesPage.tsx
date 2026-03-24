import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Product, ProductListResponse, Purchase, PurchaseListResponse } from '../types';

type DraftItem = {
  productId: string;
  quantity: string;
  costPrice: string;
};

function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [draftItem, setDraftItem] = useState<DraftItem>({ productId: '', quantity: '1', costPrice: '' });
  const [items, setItems] = useState<Array<{ product: Product; quantity: number; costPrice: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProducts = async () => {
    const response = await api.get<ProductListResponse>('/products', { params: { page: 1, limit: 100 } });
    setProducts(response.data.data);
  };

  const loadPurchases = async () => {
    const response = await api.get<PurchaseListResponse>('/purchases', { params: { page: 1, limit: 20 } });
    setPurchases(response.data.data);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadProducts(), loadPurchases()]);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load purchases module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItem = () => {
    setError('');
    const product = products.find((p) => p._id === draftItem.productId);
    const quantity = Number(draftItem.quantity);
    const costPrice = Number(draftItem.costPrice);

    if (!product) return setError('Please select a product.');
    if (!quantity || quantity < 1) return setError('Quantity must be at least 1.');
    if (Number.isNaN(costPrice) || costPrice < 0) return setError('Cost price must be a valid non-negative number.');

    setItems((prev) => {
      const existing = prev.find((row) => row.product._id === product._id);
      if (!existing) return [...prev, { product, quantity, costPrice }];
      return prev.map((row) =>
        row.product._id === product._id
          ? { ...row, quantity: row.quantity + quantity, costPrice }
          : row
      );
    });

    setDraftItem({ productId: '', quantity: '1', costPrice: '' });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
    [items]
  );

  const submitPurchase = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!supplierName.trim()) return setError('Supplier name is required.');
    if (items.length === 0) return setError('Add at least one item.');

    setLoading(true);
    try {
      await api.post('/purchases', {
        supplierName: supplierName.trim(),
        items: items.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          costPrice: item.costPrice
        }))
      });

      setNotice('Purchase created and stock updated successfully.');
      setSupplierName('');
      setItems([]);
      await Promise.all([loadPurchases(), loadProducts()]);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to create purchase.');
    } finally {
      setLoading(false);
    }
  };

  const itemProductName = (productId: Purchase['items'][number]['productId']) =>
    typeof productId === 'string' ? productId : `${productId.name} (${productId.sku})`;

  return (
    <main className="app">
      <header>
        <h1>Purchases</h1>
        <p>Record supplier purchases to increase stock automatically.</p>
      </header>

      {error && <p className="error-text">{error}</p>}
      {notice && <p className="success-text">{notice}</p>}

      <section className="purchases-layout">
        <article className="panel">
          <h2>Add Purchase</h2>

          <form onSubmit={submitPurchase} className="purchase-form">
            <label>
              Supplier Name *
              <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
            </label>

            <div className="purchase-item-row">
              <select value={draftItem.productId} onChange={(e) => setDraftItem((prev) => ({ ...prev, productId: e.target.value }))}>
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.sku}) - current stock {product.stock}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={draftItem.quantity}
                onChange={(e) => setDraftItem((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="Qty"
              />

              <input
                type="number"
                min={0}
                step="0.01"
                value={draftItem.costPrice}
                onChange={(e) => setDraftItem((prev) => ({ ...prev, costPrice: e.target.value }))}
                placeholder="Cost Price"
              />

              <button type="button" className="btn btn-light" onClick={addItem}>
                Add Item
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Line Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="muted">No items added yet.</td></tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.product._id}>
                      <td>{item.product.name} ({item.product.sku})</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.costPrice.toFixed(2)}</td>
                      <td>₹{(item.quantity * item.costPrice).toFixed(2)}</td>
                      <td>
                        <button type="button" className="btn btn-danger" onClick={() => removeItem(item.product._id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="purchase-actions">
              <p><strong>Total Purchase Amount:</strong> ₹{totalAmount.toFixed(2)}</p>
              <button type="submit" className="btn btn-primary" disabled={loading || items.length === 0}>
                {loading ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Purchase History</h2>
            <button type="button" className="btn btn-light" onClick={loadPurchases} disabled={loading}>Refresh</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr><td colSpan={5} className="muted">No purchases yet.</td></tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase._id}>
                    <td>{new Date(purchase.purchaseDate || purchase.createdAt || '').toLocaleString()}</td>
                    <td>{purchase.supplierName}</td>
                    <td>
                      <ul className="history-items-list">
                        {purchase.items.map((item, idx) => (
                          <li key={`${purchase._id}-${idx}`}>
                            {itemProductName(item.productId)} — {item.quantity} × ₹{item.costPrice.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>₹{purchase.totalAmount.toFixed(2)}</td>
                    <td>{purchase.createdBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}

export default PurchasesPage;
