import React, { useState } from 'react';
import './TopTradersList.css';

const TopTradersList = ({ coinAddress }) => {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const loadTopTraders = async () => {
    if (!coinAddress) {
      setError('No coin address provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Loading top traders for: ${coinAddress}`);
      
      const response = await fetch(`http://localhost:3001/api/top-traders/${coinAddress}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch top traders');
      }

      if (result.success && result.data) {
        setTraders(result.data);
        setLoaded(true);
        console.log(`✅ Loaded ${result.data.length} top traders`);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (err) {
      console.error('❌ Error loading top traders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatWallet = (wallet) => {
    if (!wallet) return 'Unknown';
    // Make wallet address even shorter for better space utilization
    return `${wallet.slice(0, 2)}...${wallet.slice(-2)}`;
  };

  const formatTokenAmount = (amount) => {
    if (amount === 0) return '-';
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toFixed(0);
  };

  const formatCurrency = (amount) => {
    if (amount === 0) return '-';
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) return `$${(absAmount / 1000000).toFixed(1)}M`;
    if (absAmount >= 1000) return `$${(absAmount / 1000).toFixed(1)}K`;
    return `$${absAmount.toFixed(0)}`;
  };

  const formatTransactionCount = (count) => {
    if (!count) return '';
    return ` / ${count} txns`;
  };

  if (!loaded && !loading) {
    return (
      <div className="top-traders-container">
        <button 
          className="load-traders-btn"
          onClick={loadTopTraders}
          disabled={!coinAddress}
        >
          Load Top Traders
        </button>
        {!coinAddress && (
          <p className="no-address-message">No coin address available</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="traders-loading">
        <div className="loading-spinner" />
        <p>Loading top traders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="traders-error">
        <p>❌ {error}</p>
        <button 
          className="retry-btn"
          onClick={loadTopTraders}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="top-traders-container">
      <div className="top-traders-header">
        <h3>Top Traders</h3>
        <button 
          className="refresh-traders-btn"
          onClick={loadTopTraders}
          disabled={loading}
        >
          {loading ? '↻' : '↻'}
        </button>
      </div>
      
      {traders.length === 0 ? (
        <div className="no-traders">No trader data available</div>
      ) : (
        <div className="traders-table-container">
          <div className="traders-table">
            <div className="table-header">
              <div className="header-cell rank">RANK</div>
              <div className="header-cell maker">MAKER</div>
              <div className="header-cell bought">BOUGHT</div>
              <div className="header-cell sold">SOLD</div>
              <div className="header-cell pnl">PNL</div>
            </div>
            
            {traders.map((trader, index) => (
              <div key={trader.wallet || index} className="table-row">
                <div className="table-cell rank">#{index + 1}</div>
                <div className="table-cell maker">
                  <span className="twitter-icon">🐦</span>
                  <span className="wallet-address">{formatWallet(trader.wallet)}</span>
                </div>
                <div className="table-cell bought">
                  <div className="amount-primary">{formatCurrency(trader.total_invested || 0)}</div>
                  <div className="amount-secondary">{formatTokenAmount(trader.held || 0)}{formatTransactionCount(trader.buy_txns)}</div>
                </div>
                <div className="table-cell sold">
                  <div className="amount-primary">{formatCurrency(trader.realized || 0)}</div>
                  <div className="amount-secondary">{formatTokenAmount(trader.sold || 0)}{formatTransactionCount(trader.sell_txns)}</div>
                </div>
                <div className="table-cell pnl">
                  <div className={`pnl-amount ${trader.total >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(trader.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopTradersList;
