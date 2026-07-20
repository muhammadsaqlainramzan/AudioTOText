import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  defaultSiteLanguage,
  defaultTranscriptionLanguage,
  siteLanguageOptions,
  transcriptionLanguageOptions,
  translations,
} from '../i18n/translations.js';
import { getCurrentUser } from '../lib/api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [siteLanguage, setSiteLanguage] = useState(defaultSiteLanguage);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState(defaultTranscriptionLanguage);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((response) => {
        setCurrentUser(response.data?.user || null);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, []);

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
        currentUser,
        setCurrentUser,
        isAuthLoading,
        t,
      };
    },
    [siteLanguage, transcriptionLanguage, currentUser, isAuthLoading],
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
