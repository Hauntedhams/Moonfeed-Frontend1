import React, { useState, useEffect, useRef } from 'react';

const DexScreenerChart = ({ coin, isPreview = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef(null);
  const timeoutRef = useRef(null);

  // Optimize the URL for faster loading with full chart visibility
  // Always load live data regardless of preview mode
  const chartUrl = `https://dexscreener.com/${coin.chainId}/${coin.pairAddress || coin.tokenAddress}?embed=1&theme=dark&trades=0&info=0&interval=5m&chart=1&header=0&utm_source=moonfeed&utm_medium=embed&layout=base`;

  useEffect(() => {
    // Preload the iframe URL to warm up the connection
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = chartUrl;
    link.as = 'document';
    document.head.appendChild(link);

    // Set a timeout to show error if chart doesn't load within 8 seconds
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Clean up preload link
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, [chartUrl, isLoading]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Apply optimizations to the iframe content
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Inject CSS to optimize the layout and hide unnecessary elements
        const style = doc.createElement('style');
        style.innerHTML = `
          /* Performance optimizations */
          * {
            will-change: auto !important;
          }
          
          /* Hide unnecessary elements for faster rendering */
          [data-testid="layout-sidebar"], 
          .sidebar,
          [class*="sidebar"]:not([class*="main"]):not([class*="right"]),
          .left-panel,
          [class*="left-panel"],
          .trading-panel,
          [class*="trading-panel"],
          [data-testid="layout-footer"],
          .footer,
          [class*="footer"]:not([class*="main"]):not([class*="header"]),
          .bottom-panel,
          [class*="bottom-panel"],
          .trading-footer,
          [class*="trading-footer"],
          .toolbar,
          [class*="toolbar"]:not([class*="top"]):not([class*="header"]),
          .ads,
          [class*="advertisement"],
          [class*="promo"],
          .header,
          [class*="header"]:not([class*="chart"]),
          .top-bar,
          [class*="top-bar"] {
            display: none !important;
          }
          
          /* Maximize chart container for full-width display */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          
          .chart-area,
          .main-chart,
          [class*="chart-container"],
          [class*="chart-wrapper"],
          [class*="chart-content"],
          .tv-chart,
          [class*="tv-chart"] {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            position: relative !important;
          }
          
          /* Hide loading overlays that might persist */
          .loading-overlay,
          [class*="loading"]:not([class*="chart"]),
          .spinner:not([class*="chart"]) {
            display: none !important;
          }
          
          /* Optimize canvas and SVG elements for full width */
          canvas, svg {
            image-rendering: optimizeSpeed !important;
            shape-rendering: optimizeSpeed !important;
            width: 100% !important;
            max-width: none !important;
          }
          
          /* Remove any constraints that might limit chart width */
          [style*="max-width"] {
            max-width: none !important;
          }
        `;
        doc.head.appendChild(style);

        // Also try to speed up loading by disabling some features
        const optimizeScript = doc.createElement('script');
        optimizeScript.innerHTML = `
          // Disable animations for faster loading
          if (window.TradingView) {
            window.TradingView.onChartReady = function() {
              console.log('Chart ready - optimized for Moonfeed');
            };
          }
        `;
        doc.head.appendChild(optimizeScript);
      } catch (err) {
        console.log('Could not access iframe content (CORS restriction):', err);
      }
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const retry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryCount(prev => prev + 1);
  };

  if (hasError) {
    return (
      <div style={{ 
        height: '100%', 
        minHeight: '320px',
        background: 'rgba(0, 0, 0, 0.04)', 
        borderRadius: '14px',
        marginLeft: '0px',
        marginRight: '0px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'calc(100% + 40px)',
        marginLeft: '-20px',
        marginRight: '-20px'
      }}>
        <div className="text-center p-4">
          <div style={{ color: '#ef4444', marginBottom: '8px', fontSize: '24px' }}>⚠️</div>
          <p style={{ color: 'rgba(0, 0, 0, 0.7)', marginBottom: '12px', fontSize: '0.9rem' }}>Chart failed to load</p>
          <button 
            onClick={retry}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              fontSize: '0.8rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              marginBottom: '8px'
            }}
            onMouseOver={e => e.target.style.background = '#2563eb'}
            onMouseOut={e => e.target.style.background = '#3b82f6'}
          >
            Retry
          </button>
          <div>
            <button 
              onClick={() => window.open(`https://dexscreener.com/${coin.chainId}/${coin.pairAddress || coin.tokenAddress}`, '_blank')}
              style={{
                color: '#3b82f6',
                fontSize: '0.8rem',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Open in DexScreener
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%', /* Changed from calc(100% + 40px) to prevent overflow */
      height: '100%',
      minHeight: isPreview ? '150px' : '320px',
      background: 'transparent',
      overflow: 'hidden', /* Changed from visible to hidden to prevent bleeding */
      margin: 0 /* Removed negative margins that cause bleeding */
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0, /* Changed from '20px' since we removed negative margins */
          right: 0, /* Changed from '20px' since we removed negative margins */
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.04)',
          borderRadius: '14px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20
        }}>
          <div className="text-center">
            <div style={{
              width: '32px',
              height: '32px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px'
            }}></div>
            <p style={{ color: 'rgba(0, 0, 0, 0.7)', fontSize: '0.9rem', marginBottom: '4px' }}>Loading chart...</p>
            <p style={{ color: 'rgba(0, 0, 0, 0.5)', fontSize: '0.8rem' }}>This may take a few seconds</p>
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        key={`${coin.tokenAddress}-${retryCount}`} // Force reload on retry
        src={chartUrl}
        className="w-full h-full border-0"
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%',
          minHeight: isPreview ? '150px' : '320px',
          borderRadius: '0',
          overflow: 'visible',
          border: 'none',
          margin: 0,
          padding: 0,
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
          pointerEvents: isPreview ? 'none' : 'auto'
        }}
        title={`${coin.symbol} Chart`}
        allow="fullscreen"
        loading="eager"
        frameBorder="0"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    </div>
  );
};

export default DexScreenerChart;
