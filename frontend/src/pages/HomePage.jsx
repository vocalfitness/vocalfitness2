import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import ProfessorSection from '../components/ProfessorSection'; 
import MethodSection from '../components/MethodSection';
import StatsSection from '../components/StatsSection';
import AudienceSection from '../components/AudienceSection';
import ProcessSection from '../components/ProcessSection';
import TestimonialsSection from '../components/TestimonialsSection';
import DappersClassSection from '../components/DappersClassSection';
import CorporateClientsSection from '../components/CorporateClientsSection';
import SuccessStoriesSection from '../components/SuccessStoriesSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

const HomePage = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${scrollY * -0.1}px)` }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translate(-50%, -50%) translateY(${scrollY * 0.05}px)` }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ProfessorSection />
        <MethodSection />
        <StatsSection />
        <AudienceSection />
        <ProcessSection />
        <TestimonialsSection />
        <DappersClassSection />
        <CorporateClientsSection />
        <SuccessStoriesSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;