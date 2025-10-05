import React from 'react';
import CleanPriceChart from './components/CleanPriceChart';
import './TestChart.css';

const TestChart = () => {
  // BAGWORK coin data
  const bagworkCoin = {
    address: '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump',
    mintAddress: '7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump',
    symbol: 'BAGWORK',
    name: 'BAGWORK',
    price: 0.00345, // Approximate current price
    price_usd: 0.00345,
    priceUsd: 0.00345,
    change_24h: 5.2, // Some test data
    volume_24h: 125000,
    market_cap: 1500000
  };

  return (
    <div className="test-chart-container">
      <div className="test-header">
        <h1>🎯 BAGWORK Chart Test</h1>
        <p>Testing real Birdeye integration - click the <strong>1H</strong> button to see real price data!</p>
        <div className="coin-info">
          <h2>{bagworkCoin.symbol} - {bagworkCoin.name}</h2>
          <p>Address: {bagworkCoin.address}</p>
          <p>Price: ${bagworkCoin.price.toFixed(8)}</p>
        </div>
      </div>

      <div className="chart-container">
        <CleanPriceChart 
          coin={bagworkCoin} 
          width={400} 
          height={200} 
        />
      </div>

      <div className="instructions">
        <h3>🎯 Testing Instructions:</h3>
        <ol>
          <li>The chart above automatically shows BAGWORK real data (1H timeframe)</li>
          <li>You should see "🎯 Real Market Data (60min)" indicator</li>
          <li>The chart shows 60 minutes of actual price movements</li>
          <li>Each point represents 1 minute of real market data</li>
          <li>Try different tokens by changing the address in the code</li>
        </ol>
        
        <div className="expected-behavior">
          <h4>✅ Expected Behavior:</h4>
          <ul>
            <li>Chart automatically loads with real BAGWORK price data</li>
            <li>Shows actual highs and lows from the past 60 minutes</li>
            <li>Data source shows "🎯 Real Market Data (60min)"</li>
            <li>Price movements reflect actual market activity</li>
            <li>Works for any Solana token address</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestChart;
