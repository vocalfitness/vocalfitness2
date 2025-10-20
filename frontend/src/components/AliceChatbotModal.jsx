import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const AliceChatbotModal = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isComplete, setIsComplete] = useState(false);
  const [collectedData, setCollectedData] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const content = {
    it: {
      title: "Chatta con Alice",
      subtitle: "Assistente Virtuale VocalFitness",
      placeholder: "Scrivi un messaggio...",
      send: "Invia",
      whatsappButton: "Chatta con Alice su WhatsApp",
      initialMessage: "Ciao! Sono Alice, l'assistente virtuale di VocalFitness. Sarò felice di aiutarti a prenotare una valutazione gratuita con il Professor Dapper. Per iniziare, come ti chiami?"
    },
    en: {
      title: "Chat with Alice",
      subtitle: "VocalFitness Virtual Assistant",
      placeholder: "Type a message...",
      send: "Send",
      whatsappButton: "Chat with Alice on WhatsApp",
      initialMessage: "Hi! I'm Alice, the VocalFitness virtual assistant. I'll be happy to help you book a free assessment with Professor Dapper. To start, what's your name?"
    }
  };

  const text = content[language] || content.en;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add initial message from Alice
      setMessages([{
        role: 'assistant',
        content: text.initialMessage,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, text.initialMessage, messages.length]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await axios.post(`${backendUrl}/api/chat`, {
        session_id: sessionId,
        message: inputMessage,
        language: language
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsComplete(response.data.is_complete);
      setCollectedData(response.data.collected_data);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: language === 'it' 
          ? 'Mi dispiace, si è verificato un errore. Riprova per favore.' 
          : 'Sorry, there was an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleWhatsAppClick = () => {
    const { name, email, english_level, goal, urgency } = collectedData;
    
    const messageText = language === 'it'
      ? `Ciao Alice! Mi chiamo ${name}.\n\nHo appena completato la pre-qualifica con l'assistente virtuale.\n\nEcco i miei dati:\n📧 Email: ${email}\n📊 Livello inglese: ${english_level}\n🎯 Obiettivo: ${goal}\n⏰ Urgenza: ${urgency}\n\nVorrei prenotare una valutazione gratuita con il Professor Dapper. Grazie!`
      : `Hi Alice! My name is ${name}.\n\nI just completed the pre-qualification with the virtual assistant.\n\nHere are my details:\n📧 Email: ${email}\n📊 English level: ${english_level}\n🎯 Goal: ${goal}\n⏰ Urgency: ${urgency}\n\nI'd like to book a free assessment with Professor Dapper. Thank you!`;
    
    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/message/WBEPHHBBTFIOE1?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl h-[600px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <MessageCircle className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{text.title}</h3>
              <p className="text-blue-100 text-sm">{text.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="animate-spin text-blue-400" size={16} />
                <span className="text-slate-300 text-sm">Alice sta scrivendo...</span>
              </div>
            </div>
          )}
          
          {isComplete && (
            <div className="flex justify-center">
              <Button
                onClick={handleWhatsAppClick}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {text.whatsappButton}
              </Button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {!isComplete && (
          <div className="p-4 bg-slate-900 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={text.placeholder}
                disabled={isLoading}
                className="flex-1 bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AliceChatbotModal;
