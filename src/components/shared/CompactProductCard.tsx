import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { getBranding } from '@/lib/branding';
import { useLongPress } from '@/hooks/useLongPress';

type Props = {
  product: Record<string, any>;
  onClick: () => void;
  cartCount?: number;
};

// Compact list-row variant — small thumbnail on the left, two lines of
// text in the middle (name + description), price + cart count on the
// right. Designed for menus with 100+ items (Turkish / Chinese /
// kebab places) where Classic's photo-first grid would mean endless
// scrolling.
export default memo(function CompactProductCard({ product, onClick, cartCount = 0 }: Props) {
  const { company } = useStoreConfig();
  const { t } = useTranslation();
  const branding = getBranding(company);
  const showImages = branding.show_product_images;
  const price = product.price != null ? (product.price / 100).toFixed(2) : null;
  const isSoldOut = product.is_sold_out;
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const [imgError, setImgError] = useState(false);
  const hasImage = showImages && imgUrl && !imgError;
  // Image preload on pointerdown — gives the modal image a ~100ms head start.
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
      className={`relative w-full text-left bg-white border-b border-[var(--color-border)] transition-colors active:bg-gray-50 select-none ${
        isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Cart count chip */}
        {cartCount > 0 && (
          <span className="absolute top-2 right-2 z-10 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
            {cartCount}
          </span>
        )}

        {/* Thumbnail */}
        {hasImage ? (
          <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={imgUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : showImages ? (
          // No-image fallback — cascade by clarity: restaurant banner
          // (clearly "this is our place"), then logo at higher opacity
          // than before, then the first letter of the product name as
          // a typography crutch. Was: barely-visible "?" on light grey —
          // looked like a layout bug.
          // Neutral cutlery glyph — operator preference over banner/logo
          // overlays which made every photoless row look identical.
          <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden relative bg-gray-50 ring-1 ring-inset ring-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2"/>
              <path d="M6 11v11"/>
              <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8"/>
            </svg>
          </div>
        ) : null}

        {/* Title + description */}
        <div className="flex-1 min-w-0 pr-12">
          <p className="text-[15px] font-semibold text-gray-900 leading-tight line-clamp-1 capitalize">
            {product.name}
          </p>
          {product.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
          )}
        </div>

        {/* Price */}
        {price && (
          <span className="shrink-0 text-[15px] font-bold text-gray-900 tabular-nums">
            {EURO}{price}
          </span>
        )}
      </div>

      {/* Sold out overlay — covers the row, less heavy than Classic */}
      {isSoldOut && (
        <span className="absolute inset-y-0 right-3 my-auto h-fit bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
          {t('common.sold_out', 'Sold out')}
        </span>
      )}
    </button>
  );
});
