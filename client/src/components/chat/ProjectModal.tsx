import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { X, Folder, Sparkles } from 'lucide-react';
import type { Project } from '../../hooks/useProjects';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; color: string; progress: number; status: string }) => Promise<void>;
  initialProject?: Project | null;
}

const COLOR_OPTIONS = [
  { label: 'Amber', hex: '#d97706' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Blue', hex: '#2563eb' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Rose', hex: '#e11d48' },
  { label: 'Cyan', hex: '#0891b2' },
];

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planning', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  { value: 'REVIEW', label: 'Review', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
];

export function ProjectModal({ isOpen, onClose, onSubmit, initialProject }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#d97706');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('IN_PROGRESS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || '');
      setDescription(initialProject.description || '');
      setColor(initialProject.color || '#d97706');
      setProgress(initialProject.progress || 0);
      setStatus(initialProject.status || 'IN_PROGRESS');
    } else {
      setName('');
      setDescription('');
      setColor('#d97706');
      setProgress(0);
      setStatus('IN_PROGRESS');
    }
    setError('');
  }, [initialProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        color,
        progress: Number(progress),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs text-white" style={{ backgroundColor: color }}>
              <Folder size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {initialProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Group related conversation threads and track milestone progress.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Project Name <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HR SOP Manual 2026, Q4 Sales Campaign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Objective / Description (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of the project goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Color Tag
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_OPTIONS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setColor(col.hex)}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      color === col.hex ? 'scale-110 border-white shadow-sm ring-2 ring-[var(--accent)]' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Project Progress
              </label>
              <span className="text-xs font-bold text-[var(--accent)]">
                {progress}%
              </span>
            </div>
            
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />

            <div className="flex items-center justify-between gap-1 mt-2">
              {[0, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setProgress(pct)}
                  className={`px-2 py-0.5 rounded text-[0.68rem] font-semibold border transition-all cursor-pointer ${
                    progress === pct
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Sparkles size={13} />
              {isSubmitting ? 'Saving...' : initialProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

