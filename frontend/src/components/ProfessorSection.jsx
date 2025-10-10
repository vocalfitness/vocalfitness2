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

        {/* Magazine-Style Layout - Full Width */}
        <div className="space-y-12">
          
          {/* Hero Section - Full Width Impact */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden">
              
              {/* Power Header */}
              <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/20 px-8 py-6 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center">
                      <Award size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-blue-400 font-bold text-sm tracking-wider">ELITE AUTHORITY</div>
                      <div className="text-slate-300 text-xs">{content.titleRoles}</div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-full px-3 py-1">
                      <span className="text-xs text-emerald-300 font-bold">30+ YEARS</span>
                    </div>
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-full px-3 py-1">
                      <span className="text-xs text-blue-300 font-bold">PROFESSOR</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-5 gap-0">
                
                {/* Left: Enhanced Portrait Section */}
                <div className="lg:col-span-2 p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/30">
                  
                  {/* Main Portrait - Larger & More Impactful */}
                  <div className="relative group mb-6">
                    <div className="absolute -inset-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-3 border-slate-600/50 group-hover:border-blue-500/70 transition-all duration-500">
                      <img 
                        src={content.image}
                        alt="Professor Steve Dapper"
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                        style={{ filter: 'contrast(1.15) saturate(1.1) brightness(0.95)' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Award, value: "Fortune 500", label: "Executive", color: "from-yellow-500 to-orange-500" },
                      { icon: BookOpen, value: "Professor", label: "University", color: "from-blue-500 to-cyan-500" },
                      { icon: Globe, value: "Global", label: "Advisor", color: "from-emerald-500 to-teal-500" },
                      { icon: Mic, value: "Voice Artist", label: "Producer", color: "from-purple-500 to-pink-500" }
                    ].map((stat, index) => (
                      <div key={index} className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-300 group/stat">
                        <div className={`w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-r ${stat.color} p-0.5`}>
                          <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
                            <stat.icon size={16} className="text-white" />
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-white text-center">{stat.value}</div>
                        <div className="text-xs text-slate-400 text-center">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Right: Dense Content Layout */}
                <div className="lg:col-span-3 p-8 space-y-6">
                  
                  {/* Main Identity */}
                  <div>
                    <h3 className="text-4xl font-bold text-white mb-2">{content.name}</h3>
                    <h4 className="text-xl text-blue-400 font-semibold mb-2">{content.title}</h4>
                    <p className="text-slate-400 text-sm">{content.subtitle}</p>
                  </div>

                  {/* Power Statement */}
                  <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/40">
                    <div className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2">
                      <Sparkles size={16} />
                      {isItalian ? 'Autorità Unica Mondiale' : 'Unique Global Authority'}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed italic">
                      {content.powerStatement}
                    </p>
                  </div>

                  {/* Bio Summary */}
                  <div className="bg-gradient-to-r from-slate-800/40 to-slate-700/20 rounded-2xl p-5 border border-slate-700/40">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {content.bio}
                    </p>
                  </div>

                  {/* Corporate Value - Compact */}
                  <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/10 rounded-2xl p-5 border border-emerald-700/30">
                    <div className="text-emerald-400 font-semibold text-sm mb-2 flex items-center gap-2">
                      <Globe size={16} />
                      {isItalian ? 'Valore per Executive C-Suite' : 'C-Suite Executive Value'}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {content.corporateValue}
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Compact Professional Details Grid */}
          <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* Left Column: Roles & Achievements */}
              <div className="space-y-6">
                
                {/* Professional Domains - Compact */}
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

                {/* Credibility Markers - Condensed */}
                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/10 backdrop-blur-md rounded-2xl p-6 border border-purple-700/30">
                  <h4 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Award size={18} className="text-purple-400" />
                    {isItalian ? 'Marker di Credibilità' : 'Credibility Markers'}
                  </h4>
                  <div className="space-y-3">
                    {content.credibilityMarkers.map((marker, index) => (
                      <div key={index} className="flex items-start gap-3 group">
                        <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                        <p className="text-slate-300 group-hover:text-white text-xs leading-relaxed">{marker}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Achievements & Description */}
              <div className="space-y-6">
                
                {/* Elite Achievements - Streamlined */}
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

            </div>

            {/* Full-Width Executive Description */}
            <div className="mt-8 bg-gradient-to-br from-slate-800/60 to-slate-700/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/50 relative overflow-hidden">
              
              {/* Subtle decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 rounded-full blur-2xl"></div>
              
              <div className="relative grid lg:grid-cols-12 gap-6 items-start">
                
                {/* Quote mark and description */}
                <div className="lg:col-span-10">
                  <div className="text-5xl text-blue-400/30 mb-4 font-serif leading-none">"</div>
                  <p className="text-slate-300 leading-relaxed text-sm mb-4">
                    {content.description}
                  </p>
                  <div className="text-blue-400 font-semibold text-sm">— Professor Steve Dapper</div>
                  <div className="text-xs text-slate-500">Fortune 500 Executive & University Professor</div>
                </div>

                {/* Compact profile image */}
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