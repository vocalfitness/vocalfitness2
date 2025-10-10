import React, { useEffect, useRef, useState } from 'react';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { mockData } from '../data/mock';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const TestimonialsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sectionRef = useRef(null);
  const { language } = useLanguage();

  // Fetch testimonials from API
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
        const response = await axios.get(`${backendUrl}/api/testimonials?language=${language}`);
        
        if (response.data && response.data.testimonials) {
          setTestimonials(response.data.testimonials);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setError(err.message);
        // Fallback to mock data on error
        setTestimonials(mockData.testimonials);
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [language]);

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

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % mockData.testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + mockData.testimonials.length) % mockData.testimonials.length);
  };

  return (
    <section id="testimonials" ref={sectionRef} className="py-24 bg-slate-950 relative overflow-hidden">
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Testimonianze di Eccellenza
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Le voci dei nostri clienti risuonano più eloquentemente di qualsiasi materiale marketing
          </p>
        </div>

        {/* Main Testimonial Carousel */}
        <div className={`relative max-w-5xl mx-auto mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Background card */}
          <div className="relative bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-12 hover:border-blue-500/50 transition-all duration-500">
            
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-3xl blur-2xl"></div>
            
            {/* Quote icon */}
            <div className="relative">
              <Quote size={64} className="text-blue-400/30 mb-8" />
              
              {/* Testimonial content */}
              <blockquote className="text-2xl md:text-3xl text-slate-200 leading-relaxed italic mb-8 relative">
                {mockData.testimonials[currentTestimonial].text}
              </blockquote>

              {/* Author info */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold text-blue-400 mb-1">
                    {mockData.testimonials[currentTestimonial].author}
                  </div>
                  <div className="text-slate-400">
                    {mockData.testimonials[currentTestimonial].role}
                  </div>
                </div>

                {/* Star rating */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className="text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={prevTestimonial}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 text-white rounded-full w-12 h-12 p-0"
          >
            <ChevronLeft size={24} />
          </Button>
          
          <Button
            variant="ghost" 
            size="sm"
            onClick={nextTestimonial}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 text-white rounded-full w-12 h-12 p-0"
          >
            <ChevronRight size={24} />
          </Button>

          {/* Dots indicator */}
          <div className="flex justify-center mt-8 gap-2">
            {mockData.testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentTestimonial 
                    ? 'bg-blue-500 w-8' 
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

        </div>

        {/* Additional testimonials grid */}
        <div className={`grid md:grid-cols-3 gap-6 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Quick testimonial cards */}
          {[
            { role: "Tech Executive", quote: "Risultati straordinari in sole 8 settimane", rating: 5 },
            { role: "Opera Singer", quote: "Dizione perfetta per performance internazionali", rating: 5 },
            { role: "Business Leader", quote: "Fiducia vocale che ha trasformato la mia leadership", rating: 5 }
          ].map((testimonial, index) => (
            <div key={index} className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 hover:bg-slate-800/50 transition-all duration-500 group">
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-300 italic mb-4 group-hover:text-white transition-colors duration-300">
                "{testimonial.quote}"
              </p>

              {/* Role */}
              <div className="text-sm text-blue-400 font-medium">
                {testimonial.role}
              </div>

              {/* Hover effect line */}
              <div className="w-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 group-hover:w-full transition-all duration-300 mt-3"></div>
              
            </div>
          ))}

        </div>

        {/* Trust indicators */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="bg-slate-800/20 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-8 max-w-4xl mx-auto">
            
            <h3 className="text-2xl font-bold text-white mb-6">Riconoscimento Globale</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: "EF Education", desc: "Metodo Approvato" },
                { label: "Cambridge", desc: "Assessment Partner" },
                { label: "MIUR", desc: "Riconoscimento Ufficiale" },
                { label: "App Globali", desc: "Milioni di Utenti" }
              ].map((item, index) => (
                <div key={index} className="group">
                  <div className="w-16 h-16 mx-auto mb-3 bg-slate-700/50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/20 transition-all duration-300">
                    <div className="w-8 h-8 bg-slate-500 rounded group-hover:bg-blue-400 transition-colors duration-300"></div>
                  </div>
                  <div className="text-white font-medium text-sm">{item.label}</div>
                  <div className="text-slate-400 text-xs">{item.desc}</div>
                </div>
              ))}
            </div>
            
          </div>

        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;