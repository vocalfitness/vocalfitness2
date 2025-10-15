import React, { useState, useEffect, useRef } from 'react';
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const SocialProofBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [counters, setCounters] = useState({
    students: 0,
    lessons: 0,
    successRate: 0,
    companies: 0
  });
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
      const duration = 2500;
      const steps = 80;
      const interval = duration / steps;
      
      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        
        setCounters({
          students: Math.floor(10000 * progress),
          lessons: Math.floor(25000 * progress),
          successRate: Math.floor(96 * progress),
          companies: Math.floor(100 * progress)
        });
        
        if (currentStep >= steps) {
          clearInterval(timer);
          setCounters({
            students: 10000,
            lessons: 25000,
            successRate: 96,
            companies: 100
          });
        }
      }, interval);
      
      return () => clearInterval(timer);
    }
  }, [isVisible]);

  const content = {
    it: {
      stats: [
        { value: counters.students, suffix: '+', label: 'Studenti Formati', icon: Users, color: 'blue' },
        { value: counters.lessons, suffix: '+', label: 'Lezioni Erogate', icon: BookOpen, color: 'emerald' },
        { value: counters.successRate, suffix: '%', label: 'Tasso di Successo', icon: TrendingUp, color: 'cyan' },
        { value: counters.companies, suffix: '+', label: 'Aziende Partner', icon: Award, color: 'amber' }
      ]
    },
    en: {
      stats: [
        { value: counters.students, suffix: '+', label: 'Students Trained', icon: Users, color: 'blue' },
        { value: counters.lessons, suffix: '+', label: 'Lessons Delivered', icon: BookOpen, color: 'emerald' },
        { value: counters.successRate, suffix: '%', label: 'Success Rate', icon: TrendingUp, color: 'cyan' },
        { value: counters.companies, suffix: '+', label: 'Partner Companies', icon: Award, color: 'amber' }
      ]
    }
  };

  const text = content[language] || content.en;

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'from-blue-600/20 to-blue-700/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        glow: 'from-blue-500 to-blue-600'
      },
      emerald: {
        bg: 'from-emerald-600/20 to-emerald-700/20',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        glow: 'from-emerald-500 to-emerald-600'
      },
      cyan: {
        bg: 'from-cyan-600/20 to-cyan-700/20',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        glow: 'from-cyan-500 to-cyan-600'
      },
      amber: {
        bg: 'from-amber-600/20 to-amber-700/20',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'from-amber-500 to-amber-600'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <section ref={sectionRef} className="py-16 bg-slate-950 relative overflow-hidden">
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {text.stats.map((stat, index) => {
            const colors = getColorClasses(stat.color);
            const Icon = stat.icon;
            
            return (
              <div
                key={index}
                className="group relative"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Glow effect */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${colors.glow} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition duration-500`}></div>
                
                {/* Card */}
                <div className={`relative bg-gradient-to-br ${colors.bg} backdrop-blur-sm border ${colors.border} rounded-2xl p-6 text-center transition-all duration-300 group-hover:scale-105 group-hover:border-opacity-50`}>
                  
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`${colors.text}`} size={32} />
                    </div>
                  </div>

                  {/* Number */}
                  <div className={`text-4xl md:text-5xl font-black ${colors.text} mb-2`}>
                    {formatNumber(stat.value)}{stat.suffix}
                  </div>

                  {/* Label */}
                  <div className="text-sm text-slate-400 uppercase tracking-wider">
                    {stat.label}
                  </div>

                  {/* Animated underline */}
                  <div className={`w-0 h-1 bg-gradient-to-r ${colors.glow} mx-auto mt-4 group-hover:w-full transition-all duration-500`}></div>

                </div>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
};

export default SocialProofBanner;
