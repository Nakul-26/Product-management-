import { useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Product, ProductListResponse } from '../types';

type CartItem = {
  product: Product;
  quantity: number;
};

function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [discount, setDiscount] = useState('0');
  const [gstRate, setGstRate] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    const response = await api.get<ProductListResponse>('/products', { params: { page: 1, limit: 100 } });
    setProducts(response.data.data.filter((item) => item.status === 'active'));
  };

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .catch((requestError: any) => {
        setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load products.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.barcode || '').toLowerCase().includes(term)
    );
  }, [products, search]);

  const addToCart = (product: Product) => {
    setError('');
    setNotice('');

    if (product.stock <= 0) {
      setError(`${product.name} is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (!existing) return [...prev, { product, quantity: 1 }];
      const nextQty = Math.min(existing.quantity + 1, product.stock);
      return prev.map((item) => (item.product._id === product._id ? { ...item, quantity: nextQty } : item));
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product._id !== productId) return item;
        return { ...item, quantity: Math.min(quantity, item.product.stock) };
      })
    );
  };

  const subTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const discountAmount = Math.max(Number(discount || 0), 0);
  const taxable = Math.max(subTotal - discountAmount, 0);
  const gstAmount = (taxable * Math.max(Number(gstRate || 0), 0)) / 100;
  const grandTotal = taxable + gstAmount;

  const resetAfterSale = () => {
    setCart([]);
    setDiscount('0');
    setGstRate('0');
    setCustomerName('');
    setCustomerPhone('');
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      setError('Add at least one product to cart.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      await api.post('/sales', {
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          lineDiscount: 0,
          price: item.product.price
        })),
        paymentMethod,
        discount: discountAmount,
        gstRate: Number(gstRate || 0),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined
      });

      setNotice('Sale completed successfully.');
      resetAfterSale();
      await fetchProducts();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to complete sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <header>
        <h1>Sales POS</h1>
        <p>Fast billing with real-time cart totals.</p>
      </header>

      {error && <p className="error-text">{error}</p>}
      {notice && <p className="success-text">{notice}</p>}

      <section className="sales-container">
        <article className="panel">
          <div className="panel-header">
            <h2>Products</h2>
            <button type="button" className="btn btn-light" onClick={fetchProducts} disabled={loading}>
              Refresh
            </button>
          </div>

          <input
            className="sales-search"
            placeholder="Search by name, SKU, barcode"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                className="product-card"
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
              >
                <strong>{product.name}</strong>
                <span>SKU: {product.sku}</span>
                <span>₹{product.price.toFixed(2)}</span>
                <span className={product.stock <= product.lowStockThreshold ? 'warning' : 'muted'}>
                  Stock: {product.stock}
                </span>
              </button>
            ))}

            {!loading && filteredProducts.length === 0 && <p className="muted">No matching products found.</p>}
          </div>
        </article>

        <aside className="panel sales-cart-panel">
          <h2>Cart & Billing</h2>

          <div className="cart-list">
            {cart.length === 0 ? (
              <p className="muted">No items in cart.</p>
            ) : (
              cart.map((item) => (
                <div key={item.product._id} className="cart-item">
                  <div>
                    <strong>{item.product.name}</strong>
                    <p className="muted">₹{item.product.price.toFixed(2)} each</p>
                  </div>

                  <div className="cart-controls">
                    <input
                      type="number"
                      min={1}
                      max={item.product.stock}
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.product._id, Number(event.target.value || 1))}
                    />
                    <button type="button" className="btn btn-danger" onClick={() => removeFromCart(item.product._id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bill-form">
            <label>
              Discount
              <input type="number" min={0} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
            </label>

            <label>
              GST %
              <input type="number" min={0} step="0.01" value={gstRate} onChange={(event) => setGstRate(event.target.value)} />
            </label>

            <label>
              Customer Name
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </label>

            <label>
              Customer Phone
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
            </label>

            <label>
              Payment Method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'cash' | 'upi' | 'card')}>
                <option value="cash">cash</option>
                <option value="upi">upi</option>
                <option value="card">card</option>
              </select>
            </label>
          </div>

          <div className="sale-totals">
            <p>Subtotal: ₹{subTotal.toFixed(2)}</p>
            <p>Discount: ₹{discountAmount.toFixed(2)}</p>
            <p>GST: ₹{gstAmount.toFixed(2)}</p>
            <h3>Total: ₹{grandTotal.toFixed(2)}</h3>
          </div>

          <button type="button" className="btn btn-primary complete-sale-btn" onClick={completeSale} disabled={loading || cart.length === 0}>
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </aside>
      </section>
    </main>
  );
}

export default SalesPage;
