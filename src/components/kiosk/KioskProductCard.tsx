import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

const FALLBACK_GRADIENTS = [
  'from-amber-100 via-orange-50 to-rose-100',
  'from-emerald-100 via-teal-50 to-cyan-100',
  'from-violet-100 via-fuchsia-50 to-pink-100',
  'from-sky-100 via-blue-50 to-indigo-100',
  'from-yellow-100 via-amber-50 to-orange-100',
  'from-lime-100 via-green-50 to-emerald-100',
];

function gradientForId(id: number) {
  return FALLBACK_GRADIENTS[Math.abs(id) % FALLBACK_GRADIENTS.length];
}

function firstLetter(name?: string) {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() || '?';
}

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

  return (
    <button
      type="button"
      onClick={isSoldOut ? undefined : onClick}
      className={`relative w-full text-left rounded-3xl bg-white overflow-hidden transition-all shadow-[0_4px_18px_rgba(0,0,0,0.06)] active:scale-[0.97] active:shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col ${
        isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Cart badge */}
      {cartCount > 0 && (
        <span className="absolute top-5 right-5 z-10 bg-[var(--color-primary)] text-white text-2xl font-extrabold rounded-full w-14 h-14 flex items-center justify-center shadow-lg ring-4 ring-white">
          {cartCount}
        </span>
      )}

      {/* Sold out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 z-[5] bg-white/70 flex items-center justify-center">
          <span className="bg-red-500 text-white text-lg font-bold uppercase tracking-wider px-6 py-2.5 rounded-full">
            {t('common.sold_out', 'Sold out')}
          </span>
        </div>
      )}

      {/* Image / Icon fallback */}
      {hasImage ? (
        <div className="relative w-full aspect-square bg-gray-50 shrink-0 overflow-hidden">
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className={`relative w-full aspect-square bg-gradient-to-br ${gradientForId(product.id)} flex items-center justify-center shrink-0`}>
          <span className="text-[12rem] leading-none font-black text-white select-none drop-shadow-md mix-blend-overlay">
            {firstLetter(product.name)}
          </span>
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-bold text-2xl text-gray-900 leading-tight line-clamp-2 capitalize">{product.name}</h3>
        {product.description && (
          <p className="text-lg text-gray-500 mt-2 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-5 pt-1">
          {price && (
            <span className="font-extrabold text-3xl text-gray-900">{EURO}{price}</span>
          )}
          <span className="ml-auto w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center text-3xl font-bold shadow-md">
            +
          </span>
        </div>
      </div>
    </button>
  );
});
