// Branding for the storefront comes from a single source: the `branding`
// block on `GET /api/v2/store/<slug>/config/`. That endpoint is fetched
// alongside the StoreDetail call inside `StoreConfigContext` and merged onto
// the `company` object under the `branding` key.
//
// `getBranding(company)` reads only from `company.branding` and fills in
// safe defaults for stores that haven't set up StorefrontSettings yet — the
// caller gets a fully populated object and never has to null-check fields.
//
// Image fields (`logo`, `banner_image`) are normalised to absolute URLs
// here — Django returns paths like `/media/images/test/...` and consumers
// would otherwise need to remember to prefix the host on every <img> tag.
//
// Legacy locations (`menu_settings.logo` / `menu_settings.button_color` /
// `menu_settings.header_color` / `settings.header_color` / top-level `img`)
// are no longer consulted — the backend dropped them from the response.

import { IMAGE_SERVER_ADDRESS } from '@/config/constants';

// Server-side enum mirror — keep in sync with
// StorefrontSettings.MenuLayout. Unknown values fall back to 'classic'
// at read time so a future server release with a new variant doesn't
// crash older storefront builds.
export type MenuLayout = 'classic' | 'compact' | 'luxe';
export type TitleSize = 'small' | 'medium' | 'large';

export type Branding = {
  primary_color:    string | null;
  secondary_color:  string | null;
  background_color: string | null;
  text_color:       string | null;
  header_color:     string | null;
  logo:             string | null;
  banner_image:     string | null;
  welcome_message:  string | null;
  footer_text:      string | null;
  menu_layout:      MenuLayout;
  title_size:       TitleSize;
  show_category_photos:  boolean;
  show_allergens:        boolean;
  show_product_images:   boolean;
  allow_notes:           boolean;
  website_url:      string | null;
  instagram_url:    string | null;
  facebook_url:     string | null;
};

const DEFAULT_BRANDING: Branding = {
  primary_color: null,
  secondary_color: null,
  background_color: null,
  text_color: null,
  header_color: null,
  logo: null,
  banner_image: null,
  welcome_message: null,
  footer_text: null,
  menu_layout: 'classic',
  title_size: 'medium',
  show_category_photos: false,
  show_allergens: true,
  show_product_images: true,
  allow_notes: true,
  website_url: null,
  instagram_url: null,
  facebook_url: null,
};

const VALID_LAYOUTS: ReadonlySet<MenuLayout> = new Set(['classic', 'compact', 'luxe']);
function normalizeLayout(v: any): MenuLayout {
  return typeof v === 'string' && VALID_LAYOUTS.has(v as MenuLayout) ? (v as MenuLayout) : 'classic';
}

const VALID_TITLE_SIZES: ReadonlySet<TitleSize> = new Set(['small', 'medium', 'large']);
function normalizeTitleSize(v: any): TitleSize {
  return typeof v === 'string' && VALID_TITLE_SIZES.has(v as TitleSize) ? (v as TitleSize) : 'medium';
}

export function getBranding(company: any): Branding {
  if (!company) return DEFAULT_BRANDING;

  // `branding` is `{}` on the server for stores without StorefrontSettings.
  // That's fine — every field below resolves to its DEFAULT_BRANDING value
  // and the UI renders with the storefront's built-in theme tokens.
  const b = company.branding || {};

  return {
    primary_color:    pick(b.primary_color),
    secondary_color:  pick(b.secondary_color),
    background_color: pick(b.background_color),
    text_color:       pick(b.text_color),
    header_color:     pick(b.header_color),
    logo:             absoluteUrl(b.logo),
    banner_image:     absoluteUrl(b.banner_image),
    welcome_message:  pick(b.welcome_message),
    footer_text:      pick(b.footer_text),
    menu_layout:      normalizeLayout(b.menu_layout),
    title_size:       normalizeTitleSize(b.title_size),
    show_category_photos:  flag(DEFAULT_BRANDING.show_category_photos, b.show_category_photos),
    show_allergens:        flag(DEFAULT_BRANDING.show_allergens,       b.show_allergens),
    show_product_images:   flag(DEFAULT_BRANDING.show_product_images,  b.show_product_images),
    allow_notes:           flag(DEFAULT_BRANDING.allow_notes,          b.allow_notes),
    website_url:      pick(b.website_url),
    instagram_url:    pick(b.instagram_url),
    facebook_url:     pick(b.facebook_url),
  };
}

// Promote a server media path (`/media/images/...`) to the absolute URL
// the browser can actually fetch. Already-absolute URLs (https://…) pass
// through unchanged so a CDN-hosted asset still works.
function absoluteUrl(v: any): string | null {
  if (v == null || v === '') return null;
  const s = String(v);
  return s.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${s}` : s;
}

// First non-null / non-empty value, else null
function pick(...vals: any[]): string | null {
  for (const v of vals) {
    if (v != null && v !== '') return String(v);
  }
  return null;
}

// First explicitly-set boolean wins; first arg is the default
function flag(def: boolean, ...vals: any[]): boolean {
  for (const v of vals) {
    if (typeof v === 'boolean') return v;
  }
  return def;
}
