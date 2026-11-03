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

export function ProjectModal({ isOpen, onClose, onSubmit, initialProject }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#d97706');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || '');
      setDescription(initialProject.description || '');
      setColor(initialProject.color || '#d97706');
    } else {
      setName('');
      setDescription('');
      setColor('#d97706');
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
        progress: initialProject?.progress || 0,
        status: initialProject?.status || 'IN_PROGRESS',
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
        className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs text-white" style={{ backgroundColor: color }}>
              <Folder size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {initialProject ? 'Edit Project' : 'New Project'}
              </h3>
              <p className="text-[0.7rem] text-[var(--text-muted)]">
                Group related conversation threads
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Project Name <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. HR Policy Overhaul, Q4 Marketing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Objective (optional)
            </label>
            <input
              type="text"
              placeholder="Brief note or goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Color Tag
            </label>
            <div className="flex items-center gap-2 pt-0.5">
              {COLOR_OPTIONS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setColor(col.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                    color === col.hex ? 'scale-115 border-white shadow-sm ring-2 ring-[var(--accent)]' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer border-none"
            >
              <Sparkles size={12} />
              {isSubmitting ? 'Saving...' : initialProject ? 'Save' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
