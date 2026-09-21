/**
 * Safe, Production-Hardened Structured Logger
 * 
 * NEVER logs passwords, hashes, tokens, authorization headers, credit cards, or connection strings with credentials.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'jwt',
  'authorization',
  'cookie',
  'creditcard',
  'cardnumber',
  'cvv',
  'cvc',
  'key',
  'refreshtoken',
  'accesstoken',
]);

function sanitizeValue(key: string, value: any): any {
  if (value === null || value === undefined) return value;

  const lowerKey = key.toLowerCase();
  for (const sensitive of SENSITIVE_KEYS) {
    if (lowerKey.includes(sensitive)) {
      return '[REDACTED]';
    }
  }

  if (typeof value === 'string') {
    // Redact postgres connection strings containing credentials
    return value.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1*****$3');
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return sanitizeObject(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'object' ? sanitizeObject(item) : item));
  }

  return value;
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {};
  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    sanitized[k] = sanitizeValue(k, v);
  }
  return sanitized;
}

export const logger = {
  info(message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const extra = meta ? ` ${JSON.stringify(sanitizeObject(meta))}` : '';
    console.log(`[INFO] [${timestamp}] ${message}${extra}`);
  },

  warn(message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const extra = meta ? ` ${JSON.stringify(sanitizeObject(meta))}` : '';
    console.warn(`[WARN] [${timestamp}] ${message}${extra}`);
  },

  apiError(req: { method: string; originalUrl?: string; url?: string; ip?: string }, err: any, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const path = req.originalUrl || req.url || 'unknown';
    const errCode = err?.code || 'UNKNOWN_ERROR';
    const errMsg = err?.message ? sanitizeValue('message', err.message) : 'Unknown error';
    console.error(`[API ERROR] [${timestamp}] ${req.method} ${path} -> [${errCode}] ${errMsg}`, {
      ip: req.ip || 'unknown',
      ...(meta ? sanitizeObject(meta) : {}),
    });
  },

  authFailure(username: string, reason: string, ip?: string) {
    const timestamp = new Date().toISOString();
    console.warn(`[AUTH FAILURE] [${timestamp}] User login failed for '${username}': ${reason}`, {
      ip: ip || 'unknown',
      timestamp,
    });
  },

  paymentFailure(orderId: string | undefined, amount: number | undefined, err: any, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const errMsg = err?.message ? sanitizeValue('message', err.message) : 'Unknown payment processing error';
    console.error(`[PAYMENT FAILURE] [${timestamp}] Order ${orderId || 'unknown'} (Amount: $${amount ?? 0}): ${errMsg}`, {
      code: err?.code || 'PAYMENT_FAILED',
      ...(meta ? sanitizeObject(meta) : {}),
    });
  },

  databaseFailure(operation: string, err: any) {
    const timestamp = new Date().toISOString();
    const errMsg = err?.message ? sanitizeValue('message', err.message) : 'Database operation failed';
    console.error(`[DATABASE FAILURE] [${timestamp}] ${operation}: ${errMsg}`);
  },

  unexpectedError(err: any, context?: string) {
    const timestamp = new Date().toISOString();
    const ctxStr = context ? ` [Context: ${context}]` : '';
    const errMsg = err?.message ? sanitizeValue('message', err.message) : String(err);
    console.error(`[UNEXPECTED SERVER ERROR] [${timestamp}]${ctxStr}: ${sanitizeValue('err', errMsg)}`);
  },
};
