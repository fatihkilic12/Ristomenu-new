const PORTAL_SIGNUP = 'https://portal.menuwela.com/sign-up';
const PORTAL_LOGIN = 'https://portal.menuwela.com/sign-in?redirectUrl=/login';
const DEMO_MENU = '/company/test/menu';

// Brand palette — sampled from the menuwela-light / menuwela-mini-dark
// logos. Aubergine + warm cream + dusty mauve, not stone + amber.
//   bg cream:        #faf6f3 (page background, warm pink-tinted off-white)
//   bg cream alt:    #f4ede8 (slightly darker for inset sections)
//   surface white:   #fcfaf9 (cards on cream)
//   aubergine:       #3b1f4b (logo body, primary text, dark sections)
//   aubergine deep:  #2c1638 (hover for dark CTAs)
//   mauve:           #a48589 (accent — eyebrow tags, "Wela" tinted dots)
//   mauve soft:      #c5a8ab (softer accent)
//   mauve dim:       #7a5b6e (medium muted text on cream)
//   cream on dark:   #f5e9e6 (foreground on aubergine)
//   muted on dark:   #b39b9c (secondary text on aubergine)

const FONT = "'Outfit', system-ui, -apple-system, sans-serif";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#faf6f3] text-[#3b1f4b] overflow-hidden" style={{ fontFamily: FONT }}>
      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#faf6f3]/70 border-b border-[#3b1f4b]/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center" aria-label="MenuWela home">
            <img src="/menuwela-light.png" alt="MenuWela" className="h-7 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium tracking-wide uppercase text-[#7a5b6e]">
            <a href="#features" className="hover:text-[#3b1f4b] transition-colors">Features</a>
            <a href="#demo" className="hover:text-[#3b1f4b] transition-colors">Demo</a>
            <a href="#pricing" className="hover:text-[#3b1f4b] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#3b1f4b] transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={PORTAL_LOGIN}
              className="hidden sm:inline-flex px-4 py-2 text-[13px] font-semibold tracking-wide rounded-full text-[#3b1f4b] hover:bg-[#3b1f4b]/5 transition-colors"
            >
              Sign in
            </a>
            <a
              href={PORTAL_SIGNUP}
              className="px-5 py-2 text-[13px] font-semibold tracking-wide rounded-full bg-[#3b1f4b] text-[#f5e9e6] hover:bg-[#2c1638] transition-colors"
            >
              Start free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-[#a48589]/15 blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#3b1f4b]/8 blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.2em] uppercase text-[#a48589] mb-6">
              Restaurant ordering platform
            </p>
            <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-bold leading-[0.95] tracking-tight text-[#3b1f4b]">
              Your menu,<br />
              everywhere<span className="text-[#a48589]">.</span>
            </h1>
            <p className="mt-7 text-lg sm:text-xl text-[#7a5b6e] max-w-xl leading-relaxed">
              QR codes, tablets, kiosk terminals, online pickup — one platform, zero commissions. Set up in minutes, not days.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={PORTAL_SIGNUP}
                className="px-7 py-3.5 rounded-full text-[15px] font-semibold text-[#f5e9e6] bg-[#3b1f4b] hover:bg-[#2c1638] transition-all hover:shadow-xl hover:shadow-[#3b1f4b]/15 hover:-translate-y-0.5"
              >
                Start 14-day trial
              </a>
              <a
                href={DEMO_MENU}
                className="px-7 py-3.5 rounded-full text-[15px] font-semibold text-[#3b1f4b] border border-[#3b1f4b]/15 hover:border-[#3b1f4b]/30 hover:bg-[#3b1f4b]/5 transition-all inline-flex items-center gap-2"
              >
                See it live <span aria-hidden>→</span>
              </a>
            </div>

            {/* Trust line — concrete numbers instead of decorative names */}
            <div className="mt-10 pt-6 border-t border-[#3b1f4b]/10 flex flex-wrap gap-8 text-[#5b3a4c]">
              <Stat value="0%" label="Commission" />
              <Stat value="5 min" label="Setup time" />
              <Stat value="24/7" label="Support" />
            </div>
          </div>

          {/* Hero visual — phone mockup with a styled menu preview */}
          <div className="relative hidden lg:block">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Demo strip — single visible CTA pointing at a real working menu */}
      <section id="demo" className="px-6 pt-6 pb-20">
        <div className="max-w-6xl mx-auto bg-[#3b1f4b] text-[#f5e9e6] rounded-[2rem] p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-[#a48589]/30 blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-[12px] tracking-[0.2em] uppercase text-[#c5a8ab] mb-2">Try it now</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              See exactly what your customers see.
            </h2>
            <p className="text-[#b39b9c] mt-2 text-sm">No signup required — open the live demo menu.</p>
          </div>
          <a
            href={DEMO_MENU}
            className="relative shrink-0 px-6 py-3 rounded-full text-sm font-semibold bg-[#f5e9e6] text-[#3b1f4b] hover:bg-white transition-colors inline-flex items-center gap-2"
          >
            Open demo menu <span aria-hidden>→</span>
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-[#3b1f4b] text-[#f5e9e6] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #f5e9e6 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />

        <div className="max-w-6xl mx-auto relative">
          <p className="text-[12px] tracking-[0.2em] uppercase text-[#c5a8ab] mb-4">Capabilities</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-16 leading-tight">
            Built for modern<br />restaurants
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#f5e9e6]/10 rounded-2xl overflow-hidden">
            <Feature
              title="QR Ordering"
              desc="Scan, browse, order. No downloads. Works on every phone."
              icon={<IconQr />}
            />
            <Feature
              title="Tablet Menus"
              desc="Fixed tablets on tables. Self-pairing setup. €1/tablet."
              icon={<IconTablet />}
            />
            <Feature
              title="Kiosk Mode"
              desc="Self-service terminal with auto table assignment and POS sync."
              icon={<IconKiosk />}
            />
            <Feature
              title="Online Pickup"
              desc="Your own branded page. Customers order ahead, you prepare."
              icon={<IconBag />}
            />
            <Feature
              title="POS Connected"
              desc="Direct Untill integration. Prices and orders sync both ways."
              icon={<IconPlug />}
            />
            <Feature
              title="Your Brand"
              desc="Colors, logo, style. Every store looks like their own."
              icon={<IconPalette />}
            />
          </div>
        </div>
      </section>

      {/* Pricing — module-based, matches PRICING.md.
          Menu module is the required base (€50, includes 10 tablets).
          Add-ons stack on top: Online ordering €30, Kiosk €25, KDS €15. */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] tracking-[0.2em] uppercase text-[#a48589] mb-4">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              No commissions<span className="text-[#a48589]">.</span> Ever<span className="text-[#a48589]">.</span>
            </h2>
            <p className="mt-4 text-[#7a5b6e] text-lg">Flat monthly fee. Modular add-ons. Cancel anytime.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <PriceCard
              tier="Menu"
              price="50"
              desc="QR menu + POS integration"
              features={[
                '10 tablets included',
                'Unlimited orders',
                'QR code per table',
                'Multi-language menu',
                'POS integration (Untill)',
                'Custom branding',
              ]}
            />
            <PriceCard
              tier="Restaurant"
              price="80"
              desc="Menu + online ordering"
              features={[
                'Everything in Menu',
                'Online pickup & delivery',
                'Online payments (Mollie/Stripe)',
                'Order tracking page',
                'Customer notifications',
              ]}
              featured
            />
            <PriceCard
              tier="Complete"
              price="120"
              desc="Full platform access"
              features={[
                'Everything in Restaurant',
                'Self-service kiosk',
                'Kitchen display (KDS)',
                'Auto table assignment',
                'Priority support',
              ]}
            />
          </div>

          <div className="text-center text-[13px] text-[#7a5b6e] mt-10 space-y-1">
            <p>
              <span className="font-semibold text-[#3b1f4b]">À la carte:</span>{' '}
              Online ordering €30 · Kiosk €25 · Kitchen display €15 · Advanced tablet €15
            </p>
            <p>Extra tablets: €15 per 10 beyond the included 10 · All prices excl. VAT · No setup fees</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-[#f4ede8]">
        <div className="max-w-3xl mx-auto">
          <p className="text-[12px] tracking-[0.2em] uppercase text-[#a48589] mb-4 text-center">Questions</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-center mb-12">
            Frequently asked
          </h2>

          <div className="divide-y divide-[#3b1f4b]/10 rounded-2xl bg-[#fcfaf9] border border-[#3b1f4b]/5 overflow-hidden">
            <FaqItem
              q="How fast can I set this up?"
              a="If you've already got your menu in a spreadsheet, the import takes under 10 minutes. Designing categories, uploading photos and printing QR codes is usually done within an afternoon."
            />
            <FaqItem
              q="Do I need any special hardware?"
              a="No. QR ordering and online pickup run on customers' own phones. Tablets and kiosks are optional add-ons — you can use any Android tablet (we provide a setup app) or use our recommended kiosk hardware."
            />
            <FaqItem
              q="Does it work with my point-of-sale?"
              a="We integrate directly with Untill. Orders land in your POS like any in-house order, and price changes you make in the POS sync back to your menu. Other POS systems on request."
            />
            <FaqItem
              q="What if my internet drops mid-service?"
              a="Menus are cached on each device, so customers can keep browsing and adding to cart even when Wi-Fi blips. Orders queue and submit as soon as you're back online."
            />
            <FaqItem
              q="Are there any commissions or hidden fees?"
              a="None. You pay a fixed monthly fee and keep 100% of your revenue. Online payment processing is at standard PSP rates (Mollie / Stripe — you pick)."
            />
            <FaqItem
              q="Can I cancel anytime?"
              a="Yes. No contracts, no cancellation fees. You can pause or stop your subscription from the dashboard at any time."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-28 px-6 bg-[#3b1f4b] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#a48589]/20 blur-[120px] -z-0" />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#f5e9e6] leading-tight">
            Ready to start<span className="text-[#c5a8ab]">?</span>
          </h2>
          <p className="mt-4 text-[#b39b9c] text-lg">14 days free. No credit card. Takes 5 minutes.</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={PORTAL_SIGNUP}
              className="px-8 py-3.5 rounded-full text-sm font-semibold text-[#3b1f4b] bg-[#f5e9e6] hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
            >
              Create your account <span aria-hidden>→</span>
            </a>
            <a
              href={DEMO_MENU}
              className="px-8 py-3.5 rounded-full text-sm font-semibold text-[#f5e9e6] border border-[#f5e9e6]/20 hover:bg-[#f5e9e6]/5 transition-colors inline-flex items-center justify-center"
            >
              See the demo first
            </a>
          </div>
          <p className="mt-6 text-xs text-[#b39b9c]">
            Already have an account? <a href={PORTAL_LOGIN} className="text-[#c5a8ab] hover:text-[#f5e9e6] hover:underline">Sign in</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#3b1f4b]/10 bg-[#faf6f3]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/menuwela-light.png" alt="MenuWela" className="h-5 w-auto opacity-70" />
            <span className="text-[13px] text-[#a48589]">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-[13px] text-[#a48589]">
            <a href="/privacy" className="hover:text-[#5b3a4c] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[#5b3a4c] transition-colors">Terms</a>
            <a href="mailto:info@menuwela.com" className="hover:text-[#5b3a4c] transition-colors">info@menuwela.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-[#3b1f4b]">{value}</p>
      <p className="text-[11px] tracking-[0.15em] uppercase text-[#a48589] mt-0.5">{label}</p>
    </div>
  );
}

function Feature({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="p-8 bg-[#3b1f4b] hover:bg-[#2c1638] transition-colors group">
      <span className="block w-10 h-10 mb-5 text-[#c5a8ab] group-hover:scale-110 transition-transform">{icon}</span>
      <h3 className="font-semibold text-[#f5e9e6] text-[15px] mb-2">{title}</h3>
      <p className="text-[14px] text-[#b39b9c] leading-relaxed">{desc}</p>
    </div>
  );
}

function PriceCard({ tier, price, desc, features, featured = false }: {
  tier: string; price: string; desc: string; features: string[]; featured?: boolean;
}) {
  return (
    <div className={`relative p-7 rounded-2xl flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl ${
      featured
        ? 'bg-[#3b1f4b] text-[#f5e9e6] ring-1 ring-[#a48589]/40'
        : 'bg-[#fcfaf9] border border-[#3b1f4b]/5 hover:shadow-[#3b1f4b]/10'
    }`}>
      {featured && (
        <span className="absolute -top-3 left-6 px-3 py-0.5 text-[11px] font-semibold tracking-wider uppercase bg-[#a48589] text-[#f5e9e6] rounded-full">
          Popular
        </span>
      )}
      <p className="text-[12px] tracking-[0.15em] uppercase text-[#a48589] font-semibold">{tier}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold">€{price}</span>
        <span className={`text-sm ${featured ? 'text-[#b39b9c]' : 'text-[#7a5b6e]'}`}>/mo</span>
      </div>
      <p className={`text-sm mt-1 ${featured ? 'text-[#b39b9c]' : 'text-[#7a5b6e]'}`}>{desc}</p>
      <ul className="mt-6 space-y-2.5 flex-1">
        {features.map(f => (
          <li key={f} className={`flex items-start gap-2.5 text-[14px] ${featured ? 'text-[#e8d4d2]' : 'text-[#5b3a4c]'}`}>
            <span className={featured ? 'text-[#c5a8ab] mt-0.5' : 'text-[#a48589] mt-0.5'}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={PORTAL_SIGNUP}
        className={`w-full mt-7 py-3 rounded-full text-[14px] font-semibold transition-colors text-center ${
          featured
            ? 'bg-[#f5e9e6] text-[#3b1f4b] hover:bg-white'
            : 'bg-[#3b1f4b] text-[#f5e9e6] hover:bg-[#2c1638]'
        }`}
      >
        Start trial
      </a>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group p-6 sm:p-7">
      <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
        <span className="text-[16px] sm:text-[17px] font-semibold text-[#3b1f4b]">{q}</span>
        <span className="shrink-0 mt-1 text-[#a48589] transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
      </summary>
      <p className="mt-3 text-[14px] sm:text-[15px] text-[#5b3a4c] leading-relaxed">{a}</p>
    </details>
  );
}

/* ─── Phone mockup ─────────────────────────────────────────
 * Pure-CSS preview of the product. Gives the hero a concrete
 * thing to point at without needing a real screenshot.
 * ──────────────────────────────────────────────────────────*/
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[300px] aspect-[9/19] rounded-[3rem] bg-[#3b1f4b] p-3 shadow-2xl shadow-[#3b1f4b]/30 rotate-[2deg]">
      {/* Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-[#3b1f4b] z-10" />
      {/* Floating order badge */}
      <div className="absolute -left-12 top-1/3 bg-[#fcfaf9] rounded-2xl shadow-xl p-3 w-44 -rotate-6 z-20 ring-1 ring-[#3b1f4b]/5">
        <p className="text-[10px] tracking-[0.15em] uppercase text-[#a48589]">Order #4F2C</p>
        <p className="text-[13px] font-semibold mt-1 text-[#3b1f4b]">Mixed grill platter</p>
        <p className="text-[#a48589] text-[13px] font-bold mt-0.5">€18.50</p>
      </div>
      {/* Floating live badge */}
      <div className="absolute -right-6 bottom-12 bg-[#3b1f4b] text-[#f5e9e6] rounded-full pl-3 pr-4 py-2 shadow-xl flex items-center gap-2 rotate-3 z-20">
        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        <span className="text-xs font-semibold">12 ordering now</span>
      </div>
      {/* Phone screen */}
      <div className="w-full h-full rounded-[2.4rem] bg-[#faf6f3] overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="h-8 shrink-0" />
        {/* Restaurant header */}
        <div className="px-4 pb-3 border-b border-[#3b1f4b]/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3b1f4b] to-[#a48589]" />
            <p className="text-[13px] font-bold text-[#3b1f4b]">Bistro Aurora</p>
          </div>
        </div>
        {/* Category pills */}
        <div className="px-4 py-3 flex gap-1.5 overflow-hidden border-b border-[#3b1f4b]/5">
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#3b1f4b] text-[#f5e9e6] text-[10px] font-bold">Starters</span>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#fcfaf9] text-[#5b3a4c] text-[10px] font-bold border border-[#3b1f4b]/10">Mains</span>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#fcfaf9] text-[#5b3a4c] text-[10px] font-bold border border-[#3b1f4b]/10">Sides</span>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#fcfaf9] text-[#5b3a4c] text-[10px] font-bold border border-[#3b1f4b]/10">Drinks</span>
        </div>
        {/* Products */}
        <div className="flex-1 px-3 py-2 space-y-2 overflow-hidden">
          <MockProduct name="Burrata di Puglia" desc="Heirloom tomato, basil, olive oil" price="12.50" gradient="from-emerald-200 to-green-300" />
          <MockProduct name="Beef carpaccio" desc="Parmesan, rocket, truffle" price="14.00" gradient="from-rose-200 to-orange-300" />
          <MockProduct name="Roasted beet salad" desc="Goat cheese, walnut, honey" price="10.50" gradient="from-fuchsia-200 to-pink-300" />
        </div>
        {/* Cart bar */}
        <div className="m-3 mt-1 rounded-2xl bg-[#3b1f4b] text-[#f5e9e6] px-3 py-2.5 flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#f5e9e6]/15 flex items-center justify-center text-[10px] font-bold">3</span>
            <span className="text-[11px] font-bold">View order</span>
          </span>
          <span className="text-[11px] font-extrabold">€37.00</span>
        </div>
      </div>
    </div>
  );
}

function MockProduct({ name, desc, price, gradient }: { name: string; desc: string; price: string; gradient: string }) {
  return (
    <div className="flex gap-2 p-2 rounded-xl bg-[#fcfaf9] shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-[#3b1f4b] truncate">{name}</p>
        <p className="text-[9px] text-[#a48589] truncate mt-0.5">{desc}</p>
        <p className="text-[11px] font-extrabold text-[#3b1f4b] mt-1">€{price}</p>
      </div>
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} shrink-0 relative`}>
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#3b1f4b] text-[#f5e9e6] text-xs font-bold flex items-center justify-center shadow">+</span>
      </div>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────── */
const baseIcon = "w-full h-full";

function IconQr() {
  return (
    <svg className={baseIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v3M17 17v4h4M14 21v-1" />
    </svg>
  );
}
function IconTablet() {
  return (
    <svg className={baseIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  );
}
function IconKiosk() {
  return (
    <svg className={baseIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="13" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg className={baseIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
function IconPlug() {
  return (
    <svg className={baseIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v6M15 2v6" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  );
}
function IconPalette() {
  return (
    <svg className={baseIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a10 10 0 1 1 10-10c0 2-1.5 3-3.5 3H17a2 2 0 0 0-1.5 3.3 2 2 0 0 1-1.5 3.3Z" />
      <circle cx="6.5" cy="11.5" r="1" />
      <circle cx="9.5" cy="7.5" r="1" />
      <circle cx="14.5" cy="7.5" r="1" />
      <circle cx="17.5" cy="11.5" r="1" />
    </svg>
  );
}
