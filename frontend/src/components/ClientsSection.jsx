import React, { useEffect, useRef, useState } from 'react';
import { Building2, Award, GraduationCap } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const ClientsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [recognitions, setRecognitions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sectionRef = useRef(null);
  const { language } = useLanguage();

  // Fetch clients and recognitions from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
        const response = await axios.get(`${backendUrl}/api/clients?featured=true`);
        
        if (response.data && response.data.clients) {
          // Separate recognitions and clients
          const recognitionsList = response.data.clients.filter(item => item.category === 'recognition');
          const clientsList = response.data.clients.filter(item => item.category === 'client');
          
          setRecognitions(recognitionsList);
          setClients(clientsList);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.01 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Set visible after data loads as fallback
  useEffect(() => {
    if (!loading && clients.length > 0) {
      setIsVisible(true);
    }
  }, [loading, clients]);

  // Show loading state
  if (loading) {
    return (
      <section className="py-16 bg-slate-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-slate-400">Loading clients...</div>
        </div>
      </section>
    );
  }

  // Don't show section if error or no data after loading
  if (!loading && recognitions.length === 0 && clients.length === 0) {
    return null;
  }

  const content = {
    it: {
      recognitionsTitle: "Riconoscimenti Globali",
      recognitionsSubtitle: "Istituzioni ed enti che hanno riconosciuto il metodo VocalFitness",
      clientsTitle: "Clienti Corporate",
      clientsSubtitle: "Aziende Fortune 500 e leader di mercato che si affidano a VocalFitness",
      recognitionsCount: "riconoscimenti da istituzioni prestigiose",
      clientsCount: "clienti corporate di livello mondiale"
    },
    en: {
      recognitionsTitle: "Global Recognitions",
      recognitionsSubtitle: "Institutions and organizations that have recognized the VocalFitness method",
      clientsTitle: "Corporate Clients",
      clientsSubtitle: "Fortune 500 companies and market leaders trusting VocalFitness",
      recognitionsCount: "recognitions from prestigious institutions",
      clientsCount: "world-class corporate clients"
    }
  };

  const text = content[language] || content.en;

  return (
    <section id="clients" ref={sectionRef} className="py-20 bg-slate-900 relative overflow-hidden">
      
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Global Recognitions Section */}
        {recognitions.length > 0 && (
          <div className="mb-20">
            {/* Section Header */}
            <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center justify-center gap-3 mb-4">
                <GraduationCap size={32} className="text-blue-400" />
                <h2 className="text-3xl md:text-4xl font-bold">
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {text.recognitionsTitle}
                  </span>
                </h2>
              </div>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                {text.recognitionsSubtitle}
              </p>
            </div>

            {/* Recognitions Grid */}
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              
              {recognitions.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group flex flex-col items-center justify-center p-6 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-500"
                  style={{ 
                    transitionDelay: `${index * 50}ms` 
                  }}
                >
                  
                  {/* Logo container */}
                  <div className="w-full aspect-square flex items-center justify-center mb-3 relative">
                    {item.logo_url ? (
                      <img 
                        src={item.logo_url} 
                        alt={`${item.name} logo`}
                        className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    {/* Fallback icon */}
                    <div className="hidden w-16 h-16 bg-slate-700/50 rounded-xl items-center justify-center group-hover:bg-blue-600/20 transition-all duration-300">
                      <GraduationCap size={32} className="text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                    </div>
                  </div>

                  {/* Institution name */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors duration-300 leading-tight">
                      {item.name}
                    </div>
                  </div>

                  {/* Hover effect line */}
                  <div className="w-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 group-hover:w-full transition-all duration-300 mt-3"></div>
                  
                </div>
              ))}

            </div>

            {/* Recognition count */}
            <div className={`mt-8 text-center transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-full">
                <Award size={20} className="text-blue-400" />
                <span className="text-slate-300">
                  <span className="font-bold text-blue-400">{recognitions.length}+</span> {text.recognitionsCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Corporate Clients Section */}
        {clients.length > 0 && (
          <div>
            {/* Section Header */}
            <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Building2 size={32} className="text-emerald-400" />
                <h2 className="text-3xl md:text-4xl font-bold">
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    {text.clientsTitle}
                  </span>
                </h2>
              </div>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                {text.clientsSubtitle}
              </p>
            </div>

            {/* Clients Grid */}
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              
              {clients.map((client, index) => (
            <div 
              key={client.id} 
              className="group flex flex-col items-center justify-center p-6 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-500"
              style={{ 
                transitionDelay: `${index * 50}ms` 
              }}
            >
              
              {/* Logo container */}
              <div className="w-full aspect-square flex items-center justify-center mb-3 relative">
                {client.logo_url ? (
                  <img 
                    src={client.logo_url} 
                    alt={`${client.name} logo`}
                    className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all duration-500"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                
                {/* Fallback icon if image doesn't load */}
                <div className="hidden w-16 h-16 bg-slate-700/50 rounded-xl items-center justify-center group-hover:bg-blue-600/20 transition-all duration-300">
                  <Building2 size={32} className="text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                </div>
              </div>

              {/* Company name */}
              <div className="text-center">
                <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors duration-300">
                  {client.name}
                </div>
                {client.sector && (
                  <div className="text-xs text-slate-500 mt-1">
                    {client.sector}
                  </div>
                )}
              </div>

              {/* Hover effect line */}
              <div className="w-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 group-hover:w-full transition-all duration-300 mt-3"></div>
              
            </div>
          ))}

        </div>

            {/* Client count */}
            <div className={`mt-8 text-center transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/30 backdrop-blur-sm border border-emerald-700/50 rounded-full">
                <Building2 size={20} className="text-emerald-400" />
                <span className="text-slate-300">
                  <span className="font-bold text-emerald-400">{clients.length}+</span> {text.clientsCount}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default ClientsSection;
