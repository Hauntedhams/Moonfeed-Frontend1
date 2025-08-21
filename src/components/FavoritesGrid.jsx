import React from 'react';
import './FavoritesGrid.css';

function FavoritesGrid({ favorites = [], onCoinClick, onFavoritesChange }) {
  // Temporarily disable liquidity lock filter for testing
  const filteredFavorites = favorites; // .filter(coin => coin.liquidityLocked === true);
  
  // Helper to toggle favorite
  const toggleFavorite = (coin) => {
    const updated = favorites.filter(fav => fav.id !== coin.id);
    localStorage.setItem('favorites', JSON.stringify(updated));
    if (onFavoritesChange) onFavoritesChange(updated);
  };

  if (filteredFavorites.length === 0) {
    return (
      <div className="favorites-empty">
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <h2>No Favorites Yet</h2>
          <p>Start favoriting coins to see them here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-grid-container">
      <div className="favorites-header">
        <h1>Your Favorites</h1>
        <p>{filteredFavorites.length} coin{filteredFavorites.length !== 1 ? 's' : ''} saved</p>
      </div>
      
      <div className="favorites-grid">
        {filteredFavorites.map((coin) => (
          <div 
            key={coin.id} 
            className="favorite-card"
            onClick={() => onCoinClick && onCoinClick(coin)}
            style={{ cursor: 'pointer' }}
            title="Click to view coin details"
          >
            {/* Remove favorite button */}
            <button
              className="remove-favorite-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(coin);
              }}
              title="Remove from favorites"
            >
              ×
            </button>

            {/* Coin Info Header */}
            <div className="card-header">
              <img 
                src={coin.profilePic || '/profile-placeholder.png'} 
                alt={coin.symbol || coin.name} 
                className="coin-avatar"
              />
              <div className="coin-info">
                <div className="coin-symbol">
                  {coin.symbol ? `$${coin.symbol}` : 'Unknown'}
                </div>
                <div className="coin-name">
                  {coin.name || 'Unknown Coin'}
                </div>
              </div>
            </div>

            {/* Chart - Main display area */}
            <div 
              className="chart-container"
            >
              {coin.tokenAddress && coin.chainId ? (
              <div style={{ position: 'relative', height: '100%' }}>
                {/* Custom DexScreener header at top */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '24px',
                  background: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  borderRadius: '12px 12px 0 0',
                  fontSize: '10px',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.5px'
                }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card navigation
                  window.open(`https://dexscreener.com/${coin.chainId}/${coin.tokenAddress}`, '_blank');
                }}
                title="Open on DexScreener (new tab)"
                >
                  Tracked by DEXSCREENER
                </div>
                <iframe
                  src={`https://dexscreener.com/${coin.chainId}/${coin.tokenAddress}?embed=1&theme=dark&trades=0&info=0`}
                  className="mini-chart"
                  style={{
                    width: 'calc(100% + 10px)',
                    height: 'calc(100% + 15px)',
                    border: 'none',
                    transform: 'translateX(-5px) translateY(-3px)',
                    pointerEvents: 'none',
                    marginTop: '24px'
                  }}
                  title={`${coin.symbol} Chart`}
                  loading="lazy"
                  frameBorder="0"
                />
              </div>
              ) : (
                <div className="chart-placeholder">
                  <div className="chart-loading">
                    <span>📈</span>
                    <p>Chart unavailable</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="card-stats">
              <div className="stat">
                <span className="stat-label">Price</span>
                <span className="stat-value">
                  {typeof coin.priceUsd === 'number' && !isNaN(coin.priceUsd)
                    ? `$${coin.priceUsd.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 6})}`
                    : '$0.00'}
                </span>
              </div>
              
              {typeof coin.priceChange24h === 'number' && !isNaN(coin.priceChange24h) && (
                <div className="stat">
                  <span className="stat-label">24h</span>
                  <span className={`stat-value ${coin.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                    {coin.priceChange24h > 0 ? '+' : ''}{coin.priceChange24h.toFixed(2)}%
                  </span>
                </div>
              )}

              <div className="stat">
                <span className="stat-label">Market Cap</span>
                <span className="stat-value">
                  {typeof coin.marketCap === 'number' && !isNaN(coin.marketCap)
                    ? `$${(coin.marketCap / 1000000).toFixed(1)}M`
                    : '$0'}
                </span>
              </div>
            </div>

            {/* Graduation Status */}
            {((coin.isGraduating && (coin.source === 'pump.fun' || coin.platform === 'pump.fun')) || 
              (typeof coin.graduationPercent === 'number' && coin.graduationPercent >= 50)) && (
              <div className="graduation-badge">
                {coin.graduationPercent >= 100 ? '🎉 Graduated' : '🎓 Graduating'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FavoritesGrid;
