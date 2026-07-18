import { createContext, useContext, useMemo, useState } from 'react';
import {
  defaultSiteLanguage,
  defaultTranscriptionLanguage,
  siteLanguageOptions,
  transcriptionLanguageOptions,
  translations,
} from '../i18n/translations.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [siteLanguage, setSiteLanguage] = useState(defaultSiteLanguage);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState(defaultTranscriptionLanguage);

  const value = useMemo(
    () => {
      const activeTranslations = translations[siteLanguage] || translations[defaultSiteLanguage];

      function t(path) {
        const value = path.split('.').reduce((current, key) => current?.[key], activeTranslations);
        const fallback = path
          .split('.')
          .reduce((current, key) => current?.[key], translations[defaultSiteLanguage]);

        if (value !== undefined && value !== null) {
          return value;
        }

        return fallback || path;
      }

      return {
        siteLanguage,
        setSiteLanguage,
        siteLanguages: siteLanguageOptions,
        transcriptionLanguage,
        setTranscriptionLanguage,
        transcriptionLanguages: transcriptionLanguageOptions,
        t,
      };
    },
    [siteLanguage, transcriptionLanguage],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }

  return context;
}
