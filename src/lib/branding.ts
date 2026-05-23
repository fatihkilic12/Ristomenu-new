// Branding fields come from a few different places depending on how old the
// store record is:
//   1. `branding`            — what the new PartnerPortal writes
//   2. `storefront_settings` — older name for the same data
//   3. `menu_settings`       — even older, only carried button_color / header_color
//   4. top-level fields      — legacy logo (`img`), banner (`header_img`), etc.
//
// `getBranding(company)` normalises all of that into one flat object so
// consumers can read a single source of truth.

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
  show_allergens: true,
  show_product_images: true,
  allow_notes: true,
  website_url: null,
  instagram_url: null,
  facebook_url: null,
};

export function getBranding(company: any): Branding {
  if (!company) return DEFAULT_BRANDING;

  const b = company.branding || {};
  const s = company.storefront_settings || {};
  const m = company.menu_settings || {};

  return {
    primary_color:    pick(b.primary_color,    m.button_color),
    secondary_color:  pick(b.secondary_color),
    background_color: pick(b.background_color),
    text_color:       pick(b.text_color),
    header_color:     pick(b.header_color,     m.header_color),
    logo:             pick(b.logo,             company.img),
    banner_image:     pick(b.banner_image,     company.header_img),
    welcome_message:  pick(b.welcome_message,  s.welcome_message),
    footer_text:      pick(b.footer_text,      s.footer_text),
    show_allergens:        flag(true, b.show_allergens, s.show_allergens),
    show_product_images:   flag(true, b.show_product_images, s.show_product_images),
    // `disable_note` is the older, inverted flag — honour both.
    allow_notes:           flag(true, b.allow_notes, s.allow_notes) && !s.disable_note,
    website_url:      pick(b.website_url,    s.website_url,   company.website_url, company.url),
    instagram_url:    pick(b.instagram_url,  s.instagram_url),
    facebook_url:     pick(b.facebook_url,   s.facebook_url),
  };
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
