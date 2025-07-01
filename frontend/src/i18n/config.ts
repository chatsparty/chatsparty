import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

import enTranslation from './locales/en/translation.json';
import arTranslation from './locales/ar/translation.json';

const resources = {
  en: {
    translation: enTranslation
  },
  ar: {
    translation: arTranslation
  }
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },

    interpolation: {
      escapeValue: false // React already does escaping
    },

    react: {
      useSuspense: false // Disable suspense mode for better control
    }
  });

export default i18n;

// Helper function to get current direction
export const getDirection = (language: string) => {
  return language === 'ar' ? 'rtl' : 'ltr';
};

// Helper function to get current language
export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

// Helper function to change language and update document direction
export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
  const direction = getDirection(language);
  
  // Update HTML attributes
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  
  // Store preference
  localStorage.setItem('i18nextLng', language);
};