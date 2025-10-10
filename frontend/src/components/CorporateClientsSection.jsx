import React, { useEffect, useRef, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CorporateClientsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const { language } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Loghi processati uniformemente dal sito vocalfitness.org
  const clients = [
    {
      name: "BASF",
      logo: "https://cloud-1de12d.becdn.net/media/iW=258&iH=129&oX=0&oY=0&cW=258&cH=129/fde7d7897bc94923b604e7bbdbdb4ebf.png"
    },
    {
      name: "Accenture",
      logo: "https://cloud-1de12d.becdn.net/media/iW=186&iH=67&oX=0&oY=0&cW=186&cH=67/ad63d8b5dd6f42c132feb7830ee8635d.png"
    },
    {
      name: "Electrolux",
      logo: "https://cloud-1de12d.becdn.net/media/iW=204&iH=62&oX=0&oY=0&cW=204&cH=62/9bdf47c0e9c11b5ee82291427314fc43.png"
    },
    {
      name: "Yamazaki Mazak",
      logo: "https://cloud-1de12d.becdn.net/media/iW=248&iH=57&oX=0&oY=0&cW=248&cH=57/9334e7569be83631b89f4ee7c5672352.png"
    },
    {
      name: "Mediaset",
      logo: "https://cloud-1de12d.becdn.net/media/iW=268&iH=62&oX=0&oY=0&cW=268&cH=62/c2d94e2324eff72aa501e32293a2b265.png"
    }
  ];

  // Aggiungiamo i clienti aggiuntivi dalla lista dell'utente
  // Per questi useremo loghi placeholder uniformi dato che non erano su vocalfitness.org
  const additionalClients = [
    "The Boston Consulting Group",
    "Hitachi",
    "Dell Technologies",
    "The Alfio Bardolla Group",
    "TEVA Pharmaceuticals",
    "DIPHARMA"
  ];

  const content = {
    it: {
      title: "Aziende che ci hanno già scelto",
      subtitle: "Le più importanti multinazionali e aziende Fortune 500 si affidano al metodo VocalFitness"
    },
    en: {
      title: "Companies That Already Chose Us",
      subtitle: "Leading multinationals and Fortune 500 companies trust the VocalFitness method"
    }
  };

  const text = content[language] || content.en;

  return (
    <section id="corporate-clients" ref={sectionRef} className="py-20 bg-slate-900 relative overflow-hidden">
      
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 size={32} className="text-emerald-400" />
            <h2 className="text-3xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                {text.title}
              </span>
            </h2>
          </div>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">
            {text.subtitle}
          </p>
        </div>

        {/* Main Clients Grid - Loghi uniformi dal sito vocalfitness.org */}
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {clients.map((client, index) => (
            <div 
              key={index} 
              className="group flex items-center justify-center p-8 bg-slate-800/20 backdrop-blur-sm border border-slate-700/30 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-800/40 transition-all duration-500"
              style={{ 
                transitionDelay: `${index * 100}ms` 
              }}
            >
              <img 
                src={client.logo} 
                alt={`${client.name} logo`}
                className="w-full h-auto object-contain filter brightness-0 invert opacity-60 group-hover:opacity-100 transition-all duration-500"
              />
            </div>
          ))}

        </div>

        {/* Additional Clients - Text based */}
        <div className={`mt-12 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-wrap justify-center gap-4">
            {additionalClients.map((client, index) => (
              <div 
                key={index}
                className="group px-6 py-3 bg-slate-800/20 backdrop-blur-sm border border-slate-700/30 rounded-full hover:border-emerald-500/50 hover:bg-slate-800/40 transition-all duration-300"
              >
                <span className="text-sm font-medium text-slate-400 group-hover:text-emerald-400 transition-colors duration-300">
                  {client}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-slate-800/30 backdrop-blur-sm border border-emerald-700/30 rounded-full">
            <Building2 size={24} className="text-emerald-400" />
            <span className="text-slate-300 text-lg">
              <span className="font-bold text-emerald-400 text-2xl">{clients.length + additionalClients.length}+</span> {language === 'it' ? 'aziende Fortune 500 e leader di mercato' : 'Fortune 500 companies and market leaders'}
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CorporateClientsSection;
