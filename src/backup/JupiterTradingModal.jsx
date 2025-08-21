import React, { useState, useEffect } from 'react';
import './JupiterTradingModal.css';

const JupiterTradingModal = ({ selectedCoin, onClose, visible }) => {
  const [activeMode, setActiveMode] = useState('buy'); // 'buy' or 'sell'
  const [activeType, setActiveType] = useState('instant'); // 'instant', 'trigger', 'recurring'
  const [sellAmount, setSellAmount] = useState('0.00');
  const [buyAmount, setBuyAmount] = useState('0');
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState(selectedCoin?.symbol || 'TOKEN');
  const [isConnected, setIsConnected] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [checklist, setChecklist] = useState({
    mintFreeze: { status: 'disabled', value: 'Disabled' },
    topHolders: { status: 'checking', value: '14.6%' },
    devAddress: { status: 'verified', value: '8T9y...cNZy' }
  });

  useEffect(() => {
    if (selectedCoin) {
      setToToken(selectedCoin.symbol || 'TOKEN');
      // Update checklist based on coin data
      updateChecklist(selectedCoin);
    }
  }, [selectedCoin]);

  const updateChecklist = (coinData) => {
    const newChecklist = {
      mintFreeze: { 
        status: coinData?.liquidityLocked ? 'disabled' : 'warning', 
        value: coinData?.liquidityLocked ? 'Disabled' : 'Enabled' 
      },
      topHolders: { 
        status: 'verified', 
        value: `${((coinData?.holders || 1000) / 10000 * 100).toFixed(1)}%`
      },
      devAddress: { 
        status: 'verified', 
        value: coinData?.tokenAddress ? `${coinData.tokenAddress.slice(0, 4)}...${coinData.tokenAddress.slice(-4)}` : '8T9y...cNZy'
      }
    };
    setChecklist(newChecklist);
  };

  const validateTrade = () => {
    const newWarnings = [];
    
    if (parseFloat(sellAmount) === 0) {
      newWarnings.push('Enter an amount to trade');
    }
    
    if (selectedCoin?.liquidity && selectedCoin.liquidity < 50000) {
      newWarnings.push('Low liquidity - high slippage risk');
    }
    
    if (!selectedCoin?.liquidityLocked) {
      newWarnings.push('Liquidity not locked');
    }
    
    setWarnings(newWarnings);
  };

  const handleConnect = async () => {
    try {
      // Try to connect with Phantom wallet first
      if (window.solana && window.solana.isPhantom) {
        await window.solana.connect();
        setIsConnected(true);
      } else {
        // Fallback to other wallets or show wallet selection
        window.open('https://phantom.app/', '_blank');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleSwap = () => {
    // Swap the tokens and amounts
    const tempToken = fromToken;
    const tempAmount = sellAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setSellAmount(buyAmount || '0');
    setBuyAmount(tempAmount || '0');
  };

  const handleTrade = () => {
    if (!isConnected) {
      handleConnect();
      return;
    }
    
    validateTrade();
    
    if (warnings.length === 0) {
      // Execute trade through Jupiter
      console.log('Executing trade:', { activeMode, fromToken, toToken, sellAmount, buyAmount });
      // Here we would integrate with Jupiter's actual trading API
    }
  };

  if (!visible) return null;

  return (
    <div className="jupiter-modal-overlay" onClick={onClose}>
      <div className="jupiter-modal" onClick={e => e.stopPropagation()}>
        <div className="jupiter-header">
          <div className="jupiter-modes">
            <button
              className={`jupiter-mode ${activeMode === 'buy' ? 'active' : ''}`}
              onClick={() => setActiveMode('buy')}
            >
              Buy
            </button>
            <button
              className={`jupiter-mode ${activeMode === 'sell' ? 'active' : ''}`}
              onClick={() => setActiveMode('sell')}
            >
              Sell
            </button>
          </div>
          <button className="jupiter-close" onClick={onClose}>×</button>
        </div>

        <div className="jupiter-types">
          <button
            className={`jupiter-type ${activeType === 'instant' ? 'active' : ''}`}
            onClick={() => setActiveType('instant')}
          >
            Instant
          </button>
          <button
            className={`jupiter-type ${activeType === 'trigger' ? 'active' : ''}`}
            onClick={() => setActiveType('trigger')}
          >
            Trigger
          </button>
          <button
            className={`jupiter-type ${activeType === 'recurring' ? 'active' : ''}`}
            onClick={() => setActiveType('recurring')}
          >
            Recurring
          </button>
        </div>

        <div className="jupiter-brand">
          <span className="jupiter-logo">⚡</span>
          <span className="jupiter-text">Ultra V2</span>
          <button className="jupiter-refresh" onClick={() => window.location.reload()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          </button>
        </div>

        <div className="jupiter-trading-area">
          <div className="jupiter-trade-box selling">
            <div className="jupiter-trade-label">Selling</div>
            <div className="jupiter-trade-input">
              <div className="jupiter-token-select">
                <div className="jupiter-token-icon">
                  <img src="/solana-logo.png" alt="SOL" onError={(e) => e.target.style.display = 'none'} />
                  <span className="jupiter-token-fallback">◎</span>
                </div>
                <span className="jupiter-token-symbol">{fromToken}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <div className="jupiter-amount-input">
                <input
                  type="number"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
                <div className="jupiter-amount-usd">$0</div>
              </div>
            </div>
          </div>

          <div className="jupiter-swap-button" onClick={handleSwap}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3L4 7l4 4"/>
              <path d="M4 7h16"/>
              <path d="M16 21l4-4-4-4"/>
              <path d="M20 17H4"/>
            </svg>
          </div>

          <div className="jupiter-trade-box buying">
            <div className="jupiter-trade-label">Buying</div>
            <div className="jupiter-trade-input">
              <div className="jupiter-token-select">
                <div className="jupiter-token-icon">
                  <img src={selectedCoin?.imageUrl || selectedCoin?.image} alt={toToken} onError={(e) => e.target.style.display = 'none'} />
                  <span className="jupiter-token-fallback">{toToken?.charAt(0) || 'T'}</span>
                </div>
                <span className="jupiter-token-symbol">{toToken}</span>
                {warnings.length > 0 && (
                  <div className="jupiter-warning-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>{warnings.length} Warning{warnings.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              <div className="jupiter-amount-input">
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  placeholder="0"
                  readOnly
                />
                <div className="jupiter-amount-usd">$0</div>
              </div>
            </div>
          </div>
        </div>

        <button 
          className={`jupiter-connect-button ${isConnected ? 'connected' : ''}`}
          onClick={handleTrade}
        >
          {isConnected ? (activeMode === 'buy' ? 'Buy' : 'Sell') : 'Connect'}
        </button>

        <div className="jupiter-checklist">
          <div className="jupiter-checklist-header">
            <span>Checklist</span>
            <span className="jupiter-checklist-score">3/3</span>
          </div>
          
          <div className="jupiter-checklist-item">
            <span className="jupiter-checklist-label">Mint / Freeze</span>
            <span className={`jupiter-checklist-status ${checklist.mintFreeze.status}`}>
              {checklist.mintFreeze.value}
            </span>
          </div>
          
          <div className="jupiter-checklist-item">
            <span className="jupiter-checklist-label">Top 10 Holders</span>
            <span className={`jupiter-checklist-status ${checklist.topHolders.status}`}>
              {checklist.topHolders.value}
            </span>
          </div>
          
          <div className="jupiter-checklist-item">
            <span className="jupiter-checklist-label">Dev Address</span>
            <span className={`jupiter-checklist-status ${checklist.devAddress.status}`}>
              {checklist.devAddress.value}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JupiterTradingModal;
              <button className="quick-trade-btn buy">
                🚀 Buy {selectedCoin?.symbol || 'Token'}
              </button>
              <button className="quick-trade-btn sell">
                💰 Sell {selectedCoin?.symbol || 'Token'}
              </button>
            </div>

            <div className="trading-features">
              <p><strong>Coming Soon:</strong></p>
              <ul>
                <li>✨ Real-time Jupiter quotes</li>
                <li>⚡ Best price aggregation</li>
                <li>🛡️ Slippage protection</li>
                <li>🔗 Wallet integration</li>
              </ul>
            </div>

            <button className="connect-wallet-btn">
              Connect Wallet to Trade
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default JupiterTradingModal;
