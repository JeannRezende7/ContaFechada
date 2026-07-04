import { ArrowDownRight, ArrowUpRight, Repeat, Layers } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import { getColor } from '../../categorias/colorMap.js';
import { getIcon } from '../../categorias/iconMap.js';
import StatusBadge from './StatusBadge.jsx';

export default function LancamentoRow({ lancamento, categoria, onStatusChange, onClick }) {
  const isReceita = lancamento.tipo === 'receita';
  const Icon = isReceita ? ArrowUpRight : ArrowDownRight;
  const CategoriaIcon = categoria ? getIcon(categoria.icone) : null;

  return (
    <div
      onClick={() => onClick(lancamento)}
      className="flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-card shadow-card
                 cursor-pointer hover:shadow-card-hover hover:-translate-y-px transition-all"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            categoria ? getColor(categoria.corKey).dot : isReceita ? 'bg-ledger-50 text-ledger-600' : 'bg-ink-50 text-ink-500'
          }`}
        >
          {categoria ? (
            <CategoriaIcon size={16} strokeWidth={2.25} className="text-white" />
          ) : (
            <Icon size={17} strokeWidth={2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5 min-w-0">
            <span className="truncate">{lancamento.descricao}</span>
            {lancamento.origemRecorrenciaId && (
              <span title="Recorrente" className="text-clay-500 shrink-0">
                <Repeat size={12} strokeWidth={2.5} />
              </span>
            )}
            {lancamento.parcelamentoId && (
              <span title="Parcelado" className="text-clay-500 shrink-0">
                <Layers size={12} strokeWidth={2.5} />
              </span>
            )}
          </p>
          <p className="text-xs text-ink-300">
            Vence {formatDateBR(lancamento.dataVencimento)}
            {categoria && ` · ${categoria.nome}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`money text-sm font-semibold whitespace-nowrap ${isReceita ? 'text-ledger-600' : 'text-ink-900'}`}>
          {isReceita ? '+' : '-'} {formatCurrency(lancamento.valor)}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={lancamento.status} onChange={(status) => onStatusChange(lancamento.id, status)} />
        </div>
      </div>
    </div>
  );
}
