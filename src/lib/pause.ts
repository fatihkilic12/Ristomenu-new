/**
 * Helpers for the per-channel "temporarily disable delivery/pickup" feature.
 *
 * The server (Django) populates `is_paused` on `delivery_settings` and
 * `pickup_settings` — it's a derived boolean computed against `paused_until`
 * and the current time. The client trusts that flag directly and never
 * re-runs the clock-compare locally (drifted device clocks would otherwise
 * cause flapping). `pause_reason` is operator-supplied free text.
 */

export type ChannelSettings = {
  open_for_order?: boolean;
  paused_until?: string | null;
  pause_reason?: string | null;
  is_paused?: boolean;
  [key: string]: unknown;
};

/** True when the server has flagged this channel as paused right now. */
export function isChannelPaused(channel?: ChannelSettings | null): boolean {
  return !!channel?.is_paused;
}

/**
 * Format `paused_until` as a short, locale-aware time string. If the pause
 * extends past today we include a date, otherwise just the time-of-day.
 * Returns `null` if the input is missing or unparseable.
 */
export function formatPauseUntil(value?: string | null, locale?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  try {
    return sameDay
      ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return date.toISOString();
  }
}

/**
 * Try to extract pause information from a 400 response body. The server
 * shape on a paused-channel rejection is `{ detail: <reason>, paused_until: <iso> }`.
 * Falls back to `null` when the body doesn't match.
 */
export function extractPauseFromError(err: unknown): { detail: string; pausedUntil: string | null } | null {
  const response = (err as { response?: { status?: number; data?: { detail?: unknown; paused_until?: unknown } } } | undefined)?.response;
  if (!response || response.status !== 400) return null;
  const data = response.data;
  if (!data) return null;
  const detail = Array.isArray(data.detail)
    ? data.detail.join(' ')
    : typeof data.detail === 'string' ? data.detail : '';
  if (!detail) return null;
  return { detail, pausedUntil: typeof data.paused_until === 'string' ? data.paused_until : null };
}
