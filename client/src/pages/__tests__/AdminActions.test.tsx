import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminPage } from '../AdminPage';
import { ThemeProvider } from '../../contexts/ThemeContext';

const mockApproveUser = vi.fn();
const mockApproveUserAsync = vi.fn().mockResolvedValue({});
const mockRejectUser = vi.fn();
const mockRejectUserAsync = vi.fn().mockResolvedValue({});
const mockPromoteUser = vi.fn();
const mockPromoteUserAsync = vi.fn().mockResolvedValue({});
const mockDemoteUser = vi.fn();
const mockDemoteUserAsync = vi.fn().mockResolvedValue({});
const mockDeactivateUser = vi.fn();
const mockDeactivateUserAsync = vi.fn().mockResolvedValue({});
const mockExtendUserExpiry = vi.fn();
const mockExtendUserExpiryAsync = vi.fn().mockResolvedValue({});
const mockResolveResetRequest = vi.fn();
const mockResolveResetRequestAsync = vi.fn().mockResolvedValue({});

let mockUsersState = {
  pendingUsers: [{ id: 'pending-1', username: 'pending-user', is_admin: false, status: 'pending', created_at: new Date().toISOString() }],
  activeUsers: [
    { id: 'user-1', username: 'alice', is_admin: false, status: 'approved' },
    { id: 'user-2', username: 'bob-admin', is_admin: true, status: 'approved' },
    { id: 'temp-1', username: 'guest-xyz@company.com', is_admin: false, status: 'approved', expires_at: new Date(Date.now() + 3600000).toISOString() },
  ],
  resetRequests: [{ id: 'reset-1', username: 'alice', reset_requested_at: new Date().toISOString() }],
  isLoading: false,
  approveUser: mockApproveUser,
  approveUserAsync: mockApproveUserAsync,
  rejectUser: mockRejectUser,
  rejectUserAsync: mockRejectUserAsync,
  promoteUser: mockPromoteUser,
  promoteUserAsync: mockPromoteUserAsync,
  demoteUser: mockDemoteUser,
  demoteUserAsync: mockDemoteUserAsync,
  deactivateUser: mockDeactivateUser,
  deactivateUserAsync: mockDeactivateUserAsync,
  issueResetToken: vi.fn(),
  resolveResetRequest: mockResolveResetRequest,
  resolveResetRequestAsync: mockResolveResetRequestAsync,
  extendUserExpiry: mockExtendUserExpiry,
  extendUserExpiryAsync: mockExtendUserExpiryAsync,
  isIssuingResetToken: false,
  deactivatingUserId: null as string | null,
  promotingUserId: null as string | null,
  demotingUserId: null as string | null,
  approvingUserId: null as string | null,
  rejectingUserId: null as string | null,
  extendingUserId: null as string | null,
  resolvingRequestId: null as string | null,
  errors: {},
  clearErrors: vi.fn(),
};

vi.mock('../../hooks/useAdmin', () => ({
  useAdminAnalytics: () => ({ data: { summary: {}, volume: [], trending: [], top_users: [], top_documents: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useAdminFeedback: () => ({ data: [], isLoading: false, reviewFeedback: vi.fn() }),
  useAdminSuggestions: () => ({ data: [], isLoading: false, reviewSuggestion: vi.fn() }),
  useAdminLearningInsights: () => ({ data: { repeated_questions: [], pending_negative_feedback: 0, verified_corrections: 0 } }),
  useUserConversations: () => ({ data: { conversations: [] }, isLoading: false }),
  useAdminUsers: () => mockUsersState,
}));

vi.mock('../../hooks/useConversations', () => ({
  useConversations: () => ({ conversations: [], isLoading: false, isError: false, refetch: vi.fn(), deleteConversation: vi.fn(), renameConversation: vi.fn(), togglePin: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, isAdmin: true, userId: 'admin-current', login: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../CustomBotsPage', () => ({
  CustomBotsPage: () => <div>Custom Bots</div>,
}));

vi.mock('recharts', () => {
  const Placeholder = ({ children }: { children?: unknown }) => <div>{children}</div>;
  return { AreaChart: Placeholder, Area: Placeholder, XAxis: Placeholder, YAxis: Placeholder, CartesianGrid: Placeholder, Tooltip: Placeholder, ResponsiveContainer: Placeholder, BarChart: Placeholder, Bar: Placeholder, LineChart: Placeholder, Line: Placeholder, Legend: Placeholder };
});

const renderAdmin = () => render(
  <MemoryRouter>
    <ThemeProvider>
      <AdminPage />
    </ThemeProvider>
  </MemoryRouter>
);

describe('Admin Panel User Action Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersState.deactivatingUserId = null;
    mockUsersState.promotingUserId = null;
    mockUsersState.demotingUserId = null;
    mockUsersState.approvingUserId = null;
    mockUsersState.rejectingUserId = null;
    mockUsersState.extendingUserId = null;
    mockUsersState.resolvingRequestId = null;
  });

  it('triggers confirmation and deactivates user when confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAdmin();

    // Navigate to Users tab
    const usersTabBtn = screen.getByRole('button', { name: /User Management/i });
    await user.click(usersTabBtn);

    // Find Remove button for alice
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons.length).toBeGreaterThan(0);

    await user.click(removeButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('alice'));
    expect(mockDeactivateUserAsync).toHaveBeenCalledWith('user-1');

    // Verify toast notification appears
    await waitFor(() => {
      expect(screen.getByText(/User "alice" was deactivated/i)).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('does not deactivate user when confirmation is canceled', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderAdmin();

    const usersTabBtn = screen.getByRole('button', { name: /User Management/i });
    await user.click(usersTabBtn);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeactivateUserAsync).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('displays loading state and disables Remove button while deactivation is pending', async () => {
    const user = userEvent.setup();
    mockUsersState.deactivatingUserId = 'user-1';

    renderAdmin();

    const usersTabBtn = screen.getByRole('button', { name: /User Management/i });
    await user.click(usersTabBtn);

    // Look for Removing... button
    const removingBtn = screen.getByRole('button', { name: /removing\.\.\./i });
    expect(removingBtn).toBeInTheDocument();
    expect(removingBtn).toBeDisabled();
  });

  it('promotes user and shows success toast', async () => {
    const user = userEvent.setup();

    renderAdmin();

    const usersTabBtn = screen.getByRole('button', { name: /User Management/i });
    await user.click(usersTabBtn);

    const promoteBtn = screen.getByRole('button', { name: /promote/i });
    await user.click(promoteBtn);

    expect(mockPromoteUserAsync).toHaveBeenCalledWith('user-1');
    await waitFor(() => {
      expect(screen.getByText(/User "alice" was promoted to Admin/i)).toBeInTheDocument();
    });
  });

  it('demotes admin user with confirmation and shows success toast', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAdmin();

    const usersTabBtn = screen.getByRole('button', { name: /User Management/i });
    await user.click(usersTabBtn);

    const demoteBtn = screen.getByRole('button', { name: /demote/i });
    await user.click(demoteBtn);

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('bob-admin'));
    expect(mockDemoteUserAsync).toHaveBeenCalledWith('user-2');

    await waitFor(() => {
      expect(screen.getByText(/Admin "bob-admin" was demoted to regular user/i)).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('approves pending user from pending tab', async () => {
    const user = userEvent.setup();

    renderAdmin();

    const usersTabBtn = screen.getByRole('button', { name: /User Management/i });
    await user.click(usersTabBtn);

    const pendingSubTab = screen.getByRole('button', { name: /pending/i });
    await user.click(pendingSubTab);

    const approveBtn = screen.getByTitle('Approve');
    await user.click(approveBtn);

    expect(mockApproveUserAsync).toHaveBeenCalledWith('pending-1');
    await waitFor(() => {
      expect(screen.getByText(/User "pending-user" approved/i)).toBeInTheDocument();
    });
  });
});
