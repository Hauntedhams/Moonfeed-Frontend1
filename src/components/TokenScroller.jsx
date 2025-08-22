import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import './TokenScroller.css';
import CoinCard from './CoinCard';
import AboutModal from './AboutModal';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/coins`;

// Memoize the component to prevent unnecessary re-renders
const TokenScroller = React.memo(function TokenScroller({ favorites = [], onlyFavorites = false, onFavoritesChange, filters = {}, onTradeClick, onVisibleCoinsChange, onCurrentCoinChange }) {
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
  // Banner size state - persisted in localStorage
  const [bannerSize, setBannerSize] = useState(() => {
    try {
      const saved = localStorage.getItem('bannerSize');
      return saved ? JSON.parse(saved) : { width: 60, height: 20 }; // default: 60% width, 20% height of container
    } catch {
      return { width: 60, height: 20 };
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  
  // About modal state
  const [aboutModalCoin, setAboutModalCoin] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  // Symbol click animation state
  const [clickedSymbols, setClickedSymbols] = useState(new Set());
  const [copiedSymbols, setCopiedSymbols] = useState(new Set());
  // Top Traders modal state
  const [showTopTraders, setShowTopTraders] = useState(false);
  const [topTradersLoading, setTopTradersLoading] = useState(false);
  const [topTradersError, setTopTradersError] = useState(null);
  const [topTradersData, setTopTradersData] = useState({ traders: [], meta: {} });

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
      setError(null);
      setTimeout(() => {
        fetchNextCoins(0, true);
      }, 100); // Slightly longer delay for smoother UI
    }
    // eslint-disable-next-line
  }, [filters?.type, onlyFavorites]);

  useEffect(() => {
    if (!onlyFavorites && coins.length === 0 && !loading && !error) {
      // Initial load with connection check
      const checkConnectionAndLoad = async () => {
        try {
          // Quick health check with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const healthRes = await fetch(`${API_BASE.replace('/coins', '')}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (healthRes.ok) {
            console.log('✅ Backend connection verified');
            fetchNextCoins(0, true);
          } else {
            throw new Error('Backend health check failed');
          }
        } catch (err) {
          console.warn('⚠️ Health check failed, attempting direct fetch:', err);
          // Fallback to direct fetch
          fetchNextCoins(0, true);
        }
      };
      
      checkConnectionAndLoad();
    }
    // eslint-disable-next-line
  }, [onlyFavorites]);

  // Fetch coins from correct endpoint with improved error handling and retries
  const fetchNextCoins = async (startOffset, reset = false, retryCount = 0) => {
    // Only block fetch if loading, or if !hasMore and not a reset
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    setError(null);
    
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
    
    try {
      const url = `${getApiUrl()}?offset=${startOffset}&limit=10`;
      console.log('🔗 Fetching from URL:', url, retryCount > 0 ? `(retry ${retryCount}/${maxRetries})` : '');
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error(`Server temporarily unavailable (${res.status})`);
        }
        throw new Error(`API error: ${res.status} - ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format');
      }
      
      if (!data.coins || !Array.isArray(data.coins)) {
        throw new Error('Malformed API response - missing coins array');
      }
      
      if (data.coins.length === 0) {
        setHasMore(false);
        if (reset && startOffset === 0) {
          console.log('🔍 No coins available from API');
          console.log('🔍 API Response data:', data);
          console.log('🔍 Reset:', reset, 'StartOffset:', startOffset);
          setError('No coins available at the moment. Please try again later.');
        }
      } else {
        console.log(`✅ Loaded ${data.coins.length} coins (offset: ${startOffset})`);
        console.log('🔍 First coin:', data.coins[0]);
        setCoins(prev => reset ? data.coins : [...prev, ...data.coins]);
        setOffset(prev => reset ? data.coins.length : prev + data.coins.length);
      }
      
    } catch (err) {
      console.error('❌ Fetch error:', err);
      
      // Check if it's a network/timeout error that we should retry
      const shouldRetry = (
        retryCount < maxRetries && (
          err.name === 'AbortError' ||
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('502') ||
          err.message.includes('503') ||
          err.message.includes('504') ||
          err.message.includes('timeout') ||
          err.message.includes('Server temporarily unavailable')
        )
      );
      
      if (shouldRetry) {
        console.log(`🔄 Retrying in ${retryDelay}ms...`);
        setTimeout(() => {
          fetchNextCoins(startOffset, reset, retryCount + 1);
        }, retryDelay);
        return; // Don't set loading to false yet
      }
      
      // Show user-friendly error messages
      let errorMessage = 'Failed to load coins';
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message.includes('502') || err.message.includes('503') || err.message.includes('504')) {
        errorMessage = 'Server is temporarily unavailable. Please try again in a moment.';
      } else if (err.message.includes('API error')) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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

  // Banner resize handlers
  const handleBannerResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = bannerSize.width;
    const startHeight = bannerSize.height;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Calculate new dimensions as percentages
      const newWidth = Math.max(30, Math.min(95, startWidth + (deltaX / 5))); // min 30%, max 95%
      const newHeight = Math.max(10, Math.min(40, startHeight + (deltaY / 10))); // min 10%, max 40%
      
      setBannerSize({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [bannerSize]);

  // Save banner size to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('bannerSize', JSON.stringify(bannerSize));
  }, [bannerSize]);

  // Memoize the coin processing to prevent excessive recalculation
  const coinsToShow = useMemo(() => {
    // Show only favorites if onlyFavorites is true, otherwise show all coins
    let processedCoins = onlyFavorites ? favorites : coins;

    // Compute isGraduating and isTrending in a single pass
    processedCoins = processedCoins.map(c => {
    // --- Graduating logic (STRICT: 0-99% only) ---
    let isGraduating = false;
    if (
      (c.source === 'pump.fun' || c.platform === 'pump.fun') &&
      (
        (typeof c.graduationPercent === 'number' && c.graduationPercent > 0 && c.graduationPercent < 100) ||
        (typeof c.pumpProgress === 'number' && c.pumpProgress > 0 && c.pumpProgress < 100) ||
        (typeof c.progress === 'number' && c.progress > 0 && c.progress < 100)
      )
    ) {
      isGraduating = true;
    } else if (typeof c.isGraduating === 'boolean' && !c.isGraduated) {
      // Only trust isGraduating if the coin is not graduated
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
        // Only mark as graduating if not already graduated
        const graduationPercent = c.graduationPercent || c.pumpProgress || c.progress || 0;
        isGraduating = graduationPercent < 100;
      }
      if (c.aboutToGraduate === true && !c.isGraduated) isGraduating = true;
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
    // Temporarily make liquidity lock filter more lenient for testing
    // processedCoins = processedCoins.filter(c => c.liquidityLocked === true);
    
    if (filters.type === 'graduating') {
      // Trust backend for graduating filter - it already applies strict filtering for 0-99% graduation
      // Backend sorts by highest graduation percentage first for better priority
      // No additional frontend filtering needed as backend is already strict
    } else if (filters.type === 'trending') {
      // Do not filter by isTrending, trust backend
      // processedCoins = processedCoins.filter(c => c.isTrending);
    } else if (filters.type === 'new') {
      processedCoins = processedCoins.filter(c => !c.isGraduating && !c.isTrending);
    }
    if (filters.marketCapMin !== undefined) {
      processedCoins = processedCoins.filter(c => Number(c.marketCap) >= filters.marketCapMin);
    }
    if (filters.marketCapMax !== undefined) {
      processedCoins = processedCoins.filter(c => Number(c.marketCap) <= filters.marketCapMax);
    }
    if (filters.volumeMin !== undefined) {
      processedCoins = processedCoins.filter(c => Number(c.volume) >= filters.volumeMin);
    }
    if (filters.volumeMax !== undefined) {
      processedCoins = processedCoins.filter(c => Number(c.volume) <= filters.volumeMax);
    }
    if (filters.liquidityMin !== undefined) {
      processedCoins = processedCoins.filter(c => Number(c.liquidity) >= filters.liquidityMin);
    }
    if (filters.liquidityMax !== undefined) {
      processedCoins = processedCoins.filter(c => Number(c.liquidity) <= filters.liquidityMax);
    }
  }

  return processedCoins;
}, [onlyFavorites, favorites, coins, filters]);

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

  // Handle symbol click to copy token address
  const handleSymbolClick = useCallback((coin, event) => {
    event.stopPropagation();
    
    if (!coin.tokenAddress && !coin.mint) {
      return;
    }
    
    const address = coin.tokenAddress || coin.mint;
    const coinId = coin.id || address;
    
    // Copy to clipboard
    navigator.clipboard.writeText(address).then(() => {
      // Add visual feedback
      setClickedSymbols(prev => new Set([...prev, coinId]));
      setCopiedSymbols(prev => new Set([...prev, coinId]));
      
      // Remove the animation class after animation completes
      setTimeout(() => {
        setClickedSymbols(prev => {
          const newSet = new Set(prev);
          newSet.delete(coinId);
          return newSet;
        });
      }, 600);
      
      // Remove the copied message after longer delay
      setTimeout(() => {
        setCopiedSymbols(prev => {
          const newSet = new Set(prev);
          newSet.delete(coinId);
          return newSet;
        });
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy address:', err);
    });
  }, []);

  // Real-time graduation data updates (enhanced with better validation and user activity detection)
  useEffect(() => {
    if (onlyFavorites) return;
    
    let lastUserActivity = Date.now();
    let isUserActive = false;
    
    // Track user activity to avoid disrupting viewing experience
    const trackActivity = () => {
      lastUserActivity = Date.now();
      isUserActive = true;
      setTimeout(() => { isUserActive = false; }, 10000); // Consider inactive after 10 seconds
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', trackActivity);
      container.addEventListener('touchstart', trackActivity);
      container.addEventListener('click', trackActivity);
    }
    
    const updateGraduationData = async () => {
      // Skip update if user is actively interacting (prevents UI disruption)
      if (isUserActive) {
        console.log('⏸️ Skipping graduation update - user is actively viewing');
        return;
      }
      
      // Only update if we have coins and they're from pump.fun
      const coinsToUpdate = coins.filter(coin => 
        coin.tokenAddress && 
        (coin.source === 'pump.fun' || 
         coin.tokenAddress?.includes('pump') || 
         coin.tokenAddress?.endsWith('pump') ||
         coin.isGraduating === true ||
         (typeof coin.graduationPercent === 'number' && coin.graduationPercent >= 0 && coin.graduationPercent < 100))
      );
      
      if (coinsToUpdate.length === 0) return;
      
      console.log(`🔄 Updating graduation data for ${coinsToUpdate.length} pump.fun coins...`);
      
      // Update first 5 visible coins with enhanced validation
      for (const coin of coinsToUpdate.slice(0, 5)) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/graduation/${coin.tokenAddress}`);
          if (response.ok) {
            const data = await response.json();
            if (data.graduationData) {
              const newPercent = data.graduationData.graduationPercent;
              const oldPercent = coin.graduationPercent;
              const source = data.graduationData.source || 'unknown';
              const calculationMethod = data.graduationData.calculationMethod || 'unknown';
              
              // Enhanced validation: only update if the new data seems reasonable and accurate
              const isValidUpdate = (
                typeof newPercent === 'number' && 
                newPercent >= 0 && 
                newPercent <= 100 &&
                // Additional validation: change shouldn't be too dramatic unless justified
                (oldPercent === undefined || 
                 Math.abs(newPercent - oldPercent) <= 10 || // Allow max 10% change per update
                 source === 'dexscreener-calculation' || // Trust high-quality sources
                 source === 'blockchain-calculation' ||
                 (Math.abs(newPercent - oldPercent) <= 25 && calculationMethod.includes('validated'))) // Allow larger changes if validated
              );
              
              if (isValidUpdate) {
                const changeIndicator = oldPercent !== undefined ? 
                  (newPercent > oldPercent ? '📈' : newPercent < oldPercent ? '📉' : '➡️') : '🆕';
                
                console.log(`🔄 ${changeIndicator} Updating ${coin.symbol}: ${oldPercent?.toFixed(2) || 'N/A'}% -> ${newPercent.toFixed(3)}% (${source})`);
                
                // Update the coin in state with enhanced data
                setCoins(prevCoins => 
                  prevCoins.map(c => 
                    c.tokenAddress === coin.tokenAddress ? {
                      ...c,
                      graduationPercent: newPercent,
                      isGraduating: data.graduationData.isGraduating,
                      isMigrating: data.graduationData.isMigrating,
                      isGraduated: data.graduationData.isGraduated,
                      source: source,
                      calculationMethod: calculationMethod,
                      lastUpdated: Date.now(), // Track when last updated
                      metadata: data.graduationData.metadata // Include additional metadata
                    } : c
                  )
                );
              } else {
                console.warn(`⚠️ Rejected graduation data update for ${coin.symbol}: ${oldPercent?.toFixed(2) || 'N/A'}% -> ${newPercent?.toFixed(2) || 'N/A'}% (reason: validation failed, source: ${source})`);
              }
            }
          }
        } catch (e) {
          console.error(`❌ Failed to update graduation data for ${coin.symbol}:`, e);
        }
        
        // Add small delay between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    };
    
    // Update graduation data every 5 minutes (reduced from 45 seconds to prevent UX disruption)
    const intervalId = setInterval(updateGraduationData, 300000); // 5 minutes
    
    // Also update once on mount after a short delay
    const timeoutId = setTimeout(updateGraduationData, 2000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      // Clean up event listeners
      if (container) {
        container.removeEventListener('scroll', trackActivity);
        container.removeEventListener('touchstart', trackActivity);
        container.removeEventListener('click', trackActivity);
      }
    };
  }, [coins, onlyFavorites]);

  // Top Traders fetch logic
  const fetchTopTraders = useCallback(async (coin) => {
    if (!coin || !coin.chainId || !coin.tokenAddress) return;
    setTopTradersLoading(true);
    setTopTradersError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/coin/top-traders/${coin.chainId}/${coin.tokenAddress}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTopTradersData(data);
    } catch (e) {
      setTopTradersError(e.message);
    }
    setTopTradersLoading(false);
  }, []);

  const openTopTraders = (coin) => {
    setShowTopTraders(true);
    fetchTopTraders(coin);
  };
  const closeTopTraders = () => setShowTopTraders(false);

  return (
    <div className="token-scroller-container" ref={containerRef} style={{
      overflowY: 'scroll',
      height: '100vh',
      scrollSnapType: 'y mandatory',
      background: '#000000',
      paddingTop: '0' // removed padding since top tabs handle spacing now
    }}>
      {/* Removed console.log from render - was causing infinite re-renders */}
      {error && (
        <div style={{ 
          color: '#e2557b', 
          textAlign: 'center', 
          marginTop: 40, 
          fontSize: 18, 
          padding: '20px',
          background: 'rgba(226, 85, 123, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(226, 85, 123, 0.3)',
          maxWidth: '400px',
          margin: '40px auto'
        }}>
          <div style={{ marginBottom: '16px', fontSize: '24px' }}>⚠️</div>
          <div style={{ marginBottom: '12px', fontWeight: '600' }}>Error Loading Coins</div>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#ccc', lineHeight: '1.4' }}>
            {error}
          </div>
          <button
            onClick={() => {
              setError(null);
              setHasMore(true);
              fetchNextCoins(0, true);
            }}
            style={{
              background: '#e2557b',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#d63384'}
            onMouseLeave={(e) => e.target.style.background = '#e2557b'}
          >
            Try Again
          </button>
        </div>
      )}
      {!loading && !error && coinsToShow.length === 0 && (
        <div style={{ 
          color: '#fff', 
          textAlign: 'center', 
          marginTop: 40, 
          fontSize: 18,
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          maxWidth: '300px',
          margin: '40px auto'
        }}>
          <div style={{ marginBottom: '16px', fontSize: '32px' }}>🔍</div>
          <div style={{ marginBottom: '8px', fontWeight: '600' }}>No coins found</div>
          <div style={{ fontSize: '14px', color: '#bbb', lineHeight: '1.4' }}>
            Try adjusting your filters or check back later for new coins.
          </div>
        </div>
      )}
      {coinsToShow.map((coin, idx) => (
        <div
          className="coin-card"
          key={coin.id || idx}
          style={{
            scrollSnapAlign: 'center',
            minHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'transparent',
            transition: 'background 0.7s cubic-bezier(.4,0,.2,1)',
            borderRadius: '0px',
            boxShadow: 'none',
            margin: '8px auto 10vh auto', // Minimal top margin for close-to-top positioning
            transform: 'translateY(0px)', // Remove the translateY offset
            maxWidth: 650,
            padding: '0 0 8px 0'
          }}
        >
          {/* Banner - user-resizable, locked 3:1 aspect ratio */}
          <div className="coin-banner" style={{
            backgroundImage: `url(${coin.banner || '/banner-placeholder.jpg'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: `${bannerSize.width}%`, // Dynamic width from user preference
            aspectRatio: '3 / 1', // Locked 3:1 aspect ratio
            height: 'auto', // Let aspect ratio control height automatically
            margin: '4px auto 4px auto', // Minimal top margin for small gap
            borderRadius: '12px',
            boxShadow: '0 1px 8px 0 rgba(0,0,0,0.06)',
            position: 'relative',
            transition: isResizing ? 'none' : 'all 0.2s ease', // Smooth transition when not resizing
            border: isResizing ? '2px dashed rgba(255,255,255,0.5)' : 'none' // Visual feedback during resize
          }}>
            {/* Resize handle in bottom-right corner */}
            <div
              onMouseDown={handleBannerResizeStart}
              style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '4px',
                cursor: 'nw-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#333',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                zIndex: 10,
                opacity: 0.6,
                transition: 'opacity 0.2s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.6'}
              title="Drag to resize banner (3:1 ratio locked)"
            >
              ↘
            </div>
          </div>
          <div className="coin-profile-row" style={{ width: '92%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 auto 8px auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img className="coin-profile-pic" src={coin.profilePic || '/profile-placeholder.png'} alt={coin.symbol || coin.name || 'coin'} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="coin-name" style={{ marginLeft: 8, fontWeight: 600, color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {coin.symbol && coin.symbol.trim() !== '' && coin.symbol !== '???' ? (
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <b 
                        className={`coin-symbol-clickable ${clickedSymbols.has(coin.id || coin.tokenAddress || coin.mint) ? 'coin-symbol-clicked' : ''}`}
                        style={{ 
                          cursor: (coin.tokenAddress || coin.mint) ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          transform: clickedSymbols.has(coin.id || coin.tokenAddress || coin.mint) ? 'scale(0.95)' : 'scale(1)',
                          color: clickedSymbols.has(coin.id || coin.tokenAddress || coin.mint) ? '#4fc3f7' : '#fff',
                          textShadow: clickedSymbols.has(coin.id || coin.tokenAddress || coin.mint) ? '0 0 8px #4fc3f7' : 'none',
                          userSelect: 'none'
                        }}
                        onClick={(e) => handleSymbolClick(coin, e)}
                        title={(coin.tokenAddress || coin.mint) ? `Click to copy address: ${(coin.tokenAddress || coin.mint).slice(0, 8)}...${(coin.tokenAddress || coin.mint).slice(-8)}` : ''}
                      >
                        ${coin.symbol}
                      </b>
                      {copiedSymbols.has(coin.id || coin.tokenAddress || coin.mint) && (
                        <span className="copy-feedback">Copied! ✓</span>
                      )}
                    </span>
                  ) : null}
                  {coin.name && coin.name.trim() !== '' && coin.name !== 'Unknown Coin' && coin.name !== coin.symbol ? ` ${coin.name}` : null}
                  {/* Fallback: show token address if name/symbol missing */}
                  {((!coin.symbol || coin.symbol.trim() === '' || coin.symbol === '???') && (!coin.name || coin.name.trim() === '' || coin.name === 'Unknown Coin')) ? (
                    coin.tokenAddress ? (
                      <span 
                        style={{ 
                          fontSize: 14, 
                          color: '#bbb', 
                          marginLeft: 8,
                          cursor: 'pointer',
                          transition: 'color 0.2s ease',
                          userSelect: 'none'
                        }}
                        onClick={(e) => handleSymbolClick(coin, e)}
                        title={`Click to copy address: ${coin.tokenAddress.slice(0, 8)}...${coin.tokenAddress.slice(-8)}`}
                        onMouseEnter={(e) => e.target.style.color = '#4fc3f7'}
                        onMouseLeave={(e) => e.target.style.color = '#bbb'}
                      >
                        {coin.tokenAddress.slice(0, 6)}...{coin.tokenAddress.slice(-4)}
                      </span>
                    ) : ' Unknown Coin'
                  ) : null}
                </span>
                {/* Coin Description - show under name */}
                {coin.description && coin.description.trim() && (
                  <div className="coin-description-inline">
                    {(() => {
                      const description = coin.description.trim();
                      const maxLength = 120; // Characters to show before truncating
                      const isLong = description.length > maxLength;
                      
                      if (!isLong) {
                        // Short description - show it all
                        return (
                          <span className="coin-description-text coin-description-short">
                            "{description}"
                          </span>
                        );
                      } else {
                        // Long description - show truncated with read more
                        const truncated = description.substring(0, maxLength).trim() + '...';
                        return (
                          <div>
                            <span className="coin-description-text">
                              "{truncated}"
                            </span>
                            <button
                              className="read-more-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAboutModalCoin(coin);
                                setShowAboutModal(true);
                              }}
                              title="Click to read full description"
                            >
                              Read more
                            </button>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Info Button */}
              <button
                className="about-btn"
                onClick={() => {
                  setAboutModalCoin(coin);
                  setShowAboutModal(true);
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.2s',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="About this coin"
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </button>
              
              {/* Favorite Button */}
              <button
                className="favorite-btn"
                onClick={() => toggleFavorite(coin)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  color: favList.some(fav => fav.id === coin.id) ? '#ff4757' : '#fff',
                  transition: 'all 0.2s',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={favList.some(fav => fav.id === coin.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={favList.some(fav => fav.id === coin.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>

              {/* Social Links - moved here from below chart */}
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
                               coin.socials?.twitter || coin.twitter || coin.social?.twitter ||
                               coin.info?.socials?.find(s => s.type === 'twitter')?.url ||
                               coin.links?.find(l => l.type === 'twitter')?.url;
                
                const telegram = extractSocialFromArray(coin.socials, 'telegram') || 
                                coin.socials?.telegram || coin.telegram || coin.social?.telegram ||
                                coin.info?.socials?.find(s => s.type === 'telegram')?.url ||
                                coin.links?.find(l => l.type === 'telegram')?.url;
                
                const website = extractSocialFromArray(coin.socials, 'website') || 
                               coin.socials?.website || coin.website || coin.social?.website ||
                               coin.url || coin.homepage || coin.websiteUrl || coin.site ||
                               coin.info?.socials?.find(s => s.type === 'website')?.url ||
                               coin.links?.find(l => l.type === 'website')?.url;
                
                const discord = extractSocialFromArray(coin.socials, 'discord') || 
                               coin.socials?.discord || coin.discord || coin.social?.discord ||
                               coin.links?.find(l => l.type === 'discord')?.url;
                
                // Helper function to ensure URL has protocol and validate
                const ensureValidUrl = (url) => {
                  if (!url) return null;
                  if (typeof url !== 'string') return null;
                  url = url.trim();
                  if (!url) return null;
                  if (url.length < 4) return null; // Too short to be valid
                  
                  try {
                    // If URL doesn't start with http/https, add https://
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = `https://${url}`;
                    }
                    new URL(url); // Validate URL format
                    return url;
                  } catch {
                    return null;
                  }
                };
                
                const validTwitter = ensureValidUrl(twitter);
                const validTelegram = ensureValidUrl(telegram);
                const validWebsite = ensureValidUrl(website);
                const validDiscord = ensureValidUrl(discord);

                const socialButtons = [];
                
                if (validTwitter) {
                  socialButtons.push(
                    <a 
                      key="twitter"
                      href={validTwitter} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Twitter"
                      style={{
                        color: '#fff',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.1)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.46 5.924c-.793.352-1.646.59-2.542.698a4.48 4.48 0 0 0 1.965-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 11.1 9.03c0 .352.04.695.116 1.022C7.728 9.89 4.1 8.1 1.671 5.149a4.48 4.48 0 0 0-.607 2.254c0 1.555.792 2.928 2.002 3.734a4.48 4.48 0 0 1-2.03-.561v.057a4.48 4.48 0 0 0 3.6 4.393c-.193.052-.397.08-.607.08-.148 0-.292-.014-.432-.04a4.48 4.48 0 0 0 4.18 3.11A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.88 2.017c8.26 0 12.78-6.84 12.78-12.77 0-.195-.004-.39-.013-.583A9.1 9.1 0 0 0 24 4.59a8.93 8.93 0 0 1-2.54.697z"/>
                      </svg>
                    </a>
                  );
                }
                
                if (validTelegram) {
                  socialButtons.push(
                    <a 
                      key="telegram"
                      href={validTelegram} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Telegram"
                      style={{
                        color: '#fff',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.1)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.036 16.572l-.398 5.61c.57 0 .816-.244 1.112-.537l2.664-2.53 5.522 4.04c1.012.557 1.73.264 1.98-.937l3.594-16.84c.328-1.522-.553-2.12-1.54-1.76L2.16 9.47c-1.49.58-1.47 1.41-.254 1.79l4.6 1.44 10.68-6.74c.5-.32.96-.14.58.2z"/>
                      </svg>
                    </a>
                  );
                }
                
                if (validWebsite) {
                  socialButtons.push(
                    <a 
                      key="website"
                      href={validWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Website"
                      style={{
                        color: '#fff',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.1)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="2"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                    </a>
                  );
                }
                
                if (validDiscord) {
                  socialButtons.push(
                    <a 
                      key="discord"
                      href={validDiscord} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Discord"
                      style={{
                        color: '#fff',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.1)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.222 0c1.406 0 2.54 1.137 2.607 2.475V24l-2.677-2.273-1.47-1.338-1.604-1.398.67 2.205H3.71c-1.402 0-2.54-1.065-2.54-2.476V2.48C1.17 1.142 2.31.003 3.715.003h16.5L20.222 0zm-6.118 5.683h-.03l-.202.2c2.073.6 3.076 1.537 3.076 1.537-1.336-.668-2.54-1.002-3.744-1.137-.87-.135-1.74-.064-2.475 0h-.2c-.47 0-1.47.2-2.81.735-.467.203-.735.336-.735.336s1.002-1.002 3.21-1.537l-.135-.135s-1.672-.064-3.477 1.27c0 0-1.805 3.144-1.805 7.02 0 0 1 1.74 3.743 1.806 0 0 .4-.533.805-1.002-1.54-.4-2.172-1.27-2.172-1.27s.135.064.335.2h.06c.03 0 .044.015.06.03v.006c.016.016.03.03.06.03.33.136.66.27.93.4.466.202 1.065.403 1.8.536.93.135 1.996.2 3.21 0 .6-.135 1.2-.267 1.8-.535.39-.2.87-.4 1.397-.737 0 0-.6.936-2.205 1.27.33.466.795 1 .795 1 2.744-.06 3.81-1.8 3.87-1.726 0-3.87-1.815-7.02-1.815-7.02-1.635-1.214-3.165-1.26-3.435-1.26l.056-.02zm.168 4.413c.703 0 1.27.6 1.27 1.335 0 .74-.57 1.34-1.27 1.34-.7 0-1.27-.6-1.27-1.34.002-.74.573-1.338 1.27-1.335zm-4.543 0c.7 0 1.266.6 1.266 1.335 0 .74-.57 1.34-1.27 1.34-.7 0-1.27-.6-1.27-1.34 0-.74.57-1.335 1.27-1.335z"/>
                      </svg>
                    </a>
                  );
                }

                return socialButtons;
              })()}
            </div>
          </div>
          {/* Market Stats - modern card styling */}
          <div className="coin-stats-row">
            <div className={`coin-stat-window liquidity-stat ${coin.liquidityLocked === true ? 'locked' : ''}`}>
              <div className="coin-stat-label">
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
                  <span className="stat-info-icon">i</span>
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
              <div className="coin-stat-value">{
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
            <div className="coin-stat-window market-cap-stat">
              <div className="coin-stat-label">
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
                  <span className="stat-info-icon">i</span>
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
              <div className="coin-stat-value">{
                typeof coin.marketCap === 'number' && !isNaN(coin.marketCap)
                  ? `$${coin.marketCap.toLocaleString()}`
                  : (typeof coin.marketCap === 'string' && !isNaN(Number(coin.marketCap)))
                    ? `$${Number(coin.marketCap).toLocaleString()}`
                    : '$0'
              }</div>
            </div>
            <div className="coin-stat-window volume-stat">
              <div className="coin-stat-label">
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
                  <span className="stat-info-icon">i</span>
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
              <div className="coin-stat-value">{
                typeof coin.volume === 'number' && !isNaN(coin.volume)
                  ? `$${coin.volume.toLocaleString()}`
                  : (typeof coin.volume === 'string' && !isNaN(Number(coin.volume)))
                    ? `$${Number(coin.volume).toLocaleString()}`
                    : '$0'
              }</div>
            </div>
            <div className="coin-stat-window price-stat">
              <div className="coin-stat-label">
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
                  <span className="stat-info-icon">i</span>
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
                      Token Price - With $10 USD you could buy {' '}
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
              <div className="coin-stat-value">
                {typeof coin.priceUsd === 'number' && !isNaN(coin.priceUsd)
                  ? `$${coin.priceUsd.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 8})}`
                  : (typeof coin.priceUsd === 'string' && !isNaN(Number(coin.priceUsd)))
                    ? `$${Number(coin.priceUsd).toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 8})}`
                    : '$0.00'}
              </div>
            </div>
            <div className="coin-stat-window price-change-stat">
              <div className="coin-stat-label">
                24h Change
                <div 
                  style={{ 
                    position: 'relative',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.price-change-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.price-change-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <span className="stat-info-icon">i</span>
                  <div 
                    className="price-change-tooltip"
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
                      Price Change - 24 hour performance: {
                        (() => {
                          // Get the most accurate price change data available
                          const priceChange = typeof coin.priceChange24h === 'number' && !isNaN(coin.priceChange24h) 
                            ? coin.priceChange24h 
                            : (typeof coin.priceChange === 'number' && !isNaN(coin.priceChange) 
                                ? coin.priceChange 
                                : (typeof coin.change24h === 'number' && !isNaN(coin.change24h) 
                                    ? coin.change24h 
                                    : (typeof coin.percent_change_24h === 'number' && !isNaN(coin.percent_change_24h)
                                        ? coin.percent_change_24h
                                        : null)));
                          
                          if (priceChange === null) return 'No data available';
                          return `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                        })()
                      }
                    </div>
                    <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                      Shows how much the token price has changed in the last 24 hours. Green indicates gains, red indicates losses.
                    </div>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      💡 Look for consistent positive trends rather than single-day spikes for sustainable growth.
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
              <div 
                className="coin-stat-value"
                onClick={() => coin.tokenAddress && coin.chainId && window.open(`https://dexscreener.com/${coin.chainId}/${coin.tokenAddress}`, '_blank')}
                style={{
                  cursor: coin.tokenAddress && coin.chainId ? 'pointer' : 'default',
                  color: (() => {
                    // Get the most accurate price change data available
                    const priceChange = typeof coin.priceChange24h === 'number' && !isNaN(coin.priceChange24h) 
                      ? coin.priceChange24h 
                      : (typeof coin.priceChange === 'number' && !isNaN(coin.priceChange) 
                          ? coin.priceChange 
                          : (typeof coin.change24h === 'number' && !isNaN(coin.change24h) 
                              ? coin.change24h 
                              : null));
                    
                    if (priceChange === null) return '#fff';
                    return priceChange > 0 ? '#4be37a' : priceChange < 0 ? '#e2557b' : '#fff';
                  })(),
                  fontWeight: '700',
                  textDecoration: coin.tokenAddress && coin.chainId ? 'underline' : 'none',
                  textUnderlineOffset: '3px'
                }}
                title={coin.tokenAddress && coin.chainId ? 'Click to view detailed chart on Dexscreener' : ''}
              >
                {(() => {
                  // Get the most accurate price change data available from multiple possible fields
                  const priceChange = typeof coin.priceChange24h === 'number' && !isNaN(coin.priceChange24h) 
                    ? coin.priceChange24h 
                    : (typeof coin.priceChange === 'number' && !isNaN(coin.priceChange) 
                        ? coin.priceChange 
                        : (typeof coin.change24h === 'number' && !isNaN(coin.change24h) 
                            ? coin.change24h 
                            : (typeof coin.percent_change_24h === 'number' && !isNaN(coin.percent_change_24h)
                                ? coin.percent_change_24h
                                : null)));
                  
                  if (priceChange === null) return '0.00%';
                  return `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                })()}
              </div>
            </div>
            <div className="coin-stat-window top-traders-stat">
              <div className="coin-stat-label">
                Top Traders
                <div 
                  style={{ 
                    position: 'relative',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.top-traders-tooltip');
                    if (tooltip) tooltip.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.top-traders-tooltip');
                    if (tooltip) tooltip.style.opacity = '0';
                  }}
                >
                  <span className="stat-info-icon">i</span>
                  <div 
                    className="top-traders-tooltip"
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
                      Top Traders - Number of unique holders: {
                        (() => {
                          const holders = typeof coin.holders === 'number' ? coin.holders : Number(coin.holders) || 0;
                          if (holders >= 1000000) {
                            return `${(holders / 1000000).toFixed(1)}M`;
                          } else if (holders >= 1000) {
                            return `${(holders / 1000).toFixed(1)}K`;
                          } else {
                            return holders.toLocaleString();
                          }
                        })()
                      }
                    </div>
                    <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                      Shows the number of unique wallet addresses holding this token. More holders typically indicates broader community adoption.
                    </div>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      💡 Look for coins with growing holder counts and active community engagement for better long-term potential.
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
              <div className="coin-stat-value" onClick={() => openTopTraders(coin)} style={{cursor:'pointer', textDecoration:'underline', textUnderlineOffset:'3px'}}> {
                typeof coin.holders === 'number' && !isNaN(coin.holders)
                  ? coin.holders.toLocaleString()
                  : (typeof coin.holders === 'string' && !isNaN(Number(coin.holders)))
                    ? Number(coin.holders).toLocaleString()
                    : '0'
              }</div>
            </div>
          </div>
          {/* Graduation Progress Bar - spans the full width above chart */}
          {(() => {
            // ONLY use genuine graduation percentage from the backend - no estimates
            let graduationPercent = null;
            let precision = 1; // Default precision
            let source = 'unknown';
            
            // Check for actual graduation percentage from various API fields
            if (typeof coin.graduationPercent === 'number' && coin.graduationPercent >= 0) {
              graduationPercent = coin.graduationPercent;
              // Always use 1 decimal place for clean display
              precision = 1;
              source = coin.source || 'unknown';
            } else if (typeof coin.pumpProgress === 'number' && coin.pumpProgress >= 0) {
              graduationPercent = coin.pumpProgress;
              precision = 1;
              source = 'pump-api';
            } else if (typeof coin.progress === 'number' && coin.progress >= 0) {
              graduationPercent = coin.progress;
              precision = 1;
              source = 'progress-api';
            } else if (typeof coin.percentage === 'number' && coin.percentage >= 0) {
              graduationPercent = coin.percentage;
              precision = 1;
              source = 'percentage-api';
            }

            // Debug logging for graduation bar detection
            if (coin.symbol && ['UBI', 'HOLD', 'PUNK', 'GROK5', 'G', 'BELLS'].includes(coin.symbol)) {
              console.log(`🔍 Graduation debug for ${coin.symbol}:`, {
                graduationPercent,
                isGraduating: coin.isGraduating,
                isGraduated: coin.isGraduated,
                source: coin.source
              });
            }

            // REQUIREMENTS: Only show graduation bar for coins actively graduating
            // Trust the backend's isGraduating field for accuracy
            if (!coin.isGraduating || graduationPercent === null || typeof graduationPercent !== 'number' || graduationPercent < 0 || graduationPercent >= 100) {
              return null;
            }
            
            // Determine status and colors based on REAL graduation percentage ONLY
            // Only show for coins actively graduating (0-99%), never for graduated coins
            let statusText, statusColor, barColor, emoji, glowColor;
            
            if (graduationPercent >= 95) {
              statusText = coin.isMigrating ? 'Migrating...' : 'About to graduate!';
              statusColor = '#ff6b35'; // Orange-red for imminent graduation
              barColor = '#ff6b35';
              glowColor = '#ff6b35';
              emoji = '🚀';
            } else if (graduationPercent >= 90) {
              statusText = 'Almost there!';
              statusColor = '#f59e0b'; // Amber for very close
              barColor = '#f59e0b';
              glowColor = '#f59e0b';
              emoji = '🔥';
            } else if (graduationPercent >= 75) {
              statusText = 'Graduating...';
              statusColor = '#e2557b'; // Pink for graduating
              barColor = '#e2557b';
              glowColor = '#e2557b';
              emoji = '🎓';
            } else if (graduationPercent >= 50) {
              statusText = 'Building momentum';
              statusColor = '#8b5cf6'; // Purple for momentum
              barColor = '#8b5cf6';
              glowColor = '#8b5cf6';
              emoji = '📈';
            } else if (graduationPercent >= 25) {
              statusText = 'Growing steadily';
              statusColor = '#10b981'; // Green for growth
              barColor = '#10b981';
              glowColor = '#10b981';
              emoji = '🌱';
            } else if (graduationPercent > 0) {
              statusText = 'Getting started';
              statusColor = '#6b7280'; // Gray for early stage
              barColor = '#6b7280';
              glowColor = '#6b7280';
              emoji = '⭐';
            } else {
              return null;
            }
            
            // Use exact graduation percentage - no clamping needed since it's real data
            const displayPercent = Math.min(100, Math.max(0, graduationPercent));
            
            return (
              <div style={{ 
                width: '92%',
                maxWidth: 600,
                margin: '16px auto 12px auto',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: `linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))`,
                borderRadius: '16px',
                padding: '12px 20px',
                border: `1px solid ${statusColor}40`,
                boxShadow: `0 0 12px ${glowColor}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
                backdropFilter: 'blur(12px)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Animated background shimmer */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(90deg, transparent, ${statusColor}15, transparent)`,
                  animation: 'shimmer 2s infinite',
                  pointerEvents: 'none'
                }} />
                
                {/* Left side - Status text and emoji */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1 }}>
                  <span style={{ 
                    fontSize: 24, 
                    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))',
                  }}>{emoji}</span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ 
                      fontSize: 14, 
                      color: statusColor, 
                      fontWeight: 700,
                      lineHeight: 1,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {statusText}
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: '#bbb',
                      fontWeight: 500
                    }}>
                      Graduation Progress
                    </div>
                  </div>
                </div>

                {/* Right side - Progress bar and percentage */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12,
                  zIndex: 1
                }}>
                  <div style={{
                    width: '120px',
                    height: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{
                      width: `${displayPercent}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${barColor}80, ${barColor}, ${barColor}80)`,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                      boxShadow: `0 0 8px ${glowColor}50`,
                      position: 'relative'
                    }}>
                      {/* Progress bar glow effect */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(90deg, transparent, ${statusColor}40, transparent)`,
                        animation: 'progress-glow 1.5s ease-in-out infinite alternate'
                      }} />
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: 16, 
                    color: statusColor, 
                    fontWeight: 800,
                    minWidth: '48px',
                    textAlign: 'right',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}>
                    {displayPercent.toFixed(precision)}%
                    {/* Data source indicator for debugging (only in dev) */}
                    {process.env.NODE_ENV === 'development' && source !== 'unknown' && (
                      <span style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '0',
                        fontSize: '8px',
                        color: statusColor + '80',
                        fontWeight: 400,
                        opacity: 0.7
                      }}>
                        {source.split('-')[0]}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })()}

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
                  justifyContent: 'flex-start',
                  paddingLeft: '12px',
                  zIndex: 10,
                  borderRadius: '18px 18px 0 0',
                  fontSize: '13px',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '1px'
                }}
                onClick={() => window.open(`https://dexscreener.com/${coin.chainId}/${coin.tokenAddress}`, '_blank')}
                >
                  DEXSCREENER
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
            {/* Price change removed - now in stats row above */}
          </div>
          {/* Social Icons Row - now moved up to header buttons section */}
        </div>
      ))}
      
      {loading && hasMore && !onlyFavorites && (
        <div className="loader" style={{ 
          textAlign: 'center', 
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" style={{
            width: '32px',
            height: '32px',
            border: '4px solid rgba(59, 130, 246, 0.3)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{
            color: '#bbb',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {offset === 0 ? 'Connecting to server...' : 'Loading more coins...'}
          </div>
        </div>
      )}
      
      {/* About Modal */}
      <AboutModal 
        coin={aboutModalCoin}
        isOpen={showAboutModal}
        onClose={() => {
          setShowAboutModal(false);
          setAboutModalCoin(null);
        }}
        onTradeClick={onTradeClick}
      />
      {/* Top Traders Modal */}
      {showTopTraders && (
        <div style={{position:'fixed', top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={closeTopTraders}>
          <div onClick={e=>e.stopPropagation()} style={{width:'92%',maxWidth:520,background:'var(--card-bg, #121317)',borderRadius:18,padding:'20px 24px',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(14px)',color:'#fff',maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:700,letterSpacing:'0.5px'}}>
                Top Traders
                {topTradersData.meta?.source?.includes('demo') || topTradersData.meta?.source?.includes('mock') ? (
                  <span style={{fontSize:12,fontWeight:400,color:'#f59e0b',marginLeft:8,background:'rgba(245,158,11,0.15)',padding:'2px 8px',borderRadius:12,border:'1px solid rgba(245,158,11,0.3)'}}>
                    DEMO
                  </span>
                ) : topTradersData.meta?.source ? (
                  <span style={{fontSize:12,fontWeight:400,color:'#10b981',marginLeft:8,background:'rgba(16,185,129,0.15)',padding:'2px 8px',borderRadius:12,border:'1px solid rgba(16,185,129,0.3)'}}>
                    LIVE
                  </span>
                ) : null}
              </h2>
              <button onClick={closeTopTraders} style={{background:'transparent',border:'none',color:'#fff',fontSize:18,cursor:'pointer',padding:4,lineHeight:1}}>✕</button>
            </div>
            <div style={{fontSize:12,opacity:0.75,marginBottom:12}}>
              Live wallet addresses of top traders. Click any wallet to copy address. {topTradersData.meta?.source?.includes('demo') || topTradersData.meta?.source?.includes('mock') ? 'Demo data shown for illustration.' : 'Real trading data from blockchain analysis.'}
            </div>
            {topTradersLoading && (
              <div style={{textAlign:'center',padding:'24px 0'}}>Loading...</div>
            )}
            {topTradersError && (
              <div style={{color:'#e2557b',padding:'12px 0',fontSize:13}}>Error: {topTradersError}</div>
            )}
            {!topTradersLoading && !topTradersError && topTradersData.traders && topTradersData.traders.length === 0 && (
              <div style={{padding:'16px 0',fontSize:13,opacity:0.65}}>
                <div>
                  No trader data available. {topTradersData.meta?.error ? `(${topTradersData.meta.error})` : 'If this is a very new token it may not be indexed yet.'}
                </div>
                {Array.isArray(topTradersData.meta?.attempts) && topTradersData.meta.attempts.length > 0 && (
                  <div style={{marginTop:10,fontSize:11,opacity:0.6,lineHeight:1.4}}>
                    <div style={{fontWeight:600,marginBottom:4}}>Data fetch attempts:</div>
                    <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:4}}>
                      {topTradersData.meta.attempts.map((a,i) => (
                        <li key={i} style={{background:'rgba(255,255,255,0.05)',padding:'6px 8px',borderRadius:8,border:'1px solid rgba(255,255,255,0.07)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                            <span style={{fontFamily:'monospace'}}>{a.type}</span>
                            {a.count !== undefined && <span style={{opacity:0.8}}>count: {a.count}</span>}
                            {a.status !== undefined && <span style={{opacity:0.8}}>status: {a.status}</span>}
                            {a.error && <span style={{color:'#e2557b',flex:1,textAlign:'right'}} title={a.error}>{a.error.slice(0,60)}{a.error.length>60?'…':''}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div style={{overflowY:'auto',flex:1,paddingRight:4}}>
              {topTradersData.traders && topTradersData.traders.length > 0 && (
                <div style={{
                  display:'grid',
                  gridTemplateColumns:'1fr 80px 80px 80px',
                  fontSize:11,
                  fontWeight:600,
                  textTransform:'uppercase',
                  letterSpacing:'0.5px',
                  padding:'6px 10px',
                  borderBottom:'1px solid rgba(255,255,255,0.08)',
                  marginBottom:6,
                  color:'#9ca3af'
                }}>
                  <div>Wallet</div>
                  <div style={{textAlign:'right'}}>Bought</div>
                  <div style={{textAlign:'right'}}>Sold</div>
                  <div style={{textAlign:'right'}}>PnL</div>
                </div>
              )}
              {topTradersData.traders && topTradersData.traders.map(t => (
                <div key={t.wallet} style={{
                  display:'grid',
                  gridTemplateColumns:'1fr 80px 80px 80px',
                  alignItems:'center',
                  gap:8,
                  padding:'8px 10px',
                  borderRadius:10,
                  background:'rgba(255,255,255,0.05)',
                  marginBottom:6,
                  border:'1px solid rgba(255,255,255,0.07)'
                }}>
                  <div style={{minWidth:0,display:'flex',flexDirection:'column',gap:4}}>
                    <button onClick={() => navigator.clipboard.writeText(t.wallet)} title="Click to copy" style={{
                      background:'none',
                      border:'none',
                      padding:0,
                      margin:0,
                      textAlign:'left',
                      cursor:'pointer',
                      fontFamily:'monospace',
                      fontSize:12,
                      color:'#fff',
                      wordBreak:'break-all',
                      lineHeight:1.2
                    }}>{t.wallet}</button>
                    <div style={{display:'flex',gap:6,opacity:0.45,fontSize:10}}>
                      <span>{t.trade_count || 0} txns</span>
                      {typeof t.rank === 'number' && <span># {t.rank}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right',fontFamily:'monospace',fontSize:12,color:'#93c5fd'}}>
                    ${ (t.buy_volume || 0).toLocaleString(undefined,{maximumFractionDigits:0}) }
                  </div>
                  <div style={{textAlign:'right',fontFamily:'monospace',fontSize:12,color:'#fbbf24'}}>
                    ${ (t.sell_volume || 0).toLocaleString(undefined,{maximumFractionDigits:0}) }
                  </div>
                  <div style={{textAlign:'right',fontFamily:'monospace',fontSize:12,fontWeight:600,color: (t.profit_usd||0) >= 0 ? '#10b981' : '#ef4444'}}>
                    {(t.profit_usd||0) >= 0 ? '+' : '-'}${Math.abs(t.profit_usd||0).toLocaleString(undefined,{maximumFractionDigits:0})}
                  </div>
                </div>
              ))}
            </div>
            {topTradersData.meta && (
              <div style={{marginTop:12,fontSize:10,opacity:0.45,lineHeight:1.4}}>
                {topTradersData.meta.disclaimer}<br/>
                Source: {topTradersData.meta.source}. Live price: ${topTradersData.meta.priceUsd?.toLocaleString(undefined,{maximumFractionDigits:6}) || '0'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default TokenScroller;
