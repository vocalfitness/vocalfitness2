import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Clock, Users, Award } from 'lucide-react';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';

const StatsSection = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValues, setAnimatedValues] = useState([0, 0, 0, 0]);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          animateNumbers();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateNumbers = () => {
    const targets = [96, 12, 89, 100];
    const duration = 2000;
    const steps = 60;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep <= steps) {
        const progress = currentStep / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedValues(targets.map(target => Math.floor(target * easeOut)));
        currentStep++;
      } else {
        clearInterval(interval);
        setAnimatedValues(targets);
      }
    }, duration / steps);
  };

  const icons = [TrendingUp, Clock, Users, Award];

  return (
    <section id="results" ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Risultati Trasformativi
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            VocalFitness produce risultati misurabili che trascendono miglioramenti marginali
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {mockData.stats.map((stat, index) => {
            const IconComponent = icons[index];
            
            return (
              <div 
                key={index}
                className={`relative group transition-all duration-1000 delay-${(index + 1) * 100} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 text-center hover:border-blue-500/50 hover:bg-slate-800/70 transition-all duration-500 transform hover:scale-105 group">
                  
                  {/* Icon */}
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-2xl flex items-center justify-center border border-slate-600/50 group-hover:border-blue-500/50 transition-all duration-300">
                    <IconComponent size={32} className="text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>

                  {/* Animated Number */}
                  <div className="text-4xl md:text-5xl font-bold mb-2">
                    <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                      {animatedValues[index]}{stat.value.includes('%') ? '%' : ''}
                      {stat.value.includes('-') && index === 1 ? '-' + stat.value.split('-')[1] : ''}
                    </span>
                  </div>

                  {/* Label */}
                  <h3 className="text-lg font-semibold text-slate-300 group-hover:text-white transition-colors duration-300 mb-2">
                    {stat.label}
                  </h3>

                  {/* Additional description based on index */}
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                    {index === 0 && "Gli studenti riportano incrementi drammatici nella comprensibilità"}
                    {index === 1 && "Timeframe tipico per trasformazioni vocali significative"}
                    {index === 2 && "Dirigenti clienti che riportano accelerazione in promozioni"}
                    {index === 3 && "Tasso di soddisfazione tra professionisti che completano il programma"}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-2000 ease-out"
                      style={{ 
                        width: isVisible ? `${animatedValues[index]}%` : '0%',
                        transitionDelay: `${index * 200}ms`
                      }}
                    ></div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom testimonial */}
        <div className={`mt-16 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md border border-slate-600/50 rounded-3xl p-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-6xl text-blue-400 mb-4">"</div>
              <blockquote className="text-xl md:text-2xl text-slate-300 italic leading-relaxed mb-6">
                {mockData.testimonials[0].text}
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div>
                  <div className="text-blue-400 font-semibold">{mockData.testimonials[0].author}</div>
                  <div className="text-slate-400 text-sm">{mockData.testimonials[0].role}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default StatsSection;