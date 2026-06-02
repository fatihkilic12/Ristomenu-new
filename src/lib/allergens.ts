// EU 14 declared allergens (Annex II of EU Regulation 1169/2011).
// The backend returns lowercase English slugs; this module centralises
// the slug → icon + label mapping so OptionModal / ProductInfoModal /
// KioskProductDetail render the same chip everywhere.
//
// Why emojis instead of an icon font: every consumer (storefront,
// kiosk, in-restaurant TabletMenuApp WebView) needs the icons to
// render without adding a runtime dependency. Emojis are native to
// every modern browser including Android WebView and don't need any
// font loaded. Trade-off: rendering varies slightly per platform —
// acceptable for a recognition-only badge.
//
// For allergens with no clean emoji (mustard, sulphites, lupin) we
// pick the closest food-relevant glyph and rely on the text label
// next to it for disambiguation.

import type { TFunction } from 'i18next';

type AllergenInfo = {
    icon: string;
    /** Dutch label used as the i18n defaultValue. */
    nl: string;
};

const ALLERGENS: Record<string, AllergenInfo> = {
    gluten:      { icon: '🌾', nl: 'Gluten' },
    milk:        { icon: '🥛', nl: 'Melk' },
    eggs:        { icon: '🥚', nl: 'Eieren' },
    fish:        { icon: '🐟', nl: 'Vis' },
    crustaceans: { icon: '🦐', nl: 'Schaaldieren' },
    molluscs:    { icon: '🦪', nl: 'Weekdieren' },
    nuts:        { icon: '🌰', nl: 'Noten' },
    peanuts:     { icon: '🥜', nl: 'Pinda’s' },
    soybeans:    { icon: '🫘', nl: 'Soja' },
    sesame:      { icon: '🌱', nl: 'Sesam' },
    celery:      { icon: '🌿', nl: 'Selderij' },
    mustard:     { icon: '🌶️', nl: 'Mosterd' },
    sulphites:   { icon: '🍷', nl: 'Sulfiet' },
    lupin:       { icon: '🌼', nl: 'Lupine' },
};

const FALLBACK: AllergenInfo = { icon: '⚠️', nl: '' };

function capitalize(s: string): string {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function getAllergenIcon(slug: string): string {
    return ALLERGENS[slug]?.icon || FALLBACK.icon;
}

/** Translate via i18n key `common.allergen.<slug>` with Dutch fallback. */
export function getAllergenLabel(slug: string, t: TFunction): string {
    const entry = ALLERGENS[slug];
    return t(`common.allergen.${slug}`, {
        defaultValue: entry?.nl || capitalize(slug),
    });
}
