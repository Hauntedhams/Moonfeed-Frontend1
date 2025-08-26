import React, { memo, useState } from 'react';
import AboutModal from './AboutModal';

const CoinCard = memo(({ 
  coin, 
  isFavorite, 
  onFavoriteToggle, 
  onTradeClick, 
  isGraduating, 
  isTrending 
}) => {
  const [showAboutModal, setShowAboutModal] = useState(false);
  return (
    <div className="coin-card">
      <div className="coin-header">
        <div className="coin-main-info">
          <div className="coin-image-container">
            <img
              src={coin.image || coin.profilePic || '/placeholder.png'}
              alt={coin.name}
              className="coin-image"
              onError={(e) => {
                e.target.src = '/placeholder.png';
              }}
            />
            {(isGraduating || isTrending) && (
              <div className="coin-badge-container">
                {isGraduating && <div className="coin-badge graduating">🚀 Graduating</div>}
                {isTrending && <div className="coin-badge trending">🔥 Trending</div>}
              </div>
            )}
          </div>
          <div className="coin-details">
            <h3 className="coin-name">{coin.name}</h3>
            <p className="coin-symbol">{coin.symbol || coin.ticker}</p>
            {coin.priceUsd && (
              <p className="coin-price">${parseFloat(coin.priceUsd).toFixed(6)}</p>
            )}
          </div>
        </div>
        <div className="coin-actions">
          <button
            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={() => onFavoriteToggle(coin)}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
          <button
            className="about-btn"
            onClick={() => setShowAboutModal(true)}
            title="About this coin"
          >
            ℹ️
          </button>
          <button
            className="trade-btn"
            onClick={() => onTradeClick(coin)}
            title="Trade this coin"
          >
            💸
          </button>
        </div>
      </div>
      
      {coin.description && (
        <p className="coin-description">{coin.description}</p>
      )}
      
      <div className="coin-stats">
        {coin.marketCap && (
          <div className="coin-stat">
            <span className="stat-label">Market Cap:</span>
            <span className="stat-value">${Number(coin.marketCap).toLocaleString()}</span>
          </div>
        )}
        {coin.volume24h && (
          <div className="coin-stat">
            <span className="stat-label">24h Volume:</span>
            <span className="stat-value">${Number(coin.volume24h).toLocaleString()}</span>
          </div>
        )}
        {coin.source && (
          <div className="coin-stat">
            <span className="stat-label">Source:</span>
            <span className="stat-value">{coin.source}</span>
          </div>
        )}
      </div>
      
      {/* About Modal */}
      <AboutModal 
        coin={coin}
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        onTradeClick={onTradeClick}
      />
    </div>
  );
});

CoinCard.displayName = 'CoinCard';

export default CoinCard;
