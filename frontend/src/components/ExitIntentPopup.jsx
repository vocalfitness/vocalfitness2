import React, { useState, useEffect } from 'react';
import { X, Gift, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ExitIntentPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const handleMouseLeave = (e) => {
      // Trigger when mouse leaves from top of viewport
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const content = {
    it: {
      title: "Aspetta! Non Andartene Ancora! 🎁",
      subtitle: "Offerta Esclusiva per Te",
      discount: "20% DI SCONTO",
      description: "sulla tua prima consulenza con Professor Steve Dapper",
      features: [
        "✓ Valutazione completa del tuo livello",
        "✓ Piano personalizzato su misura",
        "✓ 14 lezioni per risultati garantiti"
      ],
      cta: "Richiedi Offerta",
      disclaimer: "Offerta valida solo per oggi",
      close: "No grazie, non sono interessato"
    },
    en: {
      title: "Wait! Don't Leave Yet! 🎁",
      subtitle: "Exclusive Offer for You",
      discount: "20% OFF",
      description: "on your first consultation with Professor Steve Dapper",
      features: [
        "✓ Complete level assessment",
        "✓ Personalized custom plan",
        "✓ 14 lessons for guaranteed results"
      ],
      cta: "Claim Offer",
      disclaimer: "Offer valid today only",
      close: "No thanks, I'm not interested"
    }
  };

  const text = content[language] || content.en;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] animate-fadeIn"
        onClick={handleClose}
      ></div>

      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-2xl mx-4 animate-slideIn">
        
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-2 border-blue-500/30 shadow-2xl overflow-hidden">
          
          {/* Animated background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-600/10"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 animate-shimmer"></div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full p-2 transition-all duration-200 hover:scale-110 z-10"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="relative p-8 md:p-12">
            
            {/* Sparkles decoration */}
            <div className="flex justify-center mb-4">
              <Sparkles className="text-yellow-400 animate-pulse" size={32} />
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-black text-center mb-2">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {text.title}
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-slate-400 text-center mb-6">{text.subtitle}</p>

            {/* Discount badge */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl">
                  <Gift className="inline-block mr-2" size={24} />
                  <span className="text-3xl font-black">{text.discount}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-slate-300 text-center text-lg mb-6">{text.description}</p>

            {/* Features */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 space-y-3">
              {text.features.map((feature, index) => (
                <div key={index} className="text-slate-200 flex items-center gap-2">
                  <span className="text-emerald-400 text-lg">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <a href="mailto:info@vocalfitness.org?subject=Richiesta%20Offerta%2020%25%20Sconto">
              <button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl group flex items-center justify-center gap-2">
                {text.cta}
                <ArrowRight className="group-hover:translate-x-1 transition-transform duration-200" size={20} />
              </button>
            </a>

            {/* Disclaimer */}
            <p className="text-center text-yellow-400 text-sm mt-4 flex items-center justify-center gap-2">
              <span className="animate-pulse">⏰</span>
              {text.disclaimer}
            </p>

            {/* Close text link */}
            <button 
              onClick={handleClose}
              className="w-full text-slate-500 hover:text-slate-400 text-sm mt-4 transition-colors duration-200"
            >
              {text.close}
            </button>

          </div>

        </div>

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }

        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
      `}</style>
    </>
  );
};

export default ExitIntentPopup;
