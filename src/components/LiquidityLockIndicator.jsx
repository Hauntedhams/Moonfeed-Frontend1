import React from 'react';
import './LiquidityLockIndicator.css';

const LiquidityLockIndicator = ({ 
  coin, 
  size = 'small', 
  showText = false,
  className = '' 
}) => {
  // Extract liquidity lock data from coin
  const isLocked = coin?.liquidityLocked || false;
  const lockPercentage = coin?.lockPercentage || 0;
  const burnPercentage = coin?.burnPercentage || 0;
  const rugcheckVerified = coin?.rugcheckVerified || false;
  const riskLevel = coin?.riskLevel;
  const isHoneypot = coin?.isHoneypot || false;

  // Determine the display status
  const getStatus = () => {
    if (isHoneypot) {
      return {
        icon: '⚠️',
        text: 'Honeypot',
        className: 'honeypot',
        color: '#ff4444'
      };
    }
    
    if (isLocked) {
      if (lockPercentage >= 90 || burnPercentage >= 90) {
        return {
          icon: '🔒',
          text: `${Math.max(lockPercentage, burnPercentage)}% Locked`,
          className: 'locked-high',
          color: '#00ff88'
        };
      } else if (lockPercentage >= 50 || burnPercentage >= 50) {
        return {
          icon: '🔐',
          text: `${Math.max(lockPercentage, burnPercentage)}% Locked`,
          className: 'locked-medium',
          color: '#ffaa00'
        };
      } else {
        return {
          icon: '🔓',
          text: `${Math.max(lockPercentage, burnPercentage)}% Locked`,
          className: 'locked-low',
          color: '#ff6600'
        };
      }
    }
    
    if (rugcheckVerified) {
      return {
        icon: '🔓',
        text: 'Unlocked',
        className: 'unlocked',
        color: '#ff4444'
      };
    }
    
    return {
      icon: '❓',
      text: 'Unknown',
      className: 'unknown',
      color: '#888888'
    };
  };

  const status = getStatus();

  // Create tooltip text
  const getTooltipText = () => {
    if (!rugcheckVerified) {
      return 'Liquidity lock status not verified';
    }
    
    let tooltip = `Liquidity: ${isLocked ? 'Locked' : 'Unlocked'}`;
    
    if (lockPercentage > 0) {
      tooltip += `\nLocked: ${lockPercentage}%`;
    }
    
    if (burnPercentage > 0) {
      tooltip += `\nBurned: ${burnPercentage}%`;
    }
    
    if (riskLevel) {
      tooltip += `\nRisk Level: ${riskLevel}`;
    }
    
    if (coin?.rugcheckScore) {
      tooltip += `\nRugcheck Score: ${coin.rugcheckScore}`;
    }
    
    return tooltip;
  };

  return (
    <div 
      className={`liquidity-lock-indicator ${status.className} ${size} ${className}`}
      title={getTooltipText()}
      style={{ '--indicator-color': status.color }}
    >
      <span className="lock-icon" style={{ fontSize: size === 'large' ? '18px' : '14px' }}>
        {status.icon}
      </span>
      {showText && (
        <span className="lock-text">
          {status.text}
        </span>
      )}
      {rugcheckVerified && (
        <div className="verification-badge" title="Verified by Rugcheck">
          ✓
        </div>
      )}
    </div>
  );
};

export default LiquidityLockIndicator;
