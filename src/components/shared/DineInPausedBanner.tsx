import { useTranslation } from 'react-i18next';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { getDineInPause } from '@/lib/dineIn';

const formatTime = (d: Date): string => {
  try {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// Shown at the top of the menu when the operator has paused dine-in from
// the Portal home. The menu stays browsable — the cart is hidden upstream —
// so customers can still read descriptions, allergens and prices but can't
// place an order until the kitchen catches up.
export default function DineInPausedBanner() {
  const { company } = useStoreConfig();
  const { t } = useTranslation();
  const { paused, reason, pausedUntil } = getDineInPause(company);

  if (!paused) return null;

  return (
    <div
      role="status"
      className="bg-orange-50 border-b-2 border-orange-300 px-4 py-3 sticky top-0 z-30"
    >
      <div className="max-w-5xl mx-auto flex items-start gap-3">
        <span aria-hidden className="text-2xl leading-none">⏸</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-orange-900 leading-tight">
            {t('menu.dinein_paused.title', {
              defaultValue: 'Bestellingen tijdelijk gepauzeerd',
            })}
          </p>
          <p className="text-xs text-orange-800 mt-0.5">
            {reason ||
              t('menu.dinein_paused.default_reason', {
                defaultValue:
                  'De keuken is even druk. Bekijk gerust het menu — we hervatten zo snel mogelijk.',
              })}
            {pausedUntil && (
              <>
                {' · '}
                <span className="font-semibold">
                  {t('menu.dinein_paused.until', {
                    time: formatTime(pausedUntil),
                    defaultValue: `Hervatten rond ${formatTime(pausedUntil)}`,
                  })}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
