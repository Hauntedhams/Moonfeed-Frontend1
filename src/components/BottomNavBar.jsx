import React, { useState } from 'react';
import './BottomNavBar.css';

function BottomNavBar({ activeTab, setActiveTab, onSearchClick }) {

  return (
    <nav className="bottom-nav">
      <button className={`nav-btn${activeTab === 'home' ? ' active' : ''}`} onClick={() => setActiveTab('home')}>
        <span className="nav-icon">
          {/* Home icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5L10 4L17 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 17V10.5H15V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        <span className="nav-label">Home</span>
      </button>
      {/* Search button */}
      <button className="nav-btn" onClick={onSearchClick} title="Search coin by address">
        <span className="nav-icon">
          {/* Search icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="nav-label">Search</span>
      </button>
      <button className={`nav-btn nav-btn-trade${activeTab === 'trade' ? ' active' : ''}`} onClick={() => setActiveTab('trade')}>
        <span className="nav-icon">
          {/* Trade/Swap icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        <span className="nav-label">Trade</span>
      </button>
      <button className={`nav-btn${activeTab === 'favorites' ? ' active' : ''}`} onClick={() => setActiveTab('favorites')}>
        <span className="nav-icon">
          {/* Star/Favorite icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L12.4721 7.94454L17.9445 8.52786L13.9722 12.0555L15.2361 17.4721L10 14.5L4.76393 17.4721L6.02778 12.0555L2.05548 8.52786L7.52786 7.94454L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </span>
        <span className="nav-label">Favorites</span>
      </button>
      <button className="nav-btn nav-btn-profile" onClick={() => setActiveTab('profile')}>
        <span className="nav-icon">
          {/* User/Profile icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </span>
        <span className="nav-label">Profile</span>
      </button>
    </nav>
  );
}

export default BottomNavBar;
