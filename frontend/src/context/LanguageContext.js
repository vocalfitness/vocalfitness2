import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Initialize from localStorage or default to Italian
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('vocalfitness-language');
    return saved || 'it';
  });

  // Save to localStorage whenever language changes
  useEffect(() => {
    localStorage.setItem('vocalfitness-language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'it' ? 'en' : 'it');
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    isItalian: language === 'it',
    isEnglish: language === 'en'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};