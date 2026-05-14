import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Menu, X, Globe, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import OnboardingWizard from './OnboardingWizard';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const { language, toggleLanguage, isItalian } = useLanguage();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = isItalian ? [
    { label: 'Home', href: '/' },
    { label: 'Metodo', href: '/#method' },
    { label: 'Processo', href: '/#process' },
    { label: 'Speak Right 101', href: '/speak-right-101' },
    { label: 'Risultati', href: '/#results' },
    { label: 'Testimonial', href: '/#testimonials' },
    { label: 'Professor', href: '/#professor' },
    { label: 'FAQ', href: '/#faq' }
  ] : [
    { label: 'Home', href: '/' },
    { label: 'Method', href: '/#method' },
    { label: 'Process', href: '/#process' },
    { label: 'Speak Right 101', href: '/speak-right-101' },
    { label: 'Results', href: '/#results' },
    { label: 'Testimonials', href: '/#testimonials' },
    { label: 'Professor', href: '/#professor' },
    { label: 'FAQ', href: '/#faq' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled
        ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm'
        : 'bg-white/80 backdrop-blur-md border-b border-slate-100/50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#" className="text-2xl font-black bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 cursor-pointer inline-block tracking-tight">
              VocalFitness
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-7">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-slate-700 hover:text-blue-700 transition-colors duration-200 text-sm font-semibold relative group tracking-wide whitespace-nowrap"
                  data-testid={`navbar-link-${item.label.toLowerCase()}`}
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-700 group-hover:w-full transition-all duration-300"></span>
                </a>
              ))}
            </div>
          </div>

          {/* Language Toggle & CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            {/* Members Area Link */}
            <a
              href={isAuthenticated ? "/area-clienti" : "/login"}
              className="text-slate-700 hover:text-blue-700 flex items-center gap-2 text-sm font-semibold transition-colors duration-200"
              data-testid="navbar-members-link"
            >
              <Lock size={14} />
              <span>{isAuthenticated ? (isItalian ? 'Area Clienti' : 'Members Area') : (isItalian ? 'Accedi' : 'Login')}</span>
            </a>

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-slate-700 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:border-blue-500 transition-all duration-300 font-semibold"
              data-testid="navbar-language-toggle"
            >
              <Globe size={16} />
              <span className="text-sm">{language.toUpperCase()}</span>
            </Button>

            <Button
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-5 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              data-testid="navbar-cta-button"
            >
              {isItalian ? 'Prenota Valutazione Gratuita' : 'Book Free Assessment'}
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-700 hover:text-blue-700 hover:bg-blue-50"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-slate-700 hover:text-blue-700 hover:bg-blue-50 block px-3 py-2 text-base font-semibold rounded-md transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 space-y-3">
                <a
                  href={isAuthenticated ? "/area-clienti" : "/login"}
                  className="w-full text-slate-700 hover:text-blue-700 flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Lock size={16} />
                  <span>{isAuthenticated ? (isItalian ? 'Area Clienti' : 'Members Area') : (isItalian ? 'Accedi' : 'Login')}</span>
                </a>

                <Button
                  variant="ghost"
                  onClick={toggleLanguage}
                  className="w-full text-slate-700 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-2 border border-slate-300 hover:border-blue-500 font-semibold"
                >
                  <Globe size={16} />
                  <span>{language.toUpperCase()}</span>
                </Button>

                <Button
                  onClick={() => {
                    setShowWizard(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                >
                  {isItalian ? 'Prenota Valutazione Gratuita' : 'Book Free Assessment'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <OnboardingWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />
    </nav>
  );
};

export default Navbar;
