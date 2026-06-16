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
  const scanCandidateRef = useRef<string | null>(null);
  const scanCountRef = useRef(0);
  const SCAN_THRESHOLD = 3;

  const isTransitioningRef = useRef(false);

  const startScanner = async () => {
    if (isTransitioningRef.current) return;
    
    try {
      isTransitioningRef.current = true;
      setError('');
      setNotice('');

      // Browser security check: Camera access requires HTTPS or localhost
      if (!window.isSecureContext) {
        setError('Camera access requires a secure connection (HTTPS).');
        isTransitioningRef.current = false;
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('reader');
      }

      if (html5QrCodeRef.current.isScanning) {
        isTransitioningRef.current = false;
        return;
      }

      setIsCameraActive(true);
      scanCandidateRef.current = null;
      scanCountRef.current = 0;

      const config = { 
        fps: 20, 
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        disableFlip: false
      };

      // Try environment camera first
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        onScanSuccess,
        onScanFailure
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      let userMessage = 'Unable to start camera. Please ensure no other app is using it and try again.';
      
      // html5-qrcode wraps the error in a string sometimes, or it could be an Error object
      const errorString = String(err).toLowerCase();
      
      if (
        errorString.includes('notallowederror') || 
        errorString.includes('permission denied') ||
        errorString.includes('permission dismissed') ||
        err.name === 'NotAllowedError'
      ) {
        userMessage = 'Camera blocked. Please click the padlock icon (🔒) in your address bar and allow camera access.';
      } else if (
        errorString.includes('notfounderror') || 
        errorString.includes('devicesnotfound') ||
        err.name === 'NotFoundError'
      ) {
        userMessage = 'No camera device found on this device.';
      }

      setError(userMessage);
      setIsCameraActive(false);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (isTransitioningRef.current) return;
    if (html5QrCodeRef.current) {
      try {
        isTransitioningRef.current = true;
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear(); // Fully clear the instance from the DOM
        setIsCameraActive(false);
      } catch (err) {
        console.error('Failed to stop camera', err);
      } finally {
        html5QrCodeRef.current = null; // Reset the ref so it initializes cleanly next time
        isTransitioningRef.current = false;
      }
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      // Use void to handle the async cleanup without returning a promise to useEffect
      void stopScanner();
      
      // Fallback: If navigating away, forcefully remove any lingering video elements
      // html5-qrcode sometimes leaves stream tracks open in single-page apps
      const readerElement = document.getElementById('reader');
      if (readerElement) {
        readerElement.innerHTML = '';
      }
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    const trimmedText = decodedText.trim();
    
    // Consensus logic: require SCAN_THRESHOLD identical consecutive reads
    if (trimmedText === scanCandidateRef.current) {
      scanCountRef.current++;
    } else {
      scanCandidateRef.current = trimmedText;
      scanCountRef.current = 1;
      return; // Wait for more reads of this new candidate
    }

    if (scanCountRef.current < SCAN_THRESHOLD) {
      return; // Not confident enough yet
    }

    // Immediately stop the camera hardware once confident
    await stopScanner();
    
    setScanResult(trimmedText);
    setLoading(true);
    setProduct(null);
    setQuantity(1);

    try {
      const response = await api.get<ProductListResponse>('/products', {
        params: { barcode: trimmedText }
      });

      const found = response.data.data.find(p => p.barcode === trimmedText);
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

  const handleEditProduct = () => {
    if (product) {
      const url = `/products?edit=${product._id}`;
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleStockPurchase = () => {
    if (product) {
      const url = `/purchases?productId=${product._id}`;
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleStockAdjustment = () => {
    if (product) {
      const url = `/stock-adjustments?productId=${product._id}`;
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
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
                <p><strong>Stock:</strong> <span className={product.stock <= 0 ? 'error-text' : ''}>{product.stock}</span></p>
                
                {product.stock > 0 ? (
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
                ) : (
                  <p className="warning-text" style={{ margin: '15px 0' }}>Product is out of stock. Please update stock to add to cart.</p>
                )}

                <div className="scanner-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {product.stock > 0 && (
                    <button className="btn btn-primary" onClick={handleAddToCart}>
                      Add to Cart
                    </button>
                  )}
                  <button className="btn btn-light" onClick={handleStockPurchase}>
                    Stock Purchase
                  </button>
                  <button className="btn btn-light" onClick={handleStockAdjustment}>
                    Stock Adjustment
                  </button>
                  <button className="btn btn-light" onClick={handleEditProduct}>
                    Edit Product Info
                  </button>
                </div>
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
