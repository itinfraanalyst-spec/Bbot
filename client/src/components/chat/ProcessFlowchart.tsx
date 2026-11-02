import { useState } from 'react';
import { ArrowRight, Check, Code, Copy, GitCommit, Sparkles } from 'lucide-react';
import type { ProcessStep } from '../../utils/processParser';

interface ProcessFlowchartProps {
  steps: ProcessStep[];
  rawContent: string;
}

export function ProcessFlowchart({ steps, rawContent }: ProcessFlowchartProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 shadow-sm transition-all hover:border-[var(--border-subtle)]/80">
      {/* Flowchart Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(200,117,20,0.12)] text-[var(--accent)]">
            <GitCommit size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Process Pipeline
          </span>
          <span className="rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)]">
            {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[0.7rem] font-medium transition-colors ${
                viewMode === 'visual'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles size={11} />
              Visual Flow
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[0.7rem] font-medium transition-colors ${
                viewMode === 'code'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code size={11} />
              Raw
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy process"
          >
            {copied ? <Check size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'visual' ? (
        <div className="p-4 overflow-x-auto">
          {/* Horizontal Flow Container */}
          <div className="flex min-w-full items-stretch gap-3 pb-1">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              return (
                <div key={step.number} className="flex items-center gap-3 shrink-0">
                  {/* Step Card */}
                  <div className="relative flex flex-col justify-between w-[200px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md">
                    {/* Top Row: Step Badge */}
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[0.7rem] font-bold text-white shadow-sm">
                        {step.number}
                      </span>
                      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                        Stage {step.number}
                      </span>
                    </div>

                    {/* Step Title */}
                    <h5 className="text-xs font-bold leading-snug text-[var(--text-primary)]">
                      {step.title}
                    </h5>

                    {/* Step Description */}
                    {step.description && (
                      <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--text-secondary)] line-clamp-3">
                        {step.description}
                      </p>
                    )}
                  </div>

                  {/* Connecting Arrow */}
                  {!isLast && (
                    <div className="flex shrink-0 items-center justify-center text-[var(--accent)] opacity-80">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(200,117,20,0.12)] border border-[rgba(200,117,20,0.25)]">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface-hover)] p-4">
          <pre className="overflow-x-auto font-mono text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {rawContent}
          </pre>
        </div>
      )}
    </div>
  );
}
