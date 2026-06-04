import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getPreOrderSlots, type PreOrderSlot, type PreOrderSlotsResponse } from '@/actions/store';
import { formatApiError } from '@/lib/apiError';

type Props = {
  storeSlug: string;
  orderType: 'delivery' | 'pickup';
  value: string | null;
  onChange: (iso: string | null) => void;
  /** When true, "As soon as possible" radio is hidden (e.g. when the store is closed and ASAP isn't valid anyway). */
  hideAsap?: boolean;
  /** Visual variant: 'full' is the boxed picker on CheckoutPage; 'compact' is the inline cart-panel version. */
  variant?: 'full' | 'compact';
};

// Group slots by their YYYY-MM-DD (local) so we can render a Day select and
// a Time select. The backend already returns ISO strings with a timezone
// offset; we just split on the local-clock date.
function groupSlots(slots: PreOrderSlot[]): Record<string, PreOrderSlot[]> {
  const groups: Record<string, PreOrderSlot[]> = {};
  for (const slot of slots) {
    const d = new Date(slot.start);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    (groups[key] ||= []).push(slot);
  }
  return groups;
}

function formatDayLabel(key: string, locale: string, t: (k: string, def: string) => string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return t('preorder.today', 'Today');
  if (diffDays === 1) return t('preorder.tomorrow', 'Tomorrow');
  try {
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
  } catch {
    return key;
  }
}

// Short pill-friendly day label: "Vandaag" / "Morgen" / "Wo 25" — the
// horizontal scroll row in the 'full' variant needs each pill to stay
// narrow enough that ~3 pills fit on a phone width without scrolling
// every time. We keep the long label (above) for the cart-panel summary.
function formatDayPill(key: string, locale: string, t: (k: string, def: string) => string): { primary: string; secondary?: string } {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return { primary: t('preorder.today', 'Today') };
  if (diffDays === 1) return { primary: t('preorder.tomorrow', 'Tomorrow') };
  try {
    const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
    const dayNum = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return { primary: weekday, secondary: dayNum };
  } catch {
    return { primary: key };
  }
}

// "HH:MM" of the slot's start time. Backend may return either ISO or a
// pre-formatted label; we prefer parsing the ISO so the locale formatter
// keeps i18n consistent (24h vs 12h).
function formatSlotTime(slot: PreOrderSlot, locale: string): string {
  const d = new Date(slot.start);
  if (Number.isNaN(d.getTime())) return slot.label || '';
  try {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return slot.label || '';
  }
}

export default function PreOrderSlotPicker({
  storeSlug,
  orderType,
  value,
  onChange,
  hideAsap = false,
  variant = 'full',
}: Props) {
  const { t, i18n } = useTranslation();

  const { data, isLoading, error, refetch } = useQuery<PreOrderSlotsResponse>({
    queryKey: ['preorder-slots', storeSlug, orderType],
    queryFn: () => getPreOrderSlots(storeSlug, orderType, 7),
    // Slot availability shifts in real time (lead time clock, operator pausing
    // pre-orders). We refetch in the background every two minutes so the
    // dropdowns reflect what the backend would currently accept.
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const slots = data?.slots ?? [];
  const grouped = useMemo(() => groupSlots(slots), [slots]);
  const dayKeys = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // Local selection state. We resolve back to value (iso) through onChange,
  // but we also need to mirror the iso onto the two selects when the parent
  // controls the value (e.g. picker re-opens with a previously chosen slot).
  const [mode, setMode] = useState<'asap' | 'later'>(value ? 'later' : 'asap');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  // Whenever an incoming `value` matches one of the slots, prefill the selects
  // so the customer sees their previous choice highlighted. If a stored slot
  // is no longer in the fresh list, we surface a hint and reset.
  const staleHintShown = useRef(false);
  useEffect(() => {
    if (!data) return;
    if (!value) {
      // Parent cleared the slot. Reset visible selects so we don't show a
      // stale day/time pair when the customer reopens the picker.
      setSelectedDay('');
      setSelectedSlot('');
      setMode('asap');
      return;
    }
    const match = slots.find(s => s.start === value);
    if (match) {
      const d = new Date(match.start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setSelectedDay(key);
      setSelectedSlot(match.start);
      setMode('later');
      staleHintShown.current = false;
    } else {
      // The previously chosen slot is no longer available — clear it so the
      // checkout flow can't submit a dead time. The hint below uses
      // staleHintShown to render once until the customer picks a new slot.
      staleHintShown.current = true;
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const currentlyOpen = !!data?.currently_open;
  const detail = data?.detail;
  const hasSlots = slots.length > 0;
  const empty = !!data && !hasSlots;

  // ASAP is only meaningful when the channel is currently open. When closed,
  // we want the picker to be the only path forward.
  const asapDisabled = !currentlyOpen;

  const handleAsapClick = () => {
    if (asapDisabled) return;
    setMode('asap');
    // Clear local day/slot too — the data-sync useEffect only reacts to
    // fresh server data, not to `value` going from a slot to null. Without
    // this the day pill + time pill stay visually highlighted even though
    // the parent's draft is back to ASAP.
    setSelectedDay('');
    setSelectedSlot('');
    onChange(null);
  };

  const handleDayChange = (key: string) => {
    setSelectedDay(key);
    setSelectedSlot('');
    onChange(null); // wait until the time is also picked
  };

  const handleSlotChange = (iso: string) => {
    setSelectedSlot(iso);
    onChange(iso);
    setMode('later');
  };

  if (isLoading) {
    return (
      <div className={variant === 'compact' ? 'p-3' : 'p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'}>
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <span className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span>{t('preorder.loading', 'Loading available times…')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${variant === 'compact' ? 'p-3' : 'p-5 rounded-2xl border'} border-red-500/30 bg-red-500/10 text-sm text-red-600 dark:text-red-300`}>
        <p className="font-semibold">
          {formatApiError(error, t('preorder.load_error', 'Could not load available times.'))}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-xs font-bold underline hover:no-underline"
        >
          {t('preorder.retry', 'Try again')}
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        variant === 'compact'
          ? 'space-y-3'
          : 'p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4'
      }
    >
      {/* Empty-state message: the operator disabled pre-orders or no slots fall
          within the configured window. Trust `detail` from the server. */}
      {empty && detail && (
        <p className="text-sm font-medium text-red-600 dark:text-red-300">
          {detail}
        </p>
      )}

      {/* Stale slot hint — shown once when a previously-stored ISO is no
          longer in the fresh list (e.g. browser-cached desired_time from
          yesterday). The useEffect clears it from parent state. */}
      {staleHintShown.current && !value && (
        <p className="text-xs text-orange-600 dark:text-orange-300">
          {t(
            'preorder.stale_hint',
            'Your previous time is no longer available, pick a new one.',
          )}
        </p>
      )}

      {variant === 'full' ? (
        <>
          {/* ASAP big tile — one tap commits to "right now". Hidden when the
              modal is in required mode (closed channel) or the caller asked
              to hide it. Disabled-with-hint when channel is currently closed
              so the customer immediately understands why scheduling is the
              only path. */}
          {!hideAsap && (
            <button
              type="button"
              onClick={handleAsapClick}
              disabled={asapDisabled}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                mode === 'asap'
                  ? 'border-[var(--color-text)] bg-[var(--color-text)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-text)]/40'
              } ${asapDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-2xl shrink-0" aria-hidden>⚡</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[var(--color-text)]">
                  {t('preorder.asap', 'As soon as possible')}
                </span>
                {asapDisabled && (
                  <span className="block text-xs text-[var(--color-muted)] mt-0.5">
                    {t('preorder.asap_disabled', 'Restaurant is currently closed — pick a time below.')}
                  </span>
                )}
              </span>
              {mode === 'asap' && !asapDisabled && (
                <svg className="w-5 h-5 text-[var(--color-text)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          )}

          {/* "Plan vooruit" divider — only when ASAP tile is above it. */}
          {!hideAsap && !empty && (
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              <span className="h-px flex-1 bg-[var(--color-border)]" />
              <span>{t('preorder.or_schedule', 'Or schedule')}</span>
              <span className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
          )}

          {/* Day pills — horizontal scroll. Pick one to reveal the time grid. */}
          {!empty && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-2">
                {t('preorder.date', 'Date')}
              </p>
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide snap-x">
                {dayKeys.map(key => {
                  const label = formatDayPill(key, i18n.language, (k, def) => t(k, def));
                  const active = selectedDay === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDayChange(key)}
                      className={`shrink-0 snap-start min-w-[88px] px-3 py-2 rounded-xl border-2 transition-colors text-center capitalize ${
                        active
                          ? 'border-[var(--color-text)] bg-[var(--color-text)]/5 text-[var(--color-text)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] hover:border-[var(--color-text)]/40'
                      }`}
                    >
                      <span className="block text-sm font-bold leading-tight">{label.primary}</span>
                      {label.secondary && (
                        <span className="block text-xs text-[var(--color-muted)] mt-0.5">{label.secondary}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time grid — appears once a day is picked. Hides entirely until
              then so the picker doesn't dangle an empty grid. */}
          {!empty && selectedDay && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-2">
                {t('preorder.time', 'Time')}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(grouped[selectedDay] || []).map(slot => {
                  const active = selectedSlot === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => handleSlotChange(slot.start)}
                      className={`px-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors tabular-nums ${
                        active
                          ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] hover:border-[var(--color-text)]/40'
                      }`}
                    >
                      {formatSlotTime(slot, i18n.language)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hint when no day is picked yet (and ASAP not applicable) so the
              customer knows why no time grid is visible. */}
          {!empty && !selectedDay && hideAsap && (
            <p className="text-sm text-[var(--color-muted)]">
              {t('preorder.pick_day_first', 'Pick a day first')}
            </p>
          )}
        </>
      ) : (
        // Compact variant — keep the legacy two-select layout for the
        // cart-sidebar where the picker has to live in a narrow column.
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${empty ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block">
            <span className="block text-xs font-semibold text-[var(--color-muted)] mb-1.5">
              {t('preorder.date', 'Date')}
            </span>
            <select
              value={selectedDay}
              onChange={e => handleDayChange(e.target.value)}
              disabled={empty}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none text-base bg-[var(--color-surface)] text-[var(--color-text)] transition-colors disabled:cursor-not-allowed"
            >
              <option value="">
                {t('preorder.pick_day', 'Choose a day…')}
              </option>
              {dayKeys.map(key => (
                <option key={key} value={key}>
                  {formatDayLabel(key, i18n.language, (k, def) => t(k, def))}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-[var(--color-muted)] mb-1.5">
              {t('preorder.time', 'Time')}
            </span>
            <select
              value={selectedSlot}
              onChange={e => handleSlotChange(e.target.value)}
              disabled={empty || !selectedDay}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none text-base bg-[var(--color-surface)] text-[var(--color-text)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {selectedDay
                  ? t('preorder.pick_time', 'Choose a time…')
                  : t('preorder.pick_day_first', 'Pick a day first')}
              </option>
              {selectedDay &&
                (grouped[selectedDay] || []).map(slot => (
                  <option key={slot.start} value={slot.start}>
                    {slot.label}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
