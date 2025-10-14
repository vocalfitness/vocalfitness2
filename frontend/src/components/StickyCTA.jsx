import React, { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const StickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  const content = {
    it: {
      text: "Prenota Valutazione Gratuita",
      subtext: "Scopri il tuo livello"
    },
    en: {
      text: "Book Free Assessment",
      subtext: "Discover your level"
    }
  };

  const text = content[language] || content.en;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative group">
        
        {/* Glow effect - non deve bloccare click */}
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse pointer-events-none"></div>
        
        {/* Main button */}
        <a 
          href="mailto:info@vocalfitness.org?subject=Richiesta%20Valutazione%20Gratuita"
          className="relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer z-10"
        >
          <Calendar size={24} className="animate-bounce pointer-events-none" />
          <div className="flex flex-col pointer-events-none">
            <span className="text-sm leading-tight">{text.text}</span>
            <span className="text-xs opacity-90">{text.subtext}</span>
          </div>
        </a>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-1 shadow-lg transition-all duration-200 hover:scale-110 z-20"
        >
          <X size={16} />
        </button>

        {/* Pulse ring - non deve bloccare click */}
        <div className="absolute inset-0 rounded-2xl border-4 border-blue-400 opacity-0 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500 pointer-events-none"></div>

      </div>
    </div>
  );
};

export default StickyCTA;
