// Tablets sit on a table while the kitchen flips between busy and quiet.
// `is_paused` is server-computed (paused_until > now in store-local time),
// so we don't have to re-derive the rule client-side or worry about clock
// drift on the tablet. Falls back to the `paused_until` string if the
// server happens to be older than the migration that exposed the field.
export type DineInPauseState = {
  paused: boolean;
  reason: string;
  /** When the pause auto-resumes (Date) — null if no pause active. */
  pausedUntil: Date | null;
};

export function getDineInPause(company: any): DineInPauseState {
  const menu = company?.menu_settings ?? {};
  const reason = typeof menu.pause_reason === 'string' ? menu.pause_reason : '';
  const untilRaw = menu.paused_until ?? null;
  let until: Date | null = null;
  if (untilRaw) {
    const d = new Date(untilRaw);
    if (!isNaN(d.getTime())) until = d;
  }
  // Trust `is_paused` first; fall back to the timestamp compare for older
  // servers that haven't shipped the computed field yet.
  const paused = typeof menu.is_paused === 'boolean'
    ? menu.is_paused
    : !!(until && until.getTime() > Date.now());
  return { paused, reason, pausedUntil: until };
}
