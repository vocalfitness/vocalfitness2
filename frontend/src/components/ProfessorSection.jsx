import React, { useEffect, useRef, useState } from 'react';
import { Award, Globe, BookOpen, Sparkles } from 'lucide-react';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';

const ProfessorSection = () => {
  const [isVisible, setIsVisible] = useState(false);
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

  const content = mockData.languages[language].professor;

  return (
    <section id="professor" ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {content.name}
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-4xl mx-auto mb-4">
            {content.title}
          </p>
          <div className="text-sm text-blue-400 font-medium tracking-wider">
            {content.titleRoles}
          </div>
        </div>

        {/* Hero Layout - Fixed Structure */}
        <div className={`bg-slate-800/40 backdrop-blur-md rounded-3xl border border-slate-700/50 p-12 mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: Portrait */}
            <div className="lg:col-span-4">
              <div className="relative group">
                <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-3xl blur-3xl group-hover:blur-[60px] transition-all duration-1000"></div>
                <div className="relative w-full aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden border-2 border-slate-600/50 group-hover:border-blue-500/70 transition-all duration-500">
                  <img 
                    src={content.image}
                    alt="Professor Steve Dapper"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    style={{ filter: 'contrast(1.2) saturate(1.15) brightness(1.05)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"></div>
                </div>
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl px-4 py-2 shadow-2xl border border-white/20">
                  <span className="text-white font-bold text-sm tracking-wider">30+ YEARS</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl px-4 py-2 shadow-2xl border border-white/20">
                  <span className="text-white font-bold text-sm tracking-wider">PROFESSOR</span>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Main Identity - PERFECT TYPOGRAPHY RESTORED */}
              <div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-6">
                  <span className="bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent drop-shadow-2xl">
                    Professor
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    Steve Dapper
                  </span>
                </h1>
                <h2 className="text-2xl md:text-3xl font-light text-slate-200 leading-relaxed tracking-wide mb-3">{content.title}</h2>
                <p className="text-lg text-slate-400 font-light italic tracking-wide mb-6">{content.subtitle}</p>
                
                <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-600/50 p-6 shadow-2xl">
                  <p className="text-sm text-slate-300 font-medium tracking-wider uppercase">{content.titleRoles}</p>
                </div>
              </div>

              {/* Power Statement */}
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-400">
                    {isItalian ? 'Autorità Unica Mondiale' : 'Unique Global Authority'}
                  </h3>
                </div>
                <p className="text-slate-300 leading-relaxed italic">
                  "{content.powerStatement}"
                </p>
              </div>

              {/* Bio & Value Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Award size={20} className="text-blue-400" />
                    <h4 className="text-lg font-bold text-white">
                      {isItalian ? 'Rarità Globale' : 'Global Rarity'}
                    </h4>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{content.bio}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 backdrop-blur-md rounded-2xl p-6 border border-emerald-700/30">
                  <div className="flex items-center gap-3 mb-4">
                    <Globe size={20} className="text-emerald-400" />
                    <h4 className="text-lg font-bold text-emerald-400">
                      {isItalian ? 'Valore C-Suite' : 'C-Suite Value'}
                    </h4>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{content.corporateValue}</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Compact Professional Details Grid */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            
            {/* Left Column: Roles */}
            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50">
              <h4 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-blue-400" />
                {isItalian ? 'Domini di Eccellenza' : 'Domains of Excellence'}
              </h4>
              <div className="space-y-3">
                {content.roles.map((role, index) => (
                  <div key={index} className="flex items-center gap-3 group hover:bg-slate-700/30 p-3 rounded-xl transition-all duration-200">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">{index + 1}</span>
                    </div>
                    <span className="text-slate-300 group-hover:text-white text-sm font-medium">{role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Achievements */}
            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50">
              <h4 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />
                {isItalian ? 'Achievement Elite' : 'Elite Achievements'}
              </h4>
              <div className="space-y-3">
                {content.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-start gap-3 group hover:bg-slate-700/20 p-3 rounded-xl transition-all duration-200">
                    <div className="w-5 h-5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <p className="text-slate-300 group-hover:text-white text-sm leading-relaxed">{achievement}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Executive Description */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/50">
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-10">
                <div className="text-5xl text-blue-400/30 mb-4 font-serif leading-none">"</div>
                <p className="text-slate-300 leading-relaxed text-sm mb-4">
                  {content.description}
                </p>
                <div className="text-blue-400 font-semibold text-sm">— Professor Steve Dapper</div>
                <div className="text-xs text-slate-500">Fortune 500 Executive & University Professor</div>
              </div>

              <div className="lg:col-span-2 flex justify-center lg:justify-end">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 flex items-center justify-center border-2 border-blue-500/30 overflow-hidden">
                  <img 
                    src={content.image}
                    alt="Professor Steve Dapper"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ProfessorSection;