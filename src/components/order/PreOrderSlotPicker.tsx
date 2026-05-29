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
      {variant === 'full' && (
        <div>
          <h3 className="font-bold text-base text-[var(--color-text)]">
            {t('preorder.title', 'When would you like your order?')}
          </h3>
          {!currentlyOpen && (
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {t(
                'preorder.closed_subtitle',
                "We're currently closed. Pick a time below to schedule your order.",
              )}
            </p>
          )}
        </div>
      )}

      {/* ASAP option — hidden entirely in compact mode (the cart panel already
          has its own ASAP CTA when the store is open). */}
      {!hideAsap && variant === 'full' && (
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${
            mode === 'asap'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'
          } ${asapDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={
            asapDisabled
              ? t('preorder.asap_disabled_tooltip', 'Restaurant is currently closed — pick a time')
              : undefined
          }
        >
          <input
            type="radio"
            name="preorder-mode"
            checked={mode === 'asap'}
            onChange={handleAsapClick}
            disabled={asapDisabled}
            className="mt-0.5 accent-[var(--color-accent)]"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--color-text)]">
              {t('preorder.asap', 'As soon as possible')}
            </p>
            {asapDisabled && (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {t('preorder.asap_disabled', 'Restaurant is currently closed — pick a time below.')}
              </p>
            )}
          </div>
        </label>
      )}

      {/* "Order for later" row — only the day/time selects in compact mode */}
      {variant === 'full' && !hideAsap && (
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${
            mode === 'later'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'
          } ${empty ? 'opacity-60' : 'cursor-pointer'}`}
        >
          <input
            type="radio"
            name="preorder-mode"
            checked={mode === 'later'}
            onChange={() => setMode('later')}
            disabled={empty}
            className="mt-0.5 accent-[var(--color-accent)]"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--color-text)]">
              {t('preorder.schedule', 'Order for later')}
            </p>
            {!empty && (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {t('preorder.schedule_sub', 'Pick a date and time below.')}
              </p>
            )}
          </div>
        </label>
      )}

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

      {/* Day + Time selects. Disabled when there are no slots. */}
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
    </div>
  );
}
