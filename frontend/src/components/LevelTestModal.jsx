import React, { useState, useEffect } from 'react';
import { X, CheckCircle, ArrowRight, ArrowLeft, Award, Target, Clock, Loader2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import engagementTracker from '../utils/engagementTracker';

const LevelTestModal = ({ isOpen, onClose, onBookingOpen }) => {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [leadInfo, setLeadInfo] = useState({ name: '', email: '' });
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  // Track when modal is opened
  useEffect(() => {
    if (isOpen) {
      engagementTracker.markInteraction('LevelTest');
    }
  }, [isOpen]);

  // Handle browser back button to close modal (important for mobile)
  useEffect(() => {
    if (isOpen) {
      // Add a state to history when modal opens
      window.history.pushState({ modalOpen: true }, '');
      
      const handlePopState = (e) => {
        if (isOpen) {
          onClose();
          // Prevent default back behavior
          e.preventDefault();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);

  const content = {
    it: {
      title: "Test di Livello Inglese Professionale",
      subtitle: "Scopri il tuo livello attuale e il percorso personalizzato VocalFitness",
      progress: "Domanda",
      of: "di",
      next: "Avanti",
      back: "Indietro",
      seeResults: "Vedi i Risultati",
      bookAssessment: "Prenota Valutazione Gratuita",
      closeTest: "Chiudi Test",
      questions: [
        {
          id: 'self_assessment',
          question: "Come valuteresti il tuo livello di inglese parlato?",
          type: 'single',
          options: [
            { value: 'beginner', label: 'Principiante - Ho difficoltà con frasi semplici', level: 1 },
            { value: 'elementary', label: 'Elementare - Capisco e parlo di argomenti familiari', level: 2 },
            { value: 'intermediate', label: 'Intermedio - Comunico nella maggior parte delle situazioni', level: 3 },
            { value: 'upper_intermediate', label: 'Intermedio Avanzato - Parlo fluentemente in contesti quotidiani', level: 4 },
            { value: 'advanced', label: 'Avanzato - Mi esprimo con precisione su temi complessi', level: 5 },
            { value: 'proficient', label: 'Madrelingua - Padronanza completa della lingua', level: 6 }
          ]
        },
        {
          id: 'professional_scenario',
          question: "Durante una videoconferenza internazionale importante, un collega anglofono parla velocemente. Tu:",
          type: 'single',
          options: [
            { value: 'lost', label: 'Mi perdo completamente e non riesco a seguire', level: 1 },
            { value: 'struggle', label: 'Capisco solo alcune parole chiave', level: 2 },
            { value: 'understand_main', label: 'Capisco il concetto generale ma perdo i dettagli', level: 3 },
            { value: 'understand_most', label: 'Capisco quasi tutto, solo alcune espressioni mi sfuggono', level: 4 },
            { value: 'understand_all', label: 'Capisco tutto perfettamente e posso rispondere fluidamente', level: 5 }
          ]
        },
        {
          id: 'pronunciation_awareness',
          question: "Quando parli inglese in situazioni professionali, i tuoi colleghi:",
          type: 'single',
          options: [
            { value: 'often_ask', label: 'Mi chiedono spesso di ripetere', level: 1 },
            { value: 'sometimes_ask', label: 'A volte sembrano confusi', level: 2 },
            { value: 'understand_effort', label: 'Mi capiscono ma con qualche sforzo', level: 3 },
            { value: 'understand_well', label: 'Mi capiscono facilmente', level: 4 },
            { value: 'mistake_native', label: 'Mi scambiano per un madrelingua', level: 5 }
          ]
        },
        {
          id: 'sector',
          question: "In quale settore lavori?",
          type: 'single',
          options: [
            { value: 'technology', label: 'Tecnologia/IT' },
            { value: 'finance', label: 'Finanza/Banking' },
            { value: 'healthcare', label: 'Sanità/Farmaceutico' },
            { value: 'engineering', label: 'Ingegneria' },
            { value: 'legal', label: 'Legale/Consulting' },
            { value: 'sales_marketing', label: 'Sales/Marketing' },
            { value: 'other', label: 'Altro' }
          ]
        },
        {
          id: 'goals',
          question: "Qual è il tuo obiettivo principale?",
          type: 'multiple',
          options: [
            { value: 'meetings', label: 'Condurre meeting internazionali con sicurezza' },
            { value: 'presentations', label: 'Presentare progetti a stakeholder globali' },
            { value: 'negotiations', label: 'Negoziare contratti e accordi' },
            { value: 'networking', label: 'Fare networking a eventi internazionali' },
            { value: 'promotion', label: 'Ottenere una promozione che richiede inglese fluente' }
          ]
        },
        {
          id: 'urgency',
          question: "Quanto è urgente per te migliorare il tuo inglese?",
          type: 'single',
          options: [
            { value: 'very_urgent', label: 'Molto urgente - Ho un\'opportunità importante nei prossimi 3 mesi', urgency: 3 },
            { value: 'urgent', label: 'Urgente - Voglio risultati entro 6 mesi', urgency: 2 },
            { value: 'moderate', label: 'Moderato - Miglioramento graduale nel prossimo anno', urgency: 1 }
          ]
        },
        {
          id: 'lead_capture',
          question: "Inserisci i tuoi dati per ricevere i risultati personalizzati",
          type: 'form',
          fields: ['name', 'email']
        }
      ],
      resultsTitles: {
        'A1-A2': 'Fondamenti - Livello Elementare',
        'B1': 'Intermedio - Costruzione della Fluency',
        'B2': 'Intermedio Avanzato - Verso la Padronanza',
        'C1-C2': 'Avanzato - Eccellenza Professionale'
      },
      resultsDescriptions: {
        'A1-A2': 'Il tuo inglese necessita di un rinforzo delle basi. Con VocalFitness, costruirai solide fondamenta fonetiche che ti permetteranno di comunicare con sicurezza.',
        'B1': 'Hai una buona base ma la pronuncia e la fluidità ti limitano in contesti professionali avanzati. VocalFitness può portarti al livello successivo rapidamente.',
        'B2': 'Sei molto vicino alla padronanza! Con il metodo VocalFitness, in 10 sessioni puoi raggiungere un livello C1+ ed eliminare completamente l\'accento italiano.',
        'C1-C2': 'Il tuo inglese è eccellente! VocalFitness può perfezionare gli ultimi dettagli prosodici per una pronuncia da madrelingua al 100%.'
      },
      recommendations: {
        'A1-A2': {
          program: 'Programma Foundation',
          duration: '12 settimane',
          focus: 'Fonetica di base, pattern articolatori, condizionamento muscolare',
          outcome: 'Da A2 a B1+ in 12 settimane'
        },
        'B1': {
          program: 'Programma Acceleration',
          duration: '10 settimane',
          focus: 'Eliminazione accento, prosodia avanzata, fluency professionale',
          outcome: 'Da B1 a B2+/C1 in 10 settimane'
        },
        'B2': {
          program: 'Programma Executive',
          duration: '8-10 settimane',
          focus: 'Pronuncia C2, eliminazione totale accento, public speaking',
          outcome: 'Da B2 a C1+/C2 in 10 settimane'
        },
        'C1-C2': {
          program: 'Programma Mastery',
          duration: '6-8 settimane',
          focus: 'Perfezionamento prosodico, intonazione nativa, leadership voice',
          outcome: 'Pronuncia indistinguibile da madrelingua'
        }
      },
      yourLevel: 'Il Tuo Livello',
      recommendedProgram: 'Programma Consigliato',
      duration: 'Durata',
      focus: 'Focus',
      expectedOutcome: 'Risultato Atteso',
      nextSteps: 'Prossimi Passi',
      bookNow: 'Prenota Valutazione Gratuita con Prof. Dapper',
      bookDescription: 'La prima sessione diagnostica è completamente gratuita. Il Prof. Dapper analizzerà il tuo profilo articolatorio e creerà un protocollo personalizzato.'
    },
    en: {
      title: "Professional English Level Test",
      subtitle: "Discover your current level and personalized VocalFitness path",
      progress: "Question",
      of: "of",
      next: "Next",
      back: "Back",
      seeResults: "See Results",
      bookAssessment: "Book Free Assessment",
      closeTest: "Close Test",
      questions: [
        {
          id: 'self_assessment',
          question: "How would you rate your spoken English level?",
          type: 'single',
          options: [
            { value: 'beginner', label: 'Beginner - I struggle with simple sentences', level: 1 },
            { value: 'elementary', label: 'Elementary - I understand and speak about familiar topics', level: 2 },
            { value: 'intermediate', label: 'Intermediate - I communicate in most situations', level: 3 },
            { value: 'upper_intermediate', label: 'Upper Intermediate - I speak fluently in everyday contexts', level: 4 },
            { value: 'advanced', label: 'Advanced - I express myself precisely on complex topics', level: 5 },
            { value: 'proficient', label: 'Native-like - Complete mastery of the language', level: 6 }
          ]
        },
        {
          id: 'professional_scenario',
          question: "During an important international video conference, an English-speaking colleague speaks quickly. You:",
          type: 'single',
          options: [
            { value: 'lost', label: 'Get completely lost and cannot follow', level: 1 },
            { value: 'struggle', label: 'Understand only some key words', level: 2 },
            { value: 'understand_main', label: 'Understand the general concept but miss details', level: 3 },
            { value: 'understand_most', label: 'Understand almost everything, only some expressions escape me', level: 4 },
            { value: 'understand_all', label: 'Understand everything perfectly and can respond fluently', level: 5 }
          ]
        },
        {
          id: 'pronunciation_awareness',
          question: "When you speak English in professional situations, your colleagues:",
          type: 'single',
          options: [
            { value: 'often_ask', label: 'Often ask me to repeat', level: 1 },
            { value: 'sometimes_ask', label: 'Sometimes seem confused', level: 2 },
            { value: 'understand_effort', label: 'Understand me but with some effort', level: 3 },
            { value: 'understand_well', label: 'Understand me easily', level: 4 },
            { value: 'mistake_native', label: 'Mistake me for a native speaker', level: 5 }
          ]
        },
        {
          id: 'sector',
          question: "Which sector do you work in?",
          type: 'single',
          options: [
            { value: 'technology', label: 'Technology/IT' },
            { value: 'finance', label: 'Finance/Banking' },
            { value: 'healthcare', label: 'Healthcare/Pharmaceutical' },
            { value: 'engineering', label: 'Engineering' },
            { value: 'legal', label: 'Legal/Consulting' },
            { value: 'sales_marketing', label: 'Sales/Marketing' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          id: 'goals',
          question: "What is your main goal?",
          type: 'multiple',
          options: [
            { value: 'meetings', label: 'Lead international meetings confidently' },
            { value: 'presentations', label: 'Present projects to global stakeholders' },
            { value: 'negotiations', label: 'Negotiate contracts and deals' },
            { value: 'networking', label: 'Network at international events' },
            { value: 'promotion', label: 'Get a promotion requiring fluent English' }
          ]
        },
        {
          id: 'urgency',
          question: "How urgent is it for you to improve your English?",
          type: 'single',
          options: [
            { value: 'very_urgent', label: 'Very urgent - I have an important opportunity in the next 3 months', urgency: 3 },
            { value: 'urgent', label: 'Urgent - I want results within 6 months', urgency: 2 },
            { value: 'moderate', label: 'Moderate - Gradual improvement over the next year', urgency: 1 }
          ]
        },
        {
          id: 'lead_capture',
          question: "Enter your details to receive personalized results",
          type: 'form',
          fields: ['name', 'email']
        }
      ],
      resultsTitles: {
        'A1-A2': 'Foundation - Elementary Level',
        'B1': 'Intermediate - Building Fluency',
        'B2': 'Upper Intermediate - Towards Mastery',
        'C1-C2': 'Advanced - Professional Excellence'
      },
      resultsDescriptions: {
        'A1-A2': 'Your English needs foundational reinforcement. With VocalFitness, you\'ll build solid phonetic foundations for confident communication.',
        'B1': 'You have a good base but pronunciation and fluency limit you in advanced professional contexts. VocalFitness can take you to the next level quickly.',
        'B2': 'You\'re very close to mastery! With VocalFitness method, in 10 sessions you can reach C1+ level and completely eliminate the Italian accent.',
        'C1-C2': 'Your English is excellent! VocalFitness can perfect the final prosodic details for 100% native-like pronunciation.'
      },
      recommendations: {
        'A1-A2': {
          program: 'Foundation Program',
          duration: '12 weeks',
          focus: 'Basic phonetics, articulatory patterns, muscle conditioning',
          outcome: 'From A2 to B1+ in 12 weeks'
        },
        'B1': {
          program: 'Acceleration Program',
          duration: '10 weeks',
          focus: 'Accent elimination, advanced prosody, professional fluency',
          outcome: 'From B1 to B2+/C1 in 10 weeks'
        },
        'B2': {
          program: 'Executive Program',
          duration: '8-10 weeks',
          focus: 'C2 pronunciation, total accent elimination, public speaking',
          outcome: 'From B2 to C1+/C2 in 10 weeks'
        },
        'C1-C2': {
          program: 'Mastery Program',
          duration: '6-8 weeks',
          focus: 'Prosodic perfection, native intonation, leadership voice',
          outcome: 'Pronunciation indistinguishable from native'
        }
      },
      yourLevel: 'Your Level',
      recommendedProgram: 'Recommended Program',
      duration: 'Duration',
      focus: 'Focus',
      expectedOutcome: 'Expected Outcome',
      nextSteps: 'Next Steps',
      bookNow: 'Book Free Assessment with Prof. Dapper',
      bookDescription: 'The first diagnostic session is completely free. Prof. Dapper will analyze your articulatory profile and create a personalized protocol.'
    }
  };

  const text = content[language] || content.en;
  const questions = text.questions;

  const calculateLevel = () => {
    let totalScore = 0;
    let scoredQuestions = 0;

    // Calculate average level from scored questions
    ['self_assessment', 'professional_scenario', 'pronunciation_awareness'].forEach(qId => {
      if (answers[qId]) {
        const question = questions.find(q => q.id === qId);
        const selectedOption = question.options.find(opt => opt.value === answers[qId]);
        if (selectedOption && selectedOption.level) {
          totalScore += selectedOption.level;
          scoredQuestions++;
        }
      }
    });

    const averageScore = scoredQuestions > 0 ? totalScore / scoredQuestions : 0;

    // Map to CEFR levels
    if (averageScore <= 2) return 'A1-A2';
    if (averageScore <= 3.5) return 'B1';
    if (averageScore <= 4.5) return 'B2';
    return 'C1-C2';
  };

  const handleAnswer = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleMultipleAnswer = (questionId, value) => {
    const currentAnswers = answers[questionId] || [];
    const newAnswers = currentAnswers.includes(value)
      ? currentAnswers.filter(v => v !== value)
      : [...currentAnswers, value];
    setAnswers({ ...answers, [questionId]: newAnswers });
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const level = calculateLevel();
    const recommendation = text.recommendations[level];

    // Send to backend
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      
      const payload = {
        name: leadInfo.name,
        email: leadInfo.email,
        phone: '',
        message: `Level Test Results: ${level} | Sector: ${answers.sector || 'N/A'} | Goals: ${(answers.goals || []).join(', ')} | Urgency: ${answers.urgency || 'N/A'}`,
        discount: '',
        type: 'level_test',
        language: language
      };

      await axios.post(`${backendUrl}/api/contact`, payload);
    } catch (error) {
      console.error('Error submitting level test:', error);
    }

    setResults({ level, recommendation });
    setShowResults(true);
    setIsSubmitting(false);
  };

  const isCurrentStepValid = () => {
    const currentQuestion = questions[currentStep];
    if (currentQuestion.type === 'form') {
      return leadInfo.name && leadInfo.email;
    }
    if (currentQuestion.type === 'multiple') {
      return answers[currentQuestion.id] && answers[currentQuestion.id].length > 0;
    }
    return answers[currentQuestion.id];
  };

  if (!isOpen) return null;

  if (showResults && results) {
    return (
      <>
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9998]" onClick={onClose}></div>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl my-8 p-8" onClick={(e) => e.stopPropagation()}>
            
            {/* Close button - Enhanced for mobile */}
            <button 
              onClick={onClose} 
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[10000] text-white bg-red-600 hover:bg-red-700 rounded-full p-2 sm:p-3 transition-all duration-200 shadow-2xl ring-2 ring-white/20 hover:scale-110"
              aria-label="Chiudi"
            >
              <X size={24} />
            </button>

            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {text.yourLevel}: <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">{text.resultsTitles[results.level]}</span>
              </h2>
              <p className="text-slate-300 text-lg">{text.resultsDescriptions[results.level]}</p>
            </div>

            {/* Recommendation Card */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-blue-500/30 mb-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="text-blue-400" size={24} />
                {text.recommendedProgram}
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">{text.recommendedProgram}</div>
                  <div className="text-lg font-semibold text-white">{results.recommendation.program}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">{text.duration}</div>
                  <div className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                    <Clock size={18} />
                    {results.recommendation.duration}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-1">{text.focus}</div>
                <div className="text-white">{results.recommendation.focus}</div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-1">{text.expectedOutcome}</div>
                <div className="text-lg font-semibold text-emerald-400">{results.recommendation.outcome}</div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl p-6 border border-blue-500/50">
              <h3 className="text-xl font-bold text-white mb-2">{text.nextSteps}</h3>
              <p className="text-slate-300 mb-4">{text.bookDescription}</p>
              
              <Button
                onClick={() => {
                  onClose();
                  if (onBookingOpen) onBookingOpen();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 rounded-xl text-lg"
              >
                <Calendar size={20} className="mr-2" />
                {text.bookNow}
              </Button>
            </div>

          </div>
        </div>
      </>
    );
  }

  const currentQuestion = questions[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[99998]" onClick={onClose}></div>
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-[99999] flex flex-col">
        
        {/* Close button bar - ALWAYS VISIBLE at top */}
        <div className="flex justify-end items-center p-3 bg-slate-900/95 border-b border-slate-700">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 shadow-2xl hover:scale-105"
            aria-label="Chiudi"
          >
            <X size={20} />
            <span className="text-sm">{language === 'it' ? 'Chiudi' : 'Close'}</span>
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-2xl font-bold text-white mb-1">{text.title}</h2>
            <p className="text-slate-400 text-sm">{text.subtitle}</p>
            
            {/* Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>{text.progress} {currentStep + 1} {text.of} {questions.length}</span>
                <span>{Math.round(((currentStep + 1) / questions.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="p-8">
            <h3 className="text-xl font-semibold text-white mb-6">{currentQuestion.question}</h3>
            
            {currentQuestion.type === 'form' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={language === 'it' ? 'Nome completo' : 'Full name'}
                  value={leadInfo.name}
                  onChange={(e) => setLeadInfo({ ...leadInfo, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={leadInfo.email}
                  onChange={(e) => setLeadInfo({ ...leadInfo, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentQuestion.type === 'multiple' 
                    ? (answers[currentQuestion.id] || []).includes(option.value)
                    : answers[currentQuestion.id] === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => currentQuestion.type === 'multiple' 
                        ? handleMultipleAnswer(currentQuestion.id, option.value)
                        : handleAnswer(currentQuestion.id, option.value)
                      }
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {isSelected && <CheckCircle size={20} className="text-blue-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="p-6 border-t border-slate-700/50 flex justify-between gap-4">
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={currentStep === 0}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              <ArrowLeft size={18} className="mr-2" />
              {text.back}
            </Button>
            
            {currentStep === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!isCurrentStepValid() || isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    {language === 'it' ? 'Elaborazione...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {text.seeResults}
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentStepValid()}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold disabled:opacity-50"
              >
                {text.next}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            )}
          </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default LevelTestModal;
