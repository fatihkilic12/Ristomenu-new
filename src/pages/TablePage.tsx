import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COMPANY_MENU } from '@/config/paths';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';

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

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[100px] bg-[var(--color-primary)] pointer-events-none" />

      {/* Store name */}
      <div className="mb-10 text-center">
        {company?.img && (
          <img src={company.img} alt="" className="w-12 h-12 rounded-xl object-cover mx-auto mb-3 opacity-80" />
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

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
        {keys.map((key, i) => (
          <button
            key={i}
            onClick={() => onKey(key)}
            disabled={key === ''}
            className={`h-[56px] rounded-xl text-xl font-medium transition-all active:scale-95 ${
              key === ''
                ? 'invisible'
                : key === '⌫'
                  ? 'bg-white/5 text-white/50 hover:bg-white/10'
                  : 'bg-white/[0.07] text-white hover:bg-white/[0.12] backdrop-blur-sm'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!value}
        className="mt-8 w-full max-w-[280px] py-3.5 rounded-xl text-[15px] font-semibold text-white bg-[var(--color-primary)] disabled:opacity-20 transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-[var(--color-primary)]/20"
      >
        {t('common.continue', 'Continue')}
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
