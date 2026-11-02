import { useState } from 'react';
import { Code, Copy, Check, Eye, Sparkles } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface HtmlDiagramPreviewProps {
  code: string;
  theme: string;
}

export function HtmlDiagramPreview({ code, theme }: HtmlDiagramPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Strip full html/head/body wrappers if model included them
  let sanitizedHtml = code;
  const bodyMatch = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  
  if (bodyMatch) {
    sanitizedHtml = (styleMatch ? `<style>${styleMatch[1]}</style>` : '') + bodyMatch[1];
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 shadow-sm transition-all">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(200,117,20,0.12)] text-[var(--accent)]">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Interactive Visual Diagram
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Eye size={12} />
              Visual Diagram
            </button>
            <button
              type="button"
              onClick={() => setViewMode('source')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                viewMode === 'source'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code size={12} />
              Source HTML
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      {viewMode === 'preview' ? (
        <div className="p-4 overflow-x-auto bg-[var(--bg-surface)] min-h-[160px]">
          <div
            className="html-diagram-canvas max-w-full"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto text-xs">
          <SyntaxHighlighter
            language="markup"
            style={theme === 'dark' ? vscDarkPlus : oneLight}
            customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
