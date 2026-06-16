import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getKioskMenu } from '@/actions/store';
import { useMenuRefresh } from '@/hooks/useMenuRefresh';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { KIOSK, ADD, EDIT, EURO } from '@/config/constants';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { getBranding } from '@/lib/branding';
import LanguageSelector from '@/components/shared/LanguageSelector';
import KioskCategorySidebar from '@/components/kiosk/KioskCategorySidebar';
import KioskProductCard from '@/components/kiosk/KioskProductCard';
import KioskProductDetail, { type ProductDetailParams } from '@/components/kiosk/KioskProductDetail';
import KioskCartPage from '@/components/kiosk/KioskCartPage';
import KioskOrderConfirmation from '@/components/kiosk/KioskOrderConfirmation';
import KioskUpsellModal from '@/components/kiosk/KioskUpsellModal';

type KioskState = 'idle' | 'name_entry' | 'ordering';
type View = 'menu' | 'product' | 'cart';
type KioskTheme = 'dark' | 'light';

// Theme tokens used by KioskIdle + KioskNameEntry. The header brand
// color and the primary CTA color come from the operator's branding
// vars (--color-primary / --color-header) regardless of theme — these
// only swap the background canvas + body text colour so a wide range
// of brand palettes look intentional on both themes.
const THEME_TOKENS: Record<KioskTheme, {
  bg: string;
  body: string; muted: string;
  inputBg: string; inputText: string; inputPlaceholder: string;
  surface: string;
}> = {
  dark: {
    bg: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f0f1e 60%, #050510 100%)',
    body: 'text-white',
    muted: 'text-white/70',
    inputBg: 'bg-white text-black',
    inputText: '',
    inputPlaceholder: 'placeholder:text-gray-300',
    surface: 'bg-white/10 backdrop-blur-md border border-white/20',
  },
  light: {
    // Warm off-white with a soft brand-leaning lavender wash at the
    // bottom — pure-white-on-white reads sterile, but a tinted base
    // anchors the radial-blob layer on top so the screen doesn't
    // feel like a blank document.
    bg: 'radial-gradient(ellipse 110% 80% at 50% 0%, #ffffff 0%, #fafafb 35%, #f1f1f5 65%, #ede9fe 100%)',
    body: 'text-slate-900',
    muted: 'text-slate-500',
    inputBg: 'bg-white text-slate-900',
    inputText: '',
    inputPlaceholder: 'placeholder:text-slate-400',
    // Tap-target surface: stronger soft shadow + brand-tinted ring so
    // it sits clearly above the canvas without breaking the airy feel.
    surface: 'bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-[0_8px_30px_-12px_rgba(99,102,241,0.25)]',
  },
};

/* ─── Idle / Welcome Screen ───────────────────── */
function KioskIdle({ company, theme, onStart }: { company: any; theme: KioskTheme; onStart: () => void }) {
  const { t, i18n } = useTranslation();
  const logo = getBranding(company).logo;
  const tokens = THEME_TOKENS[theme];

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
      className={`theme-kiosk min-h-dvh flex flex-col items-center justify-between px-8 py-10 relative cursor-pointer select-none overflow-hidden ${tokens.body}`}
      style={{ background: tokens.bg }}
      onClick={onStart}
    >
      {/* Animated background blobs — light mode uses pastel pigments at
          ~35% so they actually register against the off-white canvas;
          15% washed straight out. Dark mode keeps the saturated palette. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl kiosk-anim-blob ${theme === 'light' ? 'opacity-40' : 'opacity-30'}`}
          style={{ background: 'var(--color-primary, #6366f1)' }}
        />
        <div
          className={`absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full blur-3xl kiosk-anim-blob ${theme === 'light' ? 'opacity-35' : 'opacity-20'}`}
          style={{ background: theme === 'light' ? '#c7d2fe' : '#a855f7', animationDelay: '-4s' }}
        />
        <div
          className={`absolute -bottom-32 left-1/4 w-[380px] h-[380px] rounded-full blur-3xl kiosk-anim-blob ${theme === 'light' ? 'opacity-35' : 'opacity-25'}`}
          style={{ background: theme === 'light' ? '#fce7f3' : '#ec4899', animationDelay: '-8s' }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 w-full flex justify-end">
        <div onClick={e => e.stopPropagation()}>
          <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant={theme === 'light' ? 'light' : 'dark'} size="lg" />
        </div>
      </div>

      {/* Center hero */}
      <div className="relative z-10 flex flex-col items-center gap-10 text-center">
        {/* Logo with halo + float — smaller than the original, the
            text below is what does the wayfinding anyway. */}
        <div className="relative">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="relative max-h-44 max-w-sm w-auto object-contain drop-shadow-xl kiosk-anim-float"
            />
          ) : (
            <div className={`relative w-44 h-44 rounded-[2rem] backdrop-blur-sm flex items-center justify-center text-7xl shadow-2xl kiosk-anim-float ring-4 ${theme === 'light' ? 'bg-slate-100 ring-slate-200' : 'bg-white/10 ring-white/10'}`}>
              🍔
            </div>
          )}
        </div>

        {/* Order CTA - cycling languages (primary) */}
        <div className="relative">
          <div className={`text-8xl font-black tracking-tight kiosk-anim-pulse-soft leading-none ${tokens.body}`}>
            <span key={phraseIdx} className="inline-block kiosk-anim-fade-in-up">
              {phrases[phraseIdx]}
            </span>
          </div>
        </div>

        {/* Store name + welcome (secondary) */}
        <div className="kiosk-anim-fade-in-up">
          <p className={`text-2xl uppercase tracking-[0.3em] font-bold mb-3 ${tokens.muted}`}>
            {t('common.welcome_to', 'Welcome to')}
          </p>
          <h1 className={`text-5xl font-extrabold tracking-tight leading-none capitalize ${tokens.body}`}>
            {company?.name || t('common.welcome', 'Welcome')}
          </h1>
          {getBranding(company).welcome_message && (
            <p className={`text-xl mt-5 max-w-2xl mx-auto leading-relaxed ${tokens.muted}`}>
              {getBranding(company).welcome_message}
            </p>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 flex flex-col items-center gap-5 kiosk-anim-tap">
        <div className={`px-16 py-8 rounded-full ${tokens.surface} ${tokens.body} text-3xl font-bold flex items-center gap-4 shadow-2xl`}>
          <span className="text-4xl">👆</span>
          <span>{t('common.tap_to_start', 'Tap anywhere to start')}</span>
        </div>
        <div className="flex gap-2.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full kiosk-anim-pulse-soft ${theme === 'light' ? 'bg-slate-400/60' : 'bg-white/40'}`}
              style={{ animationDelay: `${-i * 0.4}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Name Entry Screen ───────────────────────── */
function KioskNameEntry({ company, theme, onSubmit, onBack }: { company: any; theme: KioskTheme; onSubmit: (name: string) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const logo = getBranding(company).logo;
  const tokens = THEME_TOKENS[theme];

  return (
    <div
      className={`theme-kiosk min-h-dvh flex flex-col px-6 py-8 relative overflow-hidden ${tokens.body}`}
      style={{ background: tokens.bg }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl kiosk-anim-blob ${theme === 'light' ? 'opacity-15' : 'opacity-25'}`}
          style={{ background: theme === 'light' ? 'var(--color-primary, #6366f1)' : '#6366f1' }}
        />
        <div
          className={`absolute -bottom-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl kiosk-anim-blob ${theme === 'light' ? 'opacity-15' : 'opacity-20'}`}
          style={{ background: theme === 'light' ? '#fbcfe8' : '#ec4899', animationDelay: '-6s' }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className={`w-20 h-20 rounded-2xl flex items-center justify-center ${tokens.surface} ${tokens.body} ${theme === 'light' ? 'active:bg-slate-100' : 'active:bg-white/20'}`}
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant={theme === 'light' ? 'light' : 'dark'} size="lg" />
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center kiosk-anim-fade-in-up">
        {logo && (
          <img src={logo} alt="" className="max-h-40 max-w-xs w-auto object-contain mb-10 drop-shadow-xl" />
        )}
        <h1 className={`text-6xl font-extrabold text-center leading-tight ${tokens.body}`}>
          👋 {t('common.welcome_personal', 'Hey there!')}
        </h1>
        <p className={`text-2xl text-center mt-5 max-w-2xl leading-relaxed ${tokens.muted}`}>
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
            className={`w-full px-8 py-8 rounded-3xl text-4xl font-bold text-center ${tokens.inputBg} ${tokens.inputPlaceholder} focus:outline-none focus:ring-4 ${theme === 'light' ? 'focus:ring-slate-300 shadow-md' : 'focus:ring-white/30 shadow-2xl'}`}
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

// CSS-var tokens for the menu shell — consumed by KioskCategorySidebar,
// KioskProductCard, KioskCartPage etc. via var(--kiosk-*). Defined here
// (not in THEME_TOKENS above) because the welcome theme and the menu
// theme are independent fields — the operator might pick dark welcome
// + light menu, or vice versa.
const MENU_SHELL_VARS: Record<KioskTheme, Record<string, string>> = {
  light: {
    '--kiosk-shell-bg': '#fafafa',
    '--kiosk-sidebar-bg': '#ffffff',
    '--kiosk-card-bg': '#ffffff',
    '--kiosk-card-shadow': '0 2px 10px rgba(0,0,0,0.04)',
    '--kiosk-border': '#f3f4f6',
    '--kiosk-text': '#111827',
    '--kiosk-text-muted': '#6b7280',
    '--kiosk-muted': '#d1d5db',
  },
  dark: {
    '--kiosk-shell-bg': '#0b1220',
    '--kiosk-sidebar-bg': '#111b2f',
    '--kiosk-card-bg': '#1a2540',
    '--kiosk-card-shadow': '0 4px 18px rgba(0,0,0,0.45)',
    '--kiosk-border': 'rgba(255,255,255,0.06)',
    '--kiosk-text': '#f1f5f9',
    '--kiosk-text-muted': '#94a3b8',
    '--kiosk-muted': '#475569',
  },
};

/* ─── Kiosk Menu (vertical layout) ─────────────── */
function KioskMenu({ customerName, menuTheme, onReset }: { customerName: string; menuTheme: KioskTheme; onReset: () => void }) {
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

  useMenuRefresh(storeId);
  const { data: menu, isLoading } = useQuery({
    queryKey: ['kiosk-menu', storeId, i18n.language],
    queryFn: () => getKioskMenu(storeId!),
    enabled: !!storeId,
  });

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
    <div
      className="h-dvh flex flex-col overflow-hidden"
      style={{
        ...(MENU_SHELL_VARS[menuTheme] as React.CSSProperties),
        background: 'var(--kiosk-shell-bg)',
        color: 'var(--kiosk-text)',
      }}
    >
      {/* Header — the just-typed customer name takes the hero slot.
          They literally just confirmed it on the previous screen, so
          seeing 'Hi <smol>name</smol>' would feel impersonal. Bigger
          name = the screen recognises *them*. */}
      <header className="shrink-0 bg-[var(--color-header)] text-[var(--color-header-text)] px-8 h-32 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-5 min-w-0">
          {branding.logo && (
            <img src={branding.logo} alt={company?.name} className="max-h-20 max-w-[180px] w-auto object-contain" />
          )}
          <div className="min-w-0">
            <p className="text-lg opacity-60 leading-none uppercase tracking-wider font-semibold">
              👋 {t('common.hey', 'Hi')}
            </p>
            <p className="font-black text-4xl leading-tight truncate mt-2 capitalize">{customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant="dark" size="lg" />
        </div>
      </header>

      {/* Body — vertical sidebar (categories) + 2-col product grid.
          McDonald's kiosk pattern: the customer's eye line stays in
          the same column band, only scanning down the products on the
          right while the sidebar provides peripheral context. No head
          movement across the full screen width. */}
      <div className="flex-1 min-h-0 flex">
        <KioskCategorySidebar categories={categories} activeId={activeCategory} onSelect={scrollToCategory} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-7 pt-7 pb-44">
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
                <h2 className="text-4xl font-extrabold mb-5 px-2 capitalize" style={{color: 'var(--kiosk-text)'}}>{cat.name}</h2>
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
      </div>

      {/* Sticky bottom cart bar — green + explicit cart icon. Same
          rationale as CartMobileBar: kiosk customers were skipping the
          bottom bar entirely because the brand-coloured background read
          as "another menu option" rather than "checkout". Green + the
          basket symbol forces the cart affordance. */}
      {cart.length > 0 && (
        <button
          type="button"
          onClick={() => setView('cart')}
          className="absolute bottom-0 left-0 right-0 z-20 bg-green-500 text-white px-7 py-7 flex items-center justify-between gap-5 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] active:bg-green-600 transition-colors kiosk-anim-fade-in-up"
        >
          <span className="flex items-center gap-4">
            <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
              </svg>
              <span className="absolute -top-2 -right-2 bg-white text-green-700 rounded-full min-w-7 h-7 px-2 flex items-center justify-center text-base font-extrabold leading-none ring-2 ring-green-500">
                {itemCount}
              </span>
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

  // Wipe the persisted kiosk cart whenever the kiosk lands on the idle
  // screen — handles: initial mount after a refresh / crash, the back
  // button out of name_entry, the idle-timer reset, and the manual
  // "Order again" tap on the confirmation screen. Customer N+1 should
  // never see anything customer N left behind.
  useEffect(() => {
    if (state === 'idle' && storeId) {
      try { localStorage.removeItem(`cart-${storeId}`); } catch { /* private mode */ }
    }
  }, [state, storeId]);

  if (!storeId) return null;

  return (
    <StoreConfigProvider storeId={storeId}>
      <KioskConfigWrapper>
        {(company) => {
          // Two independent fields on KioskSettings: `theme` drives the
          // welcome / name-entry canvas, `menu_theme` drives the menu
          // shell after the customer is in. Defaults match the model
          // defaults (welcome=dark, menu=light) so stores that haven't
          // touched either still get the existing look.
          const theme: KioskTheme = (company?.kiosk_settings?.theme === 'light') ? 'light' : 'dark';
          const menuTheme: KioskTheme = (company?.kiosk_settings?.menu_theme === 'dark') ? 'dark' : 'light';
          if (state === 'idle') {
            return <KioskIdle company={company} theme={theme} onStart={() => setState('name_entry')} />;
          }
          if (state === 'name_entry') {
            return (
              <KioskNameEntry
                company={company}
                theme={theme}
                onSubmit={(name) => { setCustomerName(name); setState('ordering'); }}
                onBack={() => setState('idle')}
              />
            );
          }
          return (
            <CartProvider storeId={storeId} orderType={KIOSK} customerName={customerName}>
              <KioskMenu customerName={customerName} menuTheme={menuTheme} onReset={handleReset} />
            </CartProvider>
          );
        }}
      </KioskConfigWrapper>
    </StoreConfigProvider>
  );
}

