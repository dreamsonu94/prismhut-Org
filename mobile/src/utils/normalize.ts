/**
 * Safe array and data normalization utilities for Mobile Client
 * Ensures that API responses, Socket.IO event payloads, and cached data
 * are always transformed into strictly typed, non-null, non-undefined arrays.
 */

export function extractArray<T = any>(input: unknown, preferredKey?: string): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as T[];

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, any>;

    // 1. Check preferred key on top level
    if (preferredKey && Array.isArray(obj[preferredKey])) {
      return obj[preferredKey] as T[];
    }

    // 2. Check obj.data
    if (Array.isArray(obj.data)) {
      return obj.data as T[];
    }
    if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
      if (preferredKey && Array.isArray(obj.data[preferredKey])) {
        return obj.data[preferredKey] as T[];
      }
      if (Array.isArray(obj.data.tables)) return obj.data.tables as T[];
      if (Array.isArray(obj.data.orders)) return obj.data.orders as T[];
      if (Array.isArray(obj.data.items)) return obj.data.items as T[];
      if (Array.isArray(obj.data.categories)) return obj.data.categories as T[];
      if (Array.isArray(obj.data.sections)) return obj.data.sections as T[];
      if (Array.isArray(obj.data.invoices)) return obj.data.invoices as T[];
      if (Array.isArray(obj.data.data)) return obj.data.data as T[];
    }

    // 3. Check common known top-level keys
    if (Array.isArray(obj.tables)) return obj.tables as T[];
    if (Array.isArray(obj.orders)) return obj.orders as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.categories)) return obj.categories as T[];
    if (Array.isArray(obj.sections)) return obj.sections as T[];
    if (Array.isArray(obj.invoices)) return obj.invoices as T[];
  }

  return [];
}
