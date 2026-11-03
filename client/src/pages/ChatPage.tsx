import { useEffect, useState } from 'react';
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
import { Sun, Moon, HelpCircle, Menu, Sparkles, Languages, Loader2 } from 'lucide-react';

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
  const { conversations } = useConversations();
  const { messages, setMessages, isGenerating, sendMessage, stopGeneration, regenerateMessage, currentConversationId } = useChat(selectedConvId, '/api/chat', conversationStorageKey);
  const { documents, uploadDocument, isUploading, uploadError, detachDocument } = useDocuments(currentConversationId, (newId) => {
    setSelectedConvId(newId);
  });

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!userId) return;
    const storedId = localStorage.getItem(conversationStorageKey);
    if (storedId) {
      setSelectedConvId(storedId);
    } else if (!explicitNewChat && conversations.length > 0 && !selectedConvId) {
      // Automatically reopen and restore the user's latest conversation!
      setSelectedConvId(conversations[0].id);
    }
  }, [conversationStorageKey, userId, conversations, selectedConvId, explicitNewChat]);

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
    sendMessage(text);
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
        onSelectConversation={(id) => {
          setSelectedConvId(id);
          setExplicitNewChat(false);
          setIsSidebarOpen(false);
        }}
        onNewConversation={() => {
          setSelectedConvId(null);
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

        <header className="min-h-[50px] sm:min-h-[60px] px-2.5 sm:px-6 py-1.5 sm:py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-1.5 sm:gap-4 shrink-0 bg-[var(--bg-primary)] z-10 w-full overflow-hidden">
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer shrink-0"
              aria-label="Open sidebar"
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-[0.95rem] font-semibold text-[var(--text-primary)] truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none">
                {currentConversationId ? t('conversation') : t('newChat')}
              </h3>
            </div>
            
            {/* Attached Docs */}
            {currentConversationId && documents.length > 0 && (
              <div className="hidden lg:flex min-w-0 gap-2 items-center overflow-x-auto max-w-[180px]">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] border text-[0.72rem] truncate
                      ${doc.status === 'FAILED' ? 'bg-[rgba(250,82,82,0.1)] border-[rgba(250,82,82,0.3)] text-[var(--error)]' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}
                    `}
                  >
                    <span className="truncate font-medium" title={doc.filename}>{doc.filename}</span>
                    <button 
                      onClick={() => detachDocument(doc.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors shrink-0 cursor-pointer border-none bg-transparent"
                      title="Remove document"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {uploadError && (
                  <div className="text-[var(--error)] text-[0.72rem] flex items-center gap-1 bg-[rgba(250,82,82,0.1)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                    {uploadError}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Horizontally scrollable actions row on mobile with zero cut-off */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 shrink min-w-0 justify-end flex-nowrap">
            {/* Language Selector Dropdown */}
            <div className="shrink-0">
              <LanguageSelector />
            </div>

            {/* Translate Chat Button when non-English */}
            {messages.length > 0 && language !== 'en' && (
              <button
                onClick={handleTranslateAll}
                disabled={isTranslatingAll}
                className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-[0.72rem] sm:text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                title={`${t('translateChat')} (${currentLanguageOption.nativeName})`}
              >
                {isTranslatingAll ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
                <span className="hidden sm:inline">{isTranslatingAll ? t('translating') : t('translateChat')}</span>
              </button>
            )}

            {/* Visual Studio Link */}
            <Link
              to="/studio"
              className="shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-900 hover:text-violet-950 border border-violet-300 hover:border-violet-500 text-[0.72rem] sm:text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs dark:bg-gradient-to-r dark:from-violet-600/20 dark:via-fuchsia-600/20 dark:to-amber-500/20 dark:border-violet-500/40 dark:text-violet-300 dark:hover:text-white dark:hover:border-violet-400"
              title="Open bbot Visual Studio"
            >
              <Sparkles size={13} className="text-amber-600 dark:text-amber-300 shrink-0" />
              <span className="hidden sm:inline">{t('visualStudio')}</span>
            </Link>

            {/* Export Buttons - Fully accessible & scrollable on mobile */}
            {messages.length > 0 && (
              <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="hidden sm:inline text-[0.65rem] text-[var(--text-muted)] font-bold uppercase tracking-wider mr-0.5">{t('export')}</span>
                <button onClick={() => handleExport('md')} className="px-1.5 py-0.5 rounded text-[0.7rem] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 transition-all cursor-pointer" title="Export as Markdown">
                  MD
                </button>
                <button onClick={() => handleExport('json')} className="px-1.5 py-0.5 rounded text-[0.7rem] font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/30 transition-all cursor-pointer" title="Export as JSON">
                  JSON
                </button>
              </div>
            )}

            <button onClick={toggleTheme} className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer" title="Toggle theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button onClick={() => setIsHelpOpen(true)} className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer" title="Help" aria-label="Open help">
              <HelpCircle size={17} />
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
