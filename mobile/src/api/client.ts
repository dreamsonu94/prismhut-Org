/**
 * Mobile HTTP API Client
 * Connects exclusively to the production Render backend over HTTPS.
 * Enforces JWT Authorization, Idempotency-Key handling, and standardized error parsing.
 */
import { API_BASE_URL, APP_CONFIG } from '../constants/config';
import { tokenStorage } from '../storage/tokenStorage';
import { ApiResponse } from '../types';

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { idempotencyKey, params, timeoutMs = APP_CONFIG.apiTimeoutMs, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const query = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }

  const token = await tokenStorage.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customConfig.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['x-idempotency-key'] = idempotencyKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized globally
    if (response.status === 401) {
      await tokenStorage.clearAll();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Your session has expired. Please log in again.',
        },
      };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data?.error?.code || `HTTP_${response.status}`,
          message: data?.error?.message || response.statusText || 'Request failed',
        },
      };
    }

    return data as ApiResponse<T>;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'The server took too long to respond. Please check connection.',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Cannot reach the restaurant server. Check your Wi-Fi.',
      },
    };
  }
}
