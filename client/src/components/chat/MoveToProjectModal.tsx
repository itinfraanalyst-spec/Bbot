import { useState } from 'react';
import { X, Folder, Check, ArrowRight } from 'lucide-react';
import type { Project } from '../../hooks/useProjects';

interface MoveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationTitle: string;
  currentProjectId?: string | null;
  projects: Project[];
  onAssign: (projectId: string | null) => Promise<void>;
}

export function MoveToProjectModal({
  isOpen,
  onClose,
  conversationTitle,
  currentProjectId,
  projects,
  onAssign,
}: MoveToProjectModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentProjectId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onAssign(selectedId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Move Thread to Project</h3>
            <p className="text-xs text-[var(--text-muted)] truncate max-w-[240px]">
              {conversationTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {/* General (Unassigned) option */}
          <div
            onClick={() => setSelectedId(null)}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
              selectedId === null
                ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-stone-500/20 flex items-center justify-center text-stone-500">
                •
              </div>
              <span>General (No Project)</span>
            </div>
            {selectedId === null && <Check size={14} className="text-[var(--accent)]" />}
          </div>

          {/* Project List */}
          {projects.map((proj) => {
            const isSelected = selectedId === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => setSelectedId(proj.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--text-primary)] font-semibold shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 text-[0.65rem]"
                    style={{ backgroundColor: proj.color || '#d97706' }}
                  >
                    <Folder size={11} />
                  </div>
                  <span className="truncate">{proj.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[0.68rem] font-bold text-[var(--accent)]">{proj.progress}%</span>
                  {isSelected && <Check size={14} className="text-[var(--accent)]" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <ArrowRight size={13} />
            {isSubmitting ? 'Moving...' : 'Move Thread'}
          </button>
        </div>
      </div>
    </div>
  );
}
