import React, { useState, lazy, Suspense } from 'react'
import './App.css'
import TokenScroller from './components/TokenScroller'
import FavoritesGrid from './components/FavoritesGrid'
import BottomNavBar from './components/BottomNavBar'
import FilterModal from './components/FilterModal'
import TopTabs from './components/TopTabs'
import JupiterEmbedModal from './components/JupiterEmbedModal'
import WalletDebug from './components/WalletDebug'
import DarkModeToggle from './components/DarkModeToggle'
import CoinSearchModal from './components/CoinSearchModal'

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
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [filters, setFilters] = useState({ type: 'new' });
  const [selectedCoin, setSelectedCoin] = useState(null); // For full coin view
  const [currentViewedCoin, setCurrentViewedCoin] = useState(null); // For trading
  const [visibleCoins, setVisibleCoins] = useState([]); // Track currently visible coins
  const [tradingModalOpen, setTradingModalOpen] = useState(false); // For trading modal
  const [tradeCoin, setTradeCoin] = useState(null); // Coin explicitly chosen for trading

  // Listen for favorites changes from TokenScroller
  const handleFavoritesChange = (newFavs) => {
    setFavorites(newFavs);
  };

  // Handle coin click from favorites grid
  const handleCoinClick = (coin) => {
    setSelectedCoin(coin);
    setCurrentViewedCoin(coin); // Ensure the current viewed coin is set for trading
    setActiveTab('coin-detail');
  };

  // Handle trade button click - should set the current coin being viewed
  const handleTradeClick = (coin) => {
    setCurrentViewedCoin(coin);
    setTradeCoin(coin);
    setTradingModalOpen(true);
  };

  // Handle global trade button click (from nav) - use the current viewed coin
  const handleGlobalTradeClick = () => {
    const coin = currentViewedCoin || (visibleCoins.length > 0 ? visibleCoins[0] : null);
    if (coin) {
      setTradeCoin(coin);
      setTradingModalOpen(true);
    }
  };

  // Handle visible coins update from TokenScroller
  const handleVisibleCoinsChange = (coins) => {
    setVisibleCoins(coins);
  };

  // Handle current coin change from TokenScroller (for auto-tracking the coin in view)
  const handleCurrentCoinChange = (coin) => {
    setCurrentViewedCoin(coin);
  };

  // Ensure the current viewed coin is set when viewing a specific coin detail
  React.useEffect(() => {
    if (activeTab === 'coin-detail' && selectedCoin) {
      setCurrentViewedCoin(selectedCoin);
    }
  }, [activeTab, selectedCoin]);

  // Show modal when Filters tab is active
  React.useEffect(() => {
    if (activeTab === 'filters') setFilterModalOpen(true);
    else setFilterModalOpen(false);
  }, [activeTab]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setActiveTab('home'); // Go back to home after applying
  };

  // Handle top tab filter changes
  const handleTopTabFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Handle search modal
  const handleSearchClick = () => {
    setSearchModalOpen(true);
  };

  const handleSearchClose = () => {
    setSearchModalOpen(false);
  };

  // Handle found coin from search
  const handleCoinFound = (coinData) => {
    // Set the found coin as selected and navigate to coin detail view
    setSelectedCoin(coinData);
    setCurrentViewedCoin(coinData);
    setActiveTab('coin-detail');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', paddingBottom: 72 }}>
      {/* Dark Mode Toggle - Always visible in top left */}
      <DarkModeToggle />
      
      {/* Top tabs - only show on home screen */}
      {activeTab !== 'favorites' && activeTab !== 'coin-detail' && (
        <TopTabs 
          activeFilter={filters.type || 'new'} 
          onFilterChange={handleTopTabFilterChange}
        />
      )}
      
      <div style={{ paddingTop: activeTab !== 'favorites' && activeTab !== 'coin-detail' ? '40px' : '0' }}>
        {activeTab === 'favorites' ? (
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
              left: 80, // Moved right to avoid dark mode toggle
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
            onCurrentCoinChange={handleCurrentCoinChange}
          />
        </div>
      ) : (
        <TokenScroller
          onFavoritesChange={handleFavoritesChange}
          favorites={favorites}
          filters={filters}
          onlyFavorites={false}
          onTradeClick={handleTradeClick}
          onVisibleCoinsChange={handleVisibleCoinsChange}
          onCurrentCoinChange={handleCurrentCoinChange}
        />
      )}
      </div>
      
      {/* Jupiter Embed Modal - Official Jupiter Plugin */}
      {tradingModalOpen && (
        <Suspense fallback={<div>Loading trading interface...</div>}>
          <JupiterEmbedModal
            visible={tradingModalOpen}
            onClose={() => { setTradingModalOpen(false); setTradeCoin(null); }}
            selectedCoin={tradeCoin || currentViewedCoin}
          />
        </Suspense>
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
        onSearchClick={handleSearchClick}
      />
      <FilterModal
        visible={filterModalOpen}
        onClose={() => setActiveTab('home')}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
      <CoinSearchModal
        visible={searchModalOpen}
        onClose={handleSearchClose}
        onCoinFound={handleCoinFound}
      />
      <CoinSearchModal
        visible={searchModalOpen}
        onClose={handleSearchClose}
        onCoinSelect={handleCoinFound}
      />
    </div>
  )
}

export default App
