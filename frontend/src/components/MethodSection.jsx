import React, { useEffect, useRef, useState } from 'react';
import { Brain, Waves, Zap } from 'lucide-react';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';

const MethodSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activePillar, setActivePillar] = useState(0);
  const sectionRef = useRef(null);
  const { language, isItalian } = useLanguage();

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

  const icons = [Brain, Waves, Zap];
  const content = mockData.method[language];

  return (
    <section id="method" ref={sectionRef} className="py-24 bg-slate-950 relative overflow-hidden">
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {mockData.method.title}
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
            {mockData.method.subtitle}
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full"></div>
        </div>

        {/* Three Pillars */}
        <div className="grid lg:grid-cols-3 gap-8">
          {mockData.method.pillars.map((pillar, index) => {
            const IconComponent = icons[index];
            const isActive = activePillar === index;
            
            return (
              <div 
                key={index}
                className={`relative transition-all duration-1000 delay-${(index + 1) * 200} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                onMouseEnter={() => setActivePillar(index)}
              >
                {/* Glow effect for active pillar */}
                {isActive && (
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl transition-all duration-500"></div>
                )}
                
                <div className={`relative bg-slate-800/50 backdrop-blur-md border rounded-3xl p-8 h-full hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 group ${
                  isActive ? 'border-blue-500/50 bg-slate-800/70' : 'border-slate-700/50'
                }`}>
                  
                  {/* Number badge */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform duration-300">
                    {pillar.number}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/50' 
                      : 'bg-slate-700/50 border-slate-600/50 group-hover:bg-slate-600/50'
                  } border`}>
                    <IconComponent size={32} className={`transition-colors duration-300 ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'
                    }`} />
                  </div>

                  {/* Content */}
                  <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {pillar.title}
                  </h3>
                  
                  <p className={`leading-relaxed transition-colors duration-300 ${
                    isActive ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-300'
                  }`}>
                    {pillar.description}
                  </p>

                  {/* Progress line */}
                  <div className="mt-6 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ${
                      isActive ? 'w-full' : 'w-0 group-hover:w-1/2'
                    }`}></div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Approccio Scientifico Integrato</h3>
            <p className="text-slate-300 leading-relaxed">
              Questi tre pilastri lavorano sinergicamente per produrre trasformazioni vocali permanenti e misurabili. 
              VocalFitness non isola componenti comunicativi, ma integra fonologia, prosodia e condizionamento fisico 
              in un sistema coerente che produce fluidità autentica piuttosto che correzioni frammentate.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default MethodSection;