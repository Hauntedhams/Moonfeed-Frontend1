import React, { useState, useEffect, useRef } from 'react';
import './JupiterTradingModal.css';

function JupiterTradingModal({ selectedCoin, onClose, visible }) {
  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="trading-modal-backdrop" onClick={onClose} />
      
      {/* Modal */}
      <div className={`trading-modal ${visible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="trading-modal-header">
          <div className="trading-modal-drag-handle" />
          <button className="trading-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Selected Coin Info */}
        {selectedCoin && (
          <div className="trading-modal-coin-info">
            <img 
              src={selectedCoin.image || selectedCoin.profilePic || '/placeholder.png'} 
              alt={selectedCoin.name} 
              className="trading-modal-coin-image" 
              onError={(e) => {
                e.target.src = '/placeholder.png';
              }}
            />
            <div className="trading-modal-coin-details">
              <h3>{selectedCoin.name}</h3>
              <p>{selectedCoin.symbol || selectedCoin.ticker}</p>
              {selectedCoin.priceUsd && (
                <p className="trading-modal-price">${parseFloat(selectedCoin.priceUsd).toFixed(6)}</p>
              )}
            </div>
          </div>
        )}

        {/* Trading Interface Placeholder */}
        <div className="trading-modal-content">
          <div className="trading-interface-placeholder">
            <h4>Trade {selectedCoin?.symbol || 'Token'}</h4>
            <p>Jupiter Trading Interface</p>
            
            {/* Quick Trade Buttons */}
            <div className="quick-trade-buttons">
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
