import React, { useState, useEffect } from 'react'
import './SimpleApp.css'
import ModernTokenScroller from './components/ModernTokenScroller'
import BottomNavBar from './components/BottomNavBar'
import TopTabs from './components/TopTabs'

function SimpleApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [favorites, setFavorites] = useState([]);
  const [filters, setFilters] = useState({ type: 'trending' });

  // Handle favorites change
  const handleFavoritesChange = (newFavs) => {
    setFavorites(newFavs);
  };

  // Handle top tab filter changes
  const handleTopTabFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Handle trade click (placeholder)
  const handleTradeClick = (coin) => {
    console.log('Trade clicked for:', coin.name);
  };

  return (
    <div className="app-container">
      {/* Top tabs */}
      <TopTabs 
        activeFilter={filters.type || 'trending'} 
        onFilterChange={handleTopTabFilterChange}
      />
      
      {/* Main coin scroller */}
      <ModernTokenScroller
        onFavoritesChange={handleFavoritesChange}
        favorites={favorites}
        filters={filters}
        onlyFavorites={false}
        onTradeClick={handleTradeClick}
      />
      
      {/* Bottom navigation */}
      <BottomNavBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />
    </div>
  )
}

export default SimpleApp
