import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Download, BookOpen, Volume2, Brain, Target, CheckCircle, ArrowRight, FileText, Sparkles } from 'lucide-react';

const ResourcesPage = () => {
  const { language } = useLanguage();
  const [openSections, setOpenSections] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleSection = (id) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const content = {
    it: {
      hero: {
        badge: "Risorse Didattiche VocalFitness",
        title: "La Scienza della",
        titleHighlight: "Padronanza Fonetica",
        subtitle: "Accedi a risorse complete che spiegano il metodo VocalFitness: un approccio rivoluzionario all'apprendimento della fonetica inglese basato su principi neurolinguistici e condizionamento muscolare.",
        cta: "Scarica Syllabus Completo"
      },
      intro: {
        title: "Il Metodo VocalFitness",
        description: "VocalFitness è un metodo proprietario di condizionamento muscolare per raggiungere la fluenza semi-nativa dell'inglese parlato. Analizza il parlato come esperienza fisica, cognitiva e primariamente motoria, andando oltre i tradizionali approcci linguistici."
      },
      sections: [
        {
          id: 'segmental',
          icon: 'Volume2',
          title: 'Fonetica Segmentale',
          description: 'I 44 fonemi dell\'inglese: monoftonghe, dittonghi e consonanti',
          content: {
            intro: 'La fonetica segmentale studia i singoli suoni (fonemi) della lingua inglese. Il metodo VocalFitness analizza in dettaglio l\'articolazione di ogni fonema.',
            subsections: [
              {
                title: 'Le 12 Monoftonghe dell\'Inglese',
                items: [
                  'Analisi articolatoria delle vocali nella cavità orale',
                  'Esercizi di fonazione e condizionamento muscolare',
                  'Respirazione diaframmatica applicata',
                  'Esercizi di articolazione meccanica (velo, epiglottide)'
                ]
              },
              {
                title: 'Dittonghi',
                items: [
                  'Introduzione ai dittonghi inglesi',
                  'Transizioni vocaliche e movimento articolatorio',
                  'Esercizi di respirazione diaframmatica 1:1',
                  'Pratica di articolazione dinamica'
                ]
              },
              {
                title: 'Consonanti: Luogo e Modo di Articolazione',
                items: [
                  'Consonanti epiglottali, velari e faringeali',
                  'Consonanti palatali e alveolari',
                  'Consonanti dentali, labiodentali e labiali',
                  'Sonorità (+/-) e coppie minime',
                  'Esercizi di trascrizione fonetica IPA'
                ]
              }
            ]
          }
        },
        {
          id: 'suprasegmental',
          icon: 'Brain',
          title: 'Suprasegmentali e Prosodia',
          description: 'Stress, ritmo, tono e processi di assimilazione',
          content: {
            intro: 'I suprasegmentali riguardano gli aspetti prosodici che si estendono oltre i singoli fonemi: ritmo, intonazione, stress e processi fonetici in contesto.',
            subsections: [
              {
                title: 'Stress ed Enfasi',
                items: [
                  'Concetto di enfasi nella lingua inglese',
                  'Differenza tra accento e enfasi',
                  'Identificazione dei cluster sillabici',
                  'Esercizi di articolazione meccanica e fonazione',
                  'Respirazione diaframmatica e risonatori'
                ]
              },
              {
                title: 'Metrica, Tempo e Ritmo',
                items: [
                  'Principi della metrica nella lingua inglese',
                  'Tempo (beat) nel ritmo germanico vs. neolatino',
                  'Pause e dinamica del parlato',
                  'Valore musicale dei grafemi',
                  'Energia cinetica sulle sillabe accentate',
                  'Esercizi di lettura espressiva'
                ]
              },
              {
                title: 'Tono, Tonalità e Timbro',
                items: [
                  'Principi di acustica applicati alla voce',
                  'Identificazione della soglia uditiva',
                  'Frequenza e inviluppo acustico delle onde sinusoidali',
                  'Notazione musicale applicata al parlato',
                  'Pitch vocale, tonalità e tonicità',
                  'Registro vocale e range',
                  'Esercizi di laringe bassa e velo alto',
                  'Risonanza (petto, bocca, naso, testa)'
                ]
              },
              {
                title: 'Processi di Assimilazione',
                items: [
                  'Assimilazione progressiva (modo, luogo, sonorità)',
                  'Assimilazione regressiva',
                  'Assimilazione coalescente',
                  'Esempi nell\'uso comune dell\'inglese',
                  'Esercizi scritti e orali',
                  'Lettura creativa'
                ]
              }
            ]
          }
        },
        {
          id: 'materials',
          icon: 'FileText',
          title: 'Materiali Didattici',
          description: 'Guide, esercizi e risorse scaricabili',
          content: {
            intro: 'Accedi a materiali didattici completi per supportare il tuo percorso di apprendimento con il metodo VocalFitness.',
            subsections: [
              {
                title: 'Syllabus Completo del Corso',
                items: [
                  '14 lezioni strutturate (webinar di 1 ora ciascuno)',
                  'Programma allineato al CEFR (A1-C2)',
                  'Obiettivi di apprendimento dettagliati',
                  'Metodologia passo-passo'
                ]
              },
              {
                title: 'Esercizi Pratici',
                items: [
                  'Esercizi di respirazione diaframmatica',
                  'Warm-up vocale e articolatorio',
                  'Esercizi di respirazione polmonare e intrapettorale',
                  'Trascrizione fonetica IPA',
                  'Lettura espressiva e creativa'
                ]
              },
              {
                title: 'Riferimenti CEFR',
                items: [
                  'Identificazione degli strumenti didattici europei',
                  'Allineamento con gli standard CEFR',
                  'Valutazione dei livelli di competenza',
                  'Progressione strutturata A1-C2'
                ]
              }
            ]
          }
        },
        {
          id: 'method',
          icon: 'Target',
          title: 'Il Metodo Vocal Fitness',
          description: 'La scienza dietro l\'approccio rivoluzionario',
          content: {
            intro: 'Il metodo VocalFitness si basa su una comprensione profonda della produzione del suono come processo neuromuscolare, integrando tre discipline fondamentali della fonetica.',
            subsections: [
              {
                title: 'I Tre Rami della Fonetica',
                items: [
                  'Fonetica Acustica: studio delle proprietà fisiche del suono',
                  'Fonetica Uditiva: percezione e processamento cognitivo',
                  'Fonetica Articolatoria: produzione fisica dei suoni',
                  'Integrazione dei tre approcci nel metodo VocalFitness'
                ]
              },
              {
                title: 'L\'Approccio Motorio alla Lingua',
                items: [
                  'Il parlato come esperienza primariamente motoria',
                  'Condizionamento neuromuscolare per l\'acquisizione permanente',
                  'Differenze tra lingue germaniche e neolatine',
                  'Enfasi sui fonemi "lax" (tempo, frequenza, tono)',
                  'Ricablaggio dell\'architettura fonologica fondamentale'
                ]
              },
              {
                title: 'Meccanismi di Fonazione',
                items: [
                  'Acustica della voce umana: italiano vs. inglese',
                  'Respirazione diaframmatica e supporto respiratorio',
                  'Controllo della risonanza vocale',
                  'Contrazione vocale e registri',
                  'Approccio basato sul condizionamento muscolare'
                ]
              },
              {
                title: 'Perché Funziona',
                items: [
                  'Cambiamenti a livello neuromuscolare che diventano automatici',
                  'Risultati permanenti vs. guadagni temporanei',
                  'Superamento dei limiti dei metodi tradizionali',
                  'Approccio scientifico basato su evidenze',
                  'Competenza comunicativa duratura'
                ]
              }
            ]
          }
        }
      ],
      cta: {
        title: "Pronto a Trasformare la Tua Pronuncia Inglese?",
        subtitle: "Il metodo VocalFitness offre un percorso strutturato verso la padronanza fonetica. Prenota una valutazione diagnostica gratuita con il Professor Steve Dapper.",
        button: "Prenota Valutazione Gratuita",
        features: [
          "Valutazione articolatoria completa",
          "Piano di apprendimento personalizzato",
          "Metodo scientificamente provato",
          "Risultati permanenti garantiti"
        ]
      }
    },
    en: {
      hero: {
        badge: "VocalFitness Educational Resources",
        title: "The Science of",
        titleHighlight: "Phonetic Mastery",
        subtitle: "Access comprehensive resources explaining the VocalFitness method: a revolutionary approach to English phonetics learning based on neurolinguistic principles and muscular conditioning.",
        cta: "Download Complete Syllabus"
      },
      intro: {
        title: "The VocalFitness Method",
        description: "VocalFitness is a proprietary muscular conditioning method for achieving semi-native spoken English fluency. It analyzes speech as a physical, cognitive, and primarily motor experience, going beyond traditional linguistic approaches."
      },
      sections: [
        {
          id: 'segmental',
          icon: 'Volume2',
          title: 'Segmental Phonetics',
          description: 'The 44 phonemes of English: monophthongs, diphthongs, and consonants',
          content: {
            intro: 'Segmental phonetics studies individual sounds (phonemes) of the English language. The VocalFitness method analyzes in detail the articulation of each phoneme.',
            subsections: [
              {
                title: 'The 12 English Monophthongs',
                items: [
                  'Articulatory analysis of vowels in the oral cavity',
                  'Phonation and muscular conditioning exercises',
                  'Applied diaphragmatic breathing',
                  'Mechanical articulation exercises (velum, epiglottis)'
                ]
              },
              {
                title: 'Diphthongs',
                items: [
                  'Introduction to English diphthongs',
                  'Vocalic transitions and articulatory movement',
                  '1:1 diaphragmatic breathing exercises',
                  'Dynamic articulation practice'
                ]
              },
              {
                title: 'Consonants: Place and Manner of Articulation',
                items: [
                  'Epiglottal, velar, and pharyngeal consonants',
                  'Palatal and alveolar consonants',
                  'Dental, labiodental, and labial consonants',
                  'Voicing (+/-) and minimal pairs',
                  'IPA phonetic transcription exercises'
                ]
              }
            ]
          }
        },
        {
          id: 'suprasegmental',
          icon: 'Brain',
          title: 'Suprasegmentals and Prosody',
          description: 'Stress, rhythm, tone, and assimilation processes',
          content: {
            intro: 'Suprasegmentals concern prosodic aspects that extend beyond individual phonemes: rhythm, intonation, stress, and phonetic processes in context.',
            subsections: [
              {
                title: 'Stress and Emphasis',
                items: [
                  'Concept of emphasis in English',
                  'Difference between accent and emphasis',
                  'Identification of syllabic clusters',
                  'Mechanical articulation and phonation exercises',
                  'Diaphragmatic breathing and resonators'
                ]
              },
              {
                title: 'Metrics, Tempo, and Rhythm',
                items: [
                  'Principles of metrics in English',
                  'Tempo (beat) in Germanic vs. Romance rhythm',
                  'Pauses and speech dynamics',
                  'Musical value of graphemes',
                  'Kinetic energy on stressed syllables',
                  'Expressive reading exercises'
                ]
              },
              {
                title: 'Tone, Tonality, and Timbre',
                items: [
                  'Acoustic principles applied to voice',
                  'Identification of hearing threshold',
                  'Frequency and acoustic envelope of sinusoidal waves',
                  'Musical notation applied to speech',
                  'Vocal pitch, tonality, and tonicity',
                  'Vocal register and range',
                  'Low larynx and high velum exercises',
                  'Resonance (chest, mouth, nose, head)'
                ]
              },
              {
                title: 'Assimilation Processes',
                items: [
                  'Progressive assimilation (manner, place, voicing)',
                  'Regressive assimilation',
                  'Coalescent assimilation',
                  'Examples in common English usage',
                  'Written and oral exercises',
                  'Creative reading'
                ]
              }
            ]
          }
        },
        {
          id: 'materials',
          icon: 'FileText',
          title: 'Educational Materials',
          description: 'Guides, exercises, and downloadable resources',
          content: {
            intro: 'Access comprehensive educational materials to support your learning journey with the VocalFitness method.',
            subsections: [
              {
                title: 'Complete Course Syllabus',
                items: [
                  '14 structured lessons (1-hour webinars each)',
                  'CEFR-aligned program (A1-C2)',
                  'Detailed learning objectives',
                  'Step-by-step methodology'
                ]
              },
              {
                title: 'Practical Exercises',
                items: [
                  'Diaphragmatic breathing exercises',
                  'Vocal and articulatory warm-ups',
                  'Pulmonic and intrachest breathing exercises',
                  'IPA phonetic transcription',
                  'Expressive and creative reading'
                ]
              },
              {
                title: 'CEFR References',
                items: [
                  'Identification of European teaching tools',
                  'CEFR standards alignment',
                  'Competence level assessment',
                  'Structured A1-C2 progression'
                ]
              }
            ]
          }
        },
        {
          id: 'method',
          icon: 'Target',
          title: 'The VocalFitness Method',
          description: 'The science behind the revolutionary approach',
          content: {
            intro: 'The VocalFitness method is based on a deep understanding of sound production as a neuromuscular process, integrating three fundamental disciplines of phonetics.',
            subsections: [
              {
                title: 'The Three Branches of Phonetics',
                items: [
                  'Acoustic Phonetics: study of physical properties of sound',
                  'Auditory Phonetics: perception and cognitive processing',
                  'Articulatory Phonetics: physical production of sounds',
                  'Integration of all three approaches in VocalFitness'
                ]
              },
              {
                title: 'The Motor Approach to Language',
                items: [
                  'Speech as a primarily motor experience',
                  'Neuromuscular conditioning for permanent acquisition',
                  'Differences between Germanic and Romance languages',
                  'Emphasis on "lax" phonemes (time, frequency, tone)',
                  'Rewiring fundamental phonological architecture'
                ]
              },
              {
                title: 'Phonation Mechanisms',
                items: [
                  'Acoustics of human voice: Italian vs. English',
                  'Diaphragmatic breathing and respiratory support',
                  'Vocal resonance control',
                  'Vocal contraction and registers',
                  'Muscular conditioning-based approach'
                ]
              },
              {
                title: 'Why It Works',
                items: [
                  'Neuromuscular-level changes that become automatic',
                  'Permanent results vs. temporary gains',
                  'Overcoming limitations of traditional methods',
                  'Evidence-based scientific approach',
                  'Lasting communicative competence'
                ]
              }
            ]
          }
        }
      ],
      cta: {
        title: "Ready to Transform Your English Pronunciation?",
        subtitle: "The VocalFitness method offers a structured path to phonetic mastery. Book a free diagnostic assessment with Professor Steve Dapper.",
        button: "Book Free Assessment",
        features: [
          "Complete articulatory assessment",
          "Personalized learning plan",
          "Scientifically proven method",
          "Guaranteed permanent results"
        ]
      }
    }
  };

  const text = content[language] || content.en;

  const getIcon = (iconName) => {
    const icons = {
      Volume2: Volume2,
      Brain: Brain,
      FileText: FileText,
      Target: Target
    };
    const Icon = icons[iconName] || BookOpen;
    return <Icon size={24} />;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full px-6 py-3 mb-8">
            <Sparkles size={18} className="text-blue-400" />
            <span className="text-slate-300 font-medium">{text.hero.badge}</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-white">{text.hero.title}</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              {text.hero.titleHighlight}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-3xl">
            {text.hero.subtitle}
          </p>

          {/* Download CTA */}
          <a href="/vocal_fitness_syllabus.pdf" download>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-6 text-lg rounded-xl group">
              <Download size={20} className="mr-2 group-hover:animate-bounce" />
              {text.hero.cta}
            </Button>
          </a>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <BookOpen className="text-blue-400" size={28} />
              {text.intro.title}
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              {text.intro.description}
            </p>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {text.sections.map((section) => (
            <div 
              key={section.id}
              className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/50"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 text-blue-400">
                    {getIcon(section.icon)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{section.title}</h3>
                    <p className="text-slate-400 text-sm">{section.description}</p>
                  </div>
                </div>
                <ArrowRight 
                  size={24} 
                  className={`text-slate-400 transition-transform duration-300 ${
                    openSections.includes(section.id) ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Section Content */}
              <div 
                className={`overflow-hidden transition-all duration-500 ${
                  openSections.includes(section.id) ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-6 pt-0 border-t border-slate-700/30">
                  <p className="text-slate-300 mb-6 leading-relaxed">
                    {section.content.intro}
                  </p>

                  <div className="space-y-6">
                    {section.content.subsections.map((subsection, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-xl p-5">
                        <h4 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
                          <CheckCircle size={18} />
                          {subsection.title}
                        </h4>
                        <ul className="space-y-2">
                          {subsection.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="text-slate-300 flex items-start gap-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 backdrop-blur-md border border-blue-500/30 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {text.cta.title}
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              {text.cta.subtitle}
            </p>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
              {text.cta.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-left bg-slate-800/50 rounded-lg p-3">
                  <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-slate-200">{feature}</span>
                </div>
              ))}
            </div>

            <a href="/#dappersclass">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-10 py-6 text-lg rounded-xl group">
                {text.cta.button}
                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ResourcesPage;
