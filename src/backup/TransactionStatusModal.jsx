import React, { useState, useEffect } from 'react';
import './TransactionStatusModal.css';

const TransactionStatusModal = ({ 
  isOpen, 
  onClose, 
  transactions = [], 
  stage = 'preparing', 
  error = null, 
  coin = null 
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStageInfo = () => {
    switch (stage) {
      case 'preparing':
        return {
          title: 'Preparing Transaction',
          description: 'Getting quotes and preparing swap transaction...',
          icon: '⚡',
          color: '#fbbf24'
        };
      case 'signing':
        return {
          title: 'Awaiting Signature',
          description: 'Please confirm the transaction in your wallet',
          icon: '✍️',
          color: '#60a5fa'
        };
      case 'submitting':
        return {
          title: 'Submitting to Network',
          description: 'Broadcasting transaction to Solana network...',
          icon: '📡',
          color: '#34d399'
        };
      case 'confirming':
        return {
          title: 'Confirming Transaction',
          description: 'Waiting for network confirmation...',
          icon: '⏳',
          color: '#f59e0b'
        };
      case 'fee_processing':
        return {
          title: 'Processing Platform Fee',
          description: 'Sending platform fee transaction...',
          icon: '💰',
          color: '#ff6b35'
        };
      case 'success':
        return {
          title: 'Trade Successful!',
          description: 'Your transaction has been completed successfully',
          icon: '✅',
          color: '#10b981'
        };
      case 'error':
        return {
          title: 'Transaction Failed',
          description: error || 'An error occurred during the transaction',
          icon: '❌',
          color: '#ef4444'
        };
      default:
        return {
          title: 'Processing...',
          description: 'Please wait...',
          icon: '⏳',
          color: '#6b7280'
        };
    }
  };

  const stageInfo = getStageInfo();

  if (!isOpen) return null;

  return (
    <div className="transaction-modal-overlay">
      <div className="transaction-modal">
        {/* Header */}
        <div className="transaction-header">
          <div className="transaction-icon" style={{ color: stageInfo.color }}>
            {stageInfo.icon}
          </div>
          <div className="transaction-title-section">
            <h2 className="transaction-title">{stageInfo.title}</h2>
            <p className="transaction-description">{stageInfo.description}</p>
          </div>
          <div className="transaction-timer">
            {formatTime(elapsedTime)}
          </div>
        </div>

        {/* Coin Info */}
        {coin && (
          <div className="transaction-coin-info">
            <img 
              src={coin.image || coin.profilePic} 
              alt={coin.name}
              className="transaction-coin-icon"
            />
            <div className="transaction-coin-details">
              <span className="transaction-coin-name">{coin.name}</span>
              <span className="transaction-coin-symbol">{coin.symbol}</span>
            </div>
          </div>
        )}

        {/* Transaction List */}
        {transactions.length > 0 && (
          <div className="transaction-list">
            <div className="transaction-list-header">
              <span>Transactions</span>
              <button 
                className="expand-button"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            
            {transactions.map((tx, index) => (
              <div key={index} className="transaction-item">
                <div className="transaction-item-header">
                  <span className="transaction-type">{tx.type}</span>
                  <span className={`transaction-status ${tx.status}`}>
                    {tx.status === 'pending' && '⏳'}
                    {tx.status === 'confirmed' && '✅'}
                    {tx.status === 'failed' && '❌'}
                    {tx.status === 'submitted' && '📡'}
                    {tx.status}
                  </span>
                </div>
                
                {tx.signature && (
                  <div className="transaction-signature">
                    <span className="signature-label">Signature:</span>
                    <div className="signature-container">
                      <span className="signature-text">
                        {isExpanded 
                          ? tx.signature 
                          : `${tx.signature.slice(0, 8)}...${tx.signature.slice(-8)}`
                        }
                      </span>
                      <div className="signature-actions">
                        <button 
                          className="copy-button"
                          onClick={() => navigator.clipboard.writeText(tx.signature)}
                        >
                          📋
                        </button>
                        <a 
                          href={`https://solscan.io/tx/${tx.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="solscan-link"
                        >
                          🔍
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {tx.amount && (
                  <div className="transaction-amount">
                    Amount: {tx.amount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="transaction-progress">
          <div className="progress-steps">
            <div className={`progress-step ${['preparing', 'signing', 'submitting', 'confirming', 'fee_processing', 'success'].includes(stage) ? 'active' : ''}`}>
              <div className="step-circle">1</div>
              <span>Prepare</span>
            </div>
            <div className={`progress-step ${['signing', 'submitting', 'confirming', 'fee_processing', 'success'].includes(stage) ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <span>Sign</span>
            </div>
            <div className={`progress-step ${['submitting', 'confirming', 'fee_processing', 'success'].includes(stage) ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <span>Submit</span>
            </div>
            <div className={`progress-step ${['confirming', 'fee_processing', 'success'].includes(stage) ? 'active' : ''}`}>
              <div className="step-circle">4</div>
              <span>Confirm</span>
            </div>
            <div className={`progress-step ${['success'].includes(stage) ? 'active' : ''}`}>
              <div className="step-circle">5</div>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {/* Warning for long transactions */}
        {elapsedTime > 30 && stage !== 'success' && stage !== 'error' && (
          <div className="transaction-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Transaction is taking longer than usual</strong>
              <p>
                This is normal during high network congestion. Your transaction is still processing.
                You can safely close this window and check the transaction status on Solscan.
              </p>
            </div>
          </div>
        )}

        {/* Error Details */}
        {stage === 'error' && error && (
          <div className="transaction-error">
            <h4>Error Details:</h4>
            <p>{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="transaction-actions">
          {stage === 'success' && (
            <button className="action-button success" onClick={onClose}>
              Continue Trading
            </button>
          )}
          
          {stage === 'error' && (
            <>
              <button className="action-button secondary" onClick={onClose}>
                Close
              </button>
              <button className="action-button primary" onClick={() => window.location.reload()}>
                Try Again
              </button>
            </>
          )}
          
          {!['success', 'error'].includes(stage) && elapsedTime > 15 && (
            <button className="action-button secondary" onClick={onClose}>
              Close (Keep Processing)
            </button>
          )}
        </div>

        {/* Quick Links */}
        {transactions.some(tx => tx.signature) && (
          <div className="quick-links">
            <h4>Quick Links:</h4>
            <div className="links-grid">
              <a href="https://solscan.io" target="_blank" rel="noopener noreferrer">
                📊 Solscan Explorer
              </a>
              <a href="https://status.solana.com" target="_blank" rel="noopener noreferrer">
                🔍 Network Status
              </a>
              {coin?.tokenAddress && (
                <a 
                  href={`https://solscan.io/token/${coin.tokenAddress}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  🪙 {coin.symbol} Token
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionStatusModal;
