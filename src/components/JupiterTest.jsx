import React, { useState, useEffect } from 'react';
import JupiterTradeModal from './JupiterTradeModal';

// Simple test component to verify Jupiter integration
const JupiterTest = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jupiterStatus, setJupiterStatus] = useState('Loading...');
  
  // Check Jupiter status
  useEffect(() => {
    const checkJupiter = () => {
      if (window.Jupiter) {
        setJupiterStatus(`✅ Jupiter Ready (${typeof window.Jupiter.init})`);
      } else {
        setJupiterStatus('❌ Jupiter Not Found');
      }
    };
    
    checkJupiter();
    const interval = setInterval(checkJupiter, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Mock coin data for testing
  const testCoin = {
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    symbol: "USDC",
    name: "USD Coin",
    image: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
  };

  const handleSwapSuccess = ({ txid, swapResult, coin }) => {
    console.log('✅ Test swap successful:', { txid, swapResult, coin });
    alert(`Swap successful! TX: ${txid}`);
  };

  const handleSwapError = ({ error, coin }) => {
    console.error('❌ Test swap failed:', { error, coin });
    alert(`Swap failed: ${error?.message || 'Unknown error'}`);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 20, 
      right: 20, 
      zIndex: 1000,
      background: 'rgba(0,0,0,0.9)',
      padding: '12px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '12px',
      maxWidth: '200px'
    }}>
      <div style={{ marginBottom: '8px' }}>
        {jupiterStatus}
      </div>
      <button 
        onClick={() => setIsModalOpen(true)}
        style={{
          background: 'linear-gradient(135deg, rgb(199, 242, 132) 0%, rgb(180, 220, 110) 100%)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          color: 'black',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        🧪 Test Jupiter
      </button>
      
      <JupiterTradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        coin={testCoin}
        onSwapSuccess={handleSwapSuccess}
        onSwapError={handleSwapError}
      />
    </div>
  );
};

export default JupiterTest;
