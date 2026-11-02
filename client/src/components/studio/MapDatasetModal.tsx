import React, { useState } from 'react';
import { X, Sparkles, Database, FileText, CheckCircle2, Layers } from 'lucide-react';
import type { DiagramSpec } from './types';
import { parseDatasetText, mapDatasetItemsToTemplate, applyTemplateToDataset, SAMPLE_DATASETS } from './templateMapper';

export interface MapDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DiagramSpec | null;
  templateName: string;
  currentDiagram?: DiagramSpec;
  onApply: (mappedDiagram: DiagramSpec) => void;
}

export const MapDatasetModal: React.FC<MapDatasetModalProps> = ({
  isOpen,
  onClose,
  template,
  templateName,
  currentDiagram,
  onApply,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'current'>('paste');
  const [rawText, setRawText] = useState<string>(() => {
    return SAMPLE_DATASETS[0].items
      .map((it) => `${it.label} - ${it.sublabel || ''}`)
      .join('\n');
  });
  const [customTitle, setCustomTitle] = useState<string>('');

  if (!isOpen || !template) return null;

  const parsedItems = parseDatasetText(rawText);

  const handleApplyPaste = () => {
    if (parsedItems.length === 0) return;
    const finalDiagram = mapDatasetItemsToTemplate(parsedItems, template, customTitle.trim() || undefined);
    onApply(finalDiagram);
    onClose();
  };

  const handleApplyCurrentData = () => {
    if (!currentDiagram) return;
    const finalDiagram = applyTemplateToDataset(template, currentDiagram);
    onApply(finalDiagram);
    onClose();
  };

  const handleLoadSample = (sampleId: string) => {
    const s = SAMPLE_DATASETS.find((d) => d.id === sampleId);
    if (!s) return;
    const text = s.items.map((it) => `${it.label} - ${it.sublabel || ''}`).join('\n');
    setRawText(text);
    if (!customTitle) setCustomTitle(s.name);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl animate-in zoom-in-95 flex flex-col gap-4 text-left pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Implement Template on Dataset
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Apply <span className="font-semibold text-indigo-400">"{templateName}"</span> box shapes, colors, sizes & layout to any dataset.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <FileText size={13} />
            <span>Paste New Dataset (List, CSV, JSON)</span>
          </button>

          {currentDiagram && currentDiagram.nodes.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
              }`}
            >
              <Layers size={13} />
              <span>Use Current Canvas Data ({currentDiagram.nodes.length} stages)</span>
            </button>
          )}
        </div>

        {/* Tab Content 1: Paste New Dataset */}
        {activeTab === 'paste' && (
          <div className="flex flex-col gap-3">
            {/* Quick Sample Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[0.68rem] text-[var(--text-muted)] font-medium">Quick Datasets:</span>
              {SAMPLE_DATASETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleLoadSample(s.id)}
                  className="px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[0.65rem] font-medium text-[var(--text-secondary)] hover:text-indigo-400 hover:border-indigo-400/40 transition-colors cursor-pointer"
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Title override */}
            <div>
              <span className="text-[0.68rem] text-[var(--text-muted)] block mb-1 font-medium">
                Diagram Title (Optional)
              </span>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Enterprise Order Flow"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Raw Dataset Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.68rem] text-[var(--text-muted)] font-medium">
                  Dataset Content (1 stage per line, "Stage - Description", CSV or JSON)
                </span>
                <span className="text-[0.65rem] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                  {parsedItems.length} stages detected
                </span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={6}
                placeholder={"Stage 1 - Description of milestone\nStage 2 - Description of milestone\nStage 3 - Description of milestone"}
                className="w-full p-2.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
              />
            </div>

            {/* Template Blueprint Summary */}
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" />
                <span className="text-[var(--text-secondary)]">
                  Will map into <span className="font-bold text-[var(--text-primary)]">{template.nodes?.length || 4}-stage blueprint</span> retaining all box shapes, custom colors & connectors.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Use Current Canvas Data */}
        {activeTab === 'current' && currentDiagram && (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)]">{currentDiagram.title || 'Current Diagram Data'}</span>
                <span className="font-mono text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full font-bold">
                  {currentDiagram.nodes.length} Stages
                </span>
              </div>
              <p className="text-[0.68rem] text-[var(--text-muted)]">
                This will keep all the text labels and descriptions of your current diagram, but completely transform their visual styling to match the <span className="font-bold text-indigo-400">"{templateName}"</span> template (box shapes, sizes, colors, coordinates, glow & edge lines).
              </p>
              <div className="space-y-1 mt-1 border-t border-[var(--border-subtle)] pt-2 max-h-40 overflow-y-auto scrollbar-thin">
                {currentDiagram.nodes.map((node, i) => (
                  <div key={node.id} className="flex items-center gap-2 text-[0.7rem] text-[var(--text-secondary)]">
                    <span className="font-mono text-[0.6rem] font-bold text-[var(--text-muted)]">#{i + 1}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{node.label}</span>
                    {node.sublabel && <span className="text-[var(--text-muted)] truncate">— {node.sublabel}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {activeTab === 'paste' ? (
            <button
              type="button"
              onClick={handleApplyPaste}
              disabled={parsedItems.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:brightness-110 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Apply Dataset to Template</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyCurrentData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:brightness-110 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Apply Template Style to Current Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
