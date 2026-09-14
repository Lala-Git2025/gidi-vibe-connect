import { Component, ErrorInfo, ReactNode } from 'react';
import { reportRenderError } from '../lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  /** Sentry event id when reporting is configured — shown so the user can quote it. */
  eventId: string | null;
}

/**
 * Without a boundary, any throw during render unmounts the whole tree and the
 * user gets a blank page with no way to tell what happened. This surfaces the
 * message and offers a reload instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, eventId: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack);
    const eventId = reportRenderError(error, info.componentStack);
    if (eventId) this.setState({ eventId });
  }

  render() {
    const { error, eventId } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#fff',
          color: '#111',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something broke</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
            The page failed to render. The details below help pinpoint the cause.
          </p>
          <pre
            style={{
              background: '#F3F4F6',
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginBottom: 16,
            }}
          >
            {error.message}
          </pre>
          {eventId && (
            <p style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>
              Reference: <code>{eventId}</code>
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#111',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
