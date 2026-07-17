import { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [language, setLanguage] = useState('Auto Detect');

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: ['Auto Detect', 'English', 'Spanish', 'French', 'German', 'Arabic', 'Urdu'],
    }),
    [language],
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
