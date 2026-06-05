import React, { useEffect, useRef, useState } from 'react';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { mockData } from '../data/mock';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { BACKEND_URL } from '../lib/backend';

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
        const backendUrl = BACKEND_URL;
        // Fetch ALL testimonials without language filter to show all important testimonials
        const response = await axios.get(`${backendUrl}/api/testimonials`);
        
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
    if (!loading && testimonials.length > 0) {
      setIsVisible(true);
    }
  }, [loading, testimonials]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const content = {
    it: {
      title: "Testimonianze di Eccellenza",
      subtitle: "Le voci dei nostri clienti risuonano più eloquentemente di qualsiasi materiale marketing",
      loading: "Caricamento testimonianze...",
      error: "Errore nel caricamento",
      globalRecognitions: "Riconoscimenti Globali",
      recognitionsDesc: "VocalFitness è riconosciuto da istituzioni accademiche e organizzazioni educative leader a livello mondiale"
    },
    en: {
      title: "Excellence Testimonials",
      subtitle: "Our clients' voices resonate more eloquently than any marketing material",
      loading: "Loading testimonials...",
      error: "Loading error",
      globalRecognitions: "Global Recognitions",
      recognitionsDesc: "VocalFitness is recognized by leading academic institutions and educational organizations worldwide"
    }
  };

  const text = content[language] || content.en;

  // Show loading state
  if (loading) {
    return (
      <section id="testimonials" className="py-24 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-slate-500 text-base uppercase tracking-[0.2em]">{text.loading}</div>
        </div>
      </section>
    );
  }

  // Don't render if no testimonials at all
  if (!loading && testimonials.length === 0) {
    return null;
  }

  return (
    <section id="testimonials" ref={sectionRef} className="py-24 lg:py-32 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden" data-testid="home-testimonials-section">
      
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`max-w-3xl mx-auto text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-blue-600 font-semibold mb-4 uppercase tracking-[0.2em] text-xs">
            {language === 'it' ? 'Voci dal Metodo' : 'Voices from the Method'}
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
            {text.title}
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            {text.subtitle}
          </p>
        </div>

        {/* Main Testimonial Carousel */}
        <div className={`relative max-w-5xl mx-auto mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Background card */}
          <div className="relative bg-white border border-slate-200 rounded-3xl p-8 md:p-12 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
            
            {/* Quote icon */}
            <div className="relative">
              <Quote size={56} className="text-blue-200 mb-6" />
              
              {/* Testimonial content */}
              <blockquote className="text-base sm:text-lg md:text-2xl lg:text-3xl text-slate-700 leading-relaxed italic mb-8 relative font-light">
                {testimonials[currentTestimonial]?.text}
              </blockquote>

              {/* Author info */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                    {testimonials[currentTestimonial]?.author}
                  </div>
                  <div className="text-blue-700 text-sm font-medium">
                    {testimonials[currentTestimonial]?.role}
                    {testimonials[currentTestimonial]?.company && ` · ${testimonials[currentTestimonial].company}`}
                  </div>
                  {testimonials[currentTestimonial]?.location && (
                    <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                      {testimonials[currentTestimonial].location}
                    </div>
                  )}
                </div>

                {/* Star rating */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} className="text-amber-400 fill-current" />
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
            className="absolute -left-2 md:-left-6 top-1/2 transform -translate-y-1/2 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-full w-12 h-12 p-0 shadow-xl"
            data-testid="testimonials-prev"
          >
            <ChevronLeft size={22} />
          </Button>
          
          <Button
            variant="ghost" 
            size="sm"
            onClick={nextTestimonial}
            className="absolute -right-2 md:-right-6 top-1/2 transform -translate-y-1/2 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-full w-12 h-12 p-0 shadow-xl"
            data-testid="testimonials-next"
          >
            <ChevronRight size={22} />
          </Button>

          {/* Dots indicator */}
          <div className="flex justify-center mt-8 gap-2 flex-wrap">
            {testimonials?.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentTestimonial 
                    ? 'bg-blue-600 w-10' 
                    : 'bg-slate-300 hover:bg-slate-400 w-2'
                }`}
                aria-label={`Testimonial ${index + 1}`}
              />
            ))}
          </div>

        </div>

        {/* Additional testimonials grid */}
        <div className={`grid md:grid-cols-3 gap-6 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Quick testimonial cards */}
          {(language === 'it' ? [
            { role: "Tech Executive", quote: "Risultati straordinari in sole 8 settimane", rating: 5 },
            { role: "Opera Singer", quote: "Dizione perfetta per performance internazionali", rating: 5 },
            { role: "Business Leader", quote: "Fiducia vocale che ha trasformato la mia leadership", rating: 5 }
          ] : [
            { role: "Tech Executive", quote: "Outstanding results in just 8 weeks", rating: 5 },
            { role: "Opera Singer", quote: "Perfect diction for international performances", rating: 5 },
            { role: "Business Leader", quote: "Vocal confidence that transformed my leadership", rating: 5 }
          ]).map((testimonial, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500 group">
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-current" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-600 italic mb-4 group-hover:text-slate-900 transition-colors duration-300 leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Role */}
              <div className="text-xs text-blue-700 font-semibold uppercase tracking-widest">
                {testimonial.role}
              </div>

              {/* Hover effect line */}
              <div className="w-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-700 group-hover:w-full transition-all duration-500 mt-4"></div>
              
            </div>
          ))}

        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;