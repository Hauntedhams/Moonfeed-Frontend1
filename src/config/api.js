// API Configuration
// Automatically detects environment and sets appropriate API base URL

const getApiBaseUrl = () => {
  // Check for Vite environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // For production, use the working backend
  return 'https://api.moonfeed.app';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  COINS_API: `${getApiBaseUrl()}/api/coins`,
  ENDPOINTS: {
    TRENDING: '/trending',
    FAST: '/fast',
    FILTERED: '/filtered',
    ENRICH: '/enrich',
    BACKGROUND_ENRICH: '/background-enrich',
    FORCE_ENRICH: '/force-enrich',
    CURATED: '/curated',
    JUPITER_TRENDING: '/jupiter-trending'
  }
};

export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.COINS_API}${endpoint}`;
};

export const getFullApiUrl = (path) => {
  return `${API_CONFIG.BASE_URL}${path}`;
};

console.log('🌐 API Config initialized:', {
  environment: window.location.hostname === 'localhost' ? 'development' : 'production',
  baseUrl: API_CONFIG.BASE_URL,
  coinsApi: API_CONFIG.COINS_API
});
