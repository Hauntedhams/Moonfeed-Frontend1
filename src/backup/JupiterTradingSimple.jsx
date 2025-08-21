import React from 'react';
import './JupiterTrading.css';

function JupiterTradingSimple({ selectedCoin, onBack }) {
  return (
    <div className="jupiter-trading-container">
      {/* Header */}
      <div className="jupiter-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <h1>Trade {selectedCoin?.symbol || 'Token'}</h1>
        <div className="wallet-connection">
          <button style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            Connect Wallet
          </button>
        </div>
      </div>

      {/* Selected Coin Info */}
      {selectedCoin && (
        <div className="selected-coin-info">
          <img 
            src={selectedCoin.image || selectedCoin.profilePic || '/placeholder.png'} 
            alt={selectedCoin.name} 
            className="coin-image" 
            onError={(e) => {
              e.target.src = '/placeholder.png';
            }}
          />
          <div className="coin-details">
            <h2>{selectedCoin.name}</h2>
            <p>{selectedCoin.symbol || selectedCoin.ticker}</p>
            {selectedCoin.priceUsd && (
              <p className="price">${parseFloat(selectedCoin.priceUsd).toFixed(6)}</p>
            )}
          </div>
        </div>
      )}

      {/* Trading Interface Placeholder */}
      <div className="trading-interface">
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '18px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(214, 214, 231, 0.3)'
        }}>
          <h3>Jupiter Trading Interface</h3>
          <p>Coming soon! This will integrate with Jupiter's API for seamless token swaps.</p>
          <div style={{ marginTop: '20px' }}>
            <p><strong>Features:</strong></p>
            <ul style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto' }}>
              <li>Real-time quotes from Jupiter</li>
              <li>Best price aggregation</li>
              <li>Slippage protection</li>
              <li>Wallet integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JupiterTradingSimple;
