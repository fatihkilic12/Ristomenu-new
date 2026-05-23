import { useStoreConfig } from '@/context/StoreConfigContext';
import { getBranding } from '@/lib/branding';

type Props = {
  // Tweak colours for darker / lighter parent backgrounds. Defaults to the
  // theme-variable-based palette which works in both light pages and
  // dark-themed pages.
  className?: string;
};

export default function StoreFooter({ className = '' }: Props) {
  const { company } = useStoreConfig();
  const b = getBranding(company);

  const hasSocial = !!(b.website_url || b.instagram_url || b.facebook_url);
  if (!b.footer_text && !hasSocial) return null;

  return (
    <footer
      className={`px-6 py-7 border-t border-[var(--color-border)] text-[var(--color-muted)] ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {b.footer_text && (
          <p className="text-xs sm:text-sm text-center sm:text-left max-w-2xl">
            {b.footer_text}
          </p>
        )}
        {hasSocial && (
          <div className="flex items-center gap-2">
            {b.website_url && (
              <SocialLink href={b.website_url} label="Website" icon={<GlobeIcon />} />
            )}
            {b.instagram_url && (
              <SocialLink href={b.instagram_url} label="Instagram" icon={<InstagramIcon />} />
            )}
            {b.facebook_url && (
              <SocialLink href={b.facebook_url} label="Facebook" icon={<FacebookIcon />} />
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
    >
      {icon}
    </a>
  );
}

const iconCls = 'w-[18px] h-[18px]';

function GlobeIcon() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
