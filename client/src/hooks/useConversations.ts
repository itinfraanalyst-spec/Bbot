import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  project_id?: string | null;
  progress?: number;
  status?: string;
}

const EMPTY_CONVERSATIONS: Conversation[] = [];

export function useConversations() {
  
  const queryClient = useQueryClient();

  const fetchConversations = async (): Promise<Conversation[]> => {
    const res = await fetch('/api/conversations', {
      credentials: "include"
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    const data = await res.json();
    return data.conversations || [];
  };

  const { data: conversations = EMPTY_CONVERSATIONS, isLoading, isError, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/conversations/${id}`, {
        credentials: "include",
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => 
        old?.filter(c => c.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string, title: string }) => {
      const res = await fetch(`/api/conversations/${id}/title`, {
        credentials: "include",
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Failed to rename');
    },
    onSuccess: (_, { id, title }) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => 
        old?.map(c => c.id === id ? { ...c, title } : c)
      );
    }
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string, isPinned: boolean }) => {
      const action = isPinned ? 'unpin' : 'pin';
      const res = await fetch(`/api/conversations/${id}/${action}`, {
        credentials: "include",
        method: 'POST'
      });
      if (!res.ok) throw new Error(`Failed to ${action}`);
    },
    onSuccess: (_, { id, isPinned }) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => 
        old?.map(c => c.id === id ? { ...c, is_pinned: !isPinned } : c)
      );
    }
  });

  const assignProjectMutation = useMutation({
    mutationFn: async ({ conversationId, projectId }: { conversationId: string, projectId: string | null }) => {
      const res = await fetch(`/api/conversations/${conversationId}/project`, {
        credentials: "include",
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      });
      if (!res.ok) throw new Error('Failed to assign project');
      return res.json();
    },
    onSuccess: (_, { conversationId, projectId }) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) =>
        old?.map(c => c.id === conversationId ? { ...c, project_id: projectId } : c)
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ conversationId, progress, status }: { conversationId: string, progress?: number, status?: string }) => {
      const res = await fetch(`/api/conversations/${conversationId}/progress`, {
        credentials: "include",
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress, status })
      });
      if (!res.ok) throw new Error('Failed to update progress');
      return res.json();
    },
    onSuccess: (_, { conversationId, progress, status }) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) =>
        old?.map(c => c.id === conversationId ? { 
          ...c, 
          progress: progress !== undefined ? progress : c.progress,
          status: status !== undefined ? status : c.status
        } : c)
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  return {
    conversations,
    isLoading,
    isError,
    refetch,
    deleteConversation: deleteMutation.mutate,
    renameConversation: renameMutation.mutate,
    togglePin: togglePinMutation.mutate,
    assignProject: assignProjectMutation.mutateAsync,
    updateProgress: updateProgressMutation.mutateAsync,
  };
}
