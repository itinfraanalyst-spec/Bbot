import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

const VisualStudioPage = lazy(() =>
  import('./pages/VisualStudioPage').then((m) => ({ default: m.VisualStudioPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((module) => ({ default: module.AdminPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const AdminRecoveryPage = lazy(() =>
  import('./pages/AdminRecoveryPage').then((m) => ({ default: m.AdminRecoveryPage }))
);

const PageFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-main)]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      <span className="text-xs font-medium text-[var(--text-muted)] animate-pulse">Loading workspace...</span>
    </div>
  </div>
);

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/admin-recovery" element={<AdminRecoveryPage />} />

                    <Route element={<ProtectedRoute />}>
                      <Route path="/" element={<ChatPage />} />
                      <Route path="/studio" element={<VisualStudioPage />} />
                      <Route path="/visual-studio" element={<VisualStudioPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
