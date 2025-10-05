import React, { useState, useEffect } from 'react';
import './CoinListModal.css';

const API_BASE = 'http://localhost:3001/api/coins';

function CoinListModal({ visible, onClose, filterType, onCoinSelect }) {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to get correct endpoint based on filter type
  const getApiUrl = () => {
    if (filterType === 'trending') {
      return `${API_BASE}/trending`;
    } else if (filterType === 'graduating') {
      return `${API_BASE}/graduating`;
    } else if (filterType === 'custom') {
      return `${API_BASE}/infinite`;
    } else {
      return `${API_BASE}/infinite`;
    }
  };

  // Fetch coins when modal opens
  useEffect(() => {
    if (visible && filterType) {
      fetchCoins();
    }
  }, [visible, filterType]);

  const fetchCoins = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = getApiUrl();
      const response = await fetch(`${url}?limit=50&offset=0`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCoins(data.coins || []);
    } catch (err) {
      console.error('Error fetching coins for list modal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoinClick = (coin) => {
    if (onCoinSelect) {
      onCoinSelect(coin);
    }
    onClose();
  };

  const getFilterTitle = () => {
    switch (filterType) {
      case 'trending':
        return 'Trending Coins';
      case 'graduating':
        return 'Graduating Coins';
      case 'custom':
        return 'Custom Filter';
      default:
        return 'All Coins';
    }
  };

  if (!visible) return null;

  return (
    <div className="coin-list-modal-backdrop" onClick={onClose}>
      <div className="coin-list-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="coin-list-modal-header">
          <h2>{getFilterTitle()}</h2>
          <button className="coin-list-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="coin-list-modal-body">
          {loading ? (
            <div className="coin-list-loading">
              <div className="coin-list-spinner"></div>
              <p>Loading coins...</p>
            </div>
          ) : error ? (
            <div className="coin-list-error">
              <p>Error loading coins: {error}</p>
              <button onClick={fetchCoins} className="coin-list-retry">
                Retry
              </button>
            </div>
          ) : (
            <div className="coin-list-grid">
              {coins.map((coin, index) => (
                <div
                  key={coin.id || index}
                  className="coin-list-item"
                  onClick={() => handleCoinClick(coin)}
                >
                  {/* Banner */}
                  <div 
                    className="coin-list-banner"
                    style={{
                      backgroundImage: coin.banner 
                        ? `url(${coin.banner})` 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {/* Overlay with gradient for better text readability */}
                    <div className="coin-list-banner-overlay"></div>
                    
                    {/* Coin info overlay */}
                    <div className="coin-list-info">
                      <div className="coin-list-name">{coin.name || coin.symbol}</div>
                      <div className="coin-list-symbol">${coin.symbol}</div>
                      {coin.marketCap && (
                        <div className="coin-list-mcap">
                          MC: ${typeof coin.marketCap === 'number' 
                            ? coin.marketCap >= 1000000 
                              ? `${(coin.marketCap / 1000000).toFixed(1)}M`
                              : coin.marketCap >= 1000
                              ? `${(coin.marketCap / 1000).toFixed(1)}K`
                              : coin.marketCap.toLocaleString()
                            : 'N/A'
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoinListModal;
