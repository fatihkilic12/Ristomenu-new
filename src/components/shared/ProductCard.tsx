import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { useStoreConfig } from '@/context/StoreConfigContext';

type Props = {
  product: Record<string, any>;
  onClick: () => void;
  cartCount?: number;
};

export default memo(function ProductCard({ product, onClick, cartCount = 0 }: Props) {
  const { company } = useStoreConfig();
  const { t } = useTranslation();
  const price = product.price != null ? (product.price / 100).toFixed(2) : null;
  const isSoldOut = product.is_sold_out;
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const [imgError, setImgError] = useState(false);

  const hasImage = imgUrl && !imgError;
  const isVegan = product.vegan;
  const isVegetarian = product.vegetarian;

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
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shrink-0 relative">
          {company?.img ? (
            <img src={company.img} alt="" className="w-12 h-12 rounded-xl object-cover opacity-20" />
          ) : (
            <span className="text-3xl opacity-10">🍽</span>
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
