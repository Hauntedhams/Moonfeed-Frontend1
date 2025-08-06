import React, { useState } from 'react'
import './App.css'
import TokenScroller from './components/TokenScroller'
import FavoritesGrid from './components/FavoritesGrid'
import BottomNavBar from './components/BottomNavBar'
import FilterModal from './components/FilterModal'
import JupiterTradingSimple from './components/JupiterTradingSimple'
// import WalletProvider from './components/WalletProvider'

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favorites') || '[]');
    } catch {
      return [];
    }
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({ type: 'new' });
  const [selectedCoin, setSelectedCoin] = useState(null); // For full coin view
  const [currentViewedCoin, setCurrentViewedCoin] = useState(null); // For trading
  const [visibleCoins, setVisibleCoins] = useState([]); // Track currently visible coins

  // Listen for favorites changes from TokenScroller
  const handleFavoritesChange = (newFavs) => {
    setFavorites(newFavs);
  };

  // Handle coin click from favorites grid
  const handleCoinClick = (coin) => {
    setSelectedCoin(coin);
    setActiveTab('coin-detail');
  };

  // Handle trade button click - should set the current coin being viewed
  const handleTradeClick = (coin) => {
    setCurrentViewedCoin(coin);
    setActiveTab('trade');
  };

  // Handle global trade button click (from nav) - use the first visible coin
  const handleGlobalTradeClick = () => {
    if (visibleCoins.length > 0) {
      setCurrentViewedCoin(visibleCoins[0]);
      setActiveTab('trade');
    }
  };

  // Handle visible coins update from TokenScroller
  const handleVisibleCoinsChange = (coins) => {
    setVisibleCoins(coins);
  };

  // Show modal when Filters tab is active
  React.useEffect(() => {
    if (activeTab === 'filters') setFilterModalOpen(true);
    else setFilterModalOpen(false);
  }, [activeTab]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setActiveTab('home'); // Go back to home after applying
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', paddingBottom: 72 }}>
      {activeTab === 'trade' ? (
          <JupiterTradingSimple 
            selectedCoin={currentViewedCoin} 
            onBack={() => setActiveTab('home')} 
          />
        ) : activeTab === 'favorites' ? (
          <FavoritesGrid
            favorites={favorites}
            onCoinClick={handleCoinClick}
            onFavoritesChange={handleFavoritesChange}
          />
        ) : activeTab === 'coin-detail' && selectedCoin ? (
        <div style={{ position: 'relative' }}>
          {/* Back button for coin detail view */}
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              position: 'fixed',
              top: 20,
              left: 20,
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.9)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              width: 44,
              height: 44,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 0, 0, 0.9)';
              e.target.style.transform = 'scale(1)';
            }}
            title="Back to favorites"
          >
            ←
          </button>
          <TokenScroller
            onFavoritesChange={handleFavoritesChange}
            favorites={[selectedCoin]} // Show only the selected coin
            filters={{}}
            onlyFavorites={true}
            onTradeClick={handleTradeClick}
          />
        </div>        ) : (
          <TokenScroller
            onFavoritesChange={handleFavoritesChange}
            favorites={favorites}
            filters={filters}
            onlyFavorites={false}
            onTradeClick={handleTradeClick}
            onVisibleCoinsChange={handleVisibleCoinsChange}
          />
        )}
        <BottomNavBar 
          activeTab={activeTab === 'coin-detail' ? 'favorites' : activeTab} 
          setActiveTab={(tab) => {
            if (tab === 'trade') {
              handleGlobalTradeClick();
            } else {
              setActiveTab(tab);
            }
          }} 
        />
        <FilterModal
          visible={filterModalOpen}
          onClose={() => setActiveTab('home')}
          onApply={handleApplyFilters}
          initialFilters={filters}
        />
      </div>
  )
}

export default App
