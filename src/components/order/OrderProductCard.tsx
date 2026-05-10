import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

const FALLBACK_GRADIENTS = [
  'from-amber-500/30 to-orange-600/40',
  'from-emerald-500/30 to-teal-600/40',
  'from-violet-500/30 to-fuchsia-600/40',
  'from-sky-500/30 to-blue-600/40',
  'from-yellow-500/30 to-amber-600/40',
  'from-rose-500/30 to-pink-600/40',
];
const gradientFor = (id: number) => FALLBACK_GRADIENTS[Math.abs(id) % FALLBACK_GRADIENTS.length];

type Props = {
  product: Record<string, any>;
  onClick: () => void;
  cartCount?: number;
};

export default memo(function OrderProductCard({ product, onClick, cartCount = 0 }: Props) {
  const { t } = useTranslation();
  const price = product.price != null ? (product.price / 100).toFixed(2) : null;
  const isSoldOut = product.is_sold_out;
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const [imgError, setImgError] = useState(false);
  const showImage = imgUrl && !imgError;

  return (
    <button
      type="button"
      onClick={isSoldOut ? undefined : onClick}
      className={`group relative w-full text-left rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 transition-all p-4 flex gap-4 min-h-[112px] ${
        isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'
      }`}
    >
      {/* Left: info */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-bold text-base text-[var(--color-text)] leading-tight line-clamp-2 capitalize pr-10">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-[var(--color-muted)] mt-1 line-clamp-2 leading-snug">{product.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center gap-2 flex-wrap">
          {price && (
            <span className="font-extrabold text-base text-[var(--color-text)]">
              {EURO}{price}
            </span>
          )}
          {cartCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-white">
              {cartCount}× {t('common.in_cart', 'in cart')}
            </span>
          )}
        </div>
      </div>

      {/* Right: image */}
      <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden">
        {showImage ? (
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientFor(product.id)} flex items-center justify-center`}>
            <span className="text-4xl font-black text-white/70 select-none">
              {(product.name?.trim().charAt(0) || '?').toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Plus button */}
      {!isSoldOut && (
        <span
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
          aria-hidden
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      )}

      {/* Sold out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 z-[5] bg-black/40 rounded-2xl flex items-center justify-center">
          <span className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            {t('common.sold_out', 'Sold out')}
          </span>
        </div>
      )}
    </button>
  );
});
