import React, { useEffect, useRef, useState } from 'react';
import './JupiterEmbedModal.css';

const JupiterEmbedModal = ({ selectedCoin, onClose, visible }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!visible || !selectedCoin) return;

    const initializeJupiter = async () => {
      try {
        setIsLoading(true);

        // Clear any existing Jupiter instance
        if (window.Jupiter && window.Jupiter.close) {
          window.Jupiter.close();
        }

        // Load Jupiter Plugin script if not already loaded
        if (!window.Jupiter || !window.Jupiter.init) {
          await loadJupiterScript();
        }

        // Wait a bit for the script to fully initialize
        await new Promise(resolve => setTimeout(resolve, 200));

        if (window.Jupiter && window.Jupiter.init) {
          // Clear the container
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }

          // Get the token mint address (CA) with improved fallback
          // Priority order: tokenAddress (main), mint, ca, address, id (pair address)
          const outputMint = selectedCoin.tokenAddress || 
                             selectedCoin.mint || 
                             selectedCoin.ca || 
                             selectedCoin.address ||
                             selectedCoin.baseToken?.address ||  // Dexscreener pair format
                             selectedCoin.id;
          
          console.log('Jupiter Embed - Coin Prefill Data:', {
            selectedCoin: {
              name: selectedCoin.name,
              symbol: selectedCoin.symbol,
              tokenAddress: selectedCoin.tokenAddress,
              mint: selectedCoin.mint,
              ca: selectedCoin.ca,
              address: selectedCoin.address,
              baseTokenAddress: selectedCoin.baseToken?.address,
              id: selectedCoin.id
            },
            resolvedOutputMint: outputMint,
            willPrefill: !!outputMint,
            mintLength: outputMint?.length
          });

          // Validate mint address format (Solana addresses are typically 44 characters)
          if (outputMint && (outputMint.length !== 44 && outputMint.length !== 43)) {
            console.warn('Invalid mint address format, Jupiter may not prefill correctly:', outputMint);
          }

          // Show user-friendly error if no mint address is found
          if (!outputMint) {
            console.error('No valid mint address found for coin:', selectedCoin);
            alert(`Unable to load trading interface for ${selectedCoin.name || 'this coin'}. Missing contract address.`);
            setIsLoading(false);
            return;
          }

          // Initialize Jupiter Plugin
          window.Jupiter.init({
            displayMode: 'integrated',
            integratedTargetId: 'jupiter-plugin-container',
            
            // Token configuration - ensure coin is preselected  
            formProps: {
              initialOutputMint: outputMint || undefined, // Preselect the clicked coin
              initialInputMint: 'So11111111111111111111111111111111111111112', // SOL
              swapMode: 'ExactIn', // User enters input amount
              initialAmount: '', // Start with no amount
              referralAccount: '42DqmQMZrVeZkP2Btj2cS96Ej81jVxFqwUZWazVvhUPt', // Your referral account
              referralFee: 70, // 0.7% fee in basis points
            },
            
            // Styling to match your app
            containerStyles: {
              maxHeight: '600px',
              borderRadius: '16px',
              border: 'none',
            },
            
            // Branding to match MoonFeed
            branding: {
              logoUri: '/vite.svg', // Your app logo
              name: 'MoonFeed',
            },
            
            // Explorer preference
            defaultExplorer: 'SolanaFM',
            
            // Event callbacks to verify initialization
            onSuccess: (transactionId) => {
              console.log('Jupiter trade successful:', transactionId);
            },
            onError: (error) => {
              console.error('Jupiter trade error:', error);
            },
          });

          // Verify Jupiter initialized correctly
          console.log('✅ Jupiter Plugin initialized successfully with 0.7% referral fee');
          console.log(`🎯 Target coin "${selectedCoin.name || selectedCoin.symbol}" should be preselected:`, outputMint ? 'YES' : 'NO');
          console.log('💰 Referral fee: 0.7% (70 bps) to 42DqmQMZrVeZkP2Btj2cS96Ej81jVxFqwUZWazVvhUPt');
          console.log('🚀 Jupiter Plugin interface ready for trading!');
          console.log('📋 Using official Jupiter Plugin v1 with referral support');
          
          setIsLoading(false);
        } else {
          throw new Error('Jupiter script not loaded properly');
        }
      } catch (error) {
        console.error('Failed to initialize Jupiter:', error);
        setIsLoading(false);
        // Show more helpful error to user
        const coinName = selectedCoin?.name || selectedCoin?.symbol || 'this coin';
        alert(`Failed to load Jupiter trading interface for ${coinName}. Please try again or contact support if the issue persists.`);
      }
    };

    initializeJupiter();

    // Cleanup on unmount or when modal closes
    return () => {
      if (window.Jupiter && window.Jupiter.close) {
        window.Jupiter.close();
      }
    };
  }, [visible, selectedCoin]);

  const loadJupiterScript = () => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector('script[src*="plugin.jup.ag"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://plugin.jup.ag/plugin-v1.js'; // Official Jupiter Plugin v1 with referral support
      script.async = true;
      script.onload = () => {
        console.log('Jupiter Plugin script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Jupiter Plugin script');
        reject(new Error('Failed to load Jupiter Plugin script'));
      };
      
      document.head.appendChild(script);
    });
  };

  if (!visible) return null;

  return (
    <div 
      className="jupiter-embed-overlay"
      onClick={(e) => {
        // Only close if clicking on the overlay area (right side)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`jupiter-embed-modal ${visible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="jupiter-embed-header">
          <div className="jupiter-embed-coin-info">
            {selectedCoin?.profilePic && (
              <img 
                src={selectedCoin.profilePic} 
                alt={selectedCoin.name}
                className="jupiter-embed-coin-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="jupiter-embed-coin-details">
              <h3 className="jupiter-embed-coin-name">{selectedCoin?.name || 'Token'}</h3>
              <p className="jupiter-embed-coin-symbol">{selectedCoin?.symbol || selectedCoin?.ticker || 'TOKEN'}</p>
            </div>
          </div>
          <button className="jupiter-embed-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Jupiter Container */}
        <div className="jupiter-embed-content">
          {isLoading && (
            <div className="jupiter-embed-loading">
              <div className="jupiter-embed-spinner"></div>
              <p>Loading Jupiter Trading...</p>
            </div>
          )}
          <div 
            id="jupiter-plugin-container" 
            ref={containerRef}
            className={isLoading ? 'jupiter-embed-hidden' : ''}
          />
        </div>
      </div>
    </div>
  );
};

export default JupiterEmbedModal;
