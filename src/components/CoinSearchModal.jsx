import React, { useState } from 'react';
import './CoinSearchModal.css';

function CoinSearchModal({ visible, onClose, onCoinFound }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResult, setSearchResult] = useState(null);

  // Handle search input
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setSearchResult(null);
    
    try {
      // More flexible validation - just check if it looks like an address
      const cleanQuery = searchQuery.trim();
      
      if (cleanQuery.length < 32 || cleanQuery.length > 50) {
        throw new Error('Please enter a valid token address (32-50 characters)');
      }

      // Fetch coin data from your backend
      const response = await fetch(`/api/search-coin?address=${encodeURIComponent(cleanQuery)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Token not found. Please check the address and try again.');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid token address format');
        }
        throw new Error('Failed to search for token. Please try again.');
      }
      
      const coinData = await response.json();
      setSearchResult(coinData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking on search result
  const handleResultClick = (coinData) => {
    onCoinFound(coinData);
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
                    src={searchResult.image || searchResult.profilePic || '/default-coin.png'} 
                    alt={searchResult.name}
                    onError={(e) => {
                      e.target.src = '/default-coin.png';
                    }}
                  />
                </div>
                <div className="search-result-info">
                  <div className="search-result-header">
                    <h4 className="search-result-name">{searchResult.name}</h4>
                    <span className="search-result-symbol">${searchResult.symbol}</span>
                  </div>
                  <div className="search-result-details">
                    <div className="search-result-price">
                      ${searchResult.priceUsd ? Number(searchResult.priceUsd).toFixed(8) : '0.00000000'}
                    </div>
                    <div className="search-result-market-cap">
                      MC: ${searchResult.marketCap ? (searchResult.marketCap / 1000000).toFixed(2) + 'M' : 'N/A'}
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
              <li>Enter a valid Solana token address</li>
              <li>The address should be 32-44 characters long</li>
              <li>Example: So11111111111111111111111111111111111111112 (Wrapped SOL)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoinSearchModal;
