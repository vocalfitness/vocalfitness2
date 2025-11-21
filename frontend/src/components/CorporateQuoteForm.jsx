import React, { useState } from 'react';
import { X, Building2, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const CorporateQuoteForm = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    numberOfEmployees: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    levelsToTrain: [],
    budget: '',
    preferredMode: '',
    location: '',
    notes: ''
  });

  const content = {
    it: {
      title: "Richiedi Preventivo Personalizzato",
      subtitle: "Compila il form e ti contatteremo entro 48 ore con una proposta su misura",
      fields: {
        companyName: "Ragione Sociale Azienda *",
        industry: "Settore",
        numberOfEmployees: "Numero Dipendenti *",
        contactName: "Nome e Cognome Referente *",
        contactEmail: "Email Aziendale *",
        contactPhone: "Telefono",
        levelsToTrain: "Livelli da Formare *",
        budget: "Budget Indicativo Annuale",
        preferredMode: "Modalità Preferita *",
        location: "Sede/Location",
        notes: "Note Aggiuntive"
      },
      placeholders: {
        companyName: "Es: Acme Corporation S.p.A.",
        industry: "Es: Technology, Finance, Manufacturing...",
        contactName: "Es: Mario Rossi",
        contactEmail: "mario.rossi@azienda.com",
        contactPhone: "+39 123 456 7890",
        location: "Es: Milano, Roma, Multi-sede...",
        notes: "Inserisci qui eventuali necessità specifiche, tempistiche, o domande..."
      },
      employeeOptions: [
        { value: '10-50', label: '10-50 dipendenti (PMI)' },
        { value: '50-200', label: '50-200 dipendenti (Media Impresa)' },
        { value: '200-500', label: '200-500 dipendenti' },
        { value: '500+', label: '500+ dipendenti (Enterprise)' }
      ],
      levelOptions: [
        { value: 'entry', label: 'Entry-level (Reception, Assistenti, Operativi)' },
        { value: 'middle', label: 'Middle Management (Team Leaders, Manager)' },
        { value: 'senior', label: 'Senior Leadership (Director, VP, C-level)' },
        { value: 'all', label: 'Tutti i livelli' }
      ],
      budgetOptions: [
        { value: 'under-10k', label: 'Sotto €10.000' },
        { value: '10k-50k', label: '€10.000 - €50.000' },
        { value: '50k-100k', label: '€50.000 - €100.000' },
        { value: '100k+', label: 'Oltre €100.000' },
        { value: 'flexible', label: 'Flessibile' }
      ],
      modeOptions: [
        { value: 'onsite', label: 'In sede aziendale' },
        { value: 'online', label: 'Completamente online' },
        { value: 'hybrid', label: 'Hybrid (mix in sede + online)' }
      ],
      submit: "Invia Richiesta",
      cancel: "Annulla",
      success: {
        title: "Richiesta Inviata con Successo!",
        message: "Grazie per il tuo interesse. Il nostro team corporate ti contatterà entro 48 ore con un preventivo personalizzato e la possibilità di schedulare una demo gratuita del metodo VocalFitness.",
        close: "Chiudi"
      },
      error: {
        title: "Errore nell'invio",
        message: "Si è verificato un errore. Riprova o contattaci direttamente a: admissions@vocalfitness.org"
      },
      required: "Campo obbligatorio"
    },
    en: {
      title: "Request Personalized Quote",
      subtitle: "Fill out the form and we'll contact you within 48 hours with a tailored proposal",
      fields: {
        companyName: "Company Name *",
        industry: "Industry",
        numberOfEmployees: "Number of Employees *",
        contactName: "Contact Name *",
        contactEmail: "Corporate Email *",
        contactPhone: "Phone",
        levelsToTrain: "Levels to Train *",
        budget: "Indicative Annual Budget",
        preferredMode: "Preferred Mode *",
        location: "Location/Site",
        notes: "Additional Notes"
      },
      placeholders: {
        companyName: "E.g.: Acme Corporation Ltd.",
        industry: "E.g.: Technology, Finance, Manufacturing...",
        contactName: "E.g.: John Smith",
        contactEmail: "john.smith@company.com",
        contactPhone: "+39 123 456 7890",
        location: "E.g.: Milan, Rome, Multi-site...",
        notes: "Insert any specific needs, timelines, or questions..."
      },
      employeeOptions: [
        { value: '10-50', label: '10-50 employees (SME)' },
        { value: '50-200', label: '50-200 employees (Medium Enterprise)' },
        { value: '200-500', label: '200-500 employees' },
        { value: '500+', label: '500+ employees (Enterprise)' }
      ],
      levelOptions: [
        { value: 'entry', label: 'Entry-level (Reception, Assistants, Operations)' },
        { value: 'middle', label: 'Middle Management (Team Leaders, Managers)' },
        { value: 'senior', label: 'Senior Leadership (Director, VP, C-level)' },
        { value: 'all', label: 'All levels' }
      ],
      budgetOptions: [
        { value: 'under-10k', label: 'Under €10,000' },
        { value: '10k-50k', label: '€10,000 - €50,000' },
        { value: '50k-100k', label: '€50,000 - €100,000' },
        { value: '100k+', label: 'Over €100,000' },
        { value: 'flexible', label: 'Flexible' }
      ],
      modeOptions: [
        { value: 'onsite', label: 'On-site at company' },
        { value: 'online', label: 'Completely online' },
        { value: 'hybrid', label: 'Hybrid (mix on-site + online)' }
      ],
      submit: "Submit Request",
      cancel: "Cancel",
      success: {
        title: "Request Successfully Submitted!",
        message: "Thank you for your interest. Our corporate team will contact you within 48 hours with a personalized quote and the possibility to schedule a free demo of the VocalFitness method.",
        close: "Close"
      },
      error: {
        title: "Submission Error",
        message: "An error occurred. Please try again or contact us directly at: admissions@vocalfitness.org"
      },
      required: "Required field"
    }
  };

  const text = content[language] || content.en;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        levelsToTrain: checked 
          ? [...prev.levelsToTrain, value]
          : prev.levelsToTrain.filter(level => level !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      await axios.post(`${backendUrl}/api/corporate-quote`, {
        ...formData,
        language
      });

      setSubmitSuccess(true);
      // Reset form
      setFormData({
        companyName: '',
        industry: '',
        numberOfEmployees: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        levelsToTrain: [],
        budget: '',
        preferredMode: '',
        location: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error submitting corporate quote:', error);
      setSubmitError(text.error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitSuccess(false);
    setSubmitError('');
    onClose();
  };

  if (!isOpen) return null;

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">{text.success.title}</h3>
          <p className="text-slate-300 mb-8 leading-relaxed">{text.success.message}</p>
          <Button
            onClick={handleClose}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-xl"
          >
            {text.success.close}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">{text.title}</h3>
              <p className="text-blue-100 text-sm">{text.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Company Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">{text.fields.companyName}</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder={text.placeholders.companyName}
              required
              className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Industry & Employees */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2">{text.fields.industry}</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder={text.placeholders.industry}
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2">{text.fields.numberOfEmployees}</label>
              <select
                name="numberOfEmployees"
                value={formData.numberOfEmployees}
                onChange={handleChange}
                required
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              >
                <option value="">Seleziona...</option>
                {text.employeeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">{text.fields.contactName}</label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              placeholder={text.placeholders.contactName}
              required
              className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2">{text.fields.contactEmail}</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder={text.placeholders.contactEmail}
                required
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2">{text.fields.contactPhone}</label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder={text.placeholders.contactPhone}
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Levels to Train */}
          <div>
            <label className="block text-slate-300 font-medium mb-3">{text.fields.levelsToTrain}</label>
            <div className="space-y-2">
              {text.levelOptions.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    name="levelsToTrain"
                    value={opt.value}
                    checked={formData.levelsToTrain.includes(opt.value)}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Budget & Mode */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2">{text.fields.budget}</label>
              <select
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              >
                <option value="">Seleziona...</option>
                {text.budgetOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2">{text.fields.preferredMode}</label>
              <select
                name="preferredMode"
                value={formData.preferredMode}
                onChange={handleChange}
                required
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              >
                <option value="">Seleziona...</option>
                {text.modeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">{text.fields.location}</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={text.placeholders.location}
              className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">{text.fields.notes}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder={text.placeholders.notes}
              rows="4"
              className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {submitError && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400">
              {submitError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl"
            >
              {text.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Invio...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>{text.submit}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorporateQuoteForm;
