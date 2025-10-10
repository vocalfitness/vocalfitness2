import React, { useEffect, useRef, useState } from 'react';
import { Award, Users, Globe, BookOpen, Mic, Sparkles } from 'lucide-react';
import { mockData } from '../data/mock';
import { useLanguage } from '../context/LanguageContext';

// Simple working styles
const appleStyles = `
  .premium-card:hover {
    transform: translateY(-2px);
    transition: transform 0.3s ease;
  }
`;

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

  // Removed complex animations that were breaking layout

  return (
    <section id="professor" ref={sectionRef} className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Inject custom Apple-style CSS */}
      <style dangerouslySetInnerHTML={{ __html: appleStyles }} />
      
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

              {/* Apple-Style Premium Layout */}
              <div className="relative overflow-hidden">
                
                {/* Cinematic Background Effects */}
                <div className="absolute inset-0">
                  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/8 to-cyan-500/8 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-emerald-500/6 to-teal-500/6 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative grid lg:grid-cols-12 gap-8 p-12 items-center">
                  
                  {/* Left: Perfectly Aligned Portrait */}
                  <div className="lg:col-span-4 flex flex-col justify-start">
                    
                    {/* Hero Portrait - Apple Style with Perfect Alignment */}
                    <div className="relative group apple-scroll-fade" data-scroll-speed="0.5">
                      
                      {/* Advanced layered glow effects with scroll animations */}
                      <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl group-hover:blur-[60px] transition-all duration-1000 apple-glow-pulse"></div>
                      <div className="absolute -inset-6 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-2xl group-hover:blur-[40px] transition-all duration-1000" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute -inset-4 bg-gradient-to-r from-blue-300/8 to-cyan-300/8 rounded-full blur-xl group-hover:blur-[30px] transition-all duration-1000" style={{ animationDelay: '1s' }}></div>
                      
                      {/* Main portrait container with advanced effects */}
                      <div className="relative w-72 h-72 rounded-3xl overflow-hidden group-hover:scale-110 transition-all duration-700 apple-hover-lift">
                        
                        {/* Glass morphism border with gradient animation */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-3xl border border-white/20 backdrop-blur-sm apple-border-glow"></div>
                        
                        <img 
                          src={content.image}
                          alt="Professor Steve Dapper"
                          className="w-full h-full object-cover apple-image-enhance"
                          style={{ 
                            filter: 'contrast(1.2) saturate(1.15) brightness(1.05)',
                            clipPath: 'inset(0 round 24px)'
                          }}
                        />
                        
                        {/* Premium overlay gradients with animation */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent apple-overlay-fade"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5"></div>
                      </div>

                      {/* Floating credentials with advanced animations */}
                      <div className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl px-4 py-2 shadow-2xl transform rotate-6 group-hover:rotate-0 transition-all duration-700 border border-white/20 apple-float-badge" style={{ animationDelay: '0.2s' }}>
                        <span className="text-white font-bold text-xs tracking-wider">30+ YEARS</span>
                      </div>
                      <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl px-4 py-2 shadow-2xl transform -rotate-6 group-hover:rotate-0 transition-all duration-700 border border-white/20 apple-float-badge" style={{ animationDelay: '0.4s' }}>
                        <span className="text-white font-bold text-xs tracking-wider">PROFESSOR</span>
                      </div>
                    </div>

                  </div>

                  {/* Right: Apple-Style Typography & Content - Better Aligned */}
                  <div className="lg:col-span-8 flex flex-col justify-start space-y-6">
                    
                    {/* Main Identity - Apple Typography */}
                    <div className="space-y-4">
                      
                      {/* Name with advanced Apple typography */}
                      <h1 className="apple-typography apple-type-scale text-6xl md:text-8xl font-black tracking-tight leading-none apple-text-shadow mb-4">
                        <span className="block apple-scroll-fade" style={{ animationDelay: '0.2s' }}>
                          Professor
                        </span>
                        <span className="block apple-scroll-fade apple-glow" style={{ animationDelay: '0.4s' }}>
                          Steve Dapper
                        </span>
                      </h1>

                      {/* Subtitle with staggered animations */}
                      <div className="space-y-4">
                        <h2 className="apple-scroll-fade text-3xl md:text-4xl font-thin text-slate-100 leading-tight tracking-wide apple-text-shadow" style={{ animationDelay: '0.6s' }}>
                          {content.title}
                        </h2>
                        <div className="apple-scroll-fade text-xl text-slate-300 font-extralight italic tracking-wider leading-relaxed" style={{ animationDelay: '0.8s' }}>
                          {content.subtitle}
                        </div>
                      </div>

                      {/* Credentials ribbon with advanced effects */}
                      <div className="apple-scroll-fade premium-card-hover" style={{ animationDelay: '1s' }}>
                        <div className="inline-flex items-center apple-glass bg-gradient-to-r from-slate-800/70 to-slate-700/50 rounded-3xl apple-border-glow p-6 shadow-2xl transition-all duration-500">
                          <div className="text-sm text-slate-200 font-medium tracking-[0.15em] uppercase leading-loose">
                            {content.titleRoles}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Power Statement - Advanced Apple card with animations */}
                    <div className="apple-scroll-fade apple-parallax relative group premium-card-hover transition-all duration-700" data-scroll-speed="0.2" style={{ animationDelay: '1.2s' }}>
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/25 to-cyan-500/25 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-700 apple-glow-pulse"></div>
                      <div className="relative apple-glass bg-gradient-to-br from-slate-800/90 to-slate-900/70 rounded-[2rem] apple-border-glow p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
                        
                        {/* Premium header with enhanced styling */}
                        <div className="flex items-center gap-6 mb-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(59,130,246,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                            <Sparkles size={28} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-blue-400 tracking-wide apple-text-shadow">
                              {isItalian ? 'Autorità Unica Mondiale' : 'Unique Global Authority'}
                            </h3>
                            <div className="text-base text-slate-400 font-light tracking-wider mt-1">Unprecedented Combination</div>
                          </div>
                        </div>

                        {/* Statement with Apple-level typography */}
                        <blockquote className="text-xl text-slate-100 leading-loose font-light italic border-l-4 border-gradient-to-b border-blue-400 pl-8 tracking-wide">
                          "{content.powerStatement}"
                        </blockquote>
                        
                        {/* Subtle decorative element */}
                        <div className="mt-6 flex justify-end">
                          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-blue-400/50"></div>
                        </div>
                      </div>
                    </div>

                    {/* Bio & Value Proposition - Advanced animated twin cards */}
                    <div className="grid md:grid-cols-2 gap-8">
                      
                      {/* Bio card - Advanced Apple animations */}
                      <div className="apple-scroll-fade apple-parallax relative group premium-card-hover transition-all duration-500" data-scroll-speed="0.1" style={{ animationDelay: '1.4s' }}>
                        <div className="absolute -inset-1 bg-gradient-to-r from-slate-500/30 to-slate-400/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 apple-glow-pulse"></div>
                        <div className="relative apple-glass bg-gradient-to-br from-slate-800/70 to-slate-900/50 rounded-3xl apple-border-glow p-8 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
                          
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                              <Award size={20} className="text-white" />
                            </div>
                            <h4 className="text-xl font-bold text-white apple-text-shadow tracking-wide">
                              {isItalian ? 'Rarità Globale' : 'Global Rarity'}
                            </h4>
                          </div>
                          
                          <p className="text-base text-slate-200 leading-loose font-light tracking-wide">
                            {content.bio}
                          </p>
                          
                          {/* Subtle accent */}
                          <div className="mt-6 w-16 h-0.5 bg-gradient-to-r from-slate-400 to-transparent"></div>
                        </div>
                      </div>

                      {/* Corporate value card - Advanced Apple animations */}
                      <div className="apple-scroll-fade apple-parallax relative group premium-card-hover transition-all duration-500" data-scroll-speed="0.15" style={{ animationDelay: '1.6s' }}>
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 apple-glow-pulse"></div>
                        <div className="relative apple-glass bg-gradient-to-br from-emerald-900/40 to-teal-900/30 rounded-3xl apple-border-glow p-8 shadow-[0_20px_40px_-12px_rgba(16,185,129,0.2)]">
                          
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(16,185,129,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                              <Globe size={20} className="text-white" />
                            </div>
                            <h4 className="text-xl font-bold text-emerald-400 apple-text-shadow tracking-wide">
                              {isItalian ? 'Valore C-Suite' : 'C-Suite Value'}
                            </h4>
                          </div>
                          
                          <p className="text-base text-slate-200 leading-loose font-light tracking-wide">
                            {content.corporateValue}
                          </p>
                          
                          {/* Subtle accent */}
                          <div className="mt-6 w-16 h-0.5 bg-gradient-to-r from-emerald-400 to-transparent"></div>
                        </div>
                      </div>

                    </div>

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

          {/* Compact Professional Contexts */}
          <div className={`mt-12 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            {/* Compact Header */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2 text-center">
                {isItalian ? 'Professor Dapper in Azione' : 'Professor Dapper in Action'}
              </h3>
              <p className="text-slate-400 text-center text-sm max-w-3xl mx-auto">
                {isItalian 
                  ? 'Dall\'aula universitaria alle sale riunioni Fortune 500, dalla consulenza governativa alle presentazioni internazionali.'
                  : 'From university classrooms to Fortune 500 boardrooms, from government consulting to international presentations.'
                }
              </p>
            </div>

            {/* Horizontal Layout - Space Efficient */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl border border-slate-700/50 overflow-hidden">
              
              <div className="grid lg:grid-cols-3 gap-0">
                
                {/* Academic Excellence */}
                <div className="group p-6 border-b lg:border-b-0 lg:border-r border-slate-700/30 hover:bg-slate-700/20 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookOpen size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-1">
                        {isItalian ? 'Eccellenza Accademica' : 'Academic Excellence'}
                      </h4>
                      <p className="text-sm text-blue-400 font-medium">
                        {isItalian ? 'Professore Universitario' : 'University Professor'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Compact image */}
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-blue-900/20 to-cyan-900/20">
                    <img 
                      src="https://images.unsplash.com/photo-1758518730083-4c12527b6742?crop=entropy&cs=srgb&fm=jpg&q=85"
                      alt="Academic Excellence"
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      style={{ filter: 'contrast(1.1) saturate(0.9) brightness(0.95)' }}
                    />
                  </div>
                  
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isItalian 
                      ? 'Cattedra di Fonetica Inglese nelle più prestigiose istituzioni educative europee.'
                      : 'Chair of English Phonetics at Europe\'s most prestigious educational institutions.'
                    }
                  </p>
                </div>

                {/* Corporate Consulting */}
                <div className="group p-6 border-b lg:border-b-0 lg:border-r border-slate-700/30 hover:bg-slate-700/20 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Globe size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-1">
                        {isItalian ? 'Consulenza Fortune 500' : 'Fortune 500 Consulting'}
                      </h4>
                      <p className="text-sm text-emerald-400 font-medium">
                        {isItalian ? 'Business Developer' : 'Business Developer'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-emerald-900/20 to-teal-900/20">
                    <img 
                      src="https://images.unsplash.com/photo-1758691736407-02406d18df6c?crop=entropy&cs=srgb&fm=jpg&q=85"
                      alt="Corporate Consulting"
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      style={{ filter: 'contrast(1.1) saturate(0.9) brightness(0.95)' }}
                    />
                  </div>
                  
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isItalian 
                      ? 'Tre decenni di leadership aziendale e sviluppo internazionale per multinazionali.'
                      : 'Three decades of corporate leadership and international development for multinationals.'
                    }
                  </p>
                </div>

                {/* Government Advisory */}
                <div className="group p-6 hover:bg-slate-700/20 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Award size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-1">
                        {isItalian ? 'Consulenza Governativa' : 'Government Advisory'}
                      </h4>
                      <p className="text-sm text-purple-400 font-medium">
                        {isItalian ? 'Consigliere Ufficiale' : 'Official Advisor'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <img 
                      src="https://images.unsplash.com/photo-1758691736821-f1a600c0c3f1?crop=entropy&cs=srgb&fm=jpg&q=85"
                      alt="Government Advisory"
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      style={{ filter: 'contrast(1.1) saturate(0.9) brightness(0.95)' }}
                    />
                  </div>
                  
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isItalian 
                      ? 'Consulente per U.S. Department of Commerce, AMCHAM e Select USA.'
                      : 'Advisor to U.S. Department of Commerce, AMCHAM, and Select USA.'
                    }
                  </p>
                </div>

              </div>

              {/* Integrated CTA at bottom */}
              <div className="bg-gradient-to-r from-slate-900/60 to-slate-800/40 p-8 border-t border-slate-700/30">
                <div className="text-center">
                  <h4 className="text-xl font-bold text-white mb-3">
                    {isItalian ? 'Esperienza Unita alla Scienza' : 'Experience Meets Science'}
                  </h4>
                  <p className="text-slate-300 text-sm mb-6 max-w-3xl mx-auto leading-relaxed">
                    {isItalian 
                      ? 'Quando leadership corporate e autorità accademica si combinano, nasce un\'esperienza di trasformazione vocale senza precedenti.'
                      : 'When corporate leadership and academic authority combine, an unprecedented vocal transformation experience is born.'
                    }
                  </p>
                  <button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm">
                    {isItalian ? 'Scopri l\'Esperienza VocalFitness' : 'Discover the VocalFitness Experience'}
                  </button>
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