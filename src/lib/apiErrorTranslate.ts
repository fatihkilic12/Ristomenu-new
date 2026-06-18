// Server returns its DRF validation messages in English. The customer
// shouldn't see "Delivery is not available in your area." when they're
// reading the storefront in Dutch — this module translates the known
// phrases to whatever language the i18n provider is set to.
//
// Match patterns:
//   - Exact strings → mapped to i18n keys
//   - Regex patterns for messages that interpolate a value (channel name,
//     min lead time, min order amount, etc.) → captured groups feed the
//     translation's interpolation slots.
//
// Unknown messages fall through unchanged so we never blank the operator.
//
// Server messages live in:
//   Server/StoreFront/serializers/DeliveryOrderCreateSerializer.py
//   Server/StoreFront/serializers/BaseOrderCreateSerializer.py
//   Server/StoreFront/serializers/KioskOrderCreateSerializer.py
// Keep this list in sync when you add or change a ValidationError on the
// server side.

type TFunc = (key: string, options?: any) => string;

type Rule = {
    pattern: string | RegExp;
    key: string;
    // Maps regex capture groups (1-indexed) to interpolation variable
    // names for the i18n template. Only used for regex rules.
    captures?: Record<number, string>;
    // Optional transform applied to a captured value before
    // interpolation. Used to format the min-order-amount (cents → euros).
    transform?: Record<string, (raw: string) => string>;
};

const RULES: ReadonlyArray<Rule> = [
    // --- Store-level / channel availability ---
    {pattern: 'The store is currently closed for this order type.', key: 'api_errors.store_closed_for_channel'},
    {pattern: 'This store has not subscribed to the delivery/pickup module.', key: 'api_errors.module_not_subscribed'},
    {pattern: /^Store does not support (\w+) orders\.$/, key: 'api_errors.channel_not_supported', captures: {1: 'channel'}},
    {pattern: 'Temporarily not accepting orders.', key: 'api_errors.temporarily_paused'},

    // --- Delivery address / regions ---
    {pattern: 'Delivery address is required for delivery orders.', key: 'api_errors.delivery_address_required'},
    {pattern: 'This store has not configured any delivery regions yet.', key: 'api_errors.no_regions_configured'},
    {pattern: 'Delivery is not available in your area.', key: 'api_errors.outside_region'},

    // --- Minimum order ---
    {
        pattern: /^Minimum order value is (\d+(?:\.\d+)?) EUR\.$/,
        key: 'api_errors.min_order_value',
        captures: {1: 'amount'},
    },

    // --- Contact + payment ---
    {pattern: 'Contact information is required.', key: 'api_errors.contact_required'},
    {pattern: 'Payment method not enabled for this store.', key: 'api_errors.payment_method_not_enabled'},
    {
        pattern: /^Payment method (\S+) is not available for (\w+)\.$/,
        key: 'api_errors.payment_method_not_for_channel',
        captures: {1: 'method', 2: 'channel'},
    },

    // --- Pre-orders / desired_time ---
    {pattern: 'Desired time must be in the future.', key: 'api_errors.desired_time_in_past'},
    {pattern: 'Pre-orders cannot be more than 14 days in advance.', key: 'api_errors.desired_time_too_far'},
    {pattern: 'Pre-orders are not available.', key: 'api_errors.preorder_not_available'},
    {
        pattern: /^Pre-orders are not available for (\w+)\.$/,
        key: 'api_errors.preorder_not_available_channel',
        captures: {1: 'channel'},
    },
    {
        pattern: /^Desired time must be at least (\d+) minutes from now\.$/,
        key: 'api_errors.desired_time_too_soon',
        captures: {1: 'minutes'},
    },

    // --- Item / product availability ---
    {pattern: 'Item is sold out', key: 'api_errors.item_sold_out'},
    {pattern: 'Product is sold out', key: 'api_errors.product_sold_out'},
    {pattern: 'Product is not available for delivery', key: 'api_errors.product_not_for_delivery'},
    {pattern: 'Product is not available for pickup', key: 'api_errors.product_not_for_pickup'},
    {
        pattern: /^Product is not available for (\w+)$/,
        key: 'api_errors.product_not_for_channel',
        captures: {1: 'channel'},
    },
    {pattern: 'Item does not belong to the Store', key: 'api_errors.item_wrong_store'},
    {pattern: 'Product does not belong to the Store', key: 'api_errors.product_wrong_store'},
    {pattern: 'Not all required options are sent.', key: 'api_errors.options_missing'},
    {pattern: 'The item does not belong to the product.', key: 'api_errors.option_wrong_product'},
    {pattern: 'Duplicate items found.', key: 'api_errors.duplicate_items'},
    {pattern: "The items don't comply with the rules.", key: 'api_errors.options_invalid'},
    {pattern: 'The items don’t comply with the rules.', key: 'api_errors.options_invalid'},
];

const CHANNEL_KEYS: Record<string, string> = {
    delivery: 'common.delivery',
    pickup: 'common.pickup',
    dine_in: 'common.dine_in',
    kiosk: 'common.kiosk',
};

const localizeChannel = (raw: string, t: TFunc): string => {
    const k = CHANNEL_KEYS[raw.toLowerCase()];
    if (!k) return raw;
    return t(k, {defaultValue: raw});
};

/**
 * Translate a single server message via the rules above. Returns the
 * original message when no rule matches so unknown errors still reach
 * the customer.
 */
export const translateApiMessage = (raw: string, t: TFunc): string => {
    if (!raw) return raw;
    const msg = raw.trim();
    for (const rule of RULES) {
        if (typeof rule.pattern === 'string') {
            if (msg === rule.pattern) {
                return t(rule.key, {defaultValue: msg});
            }
        } else {
            const m = msg.match(rule.pattern);
            if (m) {
                const opts: any = {defaultValue: msg};
                if (rule.captures) {
                    for (const [groupStr, name] of Object.entries(rule.captures)) {
                        const groupIdx = Number(groupStr);
                        let value = m[groupIdx] ?? '';
                        if (name === 'channel') value = localizeChannel(value, t);
                        if (rule.transform?.[name]) value = rule.transform[name](value);
                        opts[name] = value;
                    }
                }
                return t(rule.key, opts);
            }
        }
    }
    return raw;
};

/**
 * Translate every line (\n-separated) of a server-error blob. Used by
 * `formatApiError` callers that pass a translator.
 */
export const translateApiBlob = (raw: string, t: TFunc): string => {
    if (!raw) return raw;
    return raw
        .split('\n')
        .map(line => translateApiMessage(line, t))
        .join('\n');
};
