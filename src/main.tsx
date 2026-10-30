import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#0a0b0e',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              padding: '28px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h2 style={{ fontSize: '20px', marginBottom: '12px', color: '#ff4d4d' }}>
              Ocorreu um erro ao carregar o aplicativo
            </h2>
            <p style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '20px', lineHeight: '1.5' }}>
              {this.state.error?.message || 'Erro inesperado de execução.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '0',
                  background: '#22e5ff',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Recarregar Página
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
