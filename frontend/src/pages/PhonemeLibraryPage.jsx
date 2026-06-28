import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Play, Pause, BookOpen, GraduationCap, Sparkles,
  Lock, ChevronRight, Volume2, Globe, Layers
} from 'lucide-react';
import { PHONEMES } from '../data/phonemes';
import useDialect from '../hooks/useDialect';
import { BACKEND_URL } from '../lib/backend';

/* =========================================================================
 *  PhonemeLibraryPage  —  /lms/phonemes
 *  -----------------------------------------------------------------------
 *  Public, SEO-friendly catalogue page that introduces every phoneme card
 *  available on the platform. Acts as the "gate" before a student opens an
 *  individual card.
 *
 *  Dialect handling: a single GLOBAL toggle in the header (US / UK) writes
 *  to localStorage via the shared `useDialect` hook so every card opened
 *  from here inherits the same preference, and re-visits remember it.
 *  Cross-link friendly via ?d=us|uk on first visit.
 *
 *  Catalogue strategy:
 *    – published cards   →  rich, clickable mini-card (IPA + lexical set
 *                            + 3 example words + Listen mini-button)
 *    – upcoming cards    →  greyed-out placeholder with "in preparazione"
 *                            badge, drives the perception of a growing
 *                            library without dead 404 links
 * ======================================================================= */

// ------- Static catalogue spec (single source of truth) ------------------
// Each entry can be either "published" (resolves to a real PHONEMES[id]
// entry) or "upcoming" (renders a locked placeholder card).
const CATALOGUE = [
  // ----------------------- VOWELS ---------------------------------
  { id: 'i-fleece', status: 'published', group: 'vowel', subtitle: 'FLEECE', words: ['see', 'tree', 'three'] },
  { id: 'i-kit',    status: 'upcoming',  group: 'vowel', ipa: 'ɪ',  subtitle: 'KIT',     words: ['ship', 'sit', 'fish'] },
  { id: 'e-dress',  status: 'upcoming',  group: 'vowel', ipa: 'e',  subtitle: 'DRESS',   words: ['bed', 'pen', 'help'] },
  { id: 'ae-trap',  status: 'upcoming',  group: 'vowel', ipa: 'æ',  subtitle: 'TRAP',    words: ['cat', 'man', 'apple'] },
  { id: 'a-father', status: 'upcoming',  group: 'vowel', ipa: 'ɑː', subtitle: 'FATHER',  words: ['car', 'father', 'palm'] },
  { id: 'o-thought',status: 'upcoming',  group: 'vowel', ipa: 'ɔː', subtitle: 'THOUGHT', words: ['saw', 'thought', 'door'] },
  { id: 'u-foot',   status: 'published', group: 'vowel', subtitle: 'FOOT', words: ['put', 'look', 'good'] },
  { id: 'u-goose',  status: 'upcoming',  group: 'vowel', ipa: 'uː', subtitle: 'GOOSE',   words: ['two', 'food', 'blue'] },
  { id: 'ah-strut', status: 'upcoming',  group: 'vowel', ipa: 'ʌ',  subtitle: 'STRUT',   words: ['cup', 'love', 'come'] },
  { id: 'er-nurse', status: 'upcoming',  group: 'vowel', ipa: 'ɜːr',subtitle: 'NURSE',   words: ['bird', 'word', 'work'] },
  { id: 'schwa',    status: 'upcoming',  group: 'vowel', ipa: 'ə',  subtitle: 'COMMA',   words: ['about', 'sofa', 'around'] },

  // ----------------------- DIPHTHONGS -----------------------------
  { id: 'ay-price', status: 'upcoming', group: 'diphthong', ipa: 'aɪ', subtitle: 'PRICE', words: ['time', 'right', 'my'] },
  { id: 'ow-mouth', status: 'upcoming', group: 'diphthong', ipa: 'aʊ', subtitle: 'MOUTH', words: ['now', 'house', 'down'] },
  { id: 'oy-choice',status: 'upcoming', group: 'diphthong', ipa: 'ɔɪ', subtitle: 'CHOICE',words: ['boy', 'voice', 'join'] },

  // ----------------------- CONSONANTS -----------------------------
  { id: 'th-think', status: 'upcoming', group: 'consonant', ipa: 'θ', subtitle: 'THINK',  words: ['think', 'three', 'bath'] },
  { id: 'th-this',  status: 'upcoming', group: 'consonant', ipa: 'ð', subtitle: 'THIS',   words: ['this', 'mother', 'breathe'] },
  { id: 's-sip',    status: 'upcoming', group: 'consonant', ipa: 's', subtitle: 'SIP',    words: ['see', 'sun', 'price'] },
  { id: 'r-red',    status: 'upcoming', group: 'consonant', ipa: 'r', subtitle: 'RED',    words: ['red', 'tree', 'around'] },
  { id: 'l-light',  status: 'upcoming', group: 'consonant', ipa: 'l', subtitle: 'LIGHT',  words: ['light', 'love', 'full'] },
  { id: 'w-wet',    status: 'upcoming', group: 'consonant', ipa: 'w', subtitle: 'WET',    words: ['wet', 'one', 'quick'] },
];

const GROUPS = [
  { id: 'vowel',      label: 'Vocali',     color: 'from-cyan-500 to-blue-600',    soft: 'from-cyan-500/10  to-blue-500/5',    border: 'border-cyan-500/30',   accent: 'text-cyan-300' },
  { id: 'diphthong',  label: 'Dittonghi',  color: 'from-orange-500 to-amber-500', soft: 'from-orange-500/10 to-amber-500/5',  border: 'border-orange-500/30', accent: 'text-orange-300' },
  { id: 'consonant',  label: 'Consonanti', color: 'from-violet-500 to-fuchsia-500',soft: 'from-violet-500/10 to-fuchsia-500/5',border: 'border-violet-500/30', accent: 'text-violet-300' },
];

// ------- Mini audio player used in published cards -----------------------
const ListenButton = ({ src, label = 'Listen', testId }) => {
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);
  useEffect(() => () => { if (ref.current) { try { ref.current.pause(); } catch {/*noop*/} } }, []);
  const handle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!src) return;
    if (!ref.current) {
      const url = src.startsWith('http') ? src : `${BACKEND_URL}${src}`;
      ref.current = new Audio(url);
      ref.current.preload = 'metadata';
      ref.current.addEventListener('ended',  () => setPlaying(false));
      ref.current.addEventListener('pause',  () => setPlaying(false));
      ref.current.addEventListener('error',  () => setPlaying(false));
    }
    if (playing) { ref.current.pause(); return; }
    ref.current.currentTime = 0;
    ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      data-testid={testId}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 ${
        playing
          ? 'bg-orange-500 border-orange-400 text-slate-900 shadow-[0_0_24px_rgba(251,146,60,0.6)] scale-110'
          : 'bg-slate-900/70 border-cyan-500/40 text-cyan-200 hover:border-orange-400 hover:text-orange-300 hover:scale-105'
      }`}
    >
      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
    </button>
  );
};

// ------- Published mini-card ---------------------------------------------
const PublishedCard = ({ entry, phoneme, group, dialect, index }) => {
  const isoAudio = phoneme.audio?.[dialect]?.isolated || phoneme.audio?.AmE?.isolated;
  return (
    <Link
      to={`/lms/phoneme/${entry.id}`}
      className="group relative block"
      data-testid={`phoneme-library-card-${entry.id}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className={`relative h-full rounded-3xl border ${group.border} bg-gradient-to-br ${group.soft} backdrop-blur-sm p-6 overflow-hidden transition-all duration-500 group-hover:-translate-y-1.5 group-hover:border-orange-400/60`}
      >
        {/* Hover glow */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
             style={{ background: 'radial-gradient(circle at 30% 0%, rgba(251,146,60,0.18) 0%, transparent 60%)' }} />

        {/* Top row: status pill + group label */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold ${group.accent}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            disponibile · {group.label}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-orange-300 group-hover:translate-x-1 transition-all" />
        </div>

        {/* IPA + lexical set */}
        <div className="mt-6 mb-4 relative z-10">
          <p className="text-5xl md:text-6xl font-black text-white leading-none tracking-tight">
            /{phoneme.ipa}/
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400 font-semibold">
            {entry.subtitle}
            {phoneme.subcategory && (
              <span className="ml-2 text-slate-500 normal-case tracking-normal text-[11px]">
                · {phoneme.subcategory.replace('-', ' ')}
              </span>
            )}
          </p>
        </div>

        {/* Example words */}
        <div className="flex flex-wrap gap-1.5 mb-5 relative z-10">
          {(entry.words || []).map((w, i) => (
            <span key={i} className="px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-700 text-xs text-slate-300 group-hover:border-cyan-500/40 transition-colors">
              {w}
            </span>
          ))}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <span className="text-xs text-slate-400">
            {phoneme.commonWords?.length || 0} parole · {phoneme.exampleSentences?.length || 0} frasi
          </span>
          <ListenButton
            src={isoAudio}
            label={`Ascolta /${phoneme.ipa}/ ${dialect === 'AmE' ? 'in americano' : 'in britannico'}`}
            testId={`phoneme-library-listen-${entry.id}`}
          />
        </div>
      </div>
    </Link>
  );
};

// ------- Locked placeholder card -----------------------------------------
const LockedCard = ({ entry, group, index }) => (
  <div
    className="relative block cursor-not-allowed"
    data-testid={`phoneme-library-locked-${entry.id}`}
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className={`relative h-full rounded-3xl border border-dashed ${group.border} bg-slate-900/40 backdrop-blur-sm p-6 overflow-hidden opacity-65 transition-opacity hover:opacity-90`}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-slate-500">
          <Lock className="w-3 h-3" />
          in preparazione · {group.label}
        </span>
      </div>
      <p className="mt-6 mb-1 text-5xl md:text-6xl font-black text-slate-500 leading-none tracking-tight">
        /{entry.ipa}/
      </p>
      <p className="mt-2 mb-5 text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">
        {entry.subtitle}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(entry.words || []).map((w, i) => (
          <span key={i} className="px-2.5 py-1 rounded-full bg-slate-900/30 border border-slate-800 text-xs text-slate-500">{w}</span>
        ))}
      </div>
    </div>
  </div>
);

// ------- Global dialect toggle (US ⇄ UK) ---------------------------------
const DialectToggle = ({ dialect, onChange }) => (
  <div
    className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-900/70 border border-cyan-500/30 backdrop-blur-md shadow-lg"
    data-testid="library-dialect-toggle"
    role="tablist"
    aria-label="Variante di pronuncia"
  >
    {[
      { id: 'AmE', label: 'US', flag: '🇺🇸', sub: 'American English' },
      { id: 'RP',  label: 'UK', flag: '🇬🇧', sub: 'Received Pronunciation' },
    ].map((opt) => {
      const active = dialect === opt.id;
      return (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(opt.id)}
          data-testid={`library-dialect-${opt.id === 'AmE' ? 'us' : 'uk'}`}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
            active
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 shadow-[0_0_20px_rgba(251,146,60,0.45)]'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <span className="text-base leading-none">{opt.flag}</span>
          <span className="leading-none">{opt.label}</span>
          <span className={`hidden md:inline text-[10px] uppercase tracking-widest font-semibold ${active ? 'opacity-80' : 'opacity-50'}`}>
            {opt.sub}
          </span>
        </button>
      );
    })}
  </div>
);

// =========================================================================
const PhonemeLibraryPage = () => {
  const { dialect, setDialect } = useDialect();
  const [groupFilter, setGroupFilter] = useState('all');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const stats = useMemo(() => {
    const published = CATALOGUE.filter(e => e.status === 'published').length;
    const upcoming  = CATALOGUE.length - published;
    return { published, upcoming, total: CATALOGUE.length };
  }, []);

  const filtered = useMemo(
    () => groupFilter === 'all' ? CATALOGUE : CATALOGUE.filter(e => e.group === groupFilter),
    [groupFilter]
  );

  return (
    <div className="min-h-screen bg-[#04070d] text-slate-200" data-testid="phoneme-library-page">
      <style>{`
        @keyframes lib-fade-up { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform:none; } }
        .lib-card-enter      { animation: lib-fade-up .6s ease-out both; }
        @keyframes lib-pulse-aura {
          0%,100% { box-shadow: 0 0 0 0 rgba(251,146,60,0); }
          50%     { box-shadow: 0 0 48px 0 rgba(251,146,60,0.22); }
        }
        .lib-aura { animation: lib-pulse-aura 5s ease-in-out infinite; }
      `}</style>

      {/* Ambient drifting blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-[8%]  left-[6%]  w-96 h-96 bg-cyan-500/10  rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[4%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0  left-[35%] w-[28rem] h-[28rem] bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      {/* ---------- Sticky header ---------- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#04070d]/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 text-cyan-300 hover:text-white transition-colors" data-testid="library-home-link">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide">Vocal Fitness LMS</span>
          </Link>
          <DialectToggle dialect={dialect} onChange={setDialect} />
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs uppercase tracking-[0.22em] font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Phoneme Card Library
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.05] text-white mb-6">
            La biblioteca interattiva<br className="hidden md:block" />
            <span className="bg-gradient-to-r from-cyan-300 via-orange-300 to-violet-300 bg-clip-text text-transparent">
              dei fonemi inglesi.
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-9">
            Ogni card è uno studio articolatorio completo — sezione sagittale, hotspot anatomici, esempi audio nella voce del Prof. Steve Dapper, mnemonici e laboratorio Pink Trombone. Scegli la variante che ti interessa e inizia.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10" data-testid="library-stats">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-white">{stats.published}</p>
              <p className="text-[10px] uppercase tracking-widest text-cyan-300/70 font-bold">card pubblicate</p>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-white">{stats.upcoming}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">in arrivo</p>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-orange-300 flex items-center justify-center gap-2">
                <Globe className="w-6 h-6" />
                {dialect === 'AmE' ? 'US' : 'UK'}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-orange-200/70 font-bold">variante selezionata</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Group filter chips ---------- */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex flex-wrap items-center gap-2" data-testid="library-group-filter">
          {[{ id: 'all', label: 'Tutti', count: CATALOGUE.length, accent: 'text-white' }, ...GROUPS.map(g => ({
            id: g.id, label: g.label, count: CATALOGUE.filter(e => e.group === g.id).length, accent: g.accent
          }))].map((g) => {
            const active = groupFilter === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupFilter(g.id)}
                data-testid={`library-filter-${g.id}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${
                  active
                    ? 'bg-white text-slate-900 border-white shadow-lg scale-105'
                    : `bg-slate-900/50 border-slate-700 ${g.accent} hover:border-slate-500`
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${active ? 'text-slate-900' : 'opacity-70'}`} />
                {g.label}
                <span className={`text-[10px] font-bold ${active ? 'text-slate-500' : 'opacity-50'}`}>{g.count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- Catalogue grid ---------- */}
      <section className="max-w-7xl mx-auto px-6 pb-24" data-testid="library-grid">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((entry, i) => {
            const group = GROUPS.find(g => g.id === entry.group) || GROUPS[0];
            if (entry.status === 'published') {
              const phoneme = PHONEMES[entry.id];
              if (!phoneme) return null;
              return (
                <div key={entry.id} className="lib-card-enter h-full" style={{ animationDelay: `${i * 50}ms` }}>
                  <PublishedCard entry={entry} phoneme={phoneme} group={group} dialect={dialect} index={i} />
                </div>
              );
            }
            return (
              <div key={entry.id} className="lib-card-enter h-full" style={{ animationDelay: `${i * 50}ms` }}>
                <LockedCard entry={entry} group={group} index={i} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Recommended starting point ---------- */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-slate-900/20 p-8 md:p-10 overflow-hidden lib-aura">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(251,146,60,0.18) 0%, transparent 50%)' }} />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-orange-300 text-xs uppercase tracking-[0.22em] font-bold mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Da dove iniziare
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3">
                Prima volta? Inizia da <span className="text-orange-300">/ʊ/ FOOT</span>.
              </h2>
              <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                È la vocale meno frequente dell&rsquo;inglese, motivo per cui paradossalmente padroneggiarla diventa un differenziale fortissimo nella performance parlata. Card completa con 30 parole, 9 hotspot anatomici, Pink Trombone live.
              </p>
            </div>
            <Link
              to="/lms/phoneme/u-foot"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-900 font-bold shadow-[0_10px_30px_rgba(251,146,60,0.45)] hover:scale-105 transition-transform duration-300"
              data-testid="library-cta-u-foot"
            >
              <Volume2 className="w-5 h-5" />
              Apri /ʊ/ FOOT
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            Vocal Fitness LMS · Phoneme Library
          </p>
          <p>
            Variante corrente: <span className="text-cyan-300 font-bold">{dialect === 'AmE' ? 'US (American English)' : 'UK (Received Pronunciation)'}</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PhonemeLibraryPage;
