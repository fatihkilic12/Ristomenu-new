/**
 * Effective minimum-order-value helper.
 *
 * For delivery, the customer's chosen postal code can match a `Region` row on
 * the store with `override_min_order_value` set (integer cents). When it does,
 * that override wins over `delivery_settings.min_order_value`. Pickup has no
 * min-order concept today, so this returns 0 for any non-delivery channel.
 *
 * The cart panel doesn't know the customer's postal code yet — they enter it
 * on the CheckoutPage — so most callers pass `postalCode` as `undefined` and
 * get the channel default. The CheckoutPage passes the typed value once it's
 * non-empty.
 *
 * TODO(regions): the matching here is a strict equality compare against
 * `region.postal_codes`. The backend allows wildcard / range syntax in that
 * field (e.g. "2000-2099"); if/when we want to honor those on the client too,
 * extend `matchesPostal` rather than the caller.
 */

import { DELIVERY } from '@/config/constants';

type Region = {
  postal_codes?: string[] | string | null;
  override_min_order_value?: number | null;
  override_delivery_fee?: number | null;
};

type DeliverySettings = {
  min_order_value?: number;
} | null | undefined;

function matchesPostal(region: Region, postalCode: string): boolean {
  if (!region?.postal_codes) return false;
  const haystack = Array.isArray(region.postal_codes)
    ? region.postal_codes
    : String(region.postal_codes).split(/[,\s]+/);
  const needle = postalCode.trim().toLowerCase();
  if (!needle) return false;
  return haystack.some(code => String(code).trim().toLowerCase() === needle);
}

/**
 * Returns the min-order-value in cents that the customer must meet to check
 * out. `0` means "no minimum" (or non-delivery channel).
 */
export function getEffectiveMinOrder(
  orderType: string,
  deliverySettings: DeliverySettings,
  regions?: Region[] | null,
  postalCode?: string,
): number {
  if (orderType !== DELIVERY) return 0;
  const base = deliverySettings?.min_order_value || 0;

  if (postalCode && regions?.length) {
    const match = regions.find(r => matchesPostal(r, postalCode));
    const override = match?.override_min_order_value;
    if (typeof override === 'number' && override > 0) return override;
  }

  return base;
}
