import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Building2, Users, Award, TrendingUp, CheckCircle, Target, Globe, Sparkles, ArrowRight, Star, Shield } from 'lucide-react';
import CorporateQuoteForm from '../components/CorporateQuoteForm';

const CorporateTrainingPage = () => {
  const { language } = useLanguage();
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const content = {
    it: {
      hero: {
        badge: "VocalFitness Corporate Solutions",
        title: "Corsi d'Inglese Aziendali",
        titleHighlight: "con Eccellenza Accademica",
        subtitle: "L'unico fornitore che include il Metodo VocalFitness di Fonetica Articolatoria Proprietaria per TUTTI i dipendenti - non solo per il top management. Trasforma l'inglese aziendale da fringe benefit standard a vantaggio competitivo reale.",
        cta: "Richiedi Preventivo Gratuito"
      },
      problem: {
        title: "Stanchi dei Soliti Fornitori di Corsi Standard?",
        subtitle: "I problemi che ogni HR Manager conosce troppo bene",
        points: [
          {
            title: "Zero Risultati Concreti",
            description: "Anni di investimenti in corsi che non producono miglioramenti misurabili nella comunicazione reale"
          },
          {
            title: "Tassi di Abbandono Altissimi",
            description: "In Italia, 8 dipendenti su 10 abbandonano i corsi aziendali entro 2 mesi. Budget sprecato, zero ROI"
          },
          {
            title: "Insegnanti Non Qualificati",
            description: "Fornitori che promettono esperienza ma usano docenti senza reale competenza accademica o fonetica"
          },
          {
            title: "Metodi Obsoleti",
            description: "Approcci generici 'one-size-fits-all' senza alcuna base scientifica o eccellenza metodologica"
          }
        ]
      },
      solution: {
        title: "La Soluzione VocalFitness Corporate",
        subtitle: "Eccellenza Accademica Incontra le Esigenze Corporate",
        description: "Offrite ai vostri dipendenti - dal receptionist al CEO - lo stesso metodo di pronuncia proprietaria brevettato usato dai Fortune 500 executives. Incluso nel pacchetto standard.",
        features: [
          {
            icon: 'Award',
            title: "Metodo Proprietario Incluso",
            description: "Il modulo VocalFitness di condizionamento muscolare fonetico - normalmente riservato al top management - è incluso per TUTTI i livelli aziendali"
          },
          {
            icon: 'Users',
            title: "Rete Insegnanti Certificati",
            description: "Solo docenti con certificazioni CELTA/DELTA + formazione specialistica VocalFitness. Zero improvvisazione"
          },
          {
            icon: 'Target',
            title: "4 Skills Complete",
            description: "Grammar, Vocabulary, Writing, Reading & Listening Comprehension. Approccio olistico e scientificamente validato"
          },
          {
            icon: 'Globe',
            title: "Pan-Europeo: In Sede o Online",
            description: "Servizio flessibile in tutta Europa. Lezioni in presenza nella vostra sede o completamente online. Voi scegliete"
          }
        ]
      },
      differentiators: {
        title: "Perché Sostituire il Vostro Attuale Fornitore?",
        subtitle: "VocalFitness vs. Fornitori Standard",
        points: [
          {
            title: "Eccellenza Accademica Reale",
            vf: "Metodo brevettato Professor Steve Dapper, validato da Cambridge Assessment, MIUR, EF Education",
            others: "Metodi generici senza validazione scientifica o riconoscimento accademico"
          },
          {
            title: "Fonetica Articolatoria",
            vf: "Modulo proprietario di condizionamento muscolare per pronuncia nativa. Per TUTTI i dipendenti",
            others: "Zero focus sulla pronuncia. Risultato: anni di studio ma accento pesante invariato"
          },
          {
            title: "Qualità Docenti",
            vf: "Solo CELTA/DELTA certificati + training VocalFitness. Background accademico verificato",
            others: "Insegnanti generici, spesso senza certificazioni internazionali o esperienza corporate"
          },
          {
            title: "Completion Rate",
            vf: "92% dei dipendenti completano il corso. Engagement mantenuto alto",
            others: "20% completion rate medio. Budget sprecato, dipendenti frustrati"
          },
          {
            title: "Risultati Misurabili",
            vf: "Assessment CEFR pre/post corso. Miglioramento medio di 1.5 livelli in 12 settimane",
            others: "Nessuna metrica chiara. Impossibile dimostrare ROI al management"
          }
        ]
      },
      levels: {
        title: "Per Tutti i Livelli Aziendali",
        subtitle: "Dall'entry-level al C-suite, tutti con il metodo VocalFitness incluso",
        tiers: [
          {
            level: "Entry-Level",
            icon: "Users",
            title: "Building Confidence",
            description: "Reception, assistenti, operativi",
            skills: ["Comunicazione telefonica fluente", "Email professionali corrette", "Pronuncia chiara e comprensibile", "Vocabolario business essenziale"]
          },
          {
            level: "Middle Management",
            icon: "Target",
            title: "Professional Communication",
            description: "Team leaders, manager, coordinatori",
            skills: ["Presentazioni efficaci", "Meeting in inglese senza esitazione", "Negoziazione e persuasione", "Report writing professionale"]
          },
          {
            level: "Senior Leadership",
            icon: "Award",
            title: "Executive Presence",
            description: "Director, VP, C-level",
            skills: ["Command presence con pronuncia nativa", "Public speaking internazionale", "Strategic communication", "Networking C-suite globale"]
          }
        ]
      },
      packages: {
        title: "Soluzioni su Misura",
        subtitle: "Dalla PMI alla Grande Corporate",
        note: "Tutti i pacchetti includono il modulo VocalFitness di fonetica articolatoria proprietaria",
        options: [
          {
            name: "STARTER",
            target: "PMI (10-50 dipendenti)",
            features: [
              "20 ore di corso per dipendente",
              "4 skills + modulo VocalFitness",
              "Modalità online o in sede",
              "Certificazione CEFR finale",
              "Materiali didattici inclusi",
              "Assessment iniziale gratuito"
            ],
            cta: "Richiedi Preventivo"
          },
          {
            name: "PROFESSIONAL",
            target: "Medie Imprese (50-200 dipendenti)",
            features: [
              "40 ore + modulo pronuncia avanzato",
              "Blended: online + in persona",
              "Progress dashboard per HR",
              "Schedule personalizzato",
              "Dedicated support",
              "Report trimestrali management"
            ],
            cta: "Richiedi Preventivo",
            highlight: true
          },
          {
            name: "ENTERPRISE",
            target: "Corporate (200+ dipendenti)",
            features: [
              "Ore personalizzate su necessità",
              "Dedicated Account Manager",
              "Coordinamento multi-sede",
              "Integrazione LMS aziendale",
              "SLA garantiti",
              "Reportistica avanzata ROI"
            ],
            cta: "Richiedi Preventivo"
          }
        ]
      },
      fringeBenefit: {
        title: "Welfare Aziendale che Fa la Differenza",
        subtitle: "Più di un semplice fringe benefit: un investimento strategico",
        benefits: [
          {
            title: "Retention & Engagement",
            description: "Dipendenti che percepiscono investimento reale nella loro crescita rimangono più a lungo e sono più motivati"
          },
          {
            title: "Deducibilità Fiscale 100%",
            description: "Formazione aziendale completamente deducibile. Conforme alle normative welfare italiane"
          },
          {
            title: "Competitive Advantage",
            description: "Team che comunica fluentemente in inglese = accesso a mercati internazionali e clienti globali"
          },
          {
            title: "Employer Branding",
            description: "Attraete talenti migliori offrendo formazione di livello executive a tutti i dipendenti"
          }
        ]
      },
      trust: {
        title: "Riconosciuto dalle Istituzioni Leader",
        certifications: [
          "Cambridge Assessment English Partner",
          "MIUR Validated Methodology",
          "EF Education First Integrated",
          "CEFR Aligned & Certified",
          "GDPR & ISO Compliant"
        ]
      },
      cta: {
        title: "Pronto a Sostituire il Vostro Fornitore Attuale?",
        subtitle: "Richiedete un preventivo personalizzato senza impegno. Vi mostreremo come VocalFitness può trasformare il vostro English training da costo a investimento strategico.",
        button: "Richiedi Preventivo Gratuito",
        features: [
          "Assessment gratuito delle necessità aziendali",
          "Demo del metodo VocalFitness per il vostro team",
          "Preventivo personalizzato entro 48h",
          "Zero impegno, zero costi nascosti"
        ]
      }
    },
    en: {
      hero: {
        badge: "VocalFitness Corporate Solutions",
        title: "Corporate English Training",
        titleHighlight: "with Academic Excellence",
        subtitle: "The only provider that includes the VocalFitness Proprietary Articulatory Phonetics Method for ALL employees - not just top management. Transform corporate English from standard fringe benefit to real competitive advantage.",
        cta: "Request Free Quote"
      },
      problem: {
        title: "Tired of the Same Old Standard Course Providers?",
        subtitle: "Problems every HR Manager knows too well",
        points: [
          {
            title: "Zero Concrete Results",
            description: "Years of investment in courses that produce no measurable improvement in real communication"
          },
          {
            title: "Sky-High Dropout Rates",
            description: "In Italy, 8 out of 10 employees abandon corporate courses within 2 months. Wasted budget, zero ROI"
          },
          {
            title: "Unqualified Teachers",
            description: "Providers who promise experience but use teachers without real academic or phonetic expertise"
          },
          {
            title: "Obsolete Methods",
            description: "Generic 'one-size-fits-all' approaches without any scientific basis or methodological excellence"
          }
        ]
      },
      solution: {
        title: "The VocalFitness Corporate Solution",
        subtitle: "Academic Excellence Meets Corporate Needs",
        description: "Give your employees - from receptionist to CEO - the same patented pronunciation method used by Fortune 500 executives. Included in the standard package.",
        features: [
          {
            icon: 'Award',
            title: "Proprietary Method Included",
            description: "The VocalFitness phonetic muscle conditioning module - normally reserved for top management - is included for ALL corporate levels"
          },
          {
            icon: 'Users',
            title: "Certified Teacher Network",
            description: "Only teachers with CELTA/DELTA certifications + VocalFitness specialist training. Zero improvisation"
          },
          {
            icon: 'Target',
            title: "Complete 4 Skills",
            description: "Grammar, Vocabulary, Writing, Reading & Listening Comprehension. Holistic and scientifically validated approach"
          },
          {
            icon: 'Globe',
            title: "Pan-European: On-site or Online",
            description: "Flexible service across Europe. On-site lessons at your location or completely online. You choose"
          }
        ]
      },
      differentiators: {
        title: "Why Replace Your Current Provider?",
        subtitle: "VocalFitness vs. Standard Providers",
        points: [
          {
            title: "Real Academic Excellence",
            vf: "Patented method by Professor Steve Dapper, validated by Cambridge Assessment, MIUR, EF Education",
            others: "Generic methods without scientific validation or academic recognition"
          },
          {
            title: "Articulatory Phonetics",
            vf: "Proprietary muscle conditioning module for native pronunciation. For ALL employees",
            others: "Zero focus on pronunciation. Result: years of study but heavy accent unchanged"
          },
          {
            title: "Teacher Quality",
            vf: "Only CELTA/DELTA certified + VocalFitness training. Verified academic background",
            others: "Generic teachers, often without international certifications or corporate experience"
          },
          {
            title: "Completion Rate",
            vf: "92% of employees complete the course. Engagement kept high",
            others: "20% average completion rate. Wasted budget, frustrated employees"
          },
          {
            title: "Measurable Results",
            vf: "CEFR assessment pre/post course. Average improvement of 1.5 levels in 12 weeks",
            others: "No clear metrics. Impossible to demonstrate ROI to management"
          }
        ]
      },
      levels: {
        title: "For All Corporate Levels",
        subtitle: "From entry-level to C-suite, all with VocalFitness method included",
        tiers: [
          {
            level: "Entry-Level",
            icon: "Users",
            title: "Building Confidence",
            description: "Reception, assistants, operations",
            skills: ["Fluent phone communication", "Correct professional emails", "Clear and understandable pronunciation", "Essential business vocabulary"]
          },
          {
            level: "Middle Management",
            icon: "Target",
            title: "Professional Communication",
            description: "Team leaders, managers, coordinators",
            skills: ["Effective presentations", "Meetings in English without hesitation", "Negotiation and persuasion", "Professional report writing"]
          },
          {
            level: "Senior Leadership",
            icon: "Award",
            title: "Executive Presence",
            description: "Director, VP, C-level",
            skills: ["Command presence with native pronunciation", "International public speaking", "Strategic communication", "Global C-suite networking"]
          }
        ]
      },
      packages: {
        title: "Tailored Solutions",
        subtitle: "From SME to Large Corporate",
        note: "All packages include the VocalFitness proprietary articulatory phonetics module",
        options: [
          {
            name: "STARTER",
            target: "SME (10-50 employees)",
            features: [
              "20 hours of course per employee",
              "4 skills + VocalFitness module",
              "Online or on-site mode",
              "Final CEFR certification",
              "Teaching materials included",
              "Free initial assessment"
            ],
            cta: "Request Quote"
          },
          {
            name: "PROFESSIONAL",
            target: "Medium Enterprises (50-200 employees)",
            features: [
              "40 hours + advanced pronunciation module",
              "Blended: online + in person",
              "Progress dashboard for HR",
              "Customized schedule",
              "Dedicated support",
              "Quarterly management reports"
            ],
            cta: "Request Quote",
            highlight: true
          },
          {
            name: "ENTERPRISE",
            target: "Corporate (200+ employees)",
            features: [
              "Customized hours based on needs",
              "Dedicated Account Manager",
              "Multi-site coordination",
              "LMS integration",
              "Guaranteed SLAs",
              "Advanced ROI reporting"
            ],
            cta: "Request Quote"
          }
        ]
      },
      fringeBenefit: {
        title: "Corporate Welfare That Makes a Difference",
        subtitle: "More than a simple fringe benefit: a strategic investment",
        benefits: [
          {
            title: "Retention & Engagement",
            description: "Employees who perceive real investment in their growth stay longer and are more motivated"
          },
          {
            title: "100% Tax Deductible",
            description: "Corporate training fully deductible. Compliant with Italian welfare regulations"
          },
          {
            title: "Competitive Advantage",
            description: "Team that communicates fluently in English = access to international markets and global clients"
          },
          {
            title: "Employer Branding",
            description: "Attract better talent by offering executive-level training to all employees"
          }
        ]
      },
      trust: {
        title: "Recognized by Leading Institutions",
        certifications: [
          "Cambridge Assessment English Partner",
          "MIUR Validated Methodology",
          "EF Education First Integrated",
          "CEFR Aligned & Certified",
          "GDPR & ISO Compliant"
        ]
      },
      cta: {
        title: "Ready to Replace Your Current Provider?",
        subtitle: "Request a personalized quote with no obligation. We'll show you how VocalFitness can transform your English training from cost to strategic investment.",
        button: "Request Free Quote",
        features: [
          "Free assessment of company needs",
          "VocalFitness method demo for your team",
          "Personalized quote within 48h",
          "Zero commitment, zero hidden costs"
        ]
      }
    }
  };

  const text = content[language] || content.en;

  const getIcon = (iconName) => {
    const icons = {
      Award: Award,
      Users: Users,
      Target: Target,
      Globe: Globe
    };
    return icons[iconName] || Award;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full px-6 py-3 mb-8">
            <Building2 size={18} className="text-blue-400" />
            <span className="text-slate-300 font-medium">{text.hero.badge}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-white">{text.hero.title}</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              {text.hero.titleHighlight}
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-4xl">
            {text.hero.subtitle}
          </p>

          <Button 
            onClick={() => setIsQuoteFormOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-10 py-6 text-lg rounded-xl group"
          >
            {text.hero.cta}
            <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">{text.problem.title}</h2>
          <p className="text-xl text-slate-400 mb-12 text-center">{text.problem.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {text.problem.points.map((point, index) => (
              <div key={index} className="bg-slate-800/50 backdrop-blur-md border border-red-900/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-red-400 mb-3">{point.title}</h3>
                <p className="text-slate-300 leading-relaxed">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">{text.solution.title}</h2>
          <p className="text-xl text-slate-400 mb-6 text-center">{text.solution.subtitle}</p>
          <p className="text-lg text-slate-300 mb-12 text-center max-w-4xl mx-auto leading-relaxed">
            {text.solution.description}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {text.solution.features.map((feature, index) => {
              const Icon = getIcon(feature.icon);
              return (
                <div key={index} className="bg-slate-800/30 backdrop-blur-md border border-green-900/30 rounded-2xl p-6 hover:border-green-500/50 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl flex items-center justify-center border border-green-500/30 text-green-400 mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">{text.differentiators.title}</h2>
          <p className="text-xl text-slate-400 mb-12 text-center">{text.differentiators.subtitle}</p>

          <div className="space-y-6">
            {text.differentiators.points.map((point, index) => (
              <div key={index} className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-blue-400 mb-4">{point.title}</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={20} className="text-green-400" />
                      <span className="font-semibold text-green-400">VocalFitness</span>
                    </div>
                    <p className="text-slate-300">{point.vf}</p>
                  </div>
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-red-400">Altri Fornitori</span>
                    </div>
                    <p className="text-slate-300">{point.others}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Levels Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">{text.levels.title}</h2>
          <p className="text-xl text-slate-400 mb-12 text-center">{text.levels.subtitle}</p>

          <div className="grid md:grid-cols-3 gap-6">
            {text.levels.tiers.map((tier, index) => {
              const Icon = getIcon(tier.icon);
              return (
                <div key={index} className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 text-blue-400 mb-4">
                    <Icon size={24} />
                  </div>
                  <div className="text-sm text-blue-400 font-semibold mb-2">{tier.level}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{tier.title}</h3>
                  <p className="text-slate-400 text-sm mb-4">{tier.description}</p>
                  <ul className="space-y-2">
                    {tier.skills.map((skill, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                        <CheckCircle size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">{text.packages.title}</h2>
          <p className="text-xl text-slate-400 mb-2 text-center">{text.packages.subtitle}</p>
          <p className="text-sm text-green-400 mb-12 text-center italic">{text.packages.note}</p>

          <div className="grid md:grid-cols-3 gap-6">
            {text.packages.options.map((pkg, index) => (
              <div key={index} className={`bg-slate-800/30 backdrop-blur-md border rounded-2xl p-6 ${pkg.highlight ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700/50'}`}>
                {pkg.highlight && (
                  <div className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                    <Star size={14} />
                    <span>Più Popolare</span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{pkg.target}</p>
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300">
                      <CheckCircle size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => setIsQuoteFormOpen(true)}
                  className={`w-full ${pkg.highlight ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' : 'bg-slate-700 hover:bg-slate-600'} text-white font-semibold py-3 rounded-xl`}
                >
                  {pkg.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fringe Benefit */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">{text.fringeBenefit.title}</h2>
          <p className="text-xl text-slate-400 mb-12 text-center">{text.fringeBenefit.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {text.fringeBenefit.benefits.map((benefit, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-slate-300 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">{text.trust.title}</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {text.trust.certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl px-6 py-4">
                <Shield size={20} className="text-blue-400" />
                <span className="text-slate-300 font-medium">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 backdrop-blur-md border border-blue-500/30 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {text.cta.title}
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              {text.cta.subtitle}
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-3xl mx-auto">
              {text.cta.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-left bg-slate-800/50 rounded-lg p-3">
                  <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-slate-200">{feature}</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => setIsQuoteFormOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-10 py-6 text-lg rounded-xl group"
            >
              {text.cta.button}
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      
      {/* Quote Form Modal */}
      <CorporateQuoteForm 
        isOpen={isQuoteFormOpen} 
        onClose={() => setIsQuoteFormOpen(false)} 
      />
    </div>
  );
};

export default CorporateTrainingPage;
