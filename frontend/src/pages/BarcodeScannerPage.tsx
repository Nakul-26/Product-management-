import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { addToCart } = useCart();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('reader');
      }

      if (html5QrCodeRef.current.isScanning) {
        return;
      }

      setIsCameraActive(true);
      setError('');
      setNotice('');

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { 
          fps: 20, 
          qrbox: { width: 300, height: 250 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        onScanFailure
      );
    } catch (err: any) {
      setError('Failed to start camera. ' + err.message);
      setIsCameraActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error('Failed to stop camera', err);
      }
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    // Immediately stop the camera hardware
    await stopScanner();
    
    setScanResult(decodedText);
    setLoading(true);
    setProduct(null);
    setQuantity(1);

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
    // Expected behavior, don't show errors
  }

  const handleAddToCart = () => {
    if (product) {
      const result = addToCart(product, quantity);
      if (result.success) {
        setNotice(`Added ${quantity} x ${product.name} to cart.`);
        setProduct(null);
        setScanResult(null);
        setQuantity(1);
        // Start scanner again for next item
        startScanner();
      } else {
        setError(result.error || 'Failed to add to cart.');
      }
    }
  };

  const handleCreateProduct = () => {
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
    startScanner();
  };

  return (
    <main className="app">
      <header>
        <h1>Barcode Scanner</h1>
        <p>Scan product barcodes using your camera.</p>
      </header>

      <div className="scanner-container">
        {/* Status Area - Managed by React */}
        <div style={{ textAlign: 'center', marginBottom: '20px', minHeight: '50px' }}>
          {!isCameraActive && !scanResult && !loading && (
            <div>
              <p className="muted" style={{ marginBottom: '10px' }}>Camera is off.</p>
              <button className="btn btn-primary" onClick={startScanner}>Start Camera</button>
            </div>
          )}
          {!isCameraActive && scanResult && <p className="success-text" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>✓ Scanned Successfully!</p>}
          {loading && <p>Searching database...</p>}
          {error && <p className="error-text">{error}</p>}
          {notice && <p className="success-text">{notice}</p>}
        </div>

        {/* Scanner Target - Managed EXCLUSIVELY by Html5Qrcode. 
            Keep this div empty in JSX so React never touches its children. */}
        <div 
          id="reader" 
          style={{ 
            width: '100%', 
            maxWidth: '600px', 
            margin: '0 auto', 
            background: '#f3f4f6',
            borderRadius: '12px',
            overflow: 'hidden',
            display: isCameraActive ? 'block' : 'none'
          }}
        ></div>

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
