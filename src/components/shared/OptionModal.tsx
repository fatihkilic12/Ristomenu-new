import { useState, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { EURO, ADD, EDIT, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { getBranding } from '@/lib/branding';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { getAllergenIcon, getAllergenLabel } from '@/lib/allergens';

type ModalState = {
  open: boolean;
  product: Record<string, any> | null;
  options: Record<string, any>[];
  mode: typeof ADD | typeof EDIT;
  item: Record<string, any> | null;
};

export type OptionModalRef = {
  openModal: (params: { product: Record<string, any>; options: Record<string, any>[]; mode: typeof ADD | typeof EDIT; item: any }) => void;
};

const OptionModal = forwardRef(function OptionModal(_props: {}, ref: Ref<OptionModalRef>) {
  const { addToCart, updateCart } = useCart();
  const { company } = useStoreConfig();
  // Recompute only when company changes, not on every quantity / option tap.
  const branding = useMemo(() => getBranding(company), [company]);
  const { t } = useTranslation();
  const [state, setState] = useState<ModalState>({ open: false, product: null, options: [], mode: ADD, item: null });
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<number, Record<number, number>>>({});
  const [note, setNote] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  useImperativeHandle(ref, () => ({
    openModal({ product, options, mode, item }) {
      setShowErrors(false);
      if (mode === EDIT && item) {
        setQuantity(item.quantity);
        setNote(item.note || '');
        const sel: Record<number, Record<number, number>> = {};
        if (item.options) {
          for (const [itemId, qty] of Object.entries(item.options)) {
            for (const opt of options) {
              const found = opt.items?.find((i: any) => i.id === Number(itemId));
              if (found) {
                if (!sel[opt.id]) sel[opt.id] = {};
                sel[opt.id][Number(itemId)] = qty as number;
                break;
              }
            }
          }
        }
        setSelected(sel);
      } else {
        setQuantity(1);
        setNote('');
        setSelected({});
      }
      setState({ open: true, product, options, mode, item });
    },
  }));

  const close = () => setState(s => ({ ...s, open: false }));

  // Hardware-back / browser-back closes the modal. Required for the
  // TabletMenuApp WebView — see useModalBackClose for the full story.
  useModalBackClose(state.open, close);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (state.open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [state.open]);

  const toggleOption = useCallback((groupId: number, itemId: number, group: Record<string, any>) => {
    setSelected(prev => {
      const groupSel = { ...(prev[groupId] || {}) };
      if (groupSel[itemId]) {
        delete groupSel[itemId];
      } else {
        // Single-choice (radio): replace whatever is selected
        if (group.max === 1 && !group.choose_multi) {
          return { ...prev, [groupId]: { [itemId]: 1 } };
        }
        // Multi-choice: respect max — don't allow exceeding it
        const max = group.max || Infinity;
        if (Object.keys(groupSel).length >= max) return prev;
        groupSel[itemId] = 1;
      }
      return { ...prev, [groupId]: groupSel };
    });
  }, []);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!state.product) return 0;
    let price = state.product.price || 0;
    for (const groupItems of Object.values(selected)) {
      for (const [itemId, qty] of Object.entries(groupItems)) {
        for (const group of state.options) {
          const opt = group.items?.find((i: any) => i.id === Number(itemId));
          if (opt?.price) { price += opt.price * (qty as number); break; }
        }
      }
    }
    return price * quantity;
  }, [state.product, state.options, selected, quantity]);

  // Find first unsatisfied required group; return its id or null
  const firstUnsatisfied = (): number | null => {
    for (const group of state.options) {
      const min = group.min || 0;
      if (min > 0 && Object.keys(selected[group.id] || {}).length < min) {
        return group.id;
      }
    }
    return null;
  };

  const handleConfirm = () => {
    if (!state.product) return;
    const missing = firstUnsatisfied();
    if (missing != null) {
      setShowErrors(true);
      const el = document.querySelector(`[data-option-group="${missing}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const flatOptions: Record<number, number> = {};
    for (const groupItems of Object.values(selected)) {
      for (const [itemId, qty] of Object.entries(groupItems)) {
        flatOptions[Number(itemId)] = qty as number;
      }
    }

    const cartItem = {
      product: state.product.id,
      product_data: state.product,
      options_data: state.options,
      quantity,
      note,
      options: flatOptions,
    };

    if (state.mode === EDIT && state.item) {
      updateCart(state.item.id, { ...state.item, ...cartItem, id: state.item.id });
    } else {
      addToCart(cartItem);
    }
    close();
  };

  // Keep the wrapper mounted after the first open so subsequent opens skip
  // the full React mount cost (image decode, option-group reconciliation,
  // useEffect setup). state.product stays set across closes — only state.open
  // toggles, which lets the CSS transition handle the animation.
  if (!state.product) return null;

  const { product, options, open } = state;
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const basePrice = product.price != null ? (product.price / 100).toFixed(2) : null;

  // Portal — see PreOrderSlotModal for the rationale. Without this the
  // modal renders inside the order-page menu tree, where it could end up
  // visually behind the sticky category-pill nav (which sits in its own
  // backdrop-filter stacking context). Rendering to body avoids that
  // entirely.
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-opacity duration-150 ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={close}
      aria-hidden={!open}
      data-option-scale={branding.title_size}
    >
      {/* Mirrors the [data-menu-scale] block in MenuView so the operator's
          "Algemene tekstgrootte" choice (small/medium/large) also drives
          the dine-in option modal — sizes, extras, helper copy. Operator
          feedback on tablets was that the radio rows were too small to
          read at "Klein"; baseline Tailwind sizes below were bumped a
          step and medium/large add proportional jumps from there. */}
      <style>{`
        [data-option-scale='medium'] [data-option-group-name]   { font-size: 17px; }
        [data-option-scale='medium'] [data-option-helper]       { font-size: 13px; }
        [data-option-scale='medium'] [data-option-required]     { font-size: 11px; }
        [data-option-scale='medium'] [data-option-name]         { font-size: 16px; }
        [data-option-scale='medium'] [data-option-price]        { font-size: 15px; }

        [data-option-scale='large']  [data-option-group-name]   { font-size: 19px; }
        [data-option-scale='large']  [data-option-helper]       { font-size: 15px; }
        [data-option-scale='large']  [data-option-required]     { font-size: 12px; }
        [data-option-scale='large']  [data-option-name]         { font-size: 18px; }
        [data-option-scale='large']  [data-option-price]        { font-size: 16px; }
      `}</style>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className={`relative z-10 w-full h-[100dvh] sm:h-auto sm:rounded-2xl sm:max-w-xl sm:max-h-[90dvh] flex flex-col bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xl transition-transform duration-150 ease-out ${
          open ? 'translate-y-0 sm:scale-100' : 'translate-y-4 sm:translate-y-0 sm:scale-95'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed back button - always visible. Inline SVG arrow rather
            than the `←` Unicode character — the latter renders as a
            tiny glyph in Android WebView's system font and the operator
            reported it was barely visible on the tablet. SVG honours
            the wrapping <button>'s sizing consistently across desktop
            Chrome, iOS Safari, and Android WebView. */}
        <button
          onClick={close}
          className="absolute top-4 left-4 z-20 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 shadow-lg"
          aria-label="Close"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* Product image */}
          {imgUrl ? (
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-[var(--color-surface-2)] overflow-hidden">
              <img src={imgUrl} alt="" decoding="async" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
              {(product.vegan || product.vegetarian) && (
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  {product.vegan && <span className="bg-green-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">VEGAN</span>}
                  {product.vegetarian && !product.vegan && <span className="bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">VEGGIE</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="h-14" /> /* spacer for back button when no image */
          )}

          {/* Sticky header */}
          <div className="sticky top-0 z-[1] bg-[var(--color-surface)] border-b border-[var(--color-border)] px-5 py-4">
            <div className="flex justify-between items-start gap-3">
              <h2 className="text-xl font-bold leading-tight capitalize">{product.name}</h2>
              {basePrice && <span className="text-lg font-bold text-[var(--color-text)] shrink-0">{EURO}{basePrice}</span>}
            </div>

            {product.description && (
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mt-1.5">{product.description}</p>
            )}

            {/* Allergens — icon + readable label.
                The old slug-only chip ("gluten") was hard to read on
                tablets (text-[10px] + dark:text-amber-300 fired in dark
                mode and dropped contrast to ~2.5:1). Now: 13px text,
                emoji icon for instant recognition, pinned to a dark
                amber tone that works on both OS themes. `title` keeps
                the full label hoverable for desktop tooltips. */}
            {branding.show_allergens && product.allergens?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {product.allergens.map((a: string) => {
                  const label = getAllergenLabel(a, t);
                  return (
                    <span
                      key={a}
                      title={label}
                      className="inline-flex items-center gap-1 text-[13px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30 font-medium"
                    >
                      <span aria-hidden>{getAllergenIcon(a)}</span>
                      <span>{label}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Alcohol badge */}
            {(product.is_hard_alcohol || product.is_soft_alcohol) && (
              <div className="mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30 font-bold">
                  {product.is_hard_alcohol ? '18+' : '16+'}
                </span>
              </div>
            )}
          </div>

          <div className="p-5">
            {/* The sticky header above already draws a bottom border,
                so an extra divider here would stack two lines. */}

            {/* Option groups */}
            {options.map((group: Record<string, any>) => {
              const selectedCount = Object.keys(selected[group.id] || {}).length;
              const isRequired = group.min > 0;
              const isSatisfied = selectedCount >= group.min;
              const errored = showErrors && isRequired && !isSatisfied;
              return (
                <div
                  key={group.id}
                  data-option-group={group.id}
                  className={`mt-4 -mx-2 px-2 pt-3 pb-1 rounded-2xl transition-colors ${
                    errored ? 'bg-red-500/10 ring-2 ring-red-500/40' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 data-option-group-name className="font-semibold text-[15px] capitalize">{group.name}</h3>
                      <p
                        data-option-helper
                        className={`text-[13px] ${errored ? 'text-red-500 font-semibold' : 'text-[var(--color-muted)]'}`}
                      >
                        {isRequired
                          ? t('restaurants.options.choose_from', { min: group.min, max: group.max, defaultValue: `Choose ${group.min}–${group.max}` })
                          : t('restaurants.options.choose_max', { max: group.max, defaultValue: `Choose up to ${group.max}` })
                        }
                      </p>
                    </div>
                    {isRequired && (
                      // Tailwind's `dark:` variants react to the OS's
                      // prefers-color-scheme, but the storefront forces a
                      // light surface palette via CSS vars regardless of
                      // OS mode. Mixing the two produced a light-red
                      // glyph on a light-red bg (contrast ≈ 1.5:1) for
                      // operators whose tablet was set to dark. Pin to
                      // the dark-text/light-bg variant so contrast stays
                      // ~7:1 in both modes.
                      <span
                        data-option-required
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isSatisfied
                            ? 'bg-emerald-500/20 text-emerald-800'
                            : 'bg-red-500/20 text-red-700'
                        }`}
                      >
                        {isSatisfied ? '✓' : t('restaurants.options.required', 'Required')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {group.items?.map((item: Record<string, any>) => {
                      const isSelected = !!selected[group.id]?.[item.id];
                      const itemPrice = item.price != null ? item.price / 100 : 0;
                      if (item.is_hidden || item.is_sold_out) return null;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleOption(group.id, item.id, group)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all capitalize ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-sm'
                              : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-primary)]/40'
                          }`}
                        >
                          {/* Radio/check indicator */}
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                              : 'border-[var(--color-border)]'
                          }`}>
                            {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                          </span>
                          <span data-option-name className="text-[15px] flex-1 text-left">{item.name}</span>
                          {itemPrice > 0 && (
                            // Functional info — bump to full --color-text
                            // contrast so a glance reads "what does this
                            // cost extra". --color-muted at OK contrast
                            // still felt washed next to the option name.
                            <span data-option-price className="text-sm font-medium text-[var(--color-text)]">+{EURO}{itemPrice.toFixed(2)}</span>
                          )}
                          {itemPrice === 0 && (
                            // Removed the opacity-60 stack — combined with
                            // --color-muted it dropped to ~2.5:1 on white
                            // (failed WCAG AA). Plain muted text now.
                            <span data-option-price className="text-xs text-[var(--color-muted)]">{t('common.free', 'Free')}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Note — only when the store allows per-item notes */}
            {branding.allow_notes && (
              <div className="mt-5">
                <label className="text-xs font-medium text-[var(--color-muted)] block mb-1">{t('restaurants.note', 'Note')}</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={t('common.special_requests', 'Special requests...')}
                  maxLength={160}
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-muted)]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 space-y-3">
          <div className="flex items-center justify-center border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-2)]">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="px-5 py-3 text-xl font-bold text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              −
            </button>
            <span className="px-4 py-3 font-bold text-lg min-w-[3rem] text-center tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="px-5 py-3 text-xl font-bold text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors text-[15px]"
          >
            {state.mode === EDIT ? t('common.update', 'Update') : t('common.add', 'Add')} — {EURO}{(totalPrice / 100).toFixed(2)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
});

export default OptionModal;
