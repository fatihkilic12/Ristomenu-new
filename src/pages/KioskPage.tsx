import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getKioskMenu } from '@/actions/store';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { KIOSK, ADD, EDIT, EURO } from '@/config/constants';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { collectMenuImageUrls, precacheImages } from '@/lib/imageCache';
import { getBranding } from '@/lib/branding';
import LanguageSelector from '@/components/shared/LanguageSelector';
import KioskCategoryNav from '@/components/kiosk/KioskCategoryNav';
import KioskProductCard from '@/components/kiosk/KioskProductCard';
import KioskProductDetail, { type ProductDetailParams } from '@/components/kiosk/KioskProductDetail';
import KioskCartPage from '@/components/kiosk/KioskCartPage';
import KioskOrderConfirmation from '@/components/kiosk/KioskOrderConfirmation';
import KioskUpsellModal from '@/components/kiosk/KioskUpsellModal';

type KioskState = 'idle' | 'name_entry' | 'ordering';
type View = 'menu' | 'product' | 'cart';

/* ─── Idle / Welcome Screen ───────────────────── */
function KioskIdle({ company, onStart }: { company: any; onStart: () => void }) {
  const { t, i18n } = useTranslation();
  const logo = getBranding(company).logo;

  // Cycle the welcome word through the available languages — start with current UI lang
  const phrases = useMemo(() => {
    const langs: string[] = company?.languages?.length ? company.languages : ['nl', 'en', 'fr'];
    const map: Record<string, string> = {
      nl: 'Bestel hier',
      en: 'Order here',
      fr: 'Commandez ici',
      de: 'Hier bestellen',
      tr: 'Sipariş ver',
    };
    const ordered = [i18n.language, ...langs.filter(l => l !== i18n.language)];
    return ordered.map(l => map[l] || map.en);
  }, [company, i18n.language]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = setInterval(() => setPhraseIdx((i: number) => (i + 1) % phrases.length), 2400);
    return () => clearInterval(id);
  }, [phrases.length]);

  return (
    <div
      className="theme-kiosk min-h-dvh flex flex-col items-center justify-between px-8 py-10 relative cursor-pointer select-none overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f0f1e 60%, #050510 100%)' }}
      onClick={onStart}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full opacity-30 blur-3xl kiosk-anim-blob"
          style={{ background: 'var(--color-primary, #6366f1)' }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full opacity-20 blur-3xl kiosk-anim-blob"
          style={{ background: '#a855f7', animationDelay: '-4s' }}
        />
        <div
          className="absolute -bottom-32 left-1/4 w-[380px] h-[380px] rounded-full opacity-25 blur-3xl kiosk-anim-blob"
          style={{ background: '#ec4899', animationDelay: '-8s' }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 w-full flex justify-end">
        <div onClick={e => e.stopPropagation()}>
          <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant="dark" />
        </div>
      </div>

      {/* Center hero */}
      <div className="relative z-10 flex flex-col items-center gap-16 text-center">
        {/* Logo with halo + float */}
        <div className="relative">
          <span className="absolute inset-0 rounded-[2.5rem] kiosk-anim-pulse-ring" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <span className="absolute inset-0 rounded-[2.5rem] kiosk-anim-pulse-ring" style={{ background: 'rgba(255,255,255,0.08)', animationDelay: '-1.2s' }} />
          {logo ? (
            <img
              src={logo}
              alt=""
              className="relative w-72 h-72 object-cover rounded-[2.5rem] shadow-2xl kiosk-anim-float ring-4 ring-white/10"
            />
          ) : (
            <div className="relative w-72 h-72 rounded-[2.5rem] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center text-9xl shadow-2xl kiosk-anim-float ring-4 ring-white/10">
              🍔
            </div>
          )}
        </div>

        {/* Order CTA - cycling languages (primary) */}
        <div className="relative">
          <div className="text-white text-8xl font-black tracking-tight kiosk-anim-pulse-soft leading-none">
            <span key={phraseIdx} className="inline-block kiosk-anim-fade-in-up">
              {phrases[phraseIdx]}
            </span>
          </div>
        </div>

        {/* Store name + welcome (secondary) */}
        <div className="kiosk-anim-fade-in-up">
          <p className="text-white/60 text-2xl uppercase tracking-[0.3em] font-bold mb-3">
            {t('common.welcome_to', 'Welcome to')}
          </p>
          <h1 className="text-white text-5xl font-extrabold tracking-tight leading-none capitalize">
            {company?.name || t('common.welcome', 'Welcome')}
          </h1>
          {getBranding(company).welcome_message && (
            <p className="text-white/70 text-xl mt-5 max-w-2xl mx-auto leading-relaxed">
              {getBranding(company).welcome_message}
            </p>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 flex flex-col items-center gap-5 kiosk-anim-tap">
        <div className="px-16 py-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-3xl font-bold flex items-center gap-4 shadow-2xl">
          <span className="text-4xl">👆</span>
          <span>{t('common.tap_to_start', 'Tap anywhere to start')}</span>
        </div>
        <div className="flex gap-2.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-3 h-3 rounded-full bg-white/40 kiosk-anim-pulse-soft"
              style={{ animationDelay: `${-i * 0.4}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Name Entry Screen ───────────────────────── */
function KioskNameEntry({ company, onSubmit, onBack }: { company: any; onSubmit: (name: string) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const logo = getBranding(company).logo;

  return (
    <div
      className="theme-kiosk min-h-dvh flex flex-col px-6 py-8 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f0f1e 60%, #050510 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-32 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl kiosk-anim-blob"
          style={{ background: '#6366f1' }}
        />
        <div
          className="absolute -bottom-40 -left-32 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl kiosk-anim-blob"
          style={{ background: '#ec4899', animationDelay: '-6s' }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-3xl text-white active:bg-white/20"
        >
          ←
        </button>
        <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant="dark" />
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center kiosk-anim-fade-in-up">
        {logo && (
          <img src={logo} alt="" className="h-40 w-40 object-cover rounded-3xl mb-10 shadow-2xl ring-4 ring-white/10" />
        )}
        <h1 className="text-white text-6xl font-extrabold text-center leading-tight">
          👋 {t('common.welcome_personal', 'Hey there!')}
        </h1>
        <p className="text-white/70 text-2xl text-center mt-5 max-w-2xl leading-relaxed">
          {t('common.enter_name', 'Enter your name to start ordering')}
        </p>

        <div className="w-full max-w-2xl mt-12 flex flex-col gap-5">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSubmit(name.trim()); }}
            placeholder={t('common.your_name', 'Your name')}
            autoFocus
            maxLength={32}
            className="w-full px-8 py-8 rounded-3xl text-4xl font-bold text-center bg-white text-black focus:outline-none focus:ring-4 focus:ring-white/30 placeholder:text-gray-300 shadow-2xl"
          />

          <button
            onClick={() => name.trim() && onSubmit(name.trim())}
            disabled={!name.trim()}
            className="w-full py-8 rounded-3xl text-3xl font-extrabold text-white bg-[var(--color-primary)] disabled:opacity-30 transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-4"
          >
            {t('common.start_ordering', 'Start ordering')}
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Kiosk Menu (vertical layout) ─────────────── */
function KioskMenu({ customerName, onReset }: { customerName: string; onReset: () => void }) {
  const { storeId } = useParams<{ storeId: string }>();
  const { company } = useStoreConfig();
  const { i18n, t } = useTranslation();
  const { cart, submitOrder, resetCart, itemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [orderResult, setOrderResult] = useState<'success' | 'error' | 'closed' | null>(null);
  const [view, setView] = useState<View>('menu');
  const [productParams, setProductParams] = useState<ProductDetailParams | null>(null);
  // McDonald's-style upsell: when KioskProductDetail closes after an add it
  // hands back the just-added product. We pop a full-screen modal with its
  // linked upsells (and global pool) so the customer can stack a drink or
  // dessert in one tap before continuing to browse.
  const [upsellTrigger, setUpsellTrigger] = useState<Record<string, any> | null>(null);
  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: menu, isLoading } = useQuery({
    queryKey: ['kiosk-menu', storeId, i18n.language],
    queryFn: () => getKioskMenu(storeId!),
    enabled: !!storeId,
  });

  // Pre-cache product images so a brief Wi-Fi blip doesn't stall the kiosk.
  useEffect(() => {
    if (menu) precacheImages(collectMenuImageUrls(menu));
  }, [menu]);

  const categories = menu?.menu?.categories || [];
  const products = menu?.menu?.products || [];
  const options = menu?.menu?.options || [];

  const branding = getBranding(company);
  const showImages = branding.show_product_images;
  const showAllergens = branding.show_allergens;
  const allowNotes = branding.allow_notes;

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const product = products.find((p: any) => p.id === item.product);
      let price = product?.price || 0;
      if (item.options) {
        for (const [optId, qty] of Object.entries(item.options)) {
          for (const group of options) {
            const opt = group.items?.find((i: any) => i.id === Number(optId));
            if (opt?.price) price += opt.price * (qty as number);
          }
        }
      }
      return sum + price * item.quantity;
    }, 0);
  }, [cart, products, options]);

  // Set initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Intersection observer for category highlighting
  useEffect(() => {
    if (view !== 'menu') return;
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-category'));
            if (id) setActiveCategory(id);
          }
        }
      },
      { root: container, rootMargin: '-20% 0px -65% 0px' }
    );
    Object.values(categoryRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [products, view]);

  const scrollToCategory = useCallback((catId: number) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    const container = scrollRef.current;
    if (el && container) {
      const top = el.offsetTop - 12;
      container.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  const getProductOptions = (product: Record<string, any>) => {
    const optionIds = new Set([...(product.options || [])]);
    const cat = categories.find((c: any) => c.id === product.category);
    if (cat?.options) cat.options.forEach((id: number) => optionIds.add(id));
    return options.filter((o: any) => optionIds.has(o.id));
  };

  const onProductClick = (product: Record<string, any>) => {
    const productOptions = getProductOptions(product);
    setProductParams({ product, options: productOptions, mode: ADD, item: null });
    setView('product');
  };

  const onProductEditClick = (item: Record<string, any>) => {
    const productOptions = getProductOptions(item.product_data || {});
    setProductParams({ product: item.product_data, options: productOptions, mode: EDIT, item });
    setView('product');
  };

  const handleOrderConfirm = async () => {
    try {
      await submitOrder();
      setOrderResult('success');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const isClosed = Array.isArray(detail)
        ? detail.some((d: string) => d.toLowerCase().includes('closed'))
        : typeof detail === 'string' && detail.toLowerCase().includes('closed');
      setOrderResult(isClosed ? 'closed' : 'error');
    }
  };

  const handleOrderReset = useCallback(() => {
    resetCart();
    setOrderResult(null);
    setView('menu');
    onReset();
  }, [resetCart, onReset]);

  // Idle timer - 3 min inactivity
  useIdleTimer(handleOrderReset, 180_000);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#fafafa]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-[#fafafa] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-[var(--color-header)] text-[var(--color-header-text)] px-7 h-28 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4 min-w-0">
          {branding.logo && (
            <img src={branding.logo} alt={company?.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10" />
          )}
          <div className="min-w-0">
            <p className="text-base opacity-70 leading-none">👋 {t('common.hey', 'Hi')}</p>
            <p className="font-extrabold text-2xl leading-tight truncate mt-1.5 capitalize">{customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant="dark" />
        </div>
      </header>

      {/* Category strip */}
      <KioskCategoryNav categories={categories} activeId={activeCategory} onSelect={scrollToCategory} />

      {/* Products list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pt-7 pb-44">
        {categories.map((cat: Record<string, any>) => {
          const catProducts = products.filter((p: any) => p.category === cat.id);
          if (catProducts.length === 0) return null;
          return (
            <div
              key={cat.id}
              ref={el => { categoryRefs.current[cat.id] = el; }}
              data-category={cat.id}
              className="mb-10"
            >
              <h2 className="text-4xl font-extrabold mb-5 px-2 text-gray-900 capitalize">{cat.name}</h2>
              <div className="grid grid-cols-2 gap-5">
                {catProducts.map((product: Record<string, any>) => (
                  <CartCountWrapper key={product.id} productId={product.id}>
                    {(cartCount) => (
                      <KioskProductCard
                        product={product}
                        onClick={() => onProductClick(product)}
                        cartCount={cartCount}
                        showImages={showImages}
                      />
                    )}
                  </CartCountWrapper>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom cart bar */}
      {cart.length > 0 && (
        <button
          type="button"
          onClick={() => setView('cart')}
          className="absolute bottom-0 left-0 right-0 z-20 bg-[var(--color-primary)] text-white px-7 py-7 flex items-center justify-between gap-5 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] active:bg-[var(--color-primary-hover)] transition-colors kiosk-anim-fade-in-up"
        >
          <span className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-extrabold">
              {itemCount}
            </span>
            <span className="font-extrabold text-2xl">
              {t('common.view_order', 'View order')}
            </span>
          </span>
          <span className="font-black text-3xl flex items-center gap-3">
            {EURO}{(subtotal / 100).toFixed(2)}
            <span className="text-3xl">→</span>
          </span>
        </button>
      )}

      {/* Full-screen product detail */}
      {view === 'product' && productParams && (
        <KioskProductDetail
          params={productParams}
          showAllergens={showAllergens}
          allowNotes={allowNotes}
          onClose={(added) => {
            setView('menu');
            setProductParams(null);
            // Only fire the upsell flow on real adds (added is the product
            // object), not on cancel / edit-mode close.
            if (added) setUpsellTrigger(added);
          }}
        />
      )}

      {/* McDonald's-style "wil je er ... bij?" — fires once per add, self-
          closes if there are no suggestions for this product. */}
      {upsellTrigger && (
        <KioskUpsellModal
          menu={menu}
          triggerProduct={upsellTrigger}
          onClose={() => setUpsellTrigger(null)}
        />
      )}

      {/* Full-screen cart */}
      {view === 'cart' && (
        <KioskCartPage
          menu={menu}
          customerName={customerName}
          onEdit={(item) => onProductEditClick(item)}
          onConfirm={handleOrderConfirm}
          onClose={() => setView('menu')}
          allowNotes={allowNotes}
        />
      )}

      {/* Order result */}
      {orderResult && (
        <KioskOrderConfirmation type={orderResult} onReset={handleOrderReset} />
      )}
    </div>
  );
}

/* Helper to get cart count without breaking rules of hooks */
function CartCountWrapper({ productId, children }: { productId: number; children: (count: number) => React.ReactNode }) {
  const { cart } = useCart();
  const count = cart.filter(i => i.product === productId).reduce((s, i) => s + i.quantity, 0);
  return <>{children(count)}</>;
}

/* ─── Loading wrapper ─────────────────────────── */
function KioskConfigWrapper({ children }: { children: (company: any) => React.ReactNode }) {
  const { company, loading } = useStoreConfig();
  if (loading) return (
    <div className="theme-kiosk min-h-dvh flex items-center justify-center" style={{ background: '#0f0f1e' }}>
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return <>{children(company)}</>;
}

/* ─── Main kiosk page ─────────────────────────── */
export default function KioskPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [state, setState] = useState<KioskState>('idle');
  const [customerName, setCustomerName] = useState('');

  // Fluid scaling: root font-size scales with viewport so the entire UI
  // adapts to the kiosk hardware (1080×1920, 1440×2102, …) automatically.
  useEffect(() => {
    document.documentElement.classList.add('kiosk-fluid');
    return () => { document.documentElement.classList.remove('kiosk-fluid'); };
  }, []);

  const handleReset = useCallback(() => {
    setState('idle');
    setCustomerName('');
  }, []);

  if (!storeId) return null;

  return (
    <StoreConfigProvider storeId={storeId}>
      <KioskConfigWrapper>
        {(company) => {
          if (state === 'idle') {
            return <KioskIdle company={company} onStart={() => setState('name_entry')} />;
          }
          if (state === 'name_entry') {
            return (
              <KioskNameEntry
                company={company}
                onSubmit={(name) => { setCustomerName(name); setState('ordering'); }}
                onBack={() => setState('idle')}
              />
            );
          }
          return (
            <CartProvider storeId={storeId} orderType={KIOSK} customerName={customerName}>
              <KioskMenu customerName={customerName} onReset={handleReset} />
            </CartProvider>
          );
        }}
      </KioskConfigWrapper>
    </StoreConfigProvider>
  );
}

