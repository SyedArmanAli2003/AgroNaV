/**
 * ErrorBoundary — catches React render errors to prevent blanking the entire app.
 * Displays a styled error page with a return home button.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--bg-base, #0f1a14)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary, #f0f4f1)',
          fontFamily: "var(--font-heading, 'Poppins', sans-serif)",
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <AlertTriangle size={48} color="var(--color-urgent, #ef4444)" />
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{
            color: 'var(--text-muted, rgba(240,244,241,0.35))',
            fontSize: '14px',
            maxWidth: '400px',
            margin: 0,
          }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
            style={{ width: 'auto', padding: '12px 24px', marginTop: '8px' }}
          >
            Return Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
