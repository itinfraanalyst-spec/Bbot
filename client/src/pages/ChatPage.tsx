import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChatArea } from '../components/chat/ChatArea';
import { ChatInput } from '../components/chat/ChatInput';
import { Sidebar } from '../components/chat/Sidebar';
import { useChat } from '../hooks/useChat';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useConversations } from '../hooks/useConversations';
import { LanguageSelector } from '../components/chat/LanguageSelector';
import { useProjects } from '../hooks/useProjects';
import { Sun, Moon, HelpCircle, Menu, Sparkles, Languages, Loader2, Folder } from 'lucide-react';

export function ChatPage() {
  const { t, language, currentLanguageOption } = useLanguage();
  const { userId, username } = useAuth();
  const conversationStorageKey = userId
    ? `trpwbot.currentConversationId.${userId}`
    : 'trpwbot.currentConversationId.pending';
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [explicitNewChat, setExplicitNewChat] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { conversations = [] } = useConversations();
  const { projects = [] } = useProjects();
  
  const handleConversationNotFound = useCallback(() => {
    setSelectedConvId((prev) => (prev !== null ? null : prev));
    try {
      localStorage.removeItem(conversationStorageKey);
    } catch {}
  }, [conversationStorageKey]);

  const { messages, setMessages, isGenerating, sendMessage, stopGeneration, regenerateMessage, currentConversationId } = useChat(
    selectedConvId, 
    '/api/chat', 
    conversationStorageKey,
    handleConversationNotFound
  );
  const activeConversation = (conversations || []).find(c => c.id === currentConversationId);
  const currentProjectId = activeConversation?.project_id || activeProjectId;
  const currentProject = (projects || []).find(p => p.id === currentProjectId);
  const { documents, uploadDocument, isUploading, uploadError, detachDocument } = useDocuments(currentConversationId, (newId) => {
    setSelectedConvId(newId);
  });

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!userId) return;
    const storedId = localStorage.getItem(conversationStorageKey);
    if (storedId) {
      setSelectedConvId((prev) => (prev !== storedId ? storedId : prev));
    } else if (!explicitNewChat && conversations.length > 0) {
      setSelectedConvId((prev) => (!prev && conversations[0]?.id ? conversations[0].id : prev));
    }
  }, [conversationStorageKey, userId, conversations.length, explicitNewChat]);

  useEffect(() => {
    if (!isHelpOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsHelpOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen]);

  const handleSendMessage = (text: string) => {
    setExplicitNewChat(false);
    sendMessage(text, { projectId: activeProjectId || undefined });
  };

  const handleRetry = (msg: any) => {
    const idx = messages.findIndex(m => m.id === msg.id);
    if (idx > 0) {
      const prev = messages[idx - 1];
      if (prev.role === 'user') {
         sendMessage(prev.content);
      }
    }
  };

  const handleTranslateAll = async () => {
    if (!messages.length || isTranslatingAll || language === 'en') return;
    setIsTranslatingAll(true);
    try {
      const updatedMessages = await Promise.all(
        messages.map(async (msg) => {
          if (!msg.content || !msg.content.trim()) return msg;
          try {
            const res = await fetch('/api/chat/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                text: msg.content,
                target_language: language,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.translated_text) {
                return { 
                  ...msg, 
                  content: data.translated_text,
                  original_content: msg.original_content || msg.content 
                };
              }
            }
          } catch (e) {
            console.error('Failed to translate message:', msg.id, e);
          }
          return msg;
        })
      );
      setMessages(updatedMessages);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const handleExport = (format: 'json' | 'md') => {
    if (!messages.length) return;
    
    let content = '';
    let filename = `conversation_${currentConversationId || 'export'}`;
    let type = '';

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
      filename += '.json';
      type = 'application/json';
    } else {
      content = messages.map(m => `**${m.role.toUpperCase()}**\n\n${m.content}`).join('\n\n---\n\n');
      filename += '.md';
      type = 'text/markdown';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] bg-[var(--bg-primary)] overflow-hidden w-full relative">
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        currentConversationId={currentConversationId}
        activeProjectId={currentProjectId}
        onSelectConversation={(id) => {
          setSelectedConvId(id);
          const conv = conversations.find(c => c.id === id);
          setActiveProjectId(conv?.project_id || null);
          setExplicitNewChat(false);
          setIsSidebarOpen(false);
        }}
        onNewConversation={(projectId?: string) => {
          setSelectedConvId(null);
          setActiveProjectId(projectId || null);
          setExplicitNewChat(true);
          localStorage.removeItem(conversationStorageKey);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full relative bg-[var(--bg-primary)] overflow-hidden">
        <div className="bg-[var(--accent)] text-white py-1.5 sm:py-2 px-2.5 sm:px-4 text-center text-[0.72rem] sm:text-[0.8rem] shrink-0 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-[#EAA655] after:via-[#D17B24] after:to-[#B8671C] after:opacity-80">
          <div className="font-semibold tracking-[0.05em] mb-[2px]">{t('testingBannerTitle')}</div>
          <div className="text-[0.75rem] opacity-85">{t('testingBannerSubtitle')}</div>
        </div>

        <header className="min-h-[48px] sm:min-h-[56px] px-2.5 sm:px-5 py-1 sm:py-2 border-b border-[var(--border-subtle)] flex items-center justify-between gap-1 sm:gap-3 shrink-0 bg-[var(--bg-primary)] z-30 w-full relative">
          {/* Left: Menu & Conversation Title */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer shrink-0"
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>

            {/* Project Breadcrumb */}
            {currentProject && (
              <div 
                className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[0.72rem] shrink-0 font-medium max-w-[150px] sm:max-w-[200px]"
                title={`Project: ${currentProject.name}`}
              >
                <Folder size={13} style={{ color: currentProject.color || '#d17b24' }} className="shrink-0" />
                <span className="truncate font-semibold text-[var(--text-primary)]">
                  {currentProject.name}
                </span>
              </div>
            )}

            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate max-w-[90px] xs:max-w-[130px] sm:max-w-none">
              {currentConversationId ? t('conversation') : currentProject ? 'New Thread' : t('newChat')}
            </h3>

            {/* Attached Docs */}
            {currentConversationId && (documents.length > 0 || uploadError) && (
              <div className="hidden lg:flex min-w-0 gap-1.5 items-center max-w-[200px]">
                {uploadError && (
                  <div className="text-[var(--error)] text-[0.7rem] truncate bg-[rgba(250,82,82,0.1)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
                    {uploadError}
                  </div>
                )}
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-sm)] border text-[0.7rem] truncate
                      ${doc.status === 'FAILED' ? 'bg-[rgba(250,82,82,0.1)] border-[rgba(250,82,82,0.3)] text-[var(--error)]' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}
                    `}
                  >
                    <span className="truncate font-medium max-w-[100px]" title={doc.filename}>{doc.filename}</span>
                    <button 
                      onClick={() => detachDocument(doc.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors shrink-0 cursor-pointer border-none bg-transparent"
                      title="Remove document"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Perfectly fitted action buttons with zero clipping or overlapping */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
            <LanguageSelector />

            {/* Translate Chat Button when non-English */}
            {messages.length > 0 && language !== 'en' && (
              <button
                onClick={handleTranslateAll}
                disabled={isTranslatingAll}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-[0.7rem] sm:text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-xs shrink-0"
                title={`${t('translateChat')} (${currentLanguageOption.nativeName})`}
              >
                {isTranslatingAll ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                <span className="hidden sm:inline">{isTranslatingAll ? t('translating') : t('translateChat')}</span>
              </button>
            )}

            {/* Visual Studio Link */}
            <Link
              to="/studio"
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-900 hover:text-violet-950 border border-violet-300 hover:border-violet-400 text-[0.7rem] sm:text-xs font-bold transition-all shadow-xs dark:bg-violet-600/15 dark:border-violet-500/30 dark:text-violet-300 dark:hover:text-white shrink-0"
              title="Open bbot Visual Studio"
            >
              <Sparkles size={12} className="text-amber-600 dark:text-amber-300 shrink-0" />
              <span className="hidden sm:inline">{t('visualStudio')}</span>
            </Link>

            {/* Export Buttons */}
            {messages.length > 0 && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shrink-0">
                <button onClick={() => handleExport('md')} className="px-1.5 py-0.5 rounded text-[0.68rem] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 transition-all cursor-pointer" title="Export as Markdown">
                  MD
                </button>
                <button onClick={() => handleExport('json')} className="px-1.5 py-0.5 rounded text-[0.68rem] font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/30 transition-all cursor-pointer" title="Export as JSON">
                  JSON
                </button>
              </div>
            )}

            <button onClick={toggleTheme} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer shrink-0" title="Toggle theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => setIsHelpOpen(true)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer shrink-0" title="Help" aria-label="Open help">
              <HelpCircle size={15} />
            </button>
          </div>
        </header>

        {isHelpOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsHelpOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-title"
              className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-[var(--text-primary)] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="help-title" className="text-lg font-semibold text-[var(--text-primary)]">Using bbot</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Close help"
                >
                  ×
                </button>
              </div>
              <ul className="mt-5 space-y-3 text-sm text-[var(--text-secondary)] list-disc pl-5 marker:text-[var(--text-muted)]">
                <li><strong className="text-[var(--text-primary)] font-medium">Ask questions</strong>, attach supported documents, and continue conversations from the sidebar.</li>
                <li><strong className="text-[var(--text-primary)] font-medium">Press Enter</strong> to send a message. Use <strong className="text-[var(--text-primary)] font-medium">Shift+Enter</strong> for a new line.</li>
                <li><strong className="text-[var(--text-primary)] font-medium">Attach documents</strong> using the paperclip button.</li>
                <li><strong className="text-[var(--text-primary)] font-medium">Manage conversations</strong> from the sidebar (switch, rename, pin, or delete).</li>
              </ul>
            </div>
          </div>
        )}

        <ChatArea
          messages={messages}
          isGenerating={isGenerating}
          username={username}
          onRetry={handleRetry}
          onEdit={regenerateMessage}
          documentsCount={documents.length}
          onSuggestedPrompt={handleSendMessage}
          starterQuestions={[t('starterGreeting')]}
        />
        
        {/* Input & Docs Area */}
        <div className="bg-[var(--bg-primary)] flex flex-col shrink-0 pb-2 sm:pb-4 pb-safe px-2 sm:px-4 relative">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={isGenerating} 
            onUploadFile={uploadDocument}
            isUploading={isUploading}
            isGenerating={isGenerating}
            onStop={stopGeneration}
            isNewChat={messages.length === 0}
            botName="bbot"
          />
        </div>
      </div>
    </div>
  );
}
