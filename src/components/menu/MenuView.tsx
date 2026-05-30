import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { getDineInPause } from '@/lib/dineIn';
import { ADD, EDIT } from '@/config/constants';
import CategoryNav from '@/components/shared/CategoryNav';
import ProductCard from '@/components/shared/ProductCard';
import CartSidebar from '@/components/shared/CartSidebar';
import CartMobileBar from '@/components/shared/CartMobileBar';
import DineInPausedBanner from '@/components/shared/DineInPausedBanner';
import OptionModal, { type OptionModalRef } from '@/components/shared/OptionModal';

type Props = {
  menu: Record<string, any> | null;
  menuLoading: boolean;
  onOrderConfirm: () => void;
};

export default function MenuView({ menu, menuLoading, onOrderConfirm }: Props) {
  const { cart } = useCart();
  const { company } = useStoreConfig();
  // When the operator hits "Pauzeer dine-in" on the Portal home, the cart
  // surfaces hide and product tiles drop into read-only mode. The menu
  // itself stays fully browsable so customers at the table can still read
  // descriptions and allergens while they wait.
  const { paused: dineInPaused } = getDineInPause(company);
  const modalRef = useRef<OptionModalRef>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  // While a programmatic scroll is in progress (user clicked a pill), suppress
  // the IntersectionObserver so the active pill stays on the clicked target
  // instead of flickering through every section that scrolls past.
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimer = useRef<number | null>(null);

  const categories = menu?.menu?.categories || [];
  const products = menu?.menu?.products || [];
  const options = menu?.menu?.options || [];

  // Set initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Scroll observer for category highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (programmaticScrollRef.current) return; // Locked during click-to-scroll
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-category'));
            if (id) setActiveCategory(id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    Object.values(categoryRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [products]);

  const scrollToCategory = useCallback((catId: number) => {
    const el = categoryRefs.current[catId];
    if (!el) return;

    programmaticScrollRef.current = true;
    if (programmaticScrollTimer.current) window.clearTimeout(programmaticScrollTimer.current);
    setActiveCategory(catId);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      programmaticScrollRef.current = false;
      window.removeEventListener('scrollend', release);
    };
    window.addEventListener('scrollend', release, { once: true });
    programmaticScrollTimer.current = window.setTimeout(release, 1200);

    // Header (h-20 = 80) + sticky pill nav (~50) + breathing room
    const top = el.getBoundingClientRect().top + window.scrollY - 138;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const getCartCount = (productId: number) =>
    cart.filter(i => i.product === productId).reduce((s, i) => s + i.quantity, 0);

  const getProductOptions = (product: Record<string, any>) => {
    const optionIds = new Set([...(product.options || [])]);
    // Also include category options
    const cat = categories.find((c: any) => c.id === product.category);
    if (cat?.options) cat.options.forEach((id: number) => optionIds.add(id));
    return options.filter((o: any) => optionIds.has(o.id));
  };

  const onProductClick = (product: Record<string, any>) => {
    // While paused, tapping a tile is a no-op — the product modal would
    // surface an "Add to cart" CTA that can't actually do anything.
    // Banner is already visible up top so the customer knows why.
    if (dineInPaused) return;
    const productOptions = getProductOptions(product);
    modalRef.current?.openModal({ product, options: productOptions, mode: ADD, item: null });
  };

  const onProductEditClick = (item: Record<string, any>) => {
    const productOptions = getProductOptions(item.product_data || {});
    modalRef.current?.openModal({ product: item.product_data, options: productOptions, mode: EDIT, item });
  };

  if (menuLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <DineInPausedBanner/>
      <div className="flex overflow-x-clip">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <CategoryNav categories={categories} activeId={activeCategory} onSelect={scrollToCategory} />

          <div className="px-3 py-4">
            {categories.map((cat: Record<string, any>) => {
              const catProducts = products.filter((p: any) => p.category === cat.id);
              if (catProducts.length === 0) return null;
              return (
                <div
                  key={cat.id}
                  ref={el => { categoryRefs.current[cat.id] = el; }}
                  data-category={cat.id}
                  className="mb-6 scroll-mt-36"
                >
                  <h2 className="text-lg font-bold mb-3 px-1">{cat.name}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {catProducts.map((product: Record<string, any>) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() => onProductClick(product)}
                        cartCount={getCartCount(product.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop cart sidebar — hidden while dine-in is paused so customers
            can't even start a doomed order. */}
        {!dineInPaused && (
          <div className="hidden lg:block w-72 shrink-0 sticky top-14 h-[calc(100dvh-3.5rem)] border-l border-[var(--color-border)]">
            <CartSidebar menu={menu} onEdit={onProductEditClick} onConfirm={onOrderConfirm} />
          </div>
        )}
      </div>

      {/* Mobile cart bar — same guard as the sidebar above. */}
      {!dineInPaused && (
        <CartMobileBar menu={menu} onEdit={onProductEditClick} onConfirm={onOrderConfirm} />
      )}

      {/* Option modal */}
      <OptionModal ref={modalRef} />
    </>
  );
}
