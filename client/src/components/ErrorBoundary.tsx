import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
    const msg = error?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('dynamically imported module') ||
      error.name === 'ChunkLoadError'
    ) {
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', 'true');
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || '';
      const isChunkError = 
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('dynamically imported module') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] p-6 sm:p-8 rounded-2xl border border-[var(--border-subtle)] shadow-xl max-w-md w-full text-center">
            <div className="text-[var(--error)] mb-3 flex justify-center">
              <AlertCircle size={44} />
            </div>
            
            <h2 className="text-[var(--text-primary)] text-lg font-bold mb-1.5">
              {isChunkError ? 'New Update Available' : 'Something went wrong'}
            </h2>
            <p className="text-[var(--text-secondary)] mb-4 text-xs">
              {isChunkError 
                ? 'A new version of bbot was just deployed. Please reload to load the latest features.' 
                : 'We encountered an unexpected error while rendering this page.'}
            </p>

            {this.state.error && !isChunkError && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-left text-[0.72rem] text-red-500 font-mono break-words max-h-32 overflow-y-auto">
                {msg || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  try {
                    sessionStorage.removeItem('chunk_reload');
                  } catch {}
                  window.location.reload();
                }}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-2 w-full cursor-pointer border-none shadow-xs"
              >
                <RefreshCw size={14} />
                {isChunkError ? 'Reload to Update' : 'Reload Page'}
              </button>
              
              {!isChunkError && (
                <button
                  onClick={() => {
                    try {
                      localStorage.clear();
                      sessionStorage.clear();
                    } catch {}
                    window.location.href = '/login';
                  }}
                  className="bg-transparent hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded-xl text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 w-full cursor-pointer border border-[var(--border-subtle)]"
                >
                  <Trash2 size={13} />
                  Clear Session & Re-login
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
