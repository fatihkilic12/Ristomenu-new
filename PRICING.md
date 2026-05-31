# RistoMenu — Pricing reference

Single source of truth for what RistoMenu charges restaurants. Use
this when copy-writing the marketing landing page (or any other
surface that quotes prices) so the public numbers stay aligned with
what the billing system actually invoices.

If anything in this file disagrees with what's seeded in the server's
`Subscription/migrations/0003_seed_modules.py` (plus 0006-0013), the
server is the source of truth — fix this doc first, then push the
landing page.

## At-a-glance

| Module             | Base/month | Notes                                          |
|--------------------|-----------:|------------------------------------------------|
| **Menu** (required)| **€50**    | Inclusief 10 tablets. **€15 per extra 10 tablets.** |
| Afhalen & Bezorgen | €30        | Vlakke prijs. Online bestellen + checkout.     |
| Kiosk              | €25        | Vlakke prijs. Zelfbedienings­terminal.          |
| Keukendisplay      | €15        | Vlakke prijs. KDS op een keukenscherm.         |
| Advanced tablet    | €15        | Vlakke prijs. Knipper + battery management.    |

Optioneel maar coming-soon:
- **Buitenscherm** — digitaal menu-scherm aan de buitenzijde. Niet verkocht tot we launch'en.

Verwijderd:
- **Tablet lock** (€15/mnd) — gerantsoeneerd in de Menu module. Niet meer apart aan te schaffen.

## Het Menu-pakket in detail

De Menu module is verplicht. Elke store betaalt minimum €50/maand.
Daarin zit:

- Digitaal menu (QR / table ordering)
- POS-integratie
- **10 tablets inbegrepen** (telt actieve tablets, gemeten over de laatste 7 dagen)

Voor restaurants met meer dan 10 tablets schaalt 'ie:

```
1 – 10 tablets   →  €50/mnd
11 – 20 tablets  →  €65/mnd   (+1 tier)
21 – 30 tablets  →  €80/mnd   (+2 tier)
31 – 40 tablets  →  €95/mnd   (+3 tier)
                    ...
```

Formule: `€50 + ceil((tablets - 10) / 10) × €15`

Een tablet "telt" als 'ie in de laatste 7 dagen een heartbeat heeft
gestuurd. Tablets die zijn ingepakt / decommissioned stoppen na een
week met meetellen.

## Veelvoorkomende combinaties

| Setup | Modules | Maand-bedrag |
|---|---|---|
| Café met QR-menu, 5 tablets | Menu | €50 |
| Restaurant met QR + bezorgen, 8 tablets | Menu + Afhalen&Bezorgen | €80 |
| Pizzeria 15 tablets + bezorgen + advanced tablet | Menu (€65) + Afhalen&Bezorgen + Advanced tablet | €110 |
| Kantine met kiosk, 3 tablets | Menu + Kiosk | €75 |
| Brasserie met KDS, 12 tablets | Menu (€65) + Keukendisplay | €80 |
| Grote keten 50 tablets + alles | Menu (€110) + Afhalen&Bezorgen + Kiosk + KDS + Advanced | €195 |

## Pricing principles (voor copy / sales)

1. **Eén basisprijs, geen verrassingen.** Menu € 50/mnd dekt 90% van
   wat een café / klein restaurant nodig heeft. Geen "vanaf"-tarieven
   met sterretjes — de prijs op de landing page is de prijs die op de
   factuur staat (mits ≤10 tablets).
2. **Geen commissie op orders.** Concurrenten pakken 5-15% per order;
   wij niet. Onbeperkt veel orders zit in de vaste maandprijs.
3. **Per-module add-ons.** Operator kiest wat ze gebruiken; geen
   gedwongen bundels.
4. **Schaalt met tablets, niet met klanten / orders.** Eerlijker:
   een drukke pizzeria met 8 tablets betaalt hetzelfde als een rustige
   met 8 tablets.
5. **Eerste 14 dagen gratis.** Standaard trial window
   (`SUBSCRIPTION_TRIAL_DAYS` in env, default 14, momenteel 30 in
   productie — check voor het live gaat).
6. **Maandelijks of jaarlijks.** Jaarlijks 2 maanden gratis is een
   suggestie maar nog niet ingebouwd; alle modules zijn vandaag op
   `billing_period='month'`.

## Surfaces die deze prijzen tonen

- `Server/Subscription/migrations/0003_seed_modules.py` — initiële seed
- `Server/Subscription/migrations/0010_module_quantity_tiers.py` — tablet-staffel op Menu
- `Server/Subscription/migrations/0013_translate_modules_nl.py` — NL kopij
- `PartnerPortal /subscription` — operator-facing module-cards met prijs
- `PartnerPortal /admin/Subscription/storemodule/` — Django admin met
  live tablet-count + projected invoice (`usage_display`, `billable_display`)
- **`RistoMenu-new` marketing landing page** (toekomst) — sales-facing

## Wijzigingsproces

Een prijs aanpassen raakt **vier surfaces**:

1. `Server/Subscription/migrations/00XX_*.py` — een nieuwe migration
   die de bestaande Module rij update.
2. Update deze doc (PRICING.md).
3. Update de landing page copy (wanneer die bestaat).
4. **Bestaande enrollments**: hun `expires_at` runt af op de oude
   prijs. Beslis of je ze laat lopen (grandfather) of een
   end-of-period flip naar de nieuwe prijs orchestreert. Geen
   automatische sync vandaag.

Stripe price IDs (`Module.stripe_price_id`) zijn nog niet bedraad in
auto-billing — vandaag draait alles op invoice-billing (operator
betaalt na factuur). Wanneer Stripe wel actief is, een nieuwe migration
moet ook nieuwe Stripe price IDs aanmaken via `manage.py
sync_modules_to_stripe`.

## Laatste update

Deze doc weerspiegelt de seed na migration `0013_translate_modules_nl.py`.
Datum: 2026-05-31.
