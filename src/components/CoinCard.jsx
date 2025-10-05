import React, { memo, useState, useRef, useEffect } from 'react';
import './CoinCard.css';
import DexScreenerChart from './DexScreenerChart';
import CleanPriceChart from './CleanPriceChart';
import LiquidityLockIndicator from './LiquidityLockIndicator';
import TopTradersList from './TopTradersList';

const CoinCard = memo(({ 
  coin, 
  isFavorite, 
  onFavoriteToggle, 
  onTradeClick, 
  isTrending,
  onExpandChange,
  isVisible = true,
  chartComponent // optional preloaded chart from manager
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentChartPage, setCurrentChartPage] = useState(0);
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [realTimePrice, setRealTimePrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const chartsContainerRef = useRef(null);
  const lastFetchRef = useRef(0);
  const priceIntervalRef = useRef(null);

  // Helpers
  const formatCompact = (num) => {
    const n = Number(num);
    if (!isFinite(n)) return '0';
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n/1_000).toFixed(1)}K`;
    return n.toFixed(abs < 1 ? 4 : 2);
  };

  const formatPrice = (v) => {
    const n = Number(v);
    if (!isFinite(n)) return '$0.00';
    if (Math.abs(n) < 0.01) return `$${n.toFixed(6)}`;
    if (Math.abs(n) < 1) return `$${n.toFixed(4)}`;
    return `$${n.toFixed(2)}`;
  };

  const formatPercent = (v) => {
    const n = Number(v);
    if (!isFinite(n)) return '0.00%';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  };

  // Helper function to format exact numbers for tooltips
  const formatExact = (num) => {
    const n = Number(num);
    if (!isFinite(n)) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Jupiter API price fetching
  const fetchJupiterPrice = async (tokenAddress, isInitialFetch = true) => {
    if (!tokenAddress) {
      console.log('❌ No token address available for Jupiter price fetch');
      return null;
    }

    // Throttle API calls - don't fetch more than once every 2 seconds
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) {
      console.log('⏰ Throttling Jupiter API call');
      return null;
    }
    lastFetchRef.current = now;

    try {
      // Only show loading on initial fetch, not on updates
      if (isInitialFetch) {
        setPriceLoading(true);
      }
      setPriceError(null);
      
      console.log(`🚀 Fetching Jupiter price for ${coin.symbol} (${tokenAddress})`);
      
      const response = await fetch(
        `https://lite-api.jup.ag/price/v3?ids=${tokenAddress}`
      );
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Jupiter price response:', JSON.stringify(data, null, 2));
      
      if (data && data[tokenAddress]) {
        const priceData = data[tokenAddress];
        const newPrice = priceData.usdPrice || priceData.price; // Try both field names
        
        // Only update if price actually changed (avoid unnecessary re-renders)
        setRealTimePrice(prevPrice => {
          if (prevPrice !== newPrice) {
            console.log(`💰 ${coin.symbol} price updated: $${prevPrice} → $${newPrice}`);
            return newPrice;
          }
          return prevPrice;
        });
        
        return newPrice;
      } else {
        console.log('❌ No price data found in Jupiter response');
        setPriceError('Price not available');
        return null;
      }
    } catch (error) {
      console.error('Jupiter API error:', error);
      setPriceError(error.message);
      return null;
    } finally {
      if (isInitialFetch) {
        setPriceLoading(false);
      }
    }
  };

  // Helper function to get tooltip content for metrics
  const getTooltipContent = (metric, value, coin) => {
    const exactValue = formatExact(value);
    
    switch (metric) {
      case 'marketCap':
        return {
          title: 'Market Capitalization',
          exact: `$${exactValue}`,
          description: 'The total value of all tokens in circulation. Calculated by multiplying the current price by the total supply.',
          example: `If ${coin.symbol || 'this token'} has ${formatCompact(coin.totalSupply || 1000000)} tokens and costs ${formatPrice(coin.price_usd || coin.priceUsd || coin.price || 0)} each, the market cap is ${formatPrice(coin.price_usd || coin.priceUsd || coin.price || 0)} × ${formatCompact(coin.totalSupply || 1000000)} = $${exactValue}`
        };
      case 'volume':
        return {
          title: '24h Trading Volume',
          exact: `$${exactValue}`,
          description: 'The total dollar value of tokens traded in the last 24 hours. Higher volume indicates more activity and liquidity.',
          example: `$${exactValue} worth of ${coin.symbol || 'tokens'} have been bought and sold in the past 24 hours`
        };
      case 'liquidity':
        return {
          title: 'Liquidity',
          exact: `$${exactValue}`,
          description: 'The amount of money available for trading. Higher liquidity means easier buying/selling with less price impact.',
          example: `There's $${exactValue} available in trading pools for ${coin.symbol || 'this token'}, making it ${value > 100000 ? 'relatively easy' : value > 10000 ? 'moderately easy' : 'potentially difficult'} to trade large amounts`
        };
      case 'holders':
        return {
          title: 'Token Holders',
          exact: exactValue,
          description: 'The number of unique wallets that own this token. More holders can indicate wider distribution and adoption.',
          example: `${exactValue} different wallets currently hold ${coin.symbol || 'this token'}`
        };
      case 'age':
        const hours = Number(value);
        const days = Math.floor(hours / 24);
        return {
          title: 'Token Age',
          exact: hours < 24 ? `${hours} hours` : `${days} days (${hours} hours)`,
          description: 'How long ago this token was created. Newer tokens are often riskier but may have more growth potential.',
          example: `${coin.symbol || 'This token'} was created ${hours < 24 ? `${hours} hours` : `${days} days`} ago${hours < 24 ? ' (very new!)' : days < 7 ? ' (relatively new)' : days < 30 ? ' (established)' : ' (mature)'}`
        };
      case 'fdv':
        return {
          title: 'Fully Diluted Valuation',
          exact: `$${exactValue}`,
          description: 'The theoretical market cap if all tokens were in circulation. Helps assess potential future dilution.',
          example: `If all ${coin.symbol || 'tokens'} were released today, the total value would be $${exactValue}`
        };
      case 'txns':
        return {
          title: '24h Transactions',
          exact: exactValue,
          description: 'Total number of buy and sell transactions in the last 24 hours. More transactions indicate active trading.',
          example: `${exactValue} separate trades happened with ${coin.symbol || 'this token'} in the past 24 hours`
        };
      case 'buySell':
        const percentage = Number(value);
        return {
          title: 'Buy/Sell Ratio',
          exact: `${percentage}% buys`,
          description: 'Percentage of recent transactions that were buys vs sells. Higher percentage indicates buying pressure.',
          example: `${percentage}% of recent trades were purchases, ${100 - percentage}% were sales${percentage > 60 ? ' (bullish sentiment)' : percentage < 40 ? ' (bearish sentiment)' : ' (neutral sentiment)'}`
        };
      case 'boosts':
        return {
          title: 'DexScreener Boosts',
          exact: exactValue,
          description: 'Paid promotions on DexScreener that increase visibility. More boosts indicate marketing investment.',
          example: `${exactValue} active promotional boost${Number(value) !== 1 ? 's' : ''} running for ${coin.symbol || 'this token'}`
        };
      default:
        return {
          title: 'Metric',
          exact: exactValue,
          description: 'Financial metric for this token.',
          example: 'Additional context not available.'
        };
    }
  };

  // Expand toggle
  const handleExpandToggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
  };

  // Chart navigation functions
  const handleChartScroll = () => {
    if (!chartsContainerRef.current) return;
    
    const container = chartsContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const currentPage = Math.round(scrollLeft / containerWidth);
    
    setCurrentChartPage(currentPage);
  };

  const navigateToChartPage = (pageIndex) => {
    if (!chartsContainerRef.current) return;
    
    const container = chartsContainerRef.current;
    const containerWidth = container.clientWidth;
    const targetScrollLeft = pageIndex * containerWidth;
    
    container.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    });
    
    setCurrentChartPage(pageIndex);
  };

  // Add scroll listener for chart navigation
  useEffect(() => {
    const container = chartsContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleChartScroll);
    return () => container.removeEventListener('scroll', handleChartScroll);
  }, []);

  // Fetch Jupiter price when coin becomes visible and set up polling
  useEffect(() => {
    const tokenAddress = coin.mintAddress || coin.mint || coin.address || coin.contract_address || coin.contractAddress || coin.tokenAddress;
    
    if (isVisible && tokenAddress) {
      // Initial fetch
      if (!realTimePrice && !priceLoading) {
        console.log(`👀 Coin ${coin.symbol} is now visible, fetching Jupiter price...`);
        fetchJupiterPrice(tokenAddress, true);
      }
      
      // Set up polling interval (every 2.5 seconds for real-time updates)
      if (!priceIntervalRef.current) {
        priceIntervalRef.current = setInterval(() => {
          fetchJupiterPrice(tokenAddress, false); // Don't show loading for updates
        }, 2500); // Poll every 2.5 seconds
      }
    } else {
      // Clear interval when not visible
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
        priceIntervalRef.current = null;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
        priceIntervalRef.current = null;
      }
    };
  }, [isVisible, coin.symbol, realTimePrice, priceLoading]);

  // Banner modal handlers
  const handleBannerClick = (e) => {
    console.log('Banner clicked!', coin.name);
    if (coin.banner || coin.bannerImage || coin.header || coin.bannerUrl) {
      console.log('Opening banner modal');
      setShowBannerModal(true);
    } else {
      console.log('No banner image available');
    }
  };

  const closeBannerModal = () => {
    setShowBannerModal(false);
  };

  // Profile modal handlers
  const handleProfileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Profile clicked!', coin.name);
    if (coin.profileImage) {
      console.log('Opening profile modal');
      setShowProfileModal(true);
    } else {
      console.log('No profile image available');
    }
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  // Copy address to clipboard handler
  const handleCopyAddress = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check for various address field names used in the coin data
    const address = coin.mintAddress || coin.mint || coin.address || coin.contract_address || coin.contractAddress || coin.tokenAddress;
    
    console.log('🔍 Checking for address in coin object:', {
      mintAddress: coin.mintAddress,
      mint: coin.mint,
      address: coin.address,
      contract_address: coin.contract_address,
      contractAddress: coin.contractAddress,
      tokenAddress: coin.tokenAddress,
      selectedAddress: address
    });
    
    if (!address) {
      console.log('❌ No address available for', coin.name || coin.symbol);
      console.log('Full coin object:', coin);
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      console.log('✅ Address copied to clipboard:', address);
      
      // Optional: Show a brief success indicator
      // You could add a toast notification here if you have one
    } catch (err) {
      console.error('Failed to copy address:', err);
      
      // Fallback method for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        console.log('✅ Address copied using fallback method:', address);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  };

  const price = realTimePrice ?? coin.price_usd ?? coin.priceUsd ?? coin.price ?? 0;
  const changePct = coin.change_24h ?? coin.priceChange24h ?? coin.change24h ?? 0;
  const marketCap = coin.market_cap_usd ?? coin.market_cap ?? coin.marketCap ?? 0;
  const volume24h = coin.volume_24h_usd ?? coin.volume_24h ?? coin.volume24h ?? 0;
  const liquidity = coin.liquidity_usd ?? coin.liquidity ?? coin.liquidityUsd ?? 0;
  const holders = coin.holders ?? 0;
  
  // Enhanced metrics from DexScreener
  const fdv = coin.fdv ?? coin.fullyDilutedValuation ?? 0;
  const volume1h = coin.volume1h ?? coin.dexscreener?.volumes?.volume1h ?? 0;
  const volume6h = coin.volume6h ?? coin.dexscreener?.volumes?.volume6h ?? 0;
  const buys24h = coin.buys24h ?? coin.dexscreener?.transactions?.buys24h ?? 0;
  const sells24h = coin.sells24h ?? coin.dexscreener?.transactions?.sells24h ?? 0;
  const totalTxns24h = coin.totalTransactions ?? (buys24h + sells24h) ?? 0;
  const ageHours = coin.ageHours ?? coin.dexscreener?.poolInfo?.ageHours ?? 0;
  const boosts = coin.boosts ?? coin.dexscreener?.boosts ?? 0;

  // Debug log for social links
  if (coin.socialLinks || coin.twitter || coin.telegram || coin.website) {
    console.log(`🔗 Social data available for ${coin.symbol}:`, {
      socialLinks: coin.socialLinks,
      twitter: coin.twitter,
      telegram: coin.telegram,
      website: coin.website,
      info: coin.info
    });
  }

  return (
    <div className="coin-card">
      {/* Enhanced Banner with DexScreener support */}
      <div className="coin-banner" onClick={handleBannerClick} style={{ cursor: coin.banner || coin.bannerImage || coin.header || coin.bannerUrl ? 'pointer' : 'default' }}>
        {coin.banner || coin.bannerImage || coin.header || coin.bannerUrl ? (
          <img 
            src={coin.banner || coin.bannerImage || coin.header || coin.bannerUrl}
            alt={coin.name || 'Token banner'}
            onError={(e) => { 
              console.log(`Banner image failed to load for ${coin.symbol}:`, e.currentTarget.src);
              e.currentTarget.style.display = 'none'; 
            }}
            onLoad={() => {
              console.log(`✅ Banner loaded successfully for ${coin.symbol}`);
            }}
          />
        ) : (
          <div className="banner-placeholder">
            {coin.name ? `${coin.name} meme coin` : 'Meme coin discovery'}
          </div>
        )}
        
        {/* Banner Text Overlay */}
        <div className="banner-text-overlay">
          <div className="banner-coin-info">
            <h2 
              className="banner-coin-name clickable-name" 
              onClick={handleCopyAddress}
              title={`Click to copy address: ${coin.mintAddress || coin.mint || coin.address || coin.contract_address || coin.contractAddress || coin.tokenAddress || 'No address available'}`}
            >
              {coin.name || 'Unknown Token'}
            </h2>
            <p className="banner-coin-symbol">
              ${coin.symbol || coin.ticker || 'N/A'}
            </p>
            <button 
              className={`banner-favorites-button ${isFavorite ? 'favorited' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle?.();
              }}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M10 3L12.4721 7.94454L17.9445 8.52786L13.9722 12.0555L15.2361 17.4721L10 14.5L4.76393 17.4721L6.02778 12.0555L2.05548 8.52786L7.52786 7.94454L10 3Z" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                  fill={isFavorite ? 'currentColor' : 'none'}
                />
              </svg>
            </button>
          </div>
          {coin.description && (
            <p className="banner-coin-description">{coin.description}</p>
          )}
        </div>
      </div>

      {/* Info Layer */}
      <div className={`coin-info-layer ${isExpanded ? 'expanded' : ''}`}>
        <div className="info-layer-header">
          {/* Top row: Profile, Price, Price Change, Expand Arrow */}
          <div className="header-top-row">
            <div className="header-left">
              <div 
                className="info-layer-profile-image" 
                onClick={handleProfileClick}
                style={{ cursor: coin.profileImage ? 'pointer' : 'default' }}
              >
                {coin.profileImage ? (
                  <img
                    src={coin.profileImage}
                    alt={coin.name || 'Token logo'}
                    onError={(e) => { e.currentTarget.src = '/profile-placeholder.png'; }}
                  />
                ) : (
                  <div className="info-layer-profile-placeholder">{coin.name?.charAt(0) || 'M'}</div>
                )}
              </div>
              
              <div className="price-section">
                <div className="coin-price">
                  {priceLoading ? (
                    <span style={{ opacity: 0.6 }}>Loading...</span>
                  ) : (
                    <>
                      {formatPrice(price)}
                      {priceError && (
                        <span 
                          style={{ 
                            fontSize: '0.7rem', 
                            color: '#ef4444', 
                            marginLeft: '4px',
                            verticalAlign: 'super'
                          }}
                          title={`Price fetch error: ${priceError}`}
                        >
                          ⚠️
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className={`price-change ${Number(changePct) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(changePct)}
                </div>
              </div>
            </div>

            <div className="header-right">
              <div className="expand-handle" onClick={handleExpandToggle} />
            </div>
          </div>

          {/* Bottom row: Social Icons and Metrics */}
          <div className="header-social-row">
            <div className="header-social-icons">
              {(coin.socialLinks?.twitter || coin.twitter) && (
                <a 
                  href={coin.socialLinks?.twitter || coin.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="header-social-icon twitter-icon" 
                  aria-label="Twitter/X"
                >
                  𝕏
                </a>
              )}
              {(coin.socialLinks?.website || coin.website || coin.info?.website) && (
                <a 
                  href={coin.socialLinks?.website || coin.website || coin.info?.website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="header-social-icon website-icon" 
                  aria-label="Website"
                >
                  🌐
                </a>
              )}
              {(coin.socialLinks?.telegram || coin.telegram) && (
                <a 
                  href={coin.socialLinks?.telegram || coin.telegram} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="header-social-icon telegram-icon" 
                  aria-label="Telegram"
                >
                  ✈️
                </a>
              )}
            </div>
            
            {/* Metrics Grid - Moved to header level */}
            <div className="header-metrics-grid">
              {/* Always show core metrics */}
              <div 
                className="header-metric"
                onMouseEnter={() => setHoveredMetric({ type: 'marketCap', value: marketCap, element: 'marketCap' })}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <div className="header-metric-label">Market Cap</div>
                <div className="header-metric-value">${formatCompact(marketCap)}</div>
              </div>
              <div 
                className="header-metric"
                onMouseEnter={() => setHoveredMetric({ type: 'volume', value: volume24h, element: 'volume' })}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <div className="header-metric-label">Volume</div>
                <div className="header-metric-value">${formatCompact(volume24h)}</div>
              </div>
              <div 
                className="header-metric"
                onMouseEnter={() => setHoveredMetric({ type: 'liquidity', value: liquidity, element: 'liquidity' })}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <div className="header-metric-label-with-icon">
                  <LiquidityLockIndicator coin={coin} size="small" />
                  <div className="header-metric-label">Liquidity</div>
                </div>
                <div className="header-metric-value">${formatCompact(liquidity)}</div>
              </div>
              {holders > 0 && (
                <div 
                  className="header-metric"
                  onMouseEnter={() => setHoveredMetric({ type: 'holders', value: holders, element: 'holders' })}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className="header-metric-label">Holders</div>
                  <div className="header-metric-value">{formatCompact(holders)}</div>
                </div>
              )}
              {ageHours > 0 && (
                <div 
                  className="header-metric"
                  onMouseEnter={() => setHoveredMetric({ type: 'age', value: ageHours, element: 'age' })}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className="header-metric-label">Age</div>
                  <div className="header-metric-value">
                    {ageHours < 24 ? `${ageHours}h` : `${Math.floor(ageHours / 24)}d`}
                  </div>
                </div>
              )}
              {/* Additional metrics when available */}
              {fdv > 0 && (
                <div 
                  className="header-metric"
                  onMouseEnter={() => setHoveredMetric({ type: 'fdv', value: fdv, element: 'fdv' })}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className="header-metric-label">FDV</div>
                  <div className="header-metric-value">${formatCompact(fdv)}</div>
                </div>
              )}
              {totalTxns24h > 0 && (
                <div 
                  className="header-metric"
                  onMouseEnter={() => setHoveredMetric({ type: 'txns', value: totalTxns24h, element: 'txns' })}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className="header-metric-label">Txns</div>
                  <div className="header-metric-value">{formatCompact(totalTxns24h)}</div>
                </div>
              )}
              {buys24h > 0 && sells24h > 0 && (
                <div 
                  className="header-metric"
                  onMouseEnter={() => setHoveredMetric({ type: 'buySell', value: ((buys24h / (buys24h + sells24h)) * 100).toFixed(0), element: 'buySell' })}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className="header-metric-label">Buy/Sell</div>
                  <div className="header-metric-value">
                    {((buys24h / (buys24h + sells24h)) * 100).toFixed(0)}%
                  </div>
                </div>
              )}
              {boosts > 0 && (
                <div 
                  className="header-metric"
                  onMouseEnter={() => setHoveredMetric({ type: 'boosts', value: boosts, element: 'boosts' })}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className="header-metric-label">Boosts</div>
                  <div className="header-metric-value" style={{color: '#ff6b35'}}>{boosts}</div>
                </div>
              )}
              
              {/* Tooltip */}
              {hoveredMetric && (
                <div className="metric-tooltip">
                  {(() => {
                    const tooltipData = getTooltipContent(hoveredMetric.type, hoveredMetric.value, coin);
                    return (
                      <>
                        <div className="tooltip-title">{tooltipData.title}</div>
                        <div className="tooltip-exact">{tooltipData.exact}</div>
                        <div className="tooltip-description">{tooltipData.description}</div>
                        <div className="tooltip-example">{tooltipData.example}</div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="info-layer-content">
          {/* Price Charts - Horizontal Scrollable with Snap */}
          <div className="charts-section">
            <div className="charts-header">
              <div className="chart-labels">
                <span 
                  className={`chart-label ${currentChartPage === 0 ? 'active' : ''}`} 
                  onClick={() => navigateToChartPage(0)}
                >
                  Clean View
                </span>
                <span 
                  className={`chart-label ${currentChartPage === 1 ? 'active' : ''}`} 
                  onClick={() => navigateToChartPage(1)}
                >
                  Advanced View
                </span>
              </div>
            </div>
            <div className="charts-horizontal-container" ref={chartsContainerRef}>
              {/* Clean Chart Page */}
              <div className="chart-page">
                <div className="clean-chart-wrapper">
                  <CleanPriceChart coin={coin} width="100%" height={200} />
                </div>
              </div>
              
              {/* Advanced Chart Page */}
              <div className="chart-page">
                <div className="advanced-chart-wrapper">
                  {coin.pairAddress || coin.tokenAddress ? (
                    <DexScreenerChart 
                      coin={{
                        ...coin,
                        chainId: coin.chainId || 'solana',
                        pairAddress: coin.pairAddress || coin.tokenAddress || coin.mintAddress,
                        tokenAddress: coin.tokenAddress || coin.mintAddress || coin.pairAddress,
                        symbol: coin.symbol || coin.baseToken?.symbol
                      }} 
                      isPreview={false}
                    />
                  ) : chartComponent ? (
                    chartComponent
                  ) : (
                    <div className="chart-placeholder">Chart data unavailable</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Navigation Dots */}
            <div className="chart-nav-dots">
              <div 
                className={`nav-dot ${currentChartPage === 0 ? 'active' : ''}`}
                onClick={() => navigateToChartPage(0)}
              ></div>
              <div 
                className={`nav-dot ${currentChartPage === 1 ? 'active' : ''}`}
                onClick={() => navigateToChartPage(1)}
              ></div>
            </div>
            
            {/* Swipe Hint */}
            <div className="swipe-hint">
              <span>← Swipe for {currentChartPage === 0 ? 'Advanced' : 'Clean'} Chart →</span>
            </div>
          </div>

          {/* Top Traders */}
          <div className="top-traders-section">
            <h3 className="section-title">Top Traders</h3>
            <div className="section-content">
              <TopTradersList coinAddress={coin.mintAddress} />
            </div>
          </div>

          {/* Transaction Analytics */}
          <div className="transactions-section">
            <h3 className="section-title">Transaction Analytics</h3>
            <div className="section-content">
              {coin.dexscreener?.transactions ? (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', textAlign: 'center'}}>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>5m</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#22c55e'}}>{coin.dexscreener.transactions.buys5m}B</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#ef4444'}}>{coin.dexscreener.transactions.sells5m}S</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>1h</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#22c55e'}}>{coin.dexscreener.transactions.buys1h}B</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#ef4444'}}>{coin.dexscreener.transactions.sells1h}S</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>6h</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#22c55e'}}>{coin.dexscreener.transactions.buys6h}B</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#ef4444'}}>{coin.dexscreener.transactions.sells6h}S</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>24h</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#22c55e'}}>{coin.dexscreener.transactions.buys24h}B</div>
                    <div style={{fontSize: '0.9rem', fontWeight: '600', color: '#ef4444'}}>{coin.dexscreener.transactions.sells24h}S</div>
                  </div>
                </div>
              ) : (
                <div className="content-placeholder">Transaction data will appear when available</div>
              )}
            </div>
          </div>

          {/* Token Details */}
          <div className="token-details-section">
            <h3 className="section-title">Token Details</h3>
            <div className="section-content">
              <div style={{fontSize: '0.9rem', lineHeight: '1.6'}}>
                <div style={{marginBottom: '8px'}}>
                  <strong>Contract:</strong> <span style={{fontFamily: 'monospace', fontSize: '0.85rem'}}>{coin.mintAddress || coin.contract_address || coin.mint || coin.tokenAddress || 'N/A'}</span>
                </div>
                <div style={{marginBottom: '8px'}}>
                  <strong>Chain:</strong> {coin.chain || coin.chainId || 'Solana'}
                </div>
                {coin.dexId && (
                  <div style={{marginBottom: '8px'}}>
                    <strong>DEX:</strong> {coin.dexId}
                  </div>
                )}
                {coin.pairAddress && (
                  <div style={{marginBottom: '8px'}}>
                    <strong>Pair:</strong> <span style={{fontFamily: 'monospace', fontSize: '0.85rem'}}>{coin.pairAddress}</span>
                  </div>
                )}
                {coin.dexscreener?.poolInfo?.createdAt && (
                  <div style={{marginBottom: '8px'}}>
                    <strong>Pool Created:</strong> {new Date(coin.dexscreener.poolInfo.createdAt * 1000).toLocaleDateString()}
                  </div>
                )}
                {coin.dexscreener?.marketMetrics?.fdvToMcapRatio && (
                  <div style={{marginBottom: '8px'}}>
                    <strong>FDV/MC Ratio:</strong> {coin.dexscreener.marketMetrics.fdvToMcapRatio.toFixed(2)}x
                  </div>
                )}
                {coin.dexscreener?.poolInfo?.labels?.length > 0 && (
                  <div style={{marginBottom: '8px'}}>
                    <strong>Labels:</strong> {coin.dexscreener.poolInfo.labels.map(label => (
                      <span key={label} style={{
                        display: 'inline-block',
                        background: 'rgba(0,0,0,0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        margin: '0 4px 4px 0'
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {coin.enrichmentSource && (
                  <div style={{marginTop: '12px', fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)'}}>
                    Data source: {coin.enrichmentSource}
                    {coin.enriched && <span style={{marginLeft: '8px', color: '#22c55e'}}>✓ Enriched</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price Changes */}
          <div className="price-changes-section">
            <h3 className="section-title">Price Changes</h3>
            <div className="section-content">
              {coin.dexscreener?.priceChanges ? (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '12px', textAlign: 'center'}}>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>5m</div>
                    <div className={`price-change ${coin.dexscreener.priceChanges.change5m >= 0 ? 'positive' : 'negative'}`} style={{fontSize: '0.9rem', padding: '2px 6px', borderRadius: '6px'}}>
                      {formatPercent(coin.dexscreener.priceChanges.change5m)}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>1h</div>
                    <div className={`price-change ${coin.dexscreener.priceChanges.change1h >= 0 ? 'positive' : 'negative'}`} style={{fontSize: '0.9rem', padding: '2px 6px', borderRadius: '6px'}}>
                      {formatPercent(coin.dexscreener.priceChanges.change1h)}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>6h</div>
                    <div className={`price-change ${coin.dexscreener.priceChanges.change6h >= 0 ? 'positive' : 'negative'}`} style={{fontSize: '0.9rem', padding: '2px 6px', borderRadius: '6px'}}>
                      {formatPercent(coin.dexscreener.priceChanges.change6h)}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>24h</div>
                    <div className={`price-change ${coin.dexscreener.priceChanges.change24h >= 0 ? 'positive' : 'negative'}`} style={{fontSize: '0.9rem', padding: '2px 6px', borderRadius: '6px'}}>
                      {formatPercent(coin.dexscreener.priceChanges.change24h)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="content-placeholder">Price change data will appear when available</div>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="activity-section">
            <h3 className="section-title">Activity</h3>
            <div className="section-content">
              <div className="content-placeholder">Activity feed coming soon</div>
            </div>
          </div>

          {/* Volume Analysis */}
          <div className="volume-analysis-section">
            <h3 className="section-title">Volume Analysis</h3>
            <div className="section-content">
              {coin.dexscreener?.volumes ? (
                <div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '16px', textAlign: 'center'}}>
                    <div>
                      <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>5m Volume</div>
                      <div style={{fontSize: '0.95rem', fontWeight: '700'}}>${formatCompact(coin.dexscreener.volumes.volume5m)}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>1h Volume</div>
                      <div style={{fontSize: '0.95rem', fontWeight: '700'}}>${formatCompact(coin.dexscreener.volumes.volume1h)}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginBottom: '4px'}}>6h Volume</div>
                      <div style={{fontSize: '0.95rem', fontWeight: '700'}}>${formatCompact(coin.dexscreener.volumes.volume6h)}</div>
                    </div>
                  </div>
                  {/* Volume Trend Analysis */}
                  {coin.dexscreener.volumes.volume24h > 0 && (
                    <div style={{fontSize: '0.9rem', color: 'rgba(0,0,0,0.7)'}}>
                      <div style={{marginBottom: '6px'}}>
                        <strong>24h Trend:</strong> 
                        {coin.dexscreener.volumes.volume6h > (coin.dexscreener.volumes.volume24h * 0.25) ? (
                          <span style={{color: '#22c55e', marginLeft: '6px'}}>📈 Strong</span>
                        ) : coin.dexscreener.volumes.volume6h > (coin.dexscreener.volumes.volume24h * 0.15) ? (
                          <span style={{color: '#f59e0b', marginLeft: '6px'}}>📊 Moderate</span>
                        ) : (
                          <span style={{color: '#ef4444', marginLeft: '6px'}}>📉 Weak</span>
                        )}
                      </div>
                      <div>
                        <strong>Liquidity Ratio:</strong> 
                        <span style={{marginLeft: '6px'}}>
                          {liquidity > 0 ? `${(volume24h / liquidity).toFixed(2)}x` : 'N/A'}
                        </span>
                      </div>
                      <div style={{marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px'}}>
                        <strong>Liquidity Security:</strong>
                        <div style={{marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <LiquidityLockIndicator coin={coin} size="medium" showText={true} />
                          {coin.rugcheckVerified && coin.rugcheckScore && (
                            <div style={{fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)'}}>
                              Score: {coin.rugcheckScore}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="content-placeholder">Volume analysis will appear when available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Banner Modal */}
      {showBannerModal && (
        <div className="banner-modal-overlay" onClick={closeBannerModal}>
          <div className="banner-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="banner-modal-close" onClick={closeBannerModal}>
              ×
            </button>
            <img
              src={coin.banner || coin.bannerImage || coin.header || coin.bannerUrl}
              alt={coin.name || 'Token banner'}
              className="banner-modal-image"
            />
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="profile-modal-overlay" onClick={closeProfileModal}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal-close" onClick={closeProfileModal}>
              ×
            </button>
            <img
              src={coin.profileImage}
              alt={coin.name || 'Token profile'}
              className="profile-modal-image"
            />
            <div className="profile-modal-info">
              <h3 className="profile-modal-name">{coin.name || 'Unknown Token'}</h3>
              <p className="profile-modal-symbol">{coin.symbol || coin.ticker || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CoinCard.displayName = 'CoinCard';

export default CoinCard;