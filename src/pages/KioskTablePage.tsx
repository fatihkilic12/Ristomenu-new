import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getKioskMenu } from '@/actions/store';
import { useMenuRefresh } from '@/hooks/useMenuRefresh';
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

function KioskTableContent({customerName, onReset}: {customerName: string; onReset: () => void}) {
    const {storeId} = useParams<{storeId: string}>();
    const {company} = useStoreConfig();
    const {t, i18n} = useTranslation();
    const {submitOrder, resetCart} = useCart();
    const [result, setResult] = useState<'success' | 'error' | 'closed' | null>(null);

    useMenuRefresh(storeId);

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
                {/* Left: "→ Afhalen" pill + customer name. Replaces the
                    dine-in table badge so kitchen + staff at-a-glance see
                    this is a takeout customer using the dine-in tablet. */}
                <div className="justify-self-start min-w-0">
                    <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-full text-sm font-bold whitespace-nowrap max-w-full">
                        <span aria-hidden>→</span>
                        <span>{t('common.takeaway', 'Afhalen')}</span>
                        {customerName && (
                            <>
                                <span className="opacity-50">·</span>
                                <span className="truncate max-w-[120px]">{customerName}</span>
                            </>
                        )}
                    </span>
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
                <div className="justify-self-end">
                    <LanguageSelector
                        languages={company?.languages || []}
                        defaultLang={company?.default_lang}
                        variant="dark"
                    />
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
                    setCustomerName('');
                    setStage('name');
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
