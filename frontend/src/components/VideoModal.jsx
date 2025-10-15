import React, { useState, useEffect } from 'react';
import { X, Play, Mail, User, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const VideoModal = ({ isOpen, onClose, videoUrl }) => {
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  // Extract YouTube video ID
  const getVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(videoUrl);

  // Show form after 30 seconds or when video ends
  useEffect(() => {
    if (isOpen && !showForm) {
      const timer = setTimeout(() => {
        setShowForm(true);
      }, 30000); // Show after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen, showForm]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setVideoWatched(false);
      setSubmitStatus(null);
      setFormData({ name: '', email: '' });
    }
  }, [isOpen]);

  const content = {
    it: {
      title: "Scopri il Metodo VocalFitness",
      subtitle: "Guarda come trasformiamo executive italiani in speaker internazionali d'élite",
      formTitle: "Interessato? Lasciaci i tuoi contatti",
      formSubtitle: "Ricevi materiale esclusivo e una consulenza gratuita",
      namePlaceholder: "Il tuo nome",
      emailPlaceholder: "La tua email",
      submit: "Ricevi Informazioni Gratuite",
      success: "Grazie! Ti contatteremo presto",
      successMessage: "Riceverai materiale esclusivo via email entro 24 ore.",
      error: "Errore nell'invio. Riprova.",
      watchFullVideo: "Guarda il video completo per scoprire tutti i dettagli"
    },
    en: {
      title: "Discover the VocalFitness Method",
      subtitle: "Watch how we transform Italian executives into elite international speakers",
      formTitle: "Interested? Leave Your Contact Details",
      formSubtitle: "Receive exclusive material and a free consultation",
      namePlaceholder: "Your name",
      emailPlaceholder: "Your email",
      submit: "Get Free Information",
      success: "Thank you! We'll contact you soon",
      successMessage: "You'll receive exclusive material via email within 24 hours.",
      error: "Error sending. Please try again.",
      watchFullVideo: "Watch the full video to discover all the details"
    }
  };

  const text = content[language] || content.en;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: '',
        message: `Video lead - ${language === 'it' ? 'Ha guardato il video del metodo' : 'Watched the method video'}`,
        discount: '',
        type: 'video_lead',
        language: language
      };

      const response = await axios.post(`${backendUrl}/api/contact`, payload);

      if (response.status === 201) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
        }, 5000);
      }
    } catch (error) {
      console.error('Error submitting video lead:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9998]" 
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
        <div 
          className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-6xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-colors duration-200 bg-slate-800/80 rounded-full p-2 hover:bg-slate-700"
          >
            <X size={24} />
          </button>

          {/* Header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Play size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{text.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{text.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            
            {/* Video Section - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="relative" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-xl"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="VocalFitness Method Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Video stats/info */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">10</div>
                  <div className="text-xs text-slate-400">{language === 'it' ? 'Sedute' : 'Sessions'}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400">5K+</div>
                  <div className="text-xs text-slate-400">{language === 'it' ? 'Executive' : 'Executives'}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">96%</div>
                  <div className="text-xs text-slate-400">{language === 'it' ? 'Successo' : 'Success'}</div>
                </div>
              </div>
            </div>

            {/* Form Section - Sidebar */}
            <div className="lg:col-span-1">
              <div className={`bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl p-6 border border-slate-600/30 transition-all duration-500 ${
                showForm || submitStatus === 'success' ? 'opacity-100' : 'opacity-60'
              }`}>
                
                {submitStatus === 'success' ? (
                  // Success state
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{text.success}</h3>
                    <p className="text-slate-300 text-sm">{text.successMessage}</p>
                  </div>
                ) : (
                  <>
                    {/* Form Header */}
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-white mb-2">{text.formTitle}</h3>
                      <p className="text-sm text-slate-400">{text.formSubtitle}</p>
                    </div>

                    {/* Encourage watching if not shown yet */}
                    {!showForm && (
                      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-300 text-sm text-center">
                          {text.watchFullVideo}
                        </p>
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <div className="relative">
                          <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={text.namePlaceholder}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                            required
                            disabled={!showForm}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="relative">
                          <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder={text.emailPlaceholder}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                            required
                            disabled={!showForm}
                          />
                        </div>
                      </div>

                      {submitStatus === 'error' && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                          <p className="text-red-400 text-sm">{text.error}</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting || !showForm}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin mr-2" />
                            {language === 'it' ? 'Invio...' : 'Sending...'}
                          </>
                        ) : (
                          text.submit
                        )}
                      </Button>
                    </form>

                    {/* Trust badges */}
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span>{language === 'it' ? 'Nessuno spam, solo contenuti di valore' : 'No spam, only valuable content'}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Additional CTAs */}
              {submitStatus !== 'success' && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                  >
                    {language === 'it' ? 'Mostra il form ora →' : 'Show form now →'}
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </>
  );
};

export default VideoModal;
