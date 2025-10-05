import React, { useState } from 'react';
import './MoonfeedInfoModal.css';

// Try to import the logo, fallback to null if it doesn't exist
let moonfeedLogo;
try {
  moonfeedLogo = new URL('../assets/moonfeedlogo.png', import.meta.url).href;
} catch {
  moonfeedLogo = null;
}

const MoonfeedInfoModal = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  const handleClose = () => {
    console.log('🌙 Moonfeed modal closing...');
    onClose();
  };

  return (
    <div 
      className="moonfeed-info-overlay" 
      onClick={(e) => {
        // Only close if clicking directly on the overlay, not on any child elements
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="moonfeed-info-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="moonfeed-info-header">
          <div className="moonfeed-logo-header">
            <span className="moonfeed-logo">🌙</span>
            <h2>Moonfeed</h2>
          </div>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="moonfeed-info-content">
          <div className="info-section">
            <h3>🚀 What is Moonfeed?</h3>
            <p>
              Moonfeed is a modern meme coin discovery app that helps you find trending Solana tokens 
              with a TikTok-style vertical scroll interface. Discover the next moonshot before it takes off!
            </p>
          </div>

          <div className="info-section">
            <h3>📱 How to Use</h3>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">👆</span>
                <div>
                  <strong>Swipe to Browse:</strong> Scroll vertically through trending tokens, just like TikTok
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⭐</span>
                <div>
                  <strong>Add Favorites:</strong> Tap the star icon to save coins you're interested in
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <div>
                  <strong>Advanced Filters:</strong> Use the filters button to find coins by market cap, volume, liquidity, and more
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <div>
                  <strong>Live Charts:</strong> View real-time price charts and trading data for each token
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <div>
                  <strong>Safety Checks:</strong> Green locks indicate verified liquidity locks via Rugcheck
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💱</span>
                <div>
                  <strong>Quick Trade:</strong> Tap the trade button to swap tokens directly through Jupiter
                </div>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>🔥 Navigation Tabs</h3>
            <div className="tabs-explanation">
              <div className="tab-item">
                <strong>Trending:</strong> Hottest tokens by volume and activity
              </div>
              <div className="tab-item">
                <strong>Latest:</strong> Newest tokens just hitting the market
              </div>
              <div className="tab-item">
                <strong>Custom:</strong> Your filtered results
              </div>
              <div className="tab-item">
                <strong>Favorites:</strong> Your saved tokens
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>⚠️ Important Notes</h3>
            <div className="warning-box">
              <p>
                <strong>Always DYOR (Do Your Own Research)!</strong> Meme coins are highly volatile and risky. 
                Only invest what you can afford to lose. Look for liquidity locks (🔒) and verify token contracts.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="moonfeed-info-footer">
          <button className="got-it-button" onClick={handleClose}>
            Got it! 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

// Main button component
const MoonfeedInfoButton = ({ className = '' }) => {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => {
    console.log('🌙 Opening Moonfeed info modal...');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    console.log('🌙 Closing Moonfeed info modal...');
    setShowModal(false);
  };

  return (
    <>
      <button
        className={`moonfeed-info-button ${className}`}
        onClick={handleOpenModal}
        title="How to use Moonfeed"
      >
        {moonfeedLogo ? (
          <img 
            src={moonfeedLogo} 
            alt="Moonfeed Logo" 
            className="moonfeed-logo-image"
          />
        ) : (
          <span className="moonfeed-logo-fallback">🌙</span>
        )}
      </button>
      
      <MoonfeedInfoModal 
        isVisible={showModal} 
        onClose={handleCloseModal} 
      />
    </>
  );
};

export default MoonfeedInfoButton;
