import { useEffect, useState } from 'react';
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
};

export default function LanguageSelector({ languages, defaultLang, variant = 'light' }: Props) {
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [open, setOpen] = useState(false);

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

  return (
    <div className="relative">
      {/* Trigger — flag button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          isDark
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <span className="text-lg leading-none">{currentConfig?.flag || '🌐'}</span>
        <span className="uppercase text-xs font-bold tracking-wide">{currentLang}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 top-full mt-2 z-50 rounded-xl shadow-2xl overflow-hidden min-w-[180px] ${
            isDark ? 'bg-[#1e293b] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            {available.map(lang => {
              const config = LANG_CONFIG[lang];
              const isActive = lang === currentLang;
              return (
                <button
                  key={lang}
                  onClick={() => change(lang)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                    isActive
                      ? isDark ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-900'
                      : isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl leading-none">{config?.flag || '🏳️'}</span>
                  <span className={isActive ? 'font-semibold' : ''}>{config?.label || lang}</span>
                  {isActive && <span className="ml-auto text-[var(--color-primary)]">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
