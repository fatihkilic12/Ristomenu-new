import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getKioskMenu } from '@/actions/store';
import { useMenuRefresh } from '@/hooks/useMenuRefresh';
import { useIsTabletMode } from '@/hooks/useIsTabletMode';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { KIOSK } from '@/config/constants';
import { COMPANY_TABLE } from '@/config/paths';
import { getBranding } from '@/lib/branding';
import MenuView from '@/components/menu/MenuView';
import LanguageSelector from '@/components/shared/LanguageSelector';
import OrderResultModal from '@/components/shared/OrderResultModal';

// Kiosk-takeout fallback that re-uses the dine-in tablet's design. Two
// states:
//   1. name_entry — operator hands the tablet to the customer, customer
//      types their name (required by the server for kiosk orders).
//   2. ordering   — customer browses the dine-in-styled MenuView and
//      places an order with order_type=kiosk; the server's create-order
//      view picks the next available table from KioskSettings.table_pool
//      so the kitchen ticket still routes through the kiosk pipeline.
//
// Why not just send the customer to /kiosk? Because /kiosk uses the
// dedicated kiosk visual theme (large idle attract, full-screen sidebar
// nav, brand attract loop). Operators want a quieter takeout flow they
// can hand off mid-service when the real kiosk queue is too long but
// the customer still wants the same lightweight menu surface as a
// seated guest.

function NameEntry({onSubmit, onCancel}: {onSubmit: (name: string) => void; onCancel: () => void}) {
    const {company} = useStoreConfig();
    const {t} = useTranslation();
    const [name, setName] = useState('');
    const logo = getBranding(company).logo;

    const submit = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
    };

    return (
        <div
            className="min-h-dvh flex flex-col items-center justify-center px-6"
            style={{
                backgroundColor: '#0a0a0a',
                backgroundImage:
                    'radial-gradient(circle at 50% 25%, color-mix(in srgb, var(--color-primary) 6%, transparent) 0%, transparent 55%)',
            }}
        >
            <div className="mb-10 text-center">
                {logo && (
                    <img src={logo} alt="" className="w-full max-h-15 object-contain mb-6 opacity-80"/>
                )}
                <p className="text-white/30 text-xs font-medium uppercase tracking-[0.2em]">
                    {t('common.takeaway_name_label', 'Naam voor afhalen')}
                </p>
            </div>

            <div className="w-full max-w-[420px]">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                    }}
                    autoFocus
                    placeholder={t('common.your_name', 'Je naam')}
                    className="w-full h-[72px] rounded-2xl text-2xl font-medium text-white bg-white/[0.10] placeholder:text-white/30 px-6 outline-none focus:bg-white/[0.14]"
                    maxLength={64}
                />
                <button
                    type="button"
                    onClick={submit}
                    disabled={!name.trim()}
                    className="mt-6 w-full h-[72px] rounded-2xl text-lg font-bold bg-white text-black shadow-[0_10px_30px_-6px_rgba(255,255,255,0.25)] disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none transition-transform duration-75 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    <span>{t('common.continue', 'Doorgaan')}</span>
                    <span aria-hidden className="text-xl leading-none">→</span>
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="mt-4 w-full py-3 rounded-2xl text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
                >
                    {t('common.back', 'Terug')}
                </button>
            </div>
        </div>
    );
}

function KioskTableContent({customerName, onReset, onExit}: {
    customerName: string;
    onReset: () => void;
    onExit: () => void;
}) {
    const {storeId} = useParams<{storeId: string}>();
    const {company} = useStoreConfig();
    const {t, i18n} = useTranslation();
    const {submitOrder, resetCart} = useCart();
    const [result, setResult] = useState<'success' | 'error' | 'closed' | null>(null);
    const isTablet = useIsTabletMode();

    useMenuRefresh(storeId);

    // Tablet recovery — same 5-finger-double-tap gesture as DineInPage so
    // an operator can yank the tablet out of kiosk-fallback mode if the
    // customer walks away or the device gets stuck mid-flow. Only armed
    // in tablet mode (?tablet=1) so a customer on their own phone can't
    // accidentally bail. Strict gesture: two completed 5-finger taps
    // within 5 seconds, both inside 1.5s each — partial / phantom
    // touches never poison the streak.
    useEffect(() => {
        if (!isTablet) return;
        let tapCount = 0;
        let firstTapAt = 0;
        let maxTouchesInGesture = 0;
        let gestureStartedAt = 0;
        const WINDOW_MS = 5000;
        const REQUIRED_TAPS = 2;
        const TAP_MAX_DURATION_MS = 1500;
        const resetGesture = () => {maxTouchesInGesture = 0; gestureStartedAt = 0;};

        const onTouchStart = (e: TouchEvent) => {
            const len = e.touches?.length ?? 0;
            if (len > maxTouchesInGesture) {
                maxTouchesInGesture = len;
                if (gestureStartedAt === 0) gestureStartedAt = Date.now();
            }
            if (len >= 5) {e.preventDefault(); e.stopPropagation();}
        };
        const onTouchEnd = (e: TouchEvent) => {
            if ((e.touches?.length ?? 0) > 0) return;
            const wasFive = maxTouchesInGesture >= 5 && gestureStartedAt > 0
                && Date.now() - gestureStartedAt <= TAP_MAX_DURATION_MS;
            resetGesture();
            if (!wasFive) return;
            const now = Date.now();
            if (now - firstTapAt > WINDOW_MS) {tapCount = 1; firstTapAt = now;}
            else tapCount += 1;
            if (tapCount >= REQUIRED_TAPS) {
                tapCount = 0; firstTapAt = 0;
                onExit();
            }
        };
        const onTouchCancel = () => resetGesture();
        window.addEventListener('touchstart', onTouchStart, {passive: false, capture: true});
        window.addEventListener('touchend', onTouchEnd, {passive: true, capture: true});
        window.addEventListener('touchcancel', onTouchCancel, {passive: true, capture: true});
        return () => {
            window.removeEventListener('touchstart', onTouchStart, {capture: true} as any);
            window.removeEventListener('touchend', onTouchEnd, {capture: true} as any);
            window.removeEventListener('touchcancel', onTouchCancel, {capture: true} as any);
        };
    }, [isTablet, onExit]);

    // Same revalidation strategy as DineInPage — operator may hide a
    // product mid-service and the customer must see the change on the
    // next focus / mount.
    const {data: menu, isLoading: menuLoading} = useQuery({
        queryKey: ['kiosk-menu', storeId, i18n.language],
        queryFn: () => getKioskMenu(storeId!),
        enabled: !!storeId,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    const handleConfirm = async () => {
        try {
            await submitOrder();
            setResult('success');
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            const isClosed = Array.isArray(detail)
                ? detail.some((d: string) => d.toLowerCase().includes('closed'))
                : typeof detail === 'string' && detail.toLowerCase().includes('closed');
            setResult(isClosed ? 'closed' : 'error');
        }
    };

    const handleResultClose = () => {
        if (result === 'success') {
            resetCart();
            // After a successful takeout order, drop the customer back
            // to the table-picker so the next guest gets a clean slate.
            onReset();
        }
        setResult(null);
    };

    const logo = getBranding(company).logo;

    return (
        <div className="min-h-dvh bg-[#fafafa]">
            <header className="sticky top-0 z-50 bg-[var(--color-header)] text-[var(--color-header-text)] px-3 sm:px-4 h-20 grid grid-cols-3 items-center shadow-sm">
                {/* Left: "→ Afhalen" pill + customer name. Tap reopens the
                    name entry so a customer who mis-typed their name can
                    correct it without bailing out of the order entirely.
                    The dine-in QR equivalent has no such button — the
                    table number can't be changed mid-order — so this
                    pattern is unique to the kiosk-fallback flow. */}
                <div className="justify-self-start min-w-0">
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors px-3 py-2 rounded-full text-sm font-bold whitespace-nowrap max-w-full"
                        aria-label={t('common.change_name', 'Naam wijzigen')}
                    >
                        <span aria-hidden>→</span>
                        <span>{t('common.takeaway', 'Afhalen')}</span>
                        {customerName && (
                            <>
                                <span className="opacity-50">·</span>
                                <span className="truncate max-w-[120px]">{customerName}</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="justify-self-center min-w-0">
                    {logo ? (
                        <img
                            src={logo}
                            alt={company?.name}
                            className="max-h-10 w-auto max-w-[40vw] object-contain"
                        />
                    ) : (
                        <span className="font-bold text-lg capitalize">{company?.name}</span>
                    )}
                </div>
                <div className="justify-self-end flex items-center gap-2">
                    <LanguageSelector
                        languages={company?.languages || []}
                        defaultLang={company?.default_lang}
                        variant="dark"
                    />
                    {/* Hard exit — back to /table. Confirmation prompt
                        because tapping it dumps the cart. Visible on
                        every screen size so the customer / operator
                        always has an explicit way out instead of relying
                        on the 5-finger tablet gesture (which only works
                        in ?tablet=1 mode). */}
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm(t('common.exit_kiosk_confirm', 'Bestelling annuleren en terug naar tafelkeuze?'))) {
                                onExit();
                            }
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-current/80 hover:bg-white/10 active:bg-white/15 transition-colors"
                        aria-label={t('common.exit', 'Sluiten')}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </header>
            <MenuView menu={menu} menuLoading={menuLoading} onOrderConfirm={handleConfirm}/>
            <OrderResultModal result={result} onClose={handleResultClose}/>
        </div>
    );
}

function KioskTableBody() {
    const {storeId} = useParams<{storeId: string}>();
    const navigate = useNavigate();
    const [customerName, setCustomerName] = useState('');
    const [stage, setStage] = useState<'name' | 'ordering'>('name');

    // Wipe persisted cart whenever we reset back to name entry — every
    // takeout customer starts on a clean state, never sees the previous
    // person's selections.
    useEffect(() => {
        if (stage === 'name' && storeId) {
            try {
                localStorage.removeItem(`cart-${storeId}`);
            } catch {/* private mode */}
        }
    }, [stage, storeId]);

    if (!storeId) return null;

    if (stage === 'name') {
        return (
            <NameEntry
                onSubmit={(name) => {
                    setCustomerName(name);
                    setStage('ordering');
                }}
                onCancel={() => navigate(COMPANY_TABLE(storeId))}
            />
        );
    }

    return (
        <CartProvider storeId={storeId} orderType={KIOSK} customerName={customerName}>
            <KioskTableContent
                customerName={customerName}
                onReset={() => {
                    // Wipe the cart on every "edit name" tap so the new
                    // identity doesn't inherit the previous draft of
                    // items — saves operators from confused "but I
                    // never ordered fries" complaints.
                    try {storeId && localStorage.removeItem(`cart-${storeId}`);} catch {/* private mode */}
                    setCustomerName('');
                    setStage('name');
                }}
                onExit={() => {
                    try {storeId && localStorage.removeItem(`cart-${storeId}`);} catch {/* private mode */}
                    navigate(COMPANY_TABLE(storeId!));
                }}
            />
        </CartProvider>
    );
}

export default function KioskTablePage() {
    const {storeId} = useParams<{storeId: string}>();
    if (!storeId) return null;
    return (
        <StoreConfigProvider storeId={storeId}>
            <KioskTableBody/>
        </StoreConfigProvider>
    );
}
