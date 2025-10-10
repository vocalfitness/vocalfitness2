import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { language, isItalian } = useLanguage();

  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e) => {
      setMousePosition({ 
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const content = mockData.languages[language].hero;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Dynamic gradient background */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
            rgba(59, 130, 246, 0.1) 0%, 
            rgba(16, 185, 129, 0.05) 35%, 
            transparent 70%)`
        }}
      />

      {/* Animated grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full px-4 py-2 mb-8 group hover:border-blue-500/50 transition-all duration-300">
            <Sparkles size={16} className="text-blue-400 group-hover:animate-pulse" />
            <span className="text-sm text-slate-300 font-medium">
              {isItalian ? 'Metodo Proprietario Brevettato' : 'Proprietary Patented Method'}
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
              VocalFitness
            </span>
            <br />
            <span className="text-slate-300 text-2xl md:text-4xl lg:text-5xl font-normal">
              {isItalian ? "L'Eccellenza nella" : "Excellence in"}
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              {isItalian ? "Fonetica Articolatoria" : "Articulatory Phonetics"}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-4xl mx-auto leading-relaxed">
            {content.subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              size="lg"
              className="group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-blue-500/25"
            >
              {content.ctaButtons[0].text}
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
            
            <Button 
              variant="outline"
              size="lg"
              className="group border-2 border-slate-600 bg-slate-900/50 backdrop-blur-sm hover:border-blue-500 hover:bg-slate-800/80 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300"
            >
              <Play size={20} className="mr-2 group-hover:scale-110 transition-transform duration-200" />
              {content.ctaButtons[1].text}
            </Button>
          </div>

          {/* Floating cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {(isItalian ? [
              { title: "Risultati in 8-12 Settimane", desc: "Trasformazione rapida e permanente" },
              { title: "Metodo Brevettato", desc: "Approccio scientifico validato" },
              { title: "Leader Globali", desc: "Migliaia di professionisti formati" }
            ] : [
              { title: "Results in 8-12 Weeks", desc: "Rapid and permanent transformation" },
              { title: "Patented Method", desc: "Scientifically validated approach" },
              { title: "Global Leaders", desc: "Thousands of professionals trained" }
            ]).map((item, index) => (
              <div 
                key={index}
                className={`bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-500 transform hover:-translate-y-2 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-slate-400 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;