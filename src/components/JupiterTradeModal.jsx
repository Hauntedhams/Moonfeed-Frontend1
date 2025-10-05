import React, { useEffect, useRef, useState } from 'react';
import './JupiterTradeModal.css';

const JupiterTradeModal = ({ isOpen, onClose, coin, onSwapSuccess, onSwapError }) => {
  const containerRef = useRef(null);
  const jupiterInitialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && coin) {
      // Check if Jupiter is available, if not wait for it
      if (window.Jupiter && !jupiterInitialized.current) {
        initializeJupiter();
      } else if (!window.Jupiter) {
        // Wait for Jupiter to load
        const checkJupiter = setInterval(() => {
          if (window.Jupiter && !jupiterInitialized.current) {
            clearInterval(checkJupiter);
            initializeJupiter();
          }
        }, 100);
        
        // Timeout after 5 seconds
        const timeout = setTimeout(() => {
          clearInterval(checkJupiter);
          setError('Jupiter failed to load. Please refresh the page.');
          setIsLoading(false);
        }, 5000);
        
        return () => {
          clearInterval(checkJupiter);
          clearTimeout(timeout);
        };
      }
    }
    
    // Reset when modal closes
    if (!isOpen && jupiterInitialized.current) {
      jupiterInitialized.current = false;
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, coin]);

  const initializeJupiter = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate coin data
      if (!coin?.mintAddress) {
        throw new Error('Invalid coin data: missing mint address');
      }
      
      console.log('🪐 Initializing Jupiter for coin:', coin.symbol, coin.mintAddress);
      
      // Wait for Jupiter to be available
      if (!window.Jupiter) {
        throw new Error('Jupiter not loaded yet');
      }
      
      // Clear any existing Jupiter instance quickly
      if (window.Jupiter._instance) {
        try {
          window.Jupiter.close();
        } catch (closeError) {
          console.warn('Warning closing previous Jupiter instance:', closeError);
        }
      }

      // Initialize Jupiter Terminal v4
      window.Jupiter.init({
        displayMode: "integrated",
        integratedTargetId: "jupiter-container",
        endpoint: "https://api.mainnet-beta.solana.com",
        defaultExplorer: "Solscan",
        
        formProps: {
          // Set the coin as the output token (what user wants to buy)
          initialOutputMint: coin.mintAddress,
          // Default input to SOL
          initialInputMint: "So11111111111111111111111111111111111111112", // SOL
          swapMode: "ExactIn",
          initialSlippageBps: 100, // 1% slippage (reduced from 0.5% for better execution)
          fixedInputMint: false,
          fixedOutputMint: false,
          // Show detailed swap information
          showQuoteDetails: true,
          showPriceImpact: true,
        },

        // Terminal v4 specific settings
        strictTokenList: false,
        
        // No platform fee for testing
        // platformFeeAndAccounts: {
        //   referralAccount: "42DqmQMZrVeZkP2Btj2cS96Ej81jVxFqwUZWazVvhUPt",
        //   feeBps: 10, // 0.1% fee (reduced from 0.5%)
        // },

        // Styling to match your app
        containerStyles: {
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          backgroundColor: 'rgba(16, 23, 31, 0.95)',
          backdropFilter: 'blur(20px)',
        },

        // Callbacks
        onSuccess: ({ txid, swapResult }) => {
          console.log('🎉 Swap successful!', { txid, swapResult });
          if (onSwapSuccess) {
            onSwapSuccess({ txid, swapResult, coin });
          }
        },

        onError: ({ error }) => {
          console.error('❌ Swap failed:', error);
          if (onSwapError) {
            onSwapError({ error, coin });
          }
        },

        onFormUpdate: (form) => {
          console.log('📝 Form updated:', form);
        },

        onScreenUpdate: (screen) => {
          console.log('📱 Screen updated:', screen);
          // Hide loading immediately when Jupiter renders anything
          if (screen) {
            setIsLoading(false);
            // Inject scrollbar-hiding styles after Jupiter renders
            setTimeout(() => {
              injectScrollbarStyles();
            }, 100);
          }
        },

        // Branding
        branding: {
          logoUri: '/favicon-32x32.png',
          name: 'Moonfeed',
        },
      });

      jupiterInitialized.current = true;
      
      // Inject scrollbar-hiding styles immediately after initialization
      injectScrollbarStyles();
      
      // Set a backup timeout to hide loading if onScreenUpdate doesn't fire
      setTimeout(() => {
        setIsLoading(false);
        injectScrollbarStyles(); // Ensure styles are applied
      }, 1000);
      
    } catch (err) {
      console.error('Failed to initialize Jupiter:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Function to inject scrollbar-hiding styles
  const injectScrollbarStyles = () => {
    const styleId = 'jupiter-scrollbar-hide';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #jupiter-container *::-webkit-scrollbar { display: none !important; width: 0 !important; }
        #jupiter-container * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `;
      document.head.appendChild(style);
    }
  };

  const handleClose = () => {
    try {
      if (window.Jupiter) {
        window.Jupiter.close();
      }
      jupiterInitialized.current = false;
      setIsLoading(true);
      setError(null);
      onClose();
    } catch (err) {
      console.error('Error closing Jupiter:', err);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="jupiter-modal-overlay" onClick={handleClose}>
      <div className="jupiter-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="jupiter-modal-header">
          <div className="coin-info">
            <img 
              src={coin?.image || '/default-coin.svg'} 
              alt={coin?.symbol || 'Coin'} 
              className="coin-image"
              onError={(e) => {
                e.target.src = '/default-coin.svg';
              }}
            />
            <div>
              <h3>{coin?.name || 'Unknown Token'}</h3>
              <p className="coin-symbol">{coin?.symbol || 'N/A'}</p>
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Jupiter Widget Container */}
        <div className="jupiter-widget-wrapper">
          {isLoading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading Jupiter Swap...</p>
            </div>
          )}
          
          {error && (
            <div className="error-state">
              <p>Failed to load Jupiter Swap</p>
              <p className="error-message">{error}</p>
              <button onClick={initializeJupiter} className="retry-button">
                Retry
              </button>
            </div>
          )}
          
          <div 
            id="jupiter-container" 
            ref={containerRef}
            style={{ 
              width: '100%', 
              height: '640px', // Increased height to show price impact and route details
              minHeight: '640px',
              opacity: isLoading || error ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}
          />
        </div>

        {/* Footer Info */}
        <div className="jupiter-modal-footer">
          <p className="powered-by">Powered by Jupiter</p>
          <p className="disclaimer">
            Trading involves risk. Please trade responsibly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JupiterTradeModal;
