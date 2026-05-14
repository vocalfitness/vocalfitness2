import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { 
  Building2, Users, Target, Globe, 
  ArrowRight, BarChart3, Clock, 
  Calendar, Check, Mail, Download,
  Mic2, AudioWaveform, Presentation,
  LineChart, Headphones, Activity,
  GraduationCap, Briefcase, Award, Star,
  MessageCircle, ChevronRight, Play
} from 'lucide-react';
import CorporateQuoteForm from '../components/CorporateQuoteForm';
import { academicCredentialsHTML } from '../data/professorBio';

// Custom hook for scroll animations
const useScrollAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isVisible];
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useScrollAnimation();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      let startTime;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isVisible, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const MedtronicLandingPage = () => {
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouse = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouse, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  // Videos
  const videos = {
    hero: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/qo5q7c4c_ad501a89-967e-48e3-99fd-4f1d12412ba5.mp4',
    challenge: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/45ylxra6_4d1a8b4c-feeb-433e-b1a7-37e27b10d238.mp4',
    program: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/mo03g0sv_849bf25e-793e-43a4-b188-09197516b84b.mp4',
    pilot: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/bvvtq8nw_39659c96-0738-4b6f-9e27-1a762972c150.mp4'
  };

  // Images
  const images = {
    dapper1: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/lil21e7s__mg_2586.PNG',
    dapper2: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/v1sz0mta__mg_2598.PNG',
    moviePoster: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/x7dxts0l_fuck-the-right.jpeg'
  };

  // PDF
  const proposalPDF = 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/v6rgpmxs_vf-medtronic-proposal-v1.2-sales-figures.pdf';

  // Program modules
  const programModules = [
    { number: '1', title: 'Speech anatomy and physiology', hours: 4, highlight: false },
    { number: '2', title: 'Psychoacoustics and listener perception', hours: 4, highlight: false },
    { number: '3', title: 'Segmentals (individual sounds)', hours: 6, highlight: true, cefr: 'CEFR A2-B1', desc: 'Core pronunciation accuracy' },
    { number: '4', title: 'Suprasegmentals (rhythm, flow, stress)', hours: 6, highlight: true, cefr: 'CEFR B1-B2', desc: 'Core fluency and naturalness' },
    { number: '5', title: 'Integration and business application', hours: 5, highlight: false }
  ];

  // EF Integration table
  const efIntegration = [
    { ef: 'General English skills', vf: 'Spoken clarity & intelligibility' },
    { ef: 'Grammar, vocabulary, reading', vf: 'Pronunciation, rhythm, stress' },
    { ef: 'Flexible self-study', vf: 'Live group training + practice' },
    { ef: 'Broad employee access', vf: 'Targeted speech performance' }
  ];

  // Notable alumni
  const notableAlumni = [
    'Miriam Leone (Miss Italy, Muccino)',
    'Jennifer Miranda (La Casa di Carta)',
    'Roberta Giarrusso',
    'Guido Bernardinelli (President Marzocco)',
    'David Pietroni (Triceva Film, New York)',
    'Luca Rusconi (CEO Rusconi Spa)'
  ];

  // Animation refs
  const [heroRef, heroVisible] = useScrollAnimation();
  const [challengeRef, challengeVisible] = useScrollAnimation();
  const [whyRef, whyVisible] = useScrollAnimation();
  const [dapperRef, dapperVisible] = useScrollAnimation();
  const [programRef, programVisible] = useScrollAnimation();
  const [efRef, efVisible] = useScrollAnimation();
  const [pilotRef, pilotVisible] = useScrollAnimation();
  const [measureRef, measureVisible] = useScrollAnimation();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-left {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; }
        .animate-slide-left { animation: slide-left 0.8s ease-out forwards; }
        .animate-slide-right { animation: slide-right 0.8s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.6s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .parallax { will-change: transform; }
      `}</style>

      {/* Floating background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          style={{ 
            top: '10%', 
            left: '5%',
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`
          }}
        />
        <div 
          className="absolute w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"
          style={{ 
            top: '60%', 
            right: '10%',
            transform: `translate(${-mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px)`
          }}
        />
      </div>

      {/* Header */}
      <header className={`bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'shadow-lg' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-110">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-slate-800 font-bold text-lg">VocalFitness</span>
              <span className="text-blue-600 text-sm ml-2 font-medium">Corporate Training</span>
            </div>
          </div>
          <Button onClick={() => setIsQuoteFormOpen(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105">
            Request Discussion
          </Button>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center py-16 lg:py-20 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-white animate-gradient" />
        
        {/* Parallax shapes */}
        <div 
          className="absolute top-20 right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl parallax"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
        <div 
          className="absolute bottom-20 left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl parallax"
          style={{ transform: `translateY(${scrollY * -0.15}px)` }}
        />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className={`${heroVisible ? 'animate-slide-right' : 'opacity-0'}`}>
              <p className="text-blue-600 font-semibold mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-600"></span>
                Training Proposal
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-tight">
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
                  Specialist Spoken Communication Performance Training
                </span>
                <br />
                <span className="text-blue-600">for Medtronic Italy</span>
              </h1>
              
              <div className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 mb-8 shadow-xl hover:shadow-2xl transition-all duration-500 ${heroVisible ? 'animate-slide-up delay-200' : 'opacity-0'}`}>
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                  <span className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></span>
                  Speak Right 101
                </h2>
                <p className="text-slate-600 text-lg">Modular training for Executive Leadership, Management, Sales Force, End Functions</p>
              </div>

              <div className={`flex flex-wrap gap-4 ${heroVisible ? 'animate-slide-up delay-300' : 'opacity-0'}`}>
                <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-6 text-lg shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 group">
                  Request Pilot Discussion 
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="lg" className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg hover:border-blue-500 transition-all duration-300" onClick={() => window.open(proposalPDF, '_blank')}>
                  <Download className="w-5 h-5 mr-2" /> Download Proposal PDF
                </Button>
              </div>
            </div>

            {/* Right - Video */}
            <div className={`relative hidden lg:block ${heroVisible ? 'animate-slide-left delay-200' : 'opacity-0'}`}>
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 animate-pulse-glow">
                <video 
                  src={videos.hero} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-[450px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-2xl animate-float">
                <Play className="w-4 h-4 inline mr-2" />
                Live Training Session
              </div>
              
              {/* Stats floating card */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100">
                <p className="text-3xl font-black text-blue-600"><AnimatedCounter end={25} suffix="h" /></p>
                <p className="text-xs text-slate-500">Complete Program</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TARGET AUDIENCE - Animated Banner */}
      <section className="relative py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.05%22%3E%3Cpath%20d=%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-30"
          style={{ 
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.2) 0%, transparent 50%)`
          }}
        />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center">
            <p className="text-blue-200 text-sm uppercase tracking-widest mb-4 animate-fade-in">Target Audience</p>
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
              {['Executive Leadership', 'Management', 'Sales Force', 'End Functions'].map((item, i) => (
                <div key={i} className="group">
                  <span className="text-white text-xl md:text-2xl font-bold transition-all duration-300 group-hover:text-blue-200">
                    {item}
                  </span>
                  {i < 3 && <span className="text-blue-300 text-2xl mx-4 hidden md:inline">•</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE CHALLENGE */}
      <section ref={challengeRef} className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={challengeVisible ? 'animate-slide-right' : 'opacity-0'}>
              <p className="text-blue-600 font-semibold mb-3 uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-600"></span>
                Understanding the Need
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">The Challenge</h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                Clear spoken English is essential for every employee in global meetings, customer calls, technical explanations, and team communication.
              </p>
              
              <div className="space-y-4">
                {[
                  { role: 'Executive Leadership', need: 'needs authority and clarity in board calls', delay: 'delay-100' },
                  { role: 'Management', need: 'needs confident team leadership communication', delay: 'delay-200' },
                  { role: 'Sales Force', need: 'needs persuasive customer presentations', delay: 'delay-300' },
                  { role: 'End Functions', need: '(Marketing, Sales Team, Customer Support, Operations, Technical Support, R&D, Regulatory) needs clear delivery in their specific contexts', delay: 'delay-400' }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-4 p-5 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100 hover-lift cursor-default ${challengeVisible ? `animate-slide-up ${item.delay}` : 'opacity-0'}`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                      <ChevronRight className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-slate-700">
                      <span className="font-bold text-slate-900">{item.role}</span> {item.need}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Video */}
            <div className={`hidden lg:block ${challengeVisible ? 'animate-slide-left delay-200' : 'opacity-0'}`}>
              <div className="relative">
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <video 
                    src={videos.challenge} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-[450px] object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl animate-float">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY VOCALFITNESS */}
      <section ref={whyRef} className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 ${whyVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-widest text-sm">The Difference</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Why VocalFitness</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Most language programs teach general English. <span className="font-bold text-slate-900">VocalFitness teaches spoken performance</span>: how to sound clear, be understood instantly, and communicate with authority.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: AudioWaveform, title: 'Pronunciation Clarity', desc: 'Sound clear in every word', color: 'from-blue-500 to-blue-600' },
              { icon: Target, title: 'Instant Understanding', desc: 'Be understood the first time', color: 'from-indigo-500 to-indigo-600' },
              { icon: Presentation, title: 'Executive Presence', desc: 'Communicate with authority', color: 'from-violet-500 to-violet-600' },
              { icon: BarChart3, title: 'Measurable Results', desc: 'Track real improvement', color: 'from-purple-500 to-purple-600' }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`group bg-white rounded-3xl p-8 border border-slate-100 shadow-lg hover-lift text-center ${whyVisible ? `animate-scale-in delay-${(i+1)*100}` : 'opacity-0'}`}
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 text-xl mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROFESSOR DAPPER SECTION */}
      <section ref={dapperRef} className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className={`text-center mb-16 ${dapperVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-400 text-sm uppercase tracking-widest mb-3 font-semibold">Method Founder</p>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4">Professor Steve Dapper</h2>
            <p className="text-slate-400 text-xl">World-Class Voice Authority</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10 items-start">
            {/* Main Photo */}
            <div className={`lg:col-span-1 ${dapperVisible ? 'animate-slide-right delay-200' : 'opacity-0'}`}>
              <div className="relative group">
                <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700 group-hover:border-blue-500 transition-all duration-500">
                  <img 
                    src={images.dapper1} 
                    alt="Professor Steve Dapper" 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xl">
                  30+ Years Experience
                </div>
              </div>
            </div>

            {/* Bio Content */}
            <div className="lg:col-span-2 space-y-6">
              {[
                { 
                  icon: GraduationCap, 
                  title: 'Academic Credentials',
                  content: academicCredentialsHTML.en,
                  delay: 'delay-100'
                },
                { 
                  icon: Star, 
                  title: 'Media & Entertainment',
                  content: 'Author for record labels, radio, TV, and social media. Successful host of thematic shows on <span class="text-white font-semibold">Radio 105, Radio Norba, Sky TV, and Esse Magazine</span>. Taught at Italy\'s most celebrated Influencer Houses, including <span class="text-white font-semibold">House of Talent, ChillHouse</span> (executive producer), and <span class="text-white font-semibold">Defhouse</span>.',
                  delay: 'delay-200'
                },
                { 
                  icon: Award, 
                  title: 'Industry Collaborations',
                  content: 'Consultant and author who has collaborated with internationally renowned artists including <span class="text-white font-semibold">Eros Ramazzotti</span> and <span class="text-white font-semibold">Mario Biondi</span>. Students include actors, entertainment personalities, and Fortune company executives.',
                  delay: 'delay-300',
                  badges: notableAlumni
                }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all duration-500 hover-lift ${dapperVisible ? `animate-slide-up ${item.delay}` : 'opacity-0'}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg">{item.title}</h3>
                  </div>
                  <p className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.content }} />
                  {item.badges && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {item.badges.map((name, j) => (
                        <span key={j} className="px-3 py-1.5 bg-slate-700/50 hover:bg-blue-600/30 rounded-full text-sm text-slate-300 hover:text-white transition-colors cursor-default">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hollywood Production */}
          <div className={`mt-12 grid lg:grid-cols-3 gap-8 items-center ${dapperVisible ? 'animate-slide-up delay-400' : 'opacity-0'}`}>
            <div className="lg:col-span-2 bg-gradient-to-r from-amber-900/40 to-slate-800/50 rounded-3xl p-8 border border-amber-600/30 hover:border-amber-500/50 transition-all duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center animate-pulse">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">Hollywood Production</h3>
              </div>
              <p className="text-slate-300 leading-relaxed text-lg">
                <span className="text-white font-semibold">Associate Producer</span> for Cell Motion Animation (New York). Currently involved in the production of the Hollywood film <span className="text-amber-400 font-black">"F*ck The Reich"</span>, a <span className="text-white font-semibold">$42 million production</span> set to premiere worldwide in 2027, for which he also handles the linguistic adaptation of the screenplay.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-600/30 hover:border-amber-500 transition-all duration-500 hover:scale-105">
                <img 
                  src={images.moviePoster} 
                  alt="F*ck The Reich - Steve Dapper Associate Producer" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SPEAK RIGHT 101 - MODULAR PROGRAM */}
      <section ref={programRef} className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 ${programVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-widest text-sm">Program Structure</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Speak Right 101 — Modular Program</h2>
            <p className="text-xl text-slate-600">
              <span className="font-bold">Speak Right 101 is fully modular</span> — employees can take individual modules or complete the full 5-module program.
            </p>
          </div>

          <div className="mb-12">
            <p className="text-center text-slate-500 mb-8 text-lg">5 Modular Pillars (<AnimatedCounter end={25} /> hours total)</p>
            <div className="space-y-4">
              {programModules.map((module, i) => (
                <div 
                  key={i} 
                  className={`rounded-2xl border-2 overflow-hidden transition-all duration-500 hover-lift ${module.highlight ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-lg shadow-blue-500/10' : 'bg-white border-slate-200 hover:border-blue-300'} ${programVisible ? `animate-slide-up delay-${(i+1)*100}` : 'opacity-0'}`}
                >
                  <div className="p-6 flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${module.highlight ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-slate-200'}`}>
                      <span className={`font-black text-2xl ${module.highlight ? 'text-white' : 'text-slate-600'}`}>{module.number}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className={`font-bold text-lg ${module.highlight ? 'text-blue-900' : 'text-slate-800'}`}>{module.title}</h3>
                        <div className="flex items-center gap-3">
                          {module.cefr && <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-full font-bold shadow-lg">{module.cefr}</span>}
                          <span className="px-4 py-1.5 bg-white border-2 border-slate-200 rounded-full text-sm text-slate-600 font-bold">{module.hours} hours</span>
                        </div>
                      </div>
                      {module.desc && <p className="text-blue-700 font-medium mt-2">{module.desc}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended modules callout */}
          <div className={`bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl ${programVisible ? 'animate-scale-in delay-600' : 'opacity-0'}`}>
            <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-300" />
              Recommended for ALL employees: Modules 3+4
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                <p className="font-bold text-xl mb-2">Segmentals</p>
                <p className="text-blue-100">Individual sound accuracy — foundation for ALL CEFR levels</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                <p className="font-bold text-xl mb-2">Suprasegmentals</p>
                <p className="text-blue-100">Rhythm/stress patterns — makes speech sound natural and professional</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EF INTEGRATION TABLE */}
      <section ref={efRef} className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 ${efVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-widest text-sm">Perfect Partnership</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">EF + VocalFitness = Complete Solution</h2>
            <p className="text-xl text-slate-600">Complementary strengths for comprehensive language development</p>
          </div>

          <div className={`bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-2xl ${efVisible ? 'animate-scale-in delay-200' : 'opacity-0'}`}>
            <div className="grid grid-cols-2">
              <div className="bg-slate-100 p-6 font-bold text-slate-800 border-b-2 border-r-2 border-slate-200 text-lg">EF Focus</div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 font-bold text-blue-800 border-b-2 border-slate-200 text-lg">VocalFitness Focus</div>
            </div>
            {efIntegration.map((row, i) => (
              <div key={i} className="grid grid-cols-2 group hover:bg-blue-50/50 transition-colors">
                <div className="p-6 text-slate-600 border-b border-r-2 border-slate-200 group-last:border-b-0">{row.ef}</div>
                <div className="p-6 text-blue-700 font-semibold border-b border-slate-200 group-last:border-b-0">{row.vf}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ITALY PILOT PROGRAM */}
      <section ref={pilotRef} className="py-24 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.03%22%3E%3Cpath%20d=%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className={`text-center mb-16 ${pilotVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-200 text-sm uppercase tracking-widest mb-3 font-semibold">Next Step</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Italy Pilot Program</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Pilot Details */}
            <div className={`lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 ${pilotVisible ? 'animate-slide-right delay-200' : 'opacity-0'}`}>
              <div className="grid md:grid-cols-2 gap-8">
                {[
                  { label: 'Location', value: 'Italy', icon: Globe },
                  { label: 'Cohort', value: 'Open mixed group from different departments', icon: Users },
                  { label: 'Duration', value: '10 to 12 weeks', icon: Clock },
                  { label: 'Format', value: 'Live virtual group sessions + guided practice tasks', icon: Presentation }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm">{item.label}</p>
                      <p className="text-white font-semibold text-lg">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video */}
            <div className={`hidden lg:block ${pilotVisible ? 'animate-slide-left delay-300' : 'opacity-0'}`}>
              <div className="rounded-2xl overflow-hidden shadow-2xl h-full border-2 border-white/20">
                <video 
                  src={videos.pilot} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full min-h-[250px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. MEASUREMENT */}
      <section ref={measureRef} className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-16 ${measureVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-semibold mb-3 uppercase tracking-widest text-sm">Results Tracking</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Measurement</h2>
            <p className="text-xl text-slate-600">Pre/Post Assessment</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: AudioWaveform, title: 'Intelligibility Audits', desc: 'Recorded speech analysis for objective clarity scoring', color: 'from-blue-500 to-blue-600' },
              { icon: Briefcase, title: 'Speaking Tasks', desc: 'Tasks linked to real job situations and contexts', color: 'from-indigo-500 to-indigo-600' },
              { icon: LineChart, title: 'Confidence Tracking', desc: 'Self-assessment + manager feedback integration', color: 'from-violet-500 to-violet-600' }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`group bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-lg hover-lift ${measureVisible ? `animate-scale-in delay-${(i+1)*100}` : 'opacity-0'}`}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 text-xl mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className={`bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-8 text-center shadow-2xl ${measureVisible ? 'animate-scale-in delay-400' : 'opacity-0'}`}>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-white" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">Success Target</p>
            <p className="text-emerald-100 text-lg">Measurable improvement in clarity and communication effectiveness</p>
          </div>
        </div>
      </section>

      {/* 9. CTA FINAL */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to Transform Communication at Medtronic Italy?</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-10 py-7 text-lg shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 group">
              <Calendar className="w-6 h-6 mr-3" /> 
              Schedule 30-minute pilot discussion
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="border-2 border-slate-600 text-white hover:bg-slate-800 hover:border-blue-500 px-10 py-7 text-lg transition-all duration-300" onClick={() => window.open(proposalPDF, '_blank')}>
              <Download className="w-6 h-6 mr-3" /> Download full proposal
            </Button>
          </div>

          <div className="border-t border-slate-700 pt-12">
            <p className="text-slate-400 mb-6 text-lg">VocalFitness Corporate Training Team</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-slate-400">
              <a href="mailto:corporate@vocalfitness.org" className="flex items-center gap-3 hover:text-white transition-colors group">
                <div className="w-12 h-12 bg-slate-800 group-hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                corporate@vocalfitness.org
              </a>
              <a href="https://wa.me/393515765749" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                <div className="w-12 h-12 bg-slate-800 group-hover:bg-green-600 rounded-xl flex items-center justify-center transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </div>
                +39 351 576 5749
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">VocalFitness</span>
          </div>
          <p className="text-slate-500 text-sm">
            Confidential proposal prepared for Medtronic Italy HR/L&D — 2026
          </p>
        </div>
      </footer>

      {/* Quote Form Modal */}
      {isQuoteFormOpen && (
        <CorporateQuoteForm 
          isOpen={isQuoteFormOpen} 
          onClose={() => setIsQuoteFormOpen(false)} 
          prefilledCompany="Medtronic"
        />
      )}
    </div>
  );
};

export default MedtronicLandingPage;
