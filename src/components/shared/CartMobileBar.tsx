import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';
import { EURO } from '@/config/constants';
import CartSidebar from './CartSidebar';

type Props = {
  menu: Record<string, any> | null;
  onEdit: (item: any) => void;
  onConfirm: () => void;
};

function calcSubtotal(cart: any[], menu: any): number {
  if (!menu?.menu) return 0;
  return cart.reduce((sum, item) => {
    const product = menu.menu.products?.find((p: any) => p.id === item.product);
    let price = product?.price || 0;
    if (item.options) {
      for (const [optId, qty] of Object.entries(item.options)) {
        for (const group of (menu.menu.options || [])) {
          const opt = group.items?.find((i: any) => i.id === Number(optId));
          if (opt?.price) price += opt.price * (qty as number);
        }
      }
    }
    return sum + price * item.quantity;
  }, 0);
}

export default function CartMobileBar({ menu, onEdit, onConfirm }: Props) {
  const { cart, itemCount } = useCart();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const subtotal = useMemo(() => calcSubtotal(cart, menu), [cart, menu]);

  if (cart.length === 0) return null;

  return (
    <>
      {/* Floating bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between py-3.5 px-5 rounded-2xl text-white bg-[var(--color-primary)] shadow-xl shadow-black/20"
        >
          <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-[13px] font-bold">
            {itemCount}
          </span>
          <span className="font-semibold text-[15px]">{t('common.view_order', 'View order')}</span>
          <span className="font-bold text-[15px]">{EURO}{(subtotal / 100).toFixed(2)}</span>
        </button>
      </div>

      {/* Slide-up drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl overflow-hidden flex flex-col" style={{ maxHeight: '85dvh' }}>
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex-1 min-h-0">
              <CartSidebar menu={menu} onEdit={(item) => { setOpen(false); onEdit(item); }} onConfirm={() => { setOpen(false); onConfirm(); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
