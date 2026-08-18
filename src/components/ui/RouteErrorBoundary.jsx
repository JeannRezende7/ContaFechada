import { Component } from 'react';
import { RefreshCw } from 'lucide-react';
import { reportError } from '../../utils/crashReporting.js';

export default class RouteErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    reportError(error, 'route_boundary');
    if (import.meta.env.DEV) console.error('[routes] falha ao carregar tela', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-ink-500 dark:text-ink-100">
          Não foi possível carregar esta tela. Pode haver uma atualização disponível.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-pill bg-ledger-500 px-4 py-2 text-sm font-medium text-white hover:bg-ledger-600"
        >
          <RefreshCw size={15} strokeWidth={2} />
          Recarregar aplicativo
        </button>
      </div>
    );
  }
}
