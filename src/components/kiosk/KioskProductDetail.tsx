import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EURO, ADD, EDIT, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { useCart } from '@/context/CartContext';
import KioskMealBuilder from '@/components/kiosk/KioskMealBuilder';
import { getAllergenIcon, getAllergenLabel } from '@/lib/allergens';

const FALLBACK_GRADIENTS = [
  'from-amber-100 via-orange-50 to-rose-100',
  'from-emerald-100 via-teal-50 to-cyan-100',
  'from-violet-100 via-fuchsia-50 to-pink-100',
  'from-sky-100 via-blue-50 to-indigo-100',
  'from-yellow-100 via-amber-50 to-orange-100',
  'from-lime-100 via-green-50 to-emerald-100',
];
const gradientForId = (id: number) => FALLBACK_GRADIENTS[Math.abs(id) % FALLBACK_GRADIENTS.length];
const firstLetter = (n?: string) => (n?.trim().charAt(0) || '?').toUpperCase();

export type ProductDetailParams = {
  product: Record<string, any>;
  options: Record<string, any>[];
  mode: typeof ADD | typeof EDIT;
  item: Record<string, any> | null;
};

type Props = {
  params: ProductDetailParams;
  showAllergens?: boolean;
  allowNotes?: boolean;
  // Called with the product that was just added so the parent can fire the
  // upsell modal. Undefined on cancel / edit-mode close (no upsell needed).
  onClose: (addedProduct?: Record<string, any>) => void;
};

export default function KioskProductDetail({ params, showAllergens = true, allowNotes = true, onClose }: Props) {
  const { product, options, mode, item } = params;

  // McDonald's-style meal-builder: when the operator has flagged the
  // product as a combo AND there's at least one option group to walk
  // through, hand off to the dedicated wizard. The shared params type
  // and onClose signature mean KioskPage doesn't need to know which
  // surface is rendering — the post-add upsell flow still fires.
  if (product?.is_combo && Array.isArray(options) && options.length > 0) {
    return <KioskMealBuilder params={params} onClose={onClose}/>;
  }

  const { addToCart, updateCart } = useCart();
  const { t } = useTranslation();
  const [showError, setShowError] = useState(false);

  const initial = useMemo(() => {
    if (mode === EDIT && item) {
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
      return { quantity: item.quantity || 1, note: item.note || '', selected: sel };
    }
    return { quantity: 1, note: '', selected: {} as Record<number, Record<number, number>> };
  }, [mode, item, options]);

  const [quantity, setQuantity] = useState(initial.quantity);
  const [note, setNote] = useState(initial.note);
  const [selected, setSelected] = useState(initial.selected);

  const toggleOption = useCallback((groupId: number, itemId: number, group: Record<string, any>) => {
    setSelected(prev => {
      const groupSel = { ...(prev[groupId] || {}) };
      if (groupSel[itemId]) {
        delete groupSel[itemId];
      } else {
        if (group.max === 1 && !group.choose_multi) {
          return { ...prev, [groupId]: { [itemId]: 1 } };
        }
        groupSel[itemId] = 1;
      }
      return { ...prev, [groupId]: groupSel };
    });
  }, []);

  const totalPrice = useMemo(() => {
    let price = product?.price || 0;
    for (const groupItems of Object.values(selected)) {
      for (const [itemId, qty] of Object.entries(groupItems)) {
        for (const group of options) {
          const opt = group.items?.find((i: any) => i.id === Number(itemId));
          if (opt?.price) { price += opt.price * (qty as number); break; }
        }
      }
    }
    return price * quantity;
  }, [product, options, selected, quantity]);

  const validate = (): { ok: boolean; firstMissing: number | null } => {
    for (const group of options) {
      const min = group.min || 0;
      if (min > 0) {
        const count = Object.keys(selected[group.id] || {}).length;
        if (count < min) return { ok: false, firstMissing: group.id };
      }
    }
    return { ok: true, firstMissing: null };
  };

  const handleConfirm = () => {
    const v = validate();
    if (!v.ok) {
      setShowError(true);
      const el = document.querySelector(`[data-option-group="${v.firstMissing}"]`);
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
      product: product.id,
      product_data: product,
      options_data: options,
      quantity,
      note,
      options: flatOptions,
    };
    if (mode === EDIT && item) {
      updateCart(item.id, { ...item, ...cartItem, id: item.id });
      onClose();
    } else {
      addToCart(cartItem);
      // Hand the product object to the parent so it can show the upsell
      // modal — only on real adds, not on edit (already in cart) or
      // cancel (header back button passes nothing).
      onClose(product);
    }
  };

  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;

  return (
    <div className="fixed inset-0 z-40 bg-[#fafafa] flex flex-col kiosk-anim-fade-in-up">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 h-24 flex items-center gap-5 z-10">
        <button
          type="button"
          onClick={onClose}
          className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold truncate flex-1 capitalize">{product.name}</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-52">
        {/* Hero image */}
        {imgUrl ? (
          <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
            <img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`relative w-full aspect-[4/3] bg-gradient-to-br ${gradientForId(product.id)} flex items-center justify-center`}>
            <span className="text-[20rem] leading-none font-black text-white select-none drop-shadow-md mix-blend-overlay">
              {firstLetter(product.name)}
            </span>
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />
          </div>
        )}

        {/* Title + description */}
        <div className="px-8 pt-8 pb-5">
          <div className="flex items-start justify-between gap-5">
            <h1 className="text-4xl font-extrabold leading-tight capitalize">{product.name}</h1>
            {product.price != null && (
              <span className="text-3xl font-extrabold text-[var(--color-primary)] shrink-0">
                {EURO}{(product.price / 100).toFixed(2)}
              </span>
            )}
          </div>
          {product.description && (
            <p className="text-xl text-gray-500 leading-relaxed mt-4">{product.description}</p>
          )}
          {showAllergens && product.allergens?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {product.allergens.map((a: string) => {
                const label = getAllergenLabel(a, t);
                return (
                  <span
                    key={a}
                    title={label}
                    className="inline-flex items-center gap-2 text-lg px-4 py-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                  >
                    <span aria-hidden className="text-xl">{getAllergenIcon(a)}</span>
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="px-8 pb-8">
          {options.map((group: Record<string, any>) => {
            const selectedCount = Object.keys(selected[group.id] || {}).length;
            const isRequired = group.min > 0;
            const isSatisfied = selectedCount >= group.min;
            const errored = showError && isRequired && !isSatisfied;
            return (
              <div
                key={group.id}
                data-option-group={group.id}
                className={`mt-7 first:mt-3 rounded-3xl border-2 p-7 transition-colors ${
                  errored ? 'border-red-300 bg-red-50/40' : 'border-transparent bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="font-bold text-2xl">{group.name}</h3>
                    <p className="text-base text-gray-500 mt-1">
                      {isRequired
                        ? t('restaurants.options.choose_from', { min: group.min, max: group.max, defaultValue: `Choose ${group.min}–${group.max}` })
                        : t('restaurants.options.choose_max', { max: group.max, defaultValue: `Choose up to ${group.max}` })}
                    </p>
                  </div>
                  {isRequired && (
                    <span className={`text-sm font-bold px-4 py-2 rounded-full ${
                      isSatisfied ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {isSatisfied ? '✓' : t('restaurants.options.required', 'Required')}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {group.items?.map((opt: Record<string, any>) => {
                    if (opt.is_hidden || opt.is_sold_out) return null;
                    const isSelected = !!selected[group.id]?.[opt.id];
                    const optPrice = opt.price != null ? opt.price / 100 : 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOption(group.id, opt.id, group)}
                        className={`w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all min-h-20 ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                            : 'border-gray-100 bg-gray-50/60 active:bg-gray-100'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <span className="text-white text-base font-bold">✓</span>}
                        </span>
                        <span className="text-xl flex-1 text-left font-medium capitalize">{opt.name}</span>
                        {optPrice > 0 && (
                          <span className="text-lg font-semibold text-gray-600">+{EURO}{optPrice.toFixed(2)}</span>
                        )}
                        {optPrice === 0 && (
                          <span className="text-base text-gray-300 font-medium">{t('common.free', 'Free')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Note */}
          {allowNotes && (
            <div className="mt-7 rounded-3xl bg-white p-7">
              <label className="text-lg font-bold block mb-3">{t('restaurants.note', 'Note')}</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t('common.special_requests', 'Special requests...')}
                maxLength={160}
                className="w-full px-5 py-5 border-2 border-gray-100 rounded-2xl text-xl focus:outline-none focus:border-[var(--color-primary)] bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-100 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q: number) => Math.max(1, q - 1))}
              className="w-20 h-20 flex items-center justify-center text-3xl font-bold text-gray-600 active:bg-gray-200 rounded-l-2xl"
            >
              −
            </button>
            <span className="w-14 text-center font-extrabold text-2xl tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q: number) => q + 1)}
              className="w-20 h-20 flex items-center justify-center text-3xl font-bold text-gray-600 active:bg-gray-200 rounded-r-2xl"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-20 rounded-2xl font-extrabold text-2xl text-white bg-[var(--color-primary)] active:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-3"
          >
            <span>{mode === EDIT ? t('common.update', 'Update') : t('common.add', 'Add')}</span>
            <span className="opacity-80">•</span>
            <span>{EURO}{(totalPrice / 100).toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
