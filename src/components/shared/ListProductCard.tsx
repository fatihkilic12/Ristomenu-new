import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { getBranding } from '@/lib/branding';

type Props = {
  product: Record<string, any>;
  onClick: () => void;
  cartCount?: number;
};

// Per-category "list with full description" variant — opt-in via
// Category.display_style = 'list' on the server. Designed for
// categories like Pizzas / Pastas where each variant has a
// meaningful description difference and truncating to 1 line (the
// CompactProductCard default) hides the actual information the
// customer needs to choose.
//
// Layout: wide row, ~80px thumbnail left, name + FULL description
// (no line-clamp) + price right. The product card the customer
// reads top-to-bottom like a printed menu.
//
// Image preload on pointerdown gives the modal a ~100ms head start,
// matching the optimization the other ProductCard variants got.
export default memo(function ListProductCard({ product, onClick, cartCount = 0 }: Props) {
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
  const isVegan = product.vegan;
  const isVegetarian = product.vegetarian;

  const preloadModalImage = () => {
    if (imgUrl && !imgError) {
      const img = new Image();
      img.src = imgUrl;
    }
  };

  return (
    <button
      type="button"
      onClick={isSoldOut ? undefined : onClick}
      onPointerDown={isSoldOut ? undefined : preloadModalImage}
      className={`relative w-full text-left bg-white border-b border-[var(--color-border)] transition-colors active:bg-gray-50 ${
        isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Cart count chip */}
        {cartCount > 0 && (
          <span className="absolute top-3 right-3 z-10 bg-[var(--color-primary)] text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
            {cartCount}
          </span>
        )}

        {/* Thumbnail (left) */}
        {showImages && (
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
            {hasImage ? (
              <img
                src={imgUrl}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : branding.banner_image ? (
              <>
                <img
                  src={branding.banner_image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-white/55"/>
                {branding.logo && (
                  <img
                    src={branding.logo}
                    alt=""
                    className="absolute inset-0 m-auto w-10 h-10 rounded-md object-cover opacity-90"
                  />
                )}
              </>
            ) : branding.logo ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={branding.logo} alt="" className="w-12 h-12 rounded-md object-cover opacity-70"/>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-400 capitalize">
                {(product.name?.trim().charAt(0) || '?').toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Title + full description (no line-clamp on purpose) */}
        <div className="flex-1 min-w-0 pr-12">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-[15px] text-gray-900 leading-tight capitalize pr-2">
              {product.name}
            </h3>
            {(isVegan || isVegetarian) && (
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${isVegan ? 'bg-green-600' : 'bg-green-500'} text-white mt-0.5`}>
                {isVegan ? 'VEGAN' : 'VEGGIE'}
              </span>
            )}
          </div>
          {product.description && (
            // No line-clamp — the whole point of this variant is to
            // let the customer read the differences between
            // similar-looking pizzas/pastas.
            <p className="text-[13px] text-gray-600 leading-snug whitespace-pre-line">
              {product.description}
            </p>
          )}
        </div>

        {/* Price (right) */}
        {price && (
          <span className="shrink-0 text-[15px] font-bold text-gray-900 tabular-nums self-start pt-0.5">
            {EURO}{price}
          </span>
        )}
      </div>

      {/* Sold out overlay — corner badge to keep the row legible */}
      {isSoldOut && (
        <span className="absolute top-3 right-12 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
          {t('common.sold_out', 'Sold out')}
        </span>
      )}
    </button>
  );
});
