import { useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  MessageSquare, 
  Edit2, 
  Trash2, 
  Pin, 
  PinOff, 
  Settings, 
  Search, 
  Lock, 
  Lightbulb, 
  Send, 
  X, 
  Folder, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  FolderKanban,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { useConversations } from '../../hooks/useConversations';
import { useProjects, type Project } from '../../hooks/useProjects';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProjectModal } from './ProjectModal';
import { MoveToProjectModal } from './MoveToProjectModal';

interface SidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: (projectId?: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  activeProjectId?: string | null;
}

export function Sidebar({ 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation, 
  isOpen, 
  onClose,
  activeProjectId
}: SidebarProps) {
  const { t } = useLanguage();
  const { 
    conversations, 
    isLoading, 
    isError, 
    refetch, 
    deleteConversation, 
    renameConversation, 
    togglePin, 
    assignProject 
  } = useConversations();
  const { 
    projects, 
    createProject, 
    updateProject, 
    deleteProject 
  } = useProjects();
  const { logout, isAdmin, userId, username } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  
  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Move to Project State
  const [movingConversation, setMovingConversation] = useState<{ id: string; title: string; projectId?: string | null } | null>(null);

  // Profile & Password & Feedback state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('AI Training Rule');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: prev[projectId] === undefined ? false : !prev[projectId]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwords.next !== passwords.confirm) { setPasswordError('New passwords do not match'); return; }
    const response = await fetch('/auth/change-password', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: passwords.current, new_password: passwords.next }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setPasswordError(data.detail || 'Unable to change password'); return; }
    setPasswordMessage('Password changed successfully');
    setPasswords({ current: '', next: '', confirm: '' });
  };

  const submitSuggestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackError('');
    const response = await fetch('/auth/feedback/suggestions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: feedbackCategory, message: feedbackText.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setFeedbackError(data.detail || 'Unable to send suggestion'); return; }
    setFeedbackText('');
    setFeedbackSent(true);
  };

  const handleRename = (e: MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    const newTitle = prompt("Enter new title:", currentTitle);
    if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
      renameConversation({ id, title: newTitle.trim() });
    }
  };

  const handleDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this thread?")) {
      deleteConversation(id);
      if (currentConversationId === id) {
        onNewConversation();
      }
    }
  };

  const handleTogglePin = (e: MouseEvent, id: string, isPinned: boolean) => {
    e.stopPropagation();
    togglePin({ id, isPinned });
  };

  const handleEditProject = (e: MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = async (e: MouseEvent, project: Project) => {
    e.stopPropagation();
    if (confirm(`Delete project "${project.name}"? Its threads will be kept in General chats.`)) {
      await deleteProject(project.id);
    }
  };

  const handleNewThreadInProject = (e: MouseEvent, projectId: string) => {
    e.stopPropagation();
    setExpandedProjects(prev => ({ ...prev, [projectId]: true }));
    onNewConversation(projectId);
  };

  // Group conversations by project
  const projectThreadsMap: Record<string, typeof conversations> = {};
  const generalConversations: typeof conversations = [];

  (conversations || []).forEach((conv) => {
    if (!conv) return;
    if (conv.project_id) {
      if (!projectThreadsMap[conv.project_id]) projectThreadsMap[conv.project_id] = [];
      projectThreadsMap[conv.project_id].push(conv);
    } else {
      generalConversations.push(conv);
    }
  });

  const query = (searchQuery || '').toLowerCase().trim();

  const filteredProjects = (projects || []).filter((p) => {
    if (!p) return false;
    if (!query) return true;
    if ((p.name || '').toLowerCase().includes(query)) return true;
    const threads = projectThreadsMap[p.id] || [];
    return threads.some(t => t && (t.title || '').toLowerCase().includes(query));
  });

  const filteredGeneral = generalConversations.filter((c) => {
    if (!c) return false;
    if (!query) return true;
    return (c.title || '').toLowerCase().includes(query);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">Done</span>;
      case 'REVIEW':
        return <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20">Review</span>;
      case 'PLANNING':
        return <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20">Plan</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">In Progress</span>;
    }
  };

  return (
    <div className={clsx(
      "w-[85vw] max-w-[290px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col h-full shrink-0 transition-transform duration-300 z-50",
      "fixed inset-y-0 left-0 md:relative md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Sidebar Header */}
      <div className="py-5 px-3.5 flex flex-col gap-3.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="w-[26px] h-[26px] rounded-full object-cover" />
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.01em]">TRPW <span className="text-[var(--accent)]">bbot</span></h2>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-[var(--bg-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Buttons: New Chat & New Project */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNewConversation()}
            className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border-none"
            title="Start a new chat thread"
          >
            <MessageSquare size={14} />
            <span>{t('newChat')}</span>
          </button>

          <button
            onClick={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
            title="Create a new Project Workspace with threads"
          >
            <FolderPlus size={14} className="text-[var(--accent)]" />
            <span className="hidden xs:inline">Project</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full">
          <Search size={13} className="absolute left-2.5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search projects & threads..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* Main Content: Projects & Threads Accordion */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-3">
        {isLoading ? (
          <div className="text-[var(--text-muted)] text-xs p-3 text-center animate-pulse">Loading workspace...</div>
        ) : isError ? (
          <div className="text-[var(--error)] text-xs p-3 text-center flex flex-col items-center gap-1">
            <span>Failed to load</span>
            <button onClick={() => refetch()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer border-none bg-transparent p-0">Retry</button>
          </div>
        ) : (
          <>
            {/* 1. Projects Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-2 text-[0.68rem] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <FolderKanban size={12} className="text-[var(--accent)]" />
                  Projects & Threads ({filteredProjects.length})
                </span>
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setIsProjectModalOpen(true);
                  }}
                  className="text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer border-none bg-transparent text-[0.65rem] font-bold"
                >
                  <Plus size={10} /> New
                </button>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="p-3 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs">
                  <p className="font-medium text-[var(--text-secondary)]">No projects yet</p>
                  <p className="text-[0.68rem] mt-0.5">Click '+ Project' to create a workspace for your threads.</p>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const isExpanded = expandedProjects[project.id] !== false; // default expanded
                  const threads = projectThreadsMap[project.id] || [];
                  const isProjectActive = activeProjectId === project.id;

                  return (
                    <div 
                      key={project.id}
                      className={clsx(
                        "rounded-xl border transition-all overflow-hidden",
                        isProjectActive 
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_4%,transparent)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                      )}
                    >
                      {/* Project Folder Header */}
                      <div 
                        onClick={() => toggleProjectExpand(project.id)}
                        className="group flex flex-col p-2.5 cursor-pointer hover:bg-[var(--bg-surface-hover)] transition-colors relative"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[var(--text-muted)] shrink-0">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <div 
                              className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: project.color || '#d17b24' }}
                            >
                              <Folder size={11} />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate" title={project.name}>
                              {project.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {getStatusBadge(project.status)}
                          </div>
                        </div>

                        {/* Progress Bar & Thread Count */}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-[var(--border-subtle)]/50">
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, Math.max(0, project.progress || 0))}%`,
                                  backgroundColor: project.color || '#d17b24'
                                }}
                              />
                            </div>
                            <span className="text-[0.68rem] font-bold text-[var(--text-secondary)] shrink-0">
                              {project.progress}%
                            </span>
                          </div>

                          {/* Quick Project Actions (hover or active) */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleNewThreadInProject(e, project.id)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] transition-colors border-none bg-transparent cursor-pointer"
                              title="Add Thread in Project"
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={(e) => handleEditProject(e, project)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors border-none bg-transparent cursor-pointer"
                              title="Edit Project"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteProject(e, project)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors border-none bg-transparent cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Nested Threads inside Project */}
                      {isExpanded && (
                        <div className="bg-[var(--bg-primary)]/40 border-t border-[var(--border-subtle)] px-2 py-1.5 flex flex-col gap-1">
                          {threads.length === 0 ? (
                            <div className="py-2 px-2 text-[0.7rem] text-[var(--text-muted)] flex items-center justify-between">
                              <span>No threads yet</span>
                              <button
                                onClick={(e) => handleNewThreadInProject(e, project.id)}
                                className="text-[var(--accent)] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer border-none bg-transparent text-[0.68rem]"
                              >
                                <Plus size={10} /> Add thread
                              </button>
                            </div>
                          ) : (
                            threads.map((thread) => {
                              const isThreadActive = currentConversationId === thread.id;
                              return (
                                <div
                                  key={thread.id}
                                  onClick={() => onSelectConversation(thread.id)}
                                  className={clsx(
                                    "group flex items-center py-1.5 px-2 rounded-lg cursor-pointer transition-colors relative border gap-2 text-xs",
                                    isThreadActive
                                      ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--text-primary)] font-semibold shadow-xs"
                                      : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                                  )}
                                >
                                  <span className="text-[var(--text-muted)] shrink-0 font-mono text-[0.75rem]">↳</span>
                                  <MessageSquare size={13} className="shrink-0 text-[var(--accent)]" />
                                  <span className="truncate flex-1" title={thread.title}>
                                    {thread.title}
                                  </span>

                                  {isThreadActive && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                                  )}

                                  {/* Thread Action buttons */}
                                  <div className="hidden group-hover:flex items-center gap-0.5 absolute right-1.5 bg-[var(--bg-surface)] px-1 rounded shadow-xs border border-[var(--border-subtle)]">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMovingConversation({ id: thread.id, title: thread.title, projectId: thread.project_id });
                                      }}
                                      className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer"
                                      title="Move to another Project"
                                    >
                                      <FolderKanban size={12} />
                                    </button>
                                    <button 
                                      onClick={(e) => handleTogglePin(e, thread.id, thread.is_pinned)} 
                                      className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer" 
                                      title={thread.is_pinned ? "Unpin" : "Pin"}
                                    >
                                      {thread.is_pinned ? <PinOff size={11} /> : <Pin size={11} />}
                                    </button>
                                    <button 
                                      onClick={(e) => handleRename(e, thread.id, thread.title)} 
                                      className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer" 
                                      title="Rename"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button 
                                      onClick={(e) => handleDelete(e, thread.id)} 
                                      className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-colors border-none bg-transparent cursor-pointer" 
                                      title="Delete"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. General (Unassigned) Threads Section */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center justify-between px-2 text-[0.68rem] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <span>General Conversations ({filteredGeneral.length})</span>
              </div>

              {filteredGeneral.length === 0 ? (
                <div className="p-2.5 text-center text-[var(--text-muted)] text-[0.75rem]">
                  No general chats.
                </div>
              ) : (
                filteredGeneral.map((conv) => {
                  const isActive = currentConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={clsx(
                        "group flex items-center p-2 rounded-xl cursor-pointer transition-colors relative border gap-2.5",
                        isActive
                          ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--text-primary)] font-semibold shadow-xs"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]",
                        conv.is_pinned && !isActive && "border-l-2 border-l-[var(--accent)]"
                      )}
                    >
                      <MessageSquare size={14} className={isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                      
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="text-xs font-medium truncate" title={conv.title}>
                          {conv.title}
                        </div>
                        <div className="text-[0.68rem] text-[var(--text-muted)]">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </div>
                      </div>

                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                      )}

                      {/* Hover action menu */}
                      <div className="hidden group-hover:flex items-center gap-1 absolute right-2 bg-[var(--bg-surface)] px-1.5 py-0.5 rounded-lg border border-[var(--border-subtle)] shadow-xs">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingConversation({ id: conv.id, title: conv.title, projectId: conv.project_id });
                          }}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer"
                          title="Move to Project"
                        >
                          <FolderPlus size={12} />
                        </button>
                        <button onClick={(e) => handleTogglePin(e, conv.id, conv.is_pinned)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer" title={conv.is_pinned ? "Unpin" : "Pin"}>
                          {conv.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                        </button>
                        <button onClick={(e) => handleRename(e, conv.id, conv.title)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer" title="Rename">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={(e) => handleDelete(e, conv.id)} className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-colors border-none bg-transparent cursor-pointer" title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-left shadow-xs transition-colors hover:bg-[var(--bg-surface-hover)] cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs font-semibold text-[var(--text-primary)]">
            {username ? username.charAt(0).toUpperCase() : userId ? userId.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[var(--text-primary)]">{username || (userId ? `User ${userId.slice(0, 8)}` : 'Profile')}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[0.68rem] text-[var(--text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              {isAdmin ? 'Admin' : 'User'} • Profile
            </div>
          </div>
        </button>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        initialProject={editingProject}
        onSubmit={async (data) => {
          if (editingProject) {
            await updateProject({ id: editingProject.id, ...data });
          } else {
            await createProject(data);
          }
        }}
      />

      {/* Move Thread to Project Modal */}
      {movingConversation && (
        <MoveToProjectModal
          isOpen={true}
          onClose={() => setMovingConversation(null)}
          conversationTitle={movingConversation.title}
          currentProjectId={movingConversation.projectId}
          projects={projects}
          onAssign={async (projectId) => {
            await assignProject({ conversationId: movingConversation.id, projectId });
          }}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={() => setIsProfileOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="User profile"
            className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-base font-semibold text-[var(--text-primary)]">
                  {username ? username.charAt(0).toUpperCase() : userId ? userId.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-base font-semibold text-[var(--text-primary)]">{username || (userId ? `User ${userId.slice(0, 8)}` : 'Profile')}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                    {isAdmin ? 'Admin' : 'User'} • Active
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] border-none bg-transparent cursor-pointer"
                aria-label="Close profile"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setFeedbackSent(false);
                  setFeedbackError('');
                  setIsFeedbackOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <Lightbulb size={16} />
                <span className="text-xs font-medium">Share feedback</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/admin');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <Settings size={16} />
                  <span className="text-xs font-medium">Admin Dashboard</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <Lock size={16} />
                <span className="text-xs font-medium">Change password</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <LogOut size={16} />
                <span className="text-xs font-medium">Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4" onClick={() => setIsFeedbackOpen(false)}>
          <form role="dialog" aria-modal="true" aria-label="Share feedback" onSubmit={submitSuggestion} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-[var(--text-primary)]">Help improve bbot</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Share an idea or report something that could work better.</p></div><button type="button" onClick={() => setIsFeedbackOpen(false)} aria-label="Close feedback" className="p-1 text-xl text-[var(--text-secondary)] border-none bg-transparent cursor-pointer">×</button></div>
            {feedbackSent ? <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-[var(--success)]">Thanks. Your suggestion was sent for review.</div> : <>
              {feedbackError && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--error)]">{feedbackError}</div>}
              <label className="mt-4 block text-xs font-medium text-[var(--text-primary)]">Who is this feedback for?
                <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)] font-medium">
                  <option value="AI Training Rule">Train the AI (Global Memory Rule)</option>
                  <option value="App Bug / Feature">Admin Support (Bugs / New App Features)</option>
                </select>
              </label>
              <label className="mt-4 block text-xs font-medium text-[var(--text-primary)]">Your suggestion<textarea required maxLength={2000} value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} rows={4} placeholder={feedbackCategory === 'AI Training Rule' ? "E.g. Always answer in Hindi, Never mention pricing..." : "E.g. App is slow, can we add Excel support..."} className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /><span className="mt-1 block text-right text-[0.65rem] font-normal text-[var(--text-muted)]">{feedbackText.length}/2000</span></label>
              <button type="submit" disabled={!feedbackText.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer border-none"><Send size={13} />Send suggestion</button>
            </>}
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setIsChangePasswordOpen(false)}><form onSubmit={changePassword} onClick={(event) => event.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6"><h2 className="text-base font-semibold">Change password</h2>{passwordError && <p className="text-xs text-[var(--error)]">{passwordError}</p>}{passwordMessage && <p className="text-xs text-[var(--accent)]">{passwordMessage}</p>}{(['current','next','confirm'] as const).map((key) => <input key={key} type="password" value={passwords[key]} onChange={(event) => setPasswords({ ...passwords, [key]: event.target.value })} placeholder={key === 'current' ? 'Current password' : key === 'next' ? 'New password' : 'Confirm new password'} className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)]" required />)}<p className="text-[0.7rem] text-[var(--text-muted)]">Password: 10+ characters, at most 72 UTF-8 bytes, not your username, and not a common password.</p><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsChangePasswordOpen(false)} className="rounded-xl px-3 py-1.5 text-xs text-[var(--text-secondary)] border-none bg-transparent cursor-pointer">Cancel</button><button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs text-white border-none cursor-pointer">Change password</button></div></form></div>}
    </div>
  );
}
