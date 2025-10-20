import React from 'react';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { language } = useLanguage();

  const content = {
    it: {
      description: "Il metodo proprietario brevettato che trasforma la comunicazione globale attraverso la scienza della fonologia articolatoria ESOL, della prosodia e del condizionamento muscolare vocale.",
      whatsappSupport: "(solo WhatsApp support)",
      location: "Chur, Svizzera",
      quickLinks: {
        title: "Link Rapidi",
        links: [
          { label: 'Home', href: '#' },
          { label: 'Il Metodo', href: '#metodo' },
          { label: 'Professor Dapper', href: '#professor' },
          { label: 'Risultati', href: '#risultati' },
          { label: 'DappersClass', href: '#dappersclass' },
          { label: 'Testimonial', href: '#testimonial' },
          { label: 'Risorse', href: '/risorse' }
        ]
      },
      services: {
        title: "Servizi",
        list: [
          'Valutazione Diagnostica',
          'Training Personalizzato',
          'Sessioni Virtuali',
          'Programmi Aziendali',
          'Coaching Individuale'
        ]
      },
      recognitions: "Riconoscimenti Ufficiali",
      featuredIn: "Featured in App Globali",
      reach: "Raggiunge milioni di studenti in tutto il mondo",
      copyright: "VocalFitness™ - Metodo proprietario brevettato. Tutti i diritti riservati. Prof. Steve Dapper.",
      legal: {
        privacy: 'Privacy Policy',
        terms: 'Termini di Servizio',
        cookies: 'Cookie Policy'
      },
      disclaimer: "Il successo individuale può variare in base a impegno, pratica e fattori linguistici baseline. Le testimonianze riflettono esperienze autentiche di clienti reali. VocalFitness è un marchio registrato."
    },
    en: {
      description: "The proprietary patented method that transforms global communication through the science of ESOL articulatory phonetics, prosody, and vocal muscle conditioning.",
      whatsappSupport: "(WhatsApp support only)",
      location: "Chur, Switzerland",
      quickLinks: {
        title: "Quick Links",
        links: [
          { label: 'Home', href: '#' },
          { label: 'Method', href: '#metodo' },
          { label: 'Professor Dapper', href: '#professor' },
          { label: 'Results', href: '#risultati' },
          { label: 'DappersClass', href: '#dappersclass' },
          { label: 'Testimonials', href: '#testimonial' },
          { label: 'Resources', href: '/risorse' }
        ]
      },
      services: {
        title: "Services",
        list: [
          'Diagnostic Assessment',
          'Personalized Training',
          'Virtual Sessions',
          'Corporate Programs',
          'Individual Coaching'
        ]
      },
      recognitions: "Official Recognitions",
      featuredIn: "Featured in Global Apps",
      reach: "Reaches millions of students worldwide",
      copyright: "VocalFitness™ - Proprietary patented method. All rights reserved. Prof. Steve Dapper.",
      legal: {
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        cookies: 'Cookie Policy'
      },
      disclaimer: "Individual success may vary based on commitment, practice, and baseline linguistic factors. Testimonials reflect authentic experiences of real clients. VocalFitness is a registered trademark."
    }
  };

  const text = content[language] || content.en;

  return (
    <footer className="bg-slate-950 border-t border-slate-800/50 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main footer content */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mb-12">
          
          {/* Brand section */}
          <div className="lg:col-span-2">
            <a href="#" className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4 inline-block hover:scale-105 transition-transform duration-300 cursor-pointer">
              VocalFitness
            </a>
            <p className="text-slate-400 leading-relaxed mb-6 max-w-md">
              {text.description}
            </p>
            
            {/* Contact info */}
            <div className="space-y-3">
              <a href="mailto:admissions@vocalfitness.org" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors duration-300 group">
                <Mail size={16} className="text-blue-400 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm">admissions@vocalfitness.org</span>
              </a>
              <a href="https://wa.me/393515765749" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors duration-300 group">
                <Phone size={16} className="text-cyan-400 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm">+39 351 576 5749 <span className="text-xs text-slate-500">{text.whatsappSupport}</span></span>
              </a>
              <div className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors duration-300 group">
                <MapPin size={16} className="text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm">{text.location}</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{text.quickLinks.title}</h4>
            <ul className="space-y-3">
              {text.quickLinks.links.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors duration-300 text-sm flex items-center gap-2 group"
                  >
                    <div className="w-1 h-1 bg-slate-600 rounded-full group-hover:bg-blue-400 group-hover:scale-150 transition-all duration-300"></div>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-4">{text.services.title}</h4>
            <ul className="space-y-3">
              {text.services.list.map((service) => (
                <li key={service}>
                  <div className="text-slate-400 hover:text-white transition-colors duration-300 text-sm flex items-center gap-2 group cursor-pointer">
                    <div className="w-1 h-1 bg-slate-600 rounded-full group-hover:bg-cyan-400 group-hover:scale-150 transition-all duration-300"></div>
                    {service}
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Credentials and partnerships */}
        <div className="border-t border-slate-800/50 pt-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Certifications */}
            <div>
              <h4 className="text-white font-semibold mb-4">{text.recognitions}</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'EF Education First',
                  'E-Campus University',
                  'MIUR, MUR, DIESSE',
                  'Università di Torino LSFAG'
                ].map((cert) => (
                  <div key={cert} className="bg-slate-800/30 rounded-lg p-3 text-center hover:bg-slate-800/50 transition-all duration-300 group">
                    <div className="text-xs text-slate-400 group-hover:text-slate-300">{cert}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* App integrations */}
            <div>
              <h4 className="text-white font-semibold mb-4">{text.featuredIn}</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  'EWA',
                  'Elsa Speak', 
                  'LingoPanda'
                ].map((app) => (
                  <div key={app} className="bg-slate-800/30 rounded-lg p-3 text-center hover:bg-slate-800/50 transition-all duration-300 group">
                    <div className="text-xs text-slate-400 group-hover:text-slate-300 flex items-center justify-center gap-1">
                      {app}
                      <ExternalLink size={12} className="group-hover:scale-110 transition-transform duration-200" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {text.reach}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Copyright */}
          <div className="text-slate-500 text-sm">
            © {currentYear} {text.copyright}
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-300">
              {text.legal.privacy}
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-300">
              {text.legal.terms}
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-300">
              {text.legal.cookies}
            </a>
          </div>

        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-slate-900/30 rounded-lg p-4">
          <p className="text-xs text-slate-500 leading-relaxed text-center">
            {text.disclaimer}
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
