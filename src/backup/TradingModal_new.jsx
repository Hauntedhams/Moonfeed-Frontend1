import React, { useState, useEffect } from 'react';
import './TradingModal.css';

const TradingModal = ({ isOpen, onClose, coin }) => {
  const [activeTab, setActiveTab] = useState('instant');
  const [sellAmount, setSellAmount] = useState('0.00');
  const [buyAmount, setBuyAmount] = useState('0');
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState(coin?.symbol || 'TOKEN');
  const [warnings, setWarnings] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (coin) {
      setToToken(coin.symbol || 'TOKEN');
    }
  }, [coin]);

  const handleSwap = () => {
    // Swap the tokens
    const tempToken = fromToken;
    const tempAmount = sellAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
  };

  const handleConnect = () => {
    // Implement wallet connection logic here
    setIsConnected(true);
  };

  const validateTrade = () => {
    const newWarnings = [];
    
    if (parseFloat(sellAmount) === 0) {
      newWarnings.push('Enter an amount to trade');
    }
    
    if (coin?.liquidity && coin.liquidity < 50000) {
      newWarnings.push('Low liquidity - high slippage risk');
    }
    
    if (!coin?.liquidityLocked) {
      newWarnings.push('Liquidity not locked - rug pull risk');
    }
    
    setWarnings(newWarnings);
  };

  useEffect(() => {
    validateTrade();
  }, [sellAmount, coin]);

  if (!isOpen) return null;

  return (
    <div className="trading-modal-overlay" onClick={onClose}>
      <div className="trading-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="trading-modal-header">
          <h2 className="trading-modal-title">Trade {coin?.symbol || 'Token'}</h2>
          <button className="trading-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Coin Info */}
        {coin && (
          <div style={{ padding: '0 24px' }}>
            <div className="trading-coin-info">
              <img 
                src={coin.image || coin.profilePic || '/placeholder.png'} 
                alt={coin.name}
                className="trading-coin-icon"
                onError={(e) => {
                  e.target.src = '/placeholder.png';
                }}
              />
              <div className="trading-coin-details">
                <h3>{coin.name}</h3>
                <p>{coin.symbol} • ${coin.priceUsd ? Number(coin.priceUsd).toFixed(6) : '0.00'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="trading-tabs">
          <button 
            className={`trading-tab ${activeTab === 'instant' ? 'active' : ''}`}
            onClick={() => setActiveTab('instant')}
          >
            Instant
          </button>
          <button 
            className={`trading-tab ${activeTab === 'trigger' ? 'active' : ''}`}
            onClick={() => setActiveTab('trigger')}
          >
            Trigger
          </button>
          <button 
            className={`trading-tab ${activeTab === 'recurring' ? 'active' : ''}`}
            onClick={() => setActiveTab('recurring')}
          >
            Recurring
          </button>
        </div>

        {/* Trading Content */}
        <div className="trading-content">
          <div className="trading-form">
            {/* Selling Section */}
            <div className="trading-input-group">
              <div className="trading-input-label">
                <span>You're selling</span>
                <span>Balance: 0</span>
              </div>
              <div className="trading-input-container">
                <div className="trading-input-row">
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0.00"
                    className="trading-input"
                  />
                  <div className="trading-token-selector">
                    <div className="trading-token-icon"></div>
                    <span className="trading-token-symbol">{fromToken}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="trading-swap-button" onClick={handleSwap}>
                <svg className="trading-swap-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
                </svg>
              </button>
            </div>

            {/* Buying Section */}
            <div className="trading-input-group">
              <div className="trading-input-label">
                <span>To receive</span>
                <span>Balance: 0</span>
              </div>
              <div className="trading-input-container">
                <div className="trading-input-row">
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0"
                    className="trading-input"
                  />
                  <div className="trading-token-selector">
                    <img 
                      src={coin?.image || coin?.profilePic || '/placeholder.png'} 
                      alt={toToken}
                      className="trading-token-icon"
                      onError={(e) => {
                        e.target.src = '/placeholder.png';
                      }}
                    />
                    <span className="trading-token-symbol">{toToken}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="trading-warnings">
                {warnings.map((warning, index) => (
                  <div key={index} className="trading-warning">
                    <svg className="trading-warning-icon" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="trading-actions">
              {!isConnected ? (
                <button className="trading-button" onClick={handleConnect}>
                  Connect Wallet
                </button>
              ) : (
                <button 
                  className="trading-button" 
                  disabled={warnings.length > 0 || parseFloat(sellAmount) === 0}
                >
                  Trade
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingModal;
