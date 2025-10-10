import React, { useEffect, useRef, useState } from 'react';
import { Award, Users, Globe, BookOpen, Mic } from 'lucide-react';
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

          {/* Right: Content */}
          <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            
            {/* Bio Summary */}
            <div className="mb-8 bg-slate-800/20 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30">
              <p className="text-lg text-slate-300 leading-relaxed italic">
                {content.bio}
              </p>
            </div>

            {/* Roles */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-blue-400">
                {isItalian ? 'Ruoli Professionali' : 'Professional Roles'}
              </h4>
              <div className="space-y-3">
                {content.roles.map((role, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full group-hover:scale-150 transition-transform duration-300"></div>
                    <span className="text-slate-300 group-hover:text-white transition-colors duration-300">{role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-cyan-400">
                {isItalian ? 'Principali Achievement' : 'Key Achievements'}
              </h4>
              <div className="space-y-4">
                {content.achievements.map((achievement, index) => (
                  <div key={index} className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 group">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mt-2 group-hover:scale-150 transition-transform duration-300"></div>
                      <p className="text-slate-300 group-hover:text-white transition-colors duration-300 leading-relaxed">{achievement}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Description - Expandable */}
            <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md rounded-2xl p-6 border border-slate-600/50">
              <div className="text-4xl text-blue-400 mb-4">"</div>
              <p className="text-slate-300 leading-relaxed text-sm">
                {content.description}
              </p>
              <div className="text-right mt-4">
                <div className="text-blue-400 font-medium">— Professor Steve Dapper</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessorSection;