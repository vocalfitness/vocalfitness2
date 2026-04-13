import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { 
  Building2, Users, Award, TrendingUp, CheckCircle, Target, Globe, 
  ArrowRight, BarChart3, Clock, ChevronDown, ChevronUp, 
  GraduationCap, Calendar, Check, Phone, Mail, Download,
  Mic2, BrainCircuit, AudioWaveform, Presentation, MessageSquare,
  Monitor, LineChart, ClipboardCheck, ArrowUpRight, Play
} from 'lucide-react';
import CorporateQuoteForm from '../components/CorporateQuoteForm';

const MedtronicLandingPage = () => {
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
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
      description: 'Understanding the physical mechanics of speech production for conscious articulatory control.',
      topics: ['Vocal tract anatomy', 'Articulator function', 'Breath support mechanics', 'Phonation fundamentals']
    },
    {
      number: '02',
      title: 'Psychoacoustics & Perception',
      hours: 4,
      description: 'Developing auditory awareness for self-monitoring and continuous improvement.',
      topics: ['Sound perception principles', 'Ear training methodology', 'Self-monitoring techniques', 'Feedback integration']
    },
    {
      number: '03',
      title: 'Segmentals: Individual Sounds',
      hours: 6,
      description: 'Mastering English phonemes through targeted articulatory practice.',
      topics: ['Vowel production (monophthongs, diphthongs)', 'Consonant contrasts', 'Voicing distinctions', 'Critical sound pairs for Italian speakers']
    },
    {
      number: '04',
      title: 'Suprasegmentals: Rhythm & Flow',
      hours: 6,
      description: 'Acquiring natural English prosody for improved comprehension by international listeners.',
      topics: ['Stress patterns (word & sentence)', 'Intonation contours', 'Rhythm and timing', 'Connected speech features']
    },
    {
      number: '05',
      title: 'Integration & Application',
      hours: 5,
      description: 'Consolidating skills through business scenario practice and personalized feedback.',
      topics: ['Business context application', 'Recorded speech analysis', 'Individual progress review', 'Ongoing practice protocols']
    }
  ];

  // Business add-ons
  const businessAddons = [
    { title: 'Presentations & Pitches', description: 'Delivering clear, compelling presentations to international audiences' },
    { title: 'Negotiation & Stakeholder Calls', description: 'Confident communication in high-stakes discussions' },
    { title: 'Technical Explanation', description: 'Articulating complex medical/technical content to global teams' },
    { title: 'Market Access Communication', description: 'Effective engagement with regulators and payers across markets' }
  ];

  // Measurement metrics
  const measurementMetrics = [
    { metric: 'Intelligibility Audits', description: 'Recorded speech analysis with objective scoring' },
    { metric: 'Segmental Accuracy', description: 'Target sound contrast achievement rates' },
    { metric: 'Suprasegmental Control', description: 'Stress and intonation pattern alignment' },
    { metric: 'Business Simulations', description: 'Scenario-based performance evaluation' },
    { metric: 'Confidence Tracking', description: 'Self-assessment and manager feedback integration' }
  ];

  // Digital tools
  const digitalTools = [
    { name: 'BandLab Integration', description: 'Group recording platform with instructor feedback loops' },
    { name: 'Voice Analysis Tools', description: 'Pitch tracking and stamina monitoring dashboards' },
    { name: 'Daily Drills Library', description: '10-minute articulation exercises for consistent practice' },
    { name: 'Progress Dashboard', description: 'Individual and cohort performance visualization' }
  ];

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

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
              <span className="text-blue-600 text-sm ml-2 font-medium">Training Proposal</span>
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
            <p className="text-blue-600 font-medium mb-4 tracking-wide uppercase text-sm">Training Proposal for Medtronic Italy</p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Specialist Spoken English Training
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              <span className="font-semibold text-slate-800">Speak Right 101 Pilot Program</span> — Improve pronunciation clarity, 
              intelligibility and executive presence for international business communication.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Request Pilot Discussion <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8">
                <Download className="w-4 h-4 mr-2" /> Download Proposal PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE OPPORTUNITY */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">The Opportunity</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Medtronic Context</h3>
                    <p className="text-slate-600">95,000+ employees across 150 countries. Established partnership with EF for comprehensive English language training.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">The Gap</h3>
                    <p className="text-slate-600">Broad English proficiency addressed. Specialist spoken performance remains an opportunity for high-impact employees.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Target Groups</h3>
                    <p className="text-slate-600"><span className="font-medium">Leadership</span> (board calls, investor relations) • <span className="font-medium">Commercial</span> (customer discussions) • <span className="font-medium">Medical/Technical</span> (training delivery)</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4">Current State</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-600">General English proficiency programs in place</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-600">Grammar and vocabulary foundations established</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-600">Online learning platform operational</span>
                </div>
              </div>
              <div className="border-t border-slate-200 mt-6 pt-6">
                <h3 className="font-semibold text-slate-800 mb-4">Opportunity Area</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-500" />
                    <span className="text-slate-600">Pronunciation clarity for intelligibility</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-500" />
                    <span className="text-slate-600">Prosodic patterns for natural communication</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-500" />
                    <span className="text-slate-600">Executive presence in live interactions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHY VOCAL FITNESS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why VocalFitness</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Speech performance methodology designed to complement broad language training 
              with specialist spoken skills development.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: Mic2, title: 'Articulatory Phonetics', desc: 'Physical speech production mechanics for clear sound formation' },
              { icon: AudioWaveform, title: 'Prosody Training', desc: 'Rhythm, stress, and intonation patterns for natural delivery' },
              { icon: Target, title: 'Intelligibility Focus', desc: 'Listener comprehension as the primary success metric' },
              { icon: Presentation, title: 'Executive Presence', desc: 'Confident delivery in live international communication' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-8 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Key Differentiator</h3>
                <p className="text-slate-600">
                  VocalFitness delivers <span className="font-semibold">speech performance methodology</span> — 
                  a specialist approach focused on the physical and acoustic dimensions of spoken English. 
                  This complements generic language training by addressing the specific mechanics of 
                  clear, intelligible pronunciation for professional contexts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Training in Action - Videos */}
      <section className="py-16 bg-white">
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

      {/* 4. PROGRAM STRUCTURE */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Program Structure</h2>
            <p className="text-slate-600">Speak Right 101 Foundation — 25 hours across 5 modules</p>
          </div>

          <div className="space-y-4 mb-12">
            {programModules.map((module, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6 flex items-start gap-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xl">{module.number}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-800 text-lg">{module.title}</h3>
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600 font-medium">{module.hours} hours</span>
                    </div>
                    <p className="text-slate-600 mb-4">{module.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {module.topics.map((topic, j) => (
                        <span key={j} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">{topic}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Business Add-ons */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <h3 className="font-semibold text-slate-800 mb-6">Optional Business Add-ons <span className="text-slate-500 font-normal">(post-foundation)</span></h3>
            <div className="grid md:grid-cols-2 gap-6">
              {businessAddons.map((addon, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{addon.title}</h4>
                    <p className="text-sm text-slate-600">{addon.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. ITALY PILOT PROPOSAL */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Italy Pilot Proposal</h2>
            <p className="text-blue-100">Structured pilot to demonstrate value before broader rollout</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Cohort Size', value: '20-30', desc: 'High-impact employees' },
              { label: 'Duration', value: '3 months', desc: 'Modular delivery' },
              { label: 'Format', value: 'Hybrid', desc: 'Live sessions + digital' },
              { label: 'Target', value: '80%', desc: 'Intelligibility improvement' }
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
                <div className="text-blue-100 font-medium">{item.label}</div>
                <div className="text-blue-200 text-sm">{item.desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-8">
            <h3 className="font-semibold text-slate-800 mb-6">Pilot Pathway</h3>
            <div className="flex flex-col md:flex-row gap-4">
              {[
                { phase: 'Phase 1', title: 'Italy Pilot', desc: '20-30 participants, 3-month program' },
                { phase: 'Phase 2', title: 'Evaluation', desc: 'Pre/post assessment, ROI analysis' },
                { phase: 'Phase 3', title: 'Case Study', desc: 'Document outcomes and learnings' },
                { phase: 'Phase 4', title: 'Expansion', desc: 'Group-wide rollout consideration' }
              ].map((item, i) => (
                <div key={i} className="flex-1 relative">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <span className="text-xs font-medium text-blue-600 uppercase">{item.phase}</span>
                    <h4 className="font-semibold text-slate-800 mt-1">{item.title}</h4>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                  {i < 3 && <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 z-10" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. MEASUREMENT FRAMEWORK */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Measurement Framework</h2>
            <p className="text-slate-600">Rigorous pre/post assessment to demonstrate program impact</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {measurementMetrics.map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800">{item.metric}</h3>
                </div>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">ROI Documentation</h3>
              </div>
              <p className="text-sm text-slate-600">Comprehensive reporting for L&D investment validation and stakeholder communication</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DIGITAL REINFORCEMENT */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Digital Reinforcement</h2>
            <p className="text-slate-600">Practice system for consistent skill development between sessions</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {digitalTools.map((tool, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <Monitor className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{tool.name}</h3>
                <p className="text-sm text-slate-600">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. WHY NOW */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Why Now</h2>
              <p className="text-slate-600 mb-8">
                International communication demands continue to increase across Medtronic's global operations. 
                Clear, intelligible spoken English is essential for:
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Cross-border Leadership', desc: 'Board meetings, investor relations, executive communication' },
                  { title: 'Global Customer Relationships', desc: 'Sales discussions, account management, partnership negotiations' },
                  { title: 'Technical Training Delivery', desc: 'Product training, clinical education, knowledge transfer' },
                  { title: 'Market Access Presentations', desc: 'Regulatory submissions, payer discussions, health authority engagement' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{item.title}</h3>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-8 border border-blue-100">
              <h3 className="font-semibold text-slate-800 mb-6">Strategic Value</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">Communication Effectiveness</span>
                    <span className="font-semibold text-slate-800">+40%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '40%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">Intelligibility Score</span>
                    <span className="font-semibold text-slate-800">+80%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '80%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">Speaker Confidence</span>
                    <span className="font-semibold text-slate-800">+65%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '65%'}}></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-6">Based on pilot program outcomes with comparable organizations</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. NEXT STEPS */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Next Steps</h2>
          <p className="text-slate-300 mb-10 max-w-2xl mx-auto">
            We welcome the opportunity to discuss how VocalFitness can support 
            Medtronic Italy's spoken English communication objectives.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button onClick={() => setIsQuoteFormOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
              <Calendar className="w-5 h-5 mr-2" /> Schedule Pilot Discussion
            </Button>
            <Button variant="outline" size="lg" className="border-slate-600 text-white hover:bg-slate-800 px-8">
              <Download className="w-5 h-5 mr-2" /> Download Full Proposal
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-slate-400">
            <a href="mailto:corporate@vocalfitness.org" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail className="w-5 h-5" /> corporate@vocalfitness.org
            </a>
            <a href="tel:+390000000000" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone className="w-5 h-5" /> +39 XXX XXX XXXX
            </a>
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
