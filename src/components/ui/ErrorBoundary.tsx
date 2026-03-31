import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VeganTrack] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-xl font-bold text-green-800 mb-2">
            Algo salió mal
          </h1>
          <p className="text-green-600 mb-6 text-sm max-w-xs">
            {this.state.error?.message ?? 'Error inesperado'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Recargar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
