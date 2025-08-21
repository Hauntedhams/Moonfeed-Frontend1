import React from 'react';
import './AboutModal.css';

const AboutModal = ({ coin, isOpen, onClose, onTradeClick }) => {
  if (!isOpen) return null;

  return (
    <div className="about-modal-overlay" onClick={onClose}>
      <div className="about-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="about-modal-header">
          <div className="coin-info">
            <img
              src={coin.image || coin.profilePic || '/placeholder.png'}
              alt={coin.name}
              className="coin-image-modal"
              onError={(e) => {
                e.target.src = '/placeholder.png';
              }}
            />
            <div>
              <h2>{coin.name}</h2>
              <p className="coin-symbol-modal">{coin.symbol || coin.ticker}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="about-modal-body">
          <h3>About {coin.name}</h3>
          <div className="coin-description-full">
            {coin.description ? (
              <p>{coin.description}</p>
            ) : (
              <p className="no-description">
                No description available for this coin.
              </p>
            )}
          </div>
          
          {/* Additional coin details */}
          <div className="coin-details-grid">
            {coin.priceUsd && (
              <div className="detail-item">
                <span className="detail-label">Price:</span>
                <span className="detail-value">${parseFloat(coin.priceUsd).toFixed(6)}</span>
              </div>
            )}
            {coin.marketCap && (
              <div className="detail-item">
                <span className="detail-label">Market Cap:</span>
                <span className="detail-value">${Number(coin.marketCap).toLocaleString()}</span>
              </div>
            )}
            {coin.volume && (
              <div className="detail-item">
                <span className="detail-label">24h Volume:</span>
                <span className="detail-value">${Number(coin.volume).toLocaleString()}</span>
              </div>
            )}
            {coin.liquidity && (
              <div className="detail-item">
                <span className="detail-label">Liquidity:</span>
                <span className="detail-value">${Number(coin.liquidity).toLocaleString()}</span>
              </div>
            )}
            {coin.createdAt && (
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">{new Date(coin.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            {coin.source && (
              <div className="detail-item">
                <span className="detail-label">Source:</span>
                <span className="detail-value">{coin.source}</span>
              </div>
            )}
            {(coin.mint || coin.tokenAddress) && (
              <div className="detail-item">
                <span className="detail-label">Contract:</span>
                <span 
                  className="detail-value contract-address" 
                  title={coin.mint || coin.tokenAddress}
                  onClick={() => navigator.clipboard.writeText(coin.mint || coin.tokenAddress)}
                  style={{ cursor: 'pointer' }}
                >
                  {(coin.mint || coin.tokenAddress).slice(0, 8)}...{(coin.mint || coin.tokenAddress).slice(-8)}
                </span>
              </div>
            )}
          </div>
          
          {/* Social Links if available */}
          {(() => {
            const extractSocialFromArray = (socials, type) => {
              if (!Array.isArray(socials)) return null;
              if (type === 'website') {
                const websiteItem = socials.find(item => 
                  item.label?.toLowerCase() === 'website' || 
                  item.type?.toLowerCase() === 'website'
                );
                return websiteItem?.url || null;
              }
              const socialItem = socials.find(item => item.type?.toLowerCase() === type);
              return socialItem?.url || null;
            };
            
            const twitter = extractSocialFromArray(coin.socials, 'twitter') || 
                           coin.socials?.twitter || coin.twitter || coin.social?.twitter;
            
            const telegram = extractSocialFromArray(coin.socials, 'telegram') || 
                            coin.socials?.telegram || coin.telegram || coin.social?.telegram;
            
            const website = extractSocialFromArray(coin.socials, 'website') || 
                           coin.socials?.website || coin.website || coin.social?.website || 
                           coin.url || coin.homepage || coin.websiteUrl || coin.site;
            
            const ensureValidUrl = (url) => {
              if (!url || typeof url !== 'string') return null;
              url = url.trim();
              if (!url || url.length < 4) return null;
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return `https://${url}`;
              }
              return url;
            };
            
            const validTwitter = ensureValidUrl(twitter);
            const validTelegram = ensureValidUrl(telegram);
            const validWebsite = ensureValidUrl(website);
            
            return (
              <div style={{ marginTop: '24px' }}>
                {(validTwitter || validTelegram || validWebsite) && (
                  <>
                    <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '12px' }}>Social Links</h4>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                      {validTwitter && (
                        <a href={validTwitter} target="_blank" rel="noopener noreferrer" 
                           style={{ color: '#1da1f2', fontSize: '24px', textDecoration: 'none' }} title="Twitter">
                          🐦
                        </a>
                      )}
                      {validTelegram && (
                        <a href={validTelegram} target="_blank" rel="noopener noreferrer" 
                           style={{ color: '#229ED9', fontSize: '24px', textDecoration: 'none' }} title="Telegram">
                          ✈️
                        </a>
                      )}
                      {validWebsite && (
                        <a href={validWebsite} target="_blank" rel="noopener noreferrer" 
                           style={{ color: '#fff', fontSize: '24px', textDecoration: 'none' }} title="Website">
                          🌐
                        </a>
                      )}
                    </div>
                  </>
                )}
                {/* Small modern Trade button under social links */}
                <div className="trade-cta-wrapper">
                  <button
                    className="trade-cta-btn"
                    onClick={() => {
                      if (typeof onTradeClick === 'function') {
                        onTradeClick(coin);
                      }
                      onClose && onClose();
                    }}
                    title="Trade this coin"
                  >
                    <span style={{ fontSize: 16, marginRight: 8 }}>💸</span>
                    Trade
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
