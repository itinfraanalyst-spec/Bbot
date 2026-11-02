import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Globe, Check, ChevronDown, Sparkles } from 'lucide-react';

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({ compact = false, className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, currentLanguageOption, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredLanguages = supportedLanguages.filter(
    (l) =>
      l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      l.englishName.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${
          compact ? 'text-xs' : 'text-xs font-medium'
        }`}
        title={`Language: ${currentLanguageOption.englishName} (${currentLanguageOption.nativeName})`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Globe size={14} className="text-[var(--accent)] shrink-0" />
        <span className="shrink-0">{currentLanguageOption.flag}</span>
        <span className="font-semibold truncate max-w-[85px] sm:max-w-[120px]">
          {currentLanguageOption.nativeName}
        </span>
        <ChevronDown size={12} className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Modal Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                <Sparkles size={12} className="text-[var(--accent)]" />
                Select Language / भाषा
              </div>
              <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] font-semibold">
                11 Languages
              </span>
            </div>
            <p className="text-[0.7rem] text-[var(--text-muted)] mt-0.5">
              AI will formulate answers in the selected language
            </p>

            {/* Quick Search */}
            <div className="mt-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search language / खोजें..."
                className="w-full px-2.5 py-1 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                autoFocus
              />
            </div>
          </div>

          {/* Language Options List */}
          <div className="max-h-64 overflow-y-auto py-1 divide-y divide-[var(--border-subtle)]/40">
            {filteredLanguages.map((option) => {
              const isSelected = option.code === language;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setLanguage(option.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors cursor-pointer border-none ${
                    isSelected
                      ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]'
                      : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{option.flag}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                        <span className="truncate">{option.nativeName}</span>
                        {option.code === 'hinglish' && (
                          <span className="text-[0.6rem] px-1 py-0.2 rounded bg-amber-500/20 text-amber-500 font-mono">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <div className="text-[0.68rem] text-[var(--text-muted)] truncate">
                        {option.englishName} • <span className="italic">"{option.sampleGreeting}"</span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0 ml-2">
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}

            {filteredLanguages.length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                No matching languages found
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[0.68rem] text-[var(--text-muted)]">
            <span>Preserves charts, code & DFDs</span>
            <span className="font-mono text-[var(--accent)] font-semibold">Qwen 2.5 Multilingual</span>
          </div>
        </div>
      )}
    </div>
  );
}
