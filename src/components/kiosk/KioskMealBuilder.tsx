import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';
import { ADD, EDIT, EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import type { ProductDetailParams } from '@/components/kiosk/KioskProductDetail';

type Props = {
  params: ProductDetailParams;
  // Same signature as KioskProductDetail so KioskPage can keep its single
  // post-add upsell handler.
  onClose: (addedProduct?: Record<string, any>) => void;
};

const resolveImage = (raw: any): string | null => {
  if (!raw) return null;
  return raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw;
};

const productImage = (p: any): string | null => {
  const raw = p?.uri || (p?.image ? IMAGE_ADDRESS(p.image) : null);
  return resolveImage(raw);
};

// McDonald's-style meal-builder. The data model is unchanged — we reuse
// OptionGroup + OptionProductItem — but the UI walks one slot at a time
// with big tiles instead of stacking everything inline. Each step:
//   • required (min ≥ 1): "Pick your drink" — Next disabled until count ≥ min
//   • optional (min = 0): "Add a sauce?" — Next is "Skip"
// The flat cart shape (Record<itemId, qty>) matches KioskProductDetail
// exactly so the order serializer and edit path don't need to know
// whether the item came from the wizard or the standard inline list.
export default function KioskMealBuilder({ params, onClose }: Props) {
  const { product, options, mode, item } = params;
  const { addToCart, updateCart } = useCart();
  const { t } = useTranslation();

  // Steps: [hero, ...optionGroups, review]. The hero step gives the
  // customer a moment to register what they tapped before the wizard
  // starts — important on a kiosk where flicker = abandoned orders.
  const totalSteps = options.length + 2;
  const HERO = 0;
  const REVIEW = totalSteps - 1;

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<number, Record<number, number>>>(() => {
    if (mode === EDIT && item?.options) {
      const sel: Record<number, Record<number, number>> = {};
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
      return sel;
    }
    return {};
  });

  const toggle = useCallback((groupId: number, itemId: number, group: any) => {
    setSelected((prev) => {
      const groupSel = { ...(prev[groupId] || {}) };
      if (groupSel[itemId]) {
        delete groupSel[itemId];
      } else if (group.max === 1 && !group.choose_multi) {
        return { ...prev, [groupId]: { [itemId]: 1 } };
      } else {
        groupSel[itemId] = 1;
      }
      return { ...prev, [groupId]: groupSel };
    });
  }, []);

  const totalPrice = useMemo(() => {
    let price = product?.price || 0;
    for (const groupItems of Object.values(selected)) {
      for (const [itemId, qty] of Object.entries(groupItems)) {
        for (const g of options) {
          const it = g.items?.find((i: any) => i.id === Number(itemId));
          if (it?.price) {
            price += it.price * (qty as number);
            break;
          }
        }
      }
    }
    return price;
  }, [product, options, selected]);

  // Wizard step → OptionGroup mapping. Step 0 is the hero, step REVIEW is
  // the summary; everything in between is a slot at index step-1.
  const currentGroup = step > HERO && step < REVIEW ? options[step - 1] : null;
  const groupSelectionCount = currentGroup
    ? Object.keys(selected[currentGroup.id] || {}).length
    : 0;
  const groupMet = !currentGroup || groupSelectionCount >= (currentGroup.min || 0);
  const isLastSlot = step === REVIEW - 1;

  const goNext = () => {
    if (!groupMet) return;
    setStep((s) => Math.min(s + 1, REVIEW));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleConfirm = () => {
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
      quantity: 1,
      note: '',
      options: flatOptions,
    };
    if (mode === EDIT && item) {
      updateCart(item.id, { ...item, ...cartItem, id: item.id });
      onClose();
    } else {
      addToCart(cartItem);
      onClose(product);
    }
  };

  const heroImg = productImage(product);

  return (
    <div className="fixed inset-0 z-40 bg-[#fafafa] flex flex-col kiosk-anim-fade-in-up">
      {/* Header — progress bar + close */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 h-24 flex items-center gap-5 z-10">
        <button
          type="button"
          onClick={step === HERO ? () => onClose() : goBack}
          className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-700 active:bg-gray-200"
          aria-label={step === HERO ? t('common.close', 'Close') : t('common.back', 'Back')}
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base text-gray-500 truncate">{product.name}</p>
          <h1 className="text-2xl font-extrabold leading-tight truncate">
            {step === HERO && t('kiosk.combo.hero_eyebrow', { defaultValue: 'Maak je menu' })}
            {step > HERO && step < REVIEW && currentGroup?.name}
            {step === REVIEW && t('kiosk.combo.review_title', { defaultValue: 'Klaar om toe te voegen' })}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm text-gray-400 leading-tight">
            {t('kiosk.combo.step_indicator', {
              current: Math.min(step + 1, totalSteps),
              total: totalSteps,
              defaultValue: `Stap ${Math.min(step + 1, totalSteps)} / ${totalSteps}`,
            })}
          </p>
          <p className="font-extrabold text-2xl leading-tight">
            {EURO}
            {(totalPrice / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 shrink-0">
        <div
          className="h-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-44">
        {/* Hero step */}
        {step === HERO && (
          <div className="max-w-3xl mx-auto text-center">
            {heroImg ? (
              <div className="aspect-square max-w-md mx-auto rounded-[2.5rem] overflow-hidden bg-gray-100 mb-6 shadow-xl">
                <img src={heroImg} alt="" className="w-full h-full object-cover"/>
              </div>
            ) : (
              <div className="aspect-square max-w-md mx-auto rounded-[2.5rem] bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 mb-6 flex items-center justify-center text-9xl font-black text-orange-300 capitalize">
                {(product.name?.charAt(0) || '?').toUpperCase()}
              </div>
            )}
            <h2 className="text-4xl font-extrabold leading-tight capitalize">{product.name}</h2>
            {product.description && (
              <p className="text-xl text-gray-500 mt-3 max-w-xl mx-auto">{product.description}</p>
            )}
            <p className="text-base text-gray-400 mt-5">
              {t('kiosk.combo.hero_help', {
                count: options.length,
                defaultValue: `Nog ${options.length} keuze${options.length === 1 ? '' : 's'} en je menu is compleet.`,
              })}
            </p>
          </div>
        )}

        {/* Slot step */}
        {step > HERO && step < REVIEW && currentGroup && (
          <div className="max-w-4xl mx-auto">
            <p className="text-base text-gray-500 mb-1">
              {currentGroup.min > 0
                ? t('kiosk.combo.slot_required', {
                    count: currentGroup.min,
                    defaultValue: currentGroup.min === 1 ? 'Verplichte keuze' : `Kies er ${currentGroup.min}`,
                  })
                : t('kiosk.combo.slot_optional', { defaultValue: 'Optioneel' })}
            </p>
            <h2 className="text-3xl font-extrabold leading-tight mb-5">{currentGroup.name}</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(currentGroup.items || []).map((it: any) => {
                const isSelected = !!selected[currentGroup.id]?.[it.id];
                const isSoldOut = it.is_sold_out;
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={isSoldOut}
                    onClick={() => toggle(currentGroup.id, it.id, currentGroup)}
                    className={`relative rounded-3xl p-5 text-left border-2 transition-all min-h-[140px] flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-lg'
                        : 'border-gray-100 bg-white active:scale-[0.97]'
                    } ${isSoldOut ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white text-[var(--color-primary)] flex items-center justify-center text-xl font-extrabold">
                        ✓
                      </span>
                    )}
                    <p className="font-extrabold text-xl leading-tight capitalize pr-10">{it.name}</p>
                    <div className="flex items-end justify-between mt-3">
                      <span className={`text-lg font-bold ${isSelected ? 'text-white/90' : 'text-gray-700'}`}>
                        {it.price > 0 ? `+ ${EURO}${(it.price / 100).toFixed(2)}` : t('kiosk.combo.included', { defaultValue: 'Inbegrepen' })}
                      </span>
                      {isSoldOut && (
                        <span className="text-xs uppercase font-bold text-red-500">
                          {t('common.sold_out', 'Uitverkocht')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Review step */}
        {step === REVIEW && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="rounded-3xl bg-white p-5 flex items-center gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              {heroImg && (
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                  <img src={heroImg} alt="" className="w-full h-full object-cover"/>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base text-gray-500">{t('kiosk.combo.review_base', { defaultValue: 'Hoofdgerecht' })}</p>
                <h3 className="text-xl font-extrabold leading-tight capitalize truncate">{product.name}</h3>
              </div>
            </div>

            {options.map((g: any) => {
              const sel = selected[g.id] || {};
              const picks = Object.keys(sel)
                .map((id) => g.items?.find((i: any) => i.id === Number(id)))
                .filter(Boolean);
              if (picks.length === 0) return null;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    // Jump back to the slot's step (step = group index + 1)
                    const idx = options.findIndex((x: any) => x.id === g.id);
                    if (idx >= 0) setStep(idx + 1);
                  }}
                  className="w-full rounded-3xl bg-white p-5 text-left active:bg-gray-50"
                >
                  <p className="text-base text-gray-500">{g.name}</p>
                  <p className="text-xl font-bold leading-tight mt-1 capitalize">
                    {picks.map((p: any) => p.name).join(' · ')}
                  </p>
                  <p className="text-xs text-[var(--color-primary)] font-bold mt-1 uppercase tracking-wider">
                    {t('common.edit', 'Wijzigen')}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        {step < REVIEW ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!groupMet}
            className={`w-full h-20 rounded-2xl font-extrabold text-2xl text-white transition-all ${
              groupMet
                ? 'bg-[var(--color-primary)] active:bg-[var(--color-primary-hover)]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {step === HERO
              ? t('kiosk.combo.start', { defaultValue: 'Beginnen' })
              : isLastSlot
                ? t('kiosk.combo.next_review', { defaultValue: 'Bekijk en bevestig' })
                : currentGroup && (currentGroup.min || 0) === 0 && groupSelectionCount === 0
                  ? t('kiosk.combo.skip', { defaultValue: 'Overslaan' })
                  : t('kiosk.combo.next', { defaultValue: 'Volgende' })}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full h-20 rounded-2xl font-extrabold text-2xl text-white bg-green-600 active:bg-green-700"
          >
            ✓ {t('kiosk.combo.add_meal', { defaultValue: 'Menu toevoegen' })} — {EURO}
            {(totalPrice / 100).toFixed(2)}
          </button>
        )}
      </div>
    </div>
  );
}
