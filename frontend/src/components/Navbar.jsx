import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Menu, X, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import BookingFormModal from './BookingFormModal';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const { language, toggleLanguage, isItalian } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = isItalian ? [
    { label: 'Home', href: '#' },
    { label: 'Metodo', href: '#method' },
    { label: 'Professor', href: '#professor' },
    { label: 'Risultati', href: '#results' },
    { label: 'Aziende', href: '/corporate-training', isExternal: true },
    { label: 'DappersClass', href: '#dappersclass' },
    { label: 'Testimonial', href: '#testimonials' }
  ] : [
    { label: 'Home', href: '#' },
    { label: 'Method', href: '#method' },
    { label: 'Professor', href: '#professor' },
    { label: 'Results', href: '#results' },
    { label: 'Companies', href: '/corporate-training', isExternal: true },
    { label: 'DappersClass', href: '#dappersclass' },
    { label: 'Testimonials', href: '#testimonials' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled 
        ? 'bg-slate-900/95 backdrop-blur-md border-b border-slate-800/50' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 cursor-pointer inline-block">
              VocalFitness
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-slate-300 hover:text-white transition-colors duration-200 text-sm font-medium relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
                </a>
              ))}
            </div>
          </div>

          {/* Language Toggle & CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-slate-300 hover:text-white flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 hover:border-blue-500/50 transition-all duration-300"
            >
              <Globe size={16} />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </Button>
            
            <Button 
              onClick={() => setShowBookingForm(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
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
              className="text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800/50">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-slate-300 hover:text-white block px-3 py-2 text-base font-medium transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 space-y-3">
                {/* Mobile Language Toggle */}
                <Button
                  variant="ghost"
                  onClick={toggleLanguage}
                  className="w-full text-slate-300 hover:text-white flex items-center justify-center gap-2 border border-slate-600 hover:border-blue-500/50"
                >
                  <Globe size={16} />
                  <span>{language.toUpperCase()}</span>
                </Button>
                
                <Button 
                  onClick={() => {
                    setShowBookingForm(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium"
                >
                  {isItalian ? 'Prenota Valutazione Gratuita' : 'Book Free Assessment'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      <BookingFormModal 
        isOpen={showBookingForm} 
        onClose={() => setShowBookingForm(false)}
      />
    </nav>
  );
};

export default Navbar;