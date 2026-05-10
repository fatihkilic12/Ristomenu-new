import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './lang/en.json';
import nl from './lang/nl.json';
import fr from './lang/fr.json';
import tr from './lang/tr.json';
import de from './lang/de.json';

const resources = {
  en: { translation: en },
  nl: { translation: nl },
  fr: { translation: fr },
  tr: { translation: tr },
  de: { translation: de },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    resources,
    defaultNS: 'translation',
    fallbackLng: 'en',
    supportedLngs: ['en', 'nl', 'fr', 'de', 'tr'],
    interpolation: { escapeValue: false },
    debug: false,
  });

export default i18n;
