import React, { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import './JupiterEmbedModal.css';

const JUPITER_ULTRA_API = 'https://lite-api.jup.ag/ultra/v1';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const REFERRAL_ACCOUNT = '42DqmQMZrVeZkP2Btj2cS96Ej81jVxFqwUZWazVvhUPt';
const REFERRAL_FEE_BPS = 50; // 0.5%

const JupiterEmbedModal = ({ selectedCoin, onClose, visible }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const { publicKey, signTransaction, connected } = useWallet();
  const [connection] = useState(() => new Connection(SOLANA_RPC, 'confirmed'));
  
  // Trading state
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(0);
  const [solPrice, setSolPrice] = useState(0);

  // Custom swap function with referral fee integration
  const executeSwapWithFee = async (swapRequest) => {
    if (!connected || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🔄 Executing swap with 0.5% referral fee via Jupiter Ultra API...');
      console.log('Swap request data:', swapRequest);

      // Extract swap parameters 
      const { inputMint, outputMint, amount } = swapRequest;
      
      // Create quote request with referral fee
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        taker: publicKey.toBase58(),
        referralAccount: REFERRAL_ACCOUNT,
        referralFee: REFERRAL_FEE_BPS.toString(),
      });

      console.log('🔄 Fetching quote with referral fee from Jupiter Ultra API...');

      // Get quote with referral fee from Jupiter Ultra API
      const quoteResponse = await fetch(`${JUPITER_ULTRA_API}/order?${params}`);
      
      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Quote failed: ${quoteResponse.statusText}`);
      }

      const quote = await quoteResponse.json();
      console.log('✅ Jupiter Ultra quote received with referral fee:', quote);

      // Deserialize and sign the transaction
      const transactionBuffer = Buffer.from(quote.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      const signedTransaction = await signTransaction(transaction);
      const signedTransactionBase64 = Buffer.from(signedTransaction.serialize()).toString('base64');

      console.log('🔄 Executing transaction with referral fee...');

      // Execute the trade with referral fee
      const executeResponse = await fetch(`${JUPITER_ULTRA_API}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTransaction: signedTransactionBase64,
          requestId: quote.requestId,
        }),
      });

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Execute failed: ${executeResponse.statusText}`);
      }

      const executeData = await executeResponse.json();

      if (executeData.status === 'Success') {
        console.log('🎉 Trade successful with 0.5% referral fee!');
        console.log('💰 Fee sent to:', REFERRAL_ACCOUNT);
        console.log('📊 Transaction:', executeData.signature);
        return {
          signature: executeData.signature,
          success: true
        };
      } else {
        throw new Error(`Trade failed: ${executeData.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('❌ Swap execution error:', error);
      throw error;
    }
  };

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
          const outputMint = selectedCoin.tokenAddress || 
                             selectedCoin.mint || 
                             selectedCoin.ca || 
                             selectedCoin.address ||
                             selectedCoin.baseToken?.address ||
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

          // Validate mint address format
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

          // Initialize Jupiter Terminal with Ultra API configuration
          window.Jupiter.init({
            displayMode: 'integrated',
            integratedTargetId: 'jupiter-terminal-container',
            
            // Force Jupiter to use Ultra API endpoint for fee collection
            endpoint: JUPITER_ULTRA_API,
            
            // Token configuration - ensure coin is preselected  
            formProps: {
              initialOutputMint: outputMint || undefined,
              initialInputMint: 'So11111111111111111111111111111111111111112', // SOL
              swapMode: 'ExactIn',
              initialAmount: '',
            },
            
            // Styling to match your app
            containerStyles: {
              maxHeight: '600px',
              borderRadius: '16px',
              border: 'none',
            },
            
            // Branding to match MoonFeed
            branding: {
              logoUri: '/vite.svg',
              name: 'MoonFeed',
            },
            
            // Explorer preference
            defaultExplorer: 'SolanaFM',
            
            // CRITICAL: Referral fee configuration
            referralAccount: REFERRAL_ACCOUNT,
            referralFeeBps: REFERRAL_FEE_BPS,
            
            // Platform fee configuration (alternative approach)
            platformFeeBps: REFERRAL_FEE_BPS,
            feeAccount: REFERRAL_ACCOUNT,
            
            // Event callbacks
            onSuccess: (transactionId) => {
              console.log('🎉 Jupiter trade successful:', transactionId);
              if (transactionId) {
                console.log('💰 Transaction completed with 0.5% referral fee included');
                console.log('🔍 View transaction:', `https://solscan.io/tx/${transactionId}`);
                console.log('💰 Fee recipient:', REFERRAL_ACCOUNT);
              }
            },
            onError: (error) => {
              console.error('Jupiter trade error:', error);
            },
          });

          // Verify Jupiter initialized correctly
          console.log('✅ Jupiter Terminal initialized successfully with fee configuration');
          console.log(`🎯 Target coin "${selectedCoin.name || selectedCoin.symbol}" should be preselected:`, outputMint ? 'YES' : 'NO');
          console.log('💰 Referral fee configuration:');
          console.log('  - Account:', REFERRAL_ACCOUNT);
          console.log('  - Fee rate: 0.5% (' + REFERRAL_FEE_BPS + ' basis points)');
          console.log('  - Platform fee BPS:', REFERRAL_FEE_BPS);
          console.log('🚀 Jupiter Terminal ready - fees should now be visible in UI');
          
          // Inject custom fee display after Jupiter loads
          injectCustomFeeDisplay();
          
          setIsLoading(false);

          // Function to inject custom fee display into Jupiter UI
          const injectCustomFeeDisplay = () => {
            setTimeout(() => {
              try {
                // Find Jupiter's fee display elements and modify them
                const jupiterContainer = document.getElementById('jupiter-terminal-container');
                if (jupiterContainer) {
                  // Look for fee display text
                  const feeElements = jupiterContainer.querySelectorAll('*');
                  feeElements.forEach(element => {
                    if (element.textContent && element.textContent.includes('Fee') && element.textContent.includes('0%')) {
                      console.log('🔧 Found Jupiter fee display, updating to show 0.5%...');
                      element.textContent = element.textContent.replace('0%', '0.5%');
                      element.style.color = '#22c55e';
                      element.style.fontWeight = '600';
                    }
                  });
                  
                  // Add custom fee information
                  const existingFeeInfo = jupiterContainer.querySelector('.custom-fee-injection');
                  if (!existingFeeInfo) {
                    const feeInfo = document.createElement('div');
                    feeInfo.className = 'custom-fee-injection';
                    feeInfo.style.cssText = `
                      position: absolute;
                      bottom: 20px;
                      left: 20px;
                      right: 20px;
                      background: rgba(34, 197, 94, 0.1);
                      border: 1px solid rgba(34, 197, 94, 0.3);
                      border-radius: 8px;
                      padding: 8px 12px;
                      font-size: 12px;
                      color: #22c55e;
                      text-align: center;
                      z-index: 1000;
                    `;
                    feeInfo.innerHTML = `💰 MoonFeed Platform Fee: 0.5% (included in transaction)`;
                    jupiterContainer.appendChild(feeInfo);
                  }
                }
              } catch (error) {
                console.error('Failed to inject custom fee display:', error);
              }
            }, 2000); // Wait 2 seconds for Jupiter to fully load
          };

          injectCustomFeeDisplay();

        } else {
          throw new Error('Jupiter script not loaded properly');
        }
      } catch (error) {
        console.error('Failed to initialize Jupiter:', error);
        setIsLoading(false);
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
  }, [visible, selectedCoin, connected, publicKey]);

  const loadJupiterScript = () => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector('script[src*="terminal.jup.ag"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://terminal.jup.ag/main-v4.js'; // Official Jupiter Terminal v4
      script.async = true;
      script.onload = () => {
        console.log('Jupiter Terminal script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Jupiter Terminal script');
        reject(new Error('Failed to load Jupiter Terminal script'));
      };
      
      document.head.appendChild(script);
    });
  };

  if (!visible) return null;

  return (
    <div 
      className="jupiter-embed-overlay"
      onClick={(e) => {
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

        {/* Fee Notice */}
        <div className="jupiter-embed-fee-notice">
          <div className="jupiter-embed-fee-info">
            <span className="jupiter-embed-fee-label">🎯 Trading with 0.5% Platform Fee</span>
            <small className="jupiter-embed-fee-description">
              Platform fee supports development and maintenance. The Jupiter interface shows 0% for their fees, but MoonFeed's 0.5% fee will be automatically added to your transaction.
            </small>
          </div>
        </div>

        {/* Jupiter Container with Fee Overlay */}
        <div className="jupiter-embed-content">
          {isLoading && (
            <div className="jupiter-embed-loading">
              <div className="jupiter-embed-spinner"></div>
              <p>Loading Jupiter Trading with Fee Integration...</p>
            </div>
          )}
          <div 
            id="jupiter-terminal-container" 
            ref={containerRef}
            className={isLoading ? 'jupiter-embed-hidden' : ''}
          />
          
          {/* Fee Override Display */}
          <div className="jupiter-fee-override">
            <div className="jupiter-fee-override-content">
              <div className="jupiter-fee-row">
                <span className="jupiter-fee-override-label">Platform Fee</span>
                <span className="jupiter-fee-override-value">0.5%</span>
              </div>
              <div className="jupiter-fee-note">
                This replaces the "0%" shown above
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JupiterEmbedModal;
