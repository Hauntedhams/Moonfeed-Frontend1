import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import './ProfileView.css';

const ProfileView = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection]);

  const fetchBalance = async () => {
    if (!publicKey || !connection) return;
    
    setIsLoadingBalance(true);
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / 1000000000); // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    const str = address.toString();
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!connected) {
    return (
      <div className="profile-view">
        <div className="profile-container">
          {/* Header */}
          <div className="profile-header">
            <div className="profile-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h1>Profile</h1>
            <p className="profile-subtitle">Connect your wallet to access your Moonfeed profile</p>
          </div>

          {/* Wallet Connection Section */}
          <div className="wallet-connection-section">
            <div className="connection-card">
              <div className="connection-icon">🔗</div>
              <h3>Connect Wallet</h3>
              <p>Connect your Solana wallet to view transaction history, manage favorites, and access advanced features.</p>
              <div className="wallet-button-container">
                <WalletMultiButton />
              </div>
            </div>
          </div>

          {/* Features Preview */}
          <div className="features-preview">
            <h3>What you'll get access to:</h3>
            <div className="feature-grid">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div className="feature-content">
                  <h4>Transaction History</h4>
                  <p>View your complete Solana trading history</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⭐</div>
                <div className="feature-content">
                  <h4>Synced Favorites</h4>
                  <p>Your favorites synced across devices</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎯</div>
                <div className="feature-content">
                  <h4>Portfolio Tracking</h4>
                  <p>Track your meme coin portfolio performance</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔔</div>
                <div className="feature-content">
                  <h4>Price Alerts</h4>
                  <p>Get notified when your coins hit target prices</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <div className="feature-content">
                  <h4>Quick Trading</h4>
                  <p>One-click trading with Jupiter integration</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📈</div>
                <div className="feature-content">
                  <h4>Advanced Analytics</h4>
                  <p>Detailed insights into your trading patterns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-view">
      <div className="profile-container">
        {/* Connected Header */}
        <div className="profile-header connected">
          <div className="profile-icon connected">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <div className="connected-indicator">✓</div>
          </div>
          <h1>Welcome Back!</h1>
          <p className="profile-subtitle">Your Moonfeed profile is ready</p>
        </div>

        {/* Wallet Info */}
        <div className="wallet-info-section">
          <div className="wallet-info-card">
            <div className="wallet-header">
              <h3>Wallet Information</h3>
              <button 
                className="disconnect-btn"
                onClick={disconnect}
                title="Disconnect wallet"
              >
                Disconnect
              </button>
            </div>
            
            <div className="wallet-details">
              <div className="wallet-address-row">
                <span className="label">Address:</span>
                <div className="address-container">
                  <span className="address">{formatAddress(publicKey)}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(publicKey?.toString())}
                    title="Copy full address"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="balance-row">
                <span className="label">SOL Balance:</span>
                <div className="balance-container">
                  {isLoadingBalance ? (
                    <span className="loading">Loading...</span>
                  ) : balance !== null ? (
                    <span className="balance">{balance.toFixed(4)} SOL</span>
                  ) : (
                    <span className="error">Unable to load</span>
                  )}
                  <button 
                    className="refresh-btn"
                    onClick={fetchBalance}
                    disabled={isLoadingBalance}
                    title="Refresh balance"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Features */}
        <div className="profile-features">
          <div className="feature-section">
            <h3>📊 Transaction History</h3>
            <div className="coming-soon-feature">
              <p>Your complete Solana transaction history will appear here.</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
          </div>

          <div className="feature-section">
            <h3>🎯 Portfolio Tracking</h3>
            <div className="coming-soon-feature">
              <p>Track your meme coin portfolio performance and P&L.</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
          </div>

          <div className="feature-section">
            <h3>🔔 Price Alerts</h3>
            <div className="coming-soon-feature">
              <p>Set up price alerts for your favorite tokens.</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
          </div>

          <div className="feature-section">
            <h3>⚙️ Settings</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <span>Network:</span>
                <span className="setting-value">Solana Mainnet</span>
              </div>
              <div className="setting-item">
                <span>Theme:</span>
                <span className="setting-value">Dark Mode</span>
              </div>
              <div className="setting-item">
                <span>Currency:</span>
                <span className="setting-value">USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
