import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PreOrderSlotPicker from '@/components/order/PreOrderSlotPicker';

export interface PreOrderSlotModalProps {
  open: boolean;
  onClose: () => void;
  orderType: 'delivery' | 'pickup';
  storeSlug: string;
  /**
   * When true, the modal hides its close affordances (no X, no backdrop-close,
   * no Escape) — the customer must either pick a slot or change channel.
   */
  required?: boolean;
  /**
   * Currently committed slot ISO (or null for ASAP). The modal mirrors this
   * value into its internal "draft" so the user can cancel without losing it.
   */
  value: string | null;
  /**
   * Called with the new slot ISO when the user clicks Confirm. The parent is
   * responsible for closing the modal afterwards (we do call `onClose` for
   * convenience, but the parent owns the open/closed flag).
   */
  onChange: (iso: string | null) => void;
}

/**
 * PreOrderSlotModal wraps PreOrderSlotPicker in a centered modal overlay.
 *
 * Why a modal instead of inline:
 *   The previous inline picker broke the cart-panel layout — its day/time
 *   selects ran the panel tall and competed with the totals + CTA for visual
 *   weight. Deliveroo / UberEats both use a modal for this exact step; the
 *   cart stays compact and the slot picker becomes a focused task.
 *
 * Design notes:
 *   - The picker itself remains the data layer (fetches /preorder-slots and
 *     owns the day/time grouping logic). This modal only adds the chrome:
 *     backdrop, headline, confirm/cancel buttons, and Escape/click-outside
 *     handling.
 *   - We hold a local `draft` so customers can poke at the selects without
 *     immediately mutating the parent's `desiredTime`. Confirm flushes the
 *     draft; backdrop-cancel discards it.
 *   - `required` is set when the store is closed for the chosen channel. In
 *     that mode we hide every "back out" path so the customer's options are
 *     "pick a slot" or "change channel" (handled outside).
 */
export default function PreOrderSlotModal({
  open,
  onClose,
  orderType,
  storeSlug,
  required = false,
  value,
  onChange,
}: PreOrderSlotModalProps) {
  const { t } = useTranslation();

  // Local draft so the user's picks don't mutate the parent until they
  // confirm. When the modal opens, seed from `value` so a previously picked
  // slot stays highlighted.
  const [draft, setDraft] = useState<string | null>(value);

  // Re-sync the draft whenever the modal is re-opened with a new value (e.g.
  // user closes, comes back later, parent now has a different desiredTime).
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  // Escape closes (unless required). Mirror the OptionModal pattern.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !required) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, required, onClose]);

  // Lock body scroll while the modal is open. Matches the rest of the
  // storefront so the menu page behind doesn't jiggle.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (required) return;
    onClose();
  };

  const handleConfirm = () => {
    // `null` is a valid pick — it means the customer toggled back to ASAP
    // via the picker's radio. We accept that and close.
    onChange(draft);
    onClose();
  };

  // The confirm button is disabled until the user has either picked a slot
  // (later mode) or — only when the store is open — left it on ASAP (null).
  // When `required`, ASAP isn't a valid option, so we demand a non-null draft.
  const confirmDisabled = required ? !draft : false;

  const title = required
    ? t('preorder.required_title', 'Schedule your order')
    : t('preorder.optional_title', 'Order time');
  const subtitle = required
    ? t(
        'preorder.required_subtitle',
        'The restaurant is currently closed. Pick a time within opening hours.',
      )
    : t(
        'preorder.optional_subtitle',
        'We will start your order right away unless you schedule it for later.',
      );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preorder-modal-title"
    >
      {/* Backdrop — blurred + dim. Click closes (when not required). */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]" />

      {/* Card */}
      <div
        className="relative z-10 w-full sm:w-auto sm:max-w-md sm:rounded-2xl rounded-t-2xl bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xl max-h-[90dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — title + close X (unless required) */}
        <div className="px-5 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            <h2
              id="preorder-modal-title"
              className="text-lg font-extrabold text-[var(--color-text)] leading-tight"
            >
              {title}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mt-1">{subtitle}</p>
          </div>
          {!required && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-9 h-9 -mt-1 -mr-1 rounded-full flex items-center justify-center text-xl text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
              aria-label={t('preorder.modal.close', 'Close')}
            >
              ×
            </button>
          )}
        </div>

        {/* Body — the existing picker, in "full" mode so the radios are visible. */}
        <div className="overflow-y-auto px-5 sm:px-6 py-4 flex-1">
          <PreOrderSlotPicker
            storeSlug={storeSlug}
            orderType={orderType}
            value={draft}
            onChange={setDraft}
            hideAsap={required}
            variant="full"
          />
        </div>

        {/* Footer — confirm button. Disabled while no slot is picked (when
            required); otherwise always clickable (ASAP is a valid pick). */}
        <div className="px-5 sm:px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] rounded-b-2xl sm:rounded-b-2xl flex items-center justify-end gap-2">
          {!required && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-11 rounded-xl text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            >
              {t('preorder.modal.close', 'Close')}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="px-5 h-11 rounded-xl text-sm font-bold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('preorder.confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
