import React, { useEffect, useRef, useState } from 'react';
import { Instagram, Youtube, Linkedin, Facebook, Play, Users, Image as ImageIcon, TrendingUp, ExternalLink, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const DappersClassSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [counters, setCounters] = useState({ followers: 0, posts: 0, engagement: 0 });
  const sectionRef = useRef(null);
  const { language } = useLanguage();

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

  // Animated counters
  useEffect(() => {
    if (isVisible) {
      const duration = 2000;
      const steps = 60;
      const interval = duration / steps;
      
      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        
        setCounters({
          followers: Math.floor(300000 * progress),
          posts: Math.floor(800 * progress),
          engagement: Math.floor(2 * progress * 10) / 10
        });
        
        if (currentStep >= steps) {
          clearInterval(timer);
          setCounters({ followers: 300000, posts: 800, engagement: 2.0 });
        }
      }, interval);
      
      return () => clearInterval(timer);
    }
  }, [isVisible]);

  const content = {
    it: {
      preTitle: "Estensione Social del Metodo",
      title: "DappersClass",
      subtitle: "La Community Globale per l'Eccellenza Linguistica",
      description: "Video lezioni esclusive, tips quotidiani, live sessions e contenuti dietro le quinte. Unisciti a 300K+ professionisti che trasformano il loro inglese.",
      stats: {
        followers: "Followers",
        posts: "Contenuti",
        engagement: "Engagement"
      },
      cta: "Segui DappersClass",
      ctaVF: "Segui VocalFitness",
      features: [
        "Video Lezioni Quotidiane",
        "Tips & Tricks Esclusivi",
        "Live Sessions Interactive",
        "Behind The Scenes"
      ],
      platforms: "Seguici su tutte le piattaforme"
    },
    en: {
      preTitle: "Social Extension of the Method",
      title: "DappersClass",
      subtitle: "The Global Community for Linguistic Excellence",
      description: "Exclusive video lessons, daily tips, live sessions and behind-the-scenes content. Join 300K+ professionals transforming their English.",
      stats: {
        followers: "Followers",
        posts: "Content",
        engagement: "Engagement"
      },
      cta: "Follow DappersClass",
      ctaVF: "Follow VocalFitness",
      features: [
        "Daily Video Lessons",
        "Exclusive Tips & Tricks",
        "Interactive Live Sessions",
        "Behind The Scenes"
      ],
      platforms: "Follow us on all platforms"
    }
  };

  const text = content[language] || content.en;

  const socialPlatforms = [
    { name: 'Instagram', icon: Instagram, url: 'https://www.instagram.com/dappersclass', color: 'from-pink-500 to-purple-500' },
    { name: 'TikTok', icon: Play, url: '#', color: 'from-slate-800 to-slate-900' },
    { name: 'LinkedIn', icon: Linkedin, url: '#', color: 'from-blue-600 to-blue-700' },
    { name: 'Facebook', icon: Facebook, url: '#', color: 'from-blue-500 to-blue-600' }
  ];

  return (
    <section id="dappersclass" ref={sectionRef} className="relative py-32 bg-black overflow-hidden">
      
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0">
        {/* Spotlight effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-radial from-amber-500/10 via-transparent to-transparent blur-3xl"></div>
        
        {/* Film grain effect */}
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')]"></div>
        
        {/* Animated light streaks */}
        <div className="absolute top-0 left-0 w-1/2 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1 bg-gradient-to-l from-transparent via-amber-500 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Pre-title with sparkle effect */}
        <div className={`text-center mb-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-full backdrop-blur-sm">
            <Sparkles size={16} className="text-amber-400 animate-pulse" />
            <span className="text-amber-400 text-sm font-medium tracking-wider uppercase">
              {text.preTitle}
            </span>
            <Sparkles size={16} className="text-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Main Title - Cinematic */}
        <div className={`text-center mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <h2 className="text-6xl md:text-8xl font-black mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              {text.title}
            </span>
          </h2>
          <p className="text-2xl md:text-3xl text-amber-100/90 font-light tracking-wide">
            {text.subtitle}
          </p>
        </div>

        {/* Description */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-lg text-slate-300 leading-relaxed">
            {text.description}
          </p>
        </div>

        {/* Stats - Hollywood Style */}
        <div className={`grid grid-cols-3 gap-8 max-w-4xl mx-auto mb-20 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          
          {/* Followers */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-black/50 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-8 text-center group-hover:border-amber-500/50 transition-all duration-300">
              <Users className="w-10 h-10 mx-auto mb-4 text-amber-400" />
              <div className="text-5xl font-black text-white mb-2">
                {counters.followers >= 1000 ? `${Math.floor(counters.followers / 1000)}K` : counters.followers}
                {counters.followers >= 300000 && '+'}
              </div>
              <div className="text-sm text-amber-400/80 uppercase tracking-wider">{text.stats.followers}</div>
            </div>
          </div>

          {/* Posts */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-black/50 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-8 text-center group-hover:border-amber-500/50 transition-all duration-300">
              <ImageIcon className="w-10 h-10 mx-auto mb-4 text-amber-400" />
              <div className="text-5xl font-black text-white mb-2">
                {counters.posts}
                {counters.posts >= 800 && '+'}
              </div>
              <div className="text-sm text-amber-400/80 uppercase tracking-wider">{text.stats.posts}</div>
            </div>
          </div>

          {/* Engagement */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-black/50 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-8 text-center group-hover:border-amber-500/50 transition-all duration-300">
              <TrendingUp className="w-10 h-10 mx-auto mb-4 text-amber-400" />
              <div className="text-5xl font-black text-white mb-2">
                {counters.engagement.toFixed(1)}%
              </div>
              <div className="text-sm text-amber-400/80 uppercase tracking-wider">{text.stats.engagement}</div>
            </div>
          </div>

        </div>

        {/* Features Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {text.features.map((feature, index) => (
            <div 
              key={index}
              className="relative group"
              style={{ transitionDelay: `${800 + index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl blur-lg group-hover:from-amber-500/20 transition-all duration-500"></div>
              <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 text-center group-hover:border-amber-500/50 transition-all duration-300">
                <Play className="w-8 h-8 mx-auto mb-3 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                <div className="text-sm font-medium text-slate-200">{feature}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Social Platforms */}
        <div className={`text-center mb-12 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-amber-400/80 text-sm uppercase tracking-wider mb-6">{text.platforms}</p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {socialPlatforms.map((platform, index) => (
              <a
                key={index}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${platform.color} rounded-2xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-500`}></div>
                <div className="relative flex items-center gap-3 px-6 py-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl group-hover:border-amber-500/50 transition-all duration-300">
                  <platform.icon className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors duration-300" />
                  <span className="text-slate-300 font-medium group-hover:text-white transition-colors duration-300">{platform.name}</span>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors duration-300" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Dual CTA - DappersClass + VocalFitness */}
        <div className={`flex flex-col md:flex-row gap-6 justify-center items-center transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          
          {/* DappersClass CTA */}
          <a
            href="https://www.instagram.com/dappersclass"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl group-hover:scale-105 transition-all duration-300">
              <Instagram className="w-6 h-6 text-black" />
              <span className="text-xl font-bold text-black">{text.cta}</span>
              <ExternalLink className="w-5 h-5 text-black" />
            </div>
          </a>

          {/* VocalFitness CTA */}
          <a
            href="https://www.instagram.com/vocalfitness"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-all duration-500"></div>
            <div className="relative flex items-center gap-4 px-10 py-5 bg-slate-900 border-2 border-amber-500/30 rounded-2xl group-hover:border-amber-500 group-hover:scale-105 transition-all duration-300">
              <Instagram className="w-6 h-6 text-amber-400" />
              <span className="text-xl font-bold text-white">{text.ctaVF}</span>
              <ExternalLink className="w-5 h-5 text-amber-400" />
            </div>
          </a>

        </div>

      </div>
    </section>
  );
};

export default DappersClassSection;
