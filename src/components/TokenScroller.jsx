import React, { useEffect, useState, useRef, useCallback } from 'react';
import './TokenScroller.css';
import CoinCard from './CoinCard';

const API_BASE = 'http://localhost:4000/api/coins';

function TokenScroller({ favorites = [], onlyFavorites = false, onFavoritesChange, filters = {}, onTradeClick, onVisibleCoinsChange, onCurrentCoinChange }) {
  const [coins, setCoins] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [currentCoinIndex, setCurrentCoinIndex] = useState(0);
  // Use only local state for favorites if not in favorites-only mode
  const [localFavorites, setLocalFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favorites') || '[]');
    } catch {
      return [];
    }
  });
  const containerRef = useRef(null);

  // Helper to get correct endpoint
  const getApiUrl = () => {
    if (filters?.type === 'trending') {
      // Use homepage trending endpoint for curated meme coins
      return `${API_BASE}/homepage-trending`;
    } else if (filters?.type === 'graduating') {
      return `${API_BASE}/graduating`;
    } else {
      return `${API_BASE}/infinite`;
    }
  };

  // Reset coins when filters change (not just type)
  useEffect(() => {
    if (!onlyFavorites) {
      setCoins([]);
      setOffset(0);
      setHasMore(true); // <-- set hasMore to true BEFORE fetchNextCoins
      setTimeout(() => {
        fetchNextCoins(0, true);
      }, 0);
    }
    // eslint-disable-next-line
  }, [JSON.stringify(filters), onlyFavorites]);

  useEffect(() => {
    if (!onlyFavorites) fetchNextCoins(0);
    // eslint-disable-next-line
  }, [onlyFavorites]);

  // Fetch coins from correct endpoint
  const fetchNextCoins = async (startOffset, reset = false) => {
    // Only block fetch if loading, or if !hasMore and not a reset
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${getApiUrl()}?offset=${startOffset}&limit=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (!data.coins || !Array.isArray(data.coins)) throw new Error('Malformed API response');
      if (data.coins.length === 0) {
        setHasMore(false);
      } else {
        setCoins(prev => reset ? data.coins : [...prev, ...data.coins]);
        setOffset(prev => reset ? data.coins.length : prev + data.coins.length);
      }
    } catch (err) {
      setError(err.message || 'Failed to load coins');
      setHasMore(false);
    }
    setLoading(false);
  };

  // Snap scroll logic (gentler)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let lastScroll = 0;
    let timeoutId = null;
    let coinTrackingTimeout = null;
    
    const onScroll = () => {
      lastScroll = container.scrollTop;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const children = Array.from(container.children);
        let closestIdx = 0;
        let minDist = Infinity;
        children.forEach((child, idx) => {
          const dist = Math.abs(child.offsetTop - lastScroll);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = idx;
          }
        });
        container.scrollTo({ top: children[closestIdx].offsetTop, behavior: 'smooth' });
      }, 200);
      
      // Load more coins when near bottom
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10 && hasMore && !loading && !onlyFavorites) {
        fetchNextCoins(offset);
      }

      // Track which coin is currently in view - THROTTLED for performance
      if (onCurrentCoinChange) {
        if (coinTrackingTimeout) clearTimeout(coinTrackingTimeout);
        coinTrackingTimeout = setTimeout(() => {
          const containerHeight = container.clientHeight;
          const scrollTop = container.scrollTop;
          const centerPoint = scrollTop + containerHeight / 2;

          // Find which coin card is in the center of the viewport
          const coinCards = container.querySelectorAll('.coin-card');
          let nearestIndex = 0;
          let smallestDistance = Infinity;

          coinCards.forEach((card, index) => {
            const cardTop = card.offsetTop;
            const cardHeight = card.offsetHeight;
            const cardCenter = cardTop + cardHeight / 2;
            const distance = Math.abs(centerPoint - cardCenter);

            if (distance < smallestDistance) {
              smallestDistance = distance;
              nearestIndex = index;
            }
          });

          if (nearestIndex !== currentCoinIndex) {
            // Get current coins to show
            const currentCoins = onlyFavorites ? favorites : coins;
            if (currentCoins[nearestIndex]) {
              setCurrentCoinIndex(nearestIndex);
              // Notify parent of current coin change
              onCurrentCoinChange(currentCoins[nearestIndex]);
            }
          }
        }, 150); // Throttle coin tracking to every 150ms
      }
    };
    container.addEventListener('scroll', onScroll);
    // Initial check to set current coin
    setTimeout(() => onScroll(), 100);
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (timeoutId) clearTimeout(timeoutId);
      if (coinTrackingTimeout) clearTimeout(coinTrackingTimeout);
    };
  }, [offset, hasMore, loading, onlyFavorites]); // Removed heavy dependencies for performance

  // Show only favorites if onlyFavorites is true, otherwise show all coins
  let coinsToShow = onlyFavorites ? favorites : coins;

  // Compute isGraduating and isTrending in a single pass
  coinsToShow = coinsToShow.map(c => {
    // --- Graduating logic ---
    let isGraduating = false;
    if (
      (c.source === 'pump.fun' || c.platform === 'pump.fun') &&
      (
        (typeof c.graduationPercent === 'number' && c.graduationPercent >= 50 && c.graduationPercent < 100) ||
        (typeof c.pumpProgress === 'number' && c.pumpProgress >= 50 && c.pumpProgress < 100) ||
        (typeof c.progress === 'number' && c.progress >= 50 && c.progress < 100)
      )
    ) {
      isGraduating = true;
    } else if (typeof c.isGraduating === 'boolean') {
      isGraduating = c.isGraduating;
    } else if (
      (c.source === 'pump.fun' || c.platform === 'pump.fun' || (c.name && c.name.toLowerCase().includes('pump.fun')))
    ) {
      const status = (c.status || c.phase || c.stage || '').toLowerCase();
      if (
        status.includes('graduate') ||
        status.includes('pending') ||
        status.includes('about') ||
        status.includes('migrat') ||
        status.includes('soon') ||
        status.includes('final')
      ) {
        isGraduating = true;
      }
      if (c.aboutToGraduate === true) isGraduating = true;
    }
    // --- Trending logic ---
    let isTrending = false;
    if (filters.type !== 'trending') {
      const now = Date.now();
      const launchTime = c.launchTime ? new Date(c.launchTime).getTime() : null;
      const minAgeMs = 24 * 60 * 60 * 1000; // 24 hours
      const hasHistory = launchTime && (now - launchTime > minAgeMs);
      if (typeof c.isTrending === 'boolean') {
        isTrending = c.isTrending;
      } else if (
        hasHistory &&
        ((typeof c.priceChange7d === 'number' && c.priceChange7d > 0) ||
         (typeof c.priceChange24h === 'number' && c.priceChange24h > 20)) &&
        (typeof c.volume === 'number' && c.volume > 100000)
      ) {
        isTrending = true;
      }
    } else {
      // For trending filter, trust backend
      isTrending = true;
    }
    return {
      ...c,
      isGraduating,
      isTrending
    };
  });

  // Apply filters if present
  if (filters) {
    if (filters.type === 'graduating') {
      // Do NOT filter by isGraduating, trust backend for graduating tab
      // coinsToShow = coinsToShow.filter(c => c.isGraduating);
    } else if (filters.type === 'trending') {
      // Do not filter by isTrending, trust backend
      // coinsToShow = coinsToShow.filter(c => c.isTrending);
    } else if (filters.type === 'new') {
      coinsToShow = coinsToShow.filter(c => !c.isGraduating && !c.isTrending);
    }
    if (filters.marketCapMin !== undefined) {
      coinsToShow = coinsToShow.filter(c => Number(c.marketCap) >= filters.marketCapMin);
    }
    if (filters.marketCapMax !== undefined) {
      coinsToShow = coinsToShow.filter(c => Number(c.marketCap) <= filters.marketCapMax);
    }
    if (filters.volumeMin !== undefined) {
      coinsToShow = coinsToShow.filter(c => Number(c.volume) >= filters.volumeMin);
    }
    if (filters.volumeMax !== undefined) {
      coinsToShow = coinsToShow.filter(c => Number(c.volume) <= filters.volumeMax);
    }
    if (filters.liquidityMin !== undefined) {
      coinsToShow = coinsToShow.filter(c => Number(c.liquidity) >= filters.liquidityMin);
    }
    if (filters.liquidityMax !== undefined) {
      coinsToShow = coinsToShow.filter(c => Number(c.liquidity) <= filters.liquidityMax);
    }
  }

  // Update visible coins for parent component
  useEffect(() => {
    if (onVisibleCoinsChange && coinsToShow.length > 0) {
      onVisibleCoinsChange(coinsToShow);
    }
  }, [coinsToShow, onVisibleCoinsChange]);

  // Use correct favorites list for toggling
  const favList = onlyFavorites ? favorites : localFavorites;

  // Helper to toggle favorite
  const toggleFavorite = (coin) => {
    const update = (prev) => {
      const exists = prev.some(fav => fav.id === coin.id);
      let updated;
      if (exists) {
        updated = prev.filter(fav => fav.id !== coin.id);
      } else {
        updated = [...prev, coin];
      }
      localStorage.setItem('favorites', JSON.stringify(updated));
      if (onFavoritesChange) onFavoritesChange(updated);
      return updated;
    };
    if (!onlyFavorites) {
      setLocalFavorites(update);
    } else {
      // In favorites mode, update via callback only
      if (onFavoritesChange) onFavoritesChange(update(favorites));
    }
  };

  // Optimize handlers with useCallback to prevent unnecessary re-renders
  const handleFavoriteToggle = useCallback((coin) => {
    const newFavorites = localFavorites.some(fav => fav.id === coin.id)
      ? localFavorites.filter(fav => fav.id !== coin.id)
      : [...localFavorites, coin];
    
    setLocalFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    if (onFavoritesChange) onFavoritesChange(newFavorites);
  }, [localFavorites, onFavoritesChange]);

  const handleTradeClick = useCallback((coin) => {
    if (onTradeClick) onTradeClick(coin);
  }, [onTradeClick]);

  return (
    <div className="token-scroller-container" ref={containerRef} style={{
      overflowY: 'scroll',
      height: '100vh',
      scrollSnapType: 'y mandatory',
      background: '#000000',
      paddingTop: '2vh' // reduced from 10vh to move content down
    }}>
      {console.log('TokenScroller render', { coinsToShow, error, loading, onlyFavorites })}
      {error && (
        <div style={{ color: '#e2557b', textAlign: 'center', marginTop: 40, fontSize: 20 }}>
          Error: {error}
        </div>
      )}
      {!loading && !error && coinsToShow.length === 0 && (
        <div style={{ color: '#fff', textAlign: 'center', marginTop: 40, fontSize: 20 }}>
          No coins found.
        </div>
      )}
      {coinsToShow.map((coin, idx) => (
        <div
          className="coin-card"
          key={coin.id || idx}
          style={{
            scrollSnapAlign: 'start',
            minHeight: '85vh', // reduced from 90vh to 85vh to reduce bottom space
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'rgba(255,255,255,0.03)',
            transition: 'background 0.7s cubic-bezier(.4,0,.2,1)',
            borderRadius: '32px',
            boxShadow: '0 4px 32px 0 rgba(0,0,0,0.10)',
            margin: '15vh auto 5vh auto', // increased top margin from 5vh to 15vh to shift card down, reduced bottom margin to use that space
            transform: 'translateY(20px)', // add 20px downward shift
            maxWidth: 650,
            padding: '0 0 8px 0' // reduced from 16px to 8px to remove more bottom space
          }}
        >
          {/* Graduation Status Icon */}
          {((coin.isGraduating && (coin.source === 'pump.fun' || coin.platform === 'pump.fun')) || (typeof coin.graduationPercent === 'number' && coin.graduationPercent >= 100)) && (
            <div style={{
              position: 'absolute',
              top: 16, // reduced from 24
              right: 24, // reduced from 32
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6, // reduced from 8
              background: 'rgba(255,255,255,0.13)',
              borderRadius: 12, // reduced from 16
              padding: '4px 12px', // reduced from '6px 16px'
              boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
              fontWeight: 600,
              color: coin.graduationPercent >= 100 ? '#53c7e8' : '#e2557b',
              fontSize: 15 // reduced from 17
            }}>
              <span role="img" aria-label={coin.graduationPercent >= 100 ? 'Graduated' : 'About to Graduate'} style={{fontSize: 18}}>
                {coin.graduationPercent >= 100 ? '🎉' : '🎓'}
              </span>
              <span>{coin.graduationPercent >= 100 ? 'Graduated!' : 'About to graduate!'}</span>
            </div>
          )}
          {/* Banner - compact, 3:1 aspect ratio */}
          <div className="coin-banner" style={{
            backgroundImage: `url(${coin.banner || '/banner-placeholder.jpg'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '92%',
            aspectRatio: '3 / 1', // Ensures 3:1 aspect ratio
            minHeight: 70, // reduced from 80
            maxHeight: 100, // reduced from 120
            margin: '12px auto 6px auto', // reduced margins: top 16->12, bottom 8->6
            borderRadius: '20px', // slightly smaller radius
            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)'
          }} />
          <div className="coin-profile-row" style={{ width: '92%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 auto 8px auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img className="coin-profile-pic" src={coin.profilePic || '/profile-placeholder.png'} alt={coin.symbol || coin.name || 'coin'} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="coin-name" style={{ marginLeft: 8, fontWeight: 600, color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {coin.symbol && coin.symbol.trim() !== '' && coin.symbol !== '???' ? <b>${coin.symbol}</b> : null}
                  {coin.name && coin.name.trim() !== '' && coin.name !== 'Unknown Coin' && coin.name !== coin.symbol ? ` ${coin.name}` : null}
                  {/* Fallback: show token address if name/symbol missing */}
                  {((!coin.symbol || coin.symbol.trim() === '' || coin.symbol === '???') && (!coin.name || coin.name.trim() === '' || coin.name === 'Unknown Coin')) ? (
                    coin.tokenAddress ? (
                      <span style={{ fontSize: 14, color: '#bbb', marginLeft: 8 }}>
                        {coin.tokenAddress.slice(0, 6)}...{coin.tokenAddress.slice(-4)}
                        <button
                          style={{ marginLeft: 6, background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 14 }}
                          title="Copy address"
                          onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(coin.tokenAddress); }}
                        >📋</button>
                      </span>
                    ) : ' Unknown Coin'
                  ) : null}
                  {/* Graduation Status Text/Icon next to name */}
                  {(() => {
                    // Use backend-provided fields if present
                    if (coin.isGraduated) {
                      return (
                        <span style={{ marginLeft: 10, color: '#53c7e8', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                          🎉 Graduated!
                        </span>
                      );
                    } else if (coin.isAboutToGraduate) {
                      return (
                        <span style={{ marginLeft: 10, color: '#e2557b', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                          🎓 About to graduate!
                        </span>
                      );
                    }
                    // Fallback to old logic if fields missing
                    let isGraduating = false;
                    if (
                      (coin.source === 'pump.fun' || coin.platform === 'pump.fun') &&
                      (
                        (typeof coin.graduationPercent === 'number' && coin.graduationPercent >= 50 && coin.graduationPercent < 100) ||
                        (typeof coin.pumpProgress === 'number' && coin.pumpProgress >= 50 && coin.pumpProgress < 100) ||
                        (typeof coin.progress === 'number' && coin.progress >= 50 && coin.progress < 100)
                      )
                    ) {
                      isGraduating = true;
                    } else if (typeof coin.isGraduating === 'boolean') {
                      isGraduating = coin.isGraduating;
                    } else if (
                      (coin.source === 'pump.fun' || coin.platform === 'pump.fun' || (coin.name && coin.name.toLowerCase().includes('pump.fun')))
                    ) {
                      const status = (coin.status || coin.phase || coin.stage || '').toLowerCase();
                      if (
                        status.includes('graduate') ||
                        status.includes('pending') ||
                        status.includes('about') ||
                        status.includes('migrat') ||
                        status.includes('soon') ||
                        status.includes('final')
                      ) {
                        isGraduating = true;
                      }
                      if (coin.aboutToGraduate === true) isGraduating = true;
                    }
                    if (typeof coin.graduationPercent === 'number' && coin.graduationPercent >= 100) {
                      return (
                        <span style={{ marginLeft: 10, color: '#53c7e8', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                          🎉 Graduated!
                        </span>
                      );
                    } else if (isGraduating) {
                      return (
                        <span style={{ marginLeft: 10, color: '#e2557b', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                          🎓 About to graduate!
                        </span>
                      );
                    } else {
                      return null;
                    }
                  })()}
                </span>
                {/* Coin Address Row - always show if available */}
                {coin.tokenAddress && (
                  <div style={{ marginLeft: 8, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                      {coin.tokenAddress.slice(0, 8)}...{coin.tokenAddress.slice(-6)}
                    </span>
                    <button
                      style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        border: 'none', 
                        color: '#bbb', 
                        cursor: 'pointer', 
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                      title="Copy address"
                      onClick={e => { 
                        e.stopPropagation(); 
                        navigator.clipboard.writeText(coin.tokenAddress);
                        // Optional: show feedback
                        e.target.textContent = '✓';
                        setTimeout(() => e.target.textContent = '📋', 1000);
                      }}
                    >📋</button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="favorite-btn"
                onClick={() => toggleFavorite(coin)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 28,
                  color: favList.some(fav => fav.id === coin.id) ? '#e2557b' : '#bbb',
                  transition: 'color 0.2s',
                  marginLeft: 8
                }}
                title={favList.some(fav => fav.id === coin.id) ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                {favList.some(fav => fav.id === coin.id) ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
          {/* Market Stats - moved up and simplified */}
          <div className="coin-stats-row" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '14px', margin: '8px 0 8px 0', width: '92%' }}>
            <div className="coin-stat-window" style={{ padding: '8px 12px', minWidth: 80, textAlign: 'left', flex: '0 0 auto', position: 'relative' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Price
                <div 
                  style={{ 
                    position: 'relative',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.price-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.price-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#8b8b8b', 
                    cursor: 'help',
                    border: '1px solid #8b8b8b',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>i</span>
                  <div 
                    className="price-tooltip"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.95)',
                      color: '#fff',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      width: '280px',
                      zIndex: 1000,
                      opacity: '0',
                      transition: 'opacity 0.2s',
                      pointerEvents: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff', fontSize: '14px' }}>
                      Token Price - With $10 USD you could buy{' '}
                      {(() => {
                        const price = typeof coin.priceUsd === 'number' ? coin.priceUsd : Number(coin.priceUsd) || 0;
                        if (price > 0) {
                          const tokensForTenDollars = 10 / price;
                          if (tokensForTenDollars >= 1000000) {
                            return `${(tokensForTenDollars / 1000000).toFixed(1)}M`;
                          } else if (tokensForTenDollars >= 1000) {
                            return `${(tokensForTenDollars / 1000).toFixed(1)}K`;
                          } else if (tokensForTenDollars >= 1) {
                            return tokensForTenDollars.toFixed(0);
                          } else {
                            return tokensForTenDollars.toFixed(2);
                          }
                        }
                        return '0';
                      })()} {coin.symbol || 'tokens'}
                    </div>
                    <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                      This shows the current value of one token in USD. Lower prices mean you get more tokens per dollar.
                    </div>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      💡 Look for coins with steady upward price trends and growing trading volume.
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '8px solid rgba(0, 0, 0, 0.95)'
                    }}></div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#fff', marginTop: 1, textAlign: 'left' }}>
                {typeof coin.priceUsd === 'number' && !isNaN(coin.priceUsd)
                  ? `$${coin.priceUsd.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 8})}`
                  : (typeof coin.priceUsd === 'string' && !isNaN(Number(coin.priceUsd)))
                    ? `$${Number(coin.priceUsd).toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 8})}`
                    : '$0.00'}
              </div>
            </div>
            <div className="coin-stat-window" style={{ padding: '8px 12px', minWidth: 80, textAlign: 'center', flex: '0 0 auto', position: 'relative' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                Market Cap
                <div 
                  style={{ 
                    position: 'relative',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.marketcap-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.marketcap-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#8b8b8b', 
                    cursor: 'help',
                    border: '1px solid #8b8b8b',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>i</span>
                  <div 
                    className="marketcap-tooltip"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.95)',
                      color: '#fff',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      width: '280px',
                      zIndex: 1000,
                      opacity: '0',
                      transition: 'opacity 0.2s',
                      pointerEvents: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff', fontSize: '14px' }}>
                      Market Cap - Total value of all {coin.symbol || 'tokens'} in circulation: {
                        (() => {
                          const marketCap = typeof coin.marketCap === 'number' ? coin.marketCap : Number(coin.marketCap) || 0;
                          if (marketCap >= 1000000000) {
                            return `$${(marketCap / 1000000000).toFixed(1)}B`;
                          } else if (marketCap >= 1000000) {
                            return `$${(marketCap / 1000000).toFixed(1)}M`;
                          } else if (marketCap >= 1000) {
                            return `$${(marketCap / 1000).toFixed(1)}K`;
                          } else {
                            return `$${marketCap.toLocaleString()}`;
                          }
                        })()
                      }
                    </div>
                    <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                      Market cap = price per token × total supply. It shows the coin's overall size and popularity in the market.
                    </div>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      💡 Look for coins with growing market caps and strong community backing for better stability.
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '8px solid rgba(0, 0, 0, 0.95)'
                    }}></div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#fff', marginTop: 1 }}>{
                typeof coin.marketCap === 'number' && !isNaN(coin.marketCap)
                  ? `$${coin.marketCap.toLocaleString()}`
                  : (typeof coin.marketCap === 'string' && !isNaN(Number(coin.marketCap)))
                    ? `$${Number(coin.marketCap).toLocaleString()}`
                    : '$0'
              }</div>
            </div>
            <div className="coin-stat-window" style={{ padding: '8px 12px', minWidth: 80, textAlign: 'center', flex: '0 0 auto', position: 'relative' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                Liquidity
                <div 
                  style={{ 
                    position: 'relative',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.liquidity-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.liquidity-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#8b8b8b', 
                    cursor: 'help',
                    border: '1px solid #8b8b8b',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>i</span>
                  <div 
                    className="liquidity-tooltip"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.95)',
                      color: '#fff',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      width: '280px',
                      zIndex: 1000,
                      opacity: '0',
                      transition: 'opacity 0.2s',
                      pointerEvents: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff', fontSize: '14px' }}>
                      Liquidity - Available funds for trading: {
                        (() => {
                          const liquidity = typeof coin.liquidity === 'number' ? coin.liquidity : Number(coin.liquidity) || 0;
                          if (liquidity >= 1000000) {
                            return `$${(liquidity / 1000000).toFixed(1)}M`;
                          } else if (liquidity >= 1000) {
                            return `$${(liquidity / 1000).toFixed(1)}K`;
                          } else {
                            return `$${liquidity.toLocaleString()}`;
                          }
                        })()
                      }
                    </div>
                    <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                      Liquidity represents how easily you can buy or sell tokens. Higher liquidity means less price impact when trading.
                    </div>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      💡 Look for coins with high liquidity ($100K+) and locked liquidity pools for safer trading.
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '8px solid rgba(0, 0, 0, 0.95)'
                    }}></div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#fff', marginTop: 1 }}>{
                typeof coin.liquidity === 'number' && !isNaN(coin.liquidity)
                  ? `$${coin.liquidity.toLocaleString()}`
                  : (typeof coin.liquidity === 'string' && !isNaN(Number(coin.liquidity)))
                    ? `$${Number(coin.liquidity).toLocaleString()}`
                    : '$0'
              }
                {coin.liquidityLocked === true && <span title="Liquidity Locked" style={{color: 'green', marginLeft: 4}}>🔒</span>}
                {coin.liquidityLocked === false && <span title="Liquidity Unlocked" style={{color: 'red', marginLeft: 4}}>🔓</span>}
              </div>
            </div>
            <div className="coin-stat-window" style={{ padding: '8px 12px', minWidth: 80, textAlign: 'center', flex: '0 0 auto', position: 'relative' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                Volume
                <div 
                  style={{ 
                    position: 'relative',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.volume-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.volume-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#8b8b8b', 
                    cursor: 'help',
                    border: '1px solid #8b8b8b',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>i</span>
                  <div 
                    className="volume-tooltip"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.95)',
                      color: '#fff',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      width: '280px',
                      zIndex: 1000,
                      opacity: '0',
                      transition: 'opacity 0.2s',
                      pointerEvents: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff', fontSize: '14px' }}>
                      Volume - Total trading activity in 24h: {
                        (() => {
                          const volume = typeof coin.volume === 'number' ? coin.volume : Number(coin.volume) || 0;
                          if (volume >= 1000000) {
                            return `$${(volume / 1000000).toFixed(1)}M`;
                          } else if (volume >= 1000) {
                            return `$${(volume / 1000).toFixed(1)}K`;
                          } else {
                            return `$${volume.toLocaleString()}`;
                          }
                        })()
                      }
                    </div>
                    <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                      Volume shows how much money was traded in the last 24 hours. Higher volume indicates more interest and activity.
                    </div>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      💡 Look for coins with consistent high volume ($50K+) and increasing volume trends for momentum.
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '8px solid rgba(0, 0, 0, 0.95)'
                    }}></div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#fff', marginTop: 1 }}>{
                typeof coin.volume === 'number' && !isNaN(coin.volume)
                  ? `$${coin.volume.toLocaleString()}`
                  : (typeof coin.volume === 'string' && !isNaN(Number(coin.volume)))
                    ? `$${Number(coin.volume).toLocaleString()}`
                    : '$0'
              }</div>
            </div>
          </div>
          {/* Chart Section - compact, modern, rounded */}
          <div className="coin-chart" style={{
            width: '92%',
            maxWidth: 600,
            margin: '0 auto 0 auto',
            height: 'calc(38vh + 30px)', // increased from 35vh + 40px to 38vh + 30px for better proportion
            minHeight: '270px', // increased from 250px to match new height
            borderRadius: '18px',
            overflow: 'hidden',
            background: 'rgba(30,32,40,0.95)',
            boxShadow: '0 2px 16px 0 rgba(0,0,0,0.10)',
            padding: 0,
            border: 'none',
            position: 'relative'
          }}>
            {coin.tokenAddress && coin.chainId ? (
              <div className="h-full relative" style={{height: '100%'}}>
                {/* Custom DexScreener header at top */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '32px',
                  background: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  borderRadius: '18px 18px 0 0',
                  fontSize: '12px',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.5px'
                }}
                onClick={() => window.open(`https://dexscreener.com/${coin.chainId}/${coin.tokenAddress}`, '_blank')}
                >
                  Tracked by DEXSCREENER
                </div>

                <iframe
                  src={`https://dexscreener.com/${coin.chainId}/${coin.tokenAddress}?embed=1&theme=dark&trades=0&info=0`}
                  className="w-full h-full border-0"
                  style={{
                    background: 'transparent',
                    width: 'calc(100% + 10px)',
                    height: 'calc(100% + 10px)', // reduced from 20px to 10px to expand bottom viewable area slightly more
                    minHeight: '300px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'block',
                    transform: 'translateX(-5px) translateY(-2px)', // keeping top position the same
                    marginTop: '32px'
                  }}
                  title={`${coin.symbol} Chart`}
                  allow="fullscreen"
                  loading="eager"
                  frameBorder="0"
                  onLoad={(e) => {
                    // Try to hide left sidebar and bottom toolbar by default
                    const iframe = e.target;
                    if (iframe && iframe.contentWindow) {
                      try {
                        const doc = iframe.contentDocument || iframe.contentWindow.document;
                        
                        // Hide left sidebar by default
                        const leftStyle = doc.createElement('style');
                        leftStyle.id = 'hide-left-sidebar';
                        leftStyle.innerHTML = `
                          [data-testid="layout-sidebar"], 
                          .sidebar,
                          [class*="sidebar"]:not([class*="main"]):not([class*="right"]),
                          .left-panel,
                          [class*="left-panel"],
                          .trading-panel,
                          [class*="trading-panel"] {
                            transform: translateX(-100%) !important;
                            transition: transform 0.3s ease !important;
                          }
                          .chart-area,
                          .main-chart,
                          [class*="chart-container"] {
                            margin-left: 0 !important;
                            width: 100% !important;
                          }
                        `;
                        doc.head.appendChild(leftStyle);
                        
                        // Hide bottom toolbar by default
                        const bottomStyle = doc.createElement('style');
                        bottomStyle.id = 'hide-bottom-toolbar';
                        bottomStyle.innerHTML = `
                          [data-testid="layout-footer"],
                          .footer,
                          [class*="footer"]:not([class*="main"]):not([class*="header"]),
                          .bottom-panel,
                          [class*="bottom-panel"],
                          .trading-footer,
                          [class*="trading-footer"],
                          .toolbar,
                          [class*="toolbar"]:not([class*="top"]):not([class*="header"]) {
                            transform: translateY(100%) !important;
                            transition: transform 0.3s ease !important;
                          }
                          .chart-area,
                          .main-chart,
                          [class*="chart-container"] {
                            margin-bottom: 0 !important;
                            height: 100% !important;
                          }
                        `;
                        doc.head.appendChild(bottomStyle);
                      } catch (err) {
                        console.log('Could not access iframe content (CORS restriction):', err);
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-full bg-gray-800/50 rounded-xl flex items-center justify-center" style={{ height: '180px' }}>
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Chart loading...</p>
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                </div>
              </div>
            )}
          </div>
          {/* Live price and percent change - compact below chart */}
          <div style={{
            width: '92%',
            maxWidth: 600,
            margin: '8px auto 0 auto',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            position: 'relative',
            top: '0',
            zIndex: 3
          }}>
            {/* Price removed since it's now above the chart */}
            {typeof coin.priceChange24h === 'number' && !isNaN(coin.priceChange24h) ? (
              <span style={{
                marginLeft: 0,
                color: coin.priceChange24h > 0 ? '#4be37a' : coin.priceChange24h < 0 ? '#e2557b' : '#fff',
                fontWeight: 700,
                fontSize: 13
              }}>
                {coin.priceChange24h > 0 ? '+' : ''}{coin.priceChange24h.toFixed(2)}%
              </span>
            ) : null}
          </div>
          {/* Social Icons Row - moved below the chart */}
          {(() => {
            // Helper function to extract social links from array format
            const extractSocialFromArray = (socials, type) => {
              if (!Array.isArray(socials)) return null;
              
              // For website, check both 'label' and 'type' properties
              if (type === 'website') {
                const websiteItem = socials.find(item => 
                  item.label?.toLowerCase() === 'website' || 
                  item.type?.toLowerCase() === 'website'
                );
                return websiteItem?.url || null;
              }
              
              // For other social types, check 'type' property
              const socialItem = socials.find(item => item.type?.toLowerCase() === type);
              return socialItem?.url || null;
            };
            
            // Check multiple possible social link properties for better compatibility
            const twitter = extractSocialFromArray(coin.socials, 'twitter') || 
                           coin.socials?.twitter || coin.twitter || coin.social?.twitter;
            
            const telegram = extractSocialFromArray(coin.socials, 'telegram') || 
                            coin.socials?.telegram || coin.telegram || coin.social?.telegram;
            
            const website = extractSocialFromArray(coin.socials, 'website') || 
                           coin.socials?.website || coin.website || coin.social?.website || 
                           coin.url || coin.homepage || coin.websiteUrl || coin.site;
            
            // Debug logging to see what social data is available - enhanced
            console.log(`🔍 Social debug for ${coin.symbol || coin.name || 'Unknown'}:`, {
              socialsArray: coin.socials,
              extractedTwitter: twitter,
              extractedTelegram: telegram,
              extractedWebsite: website,
              coinKeys: Object.keys(coin || {})
            });
            
            // Helper function to ensure URL has protocol
            const ensureValidUrl = (url) => {
              if (!url) return null;
              if (typeof url !== 'string') return null;
              url = url.trim();
              if (!url) return null;
              if (url.length < 4) return null; // Too short to be valid
              
              // If URL doesn't start with http/https, add https://
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return `https://${url}`;
              }
              return url;
            };
            
            const validTwitter = ensureValidUrl(twitter);
            const validTelegram = ensureValidUrl(telegram);
            const validWebsite = ensureValidUrl(website);
            
            console.log(`✅ Valid URLs for ${coin.symbol || coin.name}:`, {
              twitter: validTwitter,
              telegram: validTelegram,
              website: validWebsite
            });
            
            // Only show the container if at least one social link exists
            return (validTwitter || validTelegram || validWebsite) && (
              <div className="coin-socials-row" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px', // reduced from 24px
                width: '92%',
                margin: '2px auto 0 auto', // reduced top margin from 6px to 2px for less bottom space
                maxWidth: 600
              }}>
                {validTwitter && (
                  <a href={validTwitter} target="_blank" rel="noopener noreferrer" title="Twitter" style={{ color: '#1da1f2', fontSize: 24, transition: 'opacity 0.2s' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle' }}><path d="M22.46 5.924c-.793.352-1.646.59-2.542.698a4.48 4.48 0 0 0 1.965-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 11.1 9.03c0 .352.04.695.116 1.022C7.728 9.89 4.1 8.1 1.671 5.149a4.48 4.48 0 0 0-.607 2.254c0 1.555.792 2.928 2.002 3.734a4.48 4.48 0 0 1-2.03-.561v.057a4.48 4.48 0 0 0 3.6 4.393c-.193.052-.397.08-.607.08-.148 0-.292-.014-.432-.04a4.48 4.48 0 0 0 4.18 3.11A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.88 2.017c8.26 0 12.78-6.84 12.78-12.77 0-.195-.004-.39-.013-.583A9.1 9.1 0 0 0 24 4.59a8.93 8.93 0 0 1-2.54.697z"/></svg>
                  </a>
                )}
                {validTelegram && (
                  <a href={validTelegram} target="_blank" rel="noopener noreferrer" title="Telegram" style={{ color: '#229ED9', fontSize: 24, transition: 'opacity 0.2s' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle' }}><path d="M9.036 16.572l-.398 5.61c.57 0 .816-.244 1.112-.537l2.664-2.53 5.522 4.04c1.012.557 1.73.264 1.98-.937l3.594-16.84c.328-1.522-.553-2.12-1.54-1.76L2.16 9.47c-1.49.58-1.47 1.41-.254 1.79l4.6 1.44 10.68-6.74c.5-.32.96-.14.58.2z"/></svg>
                  </a>
                )}
                {validWebsite && (
                  <a href={validWebsite} target="_blank" rel="noopener noreferrer" title="Website" style={{ color: '#fff', fontSize: 24, transition: 'opacity 0.2s' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle' }}><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14a6 6 0 1 0 0 12A6 6 0 0 0 12 6zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>
                  </a>
                )}
              </div>
            );
          })()}
        </div>
      ))}
      {loading && hasMore && !onlyFavorites && (
        <div className="loader" style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      )}
    </div>
  );
}

export default TokenScroller;
