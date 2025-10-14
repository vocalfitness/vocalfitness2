import React, { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const ContactFormModal = ({ isOpen, onClose, discount = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const { language } = useLanguage();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      
      const payload = {
        ...formData,
        discount: discount,
        language: language
      };

      const response = await axios.post(`${backendUrl}/api/contact`, payload);

      if (response.status === 201) {
        setSubmitStatus('success');
        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({ name: '', email: '', phone: '', message: '' });
          onClose();
          setSubmitStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const content = {
    it: {
      title: discount ? `Richiedi ${discount} di Sconto` : 'Richiedi Informazioni',
      subtitle: 'Compila il form e ti contatteremo entro 24 ore',
      fields: {
        name: 'Nome e Cognome',
        email: 'Email',
        phone: 'Numero di Telefono',
        message: 'Messaggio (opzionale)'
      },
      placeholders: {
        name: 'Mario Rossi',
        email: 'mario.rossi@example.com',
        phone: '+39 333 123 4567',
        message: 'Scrivici qualcosa su di te e i tuoi obiettivi...'
      },
      submit: 'Invia Richiesta',
      submitting: 'Invio in corso...',
      success: 'Richiesta inviata con successo!',
      successDesc: 'Ti contatteremo a breve',
      error: 'Errore nell\'invio',
      errorDesc: 'Riprova o contattaci via email',
      required: 'Campo obbligatorio'
    },
    en: {
      title: discount ? `Claim ${discount} Discount` : 'Request Information',
      subtitle: 'Fill out the form and we\'ll contact you within 24 hours',
      fields: {
        name: 'Full Name',
        email: 'Email',
        phone: 'Phone Number',
        message: 'Message (optional)'
      },
      placeholders: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 555 123 4567',
        message: 'Tell us about yourself and your goals...'
      },
      submit: 'Submit Request',
      submitting: 'Sending...',
      success: 'Request sent successfully!',
      successDesc: 'We\'ll contact you soon',
      error: 'Submission error',
      errorDesc: 'Please try again or email us',
      required: 'Required field'
    }
  };

  const text = content[language] || content.en;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] animate-fadeIn"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-2xl mx-4 animate-slideIn">
        
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-2 border-blue-500/30 shadow-2xl overflow-hidden">
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full p-2 transition-all duration-200 hover:scale-110 z-10"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="relative p-8 md:p-12">
            
            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-black text-center mb-2">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {text.title}
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-slate-400 text-center mb-8">{text.subtitle}</p>

            {/* Success Message */}
            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3 animate-slideIn">
                <CheckCircle className="text-emerald-400" size={24} />
                <div>
                  <div className="text-emerald-300 font-semibold">{text.success}</div>
                  <div className="text-emerald-400/80 text-sm">{text.successDesc}</div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 animate-slideIn">
                <AlertCircle className="text-red-400" size={24} />
                <div>
                  <div className="text-red-300 font-semibold">{text.error}</div>
                  <div className="text-red-400/80 text-sm">{text.errorDesc}</div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Name */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {text.fields.name} *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={text.placeholders.name}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {text.fields.email} *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={text.placeholders.email}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {text.fields.phone} *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={text.placeholders.phone}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {text.fields.message}
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-slate-500" size={20} />
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={text.placeholders.message}
                    rows="4"
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || submitStatus === 'success'}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-2xl group flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {text.submitting}
                  </>
                ) : submitStatus === 'success' ? (
                  <>
                    <CheckCircle size={20} />
                    {text.success}
                  </>
                ) : (
                  <>
                    {text.submit}
                    <Send className="group-hover:translate-x-1 transition-transform duration-200" size={20} />
                  </>
                )}
              </button>

            </form>

          </div>

        </div>

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }
      `}</style>
    </>
  );
};

export default ContactFormModal;
