import React from 'react';
import './FavoritesGrid.css';

function FavoritesGrid({ favorites = [], onCoinClick, onFavoritesChange }) {
  // Temporarily disable liquidity lock filter for testing
  const filteredFavorites = favorites; // .filter(coin => coin.liquidityLocked === true);
  
  // Helper to toggle favorite
  const toggleFavorite = (coin) => {
    console.log('Toggle favorite called for:', coin.symbol, coin.id);
    const updated = favorites.filter(fav => fav.id !== coin.id);
    console.log('Updated favorites list:', updated.length, 'items');
    if (onFavoritesChange) {
      onFavoritesChange(updated);
      console.log('onFavoritesChange called successfully');
    } else {
      console.warn('onFavoritesChange callback not provided');
    }
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
    <div className="favorites-list-container">
      <div className="favorites-header">
        <h1>Your Favorites</h1>
        <p>{filteredFavorites.length} coin{filteredFavorites.length !== 1 ? 's' : ''} saved</p>
      </div>
      
      <div className="favorites-list">
        {filteredFavorites.map((coin) => (
          <div 
            key={coin.id} 
            className="favorite-banner"
            onClick={() => onCoinClick && onCoinClick(coin)}
            style={{ cursor: 'pointer' }}
            title="Click to view coin details"
          >
            {/* Banner Image - Display if available */}
            {(coin.banner || coin.bannerImage || coin.header) && (
              <div className="banner-image-container">
                <img 
                  src={coin.banner || coin.bannerImage || coin.header}
                  alt={`${coin.symbol} banner`}
                  className="banner-image"
                  onError={(e) => {
                    console.log(`Banner image failed to load for ${coin.symbol}: ${e.target.src}`);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Coin Info Header */}
            <div className="banner-header">
              <img 
                src={coin.profileImage || coin.profile || coin.logo || coin.image || '/profile-placeholder.svg'} 
                alt={coin.symbol || coin.name} 
                className="coin-avatar"
                onError={(e) => {
                  // Try fallback sources
                  if (e.target.src.includes('profile-placeholder.svg')) {
                    return; // Already using fallback
                  }
                  
                  const fallbacks = [
                    coin.profile,
                    coin.logo, 
                    coin.image,
                    '/profile-placeholder.svg'
                  ].filter(Boolean);
                  
                  const currentIndex = fallbacks.findIndex(url => e.target.src.includes(url));
                  const nextFallback = fallbacks[currentIndex + 1];
                  
                  if (nextFallback) {
                    console.log(`Profile image failed for ${coin.symbol}, trying fallback: ${nextFallback}`);
                    e.target.src = nextFallback;
                  } else {
                    console.log(`All profile images failed for ${coin.symbol}, using placeholder`);
                    e.target.src = '/profile-placeholder.svg';
                  }
                }}
              />
              <div className="coin-info">
                <div className="coin-symbol">
                  {coin.symbol ? `$${coin.symbol}` : 'Unknown'}
                </div>
                <div className="coin-name">
                  {coin.name || 'Unknown Coin'}
                </div>
              </div>
              
              {/* Remove favorite button - moved to header */}
              <button
                className="remove-favorite-btn"
                onClick={(e) => {
                  console.log('Remove button clicked for:', coin.symbol);
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(coin);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Remove from favorites"
                type="button"
              >
                ×
              </button>
            </div>



            {/* Stats Row - Below chart */}
            <div className="banner-stats">
              <div className="stat-group">
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default FavoritesGrid;
