import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import type { Conversation } from './useConversations';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  progress: number; // 0 - 100
  status: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | string;
  color: string;
  created_at: string;
  updated_at: string;
  thread_count: number;
  last_thread_activity?: string;
  threads?: Conversation[];
}

const EMPTY_PROJECTS: Project[] = [];

export function useProjects() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const fetchProjects = async (): Promise<Project[]> => {
    const res = await fetch('/api/projects', {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    return data.projects || [];
  };

  const { data: projects = EMPTY_PROJECTS, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects', userId || 'anonymous'],
    queryFn: fetchProjects,
    enabled: !!userId,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; color?: string; progress?: number; status?: string }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create project');
      }
      return res.json();
    },
    onSuccess: (newProject) => {
      queryClient.setQueryData(['projects'], (old: Project[] | undefined) => [
        newProject,
        ...(old || [])
      ]);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; color?: string; progress?: number; status?: string }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update project');
      }
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['projects'], (old: Project[] | undefined) => 
        old?.map(p => p.id === updated.id ? { ...p, ...updated } : p)
      );
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete project');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['projects'], (old: Project[] | undefined) => 
        old?.filter(p => p.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  return {
    projects,
    isLoading,
    isError,
    refetch,
    createProject: createProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
    isCreating: createProjectMutation.isPending,
  };
}

