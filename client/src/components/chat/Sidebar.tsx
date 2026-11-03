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
    conversations = [], 
    isLoading, 
    isError, 
    refetch, 
    deleteConversation, 
    renameConversation, 
    togglePin, 
    assignProject 
  } = useConversations();
  const { 
    projects = [], 
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

  return (
    <div className={clsx(
      "w-[85vw] max-w-[280px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col h-full shrink-0 transition-transform duration-300 z-50 select-none",
      "fixed inset-y-0 left-0 md:relative md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Top Header */}
      <div className="pt-5 pb-3 px-3 flex flex-col gap-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-[24px] h-[24px] rounded-full object-cover" />
            <h2 className="text-[1rem] font-bold tracking-tight">TRPW <span className="text-[var(--accent)]">bbot</span></h2>
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNewConversation()}
            className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border-none"
            title="Start a new chat"
          >
            <MessageSquare size={13} />
            <span>{t('newChat')}</span>
          </button>

          <button
            onClick={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] text-xs font-medium transition-all cursor-pointer shadow-xs shrink-0"
            title="Create a new Project"
          >
            <FolderPlus size={14} className="text-[var(--accent)]" />
            <span>Project</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full">
          <Search size={12} className="absolute left-2.5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-md py-1 pl-7 pr-2 text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-3">
        {isLoading ? (
          <div className="text-[var(--text-muted)] text-xs p-3 text-center animate-pulse">Loading chats...</div>
        ) : isError ? (
          <div className="text-[var(--error)] text-xs p-3 text-center flex flex-col items-center gap-1">
            <span>Failed to load</span>
            <button onClick={() => refetch()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer border-none bg-transparent p-0">Retry</button>
          </div>
        ) : (
          <>
            {/* 1. Projects Section */}
            {filteredProjects.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between px-2 py-1 text-[0.65rem] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                  <span>Projects</span>
                  <button
                    onClick={() => {
                      setEditingProject(null);
                      setIsProjectModalOpen(true);
                    }}
                    className="text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer border-none bg-transparent text-[0.65rem] font-bold"
                  >
                    <Plus size={11} /> New
                  </button>
                </div>

                {filteredProjects.map((project) => {
                  const isExpanded = expandedProjects[project.id] !== false; // default expanded
                  const threads = projectThreadsMap[project.id] || [];
                  const isProjectActive = activeProjectId === project.id;

                  return (
                    <div key={project.id} className="flex flex-col">
                      {/* Clean Minimal Folder Row */}
                      <div 
                        onClick={() => toggleProjectExpand(project.id)}
                        className={clsx(
                          "group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium",
                          isProjectActive 
                            ? "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--text-primary)]" 
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[var(--text-muted)] shrink-0">
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                          <Folder size={14} style={{ color: project.color || '#d17b24' }} className="shrink-0" />
                          <span className="truncate">{project.name}</span>
                          <span className="text-[0.65rem] text-[var(--text-muted)] shrink-0 font-normal">
                            ({threads.length})
                          </span>
                        </div>

                        {/* Clean Actions */}
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1">
                          <button
                            onClick={(e) => handleNewThreadInProject(e, project.id)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-colors border-none bg-transparent cursor-pointer"
                            title="New Thread"
                          >
                            <Plus size={13} />
                          </button>
                          <button
                            onClick={(e) => handleEditProject(e, project)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors border-none bg-transparent cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(e, project)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors border-none bg-transparent cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Clean Indented Threads */}
                      {isExpanded && (
                        <div className="ml-4 pl-2 border-l border-[var(--border-subtle)] my-0.5 space-y-0.5">
                          {threads.length === 0 ? (
                            <div 
                              onClick={(e) => handleNewThreadInProject(e, project.id)}
                              className="py-1 px-2 text-[0.7rem] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-1 rounded"
                            >
                              <Plus size={11} />
                              <span>New thread</span>
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
                                      ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-[var(--text-primary)] font-medium"
                                      : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                                  )}
                                >
                                  <MessageSquare size={13} className={isThreadActive ? "text-[var(--accent)] shrink-0" : "text-[var(--text-muted)] shrink-0 group-hover:text-[var(--text-primary)]"} />
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
                                      title="Move to Project"
                                    >
                                      <Folder size={11} />
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
                })}
              </div>
            )}

            {/* 2. General Chats Section */}
            <div className="flex flex-col gap-0.5">
              <div className="px-2 py-1 text-[0.65rem] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                <span>{filteredProjects.length > 0 ? "General Chats" : t('recentChats')}</span>
              </div>

              {filteredGeneral.length === 0 ? (
                <div className="p-2 text-center text-[var(--text-muted)] text-[0.72rem]">
                  No conversations yet.
                </div>
              ) : (
                filteredGeneral.map((conv) => {
                  const isActive = currentConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={clsx(
                        "group flex items-center py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors relative border gap-2 text-xs",
                        isActive
                          ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-[var(--text-primary)] font-medium"
                          : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]",
                        conv.is_pinned && !isActive && "border-l-2 border-l-[var(--accent)]"
                      )}
                    >
                      <MessageSquare size={13} className={isActive ? "text-[var(--accent)] shrink-0" : "text-[var(--text-muted)] shrink-0 group-hover:text-[var(--text-primary)]"} />
                      
                      <div className="flex-1 truncate" title={conv.title}>
                        {conv.title}
                      </div>

                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                      )}

                      {/* Hover action menu */}
                      <div className="hidden group-hover:flex items-center gap-0.5 absolute right-1.5 bg-[var(--bg-surface)] px-1 py-0.5 rounded border border-[var(--border-subtle)] shadow-xs">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingConversation({ id: conv.id, title: conv.title, projectId: conv.project_id });
                          }}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer"
                          title="Move to Project"
                        >
                          <Folder size={11} />
                        </button>
                        <button onClick={(e) => handleTogglePin(e, conv.id, conv.is_pinned)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer" title={conv.is_pinned ? "Unpin" : "Pin"}>
                          {conv.is_pinned ? <PinOff size={11} /> : <Pin size={11} />}
                        </button>
                        <button onClick={(e) => handleRename(e, conv.id, conv.title)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded transition-colors border-none bg-transparent cursor-pointer" title="Rename">
                          <Edit2 size={11} />
                        </button>
                        <button onClick={(e) => handleDelete(e, conv.id)} className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-colors border-none bg-transparent cursor-pointer" title="Delete">
                          <Trash2 size={11} />
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
      <div className="p-2.5 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-left shadow-xs transition-colors hover:bg-[var(--bg-surface-hover)] cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs font-semibold text-[var(--text-primary)]">
            {username ? username.charAt(0).toUpperCase() : userId ? userId.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[var(--text-primary)]">{username || (userId ? `User ${userId.slice(0, 8)}` : 'Profile')}</div>
            <div className="flex items-center gap-1.5 text-[0.65rem] text-[var(--text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              {isAdmin ? 'Admin' : 'User'}
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
            className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-sm font-semibold text-[var(--text-primary)]">
                  {username ? username.charAt(0).toUpperCase() : userId ? userId.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{username || (userId ? `User ${userId.slice(0, 8)}` : 'Profile')}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    {isAdmin ? 'Admin' : 'User'} • Active
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] border-none bg-transparent cursor-pointer"
                aria-label="Close profile"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-1.5">
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setFeedbackSent(false);
                  setFeedbackError('');
                  setIsFeedbackOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <Lightbulb size={15} />
                <span className="text-xs font-medium">Share feedback</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/admin');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <Settings size={15} />
                  <span className="text-xs font-medium">Admin Dashboard</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <Lock size={15} />
                <span className="text-xs font-medium">Change password</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-left text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <LogOut size={15} />
                <span className="text-xs font-medium">Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4" onClick={() => setIsFeedbackOpen(false)}>
          <form role="dialog" aria-modal="true" aria-label="Share feedback" onSubmit={submitSuggestion} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-[var(--text-primary)]">Help improve bbot</h2><p className="mt-0.5 text-xs text-[var(--text-secondary)]">Share an idea or report an issue.</p></div><button type="button" onClick={() => setIsFeedbackOpen(false)} aria-label="Close feedback" className="p-1 text-lg text-[var(--text-secondary)] border-none bg-transparent cursor-pointer">×</button></div>
            {feedbackSent ? <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-[var(--success)]">Thanks. Your suggestion was sent for review.</div> : <>
              {feedbackError && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-[var(--error)]">{feedbackError}</div>}
              <label className="mt-3 block text-xs font-medium text-[var(--text-primary)]">Category
                <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-primary)] font-medium">
                  <option value="AI Training Rule">Train the AI (Global Memory Rule)</option>
                  <option value="App Bug / Feature">Admin Support (Bugs / Features)</option>
                </select>
              </label>
              <label className="mt-3 block text-xs font-medium text-[var(--text-primary)]">Your suggestion<textarea required maxLength={2000} value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} rows={3} placeholder={feedbackCategory === 'AI Training Rule' ? "E.g. Always answer in Hindi..." : "E.g. Can we add Excel support..."} className="mt-1 w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /><span className="mt-0.5 block text-right text-[0.65rem] font-normal text-[var(--text-muted)]">{feedbackText.length}/2000</span></label>
              <button type="submit" disabled={!feedbackText.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer border-none"><Send size={12} />Send suggestion</button>
            </>}
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setIsChangePasswordOpen(false)}><form onSubmit={changePassword} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"><h2 className="text-sm font-semibold">Change password</h2>{passwordError && <p className="text-xs text-[var(--error)]">{passwordError}</p>}{passwordMessage && <p className="text-xs text-[var(--accent)]">{passwordMessage}</p>}{(['current','next','confirm'] as const).map((key) => <input key={key} type="password" value={passwords[key]} onChange={(event) => setPasswords({ ...passwords, [key]: event.target.value })} placeholder={key === 'current' ? 'Current password' : key === 'next' ? 'New password' : 'Confirm new password'} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-primary)]" required />)}<p className="text-[0.68rem] text-[var(--text-muted)]">Password: 10+ characters, at most 72 UTF-8 bytes.</p><div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setIsChangePasswordOpen(false)} className="rounded-lg px-2.5 py-1 text-xs text-[var(--text-secondary)] border-none bg-transparent cursor-pointer">Cancel</button><button type="submit" className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs text-white border-none cursor-pointer">Change password</button></div></form></div>}
    </div>
  );
}
