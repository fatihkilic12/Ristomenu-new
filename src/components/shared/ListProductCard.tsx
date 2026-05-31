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

// Cutlery / utensils icon — used when the product has no photo.
// Better than falling back to the restaurant logo (which gets visually
// noisy when many rows share the same default image — every pizza
// shows the same restaurant logo as a "thumb", confusing) and better
// than the first-letter glyph used elsewhere (looks like a layout
// bug, the operator wanted a clearer placeholder).
const CutleryIcon = () => (
  <svg
    className="w-8 h-8 text-gray-400"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2"/>
    <path d="M6 11v11"/>
    <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8"/>
  </svg>
);

// Per-category "list with full description" variant — opt-in via
// Category.display_style = 'list' on the server. Designed for
// categories like Pizzas / Pastas where each variant has a meaningful
// description difference and truncating to 1-2 lines (the default
// ProductCard / CompactProductCard) hides the actual info the
// customer needs to choose between similar-looking items.
//
// Layout choices:
//   - 96px square thumb on the left. Big enough to convey what the
//     dish looks like at a glance; small enough that long
//     descriptions still get most of the row width.
//   - Name + price share the top line, separated by a flex 1 span so
//     the price hugs the right edge — classic printed-menu feel.
//   - Description flows below the name in full (whitespace-pre-line,
//     no line-clamp). This is the whole point of the variant.
//   - Generous vertical padding so rows don't feel cramped.
//   - Soft divider between rows instead of a hard border-bottom; the
//     row hover/active state still provides the tap-feedback.
//
// Pointer-down preload on the image gives the modal open a ~100ms
// head start.
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
      className={`group relative w-full text-left bg-white transition-colors active:bg-gray-50 ${
        isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
      }`}
    >
      {/* Soft divider above (skipped on the first row by the wrapping
          container's `divide-y` would work too, but since we live
          inside a manual map we draw it here at the bottom of each
          row instead — see the wrapper in MenuView). */}
      <div className="flex items-start gap-5 p-5">
        {/* Cart count chip */}
        {cartCount > 0 && (
          <span className="absolute top-3 right-3 z-10 bg-[var(--color-primary)] text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
            {cartCount}
          </span>
        )}

        {/* Thumbnail (left) — 96px square. Falls back to a centered
            cutlery icon when there's no photo, which reads as
            "menu item" without polluting the row with the restaurant
            logo repeated for every dish. */}
        {showImages && (
          <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 ring-1 ring-inset ring-gray-100 relative">
            {hasImage ? (
              <img
                src={imgUrl}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <CutleryIcon/>
              </div>
            )}
          </div>
        )}

        {/* Title + price on one line, full description below */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <h3 className="font-bold text-[16px] text-gray-900 leading-tight capitalize">
              {product.name}
            </h3>
            {price && (
              <span className="shrink-0 text-[16px] font-bold text-gray-900 tabular-nums">
                {EURO}{price}
              </span>
            )}
          </div>

          {/* Dietary chip row — single-letter badges that feel like
              part of the title block without competing with the
              ingredient list below. */}
          {(isVegan || isVegetarian) && (
            <div className="flex gap-1.5 mb-1.5">
              {isVegan && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-600 text-white">
                  Vegan
                </span>
              )}
              {isVegetarian && !isVegan && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500 text-white">
                  Veggie
                </span>
              )}
            </div>
          )}

          {/* The whole reason this card variant exists — full,
              UNclamped description. whitespace-pre-line so operators
              can use linebreaks in the description to structure
              the topping list. */}
          {product.description && (
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}
        </div>
      </div>

      {/* Bottom divider — sits inside the button so the last item in
          the category gets a divider too (the wrapping container
          masks it via overflow-hidden in MenuView). Subtle enough
          that it reads as a separator, not a line drawing attention. */}
      <span
        aria-hidden
        className="absolute bottom-0 left-5 right-5 h-px bg-gray-100"
      />

      {/* Sold out chip — discreet top-right corner so it doesn't
          fight the price for attention. */}
      {isSoldOut && (
        <span className="absolute top-3 right-12 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-sm">
          {t('common.sold_out', 'Sold out')}
        </span>
      )}
    </button>
  );
});
