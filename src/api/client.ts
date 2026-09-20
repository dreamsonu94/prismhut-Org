import axios from 'axios';

// Normalizes API base URL to ensure clean handling of both relative paths and absolute domains
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }

  // If in browser and running on Vercel deployment (or preview)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // On Vercel, the static React app must communicate with the Render backend
    if (host.includes('vercel.app') || host.includes('prismhut')) {
      return 'https://prismhut-org.onrender.com/api/v1';
    }
  }

  // In production builds where no VITE_API_BASE_URL was provided, target the production Render backend
  if (import.meta.env.PROD) {
    return 'https://prismhut-org.onrender.com/api/v1';
  }

  return '/api/v1';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized and not already on login page, remove stale credentials
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
      }
    }
    return Promise.reject(error);
  }
);
