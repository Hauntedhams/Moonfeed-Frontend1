import React from 'react';

const AboutModal = ({ coin, isOpen, onClose, onTradeClick }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>About {coin?.name || coin?.symbol}</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <p><strong>Symbol:</strong> {coin?.symbol}</p>
          <p><strong>Name:</strong> {coin?.name}</p>
          <p><strong>Price:</strong> ${coin?.price_usd?.toFixed(6) || 'N/A'}</p>
          <p><strong>Market Cap:</strong> ${coin?.market_cap_usd?.toLocaleString() || 'N/A'}</p>
          <p><strong>24h Volume:</strong> ${coin?.volume_24h_usd?.toLocaleString() || 'N/A'}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              onTradeClick?.(coin);
              onClose();
            }}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Trade
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
