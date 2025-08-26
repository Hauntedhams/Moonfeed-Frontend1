import React, { useState, useEffect } from 'react';
import './DarkModeToggle.css';

function DarkModeToggle() {
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Toggle dark mode and persist
  const handleToggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      // Update document body class
      if (newMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      return newMode;
    });
  };

  // Ensure body class matches state on mount
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  return (
    <div className="dark-mode-toggle-container">
      <button 
        className={`dark-mode-toggle ${darkMode ? 'dark' : 'light'}`}
        onClick={handleToggleDarkMode}
        title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
      >
        <div className="toggle-track">
          <div className="toggle-thumb">
            <div className="toggle-icon">
              {darkMode ? (
                // Moon icon for dark mode
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 12.5A7 7 0 0 1 7.5 3a7 7 0 1 0 9.5 9.5z" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
                </svg>
              ) : (
                // Sun icon for light mode
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 15.07l1.41-1.41M15.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

export default DarkModeToggle;
