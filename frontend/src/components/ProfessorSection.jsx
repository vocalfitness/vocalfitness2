import React, { useEffect, useRef, useState } from 'react';
import { Award, Users, Globe, BookOpen, Mic, Sparkles } from 'lucide-react';
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

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Professor Image & Stats */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            
            {/* Premium Executive Layout */}
            <div className="relative">
              
              {/* Dynamic glowing background that responds to mouse */}
              <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-3xl blur-3xl opacity-80"></div>
              
              {/* Main executive card */}
              <div className="relative bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-3xl overflow-hidden hover:border-blue-500/60 transition-all duration-700 transform hover:scale-[1.02]">
                
                {/* Elite header with power statement */}
                <div className="bg-gradient-to-r from-slate-900/90 to-slate-800/90 p-6 border-b border-slate-700/50">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1 mb-3">
                      <Award size={14} className="text-blue-400" />
                      <span className="text-xs text-blue-300 font-medium tracking-wider">ELITE AUTHORITY</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      {content.powerStatement}
                    </p>
                  </div>
                </div>

                {/* Professional portrait section - enhanced */}
                <div className="p-8">
                  
                  {/* Main portrait with sophisticated frame */}
                  <div className="relative w-56 h-56 mx-auto mb-6 group">
                    {/* Animated border effects */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-2xl blur-md group-hover:blur-lg transition-all duration-500"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/50 to-cyan-600/50 rounded-2xl animate-pulse"></div>
                    
                    {/* Portrait container */}
                    <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-slate-600/50 group-hover:border-blue-500/70 transition-all duration-500">
                      <img 
                        src={content.image}
                        alt="Professor Steve Dapper - Fortune 500 Executive & University Professor"
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 filter group-hover:brightness-110"
                        style={{
                          filter: 'contrast(1.1) saturate(1.1)',
                        }}
                      />
                      {/* Sophisticated overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    
                    {/* Floating credential badges */}
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl px-3 py-1.5 shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform duration-300">
                      <span className="text-xs text-white font-bold">30+ YEARS</span>
                    </div>
                    <div className="absolute -bottom-3 -left-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl px-3 py-1.5 shadow-lg transform -rotate-12 group-hover:rotate-0 transition-transform duration-300">
                      <span className="text-xs text-white font-bold">PROFESSOR</span>
                    </div>
                  </div>

                  {/* Executive identity section */}
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold text-white mb-2">{content.name}</h3>
                    <p className="text-lg text-blue-400 font-semibold mb-2">{content.title}</p>
                    <p className="text-sm text-slate-400 mb-4">{content.subtitle}</p>
                    
                    {/* Credentials bar */}
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <p className="text-xs text-slate-300 font-medium tracking-wider leading-relaxed">
                        {content.titleRoles}
                      </p>
                    </div>
                  </div>

                  {/* Elite achievement grid - redesigned */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { icon: Award, label: "Fortune 500", desc: "Executive Leader", color: "from-yellow-500 to-orange-500" },
                      { icon: Globe, label: "Global", desc: "Business Dev", color: "from-blue-500 to-cyan-500" },
                      { icon: BookOpen, label: isItalian ? "Professore" : "Professor", desc: isItalian ? "Fonetica" : "Phonetics", color: "from-emerald-500 to-teal-500" },
                      { icon: Mic, label: "Voice Artist", desc: "& Producer", color: "from-purple-500 to-pink-500" }
                    ].map((item, index) => (
                      <div key={index} className="relative group/card">
                        {/* Card glow */}
                        <div className={`absolute -inset-0.5 bg-gradient-to-r ${item.color} rounded-xl blur-sm opacity-0 group-hover/card:opacity-30 transition-opacity duration-300`}></div>
                        
                        <div className="relative bg-slate-900/60 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-slate-800/60 transition-all duration-300 transform hover:scale-105 border border-slate-700/30 group-hover/card:border-slate-600/50">
                          
                          {/* Icon with gradient background */}
                          <div className={`w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-r ${item.color} p-0.5`}>
                            <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
                              <item.icon size={20} className="text-white" />
                            </div>
                          </div>
                          
                          <div className="text-sm font-semibold text-white mb-1">{item.label}</div>
                          <div className="text-xs text-slate-400">{item.desc}</div>
                          
                          {/* Progress indicator */}
                          <div className="mt-2 w-full h-0.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 delay-${(index + 1) * 200} ${isVisible ? 'w-full' : 'w-0'}`}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Exclusive credibility statement */}
                  <div className="bg-gradient-to-r from-slate-900/70 to-slate-800/70 rounded-2xl p-4 border border-slate-700/40">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <h4 className="text-sm font-semibold text-blue-400">
                        {isItalian ? 'Autorità Unica Mondiale' : 'Unique Global Authority'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isItalian 
                        ? 'L\'unico professionista che combina leadership Fortune 500 con cattedra universitaria di Fonetica Inglese—creando l\'esperienza definitiva per executive elite.'
                        : 'The only professional combining Fortune 500 leadership with University Professor of English Phonetics—creating the definitive experience for elite executives.'
                      }
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Right: Premium Content */}
          <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            
            {/* Executive Bio - Premium Design */}
            <div className="mb-8 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 group-hover:border-blue-500/50 transition-all duration-500">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">
                      {isItalian ? 'Rarità Assoluta nel Panorama Globale' : 'Absolute Rarity in Global Landscape'}
                    </h4>
                    <p className="text-sm text-blue-400 font-medium">
                      {isItalian ? 'Fortune 500 Executive + Professore Universitario' : 'Fortune 500 Executive + University Professor'}
                    </p>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {content.bio}
                </p>
              </div>
            </div>

            {/* Corporate Value Proposition */}
            <div className="mb-8 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 backdrop-blur-sm rounded-2xl p-6 border border-emerald-700/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <Globe size={20} className="text-white" />
                </div>
                <h4 className="text-lg font-bold text-emerald-400">
                  {isItalian ? 'Valore per Executive C-Suite' : 'C-Suite Executive Value'}
                </h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {content.corporateValue}
              </p>
            </div>

            {/* Professional Roles - Enhanced Grid */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-blue-400 flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <BookOpen size={14} className="text-blue-400" />
                </div>
                {isItalian ? 'Domini di Eccellenza' : 'Domains of Excellence'}
              </h4>
              <div className="grid gap-3">
                {content.roles.map((role, index) => (
                  <div key={index} className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 group transform hover:scale-[1.02]">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <span className="text-slate-300 group-hover:text-white transition-colors duration-300 font-medium">{role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Elite Achievements */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-cyan-400 flex items-center gap-3">
                <div className="w-6 h-6 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                  <Sparkles size={14} className="text-cyan-400" />
                </div>
                {isItalian ? 'Achievement Elite' : 'Elite Achievements'}
              </h4>
              <div className="space-y-3">
                {content.achievements.map((achievement, index) => (
                  <div key={index} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <p className="text-slate-300 group-hover:text-white transition-colors duration-300 leading-relaxed text-sm">{achievement}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credibility Markers */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4 text-purple-400">
                {isItalian ? 'Marker di Credibilità' : 'Credibility Markers'}
              </h4>
              <div className="grid gap-3">
                {content.credibilityMarkers.map((marker, index) => (
                  <div key={index} className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm rounded-xl p-3 border border-purple-700/30 hover:border-purple-500/50 transition-all duration-300 group">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Award size={12} className="text-white" />
                      </div>
                      <p className="text-slate-300 group-hover:text-white transition-colors duration-300 text-xs leading-relaxed">{marker}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Executive Description - Quote Style */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/50 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl"></div>
              
              <div className="relative">
                <div className="text-6xl text-blue-400/30 mb-4 font-serif">"</div>
                <p className="text-slate-300 leading-relaxed text-sm mb-6">
                  {content.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-blue-400 font-semibold">— Professor Steve Dapper</div>
                    <div className="text-xs text-slate-500 mt-1">Fortune 500 Executive & University Professor</div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 flex items-center justify-center border-2 border-blue-500/30">
                    <img 
                      src={content.image}
                      alt="Professor Steve Dapper signature"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Professional Gallery Section */}
          <div className={`mt-20 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-white mb-4">
                {isItalian ? 'Professor Dapper in Azione' : 'Professor Dapper in Action'}
              </h3>
              <p className="text-slate-400 max-w-2xl mx-auto">
                {isItalian 
                  ? 'Dall\'aula universitaria alle sale riunioni Fortune 500, dalla consulenza governativa alle presentazioni internazionali.'
                  : 'From university classrooms to Fortune 500 boardrooms, from government consulting to international presentations.'
                }
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Academic Excellence */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 group-hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105">
                  
                  <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-blue-900/20 to-cyan-900/20">
                    <img 
                      src="https://images.unsplash.com/photo-1758518730083-4c12527b6742?crop=entropy&cs=srgb&fm=jpg&q=85"
                      alt="Professor Dapper - Academic Teaching"
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      style={{ filter: 'contrast(1.1) saturate(0.9) brightness(0.95)' }}
                    />
                    <div className="absolute inset-0 bg-slate-900/20"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                      <BookOpen size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">
                        {isItalian ? 'Eccellenza Accademica' : 'Academic Excellence'}
                      </h4>
                      <p className="text-sm text-blue-400">
                        {isItalian ? 'Professore Universitario' : 'University Professor'}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {isItalian 
                      ? 'Cattedra di Fonetica Inglese nelle più prestigiose istituzioni educative europee, formando la prossima generazione di leader comunicativi.'
                      : 'Chair of English Phonetics at Europe\'s most prestigious educational institutions, training the next generation of communicative leaders.'
                    }
                  </p>
                </div>
              </div>

              {/* Corporate Consulting */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 group-hover:border-emerald-500/50 transition-all duration-500 transform hover:scale-105">
                  
                  <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-emerald-900/20 to-teal-900/20">
                    <img 
                      src="https://images.unsplash.com/photo-1758691736407-02406d18df6c?crop=entropy&cs=srgb&fm=jpg&q=85"
                      alt="Professor Dapper - Corporate Consulting"
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      style={{ filter: 'contrast(1.1) saturate(0.9) brightness(0.95)' }}
                    />
                    <div className="absolute inset-0 bg-slate-900/20"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                      <Globe size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">
                        {isItalian ? 'Consulenza Fortune 500' : 'Fortune 500 Consulting'}
                      </h4>
                      <p className="text-sm text-emerald-400">
                        {isItalian ? 'Business Developer' : 'Business Developer'}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {isItalian 
                      ? 'Tre decenni di leadership aziendale e sviluppo internazionale, guidando iniziative transatlantiche per multinazionali.'
                      : 'Three decades of corporate leadership and international development, leading transatlantic initiatives for multinationals.'
                    }
                  </p>
                </div>
              </div>

              {/* Government Advisory */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 group-hover:border-purple-500/50 transition-all duration-500 transform hover:scale-105">
                  
                  <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <img 
                      src="https://images.unsplash.com/photo-1758691736821-f1a600c0c3f1?crop=entropy&cs=srgb&fm=jpg&q=85"
                      alt="Professor Dapper - Government Advisory"
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      style={{ filter: 'contrast(1.1) saturate(0.9) brightness(0.95)' }}
                    />
                    <div className="absolute inset-0 bg-slate-900/20"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                      <Award size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">
                        {isItalian ? 'Consulenza Governativa' : 'Government Advisory'}
                      </h4>
                      <p className="text-sm text-purple-400">
                        {isItalian ? 'Consigliere Ufficiale' : 'Official Advisor'}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {isItalian 
                      ? 'Consulente per U.S. Department of Commerce, AMCHAM e Select USA, collegando governi e multinazionali.'
                      : 'Advisor to U.S. Department of Commerce, AMCHAM, and Select USA, connecting governments and multinationals.'
                    }
                  </p>
                </div>
              </div>

            </div>

            {/* Call to Action */}
            <div className="mt-12 text-center">
              <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md rounded-2xl p-8 max-w-4xl mx-auto border border-slate-600/50">
                <h4 className="text-2xl font-bold text-white mb-4">
                  {isItalian ? 'Esperienza Unita alla Scienza' : 'Experience Meets Science'}
                </h4>
                <p className="text-slate-300 mb-6 leading-relaxed">
                  {isItalian 
                    ? 'Quando leadership corporate e autorità accademica si combinano, nasce un\'esperienza di trasformazione vocale senza precedenti. Professor Dapper non offre solo training—offre evoluzione comunicativa per leader d\'élite.'
                    : 'When corporate leadership and academic authority combine, an unprecedented vocal transformation experience is born. Professor Dapper doesn\'t offer just training—he offers communicative evolution for elite leaders.'
                  }
                </p>
                <button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25">
                  {isItalian ? 'Scopri l\'Esperienza VocalFitness' : 'Discover the VocalFitness Experience'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessorSection;