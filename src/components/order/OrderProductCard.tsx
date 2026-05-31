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

export default memo(function OrderProductCard({ product, onClick, cartCount = 0 }: Props) {
  const { t } = useTranslation();
  const { company } = useStoreConfig();
  const branding = getBranding(company);
  const { show_product_images } = branding;
  const price = product.price != null ? (product.price / 100).toFixed(2) : null;
  const isSoldOut = product.is_sold_out;
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const [imgError, setImgError] = useState(false);
  const showImage = show_product_images && imgUrl && !imgError;

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

      {/* Right: image — hidden entirely when the store turned product images
          off, so the text gets full width instead of a coloured placeholder. */}
      {show_product_images && (
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
            <NoImageFallback bannerImage={branding.banner_image} logo={branding.logo}/>
          )}
        </div>
      )}

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

// Placeholder when a product has no image. Cascades:
//   1. Restaurant banner photo (dimmed) + logo overlay — reads as
//      "this is our place, image coming". Most contextual signal.
//   2. Logo at solid opacity on a neutral background.
//   3. Cutlery glyph as the final hedge, now at a readable opacity
//      so it doesn't look like a layout bug.
function NoImageFallback({bannerImage, logo}: {bannerImage: string | null; logo: string | null}) {
  if (bannerImage) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <img src={bannerImage} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-[var(--color-surface)]/55"/>
        {logo && (
          <img
            src={logo}
            alt=""
            className="absolute inset-0 m-auto w-12 h-12 rounded-lg object-cover opacity-95"
          />
        )}
      </div>
    );
  }
  if (logo) {
    return (
      <div className="w-full h-full bg-[var(--color-surface-2)] flex items-center justify-center">
        <img src={logo} alt="" className="w-14 h-14 rounded-lg object-cover opacity-80"/>
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
      <svg className="w-9 h-9 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2"/>
        <path d="M6 11v11"/>
        <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8"/>
      </svg>
    </div>
  );
}
