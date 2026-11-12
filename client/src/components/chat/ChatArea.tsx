import { useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useLanguage, UI_TRANSLATIONS } from '../../contexts/LanguageContext';
import { MessageBubble } from './MessageBubble';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'sending' | 'complete' | 'aborted' | 'error' | 'timeout';
}

interface ChatAreaProps {
  messages: Message[];
  isGenerating: boolean;
  botName?: string;
  onRetry?: (message: Message) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  documentsCount?: number;
  onSuggestedPrompt?: (prompt: string) => void;
  username?: string | null;
  starterQuestions?: string[];
}

export function canShowSuggestedPrompts(messages: Message[], index: number, isGenerating: boolean, message: Message): boolean {
  return !isGenerating && index === messages.length - 1 && message.role === 'assistant' && message.status !== 'error';
}



export function getDisplayName(username: string | null | undefined): string {
  const localPart = username?.split('@')[0].trim();
  if (!localPart) return 'there';

  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const SUGGESTIONS_BY_LANG: Record<string, {
  summary: [string, string];
  compare: [string, string];
  policy: [string, string];
  date: [string, string];
  steps: [string, string];
  decision: [string, string];
  explain: [string, string];
  general: (ctx: string) => [string, string];
}> = {
  en: {
    summary: ['Extract action items', 'Show the supporting sections'],
    compare: ['Highlight the biggest differences', 'Identify possible conflicts'],
    policy: ['Show exceptions or limitations', 'List the required next steps'],
    date: ['Find all related dates', 'Show the source sections'],
    steps: ['Break it into steps', 'Explain the common mistakes'],
    decision: ['Explain the trade-offs', 'Recommend a next step'],
    explain: ['Explain it more simply', 'Go deeper on this'],
    general: (ctx: string) => [`Can you explain "${ctx}" in more detail?`, `What is the practical next step for "${ctx}"?`],
  },
  gu: {
    summary: ['મુખ્ય પગલાં અલગ તારવો', 'સહાયક વિભાગો બતાવો'],
    compare: ['સૌથી મોટા તફાવતો દર્શાવો', 'સંભવિત વિરોધાભાસ ઓળખો'],
    policy: ['અપવાદો અથવા મર્યાદાઓ બતાવો', 'જરૂરી આગળનાં પગલાંઓની યાદી બનાવો'],
    date: ['બધી સંબંધિત તારીખો શોધો', 'સ્રોત વિભાગો બતાવો'],
    steps: ['આને પગલાંઓમાં વિભાજિત કરો', 'સામાન્ય ભૂલો સમજાવો'],
    decision: ['ફાયદા અને ગેરફાયદા સમજાવો', 'આગળનું પગલું સૂચવો'],
    explain: ['વધુ સરળ રીતે સમજાવો', 'આના પર ઊંડાણપૂર્વક સમજાવો'],
    general: (ctx: string) => [`"${ctx}" વિશે વધુ વિગતવાર સમજાવો`, `"${ctx}" માટે આગળનું વ્યવહારુ પગલું શું છે?`],
  },
  hi: {
    summary: ['कार्य योजना निकालें', 'सहायक अनुभाग दिखाएं'],
    compare: ['मुख्य अंतर स्पष्ट करें', 'संभावित टकराव पहचानें'],
    policy: ['अपवाद और सीमाएं दिखाएं', 'आवश्यक अगले कदम बताएं'],
    date: ['सभी संबंधित तारीखें खोजें', 'स्रोत अनुभाग दिखाएं'],
    steps: ['इसे चरणों में समझाएं', 'सामान्य गलतियां बताएं'],
    decision: ['नफा-नुकसान बताएं', 'अगला कदम सुझाएं'],
    explain: ['इसे और सरल भाषा में समझाएं', 'विस्तार से समझाएं'],
    general: (ctx: string) => [`"${ctx}" को और विस्तार से समझाइए`, `"${ctx}" के लिए अगला कदम क्या है?`],
  },
  hinglish: {
    summary: ['Extract key action items', 'Show supporting sections'],
    compare: ['Show main differences', 'Check possible conflicts'],
    policy: ['Explain exceptions and limitations', 'List next steps'],
    date: ['Find related dates', 'Check source sections'],
    steps: ['Break down into steps', 'Highlight common mistakes'],
    decision: ['Explain trade-offs', 'Recommend next steps'],
    explain: ['Explain in simpler terms', 'Explain in deeper detail'],
    general: (ctx: string) => [`Explain "${ctx}" in more detail`, `What is the next practical step for "${ctx}"?`],
  },
};

export function getSuggestedPrompts(messages: Message[], assistantIndex: number, documentsCount: number, language: string = 'en'): string[] {
  const assistantContent = messages[assistantIndex]?.content.toLowerCase() || '';
  if (/could you (please )?(specify|clarify)|what (context|field|would you like)|please provide more context/.test(assistantContent)) {
    return [];
  }

  // Return no suggestions for custom bots with documents
  if (documentsCount > 0) {
    return [];
  }

  const previousUserMessage = [...messages.slice(0, assistantIndex)]
    .reverse()
    .find((message) => message.role === 'user' && !/what is the next useful question|what related question should i ask|what is the practical next step/i.test(message.content))?.content || '';
  const normalizedUserMessage = previousUserMessage.toLowerCase();
  const topic = previousUserMessage.replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '').slice(0, 90);

  const s = SUGGESTIONS_BY_LANG[language] || SUGGESTIONS_BY_LANG.en;

  if (/summar|overview|main points|key points/.test(normalizedUserMessage)) {
    return s.summary;
  }

  if (/compar|difference|versus| vs\.? |similar|different/.test(normalizedUserMessage)) {
    return s.compare;
  }

  if (/policy|rule|require|allow|approval|exception|compliance/.test(normalizedUserMessage)) {
    return s.policy;
  }

  if (/date|deadline|when|timeline|schedule|time/.test(normalizedUserMessage)) {
    return s.date;
  }

  if (/how do|how can|steps|help me|guide|learn/.test(normalizedUserMessage)) {
    return s.steps;
  }

  if (/should i|which|recommend|best|decide|choice|option/.test(normalizedUserMessage)) {
    return s.decision;
  }

  if (/why|explain|meaning|what does|how does/.test(normalizedUserMessage)) {
    return s.explain;
  }

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|kem cho)\b/i.test(normalizedUserMessage)) {
    const langDict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
    return [
      langDict.suggestNextTopic || 'What topic should we explore next?',
      langDict.suggestClarifyFirst || 'What should we clarify first?'
    ];
  }

  const context = topic || 'the last answer';
  return s.general(context);
}

export function ChatArea({ messages, isGenerating, botName = 'bbot', onRetry, onEdit, onDeleteMessage, documentsCount = 0, onSuggestedPrompt, username, starterQuestions }: ChatAreaProps) {
  const { t, language } = useLanguage();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hiddenStarters, setHiddenStarters] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const displayName = getDisplayName(username);

  const activeStarters = (starterQuestions || []).filter(q => !hiddenStarters.has(q));
  const showIntroStarters = messages.length === 0;

  // Group activeStarters into topics
  const parsedTopics = useMemo(() => {
    const map: Record<string, { full: string; text: string }[]> = {};
    activeStarters.forEach((raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const colonMatch = trimmed.match(/^([^:\n\r]{2,30}):\s*(.*)$/);
      if (colonMatch && !trimmed.startsWith('http') && colonMatch[1] && colonMatch[2]) {
        const cat = colonMatch[1].trim();
        if (!map[cat]) map[cat] = [];
        map[cat].push({ full: raw, text: colonMatch[2].trim() });
        return;
      }
      const bracketMatch = trimmed.match(/^\[(.*?)\]\s*(.*)$/);
      if (bracketMatch && bracketMatch[1] && bracketMatch[2]) {
        const cat = bracketMatch[1].trim();
        if (!map[cat]) map[cat] = [];
        map[cat].push({ full: raw, text: bracketMatch[2].trim() });
        return;
      }
      const def = 'General';
      if (!map[def]) map[def] = [];
      map[def].push({ full: raw, text: trimmed });
    });
    return map;
  }, [activeStarters]);

  const topicKeys = Object.keys(parsedTopics);

  const ChatIntro = () => (
    <div className="flex w-full items-start pt-8 pb-8">
      <div className="flex w-full max-w-[960px] mx-auto items-start gap-4 px-4 sm:px-6 lg:px-8">
        <div className="relative mt-1 inline-flex shrink-0">
          <img src="/logo.png" alt="AI Avatar" className="w-[32px] h-[32px] rounded-full border-2 border-[var(--accent)] object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[1rem] font-bold text-[var(--accent)]">{botName}</span>
            <span className="text-[var(--text-muted)] text-[0.7rem]">{t('justNow')}</span>
          </div>
          <div className="mt-1 max-w-[720px] space-y-2">
            <p className="text-[var(--text-primary)] leading-relaxed">
              {t('welcomeGreeting', { displayName, botName })}
            </p>

            {showIntroStarters && activeStarters.length > 0 && (
              <div className="mt-6 space-y-3 pt-2">
                {topicKeys.length > 1 && !selectedTopic ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                      <span>📂</span>
                      <span>{t('selectTopic')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topicKeys.map((topicName, tIdx) => {
                        const TOPIC_GRADIENTS = [
                          'from-amber-500 to-amber-600 hover:shadow-[0_0_14px_rgba(245,158,11,0.35)]',
                          'from-emerald-500 to-teal-600 hover:shadow-[0_0_14px_rgba(16,185,129,0.35)]',
                          'from-violet-500 to-indigo-600 hover:shadow-[0_0_14px_rgba(139,92,246,0.35)]',
                          'from-rose-500 to-pink-600 hover:shadow-[0_0_14px_rgba(244,63,94,0.35)]',
                          'from-cyan-500 to-blue-600 hover:shadow-[0_0_14px_rgba(6,182,212,0.35)]',
                        ];
                        const grad = TOPIC_GRADIENTS[tIdx % TOPIC_GRADIENTS.length];
                        return (
                          <button
                            key={topicName}
                            onClick={() => setSelectedTopic(topicName)}
                            className={`inline-flex items-center gap-2 rounded-full border border-transparent bg-gradient-to-r ${grad} px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95`}
                          >
                            <span>{topicName}</span>
                            <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[0.65rem] font-bold">
                              {parsedTopics[topicName].length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topicKeys.length > 1 && selectedTopic && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTopic(null)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                        >
                          {t('backToTopics')}
                        </button>
                        <span className="text-xs font-semibold text-[var(--accent)]">
                          • {selectedTopic}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(selectedTopic ? parsedTopics[selectedTopic] || [] : activeStarters.map((q) => ({ full: q, text: q }))).map((item, idx) => {
                        const STARTER_THEMES = [
                          {
                            border: 'hover:border-emerald-400 dark:hover:border-emerald-400',
                            bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
                            text: 'hover:text-emerald-800 dark:hover:text-emerald-300',
                            glow: 'hover:shadow-[0_2px_12px_rgba(16,185,129,0.18)] dark:hover:shadow-[0_0_16px_rgba(16,185,129,0.22)]',
                            dot: 'bg-emerald-600 dark:bg-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.8)]',
                          },
                          {
                            border: 'hover:border-violet-400 dark:hover:border-violet-400',
                            bg: 'hover:bg-violet-50 dark:hover:bg-violet-500/10',
                            text: 'hover:text-violet-800 dark:hover:text-violet-300',
                            glow: 'hover:shadow-[0_2px_12px_rgba(139,92,246,0.18)] dark:hover:shadow-[0_0_16px_rgba(139,92,246,0.22)]',
                            dot: 'bg-violet-600 dark:bg-violet-400 dark:shadow-[0_0_8px_rgba(167,139,250,0.8)]',
                          },
                          {
                            border: 'hover:border-amber-400 dark:hover:border-amber-400',
                            bg: 'hover:bg-amber-50 dark:hover:bg-amber-500/10',
                            text: 'hover:text-amber-900 dark:hover:text-amber-300',
                            glow: 'hover:shadow-[0_2px_12px_rgba(245,158,11,0.18)] dark:hover:shadow-[0_0_16px_rgba(245,158,11,0.22)]',
                            dot: 'bg-amber-600 dark:bg-amber-400 dark:shadow-[0_0_8px_rgba(251,191,36,0.8)]',
                          },
                          {
                            border: 'hover:border-rose-400 dark:hover:border-rose-400',
                            bg: 'hover:bg-rose-50 dark:hover:bg-rose-500/10',
                            text: 'hover:text-rose-800 dark:hover:text-rose-300',
                            glow: 'hover:shadow-[0_2px_12px_rgba(244,63,94,0.18)] dark:hover:shadow-[0_0_16px_rgba(244,63,94,0.22)]',
                            dot: 'bg-rose-600 dark:bg-rose-400 dark:shadow-[0_0_8px_rgba(251,113,133,0.8)]',
                          },
                          {
                            border: 'hover:border-cyan-400 dark:hover:border-cyan-400',
                            bg: 'hover:bg-cyan-50 dark:hover:bg-cyan-500/10',
                            text: 'hover:text-cyan-900 dark:hover:text-cyan-300',
                            glow: 'hover:shadow-[0_2px_12px_rgba(6,182,212,0.18)] dark:hover:shadow-[0_0_16px_rgba(6,182,212,0.22)]',
                            dot: 'bg-cyan-600 dark:bg-cyan-400 dark:shadow-[0_0_8px_rgba(34,211,238,0.8)]',
                          },
                        ];
                        const theme = STARTER_THEMES[idx % STARTER_THEMES.length];
                        return (
                          <button
                            key={idx}
                            disabled={isGenerating}
                            onClick={() => {
                              if (isGenerating) return;
                              const newHidden = new Set(hiddenStarters);
                              newHidden.add(item.full);
                              setHiddenStarters(newHidden);
                              onSuggestedPrompt?.(item.text);
                            }}
                            className={`group inline-flex items-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-left shadow-sm ${theme.border} ${theme.bg} ${theme.text} ${theme.glow} ${isGenerating ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${theme.dot} transition-transform group-hover:scale-125`} />
                            <span>{item.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 w-full h-full relative min-h-0">
      <Virtuoso
        className="w-full h-full"
        data={messages}
        ref={virtuosoRef}
        followOutput={(isAtBottom) => isAtBottom ? 'auto' : false}
        atBottomStateChange={setIsAtBottom}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        itemContent={(index, msg) => {
          const isLatestAndReady = canShowSuggestedPrompts(messages, index, isGenerating, msg);
          let promptsToShow: string[] | undefined = undefined;
          
          if (isLatestAndReady) {
            // Once messages exist, show contextual follow-up suggestions rather than repeating the intro greeting
            promptsToShow = getSuggestedPrompts(messages, index, documentsCount, language);
          }

          return (
            <div className="flex flex-col items-center w-full px-4 sm:px-6 lg:px-8 pb-8 overflow-x-hidden">
              <MessageBubble
                  message={msg}
                  botName={botName}
                  onRetry={onRetry && msg.status === 'error' ? () => onRetry(msg) : undefined}
                  onDismiss={onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined}
                  isGenerating={isGenerating}
                  onEdit={onEdit}
                  suggestedPrompts={promptsToShow}
                  onSuggestedPrompt={(q) => {
                    if (isGenerating) return;
                    if (activeStarters.includes(q)) {
                      setHiddenStarters(prev => new Set(prev).add(q));
                    }
                    onSuggestedPrompt?.(q);
                  }}
                />
            </div>
          );
        }}
        components={{
          Header: () => <ChatIntro />,
          Footer: () => (
            <div className="flex flex-col items-center w-full px-4 sm:px-6 lg:px-8 pb-[160px]">
              {isGenerating && (
                <div className="flex w-full max-w-[800px] flex-row items-start gap-4 animate-[fadeIn_0.3s_ease-out]">
                  <img src="/logo.png" className="w-[32px] h-[32px] rounded-full border-2 border-[var(--accent)] shrink-0 object-cover mt-1 animate-[avatar-glow_1.5s_infinite_alternate] shadow-[0_0_12px_var(--accent)]" />
                  <div className="text-[var(--text-muted)] text-sm animate-pulse mt-2">
                    {t('thinking')}
                  </div>
                </div>
              )}
            </div>
          )
        }}
      />
      {!isAtBottom && (
        <button
          type="button"
          aria-label="Jump to latest"
          title="Jump to latest"
          onClick={() => virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' })}
          className="absolute bottom-5 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-lg transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
}
