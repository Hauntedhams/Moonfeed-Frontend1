import React, { useState } from 'react';
import { API_CONFIG } from '../config/api';
import './CoinSearchModal.css';

function resolveApiBase() {
  return API_CONFIG.BASE_URL;
}

function CoinSearchModal({ visible, onClose, onCoinSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResult, setSearchResult] = useState(null);

  // Use same base resolution as TokenScroller
  const API_ROOT = resolveApiBase();
  const CURATED_URL = `${API_ROOT}/api/coins/curated`;

  // Handle search input
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const cleanQuery = searchQuery.trim();

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      // Simple validation: token address-like string
      if (cleanQuery.length < 20 || cleanQuery.length > 100) {
        throw new Error('Please enter a valid token address (20-100 characters)');
      }

      console.log('🔍 Searching for token:', cleanQuery);

      // First, try to find in curated coins
      const curatedResponse = await fetch(CURATED_URL);
      if (curatedResponse.ok) {
        const curatedData = await curatedResponse.json();
        const coins = Array.isArray(curatedData?.coins) ? curatedData.coins : [];

        const found = coins.find(c =>
          (c.tokenAddress && c.tokenAddress.toLowerCase() === cleanQuery.toLowerCase()) ||
          (c.mintAddress && c.mintAddress.toLowerCase() === cleanQuery.toLowerCase()) ||
          (c.id && c.id.toLowerCase() === cleanQuery.toLowerCase())
        );

        if (found) {
          console.log('✅ Found in curated list:', found.symbol);
          setSearchResult(found);
          return;
        }
      }

      // If not found in curated list, try individual coin lookup
      console.log('🔍 Not in curated list, trying external lookup...');
      const individualResponse = await fetch(`${API_ROOT}/api/coin/${cleanQuery}`);
      
      if (individualResponse.ok) {
        const individualData = await individualResponse.json();
        if (individualData.success && individualData.coin) {
          console.log('✅ Found via external lookup:', individualData.coin.symbol);
          setSearchResult(individualData.coin);
          return;
        }
      }

      // If all methods fail
      throw new Error('Token not found. Please check the address and try again.');

    } catch (err) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking on search result
  const handleResultClick = (coinData) => {
    if (onCoinSelect) onCoinSelect(coinData);
    setSearchQuery('');
    setSearchResult(null);
    setError(null);
    onClose();
  };

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear error when input changes
  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (error) setError(null);
    if (searchResult) setSearchResult(null);
  };

  if (!visible) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <h3>Search Coin by Address</h3>
          <button className="search-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="search-modal-body">
          <div className="search-coming-soon-banner" role="note" aria-label="Search enhancements">
            <span className="coming-dot" />
            <span className="coming-text">✨ Enhanced search now supports any Solana token address!</span>
          </div>
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Enter token address (e.g., So11111111111111111111111111111111111111112)"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="search-input"
              autoFocus
            />
            <button 
              className="search-btn"
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? (
                <div className="search-loading">
                  <div className="search-spinner"></div>
                </div>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              )}
            </button>
          </div>
          
          {error && (
            <div className="search-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          {searchResult && (
            <div className="search-result">
              <div className="search-result-card" onClick={() => handleResultClick(searchResult)}>
                <div className="search-result-image">
                  <img 
                    src={searchResult.image || searchResult.profilePic || searchResult.profileImage || searchResult.profile || searchResult.logo || '/default-coin.png'} 
                    alt={searchResult.name || searchResult.symbol}
                    onError={(e) => {
                      e.target.src = '/default-coin.png';
                    }}
                  />
                </div>
                <div className="search-result-info">
                  <div className="search-result-header">
                    <h4 className="search-result-name">{searchResult.name || 'Unknown Token'}</h4>
                    <span className="search-result-symbol">${searchResult.symbol || 'UNKNOWN'}</span>
                  </div>
                  <div className="search-result-details">
                    <div className="search-result-price">
                      ${searchResult.priceUsd || searchResult.price_usd ? 
                        Number(searchResult.priceUsd || searchResult.price_usd).toFixed(8) : 
                        '0.00000000'}
                    </div>
                    <div className="search-result-market-cap">
                      MC: ${searchResult.marketCap || searchResult.market_cap_usd ? 
                        ((searchResult.marketCap || searchResult.market_cap_usd) / 1000000).toFixed(2) + 'M' : 
                        'N/A'}
                    </div>
                  </div>
                  {searchResult.description && (
                    <p className="search-result-description">
                      {searchResult.description.length > 100 
                        ? searchResult.description.substring(0, 100) + '...' 
                        : searchResult.description}
                    </p>
                  )}
                </div>
                <div className="search-result-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          <div className="search-help">
            <h4>How to search:</h4>
            <ul>
              <li>Enter any valid Solana token address (20-100 characters)</li>
              <li>We'll search our curated feed first, then external sources</li>
              <li>Example: So11111111111111111111111111111111111111112 (Wrapped SOL)</li>
              <li>Supports tokens from DexScreener, Pump.fun, and other sources</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoinSearchModal;
