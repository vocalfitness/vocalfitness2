import React from 'react';
import { Building2, ArrowRight, CheckCircle, Users, Award, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const CorporateSolutionsSection = () => {
  const { language } = useLanguage();

  const content = {
    it: {
      badge: "Per Aziende",
      title: "VocalFitness Corporate Solutions",
      subtitle: "L'eccellenza del metodo VocalFitness per tutti i dipendenti della tua azienda",
      description: "L'unico fornitore che include il Metodo VocalFitness di Fonetica Articolatoria Proprietaria - normalmente riservato ai Fortune 500 executives - per TUTTI i livelli aziendali. Trasforma il training English da fringe benefit standard a vantaggio competitivo reale.",
      features: [
        {
          icon: Award,
          title: "Metodo Proprietario Incluso",
          description: "Il modulo VocalFitness di condizionamento muscolare per tutti i dipendenti, non solo per il top management"
        },
        {
          icon: Users,
          title: "Rete Insegnanti Certificati",
          description: "Solo docenti con certificazioni CELTA/DELTA + formazione VocalFitness. Zero improvvisazione"
        },
        {
          icon: Globe,
          title: "Pan-Europeo: In Sede o Online",
          description: "Servizio flessibile in tutta Europa. Lezioni in presenza o completamente online"
        }
      ],
      stats: [
        { label: "Completion Rate", value: "92%" },
        { label: "Livelli CEFR Miglioramento", value: "+1.5" },
        { label: "Settimane Corso Standard", value: "12" }
      ],
      differentiator: {
        title: "Perché Sostituire il Vostro Fornitore Attuale?",
        points: [
          "Eccellenza Accademica Reale vs. metodi generici",
          "Fonetica Articolatoria per tutti vs. zero focus pronuncia",
          "92% completion rate vs. 20% media settore",
          "Risultati CEFR misurabili vs. nessuna metrica"
        ]
      },
      cta: {
        primary: "Richiedi Preventivo Gratuito",
        secondary: "Scopri di Più"
      }
    },
    en: {
      badge: "For Companies",
      title: "VocalFitness Corporate Solutions",
      subtitle: "The excellence of the VocalFitness method for all your company's employees",
      description: "The only provider that includes the VocalFitness Proprietary Articulatory Phonetics Method - normally reserved for Fortune 500 executives - for ALL corporate levels. Transform English training from standard fringe benefit to real competitive advantage.",
      features: [
        {
          icon: Award,
          title: "Proprietary Method Included",
          description: "The VocalFitness muscle conditioning module for all employees, not just top management"
        },
        {
          icon: Users,
          title: "Certified Teacher Network",
          description: "Only teachers with CELTA/DELTA certifications + VocalFitness training. Zero improvisation"
        },
        {
          icon: Globe,
          title: "Pan-European: On-site or Online",
          description: "Flexible service across Europe. On-site lessons or completely online"
        }
      ],
      stats: [
        { label: "Completion Rate", value: "92%" },
        { label: "CEFR Levels Improvement", value: "+1.5" },
        { label: "Standard Course Weeks", value: "12" }
      ],
      differentiator: {
        title: "Why Replace Your Current Provider?",
        points: [
          "Real Academic Excellence vs. generic methods",
          "Articulatory Phonetics for all vs. zero pronunciation focus",
          "92% completion rate vs. 20% industry average",
          "Measurable CEFR results vs. no metrics"
        ]
      },
      cta: {
        primary: "Request Free Quote",
        secondary: "Learn More"
      }
    }
  };

  const text = content[language] || content.en;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-6 py-3 mb-6">
          <Building2 size={18} className="text-blue-400" />
          <span className="text-blue-300 font-semibold">{text.badge}</span>
        </div>

        {/* Title */}
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="text-white">{text.title.split('Corporate')[0]}</span>
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Corporate Solutions</span>
        </h2>
        
        <p className="text-xl text-slate-300 mb-3 max-w-3xl">{text.subtitle}</p>
        <p className="text-lg text-slate-400 mb-12 max-w-4xl leading-relaxed">{text.description}</p>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {text.features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 text-blue-400 mb-4">
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 backdrop-blur-md border border-blue-500/30 rounded-2xl p-8 mb-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {text.stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Differentiator */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-white mb-6">{text.differentiator.title}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {text.differentiator.points.map((point, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/corporate-training">
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-6 text-lg rounded-xl group">
              {text.cta.primary}
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </a>
          <a href="/corporate-training">
            <Button 
              variant="outline" 
              className="border-2 border-blue-600 bg-blue-600/10 hover:bg-blue-600/20 text-white font-semibold px-8 py-6 text-lg rounded-xl"
            >
              {text.cta.secondary}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default CorporateSolutionsSection;
