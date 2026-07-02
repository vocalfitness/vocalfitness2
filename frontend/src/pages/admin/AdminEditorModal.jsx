import React from 'react';
import {
  X, Upload, Loader2, CheckCircle, FileText, User, Building2, ExternalLink,
  UserCheck, ClipboardList, Briefcase, ChevronUp, ChevronDown, Youtube,
  Save, MessageSquare,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * AdminEditorModal — single modal shell for all admin CRUD forms.
 *
 * Handles 10 modal variants driven by ``showModal``:
 *   - create-folder | edit-folder
 *   - create-content | edit-content
 *   - create-user | edit-user
 *   - import-youtube | edit-youtube-users
 *   - create-popup | edit-popup
 *
 * All state lives in the parent `AdminPage`. This component is a pure
 * presentational shell that dispatches the correct submit handler based
 * on the current `showModal` value.
 */
export const AdminEditorModal = ({
  // State
  showModal, editItem, formData, submitting, youtubeImporting, crmSections,
  isUploading, uploadProgress, thumbnailUploading,
  popupMediaUploading, popupMediaProgress,
  // Refs
  fileInputRef, thumbnailFileInputRef, popupFileInputRef,
  // Setters
  setShowModal, setEditItem, setFormData, toggleCrmSection,
  // Data
  folders, clientUsers, language, t,
  // Upload handlers
  handleFileUpload, handleCustomThumbnailUpload, handlePopupMediaUpload,
  autoGenerateThumbnailFromUrl, toggleUserSelection,
  // Submit handlers
  handleCreateFolder, handleUpdateFolder,
  handleCreateContent, handleUpdateContent,
  handleCreateUser, handleUpdateUser,
  handleImportYoutubePlaylist, handleUpdatePlaylistUsers,
  handleCreatePopup, handleUpdatePopup,
}) => {
  if (!showModal) return null;

  const close = () => { setShowModal(null); setEditItem(null); setFormData({}); };

  const submit = () => {
    if (showModal === 'create-folder')          handleCreateFolder();
    else if (showModal === 'edit-folder')       handleUpdateFolder();
    else if (showModal === 'create-content')    handleCreateContent();
    else if (showModal === 'edit-content')      handleUpdateContent();
    else if (showModal === 'create-user')       handleCreateUser();
    else if (showModal === 'edit-user')         handleUpdateUser();
    else if (showModal === 'import-youtube')    handleImportYoutubePlaylist();
    else if (showModal === 'edit-youtube-users') handleUpdatePlaylistUsers(editItem?.id);
    else if (showModal === 'create-popup')      handleCreatePopup();
    else if (showModal === 'edit-popup')        handleUpdatePopup();
  };

  const submitBtnClass =
    showModal === 'import-youtube' ? 'bg-red-600 hover:bg-red-700'
    : showModal.includes('popup') ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {showModal === 'create-folder' && 'Nuova Cartella'}
            {showModal === 'edit-folder' && 'Modifica Cartella'}
            {showModal === 'create-content' && 'Nuovo Contenuto'}
            {showModal === 'edit-content' && 'Modifica Contenuto'}
            {showModal === 'create-user' && 'Nuovo Utente'}
            {showModal === 'edit-user' && (language === 'it' ? 'Modifica Utente' : 'Edit User')}
            {showModal === 'import-youtube' && 'Importa Playlist YouTube'}
            {showModal === 'edit-youtube-users' && 'Modifica Utenti Playlist'}
            {showModal === 'create-popup' && (language === 'it' ? 'Nuovo Messaggio Pop-up' : 'New Pop-up Message')}
            {showModal === 'edit-popup' && (language === 'it' ? 'Modifica Messaggio Pop-up' : 'Edit Pop-up Message')}
          </h3>
          <Button onClick={close} variant="ghost" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* =================== FOLDER FORM =================== */}
          {(showModal === 'create-folder' || showModal === 'edit-folder') && (
            <>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nome Cartella *</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Es: Corso Base" data-testid="folder-name-input" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Descrizione</label>
                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={2} placeholder="Descrizione della cartella..." />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">URL Immagine (opzionale)</label>
                <input type="url" value={formData.thumbnail_url || ''} onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="https://..." />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_public !== false} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-slate-300">Pubblica (visibile a tutti i clienti)</span>
                </label>
              </div>
              {!formData.is_public && clientUsers.length > 0 && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Assegna a clienti specifici</label>
                  <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                    {clientUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                        <input type="checkbox" checked={(formData.assigned_users || []).includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 rounded" />
                        <span className="text-white">{u.full_name || u.username}</span>
                        <span className="text-slate-400 text-sm">({u.email || u.username})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Ordine</label>
                <input type="number" value={formData.order || 0} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              </div>
            </>
          )}

          {/* =================== CONTENT FORM =================== */}
          {(showModal === 'create-content' || showModal === 'edit-content') && (
            <>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Titolo *</label>
                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Es: Lezione 1" data-testid="content-title-input" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Descrizione</label>
                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{language === 'it' ? 'Tipo *' : 'Type *'}</label>
                  <select value={formData.content_type || 'video'} onChange={e => setFormData({ ...formData, content_type: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" data-testid="content-type-select">
                    <option value="video">🎬 Video (YouTube, Google Drive, MP4)</option>
                    <option value="audio">🎵 Audio (MP3, Google Drive)</option>
                    <option value="pdf">📄 PDF / Documento</option>
                    <option value="embed">📦 Embed Code (iframe, Gamma, ecc.)</option>
                    <option value="link">🔗 Link esterno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{language === 'it' ? 'Cartella' : 'Folder'}</label>
                  <select value={formData.folder_id || ''} onChange={e => setFormData({ ...formData, folder_id: e.target.value || null })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                    <option value="">{language === 'it' ? '— Nessuna cartella —' : '— No folder —'}</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              {formData.content_type === 'embed' && (
                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50">
                  <label className="block text-sm text-slate-300 mb-2">{language === 'it' ? 'Codice Embed *' : 'Embed Code *'}</label>
                  <textarea value={formData.embed_code || ''} onChange={e => setFormData({ ...formData, embed_code: e.target.value, hide_origin: true })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm" rows={4} placeholder='<iframe src="https://..." ...></iframe>' />
                  <p className="text-xs text-slate-400 mt-2">
                    {language === 'it'
                      ? "Incolla il codice embed completo (es. da Gamma, Canva, Google Slides). L'origine sarà nascosta automaticamente."
                      : 'Paste the complete embed code (e.g. from Gamma, Canva, Google Slides). Origin will be hidden automatically.'}
                  </p>
                </div>
              )}

              {formData.content_type !== 'embed' && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">{language === 'it' ? 'Carica File' : 'Upload File'}</label>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center ${isUploading ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-blue-500/50'}`}>
                    {isUploading ? (
                      <div className="space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
                        <div className="w-full bg-slate-600 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${uploadProgress}%` }} /></div>
                        <p className="text-sm text-blue-300">{uploadProgress}%</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                        <input ref={fileInputRef} type="file" accept=".mp4,.webm,.mov,.mp3,.wav,.ogg,.pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden" />
                        <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300">{language === 'it' ? 'Seleziona File' : 'Select File'}</Button>
                        <p className="text-xs text-slate-500 mt-1">Max 100MB</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {formData.content_type !== 'embed' && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1">URL {language === 'it' ? 'Contenuto' : 'Content'} *</label>
                  <div className="relative">
                    <input type="url" value={formData.url || ''} onChange={e => setFormData({ ...formData, url: e.target.value })} onBlur={e => { if (e.target.value && !formData.thumbnail_url) autoGenerateThumbnailFromUrl(e.target.value); }} className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white ${formData.url ? 'border-green-500' : 'border-slate-600'}`} placeholder="https://..." data-testid="content-url-input" />
                    {formData.url && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                  </div>
                </div>
              )}

              {formData.content_type === 'embed' && !formData.url && (
                <input type="hidden" value="embed://content" />
              )}

              {/* Thumbnail Preview & Custom Upload */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <label className="block text-sm text-slate-300 mb-2 font-medium">{language === 'it' ? 'Anteprima / Cover' : 'Thumbnail / Cover'}</label>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                    {formData.thumbnail_url ? (
                      <img src={formData.thumbnail_url} alt="preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className={`w-full h-full items-center justify-center text-slate-500 ${formData.thumbnail_url ? 'hidden' : 'flex'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {formData.thumbnail_url && (
                      <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'it' ? 'Anteprima generata' : 'Thumbnail generated'}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <input ref={thumbnailFileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => handleCustomThumbnailUpload(e.target.files[0])} className="hidden" />
                      <Button type="button" onClick={() => thumbnailFileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300 text-xs" disabled={thumbnailUploading} data-testid="custom-thumbnail-upload">
                        {thumbnailUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                        {language === 'it' ? 'Cover personalizzata' : 'Custom cover'}
                      </Button>
                      {formData.thumbnail_url && (
                        <Button type="button" onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: '' }))} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs">
                          <X className="w-3 h-3 mr-1" /> {language === 'it' ? 'Rimuovi' : 'Remove'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{language === 'it' ? "Auto-generata dal file o link. Puoi sovrascriverla con un'immagine personalizzata." : 'Auto-generated from file or link. You can override with a custom image.'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_public !== false} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-slate-300">{language === 'it' ? 'Pubblico (visibile a tutti)' : 'Public (visible to all)'}</span>
                </label>
              </div>

              {!formData.is_public && clientUsers.length > 0 && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">{language === 'it' ? 'Assegna a clienti specifici' : 'Assign to specific clients'}</label>
                  <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                    {clientUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                        <input type="checkbox" checked={(formData.assigned_users || []).includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 rounded" />
                        <span className="text-white">{u.full_name || u.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* =================== USER FORM (CREATE + EDIT) =================== */}
          {(showModal === 'create-user' || showModal === 'edit-user') && (
            <>
              {showModal === 'create-user' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Username *</label>
                    <input type="text" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="es: mario.rossi" data-testid="user-username-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Password *</label>
                    <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" data-testid="user-password-input" />
                  </div>
                </div>
              )}
              {showModal === 'edit-user' && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{language === 'it' ? 'Nuova Password (lascia vuoto per non cambiare)' : 'New Password (leave empty to keep)'}</label>
                  <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="••••••••" />
                </div>
              )}

              {/* ── ANAGRAFICA ── */}
              <div className="bg-slate-700/20 rounded-lg border border-slate-600/30 overflow-hidden">
                <button type="button" onClick={() => toggleCrmSection('anagrafica')} className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {language === 'it' ? 'Anagrafica' : 'Personal Info'}</p>
                  {crmSections.anagrafica ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {crmSections.anagrafica && <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Nome Completo' : 'Full Name'}</label>
                      <input type="text" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="Mario Rossi" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Email</label>
                      <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="mario@email.com" data-testid="user-email-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Telefono' : 'Phone'}</label>
                      <input type="tel" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="+39 333 123 4567" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">WhatsApp</label>
                      <input type="tel" value={formData.whatsapp || ''} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="+39 333 123 4567" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Data Nascita' : 'DOB'}</label>
                      <input type="date" value={formData.date_of_birth || ''} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Indirizzo' : 'Address'}</label>
                    <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="Via Roma 1" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Città' : 'City'}</label>
                      <input type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="Roma" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Prov.' : 'Prov.'}</label>
                      <input type="text" value={formData.province || ''} onChange={e => setFormData({ ...formData, province: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="RM" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">CAP</label>
                      <input type="text" value={formData.postal_code || ''} onChange={e => setFormData({ ...formData, postal_code: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="00100" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Paese' : 'Country'}</label>
                      <input type="text" value={formData.country || 'Italia'} onChange={e => setFormData({ ...formData, country: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Codice Fiscale' : 'Tax Code'}</label>
                      <input type="text" value={formData.fiscal_code || ''} onChange={e => setFormData({ ...formData, fiscal_code: e.target.value.toUpperCase() })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" placeholder="RSSMRA80A01H501Q" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Tipo Cliente' : 'Client Type'}</label>
                      <select value={formData.client_type || 'private'} onChange={e => setFormData({ ...formData, client_type: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="private">{language === 'it' ? 'Privato' : 'Private'}</option>
                        <option value="business">{language === 'it' ? 'Business / Azienda' : 'Business'}</option>
                        <option value="foreign">{language === 'it' ? 'Estero' : 'Foreign'}</option>
                      </select>
                    </div>
                  </div>
                </div>}
              </div>

              {/* ── DATI AZIENDALI ── */}
              {(formData.client_type === 'business' || formData.client_type === 'foreign') && (
                <div className="bg-amber-500/5 rounded-lg border border-amber-500/20 overflow-hidden">
                  <button type="button" onClick={() => toggleCrmSection('azienda')} className="w-full p-4 flex items-center justify-between hover:bg-amber-500/10 transition-colors">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {language === 'it' ? 'Dati Aziendali' : 'Business Data'}</p>
                    {crmSections.azienda ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
                  </button>
                  {crmSections.azienda && <div className="px-4 pb-4 space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Ragione Sociale' : 'Company Name'}</label>
                      <input type="text" value={formData.company_name || ''} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">P.IVA / VAT</label>
                        <input type="text" value={formData.vat_number || ''} onChange={e => setFormData({ ...formData, vat_number: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" placeholder="IT12345678901" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Codice Univoco SDI' : 'SDI Code'}</label>
                        <input type="text" value={formData.sdi_code || ''} onChange={e => setFormData({ ...formData, sdi_code: e.target.value.toUpperCase() })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" placeholder="0000000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">PEC</label>
                        <input type="email" value={formData.pec || ''} onChange={e => setFormData({ ...formData, pec: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="azienda@pec.it" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Website</label>
                        <input type="url" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="https://..." />
                      </div>
                    </div>
                  </div>}
                </div>
              )}

              {/* ── SOCIAL & DIGITAL ── */}
              <div className="bg-purple-500/5 rounded-lg border border-purple-500/20 overflow-hidden">
                <button type="button" onClick={() => toggleCrmSection('social')} className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-colors">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Social & Web</p>
                  {crmSections.social ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                </button>
                {crmSections.social && <div className="px-4 pb-4 space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Sito Web Personale' : 'Personal Website'}</label>
                    <input type="url" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="https://miosito.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Instagram</label>
                      <input type="text" value={formData.instagram || ''} onChange={e => setFormData({ ...formData, instagram: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Facebook</label>
                      <input type="text" value={formData.facebook || ''} onChange={e => setFormData({ ...formData, facebook: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="facebook.com/..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">LinkedIn</label>
                      <input type="text" value={formData.linkedin || ''} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="linkedin.com/in/..." />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">TikTok</label>
                      <input type="text" value={formData.tiktok || ''} onChange={e => setFormData({ ...formData, tiktok: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">YouTube</label>
                      <input type="text" value={formData.youtube || ''} onChange={e => setFormData({ ...formData, youtube: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@channel" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">X (Twitter)</label>
                      <input type="text" value={formData.twitter || ''} onChange={e => setFormData({ ...formData, twitter: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Telegram</label>
                      <input type="text" value={formData.telegram || ''} onChange={e => setFormData({ ...formData, telegram: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">{language === 'it' ? 'Ci segue su:' : 'Follows us on:'}</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'follows_instagram', label: 'Instagram' },
                        { key: 'follows_facebook', label: 'Facebook' },
                        { key: 'follows_youtube', label: 'YouTube' },
                        { key: 'follows_tiktok', label: 'TikTok' },
                      ].map(s => (
                        <label key={s.key} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={formData[s.key] || false} onChange={e => setFormData({ ...formData, [s.key]: e.target.checked })} className="w-3.5 h-3.5 rounded" />
                          <span className="text-xs text-slate-300">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>}
              </div>

              {/* ── MARKETING & CRM ── */}
              <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/20 overflow-hidden">
                <button type="button" onClick={() => toggleCrmSection('marketing')} className="w-full p-4 flex items-center justify-between hover:bg-emerald-500/10 transition-colors">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Marketing & CRM</p>
                  {crmSections.marketing ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
                </button>
                {crmSections.marketing && <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Stato Cliente' : 'Client Status'}</label>
                      <select value={formData.client_status || 'active'} onChange={e => setFormData({ ...formData, client_status: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="lead">Lead</option>
                        <option value="prospect">Prospect</option>
                        <option value="active">{language === 'it' ? 'Attivo' : 'Active'}</option>
                        <option value="inactive">{language === 'it' ? 'Inattivo' : 'Inactive'}</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Livello Engagement' : 'Engagement Level'}</label>
                      <select value={formData.engagement_level || ''} onChange={e => setFormData({ ...formData, engagement_level: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="">-</option>
                        <option value="cold">{language === 'it' ? 'Freddo' : 'Cold'}</option>
                        <option value="warm">{language === 'it' ? 'Tiepido' : 'Warm'}</option>
                        <option value="hot">{language === 'it' ? 'Caldo' : 'Hot'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Come ci ha trovato' : 'Lead Source'}</label>
                      <select value={formData.lead_source || ''} onChange={e => setFormData({ ...formData, lead_source: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="">-</option>
                        <option value="google">Google</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="referral">{language === 'it' ? 'Passaparola' : 'Referral'}</option>
                        <option value="event">{language === 'it' ? 'Evento' : 'Event'}</option>
                        <option value="website">Website</option>
                        <option value="other">{language === 'it' ? 'Altro' : 'Other'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Referente / Segnalato da' : 'Referred by'}</label>
                      <input type="text" value={formData.referral || ''} onChange={e => setFormData({ ...formData, referral: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'Nome referente' : 'Referrer name'} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Contatto Preferito' : 'Preferred Contact'}</label>
                      <select value={formData.preferred_contact || ''} onChange={e => setFormData({ ...formData, preferred_contact: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="">-</option>
                        <option value="email">Email</option>
                        <option value="phone">{language === 'it' ? 'Telefono' : 'Phone'}</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="instagram">Instagram DM</option>
                        <option value="telegram">Telegram</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Ultimo Contatto' : 'Last Contact'}</label>
                      <input type="date" value={formData.last_contact_date || ''} onChange={e => setFormData({ ...formData, last_contact_date: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Interessi / Obiettivi' : 'Interests / Goals'}</label>
                    <input type="text" value={formData.interests || ''} onChange={e => setFormData({ ...formData, interests: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'es: canto, dizione, public speaking' : 'e.g.: singing, diction, public speaking'} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Tag (separati da virgola)' : 'Tags (comma-separated)'}</label>
                    <input type="text" value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'es: principiante, cantante, corso-base' : 'e.g.: beginner, singer, basic-course'} />
                  </div>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={formData.marketing_email_consent || false} onChange={e => setFormData({ ...formData, marketing_email_consent: e.target.checked })} className="w-3.5 h-3.5 rounded" />
                      <span className="text-xs text-slate-300">{language === 'it' ? 'Consenso email marketing' : 'Email marketing consent'}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={formData.marketing_sms_consent || false} onChange={e => setFormData({ ...formData, marketing_sms_consent: e.target.checked })} className="w-3.5 h-3.5 rounded" />
                      <span className="text-xs text-slate-300">{language === 'it' ? 'Consenso SMS marketing' : 'SMS marketing consent'}</span>
                    </label>
                  </div>
                </div>}
              </div>

              {/* ── NOTE & ACQUISTI ── */}
              <div className="bg-slate-700/20 rounded-lg border border-slate-600/30 overflow-hidden">
                <button type="button" onClick={() => toggleCrmSection('notes')} className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> {language === 'it' ? 'Note & Storico' : 'Notes & History'}</p>
                  {crmSections.notes ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {crmSections.notes && <div className="px-4 pb-4 space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Note Admin' : 'Admin Notes'}</label>
                    <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Storico Acquisti' : 'Purchase History'}</label>
                    <textarea value={formData.purchase_history || ''} onChange={e => setFormData({ ...formData, purchase_history: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" rows={2} placeholder={language === 'it' ? 'Es: Corso Base - 01/2026 - 500EUR' : 'E.g.: Basic Course - 01/2026 - 500EUR'} />
                  </div>
                </div>}
              </div>

              {/* ── RUOLO UTENTE ── */}
              <div className="bg-cyan-500/5 rounded-lg p-4 border border-cyan-500/20">
                <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 mb-3"><Briefcase className="w-3.5 h-3.5" /> {language === 'it' ? 'Ruolo Sistema' : 'System Role'}</label>
                <select value={formData.role || 'client'} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" data-testid="user-role-select">
                  <option value="lead">📝 Lead</option>
                  <option value="client">👤 {language === 'it' ? 'Cliente' : 'Client'}</option>
                  <option value="collaborator">🤝 {language === 'it' ? 'Collaboratore' : 'Collaborator'}</option>
                  <option value="editor">✏️ Editor</option>
                  <option value="manager">📊 Manager</option>
                  <option value="admin">🔐 Admin</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  {language === 'it'
                    ? '• Lead/Cliente: accesso area clienti • Collaboratore/Editor: accesso limitato admin • Manager/Admin: accesso completo'
                    : '• Lead/Client: client area access • Collaborator/Editor: limited admin • Manager/Admin: full access'}
                </p>
              </div>
            </>
          )}

          {/* =================== YOUTUBE IMPORT FORM =================== */}
          {showModal === 'import-youtube' && (
            <>
              <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/50 mb-4">
                <div className="flex items-center gap-2 text-red-300 mb-2">
                  <Youtube className="w-5 h-5" />
                  <span className="font-medium">Importazione Playlist</span>
                </div>
                <p className="text-sm text-slate-400">
                  Incolla l&apos;URL di una playlist YouTube. Verrà creata una cartella con tutti i video della playlist.
                </p>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">URL Playlist YouTube *</label>
                <input type="url" value={formData.playlist_url || ''} onChange={e => setFormData({ ...formData, playlist_url: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="https://www.youtube.com/playlist?list=..." data-testid="youtube-url-input" />
                <p className="text-xs text-slate-500 mt-1">Es: https://www.youtube.com/playlist?list=PLxxxxxx</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_public === true} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-slate-300">Pubblica (visibile a tutti i clienti)</span>
                </label>
              </div>
              {!formData.is_public && clientUsers.length > 0 && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Assegna a clienti specifici</label>
                  <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                    {clientUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                        <input type="checkbox" checked={(formData.assigned_users || []).includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 rounded" />
                        <span className="text-white">{u.full_name || u.username}</span>
                        <span className="text-slate-400 text-sm">({u.email || u.username})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* =================== YOUTUBE EDIT USERS FORM =================== */}
          {showModal === 'edit-youtube-users' && editItem && (
            <>
              <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50 mb-4">
                <p className="text-sm text-slate-300">
                  Modifica gli utenti assegnati alla playlist <strong className="text-white">{editItem.playlist_title || editItem.folder_name}</strong>.
                  Le modifiche si applicheranno alla cartella e a tutti i video.
                </p>
              </div>
              {clientUsers.length > 0 ? (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Seleziona clienti</label>
                  <div className="max-h-60 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                    {clientUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                        <input type="checkbox" checked={(formData.assigned_users || []).includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 rounded" />
                        <span className="text-white">{u.full_name || u.username}</span>
                        <span className="text-slate-400 text-sm">({u.email || u.username})</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">Nessun cliente disponibile. Crea prima un utente cliente.</p>
              )}
            </>
          )}

          {/* =================== POPUP MESSAGE FORM =================== */}
          {(showModal === 'create-popup' || showModal === 'edit-popup') && (
            <>
              <div>
                <label className="block text-sm text-slate-300 mb-1">{t.popupTitle} *</label>
                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder={language === 'it' ? 'Es: Offerta Speciale!' : 'E.g.: Special Offer!'} data-testid="popup-title-input" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">{t.popupType} *</label>
                <select value={formData.message_type || 'text'} onChange={e => setFormData({ ...formData, message_type: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" data-testid="popup-type-select">
                  <option value="text">{t.popupTypeText}</option>
                  <option value="audio">{t.popupTypeAudio}</option>
                  <option value="video">{t.popupTypeVideo}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">{t.popupContent}</label>
                <textarea value={formData.content || ''} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={3} placeholder={language === 'it' ? 'Testo del messaggio...' : 'Message text...'} data-testid="popup-content-input" />
              </div>

              {(formData.message_type === 'audio' || formData.message_type === 'video') && (
                <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50 space-y-3">
                  <label className="block text-sm text-slate-300 font-medium">{t.popupMediaOption}</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="mediaOption" checked={formData.popupMediaOption === 'upload'} onChange={() => setFormData({ ...formData, popupMediaOption: 'upload' })} className="w-4 h-4" />
                      <span className="text-slate-300 text-sm">{t.popupMediaUpload}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="mediaOption" checked={formData.popupMediaOption !== 'upload'} onChange={() => setFormData({ ...formData, popupMediaOption: 'link' })} className="w-4 h-4" />
                      <span className="text-slate-300 text-sm">{t.popupMediaLink}</span>
                    </label>
                  </div>

                  {formData.popupMediaOption === 'upload' ? (
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center ${popupMediaUploading ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 hover:border-amber-500/50'}`}>
                      {popupMediaUploading ? (
                        <div className="space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                          <div className="w-full bg-slate-600 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: `${popupMediaProgress}%` }} /></div>
                          <p className="text-sm text-amber-300">{popupMediaProgress}%</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                          <input ref={popupFileInputRef} type="file" accept={formData.message_type === 'audio' ? '.mp3,.wav,.ogg,.m4a,.aac' : '.mp4,.webm,.mov,.avi,.mkv'} onChange={(e) => handlePopupMediaUpload(e.target.files[0])} className="hidden" />
                          <Button type="button" onClick={() => popupFileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300">{t.popupUploadMedia}</Button>
                          <p className="text-xs text-slate-500 mt-1">Max 100MB</p>
                          {formData.media_url && <p className="text-xs text-green-400 mt-2 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> File caricato</p>}
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">{t.popupMediaUrl}</label>
                        <input type="url" value={formData.media_url || ''} onChange={e => setFormData({ ...formData, media_url: e.target.value })} onBlur={e => { if (e.target.value && !formData.thumbnail_url) autoGenerateThumbnailFromUrl(e.target.value); }} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder={t.popupMediaUrlPlaceholder} data-testid="popup-media-url-input" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">{t.popupEmbedCode}</label>
                        <textarea value={formData.embed_code || ''} onChange={e => setFormData({ ...formData, embed_code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-xs" rows={3} placeholder={t.popupEmbedPlaceholder} data-testid="popup-embed-input" />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Popup Thumbnail / Cover */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <label className="block text-sm text-slate-300 mb-2 font-medium">{language === 'it' ? 'Anteprima / Cover Pop-up' : 'Popup Thumbnail / Cover'}</label>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                    {formData.thumbnail_url ? (
                      <img src={formData.thumbnail_url} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <MessageSquare className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    {formData.thumbnail_url && (
                      <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'it' ? 'Cover impostata' : 'Cover set'}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <input ref={thumbnailFileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => handleCustomThumbnailUpload(e.target.files[0])} className="hidden" />
                      <Button type="button" onClick={() => thumbnailFileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300 text-xs" disabled={thumbnailUploading} data-testid="popup-custom-thumbnail-upload">
                        {thumbnailUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                        {language === 'it' ? 'Cover personalizzata' : 'Custom cover'}
                      </Button>
                      {formData.thumbnail_url && (
                        <Button type="button" onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: '' }))} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs">
                          <X className="w-3 h-3 mr-1" /> {language === 'it' ? 'Rimuovi' : 'Remove'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t.popupButtonText}</label>
                  <input type="text" value={formData.button_text || ''} onChange={e => setFormData({ ...formData, button_text: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder={language === 'it' ? 'Es: Scopri di più' : 'E.g.: Learn More'} />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t.popupButtonUrl}</label>
                  <input type="url" value={formData.button_url || ''} onChange={e => setFormData({ ...formData, button_url: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="https://..." />
                </div>
              </div>

              {/* Target users */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">{t.popupTarget}</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetOption" checked={!formData.target_users || formData.target_users.length === 0} onChange={() => setFormData({ ...formData, target_users: [] })} className="w-4 h-4" />
                    <span className="text-slate-300 text-sm">{t.popupTargetAll}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetOption" checked={formData.target_users && formData.target_users.length > 0} onChange={() => setFormData({ ...formData, target_users: formData.target_users?.length > 0 ? formData.target_users : ['_select'] })} className="w-4 h-4" />
                    <span className="text-slate-300 text-sm">{t.popupTargetSpecific}</span>
                  </label>
                </div>
                {formData.target_users && formData.target_users.length > 0 && clientUsers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                    {clientUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                        <input type="checkbox" checked={formData.target_users.includes(u.id)} onChange={() => {
                          const current = formData.target_users.filter(id => id !== '_select');
                          if (current.includes(u.id)) {
                            const next = current.filter(id => id !== u.id);
                            setFormData({ ...formData, target_users: next.length > 0 ? next : [] });
                          } else {
                            setFormData({ ...formData, target_users: [...current, u.id] });
                          }
                        }} className="w-4 h-4 rounded" />
                        <span className="text-white">{u.full_name || u.username}</span>
                        <span className="text-slate-400 text-sm">({u.email || u.username})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <Button onClick={close} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">Annulla</Button>
          <Button onClick={submit} disabled={submitting || youtubeImporting} className={submitBtnClass} data-testid="save-button">
            {(submitting || youtubeImporting) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {showModal === 'import-youtube' ? 'Importa' : 'Salva'}
          </Button>
        </div>
      </div>
    </div>
  );
};
