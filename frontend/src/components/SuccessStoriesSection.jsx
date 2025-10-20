import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Award, Zap, ArrowUpRight, Film, Heart, Hammer, TrendingUpIcon, Scale, Plane } from 'lucide-react';
import { Button } from './ui/button';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';
import AliceChatbotModal from './AliceChatbotModal';

const SuccessStoriesSection = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState(0);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
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

  const icons = [TrendingUp, Award, Zap, Film, Heart, Hammer, TrendingUpIcon, Scale, Plane];
  const stories = mockData.successStories[language] || mockData.successStories.en;

  const content = {
    it: {
      title: "Storie di Successo Reali",
      subtitle: "L'Impatto di VocalFitness: trasformazioni professionali concrete che hanno aperto nuove opportunità",
      patternTitle: "Il Pattern del Successo",
      patternDescription: "Attraverso centinaia di clienti, emerge un pattern chiaro:",
      stats: [
        { stat: "52%", label: "Crescita Promozioni", desc: "Entro 18 Mesi" },
        { stat: "96%", label: "Comprensibilità", desc: "Rating Post-Training" },
        { stat: "100%", label: "Successo Rate", desc: "Obiettivi Raggiunti" }
      ]
    },
    en: {
      title: "Real Success Stories",
      subtitle: "VocalFitness Impact: concrete professional transformations that opened new opportunities",
      patternTitle: "The Success Pattern",
      patternDescription: "Across hundreds of clients, a clear pattern emerges:",
      stats: [
        { stat: "52%", label: "Promotion Growth", desc: "Within 18 Months" },
        { stat: "96%", label: "Comprehensibility", desc: "Post-Training Rating" },
        { stat: "100%", label: "Success Rate", desc: "Goals Achieved" }
      ]
    }
  };

  const text = content[language] || content.en;

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      
      {/* Dynamic background patterns */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.4) 0%, transparent 50%)
            `
          }} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {text.title}
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            {text.subtitle}
          </p>
        </div>

        {/* Story selector tabs - Grid layout for 9 stories */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-w-6xl mx-auto mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {stories.map((story, index) => {
            const IconComponent = icons[index];
            return (
              <Button
                key={index}
                variant={selectedStory === index ? "default" : "outline"}
                onClick={() => setSelectedStory(index)}
                className={`flex items-center justify-center gap-2 px-4 py-3 transition-all duration-300 text-sm ${
                  selectedStory === index 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg scale-105' 
                    : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-500/50 hover:text-white hover:scale-102'
                }`}
              >
                <IconComponent size={18} />
                <span className="truncate">{story.sector}</span>
              </Button>
            );
          })}
        </div>

        {/* Selected story display */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="relative max-w-6xl mx-auto">
            
            {/* Story card */}
            <div className="relative bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all duration-500">
              
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-3xl blur-2xl"></div>
              
              <div className="relative p-8 md:p-12">
                
                {/* Story number and title */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {stories[selectedStory].number}
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">
                          {stories[selectedStory].title}
                        </h3>
                        <div className="text-blue-400 font-semibold">
                          {language === 'it' ? 'Settore' : 'Sector'}: {stories[selectedStory].sector}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sector icon */}
                  <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center">
                    {React.createElement(icons[selectedStory], { size: 24, className: "text-cyan-400" })}
                  </div>
                </div>

                {/* Story content grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  
                  {/* Challenge */}
                  <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/30">
                    <h4 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Sfida Iniziale
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      {stories[selectedStory].challenge}
                    </p>
                  </div>

                  {/* Result */}
                  <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/30">
                    <h4 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      Risultato VocalFitness
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      {stories[selectedStory].result}
                    </p>
                  </div>

                </div>

                {/* Key metrics */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  
                  {[
                    { label: "Durata Programma", value: selectedStory === 0 ? "10 lezioni" : selectedStory === 1 ? "8 settimane" : "10 lezioni" },
                    { label: "Livello Raggiunto", value: selectedStory === 0 ? "C1+" : "C2" },
                    { label: "Impatto Carriera", value: selectedStory === 0 ? "Promozione" : selectedStory === 1 ? "Riconoscimento" : "Partnership" }
                  ].map((metric, index) => (
                    <div key={index} className="text-center bg-slate-800/30 rounded-xl p-4 hover:bg-slate-800/50 transition-all duration-300">
                      <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                      <div className="text-slate-400 text-sm">{metric.label}</div>
                    </div>
                  ))}

                </div>

                {/* Learn more button */}
                <div className="mt-8 text-center">
                  <Button 
                    onClick={() => setIsChatbotOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg group"
                  >
                    Scopri Come Replicare Questi Risultati
                    <ArrowUpRight size={20} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200" />
                  </Button>
                </div>

              </div>
              
            </div>

          </div>

        </div>

        {/* Bottom statistics */}
        <div className={`mt-16 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{text.patternTitle}</h3>
            <p className="text-slate-400">{text.patternDescription}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {text.stats.map((item, index) => (
              <div key={index} className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-center hover:border-blue-500/30 hover:bg-slate-800/50 transition-all duration-500 group">
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">
                  {item.stat}
                </div>
                <div className="text-blue-400 font-semibold mb-1">{item.label}</div>
                <div className="text-slate-400 text-sm">{item.desc}</div>
              </div>
            ))}

          </div>

        </div>

      </div>
    </section>
  );
};

export default SuccessStoriesSection;