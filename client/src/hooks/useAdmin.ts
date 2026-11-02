import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AdminUser {
  id: string;
  username: string;
  is_admin: boolean;
  status: string;
  created_at?: string;
  last_login?: string;
  last_active?: string;
  expires_at?: string;
}

export function useAdminUsers() {
  const queryClient = useQueryClient();

  // Fetch Pending Users
  const { data: pendingUsers = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['adminPendingUsers'],
    queryFn: async (): Promise<AdminUser[]> => {
      const res = await fetch('/auth/admin/pending', { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to fetch pending users');
      const data = await res.json();
      return data.pending_users || [];
    }
  });

  // Fetch Active Users
  const { data: activeUsers = [], isLoading: isLoadingActive } = useQuery({
    queryKey: ['adminActiveUsers'],
    queryFn: async (): Promise<AdminUser[]> => {
      const res = await fetch('/auth/admin/users/active', { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to fetch active users');
      const data = await res.json();
      return data.active_users || [];
    }
  });

  // Approvals
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/auth/admin/approve/${userId}`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to approve user');
      return res.json().catch(() => ({}));
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ['adminPendingUsers'] });
      await queryClient.cancelQueries({ queryKey: ['adminActiveUsers'] });
      const previousPending = queryClient.getQueryData<AdminUser[]>(['adminPendingUsers']) || [];
      const previousActive = queryClient.getQueryData<AdminUser[]>(['adminActiveUsers']) || [];
      const user = previousPending.find(u => u.id === userId);
      queryClient.setQueryData<AdminUser[]>(['adminPendingUsers'], (old = []) => old.filter(u => u.id !== userId));
      if (user) {
        queryClient.setQueryData<AdminUser[]>(['adminActiveUsers'], (old = []) => [
          ...old,
          { ...user, status: 'approved' }
        ]);
      }
      return { previousPending, previousActive };
    },
    onError: (_err, _userId, context) => {
      if (context?.previousPending) queryClient.setQueryData(['adminPendingUsers'], context.previousPending);
      if (context?.previousActive) queryClient.setQueryData(['adminActiveUsers'], context.previousActive);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminActiveUsers'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/auth/admin/reject/${userId}`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to reject user');
      return res.json().catch(() => ({}));
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ['adminPendingUsers'] });
      const previousPending = queryClient.getQueryData<AdminUser[]>(['adminPendingUsers']) || [];
      queryClient.setQueryData<AdminUser[]>(['adminPendingUsers'], (old = []) => old.filter(u => u.id !== userId));
      return { previousPending };
    },
    onError: (_err, _userId, context) => {
      if (context?.previousPending) queryClient.setQueryData(['adminPendingUsers'], context.previousPending);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingUsers'] });
    }
  });

  // Role / Status Management
  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/auth/admin/users/${userId}/promote`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to promote user');
      return res.json().catch(() => ({}));
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ['adminActiveUsers'] });
      const previousActive = queryClient.getQueryData<AdminUser[]>(['adminActiveUsers']) || [];
      queryClient.setQueryData<AdminUser[]>(['adminActiveUsers'], (old = []) => 
        old.map(u => u.id === userId ? { ...u, is_admin: true } : u)
      );
      return { previousActive };
    },
    onError: (_err, _userId, context) => {
      if (context?.previousActive) queryClient.setQueryData(['adminActiveUsers'], context.previousActive);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminActiveUsers'] });
    }
  });

  const demoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/auth/admin/users/${userId}/demote`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const text = await res.json().catch(() => ({}));
        throw new Error(text?.detail || 'Failed to demote user');
      }
      return res.json().catch(() => ({}));
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ['adminActiveUsers'] });
      const previousActive = queryClient.getQueryData<AdminUser[]>(['adminActiveUsers']) || [];
      queryClient.setQueryData<AdminUser[]>(['adminActiveUsers'], (old = []) => 
        old.map(u => u.id === userId ? { ...u, is_admin: false } : u)
      );
      return { previousActive };
    },
    onError: (_err, _userId, context) => {
      if (context?.previousActive) queryClient.setQueryData(['adminActiveUsers'], context.previousActive);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminActiveUsers'] });
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/auth/admin/users/${userId}/deactivate`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const text = await res.json().catch(() => ({}));
        throw new Error(text?.detail || 'Failed to deactivate user');
      }
      return res.json().catch(() => ({}));
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ['adminActiveUsers'] });
      const previousActive = queryClient.getQueryData<AdminUser[]>(['adminActiveUsers']) || [];
      queryClient.setQueryData<AdminUser[]>(['adminActiveUsers'], (old = []) => 
        old.filter(u => u.id !== userId)
      );
      return { previousActive };
    },
    onError: (_err, _userId, context) => {
      if (context?.previousActive) queryClient.setQueryData(['adminActiveUsers'], context.previousActive);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminActiveUsers'] });
    }
  });

  const resetTokenMutation = useMutation({
    mutationFn: async ({ userId, adminPassword }: { userId: string; adminPassword: string }) => {
      const res = await fetch(`/auth/admin/users/${userId}/reset-token`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_password: adminPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : '';
        if (res.status === 401 || res.status === 403) {
          throw new Error('Your administrator session has expired. Sign in again.');
        }
        if (res.status === 429) {
          throw new Error('Too many reset attempts. Wait a minute before trying again.');
        }
        throw new Error(detail || 'Unable to issue reset link. Check the administrator password and target account.');
      }
      return data as { token: string; expires_at: string };
    },
  });

  const extendMutation = useMutation({
    mutationFn: async ({ userId, durationMinutes }: { userId: string; durationMinutes: number }) => {
      const res = await fetch(`/auth/admin/users/${userId}/extend`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: durationMinutes }),
      });
      if (!res.ok) {
        const text = await res.json().catch(() => ({}));
        throw new Error(text?.detail || 'Failed to extend expiry');
      }
      return res.json().catch(() => ({}));
    },
    onMutate: async ({ userId, durationMinutes }) => {
      await queryClient.cancelQueries({ queryKey: ['adminActiveUsers'] });
      const previousActive = queryClient.getQueryData<AdminUser[]>(['adminActiveUsers']) || [];
      queryClient.setQueryData<AdminUser[]>(['adminActiveUsers'], (old = []) =>
        old.map(u => {
          if (u.id === userId && u.expires_at) {
            const current = new Date(u.expires_at).getTime();
            const newExpiry = new Date(current + durationMinutes * 60000).toISOString();
            return { ...u, expires_at: newExpiry };
          }
          return u;
        })
      );
      return { previousActive };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousActive) queryClient.setQueryData(['adminActiveUsers'], context.previousActive);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminActiveUsers'] });
    }
  });

  const { data: resetRequests = [], isLoading: isLoadingResetRequests } = useQuery({
    queryKey: ['adminResetRequests'],
    queryFn: async () => {
      const res = await fetch('/auth/admin/forgot-password-requests', { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to fetch reset requests');
      const data = await res.json();
      return data.requests || [];
    }
  });

  const resolveResetRequestMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/auth/admin/resolve-reset-request/${userId}`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to resolve reset request');
      return res.json().catch(() => ({}));
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ['adminResetRequests'] });
      const previousRequests = queryClient.getQueryData<any[]>(['adminResetRequests']) || [];
      queryClient.setQueryData<any[]>(['adminResetRequests'], (old = []) =>
        old.filter(r => r.id !== userId && r.user_id !== userId)
      );
      return { previousRequests };
    },
    onError: (_err, _userId, context) => {
      if (context?.previousRequests) queryClient.setQueryData(['adminResetRequests'], context.previousRequests);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminResetRequests'] });
    }
  });

  return {
    pendingUsers,
    activeUsers,
    resetRequests,
    isLoading: isLoadingPending || isLoadingActive || isLoadingResetRequests,
    approveUser: approveMutation.mutate,
    approveUserAsync: approveMutation.mutateAsync,
    rejectUser: rejectMutation.mutate,
    rejectUserAsync: rejectMutation.mutateAsync,
    promoteUser: promoteMutation.mutate,
    promoteUserAsync: promoteMutation.mutateAsync,
    demoteUser: demoteMutation.mutate,
    demoteUserAsync: demoteMutation.mutateAsync,
    deactivateUser: deactivateMutation.mutate,
    deactivateUserAsync: deactivateMutation.mutateAsync,
    issueResetToken: resetTokenMutation.mutateAsync,
    resolveResetRequest: resolveResetRequestMutation.mutate,
    resolveResetRequestAsync: resolveResetRequestMutation.mutateAsync,
    extendUserExpiry: extendMutation.mutate,
    extendUserExpiryAsync: extendMutation.mutateAsync,
    isIssuingResetToken: resetTokenMutation.isPending,
    deactivatingUserId: deactivateMutation.isPending ? (deactivateMutation.variables as string) : null,
    promotingUserId: promoteMutation.isPending ? (promoteMutation.variables as string) : null,
    demotingUserId: demoteMutation.isPending ? (demoteMutation.variables as string) : null,
    approvingUserId: approveMutation.isPending ? (approveMutation.variables as string) : null,
    rejectingUserId: rejectMutation.isPending ? (rejectMutation.variables as string) : null,
    extendingUserId: extendMutation.isPending ? (extendMutation.variables?.userId as string) : null,
    resolvingRequestId: resolveResetRequestMutation.isPending ? (resolveResetRequestMutation.variables as string) : null,
    errors: {
      demote: demoteMutation.error?.message,
      deactivate: deactivateMutation.error?.message
    },
    clearErrors: () => {
      demoteMutation.reset();
      deactivateMutation.reset();
    }
  };
}

export function useAdminAnalytics(range: string = 'daily', userId: string = 'all') {
  return useQuery({
    queryKey: ['adminAnalytics', range, userId],
    queryFn: async () => {
      const res = await fetch(`/auth/admin/system-metrics?range=${range}&user_id=${userId}`, {
        credentials: "include"
      });
      if (res.status === 403) throw new Error("Forbidden: Admin access required");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    }
  });
}

export function useAdminFeedback() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['adminFeedback'],
    queryFn: async () => {
      const response = await fetch('/auth/admin/feedback', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load feedback');
      return (await response.json()).feedback || [];
    },
  });
  const review = useMutation({
    mutationFn: async ({ messageId, reviewStatus, resolutionNote }: { messageId: string; reviewStatus: string; resolutionNote?: string }) => {
      const response = await fetch(`/auth/admin/feedback/${messageId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: reviewStatus, resolution_note: resolutionNote || '' }),
      });
      if (!response.ok) throw new Error('Failed to update feedback review');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminFeedback'] }),
  });
  return { ...query, reviewFeedback: review.mutate, isReviewing: review.isPending };
}

export function useAdminSuggestions() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['adminSuggestions'],
    queryFn: async () => {
      const response = await fetch('/auth/admin/suggestions', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load user suggestions');
      return (await response.json()).suggestions || [];
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, status, resolutionNote }: { id: string; status: string; resolutionNote?: string }) => {
      const response = await fetch(`/auth/admin/suggestions/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution_note: resolutionNote || '' }),
      });
      if (!response.ok) throw new Error('Failed to update user suggestion');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminSuggestions'] }),
  });
  return { ...query, reviewSuggestion: review.mutate, isReviewing: review.isPending };
}

export function useAdminLearningInsights() {
  return useQuery({
    queryKey: ['adminLearningInsights'],
    queryFn: async () => {
      const response = await fetch('/auth/admin/learning-insights', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load learning insights');
      return response.json();
    },
  });
}

export function useUserConversations(userId: string | null) {
  return useQuery({
    queryKey: ['adminUserConversations', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/auth/admin/users/${userId}/conversations`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch user conversations");
      return res.json();
    },
    enabled: !!userId
  });
}
