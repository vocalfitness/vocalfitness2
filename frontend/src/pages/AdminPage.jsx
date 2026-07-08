import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Users, FolderOpen, Plus, Trash2, Edit,
  Loader2, Video, FileText, Music, Link as LinkIcon,
  Save, X, Upload, CheckCircle, AlertCircle, HardDrive,
  Folder, Eye, EyeOff, UserCheck, Youtube, RefreshCw, ExternalLink,
  MessageSquare, Bell, Power, PowerOff, Send, Building2, User,
  ClipboardList, Calendar, ChevronDown, ChevronUp, UserPlus, Briefcase, Inbox, Search, Filter, Mail, AudioLines, Mic
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RichTextEditor, sanitizeRichHtml } from '../components/RichTextEditor';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { ElevenLabsStudio } from '../components/ElevenLabsStudio';
import { AdminLeadsTab } from './admin/AdminLeadsTab';
import { AdminDatabaseTab } from './admin/AdminDatabaseTab';
import { AdminPopupsTab } from './admin/AdminPopupsTab';
import { AdminFoldersTab } from './admin/AdminFoldersTab';
import { AdminContentTab } from './admin/AdminContentTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminYouTubeTab } from './admin/AdminYouTubeTab';
import { AdminMessagingTab } from './admin/AdminMessagingTab';
import { AdminEditorModal } from './admin/AdminEditorModal';
import { useAdminState } from './admin/useAdminState';


const AdminPage = () => {
  const admin = useAdminState();
  const {
    // Context / router
    navigate, user, isAdmin, authLoading, language, t, backendUrl, token,
    // State
    activeTab, contents, folders, users, loading, showModal, editItem, formData,
    submitting, message, uploadProgress, isUploading, storageStats, databaseStats,
    leads, leadsLoading, leadFilters, selectedLead,
    youtubePlaylists, youtubeImporting, youtubeSyncing,
    popupMessages, popupStats, popupMediaUploading, popupMediaProgress,
    conversations, chatMessages, chatUser, newMessage, newMessageHtml,
    showEmailPreview, msgType, msgMediaUrl, msgTaskDesc, msgTaskDue, msgFileName,
    thumbnailUploading, regeneratingThumbs, regeneratingThumbId,
    crmSections,
    // Setters
    setActiveTab, setShowModal, setEditItem, setFormData,
    setLeadFilters, setSelectedLead,
    setChatUser, setNewMessage, setNewMessageHtml, setShowEmailPreview,
    setMsgType, setMsgMediaUrl, setMsgTaskDesc, setMsgTaskDue, setMsgFileName,
    // Refs
    chatEndRef, popupFileInputRef, thumbnailFileInputRef, fileInputRef,
    // Derived
    clientUsers,
    // Helpers
    showToast, toggleCrmSection, autoGenerateThumbnailFromUrl,
    toggleUserSelection, getYouTubeVideoId, getContentIcon,
    // Handlers
    handleCreateFolder, handleUpdateFolder, handleDeleteFolder,
    handleFileUpload, handleCustomThumbnailUpload, handleRegenerateThumbnail,
    handleRegenerateAllThumbnails, handleCreateContent, handleUpdateContent,
    handleDeleteContent,
    handleCreateUser, handleUpdateUser, handleDeleteUser,
    fetchConversations, openChat, handleSendMessage, handleDeleteMessage,
    fetchLeads, updateLead,
    handleImportYoutubePlaylist, handleSyncPlaylist, handleSyncAllPlaylists,
    handleDeleteYoutubePlaylist, handleUpdatePlaylistUsers,
    handlePopupMediaUpload, handleCreatePopup, handleUpdatePopup,
    handleDeletePopup, handleTogglePopupActive,
  } = admin;
  // Silence unused-var lint for handlers referenced only by AdminEditorModal / sub-tabs (they receive them via props below).
  void navigate; void user; void isAdmin; void token; void backendUrl;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/area-clienti')} className="text-blue-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">{t.adminPanel}</h1>
          </div>
          <p className="text-blue-300 text-sm">{language === 'it' ? 'Gestione Area Riservata' : 'Reserved Area Management'}</p>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button onClick={() => setActiveTab('folders')} className={activeTab === 'folders' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-folders">
            <Folder className="w-4 h-4 mr-2" /> {t.folders} ({folders.length})
          </Button>
          <Button onClick={() => setActiveTab('content')} className={activeTab === 'content' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-content">
            <FolderOpen className="w-4 h-4 mr-2" /> {t.content} ({contents.length})
          </Button>
          <Button onClick={() => setActiveTab('youtube')} className={activeTab === 'youtube' ? 'bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-youtube">
            <Youtube className="w-4 h-4 mr-2" /> {t.youtube} ({youtubePlaylists.length})
          </Button>
          <Button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" /> {t.users} ({users.length})
          </Button>
          <Button onClick={() => setActiveTab('database')} className={activeTab === 'database' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-database">
            <HardDrive className="w-4 h-4 mr-2" /> {t.database}
          </Button>
          <Button onClick={() => setActiveTab('popups')} className={activeTab === 'popups' ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-popups">
            <MessageSquare className="w-4 h-4 mr-2" /> {t.popupMessages} ({popupMessages.length})
          </Button>
          <Button onClick={() => { setActiveTab('messaging'); fetchConversations(); }} className={activeTab === 'messaging' ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-messaging">
            <Send className="w-4 h-4 mr-2" /> {language === 'it' ? 'Messaggi' : 'Messages'}
          </Button>
          <Button onClick={() => { setActiveTab('leads'); fetchLeads(); }} className={activeTab === 'leads' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-leads">
            <Inbox className="w-4 h-4 mr-2" /> {language === 'it' ? 'Lead Inbox' : 'Lead Inbox'}{leads.length ? ` (${leads.length})` : ''}
          </Button>
          <Button onClick={() => setActiveTab('audio-studio')} className={activeTab === 'audio-studio' ? 'bg-gradient-to-r from-fuchsia-500 to-amber-500' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-audio-studio">
            <AudioLines className="w-4 h-4 mr-2" /> Voice Lab
          </Button>
          <Button onClick={() => navigate('/admin/phonemes')} className="bg-gradient-to-r from-cyan-600 to-orange-500 hover:from-cyan-500 hover:to-orange-400 text-white font-bold" data-testid="tab-phonemes-cms">
            <Mic className="w-4 h-4 mr-2" /> Phoneme CMS
          </Button>
        </div>

        {/* Storage Stats */}
        {storageStats && (
          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-300">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span className="font-medium">{t.storage}</span>
              </div>
              <span className="text-sm text-slate-400">{storageStats.file_count} file • Max {storageStats.max_file_size_formatted}/file</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
              <div className={`h-3 rounded-full transition-all ${storageStats.usage_percentage > 90 ? 'bg-red-500' : storageStats.usage_percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(storageStats.usage_percentage, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{language === 'it' ? 'Usato' : 'Used'}: {storageStats.total_used_formatted}</span>
              <span>{storageStats.usage_percentage}%</span>
              <span>{language === 'it' ? 'Disponibile' : 'Available'}: {storageStats.remaining_formatted}</span>
            </div>
          </div>
        )}

        {/* ===================== FOLDERS TAB ===================== */}
        {activeTab === 'folders' && (
          <AdminFoldersTab
            language={language}
            t={t}
            folders={folders}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            handleDeleteFolder={handleDeleteFolder}
          />
        )}


        {/* ===================== CONTENT TAB ===================== */}
        {activeTab === 'content' && (
          <AdminContentTab
            language={language}
            contents={contents}
            getContentIcon={getContentIcon}
            regeneratingThumbs={regeneratingThumbs}
            regeneratingThumbId={regeneratingThumbId}
            handleRegenerateAllThumbnails={handleRegenerateAllThumbnails}
            handleRegenerateThumbnail={handleRegenerateThumbnail}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            handleDeleteContent={handleDeleteContent}
          />
        )}


        {/* ===================== USERS TAB ===================== */}
        {activeTab === 'users' && (
          <AdminUsersTab
            language={language}
            t={t}
            users={users}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            openChat={openChat}
            setActiveTab={setActiveTab}
            fetchConversations={fetchConversations}
            handleDeleteUser={handleDeleteUser}
          />
        )}


        {/* ===================== YOUTUBE TAB ===================== */}
        {activeTab === 'youtube' && (
          <AdminYouTubeTab
            language={language}
            t={t}
            youtubePlaylists={youtubePlaylists}
            youtubeSyncing={youtubeSyncing}
            handleSyncAllPlaylists={handleSyncAllPlaylists}
            handleSyncPlaylist={handleSyncPlaylist}
            handleDeleteYoutubePlaylist={handleDeleteYoutubePlaylist}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
          />
        )}


        {/* ===================== LEAD INBOX TAB ===================== */}
        {activeTab === 'audio-studio' && (
          <ElevenLabsStudio token={token} language={language} />
        )}

        {activeTab === 'leads' && (
          <AdminLeadsTab
            language={language}
            leads={leads}
            leadsLoading={leadsLoading}
            leadFilters={leadFilters}
            setLeadFilters={setLeadFilters}
            selectedLead={selectedLead}
            setSelectedLead={setSelectedLead}
            fetchLeads={fetchLeads}
            updateLead={updateLead}
            backendUrl={backendUrl}
            token={token}
            showToast={showToast}
          />
        )}


        {/* ===================== DATABASE TAB (extracted) ===================== */}
        {activeTab === 'database' && (
          <AdminDatabaseTab databaseStats={databaseStats} />
        )}


        {/* ===================== POPUP MESSAGES TAB (extracted) ===================== */}
        {activeTab === 'popups' && (
          <AdminPopupsTab
            language={language}
            t={t}
            popupMessages={popupMessages}
            popupStats={popupStats}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            handleTogglePopupActive={handleTogglePopupActive}
            handleDeletePopup={handleDeletePopup}
          />
        )}


        {/* ===================== MESSAGING TAB ===================== */}
        {activeTab === 'messaging' && (
          <AdminMessagingTab
            language={language}
            clientUsers={clientUsers}
            conversations={conversations}
            chatUser={chatUser}
            chatMessages={chatMessages}
            openChat={openChat}
            handleSendMessage={handleSendMessage}
            handleDeleteMessage={handleDeleteMessage}
            getYouTubeVideoId={getYouTubeVideoId}
            chatEndRef={chatEndRef}
            msgType={msgType} setMsgType={setMsgType}
            msgMediaUrl={msgMediaUrl} setMsgMediaUrl={setMsgMediaUrl}
            msgFileName={msgFileName} setMsgFileName={setMsgFileName}
            msgTaskDesc={msgTaskDesc} setMsgTaskDesc={setMsgTaskDesc}
            msgTaskDue={msgTaskDue} setMsgTaskDue={setMsgTaskDue}
            newMessage={newMessage} setNewMessage={setNewMessage}
            newMessageHtml={newMessageHtml} setNewMessageHtml={setNewMessageHtml}
            setShowEmailPreview={setShowEmailPreview}
          />
        )}

      </div>

      {/* ===================== EDITOR MODAL (extracted) ===================== */}
      <AdminEditorModal
        showModal={showModal}
        editItem={editItem}
        formData={formData}
        submitting={submitting}
        youtubeImporting={youtubeImporting}
        crmSections={crmSections}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        thumbnailUploading={thumbnailUploading}
        popupMediaUploading={popupMediaUploading}
        popupMediaProgress={popupMediaProgress}
        fileInputRef={fileInputRef}
        thumbnailFileInputRef={thumbnailFileInputRef}
        popupFileInputRef={popupFileInputRef}
        setShowModal={setShowModal}
        setEditItem={setEditItem}
        setFormData={setFormData}
        toggleCrmSection={toggleCrmSection}
        folders={folders}
        clientUsers={clientUsers}
        language={language}
        t={t}
        handleFileUpload={handleFileUpload}
        handleCustomThumbnailUpload={handleCustomThumbnailUpload}
        handlePopupMediaUpload={handlePopupMediaUpload}
        autoGenerateThumbnailFromUrl={autoGenerateThumbnailFromUrl}
        toggleUserSelection={toggleUserSelection}
        handleCreateFolder={handleCreateFolder}
        handleUpdateFolder={handleUpdateFolder}
        handleCreateContent={handleCreateContent}
        handleUpdateContent={handleUpdateContent}
        handleCreateUser={handleCreateUser}
        handleUpdateUser={handleUpdateUser}
        handleImportYoutubePlaylist={handleImportYoutubePlaylist}
        handleUpdatePlaylistUsers={handleUpdatePlaylistUsers}
        handleCreatePopup={handleCreatePopup}
        handleUpdatePopup={handleUpdatePopup}
      />


      {/* ===== Email Preview Modal (admin → client) ===== */}
      <EmailPreviewModal
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        contentHtml={newMessageHtml}
        contentPlain={newMessage}
        recipientEmail={chatUser?.email}
        recipientName={chatUser?.full_name || chatUser?.username}
        senderName={user?.full_name || 'VocalFitness Admin'}
        messageType={msgType}
      />
    </div>
  );
};

export default AdminPage;
