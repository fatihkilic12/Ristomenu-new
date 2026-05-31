// Public privacy policy. Linked from the marketing landing footer.
// Plain-language summary first, then the formal sections required for
// GDPR. Update the "Last updated" date whenever the content changes.

const FONT = "'Outfit', system-ui, -apple-system, sans-serif";
const LAST_UPDATED = '31 May 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#faf6f3] text-[#3b1f4b]" style={{ fontFamily: FONT }}>
      <LegalNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <p className="text-[12px] tracking-[0.2em] uppercase text-[#a48589] mb-4">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Privacy policy
        </h1>
        <p className="mt-3 text-[#7a5b6e]">Last updated: {LAST_UPDATED}</p>

        <Section title="Summary">
          <p>
            MenuWela operates a restaurant ordering platform. When a customer places an order through a restaurant
            using MenuWela, the restaurant (the data controller) collects the contact, address and order details
            needed to deliver that order. MenuWela (the data processor) stores and transmits that data on the
            restaurant's behalf. We never sell personal data and never use it for advertising.
          </p>
        </Section>

        <Section title="Who we are">
          <p>
            MenuWela is operated by MenuWela BV, registered in Belgium. Contact:{' '}
            <a href="mailto:info@menuwela.com" className="text-[#3b1f4b] underline underline-offset-2 hover:text-[#a48589]">info@menuwela.com</a>.
          </p>
        </Section>

        <Section title="What data we process">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Order data</strong> — items, options, prices, table number or pickup/delivery selection, customer notes.</li>
            <li><strong>Contact details</strong> — name, phone and email for delivery and pickup orders so the restaurant can reach you about your order.</li>
            <li><strong>Delivery address</strong> — street, number, postal code and city, only for delivery orders.</li>
            <li><strong>Payment data</strong> — handled by our payment processor (Mollie or Stripe). MenuWela never receives or stores card or bank account numbers.</li>
            <li><strong>Technical data</strong> — preferred language and theme stored in your browser's localStorage so the menu remembers your choices. No tracking cookies, no advertising IDs.</li>
            <li><strong>Server logs</strong> — IP address and basic request metadata, kept for 14 days for security and abuse prevention.</li>
          </ul>
        </Section>

        <Section title="Legal basis">
          <p>
            We process order data under the contract you enter into with the restaurant when you place an order
            (GDPR article 6(1)(b)). Payment data is processed to comply with our legal accounting obligations
            (article 6(1)(c)). Server logs are processed under our legitimate interest in keeping the service
            secure and available (article 6(1)(f)).
          </p>
        </Section>

        <Section title="How long we keep your data">
          <p>
            Order and contact data are retained as long as the restaurant requires them to fulfil legal accounting
            obligations (typically 7 years in Belgium). After that period the data is permanently deleted.
            Browser-side preferences (cart, language, theme) live only in your device's localStorage and you can
            clear them at any time from your browser settings.
          </p>
        </Section>

        <Section title="Who we share data with">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>The restaurant</strong> you ordered from receives your order, contact details and (for delivery) your address.</li>
            <li><strong>The payment processor</strong> (Mollie or Stripe) receives the transaction details required to process your payment.</li>
            <li><strong>Our infrastructure providers</strong> (DigitalOcean for hosting, in EU data centres) process data on our behalf under a data processing agreement.</li>
          </ul>
          <p className="mt-3">We never sell personal data and never share it for advertising purposes.</p>
        </Section>

        <Section title="Your rights">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>Access the data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Have your data erased (subject to legal retention obligations)</li>
            <li>Object to or restrict processing</li>
            <li>Receive a portable copy of your data</li>
            <li>Lodge a complaint with the Belgian Data Protection Authority (Gegevensbeschermingsautoriteit)</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:info@menuwela.com" className="text-[#3b1f4b] underline underline-offset-2 hover:text-[#a48589]">info@menuwela.com</a>.
            For order-specific requests, contact the restaurant directly — they are the data controller.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            MenuWela does not use tracking cookies or analytics. The only browser storage we use is localStorage
            for your cart, language and theme preference, and (after a successful order) a secret key so you can
            return to your order tracking page.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes we will update the "Last updated" date at the top of this page. Continued
            use of MenuWela after a change constitutes acceptance of the revised policy.
          </p>
        </Section>
      </main>
      <LegalFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl sm:text-2xl font-bold text-[#3b1f4b] mb-4">{title}</h2>
      <div className="text-[15px] leading-relaxed text-[#5b3a4c] space-y-3">{children}</div>
    </section>
  );
}

function LegalNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#faf6f3]/70 border-b border-[#3b1f4b]/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center" aria-label="MenuWela home">
          <img src="/menuwela-light.png" alt="MenuWela" className="h-7 w-auto" />
        </a>
        <a
          href="/"
          className="px-5 py-2 text-[13px] font-semibold tracking-wide rounded-full text-[#3b1f4b] border border-[#3b1f4b]/15 hover:bg-[#3b1f4b]/5 transition-colors"
        >
          Back to home
        </a>
      </div>
    </nav>
  );
}

function LegalFooter() {
  return (
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
  );
}
