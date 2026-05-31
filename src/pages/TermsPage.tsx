// Public terms of service. Linked from the marketing landing footer.
// Covers what MenuWela provides, what's billed where, and who's
// responsible for what when a restaurant uses MenuWela to take orders.

const FONT = "'Outfit', system-ui, -apple-system, sans-serif";
const LAST_UPDATED = '31 May 2026';

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[#faf6f3] text-[#3b1f4b]" style={{ fontFamily: FONT }}>
      <LegalNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <p className="text-[12px] tracking-[0.2em] uppercase text-[#a48589] mb-4">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Terms of service
        </h1>
        <p className="mt-3 text-[#7a5b6e]">Last updated: {LAST_UPDATED}</p>

        <Section title="What MenuWela is">
          <p>
            MenuWela is a software platform that restaurants use to take orders — through QR code menus on tables,
            tablets, self-service kiosks, and an online pickup or delivery page. These terms govern the
            relationship between MenuWela BV (the platform provider) and the restaurant using the service. They
            also apply to anyone visiting a restaurant's menu through MenuWela.
          </p>
        </Section>

        <Section title="Accounts and subscriptions">
          <p>
            A restaurant signs up at{' '}
            <a href="https://portal.menuwela.com/sign-up" className="text-[#3b1f4b] underline underline-offset-2 hover:text-[#a48589]">portal.menuwela.com</a>{' '}
            and chooses which modules to enable. The first 14 days are free; after that, the chosen modules are
            invoiced monthly. The Menu module is required and includes 10 active tablets. Modules can be added or
            removed at any time from the dashboard and take effect at the start of the next billing period.
          </p>
        </Section>

        <Section title="Pricing">
          <p>
            Current pricing (all prices excl. VAT):
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-2">
            <li><strong>Menu</strong> — €50/month (required base, includes 10 tablets). Extra tablets: €15 per 10 beyond the included 10.</li>
            <li><strong>Online ordering</strong> (pickup + delivery) — €30/month</li>
            <li><strong>Self-service kiosk</strong> — €25/month</li>
            <li><strong>Kitchen display (KDS)</strong> — €15/month</li>
            <li><strong>Advanced tablet</strong> (battery management + screen wake) — €15/month</li>
          </ul>
          <p className="mt-3">
            MenuWela does not charge commission on orders — the restaurant keeps 100% of revenue. Online payment
            processing is at standard PSP rates (Mollie or Stripe, billed by the PSP directly to the restaurant).
            Tablet count is measured as the number of devices that sent a heartbeat in the last 7 days.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>The restaurant agrees not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>Use MenuWela for any unlawful purpose or to sell goods that are illegal in the jurisdiction where the restaurant operates.</li>
            <li>Attempt to gain unauthorised access to MenuWela infrastructure, other restaurants' data, or customer accounts.</li>
            <li>Reverse engineer, decompile, or resell the platform without prior written agreement.</li>
            <li>Upload content that infringes third-party intellectual property rights.</li>
          </ul>
        </Section>

        <Section title="Restaurant content">
          <p>
            The restaurant is responsible for the accuracy of the menu, prices, allergen information and any
            promotional content displayed through MenuWela. Customers ordering through MenuWela enter into a
            contract with the restaurant — MenuWela only facilitates the transaction.
          </p>
        </Section>

        <Section title="Availability">
          <p>
            We aim for 99.5% uptime measured monthly and run scheduled maintenance during off-peak hours where
            possible. The menu and cart are cached on the customer's device, so brief connectivity issues during
            service do not prevent customers from browsing or building an order. We do not guarantee uninterrupted
            service and are not liable for downtime caused by upstream providers, customer device issues, or force
            majeure.
          </p>
        </Section>

        <Section title="Cancellation">
          <p>
            The restaurant can cancel at any time from the dashboard. Cancellation takes effect at the end of the
            current billing period — no refunds for partial months. There are no cancellation fees, lock-in
            contracts or hidden charges. Order data and menu content remain available for export for 30 days after
            cancellation, after which they are permanently deleted.
          </p>
        </Section>

        <Section title="Liability">
          <p>
            MenuWela's total liability under these terms is limited to the fees paid by the restaurant in the
            three months preceding the event giving rise to the claim. We are not liable for indirect or
            consequential damages, lost profits, or lost data resulting from the restaurant's failure to maintain
            its own backups of menu content. Nothing in these terms excludes liability that cannot be excluded by
            Belgian law.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may revise these terms from time to time. Material changes will be notified to active restaurants
            by email at least 30 days before they take effect. Continued use of MenuWela after the change date
            constitutes acceptance of the revised terms.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by Belgian law. Any dispute that cannot be resolved amicably will be brought
            before the competent courts of Antwerp, Belgium.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms?{' '}
            <a href="mailto:info@menuwela.com" className="text-[#3b1f4b] underline underline-offset-2 hover:text-[#a48589]">info@menuwela.com</a>
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
