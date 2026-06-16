import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { useLongPress } from '@/hooks/useLongPress';

type Props = {
  product: Record<string, any>;
  onClick: () => void;
  cartCount?: number;
  showImages?: boolean;
};

export default memo(function KioskProductCard({ product, onClick, cartCount = 0, showImages = true }: Props) {
  const { t } = useTranslation();
  const price = product.price != null ? (product.price / 100).toFixed(2) : null;
  const isSoldOut = product.is_sold_out;
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const [imgError, setImgError] = useState(false);

  const hasImage = showImages && imgUrl && !imgError;
  const preloadModalImage = () => {
    if (imgUrl && !imgError) {
      const img = new Image();
      img.src = imgUrl;
    }
  };
  const press = useLongPress({
    onClick,
    onLongPress: onClick,
    onPointerDown: preloadModalImage,
    disabled: isSoldOut,
  });

  return (
    <button
      type="button"
      {...press}
      className={`relative w-full text-left rounded-3xl overflow-hidden transition-all active:scale-[0.97] flex flex-col select-none ${
        isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        background: 'var(--kiosk-card-bg)',
        color: 'var(--kiosk-text)',
        boxShadow: 'var(--kiosk-card-shadow, 0 4px 18px rgba(0,0,0,0.06))',
      }}
    >
      {/* Cart badge — ring colour pinned to the card bg so the badge
          reads as 'sitting on top of the card' on both themes. */}
      {cartCount > 0 && (
        <span
          className="absolute top-5 right-5 z-10 bg-[var(--color-primary)] text-white text-2xl font-extrabold rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
          style={{ boxShadow: '0 0 0 4px var(--kiosk-card-bg), 0 6px 14px rgba(0,0,0,0.2)' }}
        >
          {cartCount}
        </span>
      )}

      {/* Sold out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--kiosk-card-bg) 70%, transparent)' }}>
          <span className="bg-red-500 text-white text-lg font-bold uppercase tracking-wider px-6 py-2.5 rounded-full">
            {t('common.sold_out', 'Sold out')}
          </span>
        </div>
      )}

      {/* Image / Neutral fallback */}
      {hasImage ? (
        <div className="relative w-full aspect-square shrink-0 overflow-hidden" style={{ background: 'var(--kiosk-shell-bg)' }}>
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <NoImageFallback/>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-bold text-2xl leading-tight line-clamp-2 capitalize" style={{ color: 'var(--kiosk-text)' }}>{product.name}</h3>
        {product.description && (
          <p className="text-lg mt-2 line-clamp-2" style={{ color: 'var(--kiosk-text-muted)' }}>{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-5 pt-1">
          {price && (
            <span className="font-extrabold text-3xl" style={{ color: 'var(--kiosk-text)' }}>{EURO}{price}</span>
          )}
          <span className="ml-auto w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center text-3xl font-bold shadow-md">
            +
          </span>
        </div>
      </div>
    </button>
  );
});

// Neutral cutlery glyph for products without a photo — same reasoning as
// OrderProductCard: banner+logo overlays made every photoless tile identical,
// which read noisier than a plain icon on dense grids.
function NoImageFallback() {
  return (
    <div
      className="relative w-full aspect-square flex items-center justify-center shrink-0"
      style={{
        background: 'var(--kiosk-shell-bg)',
        boxShadow: 'inset 0 0 0 1px var(--kiosk-border)',
      }}
    >
      <svg className="w-24 h-24" style={{ color: 'var(--kiosk-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2"/>
        <path d="M6 11v11"/>
        <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8"/>
      </svg>
    </div>
  );
}
