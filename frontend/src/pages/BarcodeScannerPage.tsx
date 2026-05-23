import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/api';
import { Product, ProductListResponse } from '../types';
import { useCart } from '../context/CartContext';

function BarcodeScannerPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { addToCart } = useCart();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'reader',
      { 
        fps: 20, 
        qrbox: { width: 300, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    // If we already have a result and are loading/showing product, ignore new scans
    if (scanResult || loading) return; 
    
    setScanResult(decodedText);
    setLoading(true);
    setError('');
    setNotice('');
    setProduct(null);
    setQuantity(1);

    // Pause the scanner to prevent "flickering" while we process the result
    if (scannerRef.current) {
      // Note: Html5QrcodeScanner doesn't have a simple 'pause', 
      // but by checking scanResult above, we effectively ignore new frames.
    }

    try {
      const response = await api.get<ProductListResponse>('/products', {
        params: { barcode: decodedText }
      });

      const found = response.data.data.find(p => p.barcode === decodedText);
      if (found) {
        setProduct(found);
      } else {
        setError('Product not found in database.');
      }
    } catch (err: any) {
      setError('Failed to check product. ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  function onScanFailure(error: any) {
    // Console is too noisy with scan failures (normal behavior)
    // console.warn(`Code scan error = ${error}`);
  }

  const handleAddToCart = () => {
    if (product) {
      const result = addToCart(product, quantity);
      if (result.success) {
        setNotice(`Added ${quantity} x ${product.name} to cart.`);
        setProduct(null);
        setScanResult(null);
        setQuantity(1);
      } else {
        setError(result.error || 'Failed to add to cart.');
      }
    }
  };

  const handleCreateProduct = () => {
    // Navigate to products page with barcode in state/URL
    const url = `/products?barcode=${scanResult}`;
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const resetScanner = () => {
    setScanResult(null);
    setProduct(null);
    setQuantity(1);
    setError('');
    setNotice('');
  };

  return (
    <main className="app">
      <header>
        <h1>Barcode Scanner</h1>
        <p>Scan product barcodes using your camera.</p>
      </header>

      <div className="scanner-container">
        <div id="reader" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}></div>
        
        {loading && <p>Searching for product...</p>}
        {error && <p className="error-text">{error}</p>}
        {notice && <p className="success-text">{notice}</p>}

        {scanResult && !loading && (
          <div className="panel" style={{ marginTop: '20px' }}>
            <h3>Scanned Barcode: {scanResult}</h3>
            
            {product ? (
              <div className="product-info">
                <p><strong>Name:</strong> {product.name}</p>
                <p><strong>Price:</strong> ₹{product.price.toFixed(2)}</p>
                <p><strong>Stock:</strong> {product.stock}</p>
                
                <div style={{ margin: '15px 0' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Quantity:</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={product.stock} 
                    value={quantity} 
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    style={{ padding: '8px', width: '80px', fontSize: '16px' }}
                  />
                </div>

                <button className="btn btn-primary" onClick={handleAddToCart}>
                  Add to Cart
                </button>
              </div>
            ) : (
              <div className="scanner-actions">
                <p>No product found with this barcode.</p>
                <button className="btn btn-primary" onClick={handleCreateProduct}>
                  Create New Product
                </button>
              </div>
            )}
            
            <button className="btn btn-light" style={{ marginTop: '10px' }} onClick={resetScanner}>
              Scan Again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default BarcodeScannerPage;
