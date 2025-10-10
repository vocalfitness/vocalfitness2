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
              Professor Steve Dapper
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            {mockData.professor.title}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Professor Image & Stats */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="relative">
              {/* Glowing background */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl"></div>
              
              {/* Main card */}
              <div className="relative bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500">
                
                {/* Profile placeholder - in real implementation this would be an actual image */}
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-slate-600/50">
                  <Users size={48} className="text-blue-400" />
                </div>

                <h3 className="text-2xl font-bold text-center mb-2">{mockData.professor.name}</h3>
                <p className="text-blue-400 text-center mb-6 font-medium">Con {mockData.professor.experience} di esperienza</p>

                {/* Achievement badges */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Award, label: "Fortune 500", desc: "Executive" },
                    { icon: Globe, label: "Global", desc: "Business Developer" },
                    { icon: BookOpen, label: "Professore", desc: "Fonetica Inglese" },
                    { icon: Mic, label: "Voice Artist", desc: "& Produttore" }
                  ].map((item, index) => (
                    <div key={index} className="bg-slate-900/50 rounded-xl p-4 text-center hover:bg-slate-800/50 transition-all duration-300 transform hover:scale-105">
                      <item.icon size={24} className="text-cyan-400 mx-auto mb-2" />
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            
            {/* Roles */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-blue-400">Ruoli Professionali</h4>
              <div className="space-y-3">
                {mockData.professor.roles.map((role, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full group-hover:scale-150 transition-transform duration-300"></div>
                    <span className="text-slate-300 group-hover:text-white transition-colors duration-300">{role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div>
              <h4 className="text-xl font-semibold mb-4 text-cyan-400">Principali Achievement</h4>
              <div className="space-y-4">
                {mockData.professor.achievements.map((achievement, index) => (
                  <div key={index} className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 group">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mt-2 group-hover:scale-150 transition-transform duration-300"></div>
                      <p className="text-slate-300 group-hover:text-white transition-colors duration-300 leading-relaxed">{achievement}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quote */}
            <div className="mt-8 bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md rounded-2xl p-6 border border-slate-600/50">
              <div className="text-4xl text-blue-400 mb-2">"</div>
              <p className="text-slate-300 italic leading-relaxed">
                La mia profonda passione risiede nel costruire ponti tra culture, industrie e il potenziale umano, permettendo a professionisti d'élite di eccellere nella comunicazione internazionale.
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