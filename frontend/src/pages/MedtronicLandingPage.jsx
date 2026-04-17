import React, { useState, useEffect } from 'react';
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

const MedtronicLandingPage = () => {
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-slate-800 font-semibold text-lg">VocalFitness</span>
              <span className="text-blue-600 text-sm ml-2 font-medium">Corporate Training</span>
            </div>
          </div>
          <Button onClick={() => setIsQuoteFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            Request Discussion
          </Button>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <p className="text-blue-600 font-medium mb-3 uppercase tracking-wide text-sm">Training Proposal</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Specialist Spoken Communication Performance Training for Medtronic Italy
              </h1>
              
              <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Speak Right 101</h2>
                <p className="text-slate-600">Modular training for Executive Leadership, Management, Sales Force, End Functions</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  Request Pilot Discussion <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50 px-6" onClick={() => window.open(proposalPDF, '_blank')}>
                  <Download className="w-4 h-4 mr-2" /> Download Proposal PDF
                </Button>
              </div>
            </div>

            {/* Right - Video */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                <video 
                  src={videos.hero} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-[380px] object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                Live Training Session
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TARGET AUDIENCE */}
      <section className="py-12 bg-blue-600">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <p className="text-blue-200 text-sm uppercase tracking-wide mb-3">Target Audience</p>
            <p className="text-white text-xl md:text-2xl font-semibold">
              <span className="font-bold">Executive Leadership</span> • <span className="font-bold">Management</span> • <span className="font-bold">Sales Force</span> • <span className="font-bold">End Functions</span>
            </p>
          </div>
        </div>
      </section>

      {/* 3. THE CHALLENGE */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">The Challenge</h2>
              <p className="text-lg text-slate-600 mb-8">
                Clear spoken English is essential for every employee in global meetings, customer calls, technical explanations, and team communication.
              </p>
              
              <div className="space-y-4">
                {[
                  { role: 'Executive Leadership', need: 'needs authority and clarity in board calls' },
                  { role: 'Management', need: 'needs confident team leadership communication' },
                  { role: 'Sales Force', need: 'needs persuasive customer presentations' },
                  { role: 'End Functions', need: '(Marketing, Sales Team, Customer Support, Operations, Technical Support, R&D, Regulatory) needs clear delivery in their specific contexts' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">{item.role}</span> {item.need}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Video */}
            <div className="hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                <video 
                  src={videos.challenge} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-[350px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY VOCALFITNESS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why VocalFitness</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Most language programs teach general English. <span className="font-semibold text-slate-800">VocalFitness teaches spoken performance</span>: how to sound clear, be understood instantly, and communicate with authority.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: AudioWaveform, title: 'Pronunciation Clarity', desc: 'Sound clear in every word' },
              { icon: Target, title: 'Instant Understanding', desc: 'Be understood the first time' },
              { icon: Presentation, title: 'Executive Presence', desc: 'Communicate with authority' },
              { icon: BarChart3, title: 'Measurable Results', desc: 'Track real improvement' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROFESSOR DAPPER SECTION */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm uppercase tracking-wide mb-2">Method Founder</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Professor Steve Dapper</h2>
            <p className="text-slate-400 text-lg">World-Class Voice Authority</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Main Photo */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700">
                <img 
                  src={images.dapper1} 
                  alt="Professor Steve Dapper" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            {/* Bio Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="w-6 h-6 text-blue-400" />
                  <h3 className="text-white font-semibold">Academic Credentials</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  <span className="text-white font-medium">University Professor of English Articulatory Phonetics</span> at Università eCampus and <span className="text-white font-medium">researcher at the LFSAG Phonetics Laboratory</span> of the University of Turin. Multi-instrumentalist musician, linguist, and <span className="text-white font-medium">certified coach in biomechanics and body conditioning</span> from the University of Tampa (Florida, USA). Founder of the proprietary <span className="text-blue-400 font-semibold">Vocal Fitness method</span> for spoken English learning.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <Star className="w-6 h-6 text-blue-400" />
                  <h3 className="text-white font-semibold">Media & Entertainment</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Author for record labels, radio, TV, and social media. Successful host of thematic shows on <span className="text-white font-medium">Radio 105, Radio Norba, Sky TV, and Esse Magazine</span>. Taught at Italy's most celebrated Influencer Houses, including <span className="text-white font-medium">House of Talent, ChillHouse</span> (executive producer), and <span className="text-white font-medium">Defhouse</span>.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-blue-400" />
                  <h3 className="text-white font-semibold">Industry Collaborations</h3>
                </div>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Consultant and author who has collaborated with internationally renowned artists including <span className="text-white font-medium">Eros Ramazzotti</span> and <span className="text-white font-medium">Mario Biondi</span>. Students include actors, entertainment personalities, and Fortune company executives.
                </p>
                <div className="flex flex-wrap gap-2">
                  {notableAlumni.map((name, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hollywood Production */}
          <div className="mt-12 grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 bg-gradient-to-r from-amber-900/30 to-slate-800/50 rounded-xl p-8 border border-amber-700/30">
              <div className="flex items-center gap-3 mb-4">
                <Play className="w-6 h-6 text-amber-400" />
                <h3 className="text-white font-semibold">Hollywood Production</h3>
              </div>
              <p className="text-slate-300 leading-relaxed text-lg">
                <span className="text-white font-medium">Associate Producer</span> for Cell Motion Animation (New York). Currently involved in the production of the Hollywood film <span className="text-amber-400 font-bold">"F*ck The Reich"</span>, a <span className="text-white font-medium">$42 million production</span> set to premiere worldwide in 2027, for which he also handles the linguistic adaptation of the screenplay.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="rounded-xl overflow-hidden shadow-xl border border-slate-700">
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
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Speak Right 101 — Modular Program</h2>
            <p className="text-slate-600 text-lg">
              <span className="font-semibold">Speak Right 101 is fully modular</span> — employees can take individual modules or complete the full 5-module program.
            </p>
          </div>

          <div className="mb-8">
            <p className="text-center text-slate-500 mb-6">5 Modular Pillars (25 hours total)</p>
            <div className="space-y-3">
              {programModules.map((module, i) => (
                <div key={i} className={`rounded-xl border overflow-hidden ${module.highlight ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="p-5 flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${module.highlight ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      <span className={`font-bold text-lg ${module.highlight ? 'text-white' : 'text-slate-600'}`}>{module.number}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${module.highlight ? 'text-blue-900' : 'text-slate-800'}`}>{module.title}</h3>
                        <div className="flex items-center gap-3">
                          {module.cefr && <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">{module.cefr}</span>}
                          <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600 font-medium">{module.hours} hours</span>
                        </div>
                      </div>
                      {module.desc && <p className="text-blue-700 text-sm mt-1">{module.desc}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended modules callout */}
          <div className="bg-blue-600 rounded-xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-3">Recommended for ALL employees: Modules 3+4</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="font-medium">Segmentals</p>
                <p className="text-blue-100 text-sm">Individual sound accuracy — foundation for ALL CEFR levels</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="font-medium">Suprasegmentals</p>
                <p className="text-blue-100 text-sm">Rhythm/stress patterns — makes speech sound natural and professional</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EF INTEGRATION TABLE */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">EF + VocalFitness = Complete Solution</h2>
            <p className="text-slate-600">Complementary strengths for comprehensive language development</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-2">
              <div className="bg-slate-100 p-4 font-semibold text-slate-800 border-b border-r border-slate-200">EF Focus</div>
              <div className="bg-blue-50 p-4 font-semibold text-blue-800 border-b border-slate-200">VocalFitness Focus</div>
            </div>
            {efIntegration.map((row, i) => (
              <div key={i} className="grid grid-cols-2">
                <div className="p-4 text-slate-600 border-b border-r border-slate-200 last:border-b-0">{row.ef}</div>
                <div className="p-4 text-blue-700 font-medium border-b border-slate-200 last:border-b-0">{row.vf}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ITALY PILOT PROGRAM */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-2">Italy Pilot Program</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Pilot Details */}
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { label: 'Location', value: 'Italy' },
                  { label: 'Cohort', value: 'Open mixed group from different departments' },
                  { label: 'Duration', value: '10 to 12 weeks' },
                  { label: 'Format', value: 'Live virtual group sessions + guided practice tasks' }
                ].map((item, i) => (
                  <div key={i} className="border-b border-white/20 pb-4 last:border-0">
                    <p className="text-blue-200 text-sm">{item.label}</p>
                    <p className="text-white font-medium text-lg">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Video */}
            <div className="hidden lg:block">
              <div className="rounded-xl overflow-hidden shadow-lg h-full">
                <video 
                  src={videos.pilot} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full min-h-[200px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. MEASUREMENT */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Measurement</h2>
            <p className="text-slate-600 text-lg">Pre/Post Assessment</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { icon: AudioWaveform, title: 'Intelligibility Audits', desc: 'Recorded speech analysis for objective clarity scoring' },
              { icon: Briefcase, title: 'Speaking Tasks', desc: 'Tasks linked to real job situations and contexts' },
              { icon: LineChart, title: 'Confidence Tracking', desc: 'Self-assessment + manager feedback integration' }
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <Check className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
            <p className="text-lg font-semibold text-emerald-800">Success Target</p>
            <p className="text-emerald-700">Measurable improvement in clarity and communication effectiveness</p>
          </div>
        </div>
      </section>

      {/* 9. CTA FINAL */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Communication at Medtronic Italy?</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              <Calendar className="w-5 h-5 mr-2" /> Schedule 30-minute pilot discussion
            </Button>
            <Button variant="outline" size="lg" className="border-slate-600 text-white hover:bg-slate-800 px-8" onClick={() => window.open(proposalPDF, '_blank')}>
              <Download className="w-5 h-5 mr-2" /> Download full proposal
            </Button>
          </div>

          <div className="border-t border-slate-700 pt-10">
            <p className="text-slate-400 mb-4">VocalFitness Corporate Training Team</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-slate-400">
              <a href="mailto:corporate@vocalfitness.org" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-5 h-5" /> corporate@vocalfitness.org
              </a>
              <a href="https://wa.me/393515765749" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <MessageCircle className="w-5 h-5" /> +39 351 576 5749
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium">VocalFitness</span>
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
