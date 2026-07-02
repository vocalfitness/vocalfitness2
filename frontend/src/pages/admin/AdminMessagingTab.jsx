import React from 'react';
import {
  User, Send, X, ClipboardList, FileText, ExternalLink, Mail,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { RichTextEditor, sanitizeRichHtml } from '../../components/RichTextEditor';

/**
 * AdminMessagingTab — two-pane chat: conversations sidebar + message thread.
 *
 * All chat state (conversations list, active user, drafts, message-type
 * form) lives at parent level so a page refresh or tab switch doesn't
 * blow it away. This component is presentational + dispatch.
 *
 * Props (grouped for readability):
 *   language
 *   clientUsers, conversations, chatUser, chatMessages
 *   openChat(userId), handleSendMessage, handleDeleteMessage
 *   getYouTubeVideoId(url) => string | null
 *   chatEndRef                       — auto-scroll anchor
 *   msgType / setMsgType             — 'text' | 'video' | 'audio' | 'file' | 'task'
 *   msgMediaUrl / setMsgMediaUrl
 *   msgFileName / setMsgFileName
 *   msgTaskDesc / setMsgTaskDesc
 *   msgTaskDue / setMsgTaskDue
 *   newMessage / setNewMessage
 *   newMessageHtml / setNewMessageHtml
 *   setShowEmailPreview             — opens the EmailPreviewModal (mounted at parent)
 */
export const AdminMessagingTab = ({
  language,
  clientUsers,
  conversations,
  chatUser,
  chatMessages,
  openChat,
  handleSendMessage,
  handleDeleteMessage,
  getYouTubeVideoId,
  chatEndRef,
  msgType, setMsgType,
  msgMediaUrl, setMsgMediaUrl,
  msgFileName, setMsgFileName,
  msgTaskDesc, setMsgTaskDesc,
  msgTaskDue, setMsgTaskDue,
  newMessage, setNewMessage,
  newMessageHtml, setNewMessageHtml,
  setShowEmailPreview,
}) => {
  return (
    <div className="flex gap-4 h-[calc(100vh-220px)]">
      {/* Conversations sidebar */}
      <div className="w-72 bg-slate-800 rounded-xl overflow-hidden flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">{language === 'it' ? 'Conversazioni' : 'Conversations'}</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Show all clients for starting new conversations */}
          {clientUsers.map(u => {
            const conv = conversations.find(c => c.partner?.id === u.id);
            return (
              <div
                key={u.id}
                onClick={() => openChat(u.id)}
                className={`p-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors ${chatUser?.id === u.id ? 'bg-emerald-600/20 border-l-2 border-l-emerald-500' : ''}`}
                data-testid={`conv-${u.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium truncate">{u.full_name || u.username}</span>
                  {conv?.unread_count > 0 && (
                    <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{conv.unread_count}</span>
                  )}
                </div>
                {conv?.last_message && (
                  <p className="text-slate-400 text-xs mt-1 truncate">{conv.last_message.content || `[${conv.last_message.message_type}]`}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden flex flex-col">
        {chatUser ? (
          <>
            {/* Chat header */}
            <div className="p-3 border-b border-slate-700 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">{chatUser.full_name || chatUser.username}</h3>
                <p className="text-slate-400 text-xs">{chatUser.email || chatUser.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
              {chatMessages.length === 0 && (
                <p className="text-slate-500 text-center py-8">{language === 'it' ? 'Nessun messaggio. Inizia la conversazione!' : 'No messages. Start the conversation!'}</p>
              )}
              {chatMessages.map(m => {
                const youtubeId = getYouTubeVideoId(m.media_url);
                const isAdminMessage = m.sender_id !== chatUser.id;
                return (
                  <div key={m.id} className={`flex ${m.sender_id === chatUser.id ? 'justify-start' : 'justify-end'} group`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 relative ${m.sender_id === chatUser.id ? 'bg-slate-700 text-white' : 'bg-emerald-600 text-white'}`}>
                      {/* Delete button for admin's own messages */}
                      {isAdminMessage && (
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title={language === 'it' ? 'Elimina' : 'Delete'}
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                      {m.message_type === 'task' && (
                        <div className="flex items-center gap-2 text-xs font-medium mb-1 opacity-80">
                          <ClipboardList className="w-3 h-3" /> {language === 'it' ? 'Compito' : 'Task'}
                          {m.task_completed && <span className="text-green-300">({language === 'it' ? 'completato' : 'completed'})</span>}
                        </div>
                      )}
                      {m.content_html ? (
                        <div
                          className="text-sm rich-msg [&_a]:text-amber-300 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:text-base [&_h3]:font-bold [&_p]:my-1"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(m.content_html) }}
                        />
                      ) : (
                        m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      )}
                      {m.task_description && <p className="text-sm mt-1 italic">{m.task_description}</p>}
                      {m.task_due_date && <p className="text-xs mt-1 opacity-70">Scadenza: {m.task_due_date}</p>}

                      {/* Video rendering - YouTube or direct */}
                      {m.media_url && m.message_type === 'video' && (
                        youtubeId ? (
                          <div className="mt-2 rounded-lg overflow-hidden aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeId}`}
                              className="w-full h-full min-h-[180px]"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video"
                            />
                          </div>
                        ) : (
                          <video controls className="mt-2 rounded-lg max-w-full max-h-48" src={m.media_url} />
                        )
                      )}

                      {/* Audio rendering */}
                      {m.media_url && m.message_type === 'audio' && (
                        <audio controls className="mt-2 w-full" src={m.media_url} />
                      )}

                      {/* File/Document link */}
                      {m.media_url && m.message_type === 'file' && (
                        <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm underline">{m.file_name || m.media_url.split('/').pop() || 'Apri documento'}</span>
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      )}

                      <p className="text-[10px] mt-1 opacity-50">{new Date(m.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            <div className="p-3 border-t border-slate-700 space-y-2">
              <div className="flex flex-wrap gap-2">
                {['text', 'video', 'audio', 'file', 'task'].map(mtype => (
                  <button
                    key={mtype}
                    onClick={() => setMsgType(mtype)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${msgType === mtype ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                  >
                    {mtype === 'text' ? (language === 'it' ? 'Testo' : 'Text') :
                     mtype === 'audio' ? 'Audio' :
                     mtype === 'video' ? 'Video' :
                     mtype === 'file' ? (language === 'it' ? 'File/Link' : 'File/Link') :
                     (language === 'it' ? 'Compito' : 'Task')}
                  </button>
                ))}
              </div>
              {(msgType === 'audio' || msgType === 'video') && (
                <input
                  type="url" value={msgMediaUrl}
                  onChange={e => setMsgMediaUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  placeholder={language === 'it' ? 'URL media (YouTube, Google Drive, link diretto...)' : 'Media URL (YouTube, Google Drive, direct link...)'}
                />
              )}
              {msgType === 'file' && (
                <div className="space-y-2">
                  <input
                    type="url" value={msgMediaUrl}
                    onChange={e => setMsgMediaUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    placeholder={language === 'it' ? 'URL documento (PDF, Google Docs, Dropbox...)' : 'Document URL (PDF, Google Docs, Dropbox...)'}
                  />
                  <input
                    type="text" value={msgFileName}
                    onChange={e => setMsgFileName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    placeholder={language === 'it' ? 'Nome da visualizzare (opzionale)' : 'Display name (optional)'}
                  />
                </div>
              )}
              {msgType === 'task' && (
                <div className="flex gap-2">
                  <input
                    type="text" value={msgTaskDesc}
                    onChange={e => setMsgTaskDesc(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    placeholder={language === 'it' ? 'Descrizione compito...' : 'Task description...'}
                  />
                  <input
                    type="date" value={msgTaskDue}
                    onChange={e => setMsgTaskDue(e.target.value)}
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  />
                </div>
              )}
              <div className="space-y-2">
                <RichTextEditor
                  value={newMessageHtml}
                  onChange={setNewMessageHtml}
                  onPlainTextChange={setNewMessage}
                  placeholder={language === 'it' ? 'Scrivi un messaggio… (puoi formattare il testo, andare a capo, inserire link)' : 'Write a message… (rich text, line breaks and links supported)'}
                  minHeight={120}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview(true)}
                    disabled={!newMessage.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    data-testid="email-preview-btn"
                    title={language === 'it' ? "Anteprima dell'email che riceverà il cliente" : 'Preview the email the client will receive'}
                  >
                    <Mail className="w-4 h-4" />
                    {language === 'it' ? 'Anteprima email' : 'Email preview'}
                  </button>
                  <Button
                    onClick={handleSendMessage}
                    className="bg-emerald-600 hover:bg-emerald-700 px-4"
                    data-testid="send-message-btn"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    {language === 'it' ? 'Invia' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Send className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">{language === 'it' ? 'Seleziona un cliente per iniziare' : 'Select a client to start'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
