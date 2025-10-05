import React, { useState, useEffect, lazy, Suspense } from 'react'
import './App.css'
import ModernTokenScroller from './components/ModernTokenScroller'
import FavoritesGrid from './components/FavoritesGrid'
import BottomNavBar from './components/BottomNavBar'
import TopTabs from './components/TopTabs'
import WalletDebug from './components/WalletDebug'
import CoinSearchModal from './components/CoinSearchModal'
import CoinListModal from './components/CoinListModal'
import ProfileView from './components/ProfileView'
import JupiterTradeModal from './components/JupiterTradeModal'

function App() {
  console.log('%cMoonfeed redeploy test: build timestamp ' + new Date().toISOString(), 'background: #4caf50; color: white; padding:4px;');

  const [activeTab, setActiveTab] = useState('home');
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favorites') || '[]');
    } catch {
      return [];
    }
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [filters, setFilters] = useState({ type: 'trending' });
  const [advancedFilters, setAdvancedFilters] = useState(null); // For advanced filtering
  const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false); // For filter modal state
  const [selectedCoin, setSelectedCoin] = useState(null); // For full coin view
  const [currentViewedCoin, setCurrentViewedCoin] = useState(null); // For current viewing
  const [visibleCoins, setVisibleCoins] = useState([]); // Track currently visible coins
  const [tradeModalOpen, setTradeModalOpen] = useState(false); // Jupiter trade modal
  const [coinToTrade, setCoinToTrade] = useState(null); // Coin selected for trading
  const [coinListModalOpen, setCoinListModalOpen] = useState(false); // Coin list modal
  const [coinListModalFilter, setCoinListModalFilter] = useState(null); // Filter type for coin list modal

  // Listen for favorites changes from TokenScroller
  const handleFavoritesChange = (newFavs) => {
    setFavorites(newFavs);
  };

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error);
    }
  }, [favorites]);

  // Handle coin click from favorites grid
  const handleCoinClick = (coin) => {
    setSelectedCoin(coin);
    setCurrentViewedCoin(coin); // Ensure the current viewed coin is set
    setActiveTab('coin-detail');
  };

  // Handle trade button click - open Jupiter modal with the coin
  const handleTradeClick = (coin) => {
    console.log('🚀 Trade button clicked for:', coin?.symbol);
    if (coin) {
      setCoinToTrade(coin);
      setTradeModalOpen(true);
    }
  };

  // Handle global trade button click - trade current viewed coin
  const handleGlobalTradeClick = () => {
    console.log('🚀 Global trade button clicked!');
    if (currentViewedCoin) {
      setCoinToTrade(currentViewedCoin);
      setTradeModalOpen(true);
    } else {
      console.log('⚠️ No coin currently viewed for trading');
    }
  };

  // Handle visible coins update from TokenScroller
  const handleVisibleCoinsChange = (coins) => {
    setVisibleCoins(coins);
  };

  // Handle current coin change from TokenScroller (for auto-tracking the coin in view)
  const handleCurrentCoinChange = (coin, index) => {
    console.log('🎯 APP: Current coin changed:', {
      symbol: coin?.symbol,
      mintAddress: coin?.mintAddress,
      index: index,
      isEnriched: coin?.enriched,
      hasRealData: coin?.market_cap_usd > 0
    });
    
    setCurrentViewedCoin(coin);
  };

  // Ensure the current viewed coin is set when viewing a specific coin detail
  React.useEffect(() => {
    if (activeTab === 'coin-detail' && selectedCoin) {
      setCurrentViewedCoin(selectedCoin);
    }
  }, [activeTab, selectedCoin]);

  // Handle top tab filter changes
  const handleTopTabFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Clear advanced filters when using top tabs
    setAdvancedFilters(null);
    setIsAdvancedFilterActive(false);
  };

  // Handle advanced filter changes
  const handleAdvancedFilter = (advancedFilterParams) => {
    console.log('🔧 APP: Advanced filters applied:', advancedFilterParams);
    setAdvancedFilters(advancedFilterParams);
    setIsAdvancedFilterActive(true);
    // Switch to custom tab when advanced filters are applied
    console.log('🔧 APP: Switching to custom tab');
    setFilters({ type: 'custom' });
  };

  // Handle active tab click - show coin list modal
  const handleActiveTabClick = (filterType) => {
    console.log('📋 Active tab clicked, showing coin list for:', filterType);
    setCoinListModalFilter(filterType);
    setCoinListModalOpen(true);
  };

  // Handle coin selection from coin list modal
  const handleCoinFromList = (coin) => {
    console.log('🪙 Coin selected from list:', coin.symbol);
    setSelectedCoin(coin);
    setCurrentViewedCoin(coin);
    setActiveTab('coin-detail');
    setCoinListModalOpen(false);
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

  // Handle Jupiter swap success
  const handleSwapSuccess = ({ txid, swapResult, quoteResponseMeta, coin }) => {
    console.log('🎉 Swap successful for', coin.symbol, 'TX:', txid);
    // You can add success notifications, analytics, etc. here
    // Modal will remain open to show success state
  };

  // Handle Jupiter swap error
  const handleSwapError = ({ error, quoteResponseMeta, coin }) => {
    console.error('❌ Swap failed for', coin.symbol, error);
    // You can add error notifications, analytics, etc. here
  };

  // Handle Jupiter modal close
  const handleTradeModalClose = () => {
    setTradeModalOpen(false);
    setCoinToTrade(null);
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', paddingBottom: 72 }}>
      {/* Top tabs - only show on home screen */}
      {activeTab !== 'favorites' && activeTab !== 'coin-detail' && activeTab !== 'profile' && (
        <TopTabs 
          activeFilter={filters.type || 'trending'} 
          onFilterChange={handleTopTabFilterChange}
          onActiveTabClick={handleActiveTabClick}
          showFilterButton={false}
          onFilterClick={() => {
            setIsFilterModalOpen(true);
          }}
          isFilterActive={isAdvancedFilterActive}
        />
      )}
      
      <div style={{ paddingTop: '0' }}>
        {activeTab === 'favorites' ? (
        <FavoritesGrid
          favorites={favorites}
          onCoinClick={handleCoinClick}
          onFavoritesChange={handleFavoritesChange}
        />
      ) : activeTab === 'profile' ? (
        <ProfileView />
      ) : activeTab === 'coin-detail' && selectedCoin ? (
        <div style={{ position: 'relative' }}>
          {/* Back button for coin detail view */}
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              position: 'fixed',
              top: 20,
              left: 20, // Moved back to left edge since dark mode toggle is removed
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
          <ModernTokenScroller
            onFavoritesChange={handleFavoritesChange}
            favorites={[selectedCoin]} // Show only the selected coin
            filters={{}}
            onlyFavorites={true}
            onTradeClick={handleTradeClick}
            onCurrentCoinChange={handleCurrentCoinChange}
            advancedFilters={null}
            showFiltersButton={false} // Don't show filters in coin detail view
          />
        </div>
      ) : (
        <ModernTokenScroller
          onFavoritesChange={handleFavoritesChange}
          favorites={favorites}
          filters={filters}
          onlyFavorites={false}
          onTradeClick={handleTradeClick}
          onVisibleCoinsChange={handleVisibleCoinsChange}
          onCurrentCoinChange={handleCurrentCoinChange}
          advancedFilters={advancedFilters}
          onAdvancedFilter={handleAdvancedFilter}
          isAdvancedFilterActive={isAdvancedFilterActive}
          showFiltersButton={true} // Show filters button on home view
        />
      )}
      </div>
      
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
      <CoinSearchModal
        visible={searchModalOpen}
        onClose={handleSearchClose}
        onCoinSelect={handleCoinFound}
      />
      
      {/* Coin List Modal */}
      <CoinListModal
        visible={coinListModalOpen}
        onClose={() => setCoinListModalOpen(false)}
        filterType={coinListModalFilter}
        onCoinSelect={handleCoinFromList}
      />
      
      {/* Jupiter Trade Modal */}
      <JupiterTradeModal
        isOpen={tradeModalOpen}
        onClose={handleTradeModalClose}
        coin={coinToTrade}
        onSwapSuccess={handleSwapSuccess}
        onSwapError={handleSwapError}
      />
    </div>
  )
}

export default App
