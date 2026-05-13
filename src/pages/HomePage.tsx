export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#faf9f7] text-[#1c1917] overflow-hidden">
      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#faf9f7]/70 border-b border-[#1c1917]/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-lg tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            Menu<span className="text-[#b45309]">Wela</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium tracking-wide uppercase text-[#78716c]">
            <a href="#features" className="hover:text-[#1c1917] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#1c1917] transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-[#1c1917] transition-colors">Contact</a>
          </div>
          <a
            href="https://portal.menuwela.com/sign-in?redirectUrl=/login"
            className="px-5 py-2 text-[13px] font-semibold tracking-wide rounded-full bg-[#1c1917] text-white hover:bg-[#292524] transition-colors"
          >
            Dashboard
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-[#fbbf24]/10 blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#b45309]/5 blur-[100px] -z-10" />

        <div className="max-w-5xl mx-auto">
          <p className="text-[13px] font-semibold tracking-[0.2em] uppercase text-[#b45309] mb-6">
            Restaurant ordering platform
          </p>
          <h1
            className="text-5xl sm:text-7xl lg:text-8xl font-normal leading-[0.9] tracking-tight text-[#1c1917]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Your menu,<br />
            everywhere<span className="text-[#b45309]">.</span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-[#78716c] max-w-xl leading-relaxed">
            QR codes, tablets, kiosk terminals, online pickup — one platform, zero commissions. Set up in minutes, not days.
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="px-8 py-4 rounded-full text-[15px] font-semibold text-white bg-[#1c1917] hover:bg-[#292524] transition-all hover:shadow-xl hover:shadow-[#1c1917]/10 hover:-translate-y-0.5"
            >
              Start 14-day trial
            </a>
            <a
              href="#features"
              className="px-8 py-4 rounded-full text-[15px] font-semibold text-[#1c1917] border border-[#1c1917]/15 hover:border-[#1c1917]/30 transition-colors"
            >
              Explore features
            </a>
          </div>

          {/* Trust line */}
          <div className="mt-10 pt-6 border-t border-[#1c1917]/5">
            <p className="text-[12px] tracking-[0.15em] uppercase text-[#a8a29e] mb-4">Trusted by</p>
            <div className="flex items-center gap-8 flex-wrap">
              <span className="text-[#57534e] font-semibold text-lg" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Matiate</span>
              <span className="text-[#57534e] font-semibold text-lg" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Mevlana</span>
              <span className="text-[#57534e] font-semibold text-lg" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>La Dolce Pita</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-[#1c1917] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />

        <div className="max-w-6xl mx-auto relative">
          <p className="text-[12px] tracking-[0.2em] uppercase text-[#b45309] mb-4">Capabilities</p>
          <h2
            className="text-4xl sm:text-5xl font-normal tracking-tight mb-16"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Built for modern<br />restaurants
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
            <Feature title="QR Ordering" desc="Scan, browse, order. No downloads. Works on every phone." accent="📱" />
            <Feature title="Tablet Menus" desc="Fixed tablets on tables. Self-pairing setup. €1/tablet." accent="📟" />
            <Feature title="Kiosk Mode" desc="Self-service terminal with auto table assignment and POS sync." accent="🖥️" />
            <Feature title="Online Pickup" desc="Your own branded page. Customers order ahead, you prepare." accent="🛍️" />
            <Feature title="POS Connected" desc="Direct Untill integration. Prices and orders sync both ways." accent="🔗" />
            <Feature title="Your Brand" desc="Colors, logo, style. Every store looks like their own." accent="🎨" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] tracking-[0.2em] uppercase text-[#b45309] mb-4">Pricing</p>
            <h2
              className="text-4xl sm:text-5xl font-normal tracking-tight"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              No commissions<span className="text-[#b45309]">.</span> Ever<span className="text-[#b45309]">.</span>
            </h2>
            <p className="mt-4 text-[#78716c] text-lg">Flat monthly fee. Cancel anytime.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <PriceCard
              tier="Starter"
              price="29"
              desc="QR menu for your tables"
              features={['Unlimited orders', 'QR code per table', 'Multi-language', 'POS integration', 'Custom branding']}
            />
            <PriceCard
              tier="Pro"
              price="59"
              desc="Tablets + online pickup"
              features={['Everything in Starter', 'Tablet ordering (€1/tablet)', 'Online pickup page', 'Online payments', 'Self-service tablet pairing']}
              featured
            />
            <PriceCard
              tier="Complete"
              price="89"
              desc="Full platform access"
              features={['Everything in Pro', 'Self-service kiosk', 'Delivery ordering', 'Order tracking', 'Priority support']}
            />
          </div>

          <p className="text-center text-[13px] text-[#a8a29e] mt-8">
            All prices excl. VAT · Tablets: €1/tablet/month · No setup fees
          </p>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-28 px-6 bg-[#1c1917] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#b45309]/10 blur-[120px] -z-0" />
        <div className="max-w-xl mx-auto text-center relative">
          <h2
            className="text-4xl sm:text-5xl font-normal tracking-tight text-white"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Ready to start<span className="text-[#fbbf24]">?</span>
          </h2>
          <p className="mt-4 text-[#a8a29e] text-lg">14 days free. No credit card. Takes 5 minutes.</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              placeholder="your@email.com"
              className="px-5 py-3.5 rounded-full text-sm bg-white/5 border border-white/10 text-white placeholder-[#78716c] focus:outline-none focus:border-[#b45309]/50 w-full sm:w-72"
            />
            <button className="px-7 py-3.5 rounded-full text-sm font-semibold text-[#1c1917] bg-[#fbbf24] hover:bg-[#f59e0b] transition-colors">
              Start free trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#1c1917]/5 bg-[#faf9f7]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[13px] text-[#a8a29e]">© {new Date().getFullYear()} MenuWela</span>
          <div className="flex items-center gap-5 text-[13px] text-[#a8a29e]">
            <a href="/privacy" className="hover:text-[#57534e] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[#57534e] transition-colors">Terms</a>
            <a href="mailto:info@menuwela.com" className="hover:text-[#57534e] transition-colors">info@menuwela.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


function Feature({ title, desc, accent }: { title: string; desc: string; accent: string }) {
  return (
    <div className="p-8 bg-[#1c1917] hover:bg-[#292524] transition-colors group">
      <span className="text-2xl block mb-4 group-hover:scale-110 transition-transform">{accent}</span>
      <h3 className="font-semibold text-white text-[15px] mb-2">{title}</h3>
      <p className="text-[14px] text-[#a8a29e] leading-relaxed">{desc}</p>
    </div>
  );
}

function PriceCard({ tier, price, desc, features, featured = false }: {
  tier: string; price: string; desc: string; features: string[]; featured?: boolean;
}) {
  return (
    <div className={`relative p-7 rounded-2xl flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl ${
      featured
        ? 'bg-[#1c1917] text-white ring-1 ring-[#b45309]/30'
        : 'bg-white border border-[#1c1917]/5 hover:shadow-[#1c1917]/5'
    }`}>
      {featured && (
        <span className="absolute -top-3 left-6 px-3 py-0.5 text-[11px] font-semibold tracking-wider uppercase bg-[#b45309] text-white rounded-full">
          Popular
        </span>
      )}
      <p className="text-[12px] tracking-[0.15em] uppercase text-[#b45309] font-semibold">{tier}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-bold">€{price}</span>
        <span className={`text-sm ${featured ? 'text-[#a8a29e]' : 'text-[#78716c]'}`}>/mo</span>
      </div>
      <p className={`text-sm mt-1 ${featured ? 'text-[#a8a29e]' : 'text-[#78716c]'}`}>{desc}</p>
      <ul className="mt-6 space-y-2.5 flex-1">
        {features.map(f => (
          <li key={f} className={`flex items-start gap-2.5 text-[14px] ${featured ? 'text-[#d6d3d1]' : 'text-[#57534e]'}`}>
            <span className="text-[#b45309] mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button className={`w-full mt-7 py-3 rounded-full text-[14px] font-semibold transition-colors ${
        featured
          ? 'bg-[#fbbf24] text-[#1c1917] hover:bg-[#f59e0b]'
          : 'bg-[#1c1917] text-white hover:bg-[#292524]'
      }`}>
        Start trial
      </button>
    </div>
  );
}
