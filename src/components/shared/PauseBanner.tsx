import { useTranslation } from 'react-i18next';
import { DELIVERY, PICKUP } from '@/config/constants';
import { isChannelPaused, formatPauseUntil, type ChannelSettings } from '@/lib/pause';

type Props = {
  /** The currently selected order channel. */
  orderType: string;
  /** Delivery settings from store config. */
  deliverySettings?: ChannelSettings | null;
  /** Pickup settings from store config. */
  pickupSettings?: ChannelSettings | null;
  /** Visual variant — `inline` for top-of-page, `compact` for inside cart panels. */
  variant?: 'inline' | 'compact';
};

/**
 * Warning banner shown when the customer's currently selected channel is
 * paused server-side. Hides itself otherwise — so it's safe to mount
 * unconditionally on any page where the customer can build a cart.
 *
 * Pause source-of-truth is the server's `is_paused` flag — we don't
 * re-compare timestamps here. Empty/missing `pause_reason` is fine, the
 * copy degrades to "Tijdelijk niet beschikbaar" without a suffix.
 */
export default function PauseBanner({ orderType, deliverySettings, pickupSettings, variant = 'inline' }: Props) {
  const { t } = useTranslation();

  const channel = orderType === DELIVERY ? deliverySettings : orderType === PICKUP ? pickupSettings : null;
  if (!channel || !isChannelPaused(channel)) return null;

  const reason = (channel.pause_reason || '').trim();
  const until = formatPauseUntil(channel.paused_until);

  // Channel-specific lead-in: "Delivery is currently unavailable" vs "Pickup is …"
  const lead = orderType === DELIVERY
    ? t('pause.banner.delivery_unavailable', 'Delivery is currently unavailable')
    : t('pause.banner.pickup_unavailable', 'Pickup is currently unavailable');

  // Channel-specific tail suggesting the other option (only meaningful in body copy)
  const tail = orderType === DELIVERY
    ? t('pause.banner.try_pickup', 'Try pickup or come back later.')
    : t('pause.banner.try_delivery', 'Try delivery or come back later.');

  const isCompact = variant === 'compact';

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-200 ${
        isCompact ? 'p-3 text-xs' : 'p-4 text-sm'
      }`}
    >
      <span aria-hidden className="text-base leading-none mt-0.5">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">
          {lead}
          {reason ? ` — ${reason}` : ''}.
        </p>
        {!isCompact && (
          <p className="opacity-80 mt-1 leading-snug">
            {tail}
            {until && (
              <>
                {' '}
                {t('pause.banner.try_again_after', 'Try again after {{time}}.', { time: until })}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
