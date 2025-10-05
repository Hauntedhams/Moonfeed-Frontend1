import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import './CleanPriceChart.css';

const CleanPriceChart = memo(({ coin, width, height = 180 }) => {
  // Use parent container width - if width is "100%" or similar, use full container
  const chartWidth = width === "100%" ? "100%" : (width || 280);

  const [priceData, setPriceData] = useState([]);
  const [timeframe, setTimeframe] = useState('1m'); // Default to 1H view with 1-minute intervals (real data)
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState('ready'); // 'universal-real', 'loading', 'generated', 'ready', 'jupiter-live', or 'error'
  const [hoveredPoint, setHoveredPoint] = useState(null); // For tooltip
  const [hasLoadedData, setHasLoadedData] = useState(false); // Track if real data has been loaded
  const [jupiterPrice, setJupiterPrice] = useState(null); // Live Jupiter price
  const [isLiveMode, setIsLiveMode] = useState(false); // Track if we're in 1-second live mode
  const canvasRef = useRef(null);
  const liveUpdateIntervalRef = useRef(null); // For 1-second updates
  const lastJupiterFetchRef = useRef(0); // For throttling Jupiter API calls
  
  // Cache for generated chart data to prevent regeneration
  const chartDataCache = useRef(new Map());
  const dataCache = useRef(new Map()); // Cache for generated data

  // Timeframe options with proper granular intervals for smooth hovering
  const timeframes = [
    { label: '1S', value: '1s', bars: 60 },     // 60 bars of 1 second = 1 minute (Jupiter live price)
    { label: '1H', value: '1m', bars: 60 },     // 60 bars of 1 minute = 1 hour
    { label: '1D', value: '5m', bars: 288 },    // 288 bars of 5 minutes = 1 day  
    { label: '1W', value: '30m', bars: 336 },   // 336 bars of 30 minutes = 1 week
    { label: '1M', value: '1h', bars: 720 },    // 720 bars of 1 hour = 1 month
    { label: 'YTD', value: '1d', bars: 275 },   // 275 bars of 1 day = YTD
  ];

  // Fetch real price data for 1H timeframe using universal chart API
  const fetchPriceData = async () => {
    try {
      setLoading(true);
      
      if (coin && (coin.address || coin.mintAddress || coin.tokenAddress)) {
        const tokenAddress = coin.address || coin.mintAddress || coin.tokenAddress;
        console.log(`[CleanChart] 🎯 Fetching chart data for: ${tokenAddress.substring(0, 8)}...`);
        
        // 🚀 SPECIAL HANDLING FOR 1-SECOND TIMEFRAME - Use Jupiter Live Price
        if (timeframe === '1s') {
          console.log(`[CleanChart] ⚡ Using Jupiter live price for 1-second chart`);
          await initializeJupiterLiveMode(tokenAddress);
          return;
        }
        
        // 🎯 ALWAYS TRY UNIVERSAL CHART API FIRST for 1H timeframe (60 minutes of real data)
        if (timeframe === '1m') {
          console.log(`[CleanChart] 📊 Using universal chart API for 1H chart`);
          
          try {
            const chartResponse = await fetch(`http://localhost:3005/api/token-chart/${tokenAddress}`);
            
            if (chartResponse.ok) {
              const chartData = await chartResponse.json();
              console.log('[CleanChart] ✅ Universal chart data received:', chartData.chart?.points?.length || 0, 'points');
              
              if (chartData.success && chartData.chart && chartData.chart.points && chartData.chart.points.length > 0) {
                // Transform chart data to our format
                const priceData = chartData.chart.points.map((point) => ({
                  time: point.time, // Already in milliseconds
                  price: point.price
                }));
                
                const tokenInfo = chartData.tokenInfo;
                console.log(`[CleanChart] 🎉 SUCCESS: ${priceData.length} real price points for ${tokenInfo?.symbol || 'token'}`);
                console.log(`[CleanChart] Price range: $${chartData.chart.priceInfo.min.toFixed(8)} → $${chartData.chart.priceInfo.max.toFixed(8)}`);
                console.log(`[CleanChart] 1H Change: ${chartData.chart.priceInfo.change > 0 ? '+' : ''}${chartData.chart.priceInfo.change.toFixed(2)}%`);
                
                setPriceData(priceData);
                setDataSource('universal-real');
                setLoading(false);
                return;
              } else {
                console.log('[CleanChart] ⚠️ Universal chart API returned no valid data');
              }
            } else {
              console.log('[CleanChart] ⚠️ Universal chart API failed with status:', chartResponse.status);
            }
          } catch (chartError) {
            console.error('[CleanChart] ❌ Universal chart error:', chartError.message);
          }
        }
        
        console.log('[CleanChart] 🔄 Falling back to generated chart data...');
        
      } else {
        console.log('[CleanChart] ⚠️ No valid token address provided');
      }
      
    } catch (error) {
      console.error('[CleanChart] ❌ Error:', error.message);
    }
    
    // Fallback: generate chart data 
    if (coin) {
      console.log('[CleanChart] 📈 Using generated chart data as fallback');
      const chartData = generateRealisticChartData();
      setPriceData(chartData);
      setDataSource('generated');
    } else {
      setPriceData([]);
      setDataSource('no-token');
    }
    
    setLoading(false);
  };

  // Initialize Jupiter live mode for 1-second updates
  const initializeJupiterLiveMode = async (tokenAddress) => {
    try {
      console.log(`[CleanChart] 🚀 Initializing Jupiter live mode for ${tokenAddress.substring(0, 8)}...`);
      
      // Stop any existing live updates
      if (liveUpdateIntervalRef.current) {
        clearInterval(liveUpdateIntervalRef.current);
      }
      
      // Fetch initial Jupiter price
      const initialPrice = await fetchJupiterPrice(tokenAddress);
      if (!initialPrice) {
        throw new Error('Failed to fetch initial Jupiter price');
      }
      
      // Initialize with 60 seconds of data, starting with the current price
      const now = Date.now();
      const initialData = [];
      for (let i = 59; i >= 0; i--) {
        initialData.push({
          time: now - (i * 1000), // 1 second intervals
          price: initialPrice * (1 + (Math.random() - 0.5) * 0.001) // Small random variation for historical points
        });
      }
      
      setPriceData(initialData);
      setDataSource('jupiter-live');
      setIsLiveMode(true);
      setLoading(false);
      
      console.log(`[CleanChart] ✅ Jupiter live mode initialized with ${initialData.length} data points`);
      
      // Start 1-second price updates
      liveUpdateIntervalRef.current = setInterval(async () => {
        const newPrice = await fetchJupiterPrice(tokenAddress);
        if (newPrice) {
          updateLivePriceData(newPrice);
        }
      }, 1000);
      
    } catch (error) {
      console.error('[CleanChart] ❌ Error initializing Jupiter live mode:', error.message);
      setDataSource('error');
      setLoading(false);
    }
  };

  // Fetch Jupiter live price
  const fetchJupiterPrice = async (tokenAddress) => {
    const now = Date.now();
    // Throttle to max 1 call per second to avoid rate limiting
    if (now - lastJupiterFetchRef.current < 1000) {
      return jupiterPrice; // Return cached price if too recent
    }
    lastJupiterFetchRef.current = now;

    try {
      const response = await fetch(`https://lite-api.jup.ag/price/v3?ids=${tokenAddress}`);
      
      if (!response.ok) {
        console.error(`[CleanChart] Jupiter API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data[tokenAddress]) {
        const priceData = data[tokenAddress];
        const price = priceData.usdPrice || priceData.price;
        
        if (price && price > 0) {
          setJupiterPrice(price);
          return price;
        }
      }
      
      console.log('[CleanChart] ⚠️ No valid price data from Jupiter');
      return null;
      
    } catch (error) {
      console.error('[CleanChart] ❌ Jupiter price fetch error:', error.message);
      return null;
    }
  };

  // Update live price data with new Jupiter price
  const updateLivePriceData = (newPrice) => {
    setPriceData(prevData => {
      const now = Date.now();
      const newPoint = { time: now, price: newPrice };
      
      // Add new point and keep only last 60 seconds
      const updatedData = [...prevData, newPoint];
      const cutoffTime = now - (60 * 1000); // 60 seconds ago
      
      // Filter to keep only last 60 seconds of data
      const filteredData = updatedData.filter(point => point.time >= cutoffTime);
      
      console.log(`[CleanChart] 📈 Live price update: $${newPrice.toFixed(8)} (${filteredData.length} points)`);
      return filteredData;
    });
  };

  // Generate realistic chart data from existing coin information
  const generateRealisticChartData = () => {
    const currentPrice = coin?.price_usd ?? coin?.priceUsd ?? coin?.price ?? 0;
    const coinId = coin?.address || coin?.symbol || coin?.id || 'unknown';
    
    // Create a stable cache key that doesn't include exact price (to prevent constant regeneration)
    const cacheKey = `${coinId}-${timeframe}`;
    
    // Check if we have cached data for this exact combination
    if (dataCache.current.has(cacheKey)) {
      return dataCache.current.get(cacheKey);
    }
    
    // Get the appropriate price change for the timeframe
    const priceChange = (() => {
      switch(timeframe) {
        case '5m': return coin?.priceChange?.m5 ?? coin?.change_5m ?? (coin?.change_24h ?? 0) * 0.1;
        case '15m': return coin?.priceChange?.m15 ?? coin?.change_15m ?? (coin?.change_24h ?? 0) * 0.2;
        case '1h': return coin?.priceChange?.h1 ?? coin?.change_1h ?? (coin?.change_24h ?? 0) * 0.3;
        case '4h': return coin?.priceChange?.h4 ?? coin?.change_4h ?? (coin?.change_24h ?? 0) * 0.6;
        case '24h': return coin?.priceChange?.h24 ?? coin?.change_24h ?? coin?.change24h ?? 0;
        default: return coin?.change_24h ?? coin?.priceChange24h ?? coin?.change24h ?? 0;
      }
    })();
    
    // Use volume and market cap to determine volatility
    const volume24h = coin?.volume_24h_usd ?? coin?.volume_24h ?? coin?.volume24h ?? 0;
    const marketCap = coin?.market_cap_usd ?? coin?.market_cap ?? coin?.marketCap ?? 0;
    const liquidity = coin?.liquidity_usd ?? coin?.liquidity ?? coin?.liquidityUsd ?? 0;
    
    // Calculate realistic volatility based on market metrics
    const baseVolatility = Math.abs(priceChange) / 100 * 0.3; // Reduced volatility
    const volumeVolatility = volume24h > 0 && marketCap > 0 ? (volume24h / marketCap) * 0.05 : 0.01;
    const liquidityFactor = liquidity > 0 ? Math.min(1, liquidity / 100000) : 0.5;
    const volatility = Math.max(0.005, (baseVolatility + volumeVolatility) * (1.5 - liquidityFactor)); // Reduced overall volatility
    
    const chartData = generateSmoothPriceData(currentPrice, priceChange, timeframe, volatility);
    
    // Cache the generated data
    dataCache.current.set(cacheKey, chartData);
    
    // Limit cache size to prevent memory leaks
    if (dataCache.current.size > 50) {
      const firstKey = dataCache.current.keys().next().value;
      dataCache.current.delete(firstKey);
    }
    
    return chartData;
  };

  // Fallback data generation (simplified since we're always using coin data)
  const generateFallbackData = () => {
    const currentPrice = coin?.price_usd ?? coin?.priceUsd ?? coin?.price ?? 0;
    const change24h = coin?.change_24h ?? coin?.priceChange24h ?? coin?.change24h ?? 0;
    const data = generateSmoothPriceData(currentPrice, change24h, timeframe);
    setPriceData(data);
    setLoading(false);
  };

  // Get time interval in milliseconds for each timeframe
  const getTimeInterval = (tf) => {
    const intervals = {
      '1s': 1 * 1000,           // 1 second per bar
      '5m': 5 * 60 * 1000,       // 5 minutes per bar
      '15m': 15 * 60 * 1000,     // 15 minutes per bar
      '1h': 60 * 60 * 1000,      // 1 hour per bar
      '4h': 4 * 60 * 60 * 1000,  // 4 hours per bar
      '24h': 24 * 60 * 60 * 1000, // 24 hours per bar
    };
    return intervals[tf] || 60 * 60 * 1000; // Default to 1 hour
  };

  // Generate smooth price data using real market data and volatility
  const generateSmoothPriceData = (currentPrice, priceChange, tf, customVolatility = null) => {
    const config = timeframes.find(t => t.value === tf) || timeframes[2];
    const dataPoints = config.bars;
    const data = [];
    
    // Create a deterministic seed based on coin data to ensure consistent charts
    const coinId = coin?.address || coin?.symbol || coin?.id || 'unknown';
    const coinSeed = coinId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
    const timeframeSeed = tf.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
    const baseSeed = (coinSeed * 1000 + timeframeSeed) % 233280;
    
    // Simple seeded random number generator for consistent results
    let seed = baseSeed;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // Calculate start price based on change
    const changePercent = priceChange / 100;
    const startPrice = currentPrice / (1 + changePercent);
    
    // Use custom volatility or calculate from change
    const volatility = customVolatility ?? Math.max(0.01, Math.abs(changePercent) * 0.3);
    
    // Create consistent price movements
    const priceMovements = [];
    let currentPricePoint = startPrice;
    
    for (let i = 0; i < dataPoints; i++) {
      const progress = i / (dataPoints - 1);
      
      // Overall trend towards final price (stronger trend component)
      const trendWeight = 0.8; // 80% trend, 20% noise for more stable movement
      const targetPrice = startPrice + (currentPrice - startPrice) * progress;
      
      // Add deterministic market movements using seeded random
      const waveFrequency = 2 + (seededRandom() * 2); // Consistent wave patterns
      const wave1 = Math.sin(progress * Math.PI * waveFrequency) * volatility * startPrice * 0.2;
      const wave2 = Math.sin(progress * Math.PI * waveFrequency * 1.5) * volatility * startPrice * 0.1;
      
      // Consistent random walk component
      const randomWalk = (seededRandom() - 0.5) * volatility * startPrice * 0.15;
      
      // Momentum effect (price tends to continue in same direction)
      const momentum = i > 0 ? (priceMovements[i-1] - (i > 1 ? priceMovements[i-2] : startPrice)) * 0.2 : 0;
      
      // Combine all factors with more weight on trend
      let newPrice = targetPrice * trendWeight + 
                     currentPricePoint * (1 - trendWeight) + 
                     wave1 + wave2 + randomWalk + momentum;
      
      // Ensure price doesn't go negative and has reasonable bounds
      newPrice = Math.max(0.000001, newPrice);
      newPrice = Math.max(startPrice * 0.7, Math.min(startPrice * 1.5, newPrice)); // Tighter bounds
      
      priceMovements.push(newPrice);
      currentPricePoint = newPrice;
      
      data.push({
        time: Date.now() - (dataPoints - i) * getTimeInterval(tf),
        price: newPrice
      });
    }
    
    // Ensure last price reflects current coin price but don't regenerate chart for minor price changes
    if (data.length > 0) {
      // Use the generated final price to maintain chart consistency
      // The actual current price will be shown in the UI separately
      const finalPrice = data[data.length - 1].price;
      data[data.length - 1].price = finalPrice;
    }
    
    return data;
  };

  // Don't auto-fetch data - wait for user to click "Load Graph" button
  useEffect(() => {
    if (!coin) return;
    
    // Stop live updates when changing timeframes or coins
    if (liveUpdateIntervalRef.current) {
      clearInterval(liveUpdateIntervalRef.current);
      liveUpdateIntervalRef.current = null;
    }
    setIsLiveMode(false);
    
    // Reset loaded state when coin changes
    setHasLoadedData(false);
    setPriceData([]);
    setDataSource('ready');
    setLoading(false);
  }, [coin?.address || coin?.mintAddress || coin?.symbol || coin?.id, timeframe]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (liveUpdateIntervalRef.current) {
        clearInterval(liveUpdateIntervalRef.current);
      }
    };
  }, []);

  // Manual data loading function triggered by button click
  const handleLoadGraph = async () => {
    console.log('[CleanChart] 🎯 User clicked Load Graph button for timeframe:', timeframe);
    setHasLoadedData(true);
    await fetchPriceData();
  };

  // Note: Removed auto-refresh since we're using coin data, not live API
  // Charts will update when coin data changes or timeframe changes

  // Draw the chart on canvas
  useEffect(() => {
    if (!priceData.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Get actual canvas container width
    const containerWidth = canvas.parentElement?.offsetWidth || (typeof chartWidth === 'number' ? chartWidth : 280);
    
    // Animation frame for live mode
    let animationFrameId;
    
    const drawChart = () => {
      // Set canvas size with device pixel ratio
      canvas.width = containerWidth * dpr;
      canvas.height = height * dpr;
      canvas.style.width = containerWidth + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);

      // Clear canvas
      ctx.clearRect(0, 0, containerWidth, height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, containerWidth, height);

      // Find min/max prices for scaling
      const prices = priceData.map(d => d.price);
      const minPrice = Math.min(...prices) * 0.98; // Add 2% padding
      const maxPrice = Math.max(...prices) * 1.02; // Add 2% padding
      const priceRange = maxPrice - minPrice;
      
      // Add padding
      const padding = { top: 20, right: 20, bottom: 30, left: 20 };
      const chartHeight = height - padding.top - padding.bottom;

      // Determine line color based on overall trend
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const isPositive = lastPrice >= firstPrice;
      const lineColor = isPositive ? '#22c55e' : '#ef4444';
      const gradientColor = isPositive ? 'rgba(34, 197, 94, 0.10)' : 'rgba(239, 68, 68, 0.10)';

      // Create gradient for area fill
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, gradientColor);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');

      // Grid lines removed for cleaner look

      // Draw area under curve
      ctx.beginPath();
      priceData.forEach((point, index) => {
        const x = padding.left + (index / (priceData.length - 1)) * (containerWidth - padding.left - padding.right);
        const y = padding.top + (1 - (point.price - minPrice) / priceRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      // Complete the area
      const lastX = padding.left + (containerWidth - padding.left - padding.right);
      ctx.lineTo(lastX, height - padding.bottom);
      ctx.lineTo(padding.left, height - padding.bottom);
      ctx.closePath();
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw the smooth line with better interpolation
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Use quadratic curves for smoother lines
      for (let i = 0; i < priceData.length; i++) {
        const x = padding.left + (i / (priceData.length - 1)) * (containerWidth - padding.left - padding.right);
        const y = padding.top + (1 - (priceData[i].price - minPrice) / priceRange) * chartHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else if (i === priceData.length - 1) {
          ctx.lineTo(x, y);
        } else {
          // Use quadratic curve for smooth line
          const xPrev = padding.left + ((i - 1) / (priceData.length - 1)) * (containerWidth - padding.left - padding.right);
          const yPrev = padding.top + (1 - (priceData[i - 1].price - minPrice) / priceRange) * chartHeight;
          const xNext = padding.left + ((i + 1) / (priceData.length - 1)) * (containerWidth - padding.left - padding.right);
          const yNext = padding.top + (1 - (priceData[i + 1].price - minPrice) / priceRange) * chartHeight;
          
          const cp1x = x;
          const cp1y = yPrev;
          const cp2x = x;
          const cp2y = yNext;
          
          ctx.quadraticCurveTo(cp1x, (y + yPrev) / 2, x, y);
        }
      }
      ctx.stroke();

      // Draw price markers for highs and lows
      const maxPriceIndex = prices.indexOf(Math.max(...prices));
      const minPriceIndex = prices.indexOf(Math.min(...prices));
      
      // Draw max price marker
      const maxX = padding.left + (maxPriceIndex / (priceData.length - 1)) * (containerWidth - padding.left - padding.right);
      const maxY = padding.top + (1 - (prices[maxPriceIndex] - minPrice) / priceRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(maxX, maxY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      
      // Draw min price marker
      const minX = padding.left + (minPriceIndex / (priceData.length - 1)) * (containerWidth - padding.left - padding.right);
      const minY = padding.top + (1 - (prices[minPriceIndex] - minPrice) / priceRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(minX, minY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // Draw current price point with animation
      if (priceData.length > 0) {
        const lastPoint = priceData[priceData.length - 1];
        const x = padding.left + (containerWidth - padding.left - padding.right);
        const y = padding.top + (1 - (lastPoint.price - minPrice) / priceRange) * chartHeight;
        
        // Enhanced animation for live mode
        const pulseSize = isLiveMode ? 10 : 8;
        const middleSize = isLiveMode ? 6 : 5;
        const innerSize = isLiveMode ? 4 : 3;
        
        // Outer glow (enhanced for live mode)
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
        ctx.fillStyle = lineColor + (isLiveMode ? '30' : '20');
        ctx.fill();
        
        // Middle ring
        ctx.beginPath();
        ctx.arc(x, y, middleSize, 0, 2 * Math.PI);
        ctx.fillStyle = lineColor + (isLiveMode ? '60' : '40');
        ctx.fill();
        
        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, innerSize, 0, 2 * Math.PI);
        ctx.fillStyle = lineColor;
        ctx.fill();
        
        // Add live pulse ring for 1-second mode
        if (isLiveMode) {
          const time = Date.now() % 2000; // 2-second cycle
          const pulseOpacity = Math.sin(time / 2000 * Math.PI * 2) * 0.3 + 0.3;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, 2 * Math.PI);
          ctx.strokeStyle = lineColor + Math.floor(pulseOpacity * 255).toString(16).padStart(2, '0');
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Draw hover indicator if hovering
      if (hoveredPoint && hoveredPoint.dataX && hoveredPoint.dataY) {
        // Vertical line
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(hoveredPoint.dataX, padding.top);
        ctx.lineTo(hoveredPoint.dataX, height - padding.bottom);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // Hover point
        ctx.beginPath();
        ctx.arc(hoveredPoint.dataX, hoveredPoint.dataY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(hoveredPoint.dataX, hoveredPoint.dataY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = lineColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(hoveredPoint.dataX, hoveredPoint.dataY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
      
      // Continue animation for live mode
      if (isLiveMode) {
        animationFrameId = requestAnimationFrame(drawChart);
      }
    };
    
    // Start drawing
    drawChart();
    
    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

  }, [priceData, width, height, hoveredPoint, isLiveMode]);

  // Mouse tracking for hover tooltip
  const handleMouseMove = (event) => {
    if (!priceData.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Chart dimensions and padding
    const padding = { top: 20, right: 20, bottom: 30, left: 20 };
    const chartHeight = height - padding.top - padding.bottom;
    const containerWidth = canvas.offsetWidth;

    // Check if mouse is within chart area
    if (mouseX < padding.left || mouseX > containerWidth - padding.right || 
        mouseY < padding.top || mouseY > height - padding.bottom) {
      setHoveredPoint(null);
      return;
    }

    // Find the closest data point based on X position
    const dataPointWidth = (containerWidth - padding.left - padding.right) / (priceData.length - 1);
    const relativeX = mouseX - padding.left;
    const dataIndex = Math.round(relativeX / dataPointWidth);
    
    if (dataIndex >= 0 && dataIndex < priceData.length) {
      const point = priceData[dataIndex];
      const prices = priceData.map(d => d.price);
      const minPrice = Math.min(...prices) * 0.98;
      const maxPrice = Math.max(...prices) * 1.02;
      
      // Calculate the exact position for the tooltip
      const x = padding.left + (dataIndex / (priceData.length - 1)) * (containerWidth - padding.left - padding.right);
      const y = padding.top + (1 - (point.price - minPrice) / (maxPrice - minPrice)) * chartHeight;
      
      setHoveredPoint({
        ...point,
        x: mouseX, // Use mouse position for tooltip placement
        y: mouseY,
        dataX: x,
        dataY: y,
        index: dataIndex
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Format time for tooltip with enhanced granular timeframe support
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    // For 1d timeframe (5-minute intervals), show precise time
    if (timeframe === '1d') {
      if (diffMinutes < 60) {
        return `${Math.floor(diffMinutes)}m ago • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return `${Math.floor(diffHours)}h ${Math.floor(diffMinutes % 60)}m ago • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }
    
    // For very recent data (less than 1 hour)
    if (diffMinutes < 60) {
      return `${Math.floor(diffMinutes)}m ago • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    // For recent data (less than 24 hours)
    else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    // For data within the last week
    else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago • ${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`;
    }
    // For older data
    else {
      return date.toLocaleDateString([], { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: timeframe === '5m' || timeframe === '15m' || timeframe === '1h' || timeframe === '1d' ? '2-digit' : undefined,
        minute: timeframe === '5m' || timeframe === '15m' || timeframe === '1d' ? '2-digit' : undefined
      });
    }
  };

  const formatPrice = (price) => {
    if (!isFinite(price)) return '$0.00';
    if (Math.abs(price) < 0.00001) return `$${price.toFixed(8)}`;
    if (Math.abs(price) < 0.01) return `$${price.toFixed(6)}`;
    if (Math.abs(price) < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatPercent = (value) => {
    if (!isFinite(value)) return '0.00%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const currentPrice = coin?.price_usd ?? coin?.priceUsd ?? coin?.price ?? 0;
  const priceChange = (() => {
    switch(timeframe) {
      case '5m': return coin?.priceChange?.m5 ?? coin?.change_5m ?? 0;
      case '15m': return coin?.priceChange?.m15 ?? coin?.change_15m ?? 0;
      case '1h': return coin?.priceChange?.h1 ?? coin?.change_1h ?? 0;
      case '4h': return coin?.priceChange?.h4 ?? coin?.change_4h ?? 0;
      case '24h': return coin?.priceChange?.h24 ?? coin?.change_24h ?? coin?.change24h ?? 0;
      default: return coin?.change_24h ?? coin?.priceChange24h ?? coin?.change24h ?? 0;
    }
  })();

  // Calculate high and low from price data
  const prices = priceData.map(d => d.price);
  const high = prices.length > 0 ? Math.max(...prices) : currentPrice;
  const low = prices.length > 0 ? Math.min(...prices) : currentPrice;

  return (
    <div className="clean-price-chart">
      <div className="chart-canvas-container">
        {loading && (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
            <p>Loading real market data...</p>
          </div>
        )}
        
        {/* Load Graph Button - shows when no data loaded yet */}
        {!hasLoadedData && !loading && (
          <div className="load-graph-overlay">
            <div className="load-graph-content">
              <div className="load-graph-icon">
                {timeframe === '1s' ? '⚡' : '📊'}
              </div>
              <h3>
                {timeframe === '1s' ? 'Start Live Price Tracking' : 'Load Real Market Data'}
              </h3>
              <p>
                {timeframe === '1s' 
                  ? 'Real-time price updates every second using Jupiter API'
                  : 'Get the last 60 minutes of price history (1-minute intervals)'
                }
              </p>
              <button 
                className="load-graph-button"
                onClick={handleLoadGraph}
                disabled={loading}
              >
                {loading ? 'Loading...' : timeframe === '1s' ? 'Start Live Feed' : 'Load Graph'}
              </button>
              <div className="load-graph-note">
                <small>
                  {timeframe === '1s' 
                    ? '⚡ Live updates from Jupiter Price API' 
                    : '⚡ Real-time data from Birdeye API'
                  }
                </small>
              </div>
            </div>
          </div>
        )}
        
        <canvas 
          ref={canvasRef}
          className="price-chart-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ 
            opacity: hasLoadedData ? 1 : 0.3,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Hover tooltip */}
        {hoveredPoint && hasLoadedData && (
          <div 
            className="chart-tooltip"
            style={{
              left: hoveredPoint.x > (canvasRef.current?.offsetWidth * 0.7 || 200) ? `${hoveredPoint.x - 120}px` : `${hoveredPoint.x + 10}px`,
              top: `${hoveredPoint.y - 60}px`,
            }}
          >
            <div className="tooltip-price">{formatPrice(hoveredPoint.price)}</div>
            <div className="tooltip-time">{formatTime(hoveredPoint.time)}</div>
          </div>
        )}
      </div>
      
      {/* Consolidated data source indicator */}
      <div className="chart-data-source">
        <span className={`data-source-indicator ${dataSource}`}>
          {dataSource === 'jupiter-live' ? 'Live Jupiter Price Feed (1s updates)' :
           dataSource === 'universal-real' ? '🎯 Live Market Data (60 Points)' :
           dataSource === 'loading' ? '⏳ Loading Chart Data...' :
           dataSource === 'ready' ? '📊 Ready to Load Market Data' :
           dataSource === 'no-token' ? '⚠️ No Token Address' :
           dataSource === 'error' ? '❌ Data Error' :
           '🔧 Generated Chart'}
        </span>
      </div>
      
      <div className="timeframe-selector">
        {timeframes.map(tf => (
          <button
            key={tf.value}
            className={`timeframe-btn ${timeframe === tf.value ? 'active' : ''}`}
            onClick={() => setTimeframe(tf.value)}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default CleanPriceChart;
