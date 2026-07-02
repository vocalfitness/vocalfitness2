import React from 'react';
import axios from 'axios';
import {
  Inbox, RefreshCw, Filter, Search, Loader2, X, Send,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * AdminLeadsTab — Lead inbox for the admin panel.
 *
 * Extracted from AdminPage.jsx to keep tab bodies focused. All state lives
 * in the parent AdminPage (single source of truth for cross-tab data); this
 * component receives its slice + handlers via props.
 *
 * Props contract:
 *   language        — 'it' | 'en' — from LanguageContext
 *   leads           — array of lead documents (already filtered server-side)
 *   leadsLoading    — bool, spinner state for fetch/re-fetch
 *   leadFilters     — object with the 7 filter fields
 *   setLeadFilters  — setter for leadFilters
 *   selectedLead    — currently opened lead (drawer) or null
 *   setSelectedLead — setter
 *   fetchLeads      — () => Promise<void>  refetch with current filters
 *   updateLead      — (leadId, patch)     PATCH /admin/leads/{id}
 *   backendUrl      — API base URL (for the inline templated email sender)
 *   token           — auth token (bearer)
 *   showToast       — (type, text) toast helper
 */
export const AdminLeadsTab = ({
  language,
  leads,
  leadsLoading,
  leadFilters,
  setLeadFilters,
  selectedLead,
  setSelectedLead,
  fetchLeads,
  updateLead,
  backendUrl,
  token,
  showToast,
}) => {
  return (
    <div data-testid="leads-panel">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-400" />
            {language === 'it' ? 'Lead Inbox' : 'Lead Inbox'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {language === 'it' ? 'Lead qualificati dal wizard onboarding e dal form classico' : 'Qualified leads from the onboarding wizard and classic form'} · {leads.length} {language === 'it' ? 'risultati' : 'results'}
          </p>
        </div>
        <Button onClick={fetchLeads} disabled={leadsLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${leadsLoading ? 'animate-spin' : ''}`} />
          {language === 'it' ? 'Aggiorna' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 text-slate-300 mb-3 text-sm font-semibold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-400" />
          {language === 'it' ? 'Filtri' : 'Filters'}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text" placeholder={language === 'it' ? 'Cerca nome, email...' : 'Search name, email...'}
              value={leadFilters.search}
              onChange={(e) => setLeadFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads(); }}
              className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
              data-testid="leads-filter-search"
            />
          </div>
          <select
            value={leadFilters.source}
            onChange={(e) => { setLeadFilters(prev => ({ ...prev, source: e.target.value })); }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            data-testid="leads-filter-source"
          >
            <option value="">{language === 'it' ? 'Tutte le sorgenti' : 'All sources'}</option>
            <option value="onboarding_wizard">Wizard</option>
            <option value="booking_form">Form classico</option>
          </select>
          <select
            value={leadFilters.englishLevel}
            onChange={(e) => setLeadFilters(prev => ({ ...prev, englishLevel: e.target.value }))}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            data-testid="leads-filter-level"
          >
            <option value="">CEFR</option>
            {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={leadFilters.role}
            onChange={(e) => setLeadFilters(prev => ({ ...prev, role: e.target.value }))}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            data-testid="leads-filter-role"
          >
            <option value="">{language === 'it' ? 'Ruolo' : 'Role'}</option>
            {['executive','manager','professional','sales','academic','student','entrepreneur','other'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input
            type="text" placeholder={language === 'it' ? 'Settore' : 'Sector'}
            value={leadFilters.sector}
            onChange={(e) => setLeadFilters(prev => ({ ...prev, sector: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads(); }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
            data-testid="leads-filter-sector"
          />
          <input
            type="text" placeholder={language === 'it' ? 'Lingua madre' : 'Native lang.'}
            value={leadFilters.nativeLanguage}
            onChange={(e) => setLeadFilters(prev => ({ ...prev, nativeLanguage: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads(); }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
            data-testid="leads-filter-native"
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <button
            onClick={() => { setLeadFilters({ source: '', englishLevel: '', role: '', sector: '', nativeLanguage: '', status: '', search: '' }); setTimeout(fetchLeads, 0); }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
            data-testid="leads-filter-clear"
          >
            {language === 'it' ? 'Pulisci filtri' : 'Clear filters'}
          </button>
          <Button onClick={fetchLeads} size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" data-testid="leads-apply-filters">
            {language === 'it' ? 'Applica filtri' : 'Apply filters'}
          </Button>
        </div>
      </div>

      {/* Leads list */}
      {leadsLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/40 border border-slate-700 rounded-xl">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">{language === 'it' ? 'Nessun lead trovato' : 'No leads found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const isWizard = lead.source === 'onboarding_wizard';
            const cefrColor = {
              A1: 'bg-slate-600', A2: 'bg-slate-500',
              B1: 'bg-blue-600', B2: 'bg-blue-500',
              C1: 'bg-emerald-600', C2: 'bg-emerald-500'
            }[lead.englishLevel] || 'bg-slate-700';
            const statusColor = {
              pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              contacted: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
              qualified: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              closed: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
            }[lead.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';

            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-4 cursor-pointer transition-all"
                data-testid={`lead-row-${lead.id}`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Source badge */}
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md ${isWizard ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-slate-600/40 text-slate-300 border border-slate-600/60'}`}>
                    {isWizard ? 'Wizard' : 'Form'}
                  </span>
                  {/* CEFR badge */}
                  {lead.englishLevel && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md text-white ${cefrColor}`}>
                      {lead.englishLevel}
                    </span>
                  )}
                  {/* Name + email */}
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-white font-semibold text-sm">{lead.name}</p>
                    <p className="text-slate-400 text-xs">{lead.email}</p>
                  </div>
                  {/* Role */}
                  {lead.role && (
                    <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-md capitalize">{lead.role}</span>
                  )}
                  {/* Sector */}
                  {lead.sector && (
                    <span className="text-xs text-slate-400 hidden md:inline truncate max-w-[180px]">{lead.sector}</span>
                  )}
                  {/* Native lang */}
                  {lead.nativeLanguage && (
                    <span className="text-xs text-slate-400 hidden lg:inline">{lead.nativeLanguage}</span>
                  )}
                  {/* Status */}
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${statusColor}`}>
                    {lead.status || 'pending'}
                  </span>
                  {/* Date */}
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    {new Date(lead.created_at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead detail drawer */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedLead(null); }}
          data-testid="lead-detail-drawer"
        >
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{selectedLead.name}</h3>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Email', selectedLead.email],
                [language === 'it' ? 'Telefono' : 'Phone', selectedLead.phone],
                ['CEFR', selectedLead.englishLevel],
                [language === 'it' ? 'Ruolo' : 'Role', selectedLead.role],
                [language === 'it' ? 'Settore' : 'Sector', selectedLead.sector],
                [language === 'it' ? 'Lingua madre' : 'Native lang.', selectedLead.nativeLanguage],
                [language === 'it' ? 'Sorgente' : 'Source', selectedLead.source],
                [language === 'it' ? 'Creato' : 'Created', new Date(selectedLead.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US')],
              ].map(([k, v]) => v && (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-800 pb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">{k}</span>
                  <span className="text-white text-right break-words">{String(v)}</span>
                </div>
              ))}
              {selectedLead.motivation && (
                <div className="border-b border-slate-800 pb-2">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{language === 'it' ? 'Obiettivo' : 'Goal'}</p>
                  <p className="text-white text-sm leading-relaxed">{selectedLead.motivation}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{language === 'it' ? 'Cambia stato' : 'Update status'}</p>
              <div className="grid grid-cols-2 gap-2">
                {['pending','contacted','qualified','closed'].map(s => (
                  <Button
                    key={s} size="sm"
                    onClick={() => updateLead(selectedLead.id, { status: s })}
                    className={`${selectedLead.status === s ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} text-white text-xs capitalize`}
                    data-testid={`lead-status-${s}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>

              <a
                href={`mailto:${selectedLead.email}?subject=${encodeURIComponent('VocalFitness — Diagnostic Assessment')}`}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {language === 'it' ? 'Apri client email' : 'Open mail client'}
              </a>

              {/* Templated email sender */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                  {language === 'it' ? 'Invia email da template' : 'Send templated email'}
                </p>
                <p className="text-[11px] text-slate-500 mb-3">
                  {language === 'it' ? 'Variabili auto-sostituite: {{name}}, {{englishLevel}}, {{role}}, {{sector}}' : 'Auto-substituted variables: {{name}}, {{englishLevel}}, {{role}}, {{sector}}'}
                </p>
                <div className="space-y-2">
                  {[
                    { key: 'welcome', en: 'Welcome onboarding', it: 'Benvenuto onboarding' },
                    { key: 'followup', en: 'Follow-up after 48h', it: 'Follow-up dopo 48h' },
                    { key: 'proposal', en: 'Custom proposal request', it: 'Richiesta proposta su misura' }
                  ].map(tpl => (
                    <Button
                      key={tpl.key}
                      onClick={async () => {
                        if (!window.confirm(language === 'it' ? `Inviare email "${tpl.it}" a ${selectedLead.email}?` : `Send "${tpl.en}" email to ${selectedLead.email}?`)) return;
                        try {
                          const res = await axios.post(
                            `${backendUrl}/api/admin/leads/${selectedLead.id}/email`,
                            { template: tpl.key, language },
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          showToast('success', language === 'it' ? `Email inviata: ${res.data.subject}` : `Email sent: ${res.data.subject}`);
                          // Refresh selected lead from backend so drawer shows the new touch + updated status immediately
                          try {
                            const refreshed = await axios.get(
                              `${backendUrl}/api/admin/leads?search=${encodeURIComponent(selectedLead.email)}`,
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            const updated = (refreshed.data?.items || []).find(l => l.id === selectedLead.id);
                            if (updated) setSelectedLead(updated);
                          } catch { /* ignore */ }
                          fetchLeads();
                        } catch (e) {
                          showToast('error', e.response?.data?.detail || (language === 'it' ? 'Invio fallito' : 'Send failed'));
                        }
                      }}
                      className="w-full justify-start bg-blue-600/80 hover:bg-blue-600 text-white text-sm"
                      data-testid={`lead-template-${tpl.key}`}
                    >
                      <Send className="w-3.5 h-3.5 mr-2" />
                      {language === 'it' ? tpl.it : tpl.en}
                    </Button>
                  ))}
                </div>

                {/* Touch history */}
                {selectedLead.touches && selectedLead.touches.length > 0 && (
                  <div className="mt-5">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                      {language === 'it' ? 'Cronologia contatti' : 'Touch history'}
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedLead.touches.slice().reverse().map((t, i) => (
                        <div key={i} className="text-xs bg-slate-800/60 rounded px-3 py-2 border border-slate-700/40">
                          <div className="flex justify-between text-slate-500">
                            <span>{t.template || t.type}</span>
                            <span>{new Date(t.at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-300 mt-0.5 truncate">{t.subject}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
