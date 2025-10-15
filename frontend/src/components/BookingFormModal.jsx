import React, { useState } from 'react';
import { X, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const BookingFormModal = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    sector: '',
    englishLevel: '',
    age: '',
    preferredDay: '',
    preferredTime: '',
    message: ''
  });

  const content = {
    it: {
      title: "Prenota Valutazione Gratuita",
      subtitle: "Compila il form e ti ricontatteremo per programmare la tua sessione diagnostica",
      fields: {
        name: "Nome Completo *",
        email: "Email *",
        phone: "Numero di Cellulare *",
        sector: "Settore Merceologico *",
        englishLevel: "Livello d'Inglese Attuale (opzionale)",
        age: "Età *",
        preferredDay: "Giorno Preferito *",
        preferredTime: "Orario Preferito *",
        message: "Note Aggiuntive (opzionale)"
      },
      placeholders: {
        name: "es. Mario Rossi",
        email: "mario.rossi@azienda.com",
        phone: "+39 333 123 4567",
        sector: "Seleziona settore",
        englishLevel: "Seleziona livello",
        age: "es. 35",
        preferredDay: "Seleziona giorno",
        preferredTime: "Seleziona orario",
        message: "Eventuali esigenze specifiche..."
      },
      sectors: [
        { value: '', label: 'Seleziona settore' },
        { value: 'technology', label: 'Tecnologia' },
        { value: 'finance', label: 'Finanza' },
        { value: 'healthcare', label: 'Sanità' },
        { value: 'pharmaceutical', label: 'Farmaceutico' },
        { value: 'engineering', label: 'Ingegneria' },
        { value: 'legal', label: 'Legale' },
        { value: 'marketing', label: 'Marketing/Sales' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'hospitality', label: 'Hospitality' },
        { value: 'education', label: 'Educazione' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'other', label: 'Altro' }
      ],
      levels: [
        { value: '', label: 'Seleziona livello' },
        { value: 'A1', label: 'A1 - Principiante' },
        { value: 'A2', label: 'A2 - Elementare' },
        { value: 'B1', label: 'B1 - Intermedio' },
        { value: 'B2', label: 'B2 - Intermedio Superiore' },
        { value: 'C1', label: 'C1 - Avanzato' },
        { value: 'C2', label: 'C2 - Madrelingua' }
      ],
      days: [
        { value: '', label: 'Seleziona giorno' },
        { value: 'monday', label: 'Lunedì' },
        { value: 'tuesday', label: 'Martedì' },
        { value: 'wednesday', label: 'Mercoledì' },
        { value: 'thursday', label: 'Giovedì' },
        { value: 'friday', label: 'Venerdì' },
        { value: 'saturday', label: 'Sabato' }
      ],
      times: [
        { value: '', label: 'Seleziona orario' },
        { value: '09:00-11:00', label: '09:00 - 11:00' },
        { value: '11:00-13:00', label: '11:00 - 13:00' },
        { value: '14:00-16:00', label: '14:00 - 16:00' },
        { value: '16:00-18:00', label: '16:00 - 18:00' },
        { value: '18:00-20:00', label: '18:00 - 20:00' }
      ],
      submit: "Invia Richiesta",
      cancel: "Annulla",
      success: "Richiesta inviata con successo!",
      successMessage: "Ti ricontatteremo al più presto per confermare la tua valutazione gratuita.",
      error: "Errore nell'invio. Riprova."
    },
    en: {
      title: "Book Free Assessment",
      subtitle: "Fill out the form and we'll contact you to schedule your diagnostic session",
      fields: {
        name: "Full Name *",
        email: "Email *",
        phone: "Mobile Number *",
        sector: "Business Sector *",
        englishLevel: "Current English Level (optional)",
        age: "Age *",
        preferredDay: "Preferred Day *",
        preferredTime: "Preferred Time *",
        message: "Additional Notes (optional)"
      },
      placeholders: {
        name: "e.g. John Smith",
        email: "john.smith@company.com",
        phone: "+39 333 123 4567",
        sector: "Select sector",
        englishLevel: "Select level",
        age: "e.g. 35",
        preferredDay: "Select day",
        preferredTime: "Select time",
        message: "Any specific requirements..."
      },
      sectors: [
        { value: '', label: 'Select sector' },
        { value: 'technology', label: 'Technology' },
        { value: 'finance', label: 'Finance' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'pharmaceutical', label: 'Pharmaceutical' },
        { value: 'engineering', label: 'Engineering' },
        { value: 'legal', label: 'Legal' },
        { value: 'marketing', label: 'Marketing/Sales' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'hospitality', label: 'Hospitality' },
        { value: 'education', label: 'Education' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'other', label: 'Other' }
      ],
      levels: [
        { value: '', label: 'Select level' },
        { value: 'A1', label: 'A1 - Beginner' },
        { value: 'A2', label: 'A2 - Elementary' },
        { value: 'B1', label: 'B1 - Intermediate' },
        { value: 'B2', label: 'B2 - Upper Intermediate' },
        { value: 'C1', label: 'C1 - Advanced' },
        { value: 'C2', label: 'C2 - Native' }
      ],
      days: [
        { value: '', label: 'Select day' },
        { value: 'monday', label: 'Monday' },
        { value: 'tuesday', label: 'Tuesday' },
        { value: 'wednesday', label: 'Wednesday' },
        { value: 'thursday', label: 'Thursday' },
        { value: 'friday', label: 'Friday' },
        { value: 'saturday', label: 'Saturday' }
      ],
      times: [
        { value: '', label: 'Select time' },
        { value: '09:00-11:00', label: '09:00 - 11:00' },
        { value: '11:00-13:00', label: '11:00 - 13:00' },
        { value: '14:00-16:00', label: '14:00 - 16:00' },
        { value: '16:00-18:00', label: '16:00 - 18:00' },
        { value: '18:00-20:00', label: '18:00 - 20:00' }
      ],
      submit: "Submit Request",
      cancel: "Cancel",
      success: "Request sent successfully!",
      successMessage: "We'll contact you soon to confirm your free assessment.",
      error: "Error sending. Please try again."
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
    
    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.sector || !formData.age || !formData.preferredDay || !formData.preferredTime) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      
      const payload = {
        ...formData,
        type: 'booking',
        language: language
      };

      const response = await axios.post(`${backendUrl}/api/booking`, payload);

      if (response.status === 201) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          setFormData({
            name: '',
            email: '',
            phone: '',
            sector: '',
            englishLevel: '',
            age: '',
            preferredDay: '',
            preferredTime: '',
            message: ''
          });
          setSubmitStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]" onClick={onClose}></div>
      
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors duration-200 z-10"
          >
            <X size={24} />
          </button>

          {/* Header */}
          <div className="p-8 pb-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Calendar size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{text.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{text.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Nome */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.name}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={text.placeholders.name}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.email}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={text.placeholders.email}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.phone}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={text.placeholders.phone}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  required
                />
              </div>

              {/* Sector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.sector}
                </label>
                <select
                  name="sector"
                  value={formData.sector}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  required
                >
                  {text.sectors.map(sector => (
                    <option key={sector.value} value={sector.value}>{sector.label}</option>
                  ))}
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.age}
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder={text.placeholders.age}
                  min="18"
                  max="99"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  required
                />
              </div>

              {/* English Level */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.englishLevel}
                </label>
                <select
                  name="englishLevel"
                  value={formData.englishLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors duration-200"
                >
                  {text.levels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              {/* Preferred Day */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.preferredDay}
                </label>
                <select
                  name="preferredDay"
                  value={formData.preferredDay}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  required
                >
                  {text.days.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>

              {/* Preferred Time */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.preferredTime}
                </label>
                <select
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  required
                >
                  {text.times.map(time => (
                    <option key={time.value} value={time.value}>{time.label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {text.fields.message}
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={text.placeholders.message}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200 resize-none"
                />
              </div>
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg flex items-start gap-3">
                <CheckCircle size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-emerald-400 font-semibold">{text.success}</p>
                  <p className="text-emerald-300/80 text-sm mt-1">{text.successMessage}</p>
                </div>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400">{text.error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                disabled={isSubmitting}
              >
                {text.cancel}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
                disabled={isSubmitting}
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
            </div>
          </form>

        </div>
      </div>
    </>
  );
};

export default BookingFormModal;
