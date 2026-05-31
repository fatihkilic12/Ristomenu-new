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

export default memo(function ProductCard({ product, onClick, cartCount = 0 }: Props) {
  const { company } = useStoreConfig();
  const { t } = useTranslation();
  const branding = getBranding(company);
  const price = product.price != null ? (product.price / 100).toFixed(2) : null;
  const isSoldOut = product.is_sold_out;
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const [imgError, setImgError] = useState(false);

  // Store can globally disable product photos — render a compact text-only
  // card in that case so the layout doesn't have a giant empty placeholder.
  const renderImages = branding.show_product_images;
  const hasImage = renderImages && imgUrl && !imgError;
  const isVegan = product.vegan;
  const isVegetarian = product.vegetarian;

  // Text-only compact variant when product images are disabled store-wide.
  if (!renderImages) {
    return (
      <button
        type="button"
        onClick={isSoldOut ? undefined : onClick}
        className={`relative w-full h-full text-left rounded-2xl bg-white overflow-hidden transition-all shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-[0.97] flex flex-col min-h-[112px] ${
          isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {cartCount > 0 && (
          <span className="absolute top-2.5 right-2.5 z-10 bg-[var(--color-primary)] text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {cartCount}
          </span>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 z-[5] bg-white/60 flex items-center justify-center">
            <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              {t('common.sold_out', 'Sold out')}
            </span>
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-[13px] text-gray-800 leading-snug line-clamp-2 flex-1 pr-4">{product.name}</h3>
            {(isVegan || isVegetarian) && (
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${isVegan ? 'bg-green-600' : 'bg-green-500'} text-white`}>
                {isVegan ? 'VEGAN' : 'VEGGIE'}
              </span>
            )}
          </div>
          {product.description && (
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{product.description}</p>
          )}
          {price && (
            <span className="font-bold text-[14px] text-gray-900 mt-auto pt-2">{EURO}{price}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={isSoldOut ? undefined : onClick}
      className={`relative w-full h-full text-left rounded-2xl bg-white overflow-hidden transition-all shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-[0.97] flex flex-col ${
        isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Cart badge */}
      {cartCount > 0 && (
        <span className="absolute top-2.5 right-2.5 z-10 bg-[var(--color-primary)] text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
          {cartCount}
        </span>
      )}

      {/* Sold out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 z-[5] bg-white/60 flex items-center justify-center">
          <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            {t('common.sold_out', 'Sold out')}
          </span>
        </div>
      )}

      {/* Image */}
      {hasImage ? (
        <div className="relative w-full aspect-[4/3] bg-gray-50 shrink-0 overflow-hidden">
          <img src={imgUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={() => setImgError(true)} />
          {/* Dietary badges on image */}
          {(isVegan || isVegetarian) && (
            <div className="absolute top-2 left-2 flex gap-1">
              {isVegan && <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">VEGAN</span>}
              {isVegetarian && !isVegan && <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">VEGGIE</span>}
            </div>
          )}
        </div>
      ) : (
        // Fallback when the product has no photo. Cascading by clarity:
        //   1. Restaurant banner image (most contextual — operators set
        //      it on the storefront page, so it actually looks like the
        //      restaurant) with a soft gradient overlay so the logo +
        //      product name underneath stay readable.
        //   2. Restaurant logo at 60% opacity on a tinted background
        //      (was 20% — barely visible, looked like a layout bug).
        //   3. Plate emoji at 50% opacity as the final hedge.
        <div className="w-full aspect-[4/3] shrink-0 relative overflow-hidden">
          {branding.banner_image ? (
            <>
              <img
                src={branding.banner_image}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/55 to-white/70"/>
              {branding.logo && (
                <img
                  src={branding.logo}
                  alt=""
                  className="absolute inset-0 m-auto w-14 h-14 rounded-xl object-cover shadow-sm opacity-90"
                />
              )}
            </>
          ) : branding.logo ? (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <img src={branding.logo} alt="" className="w-16 h-16 rounded-xl object-cover opacity-60"/>
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <span className="text-5xl opacity-50">🍽</span>
            </div>
          )}
          {(isVegan || isVegetarian) && (
            <div className="absolute top-2 left-2 flex gap-1">
              {isVegan && <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">VEGAN</span>}
              {isVegetarian && !isVegan && <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">VEGGIE</span>}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-[13px] text-gray-800 leading-snug line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          {price && (
            <span className="font-bold text-[14px] text-gray-900">{EURO}{price}</span>
          )}
        </div>
      </div>
    </button>
  );
});
