import React, { useState } from 'react';
import './AdvancedFilter.css';

const AdvancedFilter = ({ onFilter, isActive, hideButton = false, isModalOpen, onModalClose, customClassName = '' }) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const modalOpen = isModalOpen !== undefined ? isModalOpen : internalModalOpen;
  const setModalOpen = onModalClose ? (value) => {
    if (!value) onModalClose();
  } : setInternalModalOpen;
  const [filters, setFilters] = useState({
    minLiquidity: '',
    maxLiquidity: '',
    minMarketCap: '',
    maxMarketCap: '',
    minVolume: '',
    maxVolume: '',
    volumeTimeframe: '24h',
    minCreatedAt: '',
    maxCreatedAt: '',
    minBuys: '',
    minSells: '',
    minTotalTransactions: ''
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    // Convert string values to numbers where needed and filter out empty values
    const processedFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') {
        if (key === 'volumeTimeframe') {
          processedFilters[key] = value;
        } else if (key.includes('CreatedAt')) {
          processedFilters[key] = value; // Keep as string for date values
        } else {
          processedFilters[key] = parseFloat(value);
        }
      }
    });

    console.log('🔍 Applying filters:', processedFilters);
    onFilter(processedFilters);
    setModalOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      minLiquidity: '',
      maxLiquidity: '',
      minMarketCap: '',
      maxMarketCap: '',
      minVolume: '',
      maxVolume: '',
      volumeTimeframe: '24h',
      minCreatedAt: '',
      maxCreatedAt: '',
      minBuys: '',
      minSells: '',
      minTotalTransactions: ''
    });
    onFilter(null);
    setModalOpen(false);
  };

  const formatLabel = (key) => {
    const labels = {
      minLiquidity: 'Min Liquidity ($)',
      maxLiquidity: 'Max Liquidity ($)',
      minMarketCap: 'Min Market Cap ($)',
      maxMarketCap: 'Max Market Cap ($)',
      minVolume: 'Min Volume ($)',
      maxVolume: 'Max Volume ($)',
      volumeTimeframe: 'Volume Timeframe',
      minCreatedAt: 'Created After (YYYY-MM-DD)',
      maxCreatedAt: 'Created Before (YYYY-MM-DD)',
      minBuys: 'Min Buys',
      minSells: 'Min Sells',
      minTotalTransactions: 'Min Total Transactions'
    };
    return labels[key] || key;
  };

  return (
    <>
      {/* Filters Button - only show if not hidden */}
      {!hideButton && (
        <button
          onClick={() => {
            console.log('Filters button clicked!');
            setModalOpen(true);
          }}
          className={`filters-button ${isActive ? 'active' : ''} ${customClassName}`}
          style={{ pointerEvents: 'auto' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5H21V6H3V4.5ZM6 10.5H18V12H6V10.5ZM9 16.5H15V18H9V16.5Z" fill="currentColor"/>
          </svg>
          Filter
        </button>
      )}

      {/* Modal Overlay */}
      {modalOpen && (
        <div className="filter-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h2>Custom Filters</h2>
              <button 
                className="close-button"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="filter-modal-content">
              <div className="filter-section">
                <h3>Liquidity (Safety & Tradability)</h3>
                <div className="filter-row">
                  <input
                    type="number"
                    placeholder="Min Liquidity"
                    value={filters.minLiquidity}
                    onChange={(e) => handleFilterChange('minLiquidity', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Max Liquidity"
                    value={filters.maxLiquidity}
                    onChange={(e) => handleFilterChange('maxLiquidity', e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-section">
                <h3>Market Cap (Growth vs Established)</h3>
                <div className="filter-row">
                  <input
                    type="number"
                    placeholder="Min Market Cap"
                    value={filters.minMarketCap}
                    onChange={(e) => handleFilterChange('minMarketCap', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Max Market Cap"
                    value={filters.maxMarketCap}
                    onChange={(e) => handleFilterChange('maxMarketCap', e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-section">
                <h3>Volume (Liquidity + Hype Indicator)</h3>
                <div className="filter-row">
                  <input
                    type="number"
                    placeholder="Min Volume"
                    value={filters.minVolume}
                    onChange={(e) => handleFilterChange('minVolume', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Max Volume"
                    value={filters.maxVolume}
                    onChange={(e) => handleFilterChange('maxVolume', e.target.value)}
                  />
                </div>
                <div className="filter-row">
                  <select
                    value={filters.volumeTimeframe}
                    onChange={(e) => handleFilterChange('volumeTimeframe', e.target.value)}
                  >
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="6h">6 Hours</option>
                    <option value="12h">12 Hours</option>
                    <option value="24h">24 Hours</option>
                  </select>
                </div>
              </div>

              <div className="filter-section">
                <h3>Creation Date (New Launches vs Older Coins)</h3>
                <div className="filter-row">
                  <input
                    type="date"
                    value={filters.minCreatedAt}
                    onChange={(e) => handleFilterChange('minCreatedAt', e.target.value)}
                  />
                  <input
                    type="date"
                    value={filters.maxCreatedAt}
                    onChange={(e) => handleFilterChange('maxCreatedAt', e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-section">
                <h3>Trading Activity (Momentum)</h3>
                <div className="filter-row">
                  <input
                    type="number"
                    placeholder="Min Buys"
                    value={filters.minBuys}
                    onChange={(e) => handleFilterChange('minBuys', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Min Sells"
                    value={filters.minSells}
                    onChange={(e) => handleFilterChange('minSells', e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-section">
                <h3>Transaction Count (Activity Filter)</h3>
                <div className="filter-row">
                  <input
                    type="number"
                    placeholder="Min Total Transactions"
                    value={filters.minTotalTransactions}
                    onChange={(e) => handleFilterChange('minTotalTransactions', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="filter-modal-footer">
              <button 
                className="clear-button"
                onClick={handleClearFilters}
              >
                Clear All
              </button>
              <button 
                className="apply-button"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdvancedFilter;
