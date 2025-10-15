import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';

const ProcessSection = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Auto-advance through steps
          const interval = setInterval(() => {
            setActiveStep(prev => (prev + 1) % mockData.process.length);
          }, 3000);

          return () => clearInterval(interval);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="process" ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
      
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <div className="absolute top-2/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Il Processo VocalFitness
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
            Dal Diagnostic alla Mastery: Un percorso strutturato verso l'eccellenza comunicativa
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full"></div>
        </div>

        {/* Process Steps */}
        <div className="relative">
          
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-slate-700 via-blue-500/50 to-slate-700 transform -translate-y-1/2"></div>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {mockData.process.map((step, index) => {
              const isActive = activeStep === index;
              const isCompleted = activeStep > index;
              
              return (
                <div 
                  key={index}
                  className={`relative transition-all duration-1000 delay-${(index + 1) * 200} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  onMouseEnter={() => setActiveStep(index)}
                >
                  
                  {/* Step card */}
                  <div className={`relative bg-slate-800/50 backdrop-blur-md border rounded-2xl p-6 transition-all duration-500 transform hover:scale-105 ${
                    isActive 
                      ? 'border-blue-500/50 bg-slate-800/70 shadow-2xl shadow-blue-500/10' 
                      : isCompleted 
                        ? 'border-emerald-500/50 bg-slate-800/60' 
                        : 'border-slate-700/50 hover:border-blue-500/30'
                  }`}>
                    
                    {/* Step number/check */}
                    <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                        : isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white animate-pulse'
                          : 'bg-slate-700 text-slate-400 border-2 border-slate-600'
                    }`}>
                      {isCompleted ? <CheckCircle size={24} /> : step.step}
                    </div>

                    {/* Content */}
                    <div className="pt-4">
                      <h3 className={`text-lg font-bold mb-3 transition-colors duration-300 ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}>
                        {step.title}
                      </h3>
                      
                      <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}>
                        {step.description}
                      </p>

                      {/* Progress indicator */}
                      {isActive && (
                        <div className="mt-4 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>

                    {/* Arrow for desktop */}
                    {index < mockData.process.length - 1 && (
                      <div className="hidden lg:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                        <ArrowRight size={24} className={`transition-colors duration-500 ${
                          isCompleted ? 'text-emerald-500' : isActive ? 'text-blue-500' : 'text-slate-600'
                        }`} />
                      </div>
                    )}

                  </div>

                  {/* Mobile arrow */}
                  {index < mockData.process.length - 1 && (
                    <div className="lg:hidden flex justify-center mt-4 mb-4">
                      <ArrowRight size={24} className="text-slate-600 rotate-90" />
                    </div>
                  )}
                  
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom info */}
        <div className={`mt-20 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Flexibility info */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-500">
              <h3 className="text-xl font-bold text-white mb-4">Flessibilità Delivery Ibrida</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Riconoscendo agende esigenti di professionisti globali, VocalFitness offre modalità delivery 
                flessibili che mantengono rigore pedagogico pur accomodando vincoli logistici.
              </p>
              <div className="flex items-center gap-2 text-blue-400">
                <CheckCircle size={16} />
                <span className="text-sm">Sessioni in-person e virtuali</span>
              </div>
            </div>

            {/* Results timeline */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-500">
              <h3 className="text-xl font-bold text-white mb-4">Timeline dei Risultati</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Settimane 1-3</span>
                  <span className="text-blue-400 text-sm">Fondamenti & Diagnosi</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Settimane 4-8</span>
                  <span className="text-cyan-400 text-sm">Condizionamento Intensivo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Settimane 8-12</span>
                  <span className="text-emerald-400 text-sm">Mastery & Consolidamento</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ProcessSection;