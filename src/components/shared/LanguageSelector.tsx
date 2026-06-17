import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import i18n from '@/locales';

const LANG_CONFIG: Record<string, { label: string; flag: string }> = {
  nl: { label: 'Nederlands', flag: '🇳🇱' },
  fr: { label: 'Français', flag: '🇫🇷' },
  en: { label: 'English', flag: '🇬🇧' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  tr: { label: 'Türkçe', flag: '🇹🇷' },
};

type Props = {
  languages: string[];
  defaultLang?: string;
  variant?: 'light' | 'dark';
  /** Visual size of the trigger + dropdown. Default 'md' matches the
   *  mobile/desktop storefront header; 'lg' is for the kiosk where
   *  everything renders at arm's length on a big vertical screen. */
  size?: 'md' | 'lg';
};

export default function LanguageSelector({ languages, defaultLang, variant = 'light', size = 'md' }: Props) {
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Anchor coords for the portalled dropdown. Measured on open from the
  // trigger's bounding rect so the dropdown floats below it regardless
  // of where in the page tree the selector lives. Kept in viewport
  // coords (matches `position: fixed`) — the portal renders to
  // document.body, so no offsetParent translation is needed.
  const [anchor, setAnchor] = useState<{top: number; right: number} | null>(null);

  useEffect(() => {
    const handler = (lang: string) => setCurrentLang(lang);
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  const available = Array.from(new Set(
    [...(languages || []), defaultLang].filter(Boolean) as string[]
  ));

  useEffect(() => {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && available.includes(saved)) {
      i18n.changeLanguage(saved);
    } else if (defaultLang && !available.includes(currentLang)) {
      i18n.changeLanguage(defaultLang);
    }
  }, [defaultLang]);

  const change = (lang: string) => {
    localStorage.setItem('i18nextLng', lang);
    i18n.changeLanguage(lang);
    setOpen(false);
  };

  if (available.length <= 1) return null;

  const currentConfig = LANG_CONFIG[currentLang];
  const isDark = variant === 'dark';
  const isLg = size === 'lg';

  // Size buckets — kept inline (no Tailwind dynamic interpolation) so
  // PurgeCSS keeps both sets in the build.
  const triggerCls = isLg
    ? 'gap-3 px-6 py-3.5 text-2xl'
    : 'gap-1.5 px-3 py-1.5 text-sm';
  const flagCls = isLg ? 'text-4xl leading-none' : 'text-lg leading-none';
  const codeCls = isLg ? 'uppercase text-lg font-bold tracking-wider' : 'uppercase text-xs font-bold tracking-wide';
  const dropdownCls = isLg
    ? 'mt-3 rounded-2xl min-w-[280px]'
    : 'mt-2 rounded-xl min-w-[180px]';
  const itemCls = isLg ? 'px-6 py-5 text-xl gap-5' : 'px-4 py-3 text-sm gap-3';
  const itemFlagCls = isLg ? 'text-3xl leading-none' : 'text-xl leading-none';

  const toggle = () => {
    if (!open) {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setAnchor({top: r.bottom, right: window.innerWidth - r.right});
    }
    setOpen(o => !o);
  };

  return (
    <>
      {/* Trigger — flag button */}
      <button
        ref={triggerRef}
        onClick={toggle}
        className={`flex items-center rounded-full font-medium transition-all ${triggerCls} ${
          isDark
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <span className={flagCls}>{currentConfig?.flag || '🌐'}</span>
        <span className={codeCls}>{currentLang}</span>
      </button>

      {/* Dropdown is portalled to document.body so it can't be hit-test-
          shadowed by a sibling stacking context (the kiosk name-entry
          page had a same-z-10 sibling rendered after the top bar, so
          the dropdown was visible but unclickable). Items use
          onMouseDown so the language change fires *before* the input's
          blur swallows the click on iOS-style WebViews. */}
      {open && anchor && createPortal(
        <>
          <div className="fixed inset-0 z-[2147483646]" onClick={() => setOpen(false)} />
          <div
            className={`fixed z-[2147483647] shadow-2xl overflow-hidden ${dropdownCls} ${
              isDark ? 'bg-[#1e293b] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            style={{top: anchor.top, right: anchor.right}}
          >
            {available.map(lang => {
              const config = LANG_CONFIG[lang];
              const isActive = lang === currentLang;
              return (
                <button
                  key={lang}
                  onMouseDown={(e) => { e.preventDefault(); change(lang); }}
                  onClick={(e) => e.preventDefault()}
                  className={`w-full text-left transition-colors flex items-center ${itemCls} ${
                    isActive
                      ? isDark ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-900'
                      : isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={itemFlagCls}>{config?.flag || '🏳️'}</span>
                  <span className={isActive ? 'font-semibold' : ''}>{config?.label || lang}</span>
                  {isActive && <span className="ml-auto text-[var(--color-primary)]">✓</span>}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
