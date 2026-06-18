/**
 * Normalize a DRF / axios error into a human-readable string.
 *
 * The server can return any of:
 *   { detail: "string" }                                — single message
 *   { detail: ["msg1", "msg2"] }                        — DRF non-field errors
 *   { location: "msg", payment_method: ["msg"], ... }   — field-keyed errors
 *
 * We want the customer to see *the actual* reason on the CheckoutPage, not a
 * generic "something went wrong" toast. Field-keyed messages come first (they
 * point to a specific input), then `detail` as the catch-all.
 */

function flatten(value: unknown): string {
  if (Array.isArray(value)) return value.map(v => flatten(v)).filter(Boolean).join(' ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return Object.values(value).map(v => flatten(v)).filter(Boolean).join(' ');
  }
  if (value == null) return '';
  return String(value);
}

export function formatApiError(
  err: unknown,
  fallback: string,
  // Optional translator. When supplied, every line of the server's reply
  // is run through translateApiBlob so known English DRF messages
  // ("Delivery is not available in your area.", "Minimum order value is
  // X EUR.", …) come out in the customer's chosen language. Unknown
  // messages are returned unchanged so we never blank the customer.
  t?: (key: string, options?: any) => string,
): string {
  const raw = formatRawApiError(err, fallback);
  if (!t || !raw) return raw;
  // Lazy-require to keep the existing pure-string callers (e.g. tests)
  // from pulling i18n machinery into their bundles.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {translateApiBlob} = require('./apiErrorTranslate') as typeof import('./apiErrorTranslate');
  return translateApiBlob(raw, t);
}

function formatRawApiError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } } | undefined)?.response?.data;

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const fieldKeys = Object.keys(obj).filter(k => k !== 'detail' && k !== 'paused_until');

    const parts: string[] = [];
    for (const key of fieldKeys) {
      const msg = flatten(obj[key]);
      if (msg) parts.push(msg);
    }
    const detailMsg = flatten(obj.detail);
    if (detailMsg) parts.push(detailMsg);

    if (parts.length) return parts.join('\n');
  }

  if (typeof data === 'string' && data.trim()) return data;

  const msg = (err as { message?: string } | undefined)?.message;
  return msg || fallback;
}
