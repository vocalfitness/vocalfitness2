import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { 
  Building2, Users, Target, Globe, 
  ArrowRight, BarChart3, Clock, 
  GraduationCap, Calendar, Check, Phone, Mail, Download,
  Mic2, BrainCircuit, AudioWaveform, Presentation,
  Monitor, LineChart, ClipboardCheck, Play, Headphones,
  MessageSquare, Activity, FileText
} from 'lucide-react';
import CorporateQuoteForm from '../components/CorporateQuoteForm';

const MedtronicLandingPage = () => {
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Training videos
  const trainingVideos = [
    {
      id: 1,
      url: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/qo5q7c4c_ad501a89-967e-48e3-99fd-4f1d12412ba5.mp4',
      title: 'Articulatory Workshop Session'
    },
    {
      id: 2,
      url: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/45ylxra6_4d1a8b4c-feeb-433e-b1a7-37e27b10d238.mp4',
      title: 'Group Training Exercise'
    },
    {
      id: 3,
      url: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/mo03g0sv_849bf25e-793e-43a4-b188-09197516b84b.mp4',
      title: 'Phonetics Practice Session'
    },
    {
      id: 4,
      url: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/bvvtq8nw_39659c96-0738-4b6f-9e27-1a762972c150.mp4',
      title: 'Speech Production Training'
    },
    {
      id: 5,
      url: 'https://customer-assets.emergentagent.com/job_b88ed235-bbf3-4b4c-aad3-890dc884bc01/artifacts/3dkg7o1q_a1175e9c-c731-46a7-bd5f-90a9591257fe.mp4',
      title: 'Pronunciation Workshop'
    }
  ];

  // Program modules
  const programModules = [
    {
      number: '01',
      title: 'Speech Anatomy & Physiology',
      hours: 4,
      description: 'Understanding the physical mechanics of speech production for conscious articulatory control.'
    },
    {
      number: '02',
      title: 'Psychoacoustics & Perception',
      hours: 4,
      description: 'Developing auditory awareness for self-monitoring and continuous improvement.'
    },
    {
      number: '03',
      title: 'Segmentals - Individual Sounds',
      hours: 6,
      description: 'Mastering English phonemes through targeted articulatory practice.'
    },
    {
      number: '04',
      title: 'Suprasegmentals - Rhythm/Flow',
      hours: 6,
      description: 'Acquiring natural English prosody for improved comprehension by international listeners.'
    },
    {
      number: '05',
      title: 'Music Notation & Integration',
      hours: 5,
      description: 'Consolidating skills through business scenario practice and personalized feedback.'
    }
  ];

  // Post-foundation add-ons
  const postFoundationAddons = [
    'Presentations & stakeholder pitches',
    'Negotiation & international calls',
    'Technical training delivery',
    'Customer communication scenarios'
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
      <section className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Specialist Spoken English Training Proposal
            </h1>
            <p className="text-2xl text-blue-600 font-medium mb-8">
              for Medtronic Italy HR/L&D
            </p>
            
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 inline-block">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Speak Right 101 Pilot Program</h2>
              <p className="text-slate-600">25-hour foundation training for international communication excellence</p>
            </div>

            <div className="mb-10">
              <p className="text-slate-500 text-sm uppercase tracking-wide mb-2">Target Groups</p>
              <p className="text-lg text-slate-700">
                <span className="font-medium">Leadership</span> • <span className="font-medium">Commercial</span> • <span className="font-medium">Medical/Technical</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Request 30-Minute Pilot Discussion <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8">
                <Download className="w-4 h-4 mr-2" /> Download Proposal PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OPPORTUNITY SECTION */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column */}
            <div className="space-y-10">
              {/* Medtronic Context */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 uppercase tracking-wide text-sm">Medtronic Context</h3>
                </div>
                <p className="text-slate-600 text-lg">95,000 employees across 150 countries</p>
                <p className="text-slate-600">Established EF partnership for broad language training</p>
              </div>

              {/* Current Gap */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 uppercase tracking-wide text-sm">Current Gap</h3>
                </div>
                <p className="text-slate-700 font-medium mb-3">International teams need specialist spoken performance:</p>
                <ul className="space-y-2">
                  {[
                    'Pronunciation clarity & intelligibility',
                    'Executive presence in global meetings',
                    'Technical explanation to international audiences',
                    'Stakeholder negotiation & customer discussions'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <Check className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column - Why Now */}
            <div className="bg-blue-50 rounded-xl p-8 border border-blue-100 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 uppercase tracking-wide text-sm">Why Now</h3>
              </div>
              <p className="text-xl text-slate-800 font-medium">
                Italy-first pilot validates methodology before group-wide rollout
              </p>
              <p className="text-slate-600 mt-4">
                Medtronic Italy serves as the ideal test market for this specialist training before 
                expanding to other EMEA regions and global locations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Training in Action - Videos */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Training in Action</h2>
            <p className="text-slate-600">Live workshop sessions demonstrating our hands-on methodology</p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {trainingVideos.map((video) => (
              <div key={video.id} className="relative group cursor-pointer" onClick={() => setActiveVideo(video)}>
                <video 
                  src={video.url} 
                  className="w-full h-32 object-cover rounded-lg border border-slate-200"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex items-center justify-center group-hover:bg-slate-900/60 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-slate-800 ml-0.5" />
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2 text-center">{video.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PROGRAM STRUCTURE */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Speak Right 101 Foundation</h2>
            <p className="text-slate-600 text-lg">25 hours across 5 integrated modules</p>
          </div>

          <div className="space-y-4 mb-12">
            {programModules.map((module, i) => (
              <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6 flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-lg">{module.number}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-800 text-lg">{module.title}</h3>
                      <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600 font-medium">{module.hours}h</span>
                    </div>
                    <p className="text-slate-600">{module.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Post-Foundation Add-ons */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
            <h3 className="font-semibold text-slate-800 mb-6 uppercase tracking-wide text-sm">Post-Foundation Add-ons</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {postFoundationAddons.map((addon, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-slate-700">{addon}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-slate-600"><span className="font-medium text-slate-800">Delivery:</span> Live group sessions + digital reinforcement</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ITALY PILOT */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-2">Italy Pilot Proposal — Phase 1</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Pilot Details */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
              <div className="space-y-4">
                {[
                  { label: 'Country', value: 'Italy (first target market)' },
                  { label: 'Cohort', value: '20-30 high-impact employees' },
                  { label: 'Duration', value: '3 months (modular delivery)' },
                  { label: 'Format', value: 'Live sessions + between-lesson practice' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/20 last:border-0">
                    <span className="text-blue-100">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Success Metrics */}
            <div className="bg-white rounded-xl p-8">
              <h3 className="font-semibold text-slate-800 mb-6 uppercase tracking-wide text-sm">Success Metrics</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">80% intelligibility improvement</p>
                    <p className="text-sm text-slate-600">(pre/post audit)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="font-medium text-slate-800">Business scenario proficiency</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="font-medium text-slate-800">Manager + self-reported confidence gains</p>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <p className="text-white text-lg">
              <span className="font-semibold">Phase 2:</span> Italy case study → Group-wide rollout
            </p>
          </div>
        </div>
      </section>

      {/* 5. MEASUREMENT */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Comprehensive Assessment</h2>
            <p className="text-slate-600 text-lg">Pre/Post Program Evaluation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Intelligibility Audits */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <AudioWaveform className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-4">Intelligibility Audits</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-slate-600 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Recorded speech analysis (clarity scoring)</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Segmental accuracy (target sounds)</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Suprasegmental control (stress/intonation)</span>
                </li>
              </ul>
            </div>

            {/* Business Task Simulation */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Presentation className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-4">Business Task Simulation</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-slate-600 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Role-specific scenarios (calls/presentations)</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Live stakeholder communication assessment</span>
                </li>
              </ul>
            </div>

            {/* Confidence Tracking */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <LineChart className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-4">Confidence Tracking</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-slate-600 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Self-assessment + manager feedback</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>International meeting performance metrics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DIGITAL TOOLS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Digital Reinforcement System</h2>
            <p className="text-slate-600 text-lg">Between-Lesson Practice Platform</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { name: 'VoiceLab', desc: 'Group recording + peer feedback', icon: Headphones },
              { name: 'Voice Analysis', desc: 'Pitch/stamina tracking tools', icon: Activity },
              { name: 'Daily Drills', desc: '10-minute articulation practice', icon: Clock },
              { name: 'Dashboards', desc: 'Individual + cohort progress tracking', icon: BarChart3 }
            ].map((tool, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <tool.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{tool.name}</h3>
                <p className="text-sm text-slate-600">{tool.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-slate-500 italic">Lightweight companion to live training</p>
          </div>
        </div>
      </section>

      {/* 7. NEXT STEPS */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Next Steps for Medtronic HR</h2>
          
          <div className="space-y-4 mb-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white"><span className="font-semibold text-blue-300">Primary:</span> Schedule 30-minute pilot scoping call</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-300"><span className="font-semibold text-slate-400">Secondary:</span> Download complete proposal PDF</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-300"><span className="font-semibold text-slate-400">Tertiary:</span> Request sample materials</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              <Calendar className="w-5 h-5 mr-2" /> Schedule Pilot Discussion
            </Button>
            <Button variant="outline" size="lg" className="border-slate-600 text-white hover:bg-slate-800 px-8">
              <Download className="w-5 h-5 mr-2" /> Download Proposal PDF
            </Button>
          </div>

          <div className="border-t border-slate-700 pt-10">
            <p className="text-slate-400 mb-4">VocalFitness Corporate Training Team</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-slate-400">
              <a href="mailto:corporate@vocalfitness.org" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-5 h-5" /> corporate@vocalfitness.org
              </a>
              <a href="tel:+390000000000" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-5 h-5" /> +39 XXX XXX XXXX
              </a>
            </div>
          </div>

          <p className="text-xl text-blue-300 mt-10 font-medium">
            Ready to improve spoken communication performance?
          </p>
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
            Confidential proposal prepared for Medtronic Italy HR/L&D — February 2026
          </p>
        </div>
      </footer>

      {/* Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setActiveVideo(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setActiveVideo(null)} 
              className="absolute -top-12 right-0 text-white hover:text-slate-300"
            >
              Close
            </button>
            <video 
              src={activeVideo.url} 
              controls 
              autoPlay 
              className="w-full rounded-lg"
            />
            <p className="text-white text-center mt-4">{activeVideo.title}</p>
          </div>
        </div>
      )}

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
