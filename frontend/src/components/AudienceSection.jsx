import React, { useEffect, useRef, useState } from 'react';
import { Briefcase, Globe, Mic, GraduationCap } from 'lucide-react';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';

const AudienceSection = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const sectionRef = useRef(null);

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

  const iconMap = {
    'briefcase': Briefcase,
    'globe': Globe,
    'mic': Mic,
    'graduation-cap': GraduationCap
  };

  const content = {
    it: {
      title: "Chi Beneficia di VocalFitness",
      subtitle: "VocalFitness è progettato per professionisti d'élite che operano nei contesti comunicativi più esigenti del mondo",
      benefits: [
        ["Conference call globali", "Presentazioni agli stakeholder", "Negoziazioni multimilionarie"],
        ["Collaborazione internazionale", "Avanzamento carriera", "Eliminazione barriere comunicative"],
        ["Ruoli cinematografici", "Produzioni teatrali", "Registrazioni musicali"],
        ["Oratori keynote", "Impatto pedagogico", "Influenza accademica"]
      ],
      cta: {
        title: "Sei Pronto per la Trasformazione?",
        description: "Indipendentemente dal tuo settore professionale, VocalFitness può sbloccare il tuo pieno potenziale comunicativo e aprirti nuove opportunità a livello globale.",
        button: "Scopri Come Iniziare"
      }
    },
    en: {
      title: "Who Benefits from VocalFitness",
      subtitle: "VocalFitness is designed for elite professionals operating in the world's most demanding communication contexts",
      benefits: [
        ["Global conference calls", "Stakeholder presentations", "Multi-million negotiations"],
        ["International collaboration", "Career advancement", "Communication barrier elimination"],
        ["Film roles", "Theatrical productions", "Music recordings"],
        ["Keynote speakers", "Pedagogical impact", "Academic influence"]
      ],
      cta: {
        title: "Ready for Transformation?",
        description: "Regardless of your professional sector, VocalFitness can unlock your full communication potential and open new global opportunities.",
        button: "Discover How to Start"
      }
    }
  };

  const text = content[language] || content.en;

  return (
    <section ref={sectionRef} className="py-24 bg-slate-950 relative overflow-hidden">
      
      {/* Dynamic background elements */}
      <div className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i}
            className={`absolute w-32 h-32 rounded-full blur-3xl animate-pulse`}
            style={{
              background: `radial-gradient(circle, ${
                i % 2 === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)'
              }, transparent)`,
              top: `${20 + (i * 15)}%`,
              left: `${10 + (i * 20)}%`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Chi Beneficia di VocalFitness
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            VocalFitness è progettato per professionisti d'élite che operano nei contesti comunicativi più esigenti del mondo
          </p>
        </div>

        {/* Audience Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {mockData.targetAudience.map((audience, index) => {
            const IconComponent = iconMap[audience.icon];
            const isHovered = hoveredCard === index;
            
            return (
              <div 
                key={index}
                className={`transition-all duration-1000 delay-${(index + 1) * 150} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Glow effect for hovered card */}
                {isHovered && (
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl transition-all duration-500"></div>
                )}
                
                <div className={`relative bg-slate-800/50 backdrop-blur-md border rounded-3xl p-8 h-full hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 group ${
                  isHovered ? 'border-blue-500/50 bg-slate-800/70' : 'border-slate-700/50'
                }`}>
                  
                  {/* Icon with animated background */}
                  <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${
                    isHovered 
                      ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/50' 
                      : 'bg-slate-700/50 border-slate-600/50 group-hover:bg-slate-600/50'
                  } border`}>
                    <IconComponent size={36} className={`transition-all duration-500 ${
                      isHovered ? 'text-blue-400 scale-110' : 'text-slate-400 group-hover:text-blue-400'
                    }`} />
                    
                    {/* Animated ring */}
                    {isHovered && (
                      <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/30 animate-ping"></div>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                    isHovered ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {audience.title}
                  </h3>
                  
                  <p className={`text-lg leading-relaxed transition-colors duration-300 ${
                    isHovered ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-300'
                  }`}>
                    {audience.description}
                  </p>

                  {/* Benefits list based on audience type */}
                  <div className="mt-6 space-y-3">
                    {index === 0 && [ // Dirigenti
                      "Conference call globali",
                      "Presentazioni agli stakeholder", 
                      "Negoziazioni multimilionarie"
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                        <span className="text-slate-400 text-sm">{benefit}</span>
                      </div>
                    ))}
                    
                    {index === 1 && [ // Professionisti
                      "Collaborazione internazionale",
                      "Avanzamento carriera",
                      "Eliminazione barriere comunicative"
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                        <span className="text-slate-400 text-sm">{benefit}</span>
                      </div>
                    ))}

                    {index === 2 && [ // Attori e Cantanti
                      "Ruoli cinematografici",
                      "Produzioni teatrali",
                      "Registrazioni musicali"
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                        <span className="text-slate-400 text-sm">{benefit}</span>
                      </div>
                    ))}

                    {index === 3 && [ // Leader Accademici
                      "Oratori keynote",
                      "Impatto pedagogico",
                      "Influenza accademica"
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                        <span className="text-slate-400 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-6 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ${
                      isHovered ? 'w-full' : 'w-0'
                    }`}></div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-gradient-to-r from-slate-800/30 to-slate-700/30 backdrop-blur-md border border-slate-600/50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Sei Pronto per la Trasformazione?</h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Indipendentemente dal tuo settore professionale, VocalFitness può sbloccare il tuo pieno potenziale comunicativo 
              e aprirti nuove opportunità a livello globale.
            </p>
            <button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25">
              Scopri Come Iniziare
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AudienceSection;