/**
 * Production-Safe Environment Configuration for Waiter Mobile App
 * No secrets or database credentials must ever exist here.
 */

// Expo public environment variables with fallback to verified production backend
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://prismhut-org.onrender.com/api/v1';

export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || 'https://prismhut-org.onrender.com';

export const APP_CONFIG = {
  appName: 'Restaurant Smart POS',
  appSubTitle: 'Waiter Terminal',
  version: '1.0.0',
  apiTimeoutMs: 15000,
  tokenStorageKey: 'smart_pos_waiter_jwt',
  userStorageKey: 'smart_pos_waiter_user',
  draftStorageKey: 'smart_pos_order_drafts',
};
