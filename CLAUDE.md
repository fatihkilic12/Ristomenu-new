# RistoMenu-new — Frontend

## What This Is

Customer-facing ordering frontend for RistoMenu — a restaurant ordering platform. Built from scratch with React 19 + Tailwind CSS (no UI library). Replaces the old Mantine-based `RistoMenu-react` project.

## Tech Stack

- **React 19** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS v4** (styling — no component library)
- **React Router v7** (routing)
- **TanStack React Query** (server state)
- **React Context** (cart state, store config)
- **i18next** (translations: nl, fr, en, de, tr)
- **Axios** (API calls)

## Project Structure

```
src/
├── App.tsx                          # Router setup
├── index.css                        # Tailwind imports + CSS variables for theming
├── main.tsx                         # Entry point
├── actions/                         # API calls
│   ├── api.ts                       # Axios instance (auto-attaches Accept-Language)
│   ├── store.ts                     # Store/menu API calls
│   └── order.ts                     # Order placement + tracking
├── components/
│   ├── menu/
│   │   └── MenuView.tsx             # Main menu layout (categories + products + cart)
│   └── shared/
│       ├── CartSidebar.tsx           # Desktop cart (sticky right column)
│       ├── CartMobileBar.tsx         # Mobile floating cart bar + drawer
│       ├── CategoryNav.tsx           # Horizontal category pills with scroll tracking
│       ├── CheckoutModal.tsx         # Checkout form (address, contact, payment)
│       ├── LanguageSelector.tsx      # Flag-based language switcher dropdown
│       ├── OptionModal.tsx           # Product options bottom sheet / modal
│       └── ProductCard.tsx           # Product card with image, price, cart badge
├── config/
│   ├── constants.ts                 # Server URLs, order types, status enums
│   └── paths.ts                     # Route path helpers
├── context/
│   ├── CartContext.tsx               # Cart state (localStorage persisted)
│   └── StoreConfigContext.tsx        # Store info + CSS variable theming
├── locales/
│   ├── index.ts                     # i18next setup
│   └── lang/                        # en.json, nl.json, fr.json, de.json, tr.json
└── pages/
    ├── HomePage.tsx                  # ristomenu.be landing page (marketing)
    ├── LandingPage.tsx              # /company/:storeId — store landing (order mode picker)
    ├── TablePage.tsx                # /company/:storeId/table — numpad table entry
    ├── DineInPage.tsx               # /company/:storeId/:table — dine-in menu
    ├── KioskPage.tsx                # /company/:storeId/kiosk — name entry → menu
    ├── OrderPage.tsx                # /company/:storeId/order — delivery/takeaway menu
    └── OrderTrackingPage.tsx        # /company/:storeId/order/track/:secretKey — order status
```

## Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | HomePage | RistoMenu product landing page |
| `/company/:storeId` | LandingPage | Store page — shows available order modes |
| `/company/:storeId/table` | TablePage | Numpad to enter table number |
| `/company/:storeId/:table` | DineInPage | Dine-in menu for a specific table |
| `/company/:storeId/kiosk` | KioskPage | Kiosk — enter name then browse menu |
| `/company/:storeId/order` | OrderPage | Delivery/takeaway menu with checkout |
| `/company/:storeId/order/track/:secretKey` | OrderTrackingPage | Guest order tracking (polls every 10s) |

## Backend API

Server runs at `VITE_PUBLIC_SERVER_ADDRESS` (default `http://localhost:8000`). All API calls go through `src/actions/api.ts` which auto-attaches the current i18next language as `Accept-Language` header.

### Endpoints Used

```
GET  /api/v2/store/{slug}/                    → Store info (name, hours, settings, img)
GET  /api/v2/store/{slug}/{table}/menu/       → Dine-in menu (table-based pricing)
GET  /api/v2/store/{slug}/menu/?type=delivery → Delivery/pickup menu
GET  /api/v2/store/{slug}/kiosk/menu/         → Kiosk menu
GET  /api/v2/store/{slug}/config/             → Full store config (branding, settings, hours, methods, regions)
POST /api/v2/store/{slug}/create-order/       → Place order (all types)
GET  /api/v2/order/guest/{secret_key}/        → Guest order tracking
```

### Order Creation Payload

**Dine-in:** `{ table: "5", items: [...], note: "" }`

**Delivery:** `{ order_type: "delivery", items: [...], email: "...", info: { name, phone_number, phone_country }, location: { street_name, street_number, city, postal_code, country }, payment_method: "ideal", redirect_url: "..." }`

**Pickup:** `{ order_type: "pickup", items: [...], email: "...", info: { name, phone_number, phone_country } }`

**Kiosk:** `{ order_type: "kiosk", customer_name: "Jan", items: [...] }`

### Response: `{ order: { name, secret_key, status, total, delivery_fee }, checkout_url: null | "https://..." }`

## Theming System

Store-specific branding is applied via CSS custom properties. `StoreConfigContext.tsx` fetches store info and sets:

```css
--color-primary       /* Buttons, active states (from menu_settings.button_color) */
--color-primary-hover /* Darker variant */
--color-header        /* Header background (from menu_settings.header_color) */
--color-header-text   /* Auto-calculated contrast text */
--color-bg, --color-text, --color-surface, --color-border, --color-muted
```

Kiosk pages apply `.theme-kiosk` class which overrides these with dark values.

## Key Patterns

### Cart
- `CartContext` wraps each page, persists to `localStorage` per store
- Duplicate detection merges items with same product + options + note
- Cart key format: `cart-{storeId}`
- `submitOrder()` builds the API payload from cart items

### Menu Data
- Menu response: `{ menu: { categories: [...], products: [...], options: [...] } }`
- Products reference category by ID and option groups by ID array
- Prices are in **cents** (€7.00 = 700)
- Images may be broken in dev — `ProductCard` has `onError` fallback

### Language
- i18next with 5 languages, detected from localStorage/browser
- `LanguageSelector` shows country flags (🇳🇱 🇫🇷 🇬🇧 🇩🇪 🇹🇷)
- Changing language updates i18next → React Query keys include `i18n.language` → menu refetches in new language
- Available languages come from `company.languages` array

### Responsive
- Desktop: menu grid + sticky cart sidebar (`lg:` breakpoint)
- Mobile: 2-column grid + floating cart bar with slide-up drawer
- Store name hidden on mobile when logo exists (`hidden sm:block`)

## Build

```bash
npm install
npm run dev          # Dev server on :5173
npm run build        # Production build (~46KB CSS + ~437KB JS gzip ~138KB)
```

## Backend Reference

The Django backend is at `/Users/fatihkilic/Documents/Projects/RistoMenu/Server/`. Full architecture documented in `Server/ARCHITECTURE.md`.

Key backend apps: Store, Product, Category, OptionGroup, OptionItem, Order, Payment, Settings, Regions, OpeningHours, SalesArea, POSLink, StoreFront.

## What Still Needs Work

### Critical — Must Fix

- [ ] **Confirm order flow (dine-in)**: Currently does nothing (`() => {}`). Needs to call `submitOrder()` from CartContext, show success modal, and reset cart. Old project had `CartConfirm.tsx` (confirmation modal) + `OrderSuccess.tsx` (success screen) + `CallWaiter.tsx` (fallback on error).
- [ ] **Confirm order flow (kiosk)**: Same as above but sends `order_type: "kiosk"` + `customer_name`.
- [ ] **Payment method selection in checkout**: CheckoutModal has a basic payment selector but needs to fetch from store's `enabled_payment_methods` via the config API.
- [ ] **Product option validation**: The old project validated required option groups (min/max) before allowing "Add to order" with scroll-to-error. New project has no validation — lets you add without required options. Old files: `OptionGroup.tsx`, `RadioOption.tsx`, `CheckboxOption.tsx`, `NumberOptionItem.tsx`.

### Important — Missing Features from Old Project

- [ ] **Store closed alert modal**: When store is closed, old project showed `AlertModal` with next open time via `CartClosed.tsx`. New project has no closure warning.
- [ ] **Call waiter modal**: Old project showed a "Call waiter" modal when order submission failed. Lets customer notify staff. File: `CallWaiter.tsx`.
- [ ] **Order success screen**: After placing dine-in order, old project showed a success modal with green checkmark. File: `OrderSuccess.tsx`.
- [ ] **Age/alcohol verification**: Old project had `AgeBadge.tsx` showing "+18"/"+16" badges on alcohol products, with a verification modal before adding to cart. Uses `restriction.d.ts` context with `hardVerified`/`softVerified` flags.
- [ ] **Restaurant info/about modal**: Old project had an "About" button on the menu page opening a modal with hours, address, cuisine, VAT. Files: `About.tsx`, `Hours.tsx`.
- [ ] **Product search**: Old project had a search bar to filter products by name. Files: `Search.tsx` (both info/ and menuv2/).
- [ ] **Allergen badges on products**: Old project showed allergen badges (gluten, nuts, etc.) on product cards. File: `AllergensBadges.tsx`. New project has allergens in the data but doesn't display them.
- [ ] **Cart validation for menu changes**: Old project detected when menu prices changed while items were in cart, showing a modal to accept/reject. File: `CartValidation.tsx`.
- [ ] **Skeleton loading states**: Old project had proper skeleton loaders for header and menu. Files: `TopLoading.tsx`, `MenuLoading.tsx`. New project uses a simple spinner.

### Nice to Have

- [ ] **"Remember me"** — save name/phone/email to localStorage for returning delivery/pickup customers.
- [ ] **Storefront config API** — use `/api/v2/store/{slug}/config/` for full branding (colors, logos, features, social links) instead of just store detail.
- [ ] **Number input option type** — old project had `NumberOptionItem.tsx` for quantity-based option selection (e.g., "how many extra toppings"). New project only has toggle selection.
- [ ] **Cuisine badges** — old project showed cuisine type badges. File: `CompanyCuisineClass.tsx`.
- [ ] **Category scroll arrows** — old project had left/right arrow buttons on category nav for desktop. File: `Categories.tsx`.

### Image Handling Note

Product images come from the API as relative paths (e.g., `/media/images/store/xxx.jpg`). The `ProductCard` and `OptionModal` prepend `IMAGE_SERVER_ADDRESS` (from env `VITE_PUBLIC_IMAGE_ADDRESS`) to make them absolute. If images don't load, check that the `.env.local` has `VITE_PUBLIC_IMAGE_ADDRESS` pointing to the Django server (e.g., `http://localhost:8000`).
