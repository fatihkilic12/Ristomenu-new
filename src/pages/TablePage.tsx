import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COMPANY_MENU, COMPANY_KIOSK_TABLE } from '@/config/paths';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { getBranding } from '@/lib/branding';

const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

function TableContent() {
  const { storeId } = useParams<{ storeId: string }>();
  const { company } = useStoreConfig();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const onKey = (key: string) => {
    if (key === '⌫') return setValue(v => v.slice(0, -1));
    if (key === '') return;
    if (value.length < 4) setValue(v => v + key);
  };

  const onSubmit = () => {
    if (value && storeId) navigate(COMPANY_MENU(storeId, value));
  };

  const logo = getBranding(company).logo;

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{
        backgroundColor: '#0a0a0a',
        backgroundImage:
          'radial-gradient(circle at 50% 25%, color-mix(in srgb, var(--color-primary) 6%, transparent) 0%, transparent 55%)',
      }}
    >
      {/* Store name */}
      <div className="mb-10 text-center">
        {logo && (
          <img src={logo} alt="" className="w-full max-h-15 object-contain mb-6 opacity-80" />
        )}
        <p className="text-white/30 text-xs font-medium uppercase tracking-[0.2em]">{t('common.table_number', 'Table number')}</p>
      </div>

      {/* Display */}
      <div className="h-20 flex items-center justify-center mb-10">
        {value ? (
          <span className="text-white text-6xl font-light tracking-[0.15em] tabular-nums">{value}</span>
        ) : (
          <span className="text-white/10 text-6xl font-light">—</span>
        )}
      </div>

      {/* Numpad — larger touch targets so guests can tap accurately
          without leaning in. h-[72px] + text-2xl is the same size as
          the kiosk keypad. */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[340px]">
        {keys.map((key, i) => (
          <button
            key={i}
            onClick={() => onKey(key)}
            disabled={key === ''}
            className={`h-[72px] rounded-2xl text-2xl font-medium transition-transform duration-75 active:scale-95 ${
              key === ''
                ? 'invisible'
                : key === '⌫'
                  ? 'bg-white/5 text-white/60'
                  : 'bg-white/[0.10] text-white'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Submit — fills white with brand-primary glow + text so it
          stays visible against the near-black canvas even when the
          operator's brand primary is itself near-black (Mevlana's
          palette). Using brand-primary as a *fill* on the previous
          version made the button blend into the canvas. */}
      <button
        onClick={onSubmit}
        disabled={!value}
        className="mt-10 w-full max-w-[340px] h-[72px] rounded-2xl text-lg font-bold bg-white text-black shadow-[0_10px_30px_-6px_rgba(255,255,255,0.25)] disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none transition-transform duration-75 active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <span>{t('common.continue', 'Doorgaan')}</span>
        <span aria-hidden className="text-xl leading-none">→</span>
      </button>

      {/* Kiosk-mode escape hatch — when the actual kiosk is too busy the
          operator can repurpose any dine-in tablet as a takeaway kiosk.
          Tap → name entry → dine-in menu UI but with order_type=kiosk on
          submit so the server assigns a kiosk-pool table.
          Rendered as a quiet secondary action under the primary numpad
          flow so an actual seated guest doesn't get distracted by it. */}
      <button
        type="button"
        onClick={() => storeId && navigate(COMPANY_KIOSK_TABLE(storeId))}
        className="mt-6 w-full max-w-[340px] py-3 rounded-2xl text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
      >
        <span aria-hidden>↗</span>
        <span>{t('common.kiosk_takeaway', 'Bestel om mee te nemen')}</span>
      </button>
    </div>
  );
}

export default function TablePage() {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return null;
  return (
    <StoreConfigProvider storeId={storeId}>
      <TableContent />
    </StoreConfigProvider>
  );
}
