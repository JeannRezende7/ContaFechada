import { formatCurrency } from '../../../utils/formatCurrency.js';
import StatusBadge from './StatusBadge.jsx';

export default function LancamentoRow({ lancamento, onStatusChange, onClick }) {
  const isReceita = lancamento.tipo === 'receita';

  return (
    <div
      onClick={() => onClick(lancamento)}
      className="flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-card shadow-card
                 cursor-pointer hover:shadow-none transition-shadow"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900 truncate">{lancamento.descricao}</p>
        <p className="text-xs text-ink-300">
          Vence {new Date(lancamento.dataVencimento).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`money text-sm font-semibold ${isReceita ? 'text-ledger-600' : 'text-ink-900'}`}>
          {isReceita ? '+' : '-'} {formatCurrency(lancamento.valor)}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={lancamento.status} onChange={(status) => onStatusChange(lancamento.id, status)} />
        </div>
      </div>
    </div>
  );
}
