import React, { useState, useEffect, useRef } from 'react';
import './TopTabs.css';

const TopTabs = ({ activeFilter, onFilterChange }) => {
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const containerRef = useRef(null);

  const tabs = [
    { id: 'new', label: 'New', icon: 'sparkles' },
    { id: 'graduating', label: 'Graduating', icon: 'graduation-cap' },
    { id: 'trending', label: 'Trending', icon: 'fire' }
  ];

  const currentIndex = tabs.findIndex(tab => tab.id === activeFilter);

  // Icon component renderer
  const renderIcon = (iconName, isActive = false) => {
    const iconProps = {
      width: 16, // Reduced from 20 to 16 for smaller icons
      height: 16, // Reduced from 20 to 16 for smaller icons
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    };

    switch (iconName) {
      case 'sparkles':
        return (
          <svg {...iconProps}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/>
            <path d="M19 17v4"/>
            <path d="M3 5h4"/>
            <path d="M17 19h4"/>
          </svg>
        );
      case 'graduation-cap':
        return (
          <svg {...iconProps}>
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
            <path d="M22 10v6"/>
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
          </svg>
        );
      case 'fire':
        return (
          <svg {...iconProps}>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  // Create reordered tabs array to always put active tab in center position
  const getReorderedTabs = () => {
    if (currentIndex === 0) {
      // New is active: [graduating, new, trending]
      return [tabs[1], tabs[0], tabs[2]];
    } else if (currentIndex === 1) {
      // Graduating is active: [new, graduating, trending]
      return [tabs[0], tabs[1], tabs[2]];
    } else {
      // Trending is active: [new, trending, graduating]
      return [tabs[0], tabs[2], tabs[1]];
    }
  };

  const reorderedTabs = getReorderedTabs();

  // Handle touch events for swipe functionality
  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    // Circular order: new → trending → graduating → new → trending → graduating...
    const circularOrder = ['new', 'trending', 'graduating'];
    const currentCircularIndex = circularOrder.indexOf(activeFilter);
    
    if (isLeftSwipe) {
      // Swipe left - go to previous tab in circular order (reverse direction)
      const prevIndex = (currentCircularIndex - 1 + circularOrder.length) % circularOrder.length;
      onFilterChange({ type: circularOrder[prevIndex] });
    } else if (isRightSwipe) {
      // Swipe right - go to next tab in circular order (forward direction)
      const nextIndex = (currentCircularIndex + 1) % circularOrder.length;
      onFilterChange({ type: circularOrder[nextIndex] });
    }

    // Reset touch positions
    setTouchStartX(0);
    setTouchEndX(0);
  };

  // Add touch listeners to the entire viewport for global swipe detection
  useEffect(() => {
    const handleGlobalTouchStart = (e) => {
      setTouchStartX(e.touches[0].clientX);
    };

    const handleGlobalTouchMove = (e) => {
      setTouchEndX(e.touches[0].clientX);
    };

    const handleGlobalTouchEnd = () => {
      if (!touchStartX || !touchEndX) return;
      
      const distance = touchStartX - touchEndX;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      // Circular order: new → trending → graduating → new → trending → graduating...
      const circularOrder = ['new', 'trending', 'graduating'];
      const currentCircularIndex = circularOrder.indexOf(activeFilter);
      
      if (isLeftSwipe) {
        // Swipe left - go to previous tab in circular order (reverse direction)
        const prevIndex = (currentCircularIndex - 1 + circularOrder.length) % circularOrder.length;
        onFilterChange({ type: circularOrder[prevIndex] });
      } else if (isRightSwipe) {
        // Swipe right - go to next tab in circular order (forward direction)
        const nextIndex = (currentCircularIndex + 1) % circularOrder.length;
        onFilterChange({ type: circularOrder[nextIndex] });
      }

      setTouchStartX(0);
      setTouchEndX(0);
    };

    document.addEventListener('touchstart', handleGlobalTouchStart);
    document.addEventListener('touchmove', handleGlobalTouchMove);
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [touchStartX, touchEndX, activeFilter, onFilterChange]);

  return (
    <div className="top-tabs-container" ref={containerRef}>
      <div className="top-tabs-wrapper">
        {reorderedTabs.map((tab, index) => {
          const isActive = activeFilter === tab.id;
          const isCenter = index === 1; // Center position in reordered array
          
          // Visual styling based on position
          let opacity, scale, zIndex;
          
          if (isActive) {
            opacity = 1;
            scale = 1.1;
            zIndex = 10;
          } else if (isCenter) {
            opacity = 0.7;
            scale = 1;
            zIndex = 5;
          } else {
            opacity = 0.4;
            scale = 0.85;
            zIndex = 1;
          }
          
          return (
            <button
              key={tab.id}
              className={`top-tab ${isActive ? 'active' : ''} ${isCenter ? 'center' : ''}`}
              onClick={() => onFilterChange({ type: tab.id })}
              style={{
                opacity,
                transform: `scale(${scale})`,
                zIndex,
              }}
            >
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Progress indicator - removed since we have rotating design */}
    </div>
  );
};

export default TopTabs;
