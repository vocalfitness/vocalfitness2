import React, { useEffect, useRef, useState } from 'react';
import { Building2, Award } from 'lucide-react';
import axios from 'axios';

const ClientsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sectionRef = useRef(null);

  // Fetch clients from API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
        console.log('Fetching clients from:', `${backendUrl}/api/clients?featured=true`);
        const response = await axios.get(`${backendUrl}/api/clients?featured=true`);
        
        console.log('Clients response:', response.data);
        if (response.data && response.data.clients) {
          console.log('Setting clients:', response.data.clients.length, 'items');
          setClients(response.data.clients);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchClients();
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

  // Don't show section if error or no clients after loading
  if (!loading && clients.length === 0) {
    return null;
  }

  return (
    <section id="clients" ref={sectionRef} className="py-16 bg-slate-900 relative overflow-hidden">
      
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Award size={32} className="text-blue-400" />
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Trusted By Global Leaders
              </span>
            </h2>
          </div>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Fortune 500 companies and prestigious institutions worldwide trust VocalFitness
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

        {/* Additional info */}
        <div className={`mt-12 text-center transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-full">
            <Building2 size={20} className="text-blue-400" />
            <span className="text-slate-300">
              Serving <span className="font-bold text-blue-400">{clients.length}+</span> prestigious organizations worldwide
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ClientsSection;
