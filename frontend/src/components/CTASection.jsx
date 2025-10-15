import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { ArrowRight, Calendar, Download, MessageCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CTASection = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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

    const handleMouseMove = (e) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const content = {
    it: {
      badge: "Il Percorso verso l'Eccellenza Comunicativa Inizia Oggi",
      heading1: "Inizia la Tua",
      heading2: "Trasformazione Vocale",
      subtitle: "Se sei un dirigente che aspira a comandare sale riunioni globali, un performer che richiede dizione impeccabile, o un leader accademico che desidera amplificare il proprio impatto—VocalFitness offre la soluzione trasformativa che stai cercando.",
      exclusivity: {
        title: "Esclusività Garantita:",
        text: " Il Professor Steve Dapper accetta un numero limitato di clienti per mantenere standard qualitativi eccezionali e fornire l'attenzione personalizzata che il metodo richiede."
      },
      cta1: {
        title: "Prenota Valutazione Diagnostica",
        description: "Sessione iniziale comprensiva che mappa pattern articolatori attuali e identifica opportunità trasformative specifiche.",
        button: "Prenota Consulenza Gratuita",
        disclaimer: "Nessun obbligo • Solo comprensione chiara"
      },
      cta2: {
        title: "Contatta Prof. Dapper",
        description: "Comunica direttamente con il creatore del metodo per discutere esigenze uniche e aspettative risultati.",
        button: "Contatto Diretto",
        disclaimer: "Conversazione confidenziale • Senza pressione"
      },
      cta3: {
        title: "Scarica Risorse Gratuite",
        description: "Accedi a guide complete che spiegano la scienza dietro VocalFitness e perché approcci tradizionali falliscono.",
        button: "Ottieni Risorse",
        disclaimer: "Nessuna registrazione • Download immediato"
      }
    },
    en: {
      badge: "The Journey to Communication Excellence Starts Today",
      heading1: "Begin Your",
      heading2: "Vocal Transformation",
      subtitle: "Whether you're an executive aspiring to command global boardrooms, a performer requiring impeccable diction, or an academic leader desiring to amplify your impact—VocalFitness offers the transformative solution you're looking for.",
      exclusivity: {
        title: "Guaranteed Exclusivity:",
        text: " Professor Steve Dapper accepts a limited number of clients to maintain exceptional quality standards and provide the personalized attention the method requires."
      },
      cta1: {
        title: "Book Diagnostic Assessment",
        description: "Comprehensive initial session that maps current articulatory patterns and identifies specific transformative opportunities.",
        button: "Book Free Consultation",
        disclaimer: "No obligation • Just clear understanding"
      },
      cta2: {
        title: "Contact Prof. Dapper",
        description: "Communicate directly with the method creator to discuss unique needs and result expectations.",
        button: "Direct Contact",
        disclaimer: "Confidential conversation • No pressure"
      },
      cta3: {
        title: "Download Free Resources",
        description: "Access comprehensive guides explaining the science behind VocalFitness and why traditional approaches fail.",
        button: "Get Resources",
        disclaimer: "No registration • Immediate download"
      },
      investment: {
        title: "Investment in Lasting Excellence",
        description: "VocalFitness represents an investment in permanent communication competence. Unlike language apps that produce temporary gains, the VocalFitness method rewires fundamental phonological architecture. Results persist because changes operate at a neuromuscular level—they become automatic and unconscious.",
        tagline: "VocalFitness is not an expense—it's a strategic investment in lasting excellence"
      }
    }
  };

  const text = content[language] || content.en;

  return (
    <section ref={sectionRef} className="py-24 bg-slate-950 relative overflow-hidden">
      
      {/* Dynamic background based on mouse position */}
      <div 
        className="absolute inset-0 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
            rgba(59, 130, 246, 0.15) 0%, 
            rgba(16, 185, 129, 0.1) 35%, 
            transparent 70%)`
        }}
      />

      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/20 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main CTA */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full px-6 py-3 mb-8 group hover:border-blue-500/50 transition-all duration-300">
            <Sparkles size={18} className="text-blue-400 group-hover:animate-pulse" />
            <span className="text-slate-300 font-medium">{text.badge}</span>
          </div>

          {/* Main heading */}
          <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
              {text.heading1}
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              {text.heading2}
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-4xl mx-auto leading-relaxed">
            {text.subtitle}
          </p>

          {/* Exclusivity notice */}
          <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 max-w-3xl mx-auto mb-12">
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-blue-400">{text.exclusivity.title}</strong>{text.exclusivity.text}
            </p>
          </div>

        </div>

        {/* CTA Options Grid */}
        <div className={`grid md:grid-cols-3 gap-8 mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Consultation CTA */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/50 to-cyan-600/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 hover:border-blue-500/50 hover:bg-slate-800/70 transition-all duration-500 transform hover:scale-105 text-center">
              
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <Calendar size={32} className="text-blue-400" />
              </div>

              <h3 className="text-xl font-bold text-white mb-4">{text.cta1.title}</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                {text.cta1.description}
              </p>

              <a href="#dappersclass">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 group">
                  {text.cta1.button}
                  <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </a>

              <div className="text-xs text-slate-400 mt-3">{text.cta1.disclaimer}</div>
            </div>
          </div>

          {/* Direct Contact CTA */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/50 to-teal-600/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 hover:border-emerald-500/50 hover:bg-slate-800/70 transition-all duration-500 transform hover:scale-105 text-center">
              
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                <MessageCircle size={32} className="text-emerald-400" />
              </div>

              <h3 className="text-xl font-bold text-white mb-4">{text.cta2.title}</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                {text.cta2.description}
              </p>

              <a href="mailto:admissions@vocalfitness.org">
                <Button 
                  variant="outline" 
                  className="w-full border-2 border-emerald-600 bg-emerald-600/10 hover:bg-emerald-600/20 text-white font-semibold py-3 rounded-xl transition-all duration-300 group"
                >
                  {text.cta2.button}
                  <MessageCircle size={18} className="ml-2 group-hover:scale-110 transition-transform duration-200" />
                </Button>
              </a>

              <div className="text-xs text-slate-400 mt-3">{text.cta2.disclaimer}</div>
            </div>
          </div>

          {/* Resources CTA */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/50 to-pink-600/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 hover:border-purple-500/50 hover:bg-slate-800/70 transition-all duration-500 transform hover:scale-105 text-center">
              
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                <Download size={32} className="text-purple-400" />
              </div>

              <h3 className="text-xl font-bold text-white mb-4">{text.cta3.title}</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                {text.cta3.description}
              </p>

              <a href="#method">
                <Button 
                  variant="outline" 
                  className="w-full border-2 border-purple-600 bg-purple-600/10 hover:bg-purple-600/20 text-white font-semibold py-3 rounded-xl transition-all duration-300 group"
                >
                  {text.cta3.button}
                  <Download size={18} className="ml-2 group-hover:translate-y-1 transition-transform duration-200" />
                </Button>
              </a>

              <div className="text-xs text-slate-400 mt-3">{text.cta3.disclaimer}</div>
            </div>
          </div>

        </div>

        {/* Investment message */}
        <div className={`text-center transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md border border-slate-600/50 rounded-3xl p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">{text.investment.title}</h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              {text.investment.description}
            </p>
            
            <div className="inline-flex items-center gap-2 text-blue-400 font-medium">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>{text.investment.tagline}</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default CTASection;