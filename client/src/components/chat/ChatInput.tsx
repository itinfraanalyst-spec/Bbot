import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Send, Paperclip, Loader2, Mic, Sparkles, Languages } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import clsx from 'clsx';

// SpeechRecognition Types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatInputProps {
  onSendMessage: (message: string, options?: { originalText?: string }) => void;
  disabled?: boolean;
  onUploadFile?: (file: File) => void;
  isUploading?: boolean;
  isGenerating?: boolean;
  onStop?: () => void;
  isNewChat?: boolean;
  botName?: string;
}

const SPEECH_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  hinglish: 'en-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  pa: 'pa-IN',
  ml: 'ml-IN',
  en: 'en-US',
};

const TRANSLITERATE_LANG_MAP: Record<string, string> = {
  hi: 'hi-t-i0-und',
  gu: 'gu-t-i0-und',
  bn: 'bn-t-i0-und',
  te: 'te-t-i0-und',
  mr: 'mr-t-i0-und',
  ta: 'ta-t-i0-und',
  kn: 'kn-t-i0-und',
  pa: 'pa-t-i0-und',
  ml: 'ml-t-i0-und',
};


export function ChatInput({ onSendMessage, disabled, onUploadFile, isUploading, isGenerating, onStop, isNewChat, botName = 'bbot' }: ChatInputProps) {
  const { t, language, currentLanguageOption } = useLanguage();
  const [input, setInput] = useState(() => {
    try {
      const pending = sessionStorage.getItem('pending_chat_prompt');
      if (pending) {
        sessionStorage.removeItem('pending_chat_prompt');
        return pending;
      }
    } catch {}
    return '';
  });
  const [isRecording, setIsRecording] = useState(false);
  const [transliterateEnabled, setTransliterateEnabled] = useState(true);
  const [autoTranslateInput, setAutoTranslateInput] = useState(true);
  const [isTranslatingInput, setIsTranslatingInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync pending prompt if navigated while mounted
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pending_chat_prompt');
      if (pending) {
        setInput(pending);
        sessionStorage.removeItem('pending_chat_prompt');
      }
    } catch {}
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = SPEECH_LANG_MAP[language] || 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInput(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [language]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInput('');
      recognitionRef.current.lang = SPEECH_LANG_MAP[language] || 'en-US';
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const textToSend = input.trim();
    if (!textToSend || disabled || isTranslatingInput) return;

    // If user typed in English while in non-English mode, and autoTranslateInput is active
    if (language !== 'en' && autoTranslateInput && /[a-zA-Z]{2,}/.test(textToSend)) {
      setIsTranslatingInput(true);
      try {
        const res = await fetch('/api/chat/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            text: textToSend,
            target_language: language,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.translated_text && data.translated_text.trim()) {
            onSendMessage(data.translated_text.trim(), { originalText: textToSend });
            setInput('');
            return;
          }
        }
      } catch (err) {
        console.error('Auto-translation failed, falling back to original:', err);
      } finally {
        setIsTranslatingInput(false);
      }
    }

    onSendMessage(textToSend);
    setInput('');
  };

  // Convert English phonetic words into Indian script on Space key
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ' ' && transliterateEnabled && TRANSLITERATE_LANG_MAP[language]) {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = input.slice(0, cursorPos);
        const match = textBeforeCursor.match(/([a-zA-Z]+)$/);
        if (match && match[1]) {
          const wordToConvert = match[1];
          const itc = TRANSLITERATE_LANG_MAP[language];
          fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(wordToConvert)}&itc=${itc}&num=1`)
            .then((res) => res.json())
            .then((data) => {
              if (data && data[0] === 'SUCCESS' && data[1]?.[0]?.[1]?.[0]) {
                const convertedWord = data[1][0][1][0];
                setInput((prev) => {
                  const beforeWord = prev.slice(0, cursorPos - wordToConvert.length);
                  const afterWord = prev.slice(cursorPos);
                  return beforeWord + convertedWord + afterWord;
                });
              }
            })
            .catch(() => {});
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Translate typed English text into selected Indian language
  const handleTranslateInput = async () => {
    if (!input.trim() || isTranslatingInput || language === 'en') return;
    setIsTranslatingInput(true);
    try {
      const res = await fetch('/api/chat/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: input,
          target_language: language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated_text) {
          setInput(data.translated_text);
        }
      }
    } catch (err) {
      console.error('Failed to translate input:', err);
    } finally {
      setIsTranslatingInput(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--bg-primary)] from-70% to-transparent flex flex-col items-center pointer-events-none">
      {/* Language / Typing Helper Bar (only shown when non-English or Transliteration active) */}
      {!isGenerating && (language !== 'en' || TRANSLITERATE_LANG_MAP[language]) && (
        <div className="w-full max-w-[960px] mb-2 flex items-center gap-1.5 overflow-x-auto pointer-events-auto no-scrollbar py-0.5">
          {/* Auto-Translate Input Toggle */}
          {language !== 'en' && (
            <button
              type="button"
              onClick={() => setAutoTranslateInput(!autoTranslateInput)}
              className={clsx(
                'shrink-0 text-[0.68rem] font-semibold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 select-none cursor-pointer',
                autoTranslateInput
                  ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)] border-[var(--accent)] shadow-xs'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              )}
              title="Automatically translates your typed English input into the selected language upon sending"
            >
              <Languages size={11} />
              <span>{autoTranslateInput ? t('autoTranslateInputOn') : t('autoTranslateInputOff')}</span>
            </button>
          )}

          {/* Phonetic Transliteration Script Toggle for Indian languages */}
          {TRANSLITERATE_LANG_MAP[language] && (
            <button
              type="button"
              onClick={() => setTransliterateEnabled(!transliterateEnabled)}
              className={clsx(
                'shrink-0 text-[0.68rem] font-semibold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 select-none cursor-pointer ml-auto',
                transliterateEnabled
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              )}
              title="Phonetic Script Typing: Type English phonetics (e.g. namaste) and press Space to convert into native script"
            >
              <span>🔤</span>
              <span>{currentLanguageOption.nativeName} Typing: {transliterateEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      )}
      <div className="w-full max-w-[960px] flex items-end gap-1.5 sm:gap-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] py-1.5 sm:py-2 px-2.5 sm:px-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] focus-within:border-[var(--accent)] transition-colors pointer-events-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.docx,.xlsx,.csv,.txt,.md"
        />
        <button
          onClick={() => {
            if (isNewChat) return;
            fileInputRef.current?.click();
          }}
          disabled={isUploading || disabled || isNewChat}
          title={isNewChat ? "Say Hello first to start conversation and upload documents" : "Attach Document"}
          className={clsx(
            "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors shrink-0 mb-0.5 sm:mb-1 rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border-none bg-transparent",
            isNewChat ? "opacity-35 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"
          )}
        >
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} className="rotate-45" />}
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isUploading}
          placeholder={isNewChat ? (t('clickToStart') || "Say 'Hello' or click 'Say Hello 👋' to start...") : (disabled || isUploading) ? t('thinking') : t('inputPlaceholder')}
          className="flex-1 min-w-0 max-h-[120px] sm:max-h-[150px] text-base sm:text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] py-2 sm:py-3 px-1 sm:px-0 outline-none resize-none overflow-y-auto leading-relaxed border-none disabled:opacity-75 disabled:cursor-not-allowed"
          rows={1}
        />
        {/* Language Indicator Badge */}
        <span
          className="hidden sm:inline-flex items-center gap-1 text-[0.65rem] px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] text-[var(--accent)] shrink-0 mb-1.5 font-medium select-none"
          title={`AI responds in ${currentLanguageOption.englishName} (${currentLanguageOption.nativeName})`}
        >
          <span>{currentLanguageOption.flag}</span>
          <span className="font-semibold">{currentLanguageOption.nativeName}</span>
        </span>
        {isNewChat && !disabled && !isUploading && !isGenerating && (
          <button
            type="button"
            disabled={disabled || isUploading || isGenerating}
            onClick={() => {
              if (disabled || isUploading || isGenerating) return;
              onSendMessage(t('sayHelloPrompt', { botName }));
            }}
            className="shrink-0 mb-1 sm:mb-1.5 mr-1 sm:mr-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 hover:border-amber-500 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[0.7rem] sm:text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(245,158,11,0.15)] hover:scale-[1.02] active:scale-[0.98] dark:bg-gradient-to-r dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/20 dark:border-amber-500/50 dark:text-amber-300 dark:hover:from-amber-500 dark:hover:to-orange-500 dark:hover:text-white dark:shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          >
            <Sparkles size={13} className="text-amber-600 dark:text-amber-300" />
            {t('sayHello')}
          </button>
        )}
        {isGenerating ? (
          <button
            onClick={onStop}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 mb-0.5 sm:mb-1 text-white bg-rose-600 hover:bg-rose-500 rounded-[var(--radius-full)] transition-all flex items-center justify-center shadow-[0_0_12px_rgba(225,29,72,0.4)] cursor-pointer"
            title="Stop generating"
          >
            <div className="w-3 h-3 bg-current rounded-sm" />
          </button>
        ) : (
          <>
            {/* Translate typed text button when input exists and language is not English */}
            {language !== 'en' && input.trim() && (
              <button
                type="button"
                onClick={handleTranslateInput}
                disabled={disabled || isUploading || isTranslatingInput}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 mb-0.5 sm:mb-1 text-cyan-900 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 hover:border-cyan-400 rounded-[var(--radius-full)] disabled:opacity-50 transition-all flex items-center justify-center mr-1 cursor-pointer dark:text-cyan-300 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 dark:border-cyan-500/35 dark:hover:border-cyan-400 dark:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                title={`Translate typed input to ${currentLanguageOption.nativeName}`}
              >
                {isTranslatingInput ? <Loader2 size={16} className="animate-spin text-cyan-700 dark:text-cyan-300" /> : <Languages size={16} />}
              </button>
            )}

            <button
              onClick={toggleRecording}
              disabled={disabled || isUploading}
              className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 mb-0.5 sm:mb-1 ${
                isRecording 
                  ? 'text-white bg-rose-600 shadow-[0_0_14px_rgba(225,29,72,0.6)] animate-pulse' 
                  : 'text-sky-900 bg-sky-100 hover:bg-sky-200 border border-sky-300 hover:border-sky-400 dark:text-sky-300 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:border-sky-500/30 dark:hover:border-sky-400 dark:hover:shadow-[0_0_10px_rgba(56,189,248,0.25)]'
              } hover:opacity-90 rounded-[var(--radius-full)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center mr-1 cursor-pointer`}
              title={isRecording ? "Stop recording" : `Speak in ${currentLanguageOption.nativeName} (Voice Mode)`}
            >
              <Mic size={16} />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled || isTranslatingInput}
              className={`w-11 h-11 md:w-9 md:h-9 shrink-0 mb-0.5 md:mb-1 text-white rounded-[var(--radius-full)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer ${
                input.trim()
                  ? 'bg-gradient-to-tr from-[#C87514] via-[#E39A3D] to-[#F59E0B] hover:brightness-110 shadow-[0_0_16px_rgba(200,117,20,0.45)] hover:scale-105 active:scale-95'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
              }`}
            >
              {isTranslatingInput ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Send size={16} className={input.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
              )}
            </button>
          </>
        )}
      </div>
      
      <div className="w-full max-w-[960px] mt-3 border-t border-[var(--border-subtle)] pt-3 pb-1 pointer-events-auto">
        <p className="mb-2 text-center text-[0.7rem] text-[var(--text-muted)]">{t('disclaimer')}</p>
        <div className="flex flex-col items-center gap-1 text-center text-[0.7rem] sm:flex-row sm:justify-between sm:text-left">
          <span className="text-[var(--accent)] font-medium">TRPW Strategic Partners <span className="text-[var(--text-primary)]">© 2026. {t('rightsReserved')}</span></span>
          <span className="text-[var(--text-secondary)]">TRPW <span className="font-semibold text-[var(--accent)]">bbot</span> <span className="opacity-70">• {t('localAndPrivate')}</span></span>
        </div>
      </div>
    </div>
  );
}
