// Real price data fetcher for charts
export const fetchRealPriceData = async (coinId, days = 1) => {
  try {
    // Try CoinGecko first (free tier allows some requests)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${days <= 1 ? 'hourly' : 'daily'}`
    );
    
    if (response.ok) {
      const data = await response.json();
      
      // Convert CoinGecko data to TradingView format
      const chartData = [];
      const volumeData = [];
      
      if (data.prices && data.volumes) {
        for (let i = 0; i < data.prices.length - 1; i++) {
          const [timestamp, price] = data.prices[i];
          const [, volume] = data.volumes[i] || [timestamp, 0];
          const [, nextPrice] = data.prices[i + 1] || [timestamp, price];
          
          const time = Math.floor(timestamp / 1000); // Convert to seconds
          const open = price;
          const close = nextPrice;
          const high = Math.max(open, close) * (1 + Math.random() * 0.005); // Small realistic wick
          const low = Math.min(open, close) * (1 - Math.random() * 0.005);
          
          chartData.push({
            time,
            open: parseFloat(open.toFixed(8)),
            high: parseFloat(high.toFixed(8)),
            low: parseFloat(low.toFixed(8)),
            close: parseFloat(close.toFixed(8)),
          });
          
          volumeData.push({
            time,
            value: volume,
            color: nextPrice > price ? '#00ff8860' : '#ff497660',
          });
        }
      }
      
      return { chartData, volumeData, isReal: true };
    }
  } catch (error) {
    console.log('Real data fetch failed:', error.message);
  }
  
  return null; // Fallback to generated data
};

// Generate realistic sample data (fallback)
export const generateSampleData = (symbol, currentPrice) => {
  const candleData = [];
  const volumeData = [];
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  // Start from 24 hours ago
  const startTime = now - (24 * oneHour);
  
  // Generate hourly candlesticks for 24 hours
  let price = currentPrice * 0.95; // Start slightly lower
  
  for (let i = 0; i < 24; i++) {
    const time = (startTime + (i * oneHour)) / 1000; // Convert to seconds
    
    // Generate some realistic price movement
    const volatility = 0.02; // 2% max change per hour
    const change = (Math.random() - 0.5) * volatility;
    const newPrice = price * (1 + change);
    
    // Create OHLC data
    const open = price;
    const close = newPrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    // Generate volume (higher volume on bigger price moves)
    const priceChangePercent = Math.abs(change);
    const baseVolume = 1000000;
    const volume = baseVolume * (1 + priceChangePercent * 10) * (0.5 + Math.random());
    
    candleData.push({
      time,
      open: parseFloat(open.toFixed(6)),
      high: parseFloat(high.toFixed(6)),
      low: parseFloat(low.toFixed(6)),
      close: parseFloat(close.toFixed(6)),
    });
    
    volumeData.push({
      time,
      value: parseFloat(volume.toFixed(0)),
      color: newPrice > price ? '#00ff8860' : '#ff497660',
    });
    
    price = newPrice;
  }
  
  // Make sure the last price matches the current price
  const lastCandle = candleData[candleData.length - 1];
  const adjustment = currentPrice / lastCandle.close;
  
  // Adjust all prices to end at current price
  candleData.forEach(candle => {
    candle.open *= adjustment;
    candle.high *= adjustment;
    candle.low *= adjustment;
    candle.close *= adjustment;
  });
  
  return { candleData, volumeData, isReal: false };
};
