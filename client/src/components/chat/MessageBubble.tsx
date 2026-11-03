import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { parseMarkdownTable } from '../../utils/tableParser';
import { ProcessFlowchart } from './ProcessFlowchart';
import { MermaidDiagram } from './MermaidDiagram';
import { HtmlDiagramPreview } from './HtmlDiagramPreview';
import { DataChart } from './DataChart';
import { parseProcessFlow } from '../../utils/processParser';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import clsx from 'clsx';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ThumbsDown, ThumbsUp, Volume2, VolumeX, Copy, Check, Send, Languages, Loader2, Sparkles } from 'lucide-react';

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.alias('javascript', ['js', 'jsx']);
SyntaxHighlighter.alias('typescript', ['ts', 'tsx']);
SyntaxHighlighter.alias('python', ['py']);
SyntaxHighlighter.alias('bash', ['sh', 'shell']);

const sanitizeHtmlSchema: any = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'style', 'className', 'class'],
    svg: ['width', 'height', 'viewBox', 'fill', 'stroke', 'strokeWidth', 'xmlns', 'style', 'className'],
    path: ['d', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'strokeWidth'],
    circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'strokeWidth'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth', 'markerEnd', 'marker-end'],
    text: ['x', 'y', 'fill', 'fontSize', 'font-size', 'fontFamily', 'font-family', 'fontWeight', 'font-weight', 'textAnchor', 'text-anchor', 'dominantBaseline', 'dominant-baseline'],
  },
};
SyntaxHighlighter.alias('markup', ['html', 'xml']);

SyntaxHighlighter.alias('markup', ['html', 'xml']);

const CodeBlock = ({ language, value, theme }: { language: string, value: string, theme: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-md border border-[var(--border-subtle)] my-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--bg-surface-hover)] border-b border-[var(--border-subtle)] text-[0.75rem] text-[var(--text-muted)] font-mono uppercase tracking-wider">
        {language}
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={(theme === 'dark' ? vscDarkPlus : oneLight) as any}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  original_content?: string;
  status?: 'sending' | 'complete' | 'aborted' | 'error' | 'timeout';
}

interface MessageBubbleProps {
  message: Message;
  botName?: string;
  onRetry?: () => void;
  isGenerating?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  suggestedPrompts?: string[];
  onSuggestedPrompt?: (prompt: string) => void;
}

const OPTION_CHIP_THEMES = [
  {
    bg: 'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200/70 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:active:bg-emerald-500/30',
    border: 'border-emerald-300 hover:border-emerald-500 dark:border-emerald-500/35 dark:hover:border-emerald-400',
    text: 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-200',
    dot: 'bg-emerald-600 dark:bg-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.9)]',
    glow: 'hover:shadow-[0_2px_12px_rgba(16,185,129,0.18)] dark:hover:shadow-[0_0_16px_rgba(16,185,129,0.22)]',
  },
  {
    bg: 'bg-violet-50 hover:bg-violet-100 active:bg-violet-200/70 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 dark:active:bg-violet-500/30',
    border: 'border-violet-300 hover:border-violet-500 dark:border-violet-500/35 dark:hover:border-violet-400',
    text: 'text-violet-800 hover:text-violet-950 dark:text-violet-300 dark:hover:text-violet-200',
    dot: 'bg-violet-600 dark:bg-violet-400 dark:shadow-[0_0_8px_rgba(167,139,250,0.9)]',
    glow: 'hover:shadow-[0_2px_12px_rgba(139,92,246,0.18)] dark:hover:shadow-[0_0_16px_rgba(139,92,246,0.22)]',
  },
  {
    bg: 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200/70 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:active:bg-amber-500/30',
    border: 'border-amber-300 hover:border-amber-500 dark:border-amber-500/35 dark:hover:border-amber-400',
    text: 'text-amber-900 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200',
    dot: 'bg-amber-600 dark:bg-amber-400 dark:shadow-[0_0_8px_rgba(251,191,36,0.9)]',
    glow: 'hover:shadow-[0_2px_12px_rgba(245,158,11,0.18)] dark:hover:shadow-[0_0_16px_rgba(245,158,11,0.22)]',
  },
  {
    bg: 'bg-rose-50 hover:bg-rose-100 active:bg-rose-200/70 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:active:bg-rose-500/30',
    border: 'border-rose-300 hover:border-rose-500 dark:border-rose-500/35 dark:hover:border-rose-400',
    text: 'text-rose-800 hover:text-rose-950 dark:text-rose-300 dark:hover:text-rose-200',
    dot: 'bg-rose-600 dark:bg-rose-400 dark:shadow-[0_0_8px_rgba(251,113,133,0.9)]',
    glow: 'hover:shadow-[0_2px_12px_rgba(244,63,94,0.18)] dark:hover:shadow-[0_0_16px_rgba(244,63,94,0.22)]',
  },
  {
    bg: 'bg-cyan-50 hover:bg-cyan-100 active:bg-cyan-200/70 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 dark:active:bg-cyan-500/30',
    border: 'border-cyan-300 hover:border-cyan-500 dark:border-cyan-500/35 dark:hover:border-cyan-400',
    text: 'text-cyan-900 hover:text-cyan-950 dark:text-cyan-300 dark:hover:text-cyan-200',
    dot: 'bg-cyan-600 dark:bg-cyan-400 dark:shadow-[0_0_8px_rgba(34,211,238,0.9)]',
    glow: 'hover:shadow-[0_2px_12px_rgba(6,182,212,0.18)] dark:hover:shadow-[0_0_16px_rgba(6,182,212,0.22)]',
  },
  {
    bg: 'bg-fuchsia-50 hover:bg-fuchsia-100 active:bg-fuchsia-200/70 dark:bg-fuchsia-500/10 dark:hover:bg-fuchsia-500/20 dark:active:bg-fuchsia-500/30',
    border: 'border-fuchsia-300 hover:border-fuchsia-500 dark:border-fuchsia-500/35 dark:hover:border-fuchsia-400',
    text: 'text-fuchsia-800 hover:text-fuchsia-950 dark:text-fuchsia-300 dark:hover:text-fuchsia-200',
    dot: 'bg-fuchsia-600 dark:bg-fuchsia-400 dark:shadow-[0_0_8px_rgba(232,121,249,0.9)]',
    glow: 'hover:shadow-[0_2px_12px_rgba(217,70,239,0.18)] dark:hover:shadow-[0_0_16px_rgba(217,70,239,0.22)]',
  },
];

export function MessageBubble({ message, botName = 'bbot', onRetry, isGenerating = false, onEdit, suggestedPrompts, onSuggestedPrompt }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const status = message.status ?? 'complete';
  const isError = !isUser && status === 'error';
  const isAborted = !isUser && status === 'aborted';
  const { theme } = useTheme();
  const { t, language, currentLanguageOption } = useLanguage();
  
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const navigate = useNavigate();

  const handleVisualizeInStudio = () => {
    const contentToVisualize = showTranslated && translatedText ? translatedText : message.content;
    try {
      sessionStorage.setItem('bbot_studio_handoff', JSON.stringify({
        sourceText: contentToVisualize,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to set studio handoff:', e);
    }
    navigate('/studio');
  };

  useEffect(() => {
    setTranslatedText(null);
    setShowTranslated(false);
    setShowOriginal(false);
  }, [language]);

  const handleTranslate = async () => {
    if (translatedText) {
      setShowTranslated(!showTranslated);
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch('/api/chat/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: message.content,
          target_language: language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated_text) {
          setTranslatedText(data.translated_text);
          setShowTranslated(true);
        }
      }
    } catch (e) {
      console.error('Failed to translate message:', e);
    } finally {
      setIsTranslating(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isLineChartRequested = useMemo(() => {
    const text = message.content.toLowerCase();
    return text.includes('line chart') || text.includes('line graph') || text.includes('trend');
  }, [message.content]);

  const parsedCharts = useMemo(() => {
    if (isUser || isError) return null;
    return parseMarkdownTable(message.content);
  }, [message.content, isUser, isError]);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel(); // Cancel any existing speech
      
      // Clean up markdown before speaking
      const plainText = message.content
        .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
        .replace(/\[Source: Page \d+\]/g, '')
        .replace(/[#*`]/g, '');
        
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [editValue, isEditing]);

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== message.content && onEdit) {
      onEdit(message.id, editValue);
    }
    setIsEditing(false);
  };

  const submitFeedback = async (rating: 'positive' | 'negative', suggestionText?: string) => {
    try {
      const response = await fetch(`/api/messages/${message.id}/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, suggestion: suggestionText || null }),
      });
      if (response.ok) {
        setFeedback(rating);
        setFeedbackSaved(true);
        setShowSuggestionInput(false);
      }
    } catch {
      // Feedback is optional and must never disrupt the conversation.
    }
  };

  return (
    <div className={clsx("flex w-full mb-3 sm:mb-4 group max-w-[960px] mx-auto", isUser ? "justify-end" : "justify-start gap-2.5 sm:gap-4")}>
      {!isUser && (
        <img src="/logo.png" alt="AI Avatar" className="w-[26px] h-[26px] sm:w-[32px] sm:h-[32px] rounded-full border-2 border-[var(--accent)] shrink-0 object-cover mt-0.5 sm:mt-1" />
      )}
      
      <div className={clsx("flex flex-col gap-1 min-w-0", isUser ? "items-end max-w-[90%] sm:max-w-[78%]" : "items-start flex-1")}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-[1rem] font-bold text-[var(--accent)]">{botName}</span>
            <span className="text-[var(--text-muted)] text-[0.7rem]">Just now</span>
          </div>
        )}
        
        <div className={clsx(
          "leading-relaxed break-words overflow-hidden relative group/bubble",
          isUser 
            ? "bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm py-3 px-4 rounded-[var(--radius-lg)] rounded-br-[var(--sp-1)]" 
            : isError
              ? "bg-[rgba(250,82,82,0.1)] border border-[rgba(250,82,82,0.35)] text-[var(--error)] py-3 px-4 rounded-[var(--radius-lg)] w-full"
              : "bg-transparent text-[var(--text-primary)] w-full"
        )}>
          {isUser && !isEditing && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-2 right-2 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] opacity-0 group-hover/bubble:opacity-100 transition-opacity"
              title="Edit Message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
          )}

          {isError ? (
            <div className="font-medium">{message.content || "Couldn't generate a response"}</div>
          ) : isEditing ? (
            <div className="flex flex-col gap-2 min-w-[250px]">
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md p-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
                rows={1}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setIsEditing(false); setEditValue(message.content); }} className="px-3 py-1 text-sm rounded-md bg-[var(--bg-surface-hover)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="px-3 py-1 text-sm rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors">
                  Save & Send
                </button>
              </div>
            </div>
          ) : (
            <div className={clsx("prose prose-sm sm:prose-base max-w-none w-full leading-relaxed break-words text-[0.88rem] sm:text-[1rem]", theme === 'dark' && "prose-invert", status === 'sending' && "typing-cursor")}>
              {parsedCharts && parsedCharts.map((chart: any, idx: number) => (
                <DataChart
                  key={idx}
                  data={chart!.data}
                  xAxisKey={chart!.xAxisKey}
                  dataKeys={chart!.dataKeys}
                  theme={theme}
                  initialType={isLineChartRequested ? 'line' : 'bar'}
                />
              ))}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeHtmlSchema]]}
            components={{
              table({ children, ...props }: any) {
                return (
                  <div className="overflow-x-auto my-4 w-full border border-[var(--border-subtle)] rounded-lg">
                    <table className="w-full text-left border-collapse text-sm" {...props}>
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children, ...props }: any) {
                return <thead className="bg-[var(--bg-surface-hover)] border-b border-[var(--border-subtle)]" {...props}>{children}</thead>;
              },
              th({ children, ...props }: any) {
                return <th className="px-4 py-2 font-semibold text-[var(--text-primary)]" {...props}>{children}</th>;
              },
              td({ children, ...props }: any) {
                return <td className="px-4 py-2 border-b border-[var(--border-subtle)] text-[var(--text-secondary)]" {...props}>{children}</td>;
              },
              code({ className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeStr = String(children).replace(/\n$/, '');
                if (match) {
                  const lang = match[1].toLowerCase();
                  if (['mermaid', 'flowchart', 'diagram', 'dfd'].includes(lang) || /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap)\b/m.test(codeStr)) {
                    return <MermaidDiagram code={codeStr} theme={theme} />;
                  }
                  if (['process', 'flow', 'pipeline', 'workflow', 'steps'].includes(lang)) {
                    const steps = parseProcessFlow(codeStr);
                    if (steps && steps.length > 0) {
                      return <ProcessFlowchart steps={steps} rawContent={codeStr} />;
                    }
                    return <MermaidDiagram code={codeStr} theme={theme} />;
                  }
                  if (['html', 'markup', 'xml'].includes(lang) && (codeStr.includes('flow-chart') || codeStr.includes('step-card') || codeStr.includes('style=') || codeStr.includes('display:') || codeStr.includes('<svg') || codeStr.includes('card'))) {
                    return <HtmlDiagramPreview code={codeStr} theme={theme} />;
                  }
                  if (lang === 'chart') {
                    try {
                      const chartJson = JSON.parse(codeStr);
                      if (chartJson.data && chartJson.xAxisKey && chartJson.dataKeys) {
                        return (
                          <DataChart
                            data={chartJson.data}
                            xAxisKey={chartJson.xAxisKey}
                            dataKeys={chartJson.dataKeys}
                            theme={theme}
                            initialType={['bar', 'line', 'area'].includes(chartJson.type) ? chartJson.type : (isLineChartRequested ? 'line' : 'bar')}
                          />
                        );
                      }
                    } catch {}
                  }
                  return <CodeBlock language={match[1]} value={codeStr} theme={theme} />;
                }
                // Fallback for code blocks without explicit language annotation that contain diagram/flow syntax
                if (codeStr.includes('\n') && (/^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap)\b/m.test(codeStr) || /(?:-->|->|==>)/.test(codeStr))) {
                  return <MermaidDiagram code={codeStr} theme={theme} />;
                }
                return (
                  <code className="bg-[var(--bg-surface-hover)] text-[var(--accent)] px-1.5 py-0.5 rounded-[var(--radius-sm)] font-mono text-sm" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {showOriginal && message.original_content
              ? message.original_content
              : (showTranslated && translatedText ? translatedText : message.content)}
          </ReactMarkdown>
          </div>
          )}

        {isUser && (message.original_content || language !== 'en') && (
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[var(--text-muted)]">
            {message.original_content ? (
              <button
                type="button"
                onClick={() => setShowOriginal(!showOriginal)}
                className="rounded px-2 py-0.5 text-[0.68rem] flex items-center gap-1 transition-colors border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-2xs"
                title={showOriginal ? t('showTranslated') : t('showOriginal')}
              >
                <Languages size={11} className="text-[var(--accent)]" />
                <span>{showOriginal ? t('showTranslated') : `${t('showOriginal')} (English)`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isTranslating}
                className={clsx(
                  'rounded px-2 py-0.5 text-[0.68rem] flex items-center gap-1 transition-colors border cursor-pointer',
                  showTranslated
                    ? 'text-[var(--accent)] border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] font-semibold'
                    : 'text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                )}
                title={showTranslated ? t('showOriginal') : `${t('translateMessage')} (${currentLanguageOption.nativeName})`}
              >
                {isTranslating ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Languages size={11} />
                )}
                <span>{showTranslated ? t('showOriginal') : currentLanguageOption.nativeName}</span>
              </button>
            )}
            {message.original_content && (
              <span className="text-[0.65rem] text-[var(--text-muted)] italic">
                {t('autoTranslatedNotice', { lang: currentLanguageOption.nativeName })}
              </span>
            )}
          </div>
        )}
        
        {isAborted && (
          <div className="mt-2 text-[0.8rem] text-[var(--text-muted)]">Response was cut off</div>
        )}
        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isGenerating}
            className="mt-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline cursor-pointer border-none bg-transparent p-0"
          >
            Retry
          </button>
        )}

        {!isUser && !isError && status === 'complete' && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 text-[var(--text-muted)] flex-wrap" aria-label="Rate this answer">
              <button
                type="button"
                onClick={() => { setShowSuggestionInput(false); submitFeedback('positive'); }}
                aria-label="Helpful answer"
                aria-pressed={feedback === 'positive'}
                title="Helpful"
                className={clsx(
                  'rounded-lg p-1.5 transition-all duration-150',
                  feedback === 'positive'
                    ? 'text-emerald-700 bg-emerald-100 shadow-xs dark:text-emerald-400 dark:bg-emerald-500/15 dark:shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'text-[var(--text-muted)] hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400'
                )}
              >
                <ThumbsUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedbackSaved(false);
                  if (showSuggestionInput) {
                    setShowSuggestionInput(false);
                    submitFeedback('negative');
                  } else {
                    setShowSuggestionInput(true);
                  }
                }}
                aria-label="Unhelpful answer"
                aria-pressed={feedback === 'negative'}
                title="Not helpful"
                className={clsx(
                  'rounded-lg p-1.5 transition-all duration-150',
                  feedback === 'negative'
                    ? 'text-rose-700 bg-rose-100 shadow-xs dark:text-rose-400 dark:bg-rose-500/15 dark:shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : 'text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10 dark:hover:text-rose-400'
                )}
              >
                <ThumbsDown size={14} />
              </button>
              <button
                type="button"
                onClick={toggleSpeech}
                aria-label={isPlaying ? "Stop reading" : "Read aloud"}
                title={isPlaying ? "Stop reading" : "Read aloud"}
                className={clsx(
                  'rounded-lg p-1.5 transition-all duration-150',
                  isPlaying
                    ? 'text-sky-700 bg-sky-100 dark:text-sky-400 dark:bg-sky-500/15 dark:shadow-[0_0_10px_rgba(56,189,248,0.3)] animate-pulse'
                    : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-500/10 dark:hover:text-sky-400'
                )}
              >
                {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              {language !== 'en' && (
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className={clsx(
                    'rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium flex items-center gap-1.5 transition-all duration-150 border cursor-pointer',
                    showTranslated
                      ? 'text-indigo-900 border-indigo-400 bg-indigo-100 dark:text-indigo-300 dark:border-indigo-400 dark:bg-indigo-500/15 dark:shadow-[0_0_12px_rgba(99,102,241,0.3)] font-semibold'
                      : 'text-indigo-900 border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100 hover:border-indigo-400 dark:text-[var(--text-muted)] dark:border-indigo-500/30 dark:bg-indigo-500/5 dark:hover:text-indigo-300 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10'
                  )}
                  title={showTranslated ? t('showOriginal') : `${t('translateMessage')} (${currentLanguageOption.nativeName})`}
                >
                  {isTranslating ? (
                    <Loader2 size={12} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Languages size={12} className="text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>{showTranslated ? t('showOriginal') : currentLanguageOption.nativeName}</span>
                </button>
              )}
              {/* ✨ 1-Click Visualize in Studio Bridge */}
              {message.content && message.content.length > 20 && (
                <button
                  type="button"
                  onClick={handleVisualizeInStudio}
                  className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold flex items-center gap-1.5 transition-all duration-150 border cursor-pointer text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30 dark:hover:bg-amber-500/20 shadow-2xs hover:shadow-xs group shrink-0"
                  title="Transform this answer into an interactive visual diagram in Studio"
                >
                  <Sparkles size={12} className="text-amber-600 dark:text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
                  <span>Visualize in Studio</span>
                </button>
              )}
              {feedbackSaved && <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Thanks for your feedback</span>}
            </div>
            {showSuggestionInput && (
              <div className="flex flex-col w-full max-w-md mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] rounded-full px-4 py-2 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all shadow-sm">
                  <input 
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="Provide a correction to train the bot..."
                    className="flex-1 bg-transparent text-[var(--text-primary)] text-xs focus:outline-none placeholder-[var(--text-muted)]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && suggestion.trim()) {
                        e.preventDefault();
                        submitFeedback('negative', suggestion);
                      }
                    }}
                    autoFocus
                  />
                  {suggestion.trim() ? (
                    <button type="button" onClick={() => submitFeedback('negative', suggestion)} className="text-[var(--accent)] hover:opacity-80 transition-opacity" title="Save correction">
                      <Send size={14} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setShowSuggestionInput(false); submitFeedback('negative'); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[10px] uppercase font-bold tracking-wider px-1">
                      Skip
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {!isUser && !isError && suggestedPrompts?.length && onSuggestedPrompt && (
          <div className="mt-3.5 flex flex-wrap gap-2" aria-label="Suggested document actions">
            {suggestedPrompts.map((prompt, idx) => {
              const theme = OPTION_CHIP_THEMES[idx % OPTION_CHIP_THEMES.length];
              return (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSuggestedPrompt(prompt)}
                  className={clsx(
                    'group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-left text-xs font-medium transition-all duration-150 backdrop-blur-xs shadow-xs',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    theme.bg,
                    theme.border,
                    theme.text,
                    theme.glow
                  )}
                >
                  <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125', theme.dot)} />
                  <span className="leading-snug">{prompt}</span>
                </button>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
